(function() {
var App, find, click, fillIn, currentRoute, visit, originalAdapter, andThen;

module("ember-testing Acceptance", {
  setup: function() {
    Ember.$('<style>#ember-testing-container { position: absolute; background: white; bottom: 0; right: 0; width: 640px; height: 384px; overflow: auto; z-index: 9999; border: 1px solid #ccc; } #ember-testing { zoom: 50%; }</style>').appendTo('head');
    Ember.$('<div id="ember-testing-container"><div id="ember-testing"></div></div>').appendTo('body');
    Ember.run(function() {
      App = Ember.Application.create({
        rootElement: '#ember-testing'
      });

      App.Router.map(function() {
        this.route('posts');
        this.route('comments');

        this.route('abort_transition');
      });

      App.PostsRoute = Ember.Route.extend({
        renderTemplate: function() {
          currentRoute = 'posts';
          this._super();
        }
      });

      App.PostsView = Ember.View.extend({
        defaultTemplate: Ember.Handlebars.compile("<a class=\"dummy-link\"></a><div id=\"comments-link\">{{#link-to 'comments'}}Comments{{/link-to}}</div>"),
        classNames: ['posts-view']
      });

      App.CommentsRoute = Ember.Route.extend({
        renderTemplate: function() {
          currentRoute = 'comments';
          this._super();
        }
      });

      App.CommentsView = Ember.View.extend({
        defaultTemplate: Ember.Handlebars.compile("{{input type=text}}")
      });

      App.AbortTransitionRoute = Ember.Route.extend({
        beforeModel: function(transition) {
          transition.abort();
        }
      });

      App.setupForTesting();
    });

    App.injectTestHelpers();

    find = window.find;
    click = window.click;
    fillIn = window.fillIn;
    visit = window.visit;
    andThen = window.andThen;

    originalAdapter = Ember.Test.adapter;
  },

  teardown: function() {
    App.removeTestHelpers();
    Ember.$('#ember-testing-container, #ember-testing').remove();
    Ember.run(App, App.destroy);
    App = null;
    Ember.Test.adapter = originalAdapter;
  }
});

test("helpers can be chained with then", function() {
  expect(5);

  currentRoute = 'index';

  visit('/posts').then(function() {
    equal(currentRoute, 'posts', "Successfully visited posts route");
    return click('a:contains("Comments")');
  }).then(function() {
    equal(currentRoute, 'comments', "visit chained with click");
    return fillIn('.ember-text-field', "yeah");
  }).then(function() {
    equal(Ember.$('.ember-text-field').val(), 'yeah', "chained with fillIn");
    return fillIn('.ember-text-field', '#ember-testing-container', "context working");
  }).then(function() {
    equal(Ember.$('.ember-text-field').val(), 'context working', "chained with fillIn");
    return click(".does-not-exist");
  }).then(null, function(e) {
    equal(e.message, "Element .does-not-exist not found.", "Non-existent click exception caught");
  });
});



// Keep this for backwards compatibility

test("helpers can be chained to each other", function() {
  expect(4);

  currentRoute = 'index';

  visit('/posts')
  .click('a:first', '#comments-link')
  .fillIn('.ember-text-field', "hello")
  .then(function() {
    equal(currentRoute, 'comments', "Successfully visited comments route");
    equal(Ember.$('.ember-text-field').val(), 'hello', "Fillin successfully works");
    find('.ember-text-field').one('keypress', function(e) {
      equal(e.keyCode, 13, "keyevent chained with correct keyCode.");
    });
  })
  .keyEvent('.ember-text-field', 'keypress', 13)
  .visit('/posts')
  .then(function() {
    equal(currentRoute, 'posts', "Thens can also be chained to helpers");
  });
});

test("helpers don't need to be chained", function() {
  expect(3);

  currentRoute = 'index';

  visit('/posts');

  click('a:first', '#comments-link');

  fillIn('.ember-text-field', "hello");

  andThen(function() {
    equal(currentRoute, 'comments', "Successfully visited comments route");
    equal(find('.ember-text-field').val(), 'hello', "Fillin successfully works");
  });

  visit('/posts');

  andThen(function() {
    equal(currentRoute, 'posts');
  });
});

test("Nested async helpers", function() {
  expect(3);

  currentRoute = 'index';

  visit('/posts');

  andThen(function() {
    click('a:first', '#comments-link');

    fillIn('.ember-text-field', "hello");
  });

  andThen(function() {
    equal(currentRoute, 'comments', "Successfully visited comments route");
    equal(find('.ember-text-field').val(), 'hello', "Fillin successfully works");
  });

  visit('/posts');

  andThen(function() {
    equal(currentRoute, 'posts');
  });
});

test("Helpers nested in thens", function() {
  expect(3);

  currentRoute = 'index';

  visit('/posts').then(function() {
    click('a:first', '#comments-link');
  });

  andThen(function() {
    fillIn('.ember-text-field', "hello");
  });

  andThen(function() {
    equal(currentRoute, 'comments', "Successfully visited comments route");
    equal(find('.ember-text-field').val(), 'hello', "Fillin successfully works");
  });

  visit('/posts');

  andThen(function() {
    equal(currentRoute, 'posts');
  });
});

test("Aborted transitions are not logged via Ember.Test.adapter#exception", function () {
  expect(0);

  Ember.Test.adapter = Ember.Test.QUnitAdapter.create({
    exception: function(error) {
      ok(false, "aborted transitions are not logged");
    }
  });

  visit("/abort_transition");
});

test("Unhandled exceptions are logged via Ember.Test.adapter#exception", function () {
  expect(2);

  var asyncHandled;
  Ember.Test.adapter = Ember.Test.QUnitAdapter.create({
    exception: function(error) {
      equal(error.message, "Element .does-not-exist not found.", "Exception successfully caught and passed to Ember.Test.adapter.exception");
      asyncHandled['catch'](function(){ }); // handle the rejection so it doesn't leak later.
    }
  });

  visit('/posts');

  click(".invalid-element").then(null, function(error) {
    equal(error.message, "Element .invalid-element not found.", "Exception successfully handled in the rejection handler");
  });

  asyncHandled = click(".does-not-exist");
});

})();

