(function() {
var button, dispatcher;

var get = Ember.get, set = Ember.set;

var originalLookup = Ember.lookup, lookup;

module("Ember.Button", {
  setup: function() {
    lookup = Ember.lookup = {};

    Ember.TESTING_DEPRECATION = true;
    dispatcher = Ember.EventDispatcher.create();
    dispatcher.setup();
    button = Ember.Button.create();
  },

  teardown: function() {
    Ember.run(function() {
      button.destroy();
      dispatcher.destroy();
    });
    Ember.TESTING_DEPRECATION = false;
    Ember.lookup = originalLookup;
  }
});

function synthesizeEvent(type, view) {
  view.$().trigger(type);
}

function synthesizeKeyEvent(type, keyCode, view) {
  var event = Ember.$.Event(type);
  event.keyCode = keyCode;
  view.$().trigger(event);
}

function append() {
  Ember.run(function() {
    button.appendTo('#qunit-fixture');
  });
}

test("should begin disabled if the disabled attribute is true", function() {
  button.set('disabled', true);
  append();

  ok(button.$().is(":disabled"));
});

test("should become disabled if the disabled attribute is changed", function() {
  append();
  ok(button.$().is(":not(:disabled)"));

  Ember.run(function() { button.set('disabled', true); });
  ok(button.$().is(":disabled"));

  Ember.run(function() { button.set('disabled', false); });
  ok(button.$().is(":not(:disabled)"));
});

test("should support the tabindex property", function() {
  Ember.run(function() { button.set('tabindex', 6); });
  append();

  equal(button.$().prop('tabindex'), '6', 'the initial button tabindex is set in the DOM');

  Ember.run(function() { button.set('tabindex', 3); });
  equal(button.$().prop('tabindex'), '3', 'the button tabindex changes when it is changed in the view');
});


test("should trigger an action when clicked", function() {
  var wasClicked = false;

  var actionObject = Ember.Object.create({
    myAction: function() {
      wasClicked = true;
    }
  });

  button.set('target', actionObject);
  button.set('action', 'myAction');

  Ember.run(function() {
    button.appendTo('#qunit-fixture');
  });

  synthesizeEvent('mousedown', button);
  synthesizeEvent('mouseup', button);

  ok(wasClicked);
});

test("should trigger an action when touched", function() {
  var wasClicked = false;

  var actionObject = Ember.Object.create({
    myAction: function() {
      wasClicked = true;
    }
  });

  button.set('target', actionObject);
  button.set('action', 'myAction');

  Ember.run(function() {
    button.appendTo('#qunit-fixture');
  });

  synthesizeEvent('touchstart', button);
  synthesizeEvent('touchend', button);

  ok(wasClicked);
});

test("should trigger an action when space pressed", function() {
  var wasClicked = false;

  var actionObject = Ember.Object.create({
    myAction: function() {
      wasClicked = true;
    }
  });

  button.set('target', actionObject);
  button.set('action', 'myAction');

  Ember.run(function() {
    button.appendTo('#qunit-fixture');
  });

  synthesizeKeyEvent('keydown', 13, button);
  synthesizeKeyEvent('keyup', 13, button);

  ok(wasClicked);
});

test("should trigger an action when enter pressed", function() {
  var wasClicked = false;

  var actionObject = Ember.Object.create({
    myAction: function() {
      wasClicked = true;
    }
  });

  button.set('target', actionObject);
  button.set('action', 'myAction');

  Ember.run(function() {
    button.appendTo('#qunit-fixture');
  });

  synthesizeKeyEvent('keydown', 32, button);
  synthesizeKeyEvent('keyup', 32, button);

  ok(wasClicked);
});

test("should not trigger an action when another key is pressed", function() {
  var wasClicked = false;

  var actionObject = Ember.Object.create({
    myAction: function() {
      wasClicked = true;
    }
  });

  button.set('target', actionObject);
  button.set('action', 'myAction');

  Ember.run(function() {
    button.appendTo('#qunit-fixture');
  });

  // 'a' key
  synthesizeKeyEvent('keydown', 65, button);
  synthesizeKeyEvent('keyup', 65, button);

  ok(!wasClicked);
});

test("should trigger an action on a String target when clicked", function() {
  var wasClicked = false;

  lookup.MyApp = {
    myActionObject: Ember.Object.create({
      myAction: function() {
        wasClicked = true;
      }
    })
  };

  var button = Ember.Button.create({
    target: 'MyApp.myActionObject',
    action: 'myAction'
  });

  Ember.run(function() {
    button.appendTo('#qunit-fixture');
  });

  synthesizeEvent('mousedown', button);
  synthesizeEvent('mouseup', button);

  ok(wasClicked);

  Ember.run(function() {
    button.destroy();
  });
});

test("should not trigger action if mouse leaves area before mouseup", function() {
  var wasClicked = false;

  var actionObject = Ember.Object.create({
    myAction: function() {
      wasClicked = true;
    }
  });

  button.set('target', actionObject);
  button.set('action', 'myAction');

  Ember.run(function() {
    button.appendTo('#qunit-fixture');
  });

  synthesizeEvent('mousedown', button);
  ok(get(button, 'isActive'), "becomes active when hovered");
  ok(button.$().hasClass('is-active'));
  synthesizeEvent('mouseleave', button);
  ok(!get(button, 'isActive'), "loses active state if mouse exits");
  ok(!button.$().hasClass('is-active'));
  synthesizeEvent('mouseup', button);

  ok(!wasClicked);

  wasClicked = false;

  synthesizeEvent('mousedown', button);
  synthesizeEvent('mouseleave', button);
  synthesizeEvent('mouseenter', button);
  synthesizeEvent('mouseup', button);

  ok(wasClicked);
});

test("should not trigger action if disabled and a non-standard input", function() {
  var wasClicked = false;

  var actionObject = Ember.Object.create({
    myAction: function() {
      wasClicked = true;
    }
  });

  button.set('tagName', 'span');
  button.set('disabled', true);
  button.set('target', actionObject);
  button.set('action', 'myAction');

  Ember.run(function() {
    button.appendTo('#qunit-fixture');
  });

  synthesizeEvent('mousedown', button);
  ok(!get(button, 'isActive'), "button does not become active when pushed");
});

test("should not have a type if tagName is not 'input' or 'button'", function() {
  Ember.run(function() {
    button.set('tagName', 'a');
    button.appendTo('#qunit-fixture');
  });

  // IE 7 reports an empty string instead of null.
  ok(!button.$().attr('type'));
});

test("should by default be of type='button' if tagName is 'input'", function() {
  Ember.run(function() {
    button.set('tagName', 'input');
    button.appendTo('#qunit-fixture');
  });

  equal(button.$().attr('type'), 'button');
});

test("should by default be of type='button' if tagName is 'button'", function() {
  Ember.run(function() {
    button.set('tagName', 'button');
    button.appendTo('#qunit-fixture');
  });

  equal(button.$().attr('type'), 'button');
});

test("should allow setting of type when tagName is not 'input' or 'button'", function() {
  button.set('tagName', 'a');
  button.set('type', 'submit');

  equal(button.get('type'), 'submit');
});

test("should allow setting of type when tagName is 'input'", function() {
  button.set('tagName', 'input');
  button.set('type', 'submit');

  equal(button.get('type'), 'submit');
});

test("should allow setting of type when tagName is 'button'", function() {
  button.set('tagName', 'button');
  button.set('type', 'submit');

  equal(button.get('type'), 'submit');
});

test("should have a configurable type", function() {
  button.set('type', 'submit');

  Ember.run(function() {
    button.appendTo('#qunit-fixture');
  });

  equal(button.$().attr('type'), 'submit');
});

test("should set href='#' if tagName is 'a'", function() {
  button.set('tagName', 'a');

  Ember.run(function() {
    button.appendTo('#qunit-fixture');
  });

  // IE 7 throws the whole url in there. If it ends with '#' we're ok
  ok(/#$/.test(button.$().attr('href')));
});

test("should not set href if tagName is not 'a'", function() {
  Ember.run(function() {
    button.appendTo('#qunit-fixture');
  });

  equal(button.$().attr('href'), null);
});

test("should allow the target to be the parentView", function() {
  button.set('target', 'parentView');

  equal(get(button, 'parentView'), button.get('targetObject'));
});

})();

(function() {
var get = Ember.get, set = function(obj, key, value) {
  Ember.run(function() { Ember.set(obj, key, value); });
};

var checkboxView, dispatcher, controller;

var compile = Ember.Handlebars.compile;

function destroy(view) {
  Ember.run(function() {
    view.destroy();
  });
}

module("{{input type='checkbox'}}", {
  setup: function() {
    controller = {
      tab: 6,
      name: 'hello',
      val: false
    };

    checkboxView = Ember.View.extend({
      controller: controller,
      template: compile('{{input type="checkbox" disabled=disabled tabindex=tab name=name checked=val}}')
    }).create();

    append();
  },

  teardown: function() {
    destroy(checkboxView);
  }
});

test("should append a checkbox", function() {
  equal(checkboxView.$('input[type=checkbox]').length, 1, "A single checkbox is added");
});

test("should begin disabled if the disabled attribute is true", function() {
  ok(checkboxView.$('input').is(':not(:disabled)'), "The checkbox isn't disabled");
  set(controller, 'disabled', true);
  ok(checkboxView.$('input').is(':disabled'), "The checkbox is now disabled");
});

test("should support the tabindex property", function() {
  equal(checkboxView.$('input').prop('tabindex'), '6', 'the initial checkbox tabindex is set in the DOM');
  set(controller, 'tab', 3);
  equal(checkboxView.$('input').prop('tabindex'), '3', 'the checkbox tabindex changes when it is changed in the view');
});

test("checkbox name is updated", function() {
  equal(checkboxView.$('input').attr('name'), "hello", "renders checkbox with the name");
  set(controller, 'name', 'bye');
  equal(checkboxView.$('input').attr('name'), "bye", "updates checkbox after name changes");
});

test("checkbox checked property is updated", function() {
  equal(checkboxView.$('input').prop('checked'), false, "the checkbox isn't checked yet");
  set(controller, 'val', true);
  equal(checkboxView.$('input').prop('checked'), true, "the checkbox is checked now");
});

module("{{input type='checkbox'}} - static values", {
  setup: function() {
    controller = {
      tab: 6,
      name: 'hello',
      val: false
    };

    checkboxView = Ember.View.extend({
      controller: controller,
      template: compile('{{input type="checkbox" disabled=true tabindex=6 name="hello" checked=false}}')
    }).create();

    append();
  },

  teardown: function() {
    destroy(checkboxView);
  }
});

test("should begin disabled if the disabled attribute is true", function() {
  ok(checkboxView.$().is(':not(:disabled)'), "The checkbox isn't disabled");
});

test("should support the tabindex property", function() {
  equal(checkboxView.$('input').prop('tabindex'), '6', 'the initial checkbox tabindex is set in the DOM');
});

test("checkbox name is updated", function() {
  equal(checkboxView.$('input').attr('name'), "hello", "renders checkbox with the name");
});

test("checkbox checked property is updated", function() {
  equal(checkboxView.$('input').prop('checked'), false, "the checkbox isn't checked yet");
});

module("Ember.Checkbox", {
  setup: function() {
    dispatcher = Ember.EventDispatcher.create();
    dispatcher.setup();
  },

  teardown: function() {
    Ember.run(function() {
      dispatcher.destroy();
      checkboxView.destroy();
    });
  }
});

function append() {
  Ember.run(function() {
    checkboxView.appendTo('#qunit-fixture');
  });
}

test("should begin disabled if the disabled attribute is true", function() {
  checkboxView = Ember.Checkbox.create({});

  checkboxView.set('disabled', true);
  append();

  ok(checkboxView.$().is(":disabled"));
});

test("should become disabled if the disabled attribute is changed", function() {
  checkboxView = Ember.Checkbox.create({});

  append();
  ok(checkboxView.$().is(":not(:disabled)"));

  Ember.run(function() { checkboxView.set('disabled', true); });
  ok(checkboxView.$().is(":disabled"));

  Ember.run(function() { checkboxView.set('disabled', false); });
  ok(checkboxView.$().is(":not(:disabled)"));
});

test("should begin indeterminate if the indeterminate attribute is true", function() {
  checkboxView = Ember.Checkbox.create({});

  checkboxView.set('indeterminate', true);
  append();

  equal(checkboxView.$().prop('indeterminate'), true, "Checkbox should be indeterminate");
});

test("should become indeterminate if the indeterminate attribute is changed", function() {
  checkboxView = Ember.Checkbox.create({});

  append();

  equal(checkboxView.$().prop('indeterminate'), false, "Checkbox should not be indeterminate");

  Ember.run(function() { checkboxView.set('indeterminate', true); });
  equal(checkboxView.$().prop('indeterminate'), true, "Checkbox should be indeterminate");

  Ember.run(function() { checkboxView.set('indeterminate', false); });
  equal(checkboxView.$().prop('indeterminate'), false, "Checkbox should not be indeterminate");
});

test("should support the tabindex property", function() {
  checkboxView = Ember.Checkbox.create({});

  Ember.run(function() { checkboxView.set('tabindex', 6); });
  append();

  equal(checkboxView.$().prop('tabindex'), '6', 'the initial checkbox tabindex is set in the DOM');

  Ember.run(function() { checkboxView.set('tabindex', 3); });
  equal(checkboxView.$().prop('tabindex'), '3', 'the checkbox tabindex changes when it is changed in the view');
});

test("checkbox name is updated when setting name property of view", function() {
  checkboxView = Ember.Checkbox.create({});

  Ember.run(function() { checkboxView.set('name', 'foo'); });
  append();

  equal(checkboxView.$().attr('name'), "foo", "renders checkbox with the name");

  Ember.run(function() { checkboxView.set('name', 'bar'); });

  equal(checkboxView.$().attr('name'), "bar", "updates checkbox after name changes");
});

test("checked property mirrors input value", function() {
  checkboxView = Ember.Checkbox.create({});
  Ember.run(function() { checkboxView.append(); });

  equal(get(checkboxView, 'checked'), false, "initially starts with a false value");
  equal(!!checkboxView.$().prop('checked'), false, "the initial checked property is false");

  set(checkboxView, 'checked', true);

  equal(checkboxView.$().prop('checked'), true, "changing the value property changes the DOM");

  Ember.run(function() { checkboxView.remove(); });
  Ember.run(function() { checkboxView.append(); });

  equal(checkboxView.$().prop('checked'), true, "changing the value property changes the DOM");

  Ember.run(function() { checkboxView.remove(); });
  Ember.run(function() { set(checkboxView, 'checked', false); });
  Ember.run(function() { checkboxView.append(); });

  equal(checkboxView.$().prop('checked'), false, "changing the value property changes the DOM");
});

test("checking the checkbox updates the value", function() {
  checkboxView = Ember.Checkbox.create({ checked: true });
  append();

  equal(get(checkboxView, 'checked'), true, "precond - initially starts with a true value");
  equal(!!checkboxView.$().prop('checked'), true, "precond - the initial checked property is true");

  // IE fires 'change' event on blur.
  checkboxView.$()[0].focus();
  checkboxView.$()[0].click();
  checkboxView.$()[0].blur();

  equal(!!checkboxView.$().prop('checked'), false, "after clicking a checkbox, the checked property changed");
  equal(get(checkboxView, 'checked'), false, "changing the checkbox causes the view's value to get updated");
});

})();

(function() {
var map = Ember.EnumerableUtils.map,
    trim = Ember.$.trim;

var dispatcher, select, view;

module("Ember.Select", {
  setup: function() {
    dispatcher = Ember.EventDispatcher.create();
    dispatcher.setup();
    select = Ember.Select.create();
  },

  teardown: function() {
    Ember.run(function() {
      dispatcher.destroy();
      select.destroy();
    });
  }
});

function append() {
  Ember.run(function() {
    select.appendTo('#qunit-fixture');
  });
}

function selectedOptions() {
  return select.get('childViews').mapBy('selected');
}

test("has 'ember-view' and 'ember-select' CSS classes", function() {
  deepEqual(select.get('classNames'), ['ember-view', 'ember-select']);
});

test("should render", function() {
  append();

  ok(select.$().length, "Select renders");
});

test("should begin disabled if the disabled attribute is true", function() {
  select.set('disabled', true);
  append();

  ok(select.$().is(":disabled"));
});

test("should become disabled if the disabled attribute is changed", function() {
  append();
  ok(select.$().is(":not(:disabled)"));

  Ember.run(function() { select.set('disabled', true); });
  ok(select.$().is(":disabled"));

  Ember.run(function() { select.set('disabled', false); });
  ok(select.$().is(":not(:disabled)"));
});

test("can have options", function() {
  select.set('content', Ember.A([1, 2, 3]));

  append();

  equal(select.$('option').length, 3, "Should have three options");
  // IE 8 adds whitespace
  equal(select.$().text().replace(/\s+/g,''), "123", "Options should have content");
});


test("select tabindex is updated when setting tabindex property of view", function() {
  Ember.run(function() { select.set('tabindex', '4'); });
  append();

  equal(select.$().attr('tabindex'), "4", "renders select with the tabindex");

  Ember.run(function() { select.set('tabindex', '1'); });

  equal(select.$().attr('tabindex'), "1", "updates select after tabindex changes");
});

test("select name is updated when setting name property of view", function() {
  Ember.run(function() { select.set('name', 'foo'); });
  append();

  equal(select.$().attr('name'), "foo", "renders select with the name");

  Ember.run(function() { select.set('name', 'bar'); });

  equal(select.$().attr('name'), "bar", "updates select after name changes");
});

test("can specify the property path for an option's label and value", function() {
  select.set('content', Ember.A([
    { id: 1, firstName: 'Yehuda' },
    { id: 2, firstName: 'Tom' }
  ]));

  select.set('optionLabelPath', 'content.firstName');
  select.set('optionValuePath', 'content.id');

  append();

  equal(select.$('option').length, 2, "Should have two options");
  // IE 8 adds whitespace
  equal(select.$().text().replace(/\s+/g,''), "YehudaTom", "Options should have content");
  deepEqual(map(select.$('option').toArray(), function(el) { return Ember.$(el).attr('value'); }), ["1", "2"], "Options should have values");
});

test("can retrieve the current selected option when multiple=false", function() {
  var yehuda = { id: 1, firstName: 'Yehuda' },
      tom = { id: 2, firstName: 'Tom' };
  select.set('content', Ember.A([yehuda, tom]));

  append();

  equal(select.get('selection'), yehuda, "By default, the first option is selected");

  select.$()[0].selectedIndex = 1; // select Tom
  select.$().trigger('change');

  equal(select.get('selection'), tom, "On change, the new option should be selected");
});

test("can retrieve the current selected options when multiple=true", function() {
  var yehuda = { id: 1, firstName: 'Yehuda' },
      tom = { id: 2, firstName: 'Tom' },
      david = { id: 3, firstName: 'David' },
      brennain = { id: 4, firstName: 'Brennain' };
  select.set('content', Ember.A([yehuda, tom, david, brennain]));
  select.set('multiple', true);
  select.set('optionLabelPath', 'content.firstName');
  select.set('optionValuePath', 'content.firstName');

  append();

  deepEqual(select.get('selection'), [], "By default, nothing is selected");

  select.$('option').each(function() {
    if (this.value === 'Tom' || this.value === 'David') {
      this.selected = true;
    }
  });

  select.$().trigger('change');

  deepEqual(select.get('selection'), [tom, david], "On change, the new options should be selected");
});

test("selection can be set when multiple=false", function() {
  var yehuda = { id: 1, firstName: 'Yehuda' },
      tom = { id: 2, firstName: 'Tom' };

  Ember.run(function() {
    select.set('content', Ember.A([yehuda, tom]));
    select.set('multiple', false);
    select.set('selection', tom);
  });

  append();

  equal(select.get('selection'), tom, "Initial selection should be correct");

  Ember.run(function() { select.set('selection', yehuda); });

  equal(select.$()[0].selectedIndex, 0, "After changing it, selection should be correct");
});

test("selection can be set when multiple=true", function() {
  var yehuda = { id: 1, firstName: 'Yehuda' },
      tom = { id: 2, firstName: 'Tom' },
      david = { id: 3, firstName: 'David' },
      brennain = { id: 4, firstName: 'Brennain' };

  Ember.run(function() {
    select.set('content', Ember.A([yehuda, tom, david, brennain]));
    select.set('multiple', true);
    select.set('selection', tom);
  });

  append();

  deepEqual(select.get('selection'), [tom], "Initial selection should be correct");

  Ember.run(function() { select.set('selection', yehuda); });

  deepEqual(select.get('selection'), [yehuda], "After changing it, selection should be correct");
});

test("selection can be set when multiple=true and prompt", function() {
  var yehuda = { id: 1, firstName: 'Yehuda' },
      tom = { id: 2, firstName: 'Tom' },
      david = { id: 3, firstName: 'David' },
      brennain = { id: 4, firstName: 'Brennain' };

  Ember.run(function() {
    select.set('content', Ember.A([yehuda, tom, david, brennain]));
    select.set('multiple', true);
    select.set('prompt', 'Pick one!');
    select.set('selection', tom);
  });

  append();

  deepEqual(select.get('selection'), [tom], "Initial selection should be correct");

  Ember.run(function() {
    select.set('selection', yehuda);
  });

  deepEqual(select.get('selection'), [yehuda], "After changing it, selection should be correct");
});

test("multiple selections can be set when multiple=true", function() {
  var yehuda = { id: 1, firstName: 'Yehuda' },
      tom = { id: 2, firstName: 'Tom' },
      david = { id: 3, firstName: 'David' },
      brennain = { id: 4, firstName: 'Brennain' };

  Ember.run(function() {
    select.set('content', Ember.A([yehuda, tom, david, brennain]));
    select.set('optionLabelPath', 'content.firstName');
    select.set('multiple', true);

    select.set('selection', Ember.A([yehuda, david]));
  });

  append();

  deepEqual(select.get('selection'), [yehuda, david], "Initial selection should be correct");

  Ember.run(function() { select.set('selection', Ember.A([tom, brennain])); });

  deepEqual(
    select.$(':selected').map(function() { return trim(Ember.$(this).text());}).toArray(),
    ['Tom', 'Brennain'],
    "After changing it, selection should be correct");
});

test("multiple selections can be set by changing in place the selection array when multiple=true", function() {
  var yehuda = { id: 1, firstName: 'Yehuda' },
      tom = { id: 2, firstName: 'Tom' },
      david = { id: 3, firstName: 'David' },
      brennain = { id: 4, firstName: 'Brennain' },
      selection = Ember.A([yehuda, tom]);

  Ember.run(function() {
    select.set('content', Ember.A([yehuda, tom, david, brennain]));
    select.set('optionLabelPath', 'content.firstName');
    select.set('multiple', true);
    select.set('selection', selection);
  });

  append();

  deepEqual(select.get('selection'), [yehuda, tom], "Initial selection should be correct");

  Ember.run(function() {
    selection.replace(0, selection.get('length'), Ember.A([david, brennain]));
  });

  deepEqual(
    select.$(':selected').map(function() { return trim(Ember.$(this).text());}).toArray(),
    ['David', 'Brennain'],
    "After updating the selection array in-place, selection should be correct");
});


test("multiple selections can be set indirectly via bindings and in-place when multiple=true (issue #1058)", function() {
  var indirectContent = Ember.Object.create();

  var yehuda = { id: 1, firstName: 'Yehuda' },
      tom = { id: 2, firstName: 'Tom' },
      david = { id: 3, firstName: 'David' },
      brennain = { id: 4, firstName: 'Brennain' },
      cyril = { id: 5, firstName: 'Cyril' };

  Ember.run(function() {
    select.destroy(); // Destroy the existing select

    Ember.run(function() {
      select = Ember.Select.extend({
        indirectContent: indirectContent,
        contentBinding: 'indirectContent.controller.content',
        selectionBinding: 'indirectContent.controller.selection',
        multiple: true,
        optionLabelPath: 'content.firstName'
      }).create();

      indirectContent.set('controller', Ember.Object.create({
        content: Ember.A([tom, david, brennain]),
        selection: Ember.A([david])
      }));
    });

    append();
  });

  deepEqual(select.get('content'), [tom, david, brennain], "Initial content should be correct");
  deepEqual(select.get('selection'), [david], "Initial selection should be correct");

  Ember.run(function() {
    indirectContent.set('controller.content', Ember.A([david, cyril]));
    indirectContent.set('controller.selection', Ember.A([cyril]));
  });

  deepEqual(select.get('content'), [david, cyril], "After updating bound content, content should be correct");
  deepEqual(select.get('selection'), [cyril], "After updating bound selection, selection should be correct");
});

test("select with group can group options", function() {
  var content = Ember.A([
    { firstName: 'Yehuda', organization: 'Tilde' },
    { firstName: 'Tom', organization: 'Tilde' },
    { firstName: 'Keith', organization: 'Envato' }
  ]);

  Ember.run(function() {
    select.set('content', content),
    select.set('optionGroupPath', 'organization');
    select.set('optionLabelPath', 'content.firstName');
  });

  append();

  equal(select.$('optgroup').length, 2);

  var labels = [];
  select.$('optgroup').each(function() {
    labels.push(this.label);
  });
  equal(labels.join(''), ['TildeEnvato']);

  equal(select.$('optgroup').first().text().replace(/\s+/g,''), 'YehudaTom');
  equal(select.$('optgroup').last().text().replace(/\s+/g,''), 'Keith');
});

test("select with group doesn't break options", function() {
  var content = Ember.A([
    { id: 1, firstName: 'Yehuda', organization: 'Tilde' },
    { id: 2, firstName: 'Tom', organization: 'Tilde' },
    { id: 3, firstName: 'Keith', organization: 'Envato' }
  ]);

  Ember.run(function() {
    select.set('content', content),
    select.set('optionGroupPath', 'organization');
    select.set('optionLabelPath', 'content.firstName');
    select.set('optionValuePath', 'content.id');
  });

  append();

  equal(select.$('option').length, 3);
  equal(select.$().text().replace(/\s+/g,''), 'YehudaTomKeith');

  Ember.run(function() {
    content.set('firstObject.firstName', 'Peter');
  });
  equal(select.$().text(), 'PeterTomKeith');

  select.$('option').get(0).selected = true;
  select.$().trigger('change');
  deepEqual(select.get('selection'), content.get('firstObject'));
});

test("select with group observes its content", function() {
  var wycats = { firstName: 'Yehuda', organization: 'Tilde' };
  var content = Ember.A([
    wycats
  ]);

  Ember.run(function() {
    select.set('content', content),
    select.set('optionGroupPath', 'organization');
    select.set('optionLabelPath', 'content.firstName');
  });

  append();

  Ember.run(function() {
    content.pushObject({ firstName: 'Keith', organization: 'Envato' });
  });

  equal(select.$('optgroup').length, 2);
  equal(select.$('optgroup[label=Envato]').length, 1);

  Ember.run(function() {
    select.set('optionGroupPath', 'firstName');
  });
  var labels = [];
  select.$('optgroup').each(function() {
    labels.push(this.label);
  });
  equal(labels.join(''), 'YehudaKeith');
});
test("select with group whose content is undefined doesn't breaks", function() {

		var content;
  Ember.run(function() {
    select.set('content', content),
    select.set('optionGroupPath', 'organization');
    select.set('optionLabelPath', 'content.firstName');
  });

  append();

  equal(select.$('optgroup').length, 0);
});
test("selection uses the same array when multiple=true", function() {
  var yehuda = { id: 1, firstName: 'Yehuda' },
      tom = { id: 2, firstName: 'Tom' },
      david = { id: 3, firstName: 'David' },
      brennain = { id: 4, firstName: 'Brennain' },
      selection = Ember.A([yehuda, david]);

  Ember.run(function() {
    select.set('content', Ember.A([yehuda, tom, david, brennain]));
    select.set('multiple', true);
    select.set('optionLabelPath', 'content.firstName');
    select.set('selection', selection);
  });

  append();

  deepEqual(select.get('selection'), [yehuda, david], "Initial selection should be correct");

  select.$('option').each(function() { this.selected = false; });
  select.$(':contains("Tom"), :contains("David")').each(function() { this.selected = true; });

  select.$().trigger('change');

  deepEqual(select.get('selection'), [tom,david], "On change the selection is updated");
  deepEqual(selection, [tom,david], "On change the original selection array is updated");
});

test("Ember.SelectedOption knows when it is selected when multiple=false", function() {
  var yehuda = { id: 1, firstName: 'Yehuda' },
      tom = { id: 2, firstName: 'Tom' },
      david = { id: 3, firstName: 'David' },
      brennain = { id: 4, firstName: 'Brennain' };

  Ember.run(function() {
    select.set('content', Ember.A([yehuda, tom, david, brennain]));
    select.set('multiple', false);

    select.set('selection', david);
  });

  append();

  deepEqual(selectedOptions(), [false, false, true, false], "Initial selection should be correct");

  Ember.run(function() { select.set('selection', brennain); });

  deepEqual(selectedOptions(), [false, false, false, true], "After changing it, selection should be correct");
});

test("Ember.SelectedOption knows when it is selected when multiple=true", function() {
  var yehuda = { id: 1, firstName: 'Yehuda' },
      tom = { id: 2, firstName: 'Tom' },
      david = { id: 3, firstName: 'David' },
      brennain = { id: 4, firstName: 'Brennain' };

  Ember.run(function() {
    select.set('content', Ember.A([yehuda, tom, david, brennain]));
    select.set('multiple', true);

    select.set('selection', [yehuda, david]);
  });

  append();

  deepEqual(selectedOptions(), [true, false, true, false], "Initial selection should be correct");

  Ember.run(function() {
    select.set('selection', [tom, david]);
  });

  deepEqual(selectedOptions(), [false, true, true, false], "After changing it, selection should be correct");
});

test("Ember.SelectedOption knows when it is selected when multiple=true and options are primatives", function() {
  Ember.run(function() {
    select.set('content', Ember.A([1, 2, 3, 4]));
    select.set('multiple', true);
    select.set('selection', [1, 3]);
  });

  append();

  deepEqual(selectedOptions(), [true, false, true, false], "Initial selection should be correct");

  Ember.run(function() { select.set('selection', [2, 3]); });

  deepEqual(selectedOptions(), [false, true, true, false], "After changing it, selection should be correct");
});

test("a prompt can be specified", function() {
  var yehuda = { id: 1, firstName: 'Yehuda' },
      tom = { id: 2, firstName: 'Tom' };

  Ember.run(function() {
    select.set('content', Ember.A([yehuda, tom]));
    select.set('prompt', 'Pick a person');
    select.set('optionLabelPath', 'content.firstName');
    select.set('optionValuePath', 'content.id');
  });

  append();

  equal(select.$('option').length, 3, "There should be three options");
  equal(select.$()[0].selectedIndex, 0, "By default, the prompt is selected in the DOM");
  equal(trim(select.$('option:selected').text()), 'Pick a person', "By default, the prompt is selected in the DOM");
  equal(select.$().val(), '', "By default, the prompt has no value");

  equal(select.get('selection'), null, "When the prompt is selected, the selection should be null");

  Ember.run(function() { select.set('selection', tom); });

  equal(select.$()[0].selectedIndex, 2, "The selectedIndex accounts for the prompt");

  select.$()[0].selectedIndex = 0;
  select.$().trigger('change');

  equal(select.get('selection'), null, "When the prompt is selected again after another option, the selection should be null");

  select.$()[0].selectedIndex = 2;
  select.$().trigger('change');
  equal(select.get('selection'), tom, "Properly accounts for the prompt when DOM change occurs");
});

test("handles null content", function() {
  append();

  Ember.run(function() {
    select.set('content', null);
    select.set('selection', 'invalid');
    select.set('value', 'also_invalid');
  });

  equal(select.get('element').selectedIndex, -1, "should have no selection");

  Ember.run(function() {
    select.set('multiple', true);
    select.set('selection', [{ content: 'invalid' }]);
  });

  equal(select.get('element').selectedIndex, -1, "should have no selection");
});

test("valueBinding handles 0 as initiated value (issue #2763)", function() {
  var indirectData = Ember.Object.create({
    value: 0
  });

  Ember.run(function() {
    select.destroy(); // Destroy the existing select

    select = Ember.Select.extend({
      content: Ember.A([1,0]),
      indirectData: indirectData,
      valueBinding: 'indirectData.value'
    }).create();

    append();
  });

  equal(select.get('value'), 0, "Value property should equal 0");
});

test("should be able to select an option and then reselect the prompt", function() {
  Ember.run(function() {
    select.set('content', Ember.A(['one', 'two', 'three']));
    select.set('prompt', 'Select something');
  });

  append();

  select.$()[0].selectedIndex = 2;
  select.$().trigger('change');
  equal(select.get('selection'), 'two');

  select.$()[0].selectedIndex = 0;
  select.$().trigger('change');
  equal(select.get('selection'), null);
  equal(select.$()[0].selectedIndex, 0);
});

test("should be able to get the current selection's value", function() {
  Ember.run(function() {
    select.set('content', Ember.A([
      {label: 'Yehuda Katz', value: 'wycats'},
      {label: 'Tom Dale', value: 'tomdale'},
      {label: 'Peter Wagenet', value: 'wagenet'},
      {label: 'Erik Bryn', value: 'ebryn'}
    ]));
    select.set('optionLabelPath', 'content.label');
    select.set('optionValuePath', 'content.value');
  });

  append();

  equal(select.get('value'), 'wycats');
});

test("should be able to set the current selection by value", function() {
  var ebryn = {label: 'Erik Bryn', value: 'ebryn'};

  Ember.run(function() {
    select.set('content', Ember.A([
      {label: 'Yehuda Katz', value: 'wycats'},
      {label: 'Tom Dale', value: 'tomdale'},
      {label: 'Peter Wagenet', value: 'wagenet'},
      ebryn
    ]));
    select.set('optionLabelPath', 'content.label');
    select.set('optionValuePath', 'content.value');
    select.set('value', 'ebryn');
  });

  append();

  equal(select.get('value'), 'ebryn');
  equal(select.get('selection'), ebryn);
});

module("Ember.Select - usage inside templates", {
  setup: function() {
    dispatcher = Ember.EventDispatcher.create();
    dispatcher.setup();
  },

  teardown: function() {
    Ember.run(function() {
      dispatcher.destroy();
      if (view) { view.destroy(); }
    });
  }
});

test("works from a template with bindings", function() {
  var Person = Ember.Object.extend({
    id: null,
    firstName: null,
    lastName: null,

    fullName: Ember.computed(function() {
      return this.get('firstName') + " " + this.get('lastName');
    }).property('firstName', 'lastName')
  });

  var erik = Person.create({id: 4, firstName: 'Erik', lastName: 'Bryn'});

  var application = Ember.Namespace.create();

  application.peopleController = Ember.ArrayController.create({
    content: Ember.A([
      Person.create({id: 1, firstName: 'Yehuda', lastName: 'Katz'}),
      Person.create({id: 2, firstName: 'Tom', lastName: 'Dale'}),
      Person.create({id: 3, firstName: 'Peter', lastName: 'Wagenet'}),
      erik
    ])
  });

  application.selectedPersonController = Ember.Object.create({
    person: null
  });

  view = Ember.View.create({
    app: application,
    template: Ember.Handlebars.compile(
      '{{view Ember.Select viewName="select"' +
      '                    contentBinding="view.app.peopleController"' +
      '                    optionLabelPath="content.fullName"' +
      '                    optionValuePath="content.id"' +
      '                    prompt="Pick a person:"' +
      '                    selectionBinding="view.app.selectedPersonController.person"}}'
    )
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  var select = view.get('select');
  ok(select.$().length, "Select was rendered");
  equal(select.$('option').length, 5, "Options were rendered");
  equal(select.$().text(), "Pick a person:Yehuda KatzTom DalePeter WagenetErik Bryn", "Option values were rendered");
  equal(select.get('selection'), null, "Nothing has been selected");

  Ember.run(function() {
    application.selectedPersonController.set('person', erik);
  });

  equal(select.get('selection'), erik, "Selection was updated through binding");
  Ember.run(function() {
    application.peopleController.pushObject(Person.create({id: 5, firstName: "James", lastName: "Rosen"}));
  });

  equal(select.$('option').length, 6, "New option was added");
  equal(select.get('selection'), erik, "Selection was maintained after new option was added");
});

test("upon content change, the DOM should reflect the selection (#481)", function() {
  var userOne = {name: 'Mike', options: Ember.A(['a', 'b']), selectedOption: 'a'},
      userTwo = {name: 'John', options: Ember.A(['c', 'd']), selectedOption: 'd'};

  view = Ember.View.create({
    user: userOne,
    template: Ember.Handlebars.compile(
      '{{view Ember.Select viewName="select"' +
      '    contentBinding="view.user.options"' +
      '    selectionBinding="view.user.selectedOption"}}'
    )
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  var select = view.get('select'),
      selectEl = select.$()[0];

  equal(select.get('selection'), 'a', "Precond: Initial selection is correct");
  equal(selectEl.selectedIndex, 0, "Precond: The DOM reflects the correct selection");

  Ember.run(function() {
    view.set('user', userTwo);
  });

  equal(select.get('selection'), 'd', "Selection was properly set after content change");
  equal(selectEl.selectedIndex, 1, "The DOM reflects the correct selection");
});

test("upon content change with Array-like content, the DOM should reflect the selection", function() {
  var tom = {id: 4, name: 'Tom'},
      sylvain = {id: 5, name: 'Sylvain'};

  var proxy = Ember.ArrayProxy.create({
    content: Ember.A(),
    selectedOption: sylvain
  });

  view = Ember.View.create({
    proxy: proxy,
    template: Ember.Handlebars.compile(
      '{{view Ember.Select viewName="select"' +
      '    contentBinding="view.proxy"' +
      '    selectionBinding="view.proxy.selectedOption"}}'
    )
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  var select = view.get('select'),
      selectEl = select.$()[0];

  equal(selectEl.selectedIndex, -1, "Precond: The DOM reflects the lack of selection");

  Ember.run(function() {
    proxy.set('content', Ember.A([tom, sylvain]));
  });

  equal(select.get('selection'), sylvain, "Selection was properly set after content change");
  equal(selectEl.selectedIndex, 1, "The DOM reflects the correct selection");
});

function testValueBinding(templateString) {
  view = Ember.View.create({
    collection: Ember.A([{name: 'Wes', value: 'w'}, {name: 'Gordon', value: 'g'}]),
    val: 'g',
    template: Ember.Handlebars.compile(templateString)
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  var select = view.get('select'),
      selectEl = select.$()[0];

  equal(view.get('val'), 'g', "Precond: Initial bound property is correct");
  equal(select.get('value'), 'g', "Precond: Initial selection is correct");
  equal(selectEl.selectedIndex, 2, "Precond: The DOM reflects the correct selection");

  select.$('option:eq(2)').removeAttr('selected');
  select.$('option:eq(1)').prop('selected', true);
  select.$().trigger('change');

  equal(view.get('val'), 'w', "Updated bound property is correct");
  equal(select.get('value'), 'w', "Updated selection is correct");
  equal(selectEl.selectedIndex, 1, "The DOM is updated to reflect the new selection");
}

test("select element should correctly initialize and update selectedIndex and bound properties when using valueBinding (old xBinding='' syntax)", function() {
  testValueBinding(
    '{{view Ember.Select viewName="select"' +
    '    contentBinding="view.collection"' +
    '    optionLabelPath="content.name"' +
    '    optionValuePath="content.value"' +
    '    prompt="Please wait..."' +
    '    valueBinding="view.val"}}'
  );
});

test("select element should correctly initialize and update selectedIndex and bound properties when using valueBinding (new quoteless binding shorthand)", function() {
  testValueBinding(
    '{{view Ember.Select viewName="select"' +
    '    content=view.collection' +
    '    optionLabelPath="content.name"' +
    '    optionValuePath="content.value"' +
    '    prompt="Please wait..."' +
    '    value=view.val}}'
  );
});

})();

(function() {
/*globals TestObject:true */

var textArea, controller;
var get = Ember.get, set = function(object, key, value) {
  Ember.run(function() { Ember.set(object, key, value); });
};

var compile = Ember.Handlebars.compile,
    forEach = Ember.ArrayPolyfills.forEach;

function append() {
  Ember.run(function() {
    textArea.appendTo('#qunit-fixture');
  });
}

function destroy(object) {
  Ember.run(function() {
    object.destroy();
  });
}

module("{{textarea}}", {
  setup: function() {
    controller = {
      val: 'Lorem ipsum dolor'
    };

    textArea = Ember.View.extend({
      controller: controller,
      template: compile('{{textarea disabled=disabled value=val}}')
    }).create();

    append();
  },

  teardown: function() {
    destroy(textArea);
  }
});

test("Should insert a textarea", function() {
  equal(textArea.$('textarea').length, 1, "There is a single textarea");
});

test("Should become disabled when the controller changes", function() {
  ok(textArea.$('textarea').is(':not(:disabled)'), "Nothing is disabled yet");
  set(controller, 'disabled', true);
  ok(textArea.$('textarea').is(':disabled'), "The disabled attribute is updated");
});

test("Should bind its contents to the specified value", function() {
  equal(textArea.$('textarea').val(), "Lorem ipsum dolor", "The contents are included");
  set(controller, 'val', "sit amet");
  equal(textArea.$('textarea').val(), "sit amet", "The new contents are included");
});

module("Ember.TextArea", {
  setup: function() {
    TestObject = Ember.Object.create({
      value: null
    });

    textArea = Ember.TextArea.create();
  },

  teardown: function() {
    Ember.run(function() {
      textArea.destroy();
    });
    TestObject = textArea = null;
  }
});

test("should become disabled if the disabled attribute is true", function() {
  textArea.set('disabled', true);
  append();

  ok(textArea.$().is(":disabled"));
});

test("should become disabled if the disabled attribute is true", function() {
  append();
  ok(textArea.$().is(":not(:disabled)"));

  Ember.run(function() { textArea.set('disabled', true); });
  ok(textArea.$().is(":disabled"));

  Ember.run(function() { textArea.set('disabled', false); });
  ok(textArea.$().is(":not(:disabled)"));
});

test("input value is updated when setting value property of view", function() {
  Ember.run(function() {
    set(textArea, 'value', 'foo');
    textArea.append();
  });

  equal(textArea.$().val(), "foo", "renders text field with value");

  Ember.run(function() { set(textArea, 'value', 'bar'); });

  equal(textArea.$().val(), "bar", "updates text field after value changes");
});

test("input placeholder is updated when setting placeholder property of view", function() {
  Ember.run(function() {
    set(textArea, 'placeholder', 'foo');
    textArea.append();
  });

  equal(textArea.$().attr('placeholder'), "foo", "renders text area with placeholder");

  Ember.run(function() { set(textArea, 'placeholder', 'bar'); });

  equal(textArea.$().attr('placeholder'), "bar", "updates text area after placeholder changes");
});

test("input name is updated when setting name property of view", function() {
  Ember.run(function() {
    set(textArea, 'name', 'foo');
    textArea.append();
  });

  equal(textArea.$().attr('name'), "foo", "renders text area with name");

  Ember.run(function() { set(textArea, 'name', 'bar'); });

  equal(textArea.$().attr('name'), "bar", "updates text area after name changes");
});

test("input maxlength is updated when setting maxlength property of view", function() {
  Ember.run(function() {
    set(textArea, 'maxlength', '300');
    textArea.append();
  });

  equal(textArea.$().attr('maxlength'), "300", "renders text area with maxlength");

  Ember.run(function() { set(textArea, 'maxlength', '400'); });

  equal(textArea.$().attr('maxlength'), "400", "updates text area after maxlength changes");
});

test("input rows is updated when setting rows property of view", function() {
  Ember.run(function() {
    set(textArea, 'rows', '3');
    textArea.append();
  });

  equal(textArea.$().attr('rows'), "3", "renders text area with rows");

  Ember.run(function() { set(textArea, 'rows', '4'); });

  equal(textArea.$().attr('rows'), "4", "updates text area after rows changes");
});

test("input cols is updated when setting cols property of view", function() {
  Ember.run(function() {
    set(textArea, 'cols', '30');
    textArea.append();
  });

  equal(textArea.$().attr('cols'), "30", "renders text area with cols");

  Ember.run(function() { set(textArea, 'cols', '40'); });

  equal(textArea.$().attr('cols'), "40", "updates text area after cols changes");
});

test("input tabindex is updated when setting tabindex property of view", function() {
  Ember.run(function() {
    set(textArea, 'tabindex', '4');
    textArea.append();
  });

  equal(textArea.$().attr('tabindex'), "4", "renders text area with the tabindex");

  Ember.run(function() { set(textArea, 'tabindex', '1'); });

  equal(textArea.$().attr('tabindex'), "1", "updates text area after tabindex changes");
});

test("value binding works properly for inputs that haven't been created", function() {

  Ember.run(function() {
    textArea.destroy(); // destroy existing textarea
    textArea = Ember.TextArea.createWithMixins({
      valueBinding: 'TestObject.value'
    });
  });

  equal(get(textArea, 'value'), null, "precond - default value is null");
  equal(textArea.$(), undefined, "precond - view doesn't have its layer created yet, thus no input element");

  Ember.run(function() {
    set(TestObject, 'value', 'ohai');
  });

  equal(get(textArea, 'value'), 'ohai', "value property was properly updated");

  Ember.run(function() { textArea.append(); });

  equal(get(textArea, 'value'), 'ohai', "value property remains the same once the view has been appended");
  equal(textArea.$().val(), 'ohai', "value is reflected in the input element once it is created");
});

forEach.call([ 'cut', 'paste', 'input' ], function(eventName) {
  test("should update the value on " + eventName + " events", function() {

    Ember.run(function() {
      textArea.append();
    });

    textArea.$().val('new value');
    textArea.trigger(eventName, Ember.Object.create({
      type: eventName
    }));

    equal(textArea.get('value'), 'new value', 'value property updates on ' + eventName + ' events');
  });
});

test("should call the insertNewline method when return key is pressed", function() {
  var wasCalled;
  var event = Ember.Object.create({
    keyCode: 13
  });

  Ember.run(function() { textArea.append(); });

  textArea.insertNewline = function() {
    wasCalled = true;
  };

  textArea.trigger('keyUp', event);
  ok(wasCalled, "invokes insertNewline method");
});

test("should call the cancel method when escape key is pressed", function() {
  var wasCalled;
  var event = Ember.Object.create({
    keyCode: 27
  });

  Ember.run(function() { textArea.append(); });

  textArea.cancel = function() {
    wasCalled = true;
  };

  textArea.trigger('keyUp', event);
  ok(wasCalled, "invokes cancel method");
});

})();

(function() {
/*globals TestObject:true */

var textField;
var get = Ember.get, set = function(obj, key, value) {
  Ember.run(function() { Ember.set(obj, key, value); });
};

function append() {
  Ember.run(function() {
    textField.appendTo('#qunit-fixture');
  });
}

function destroy(view) {
  Ember.run(function() {
    view.destroy();
  });
}

var controller;

module("{{input type='text'}}", {
  setup: function() {
    controller = {
      val: "hello",
      place: "Enter some text",
      name: "some-name",
      max: 30,
      size: 30,
      tab: 5
    };

    textField = Ember.View.extend({
      controller: controller,
      template: compile('{{input type="text" disabled=disabled value=val placeholder=place name=name maxlength=max size=size tabindex=tab}}')
    }).create();

    append();
  },

  teardown: function() {
    destroy(textField);
  }
});

var compile = Ember.Handlebars.compile;

test("should insert a text field into DOM", function() {
  equal(textField.$('input').length, 1, "A single text field was inserted");
});

test("should become disabled if the disabled attribute is true", function() {
  ok(textField.$('input').is(':not(:disabled)'), "There are no disabled text fields");

  set(controller, 'disabled', true);
  ok(textField.$('input').is(':disabled'), "The text field is disabled");

  set(controller, 'disabled', false);
  ok(textField.$('input').is(':not(:disabled)'), "There are no disabled text fields");
});

test("input value is updated when setting value property of view", function() {
  equal(textField.$('input').val(), "hello", "renders text field with value");
  set(controller, 'val', 'bye!');
  equal(textField.$('input').val(), "bye!", "updates text field after value changes");
});

test("input placeholder is updated when setting placeholder property of view", function() {
  equal(textField.$('input').attr('placeholder'), "Enter some text", "renders text field with placeholder");
  set(controller, 'place', 'Text, please enter it');
  equal(textField.$('input').attr('placeholder'), "Text, please enter it", "updates text field after placeholder changes");
});

test("input name is updated when setting name property of view", function() {
  equal(textField.$('input').attr('name'), "some-name", "renders text field with name");
  set(controller, 'name', 'other-name');
  equal(textField.$('input').attr('name'), "other-name", "updates text field after name changes");
});

test("input maxlength is updated when setting maxlength property of view", function() {
  equal(textField.$('input').attr('maxlength'), "30", "renders text field with maxlength");
  set(controller, 'max', 40);
  equal(textField.$('input').attr('maxlength'), "40", "updates text field after maxlength changes");
});

test("input size is updated when setting size property of view", function() {
  equal(textField.$('input').attr('size'), "30", "renders text field with size");
  set(controller, 'size', 40);
  equal(textField.$('input').attr('size'), "40", "updates text field after size changes");
});

test("input tabindex is updated when setting tabindex property of view", function() {
  equal(textField.$('input').attr('tabindex'), "5", "renders text field with the tabindex");
  set(controller, 'tab', 3);
  equal(textField.$('input').attr('tabindex'), "3", "updates text field after tabindex changes");
});

module("{{input type='text'}} - static values", {
  setup: function() {
    controller = {};

    textField = Ember.View.extend({
      controller: controller,
      template: compile('{{input type="text" disabled=true value="hello" placeholder="Enter some text" name="some-name" maxlength=30 size=30 tabindex=5}}')
    }).create();

    append();
  },

  teardown: function() {
    destroy(textField);
  }
});

test("should insert a text field into DOM", function() {
  equal(textField.$('input').length, 1, "A single text field was inserted");
});

test("should become disabled if the disabled attribute is true", function() {
  ok(textField.$('input').is(':disabled'), "The text field is disabled");
});

test("input value is updated when setting value property of view", function() {
  equal(textField.$('input').val(), "hello", "renders text field with value");
});

test("input placeholder is updated when setting placeholder property of view", function() {
  equal(textField.$('input').attr('placeholder'), "Enter some text", "renders text field with placeholder");
});

test("input name is updated when setting name property of view", function() {
  equal(textField.$('input').attr('name'), "some-name", "renders text field with name");
});

test("input maxlength is updated when setting maxlength property of view", function() {
  equal(textField.$('input').attr('maxlength'), "30", "renders text field with maxlength");
});

test("input size is updated when setting size property of view", function() {
  equal(textField.$('input').attr('size'), "30", "renders text field with size");
});

test("input tabindex is updated when setting tabindex property of view", function() {
  equal(textField.$('input').attr('tabindex'), "5", "renders text field with the tabindex");
});

module("{{input}} - default type", {
  setup: function() {
    controller = {};

    textField = Ember.View.extend({
      controller: controller,
      template: compile('{{input}}')
    }).create();

    append();
  },

  teardown: function() {
    destroy(textField);
  }
});

test("should have the default type", function() {
  equal(textField.$('input').attr('type'), 'text', "Has a default text type");
});

module("Ember.TextField", {
  setup: function() {
    TestObject = Ember.Object.create({
      value: null
    });

    textField = Ember.TextField.create();
  },

  teardown: function() {
    Ember.run(function() {
      textField.destroy();
    });
    TestObject = textField = null;
  }
});

test("should become disabled if the disabled attribute is true", function() {
  textField.set('disabled', true);
  append();

  ok(textField.$().is(":disabled"));
});

test("should become disabled if the disabled attribute is true", function() {
  append();
  ok(textField.$().is(":not(:disabled)"));

  Ember.run(function() { textField.set('disabled', true); });
  ok(textField.$().is(":disabled"));

  Ember.run(function() { textField.set('disabled', false); });
  ok(textField.$().is(":not(:disabled)"));
});

test("input value is updated when setting value property of view", function() {
  Ember.run(function() {
    set(textField, 'value', 'foo');
    textField.append();
  });

  equal(textField.$().val(), "foo", "renders text field with value");

  Ember.run(function() { set(textField, 'value', 'bar'); });

  equal(textField.$().val(), "bar", "updates text field after value changes");
});

test("input placeholder is updated when setting placeholder property of view", function() {
  Ember.run(function() {
    set(textField, 'placeholder', 'foo');
    textField.append();
  });

  equal(textField.$().attr('placeholder'), "foo", "renders text field with placeholder");

  Ember.run(function() { set(textField, 'placeholder', 'bar'); });

  equal(textField.$().attr('placeholder'), "bar", "updates text field after placeholder changes");
});

test("input name is updated when setting name property of view", function() {
  Ember.run(function() {
    set(textField, 'name', 'foo');
    textField.append();
  });

  equal(textField.$().attr('name'), "foo", "renders text field with name");

  Ember.run(function() { set(textField, 'name', 'bar'); });

  equal(textField.$().attr('name'), "bar", "updates text field after name changes");
});

test("input maxlength is updated when setting maxlength property of view", function() {
  Ember.run(function() {
    set(textField, 'maxlength', '30');
    textField.append();
  });

  equal(textField.$().attr('maxlength'), "30", "renders text field with maxlength");

  Ember.run(function() { set(textField, 'maxlength', '40'); });

  equal(textField.$().attr('maxlength'), "40", "updates text field after maxlength changes");
});

test("input size is updated when setting size property of view", function() {
  Ember.run(function() {
    set(textField, 'size', '30');
    textField.append();
  });

  equal(textField.$().attr('size'), "30", "renders text field with size");

  Ember.run(function() { set(textField, 'size', '40'); });

  equal(textField.$().attr('size'), "40", "updates text field after size changes");
});

test("input tabindex is updated when setting tabindex property of view", function() {
  Ember.run(function() {
    set(textField, 'tabindex', '5');
    textField.append();
  });

  equal(textField.$().attr('tabindex'), "5", "renders text field with the tabindex");

  Ember.run(function() { set(textField, 'tabindex', '3'); });

  equal(textField.$().attr('tabindex'), "3", "updates text field after tabindex changes");
});

test("input type is configurable when creating view", function() {
  Ember.run(function() {
    set(textField, 'type', 'password');
    textField.append();
  });

  equal(textField.$().attr('type'), 'password', "renders text field with type");
});

test("value binding works properly for inputs that haven't been created", function() {

  Ember.run(function() {
    textField.destroy(); // destroy existing textField
    textField = Ember.TextField.createWithMixins({
      valueBinding: 'TestObject.value'
    });
  });

  equal(get(textField, 'value'), null, "precond - default value is null");
  equal(textField.$(), undefined, "precond - view doesn't have its layer created yet, thus no input element");

  Ember.run(function() {
    set(TestObject, 'value', 'ohai');
  });

  equal(get(textField, 'value'), 'ohai', "value property was properly updated");

  Ember.run(function() { textField.append(); });

  equal(get(textField, 'value'), 'ohai', "value property remains the same once the view has been appended");
  equal(textField.$().val(), 'ohai', "value is reflected in the input element once it is created");
});

test("value binding sets value on the element", function() {
  Ember.run(function() {
    textField.destroy(); // destroy existing textField
    textField = Ember.TextField.createWithMixins({
      valueBinding: 'TestObject.value'
    });
    textField.append();
  });

  // Set the value via the DOM
  Ember.run(function() {
    textField.$().val('via dom');
    // Trigger lets the view know we changed this value (like a real user editing)
    textField.trigger('input', Ember.Object.create({
      type: 'input'
    }));
  });

  equal(get(textField, 'value'), 'via dom', "value property was properly updated via dom");
  equal(textField.$().val(), 'via dom', "dom property was properly updated via dom");

  // Now, set it via the binding
  Ember.run(function() {
    set(TestObject, 'value', 'via view');
  });

  equal(get(textField, 'value'), 'via view', "value property was properly updated via view");
  equal(textField.$().val(), 'via view', "dom property was properly updated via view");
});

test("should call the insertNewline method when return key is pressed", function() {
  var wasCalled;
  var event = Ember.Object.create({
    keyCode: 13
  });

  Ember.run(function() { textField.append(); });

  textField.insertNewline = function() {
    wasCalled = true;
  };

  textField.trigger('keyUp', event);
  ok(wasCalled, "invokes insertNewline method");
});

test("should call the cancel method when escape key is pressed", function() {
  var wasCalled;
  var event = Ember.Object.create({
    keyCode: 27
  });

  Ember.run(function() { textField.append(); });

  textField.cancel = function() {
    wasCalled = true;
  };

  textField.trigger('keyUp', event);
  ok(wasCalled, "invokes cancel method");
});

test("should send an action if one is defined when the return key is pressed", function() {
  expect(2);

  var StubController = Ember.Object.extend({
    send: function(actionName, value, sender) {
      equal(actionName, 'didTriggerAction', "text field sent correct action name");
      equal(value, "textFieldValue", "text field sent its current value as first argument");
    }
  });

  textField.set('action', 'didTriggerAction');
  textField.set('value', "textFieldValue");
  textField.set('targetObject', StubController.create());

  Ember.run(function() { textField.append(); });

  var event = {
    keyCode: 13,
    stopPropagation: Ember.K
  };

  textField.trigger('keyUp', event);
});

test("should send an action on keyPress if one is defined with onEvent=keyPress", function() {
  expect(2);

  var StubController = Ember.Object.extend({
    send: function(actionName, value, sender) {
      equal(actionName, 'didTriggerAction', "text field sent correct action name");
      equal(value, "textFieldValue", "text field sent its current value as first argument");
    }
  });

  textField.set('action', 'didTriggerAction');
  textField.set('onEvent', 'keyPress');
  textField.set('value', "textFieldValue");
  textField.set('targetObject', StubController.create());

  Ember.run(function() { textField.append(); });

  var event = {
    keyCode: 48,
    stopPropagation: Ember.K
  };

  textField.trigger('keyPress', event);
});


test("bubbling of handled actions can be enabled via bubbles property", function() {
  textField.set('bubbles', true);
  textField.set('action', 'didTriggerAction');

  textField.set('controller', Ember.Object.create({
    send: Ember.K
  }));

  append();

  var stopPropagationCount = 0;
  var event = {
    keyCode: 13,
    stopPropagation: function() {
      stopPropagationCount++;
    }
  };

  textField.trigger('keyUp', event);
  equal(stopPropagationCount, 0, "propagation was not prevented if bubbles is true");

  textField.set('bubbles', false);
  textField.trigger('keyUp', event);
  equal(stopPropagationCount, 1, "propagation was prevented if bubbles is false");
});

})();

(function() {
/*globals TemplateTests:true MyApp:true App:true */

var get = Ember.get, set = Ember.set;
var forEach = Ember.EnumerableUtils.forEach;
var trim = Ember.$.trim;

var firstGrandchild = function(view) {
  return get(get(view, 'childViews').objectAt(0), 'childViews').objectAt(0);
};
var nthChild = function(view, nth) {
  return get(view, 'childViews').objectAt(nth || 0);
};
var firstChild = nthChild;

var originalLog, logCalls;

var caretPosition = function (element) {
  var ctrl = element[0];
  var caretPos = 0;

  // IE Support
  if (document.selection) {
    ctrl.focus();
    var selection = document.selection.createRange();

    selection.moveStart('character', -ctrl.value.length);

    caretPos = selection.text.length;
  }
  // Firefox support
  else if (ctrl.selectionStart || ctrl.selectionStart === '0') {
    caretPos = ctrl.selectionStart;
  }

  return caretPos;
};

var setCaretPosition = function (element, pos) {
  var ctrl = element[0];

  if (ctrl.setSelectionRange) {
    ctrl.focus();
    ctrl.setSelectionRange(pos,pos);
  } else if (ctrl.createTextRange) {
    var range = ctrl.createTextRange();
    range.collapse(true);
    range.moveEnd('character', pos);
    range.moveStart('character', pos);
    range.select();
  }
};

var view;

var appendView = function() {
  Ember.run(function() { view.appendTo('#qunit-fixture'); });
};

var originalLookup = Ember.lookup, lookup;
var TemplateTests, container;

/**
  This module specifically tests integration with Handlebars and Ember-specific
  Handlebars extensions.

  If you add additional template support to Ember.View, you should create a new
  file in which to test.
*/
module("Ember.View - handlebars integration", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };
    lookup.TemplateTests = TemplateTests = Ember.Namespace.create();

    container = new Ember.Container();
    container.optionsForType('template', { instantiate: false });
  },

  teardown: function() {
    if (view) {
      Ember.run(function() {
        view.destroy();
      });
      view = null;
    }
    Ember.lookup = originalLookup;
    Ember.TESTING_DEPRECATION = false;
  }
});

test("template view should call the function of the associated template", function() {
  container.register('template:testTemplate', Ember.Handlebars.compile("<h1 id='twas-called'>template was called</h1>"));

  view = Ember.View.create({
    container: container,
    templateName: 'testTemplate'
  });

  appendView();

  ok(view.$('#twas-called').length, "the named template was called");
});

test("template view should call the function of the associated template with itself as the context", function() {
  container.register('template:testTemplate', Ember.Handlebars.compile("<h1 id='twas-called'>template was called for {{view.personName}}. Yea {{view.personName}}</h1>"));

  view = Ember.View.createWithMixins({
    container: container,
    templateName: 'testTemplate',

    _personName: "Tom DAAAALE",
    _i: 0,

    personName: Ember.computed(function() {
      this._i++;
      return this._personName + this._i;
    })
  });

  appendView();

  equal("template was called for Tom DAAAALE1. Yea Tom DAAAALE1", view.$('#twas-called').text(), "the named template was called with the view as the data source");
});

test("should allow values from normal JavaScript hash objects to be used", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#with view.person}}{{firstName}} {{lastName}} (and {{pet.name}}){{/with}}'),

    person: {
      firstName: 'Señor',
      lastName: 'CFC',
      pet: {
        name: 'Fido'
      }
    }
  });

  appendView();

  equal(view.$().text(), "Señor CFC (and Fido)", "prints out values from a hash");
});

test("htmlSafe should return an instance of Handlebars.SafeString", function() {
  var safeString = Ember.String.htmlSafe("you need to be more <b>bold</b>");

  ok(safeString instanceof Handlebars.SafeString, "should return SafeString");
});

test("should escape HTML in normal mustaches", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{view.output}}'),
    output: "you need to be more <b>bold</b>"
  });

  appendView();
  equal(view.$('b').length, 0, "does not create an element");
  equal(view.$().text(), 'you need to be more <b>bold</b>', "inserts entities, not elements");

  Ember.run(function() { set(view, 'output', "you are so <i>super</i>"); });
  equal(view.$().text(), 'you are so <i>super</i>', "updates with entities, not elements");
  equal(view.$('i').length, 0, "does not create an element when value is updated");
});

test("should not escape HTML in triple mustaches", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{{view.output}}}'),
    output: "you need to be more <b>bold</b>"
  });

  appendView();

  equal(view.$('b').length, 1, "creates an element");

  Ember.run(function() {
    set(view, 'output', "you are so <i>super</i>");
  });

  equal(view.$('i').length, 1, "creates an element when value is updated");
});

