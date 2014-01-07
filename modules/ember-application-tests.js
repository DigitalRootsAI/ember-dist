(function() {
var view;
var app;
var application;
var set = Ember.set, get = Ember.get;
var forEach = Ember.ArrayPolyfills.forEach;
var trim = Ember.$.trim;
var originalLookup;
var originalDebug;

module("Ember.Application", {
  setup: function() {
    originalLookup = Ember.lookup;
    originalDebug = Ember.debug;

    Ember.$("#qunit-fixture").html("<div id='one'><div id='one-child'>HI</div></div><div id='two'>HI</div>");
    Ember.run(function() {
      application = Ember.Application.create({ rootElement: '#one', router: null });
    });
  },

  teardown: function() {
    Ember.$("#qunit-fixture").empty();
    Ember.debug = originalDebug;

    Ember.lookup = originalLookup;

    if (application) {
      Ember.run(application, 'destroy');
    }

    if (app) {
      Ember.run(app, 'destroy');
    }
  }
});

test("you can make a new application in a non-overlapping element", function() {
  Ember.run(function() {
    app = Ember.Application.create({ rootElement: '#two', router: null });
  });

  Ember.run(app, 'destroy');
  ok(true, "should not raise");
});

test("you cannot make a new application that is a parent of an existing application", function() {
  expectAssertion(function() {
    Ember.run(function() {
      Ember.Application.create({ rootElement: '#qunit-fixture' });
    });
  });
});

test("you cannot make a new application that is a descendent of an existing application", function() {
  expectAssertion(function() {
    Ember.run(function() {
      Ember.Application.create({ rootElement: '#one-child' });
    });
  });
});

test("you cannot make a new application that is a duplicate of an existing application", function() {
  expectAssertion(function() {
    Ember.run(function() {
      Ember.Application.create({ rootElement: '#one' });
    });
  });
});

test("you cannot make two default applications without a rootElement error", function() {
  expectAssertion(function() {
    Ember.run(function() {
      Ember.Application.create({ router: false });
    });
  });
});

test("acts like a namespace", function() {
  var lookup = Ember.lookup = {}, app;

  Ember.run(function() {
    app = lookup.TestApp = Ember.Application.create({ rootElement: '#two', router: false });
  });

  Ember.BOOTED = false;
  app.Foo = Ember.Object.extend();
  equal(app.Foo.toString(), "TestApp.Foo", "Classes pick up their parent namespace");
});

module("Ember.Application initialization", {
  teardown: function() {
    Ember.run(app, 'destroy');
    Ember.TEMPLATES = {};
  }
});

test('initialized application go to initial route', function() {
  Ember.run(function() {
    app = Ember.Application.create({
      rootElement: '#qunit-fixture'
    });

    app.Router.reopen({
      location: 'none'
    });

    app.register('template:application',
      Ember.Handlebars.compile("{{outlet}}")
    );

    Ember.TEMPLATES.index = Ember.Handlebars.compile(
      "<h1>Hi from index</h1>"
    );
  });

  equal(Ember.$('#qunit-fixture h1').text(), "Hi from index");
});

test("initialize application via initialize call", function() {
  Ember.run(function() {
    app = Ember.Application.create({
      rootElement: '#qunit-fixture'
    });

    app.Router.reopen({
      location: 'none'
    });

    app.ApplicationView = Ember.View.extend({
      template: function() { return "<h1>Hello!</h1>"; }
    });
  });

  // This is not a public way to access the container; we just
  // need to make some assertions about the created router
  var router = app.__container__.lookup('router:main');
  equal(router instanceof Ember.Router, true, "Router was set from initialize call");
  equal(router.location instanceof Ember.NoneLocation, true, "Location was set from location implementation name");
});

test("initialize application with stateManager via initialize call from Router class", function() {
  Ember.run(function() {
    app = Ember.Application.create({
      rootElement: '#qunit-fixture'
    });

    app.Router.reopen({
      location: 'none'
    });

    app.register('template:application', function() {
      return "<h1>Hello!</h1>";
    });
  });

  var router = app.__container__.lookup('router:main');
  equal(router instanceof Ember.Router, true, "Router was set from initialize call");
  equal(Ember.$("#qunit-fixture h1").text(), "Hello!");
});

test("ApplicationView is inserted into the page", function() {
  Ember.run(function() {
    app = Ember.Application.create({
      rootElement: '#qunit-fixture'
    });

    app.ApplicationView = Ember.View.extend({
      render: function(buffer) {
        buffer.push("<h1>Hello!</h1>");
      }
    });

    app.ApplicationController = Ember.Controller.extend();

    app.Router.reopen({
      location: 'none'
    });
  });

  equal(Ember.$("#qunit-fixture h1").text(), "Hello!");
});

test("Minimal Application initialized with just an application template", function() {
  Ember.$('#qunit-fixture').html('<script type="text/x-handlebars">Hello World</script>');
  Ember.run(function () {
    app = Ember.Application.create({
      rootElement: '#qunit-fixture'
    });
  });

  equal(trim(Ember.$('#qunit-fixture').text()), 'Hello World');
});

test('enable log of libraries with an ENV var', function() {
  var debug = Ember.debug;
  var messages = [];

  Ember.LOG_VERSION = true;

  Ember.debug = function(message) {
    messages.push(message);
  };

  Ember.libraries.register("my-lib", "2.0.0a");

  Ember.run(function() {
    app = Ember.Application.create({
      rootElement: '#qunit-fixture'
    });
  });

  equal(messages[1], "Ember      : " + Ember.VERSION);
  equal(messages[2], "Handlebars : " + Handlebars.VERSION);
  equal(messages[3], "jQuery     : " + Ember.$().jquery);
  equal(messages[4], "my-lib     : " + "2.0.0a");

  Ember.libraries.deRegister("my-lib");
  Ember.LOG_VERSION = false;
  Ember.debug = debug;
});

test('disable log version of libraries with an ENV var', function() {
  var logged = false;

  Ember.LOG_VERSION = false;

  Ember.debug = function(message) {
    logged = true;
  };

  Ember.$("#qunit-fixture").empty();

  Ember.run(function() {
    app = Ember.Application.create({
      rootElement: '#qunit-fixture'
    });

    app.Router.reopen({
      location: 'none'
    });
  });

  ok(!logged, 'library version logging skipped');
});

test("can resolve custom router", function(){
  var CustomRouter = Ember.Router.extend();

  var CustomResolver = Ember.DefaultResolver.extend({
    resolveOther: function(parsedName){
      if (parsedName.type === "router") {
        return CustomRouter;
      } else {
        return this._super(parsedName);
      }
    }
  });

  app = Ember.run(function(){
    return Ember.Application.create({
      Resolver: CustomResolver
    });
  });

  ok(app.__container__.lookup('router:main') instanceof CustomRouter, 'application resolved the correct router');
});

})();