(function() {
var App, originalAdapter;

module("ember-testing Adapters", {
  setup: function() {
    originalAdapter = Ember.Test.adapter;
  },
  teardown: function() {
    Ember.run(App, App.destroy);
    App.removeTestHelpers();
    App = null;

    Ember.Test.adapter = originalAdapter;
  }
});

test("Setting a test adapter manually", function() {
  expect(1);
  var CustomAdapter;

  CustomAdapter = Ember.Test.Adapter.extend({
    asyncStart: function() {
      ok(true, "Correct adapter was used");
    }
  });

  Ember.run(function() {
    App = Ember.Application.create();
    Ember.Test.adapter = CustomAdapter.create();
    App.setupForTesting();
  });

  Ember.Test.adapter.asyncStart();
});

test("QUnitAdapter is used by default", function() {
  expect(1);

  Ember.Test.adapter = null;

  Ember.run(function() {
    App = Ember.Application.create();
    App.setupForTesting();
  });

  ok(Ember.Test.adapter instanceof Ember.Test.QUnitAdapter);
});

})();

(function() {
var App, appBooted, helperContainer;

function registerHelper(){
  Ember.Test.registerHelper('boot', function(app) {
    Ember.run(app, app.advanceReadiness);
    appBooted = true;
    return app.testHelpers.wait();
  });
}

function unregisterHelper(){
  Ember.Test.unregisterHelper('boot');
}

var originalAdapter = Ember.Test.adapter;

function setupApp(){
  appBooted = false;
  helperContainer = {};

  Ember.run(function() {
    App = Ember.Application.create();
    App.setupForTesting();
    App.injectTestHelpers(helperContainer);
  });
}

function destroyApp(){
  if (App) {
    Ember.run(App, 'destroy');
    App = null;
  }
}

module("Ember.Test - registerHelper/unregisterHelper", {
  teardown: function(){
    Ember.Test.adapter = originalAdapter;
    destroyApp();
  }
});

test("Helper gets registered", function() {
  expect(2);

  registerHelper();
  setupApp();

  ok(App.testHelpers.boot);
  ok(helperContainer.boot);
});

test("Helper is ran when called", function(){
  expect(1);

  registerHelper();
  setupApp();

  App.testHelpers.boot().then(function() {
    ok(appBooted);
  });
});

test("Helper can be unregistered", function(){
  expect(4);

  registerHelper();
  setupApp();

  ok(App.testHelpers.boot);
  ok(helperContainer.boot);

  unregisterHelper();

  setupApp();

  ok(!App.testHelpers.boot, "once unregistered the helper is not added to App.testHelpers");
  ok(!helperContainer.boot, "once unregistered the helper is not added to the helperContainer");
});


})();