test("should not escape HTML if string is a Handlebars.SafeString", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{view.output}}'),
    output: new Handlebars.SafeString("you need to be more <b>bold</b>")
  });

  appendView();

  equal(view.$('b').length, 1, "creates an element");

  Ember.run(function() {
    set(view, 'output', new Handlebars.SafeString("you are so <i>super</i>"));
  });

  equal(view.$('i').length, 1, "creates an element when value is updated");
});

test("child views can be inserted using the {{view}} Handlebars helper", function() {
  container.register('template:nester', Ember.Handlebars.compile("<h1 id='hello-world'>Hello {{world}}</h1>{{view \"TemplateTests.LabelView\"}}"));
  container.register('template:nested', Ember.Handlebars.compile("<div id='child-view'>Goodbye {{cruel}} {{world}}</div>"));

  var context = {
    world: "world!"
  };

  TemplateTests.LabelView = Ember.View.extend({
    container: container,
    tagName: "aside",
    templateName: 'nested'
  });

  view = Ember.View.create({
    container: container,
    templateName: 'nester',
    context: context
  });

  Ember.set(context, 'cruel', "cruel");

  appendView();

  ok(view.$("#hello-world:contains('Hello world!')").length, "The parent view renders its contents");
  ok(view.$("#child-view:contains('Goodbye cruel world!')").length === 1, "The child view renders its content once");
  ok(view.$().text().match(/Hello world!.*Goodbye cruel world\!/), "parent view should appear before the child view");
});