(function() {
module("Controller dependencies");

test("If a controller specifies a dependency, but does not have a container it should error", function(){
  var Controller = Ember.Controller.extend({
    needs: 'posts'
  });

  expectAssertion(function(){
    Controller.create();
  }, /specifies `needs`, but does not have a container. Please ensure this controller was instantiated with a container./);
});

test("If a controller specifies a dependency, it is accessible", function() {
  var container = new Ember.Container();

  container.register('controller:post', Ember.Controller.extend({
    needs: 'posts'
  }));

  container.register('controller:posts', Ember.Controller.extend());

  var postController = container.lookup('controller:post'),
      postsController = container.lookup('controller:posts');

  equal(postsController, postController.get('controllers.posts'), "controller.posts must be auto synthesized");
});

test("If a controller specifies an unavailable dependency, it raises", function() {
  var container = new Ember.Container();

  container.register('controller:post', Ember.Controller.extend({
    needs: ['comments']
  }));

  throws(function() {
    container.lookup('controller:post');
  }, /controller:comments/);

  container.register('controller:blog', Ember.Controller.extend({
    needs: ['posts', 'comments']
  }));

  throws(function() {
    container.lookup('controller:blog');
  }, /controller:posts, controller:comments/);
});

test("Mixin sets up controllers if there is needs before calling super", function() {
  var container = new Ember.Container();

  container.register('controller:other', Ember.ArrayController.extend({
    needs: 'posts',
    content: Ember.computed.alias('controllers.posts')
  }));

  container.register('controller:another', Ember.ArrayController.extend({
    needs: 'posts',
    contentBinding: 'controllers.posts'
  }));

  container.register('controller:posts', Ember.ArrayController.extend());

  container.lookup('controller:posts').set('content', Ember.A(['a','b','c']));

  deepEqual(['a','b','c'], container.lookup('controller:other').toArray());
  deepEqual(['a','b','c'], container.lookup('controller:another').toArray());
});

test("raises if trying to get a controller that was not pre-defined in `needs`", function() {
  var container = new Ember.Container();

  container.register('controller:foo', Ember.Controller.extend());
  container.register('controller:bar', Ember.Controller.extend({
    needs: 'foo'
  }));

  var fooController = container.lookup('controller:foo');
  var barController = container.lookup('controller:bar');

  throws(function(){
    fooController.get('controllers.bar');
  }, /#needs does not include `bar`/,
  'throws if controllers is accesed but needs not defined');

  equal(barController.get('controllers.foo'), fooController, 'correctly needed controllers should continue to work');

  throws(function(){
    barController.get('controllers.baz');
  }, /#needs does not include `baz`/,
  'should throw if no such controller was needed');
});

test ("setting the value of a controller dependency should not be possible", function(){
  var container = new Ember.Container();

  container.register('controller:post', Ember.Controller.extend({
    needs: 'posts'
  }));

  container.register('controller:posts', Ember.Controller.extend());

  var postController = container.lookup('controller:post'),
      postsController = container.lookup('controller:posts');

  throws(function(){
    postController.set('controllers.posts', 'epic-self-troll');
  },
  /You cannot overwrite the value of `controllers.posts` of .+/,
  'should raise when attempting to set the value of a controller dependency property');

  postController.set('controllers.posts.title', "A Troll's Life");
  equal(postController.get('controllers.posts.title'), "A Troll's Life", "can set the value of controllers.posts.title");
});

test("raises if a dependency with a period is requested", function() {
  var container = new Ember.Container();

  container.register('controller:big.bird', Ember.Controller.extend());
  container.register('controller:foo', Ember.Controller.extend({
    needs: 'big.bird'
  }));

  expectAssertion(function() {
    container.lookup('controller:foo');
  }, /needs must not specify dependencies with periods in their names \(big\.bird\)/,
  'throws if periods used');
});

test("can unit test controllers with `needs` dependencies by stubbing their `controllers` properties", function() {
  expect(1);

  var BrotherController = Ember.Controller.extend({
    needs: 'sister',
    foo: Ember.computed.alias('controllers.sister.foo')
  });

  var broController = BrotherController.create({
    controllers: {
      sister: { foo: 5 }
    }
  });

  equal(broController.get('foo'), 5, "`needs` dependencies can be stubbed");
});


})();