(function() {
var set = Ember.set, App, originalAdapter = Ember.Test.adapter;

function cleanup(){
  Ember.Test.adapter = originalAdapter;

  if (App) {
    Ember.run(App, App.destroy);
    App.removeTestHelpers();
    App = null;
  }

  Ember.run(function(){
    Ember.$(document).off('ajaxStart');
    Ember.$(document).off('ajaxStop');
  });

  Ember.TEMPLATES = {};
}

function assertHelpers(application, helperContainer, expected){
  if (!helperContainer) { helperContainer = window; }
  if (expected === undefined) { expected = true; }

  function checkHelperPresent(helper, expected){
    var presentInHelperContainer = !!helperContainer[helper],
        presentInTestHelpers = !!application.testHelpers[helper];

    ok(presentInHelperContainer === expected, "Expected '" + helper + "' to be present in the helper container (defaults to window).");
    ok(presentInTestHelpers === expected, "Expected '" + helper + "' to be present in App.testHelpers.");
  }

  checkHelperPresent('visit', expected);
  checkHelperPresent('click', expected);
  checkHelperPresent('keyEvent', expected);
  checkHelperPresent('fillIn', expected);
  checkHelperPresent('wait', expected);

  if (Ember.FEATURES.isEnabled("ember-testing-triggerEvent-helper")) {
    checkHelperPresent('triggerEvent', expected);
  }
}

function assertNoHelpers(application, helperContainer) {
  assertHelpers(application, helperContainer, false);
}

module("ember-testing Helpers", {
  setup: function(){ cleanup(); },
  teardown: function() { cleanup(); }
});

test("Ember.Application#injectTestHelpers/#removeTestHelpers", function() {
  App = Ember.run(Ember.Application, Ember.Application.create);
  assertNoHelpers(App);

  App.injectTestHelpers();
  assertHelpers(App);

  App.removeTestHelpers();
  assertNoHelpers(App);
});

test("Ember.Application#setupForTesting", function() {
  Ember.run(function() {
    App = Ember.Application.create();
    App.setupForTesting();
  });

  equal(App.__container__.lookup('router:main').location.implementation, 'none');
});

test("Ember.Application.setupForTesting sets the application to `testing`.", function(){
  Ember.run(function() {
    App = Ember.Application.create();
    App.setupForTesting();
  });

  equal(App.testing, true, "Application instance is set to testing.");
});

test("Ember.Application.setupForTesting leaves the system in a deferred state.", function(){
  Ember.run(function() {
    App = Ember.Application.create();
    App.setupForTesting();
  });

  equal(App._readinessDeferrals, 1, "App is in deferred state after setupForTesting.");
});

test("App.reset() after Application.setupForTesting leaves the system in a deferred state.", function(){
  Ember.run(function() {
    App = Ember.Application.create();
    App.setupForTesting();
  });

  equal(App._readinessDeferrals, 1, "App is in deferred state after setupForTesting.");

  App.reset();
  equal(App._readinessDeferrals, 1, "App is in deferred state after setupForTesting.");
});

test("`visit` advances readiness.", function(){
  expect(2);

  Ember.run(function() {
    App = Ember.Application.create();
    App.setupForTesting();
    App.injectTestHelpers();
  });

  equal(App._readinessDeferrals, 1, "App is in deferred state after setupForTesting.");

  App.testHelpers.visit('/').then(function(){
    equal(App._readinessDeferrals, 0, "App's readiness was advanced by visit.");
  });
});

test("`wait` helper can be passed a resolution value", function() {
  expect(4);

  var promise, wait;

  promise = new Ember.RSVP.Promise(function(resolve) {
    Ember.run(null, resolve, 'promise');
  });

  Ember.run(function() {
    App = Ember.Application.create();
    App.setupForTesting();
  });

  App.injectTestHelpers();

  Ember.run(App, App.advanceReadiness);

  wait = App.testHelpers.wait;

  wait('text').then(function(val) {
    equal(val, 'text', 'can resolve to a string');
    return wait(1);
  }).then(function(val) {
    equal(val, 1, 'can resolve to an integer');
    return wait({ age: 10 });
  }).then(function(val) {
    deepEqual(val, { age: 10 }, 'can resolve to an object');
    return wait(promise);
  }).then(function(val) {
    equal(val, 'promise', 'can resolve to a promise resolution value');
  });

});

test("`click` triggers appropriate events in order", function() {
  expect(4);

  var click, wait, events;

  Ember.run(function() {
    App = Ember.Application.create();
    App.setupForTesting();
  });

  App.IndexView = Ember.View.extend({
    classNames: 'index-view',

    didInsertElement: function() {
      this.$().on('mousedown focusin mouseup click', function(e) {
        events.push(e.type);
      });
    },

    Checkbox: Ember.Checkbox.extend({
      click: function() {
        events.push('click:' + this.get('checked'));
      },

      change: function() {
        events.push('change:' + this.get('checked'));
      }
    })
  });

  Ember.TEMPLATES.index = Ember.Handlebars.compile('{{input type="text"}} {{view view.Checkbox}} {{textarea}}');

  App.injectTestHelpers();

  Ember.run(App, App.advanceReadiness);

  click = App.testHelpers.click;
  wait  = App.testHelpers.wait;

  wait().then(function() {
    events = [];
    return click('.index-view');
  }).then(function() {
    deepEqual(events,
      ['mousedown', 'mouseup', 'click'],
      'fires events in order');
  }).then(function() {
    events = [];
    return click('.index-view input[type=text]');
  }).then(function() {
    deepEqual(events,
      ['mousedown', 'focusin', 'mouseup', 'click'],
      'fires focus events on inputs');
  }).then(function() {
    events = [];
    return click('.index-view textarea');
  }).then(function() {
    deepEqual(events,
      ['mousedown', 'focusin', 'mouseup', 'click'],
      'fires focus events on textareas');
  }).then(function() {
    // In IE (< 8), the change event only fires when the value changes before element focused.
    Ember.$('.index-view input[type=checkbox]').focus();
    events = [];
    return click('.index-view input[type=checkbox]');
  }).then(function() {
    // i.e. mousedown, mouseup, change:true, click, click:true
    // Firefox differs so we can't assert the exact ordering here.
    // See https://bugzilla.mozilla.org/show_bug.cgi?id=843554.
    equal(events.length, 5, 'fires click and change on checkboxes');
  });
});

test("Ember.Application#injectTestHelpers", function() {
  var documentEvents;

  Ember.run(function() {
    App = Ember.Application.create();
    App.setupForTesting();
  });

  documentEvents = Ember.$._data(document, 'events');

  if (!documentEvents) {
    documentEvents = {};
  }

  ok(documentEvents['ajaxStart'] === undefined, 'there are no ajaxStart listers setup prior to calling injectTestHelpers');
  ok(documentEvents['ajaxStop'] === undefined, 'there are no ajaxStop listers setup prior to calling injectTestHelpers');

  App.injectTestHelpers();
  documentEvents = Ember.$._data(document, 'events');

  equal(documentEvents['ajaxStart'].length, 1, 'calling injectTestHelpers registers an ajaxStart handler');
  equal(documentEvents['ajaxStop'].length, 1, 'calling injectTestHelpers registers an ajaxStop handler');
});

test("Ember.Application#injectTestHelpers calls callbacks registered with onInjectHelpers", function(){
  var injected = 0;

  Ember.Test.onInjectHelpers(function(){
    injected++;
  });

  Ember.run(function() {
    App = Ember.Application.create();
    App.setupForTesting();
  });

  equal(injected, 0, 'onInjectHelpers are not called before injectTestHelpers');

  App.injectTestHelpers();

  equal(injected, 1, 'onInjectHelpers are called after injectTestHelpers');
});

test("Ember.Application#injectTestHelpers adds helpers to provided object.", function(){
  var helpers = {};

  Ember.run(function() {
    App = Ember.Application.create();
    App.setupForTesting();
  });

  App.injectTestHelpers(helpers);
  assertHelpers(App, helpers);

  App.removeTestHelpers();
  assertNoHelpers(App, helpers);
});

test("Ember.Application#removeTestHelpers resets the helperContainer's original values", function(){
  var helpers = {visit: 'snazzleflabber'};

  Ember.run(function() {
    App = Ember.Application.create();
    App.setupForTesting();
  });

  App.injectTestHelpers(helpers);

  ok(helpers['visit'] !== 'snazzleflabber', "helper added to container");
  App.removeTestHelpers();

  ok(helpers['visit'] === 'snazzleflabber', "original value added back to container");
});

test("`wait` respects registerWaiters", function() {
  expect(2);

  var counter=0;
  function waiter() {
    return ++counter > 2;
  }

  Ember.run(function() {
    App = Ember.Application.create();
    App.setupForTesting();
  });

  App.injectTestHelpers();

  Ember.run(App, App.advanceReadiness);
  Ember.Test.registerWaiter(waiter);

  App.testHelpers.wait().then(function() {
    equal(waiter(), true, 'should not resolve until our waiter is ready');
    Ember.Test.unregisterWaiter(waiter);
    equal(Ember.Test.waiters.length, 0, 'should not leave a waiter registered');
  });
});

test("`wait` waits for outstanding timers", function() {
  expect(1);

  var wait_done = false;

  Ember.run(function() {
    App = Ember.Application.create();
    App.setupForTesting();
  });

  App.injectTestHelpers();

  Ember.run(App, App.advanceReadiness);

  Ember.run.later(this, function() {
    wait_done = true;
  }, 500);

  App.testHelpers.wait().then(function() {
    equal(wait_done, true, 'should wait for the timer to be fired.');
  });
});


test("`wait` respects registerWaiters with optional context", function() {
  expect(2);

  var obj = {
    counter: 0,
    ready: function() {
      return ++this.counter > 2;
    }
  };

  Ember.run(function() {
    App = Ember.Application.create();
    App.setupForTesting();
  });

  App.injectTestHelpers();

  Ember.run(App, App.advanceReadiness);
  Ember.Test.registerWaiter(obj, obj.ready);

  App.testHelpers.wait().then(function() {
    equal(obj.ready(), true, 'should not resolve until our waiter is ready');
    Ember.Test.unregisterWaiter(obj, obj.ready);
    equal(Ember.Test.waiters.length, 0, 'should not leave a waiter registered');
  });


});

if (Ember.FEATURES.isEnabled('ember-testing-routing-helpers')){

  module("ember-testing routing helpers", {
    setup: function(){
      cleanup();

      Ember.run(function() {
        App = Ember.Application.create();
        App.Router = Ember.Router.extend({
          location: 'none'
        });

        App.Router.map(function() {
          this.resource("posts", function() {
            this.route("new");
          });
        });

        App.setupForTesting();
      });

      App.injectTestHelpers();
      Ember.run(App, 'advanceReadiness');
    },

    teardown: function(){
      cleanup();
    }
  });

  test("currentRouteName for '/'", function(){
    expect(3);

    App.testHelpers.visit('/').then(function(){
      equal(App.testHelpers.currentRouteName(), 'index', "should equal 'index'.");
      equal(App.testHelpers.currentPath(), 'index', "should equal 'index'.");
      equal(App.testHelpers.currentURL(), '/', "should equal '/'.");
    });
  });


  test("currentRouteName for '/posts'", function(){
    expect(3);

    App.testHelpers.visit('/posts').then(function(){
      equal(App.testHelpers.currentRouteName(), 'posts.index', "should equal 'posts.index'.");
      equal(App.testHelpers.currentPath(), 'posts.index', "should equal 'posts.index'.");
      equal(App.testHelpers.currentURL(), '/posts', "should equal '/posts'.");
    });
  });

  test("currentRouteName for '/posts/new'", function(){
    expect(3);

    App.testHelpers.visit('/posts/new').then(function(){
      equal(App.testHelpers.currentRouteName(), 'posts.new', "should equal 'posts.new'.");
      equal(App.testHelpers.currentPath(), 'posts.new', "should equal 'posts.new'.");
      equal(App.testHelpers.currentURL(), '/posts/new', "should equal '/posts/new'.");
    });
  });
}

module("ember-testing pendingAjaxRequests", {
  setup: function(){
    cleanup();

    Ember.run(function() {
      App = Ember.Application.create();
      App.setupForTesting();
    });

    App.injectTestHelpers();
  },

  teardown: function() { cleanup(); }
});

test("pendingAjaxRequests is incremented on each document ajaxStart event", function() {
  Ember.Test.pendingAjaxRequests = 0;

  Ember.run(function(){
    Ember.$(document).trigger('ajaxStart');
  });

  equal(Ember.Test.pendingAjaxRequests, 1, 'Ember.Test.pendingAjaxRequests was incremented');
});

test("pendingAjaxRequests is decremented on each document ajaxStop event", function() {
  Ember.Test.pendingAjaxRequests = 1;

  Ember.run(function(){
    Ember.$(document).trigger('ajaxStop');
  });

  equal(Ember.Test.pendingAjaxRequests, 0, 'Ember.Test.pendingAjaxRequests was decremented');
});

test("it should raise an assertion error if ajaxStop is called without pendingAjaxRequests", function() {
  Ember.Test.pendingAjaxRequests = 0;

  expectAssertion(function() {
    Ember.run(function(){
      Ember.$(document).trigger('ajaxStop');
    });
  });
});

if (Ember.FEATURES.isEnabled("ember-testing-triggerEvent-helper")) {
  test("`trigger` can be used to trigger arbitrary events", function() {
    expect(2);

    var triggerEvent, wait, event;

    Ember.run(function() {
      App = Ember.Application.create();
      App.setupForTesting();
    });

    App.IndexView = Ember.View.extend({
      template: Ember.Handlebars.compile('{{input type="text" id="foo"}}'),

      didInsertElement: function() {
        this.$('#foo').on('blur change', function(e) {
          event = e;
        });
      }
    });

    App.injectTestHelpers();

    Ember.run(App, App.advanceReadiness);

    triggerEvent = App.testHelpers.triggerEvent;
    wait         = App.testHelpers.wait;

    wait().then(function() {
      return triggerEvent('#foo', 'blur');
    }).then(function() {
      equal(event.type, 'blur', 'correct event was triggered');
      equal(event.target.getAttribute('id'), 'foo', 'triggered on the correct element');
    });
  });
}

})();