test("should accept relative paths to views", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('Hey look, at {{view "view.myCool.view"}}'),

    myCool: Ember.Object.create({
      view: Ember.View.extend({
        template: Ember.Handlebars.compile("my cool view")
      })
    })
  });

  appendView();

  equal(view.$().text(), "Hey look, at my cool view");
});

test("child views can be inserted inside a bind block", function() {
  container.register('template:nester', Ember.Handlebars.compile("<h1 id='hello-world'>Hello {{world}}</h1>{{view \"TemplateTests.BQView\"}}"));
  container.register('template:nested', Ember.Handlebars.compile("<div id='child-view'>Goodbye {{#with content}}{{blah}} {{view \"TemplateTests.OtherView\"}}{{/with}} {{world}}</div>"));
  container.register('template:other', Ember.Handlebars.compile("cruel"));

  var context = {
    world: "world!"
  };

  TemplateTests.BQView = Ember.View.extend({
    container: container,
    tagName: "blockquote",
    templateName: 'nested'
  });

  TemplateTests.OtherView = Ember.View.extend({
    container: container,
    templateName: 'other'
  });

  view = Ember.View.create({
    container: container,
    context: context,
    templateName: 'nester'
  });

  Ember.set(context, 'content', Ember.Object.create({ blah: "wot" }));

  appendView();

  ok(view.$("#hello-world:contains('Hello world!')").length, "The parent view renders its contents");

  ok(view.$("blockquote").text().match(/Goodbye.*wot.*cruel.*world\!/), "The child view renders its content once");
  ok(view.$().text().match(/Hello world!.*Goodbye.*wot.*cruel.*world\!/), "parent view should appear before the child view");
});

test("Ember.View should bind properties in the parent context", function() {
  var context = {
    content: Ember.Object.create({
      wham: 'bam'
    }),

    blam: "shazam"
  };

  view = Ember.View.create({
    context: context,
    template: Ember.Handlebars.compile('<h1 id="first">{{#with content}}{{wham}}-{{../blam}}{{/with}}</h1>')
  });

  appendView();

  equal(view.$('#first').text(), "bam-shazam", "renders parent properties");
});

test("using Handlebars helper that doesn't exist should result in an error", function() {
  var names = [{ name: 'Alex' }, { name: 'Stef' }],
      context = {
        content: Ember.A(names)
      };

  throws(function() {
    view = Ember.View.create({
      context: context,
      template: Ember.Handlebars.compile('{{#group}}{{#each name in content}}{{name}}{{/each}}{{/group}}')
    });

    appendView();
  }, "Missing helper: 'group'");
});

test("Ember.View should bind properties in the grandparent context", function() {
  var context = {
    content: Ember.Object.create({
      wham: 'bam',
      thankYou: Ember.Object.create({
        value: "ma'am"
      })
    }),

    blam: "shazam"
  };

  view = Ember.View.create({
    context: context,
    template: Ember.Handlebars.compile('<h1 id="first">{{#with content}}{{#with thankYou}}{{value}}-{{../wham}}-{{../../blam}}{{/with}}{{/with}}</h1>')
  });

  appendView();

  equal(view.$('#first').text(), "ma'am-bam-shazam", "renders grandparent properties");
});

test("Ember.View should update when a property changes and the bind helper is used", function() {
  container.register('template:foo', Ember.Handlebars.compile('<h1 id="first">{{#with view.content}}{{bind "wham"}}{{/with}}</h1>'));

  view = Ember.View.create({
    container: container,
    templateName: 'foo',

    content: Ember.Object.create({
      wham: 'bam',
      thankYou: "ma'am"
    })
  });

  appendView();

  equal(view.$('#first').text(), "bam", "precond - view renders Handlebars template");

  Ember.run(function() { set(get(view, 'content'), 'wham', 'bazam'); });
  equal(view.$('#first').text(), "bazam", "view updates when a bound property changes");
});

test("Ember.View should not use keyword incorrectly - Issue #1315", function() {
  container.register('template:foo', Ember.Handlebars.compile('{{#each value in view.content}}{{value}}-{{#each option in view.options}}{{option.value}}:{{option.label}} {{/each}}{{/each}}'));

  view = Ember.View.create({
    container: container,
    templateName: 'foo',

    content: Ember.A(['X', 'Y']),
    options: Ember.A([
      { label: 'One', value: 1 },
      { label: 'Two', value: 2 }
    ])
  });

  appendView();

  equal(view.$().text(), 'X-1:One 2:Two Y-1:One 2:Two ');
});

test("Ember.View should update when a property changes and no bind helper is used", function() {
  container.register('template:foo', Ember.Handlebars.compile('<h1 id="first">{{#with view.content}}{{wham}}{{/with}}</h1>'));

  var templates = Ember.Object.create({
   foo: Ember.Handlebars.compile('<h1 id="first">{{#with view.content}}{{wham}}{{/with}}</h1>')
  });

  view = Ember.View.create({
    container: container,
    templateName: 'foo',

    content: Ember.Object.create({
      wham: 'bam',
      thankYou: "ma'am"
    })
  });

  appendView();

  equal(view.$('#first').text(), "bam", "precond - view renders Handlebars template");

  Ember.run(function() { set(get(view, 'content'), 'wham', 'bazam'); });

  equal(view.$('#first').text(), "bazam", "view updates when a bound property changes");
});

test("Ember.View should update when the property used with the #with helper changes", function() {
  container.register('template:foo', Ember.Handlebars.compile('<h1 id="first">{{#with view.content}}{{wham}}{{/with}}</h1>'));

  view = Ember.View.create({
    container: container,
    templateName: 'foo',

    content: Ember.Object.create({
      wham: 'bam',
      thankYou: "ma'am"
    })
  });

  appendView();

  equal(view.$('#first').text(), "bam", "precond - view renders Handlebars template");

  Ember.run(function() {
    set(view, 'content', Ember.Object.create({
      wham: 'bazam'
    }));
  });

  equal(view.$('#first').text(), "bazam", "view updates when a bound property changes");
});

test("should not update when a property is removed from the view", function() {
  container.register('template:foo', Ember.Handlebars.compile('<h1 id="first">{{#bind "view.content"}}{{#bind "foo"}}{{bind "baz"}}{{/bind}}{{/bind}}</h1>'));

  view = Ember.View.create({
    container: container,
    templateName: 'foo',

    content: Ember.Object.create({
      foo: Ember.Object.create({
        baz: "unicorns"
      })
    })
  });

  appendView();

  equal(view.$('#first').text(), "unicorns", "precond - renders the bound value");

  var oldContent = get(view, 'content');

  Ember.run(function() {
    set(view, 'content', Ember.Object.create({
      foo: Ember.Object.create({
        baz: "ninjas"
      })
    }));
  });

  equal(view.$('#first').text(), 'ninjas', "updates to new content value");

  Ember.run(function() {
    set(oldContent, 'foo.baz', 'rockstars');
  });

  Ember.run(function() {
    set(oldContent, 'foo.baz', 'ewoks');
  });

  equal(view.$('#first').text(), "ninjas", "does not update removed object");
});

test("Handlebars templates update properties if a content object changes", function() {
  container.register('template:menu', Ember.Handlebars.compile('<h1>Today\'s Menu</h1>{{#bind "view.coffee"}}<h2>{{color}} coffee</h2><span id="price">{{bind "price"}}</span>{{/bind}}'));

  Ember.run(function() {
    view = Ember.View.create({
      container: container,
      templateName: 'menu',

      coffee: Ember.Object.create({
        color: 'brown',
        price: '$4'
      })
    });
  });

  appendView();

  equal(view.$('h2').text(), "brown coffee", "precond - renders color correctly");
  equal(view.$('#price').text(), '$4', "precond - renders price correctly");

  Ember.run(function() {
    set(view, 'coffee', Ember.Object.create({
      color: "mauve",
      price: "$4.50"
    }));
  });

  equal(view.$('h2').text(), "mauve coffee", "should update name field when content changes");
  equal(view.$('#price').text(), "$4.50", "should update price field when content changes");

  Ember.run(function() {
    set(view, 'coffee', Ember.Object.create({
      color: "mauve",
      price: "$5.50"
    }));
  });

  equal(view.$('h2').text(), "mauve coffee", "should update name field when content changes");
  equal(view.$('#price').text(), "$5.50", "should update price field when content changes");

  Ember.run(function() {
    set(view, 'coffee.price', "$5");
  });

  equal(view.$('#price').text(), "$5", "should update price field when price property is changed");

  Ember.run(function() {
    view.destroy();
  });
});

test("Template updates correctly if a path is passed to the bind helper", function() {
  container.register('template:menu', Ember.Handlebars.compile('<h1>{{bind "view.coffee.price"}}</h1>'));

  view = Ember.View.create({
    container: container,
    templateName: 'menu',

    coffee: Ember.Object.create({
      price: '$4'
    })
  });

  appendView();

  equal(view.$('h1').text(), "$4", "precond - renders price");

  Ember.run(function() {
    set(view, 'coffee.price', "$5");
  });

  equal(view.$('h1').text(), "$5", "updates when property changes");

  Ember.run(function() {
    set(view, 'coffee', { price: "$6" });
  });

  equal(view.$('h1').text(), "$6", "updates when parent property changes");
});

test("Template updates correctly if a path is passed to the bind helper and the context object is an Ember.ObjectController", function() {
  container.register('template:menu', Ember.Handlebars.compile('<h1>{{bind "view.coffee.price"}}</h1>'));

  var controller = Ember.ObjectController.create();

  var realObject = Ember.Object.create({
    price: "$4"
  });

  set(controller, 'content', realObject);

  view = Ember.View.create({
    container: container,
    templateName: 'menu',

    coffee: controller
  });

  appendView();

  equal(view.$('h1').text(), "$4", "precond - renders price");

  Ember.run(function() {
    set(realObject, 'price', "$5");
  });

  equal(view.$('h1').text(), "$5", "updates when property is set on real object");

  Ember.run(function() {
    set(controller, 'price', "$6" );
  });

  equal(view.$('h1').text(), "$6", "updates when property is set on object controller");
});

test("should update the block when object passed to #if helper changes", function() {
  container.register('template:menu', Ember.Handlebars.compile('<h1>{{#if view.inception}}{{view.INCEPTION}}{{/if}}</h1>'));

  view = Ember.View.create({
    container: container,
    templateName: 'menu',

    INCEPTION: "BOOOOOOOONG doodoodoodoodooodoodoodoo",
    inception: 'OOOOoooooOOOOOOooooooo'
  });

  appendView();

  equal(view.$('h1').text(), "BOOOOOOOONG doodoodoodoodooodoodoodoo", "renders block if a string");

  var tests = [false, null, undefined, [], '', 0];

  forEach(tests, function(val) {
    Ember.run(function() {
      set(view, 'inception', val);
    });

    equal(view.$('h1').text(), '', Ember.String.fmt("hides block when conditional is '%@'", [String(val)]));

    Ember.run(function() {
      set(view, 'inception', true);
    });

    equal(view.$('h1').text(), "BOOOOOOOONG doodoodoodoodooodoodoodoo", "precond - renders block when conditional is true");
  });
});

test("should update the block when object passed to #unless helper changes", function() {
  container.register('template:advice', Ember.Handlebars.compile('<h1>{{#unless view.onDrugs}}{{view.doWellInSchool}}{{/unless}}</h1>'));

  view = Ember.View.create({
    container: container,
    templateName: 'advice',

    onDrugs: true,
    doWellInSchool: "Eat your vegetables"
  });

  appendView();

  equal(view.$('h1').text(), "", "hides block if true");

  var tests = [false, null, undefined, [], '', 0];

  forEach(tests, function(val) {
    Ember.run(function() {
      set(view, 'onDrugs', val);
    });

    equal(view.$('h1').text(), 'Eat your vegetables', Ember.String.fmt("renders block when conditional is '%@'; %@", [String(val), Ember.typeOf(val)]));

    Ember.run(function() {
      set(view, 'onDrugs', true);
    });

    equal(view.$('h1').text(), "", "precond - hides block when conditional is true");
  });
});

test("should update the block when object passed to #if helper changes and an inverse is supplied", function() {
  container.register('template:menu', Ember.Handlebars.compile('<h1>{{#if view.inception}}{{view.INCEPTION}}{{else}}{{view.SAD}}{{/if}}</h1>'));

  view = Ember.View.create({
    container: container,
    templateName: 'menu',

    INCEPTION: "BOOOOOOOONG doodoodoodoodooodoodoodoo",
    inception: false,
    SAD: 'BOONG?'
  });

  appendView();

  equal(view.$('h1').text(), "BOONG?", "renders alternate if false");

  Ember.run(function() { set(view, 'inception', true); });

  var tests = [false, null, undefined, [], '', 0];

  forEach(tests, function(val) {
    Ember.run(function() {
      set(view, 'inception', val);
    });

    equal(view.$('h1').text(), 'BOONG?', Ember.String.fmt("renders alternate if %@", [String(val)]));

    Ember.run(function() {
      set(view, 'inception', true);
    });

    equal(view.$('h1').text(), "BOOOOOOOONG doodoodoodoodooodoodoodoo", "precond - renders block when conditional is true");
  });
});

test("edge case: child conditional should not render children if parent conditional becomes false", function() {
  var childCreated = false;

  view = Ember.View.create({
    cond1: true,
    cond2: false,
    viewClass: Ember.View.extend({
      init: function() {
        this._super();
        childCreated = true;
      }
    }),
    template: Ember.Handlebars.compile('{{#if view.cond1}}{{#if view.cond2}}{{#view view.viewClass}}test{{/view}}{{/if}}{{/if}}')
  });

  appendView();

  Ember.run(function() {
    // The order of these sets is important for the test
    view.set('cond2', true);
    view.set('cond1', false);
  });

  ok(!childCreated, 'child should not be created');
});

test("Template views return throw if their template cannot be found", function() {
  view = Ember.View.create({
    templateName: 'cantBeFound',
    container: { lookup: function() { }}
  });

  expectAssertion(function() {
    get(view, 'template');
  }, /cantBeFound/);
});

test("Layout views return throw if their layout cannot be found", function() {
  view = Ember.View.create({
    layoutName: 'cantBeFound'
  });

  expectAssertion(function() {
    get(view, 'layout');
  }, /cantBeFound/);
});

test("Template views add an elementId to child views created using the view helper", function() {
  container.register('template:parent', Ember.Handlebars.compile('<div>{{view "TemplateTests.ChildView"}}</div>'));
  container.register('template:child', Ember.Handlebars.compile("I can't believe it's not butter."));

  TemplateTests.ChildView = Ember.View.extend({
    container: container,
    templateName: 'child'
  });

  view = Ember.View.create({
    container: container,
    templateName: 'parent'
  });

  appendView();
  var childView = get(view, 'childViews.firstObject');
  equal(view.$().children().first().children().first().attr('id'), get(childView, 'elementId'));
});

test("views set the template of their children to a passed block", function() {
  container.register('template:parent', Ember.Handlebars.compile('<h1>{{#view "TemplateTests.NoTemplateView"}}<span>It worked!</span>{{/view}}</h1>'));

  TemplateTests.NoTemplateView = Ember.View.extend();

  view = Ember.View.create({
    container: container,
    templateName: 'parent'
  });

  appendView();
  ok(view.$('h1:has(span)').length === 1, "renders the passed template inside the parent template");
});

test("views render their template in the context of the parent view's context", function() {
  container.register('template:parent', Ember.Handlebars.compile('<h1>{{#with content}}{{#view}}{{firstName}} {{lastName}}{{/view}}{{/with}}</h1>'));

  var context = {
    content: {
      firstName: "Lana",
      lastName: "del Heeeyyyyyy"
    }
  };

  view = Ember.View.create({
    container: container,
    templateName: 'parent',
    context: context
  });

  appendView();
  equal(view.$('h1').text(), "Lana del Heeeyyyyyy", "renders properties from parent context");
});

test("views make a view keyword available that allows template to reference view context", function() {
  container.register('template:parent', Ember.Handlebars.compile('<h1>{{#with view.content}}{{#view subview}}{{view.firstName}} {{lastName}}{{/view}}{{/with}}</h1>'));

  view = Ember.View.create({
    container: container,
    templateName: 'parent',

    content: {
      subview: Ember.View.extend({
        firstName: "Brodele"
      }),
      firstName: "Lana",
      lastName: "del Heeeyyyyyy"
    }
  });

  appendView();
  equal(view.$('h1').text(), "Brodele del Heeeyyyyyy", "renders properties from parent context");
});

test("a view helper's bindings are to the parent context", function() {
  var Subview = Ember.View.extend({
    classNameBindings: ['color'],
    controller: Ember.Object.create({
      color: 'green',
      name: "bar"
    }),
    template: Ember.Handlebars.compile('{{view.someController.name}} {{name}}')
  });
  var View = Ember.View.extend({
    controller: Ember.Object.create({
      color: "mauve",
      name: 'foo'
    }),
    Subview: Subview,
    template: Ember.Handlebars.compile('<h1>{{view view.Subview colorBinding="color" someControllerBinding="this"}}</h1>')
  });
  view = View.create();
  appendView();
  equal(view.$('h1 .mauve').length, 1, "renders property on helper declaration from parent context");
  equal(view.$('h1 .mauve').text(), "foo bar", "renders property bound in template from subview context");
});

test("should warn if setting a template on a view with a templateName already specified", function() {
  view = Ember.View.create({
    childView: Ember.View.extend({
      templateName: 'foo'
    }),

    template: Ember.Handlebars.compile('{{#view childView}}test{{/view}}')
  });

  expectAssertion(function() {
    appendView();
  }, "Unable to find view at path 'childView'");

  Ember.run(function() {
    view.destroy();
  });

  view = Ember.View.create({
    childView: Ember.View.extend(),
    template: Ember.Handlebars.compile('{{#view childView templateName="foo"}}test{{/view}}')
  });

  expectAssertion(function() {
    appendView();
  }, "Unable to find view at path 'childView'");
});

test("Child views created using the view helper should have their parent view set properly", function() {
  TemplateTests = {};

  var template = '{{#view "Ember.View"}}{{#view "Ember.View"}}{{view "Ember.View"}}{{/view}}{{/view}}';

  view = Ember.View.create({
    template: Ember.Handlebars.compile(template)
  });

  appendView();

  var childView = firstGrandchild(view);
  equal(childView, get(firstChild(childView), 'parentView'), 'parent view is correct');
});

test("Child views created using the view helper should have their IDs registered for events", function() {
  TemplateTests = {};

  var template = '{{view "Ember.View"}}{{view "Ember.View" id="templateViewTest"}}';

  view = Ember.View.create({
    template: Ember.Handlebars.compile(template)
  });

  appendView();

  var childView = firstChild(view);
  var id = childView.$()[0].id;
  equal(Ember.View.views[id], childView, 'childView without passed ID is registered with Ember.View.views so that it can properly receive events from RootResponder');

  childView = nthChild(view, 1);
  id = childView.$()[0].id;
  equal(id, 'templateViewTest', 'precond -- id of childView should be set correctly');
  equal(Ember.View.views[id], childView, 'childView with passed ID is registered with Ember.View.views so that it can properly receive events from RootResponder');
});

test("Child views created using the view helper and that have a viewName should be registered as properties on their parentView", function() {
  TemplateTests = {};

  var template = '{{#view Ember.View}}{{view Ember.View viewName="ohai"}}{{/view}}';

  view = Ember.View.create({
    template: Ember.Handlebars.compile(template)
  });

  appendView();

  var parentView = firstChild(view),
      childView  = firstGrandchild(view);
  equal(get(parentView, 'ohai'), childView);
});

test("Collection views that specify an example view class have their children be of that class", function() {
  TemplateTests.ExampleViewCollection = Ember.CollectionView.extend({
    itemViewClass: Ember.View.extend({
      isCustom: true
    }),

    content: Ember.A(['foo'])
  });

  var parentView = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection "TemplateTests.ExampleViewCollection"}}OHAI{{/collection}}')
  });

  Ember.run(function() {
    parentView.append();
  });

  ok(firstGrandchild(parentView).isCustom, "uses the example view class");

  Ember.run(function() {
    parentView.destroy();
  });
});

test("itemViewClass works in the #collection helper", function() {
  TemplateTests.ExampleController = Ember.ArrayProxy.create({
    content: Ember.A(['alpha'])
  });

  TemplateTests.ExampleItemView = Ember.View.extend({
    isAlsoCustom: true
  });

  var parentView = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection contentBinding="TemplateTests.ExampleController" itemViewClass="TemplateTests.ExampleItemView"}}beta{{/collection}}')
  });

  Ember.run(function() {
    parentView.append();
  });

  ok(firstGrandchild(parentView).isAlsoCustom, "uses the example view class specified in the #collection helper");

  Ember.run(function() {
    parentView.destroy();
  });
});