(function() {
var application;

module("Ember.Application Depedency Injection – customResolver",{
  setup: function() {
    function fallbackTemplate() { return "<h1>Fallback</h1>"; }

    var Resolver = Ember.DefaultResolver.extend({
      resolveTemplate: function(parsedName) {
        var resolvedTemplate = this._super(parsedName);
        if (resolvedTemplate) { return resolvedTemplate; }
        return fallbackTemplate;
      }
    });

    application = Ember.run(function() {
      return Ember.Application.create({
        Resolver: Resolver,
        rootElement: '#qunit-fixture'

      });
    });
  },
  teardown: function() {
    Ember.run(application, 'destroy');
  }
});

test("a resolver can be supplied to application", function() {
  equal(Ember.$("h1", application.rootElement).text(), "Fallback");
});


})();

(function() {
var locator, application, lookup, originalLookup;

module("Ember.Application Depedency Injection", {
  setup: function() {
    originalLookup = Ember.lookup;
    application = Ember.run(Ember.Application, 'create');

    locator = application.__container__;
  },

  teardown: function() {
    Ember.TEMPLATES = {};
    Ember.lookup = originalLookup;
    Ember.run(application, 'destroy');
  }
});

test('the default resolver can look things up in other namespaces', function() {
  var UserInterface = Ember.lookup.UserInterface = Ember.Namespace.create();
  UserInterface.NavigationController = Ember.Controller.extend();

  var nav = locator.lookup('controller:userInterface/navigation');

  ok(nav instanceof UserInterface.NavigationController, "the result should be an instance of the specified class");
});

test('the default resolver looks up templates in Ember.TEMPLATES', function() {
  function fooTemplate() {}
  function fooBarTemplate() {}
  function fooBarBazTemplate() {}

  Ember.TEMPLATES['foo'] = fooTemplate;
  Ember.TEMPLATES['fooBar'] = fooBarTemplate;
  Ember.TEMPLATES['fooBar/baz'] = fooBarBazTemplate;

  equal(locator.lookup('template:foo'), fooTemplate, "resolves template:foo");
  equal(locator.lookup('template:fooBar'), fooBarTemplate, "resolves template:foo_bar");
  equal(locator.lookup('template:fooBar.baz'), fooBarBazTemplate, "resolves template:foo_bar.baz");
});

test('the default resolver looks up basic name as no prefix', function() {
  ok(Ember.Controller.detect(locator.lookup('controller:basic')), 'locator looksup correct controller');
});

function detectEqual(first, second, message) {
  ok(first.detect(second), message);
}

test('the default resolver looks up arbitrary types on the namespace', function() {
  application.FooManager = Ember.Object.extend({});

  detectEqual(application.FooManager, locator.resolver('manager:foo'),"looks up FooManager on application");
});

test("the default resolver resolves models on the namespace", function() {
  application.Post = Ember.Object.extend({});

  detectEqual(application.Post, locator.lookupFactory('model:post'), "looks up Post model on application");
});

test("the default resolver resolves helpers from Ember.Handlebars.helpers", function(){
  function fooresolvertestHelper(){ return 'FOO'; }
  function barBazResolverTestHelper(){ return 'BAZ'; }
  Ember.Handlebars.registerHelper('fooresolvertest', fooresolvertestHelper);
  Ember.Handlebars.registerHelper('bar-baz-resolver-test', barBazResolverTestHelper);
  equal(fooresolvertestHelper, locator.lookup('helper:fooresolvertest'), "looks up fooresolvertestHelper helper");
  equal(barBazResolverTestHelper, locator.lookup('helper:bar-baz-resolver-test'), "looks up barBazResolverTestHelper helper");
});

test("the default resolver resolves container-registered helpers", function(){
  function gooresolvertestHelper(){ return 'GOO'; }
  function gooGazResolverTestHelper(){ return 'GAZ'; }
  application.register('helper:gooresolvertest', gooresolvertestHelper);
  application.register('helper:goo-baz-resolver-test', gooGazResolverTestHelper);
  equal(gooresolvertestHelper, locator.lookup('helper:gooresolvertest'), "looks up gooresolvertest helper");
  equal(gooGazResolverTestHelper, locator.lookup('helper:goo-baz-resolver-test'), "looks up gooGazResolverTestHelper helper");
});

test("the default resolver throws an error if the fullName to resolve is invalid", function(){
  raises(function(){ locator.resolve(undefined);}, TypeError, /Invalid fullName/ );
  raises(function(){ locator.resolve(null);     }, TypeError, /Invalid fullName/ );
  raises(function(){ locator.resolve('');       }, TypeError, /Invalid fullName/ );
  raises(function(){ locator.resolve('');       }, TypeError, /Invalid fullName/ );
  raises(function(){ locator.resolve(':');      }, TypeError, /Invalid fullName/ );
  raises(function(){ locator.resolve('model');  }, TypeError, /Invalid fullName/ );
  raises(function(){ locator.resolve('model:'); }, TypeError, /Invalid fullName/ );
  raises(function(){ locator.resolve(':type');  }, TypeError, /Invalid fullName/ );
});

})();