(function() {
var App, find, visit, originalAdapter = Ember.Test.adapter;

module("ember-testing Integration", {
  setup: function() {
    Ember.$('<div id="ember-testing-container"><div id="ember-testing"></div></div>').appendTo('body');
    Ember.run(function() {
      App = Ember.Application.create({
        rootElement: '#ember-testing'
      });

      App.Router.map(function() {
        this.resource("people", { path: "/" });
      });

      App.PeopleRoute = Ember.Route.extend({
        model: function() {
          return App.Person.find();
        }
      });

      App.PeopleView = Ember.View.extend({
        defaultTemplate: Ember.Handlebars.compile("{{#each person in controller}}<div class=\"name\">{{person.firstName}}</div>{{/each}}")
      });

      App.PeopleController = Ember.ArrayController.extend({});

      App.Person = Ember.Object.extend({
        firstName: ''
      });

      App.Person.reopenClass({
        find: function() {
          return Ember.A(); 
        }
      });

      App.ApplicationView = Ember.View.extend({
        defaultTemplate: Ember.Handlebars.compile("{{outlet}}")
      });

      App.setupForTesting();
    });

    Ember.run(function() {
      App.reset();
    });

    App.injectTestHelpers();

    find = window.find;
    visit = window.visit;
  },

  teardown: function() {
    App.removeTestHelpers();
    Ember.$('#ember-testing-container, #ember-testing').remove();
    Ember.run(App, App.destroy);
    App = null;
    Ember.Test.adapter = originalAdapter;
  }
});

test("template is bound to empty array of people", function() {
  App.Person.find = function() {
    return Ember.A();
  };
  Ember.run(App, 'advanceReadiness');
  visit("/").then(function() {
    var rows = find(".name").length;
    equal(rows, 0, "successfully stubbed an empty array of people");
  });
});

test("template is bound to array of 2 people", function() {
  App.Person.find = function() {
    var people = Ember.A();
    var first = App.Person.create({firstName: "x"});
    var last = App.Person.create({firstName: "y"});
    Ember.run(people, people.pushObject, first);
    Ember.run(people, people.pushObject, last);
    return people;
  };
  Ember.run(App, 'advanceReadiness');
  visit("/").then(function() {
    var rows = find(".name").length;
    equal(rows, 2, "successfully stubbed a non empty array of people");
  });
});

test("template is again bound to empty array of people", function() {
  App.Person.find = function() {
    return Ember.A();
  };
  Ember.run(App, 'advanceReadiness');
  visit("/").then(function() {
    var rows = find(".name").length;
    equal(rows, 0, "successfully stubbed another empty array of people");
  });
});

test("`visit` can be called without advancedReadiness.", function(){
  App.Person.find = function() {
    return Ember.A();
  };

  visit("/").then(function() {
    var rows = find(".name").length;
    equal(rows, 0, "stubbed an empty array of people without calling advancedReadiness.");
  });
});

})();