test("itemViewClass works in the #collection helper relatively", function() {
  TemplateTests.ExampleController = Ember.ArrayProxy.create({
    content: Ember.A(['alpha'])
  });

  TemplateTests.ExampleItemView = Ember.View.extend({
    isAlsoCustom: true
  });

  TemplateTests.CollectionView = Ember.CollectionView.extend({
    possibleItemView: TemplateTests.ExampleItemView
  });

  var parentView = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection TemplateTests.CollectionView contentBinding="TemplateTests.ExampleController" itemViewClass="possibleItemView"}}beta{{/collection}}')
  });

  Ember.run(function() {
    parentView.append();
  });

  ok(firstGrandchild(parentView).isAlsoCustom, "uses the example view class specified in the #collection helper");

  Ember.run(function() {
    parentView.destroy();
  });
});

test("should update boundIf blocks if the conditional changes", function() {
  container.register('template:foo', Ember.Handlebars.compile('<h1 id="first">{{#boundIf "view.content.myApp.isEnabled"}}{{view.content.wham}}{{/boundIf}}</h1>'));

  view = Ember.View.create({
    container: container,
    templateName: 'foo',

    content: Ember.Object.create({
      wham: 'bam',
      thankYou: "ma'am",
      myApp: Ember.Object.create({
        isEnabled: true
      })
    })
  });

  appendView();

  equal(view.$('#first').text(), "bam", "renders block when condition is true");

  Ember.run(function() {
    set(get(view, 'content'), 'myApp.isEnabled', false);
  });

  equal(view.$('#first').text(), "", "re-renders without block when condition is false");

  Ember.run(function() {
    set(get(view, 'content'), 'myApp.isEnabled', true);
  });

  equal(view.$('#first').text(), "bam", "re-renders block when condition changes to true");
});

test("should not update boundIf if truthiness does not change", function() {
  var renderCount = 0;

  view = Ember.View.create({
    template: Ember.Handlebars.compile('<h1 id="first">{{#boundIf "view.shouldDisplay"}}{{view view.InnerViewClass}}{{/boundIf}}</h1>'),

    shouldDisplay: true,

    InnerViewClass: Ember.View.extend({
      template: Ember.Handlebars.compile("bam"),

      render: function() {
        renderCount++;
        return this._super.apply(this, arguments);
      }
    })
  });

  appendView();

  equal(renderCount, 1, "precond - should have rendered once");
  equal(view.$('#first').text(), "bam", "renders block when condition is true");

  Ember.run(function() {
    set(view, 'shouldDisplay', 1);
  });

  equal(renderCount, 1, "should not have rerendered");
  equal(view.$('#first').text(), "bam", "renders block when condition is true");
});

test("boundIf should support parent access", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile(
      '<h1 id="first">{{#with view.content}}{{#with thankYou}}'+
        '{{#boundIf ../view.show}}parent{{/boundIf}}-{{#boundIf ../../view.show}}grandparent{{/boundIf}}'+
      '{{/with}}{{/with}}</h1>'
    ),

    content: Ember.Object.create({
      show: true,
      thankYou: Ember.Object.create()
    }),

    show: true
  });

  appendView();

  equal(view.$('#first').text(), "parent-grandparent", "renders boundIfs using ..");
});

test("{{view}} id attribute should set id on layer", function() {
  container.register('template:foo', Ember.Handlebars.compile('{{#view "TemplateTests.IdView" id="bar"}}baz{{/view}}'));

  TemplateTests.IdView = Ember.View;

  view = Ember.View.create({
    container: container,
    templateName: 'foo'
  });

  appendView();

  equal(view.$('#bar').length, 1, "adds id attribute to layer");
  equal(view.$('#bar').text(), 'baz', "emits content");
});

test("{{view}} tag attribute should set tagName of the view", function() {
  container.register('template:foo', Ember.Handlebars.compile('{{#view "TemplateTests.TagView" tag="span"}}baz{{/view}}'));

  TemplateTests.TagView = Ember.View;

  view = Ember.View.create({
    container: container,
    templateName: 'foo'
  });

  appendView();

  equal(view.$('span').length, 1, "renders with tag name");
  equal(view.$('span').text(), 'baz', "emits content");
});

test("{{view}} class attribute should set class on layer", function() {
  container.register('template:foo', Ember.Handlebars.compile('{{#view "TemplateTests.IdView" class="bar"}}baz{{/view}}'));

  TemplateTests.IdView = Ember.View;

  view = Ember.View.create({
    container: container,
    templateName: 'foo'
  });

  appendView();

  equal(view.$('.bar').length, 1, "adds class attribute to layer");
  equal(view.$('.bar').text(), 'baz', "emits content");
});

test("{{view}} should not allow attributeBindings to be set", function() {
  expectAssertion(function() {
    view = Ember.View.create({
      template: Ember.Handlebars.compile('{{view "Ember.View" attributeBindings="one two"}}')
    });
    appendView();
  }, /Setting 'attributeBindings' via Handlebars is not allowed/);
});

test("{{view}} should be able to point to a local view", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile("{{view view.common}}"),

    common: Ember.View.extend({
      template: Ember.Handlebars.compile("common")
    })
  });

  appendView();

  equal(view.$().text(), "common", "tries to look up view name locally");
});

test("{{view}} should evaluate class bindings set to global paths", function() {
  var App;

  Ember.run(function() {
    lookup.App = App = Ember.Application.create({
      isApp:       true,
      isGreat:     true,
      directClass: "app-direct",
      isEnabled:   true
    });
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{view Ember.TextField class="unbound" classBinding="App.isGreat:great App.directClass App.isApp App.isEnabled:enabled:disabled"}}')
  });

  appendView();

  ok(view.$('input').hasClass('unbound'),     "sets unbound classes directly");
  ok(view.$('input').hasClass('great'),       "evaluates classes bound to global paths");
  ok(view.$('input').hasClass('app-direct'),  "evaluates classes bound directly to global paths");
  ok(view.$('input').hasClass('is-app'),      "evaluates classes bound directly to booleans in global paths - dasherizes and sets class when true");
  ok(view.$('input').hasClass('enabled'),     "evaluates ternary operator in classBindings");
  ok(!view.$('input').hasClass('disabled'),   "evaluates ternary operator in classBindings");

  Ember.run(function() {
    App.set('isApp', false);
    App.set('isEnabled', false);
  });

  ok(!view.$('input').hasClass('is-app'),     "evaluates classes bound directly to booleans in global paths - removes class when false");
  ok(!view.$('input').hasClass('enabled'),    "evaluates ternary operator in classBindings");
  ok(view.$('input').hasClass('disabled'),    "evaluates ternary operator in classBindings");

  Ember.run(function() {
    lookup.App.destroy();
  });
});

test("{{view}} should evaluate class bindings set in the current context", function() {
  view = Ember.View.create({
    isView:      true,
    isEditable:  true,
    directClass: "view-direct",
    isEnabled: true,
    template: Ember.Handlebars.compile('{{view Ember.TextField class="unbound" classBinding="view.isEditable:editable view.directClass view.isView view.isEnabled:enabled:disabled"}}')
  });

  appendView();

  ok(view.$('input').hasClass('unbound'),     "sets unbound classes directly");
  ok(view.$('input').hasClass('editable'),    "evaluates classes bound in the current context");
  ok(view.$('input').hasClass('view-direct'), "evaluates classes bound directly in the current context");
  ok(view.$('input').hasClass('is-view'),     "evaluates classes bound directly to booleans in the current context - dasherizes and sets class when true");
  ok(view.$('input').hasClass('enabled'),     "evaluates ternary operator in classBindings");
  ok(!view.$('input').hasClass('disabled'),   "evaluates ternary operator in classBindings");

  Ember.run(function() {
    view.set('isView', false);
    view.set('isEnabled', false);
  });

  ok(!view.$('input').hasClass('is-view'),    "evaluates classes bound directly to booleans in the current context - removes class when false");
  ok(!view.$('input').hasClass('enabled'),    "evaluates ternary operator in classBindings");
  ok(view.$('input').hasClass('disabled'),    "evaluates ternary operator in classBindings");
});

test("{{view}} should evaluate class bindings set with either classBinding or classNameBindings", function() {
  var App;

  Ember.run(function() {
    lookup.App = App = Ember.Application.create({
      isGreat: true,
      isEnabled: true
    });
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{view Ember.TextField class="unbound" classBinding="App.isGreat:great App.isEnabled:enabled:disabled" classNameBindings="App.isGreat:really-great App.isEnabled:really-enabled:really-disabled"}}')
  });

  appendView();

  ok(view.$('input').hasClass('unbound'),          "sets unbound classes directly");
  ok(view.$('input').hasClass('great'),            "evaluates classBinding");
  ok(view.$('input').hasClass('really-great'),     "evaluates classNameBinding");
  ok(view.$('input').hasClass('enabled'),          "evaluates ternary operator in classBindings");
  ok(view.$('input').hasClass('really-enabled'),   "evaluates ternary operator in classBindings");
  ok(!view.$('input').hasClass('disabled'),        "evaluates ternary operator in classBindings");
  ok(!view.$('input').hasClass('really-disabled'), "evaluates ternary operator in classBindings");

  Ember.run(function() {
    App.set('isEnabled', false);
  });

  ok(!view.$('input').hasClass('enabled'),        "evaluates ternary operator in classBindings");
  ok(!view.$('input').hasClass('really-enabled'), "evaluates ternary operator in classBindings");
  ok(view.$('input').hasClass('disabled'),        "evaluates ternary operator in classBindings");
  ok(view.$('input').hasClass('really-disabled'), "evaluates ternary operator in classBindings");

  Ember.run(function() {
    lookup.App.destroy();
  });
});

test("{{view}} should evaluate other attribute bindings set to global paths", function() {
  Ember.run(function() {
    lookup.App = Ember.Application.create({
      name: "myApp"
    });
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{view Ember.TextField valueBinding="App.name"}}')
  });

  appendView();

  equal(view.$('input').attr('value'), "myApp", "evaluates attributes bound to global paths");

  Ember.run(function() {
    lookup.App.destroy();
  });
});

test("{{view}} should evaluate other attributes bindings set in the current context", function() {
  view = Ember.View.create({
    name: "myView",
    template: Ember.Handlebars.compile('{{view Ember.TextField valueBinding="view.name"}}')
  });

  appendView();

  equal(view.$('input').attr('value'), "myView", "evaluates attributes bound in the current context");
});

test("{{view}} should be able to bind class names to truthy properties", function() {
  container.register('template:template', Ember.Handlebars.compile('{{#view "TemplateTests.classBindingView" classBinding="view.number:is-truthy"}}foo{{/view}}'));

  TemplateTests.classBindingView = Ember.View.extend();

  view = Ember.View.create({
    container: container,
    number: 5,
    templateName: 'template'
  });

  appendView();

  equal(view.$('.is-truthy').length, 1, "sets class name");

  Ember.run(function() {
    set(view, 'number', 0);
  });

  equal(view.$('.is-truthy').length, 0, "removes class name if bound property is set to falsey");
});

test("{{view}} should be able to bind class names to truthy or falsy properties", function() {
  container.register('template:template', Ember.Handlebars.compile('{{#view "TemplateTests.classBindingView" classBinding="view.number:is-truthy:is-falsy"}}foo{{/view}}'));

  TemplateTests.classBindingView = Ember.View.extend();

  view = Ember.View.create({
    container: container,
    number: 5,
    templateName: 'template'
  });

  appendView();

  equal(view.$('.is-truthy').length, 1, "sets class name to truthy value");
  equal(view.$('.is-falsy').length, 0, "doesn't set class name to falsy value");

  Ember.run(function() {
    set(view, 'number', 0);
  });

  equal(view.$('.is-truthy').length, 0, "doesn't set class name to truthy value");
  equal(view.$('.is-falsy').length, 1, "sets class name to falsy value");
});

test("should be able to bind element attributes using {{bind-attr}}", function() {
  var template = Ember.Handlebars.compile('<img {{bind-attr src="view.content.url" alt="view.content.title"}}>');

  view = Ember.View.create({
    template: template,
    content: Ember.Object.create({
      url: "http://www.emberjs.com/assets/images/logo.png",
      title: "The SproutCore Logo"
    })
  });

  appendView();

  equal(view.$('img').attr('src'), "http://www.emberjs.com/assets/images/logo.png", "sets src attribute");
  equal(view.$('img').attr('alt'), "The SproutCore Logo", "sets alt attribute");

  Ember.run(function() {
    set(view, 'content.title', "El logo de Eember");
  });

  equal(view.$('img').attr('alt'), "El logo de Eember", "updates alt attribute when content's title attribute changes");

  Ember.run(function() {
    set(view, 'content', Ember.Object.create({
      url: "http://www.thegooglez.com/theydonnothing",
      title: "I CAN HAZ SEARCH"
    }));
  });

  equal(view.$('img').attr('alt'), "I CAN HAZ SEARCH", "updates alt attribute when content object changes");

  Ember.run(function() {
    set(view, 'content', {
      url: "http://www.emberjs.com/assets/images/logo.png",
      title: "The SproutCore Logo"
    });
  });

  equal(view.$('img').attr('alt'), "The SproutCore Logo", "updates alt attribute when content object is a hash");

  Ember.run(function() {
    set(view, 'content', Ember.Object.createWithMixins({
      url: "http://www.emberjs.com/assets/images/logo.png",
      title: Ember.computed(function() {
        return "Nanananana Ember!";
      })
    }));
  });

  equal(view.$('img').attr('alt'), "Nanananana Ember!", "updates alt attribute when title property is computed");
});

test("should be able to bind to view attributes with {{bind-attr}}", function() {
  view = Ember.View.create({
    value: 'Test',
    template: Ember.Handlebars.compile('<img src="test.jpg" {{bind-attr alt="view.value"}}>')
  });

  appendView();

  equal(view.$('img').attr('alt'), "Test", "renders initial value");

  Ember.run(function() {
    view.set('value', 'Updated');
  });

  equal(view.$('img').attr('alt'), "Updated", "updates value");
});

test("should be able to bind to globals with {{bind-attr}}", function() {
  TemplateTests.set('value', 'Test');

  view = Ember.View.create({
    template: Ember.Handlebars.compile('<img src="test.jpg" {{bind-attr alt="TemplateTests.value"}}>')
  });

  appendView();

  equal(view.$('img').attr('alt'), "Test", "renders initial value");

  Ember.run(function() {
    TemplateTests.set('value', 'Updated');
  });

  equal(view.$('img').attr('alt'), "Updated", "updates value");
});

test("should not allow XSS injection via {{bind-attr}}", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('<img src="test.jpg" {{bind-attr alt="view.content.value"}}>'),
    content: {
      value: 'Trololol" onmouseover="alert(\'HAX!\');'
    }
  });

  appendView();

  equal(view.$('img').attr('onmouseover'), undefined);
  // If the whole string is here, then it means we got properly escaped
  equal(view.$('img').attr('alt'), 'Trololol" onmouseover="alert(\'HAX!\');');
});

test("should be able to bind use {{bind-attr}} more than once on an element", function() {
  var template = Ember.Handlebars.compile('<img {{bind-attr src="view.content.url"}} {{bind-attr alt="view.content.title"}}>');

  view = Ember.View.create({
    template: template,
    content: Ember.Object.create({
      url: "http://www.emberjs.com/assets/images/logo.png",
      title: "The SproutCore Logo"
    })
  });

  appendView();

  equal(view.$('img').attr('src'), "http://www.emberjs.com/assets/images/logo.png", "sets src attribute");
  equal(view.$('img').attr('alt'), "The SproutCore Logo", "sets alt attribute");

  Ember.run(function() {
    set(view, 'content.title', "El logo de Eember");
  });

  equal(view.$('img').attr('alt'), "El logo de Eember", "updates alt attribute when content's title attribute changes");

  Ember.run(function() {
    set(view, 'content', Ember.Object.create({
      url: "http://www.thegooglez.com/theydonnothing",
      title: "I CAN HAZ SEARCH"
    }));
  });

  equal(view.$('img').attr('alt'), "I CAN HAZ SEARCH", "updates alt attribute when content object changes");

  Ember.run(function() {
    set(view, 'content', {
      url: "http://www.emberjs.com/assets/images/logo.png",
      title: "The SproutCore Logo"
    });
  });

  equal(view.$('img').attr('alt'), "The SproutCore Logo", "updates alt attribute when content object is a hash");

  Ember.run(function() {
    set(view, 'content', Ember.Object.createWithMixins({
      url: "http://www.emberjs.com/assets/images/logo.png",
      title: Ember.computed(function() {
        return "Nanananana Ember!";
      })
    }));
  });

  equal(view.$('img').attr('alt'), "Nanananana Ember!", "updates alt attribute when title property is computed");

});

test("{{bindAttr}} is aliased to {{bind-attr}}", function() {

  var originalBindAttr = Ember.Handlebars.helpers['bind-attr'],
    originalWarn = Ember.warn;

  Ember.warn = function(msg) {
    equal(msg, "The 'bindAttr' view helper is deprecated in favor of 'bind-attr'", 'Warning called');
  };

  Ember.Handlebars.helpers['bind-attr'] = function() {
    equal(arguments[0], 'foo', 'First arg match');
    equal(arguments[1], 'bar', 'Second arg match');
    return 'result';
  };
  var result = Ember.Handlebars.helpers.bindAttr('foo', 'bar');
  equal(result, 'result', 'Result match');

  Ember.Handlebars.helpers['bind-attr'] = originalBindAttr;
  Ember.warn = originalWarn;
});

test("should not reset cursor position when text field receives keyUp event", function() {
  view = Ember.TextField.create({
    value: "Broseidon, King of the Brocean"
  });

  Ember.run(function() {
    view.append();
  });

  view.$().val('Brosiedoon, King of the Brocean');
  setCaretPosition(view.$(), 5);

  Ember.run(function() {
    view.trigger('keyUp', {});
  });

  equal(caretPosition(view.$()), 5, "The keyUp event should not result in the cursor being reset due to the bind-attr observers");

  Ember.run(function() {
    view.destroy();
  });
});

test("should be able to bind element attributes using {{bind-attr}} inside a block", function() {
  var template = Ember.Handlebars.compile('{{#with view.content}}<img {{bind-attr src="url" alt="title"}}>{{/with}}');

  view = Ember.View.create({
    template: template,
    content: Ember.Object.create({
      url: "http://www.emberjs.com/assets/images/logo.png",
      title: "The SproutCore Logo"
    })
  });

  appendView();

  equal(view.$('img').attr('src'), "http://www.emberjs.com/assets/images/logo.png", "sets src attribute");
  equal(view.$('img').attr('alt'), "The SproutCore Logo", "sets alt attribute");

  Ember.run(function() {
    set(view, 'content.title', "El logo de Eember");
  });

  equal(view.$('img').attr('alt'), "El logo de Eember", "updates alt attribute when content's title attribute changes");
});

test("should be able to bind class attribute with {{bind-attr}}", function() {
  var template = Ember.Handlebars.compile('<img {{bind-attr class="view.foo"}}>');

  view = Ember.View.create({
    template: template,
    foo: 'bar'
  });

  appendView();

  equal(view.$('img').attr('class'), 'bar', "renders class");

  Ember.run(function() {
    set(view, 'foo', 'baz');
  });

  equal(view.$('img').attr('class'), 'baz', "updates class");
});

test("should be able to bind class attribute via a truthy property with {{bind-attr}}", function() {
  var template = Ember.Handlebars.compile('<img {{bind-attr class="view.isNumber:is-truthy"}}>');

  view = Ember.View.create({
    template: template,
    isNumber: 5
  });

  appendView();

  equal(view.$('.is-truthy').length, 1, "sets class name");

  Ember.run(function() {
    set(view, 'isNumber', 0);
  });

  equal(view.$('.is-truthy').length, 0, "removes class name if bound property is set to something non-truthy");
});

test("should be able to bind class to view attribute with {{bind-attr}}", function() {
  var template = Ember.Handlebars.compile('<img {{bind-attr class="view.foo"}}>');

  view = Ember.View.create({
    template: template,
    foo: 'bar'
  });

  appendView();

  equal(view.$('img').attr('class'), 'bar', "renders class");

  Ember.run(function() {
    set(view, 'foo', 'baz');
  });

  equal(view.$('img').attr('class'), 'baz', "updates class");
});

test("should not allow XSS injection via {{bind-attr}} with class", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('<img {{bind-attr class="view.foo"}}>'),
    foo: '" onmouseover="alert(\'I am in your classes hacking your app\');'
  });

  appendView();

  equal(view.$('img').attr('onmouseover'), undefined);
  // If the whole string is here, then it means we got properly escaped
  equal(view.$('img').attr('class'), '" onmouseover="alert(\'I am in your classes hacking your app\');');
});

test("should be able to bind class attribute using ternary operator in {{bind-attr}}", function() {
  var template = Ember.Handlebars.compile('<img {{bind-attr class="view.content.isDisabled:disabled:enabled"}} />');
  var content = Ember.Object.create({
    isDisabled: true
  });

  view = Ember.View.create({
    template: template,
    content: content
  });

  appendView();

  ok(view.$('img').hasClass('disabled'), 'disabled class is rendered');
  ok(!view.$('img').hasClass('enabled'), 'enabled class is not rendered');

  Ember.run(function() {
    set(content, 'isDisabled', false);
  });

  ok(!view.$('img').hasClass('disabled'), 'disabled class is not rendered');
  ok(view.$('img').hasClass('enabled'), 'enabled class is rendered');
});

test("should be able to add multiple classes using {{bind-attr class}}", function() {
  var template = Ember.Handlebars.compile('<div {{bind-attr class="view.content.isAwesomeSauce view.content.isAlsoCool view.content.isAmazing:amazing :is-super-duper view.content.isEnabled:enabled:disabled"}}></div>');
  var content = Ember.Object.create({
    isAwesomeSauce: true,
    isAlsoCool: true,
    isAmazing: true,
    isEnabled: true
  });

  view = Ember.View.create({
    template: template,
    content: content
  });

  appendView();

  ok(view.$('div').hasClass('is-awesome-sauce'), "dasherizes first property and sets classname");
  ok(view.$('div').hasClass('is-also-cool'), "dasherizes second property and sets classname");
  ok(view.$('div').hasClass('amazing'), "uses alias for third property and sets classname");
  ok(view.$('div').hasClass('is-super-duper'), "static class is present");
  ok(view.$('div').hasClass('enabled'), "truthy class in ternary classname definition is rendered");
  ok(!view.$('div').hasClass('disabled'), "falsy class in ternary classname definition is not rendered");

  Ember.run(function() {
    set(content, 'isAwesomeSauce', false);
    set(content, 'isAmazing', false);
    set(content, 'isEnabled', false);
  });

  ok(!view.$('div').hasClass('is-awesome-sauce'), "removes dasherized class when property is set to false");
  ok(!view.$('div').hasClass('amazing'), "removes aliased class when property is set to false");
  ok(view.$('div').hasClass('is-super-duper'), "static class is still present");
  ok(!view.$('div').hasClass('enabled'), "truthy class in ternary classname definition is not rendered");
  ok(view.$('div').hasClass('disabled'), "falsy class in ternary classname definition is rendered");
});

test("should be able to bind classes to globals with {{bind-attr class}}", function() {
  TemplateTests.set('isOpen', true);

  view = Ember.View.create({
    template: Ember.Handlebars.compile('<img src="test.jpg" {{bind-attr class="TemplateTests.isOpen"}}>')
  });

  appendView();

  ok(view.$('img').hasClass('is-open'), "sets classname to the dasherized value of the global property");

  Ember.run(function() {
    TemplateTests.set('isOpen', false);
  });

  ok(!view.$('img').hasClass('is-open'), "removes the classname when the global property has changed");
});

test("should be able to bind-attr to 'this' in an {{#each}} block", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#each view.images}}<img {{bind-attr src="this"}}>{{/each}}'),
    images: Ember.A(['one.png', 'two.jpg', 'three.gif'])
  });

  appendView();

  var images = view.$('img');
  ok(/one\.png$/.test(images[0].src));
  ok(/two\.jpg$/.test(images[1].src));
  ok(/three\.gif$/.test(images[2].src));
});

test("should be able to bind classes to 'this' in an {{#each}} block with {{bind-attr class}}", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#each view.items}}<li {{bind-attr class="this"}}>Item</li>{{/each}}'),
    items: Ember.A(['a', 'b', 'c'])
  });

  appendView();

  ok(view.$('li').eq(0).hasClass('a'), "sets classname to the value of the first item");
  ok(view.$('li').eq(1).hasClass('b'), "sets classname to the value of the second item");
  ok(view.$('li').eq(2).hasClass('c'), "sets classname to the value of the third item");
});

test("should be able to bind-attr to var in {{#each var in list}} block", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#each image in view.images}}<img {{bind-attr src="image"}}>{{/each}}'),
    images: Ember.A(['one.png', 'two.jpg', 'three.gif'])
  });

  appendView();

  var images = view.$('img');
  ok(/one\.png$/.test(images[0].src));
  ok(/two\.jpg$/.test(images[1].src));
  ok(/three\.gif$/.test(images[2].src));

  Ember.run(function() {
    var imagesArray = view.get('images');
    imagesArray.removeAt(0);
  });

  images = view.$('img');
  ok(images.length === 2, "");
  ok(/two\.jpg$/.test(images[0].src));
  ok(/three\.gif$/.test(images[1].src));
});

test("should be able to output a property without binding", function() {
  var context = {
    content: Ember.Object.create({
      anUnboundString: "No spans here, son."
    }),

    anotherUnboundString: "Not here, either."
  };

  view = Ember.View.create({
    context: context,
    template: Ember.Handlebars.compile(
      '<div id="first">{{unbound content.anUnboundString}}</div>'+
      '{{#with content}}<div id="second">{{unbound ../anotherUnboundString}}</div>{{/with}}'
    )
  });

  appendView();

  equal(view.$('#first').html(), "No spans here, son.");
  equal(view.$('#second').html(), "Not here, either.");
});

test("should allow standard Handlebars template usage", function() {
  view = Ember.View.create({
    context: { name: "Erik" },
    template: Handlebars.compile("Hello, {{name}}")
  });

  appendView();

  equal(view.$().text(), "Hello, Erik");
});

test("should be able to use standard Handlebars #each helper", function() {
  view = Ember.View.create({
    context: { items: ['a', 'b', 'c'] },
    template: Handlebars.compile("{{#each items}}{{this}}{{/each}}")
  });

  appendView();

  equal(view.$().html(), "abc");
});

test("should be able to use unbound helper in #each helper", function() {
  view = Ember.View.create({
    items: Ember.A(['a', 'b', 'c', 1, 2, 3]),
    template: Ember.Handlebars.compile(
      "<ul>{{#each view.items}}<li>{{unbound this}}</li>{{/each}}</ul>")
  });

  appendView();

  equal(view.$().text(), "abc123");
  equal(view.$('li').children().length, 0, "No markers");
});

test("should be able to use unbound helper in #each helper (with objects)", function() {
  view = Ember.View.create({
    items: Ember.A([{wham: 'bam'}, {wham: 1}]),
    template: Ember.Handlebars.compile(
      "<ul>{{#each view.items}}<li>{{unbound wham}}</li>{{/each}}</ul>")
  });

  appendView();

  equal(view.$().text(), "bam1");
  equal(view.$('li').children().length, 0, "No markers");
});

test("should work with precompiled templates", function() {
  var templateString = Ember.Handlebars.precompile("{{view.value}}"),
      compiledTemplate = Ember.Handlebars.template(eval(templateString));
  view = Ember.View.create({
    value: "rendered",
    template: compiledTemplate
  });

  appendView();

  equal(view.$().text(), "rendered", "the precompiled template was rendered");

  Ember.run(function() { view.set('value', 'updated'); });

  equal(view.$().text(), "updated", "the precompiled template was updated");
});

test("should expose a controller keyword when present on the view", function() {
  var templateString = "{{controller.foo}}{{#view}}{{controller.baz}}{{/view}}";
  view = Ember.View.create({
    controller: Ember.Object.create({
      foo: "bar",
      baz: "bang"
    }),

    template: Ember.Handlebars.compile(templateString)
  });

  appendView();

  equal(view.$().text(), "barbang", "renders values from controller and parent controller");

  var controller = get(view, 'controller');

  Ember.run(function() {
    controller.set('foo', "BAR");
    controller.set('baz', "BLARGH");
  });

  equal(view.$().text(), "BARBLARGH", "updates the DOM when a bound value is updated");

  Ember.run(function() {
    view.destroy();
  });

  view = Ember.View.create({
    controller: "aString",
    template: Ember.Handlebars.compile("{{controller}}")
  });

  appendView();

  equal(view.$().text(), "aString", "renders the controller itself if no additional path is specified");
});