(function() {
var application, locator, forEach = Ember.ArrayPolyfills.forEach;

module("Ember.Application Depedency Injection – normalization", {
  setup: function() {
    application = Ember.run(Ember.Application, 'create');
    locator = application.__container__;
  },

  teardown: function() {
    Ember.run(application, 'destroy');
  }
});

test('normalization', function() {
  ok(locator.normalize, 'locator#normalize is present');

  equal(locator.normalize('foo:bar'), 'foo:bar');

  equal(locator.normalize('controller:posts'), 'controller:posts');
  equal(locator.normalize('controller:posts_index'), 'controller:postsIndex');
  equal(locator.normalize('controller:posts.index'), 'controller:postsIndex');
  equal(locator.normalize('controller:posts.post.index'), 'controller:postsPostIndex');
  equal(locator.normalize('controller:posts_post.index'), 'controller:postsPostIndex');
  equal(locator.normalize('controller:posts.post_index'), 'controller:postsPostIndex');
  equal(locator.normalize('controller:postsIndex'), 'controller:postsIndex');
  equal(locator.normalize('controller:blogPosts.index'), 'controller:blogPostsIndex');
  equal(locator.normalize('controller:blog/posts.index'), 'controller:blog/postsIndex');
  equal(locator.normalize('controller:blog/posts.post.index'), 'controller:blog/postsPostIndex');
  equal(locator.normalize('controller:blog/posts_post.index'), 'controller:blog/postsPostIndex');

  equal(locator.normalize('template:blog/posts_index'), 'template:blog/posts_index');
});

test('normalization is indempotent', function() {
  var examples = ['controller:posts', 'controller:posts.post.index', 'controller:blog/posts.post_index', 'template:foo_bar'];

  forEach.call(examples, function (example) {
    equal(locator.normalize(locator.normalize(example)), locator.normalize(example));
  });
});

})();

(function() {
var originalLookup, App, originalModelInjections;

module("Ember.Application Dependency Injection – toString",{
  setup: function() {
    originalModelInjections = Ember.MODEL_FACTORY_INJECTIONS;
    Ember.MODEL_FACTORY_INJECTIONS = true;

    originalLookup = Ember.lookup;

    Ember.run(function(){
      App = Ember.Application.create();
      Ember.lookup = {
        App: App
      };
    });

    App.Post = Ember.Object.extend();

  },

  teardown: function() {
    Ember.lookup = originalLookup;
    Ember.run(App, 'destroy');
    Ember.MODEL_FACTORY_INJECTIONS = originalModelInjections;
  }
});

test("factories", function() {
  var PostFactory = App.__container__.lookupFactory('model:post');
  equal(PostFactory.toString(), 'App.Post', 'expecting the model to be post');
});

test("instances", function() {
  var post = App.__container__.lookup('model:post');
  var guid = Ember.guidFor(post);

  equal(post.toString(), '<App.Post:' + guid + '>', 'expecting the model to be post');
});

test("with a custom resolver", function() {
  Ember.run(App,'destroy');

  Ember.run(function(){
    App = Ember.Application.create({
      Resolver: Ember.DefaultResolver.extend({
        makeToString: function(factory, fullName) {
          return fullName;
        }
      })
    });
  });

  App.__container__.register('model:peter', Ember.Object.extend());

  var peter = App.__container__.lookup('model:peter');
  var guid = Ember.guidFor(peter);

  equal(peter.toString(), '<model:peter:' + guid + '>', 'expecting the supermodel to be peter');
});

})();

(function() {
var locator, originalLookup = Ember.lookup, lookup,
    application, set = Ember.set, get = Ember.get,
    forEach = Ember.ArrayPolyfills.forEach, originalModelInjections;

module("Ember.Application Dependency Injection", {
  setup: function() {
    originalModelInjections = Ember.MODEL_FACTORY_INJECTIONS;
    Ember.MODEL_FACTORY_INJECTIONS = true;

    application = Ember.run(Ember.Application, 'create');

    application.Person              = Ember.Object.extend({});
    application.Orange              = Ember.Object.extend({});
    application.Email               = Ember.Object.extend({});
    application.User                = Ember.Object.extend({});
    application.PostIndexController = Ember.Object.extend({});

    application.register('model:person', application.Person, {singleton: false });
    application.register('model:user', application.User, {singleton: false });
    application.register('fruit:favorite', application.Orange);
    application.register('communication:main', application.Email, {singleton: false});
    application.register('controller:postIndex', application.PostIndexController, {singleton: true});

    locator = application.__container__;

    lookup = Ember.lookup = {};
  },
  teardown: function() {
    Ember.run(application, 'destroy');
    application = locator = null;
    Ember.lookup = originalLookup;
    Ember.MODEL_FACTORY_INJECTIONS = originalModelInjections;
    Ember.TESTING_DEPRECATION = false;
  }
});

test('container lookup is normalized', function() {
  var dotNotationController = locator.lookup('controller:post.index');
  var camelCaseController = locator.lookup('controller:postIndex');

  ok(dotNotationController instanceof application.PostIndexController);
  ok(camelCaseController instanceof application.PostIndexController);

  equal(dotNotationController, camelCaseController);
});

test('Ember.Container.defaultContainer is the same as the Apps container, but emits deprecation warnings', function() {
  Ember.TESTING_DEPRECATION = true;
  var routerFromContainer = locator.lookup('router:main'),
    routerFromDefaultCOntainer = Ember.Container.defaultContainer.lookup('router:main');

  equal(routerFromContainer, routerFromDefaultCOntainer, 'routers from both containers are equal');
});

test('registered entities can be looked up later', function() {
  equal(locator.resolve('model:person'), application.Person);
  equal(locator.resolve('model:user'), application.User);
  equal(locator.resolve('fruit:favorite'), application.Orange);
  equal(locator.resolve('communication:main'), application.Email);
  equal(locator.resolve('controller:postIndex'), application.PostIndexController);

  equal(locator.lookup('fruit:favorite'), locator.lookup('fruit:favorite'), 'singleton lookup worked');
  ok(locator.lookup('model:user') !== locator.lookup('model:user'), 'non-singleton lookup worked');
});


test('injections', function() {
  application.inject('model', 'fruit', 'fruit:favorite');
  application.inject('model:user', 'communication', 'communication:main');

  var user = locator.lookup('model:user'),
  person = locator.lookup('model:person'),
  fruit = locator.lookup('fruit:favorite');

  equal(user.get('fruit'), fruit);
  equal(person.get('fruit'), fruit);

  ok(application.Email.detectInstance(user.get('communication')));
});

})();

