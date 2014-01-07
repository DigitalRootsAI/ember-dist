(function() {
/*global Test:true*/

var originalLookup;

module("Ember.ViewTargetActionSupport", {
  setup: function() {
    originalLookup = Ember.lookup;
  },
  teardown: function() {
    Ember.lookup = originalLookup;
  }
});

test("it should return false if no action is specified", function() {
  expect(1);

  var view = Ember.View.createWithMixins(Ember.ViewTargetActionSupport, {
    controller: Ember.Object.create()
  });

  ok(false === view.triggerAction(), "a valid target and action were specified");
});

test("it should support actions specified as strings", function() {
  expect(2);

  var view = Ember.View.createWithMixins(Ember.ViewTargetActionSupport, {
    controller: Ember.Object.create({
      anEvent: function() {
        ok(true, "anEvent method was called");
      }
    }),
    action: 'anEvent'
  });

  ok(true === view.triggerAction(), "a valid target and action were specified");
});

test("it should invoke the send() method on the controller with the view's context", function() {
  expect(3);

  var view = Ember.View.createWithMixins(Ember.ViewTargetActionSupport, {
    context: {},
    controller: Ember.Object.create({
      send: function(evt, context) {
        equal(evt, 'anEvent', "send() method was invoked with correct event name");
        equal(context, view.context, "send() method was invoked with correct context");
      }
    }),
    action: 'anEvent'
  });

  ok(true === view.triggerAction(), "a valid target and action were specified");
});

})();