test("should expose a controller keyword that can be used in conditionals", function() {
  var templateString = "{{#view}}{{#if controller}}{{controller.foo}}{{/if}}{{/view}}";
  view = Ember.View.create({
    controller: Ember.Object.create({
      foo: "bar"
    }),

    template: Ember.Handlebars.compile(templateString)
  });

  appendView();

  equal(view.$().text(), "bar", "renders values from controller and parent controller");

  Ember.run(function() {
    view.set('controller', null);
  });

  equal(view.$().text(), "", "updates the DOM when the controller is changed");
});

test("should expose a controller keyword that persists through Ember.ContainerView", function() {
  var templateString = "{{view Ember.ContainerView}}";
  view = Ember.View.create({
    controller: Ember.Object.create({
      foo: "bar"
    }),

    template: Ember.Handlebars.compile(templateString)
  });

  appendView();

  var containerView = get(view, 'childViews.firstObject');
  var viewInstanceToBeInserted = Ember.View.create({
    template: Ember.Handlebars.compile('{{controller.foo}}')
  });

  Ember.run(function() {
    containerView.pushObject(viewInstanceToBeInserted);
  });

  equal(trim(viewInstanceToBeInserted.$().text()), "bar", "renders value from parent's controller");
});

test("should expose a view keyword", function() {
  var templateString = '{{#with view.differentContent}}{{view.foo}}{{#view baz="bang"}}{{view.baz}}{{/view}}{{/with}}';
  view = Ember.View.create({
    differentContent: {
      view: {
        foo: "WRONG",
        baz: "WRONG"
      }
    },

    foo: "bar",

    template: Ember.Handlebars.compile(templateString)
  });

  appendView();

  equal(view.$().text(), "barbang", "renders values from view and child view");
});

test("Ember.Button targets should respect keywords", function() {
  Ember.TESTING_DEPRECATION = true;

  var templateString = '{{#with view.anObject}}{{view Ember.Button target="controller.foo"}}{{/with}}';
  view = Ember.View.create({
    template: Ember.Handlebars.compile(templateString),
    anObject: {},
    controller: {
      foo: "bar"
    }
  });

  appendView();

  var button = view.get('childViews').objectAt(0);
  equal(button.get('targetObject'), "bar", "resolves the target");
});

test("should be able to explicitly set a view's context", function() {
  var context = Ember.Object.create({
    test: 'test'
  });

  TemplateTests.CustomContextView = Ember.View.extend({
    context: context,
    template: Ember.Handlebars.compile("{{test}}")
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile("{{view TemplateTests.CustomContextView}}")
  });

  appendView();

  equal(view.$().text(), "test");
});

module("Ember.View - handlebars integration", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };

    originalLog = Ember.Logger.log;
    logCalls = [];
    Ember.Logger.log = function(arg) { logCalls.push(arg); };
  },

  teardown: function() {
    if (view) {
      Ember.run(function() {
        view.destroy();
      });
      view = null;
    }

    Ember.Logger.log = originalLog;
    Ember.lookup = originalLookup;
  }
});

test("should be able to log a property", function() {
  var context = {
    value: 'one',
    valueTwo: 'two',

    content: Ember.Object.create({})
  };

  view = Ember.View.create({
    context: context,
    template: Ember.Handlebars.compile('{{log value}}{{#with content}}{{log ../valueTwo}}{{/with}}')
  });

  appendView();

  equal(view.$().text(), "", "shouldn't render any text");
  equal(logCalls[0], 'one', "should call log with value");
  equal(logCalls[1], 'two', "should call log with valueTwo");
});

test("should be able to log a view property", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{log view.value}}'),
    value: 'one'
  });

  appendView();

  equal(view.$().text(), "", "shouldn't render any text");
  equal(logCalls[0], 'one', "should call log with value");
});

test("should be able to log `this`", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#each view.items}}{{log this}}{{/each}}'),
    items: Ember.A(['one', 'two'])
  });

  appendView();

  equal(view.$().text(), "", "shouldn't render any text");
  equal(logCalls[0], 'one', "should call log with item one");
  equal(logCalls[1], 'two', "should call log with item two");
});

var MyApp;

module("Templates redrawing and bindings", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };
    MyApp = lookup.MyApp = Ember.Object.create({});
  },
  teardown: function() {
    Ember.run(function() {
      if (view) view.destroy();
    });
    Ember.lookup = originalLookup;
  }
});

test("should be able to update when bound property updates", function() {
  MyApp.set('controller', Ember.Object.create({name: 'first'}));

  var View = Ember.View.extend({
    template: Ember.Handlebars.compile('<i>{{view.value.name}}, {{view.computed}}</i>'),
    valueBinding: 'MyApp.controller',
    computed: Ember.computed(function() {
      return this.get('value.name') + ' - computed';
    }).property('value')
  });

  Ember.run(function() {
    view = View.create();
  });

  appendView();

  Ember.run(function() {
    MyApp.set('controller', Ember.Object.create({
      name: 'second'
    }));
  });

  equal(view.get('computed'), "second - computed", "view computed properties correctly update");
  equal(view.$('i').text(), 'second, second - computed', "view rerenders when bound properties change");
});

test("properties within an if statement should not fail on re-render", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#if view.value}}{{view.value}}{{/if}}'),
    value: null
  });

  appendView();

  equal(view.$().text(), '');

  Ember.run(function() {
    view.set('value', 'test');
  });

  equal(view.$().text(), 'test');

  Ember.run(function() {
    view.set('value', null);
  });

  equal(view.$().text(), '');
});

test('should cleanup bound properties on rerender', function() {
  view = Ember.View.create({
    controller: Ember.Object.create({name: 'wycats'}),
    template: Ember.Handlebars.compile('{{name}}')
  });

  appendView();

  equal(view.$().text(), 'wycats', 'rendered binding');

  Ember.run(view, 'rerender');

  equal(view._childViews.length, 1);
});

test("views within an if statement should be sane on re-render", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#if view.display}}{{view Ember.TextField}}{{/if}}'),
    display: false
  });

  appendView();

  equal(view.$('input').length, 0);

  Ember.run(function() {
    // Setting twice will trigger the observer twice, this is intentional
    view.set('display', true);
    view.set('display', 'yes');
  });

  var textfield = view.$('input');
  equal(textfield.length, 1);

  // Make sure the view is still registered in Ember.View.views
  ok(Ember.View.views[textfield.attr('id')]);
});

test("the {{this}} helper should not fail on removal", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#if view.show}}{{#each view.list}}{{this}}{{/each}}{{/if}}'),
    show: true,
    list: Ember.A(['a', 'b', 'c'])
  });

  appendView();

  equal(view.$().text(), 'abc', "should start property - precond");

  Ember.run(function() {
    view.set('show', false);
  });

  equal(view.$().text(), '');
});

test("bindings should be relative to the current context", function() {
  view = Ember.View.create({
    museumOpen: true,

    museumDetails: Ember.Object.create({
      name: "SFMoMA",
      price: 20
    }),

    museumView: Ember.View.extend({
      template: Ember.Handlebars.compile('Name: {{view.name}} Price: ${{view.dollars}}')
    }),

    template: Ember.Handlebars.compile('{{#if view.museumOpen}} {{view view.museumView nameBinding="view.museumDetails.name" dollarsBinding="view.museumDetails.price"}} {{/if}}')
  });

  appendView();

  equal(Ember.$.trim(view.$().text()), "Name: SFMoMA Price: $20", "should print baz twice");
});

test("bindings should respect keywords", function() {
  view = Ember.View.create({
    museumOpen: true,

    controller: {
      museumOpen: true,
      museumDetails: Ember.Object.create({
        name: "SFMoMA",
        price: 20
      })
    },

    museumView: Ember.View.extend({
      template: Ember.Handlebars.compile('Name: {{view.name}} Price: ${{view.dollars}}')
    }),

    template: Ember.Handlebars.compile('{{#if view.museumOpen}}{{view view.museumView nameBinding="controller.museumDetails.name" dollarsBinding="controller.museumDetails.price"}}{{/if}}')
  });

  appendView();

  equal(Ember.$.trim(view.$().text()), "Name: SFMoMA Price: $20", "should print baz twice");
});

test("bindings can be 'this', in which case they *are* the current context", function() {
  view = Ember.View.create({
    museumOpen: true,

    museumDetails: Ember.Object.create({
      name: "SFMoMA",
      price: 20,
      museumView: Ember.View.extend({
        template: Ember.Handlebars.compile('Name: {{view.museum.name}} Price: ${{view.museum.price}}')
      })
    }),


    template: Ember.Handlebars.compile('{{#if view.museumOpen}} {{#with view.museumDetails}}{{view museumView museumBinding="this"}} {{/with}}{{/if}}')
  });

  appendView();

  equal(Ember.$.trim(view.$().text()), "Name: SFMoMA Price: $20", "should print baz twice");
});

// https://github.com/emberjs/ember.js/issues/120

test("should not enter an infinite loop when binding an attribute in Handlebars", function() {
  var App;

  Ember.run(function() {
    lookup.App = App = Ember.Application.create();
  });

  App.test = Ember.Object.create({ href: 'test' });
  App.Link = Ember.View.extend({
    classNames: ['app-link'],
    tagName: 'a',
    attributeBindings: ['href'],
    href: '#none',

    click: function() {
      return false;
    }
  });

  var parentView = Ember.View.create({
    template: Ember.Handlebars.compile('{{#view App.Link hrefBinding="App.test.href"}} Test {{/view}}')
  });


  Ember.run(function() {
    parentView.appendTo('#qunit-fixture');
  });

  // Use match, since old IE appends the whole URL
  var href = parentView.$('a').attr('href');
  ok(href.match(/(^|\/)test$/), "Expected href to be 'test' but got '"+href+"'");

  Ember.run(function() {
    parentView.destroy();
  });

  Ember.run(function() {
    lookup.App.destroy();
  });
});

test("should update bound values after the view is removed and then re-appended", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile("{{#if view.showStuff}}{{view.boundValue}}{{else}}Not true.{{/if}}"),
    showStuff: true,
    boundValue: "foo"
  });

  appendView();

  equal(Ember.$.trim(view.$().text()), "foo");
  Ember.run(function() {
    set(view, 'showStuff', false);
  });
  equal(Ember.$.trim(view.$().text()), "Not true.");

  Ember.run(function() {
    set(view, 'showStuff', true);
  });
  equal(Ember.$.trim(view.$().text()), "foo");

  Ember.run(function() {
    view.remove();
    set(view, 'showStuff', false);
  });
  Ember.run(function() {
    set(view, 'showStuff', true);
  });
  appendView();

  Ember.run(function() {
    set(view, 'boundValue', "bar");
  });
  equal(Ember.$.trim(view.$().text()), "bar");
});

test("should update bound values after view's parent is removed and then re-appended", function() {
  var controller = Ember.Object.create();

  var parentView = Ember.ContainerView.create({
    childViews: ['testView'],

    controller: controller,

    testView: Ember.View.create({
      template: Ember.Handlebars.compile("{{#if showStuff}}{{boundValue}}{{else}}Not true.{{/if}}")
    })
  });

  controller.setProperties({
    showStuff: true,
    boundValue: "foo"
  });

  Ember.run(function() {
    parentView.appendTo('#qunit-fixture');
  });
  view = parentView.get('testView');

  equal(Ember.$.trim(view.$().text()), "foo");
  Ember.run(function() {
    set(controller, 'showStuff', false);
  });
  equal(Ember.$.trim(view.$().text()), "Not true.");

  Ember.run(function() {
    set(controller, 'showStuff', true);
  });
  equal(Ember.$.trim(view.$().text()), "foo");


  Ember.run(function() {
    parentView.remove();
    set(controller, 'showStuff', false);
  });
  Ember.run(function() {
    set(controller, 'showStuff', true);
  });
  Ember.run(function() {
    parentView.appendTo('#qunit-fixture');
  });

  Ember.run(function() {
    set(controller, 'boundValue', "bar");
  });
  equal(Ember.$.trim(view.$().text()), "bar");

  Ember.run(function() {
    parentView.destroy();
  });
});

test("should call a registered helper for mustache without parameters", function() {
  Ember.Handlebars.registerHelper('foobar', function() {
    return 'foobar';
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile("{{foobar}}")
  });

  appendView();

  ok(view.$().text() === 'foobar', "Regular helper was invoked correctly");
});

test("should bind to the property if no registered helper found for a mustache without parameters", function() {
  view = Ember.View.createWithMixins({
    template: Ember.Handlebars.compile("{{view.foobarProperty}}"),
    foobarProperty: Ember.computed(function() {
      return 'foobarProperty';
    })
  });

  appendView();

  ok(view.$().text() === 'foobarProperty', "Property was bound to correctly");
});

test("should accept bindings as a string or an Ember.Binding", function() {
  var viewClass = Ember.View.extend({
    template: Ember.Handlebars.compile("binding: {{view.bindingTest}}, string: {{view.stringTest}}")
  });

  Ember.Handlebars.registerHelper('boogie', function(id, options) {
    options.hash = options.hash || {};
    options.hash.bindingTestBinding = Ember.Binding.oneWay('context.' + id);
    options.hash.stringTestBinding = id;
    return Ember.Handlebars.ViewHelper.helper(this, viewClass, options);
  });

  view = Ember.View.create({
    context: Ember.Object.create({
      direction: 'down'
    }),
    template: Ember.Handlebars.compile("{{boogie direction}}")
  });

  appendView();

  equal(Ember.$.trim(view.$().text()), "binding: down, string: down");
});

test("should teardown observers from bound properties on rerender", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile("{{view.foo}}"),
    foo: 'bar'
  });

  appendView();

  equal(Ember.observersFor(view, 'foo').length, 1);

  Ember.run(function() {
    view.rerender();
  });

  equal(Ember.observersFor(view, 'foo').length, 1);
});

test("should teardown observers from bind-attr on rerender", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('<span {{bind-attr class="view.foo" name="view.foo"}}>wat</span>'),
    foo: 'bar'
  });

  appendView();

  equal(Ember.observersFor(view, 'foo').length, 2);

  Ember.run(function() {
    view.rerender();
  });

  equal(Ember.observersFor(view, 'foo').length, 2);
});

})();

(function() {
/*globals TemplateTests*/

var get = Ember.get, set = Ember.set;

var view;

var appendView = function() {
  Ember.run(function() { view.appendTo('#qunit-fixture'); });
};

var registerRepeatHelper = function() {
  Ember.Handlebars.helper('repeat', function(value, options) {
    var count = options.hash.count;
    var a = [];
    while(a.length < count) {
        a.push(value);
    }
    return a.join('');
  });
};

module("Handlebars bound helpers", {
  setup: function() {
    window.TemplateTests = Ember.Namespace.create();
  },
  teardown: function() {
    Ember.run(function() {
      if (view) {
        view.destroy();
      }
    });
    window.TemplateTests = undefined;
  }
});

test("should update bound helpers when properties change", function() {
  Ember.Handlebars.helper('capitalize', function(value) {
    return value.toUpperCase();
  });

  view = Ember.View.create({
    controller: Ember.Object.create({name: "Brogrammer"}),
    template: Ember.Handlebars.compile("{{capitalize name}}")
  });

  appendView();

  equal(view.$().text(), 'BROGRAMMER', "helper output is correct");

  Ember.run(function() {
    set(view.controller, 'name', 'wes');
  });

  equal(view.$().text(), 'WES', "helper output updated");
});

test("should allow for computed properties with dependencies", function() {
  Ember.Handlebars.helper('capitalizeName', function(value) {
    return get(value, 'name').toUpperCase();
  }, 'name');

  view = Ember.View.create({
    controller: Ember.Object.create({
      person: Ember.Object.create({
        name: 'Brogrammer'
      })
    }),
    template: Ember.Handlebars.compile("{{capitalizeName person}}")
  });

  appendView();

  equal(view.$().text(), 'BROGRAMMER', "helper output is correct");

  Ember.run(function() {
    set(view.controller.person, 'name', 'wes');
  });

  equal(view.$().text(), 'WES', "helper output updated");
});

test("bound helpers should support options", function() {

  registerRepeatHelper();

  view = Ember.View.create({
    controller: Ember.Object.create({text: 'ab'}),
    template: Ember.Handlebars.compile("{{repeat text count=3}}")
  });

  appendView();

  ok(view.$().text() === 'ababab', "helper output is correct");
});

test("bound helpers should support keywords", function() {
  Ember.Handlebars.helper('capitalize', function(value) {
    return value.toUpperCase();
  });

  view = Ember.View.create({
    text: 'ab',
    template: Ember.Handlebars.compile("{{capitalize view.text}}")
  });

  appendView();

  ok(view.$().text() === 'AB', "helper output is correct");
});

test("bound helpers should support global paths", function() {
  Ember.Handlebars.helper('capitalize', function(value) {
    return value.toUpperCase();
  });

  TemplateTests.text = 'ab';

  view = Ember.View.create({
    template: Ember.Handlebars.compile("{{capitalize TemplateTests.text}}")
  });

  appendView();

  ok(view.$().text() === 'AB', "helper output is correct");
});

test("bound helper should support this keyword", function() {
  Ember.Handlebars.helper('capitalize', function(value) {
    return get(value, 'text').toUpperCase();
  });

  view = Ember.View.create({
    controller: Ember.Object.create({text: 'ab'}),
    template: Ember.Handlebars.compile("{{capitalize this}}")
  });

  appendView();

  ok(view.$().text() === 'AB', "helper output is correct");
});

test("bound helpers should support bound options", function() {

  registerRepeatHelper();

  view = Ember.View.create({
    controller: Ember.Object.create({text: 'ab', numRepeats: 3}),
    template: Ember.Handlebars.compile('{{repeat text countBinding="numRepeats"}}')
  });

  appendView();

  equal(view.$().text(), 'ababab', "helper output is correct");

  Ember.run(function() {
    view.set('controller.numRepeats', 4);
  });

  equal(view.$().text(), 'abababab', "helper correctly re-rendered after bound option was changed");

  Ember.run(function() {
    view.set('controller.numRepeats', 2);
    view.set('controller.text', "YES");
  });

  equal(view.$().text(), 'YESYES', "helper correctly re-rendered after both bound option and property changed");
});


test("bound helpers should support multiple bound properties", function() {

  Ember.Handlebars.helper('concat', function() {
    return [].slice.call(arguments, 0, -1).join('');
  });

  view = Ember.View.create({
    controller: Ember.Object.create({thing1: 'ZOID', thing2: 'BERG'}),
    template: Ember.Handlebars.compile('{{concat thing1 thing2}}')
  });

  appendView();

  equal(view.$().text(), 'ZOIDBERG', "helper output is correct");

  Ember.run(function() {
    view.set('controller.thing2', "NERD");
  });

  equal(view.$().text(), 'ZOIDNERD', "helper correctly re-rendered after second bound helper property changed");

  Ember.run(function() {
    view.controller.setProperties({
      thing1: "WOOT",
      thing2: "YEAH"
    });
  });

  equal(view.$().text(), 'WOOTYEAH', "helper correctly re-rendered after both bound helper properties changed");
});

test("bound helpers should expose property names in options.data.properties", function() {
  Ember.Handlebars.helper('echo', function() {
    var options = arguments[arguments.length - 1];
    var values = [].slice.call(arguments, 0, -1);
    var a = [];
    for(var i = 0; i < values.length; ++i) {
      var propertyName = options.data.properties[i];
      a.push(propertyName);
    }
    return a.join(' ');
  });

  view = Ember.View.create({
    controller: Ember.Object.create({
      thing1: 'ZOID',
      thing2: 'BERG',
      thing3: Ember.Object.create({
        foo: 123
      })
    }),
    template: Ember.Handlebars.compile('{{echo thing1 thing2 thing3.foo}}')
  });

  appendView();

  equal(view.$().text(), 'thing1 thing2 thing3.foo', "helper output is correct");
});

test("bound helpers can be invoked with zero args", function() {
  Ember.Handlebars.helper('troll', function(options) {
    return options.hash.text || "TROLOLOL";
  });

  view = Ember.View.create({
    controller: Ember.Object.create({trollText: "yumad"}),
    template: Ember.Handlebars.compile('{{troll}} and {{troll text="bork"}}')
  });

  appendView();

  equal(view.$().text(), 'TROLOLOL and bork', "helper output is correct");
});

test("bound helpers should not be invoked with blocks", function() {
  registerRepeatHelper();
  view = Ember.View.create({
    controller: Ember.Object.create({}),
    template: Ember.Handlebars.compile("{{#repeat}}Sorry, Charlie{{/repeat}}")
  });

  expectAssertion(function() {
    appendView();
  }, /registerBoundHelper-generated helpers do not support use with Handlebars blocks/i);
});

test("should observe dependent keys passed to registerBoundHelper", function() {
  try {
    expect(2);

    var SimplyObject = Ember.Object.create({
      firstName: 'Jim',
      lastName: 'Owen'
    });

    Ember.Handlebars.registerBoundHelper('fullName', function(value){
      return value.get('firstName') + ' ' + value.get('lastName');
    }, 'firstName', 'lastName');

    view = Ember.View.create({
      template: Ember.Handlebars.compile('{{fullName this}}'),
      context: SimplyObject
    });
    appendView(view);

    equal(view.$().text(), 'Jim Owen', 'simply render the helper');

    Ember.run(SimplyObject, SimplyObject.set, 'firstName', 'Tom');

    equal(view.$().text(), 'Tom Owen', 'simply render the helper');
  } finally {
    delete Ember.Handlebars.helpers['fullName'];
  }
});

test("shouldn't treat raw numbers as bound paths", function() {
  Ember.Handlebars.helper('sum', function(a, b) {
    return a + b;
  });

  view = Ember.View.create({
    controller: Ember.Object.create({aNumber: 1}),
    template: Ember.Handlebars.compile("{{sum aNumber 1}} {{sum 0 aNumber}} {{sum 5 6}}")
  });

  appendView();

  equal(view.$().text(), '2 1 11', "helper output is correct");

  Ember.run(view.controller, 'set', 'aNumber', 5);

  equal(view.$().text(), '6 5 11', "helper still updates as expected");
});

test("shouldn't treat quoted strings as bound paths", function() {
  var helperCount = 0;
  Ember.Handlebars.helper('concat', function(a, b, opt) {
    helperCount++;
    return a + b;
  });

  view = Ember.View.create({
    controller: Ember.Object.create({word: "jerkwater", loo: "unused"}),
    template: Ember.Handlebars.compile("{{concat word 'loo'}} {{concat '' word}} {{concat 'will' \"didi\"}}")
  });

  appendView();

  equal(view.$().text(), 'jerkwaterloo jerkwater willdidi', "helper output is correct");

  Ember.run(view.controller, 'set', 'word', 'bird');
  equal(view.$().text(), 'birdloo bird willdidi', "helper still updates as expected");

  Ember.run(view.controller, 'set', 'loo', 'soup-de-doo');
  equal(view.$().text(), 'birdloo bird willdidi', "helper still updates as expected");
  equal(helperCount, 5, "changing controller property with same name as quoted string doesn't re-render helper");
});

test("bound helpers can handle nulls in array (with primitives)", function() {
  Ember.Handlebars.helper('reverse', function(val) {
    return val ? val.split('').reverse().join('') : "NOPE";
  });

  view = Ember.View.create({
    controller: Ember.Object.create({
      things: Ember.A([ null, 0, undefined, false, "OMG" ])
    }),
    template: Ember.Handlebars.compile("{{#each things}}{{this}}|{{reverse this}} {{/each}}{{#each thing in things}}{{thing}}|{{reverse thing}} {{/each}}")
  });

  appendView();

  equal(view.$().text(), '|NOPE 0|NOPE |NOPE false|NOPE OMG|GMO |NOPE 0|NOPE |NOPE false|NOPE OMG|GMO ', "helper output is correct");

  Ember.run(function() {
    view.controller.things.pushObject('blorg');
    view.controller.things.shiftObject();
  });

  equal(view.$().text(), '0|NOPE |NOPE false|NOPE OMG|GMO blorg|grolb 0|NOPE |NOPE false|NOPE OMG|GMO blorg|grolb ', "helper output is still correct");
});

test("bound helpers can handle nulls in array (with objects)", function() {
  Ember.Handlebars.helper('print-foo', function(val) {
    return val ? Ember.get(val, 'foo') : "NOPE";
  });

  view = Ember.View.create({
    controller: Ember.Object.create({
      things: Ember.A([ null, { foo: 5 } ])
    }),
    template: Ember.Handlebars.compile("{{#each things}}{{foo}}|{{print-foo this}} {{/each}}{{#each thing in things}}{{thing.foo}}|{{print-foo thing}} {{/each}}")
  });

  appendView();

  equal(view.$().text(), '|NOPE 5|5 |NOPE 5|5 ', "helper output is correct");

  Ember.run(view.controller.things, 'pushObject', { foo: 6 });

  equal(view.$().text(), '|NOPE 5|5 6|6 |NOPE 5|5 6|6 ', "helper output is correct");
});

test("bound helpers can handle `this` keyword when it's a non-object", function() {

  Ember.Handlebars.helper("shout", function(value) {
    return value + '!';
  });

  view = Ember.View.create({
    controller: Ember.Object.create({
      things: Ember.A(['alex'])
    }),
    template: Ember.Handlebars.compile("{{#each things}}{{shout this}}{{/each}}")
  });

  appendView();

  equal(view.$().text(), 'alex!', "helper output is correct");

  Ember.run(view.controller.things, 'shiftObject');
  equal(view.$().text(), '', "helper output is correct");

  Ember.run(view.controller.things, 'pushObject', 'wallace');
  equal(view.$().text(), 'wallace!', "helper output is correct");
});



})();

(function() {
/*globals TemplateTests*/

var view, get = Ember.get, set = Ember.set;

var appendView = function() {
  Ember.run(function() { view.appendTo('#qunit-fixture'); });
};

module("Handlebars custom view helpers", {
  setup: function() {
    window.TemplateTests = Ember.Namespace.create();
  },
  teardown: function() {
    Ember.run(function() {
      if (view) {
        view.destroy();
      }
    });
    window.TemplateTests = undefined;
  }
});

test("should render an instance of the specified view", function() {
  TemplateTests.OceanView = Ember.View.extend({
    template: Ember.Handlebars.compile('zomg, nice view')
  });

  Ember.Handlebars.helper('oceanView', TemplateTests.OceanView);

  view = Ember.View.create({
    controller: Ember.Object.create(),
    template: Ember.Handlebars.compile('{{oceanView tagName="strong"}}')
  });

  appendView();

  var oceanViews = view.$().find("strong:contains('zomg, nice view')");

  equal(oceanViews.length, 1, "helper rendered an instance of the view");
});

test("Should bind to this keyword", function() {
  TemplateTests.OceanView = Ember.View.extend({
    model: null,
    template: Ember.Handlebars.compile('{{view.model}}')
  });

  Ember.Handlebars.helper('oceanView', TemplateTests.OceanView);

  view = Ember.View.create({
    context: 'foo',
    controller: Ember.Object.create(),
    template: Ember.Handlebars.compile('{{oceanView tagName="strong" viewName="ocean" model=this}}')
  });

  appendView();

  var oceanViews = view.$().find("strong:contains('foo')");

  equal(oceanViews.length, 1, "helper rendered an instance of the view");

  Ember.run(function() {
    set(view, 'ocean.model', 'bar');
  });

  oceanViews = view.$().find("strong:contains('bar')");

  equal(oceanViews.length, 1, "helper rendered an instance of the view");
});

})();

(function() {
var get = Ember.get, set = Ember.set;
var people, view;
var template, templateMyView;
var templateFor = function(template) {
  return Ember.Handlebars.compile(template);
};

var originalLookup = Ember.lookup, lookup;

module("the #each helper", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };

    template = templateFor("{{#each view.people}}{{name}}{{/each}}");
    people = Ember.A([{ name: "Steve Holt" }, { name: "Annabelle" }]);

    view = Ember.View.create({
      template: template,
      people: people
    });


    templateMyView = templateFor("{{name}}");
    lookup.MyView = Ember.View.extend({
        template: templateMyView
    });

    append(view);
  },

  teardown: function() {
    Ember.run(function() {
      view.destroy();
      view = null;
    });
    Ember.lookup = originalLookup;
    Ember.TESTING_DEPRECATION = false;
  }
});


var append = function(view) {
  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });
};