(function() {
var oldInitializers, app;
var indexOf = Ember.ArrayPolyfills.indexOf;

module("Ember.Application initializers", {
  setup: function() {
  },

  teardown: function() {
    if (app) {
      Ember.run(function() { app.destroy(); });
    }
  }
});

test("initializers can be registered in a specified order", function() {
  var order = [];
  var Application = Ember.Application.extend();
  Application.initializer({
    name: 'fourth',
    after: 'third',
    initialize: function(container) {
      order.push('fourth');
    }
  });

  Application.initializer({
    name: 'second',
    before: 'third',
    initialize: function(container) {
      order.push('second');
    }
  });

  Application.initializer({
    name: 'fifth',
    after: 'fourth',
    initialize: function(container) {
      order.push('fifth');
    }
  });

  Application.initializer({
    name: 'first',
    before: 'second',
    initialize: function(container) {
      order.push('first');
    }
  });

  Application.initializer({
    name: 'third',
    initialize: function(container) {
      order.push('third');
    }
  });

  Ember.run(function() {
    app = Application.create({
      router: false,
      rootElement: '#qunit-fixture'
    });
  });

  deepEqual(order, ['first', 'second', 'third', 'fourth', 'fifth']);
});

test("initializers can have multiple dependencies", function () {
  var order = [],
      a = {
        name: "a",
        before: "b",
        initialize: function(container) {
          order.push('a');
        }
      },
      b = {
        name: "b",
        initialize: function(container) {
          order.push('b');
        }
      },
      c = {
        name: "c",
        after: "b",
        initialize: function(container) {
          order.push('c');
        }
      },
      afterB = {
        name: "after b",
        after: "b",
        initialize: function(container) {
          order.push("after b");
        }
      },
      afterC = {
        name: "after c",
        after: "c",
        initialize: function(container) {
          order.push("after c");
        }
      };
  Ember.Application.initializer(b);
  Ember.Application.initializer(a);
  Ember.Application.initializer(afterC);
  Ember.Application.initializer(afterB);
  Ember.Application.initializer(c);

  Ember.run(function() {
    app = Ember.Application.create({
      router: false,
      rootElement: '#qunit-fixture'
    });
  });

  ok(indexOf.call(order, a.name) < indexOf.call(order, b.name), 'a < b');
  ok(indexOf.call(order, b.name) < indexOf.call(order, c.name), 'b < c');
  ok(indexOf.call(order, b.name) < indexOf.call(order, afterB.name), 'b < afterB');
  ok(indexOf.call(order, c.name) < indexOf.call(order, afterC.name), 'c < afterC');
});

test("initializers set on Application subclasses should not be shared between apps", function(){
  var firstInitializerRunCount = 0, secondInitializerRunCount = 0;
  var FirstApp = Ember.Application.extend();
  FirstApp.initializer({
    name: 'first',
    initialize: function(container) {
      firstInitializerRunCount++;
    }
  });
  var SecondApp = Ember.Application.extend();
  SecondApp.initializer({
    name: 'second',
    initialize: function(container) {
      secondInitializerRunCount++;
    }
  });
  Ember.$('#qunit-fixture').html('<div id="first"></div><div id="second"></div>');
  Ember.run(function() {
    var firstApp = FirstApp.create({
      router: false,
      rootElement: '#qunit-fixture #first'
    });
  });
  equal(firstInitializerRunCount, 1, 'first initializer only was run');
  equal(secondInitializerRunCount, 0, 'first initializer only was run');
  Ember.run(function() {
    var secondApp = SecondApp.create({
      router: false,
      rootElement: '#qunit-fixture #second'
    });
  });
  equal(firstInitializerRunCount, 1, 'second initializer only was run');
  equal(secondInitializerRunCount, 1, 'second initializer only was run');
});

test("initializers are concatenated", function(){
  var firstInitializerRunCount = 0, secondInitializerRunCount = 0;
  var FirstApp = Ember.Application.extend();
  FirstApp.initializer({
    name: 'first',
    initialize: function(container) {
      firstInitializerRunCount++;
    }
  });

  var SecondApp = FirstApp.extend();
  SecondApp.initializer({
    name: 'second',
    initialize: function(container) {
      secondInitializerRunCount++;
    }
  });

  Ember.$('#qunit-fixture').html('<div id="first"></div><div id="second"></div>');
  Ember.run(function() {
    var firstApp = FirstApp.create({
      router: false,
      rootElement: '#qunit-fixture #first'
    });
  });
  equal(firstInitializerRunCount, 1, 'first initializer only was run when base class created');
  equal(secondInitializerRunCount, 0, 'first initializer only was run when base class created');
  firstInitializerRunCount = 0;
  Ember.run(function() {
    var secondApp = SecondApp.create({
      router: false,
      rootElement: '#qunit-fixture #second'
    });
  });
  equal(firstInitializerRunCount, 1, 'first initializer was run when subclass created');
  equal(secondInitializerRunCount, 1, 'second initializers was run when subclass created');
});

test("initializers are per-app", function(){
  expect(0);
  var FirstApp = Ember.Application.extend();
  FirstApp.initializer({
    name: 'shouldNotCollide',
    initialize: function(container) {}
  });

  var SecondApp = Ember.Application.extend();
  SecondApp.initializer({
    name: 'shouldNotCollide',
    initialize: function(container) {}
  });
});

})();