(function() {
var view;
var dispatcher;
var set = Ember.set, get = Ember.get;

module("Ember.EventDispatcher", {
  setup: function() {
    Ember.run(function() {
      dispatcher = Ember.EventDispatcher.create();
      dispatcher.setup();
    });
  },

  teardown: function() {
    Ember.run(function() {
      if (view) { view.destroy(); }
      dispatcher.destroy();
    });
  }
});

test("should dispatch events to views", function() {
  var receivedEvent;
  var parentMouseDownCalled = 0;
  var childKeyDownCalled = 0;
  var parentKeyDownCalled = 0;

  view = Ember.ContainerView.createWithMixins({
    childViews: ['child'],

    child: Ember.View.extend({
      render: function(buffer) {
        buffer.push('<span id="wot">ewot</span>');
      },

      keyDown: function(evt) {
        childKeyDownCalled++;

        return false;
      }
    }),

    render: function(buffer) {
      buffer.push('some <span id="awesome">awesome</span> content');
      this._super(buffer);
    },

    mouseDown: function(evt) {
      parentMouseDownCalled++;
      receivedEvent = evt;
    },

    keyDown: function(evt) {
      parentKeyDownCalled++;
    }
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  view.$().trigger('mousedown');

  ok(receivedEvent, "passes event to associated event method");
  receivedEvent = null;
  parentMouseDownCalled = 0;

  view.$('span#awesome').trigger('mousedown');
  ok(receivedEvent, "event bubbles up to nearest Ember.View");
  equal(parentMouseDownCalled, 1, "does not trigger the parent handlers twice because of browser bubbling");
  receivedEvent = null;

  Ember.$('#wot').trigger('mousedown');
  ok(receivedEvent, "event bubbles up to nearest Ember.View");

  Ember.$('#wot').trigger('keydown');
  equal(childKeyDownCalled, 1, "calls keyDown on child view");
  equal(parentKeyDownCalled, 0, "does not call keyDown on parent if child handles event");
});

test("should not dispatch events to views not inDOM", function() {
  var receivedEvent;

  view = Ember.View.createWithMixins({
    render: function(buffer) {
      buffer.push('some <span id="awesome">awesome</span> content');
      this._super(buffer);
    },

    mouseDown: function(evt) {
      receivedEvent = evt;
    }
  });

  Ember.run(function() {
    view.append();
  });

  var $element = view.$();

  Ember.run(function() {
    view.set('element', null); // Force into preRender
  });

  $element.trigger('mousedown');

  ok(!receivedEvent, "does not pass event to associated event method");
  receivedEvent = null;

  $element.find('span#awesome').trigger('mousedown');
  ok(!receivedEvent, "event does not bubble up to nearest Ember.View");
  receivedEvent = null;

  // Cleanup
  $element.remove();
});

test("should send change events up view hierarchy if view contains form elements", function() {
  var receivedEvent;
  view = Ember.View.create({
    render: function(buffer) {
      buffer.push('<input id="is-done" type="checkbox">');
    },

    change: function(evt) {
      receivedEvent = evt;
    }
  });

  Ember.run(function() {
    view.append();
  });

  Ember.$('#is-done').trigger('change');
  ok(receivedEvent, "calls change method when a child element is changed");
  equal(receivedEvent.target, Ember.$('#is-done')[0], "target property is the element that was clicked");
});

test("events should stop propagating if the view is destroyed", function() {
  var parentViewReceived, receivedEvent;

  var parentView = Ember.ContainerView.create({
    change: function(evt) {
      parentViewReceived = true;
    }
  });

  view = parentView.createChildView(Ember.View, {
    render: function(buffer) {
      buffer.push('<input id="is-done" type="checkbox">');
    },

    change: function(evt) {
      receivedEvent = true;
      var self = this;
      Ember.run(function() {
        get(self, 'parentView').destroy();
      });
    }
  });

  parentView.pushObject(view);

  Ember.run(function() {
    parentView.append();
  });

  ok(Ember.$('#is-done').length, "precond - view is in the DOM");
  Ember.$('#is-done').trigger('change');
  ok(!Ember.$('#is-done').length, "precond - view is not in the DOM");
  ok(receivedEvent, "calls change method when a child element is changed");
  ok(!parentViewReceived, "parent view does not receive the event");
});

test("should not interfere with event propagation", function() {
  var receivedEvent;
  view = Ember.View.create({
    render: function(buffer) {
      buffer.push('<div id="propagate-test-div"></div>');
    }
  });

  Ember.run(function() {
    view.append();
  });

  Ember.$(window).bind('click', function(evt) {
    receivedEvent = evt;
  });

  Ember.$('#propagate-test-div').click();

  ok(receivedEvent, "allowed event to propagate outside Ember");
  deepEqual(receivedEvent.target, Ember.$('#propagate-test-div')[0], "target property is the element that was clicked");
});

test("should dispatch events to nearest event manager", function() {
  var receivedEvent=0;
  view = Ember.ContainerView.create({
    render: function(buffer) {
      buffer.push('<input id="is-done" type="checkbox">');
    },

    eventManager: Ember.Object.create({
      mouseDown: function() {
        receivedEvent++;
      }
    }),

    mouseDown: function() {}
  });

  Ember.run(function() {
    view.append();
  });

  Ember.$('#is-done').trigger('mousedown');
  equal(receivedEvent, 1, "event should go to manager and not view");
});

test("event manager should be able to re-dispatch events to view", function() {

  var receivedEvent=0;
  view = Ember.ContainerView.createWithMixins({
    elementId: 'containerView',

    eventManager: Ember.Object.create({
      mouseDown: function(evt, view) {
        // Re-dispatch event when you get it.
        //
        // The second parameter tells the dispatcher
        // that this event has been handled. This
        // API will clearly need to be reworked since
        // multiple eventManagers in a single view
        // hierarchy would break, but it shows that
        // re-dispatching works
        view.$().trigger('mousedown',this);
      }
    }),

    childViews: ['child'],

    child: Ember.View.extend({
      elementId: 'nestedView',

      mouseDown: function(evt) {
        receivedEvent++;
      }
    }),

    mouseDown: function(evt) {
      receivedEvent++;
    }
  });

  Ember.run(function() { view.append(); });

  Ember.$('#nestedView').trigger('mousedown');
  equal(receivedEvent, 2, "event should go to manager and not view");
});

test("event handlers should be wrapped in a run loop", function() {
  expect(1);

  view = Ember.View.createWithMixins({
    elementId: 'test-view',

    eventManager: Ember.Object.create({
      mouseDown: function() {
        ok(Ember.run.currentRunLoop, 'a run loop should have started');
      }
    })
  });

  Ember.run(function() { view.append(); });

  Ember.$('#test-view').trigger('mousedown');
});

module("Ember.EventDispatcher#setup", {
  setup: function() {
    Ember.run(function() {
      dispatcher = Ember.EventDispatcher.create({
        rootElement: "#qunit-fixture"
      });
    });
  },

  teardown: function() {
    Ember.run(function() {
      if (view) { view.destroy(); }
      dispatcher.destroy();
    });
  }
});

test("additional events which should be listened on can be passed", function () {
  expect(1);

  Ember.run(function () {
    dispatcher.setup({ myevent: "myEvent" });

    view = Ember.View.create({
      elementId: "leView",
      myEvent: function() {
        ok(true, "custom event has been triggered");
      }
    }).appendTo( dispatcher.get("rootElement") );
  });

  Ember.$("#leView").trigger("myevent");
});

test("additional events and rootElement can be specified", function () {
  expect(3);

  Ember.$("#qunit-fixture").append("<div class='custom-root'></div>");

  Ember.run(function () {
    dispatcher.setup({ myevent: "myEvent" }, ".custom-root");

    view = Ember.View.create({
      elementId: "leView",
      myEvent: function() {
        ok(true, "custom event has been triggered");
      }
    }).appendTo( dispatcher.get("rootElement") );
  });

  ok(Ember.$(".custom-root").hasClass("ember-application"), "the custom rootElement is used");
  equal(dispatcher.get("rootElement"), ".custom-root", "the rootElement is updated");

  Ember.$("#leView").trigger("myevent");
});

})();

(function() {
module("Ember.View additions to run queue");

test("View hierarchy is done rendering to DOM when functions queued in afterRender execute", function() {
  var lookup1, lookup2;
  var childView = Ember.View.create({
    elementId: 'child_view',
    render: function(buffer) {
      buffer.push('child');
    },
    didInsertElement: function() {
      this.$().addClass('extra-class');
    }
  });
  var parentView = Ember.View.create({
    elementId: 'parent_view',
    render: function(buffer) {
      buffer.push('parent');
      this.appendChild(childView);
    },
    didInsertElement: function() {
      lookup1 = this.$('.extra-class');
      Ember.run.scheduleOnce('afterRender', this, function() {
        lookup2 = this.$('.extra-class');
      });
    }
  });

  Ember.run(function() {
    parentView.appendTo('#qunit-fixture');
  });

  equal(lookup1.length, 0, "doesn't not find child in DOM on didInsertElement");
  equal(lookup2.length, 1, "finds child in DOM afterRender");

  Ember.run(function() {
    parentView.destroy();
  });
});

})();

(function() {
var view, dispatcher;

// Adapted from https://github.com/jquery/jquery/blob/f30f7732e7775b6e417c4c22ced7adb2bf76bf89/test/data/testinit.js
var canDataTransfer,
    fireNativeWithDataTransfer;
if (document.createEvent) {
  canDataTransfer = !!document.createEvent('HTMLEvents').dataTransfer;
  fireNativeWithDataTransfer = function(node, type, dataTransfer) {
    var event = document.createEvent('HTMLEvents');
    event.initEvent(type, true, true);
    event.dataTransfer = dataTransfer;
    node.dispatchEvent(event);
  };
} else {
  canDataTransfer = !!document.createEventObject().dataTransfer;
  fireNativeWithDataTransfer = function(node, type, dataTransfer) {
    var event = document.createEventObject();
    event.dataTransfer = dataTransfer;
    node.fireEvent('on' + type, event);
  };
}

module("Ember.EventDispatcher", {
  setup: function() {
    Ember.run(function() {
      dispatcher = Ember.EventDispatcher.create();
      dispatcher.setup();
    });
  },

  teardown: function() {
    Ember.run(function() {
      if (view) { view.destroy(); }
      dispatcher.destroy();
    });
  }
});

if (canDataTransfer) {
  test("jQuery.event.fix copies over the dataTransfer property", function() {
    var originalEvent;
    var receivedEvent;

    originalEvent = {
      type: 'drop',
      dataTransfer: 'success',
      target: document.body
    };

    receivedEvent = Ember.$.event.fix(originalEvent);

    ok(receivedEvent !== originalEvent, "attributes are copied to a new event object");
    equal(receivedEvent.dataTransfer, originalEvent.dataTransfer, "copies dataTransfer property to jQuery event");
  });

  test("drop handler should receive event with dataTransfer property", function() {
    var receivedEvent;
    var dropCalled = 0;

    view = Ember.View.createWithMixins({
      render: function(buffer) {
        buffer.push('please drop stuff on me');
        this._super(buffer);
      },

      drop: function(evt) {
        receivedEvent = evt;
        dropCalled++;
      }
    });

    Ember.run(function() {
      view.append();
    });

    fireNativeWithDataTransfer(view.$().get(0), 'drop', 'success');

    equal(dropCalled, 1, "called drop handler once");
    equal(receivedEvent.dataTransfer, 'success', "copies dataTransfer property to jQuery event");
  });
}

})();

(function() {
var set = Ember.set, get = Ember.get;

// .......................................................
//  render()
//
module("Ember.RenderBuffer");

test("RenderBuffers combine strings", function() {
  var buffer = new Ember.RenderBuffer('div');
  buffer.pushOpeningTag();

  buffer.push('a');
  buffer.push('b');

  // IE8 returns `element name as upper case with extra whitespace.
  equal("<div>ab</div>", buffer.string().toLowerCase().replace(/\s+/g, ''), "Multiple pushes should concatenate");
});

test("value of 0 is included in output", function() {
  var buffer, $el;

  buffer = new Ember.RenderBuffer('input');
  buffer.prop('value', 0);
  buffer.pushOpeningTag();
  $el = buffer.element();

  strictEqual($el.value, '0', "generated element has value of '0'");

  buffer = new Ember.RenderBuffer('input');
  buffer.prop('value', 0);
  buffer.push('<div>');
  buffer.pushOpeningTag();
  buffer.push('</div>');
  $el = Ember.$(buffer.innerString());

  strictEqual($el.find('input').val(), '0', "raw tag has value of '0'");
});

test("prevents XSS injection via `id`", function() {
  var buffer = new Ember.RenderBuffer('div');

  buffer.push('<span></span>'); // We need the buffer to not be empty so we use the string path
  buffer.id('hacked" megahax="yes');
  buffer.pushOpeningTag();

  equal('<span></span><div id="hacked&quot; megahax=&quot;yes">', buffer.string());
});

test("prevents XSS injection via `attr`", function() {
  var buffer = new Ember.RenderBuffer('div');

  buffer.push('<span></span>'); // We need the buffer to not be empty so we use the string path
  buffer.attr('id', 'trololol" onmouseover="pwn()');
  buffer.attr('class', "hax><img src=\"trollface.png\"");
  buffer.pushOpeningTag();

  equal('<span></span><div id="trololol&quot; onmouseover=&quot;pwn()" class="hax&gt;&lt;img src=&quot;trollface.png&quot;">', buffer.string());
});

test("prevents XSS injection via `addClass`", function() {
  var buffer = new Ember.RenderBuffer('div');

  buffer.push('<span></span>'); // We need the buffer to not be empty so we use the string path
  buffer.addClass('megahax" xss="true');
  buffer.pushOpeningTag();

  // Regular check then check for IE
  equal('<span></span><div class="megahax&quot; xss=&quot;true">', buffer.string());
});

test("prevents XSS injection via `style`", function() {
  var buffer = new Ember.RenderBuffer('div');

  buffer.push('<span></span>'); // We need the buffer to not be empty so we use the string path
  buffer.style('color', 'blue;" xss="true" style="color:red');
  buffer.pushOpeningTag();

  equal('<span></span><div style="color:blue;&quot; xss=&quot;true&quot; style=&quot;color:red;">', buffer.string());
});

test("prevents XSS injection via `tagName`", function() {
  var buffer = new Ember.RenderBuffer('cool-div><div xss="true"');

  buffer.push('<span></span>'); // We need the buffer to not be empty so we use the string path
  buffer.pushOpeningTag();
  buffer.begin('span><span xss="true"');
  buffer.pushOpeningTag();
  buffer.pushClosingTag();
  buffer.pushClosingTag();

  equal('<span></span><cool-divdivxsstrue><spanspanxsstrue></spanspanxsstrue></cool-divdivxsstrue>', buffer.string());
});

test("handles null props - Issue #2019", function() {
  var buffer = new Ember.RenderBuffer('div');

  buffer.push('<span></span>'); // We need the buffer to not be empty so we use the string path
  buffer.prop('value', null);
  buffer.pushOpeningTag();

  equal('<span></span><div>', buffer.string());
});

test("handles browsers like Firefox < 11 that don't support outerHTML Issue #1952", function() {
  var buffer = new Ember.RenderBuffer('div');
  buffer.pushOpeningTag();
  // Make sure element.outerHTML is falsy to trigger the fallback.
  var elementStub = '<div></div>';
  buffer.element = function() { return elementStub; };
  // IE8 returns `element name as upper case with extra whitespace.
  equal(elementStub, buffer.string().toLowerCase().replace(/\s/g, ''));
});

module("Ember.RenderBuffer - without tagName");

test("It is possible to create a RenderBuffer without a tagName", function() {
  var buffer = new Ember.RenderBuffer();
  buffer.push('a');
  buffer.push('b');
  buffer.push('c');

  equal(buffer.string(), "abc", "Buffers without tagNames do not wrap the content in a tag");
});

module("Ember.RenderBuffer#element");

test("properly handles old IE's zero-scope bug", function() {
  var buffer = new Ember.RenderBuffer('div');
  buffer.pushOpeningTag();
  buffer.push('<script></script>foo');

  var element = buffer.element();
  ok(Ember.$(element).html().match(/script/i), "should have script tag");
  ok(!Ember.$(element).html().match(/&shy;/), "should not have &shy;");
});

})();

(function() {
var set = Ember.set, get = Ember.get;
var forEach = Ember.EnumerableUtils.forEach;
var view;

module("Ember.CollectionView", {
  setup: function() {
    Ember.CollectionView.CONTAINER_MAP.del = 'em';
  },
  teardown: function() {
    delete Ember.CollectionView.CONTAINER_MAP.del;
    Ember.run(function() {
      if (view) { view.destroy(); }
    });
  }
});

test("should render a view for each item in its content array", function() {
  view = Ember.CollectionView.create({
    content: Ember.A([1, 2, 3, 4])
  });

  Ember.run(function() {
    view.append();
  });
  equal(view.$('div').length, 4);
});

test("should render the emptyView if content array is empty (view class)", function() {
  view = Ember.CollectionView.create({
    tagName: 'del',
    content: Ember.A(),

    emptyView: Ember.View.extend({
      tagName: 'kbd',
      render: function(buf) {
        buf.push("OY SORRY GUVNAH NO NEWS TODAY EH");
      }
    })
  });

  Ember.run(function() {
    view.append();
  });

  ok(view.$().find('kbd:contains("OY SORRY GUVNAH")').length, "displays empty view");
});

test("should render the emptyView if content array is empty (view instance)", function() {
  view = Ember.CollectionView.create({
    tagName: 'del',
    content: Ember.A(),

    emptyView: Ember.View.create({
      tagName: 'kbd',
      render: function(buf) {
        buf.push("OY SORRY GUVNAH NO NEWS TODAY EH");
      }
    })
  });

  Ember.run(function() {
    view.append();
  });

  ok(view.$().find('kbd:contains("OY SORRY GUVNAH")').length, "displays empty view");
});

test("should be able to override the tag name of itemViewClass even if tag is in default mapping", function() {
  view = Ember.CollectionView.create({
    tagName: 'del',
    content: Ember.A(['NEWS GUVNAH']),

    itemViewClass: Ember.View.extend({
      tagName: 'kbd',
      render: function(buf) {
        buf.push(get(this, 'content'));
      }
    })
  });

  Ember.run(function() {
    view.append();
  });

  ok(view.$().find('kbd:contains("NEWS GUVNAH")').length, "displays the item view with proper tag name");
});

test("should allow custom item views by setting itemViewClass", function() {
  var passedContents = [];
  view = Ember.CollectionView.create({
    content: Ember.A(['foo', 'bar', 'baz']),

    itemViewClass: Ember.View.extend({
      render: function(buf) {
        passedContents.push(get(this, 'content'));
        buf.push(get(this, 'content'));
      }
    })
  });

  Ember.run(function() {
    view.append();
  });

  deepEqual(passedContents, ['foo', 'bar', 'baz'], "sets the content property on each item view");

  forEach(passedContents, function(item) {
    equal(view.$(':contains("'+item+'")').length, 1);
  });
});

test("should insert a new item in DOM when an item is added to the content array", function() {
  var content = Ember.A(['foo', 'bar', 'baz']);

  view = Ember.CollectionView.create({
    content: content,

    itemViewClass: Ember.View.extend({
      render: function(buf) {
        buf.push(get(this, 'content'));
      }
    })
  });

  Ember.run(function() {
    view.append();
  });

  forEach(content, function(item) {
    equal(view.$(':contains("'+item+'")').length, 1, "precond - generates pre-existing items");
  });

  Ember.run(function() {
    content.insertAt(1, 'quux');
  });

  equal(Ember.$.trim(view.$(':nth-child(2)').text()), 'quux');
});

test("should remove an item from DOM when an item is removed from the content array", function() {
  var content = Ember.A(['foo', 'bar', 'baz']);

  view = Ember.CollectionView.create({
    content: content,

    itemViewClass: Ember.View.extend({
      render: function(buf) {
        buf.push(get(this, 'content'));
      }
    })
  });

  Ember.run(function() {
    view.append();
  });

  forEach(content, function(item) {
    equal(view.$(':contains("'+item+'")').length, 1, "precond - generates pre-existing items");
  });

  Ember.run(function() {
    content.removeAt(1);
  });

  forEach(content, function(item, idx) {
    equal(view.$(Ember.String.fmt(':nth-child(%@)', [String(idx+1)])).text(), item);
  });
});

test("it updates the view if an item is replaced", function() {
  var content = Ember.A(['foo', 'bar', 'baz']);
  view = Ember.CollectionView.create({
    content: content,

    itemViewClass: Ember.View.extend({
      render: function(buf) {
        buf.push(get(this, 'content'));
      }
    })
  });

  Ember.run(function() {
    view.append();
  });

  forEach(content, function(item) {
    equal(view.$(':contains("'+item+'")').length, 1, "precond - generates pre-existing items");
  });

  Ember.run(function() {
    content.removeAt(1);
    content.insertAt(1, "Kazuki" );
  });

  forEach(content, function(item, idx) {
    equal(Ember.$.trim(view.$(Ember.String.fmt(':nth-child(%@)', [String(idx+1)])).text()), item, "postcond - correct array update");
  });
});

test("can add and replace in the same runloop", function() {
  var content = Ember.A(['foo', 'bar', 'baz']);
  view = Ember.CollectionView.create({
    content: content,

    itemViewClass: Ember.View.extend({
      render: function(buf) {
        buf.push(get(this, 'content'));
      }
    })
  });

  Ember.run(function() {
    view.append();
  });

  forEach(content, function(item) {
    equal(view.$(':contains("'+item+'")').length, 1, "precond - generates pre-existing items");
  });

  Ember.run(function() {
    content.pushObject("Tom Dale" );
    content.removeAt(0);
    content.insertAt(0, "Kazuki" );
  });

  forEach(content, function(item, idx) {
    equal(Ember.$.trim(view.$(Ember.String.fmt(':nth-child(%@)', [String(idx+1)])).text()), item, "postcond - correct array update");
  });

});

test("can add and replace the object before the add in the same runloop", function() {
  var content = Ember.A(['foo', 'bar', 'baz']);
  view = Ember.CollectionView.create({
    content: content,

    itemViewClass: Ember.View.extend({
      render: function(buf) {
        buf.push(get(this, 'content'));
      }
    })
  });

  Ember.run(function() {
    view.append();
  });

  forEach(content, function(item) {
    equal(view.$(':contains("'+item+'")').length, 1, "precond - generates pre-existing items");
  });

  Ember.run(function() {
    content.pushObject("Tom Dale" );
    content.removeAt(1);
    content.insertAt(1, "Kazuki" );
  });

  forEach(content, function(item, idx) {
    equal(Ember.$.trim(view.$(Ember.String.fmt(':nth-child(%@)', [String(idx+1)])).text()), item, "postcond - correct array update");
  });
});

test("can add and replace complicatedly", function() {
  var content = Ember.A(['foo', 'bar', 'baz']);
  view = Ember.CollectionView.create({
    content: content,

    itemViewClass: Ember.View.extend({
      render: function(buf) {
        buf.push(get(this, 'content'));
      }
    })
  });

  Ember.run(function() {
    view.append();
  });

  forEach(content, function(item) {
    equal(view.$(':contains("'+item+'")').length, 1, "precond - generates pre-existing items");
  });

  Ember.run(function() {
    content.pushObject("Tom Dale" );
    content.removeAt(1);
    content.insertAt(1, "Kazuki" );
    content.pushObject("Firestone" );
    content.pushObject("McMunch" );
  });

  forEach(content, function(item, idx) {
    equal(Ember.$.trim(view.$(Ember.String.fmt(':nth-child(%@)', [String(idx+1)])).text()), item, "postcond - correct array update: "+item.name+"!="+view.$(Ember.String.fmt(':nth-child(%@)', [String(idx+1)])).text());
  });
});

test("can add and replace complicatedly harder", function() {
  var content = Ember.A(['foo', 'bar', 'baz']);
  view = Ember.CollectionView.create({
    content: content,

    itemViewClass: Ember.View.extend({
      render: function(buf) {
        buf.push(get(this, 'content'));
      }
    })
  });

  Ember.run(function() {
    view.append();
  });

  forEach(content, function(item) {
    equal(view.$(':contains("'+item+'")').length, 1, "precond - generates pre-existing items");
  });

  Ember.run(function() {
    content.pushObject("Tom Dale" );
    content.removeAt(1);
    content.insertAt(1, "Kazuki" );
    content.pushObject("Firestone" );
    content.pushObject("McMunch" );
    content.removeAt(2);
  });

  forEach(content, function(item, idx) {
    equal(Ember.$.trim(view.$(Ember.String.fmt(':nth-child(%@)', [String(idx+1)])).text()), item, "postcond - correct array update");
  });
});

test("should allow changes to content object before layer is created", function() {
  view = Ember.CollectionView.create({
    content: null
  });


  Ember.run(function() {
    set(view, 'content', Ember.A());
    set(view, 'content', Ember.A([1, 2, 3]));
    set(view, 'content', Ember.A([1, 2]));
    view.append();
  });

  ok(view.$().children().length);
});

test("should fire life cycle events when elements are added and removed", function() {
  var view,
    didInsertElement = 0,
    willDestroyElement = 0,
    willDestroy = 0,
    destroy = 0,
    content = Ember.A([1, 2, 3]);
  Ember.run(function () {
    view = Ember.CollectionView.create({
      content: content,
      itemViewClass: Ember.View.extend({
        render: function(buf) {
          buf.push(get(this, 'content'));
        },
        didInsertElement: function () {
          didInsertElement++;
        },
        willDestroyElement: function () {
          willDestroyElement++;
        },
        willDestroy: function () {
          willDestroy++;
          this._super();
        },
        destroy: function() {
          destroy++;
          this._super();
        }
      })
    });
    view.appendTo('#qunit-fixture');
  });

  equal(didInsertElement, 3);
  equal(willDestroyElement, 0);
  equal(willDestroy, 0);
  equal(destroy, 0);
  equal(view.$().text(), '123');

  Ember.run(function () {
    content.pushObject(4);
    content.unshiftObject(0);
  });


  equal(didInsertElement, 5);
  equal(willDestroyElement, 0);
  equal(willDestroy, 0);
  equal(destroy, 0);
  // Remove whitspace added by IE 8
  equal(view.$().text().replace(/\s+/g,''), '01234');

  Ember.run(function () {
    content.popObject();
    content.shiftObject();
  });

  equal(didInsertElement, 5);
  equal(willDestroyElement, 2);
  equal(willDestroy, 2);
  equal(destroy, 2);
  // Remove whitspace added by IE 8
  equal(view.$().text().replace(/\s+/g,''), '123');

  Ember.run(function () {
    view.set('content', Ember.A([7,8,9]));
  });

  equal(didInsertElement, 8);
  equal(willDestroyElement, 5);
  equal(willDestroy, 5);
  equal(destroy, 5);
  // Remove whitspace added by IE 8
  equal(view.$().text().replace(/\s+/g,''), '789');

  Ember.run(function () {
    view.destroy();
  });

  equal(didInsertElement, 8);
  equal(willDestroyElement, 8);
  equal(willDestroy, 8);
  equal(destroy, 8);
});

test("should allow changing content property to be null", function() {
  view = Ember.CollectionView.create({
    content: Ember.A([1, 2, 3]),

    emptyView: Ember.View.extend({
      template: function() { return "(empty)"; }
    })
  });

  Ember.run(function() {
    view.append();
  });

  equal(view.$().children().length, 3, "precond - creates three elements");

  Ember.run(function() {
    set(view, 'content', null);
  });

  equal(Ember.$.trim(view.$().children().text()), "(empty)", "should display empty view");
});

test("should allow items to access to the CollectionView's current index in the content array", function() {
  view = Ember.CollectionView.create({
    content: Ember.A(['zero', 'one', 'two']),
    itemViewClass: Ember.View.extend({
      render: function(buf) {
        buf.push(get(this, 'contentIndex'));
      }
    })
  });

  Ember.run(function() {
    view.append();
  });

  deepEqual(view.$(':nth-child(1)').text(), "0");
  deepEqual(view.$(':nth-child(2)').text(), "1");
  deepEqual(view.$(':nth-child(3)').text(), "2");
});

test("should allow declaration of itemViewClass as a string", function() {
  view = Ember.CollectionView.create({
    content: Ember.A([1, 2, 3]),
    itemViewClass: 'Ember.View'
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('.ember-view').length, 3);
});

test("should not render the emptyView if content is emptied and refilled in the same run loop", function() {
  view = Ember.CollectionView.create({
    tagName: 'div',
    content: Ember.A(['NEWS GUVNAH']),

    emptyView: Ember.View.extend({
      tagName: 'kbd',
      render: function(buf) {
        buf.push("OY SORRY GUVNAH NO NEWS TODAY EH");
      }
    })
  });

  Ember.run(function() {
    view.append();
  });

  equal(view.$().find('kbd:contains("OY SORRY GUVNAH")').length, 0);

  Ember.run(function() {
    view.get('content').popObject();
    view.get('content').pushObject(['NEWS GUVNAH']);
  });
  equal(view.$('div').length, 1);
  equal(view.$().find('kbd:contains("OY SORRY GUVNAH")').length, 0);
});

test("a array_proxy that backs an sorted array_controller that backs a collection view functions properly", function() {

  var array = Ember.A([{ name: "Other Katz" }]);
  var arrayProxy = Ember.ArrayProxy.create({content: array});

  var sortedController = Ember.ArrayController.create({
    content: arrayProxy,
    sortProperties: ['name']
  });

  var container = Ember.CollectionView.create({
    content: sortedController
  });

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  Ember.run(function() {
    arrayProxy.addObjects([{ name: "Scumbag Demon" }, { name: "Lord British" }]);
  });

  equal(container.get('content.length'), 3, 'ArrayController should have 3 entries');
  equal(container.get('content.content.length'), 3, 'RecordArray should have 3 entries');
  equal(container.get('childViews.length'), 3, 'CollectionView should have 3 entries');

  Ember.run(function() {
    container.destroy();
  });
});

test("when a collection view is emptied, deeply nested views elements are not removed from the DOM and then destroyed again", function() {
  var assertProperDestruction = Ember.Mixin.create({
    destroyElement: function() {
      if (this.state === 'inDOM') {
        ok(this.get('element'), this + ' still exists in DOM');
      }
      return this._super();
    }
  });

  var ChildView = Ember.View.extend(assertProperDestruction, {
    render: function(buf) {
      // emulate nested template
      this.appendChild(Ember.View.createWithMixins(assertProperDestruction, {
        template: function() { return "<div class='inner_element'></div>"; }
      }));
    }
  });

  var view = Ember.CollectionView.create({
    content: Ember.A([1]),
    itemViewClass: ChildView
  });


  Ember.run(function() {
    view.append();
  });
  equal(Ember.$('.inner_element').length, 1, "precond - generates inner element");

  Ember.run(function() {
    view.get('content').clear();
  });
  equal(Ember.$('.inner_element').length, 0, "elements removed");

  Ember.run(function() {
    view.remove();
  });
});

test("should render the emptyView if content array is empty and emptyView is given as string", function() {
  Ember.lookup = {
    App: {
      EmptyView: Ember.View.extend({
      tagName: 'kbd',
      render: function(buf) {
        buf.push("THIS IS AN EMPTY VIEW");
      }
      })
    }
  };
  view = Ember.CollectionView.create({
    tagName: 'del',
    content: Ember.A(),

    emptyView: 'App.EmptyView'
  });

  Ember.run(function() {
    view.append();
  });

  ok(view.$().find('kbd:contains("THIS IS AN EMPTY VIEW")').length, "displays empty view");
});

test("should lookup against the container if itemViewClass is given as a string", function() {

  var ItemView = Ember.View.extend({
      render: function(buf) {
        buf.push(get(this, 'content'));
      }
  });

  var container = {
    lookupFactory: lookupFactory
  };

  view = Ember.CollectionView.create({
    container: container,
    content: Ember.A([1, 2, 3, 4]),
    itemViewClass: 'item'
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('.ember-view').length, 4);

  function lookupFactory(fullName) {
    equal(fullName, 'view:item');

    return ItemView;
  }
});

test("should lookup against the container and render the emptyView if emptyView is given as string and content array is empty ", function() {
  var EmptyView = Ember.View.extend({
      tagName: 'kbd',
      render: function(buf) {
        buf.push("THIS IS AN EMPTY VIEW");
      }
  });

  var container = {
    lookupFactory: lookupFactory
  };

  view =  Ember.CollectionView.create({
    container: container,
    tagName: 'del',
    content: Ember.A(),

    emptyView: 'empty'
  });

  Ember.run(function() {
    view.append();
  });

  ok(view.$().find('kbd:contains("THIS IS AN EMPTY VIEW")').length, "displays empty view");

  function lookupFactory(fullName) {
    equal(fullName, 'view:empty');

    return EmptyView;
  }
});

})();

(function() {
var get = Ember.get, set = Ember.set,
    a_slice = Array.prototype.slice;

module("Ember.Component");

var Component = Ember.Component.extend();

test("The context of an Ember.Component is itself", function() {
  var control = Component.create();
  strictEqual(control, control.get('context'), "A control's context is itself");
});

test("The controller (target of `action`) of an Ember.Component is itself", function() {
  var control = Component.create();
  strictEqual(control, control.get('controller'), "A control's controller is itself");
});

var component, controller, actionCounts, sendCount, actionArguments;

module("Ember.Component - Actions", {
  setup: function() {
    actionCounts = {};
    sendCount = 0;
    actionArguments = null;

    controller = Ember.Object.create({
      send: function(actionName) {
        sendCount++;
        actionCounts[actionName] = actionCounts[actionName] || 0;
        actionCounts[actionName]++;
        actionArguments = a_slice.call(arguments, 1);
      }
    });

    component = Ember.Component.create({
      _parentView: Ember.View.create({
        controller: controller
      })
    });
  },

  teardown: function() {
    Ember.run(function() {
      component.destroy();
      controller.destroy();
    });
  }
});

test("Calling sendAction on a component without an action defined does nothing", function() {
  component.sendAction();
  equal(sendCount, 0, "addItem action was not invoked");
});

test("Calling sendAction on a component with an action defined calls send on the controller", function() {
  set(component, 'action', "addItem");

  component.sendAction();

  equal(sendCount, 1, "send was called once");
  equal(actionCounts['addItem'], 1, "addItem event was sent once");
});

test("Calling sendAction with a named action uses the component's property as the action name", function() {
  set(component, 'playing', "didStartPlaying");
  set(component, 'action', "didDoSomeBusiness");

  component.sendAction('playing');

  equal(sendCount, 1, "send was called once");
  equal(actionCounts['didStartPlaying'], 1, "named action was sent");

  component.sendAction('playing');

  equal(sendCount, 2, "send was called twice");
  equal(actionCounts['didStartPlaying'], 2, "named action was sent");

  component.sendAction();

  equal(sendCount, 3, "send was called three times");
  equal(actionCounts['didDoSomeBusiness'], 1, "default action was sent");
});

test("Calling sendAction when the action name is not a string raises an exception", function() {
  set(component, 'action', {});
  set(component, 'playing', {});

  expectAssertion(function() {
    component.sendAction();
  });

  expectAssertion(function() {
    component.sendAction('playing');
  });
});

test("Calling sendAction on a component with a context", function() {
  set(component, 'playing', "didStartPlaying");

  var testContext = {song: 'She Broke My Ember'};

  component.sendAction('playing', testContext);

  deepEqual(actionArguments, [testContext], "context was sent with the action");
});

test("Calling sendAction on a component with multiple parameters", function() {
  set(component, 'playing', "didStartPlaying");

  var firstContext  = {song: 'She Broke My Ember'},
      secondContext = {song: 'My Achey Breaky Ember'};

  component.sendAction('playing', firstContext, secondContext);

  deepEqual(actionArguments, [firstContext, secondContext], "arguments were sent to the action");
});

})();

(function() {
var get = Ember.get, set = Ember.set, container, view, otherContainer;

module("ember-views/views/container_view_test", {
  teardown: function() {
    Ember.run(function() {
      container.destroy();
      if (view) { view.destroy(); }
      if (otherContainer) { otherContainer.destroy(); }
    });
  }
});

test("should be able to insert views after the DOM representation is created", function() {
  container = Ember.ContainerView.create({
    classNameBindings: ['name'],
    name: 'foo',
    container: {}
  });

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  view = Ember.View.create({
    template: function() {
      return "This is my moment";
    }
  });

  Ember.run(function() {
    container.pushObject(view);
  });

  equal(view.container, container.container, 'view gains its containerViews container');
  equal(view._parentView, container, 'view\'s _parentView is the container');
  equal(Ember.$.trim(container.$().text()), "This is my moment");

  Ember.run(function() {
    container.destroy();
  });

});

test("should be able to observe properties that contain child views", function() {
  Ember.run(function() {
    var Container = Ember.ContainerView.extend({
      childViews: ['displayView'],
      displayIsDisplayed: Ember.computed.alias('displayView.isDisplayed'),

      displayView: Ember.View.extend({
        isDisplayed: true
      })
    });

    container = Container.create();
    container.appendTo('#qunit-fixture');
  });
  equal(container.get('displayIsDisplayed'), true, "can bind to child view");

  Ember.run(function () {
    container.set('displayView.isDisplayed', false);
  });

  equal(container.get('displayIsDisplayed'), false, "can bind to child view");
});

test("childViews inherit their parents iocContainer, and retain the original container even when moved", function() {
  container = Ember.ContainerView.create({
    container: {}
  });

  otherContainer = Ember.ContainerView.create({
    container: {}
  });

  view = Ember.View.create();

  container.pushObject(view);

  equal(view.get('parentView'), container, "sets the parent view after the childView is appended");
  equal(get(view, 'container'), container.container, "inherits its parentViews iocContainer");

  container.removeObject(view);

  equal(get(view, 'container'), container.container, "leaves existing iocContainer alone");

  otherContainer.pushObject(view);

  equal(view.get('parentView'), otherContainer, "sets the new parent view after the childView is appended");
  equal(get(view, 'container'), container.container, "still inherits its original parentViews iocContainer");
});

test("should set the parentView property on views that are added to the child views array", function() {
  container = Ember.ContainerView.create();

  var View = Ember.View.extend({
      template: function() {
        return "This is my moment";
      }
    });

  view = View.create();

  container.pushObject(view);
  equal(view.get('parentView'), container, "sets the parent view after the childView is appended");

  Ember.run(function() {
    container.removeObject(view);
  });
  equal(get(view, 'parentView'), null, "sets parentView to null when a view is removed");

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  Ember.run(function() {
    container.pushObject(view);
  });

  equal(get(view, 'parentView'), container, "sets the parent view after the childView is appended");

  var secondView = View.create(),
      thirdView = View.create(),
      fourthView = View.create();

  Ember.run(function() {
    container.pushObject(secondView);
    container.replace(1, 0, [thirdView, fourthView]);
  });

  equal(get(secondView, 'parentView'), container, "sets the parent view of the second view");
  equal(get(thirdView, 'parentView'), container, "sets the parent view of the third view");
  equal(get(fourthView, 'parentView'), container, "sets the parent view of the fourth view");

  Ember.run(function() {
    container.replace(2, 2);
  });

  equal(get(view, 'parentView'), container, "doesn't change non-removed view");
  equal(get(thirdView, 'parentView'), container, "doesn't change non-removed view");
  equal(get(secondView, 'parentView'), null, "clears the parent view of the third view");
  equal(get(fourthView, 'parentView'), null, "clears the parent view of the fourth view");

  Ember.run(function() {
    secondView.destroy();
    thirdView.destroy();
    fourthView.destroy();
  });
});

test("should trigger parentViewDidChange when parentView is changed", function() {
  container = Ember.ContainerView.create();

  var secondContainer = Ember.ContainerView.create();
  var parentViewChanged = 0;

  var View = Ember.View.extend({
    parentViewDidChange: function() { parentViewChanged++; }
  });

  view = View.create();

  container.pushObject(view);
  container.removeChild(view);
  secondContainer.pushObject(view);

  equal(parentViewChanged, 3);

  Ember.run(function() {
    secondContainer.destroy();
  });
});

test("should be able to push initial views onto the ContainerView and have it behave", function() {
  var Container = Ember.ContainerView.extend({
    init: function () {
      this._super();
      this.pushObject(Ember.View.create({
        name: 'A',
        template: function () {
          return 'A';
        }
      }));
      this.pushObject(Ember.View.create({
        name: 'B',
        template: function () {
          return 'B';
        }
      }));
    },
    lengthSquared: Ember.computed(function () {
      return this.get('length') * this.get('length');
    }).property('length'),

    names: Ember.computed(function () {
      return this.mapBy('name');
    }).property('@each.name')
  });

  container = Container.create();

  equal(container.get('lengthSquared'), 4);

  deepEqual(container.get('names'), ['A','B']);

  Ember.run(container, 'appendTo', '#qunit-fixture');

  equal(container.$().text(), 'AB');

  Ember.run(function () {
    container.pushObject(Ember.View.create({
      name: 'C',
      template: function () {
        return 'C';
      }
    }));
  });

  equal(container.get('lengthSquared'), 9);

  deepEqual(container.get('names'), ['A','B','C']);

  equal(container.$().text(), 'ABC');

  Ember.run(container, 'destroy');
});

test("views that are removed from a ContainerView should have their child views cleared", function() {
  container = Ember.ContainerView.create();
  view = Ember.View.createWithMixins({
    remove: function() {
      this._super();
    },
    template: function(context, options) {
      options.data.view.appendChild(Ember.View);
    }
  });

  container.pushObject(view);

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(get(view, 'childViews.length'), 1, "precond - renders one child view");
  Ember.run(function() {
    container.removeObject(view);
  });
  equal(get(view, 'childViews.length'), 0, "child views are cleared when removed from container view");
  equal(container.$().html(),'', "the child view is removed from the DOM");
});

test("if a ContainerView starts with an empy currentView, nothing is displayed", function() {
  container = Ember.ContainerView.create();

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(container.$().text(), '', "has a empty contents");
  equal(get(container, 'childViews.length'), 0, "should not have any child views");
});

test("if a ContainerView starts with a currentView, it is rendered as a child view", function() {
  var controller = Ember.Controller.create();
  container = Ember.ContainerView.create({
    controller: controller
  });
  var context = null;
  var templateData = null;
  var mainView = Ember.View.create({
    template: function(ctx, opts) {
      context = ctx;
      templateData = opts.data;
      return "This is the main view.";
    }
  });

  set(container, 'currentView', mainView);

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(Ember.$.trim(container.$().text()), "This is the main view.", "should render its child");
  equal(get(container, 'length'), 1, "should have one child view");
  equal(container.objectAt(0), mainView, "should have the currentView as the only child view");
  equal(mainView.get('parentView'), container, "parentView is setup");
  equal(context, container.get('context'), 'context preserved');
  equal(templateData.keywords.controller, controller, 'templateData is setup');
  equal(templateData.keywords.view, mainView, 'templateData is setup');
});

test("if a ContainerView is created with a currentView, it is rendered as a child view", function() {
  var context = null;
  var templateData = null;
  var mainView = Ember.View.create({
    template: function(ctx, opts) {
      context = ctx;
      templateData = opts.data;
      return "This is the main view.";
    }
  });

  var controller = Ember.Controller.create();

  container = Ember.ContainerView.create({
    currentView: mainView,
    controller: controller
  });

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(container.$().text(), "This is the main view.", "should render its child");
  equal(get(container, 'length'), 1, "should have one child view");
  equal(container.objectAt(0), mainView, "should have the currentView as the only child view");
  equal(mainView.get('parentView'), container, "parentView is setup");
  equal(context, container.get('context'), 'context preserved');
  equal(templateData.keywords.controller, controller, 'templateData is setup');
  equal(templateData.keywords.view, mainView, 'templateData is setup');
});

test("if a ContainerView starts with no currentView and then one is set, the ContainerView is updated", function() {
  var context = null;
  var templateData = null;
  var mainView = Ember.View.create({
    template: function(ctx, opts) {
      context = ctx;
      templateData = opts.data;
      return "This is the main view.";
    }
  });

  var controller = Ember.Controller.create();

  container = Ember.ContainerView.create({
    controller: controller
  });

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(container.$().text(), '', "has a empty contents");
  equal(get(container, 'childViews.length'), 0, "should not have any child views");

  Ember.run(function() {
    set(container, 'currentView', mainView);
  });

  equal(container.$().text(), "This is the main view.", "should render its child");
  equal(get(container, 'length'), 1, "should have one child view");
  equal(container.objectAt(0), mainView, "should have the currentView as the only child view");
  equal(mainView.get('parentView'), container, "parentView is setup");
  equal(context, container.get('context'), 'context preserved');
  equal(templateData.keywords.controller, controller, 'templateData is setup');
  equal(templateData.keywords.view, mainView, 'templateData is setup');
});

test("if a ContainerView starts with a currentView and then is set to null, the ContainerView is updated", function() {
  var context = null;
  var templateData = null;
  var mainView = Ember.View.create({
    template: function(ctx, opts) {
      context = ctx;
      templateData = opts.data;
      return "This is the main view.";
    }
  });

  var controller = Ember.Controller.create();

  container = Ember.ContainerView.create({
    controller: controller
  });

  container.set('currentView', mainView);

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(container.$().text(), "This is the main view.", "should render its child");
  equal(get(container, 'length'), 1, "should have one child view");
  equal(container.objectAt(0), mainView, "should have the currentView as the only child view");
  equal(mainView.get('parentView'), container, "parentView is setup");
  equal(context, container.get('context'), 'context preserved');
  equal(templateData.keywords.controller, controller, 'templateData is setup');
  equal(templateData.keywords.view, mainView, 'templateData is setup');

  Ember.run(function() {
    set(container, 'currentView', null);
  });

  equal(container.$().text(), '', "has a empty contents");
  equal(get(container, 'childViews.length'), 0, "should not have any child views");
});

test("if a ContainerView starts with a currentView and then is set to null, the ContainerView is updated and the previous currentView is destroyed", function() {
  var context = null;
  var templateData = null;
  var mainView = Ember.View.create({
    template: function(ctx, opts) {
      context = ctx;
      templateData = opts.data;
      return "This is the main view.";
    }
  });

  var controller = Ember.Controller.create();

  container = Ember.ContainerView.create({
    controller: controller
  });

  container.set('currentView', mainView);

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(container.$().text(), "This is the main view.", "should render its child");
  equal(get(container, 'length'), 1, "should have one child view");
  equal(container.objectAt(0), mainView, "should have the currentView as the only child view");
  equal(mainView.get('parentView'), container, "parentView is setup");
  equal(context, container.get('context'), 'context preserved');
  equal(templateData.keywords.controller, controller, 'templateData is setup');
  equal(templateData.keywords.view, mainView, 'templateData is setup');

  Ember.run(function() {
    set(container, 'currentView', null);
  });

  equal(mainView.isDestroyed, true, 'should destroy the previous currentView.');

  equal(container.$().text(), '', "has a empty contents");
  equal(get(container, 'childViews.length'), 0, "should not have any child views");
});

test("if a ContainerView starts with a currentView and then a different currentView is set, the old view is destroyed and the new one is added", function() {
  container = Ember.ContainerView.create();
  var mainView = Ember.View.create({
    template: function() {
      return "This is the main view.";
    }
  });

  var secondaryView = Ember.View.create({
    template: function() {
      return "This is the secondary view.";
    }
  });

  var tertiaryView = Ember.View.create({
    template: function() {
      return "This is the tertiary view.";
    }
  });

  container.set('currentView', mainView);

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(container.$().text(), "This is the main view.", "should render its child");
  equal(get(container, 'length'), 1, "should have one child view");
  equal(container.objectAt(0), mainView, "should have the currentView as the only child view");

  Ember.run(function() {
    set(container, 'currentView', secondaryView);
  });


  equal(get(container, 'length'), 1, "should have one child view");
  equal(container.objectAt(0), secondaryView, "should have the currentView as the only child view");
  equal(mainView.isDestroyed, true, 'should destroy the previous currentView: mainView.');

  equal(Ember.$.trim(container.$().text()), "This is the secondary view.", "should render its child");

  Ember.run(function() {
    set(container, 'currentView', tertiaryView);
  });

  equal(get(container, 'length'), 1, "should have one child view");
  equal(container.objectAt(0), tertiaryView, "should have the currentView as the only child view");
  equal(secondaryView.isDestroyed, true, 'should destroy the previous currentView: secondaryView.');

  equal(Ember.$.trim(container.$().text()), "This is the tertiary view.", "should render its child");
});

test("should be able to modify childViews many times during an run loop", function () {

  container = Ember.ContainerView.create();

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  var one = Ember.View.create({
    template: function() {
      return 'one';
    }
  });

  var two = Ember.View.create({
    template: function() {
      return 'two';
    }
  });

  var three = Ember.View.create({
    template: function() {
      return 'three';
    }
  });

  Ember.run(function() {
    // initial order
    container.pushObjects([three, one, two]);
    // sort
    container.removeObject(three);
    container.pushObject(three);
  });

  // Remove whitespace added by IE 8
  equal(container.$().text().replace(/\s+/g,''), 'onetwothree');
});

test("should be able to modify childViews then remove the ContainerView in same run loop", function () {
  container = Ember.ContainerView.create();

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  var count = 0;
  var child = Ember.View.create({
    template: function () { count++; return 'child'; }
  });

  Ember.run(function() {
    container.pushObject(child);
    container.remove();
  });

  equal(count, 0, 'did not render child');
});

test("should be able to modify childViews then destroy the ContainerView in same run loop", function () {
    container = Ember.ContainerView.create();

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  var count = 0;
  var child = Ember.View.create({
    template: function () { count++; return 'child'; }
  });

  Ember.run(function() {
    container.pushObject(child);
    container.destroy();
  });

  equal(count, 0, 'did not render child');
});


test("should be able to modify childViews then rerender the ContainerView in same run loop", function () {
    container = Ember.ContainerView.create();

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  var count = 0;
  var child = Ember.View.create({
    template: function () { count++; return 'child'; }
  });

  Ember.run(function() {
    container.pushObject(child);
    container.rerender();
  });

  equal(count, 1, 'rendered child only once');
});

test("should be able to modify childViews then rerender then modify again the ContainerView in same run loop", function () {
  container = Ember.ContainerView.create();

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  var Child = Ember.View.extend({
    count: 0,
    render: function (buffer) {
      this.count++;
      buffer.push(this.label);
    }
  });
  var one = Child.create({label: 'one'});
  var two = Child.create({label: 'two'});

  Ember.run(function() {
    container.pushObject(one);
    container.pushObject(two);
  });

  equal(one.count, 1, 'rendered child only once');
  equal(two.count, 1, 'rendered child only once');
  // Remove whitespace added by IE 8
  equal(container.$().text().replace(/\s+/g, ''), 'onetwo');
});

test("should be able to modify childViews then rerender again the ContainerView in same run loop and then modify again", function () {
  container = Ember.ContainerView.create();

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  var Child = Ember.View.extend({
    count: 0,
    render: function (buffer) {
      this.count++;
      buffer.push(this.label);
    }
  });
  var one = Child.create({label: 'one'});
  var two = Child.create({label: 'two'});

  Ember.run(function() {
    container.pushObject(one);
    container.rerender();
  });

  equal(one.count, 1, 'rendered child only once');
  equal(container.$().text(), 'one');

  Ember.run(function () {
    container.pushObject(two);
  });

  equal(one.count, 1, 'rendered child only once');
  equal(two.count, 1, 'rendered child only once');
  // IE 8 adds a line break but this shouldn't affect validity
  equal(container.$().text().replace(/\s/g, ''), 'onetwo');
});

test("should invalidate `element` on itself and childViews when being rendered by ensureChildrenAreInDOM", function () {
  var root = Ember.ContainerView.create();

  view = Ember.View.create({ template: function() {} });
  container = Ember.ContainerView.create({ childViews: ['child'], child: view });

  Ember.run(function() {
    root.appendTo('#qunit-fixture');
  });

  Ember.run(function() {
    root.pushObject(container);

    // Get the parent and child's elements to cause them to be cached as null
    container.get('element');
    view.get('element');
  });

  ok(!!container.get('element'), "Parent's element should have been recomputed after being rendered");
  ok(!!view.get('element'), "Child's element should have been recomputed after being rendered");

  Ember.run(function() {
    root.destroy();
  });
});

test("Child view can only be added to one container at a time", function () {
  expect(2);

  container = Ember.ContainerView.create();
  var secondContainer = Ember.ContainerView.create();

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  var view = Ember.View.create();

  Ember.run(function() {
    container.set('currentView', view);
  });

  expectAssertion(function() {
    Ember.run(function() {
      secondContainer.set('currentView', view);
    });
  });

  expectAssertion(function() {
    Ember.run(function() {
      secondContainer.pushObject(view);
    });
  });

  Ember.run(function() {
    secondContainer.destroy();
  });
});

test("if a containerView appends a child in its didInsertElement event, the didInsertElement event of the child view should be fired once", function () {

  var counter = 0,
      root = Ember.ContainerView.create({});

  container = Ember.ContainerView.create({

    didInsertElement: function() {

      var view = Ember.ContainerView.create({
        didInsertElement: function() {
          counter++;
        }
      });

      this.pushObject(view);

    }

  });


  Ember.run(function() {
    root.appendTo('#qunit-fixture');
  });

  Ember.run(function() {
    root.pushObject(container);
  });

  equal(container.get('childViews').get('length'), 1 , "containerView should only have a child");
  equal(counter, 1 , "didInsertElement should be fired once");

  Ember.run(function() {
    root.destroy();
  });

});


})();

(function() {
var set = Ember.set, get = Ember.get, view;

module("Ember.View action handling", {
  teardown: function() {
    Ember.run(function() {
      if (view) { view.destroy(); }
    });
  }
});

test("Action can be handled by a function on actions object", function() {
  expect(1);
  view = Ember.View.extend({
    actions: {
      poke: function() {
        ok(true, 'poked');
      }
    }
  }).create();
  view.send("poke");
});

test("Action can be handled by a function on the view (DEPRECATED)", function() {
  Ember.TESTING_DEPRECATION = true;
  expect(1);
  view = Ember.View.extend({
    poke: function() {
      ok(true, 'poked');
      Ember.TESTING_DEPRECATION = true;
    }
  }).create();
  view.send("poke");
});

test("A handled action can be bubbled to the target for continued processing", function() {
  expect(2);
  view = Ember.View.extend({
    actions: {
      poke: function() {
        ok(true, 'poked 1');
        return true;
      }
    },
    target: Ember.Controller.extend({
      actions: {
        poke: function() {
          ok(true, 'poked 2');
        }
      }
    }).create()
  }).create();
  view.send("poke");
});

test("Action can be handled by a superclass' actions object", function() {
  expect(4);

  var SuperView = Ember.View.extend({
    actions: {
      foo: function() {
        ok(true, 'foo');
      },
      bar: function(msg) {
        equal(msg, "HELLO");
      }
    }
  });

  var BarViewMixin = Ember.Mixin.create({
    actions: {
      bar: function(msg) {
        equal(msg, "HELLO");
        this._super(msg);
      }
    }
  });

  var IndexView = SuperView.extend(BarViewMixin, {
    actions: {
      baz: function() {
        ok(true, 'baz');
      }
    }
  });

  view = IndexView.create();
  view.send("foo");
  view.send("bar", "HELLO");
  view.send("baz");
});

test("Actions cannot be provided at create time", function() {
  expectAssertion(function() {
    view = Ember.View.create({
      actions: {
        foo: function() {
          ok(true, 'foo');
        }
      }
    });
  });
  // but should be OK on an object that doesn't mix in Ember.ActionHandler
  var obj = Ember.Object.create({
    actions: ['foo']
  });
});



})();

(function() {
var set = Ember.set, get = Ember.get;

var View, view, willDestroyCalled, childView;

module("Ember.View - append() and appendTo()", {
  setup: function() {
    View = Ember.View.extend({});
  },

  teardown: function() {
    Ember.run(function() {
      if (!view.isDestroyed) { view.destroy(); }
    });
  }
});

test("should be added to the specified element when calling appendTo()", function() {
  Ember.$("#qunit-fixture").html('<div id="menu"></div>');

  view = View.create();

  ok(!get(view, 'element'), "precond - should not have an element");

  Ember.run(function() {
    view.appendTo('#menu');
  });

  var viewElem = Ember.$('#menu').children();
  ok(viewElem.length > 0, "creates and appends the view's element");
});

test("should be added to the document body when calling append()", function() {
  view = View.create({
    render: function(buffer) {
      buffer.push("foo bar baz");
    }
  });

  ok(!get(view, 'element'), "precond - should not have an element");

  Ember.run(function() {
    view.append();
  });

  var viewElem = Ember.$(document.body).find(':contains("foo bar baz")');
  ok(viewElem.length > 0, "creates and appends the view's element");
});

test("raises an assert when a target does not exist in the DOM", function() {
  view = View.create();

  expectAssertion(function() {
    Ember.run(function() {
      view.appendTo('does-not-exist-in-dom');
    });
  });
});

test("append calls willInsertElement and didInsertElement callbacks", function() {
  var willInsertElementCalled = false;
  var willInsertElementCalledInChild = false;
  var didInsertElementCalled = false;

  var ViewWithCallback = View.extend({
    willInsertElement: function() {
      willInsertElementCalled = true;
    },
    didInsertElement: function() {
      didInsertElementCalled = true;
    },
    render: function(buffer) {
      this.appendChild(Ember.View.create({
        willInsertElement: function() {
          willInsertElementCalledInChild = true;
        }
      }));
    }
  });

  view = ViewWithCallback.create();

  Ember.run(function() {
    view.append();
  });

  ok(willInsertElementCalled, "willInsertElement called");
  ok(willInsertElementCalledInChild, "willInsertElement called in child");
  ok(didInsertElementCalled, "didInsertElement called");
});

test("remove removes an element from the DOM", function() {
  willDestroyCalled = 0;

  view = View.create({
    willDestroyElement: function() {
      willDestroyCalled++;
    }
  });

  ok(!get(view, 'element'), "precond - should not have an element");

  Ember.run(function() {
    view.append();
  });

  ok(Ember.$("#" + get(view, 'elementId')).length === 1, "precond - element was inserted");

  Ember.run(function() {
    view.remove();
  });

  ok(Ember.$("#" + get(view, 'elementId')).length === 0, "remove removes an element from the DOM");
  ok(Ember.View.views[get(view, 'elementId')] === undefined, "remove does not remove the view from the view hash");
  ok(!get(view, 'element'), "remove nulls out the element");
  equal(willDestroyCalled, 1, "the willDestroyElement hook was called once");
});

test("destroy more forcibly removes the view", function() {
  willDestroyCalled = 0;

  view = View.create({
    willDestroyElement: function() {
      willDestroyCalled++;
    }
  });

  ok(!get(view, 'element'), "precond - should not have an element");

  Ember.run(function() {
    view.append();
  });

  ok(Ember.$("#" + get(view, 'elementId')).length === 1, "precond - element was inserted");

  Ember.run(function() {
    view.destroy();
  });

  ok(Ember.$("#" + get(view, 'elementId')).length === 0, "destroy removes an element from the DOM");
  ok(Ember.View.views[get(view, 'elementId')] === undefined, "destroy removes a view from the global views hash");
  equal(get(view, 'isDestroyed'), true, "the view is marked as destroyed");
  ok(!get(view, 'element'), "the view no longer has an element");
  equal(willDestroyCalled, 1, "the willDestroyElement hook was called once");
});

module("Ember.View - append() and appendTo() in a view hierarchy", {
  setup: function() {
    View = Ember.ContainerView.extend({
      childViews: ['child'],
      child: Ember.View.extend({
        elementId: 'child'
      })
    });
  },

  teardown: function() {
    Ember.run(function() {
      if (!view.isDestroyed) { view.destroy(); }
    });
  }
});

test("should be added to the specified element when calling appendTo()", function() {
  Ember.$("#qunit-fixture").html('<div id="menu"></div>');

  view = View.create();

  ok(!get(view, 'element'), "precond - should not have an element");

  Ember.run(function() {
    view.appendTo('#menu');
  });

  var viewElem = Ember.$('#menu #child');
  ok(viewElem.length > 0, "creates and appends the view's element");
});

test("should be added to the document body when calling append()", function() {
  Ember.$("#qunit-fixture").html('<div id="menu"></div>');

  view = View.create();

  ok(!get(view, 'element'), "precond - should not have an element");

  Ember.run(function() {
    view.append();
  });

  var viewElem = Ember.$('#child');
  ok(viewElem.length > 0, "creates and appends the view's element");
});

module("Ember.View - removing views in a view hierarchy", {
  setup: function() {
    willDestroyCalled = 0;

    view = Ember.ContainerView.create({
      childViews: ['child'],
      child: Ember.View.create({
        willDestroyElement: function() {
          willDestroyCalled++;
        }
      })
    });

    childView = get(view, 'child');
  },

  teardown: function() {
    Ember.run(function() {
      if (!view.isDestroyed) { view.destroy(); }
    });
  }
});

test("remove removes child elements from the DOM", function() {
  ok(!get(childView, 'element'), "precond - should not have an element");

  Ember.run(function() {
    view.append();
  });

  ok(Ember.$("#" + get(childView, 'elementId')).length === 1, "precond - element was inserted");

  // remove parent view
  Ember.run(function() {
    view.remove();
  });

  ok(Ember.$("#" + get(childView, 'elementId')).length === 0, "remove removes child elements the DOM");
  ok(Ember.View.views[get(childView, 'elementId')] === undefined, "remove does not remove child views from the view hash");
  ok(!get(childView, 'element'), "remove nulls out child elements");
  equal(willDestroyCalled, 1, "the willDestroyElement hook was called once");
});

test("destroy more forcibly removes child views", function() {
  ok(!get(childView, 'element'), "precond - should not have an element");

  Ember.run(function() {
    view.append();
  });

  ok(Ember.$("#" + get(childView, 'elementId')).length === 1, "precond - child element was inserted");

  willDestroyCalled = 0;

  Ember.run(function() {
    view.destroy();
  });

  ok(Ember.$("#" + get(childView, 'elementId')).length === 0, "destroy removes child elements from the DOM");
  ok(Ember.View.views[get(childView, 'elementId')] === undefined, "destroy removes a child views from the global views hash");
  equal(get(childView, 'isDestroyed'), true, "child views are marked as destroyed");
  ok(!get(childView, 'element'), "child views no longer have an element");
  equal(willDestroyCalled, 1, "the willDestroyElement hook was called once on children");
});

test("destroy removes a child view from its parent", function() {
  ok(!get(childView, 'element'), "precond - should not have an element");

  Ember.run(function() {
    view.append();
  });

  ok(Ember.$("#" + get(childView, 'elementId')).length === 1, "precond - child element was inserted");

  Ember.run(function() {
    childView.destroy();
  });

  ok(get(view, 'childViews.length') === 0, "Destroyed child views should be removed from their parent");
});


})();

(function() {
/*global Test:true*/
var set = Ember.set, get = Ember.get;

var originalLookup = Ember.lookup, lookup, view;

var appendView = function() {
  Ember.run(function() { view.appendTo('#qunit-fixture'); });
};

module("Ember.View - Attribute Bindings", {
  setup: function() {
    Ember.lookup = lookup = {};
  },
  teardown: function() {
    if (view) {
      Ember.run(function() {
        view.destroy();
      });
      view = null;
    }
    Ember.lookup = originalLookup;
  }
});

test("should render attribute bindings", function() {
  view = Ember.View.create({
    classNameBindings: ['priority', 'isUrgent', 'isClassified:classified', 'canIgnore'],
    attributeBindings: ['type', 'isDisabled:disabled', 'exploded', 'destroyed', 'exists', 'nothing', 'notDefined', 'notNumber', 'explosions'],

    type: 'submit',
    isDisabled: true,
    exploded: false,
    destroyed: false,
    exists: true,
    nothing: null,
    notDefined: undefined,
    notNumber: NaN
  });

  Ember.run(function() {
    view.createElement();
  });

  equal(view.$().attr('type'), 'submit', "updates type attribute");
  ok(view.$().prop('disabled'), "supports customizing attribute name for Boolean values");
  ok(!view.$().prop('exploded'), "removes exploded attribute when false");
  ok(!view.$().prop('destroyed'), "removes destroyed attribute when false");
  ok(view.$().prop('exists'), "adds exists attribute when true");
  ok(!view.$().attr('nothing'), "removes nothing attribute when null");
  ok(!view.$().attr('notDefined'), "removes notDefined attribute when undefined");
  ok(!view.$().attr('notNumber'), "removes notNumber attribute when NaN");
});

test("should update attribute bindings", function() {
  view = Ember.View.create({
    classNameBindings: ['priority', 'isUrgent', 'isClassified:classified', 'canIgnore'],
    attributeBindings: ['type', 'isDisabled:disabled', 'exploded', 'destroyed', 'exists', 'nothing', 'notDefined', 'notNumber', 'explosions'],

    type: 'reset',
    isDisabled: true,
    exploded: true,
    destroyed: true,
    exists: false,
    nothing: true,
    notDefined: true,
    notNumber: true,
    explosions: 15
  });

  Ember.run(function() {
    view.createElement();
  });

  equal(view.$().attr('type'), 'reset', "adds type attribute");
  ok(view.$().prop('disabled'), "adds disabled attribute when true");
  ok(view.$().prop('exploded'), "adds exploded attribute when true");
  ok(view.$().prop('destroyed'), "adds destroyed attribute when true");
  ok(!view.$().prop('exists'), "does not add exists attribute when false");
  ok(view.$().prop('nothing'), "adds nothing attribute when true");
  ok(view.$().prop('notDefined'), "adds notDefined attribute when true");
  ok(view.$().prop('notNumber'), "adds notNumber attribute when true");
  equal(view.$().attr('explosions'), "15", "adds integer attributes");

  Ember.run(function() {
    view.set('type', 'submit');
    view.set('isDisabled', false);
    view.set('exploded', false);
    view.set('destroyed', false);
    view.set('exists', true);
    view.set('nothing', null);
    view.set('notDefined', undefined);
    view.set('notNumber', NaN);
  });

  equal(view.$().attr('type'), 'submit', "updates type attribute");
  ok(!view.$().prop('disabled'), "removes disabled attribute when false");
  ok(!view.$().prop('exploded'), "removes exploded attribute when false");
  ok(!view.$().prop('destroyed'), "removes destroyed attribute when false");
  ok(view.$().prop('exists'), "adds exists attribute when true");
  ok(!view.$().attr('nothing'), "removes nothing attribute when null");
  ok(!view.$().attr('notDefined'), "removes notDefined attribute when undefined");
  ok(!view.$().attr('notNumber'), "removes notNumber attribute when NaN");
});

// This comes into play when using the {{#each}} helper. If the
// passed array item is a String, it will be converted into a
// String object instead of a normal string.
test("should allow binding to String objects", function() {
  view = Ember.View.create({
    attributeBindings: ['foo'],
    // JSHint doesn't like `new String` so we'll create it the same way it gets created in practice
    foo: (function() { return this; }).call("bar")
  });

  Ember.run(function() {
    view.createElement();
  });


  equal(view.$().attr('foo'), 'bar', "should convert String object to bare string");

  Ember.run(function() {
    view.set('foo', false);
  });

  ok(!view.$().attr('foo'), "removes foo attribute when false");
});

test("should teardown observers on rerender", function() {
  view = Ember.View.create({
    attributeBindings: ['foo'],
    classNameBindings: ['foo'],
    foo: 'bar'
  });

  appendView();

  equal(Ember.observersFor(view, 'foo').length, 2);

  Ember.run(function() {
    view.rerender();
  });

  equal(Ember.observersFor(view, 'foo').length, 2);
});

test("handles attribute bindings for properties", function() {
  view = Ember.View.create({
    attributeBindings: ['checked'],
    checked: null
  });

  appendView();

  equal(!!view.$().prop('checked'), false, 'precond - is not checked');

  Ember.run(function() {
    view.set('checked', true);
  });

  equal(view.$().prop('checked'), true, 'changes to checked');

  Ember.run(function() {
    view.set('checked', false);
  });

  equal(view.$().prop('checked'), false, 'changes to unchecked');
});

test("handles `undefined` value for properties", function() {
  view = Ember.View.create({
    attributeBindings: ['value'],
    value: "test"
  });

  appendView();

  equal(view.$().prop('value'), "test", "value is defined");

  Ember.run(function() {
    view.set('value', undefined);
  });

  equal(!!view.$().prop('value'), false, "value is not defined");
});

test("handles null value for attributes on text fields", function() {
  view = Ember.View.create({
    tagName: 'input',
    attributeBindings: ['value']
  });

  appendView();

  view.$().attr('value', 'test');

  equal(view.$().attr('value'), "test", "value is defined");

  Ember.run(function() {
    view.set('value', null);
  });

  equal(!!view.$().prop('value'), false, "value is not defined");
});

test("handles a 0 value attribute on text fields", function() {
  view = Ember.View.create({
    tagName: 'input',
    attributeBindings: ['value']
  });

  appendView();

  view.$().attr('value', 'test');
  equal(view.$().attr('value'), "test", "value is defined");

  Ember.run(function() {
    view.set('value', 0);
  });
  strictEqual(view.$().prop('value'), "0", "value should be 0");
});

test("attributeBindings should not fail if view has been removed", function() {
  Ember.run(function() {
    view = Ember.View.create({
      attributeBindings: ['checked'],
      checked: true
    });
  });
  Ember.run(function() {
    view.createElement();
  });
  var error;
  try {
    Ember.run(function() {
      Ember.changeProperties(function() {
        view.set('checked', false);
        view.remove();
      });
    });
  } catch(e) {
    error = e;
  }
  ok(!error, error);
});

test("attributeBindings should not fail if view has been destroyed", function() {
  Ember.run(function() {
    view = Ember.View.create({
      attributeBindings: ['checked'],
      checked: true
    });
  });
  Ember.run(function() {
    view.createElement();
  });
  var error;
  try {
    Ember.run(function() {
      Ember.changeProperties(function() {
        view.set('checked', false);
        view.destroy();
      });
    });
  } catch(e) {
    error = e;
  }
  ok(!error, error);
});

})();

(function() {
(function() {
  var parentView, childView, childViews;
  var get = Ember.get;

  module('tests/views/view/child_views_tests.js', {
    setup: function() {
      parentView = Ember.View.create({
        render: function(buffer) {
          buffer.push('Em');
          this.appendChild(childView);
        }
      });

      childView = Ember.View.create({
        template: function() { return 'ber'; }
      });
    },

    teardown: function() {
      Ember.run(function() {
        parentView.destroy();
        childView.destroy();
      });

      childViews = null;
    }
  });

  // no parent element, buffer, no element
  // parent element

  // no parent element, no buffer, no element
  test("should render an inserted child view when the child is inserted before a DOM element is created", function() {
    Ember.run(function() {
      parentView.append();
    });

    equal(parentView.$().text(), 'Ember', 'renders the child view after the parent view');
  });

  test("should not duplicate childViews when rerendering in buffer", function() {

    var Inner = Ember.View.extend({
      template: function() { return ''; }
    });

    var Inner2 = Ember.View.extend({
      template: function() { return ''; }
    });

    var Middle = Ember.View.extend({
      render: function(buffer) {
        this.appendChild(Inner);
        this.appendChild(Inner2);
      }
    });

    var outer = Ember.View.create({
      render: function(buffer) {
        this.middle = this.appendChild(Middle);
      }
    });

    Ember.run(function() {
      outer.renderToBuffer();
    });

    equal(outer.get('middle.childViews.length'), 2, 'precond middle has 2 child views rendered to buffer');

    raises(function() {
      Ember.run(function() {
        outer.middle.rerender();
      });
    }, /Something you did caused a view to re-render after it rendered but before it was inserted into the DOM./);

    equal(outer.get('middle.childViews.length'), 2, 'middle has 2 child views rendered to buffer');

    Ember.run(function() {
      outer.destroy();
    });
  });

})();

})();

(function() {
var set = Ember.set, get = Ember.get, view;

module("Ember.View - Class Name Bindings", {
  teardown: function() {
    Ember.run(function() {
      view.destroy();
    });
  }
});

test("should apply bound class names to the element", function() {
  view = Ember.View.create({
    classNameBindings: ['priority', 'isUrgent', 'isClassified:classified',
                        'canIgnore', 'messages.count', 'messages.resent:is-resent',
                        'isNumber:is-number', 'isFalsy::is-falsy', 'isTruthy::is-not-truthy',
                        'isEnabled:enabled:disabled'],

    priority: 'high',
    isUrgent: true,
    isClassified: true,
    canIgnore: false,
    isNumber: 5,
    isFalsy: 0,
    isTruthy: 'abc',
    isEnabled: true,

    messages: {
      count: 'five-messages',
      resent: true
    }
  });

  Ember.run(function() {
    view.createElement();
  });

  ok(view.$().hasClass('high'), "adds string values as class name");
  ok(view.$().hasClass('is-urgent'), "adds true Boolean values by dasherizing");
  ok(view.$().hasClass('classified'), "supports customizing class name for Boolean values");
  ok(view.$().hasClass('five-messages'), "supports paths in bindings");
  ok(view.$().hasClass('is-resent'), "supports customing class name for paths");
  ok(view.$().hasClass('is-number'), "supports colon syntax with truthy properties");
  ok(view.$().hasClass('is-falsy'), "supports colon syntax with falsy properties");
  ok(!view.$().hasClass('abc'), "does not add values as classes when falsy classes have been specified");
  ok(!view.$().hasClass('is-not-truthy'), "does not add falsy classes when values are truthy");
  ok(!view.$().hasClass('can-ignore'), "does not add false Boolean values as class");
  ok(view.$().hasClass('enabled'), "supports customizing class name for Boolean values with negation");
  ok(!view.$().hasClass('disabled'), "does not add class name for negated binding");
});

test("should add, remove, or change class names if changed after element is created", function() {
  view = Ember.View.create({
    classNameBindings: ['priority', 'isUrgent', 'isClassified:classified',
                        'canIgnore', 'messages.count', 'messages.resent:is-resent',
                        'isEnabled:enabled:disabled'],

    priority: 'high',
    isUrgent: true,
    isClassified: true,
    canIgnore: false,
    isEnabled: true,

    messages: Ember.Object.create({
      count: 'five-messages',
      resent: false
    })
  });

  Ember.run(function() {
    view.createElement();
    set(view, 'priority', 'orange');
    set(view, 'isUrgent', false);
    set(view, 'canIgnore', true);
    set(view, 'isEnabled', false);
    set(view, 'messages.count', 'six-messages');
    set(view, 'messages.resent', true );
  });

  ok(view.$().hasClass('orange'), "updates string values");
  ok(!view.$().hasClass('high'), "removes old string value");

  ok(!view.$().hasClass('is-urgent', "removes dasherized class when changed from true to false"));
  ok(view.$().hasClass('can-ignore'), "adds dasherized class when changed from false to true");

  ok(view.$().hasClass('six-messages'), "adds new value when path changes");
  ok(!view.$().hasClass('five-messages'), "removes old value when path changes");

  ok(view.$().hasClass('is-resent'), "adds customized class name when path changes");

  ok(!view.$().hasClass('enabled'), "updates class name for negated binding");
  ok(view.$().hasClass('disabled'), "adds negated class name for negated binding");
});

test(":: class name syntax works with an empty true class", function() {
  view = Ember.View.create({
    isEnabled: false,
    classNameBindings: ['isEnabled::not-enabled']
  });

  Ember.run(function() { view.createElement(); });

  equal(view.$().attr('class'), 'ember-view not-enabled', "false class is rendered when property is false");

  Ember.run(function() { view.set('isEnabled', true); });

  equal(view.$().attr('class'), 'ember-view', "no class is added when property is true and the class is empty");
});

test("classNames should not be duplicated on rerender", function() {
  Ember.run(function() {
    view = Ember.View.create({
      classNameBindings: ['priority'],
      priority: 'high'
    });
  });


  Ember.run(function() {
    view.createElement();
  });

  equal(view.$().attr('class'), 'ember-view high');

  Ember.run(function() {
    view.rerender();
  });

  equal(view.$().attr('class'), 'ember-view high');
});

test("classNameBindings should work when the binding property is updated and the view has been removed of the DOM", function() {
  Ember.run(function() {
    view = Ember.View.create({
      classNameBindings: ['priority'],
      priority: 'high'
    });
  });


  Ember.run(function() {
    view.createElement();
  });

  equal(view.$().attr('class'), 'ember-view high');

  Ember.run(function() {
    view.remove();
  });

  view.set('priority', 'low');

  Ember.run(function() {
    view.append();
  });

  equal(view.$().attr('class'), 'ember-view low');

});

test("classNames removed by a classNameBindings observer should not re-appear on rerender", function() {
  view = Ember.View.create({
    classNameBindings: ['isUrgent'],
    isUrgent: true
  });

  Ember.run(function() {
    view.createElement();
  });

  equal(view.$().attr('class'), 'ember-view is-urgent');

  Ember.run(function() {
    view.set('isUrgent', false);
  });

  equal(view.$().attr('class'), 'ember-view');

  Ember.run(function() {
    view.rerender();
  });

  equal(view.$().attr('class'), 'ember-view');
});

test("classNameBindings lifecycle test", function() {
  Ember.run(function() {
    view = Ember.View.create({
      classNameBindings: ['priority'],
      priority: 'high'
    });
  });

  equal(Ember.isWatching(view, 'priority'), false);

  Ember.run(function() {
    view.createElement();
  });

  equal(view.$().attr('class'), 'ember-view high');
  equal(Ember.isWatching(view, 'priority'), true);

  Ember.run(function() {
    view.remove();
    view.set('priority', 'low');
  });

  equal(Ember.isWatching(view, 'priority'), false);
});

test("classNameBindings should not fail if view has been removed", function() {
  Ember.run(function() {
    view = Ember.View.create({
      classNameBindings: ['priority'],
      priority: 'high'
    });
  });
  Ember.run(function() {
    view.createElement();
  });
  var error;
  try {
    Ember.run(function() {
      Ember.changeProperties(function() {
        view.set('priority', 'low');
        view.remove();
      });
    });
  } catch(e) {
    error = e;
  }
  ok(!error, error);
});

test("classNameBindings should not fail if view has been destroyed", function() {
  Ember.run(function() {
    view = Ember.View.create({
      classNameBindings: ['priority'],
      priority: 'high'
    });
  });
  Ember.run(function() {
    view.createElement();
  });
  var error;
  try {
    Ember.run(function() {
      Ember.changeProperties(function() {
        view.set('priority', 'low');
        view.destroy();
      });
    });
  } catch(e) {
    error = e;
  }
  ok(!error, error);
});

})();

(function() {
module("Ember.View - _classStringForValue");

var cSFV = Ember.View._classStringForValue;

test("returns dasherized version of last path part if value is true", function() {
  equal(cSFV("propertyName", true), "property-name", "class is dasherized");
  equal(cSFV("content.propertyName", true), "property-name", "class is dasherized");
});

test("returns className if value is true and className is specified", function() {
  equal(cSFV("propertyName", true, "truthyClass"), "truthyClass", "returns className if given");
  equal(cSFV("content.propertyName", true, "truthyClass"), "truthyClass", "returns className if given");
});

test("returns falsyClassName if value is false and falsyClassName is specified", function() {
  equal(cSFV("propertyName", false, "truthyClass", "falsyClass"), "falsyClass", "returns falsyClassName if given");
  equal(cSFV("content.propertyName", false, "truthyClass", "falsyClass"), "falsyClass", "returns falsyClassName if given");
});

test("returns null if value is false and falsyClassName is not specified", function() {
  equal(cSFV("propertyName", false, "truthyClass"), null, "returns null if falsyClassName is not specified");
  equal(cSFV("content.propertyName", false, "truthyClass"), null, "returns null if falsyClassName is not specified");
});

test("returns null if value is false", function() {
  equal(cSFV("propertyName", false), null, "returns null if value is false");
  equal(cSFV("content.propertyName", false), null, "returns null if value is false");
});

test("returns null if value is true and className is not specified and falsyClassName is specified", function() {
  equal(cSFV("propertyName", true, undefined, "falsyClassName"), null, "returns null if value is true");
  equal(cSFV("content.propertyName", true, undefined, "falsyClassName"), null, "returns null if value is true");
});

test("returns the value if the value is truthy", function() {
  equal(cSFV("propertyName", "myString"), "myString", "returns value if the value is truthy");
  equal(cSFV("content.propertyName", "myString"), "myString", "returns value if the value is truthy");

  equal(cSFV("propertyName", "123"), 123, "returns value if the value is truthy");
  equal(cSFV("content.propertyName", 123), 123, "returns value if the value is truthy");
});
})();

(function() {
module("Ember.View - context property");

test("setting a controller on an inner view should change it context", function() {
  var App = {};
  var a = { name: 'a' };
  var b = { name: 'b' };

  var innerView = Ember.View.create();
  var middleView = Ember.ContainerView.create();
  var outerView = App.outerView = Ember.ContainerView.create({
    controller: a
  });

  Ember.run(function() {
    outerView.appendTo('#qunit-fixture');
  });

  Ember.run(function () {
    outerView.set('currentView', middleView);
  });

  Ember.run(function () {
    innerView.set('controller', b);
    middleView.set('currentView', innerView);
  });

  // assert
  equal(outerView.get('context'), a, 'outer context correct');
  equal(middleView.get('context'), a, 'middle context correct');
  equal(innerView.get('context'), b, 'inner context correct');

  Ember.run(function() {
    innerView.destroy();
    middleView.destroy();
    outerView.destroy();
  });
});


})();

(function() {
module("Ember.View - controller property");

test("controller property should be inherited from nearest ancestor with controller", function() {
  var grandparent = Ember.ContainerView.create();
  var parent = Ember.ContainerView.create();
  var child = Ember.ContainerView.create();
  var grandchild = Ember.ContainerView.create();

  var grandparentController = {};
  var parentController = {};

  Ember.run(function() {
    grandparent.set('controller', grandparentController);
    parent.set('controller', parentController);

    grandparent.pushObject(parent);
    parent.pushObject(child);
  });

  strictEqual(grandparent.get('controller'), grandparentController);
  strictEqual(parent.get('controller'), parentController);
  strictEqual(child.get('controller'), parentController);
  strictEqual(grandchild.get('controller'), null);

  Ember.run(function() {
    child.pushObject(grandchild);
  });

  strictEqual(grandchild.get('controller'), parentController);

  var newController = {};
  Ember.run(function() {
    parent.set('controller', newController);
  });

  strictEqual(parent.get('controller'), newController);
  strictEqual(child.get('controller'), newController);
  strictEqual(grandchild.get('controller'), newController);

  Ember.run(function() {
    grandparent.destroy();
    parent.destroy();
    child.destroy();
    grandchild.destroy();
  });
});

})();

(function() {
var set = Ember.set, get = Ember.get;

var view, myViewClass, newView, container;

module("Ember.View#createChildView", {
  setup: function() {
    container = { };

    view = Ember.View.create({
      container: container
    });

    myViewClass = Ember.View.extend({ isMyView: true, foo: 'bar' });
  },

  teardown: function() {
    Ember.run(function() {
      view.destroy();
      if(newView) { newView.destroy(); }
    });
  }
});

test("should create view from class with any passed attributes", function() {
  var attrs = {
    foo: "baz"
  };

  newView = view.createChildView(myViewClass, attrs);

  equal(newView.container, container, 'expects to share container with parent');
  ok(get(newView, 'isMyView'), 'newView is instance of myView');
  equal(get(newView, 'foo'), 'baz', 'view did get custom attributes');
  ok(!attrs.parentView, "the original attributes hash was not mutated");
});

test("should set newView.parentView to receiver", function() {
  newView = view.createChildView(myViewClass) ;

  equal(newView.container, container, 'expects to share container with parent');
  equal(get(newView, 'parentView'), view, 'newView.parentView == view');
});

test("should create property on parentView to a childView instance if provided a viewName", function() {
  var attrs = {
    viewName: "someChildView"
  };

  newView = view.createChildView(myViewClass, attrs);
  equal(newView.container, container, 'expects to share container with parent');

  equal(get(view, 'someChildView'), newView);
});

test("should update a view instances attributes, including the _parentView and container properties", function() {
  var attrs = {
    foo: "baz"
  };

  var myView = myViewClass.create();
  newView = view.createChildView(myView, attrs);

  equal(newView.container,  container, 'expects to share container with parent');
  equal(newView._parentView, view, 'expects to have the correct parent');
  equal(get(newView, 'foo'), 'baz', 'view did get custom attributes');

  deepEqual(newView, myView);
});

test("should create from string via container lookup", function() {
  var ChildViewClass = Ember.View.extend(),
  fullName = 'view:bro';

  view.container.lookupFactory = function(viewName) {
    equal(fullName, viewName);

    return ChildViewClass.extend({
      container: container
    });
  };

  newView = view.createChildView('bro');

  equal(newView.container,  container, 'expects to share container with parent');
  equal(newView._parentView, view, 'expects to have the correct parent');
});

test("should assert when trying to create childView from string, but no such view is registered", function() {
  view.container.lookupFactory = function() {};

  expectAssertion(function(){
    view.createChildView('bro');
  });
});


})();

(function() {
var set = Ember.set, get = Ember.get, view;

module("Ember.View#createElement", {
  teardown: function() {
    Ember.run(function() {
      view.destroy();
    });
  }
});

test("returns the receiver", function() {
  var ret;

  view = Ember.View.create();

  Ember.run(function() {
    ret = view.createElement();
  });

  equal(ret, view, 'returns receiver');
});

test("calls render and turns resultant string into element", function() {
  view = Ember.View.create({
    tagName: 'span',

    render: function(buffer) {
      buffer.push("foo");
    }
  });

  equal(get(view, 'element'), null, 'precondition - has no element');
  Ember.run(function() {
    view.createElement();
  });


  var elem = get(view, 'element');
  ok(elem, 'has element now');
  equal(elem.innerHTML, 'foo', 'has innerHTML from context');
  equal(elem.tagName.toString().toLowerCase(), 'span', 'has tagName from view');
});

test("generated element include HTML from child views as well", function() {
  view = Ember.ContainerView.create({
    childViews: [ Ember.View.create({ elementId: "foo" })]
  });

  Ember.run(function() {
    view.createElement();
  });

  ok(view.$('#foo').length, 'has element with child elementId');
});


})();

(function() {
var set = Ember.set, get = Ember.get, view;

module("Ember.View#destroyElement", {
  teardown: function() {
    Ember.run(function() {
      view.destroy();
    });
  }
});

test("if it has no element, does nothing", function() {
  var callCount = 0;
  view = Ember.View.create({
    willDestroyElement: function() { callCount++; }
  });

  ok(!get(view, 'element'), 'precond - does NOT have element');

  Ember.run(function() {
    view.destroyElement();
  });

  equal(callCount, 0, 'did not invoke callback');
});

test("if it has a element, calls willDestroyElement on receiver and child views then deletes the element", function() {
  var parentCount = 0, childCount = 0;

  view = Ember.ContainerView.create({
    willDestroyElement: function() { parentCount++; },
    childViews: [Ember.ContainerView.extend({
      // no willDestroyElement here... make sure no errors are thrown
      childViews: [Ember.View.extend({
        willDestroyElement: function() { childCount++; }
      })]
    })]
  });

  Ember.run(function() {
    view.createElement();
  });

  ok(get(view, 'element'), 'precond - view has element');

  Ember.run(function() {
    view.destroyElement();
  });

  equal(parentCount, 1, 'invoked destroy element on the parent');
  equal(childCount, 1, 'invoked destroy element on the child');
  ok(!get(view, 'element'), 'view no longer has element');
  ok(!get(get(view, 'childViews').objectAt(0), 'element'), 'child no longer has an element');
});

test("returns receiver", function() {
  var ret;
  view = Ember.View.create();

  Ember.run(function() {
    view.createElement();
    ret = view.destroyElement();
  });

  equal(ret, view, 'returns receiver');
});

test("removes element from parentNode if in DOM", function() {
  view = Ember.View.create();

  Ember.run(function() {
    view.append();
  });

  var parent = view.$().parent();

  ok(get(view, 'element'), 'precond - has element');

  Ember.run(function() {
    view.destroyElement();
  });

  equal(view.$(), undefined, 'view has no selector');
  ok(!parent.find('#'+view.get('elementId')).length, 'element no longer in parent node');
});

})();

(function() {
var set = Ember.set, get = Ember.get;

module("Ember.View#destroy");

test("should teardown viewName on parentView when childView is destroyed", function() {
  var viewName = "someChildView",
      parentView = Ember.View.create(),
      childView = parentView.createChildView(Ember.View, {viewName: viewName});

  equal(get(parentView, viewName), childView, "Precond - child view was registered on parent");

  Ember.run(function() {
    childView.destroy();
  });

  equal(get(parentView, viewName), null, "viewName reference was removed on parent");

  Ember.run(function() {
    parentView.destroy();
  });
});


})();

(function() {
var set = Ember.set, get = Ember.get;

var parentView, child, parentDom, childDom, view;

module("Ember.View#element", {
  teardown: function() {
    Ember.run(function() {
      if (parentView) { parentView.destroy(); }
      view.destroy();
    });
  }
});

test("returns null if the view has no element and no parent view", function() {
  view = Ember.View.create() ;
  equal(get(view, 'parentView'), null, 'precond - has no parentView');
  equal(get(view, 'element'), null, 'has no element');
});

test("returns null if the view has no element and parent view has no element", function() {
  parentView = Ember.ContainerView.create({
    childViews: [ Ember.View.extend() ]
  });
  view = get(parentView, 'childViews').objectAt(0);

  equal(get(view, 'parentView'), parentView, 'precond - has parent view');
  equal(get(parentView, 'element'), null, 'parentView has no element');
  equal(get(view, 'element'), null, ' has no element');
});

test("returns element if you set the value", function() {
  view = Ember.View.create();
  equal(get(view, 'element'), null, 'precond- has no element');

  var dom = document.createElement('div');
  set(view, 'element', dom);

  equal(get(view, 'element'), dom, 'now has set element');
});


module("Ember.View#element - autodiscovery", {
  setup: function() {
    parentView = Ember.ContainerView.create({
      childViews: [ Ember.View.extend({
        elementId: 'child-view'
      }) ]
    });

    child = get(parentView, 'childViews').objectAt(0);

    // setup parent/child dom
    parentDom = Ember.$("<div><div id='child-view'></div></div>")[0];

    // set parent element...
    set(parentView, 'element', parentDom);
  },

  teardown: function() {
    Ember.run(function() {
      parentView.destroy();
      if (view) { view.destroy(); }
    });
    parentView = child = parentDom = childDom = null ;
  }
});

test("discovers element if has no element but parent view does have element", function() {
  equal(get(parentView, 'element'), parentDom, 'precond - parent has element');
  ok(parentDom.firstChild, 'precond - parentDom has first child');

  equal(child.$().attr('id'), 'child-view', 'view discovered child');
});

test("should not allow the elementId to be changed after inserted", function() {
  view = Ember.View.create({
    elementId: 'one'
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  raises(function() {
    view.set('elementId', 'two');
  }, "raises elementId changed exception");

  equal(view.get('elementId'), 'one', 'elementId is still "one"');
});

})();

(function() {
var set = Ember.set, get = Ember.get, view;

module("Ember.View evented helpers", {
  teardown: function() {
    Ember.run(function() {
      view.destroy();
    });
  }
});

test("fire should call method sharing event name if it exists on the view", function() {
  var eventFired = false;

  view = Ember.View.create({
    fireMyEvent: function() {
      this.trigger('myEvent');
    },

    myEvent: function() {
      eventFired = true;
    }
  });

  Ember.run(function() {
    view.fireMyEvent();
  });

  equal(eventFired, true, "fired the view method sharing the event name");
});

test("fire does not require a view method with the same name", function() {
  var eventFired = false;

  view = Ember.View.create({
    fireMyEvent: function() {
      this.trigger('myEvent');
    }
  });

  var listenObject = Ember.Object.create({
    onMyEvent: function() {
      eventFired = true;
    }
  });

  view.on('myEvent', listenObject, 'onMyEvent');

  Ember.run(function() {
    view.fireMyEvent();
  });

  equal(eventFired, true, "fired the event without a view method sharing its name");

  Ember.run(function() {
    listenObject.destroy();
  });
});


})();

(function() {
/*global TestApp:true*/
var set = Ember.set, get = Ember.get;

var originalLookup = Ember.lookup, lookup, view;

module("Ember.View.create", {
  setup: function() {
    Ember.lookup = lookup = {};
  },
  teardown: function() {
    Ember.run(function() {
      view.destroy();
    });

    Ember.lookup = originalLookup;
  }
});

test("registers view in the global views hash using layerId for event targeted", function() {
  view = Ember.View.create();
  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });
  equal(Ember.View.views[get(view, 'elementId')], view, 'registers view');
});

module("Ember.View.createWithMixins");

test("should warn if a non-array is used for classNames", function() {
  expectAssertion(function() {
    Ember.View.createWithMixins({
      elementId: 'test',
      classNames: Ember.computed(function() {
        return ['className'];
      }).volatile()
    });
  }, /Only arrays are allowed/i);
});

test("should warn if a non-array is used for classNamesBindings", function() {
  expectAssertion(function() {
    Ember.View.createWithMixins({
      elementId: 'test',
      classNameBindings: Ember.computed(function() {
        return ['className'];
      }).volatile()
    });
  }, /Only arrays are allowed/i);
});

})();

(function() {
var get = Ember.get, set = Ember.set;

var View, view, parentBecameVisible, childBecameVisible, grandchildBecameVisible;
var parentBecameHidden, childBecameHidden, grandchildBecameHidden;

module("Ember.View#isVisible", {
  setup: function() {
    parentBecameVisible=0;
    childBecameVisible=0;
    grandchildBecameVisible=0;
    parentBecameHidden=0;
    childBecameHidden=0;
    grandchildBecameHidden=0;

    View = Ember.ContainerView.extend({
      childViews: ['child'],
      becameVisible: function() { parentBecameVisible++; },
      becameHidden: function() { parentBecameHidden++; },

      child: Ember.ContainerView.extend({
        childViews: ['grandchild'],
        becameVisible: function() { childBecameVisible++; },
        becameHidden: function() { childBecameHidden++; },

        grandchild: Ember.View.extend({
          template: function() { return "seems weird bro"; },
          becameVisible: function() { grandchildBecameVisible++; },
          becameHidden: function() { grandchildBecameHidden++; }
        })
      })
    });
  },

  teardown: function() {
    if (view) {
      Ember.run(function() { view.destroy(); });
    }
  }
});

test("should hide views when isVisible is false", function() {
  view = Ember.View.create({
    isVisible: false
  });

  Ember.run(function() {
    view.append();
  });

  ok(view.$().is(':hidden'), "the view is hidden");

  set(view, 'isVisible', true);
  ok(view.$().is(':visible'), "the view is visible");
  Ember.run(function() {
    view.remove();
  });
});

test("should hide element if isVisible is false before element is created", function() {
  view = Ember.View.create({
    isVisible: false
  });

  ok(!get(view, 'isVisible'), "precond - view is not visible");

  set(view, 'template', function() { return "foo"; });

  Ember.run(function() {
    view.append();
  });

  ok(view.$().is(':hidden'), "should be hidden");

  Ember.run(function() {
    view.remove();
  });

  set(view, 'isVisible', true);

  Ember.run(function() {
    view.append();
  });

  ok(view.$().is(':visible'), "view should be visible");

  Ember.run(function() {
    view.remove();
  });
});

test("view should be notified after isVisible is set to false and the element has been hidden", function() {
  Ember.run(function() {
    view = View.create({ isVisible: false });
    view.append();
  });

  ok(view.$().is(':hidden'), "precond - view is hidden when appended");

  Ember.run(function() {
    view.set('isVisible', true);
  });

  ok(view.$().is(':visible'), "precond - view is now visible");
  equal(parentBecameVisible, 1);
  equal(childBecameVisible, 1);
  equal(grandchildBecameVisible, 1);
});

test("view should be notified after isVisible is set to false and the element has been hidden", function() {
  view = View.create({ isVisible: true });
  var childView = view.get('childViews').objectAt(0);
  var grandchildView = childView.get('childViews').objectAt(0);

  Ember.run(function() {
    view.append();
  });

  ok(view.$().is(':visible'), "precond - view is visible when appended");

  Ember.run(function() {
    childView.set('isVisible', false);
  });

  ok(childView.$().is(':hidden'), "precond - view is now hidden");

  equal(childBecameHidden, 1);
  equal(grandchildBecameHidden, 1);
});

test("view should be notified after isVisible is set to true and the element has been shown", function() {
  view = View.create({ isVisible: false });
  var childView = view.get('childViews').objectAt(0);
  var grandchildView = childView.get('childViews').objectAt(0);

  Ember.run(function() {
    view.append();
  });

  ok(view.$().is(':hidden'), "precond - view is hidden when appended");

  Ember.run(function() {
    view.set('isVisible', true);
  });

  ok(view.$().is(':visible'), "precond - view is now visible");

  equal(parentBecameVisible, 1);
  equal(childBecameVisible, 1);
  equal(grandchildBecameVisible, 1);
});

test("if a view descends from a hidden view, making isVisible true should not trigger becameVisible", function() {
  view = View.create({ isVisible: true });
  var childView = view.get('childViews').objectAt(0);
  var grandchildView = childView.get('childViews').objectAt(0);

  Ember.run(function() {
    view.append();
  });

  ok(view.$().is(':visible'), "precond - view is visible when appended");

  Ember.run(function() {
    childView.set('isVisible', false);
  });

  Ember.run(function() {
    view.set('isVisible', false);
  });

  childBecameVisible = 0;
  grandchildBecameVisible = 0;

  Ember.run(function() {
    childView.set('isVisible', true);
  });

  equal(childBecameVisible, 0, "the child did not become visible");
  equal(grandchildBecameVisible, 0, "the grandchild did not become visible");
});

test("if a child view becomes visible while its parent is hidden, if its parent later becomes visible, it receives a becameVisible callback", function() {
  view = View.create({ isVisible: false });
  var childView = view.get('childViews').objectAt(0);
  var grandchildView = childView.get('childViews').objectAt(0);

  Ember.run(function() {
    view.append();
  });

  ok(view.$().is(':hidden'), "precond - view is hidden when appended");

  Ember.run(function() {
    childView.set('isVisible', true);
  });

  equal(childBecameVisible, 0, "child did not become visible since parent is hidden");
  equal(grandchildBecameVisible, 0, "grandchild did not become visible since parent is hidden");

  Ember.run(function() {
    view.set('isVisible', true);
  });

  equal(parentBecameVisible, 1);
  equal(childBecameVisible, 1);
  equal(grandchildBecameVisible, 1);
});

})();

(function() {
var set = Ember.set, get = Ember.get;

var view ;
module("Ember.View#$", {
  setup: function() {
    view = Ember.View.extend({
      render: function(context, firstTime) {
        context.push('<span></span>');
      }
    }).create();

    Ember.run(function() {
      view.append();
    });
  },

  teardown: function() {
    Ember.run(function() {
      view.destroy();
    });
  }
});

test("returns undefined if no element", function() {
  var view = Ember.View.create();
  ok(!get(view, 'element'), 'precond - should have no element');
  equal(view.$(), undefined, 'should return undefined');
  equal(view.$('span'), undefined, 'should undefined if filter passed');

  Ember.run(function() {
    view.destroy();
  });
});

test("returns jQuery object selecting element if provided", function() {
  ok(get(view, 'element'), 'precond - should have element');

  var jquery = view.$();
  equal(jquery.length, 1, 'view.$() should have one element');
  equal(jquery[0], get(view, 'element'), 'element should be element');
});

test("returns jQuery object selecting element inside element if provided", function() {
  ok(get(view, 'element'), 'precond - should have element');

  var jquery = view.$('span');
  equal(jquery.length, 1, 'view.$() should have one element');
  equal(jquery[0].parentNode, get(view, 'element'), 'element should be in element');
});

test("returns empty jQuery object if filter passed that does not match item in parent", function() {
  ok(get(view, 'element'), 'precond - should have element');

  var jquery = view.$('body'); // would normally work if not scoped to view
  equal(jquery.length, 0, 'view.$(body) should have no elements');
});


})();

(function() {
var set = Ember.set, get = Ember.get, container, view;

module("Ember.View - Layout Functionality", {
  setup: function() {
    container = new Ember.Container();
    container.optionsForType('template', { instantiate: false });
  },
  teardown: function() {
    Ember.run(function() {
      view.destroy();
    });
  }
});

test("should call the function of the associated layout", function() {
  var templateCalled = 0, layoutCalled = 0;

  container.register('template:template', function() { templateCalled++; });
  container.register('template:layout', function() { layoutCalled++; });

  view = Ember.View.create({
    container: container,
    layoutName: 'layout',
    templateName: 'template'
  });

  Ember.run(function() {
    view.createElement();
  });

  equal(templateCalled, 0, "template is not called when layout is present");
  equal(layoutCalled, 1, "layout is called when layout is present");
});

test("should call the function of the associated template with itself as the context", function() {
  container.register('template:testTemplate', function(dataSource) {
    return "<h1 id='twas-called'>template was called for " + get(dataSource, 'personName') + "</h1>";
  });

  view = Ember.View.create({
    container: container,
    layoutName: 'testTemplate',

    context: {
      personName: "Tom DAAAALE"
    }
  });

  Ember.run(function() {
    view.createElement();
  });

  equal("template was called for Tom DAAAALE", view.$('#twas-called').text(), "the named template was called with the view as the data source");
});

test("should fall back to defaultTemplate if neither template nor templateName are provided", function() {
  var View;

  View = Ember.View.extend({
    defaultLayout: function(dataSource) { return "<h1 id='twas-called'>template was called for " + get(dataSource, 'personName') + "</h1>"; }
  });

  view = View.create({
    context: {
      personName: "Tom DAAAALE"
    }
  });

  Ember.run(function() {
    view.createElement();
  });

  equal("template was called for Tom DAAAALE", view.$('#twas-called').text(), "the named template was called with the view as the data source");
});

test("should not use defaultLayout if layout is provided", function() {
  var View;

  View = Ember.View.extend({
    layout:  function() { return "foo"; },
    defaultLayout: function(dataSource) { return "<h1 id='twas-called'>template was called for " + get(dataSource, 'personName') + "</h1>"; }
  });

  view = View.create();
  Ember.run(function() {
    view.createElement();
  });


  equal("foo", view.$().text(), "default layout was not printed");
});

test("the template property is available to the layout template", function() {
  view = Ember.View.create({
    template: function(context, options) {
      options.data.buffer.push(" derp");
    },

    layout: function(context, options) {
      options.data.buffer.push("Herp");
      get(options.data.view, 'template')(context, options);
    }
  });

  Ember.run(function() {
    view.createElement();
  });

  equal("Herp derp", view.$().text(), "the layout has access to the template");
});


})();

(function() {
var set = Ember.set, get = Ember.get, parentView, view;

module("Ember.View#nearest*", {
  teardown: function() {
    Ember.run(function() {
      if (parentView) { parentView.destroy(); }
      if (view) { view.destroy(); }
    });
  }
});

(function() {
  var Mixin = Ember.Mixin.create({}),
      Parent = Ember.View.extend(Mixin, {
        render: function(buffer) {
          this.appendChild( Ember.View.create() );
        }
      });

  test("nearestOfType should find the closest view by view class", function() {
    var child;

    Ember.run(function() {
      parentView = Parent.create();
      parentView.appendTo('#qunit-fixture');
    });

    child = parentView.get('childViews')[0];
    equal(child.nearestOfType(Parent), parentView, "finds closest view in the hierarchy by class");
  });

  test("nearestOfType should find the closest view by mixin", function() {
    var child;

    Ember.run(function() {
      parentView = Parent.create();
      parentView.appendTo('#qunit-fixture');
    });

    child = parentView.get('childViews')[0];
    equal(child.nearestOfType(Mixin), parentView, "finds closest view in the hierarchy by class");
  });

test("nearestWithProperty should search immediate parent", function() {
  var childView;

  view = Ember.View.create({
    myProp: true,

    render: function(buffer) {
      this.appendChild(Ember.View.create());
    }
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  childView = view.get('childViews')[0];
  equal(childView.nearestWithProperty('myProp'), view);

});

}());

})();

(function() {
module("Ember.View - _parsePropertyPath");

test("it works with a simple property path", function() {
  var parsed = Ember.View._parsePropertyPath("simpleProperty");

  equal(parsed.path, "simpleProperty", "path is parsed correctly");
  equal(parsed.className, undefined, "there is no className");
  equal(parsed.falsyClassName, undefined, "there is no falsyClassName");
  equal(parsed.classNames, "", "there is no classNames");
});

test("it works with a more complex property path", function() {
  var parsed = Ember.View._parsePropertyPath("content.simpleProperty");

  equal(parsed.path, "content.simpleProperty", "path is parsed correctly");
  equal(parsed.className, undefined, "there is no className");
  equal(parsed.falsyClassName, undefined, "there is no falsyClassName");
  equal(parsed.classNames, "", "there is no classNames");
});

test("className is extracted", function() {
  var parsed = Ember.View._parsePropertyPath("content.simpleProperty:class");

  equal(parsed.path, "content.simpleProperty", "path is parsed correctly");
  equal(parsed.className, "class", "className is extracted");
  equal(parsed.falsyClassName, undefined, "there is no falsyClassName");
  equal(parsed.classNames, ":class", "there is a classNames");
});

test("falsyClassName is extracted", function() {
  var parsed = Ember.View._parsePropertyPath("content.simpleProperty:class:falsyClass");

  equal(parsed.path, "content.simpleProperty", "path is parsed correctly");
  equal(parsed.className, "class", "className is extracted");
  equal(parsed.falsyClassName, "falsyClass", "falsyClassName is extracted");
  equal(parsed.classNames, ":class:falsyClass", "there is a classNames");
});

test("it works with an empty true class", function() {
  var parsed = Ember.View._parsePropertyPath("content.simpleProperty::falsyClass");

  equal(parsed.path, "content.simpleProperty", "path is parsed correctly");
  equal(parsed.className, undefined, "className is undefined");
  equal(parsed.falsyClassName, "falsyClass", "falsyClassName is extracted");
  equal(parsed.classNames, "::falsyClass", "there is a classNames");
});

})();

(function() {
var set = Ember.set, get = Ember.get;
var indexOf = Ember.EnumerableUtils.indexOf;

// .......................................................
// removeChild()
//

var parentView, child;
module("Ember.View#removeChild", {
  setup: function() {
    parentView = Ember.ContainerView.create({ childViews: [Ember.View] });
    child = get(parentView, 'childViews').objectAt(0);
  },
  teardown: function() {
    Ember.run(function() {
      parentView.destroy();
      child.destroy();
    });
  }
});

test("returns receiver", function() {
  equal(parentView.removeChild(child), parentView, 'receiver');
});

test("removes child from parent.childViews array", function() {
  ok(indexOf(get(parentView, 'childViews'), child)>=0, 'precond - has child in childViews array before remove');
  parentView.removeChild(child);
  ok(indexOf(get(parentView, 'childViews'), child)<0, 'removed child');
});

test("sets parentView property to null", function() {
  ok(get(child, 'parentView'), 'precond - has parentView');
  parentView.removeChild(child);
  ok(!get(child, 'parentView'), 'parentView is now null');
});

// .......................................................
// removeAllChildren()
//
var view, childViews;
module("Ember.View#removeAllChildren", {
  setup: function() {
    view = Ember.ContainerView.create({
      childViews: [Ember.View, Ember.View, Ember.View]
    });
    childViews = view.get('childViews');
  },
  teardown: function() {
    Ember.run(function() {
      childViews.forEach(function(v) { v.destroy(); });
      view.destroy();
    });
  }
});

test("removes all child views", function() {
  equal(get(view, 'childViews.length'), 3, 'precond - has child views');

  view.removeAllChildren();
  equal(get(view, 'childViews.length'), 0, 'removed all children');
});

test("returns receiver", function() {
  equal(view.removeAllChildren(), view, 'receiver');
});

// .......................................................
// removeFromParent()
//
module("Ember.View#removeFromParent", {
  teardown: function() {
    Ember.run(function() {
      if (parentView) { parentView.destroy(); }
      if (child) { child.destroy(); }
      if (view) { view.destroy(); }
    });
  }
});

test("removes view from parent view", function() {
  parentView = Ember.ContainerView.create({ childViews: [Ember.View] });
  child = get(parentView, 'childViews').objectAt(0);
  ok(get(child, 'parentView'), 'precond - has parentView');

  Ember.run(function() {
    parentView.createElement();
  });

  ok(parentView.$('div').length, "precond - has a child DOM element");

  Ember.run(function() {
    child.removeFromParent();
  });

  ok(!get(child, 'parentView'), 'no longer has parentView');
  ok(indexOf(get(parentView, 'childViews'), child)<0, 'no longer in parent childViews');
  equal(parentView.$('div').length, 0, "removes DOM element from parent");
});

test("returns receiver", function() {
  parentView = Ember.ContainerView.create({ childViews: [Ember.View] });
  child = get(parentView, 'childViews').objectAt(0);
  var removed = Ember.run(function() {
    return child.removeFromParent();
  });

  equal(removed, child, 'receiver');
});

test("does nothing if not in parentView", function() {
  var callCount = 0;
  child = Ember.View.create();

  // monkey patch for testing...
  ok(!get(child, 'parentView'), 'precond - has no parent');

  child.removeFromParent();

  Ember.run(function() {
    child.destroy();
  });
});


test("the DOM element is gone after doing append and remove in two separate runloops", function() {
  view = Ember.View.create();
  Ember.run(function() {
    view.append();
  });
  Ember.run(function() {
    view.remove();
  });

  var viewElem = Ember.$('#'+get(view, 'elementId'));
  ok(viewElem.length === 0, "view's element doesn't exist in DOM");
});

test("the DOM element is gone after doing append and remove in a single runloop", function() {
  view = Ember.View.create();
  Ember.run(function() {
    view.append();
    view.remove();
  });

  var viewElem = Ember.$('#'+get(view, 'elementId'));
  ok(viewElem.length === 0, "view's element doesn't exist in DOM");
});


})();

(function() {
/*global module test equals context ok same */

var set = Ember.set, get = Ember.get, view;

// .......................................................
//  render()
//
module("Ember.View#render", {
  teardown: function() {
    Ember.run(function() {
      view.destroy();
    });
  }
});

test("default implementation does not render child views", function() {

  var rendered = 0, updated = 0, parentRendered = 0, parentUpdated = 0 ;
  view = Ember.ContainerView.createWithMixins({
    childViews: ["child"],

    render: function(buffer) {
      parentRendered++;
      this._super(buffer);
    },

    child: Ember.View.createWithMixins({
      render: function(buffer) {
        rendered++;
        this._super(buffer);
      }
    })
  });

  Ember.run(function() {
    view.createElement();
  });
  equal(rendered, 1, 'rendered the child once');
  equal(parentRendered, 1);
  equal(view.$('div').length, 1);

});

test("should invoke renderChildViews if layer is destroyed then re-rendered", function() {

  var rendered = 0, parentRendered = 0, parentUpdated = 0 ;
  view = Ember.ContainerView.createWithMixins({
    childViews: ["child"],

    render: function(buffer) {
      parentRendered++;
      this._super(buffer);
    },

    child: Ember.View.createWithMixins({
      render: function(buffer) {
        rendered++;
        this._super(buffer);
      }
    })
  });

  Ember.run(function() {
    view.append();
  });

  equal(rendered, 1, 'rendered the child once');
  equal(parentRendered, 1);
  equal(view.$('div').length, 1);

  Ember.run(function() {
    view.rerender();
  });

  equal(rendered, 2, 'rendered the child twice');
  equal(parentRendered, 2);
  equal(view.$('div').length, 1);

  Ember.run(function() {
    view.destroy();
  });
});

test("should render child views with a different tagName", function() {
  var rendered = 0, parentRendered = 0, parentUpdated = 0 ;

  view = Ember.ContainerView.create({
    childViews: ["child"],

    child: Ember.View.create({
      tagName: 'aside'
    })
  });

  Ember.run(function() {
    view.createElement();
  });

  equal(view.$('aside').length, 1);
});

test("should add ember-view to views", function() {
  view = Ember.View.create();

  Ember.run(function() {
    view.createElement();
  });

  ok(view.$().hasClass('ember-view'), "the view has ember-view");
});

test("should allow hX tags as tagName", function() {

  view = Ember.ContainerView.create({
    childViews: ["child"],

    child: Ember.View.create({
      tagName: 'h3'
    })
  });

  Ember.run(function() {
    view.createElement();
  });

  ok(view.$('h3').length, "does not render the h3 tag correctly");
});

test("should not add role attribute unless one is specified", function() {
  view = Ember.View.create();

  Ember.run(function() {
    view.createElement();
  });

  ok(view.$().attr('role') === undefined, "does not have a role attribute");
});

test("should re-render if the context is changed", function() {
  view = Ember.View.create({
    elementId: 'template-context-test',
    context: { foo: "bar" },
    render: function(buffer) {
      var value = get(get(this, 'context'), 'foo');
      buffer.push(value);
    }
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(Ember.$('#qunit-fixture #template-context-test').text(), "bar", "precond - renders the view with the initial value");

  Ember.run(function() {
    view.set('context', {
      foo: "bang baz"
    });
  });

  equal(Ember.$('#qunit-fixture #template-context-test').text(), "bang baz", "re-renders the view with the updated context");
});

})();

(function() {
var set = Ember.set, get = Ember.get;

var View, view, willDestroyCalled, childView;

module("Ember.View - replaceIn()", {
  setup: function() {
    View = Ember.View.extend({});
  },

  teardown: function() {
    Ember.run(function() {
      view.destroy();
    });
  }
});

test("should be added to the specified element when calling replaceIn()", function() {
  Ember.$("#qunit-fixture").html('<div id="menu"></div>');

  view = View.create();

  ok(!get(view, 'element'), "precond - should not have an element");

  Ember.run(function() {
    view.replaceIn('#menu');
  });

  var viewElem = Ember.$('#menu').children();
  ok(viewElem.length > 0, "creates and replaces the view's element");
});

test("raises an assert when a target does not exist in the DOM", function() {
  view = View.create();

  expectAssertion(function() {
    Ember.run(function() {
      view.replaceIn('made-up-target');
    });
  });
});


test("should remove previous elements when calling replaceIn()", function() {
  Ember.$("#qunit-fixture").html('<div id="menu"><p>Foo</p></div>');
  var viewElem = Ember.$('#menu').children();

  view = View.create();

  ok(viewElem.length === 1, "should have one element");

  Ember.run(function() {
    view.replaceIn('#menu');
  });

  ok(viewElem.length === 1, "should have one element");

});

test("should move the view to the inDOM state after replacing", function() {
  Ember.$("#qunit-fixture").html('<div id="menu"></div>');
  view = View.create();

  Ember.run(function() {
    view.replaceIn('#menu');
  });

  equal(view.currentState, Ember.View.states.inDOM, "the view is in the inDOM state");
});

module("Ember.View - replaceIn() in a view hierarchy", {
  setup: function() {
    View = Ember.ContainerView.extend({
      childViews: ['child'],
      child: Ember.View.extend({
        elementId: 'child'
      })
    });
  },

  teardown: function() {
    Ember.run(function() {
      view.destroy();
    });
  }
});

test("should be added to the specified element when calling replaceIn()", function() {
  Ember.$("#qunit-fixture").html('<div id="menu"></div>');

  view = View.create();

  ok(!get(view, 'element'), "precond - should not have an element");

  Ember.run(function() {
    view.replaceIn('#menu');
  });

  var viewElem = Ember.$('#menu #child');
  ok(viewElem.length > 0, "creates and replaces the view's element");
});

})();

(function() {
var set = Ember.set, get = Ember.get, container, view;

module("Ember.View - Template Functionality", {
  setup: function() {
    container = new Ember.Container();
    container.optionsForType('template', { instantiate: false });
  },
  teardown: function() {
    Ember.run(function() {
      if (view) { view.destroy(); }
    });
  }
});

test("should call the function of the associated template", function() {
  container.register('template:testTemplate', function() {
    return "<h1 id='twas-called'>template was called</h1>";
  });

  view = Ember.View.create({
    container: container,
    templateName: 'testTemplate'
  });

  Ember.run(function() {
    view.createElement();
  });

  ok(view.$('#twas-called').length, "the named template was called");
});

test("should call the function of the associated template with itself as the context", function() {
  container.register('template:testTemplate', function(dataSource) {
    return "<h1 id='twas-called'>template was called for " + get(dataSource, 'personName') + "</h1>";
  });

  view = Ember.View.create({
    container: container,
    templateName: 'testTemplate',

    context: {
      personName: "Tom DAAAALE"
    }
  });

  Ember.run(function() {
    view.createElement();
  });

  equal("template was called for Tom DAAAALE", view.$('#twas-called').text(), "the named template was called with the view as the data source");
});

test("should fall back to defaultTemplate if neither template nor templateName are provided", function() {
  var View;

  View = Ember.View.extend({
    defaultTemplate: function(dataSource) { return "<h1 id='twas-called'>template was called for " + get(dataSource, 'personName') + "</h1>"; }
  });

  view = View.create({
    context: {
      personName: "Tom DAAAALE"
    }
  });

  Ember.run(function() {
    view.createElement();
  });

  equal("template was called for Tom DAAAALE", view.$('#twas-called').text(), "the named template was called with the view as the data source");
});

test("should not use defaultTemplate if template is provided", function() {
  var View;

  View = Ember.View.extend({
    template:  function() { return "foo"; },
    defaultTemplate: function(dataSource) { return "<h1 id='twas-called'>template was called for " + get(dataSource, 'personName') + "</h1>"; }
  });

  view = View.create();
  Ember.run(function() {
    view.createElement();
  });

  equal("foo", view.$().text(), "default template was not printed");
});

test("should not use defaultTemplate if template is provided", function() {
  var View;

  container.register('template:foobar', function() { return 'foo'; });

  View = Ember.View.extend({
    container: container,
    templateName: 'foobar',
    defaultTemplate: function(dataSource) { return "<h1 id='twas-called'>template was called for " + get(dataSource, 'personName') + "</h1>"; }
  });

  view = View.create();
  Ember.run(function() {
    view.createElement();
  });

  equal("foo", view.$().text(), "default template was not printed");
});

test("should render an empty element if no template is specified", function() {
  view = Ember.View.create();
  Ember.run(function() {
    view.createElement();
  });

  equal(view.$().html(), '', "view div should be empty");
});

test("should provide a controller to the template if a controller is specified on the view", function() {
  expect(7);

  var Controller1 = Ember.Object.extend({
    toString: function() { return "Controller1"; }
  });

  var Controller2 = Ember.Object.extend({
    toString: function() { return "Controller2"; }
  });

  var controller1 = Controller1.create(),
      controller2 = Controller2.create(),
      optionsDataKeywordsControllerForView,
      optionsDataKeywordsControllerForChildView,
      contextForView,
      contextForControllerlessView;

  view = Ember.View.create({
    controller: controller1,

    template: function(buffer, options) {
      optionsDataKeywordsControllerForView = options.data.keywords.controller;
    }
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  strictEqual(optionsDataKeywordsControllerForView, controller1, "passes the controller in the data");

  Ember.run(function() {
    view.destroy();
  });

  var parentView = Ember.View.create({
    controller: controller1,

    template: function(buffer, options) {
      options.data.view.appendChild(Ember.View.create({
        controller: controller2,
        templateData: options.data,
        template: function(context, options) {
          contextForView = context;
          optionsDataKeywordsControllerForChildView = options.data.keywords.controller;
        }
      }));
      optionsDataKeywordsControllerForView = options.data.keywords.controller;
    }
  });

  Ember.run(function() {
    parentView.appendTo('#qunit-fixture');
  });

  strictEqual(optionsDataKeywordsControllerForView, controller1, "passes the controller in the data");
  strictEqual(optionsDataKeywordsControllerForChildView, controller2, "passes the child view's controller in the data");

  Ember.run(function() {
    parentView.destroy();
  });

  var parentViewWithControllerlessChild = Ember.View.create({
    controller: controller1,

    template: function(buffer, options) {
      options.data.view.appendChild(Ember.View.create({
        templateData: options.data,
        template: function(context, options) {
          contextForControllerlessView = context;
          optionsDataKeywordsControllerForChildView = options.data.keywords.controller;
        }
      }));
      optionsDataKeywordsControllerForView = options.data.keywords.controller;
    }
  });

  Ember.run(function() {
    parentViewWithControllerlessChild.appendTo('#qunit-fixture');
  });

  strictEqual(optionsDataKeywordsControllerForView, controller1, "passes the original controller in the data");
  strictEqual(optionsDataKeywordsControllerForChildView, controller1, "passes the controller in the data to child views");
  strictEqual(contextForView, controller2, "passes the controller in as the main context of the parent view");
  strictEqual(contextForControllerlessView, controller1, "passes the controller in as the main context of the child view");

  Ember.run(function() {
    parentView.destroy();
    parentViewWithControllerlessChild.destroy();
  });
});

})();

(function() {
/*global ViewTest:true*/

var originalLookup = Ember.lookup, lookup, view;

module("views/view/view_lifecycle_test - pre-render", {
  setup: function() {
    Ember.lookup = lookup = {};
  },

  teardown: function() {
    if (view) {
      Ember.run(function() {
        view.destroy();
      });
    }
    Ember.lookup = originalLookup;
  }
});

function tmpl(str) {
  return function(context, options) {
    options.data.buffer.push(str);
  };
}

test("should create and append a DOM element after bindings have synced", function() {
  var ViewTest;

  lookup.ViewTest = ViewTest = {};

  Ember.run(function() {
    ViewTest.fakeController = Ember.Object.create({
      fakeThing: 'controllerPropertyValue'
    });

    view = Ember.View.createWithMixins({
      fooBinding: 'ViewTest.fakeController.fakeThing',

      render: function(buffer) {
        buffer.push(this.get('foo'));
      }
    });

    ok(!view.get('element'), "precond - does not have an element before appending");

    view.append();
  });

  equal(view.$().text(), 'controllerPropertyValue', "renders and appends after bindings have synced");
});

test("should throw an exception if trying to append a child before rendering has begun", function() {
  Ember.run(function() {
    view = Ember.View.create();
  });

  raises(function() {
    view.appendChild(Ember.View, {});
  }, null, "throws an error when calling appendChild()");
});

test("should not affect rendering if rerender is called before initial render happens", function() {
  Ember.run(function() {
    view = Ember.View.create({
      template: tmpl("Rerender me!")
    });

    view.rerender();
    view.append();
  });

  equal(view.$().text(), "Rerender me!", "renders correctly if rerender is called first");
});

test("should not affect rendering if destroyElement is called before initial render happens", function() {
  Ember.run(function() {
    view = Ember.View.create({
      template: tmpl("Don't destroy me!")
    });

    view.destroyElement();
    view.append();
  });

  equal(view.$().text(), "Don't destroy me!", "renders correctly if destroyElement is called first");
});

module("views/view/view_lifecycle_test - in render", {
  setup: function() {

  },

  teardown: function() {
    if (view) {
      Ember.run(function() {
        view.destroy();
      });
    }
  }
});

test("appendChild should work inside a template", function() {
  Ember.run(function() {
    view = Ember.View.create({
      template: function(context, options) {
        var buffer = options.data.buffer;

        buffer.push("<h1>Hi!</h1>");

        options.data.view.appendChild(Ember.View, {
          template: tmpl("Inception reached")
        });

        buffer.push("<div class='footer'>Wait for the kick</div>");
      }
    });

    view.appendTo("#qunit-fixture");
  });

  ok(view.$('h1').length === 1 && view.$('div').length === 2,
     "The appended child is visible");
});

test("rerender should throw inside a template", function() {
  raises(function() {
    Ember.run(function() {
      var renderCount = 0;
      view = Ember.View.create({
        template: function(context, options) {
          var view = options.data.view;

          var child1 = view.appendChild(Ember.View, {
            template: function(context, options) {
              renderCount++;
              options.data.buffer.push(String(renderCount));
            }
          });

          var child2 = view.appendChild(Ember.View, {
            template: function(context, options) {
              options.data.buffer.push("Inside child2");
              child1.rerender();
            }
          });
        }
      });

      view.appendTo("#qunit-fixture");
    });
  }, /Something you did caused a view to re-render after it rendered but before it was inserted into the DOM./);
});

module("views/view/view_lifecycle_test - hasElement", {
  teardown: function() {
    if (view) {
      Ember.run(function() {
        view.destroy();
      });
    }
  }
});

test("createElement puts the view into the hasElement state", function() {
  view = Ember.View.create({
    render: function(buffer) { buffer.push('hello'); }
  });

  Ember.run(function() {
    view.createElement();
  });

  equal(view.currentState, Ember.View.states.hasElement, "the view is in the hasElement state");
});

test("trigger rerender on a view in the hasElement state doesn't change its state to inDOM", function() {
  view = Ember.View.create({
    render: function(buffer) { buffer.push('hello'); }
  });

  Ember.run(function() {
    view.createElement();
    view.rerender();
  });

  equal(view.currentState, Ember.View.states.hasElement, "the view is still in the hasElement state");
});


module("views/view/view_lifecycle_test - in DOM", {
  teardown: function() {
    if (view) {
      Ember.run(function() {
        view.destroy();
      });
    }
  }
});

test("should throw an exception when calling appendChild when DOM element exists", function() {
  Ember.run(function() {
    view = Ember.View.create({
      template: tmpl("Wait for the kick")
    });

    view.append();
  });

  raises(function() {
    view.appendChild(Ember.View, {
      template: tmpl("Ah ah ah! You didn't say the magic word!")
    });
  }, null, "throws an exception when calling appendChild after element is created");
});

test("should replace DOM representation if rerender() is called after element is created", function() {
  Ember.run(function() {
    view = Ember.View.create({
      template: function(context, options) {
        var buffer = options.data.buffer;
        var value = context.get('shape');

        buffer.push("Do not taunt happy fun "+value);
      },

      context: Ember.Object.create({
        shape: 'sphere'
      })
    });

    view.append();
  });

  equal(view.$().text(), "Do not taunt happy fun sphere", "precond - creates DOM element");

  view.set('context.shape', 'ball');
  Ember.run(function() {
    view.rerender();
  });

  equal(view.$().text(), "Do not taunt happy fun ball", "rerenders DOM element when rerender() is called");
});

test("should destroy DOM representation when destroyElement is called", function() {
  Ember.run(function() {
    view = Ember.View.create({
      template: tmpl("Don't fear the reaper")
    });

    view.append();
  });

  ok(view.get('element'), "precond - generates a DOM element");

  Ember.run(function() {
    view.destroyElement();
  });

  ok(!view.get('element'), "destroys view when destroyElement() is called");
});

test("should destroy DOM representation when destroy is called", function() {
  Ember.run(function() {
    view = Ember.View.create({
      template: tmpl("<div id='warning'>Don't fear the reaper</div>")
    });

    view.append();
  });

  ok(view.get('element'), "precond - generates a DOM element");

  Ember.run(function() {
    view.destroy();
  });

  ok(Ember.$('#warning').length === 0, "destroys element when destroy() is called");
});

test("should throw an exception if trying to append an element that is already in DOM", function() {
  Ember.run(function() {
    view = Ember.View.create({
      template: tmpl('Broseidon, King of the Brocean')
    });

    view.append();
  });

  ok(view.get('element'), "precond - creates DOM element");

  raises(function() {
    Ember.run(function() {
      view.append();
    });
  }, null, "raises an exception on second append");
});

module("views/view/view_lifecycle_test - destroyed");

test("should throw an exception when calling appendChild after view is destroyed", function() {
  Ember.run(function() {
    view = Ember.View.create({
      template: tmpl("Wait for the kick")
    });

    view.append();
  });

  Ember.run(function() {
    view.destroy();
  });

  raises(function() {
    view.appendChild(Ember.View, {
      template: tmpl("Ah ah ah! You didn't say the magic word!")
    });
  }, null, "throws an exception when calling appendChild");
});

test("should throw an exception when rerender is called after view is destroyed", function() {
  Ember.run(function() {
    view = Ember.View.create({
      template: tmpl('foo')
    });

    view.append();
  });

  Ember.run(function() {
    view.destroy();
  });

  raises(function() {
    view.rerender();
  }, null, "throws an exception when calling rerender");
});

test("should throw an exception when destroyElement is called after view is destroyed", function() {
  Ember.run(function() {
    view = Ember.View.create({
      template: tmpl('foo')
    });

    view.append();
  });

  Ember.run(function() {
    view.destroy();
  });

  raises(function() {
    view.destroyElement();
  }, null, "throws an exception when calling destroyElement");
});

test("trigger rerender on a view in the inDOM state keeps its state as inDOM", function() {
  Ember.run(function() {
    view = Ember.View.create({
      template: tmpl('foo')
    });

    view.append();
  });

  Ember.run(function() {
    view.rerender();
  });

  equal(view.currentState, Ember.View.states.inDOM, "the view is still in the inDOM state");

  Ember.run(function() {
    view.destroy();
  });
});


})();

(function() {
var get = Ember.get, set = Ember.set, rootView, childView;

module("virtual views", {
  teardown: function() {
    Ember.run(function() {
      rootView.destroy();
      childView.destroy();
    });
  }
});

test("a virtual view does not appear as a view's parentView", function() {
  rootView = Ember.View.create({
    elementId: 'root-view',

    render: function(buffer) {
      buffer.push("<h1>Hi</h1>");
      this.appendChild(virtualView);
    }
  });

  var virtualView = Ember.View.create({
    isVirtual: true,
    tagName: '',

    render: function(buffer) {
      buffer.push("<h2>Virtual</h2>");
      this.appendChild(childView);
    }
  });

  childView = Ember.View.create({
    render: function(buffer) {
      buffer.push("<p>Bye!</p>");
    }
  });

  Ember.run(function() {
    Ember.$("#qunit-fixture").empty();
    rootView.appendTo("#qunit-fixture");
  });

  equal(Ember.$("#root-view > h2").length, 1, "nodes with '' tagName do not create wrappers");
  equal(get(childView, 'parentView'), rootView);

  var children = get(rootView, 'childViews');

  equal(get(children, 'length'), 1, "there is one child element");
  equal(children.objectAt(0), childView, "the child element skips through the virtual view");
});

test("when a virtual view's child views change, the parent's childViews should reflect", function() {
  rootView = Ember.View.create({
    elementId: 'root-view',

    render: function(buffer) {
      buffer.push("<h1>Hi</h1>");
      this.appendChild(virtualView);
    }
  });

  var virtualView = Ember.View.create({
    isVirtual: true,
    tagName: '',

    render: function(buffer) {
      buffer.push("<h2>Virtual</h2>");
      this.appendChild(childView);
    }
  });

  childView = Ember.View.create({
    render: function(buffer) {
      buffer.push("<p>Bye!</p>");
    }
  });

  Ember.run(function() {
    Ember.$("#qunit-fixture").empty();
    rootView.appendTo("#qunit-fixture");
  });

  equal(virtualView.get('childViews.length'), 1, "has childView - precond");
  equal(rootView.get('childViews.length'), 1, "has childView - precond");

  Ember.run(function() {
    childView.removeFromParent();
  });

  equal(virtualView.get('childViews.length'), 0, "has no childView");
  equal(rootView.get('childViews.length'), 0, "has no childView");
});

})();