var assertHTML = function(view, expectedHTML) {
  var html = view.$().html();

  // IE 8 (and prior?) adds the \r\n
  html = html.replace(/<script[^>]*><\/script>/ig, '').replace(/[\r\n]/g, '');

  equal(html, expectedHTML);
};

var assertText = function(view, expectedText) {
  equal(view.$().text(), expectedText);
};

test("it renders the template for each item in an array", function() {
  assertHTML(view, "Steve HoltAnnabelle");
});

test("it updates the view if an item is added", function() {
  Ember.run(function() {
    people.pushObject({ name: "Tom Dale" });
  });

  assertHTML(view, "Steve HoltAnnabelleTom Dale");
});

test("it allows you to access the current context using {{this}}", function() {
  Ember.run(function() { view.destroy(); }); // destroy existing view
  view = Ember.View.create({
    template: templateFor("{{#each view.people}}{{this}}{{/each}}"),
    people: Ember.A(['Black Francis', 'Joey Santiago', 'Kim Deal', 'David Lovering'])
  });

  append(view);

  assertHTML(view, "Black FrancisJoey SantiagoKim DealDavid Lovering");
});

test("it updates the view if an item is removed", function() {
  Ember.run(function() {
    people.removeAt(0);
  });

  assertHTML(view, "Annabelle");
});

test("it updates the view if an item is replaced", function() {
  Ember.run(function() {
    people.removeAt(0);
    people.insertAt(0, { name: "Kazuki" });
  });

  assertHTML(view, "KazukiAnnabelle");
});

test("can add and replace in the same runloop", function() {
  Ember.run(function() {
    people.pushObject({ name: "Tom Dale" });
    people.removeAt(0);
    people.insertAt(0, { name: "Kazuki" });
  });

  assertHTML(view, "KazukiAnnabelleTom Dale");
});

test("can add and replace the object before the add in the same runloop", function() {
  Ember.run(function() {
    people.pushObject({ name: "Tom Dale" });
    people.removeAt(1);
    people.insertAt(1, { name: "Kazuki" });
  });

  assertHTML(view, "Steve HoltKazukiTom Dale");
});

test("can add and replace complicatedly", function() {
  Ember.run(function() {
    people.pushObject({ name: "Tom Dale" });
    people.removeAt(1);
    people.insertAt(1, { name: "Kazuki" });
    people.pushObject({ name: "Firestone" });
    people.pushObject({ name: "McMunch" });
    people.removeAt(3);
  });

  assertHTML(view, "Steve HoltKazukiTom DaleMcMunch");
});

test("can add and replace complicatedly harder", function() {
  Ember.run(function() {
    people.pushObject({ name: "Tom Dale" });
    people.removeAt(1);
    people.insertAt(1, { name: "Kazuki" });
    people.pushObject({ name: "Firestone" });
    people.pushObject({ name: "McMunch" });
    people.removeAt(2);
  });

  assertHTML(view, "Steve HoltKazukiFirestoneMcMunch");
});

test("it works inside a ul element", function() {
  var ulView = Ember.View.create({
    template: templateFor('<ul>{{#each view.people}}<li>{{name}}</li>{{/each}}</ul>'),
    people: people
  });

  append(ulView);

  equal(ulView.$('li').length, 2, "renders two <li> elements");

  Ember.run(function() {
    people.pushObject({name: "Black Francis"});
  });

  equal(ulView.$('li').length, 3, "renders an additional <li> element when an object is added");

  Ember.run(function() {
    ulView.destroy();
  });
});

test("it works inside a table element", function() {
  var tableView = Ember.View.create({
    template: templateFor('<table><tbody>{{#each view.people}}<tr><td>{{name}}</td></tr>{{/each}}</tbody></table>'),
    people: people
  });

  append(tableView);

  equal(tableView.$('td').length, 2, "renders two <td> elements");

  Ember.run(function() {
    people.pushObject({name: "Black Francis"});
  });

  equal(tableView.$('td').length, 3, "renders an additional <td> element when an object is added");

  Ember.run(function() {
    people.insertAt(0, {name: "Kim Deal"});
  });

  equal(tableView.$('td').length, 4, "renders an additional <td> when an object is inserted at the beginning of the array");

  Ember.run(function() {
    tableView.destroy();
  });
});

test("it supports itemController", function() {
  var Controller = Ember.Controller.extend({
    controllerName: Ember.computed(function() {
      return "controller:"+this.get('content.name');
    })
  });

  var container = new Ember.Container();

  Ember.run(function() { view.destroy(); }); // destroy existing view

  var parentController = {
    container: container
  };

  container.register('controller:array', Ember.ArrayController.extend());

  view = Ember.View.create({
    container: container,
    template: templateFor('{{#each view.people itemController="person"}}{{controllerName}}{{/each}}'),
    people: people,
    controller: parentController
  });

  container.register('controller:person', Controller);

  append(view);

  equal(view.$().text(), "controller:Steve Holtcontroller:Annabelle");

  Ember.run(function() {
    view.rerender();
  });

  assertText(view, "controller:Steve Holtcontroller:Annabelle");

  Ember.run(function() {
    people.pushObject({ name: "Yehuda Katz" });
  });

  assertText(view, "controller:Steve Holtcontroller:Annabellecontroller:Yehuda Katz");

  Ember.run(function() {
    set(view, 'people', Ember.A([{ name: "Trek Glowacki" }, { name: "Geoffrey Grosenbach" }]));
  });

  assertText(view, "controller:Trek Glowackicontroller:Geoffrey Grosenbach");

  var controller = view.get('_childViews')[0].get('controller');
  strictEqual(view.get('_childViews')[0].get('_arrayController.target'), parentController, "the target property of the child controllers are set correctly");
});

test("itemController gets a parentController property", function() {
  // using an ObjectController for this test to verify that parentController does accidentally get set
  // on the proxied model.
  var Controller = Ember.ObjectController.extend({
        controllerName: Ember.computed(function() {
          return "controller:"+this.get('content.name') + ' of ' + this.get('parentController.company');
        })
      }),
      container = new Ember.Container(),
      parentController = {
        container: container,
        company: 'Yapp'
      };

  container.register('controller:array', Ember.ArrayController.extend());
  Ember.run(function() { view.destroy(); }); // destroy existing view

  view = Ember.View.create({
    container: container,
    template: templateFor('{{#each view.people itemController="person"}}{{controllerName}}{{/each}}'),
    people: people,
    controller: parentController
  });

  container.register('controller:person', Controller);

  append(view);

  equal(view.$().text(), "controller:Steve Holt of Yappcontroller:Annabelle of Yapp");
});

test("it supports itemController when using a custom keyword", function() {
  var Controller = Ember.Controller.extend({
    controllerName: Ember.computed(function() {
      return "controller:"+this.get('content.name');
    })
  });

  var container = new Ember.Container();
  container.register('controller:array', Ember.ArrayController.extend());

  Ember.run(function() { view.destroy(); }); // destroy existing view
  view = Ember.View.create({
    container: container,
    template: templateFor('{{#each person in view.people itemController="person"}}{{person.controllerName}}{{/each}}'),
    people: people,
    controller: {
      container: container
    }
  });

  container.register('controller:person', Controller);

  append(view);

  equal(view.$().text(), "controller:Steve Holtcontroller:Annabelle");

  Ember.run(function() {
    view.rerender();
  });

  equal(view.$().text(), "controller:Steve Holtcontroller:Annabelle");
});

test("it supports {{itemView=}}", function() {
  var container = new Ember.Container();

  var itemView = Ember.View.extend({
    template: templateFor('itemView:{{name}}')
  });

  Ember.run(function() { view.destroy(); }); // destroy existing view
  view = Ember.View.create({
    template: templateFor('{{each view.people itemView="anItemView"}}'),
    people: people,
    controller: {
      container: container
    }
  });

  container.register('view:anItemView', itemView);

  append(view);

  assertText(view, "itemView:Steve HoltitemView:Annabelle");
});


test("it defers all normalization of itemView names to the resolver", function() {
  var container = new Ember.Container();

  var itemView = Ember.View.extend({
    template: templateFor('itemView:{{name}}')
  });

  Ember.run(function() { view.destroy(); }); // destroy existing view
  view = Ember.View.create({
    template: templateFor('{{each view.people itemView="an-item-view"}}'),
    people: people,
    controller: {
      container: container
    }
  });

  container.register('view:an-item-view', itemView);
  container.resolve = function(fullname) {
    equal(fullname, "view:an-item-view", "leaves fullname untouched");
    return Ember.Container.prototype.resolve.call(this, fullname);
  };
  append(view);

});

test("it supports {{itemViewClass=}}", function() {
  Ember.run(function() { view.destroy(); }); // destroy existing view
  view = Ember.View.create({
    template: templateFor('{{each view.people itemViewClass="MyView"}}'),
    people: people
  });

  append(view);

  assertText(view, "Steve HoltAnnabelle");
});

test("it supports {{itemViewClass=}} with tagName", function() {
  Ember.TESTING_DEPRECATION = true;

  Ember.run(function() { view.destroy(); }); // destroy existing view
  view = Ember.View.create({
      template: templateFor('{{each view.people itemViewClass="MyView" tagName="ul"}}'),
      people: people
  });

  append(view);

  var html = view.$().html();

  // IE 8 (and prior?) adds the \r\n
  html = html.replace(/<script[^>]*><\/script>/ig, '').replace(/[\r\n]/g, '');
  html = html.replace(/<div[^>]*><\/div>/ig, '').replace(/[\r\n]/g, '');
  html = html.replace(/<li[^>]*/ig, '<li');

  // Use lowercase since IE 8 make tagnames uppercase
  equal(html.toLowerCase(), "<ul><li>steve holt</li><li>annabelle</li></ul>");
});

test("it supports {{itemViewClass=}} with in format", function() {

  lookup.MyView = Ember.View.extend({
      template: templateFor("{{person.name}}")
  });

  Ember.run(function() { view.destroy(); }); // destroy existing view
  view = Ember.View.create({
    template: templateFor('{{each person in view.people itemViewClass="MyView"}}'),
    people: people
  });

  append(view);

  assertText(view, "Steve HoltAnnabelle");

});

test("it supports {{else}}", function() {
  Ember.run(function() { view.destroy(); }); // destroy existing view
  view = Ember.View.create({
    template: templateFor("{{#each view.items}}{{this}}{{else}}Nothing{{/each}}"),
    items: Ember.A(['one', 'two'])
  });

  append(view);

  assertHTML(view, "onetwo");

  Ember.run(function() {
    view.set('items', Ember.A());
  });

  assertHTML(view, "Nothing");
});

test("it works with the controller keyword", function() {
  var controller = Ember.ArrayController.create({
    content: Ember.A(["foo", "bar", "baz"])
  });

  Ember.run(function() { view.destroy(); }); // destroy existing view
  view = Ember.View.create({
    controller: controller,
    template: templateFor("{{#view}}{{#each controller}}{{this}}{{/each}}{{/view}}")
  });

  append(view);

  equal(view.$().text(), "foobarbaz");
});

module("{{#each foo in bar}}", {
  teardown: function() {
    Ember.run(function() {
      view.destroy();
    });
  }
});

test("#each accepts a name binding", function() {
  view = Ember.View.create({
    template: templateFor("{{#each item in view.items}}{{view.title}} {{item}}{{/each}}"),
    title: "My Cool Each Test",
    items: Ember.A([1, 2])
  });

  append(view);

  equal(view.$().text(), "My Cool Each Test 1My Cool Each Test 2");
});

test("#each accepts a name binding and does not change the context", function() {
  var controller = Ember.Controller.create({
    name: 'bob the controller'
  }),
  obj = Ember.Object.create({
    name: 'henry the item'
  });

  view = Ember.View.create({
    template: templateFor("{{#each item in view.items}}{{name}}{{/each}}"),
    title: "My Cool Each Test",
    items: Ember.A([obj]),
    controller: controller
  });

  append(view);

  equal(view.$().text(), "bob the controller");
});


test("#each accepts a name binding and can display child properties", function() {
  view = Ember.View.create({
    template: templateFor("{{#each item in view.items}}{{view.title}} {{item.name}}{{/each}}"),
    title: "My Cool Each Test",
    items: Ember.A([{ name: 1 }, { name: 2 }])
  });

  append(view);

  equal(view.$().text(), "My Cool Each Test 1My Cool Each Test 2");
});

test("#each accepts 'this' as the right hand side", function() {
  view = Ember.View.create({
    template: templateFor("{{#each item in this}}{{view.title}} {{item.name}}{{/each}}"),
    title: "My Cool Each Test",
    controller: Ember.A([{ name: 1 }, { name: 2 }])
  });

  append(view);

  equal(view.$().text(), "My Cool Each Test 1My Cool Each Test 2");
});

test("views inside #each preserve the new context", function() {
  var controller = Ember.A([ { name: "Adam" }, { name: "Steve" } ]);

  view = Ember.View.create({
    controller: controller,
    template: templateFor('{{#each controller}}{{#view}}{{name}}{{/view}}{{/each}}')
  });

  append(view);

  equal(view.$().text(), "AdamSteve");
});

test("controller is assignable inside an #each", function() {
  var controller = Ember.ArrayController.create({
    content: Ember.A([ { name: "Adam" }, { name: "Steve" } ])
  });

  view = Ember.View.create({
    controller: controller,
    template: templateFor('{{#each personController in this}}{{#view controllerBinding="personController"}}{{name}}{{/view}}{{/each}}')
  });

  append(view);

  equal(view.$().text(), "AdamSteve");
});

test("single-arg each defaults to current context", function() {
  view = Ember.View.create({
    context: Ember.A([ { name: "Adam" }, { name: "Steve" } ]),
    template: templateFor('{{#each}}{{name}}{{/each}}')
  });

  append(view);

  equal(view.$().text(), "AdamSteve");
});

test("single-arg each will iterate over controller if present", function() {
  view = Ember.View.create({
    controller: Ember.A([ { name: "Adam" }, { name: "Steve" } ]),
    template: templateFor('{{#each}}{{name}}{{/each}}')
  });

  append(view);

  equal(view.$().text(), "AdamSteve");
});


})();

(function() {
var trim = Ember.$.trim;

var view;

module("Ember.Handlebars - group flag", {
  setup: function() {},

  teardown: function() {
    Ember.run(function() {
      view.destroy();
    });
    Ember.run.cancelTimers();
  }
});

function createGroupedView(template, context) {
  var options = {
    context: context,
    template: Ember.Handlebars.compile(template),
    templateData: {insideGroup: true, keywords: {}}
  };
  Ember.run(function() {
    view = Ember.View.create(options);
  });
}

function appendView() {
  Ember.run(function() { view.appendTo('#qunit-fixture'); });
}

test("should properly modify behavior inside the block", function() {
  createGroupedView("{{msg}}", {msg: 'ohai'});
  appendView();

  equal(view.$('script').length, 0, "No Metamorph markers are output");
  equal(view.$().text(), 'ohai', 'Original value was rendered');

  Ember.run(function() {
    view.set('context.msg', 'ohbai');
  });
  equal(view.$().text(), 'ohbai', 'Updated value was rendered');

  Ember.run(function() {
    view.set('context.msg', null);
  });
  equal(view.$().text(), '', 'null value properly rendered as a blank');

  Ember.run(function() {
    view.set('context.msg', undefined);
  });
  equal(view.$().text(), '', 'undefined value properly rendered as a blank');
});

test("property changes inside views should only rerender their view", function() {
  createGroupedView(
    '{{#view}}{{msg}}{{/view}}',
    {msg: 'ohai'}
  );
  var rerenderWasCalled = false;
  view.reopen({
    rerender: function() { rerenderWasCalled = true; this._super(); }
  });
  appendView();
  equal(view.$('script').length, 0, "No Metamorph markers are output");
  equal(trim(view.$().text()), 'ohai', 'Original value was rendered');

  Ember.run(function() {
    view.set('context.msg', 'ohbai');
  });
  ok(!rerenderWasCalled, "The GroupView rerender method was not called");
  equal(trim(view.$().text()), 'ohbai', "The updated value was rendered");
});

test("should work with bind-attr", function() {
  createGroupedView(
    '<button {{bind-attr class="innerClass"}}>ohai</button>',
    {innerClass: 'magic'}
  );
  appendView();
  equal(view.$('.magic').length, 1);

  Ember.run(function() {
    view.set('context.innerClass', 'bindings');
  });
  equal(view.$('.bindings').length, 1);

  Ember.run(function() {
    view.rerender();
  });
  equal(view.$('.bindings').length, 1);
});

test("should work with the #if helper", function() {
  createGroupedView(
    '{{#if something}}hooray{{else}}boo{{/if}}',
    {something: true}
  );
  appendView();

  equal(view.$('script').length, 0, "No Metamorph markers are output");
  equal(trim(view.$().text()), 'hooray', 'Truthy text was rendered');

  Ember.run(function() {
    view.set('context.something', false);
  });
  equal(trim(view.$().text()), 'boo', "The falsy value was rendered");
});

test("#each with no content", function() {
  expect(0);
  createGroupedView(
    "{{#each missing}}{{this}}{{/each}}"
  );
  appendView();
});

test("#each's content can be changed right before a destroy", function() {
  expect(0);

  createGroupedView(
    "{{#each numbers}}{{this}}{{/each}}",
    {numbers: Ember.A([1,2,3])}
  );
  appendView();

  Ember.run(function() {
    view.set('context.numbers', Ember.A([3,2,1]));
    view.destroy();
  });
});

test("#each can be nested", function() {
  createGroupedView(
    "{{#each numbers}}{{this}}{{/each}}",
    {numbers: Ember.A([1, 2, 3])}
  );
  appendView();
  equal(view.$('script').length, 0, "No Metamorph markers are output");
  equal(view.$().text(), '123', "The content was rendered");

  Ember.run(function() {
    view.get('context.numbers').pushObject(4);
  });

  equal(view.$().text(), '1234', "The array observer properly updated the rendered output");

  Ember.run(function() {
    view.set('context.numbers', Ember.A(['a', 'b', 'c']));
  });

  equal(view.$().text(), 'abc', "Replacing the array properly updated the rendered output");
});

test("#each can be used with an ArrayProxy", function() {
  createGroupedView(
    "{{#each numbers}}{{this}}{{/each}}",
    {numbers: Ember.ArrayProxy.create({content: Ember.A([1, 2, 3])})}
  );
  appendView();
  equal(view.$('script').length, 0, "No Metamorph markers are output");
  equal(view.$().text(), '123', "The content was rendered");
});

test("an #each can be nested with a view inside", function() {
  var yehuda = {name: 'Yehuda'};
  createGroupedView(
    '{{#each people}}{{#view}}{{name}}{{/view}}{{/each}}',
    {people: Ember.A([yehuda, {name: 'Tom'}])}
  );
  appendView();
  equal(view.$('script').length, 0, "No Metamorph markers are output");
  equal(view.$().text(), 'YehudaTom', "The content was rendered");

  Ember.run(function() {
    Ember.set(yehuda, 'name', 'Erik');
  });

  equal(view.$().text(), 'ErikTom', "The updated object's view was rerendered");
});

test("#each with groupedRows=true behaves like a normal bound #each", function() {
  createGroupedView(
    '{{#each numbers groupedRows=true}}{{this}}{{/each}}',
    {numbers: Ember.A([1, 2, 3])}
  );
  appendView();
  equal(view.$('script').length, 8, "Correct number of Metamorph markers are output");
  equal(view.$().text(), '123');

  Ember.run(function() {
    view.get('context.numbers').pushObject(4);
  });

  equal(view.$('script').length, 10, "Correct number of Metamorph markers are output");
  equal(view.$().text(), '1234');
});

test("#each with itemViewClass behaves like a normal bound #each", function() {
  createGroupedView(
    '{{#each people itemViewClass="Ember.View"}}{{name}}{{/each}}',
    {people: Ember.A([{name: 'Erik'}, {name: 'Peter'}])}
  );
  appendView();
  equal(view.$('script').length, 2, "Correct number of Metamorph markers are output");
  equal(view.$('.ember-view').length, 2, "Correct number of views are output");
  equal(view.$().text(), 'ErikPeter');

  Ember.run(function() {
    view.get('context.people').pushObject({name: 'Tom'});
  });

  equal(view.$('script').length, 2, "Correct number of Metamorph markers are output");
  equal(view.$('.ember-view').length, 3, "Correct number of views are output");
  // IE likes to add newlines
  equal(view.$().text().replace(/\s+/g, ''), 'ErikPeterTom');
});

})();

(function() {
var appendView = function(view) {
  Ember.run(function() { view.appendTo('#qunit-fixture'); });
};

var compile = Ember.Handlebars.compile;

var view;

module("Handlebars {{#if}} and {{#unless}} helpers", {
  teardown: function() {
    Ember.run(function() {
      if (view) {
        view.destroy();
      }
    });
  }
});

test("unless should keep the current context (#784)", function() {
  view = Ember.View.create({
    o: Ember.Object.create({foo: '42'}),

    template: compile('{{#with view.o}}{{#view Ember.View}}{{#unless view.doesNotExist}}foo: {{foo}}{{/unless}}{{/view}}{{/with}}')
  });

  appendView(view);

  equal(view.$().text(), 'foo: 42');
});

test("The `if` helper tests for `isTruthy` if available", function() {
  view = Ember.View.create({
    truthy: Ember.Object.create({ isTruthy: true }),
    falsy: Ember.Object.create({ isTruthy: false }),

    template: compile('{{#if view.truthy}}Yep{{/if}}{{#if view.falsy}}Nope{{/if}}')
  });

  appendView(view);

  equal(view.$().text(), 'Yep');
});

test("The `if` helper does not print the contents for an object proxy without content", function() {
  view = Ember.View.create({
    truthy: Ember.ObjectProxy.create({ content: {} }),
    falsy: Ember.ObjectProxy.create({ content: null }),

    template: compile('{{#if view.truthy}}Yep{{/if}}{{#if view.falsy}}Nope{{/if}}')
  });

  appendView(view);

  equal(view.$().text(), 'Yep');
});

test("The `if` helper updates if an object proxy gains or loses context", function() {
  view = Ember.View.create({
    proxy: Ember.ObjectProxy.create({ content: null }),

    template: compile('{{#if view.proxy}}Yep{{/if}}')
  });

  appendView(view);

  equal(view.$().text(), '');

  Ember.run(function() {
    view.set('proxy.content', {});
  });

  equal(view.$().text(), 'Yep');

  Ember.run(function() {
    view.set('proxy.content', null);
  });

  equal(view.$().text(), '');
});

test("The `if` helper updates if an array is empty or not", function() {
  view = Ember.View.create({
    array: Ember.A(),

    template: compile('{{#if view.array}}Yep{{/if}}')
  });

  appendView(view);

  equal(view.$().text(), '');

  Ember.run(function() {
    view.get('array').pushObject(1);
  });

  equal(view.$().text(), 'Yep');

  Ember.run(function() {
    view.get('array').removeObject(1);
  });

  equal(view.$().text(), '');
});

})();

(function() {
var buildView = function(template, context) {
  return Ember.View.create({
    template: Ember.Handlebars.compile(template),
    context: (context || {})
  });
};

var appendView = function(view) {
  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });
};

var destroyView = function(view) {
  Ember.run(function() {
    view.destroy();
  });
};

var oldString;

module('Handlebars {{loc valueToLocalize}} helper', {
  setup: function() {
    oldString = Ember.STRINGS;
    Ember.STRINGS = {
      '_Howdy Friend': 'Hallo Freund'
    };
  },

  teardown: function() {
    Ember.STRINGS = oldString;
  }
});

test("let the original value through by default", function() {
  var view = buildView('{{loc "Hiya buddy!"}}');
  appendView(view);

  equal(view.$().text(), "Hiya buddy!");

  destroyView(view);
});

test("localize a simple string", function() {
  var view = buildView('{{loc "_Howdy Friend"}}');
  appendView(view);

  equal(view.$().text(), "Hallo Freund");

  destroyView(view);
});

})();

(function() {
var MyApp;
var originalLookup = Ember.lookup, lookup, TemplateTests, view, container;

module("Support for {{partial}} helper", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };
    MyApp = lookup.MyApp = Ember.Object.create({});
    container = new Ember.Container();
    container.optionsForType('template', { instantiate: false });
  },
  teardown: function() {
    Ember.run(function() {
      if (view) {
        view.destroy();
      }
    });
    Ember.lookup = originalLookup;
  }
});