(function() {
var App, logs, originalLogger;

module("Ember.Application – logging of generated classes", {
  setup: function() {
    logs = {};

    originalLogger = Ember.Logger.info;

    Ember.Logger.info = function() {
      var fullName = arguments[1].fullName;

      logs[fullName] = logs[fullName] || 0;
      logs[fullName]++;
    };

    Ember.run(function() {
      App = Ember.Application.create({
        LOG_ACTIVE_GENERATION: true
      });

      App.Router.reopen({
        location: 'none'
      });

      App.Router.map(function() {
        this.resource("posts");
      });

      App.deferReadiness();
    });
  },

  teardown: function() {
    Ember.Logger.info = originalLogger;

    Ember.run(App, 'destroy');

    logs = App = null;
  }
});

function visit(path) {
  stop();

  var promise = Ember.run(function(){
    return new Ember.RSVP.Promise(function(resolve, reject){
      var router = App.__container__.lookup('router:main');

      resolve(router.handleURL(path).then(function(value){
        start();
        ok(true, 'visited: `' + path + '`');
        return value;
      }, function(reason) {
        start();
        ok(false, 'failed to visit:`' + path + '` reason: `' + QUnit.jsDump.parse(reason));
        throw reason;
      }));
    });
  });

  return {
    then: function(resolve, reject) {
      Ember.run(promise, 'then', resolve, reject);
    }
  };
}

test("log class generation if logging enabled", function() {
  Ember.run(App, 'advanceReadiness');

  visit('/posts').then(function() {
    equal(Ember.keys(logs).length, 6, 'expected logs');
  });
});

test("do NOT log class generation if logging disabled", function() {
  App.reopen({
    LOG_ACTIVE_GENERATION: false
  });

  Ember.run(App, 'advanceReadiness');

  visit('/posts').then(function() {
    equal(Ember.keys(logs).length, 0, 'expected no logs');
  });
});

test("actively generated classes get logged", function() {
  Ember.run(App, 'advanceReadiness');

  visit('/posts').then(function() {
    equal(logs['controller:application'], 1, 'expected: ApplicationController was generated');
    equal(logs['controller:posts'], 1, 'expected: PostsController was generated');

    equal(logs['route:application'], 1, 'expected: ApplicationRoute was generated');
    equal(logs['route:posts'], 1, 'expected: PostsRoute was generated');
  });
});

test("predefined classes do not get logged", function() {
  App.ApplicationController = Ember.Controller.extend();
  App.PostsController = Ember.Controller.extend();

  App.ApplicationRoute = Ember.Route.extend();
  App.PostsRoute = Ember.Route.extend();

  Ember.run(App, 'advanceReadiness');

  visit('/posts').then(function() {
    ok(!logs['controller:application'], 'did not expect: ApplicationController was generated');
    ok(!logs['controller:posts'], 'did not expect: PostsController was generated');

    ok(!logs['route:application'], 'did not expect: ApplicationRoute was generated');
    ok(!logs['route:posts'], 'did not expect: PostsRoute was generated');
  });
});

module("Ember.Application – logging of view lookups", {
  setup: function() {
    logs = {};

    originalLogger = Ember.Logger.info;

    Ember.Logger.info = function() {
      var fullName = arguments[1].fullName;

      logs[fullName] = logs[fullName] || 0;
      logs[fullName]++;
    };

    Ember.run(function() {
      App = Ember.Application.create({
        LOG_VIEW_LOOKUPS: true
      });

      App.Router.reopen({
        location: 'none'
      });

      App.Router.map(function() {
        this.resource("posts");
      });

      App.deferReadiness();
    });
  },

  teardown: function() {
    Ember.Logger.info = originalLogger;

    Ember.run(App, 'destroy');

    logs = App = null;
  }
});

test("log when template and view are missing when flag is active", function() {
  App.register('template:application', function() { return ''; });
  Ember.run(App, 'advanceReadiness');

  visit('/posts').then(function() {
    equal(logs['template:application'], undefined, 'expected: Should not log template:application since it exists.');
    equal(logs['template:index'], 1, 'expected: Could not find "index" template or view.');
    equal(logs['template:posts'], 1, 'expected: Could not find "posts" template or view.');
  });
});

test("do not log when template and view are missing when flag is not true", function() {
  App.reopen({
    LOG_VIEW_LOOKUPS: false
  });

  Ember.run(App, 'advanceReadiness');

  visit('/posts').then(function() {
    equal(Ember.keys(logs).length, 0, 'expected no logs');
  });
});

test("log which view is used with a template", function() {
  App.register('template:application', function() { return 'Template with default view'; });
  App.register('template:foo', function() { return 'Template with custom view'; });
  App.register('view:posts', Ember.View.extend({templateName: 'foo'}));
  Ember.run(App, 'advanceReadiness');

  visit('/posts').then(function() {
    equal(logs['view:application'], 1, 'expected: Should log use of default view');
    equal(logs['view:index'], undefined, 'expected: Should not log when index is not present.');
    equal(logs['view:posts'], 1, 'expected: Rendering posts with PostsView.');
  });
});

test("do not log which views are used with templates when flag is not true", function() {
  App.reopen({
    LOG_VIEW_LOOKUPS: false
  });

  Ember.run(App, 'advanceReadiness');

  visit('/posts').then(function() {
    equal(Ember.keys(logs).length, 0, 'expected no logs');
  });
});

})();

(function() {
var jQuery, Application, application;
var readyWasCalled, domReady, readyCallbacks;

// We are using a small mock of jQuery because jQuery is third-party code with
// very well-defined semantics, and we want to confirm that a jQuery stub run
// in a more minimal server environment that implements this behavior will be
// sufficient for Ember's requirements.

module("Application readiness", {
  setup: function() {
    readyWasCalled = 0;
    readyCallbacks = [];

    var jQueryInstance = {
      ready: function(callback) {
        readyCallbacks.push(callback);
        if (jQuery.isReady) {
          domReady();
        }
      }
    };

    jQuery = function() {
      return jQueryInstance;
    };
    jQuery.isReady = false;

    var domReadyCalled = 0;
    domReady = function() {
      if (domReadyCalled !== 0) { return; }
      domReadyCalled++;
      var i;
      for (i=0; i<readyCallbacks.length; i++) {
        readyCallbacks[i]();
      }
    };

    Application = Ember.Application.extend({
      $: jQuery,

      ready: function() {
        readyWasCalled++;
      }
    });
  },

  teardown: function() {
    if (application) {
      Ember.run(function() { application.destroy(); });
    }
  }
});

// These tests are confirming that if the callbacks passed into jQuery's ready hook is called
// synchronously during the application's initialization, we get the same behavior as if
// it was triggered after initialization.

test("Ember.Application's ready event is called right away if jQuery is already ready", function() {
  var wasResolved = 0;
  jQuery.isReady = true;

  Ember.run(function() {
    application = Application.create({ router: false });
    application.then(function() {
      wasResolved++;
    });

    equal(readyWasCalled, 0, "ready is not called until later");
    equal(wasResolved, 0);
  });

  equal(wasResolved, 1);
  equal(readyWasCalled, 1, "ready was called");

  domReady();

  equal(wasResolved, 1);
  equal(readyWasCalled, 1, "application's ready was not called again");
});

test("Ember.Application's ready event is called after the document becomes ready", function() {
  var wasResolved = 0;
  Ember.run(function() {
    application = Application.create({ router: false });
    application.then(function() {
      wasResolved++;
    });
    equal(wasResolved, 0);
  });

  equal(readyWasCalled, 0, "ready wasn't called yet");
  equal(wasResolved, 0);

  domReady();

  equal(wasResolved, 1);
  equal(readyWasCalled, 1, "ready was called now that DOM is ready");
});

test("Ember.Application's ready event can be deferred by other components", function() {
  var wasResolved = 0;

  Ember.run(function() {
    application = Application.create({ router: false });
    application.then(function() {
      wasResolved++;
    });
    application.deferReadiness();
    equal(wasResolved, 0);
  });

  equal(readyWasCalled, 0, "ready wasn't called yet");

  domReady();

  equal(readyWasCalled, 0, "ready wasn't called yet");
  equal(wasResolved, 0);

  Ember.run(function() {
    application.advanceReadiness();
    equal(readyWasCalled, 0);
    equal(wasResolved, 0);
  });

  equal(wasResolved, 1);
  equal(readyWasCalled, 1, "ready was called now all readiness deferrals are advanced");
});

test("Ember.Application's ready event can be deferred by other components", function() {
  var wasResolved = 0;
  jQuery.isReady = false;

  Ember.run(function() {
    application = Application.create({ router: false });
    application.deferReadiness();
    application.then(function() {
      wasResolved++;
    });
    equal(wasResolved, 0);
  });

  domReady();

  equal(readyWasCalled, 0, "ready wasn't called yet");

  Ember.run(function() {
    application.advanceReadiness();
    equal(wasResolved, 0);
  });

  equal(wasResolved, 1);
  equal(readyWasCalled, 1, "ready was called now all readiness deferrals are advanced");

  expectAssertion(function() {
    application.deferReadiness();
  });
});

})();