test("should render other templates registered with the container", function() {
  container.register('template:_subTemplateFromContainer', Ember.Handlebars.compile('sub-template'));

  view = Ember.View.create({
    container: container,
    template: Ember.Handlebars.compile('This {{partial "subTemplateFromContainer"}} is pretty great.')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(Ember.$.trim(view.$().text()), "This sub-template is pretty great.");
});

test("should render other slash-separated templates registered with the container", function() {
  container.register('template:child/_subTemplateFromContainer', Ember.Handlebars.compile("sub-template"));

  view = Ember.View.create({
    container: container,
    template: Ember.Handlebars.compile('This {{partial "child/subTemplateFromContainer"}} is pretty great.')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(Ember.$.trim(view.$().text()), "This sub-template is pretty great.");
});

test("should use the current view's context", function() {
  container.register('template:_person_name', Ember.Handlebars.compile("{{firstName}} {{lastName}}"));

  view = Ember.View.create({
    container: container,
    template: Ember.Handlebars.compile('Who is {{partial "person_name"}}?')
  });
  view.set('controller', Ember.Object.create({
    firstName: 'Kris',
    lastName: 'Selden'
  }));

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(Ember.$.trim(view.$().text()), "Who is Kris Selden?");
});

test("Quoteless parameters passed to {{template}} perform a bound property lookup of the partial name", function() {
  container.register('template:_subTemplate', Ember.Handlebars.compile("sub-template"));
  container.register('template:_otherTemplate', Ember.Handlebars.compile("other-template"));

  view = Ember.View.create({
    container: container,
    template: Ember.Handlebars.compile('This {{partial view.partialName}} is pretty {{partial nonexistent}}great.'),
    partialName: 'subTemplate'
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(Ember.$.trim(view.$().text()), "This sub-template is pretty great.");

  Ember.run(function() {
    view.set('partialName', 'otherTemplate');
  });

  equal(Ember.$.trim(view.$().text()), "This other-template is pretty great.");

  Ember.run(function() {
    view.set('partialName', null);
  });

  equal(Ember.$.trim(view.$().text()), "This  is pretty great.");
});


})();

(function() {
var MyApp;
var originalLookup = Ember.lookup, lookup, TemplateTests, view, container;

module("Support for {{template}} helper", {
  setup: function() {
    Ember.TESTING_DEPRECATION = true;

    Ember.lookup = lookup = { Ember: Ember };
    MyApp = lookup.MyApp = Ember.Object.create({});
    container = new Ember.Container();
    container.optionsForType('template', { instantiate: false });
  },
  teardown: function() {
    Ember.run(function() {
      if (view) {
        view.destroy();
      }
    });
    Ember.lookup = originalLookup;

    Ember.TESTING_DEPRECATION = false;
  }
});

test("should render other templates via the container", function() {
  container.register('template:sub_template_from_container', Ember.Handlebars.compile('sub-template'));

  view = Ember.View.create({
    container: container,
    template: Ember.Handlebars.compile('This {{template "sub_template_from_container"}} is pretty great.')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(Ember.$.trim(view.$().text()), "This sub-template is pretty great.");
});

test("should use the current view's context", function() {
  container.register('template:person_name', Ember.Handlebars.compile("{{firstName}} {{lastName}}"));

  view = Ember.View.create({
    container: container,
    template: Ember.Handlebars.compile('Who is {{template "person_name"}}?')
  });
  view.set('controller', Ember.Object.create({
    firstName: 'Kris',
    lastName: 'Selden'
  }));

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(Ember.$.trim(view.$().text()), "Who is Kris Selden?");
});

})();

(function() {
/*globals Foo */

var get = Ember.get, set = Ember.set;

var appendView = function(view) {
  Ember.run(function() { view.appendTo('#qunit-fixture'); });
};

var view;
var originalLookup = Ember.lookup, lookup;

module("Handlebars {{#unbound}} helper -- classic single-property usage", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };

    view = Ember.View.create({
      template: Ember.Handlebars.compile("{{unbound foo}} {{unbound bar}}"),
      context: Ember.Object.create({
        foo: "BORK",
        barBinding: 'foo'
      })
    });

    appendView(view);
  },

  teardown: function() {
    Ember.run(function() {
      view.destroy();
    });
    Ember.lookup = originalLookup;
  }
});

test("it should render the current value of a property on the context", function() {
  equal(view.$().text(), "BORK BORK", "should render the current value of a property");
});

test("it should not re-render if the property changes", function() {
  Ember.run(function() {
    view.set('context.foo', 'OOF');
  });
  equal(view.$().text(), "BORK BORK", "should not re-render if the property changes");
});

test("it should throw the helper missing error if multiple properties are provided", function() {
  throws(function() {
      appendView(Ember.View.create({
        template: Ember.Handlebars.compile('{{unbound foo bar}}'),
        context: Ember.Object.create({
          foo: "BORK",
          bar: 'foo'
        })
      }));
    }, Ember.Error);
});

module("Handlebars {{#unbound boundHelper arg1 arg2... argN}} form: render unbound helper invocations", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };

    Ember.Handlebars.registerBoundHelper('surround', function(prefix, value, suffix) {
      return prefix + '-' + value + '-' + suffix;
    });

    Ember.Handlebars.registerBoundHelper('capitalize', function(value) {
      return value.toUpperCase();
    });

    Ember.Handlebars.registerBoundHelper('capitalizeName', function(value) {
      return get(value, 'firstName').toUpperCase();
    }, 'firstName');

    Ember.Handlebars.registerBoundHelper('concat', function(value) {
      return [].slice.call(arguments, 0, -1).join('');
    });

    Ember.Handlebars.registerBoundHelper('concatNames', function(value) {
      return get(value, 'firstName') + get(value, 'lastName');
    }, 'firstName', 'lastName');
  },

  teardown: function() {
    delete Ember.Handlebars.helpers['surround'];
    delete Ember.Handlebars.helpers['capitalize'];
    delete Ember.Handlebars.helpers['capitalizeName'];
    delete Ember.Handlebars.helpers['concat'];
    delete Ember.Handlebars.helpers['concatNames'];

    Ember.run(function() {
      view.destroy();
    });
    Ember.lookup = originalLookup;
  }
});


test("should be able to render an unbound helper invocation", function() {
  try {
    Ember.Handlebars.registerBoundHelper('repeat', function(value, options) {
      var count = options.hash.count;
      var a = [];
      while(a.length < count) {
          a.push(value);
      }
      return a.join('');
    });

    view = Ember.View.create({
      template: Ember.Handlebars.compile('{{unbound repeat foo countBinding="bar"}} {{repeat foo countBinding="bar"}} {{unbound repeat foo count=2}} {{repeat foo count=4}}'),
      context: Ember.Object.create({
        foo: "X",
        numRepeatsBinding: "bar",
        bar: 5
      })
    });
    appendView(view);

    equal(view.$().text(), "XXXXX XXXXX XX XXXX", "first render is correct");

    Ember.run(function() {
      set(view, 'context.bar', 1);
    });

    equal(view.$().text(), "XXXXX X XX XXXX", "only unbound bound options changed");
  } finally {
    delete Ember.Handlebars.helpers['repeat'];
  }
});

test("should be able to render an bound helper invocation mixed with static values", function() {
  view = Ember.View.create({
      template: Ember.Handlebars.compile('{{unbound surround prefix value "bar"}} {{surround prefix value "bar"}} {{unbound surround "bar" value suffix}} {{surround "bar" value suffix}}'),
      context: Ember.Object.create({
        prefix: "before",
        value: "core",
        suffix: "after"
      })
    });
  appendView(view);

  equal(view.$().text(), "before-core-bar before-core-bar bar-core-after bar-core-after", "first render is correct");
  Ember.run(function() {
    set(view, 'context.prefix', 'beforeChanged');
    set(view, 'context.value', 'coreChanged');
    set(view, 'context.suffix', 'afterChanged');
  });
  equal(view.$().text(), "before-core-bar beforeChanged-coreChanged-bar bar-core-after bar-coreChanged-afterChanged", "only bound values change");
});

test("should be able to render unbound forms of multi-arg helpers", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile("{{concat foo bar bing}} {{unbound concat foo bar bing}}"),
    context: Ember.Object.create({
      foo: "a",
      bar: "b",
      bing: "c"
    })
  });
  appendView(view);

  equal(view.$().text(), "abc abc", "first render is correct");

  Ember.run(function() {
    set(view, 'context.bar', 'X');
  });

  equal(view.$().text(), "aXc abc", "unbound helpers/properties stayed the same");
});


test("should be able to render an unbound helper invocation for helpers with dependent keys", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile("{{capitalizeName person}} {{unbound capitalizeName person}} {{concatNames person}} {{unbound concatNames person}}"),
    context: Ember.Object.create({
      person: Ember.Object.create({
        firstName: 'shooby',
        lastName:  'taylor'
      })
    })
  });
  appendView(view);

  equal(view.$().text(), "SHOOBY SHOOBY shoobytaylor shoobytaylor", "first render is correct");

  Ember.run(function() {
    set(view, 'context.person.firstName', 'sally');
  });

  equal(view.$().text(), "SALLY SHOOBY sallytaylor shoobytaylor", "only bound values change");
});


test("should be able to render an unbound helper invocation in #each helper", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile(
      [ "{{#each person in people}}",
        "{{capitalize person.firstName}} {{unbound capitalize person.firstName}}",
        "{{/each}}"].join("")),
    context: {
      people: Ember.A([
        {
          firstName: 'shooby',
          lastName:  'taylor'
        },
        {
          firstName: 'cindy',
          lastName:  'taylor'
        }
    ])}
  });
  appendView(view);

  equal(view.$().text(), "SHOOBY SHOOBYCINDY CINDY", "unbound rendered correctly");
});


test("should be able to render an unbound helper invocation with bound hash options", function() {
  try {
    Ember.Handlebars.registerBoundHelper('repeat', function(value) {
      return [].slice.call(arguments, 0, -1).join('');
    });


    view = Ember.View.create({
      template: Ember.Handlebars.compile("{{capitalizeName person}} {{unbound capitalizeName person}} {{concatNames person}} {{unbound concatNames person}}"),
      context: Ember.Object.create({
        person: Ember.Object.create({
          firstName: 'shooby',
          lastName:  'taylor'
        })
      })
    });
    appendView(view);

    equal(view.$().text(), "SHOOBY SHOOBY shoobytaylor shoobytaylor", "first render is correct");

    Ember.run(function() {
      set(view, 'context.person.firstName', 'sally');
    });

    equal(view.$().text(), "SALLY SHOOBY sallytaylor shoobytaylor", "only bound values change");
  } finally {
    delete Ember.Handlebars.registerBoundHelper['repeat'];
  }
});


})();

(function() {
var view, originalLookup;

var container = {
  lookupFactory: function() { }
};

function viewClass(options) {
  options.container = options.container || container;
  return Ember.View.extend(options);
}

module("Handlebars {{#view}} helper", {
  setup: function() {
    originalLookup = Ember.lookup;

  },

  teardown: function() {
    Ember.lookup = originalLookup;
    Ember.run(view, 'destroy');
  }
});


test("View lookup - App.FuView", function() {
  Ember.lookup = {
    App: {
      FuView: viewClass({
        elementId: "fu",
        template: Ember.Handlebars.compile("bro")
      })
    }
  };

  view = viewClass({
    template: Ember.Handlebars.compile("{{view App.FuView}}")
  }).create();

  Ember.run(view, 'appendTo', '#qunit-fixture');

  equal(Ember.$('#fu').text(), 'bro');
});

test("View lookup - 'App.FuView'", function() {
  Ember.lookup = {
    App: {
      FuView: viewClass({
        elementId: "fu",
        template: Ember.Handlebars.compile("bro")
      })
    }
  };

  view = viewClass({
    template: Ember.Handlebars.compile("{{view 'App.FuView'}}")
  }).create();

  Ember.run(view, 'appendTo', '#qunit-fixture');

  equal(Ember.$('#fu').text(), 'bro');
});

test("View lookup - 'fu'", function() {
  var FuView = viewClass({
    elementId: "fu",
    template: Ember.Handlebars.compile("bro")
  });

  var container = {
    lookupFactory: lookupFactory
  };

  view = Ember.View.extend({
    template: Ember.Handlebars.compile("{{view 'fu'}}"),
    container: container
  }).create();

  Ember.run(view, 'appendTo', '#qunit-fixture');

  equal(Ember.$('#fu').text(), 'bro');

  function lookupFactory(fullName) {
    equal(fullName, 'view:fu');

    return FuView;
  }
});

test("id bindings downgrade to one-time property lookup", function() {
  view = Ember.View.extend({
    template: Ember.Handlebars.compile("{{#view Ember.View id=view.meshuggah}}{{view.parentView.meshuggah}}{{/view}}"),
    meshuggah: 'stengah'
  }).create();

  Ember.run(view, 'appendTo', '#qunit-fixture');

  equal(Ember.$('#stengah').text(), 'stengah', "id binding performed property lookup");
  Ember.run(view, 'set', 'meshuggah', 'omg');
  equal(Ember.$('#stengah').text(), 'omg', "id didn't change");
});

test("mixing old and new styles of property binding fires a warning, treats value as if it were quoted", function() {

  expect(2);

  var oldWarn = Ember.warn;

  Ember.warn = function(msg) {
    equal(msg, "You're attempting to render a view by passing borfBinding=view.snork to a view helper, but this syntax is ambiguous. You should either surround view.snork in quotes or remove `Binding` from borfBinding.");
  };

  view = Ember.View.extend({
    template: Ember.Handlebars.compile("{{#view Ember.View borfBinding=view.snork}}<p id='lol'>{{view.borf}}</p>{{/view}}"),
    snork: "nerd"
  }).create();

  Ember.run(view, 'appendTo', '#qunit-fixture');

  equal(Ember.$('#lol').text(), "nerd", "awkward mixed syntax treated like binding");

  Ember.warn = oldWarn;
});

})();

(function() {
/*globals Foo */

var appendView = function(view) {
  Ember.run(function() { view.appendTo('#qunit-fixture'); });
};

var view;
var originalLookup = Ember.lookup, lookup;

module("Handlebars {{#with}} helper", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };

    view = Ember.View.create({
      template: Ember.Handlebars.compile("{{#with person as tom}}{{title}}: {{tom.name}}{{/with}}"),
      context: {
        title: "Señor Engineer",
        person: { name: "Tom Dale" }
      }
    });

    appendView(view);
  },

  teardown: function() {
    Ember.run(function() {
      view.destroy();
    });
    Ember.lookup = originalLookup;
  }
});

test("it should support #with foo as bar", function() {
  equal(view.$().text(), "Señor Engineer: Tom Dale", "should be properly scoped");
});

test("updating the context should update the alias", function() {
  Ember.run(function() {
    view.set('context.person', {
      name: "Yehuda Katz"
    });
  });

  equal(view.$().text(), "Señor Engineer: Yehuda Katz", "should be properly scoped after updating");
});

test("updating a property on the context should update the HTML", function() {
  Ember.run(function() {
    Ember.set(view, 'context.person.name', "Yehuda Katz");
  });

  equal(view.$().text(), "Señor Engineer: Yehuda Katz", "should be properly scoped after updating");
});

test("updating a property on the view should update the HTML", function() {
  Ember.run(function() {
    view.set('context.title', "Señorette Engineer");
  });

  equal(view.$().text(), "Señorette Engineer: Tom Dale", "should be properly scoped after updating");
});

module("Multiple Handlebars {{with}} helpers with 'as'", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };

    view = Ember.View.create({
      template: Ember.Handlebars.compile("Admin: {{#with admin as person}}{{person.name}}{{/with}} User: {{#with user as person}}{{person.name}}{{/with}}"),
      context: {
        admin: { name: "Tom Dale" },
        user: { name: "Yehuda Katz"}
      }
    });

    appendView(view);
  },

  teardown: function() {
    Ember.run(function() {
      view.destroy();
    });
    Ember.lookup = originalLookup;
  }
});

test("re-using the same variable with different #with blocks does not override each other", function(){
  equal(view.$().text(), "Admin: Tom Dale User: Yehuda Katz", "should be properly scoped");
});

test("the scoped variable is not available outside the {{with}} block.", function(){
  Ember.run(function() {
    view.set('template', Ember.Handlebars.compile("{{name}}-{{#with other as name}}{{name}}{{/with}}-{{name}}"));
    view.set('context', {
      name: 'Stef',
      other: 'Yehuda'
    });
  });

  equal(view.$().text(), "Stef-Yehuda-Stef", "should be properly scoped after updating");
});

test("nested {{with}} blocks shadow the outer scoped variable properly.", function(){
  Ember.run(function() {
    view.set('template', Ember.Handlebars.compile("{{#with first as ring}}{{ring}}-{{#with fifth as ring}}{{ring}}-{{#with ninth as ring}}{{ring}}-{{/with}}{{ring}}-{{/with}}{{ring}}{{/with}}"));
    view.set('context', {
      first: 'Limbo',
      fifth: 'Wrath',
      ninth: 'Treachery'
    });
  });

  equal(view.$().text(), "Limbo-Wrath-Treachery-Wrath-Limbo", "should be properly scoped after updating");
});
module("Handlebars {{#with}} globals helper", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };

    lookup.Foo = { bar: 'baz' };
    view = Ember.View.create({
      template: Ember.Handlebars.compile("{{#with Foo.bar as qux}}{{qux}}{{/with}}")
    });

    appendView(view);
  },

  teardown: function() {
    Ember.run(function() {
      view.destroy();
    });
    Ember.lookup = originalLookup;
  }
});

test("it should support #with Foo.bar as qux", function() {
  equal(view.$().text(), "baz", "should be properly scoped");

  Ember.run(function() {
    Ember.set(lookup.Foo, 'bar', 'updated');
  });

  equal(view.$().text(), "updated", "should update");
});

module("Handlebars {{#with keyword as foo}}");

test("it should support #with view as foo", function() {
  var view = Ember.View.create({
    template: Ember.Handlebars.compile("{{#with view as myView}}{{myView.name}}{{/with}}"),
    name: "Sonics"
  });

  appendView(view);
  equal(view.$().text(), "Sonics", "should be properly scoped");

  Ember.run(function() {
    Ember.set(view, 'name', "Thunder");
  });

  equal(view.$().text(), "Thunder", "should update");

  Ember.run(function() {
    view.destroy();
  });
});

test("it should support #with name as food, then #with foo as bar", function() {
  var view = Ember.View.create({
    template: Ember.Handlebars.compile("{{#with name as foo}}{{#with foo as bar}}{{bar}}{{/with}}{{/with}}"),
    context: { name: "caterpillar" }
  });

  appendView(view);
  equal(view.$().text(), "caterpillar", "should be properly scoped");

  Ember.run(function() {
    Ember.set(view, 'context.name', "butterfly");
  });

  equal(view.$().text(), "butterfly", "should update");

  Ember.run(function() {
    view.destroy();
  });
});

module("Handlebars {{#with this as foo}}");

test("it should support #with this as qux", function() {
  var view = Ember.View.create({
    template: Ember.Handlebars.compile("{{#with this as person}}{{person.name}}{{/with}}"),
    controller: Ember.Object.create({ name: "Los Pivots" })
  });

  appendView(view);
  equal(view.$().text(), "Los Pivots", "should be properly scoped");

  Ember.run(function() {
    Ember.set(view, 'controller.name', "l'Pivots");
  });

  equal(view.$().text(), "l'Pivots", "should update");

  Ember.run(function() {
    view.destroy();
  });
});

module("Handlebars {{#with foo}} insideGroup");

test("it should render without fail", function() {
  var View = Ember.View.extend({
    template: Ember.Handlebars.compile("{{#view view.childView}}{{#with person}}{{name}}{{/with}}{{/view}}"),
    controller: Ember.Object.create({ person: { name: "Ivan IV Vasilyevich" } }),
    childView: Ember.View.extend({
      render: function(){
        this.set('templateData.insideGroup', true);
        return this._super.apply(this, arguments);
      }
    })
  });

  var view = View.create();
  appendView(view);
  equal(view.$().text(), "Ivan IV Vasilyevich", "should be properly scoped");

  Ember.run(function() {
    Ember.set(view, 'controller.person.name', "Ivan the Terrible");
  });

  equal(view.$().text(), "Ivan the Terrible", "should update");

  Ember.run(function() {
    view.destroy();
  });
});

})();

(function() {

var set = Ember.set, get = Ember.get;

var originalLookup = Ember.lookup, lookup, TemplateTests, view, container;

module("Support for {{yield}} helper (#307)", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };

    lookup.TemplateTests = TemplateTests = Ember.Namespace.create();

    container = new Ember.Container();
    container.optionsForType('template', { instantiate: false });
  },
  teardown: function() {
    Ember.run(function() {
      Ember.TEMPLATES = {};
      if (view) {
        view.destroy();
      }
    });

    Ember.lookup = originalLookup;
  }
});