(function() {
var get = Ember.get, set = Ember.set;

var application;
var Application;

module("Ember.Application - resetting", {
  setup: function() {
    Application = Ember.Application.extend({
      name: "App",
      rootElement: "#qunit-fixture"
    });
  },
  teardown: function() {
    Application = null;
    if (application) {
      Ember.run(application, 'destroy');
    }
  }
});

test("Brings it's own run-loop if not provided", function() {
  application = Ember.run(Application, 'create');

  application.reset();

  Ember.run(application,'then', function() {
    ok(true, 'app booted');
  });
});

test("does not bring it's own run loop if one is already provided", function() {
  expect(3);

  var didBecomeReady = false;

  application = Ember.run(Application, 'create');

  Ember.run(function() {

    application.ready = function() {
      didBecomeReady = true;
    };

    application.reset();

    application.deferReadiness();
    ok(!didBecomeReady, 'app is not ready');
  });

  ok(!didBecomeReady, 'app is not ready');
  Ember.run(application, 'advanceReadiness');
  ok(didBecomeReady, 'app is ready');
});

test("When an application is reset, new instances of controllers are generated", function() {
  Ember.run(function() {
    application = Application.create();
    application.AcademicController = Ember.Controller.extend();
  });

  var firstController = application.__container__.lookup('controller:academic');
  var secondController = application.__container__.lookup('controller:academic');

  application.reset();

  var thirdController = application.__container__.lookup('controller:academic');

  strictEqual(firstController, secondController, "controllers looked up in succession should be the same instance");

  ok(firstController.isDestroying, 'controllers are destroyed when their application is reset');

  notStrictEqual(firstController, thirdController, "controllers looked up after the application is reset should not be the same instance");
});

test("When an application is reset, the eventDispatcher is destroyed and recreated", function() {
  var eventDispatcherWasSetup, eventDispatcherWasDestroyed,
  stubEventDispatcher;

  eventDispatcherWasSetup = 0;
  eventDispatcherWasDestroyed = 0;

  var originalDispatcher = Ember.EventDispatcher;

  stubEventDispatcher = {
    setup: function() {
      eventDispatcherWasSetup++;
    },
    destroy: function() {
      eventDispatcherWasDestroyed++;
    }
  };

  Ember.EventDispatcher = {
    create: function() {
      return stubEventDispatcher;
    }
  };

  try {
    Ember.run(function() {
      application = Application.create();

      equal(eventDispatcherWasSetup, 0);
      equal(eventDispatcherWasDestroyed, 0);
    });

    equal(eventDispatcherWasSetup, 1);
    equal(eventDispatcherWasDestroyed, 0);

    application.reset();

    equal(eventDispatcherWasSetup, 2);
    equal(eventDispatcherWasDestroyed, 1);
  } catch (error) { }

  Ember.EventDispatcher = originalDispatcher;
});

test("When an application is reset, the ApplicationView is torn down", function() {
  Ember.run(function() {
    application = Application.create();
    application.ApplicationView = Ember.View.extend({
      elementId: "application-view"
    });
  });

  equal(Ember.$('#qunit-fixture #application-view').length, 1, "precond - the application view is rendered");

  var originalView = Ember.View.views['application-view'];

  application.reset();

  var resettedView = Ember.View.views['application-view'];

  equal(Ember.$('#qunit-fixture #application-view').length, 1, "the application view is rendered");

  notStrictEqual(originalView, resettedView, "The view object has changed");
});

test("When an application is reset, the router URL is reset to `/`", function() {
  var location, router;

  Ember.run(function() {
    application = Application.create();
    application.Router = Ember.Router.extend({
      location: 'none'
    });

    application.Router.map(function() {
      this.route('one');
      this.route('two');
    });
  });

  router = application.__container__.lookup('router:main');

  location = router.get('location');

  Ember.run(function() {
    location.handleURL('/one');
  });

  application.reset();

  var applicationController = application.__container__.lookup('controller:application');
  router = application.__container__.lookup('router:main');
  location = router.get('location');

  equal(location.getURL(), '');

  equal(get(applicationController, 'currentPath'), "index");

  location = application.__container__.lookup('router:main').get('location');
  Ember.run(function() {
    location.handleURL('/one');
  });

  equal(get(applicationController, 'currentPath'), "one");
});

test("When an application with advance/deferReadiness is reset, the app does correctly become ready after reset", function() {
  var location, router, readyCallCount;

  readyCallCount = 0;

  Ember.run(function() {
    application = Application.create({
      ready: function() {
        readyCallCount++;
      }
    });

    application.deferReadiness();
    equal(readyCallCount, 0, 'ready has not yet been called');
  });

  Ember.run(function() {
    application.advanceReadiness();
  });

  equal(readyCallCount, 1, 'ready was called once');

  application.reset();

  equal(readyCallCount, 2, 'ready was called twice');
});

test("With ember-data like initializer and constant", function() {
  var location, router, readyCallCount;

  readyCallCount = 0;

  var DS = {
    Store: Ember.Object.extend({
      init: function() {
         if (!get(DS, 'defaultStore')) {
          set(DS, 'defaultStore', this);
         }

         this._super();
      },
      willDestroy: function() {
        if (get(DS, 'defaultStore') === this) {
          set(DS, 'defaultStore', null);
        }
      }
    })
  };

  Application.initializer({
    name: "store",
    initialize: function(container, application) {
      application.register('store:main', application.Store);

      container.lookup('store:main');
    }
  });

  Ember.run(function() {
    application = Application.create();
    application.Store = DS.Store;
  });

  ok(DS.defaultStore, 'has defaultStore');

  application.reset();

  ok(DS.defaultStore, 'still has defaultStore');
  ok(application.__container__.lookup("store:main"), 'store is still present');
});

test("Ensure that the hashchange event listener is removed", function(){
  var listeners;

  Ember.$(window).off('hashchange'); // ensure that any previous listeners are cleared

  Ember.run(function() {
    application = Application.create();
  });

  listeners = Ember.$._data(Ember.$(window)[0], 'events');
  equal(listeners['hashchange'].length, 1, 'hashchange event listener was setup');

  application.reset();

  listeners = Ember.$._data(Ember.$(window)[0], 'events');
  equal(listeners['hashchange'].length, 1, 'hashchange event only exists once');
});

})();