test("a view with a layout set renders its template where the {{yield}} helper appears", function() {
  TemplateTests.ViewWithLayout = Ember.View.extend({
    layout: Ember.Handlebars.compile('<div class="wrapper"><h1>{{title}}</h1>{{yield}}</div>')
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#view TemplateTests.ViewWithLayout title="My Fancy Page"}}<div class="page-body">Show something interesting here</div>{{/view}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('div.wrapper div.page-body').length, 1, 'page-body is embedded within wrapping my-page');
});

test("block should work properly even when templates are not hard-coded", function() {
  container.register('template:nester', Ember.Handlebars.compile('<div class="wrapper"><h1>{{title}}</h1>{{yield}}</div>'));
  container.register('template:nested', Ember.Handlebars.compile('{{#view TemplateTests.ViewWithLayout title="My Fancy Page"}}<div class="page-body">Show something interesting here</div>{{/view}}'));

  TemplateTests.ViewWithLayout = Ember.View.extend({
    container: container,
    layoutName: 'nester'
  });

  view = Ember.View.create({
    container: container,
    templateName: 'nested'
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('div.wrapper div.page-body').length, 1, 'page-body is embedded within wrapping my-page');

});

test("templates should yield to block, when the yield is embedded in a hierarchy of virtual views", function() {
  TemplateTests.TimesView = Ember.View.extend({
    layout: Ember.Handlebars.compile('<div class="times">{{#each view.index}}{{yield}}{{/each}}</div>'),
    n: null,
    index: Ember.computed(function() {
      var n = Ember.get(this, 'n'), indexArray = Ember.A();
      for (var i=0; i < n; i++) {
        indexArray[i] = i;
      }
      return indexArray;
    })
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('<div id="container"><div class="title">Counting to 5</div>{{#view TemplateTests.TimesView n=5}}<div class="times-item">Hello</div>{{/view}}</div>')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('div#container div.times-item').length, 5, 'times-item is embedded within wrapping container 5 times, as expected');
});

test("templates should yield to block, when the yield is embedded in a hierarchy of non-virtual views", function() {
  TemplateTests.NestingView = Ember.View.extend({
    layout: Ember.Handlebars.compile('{{#view Ember.View tagName="div" classNames="nesting"}}{{yield}}{{/view}}')
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('<div id="container">{{#view TemplateTests.NestingView}}<div id="block">Hello</div>{{/view}}</div>')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('div#container div.nesting div#block').length, 1, 'nesting view yields correctly even within a view hierarchy in the nesting view');
});

test("block should not be required", function() {
  TemplateTests.YieldingView = Ember.View.extend({
    layout: Ember.Handlebars.compile('{{#view Ember.View tagName="div" classNames="yielding"}}{{yield}}{{/view}}')
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('<div id="container">{{view TemplateTests.YieldingView}}</div>')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('div#container div.yielding').length, 1, 'yielding view is rendered as expected');
});

test("yield uses the outer context", function() {
  var component = Ember.Component.extend({
    boundText: "inner",
    layout: Ember.Handlebars.compile("<p>{{boundText}}</p><p>{{yield}}</p>")
  });

  view = Ember.View.create({
    controller: { boundText: "outer", component: component },
    template: Ember.Handlebars.compile('{{#view component}}{{boundText}}{{/view}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('div p:contains(inner) + p:contains(outer)').length, 1, "Yield points at the right context");
});

test("yield inside a conditional uses the outer context", function() {
  var component = Ember.Component.extend({
    boundText: "inner",
    truthy: true,
    obj: {},
    layout: Ember.Handlebars.compile("<p>{{boundText}}</p><p>{{#if truthy}}{{#with obj}}{{yield}}{{/with}}{{/if}}</p>")
  });

  view = Ember.View.create({
    controller: { boundText: "outer", truthy: true, obj: { component: component, truthy: true, boundText: 'insideWith' } },
    template: Ember.Handlebars.compile('{{#with obj}}{{#if truthy}}{{#view component}}{{#if truthy}}{{boundText}}{{/if}}{{/view}}{{/if}}{{/with}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('div p:contains(inner) + p:contains(insideWith)').length, 1, "Yield points at the right context");
});

test("outer keyword doesn't mask inner component property", function () {
  var component = Ember.Component.extend({
    item: "inner",
    layout: Ember.Handlebars.compile("<p>{{item}}</p><p>{{yield}}</p>")
  });

  view = Ember.View.create({
    controller: { boundText: "outer", component: component },
    template: Ember.Handlebars.compile('{{#with boundText as item}}{{#view component}}{{item}}{{/view}}{{/with}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('div p:contains(inner) + p:contains(outer)').length, 1, "inner component property isn't masked by outer keyword");
});

test("inner keyword doesn't mask yield property", function() {
  var component = Ember.Component.extend({
    boundText: "inner",
    layout: Ember.Handlebars.compile("{{#with boundText as item}}<p>{{item}}</p><p>{{yield}}</p>{{/with}}")
  });

  view = Ember.View.create({
    controller: { item: "outer", component: component },
    template: Ember.Handlebars.compile('{{#view component}}{{item}}{{/view}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('div p:contains(inner) + p:contains(outer)').length, 1, "outer property isn't masked by inner keyword");
});

test("can bind a keyword to a component and use it in yield", function() {
  var component = Ember.Component.extend({
    content: null,
    layout: Ember.Handlebars.compile("<p>{{content}}</p><p>{{yield}}</p>")
  });

  view = Ember.View.create({
    controller: { boundText: "outer", component: component },
    template: Ember.Handlebars.compile('{{#with boundText as item}}{{#view component contentBinding="item"}}{{item}}{{/view}}{{/with}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('div p:contains(outer) + p:contains(outer)').length, 1, "component and yield have keyword");

  Ember.run(function() {
    view.set('controller.boundText', 'update');
  });

  equal(view.$('div p:contains(update) + p:contains(update)').length, 1, "keyword has correctly propagated update");
});

test("yield uses the layout context for non component", function() {
  view = Ember.View.create({
    controller: {
      boundText: "outer",
      inner: {
        boundText: "inner"
      }
    },
    layout: Ember.Handlebars.compile("<p>{{boundText}}</p>{{#with inner}}<p>{{yield}}</p>{{/with}}"),
    template: Ember.Handlebars.compile('{{boundText}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal('outerinner', view.$('p').text(), "Yield points at the right context");
});

test("yield view should be a virtual view", function() {
  var component = Ember.Component.extend({
    isParentComponent: true,

    template: Ember.Handlebars.compile('{{view includedComponent}}'),
    layout: Ember.Handlebars.compile('{{yield}}')
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{view component}}'),
    controller: {
      component: component,
      includedComponent: Ember.Component.extend({
        didInsertElement: function() {
          var parentView = this.get('parentView');

          ok(parentView.get('isParentComponent'), "parent view is the parent component");
        }
      })
    }
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });
});


test("adding a layout should not affect the context of normal views", function() {
  var parentView = Ember.View.create({
    context: "ParentContext"
  });

  view = Ember.View.create({
    template:     Ember.Handlebars.compile("View context: {{this}}"),
    context:      "ViewContext",
    _parentView:  parentView
  });

  Ember.run(function() {
    view.createElement();
  });

  equal(view.$().text(), "View context: ViewContext");


  set(view, 'layout', Ember.Handlebars.compile("Layout: {{yield}}"));

  Ember.run(function() {
    view.destroyElement();
    view.createElement();
  });

  equal(view.$().text(), "Layout: View context: ViewContext");

  Ember.run(function() {
    parentView.destroy();
  });
});

test("yield should work for views even if _parentView is null", function() {
  view = Ember.View.create({
    layout:   Ember.Handlebars.compile('Layout: {{yield}}'),
    template: Ember.Handlebars.compile("View Content")
  });

  Ember.run(function() {
    view.createElement();
  });

  equal(view.$().text(), "Layout: View Content");

});

module("Component {{yield}}", {
  setup: function() {},
  teardown: function() {
    Ember.run(function() {
      if (view) {
        view.destroy();
      }
      delete Ember.Handlebars.helpers['inner-component'];
      delete Ember.Handlebars.helpers['outer-component'];
    });
  }
});

test("yield with nested components (#3220)", function(){
  var count = 0;
  var InnerComponent = Ember.Component.extend({
    layout: Ember.Handlebars.compile("{{yield}}"),
    _yield: function (context, options) {
      count++;
      if (count > 1) throw new Ember.Error('is looping');
      return this._super(context, options);
    }
  });

  Ember.Handlebars.helper('inner-component', InnerComponent);

  var OuterComponent = Ember.Component.extend({
    layout: Ember.Handlebars.compile("{{#inner-component}}<span>{{yield}}</span>{{/inner-component}}")
  });

  Ember.Handlebars.helper('outer-component', OuterComponent);

  view = Ember.View.create({
    template: Ember.Handlebars.compile(
      "{{#outer-component}}Hello world{{/outer-component}}"
    )
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('div > span').text(), "Hello world");
});

})();

(function() {
var originalLookup = Ember.lookup, lookup, Tobias, App, view;

module("test Ember.Handlebars.bootstrap", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };
  },
  teardown: function() {
    Ember.TEMPLATES = {};
    Ember.lookup = originalLookup;
    if(App) { Ember.run(App, 'destroy'); }
    if (view) { Ember.run(view, 'destroy'); }
  }
});

function checkTemplate(templateName) {
  Ember.run(function() {
    Ember.Handlebars.bootstrap(Ember.$('#qunit-fixture'));
  });
  var template = Ember.TEMPLATES[templateName];
  ok(template, 'template is available on Ember.TEMPLATES');
  equal(Ember.$('#qunit-fixture script').length, 0, 'script removed');
  var view = Ember.View.create({
    template: template,
    context: {
      firstName: 'Tobias',
      drug: 'teamocil'
    }
  });
  Ember.run(function() {
    view.createElement();
  });
  equal(Ember.$.trim(view.$().text()), 'Tobias takes teamocil', 'template works');
  Ember.run(function() {
    view.destroy();
  });
}

test('template with data-template-name should add a new template to Ember.TEMPLATES', function() {
  Ember.$('#qunit-fixture').html('<script type="text/x-handlebars" data-template-name="funkyTemplate">{{firstName}} takes {{drug}}</script>');

  checkTemplate('funkyTemplate');
});

test('template with id instead of data-template-name should add a new template to Ember.TEMPLATES', function() {
  Ember.$('#qunit-fixture').html('<script type="text/x-handlebars" id="funkyTemplate" >{{firstName}} takes {{drug}}</script>');

  checkTemplate('funkyTemplate');
});

test('template without data-template-name or id should default to application', function() {
  Ember.$('#qunit-fixture').html('<script type="text/x-handlebars">{{firstName}} takes {{drug}}</script>');

  checkTemplate('application');
});

test('template with type text/x-raw-handlebars should be parsed', function() {
  Ember.$('#qunit-fixture').html('<script type="text/x-raw-handlebars" data-template-name="funkyTemplate">{{name}}</script>');

  Ember.run(function() {
    Ember.Handlebars.bootstrap(Ember.$('#qunit-fixture'));
  });

  ok(Ember.TEMPLATES['funkyTemplate'], 'template with name funkyTemplate available');

  // This won't even work with Ember templates
  equal(Ember.$.trim(Ember.TEMPLATES['funkyTemplate']({ name: 'Tobias' })), "Tobias");
});

test('duplicated default application templates should throw exception', function() {
  Ember.$('#qunit-fixture').html('<script type="text/x-handlebars">first</script><script type="text/x-handlebars">second</script>');

  throws(function () {
    Ember.Handlebars.bootstrap(Ember.$('#qunit-fixture'));
  },
  /Template named "[^"]+" already exists\./,
  "duplicate templates should not be allowed");
});

test('default application template and id application template present should throw exception', function() {
  Ember.$('#qunit-fixture').html('<script type="text/x-handlebars">first</script><script type="text/x-handlebars" id="application">second</script>');

  throws(function () {
    Ember.Handlebars.bootstrap(Ember.$('#qunit-fixture'));
  },
  /Template named "[^"]+" already exists\./,
  "duplicate templates should not be allowed");
});

test('default application template and data-template-name application template present should throw exception', function() {
  Ember.$('#qunit-fixture').html('<script type="text/x-handlebars">first</script><script type="text/x-handlebars" data-template-name="application">second</script>');

  throws(function () {
    Ember.Handlebars.bootstrap(Ember.$('#qunit-fixture'));
  },
  /Template named "[^"]+" already exists\./,
  "duplicate templates should not be allowed");
});

test('duplicated template id should throw exception', function() {
  Ember.$('#qunit-fixture').html('<script type="text/x-handlebars" id="funkyTemplate">first</script><script type="text/x-handlebars" id="funkyTemplate">second</script>');

  throws(function () {
    Ember.Handlebars.bootstrap(Ember.$('#qunit-fixture'));
  },
  /Template named "[^"]+" already exists\./,
  "duplicate templates should not be allowed");
});

test('duplicated template data-template-name should throw exception', function() {
  Ember.$('#qunit-fixture').html('<script type="text/x-handlebars" data-template-name="funkyTemplate">first</script><script type="text/x-handlebars" data-template-name="funkyTemplate">second</script>');

  throws(function () {
    Ember.Handlebars.bootstrap(Ember.$('#qunit-fixture'));
  },
  /Template named "[^"]+" already exists\./,
  "duplicate templates should not be allowed");
});

if (Ember.component) {
  test('registerComponents initializer', function(){
    Ember.TEMPLATES['components/x-apple'] = 'asdf';

    App = Ember.run(Ember.Application, 'create');

    ok(Ember.Handlebars.helpers['x-apple'], 'x-apple helper is present');
    ok(App.__container__.has('component:x-apple'), 'the container is aware of x-apple');
  });

  test('registerComponents and generated components', function(){
    Ember.TEMPLATES['components/x-apple'] = 'asdf';

    App = Ember.run(Ember.Application, 'create');
    view = App.__container__.lookup('component:x-apple');
    equal(view.get('layoutName'), 'components/x-apple', 'has correct layout name');
  });

  test('registerComponents and non-geneated components', function(){
    Ember.TEMPLATES['components/x-apple'] = 'asdf';

    Ember.run(function(){
      App = Ember.Application.create();

      // currently Component code must be loaded before initializers
      // this is mostly due to how they are bootstrapped. We will hopefully
      // sort this out soon.
      App.XAppleComponent = Ember.Component.extend({
        isCorrect: true
      });
    });

    view = App.__container__.lookup('component:x-apple');
    equal(view.get('layoutName'), 'components/x-apple', 'has correct layout name');
    ok(view.get('isCorrect'), 'ensure a non-generated component');
  });
}

})();

(function() {
module("Ember.Handlebars.resolveParams");

test("Raw string parameters should be returned as Strings", function() {
  var params = Ember.Handlebars.resolveParams({}, ["foo", "bar", "baz"], { types: ["STRING", "STRING", "STRING"] });
  deepEqual(params, ["foo", "bar", "baz"]);
});

test("Raw boolean parameters should be returned as Booleans", function() {
  var params = Ember.Handlebars.resolveParams({}, [true, false], { types: ["BOOLEAN", "BOOLEAN"] });
  deepEqual(params, [true, false]);
});

test("Raw numeric parameters should be returned as Numbers", function() {
  var params = Ember.Handlebars.resolveParams({}, [1, 1.0, 1.5, 0.5], { types: ["NUMBER", "NUMBER", "NUMBER", "NUMBER"] });
  deepEqual(params, [1, 1, 1.5, 0.5]);
});

test("ID parameters should be looked up on the context", function() {
  var context = {
    salutation: "Mr",
    name: {
      first: "Tom",
      last: "Dale"
    }
  };

  var params = Ember.Handlebars.resolveParams(context, ["salutation", "name.first", "name.last"], { types: ["ID", "ID", "ID"] });
  deepEqual(params, ["Mr", "Tom", "Dale"]);
});

if (Ember.FEATURES.isEnabled("ember-handlebars-caps-lookup")) {
  test("ID parameters that start with capital letters use Ember.lookup as their context", function() {
    Ember.lookup.FOO = "BAR";

    var context = { FOO: "BAZ" };

    var params = Ember.Handlebars.resolveParams(context, ["FOO"], { types: ["ID"] });
    deepEqual(params, ["BAR"]);
  });
}

test("ID parameters can look up keywords", function() {
  var controller = {
    salutation: "Mr"
  };

  var view = {
    name: { first: "Tom", last: "Dale" }
  };

  var context = {
    yuno: "State Charts"
  };

  var options = {
    types: ["ID", "ID", "ID", "ID"],
    data: {
      keywords: {
        controller: controller,
        view: view
      }
    }
  };

  var params = Ember.Handlebars.resolveParams(context, ["controller.salutation", "view.name.first", "view.name.last", "yuno"], options);
  deepEqual(params, ["Mr", "Tom", "Dale", "State Charts"]);
});

module("Ember.Handlebars.resolveHash");

test("Raw string parameters should be returned as Strings", function() {
  var hash = Ember.Handlebars.resolveHash({}, { string: "foo" }, { hashTypes: { string: "STRING" } });
  deepEqual(hash, { string: "foo" });
});

test("Raw boolean parameters should be returned as Booleans", function() {
  var hash = Ember.Handlebars.resolveHash({}, { yes: true, no: false }, { hashTypes: { yes: "BOOLEAN", no: "BOOLEAN" } });
  deepEqual(hash, { yes: true, no: false });
});

test("Raw numeric parameters should be returned as Numbers", function() {
  var hash = Ember.Handlebars.resolveHash({}, { one: 1, oneFive: 1.5, ohFive: 0.5 }, { hashTypes: { one: "NUMBER", oneFive: "NUMBER", ohFive: "NUMBER" } });
  deepEqual(hash, { one: 1, oneFive: 1.5, ohFive: 0.5 });
});

test("ID parameters should be looked up on the context", function() {
  var context = {
    salutation: "Mr",
    name: {
      first: "Tom",
      last: "Dale"
    }
  };

  var hash = Ember.Handlebars.resolveHash(context, { mr: "salutation", firstName: "name.first", lastName: "name.last" }, { hashTypes: { mr: "ID", firstName: "ID", lastName: "ID" } });
  deepEqual(hash, { mr: "Mr", firstName: "Tom", lastName: "Dale" });
});

test("ID parameters can look up keywords", function() {
  var controller = {
    salutation: "Mr"
  };

  var view = {
    name: { first: "Tom", last: "Dale" }
  };

  var context = {
    yuno: "State Charts"
  };

  var options = {
    hashTypes: { mr: "ID", firstName: "ID", lastName: "ID", yuno: "ID" },
    data: {
      keywords: {
        controller: controller,
        view: view
      }
    }
  };

  var hash = Ember.Handlebars.resolveHash(context, { mr: "controller.salutation", firstName: "view.name.first", lastName: "view.name.last", yuno: "yuno" }, options);
  deepEqual(hash, { mr: "Mr", firstName: "Tom", lastName: "Dale", yuno: "State Charts" });
});

})();

(function() {
/*globals TemplateTests:true App:true */

var set = Ember.set, get = Ember.get, trim = Ember.$.trim;
var firstGrandchild = function(view) {
  return get(get(view, 'childViews').objectAt(0), 'childViews').objectAt(0);
};
var nthChild = function(view, nth) {
  return get(view, 'childViews').objectAt(nth || 0);
};
var firstChild = nthChild;

var originalLookup = Ember.lookup, lookup, TemplateTests, view;

module("ember-handlebars/tests/views/collection_view_test", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };
    lookup.TemplateTests = TemplateTests = Ember.Namespace.create();
  },
  teardown: function() {
    Ember.run(function() {
      if (view) {
        view.destroy();
      }
    });

    Ember.lookup = originalLookup;
    Ember.TESTING_DEPRECATION = false;
  }
});

test("passing a block to the collection helper sets it as the template for example views", function() {
  TemplateTests.CollectionTestView = Ember.CollectionView.extend({
    tagName: 'ul',
    content: Ember.A(['foo', 'bar', 'baz'])
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection TemplateTests.CollectionTestView}} <label></label> {{/collection}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('label').length, 3, 'one label element is created for each content item');
});

test("collection helper should accept relative paths", function() {
  Ember.TESTING_DEPRECATION = true;

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection view.collection}} <label></label> {{/collection}}'),
    collection: Ember.CollectionView.extend({
      tagName: 'ul',
      content: Ember.A(['foo', 'bar', 'baz'])
    })
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('label').length, 3, 'one label element is created for each content item');
});

test("empty views should be removed when content is added to the collection (regression, ht: msofaer)", function() {
  var App;

  Ember.run(function() {
    lookup.App = App = Ember.Application.create();
  });

  App.EmptyView = Ember.View.extend({
    template : Ember.Handlebars.compile("<td>No Rows Yet</td>")
  });

  App.ListView = Ember.CollectionView.extend({
    emptyView: App.EmptyView
  });

  App.listController = Ember.ArrayProxy.create({
    content : Ember.A()
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection App.ListView contentBinding="App.listController" tagName="table"}} <td>{{view.content.title}}</td> {{/collection}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('tr').length, 1, 'Make sure the empty view is there (regression)');

  Ember.run(function() {
    App.listController.pushObject({title : "Go Away, Placeholder Row!"});
  });

  equal(view.$('tr').length, 1, 'has one row');
  equal(view.$('tr:nth-child(1) td').text(), 'Go Away, Placeholder Row!', 'The content is the updated data.');

  Ember.run(function() { App.destroy(); });
});

test("should be able to specify which class should be used for the empty view", function() {
  Ember.TESTING_DEPRECATION = true;

  var App;

  Ember.run(function() {
    lookup.App = App = Ember.Application.create();
  });

  App.EmptyView = Ember.View.extend({
    template: Ember.Handlebars.compile('This is an empty view')
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{collection emptyViewClass="App.EmptyView"}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$().text(), 'This is an empty view', "Empty view should be rendered.");

  Ember.run(function() {
    App.destroy();
  });
});

test("if no content is passed, and no 'else' is specified, nothing is rendered", function() {
  TemplateTests.CollectionTestView = Ember.CollectionView.extend({
    tagName: 'ul',
    content: Ember.A()
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection "TemplateTests.CollectionTestView"}} <aside></aside> {{/collection}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('li').length, 0, 'if no "else" is specified, nothing is rendered');
});

test("if no content is passed, and 'else' is specified, the else block is rendered", function() {
  TemplateTests.CollectionTestView = Ember.CollectionView.extend({
    tagName: 'ul',
    content: Ember.A()
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection "TemplateTests.CollectionTestView"}} <aside></aside> {{ else }} <del></del> {{/collection}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('li:has(del)').length, 1, 'the else block is rendered');
});

test("a block passed to a collection helper defaults to the content property of the context", function() {
  TemplateTests.CollectionTestView = Ember.CollectionView.extend({
    tagName: 'ul',
    content: Ember.A(['foo', 'bar', 'baz'])
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection "TemplateTests.CollectionTestView"}} <label>{{view.content}}</label> {{/collection}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('li:nth-child(1) label').length, 1);
  equal(view.$('li:nth-child(1) label').text(), 'foo');
  equal(view.$('li:nth-child(2) label').length, 1);
  equal(view.$('li:nth-child(2) label').text(), 'bar');
  equal(view.$('li:nth-child(3) label').length, 1);
  equal(view.$('li:nth-child(3) label').text(), 'baz');
});

test("a block passed to a collection helper defaults to the view", function() {
  TemplateTests.CollectionTestView = Ember.CollectionView.extend({
    tagName: 'ul',
    content: Ember.A(['foo', 'bar', 'baz'])
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection "TemplateTests.CollectionTestView"}} <label>{{view.content}}</label> {{/collection}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  // Preconds
  equal(view.$('li:nth-child(1) label').length, 1);
  equal(view.$('li:nth-child(1) label').text(), 'foo');
  equal(view.$('li:nth-child(2) label').length, 1);
  equal(view.$('li:nth-child(2) label').text(), 'bar');
  equal(view.$('li:nth-child(3) label').length, 1);
  equal(view.$('li:nth-child(3) label').text(), 'baz');

  Ember.run(function() {
    set(firstChild(view), 'content', Ember.A());
  });
  equal(view.$('label').length, 0, "all list item views should be removed from DOM");
});

test("should include an id attribute if id is set in the options hash", function() {
  TemplateTests.CollectionTestView = Ember.CollectionView.extend({
    tagName: 'ul',
    content: Ember.A(['foo', 'bar', 'baz'])
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection "TemplateTests.CollectionTestView" id="baz"}}foo{{/collection}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('ul#baz').length, 1, "adds an id attribute");
});

test("should give its item views the class specified by itemClass", function() {
  TemplateTests.itemClassTestCollectionView = Ember.CollectionView.extend({
    tagName: 'ul',
    content: Ember.A(['foo', 'bar', 'baz'])
  });
  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection "TemplateTests.itemClassTestCollectionView" itemClass="baz"}}foo{{/collection}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('ul li.baz').length, 3, "adds class attribute");
});

test("should give its item views the classBinding specified by itemClassBinding", function() {
  TemplateTests.itemClassBindingTestCollectionView = Ember.CollectionView.extend({
    tagName: 'ul',
    content: Ember.A([Ember.Object.create({ isBaz: false }), Ember.Object.create({ isBaz: true }), Ember.Object.create({ isBaz: true })])
  });

  view = Ember.View.create({
    isBar: true,
    template: Ember.Handlebars.compile('{{#collection "TemplateTests.itemClassBindingTestCollectionView" itemClassBinding="view.isBar"}}foo{{/collection}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('ul li.is-bar').length, 3, "adds class on initial rendering");

  // NOTE: in order to bind an item's class to a property of the item itself (e.g. `isBaz` above), it will be necessary
  // to introduce a new keyword that could be used from within `itemClassBinding`. For instance, `itemClassBinding="item.isBaz"`.
});

test("should give its item views the property specified by itemPropertyBinding", function() {
  Ember.TESTING_DEPRECATION = true;

  TemplateTests.itemPropertyBindingTestItemView = Ember.View.extend({
    tagName: 'li'
  });

  // Use preserveContext=false so the itemView handlebars context is the view context
  // Set itemView bindings using item*
  view = Ember.View.create({
    baz: "baz",
    content: Ember.A([Ember.Object.create(), Ember.Object.create(), Ember.Object.create()]),
    template: Ember.Handlebars.compile('{{#collection contentBinding="view.content" tagName="ul" itemViewClass="TemplateTests.itemPropertyBindingTestItemView" itemPropertyBinding="view.baz" preserveContext=false}}{{view.property}}{{/collection}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('ul li').length, 3, "adds 3 itemView");

  view.$('ul li').each(function(i, li) {
    equal(Ember.$(li).text(), "baz", "creates the li with the property = baz");
  });

  Ember.run(function() {
    set(view, 'baz', "yobaz");
  });

  equal(view.$('ul li:first').text(), "yobaz", "change property of sub view");
});

test("should work inside a bound {{#if}}", function() {
  var testData = Ember.A([Ember.Object.create({ isBaz: false }), Ember.Object.create({ isBaz: true }), Ember.Object.create({ isBaz: true })]);
  TemplateTests.ifTestCollectionView = Ember.CollectionView.extend({
    tagName: 'ul',
    content: testData
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#if view.shouldDisplay}}{{#collection "TemplateTests.ifTestCollectionView"}}{{content.isBaz}}{{/collection}}{{/if}}'),
    shouldDisplay: true
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('ul li').length, 3, "renders collection when conditional is true");

  Ember.run(function() { set(view, 'shouldDisplay', false); });
  equal(view.$('ul li').length, 0, "removes collection when conditional changes to false");

  Ember.run(function() { set(view, 'shouldDisplay', true); });
  equal(view.$('ul li').length, 3, "collection renders when conditional changes to true");
});

test("should pass content as context when using {{#each}} helper", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#each view.releases}}Mac OS X {{version}}: {{name}} {{/each}}'),

    releases: Ember.A([
                { version: '10.7',
                  name: 'Lion' },
                { version: '10.6',
                  name: 'Snow Leopard' },
                { version: '10.5',
                  name: 'Leopard' }
              ])
  });

  Ember.run(function() { view.appendTo('#qunit-fixture'); });

  equal(view.$().text(), "Mac OS X 10.7: Lion Mac OS X 10.6: Snow Leopard Mac OS X 10.5: Leopard ", "prints each item in sequence");
});

test("should re-render when the content object changes", function() {
  TemplateTests.RerenderTest = Ember.CollectionView.extend({
    tagName: 'ul',
    content: Ember.A()
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection TemplateTests.RerenderTest}}{{view.content}}{{/collection}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  Ember.run(function() {
    set(firstChild(view), 'content', Ember.A(['bing', 'bat', 'bang']));
  });

  Ember.run(function() {
    set(firstChild(view), 'content', Ember.A(['ramalamadingdong']));
  });

  equal(view.$('li').length, 1, "rerenders with correct number of items");
  equal(trim(view.$('li:eq(0)').text()), "ramalamadingdong");

});

test("select tagName on collection helper automatically sets child tagName to option", function() {
  TemplateTests.RerenderTest = Ember.CollectionView.extend({
    content: Ember.A(['foo'])
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection TemplateTests.RerenderTest tagName="select"}}{{view.content}}{{/collection}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('option').length, 1, "renders the correct child tag name");

});

test("tagName works in the #collection helper", function() {
  TemplateTests.RerenderTest = Ember.CollectionView.extend({
    content: Ember.A(['foo', 'bar'])
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection TemplateTests.RerenderTest tagName="ol"}}{{view.content}}{{/collection}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('ol').length, 1, "renders the correct tag name");
  equal(view.$('li').length, 2, "rerenders with correct number of items");

  Ember.run(function() {
    set(firstChild(view), 'content', Ember.A(['bing', 'bat', 'bang']));
  });

  equal(view.$('li').length, 3, "rerenders with correct number of items");
  equal(trim(view.$('li:eq(0)').text()), "bing");
});

test("should render nested collections", function() {

  TemplateTests.InnerList = Ember.CollectionView.extend({
    tagName: 'ul',
    content: Ember.A(['one','two','three'])
  });

  TemplateTests.OuterList = Ember.CollectionView.extend({
    tagName: 'ul',
    content: Ember.A(['foo'])
  });

  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#collection TemplateTests.OuterList class="outer"}}{{content}}{{#collection TemplateTests.InnerList class="inner"}}{{content}}{{/collection}}{{/collection}}')
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('ul.outer > li').length, 1, "renders the outer list with correct number of items");
  equal(view.$('ul.inner').length, 1, "the inner list exsits");
  equal(view.$('ul.inner > li').length, 3, "renders the inner list with correct number of items");

});

test("should render multiple, bound nested collections (#68)", function() {
  var view;

  Ember.run(function() {
    TemplateTests.contentController = Ember.ArrayProxy.create({
      content: Ember.A(['foo','bar'])
    });

    TemplateTests.InnerList = Ember.CollectionView.extend({
      tagName: 'ul',
      contentBinding: 'parentView.innerListContent'
    });

    TemplateTests.OuterListItem = Ember.View.extend({
      template: Ember.Handlebars.compile('{{#collection TemplateTests.InnerList class="inner"}}{{content}}{{/collection}}{{content}}'),
      innerListContent: Ember.computed(function() {
        return Ember.A([1,2,3]);
      })
    });

    TemplateTests.OuterList = Ember.CollectionView.extend({
      tagName: 'ul',
      contentBinding: 'TemplateTests.contentController',
      itemViewClass: TemplateTests.OuterListItem
    });

    view = Ember.View.create({
      template: Ember.Handlebars.compile('{{collection TemplateTests.OuterList class="outer"}}')
    });
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$('ul.outer > li').length, 2, "renders the outer list with correct number of items");
  equal(view.$('ul.inner').length, 2, "renders the correct number of inner lists");
  equal(view.$('ul.inner:first > li').length, 3, "renders the first inner list with correct number of items");
  equal(view.$('ul.inner:last > li').length, 3, "renders the second list with correct number of items");

  Ember.run(function() {
    view.destroy();
  });
});

test("should allow view objects to be swapped out without throwing an error (#78)", function() {
  var view, dataset, secondDataset;

  Ember.run(function() {
    TemplateTests.datasetController = Ember.Object.create();

    TemplateTests.ReportingView = Ember.View.extend({
      datasetBinding: 'TemplateTests.datasetController.dataset',
      readyBinding: 'dataset.ready',
      itemsBinding: 'dataset.items',
      template: Ember.Handlebars.compile("{{#if view.ready}}{{collection TemplateTests.CollectionView}}{{else}}Loading{{/if}}")
    });

    TemplateTests.CollectionView = Ember.CollectionView.extend({
      contentBinding: 'parentView.items',
      tagName: 'ul',
      template: Ember.Handlebars.compile("{{view.content}}")
    });

    view = TemplateTests.ReportingView.create();
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$().text(), "Loading", "renders the loading text when the dataset is not ready");

  Ember.run(function() {
    dataset = Ember.Object.create({
      ready: true,
      items: Ember.A([1,2,3])
    });
    TemplateTests.datasetController.set('dataset',dataset);
  });

  equal(view.$('ul > li').length, 3, "renders the collection with the correct number of items when the dataset is ready");

  Ember.run(function() {
    secondDataset = Ember.Object.create({ready: false});
    TemplateTests.datasetController.set('dataset',secondDataset);
  });

  equal(view.$().text(), "Loading", "renders the loading text when the second dataset is not ready");

  Ember.run(function() {
    view.destroy();
  });
});

test("context should be content", function() {
  var App, view;

  Ember.run(function() {
    lookup.App = App = Ember.Application.create();
  });

  App.items = Ember.A([
    Ember.Object.create({name: 'Dave'}),
    Ember.Object.create({name: 'Mary'}),
    Ember.Object.create({name: 'Sara'})
  ]);

  App.AnItemView = Ember.View.extend({
    template: Ember.Handlebars.compile("Greetings {{name}}")
  });

  App.AView = Ember.View.extend({
    template: Ember.Handlebars.compile('{{collection contentBinding="App.items" itemViewClass="App.AnItemView"}}')
  });

  Ember.run(function() {
    view = App.AView.create();
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(view.$().text(), "Greetings DaveGreetings MaryGreetings Sara");

  Ember.run(function() {
    view.destroy();
    App.destroy();
  });
});

})();

(function() {
var view, childView, metamorphView;

module("Metamorph views", {
  setup: function() {
    view = Ember.View.create({
      render: function(buffer) {
        buffer.push("<h1>View</h1>");
        this.appendChild(metamorphView);
      }
    });
  },

  teardown: function() {
    Ember.run(function() {
      view.destroy();
      if (childView && !childView.isDestroyed) {
        childView.destroy();
      }

      if (metamorphView && !metamorphView.isDestroyed) {
        metamorphView.destroy();
      }
    });
  }
});

var get = Ember.get, set = Ember.set;

test("a Metamorph view is not a view's parentView", function() {
  childView = Ember.View.create({
    render: function(buffer) {
      buffer.push("<p>Bye bros</p>");
    }
  });

  metamorphView = Ember._MetamorphView.create({
    render: function(buffer) {
      buffer.push("<h2>Meta</h2>");
      this.appendChild(childView);
    }
  });

  Ember.run(function() {
    view.appendTo("#qunit-fixture");
  });

  equal(get(childView, 'parentView'), view, "A child of a metamorph view cannot see the metamorph view as its parent");

  var children = get(view, 'childViews');

  equal(get(children, 'length'), 1, "precond - there is only one child of the main node");
  equal(children.objectAt(0), childView, "... and it is not the metamorph");
});

module("Metamorph views correctly handle DOM", {
  setup: function() {
    view = Ember.View.create({
      render: function(buffer) {
        buffer.push("<h1>View</h1>");
        this.appendChild(metamorphView);
      }
    });

    metamorphView = Ember._MetamorphView.create({
      powerRanger: "Jason",

      render: function(buffer) {
        buffer.push("<h2 id='from-meta'>"+get(this, 'powerRanger')+"</h2>");
      }
    });

    Ember.run(function() {
      view.appendTo("#qunit-fixture");
    });
  },

  teardown: function() {
    Ember.run(function() {
      view.destroy();
      if (!metamorphView.isDestroyed) {
        metamorphView.destroy();
      }
    });
  }
});

test("a metamorph view generates without a DOM node", function() {
  var meta = Ember.$("> h2", "#" + get(view, 'elementId'));

  equal(meta.length, 1, "The metamorph element should be directly inside its parent");
});

test("a metamorph view can be removed from the DOM", function() {
  Ember.run(function() {
    metamorphView.destroy();
  });

  var meta = Ember.$('#from-morph');
  equal(meta.length, 0, "the associated DOM was removed");
});

test("a metamorph view can be rerendered", function() {
  equal(Ember.$('#from-meta').text(), "Jason", "precond - renders to the DOM");

  set(metamorphView, 'powerRanger', 'Trini');
  Ember.run(function() {
    metamorphView.rerender();
  });

  equal(Ember.$('#from-meta').text(), "Trini", "updates value when re-rendering");
});


// Redefining without setup/teardown
module("Metamorph views correctly handle DOM");

test("a metamorph view calls its childrens' willInsertElement and didInsertElement", function() {
  var parentView;
  var willInsertElementCalled = false;
  var didInsertElementCalled = false;
  var didInsertElementSawElement = false;

  parentView = Ember.View.create({
    ViewWithCallback: Ember.View.extend({
      template: Ember.Handlebars.compile('<div id="do-i-exist"></div>'),

      willInsertElement: function() {
        willInsertElementCalled = true;
      },
      didInsertElement: function() {
        didInsertElementCalled = true;
        didInsertElementSawElement = (this.$('div').length === 1);
      }
    }),

    template: Ember.Handlebars.compile('{{#if view.condition}}{{view "view.ViewWithCallback"}}{{/if}}'),
    condition: false
  });

  Ember.run(function() {
    parentView.append();
  });
  Ember.run(function() {
    parentView.set('condition', true);
  });

  ok(willInsertElementCalled, "willInsertElement called");
  ok(didInsertElementCalled, "didInsertElement called");
  ok(didInsertElementSawElement, "didInsertElement saw element");

  Ember.run(function() {
    parentView.destroy();
  });

});

test("replacing a Metamorph should invalidate childView elements", function() {
  var elementOnDidChange, elementOnDidInsert;

  view = Ember.View.create({
    show: false,

    CustomView: Ember.View.extend({
      init: function() {
        this._super();
        // This will be called in preRender
        // We want it to cache a null value
        // Hopefully it will be invalidated when `show` is toggled
        this.get('element');
      },

      elementDidChange: Ember.observer('element', function() {
        elementOnDidChange = this.get('element');
      }),

      didInsertElement: function() {
        elementOnDidInsert = this.get('element');
      }
    }),

    template: Ember.Handlebars.compile("{{#if view.show}}{{view view.CustomView}}{{/if}}")
  });

  Ember.run(function() { view.append(); });

  Ember.run(function() { view.set('show', true); });

  ok(elementOnDidChange, "should have an element on change");
  ok(elementOnDidInsert, "should have an element on insert");

  Ember.run(function() { view.destroy(); });
});

test("trigger rerender of parent and SimpleHandlebarsView", function () {
  var view = Ember.View.create({
    show: true,
    foo: 'bar',
    template: Ember.Handlebars.compile("{{#if view.show}}{{#if view.foo}}{{view.foo}}{{/if}}{{/if}}")
  });

  Ember.run(function() { view.append(); });

  equal(view.$().text(), 'bar');

  Ember.run(function() {
    view.set('foo', 'baz'); // schedule render of simple bound
    view.set('show', false); // destroy tree
  });

  equal(view.$().text(), '');

  Ember.run(function() {
    view.destroy();
  });
});

test("re-rendering and then changing the property does not raise an exception", function() {
  view = Ember.View.create({
    show: true,
    foo: 'bar',
    metamorphView: Ember._MetamorphView,
    template: Ember.Handlebars.compile("{{#view view.metamorphView}}truth{{/view}}")
  });

  Ember.run(function() { view.appendTo('#qunit-fixture'); });

  equal(view.$().text(), 'truth');

  Ember.run(function() {
    view.get('_childViews')[0].rerender();
    view.get('_childViews')[0].rerender();
  });

  equal(view.$().text(), 'truth');

  Ember.run(function() {
    view.destroy();
  });
});

})();

