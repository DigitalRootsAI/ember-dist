(function() {
var App, container;
var compile = Ember.Handlebars.compile;

function prepare(){
  Ember.TEMPLATES["components/expand-it"] = compile("<p>hello {{yield}}</p>");
  Ember.TEMPLATES.application = compile("Hello world {{#expand-it}}world{{/expand-it}}");
}

function cleanup(){
  Ember.run(function() {
    App.destroy();
    App = null;
    Ember.TEMPLATES = {};
  });
}

module("Application Lifecycle - Component Registration", {
  setup: prepare,
  teardown: cleanup
});

function boot(callback) {
  Ember.run(function() {
    App = Ember.Application.create({
      name: 'App',
      rootElement: '#qunit-fixture'
    });

    App.deferReadiness();

    App.Router = Ember.Router.extend({
      location: 'none'
    });

    container = App.__container__;

    if (callback) { callback(); }
  });

  var router = container.lookup('router:main');

  Ember.run(App, 'advanceReadiness');
  Ember.run(function() {
    router.handleURL('/');
  });
}

test("The helper becomes the body of the component", function() {
  boot();
  equal(Ember.$('div.ember-view > div.ember-view', '#qunit-fixture').text(), "hello world", "The component is composed correctly");
});

test("If a component is registered, it is used", function() {
  boot(function() {
    container.register('component:expand-it', Ember.Component.extend({
      classNames: 'testing123'
    }));
  });

  equal(Ember.$('div.testing123', '#qunit-fixture').text(), "hello world", "The component is composed correctly");
});


test("Late-registered components can be rendered with custom `template` property", function() {

  Ember.TEMPLATES.application = compile("<div id='wrapper'>there goes {{my-hero}}</div>");

  boot(function() {
    container.register('component:my-hero', Ember.Component.extend({
      classNames: 'testing123',
      template: function() { return "watch him as he GOES"; }
    }));
  });

  equal(Ember.$('#wrapper').text(), "there goes watch him as he GOES", "The component is composed correctly");
  ok(!Ember.Handlebars.helpers['my-hero'], "Component wasn't saved to global Handlebars.helpers hash");
});

test("Late-registered components can be rendered with template registered on the container", function() {

  Ember.TEMPLATES.application = compile("<div id='wrapper'>hello world {{sally-rutherford}} {{#sally-rutherford}}!!!{{/sally-rutherford}}</div>");

  boot(function() {
    container.register('template:components/sally-rutherford', compile("funkytowny{{yield}}"));
    container.register('component:sally-rutherford', Ember.Component);
  });

  equal(Ember.$('#wrapper').text(), "hello world funkytowny funkytowny!!!", "The component is composed correctly");
  ok(!Ember.Handlebars.helpers['sally-rutherford'], "Component wasn't saved to global Handlebars.helpers hash");
});

test("Late-registered components can be rendered with ONLY the template registered on the container", function() {

  Ember.TEMPLATES.application = compile("<div id='wrapper'>hello world {{borf-snorlax}} {{#borf-snorlax}}!!!{{/borf-snorlax}}</div>");

  boot(function() {
    container.register('template:components/borf-snorlax', compile("goodfreakingTIMES{{yield}}"));
  });

  equal(Ember.$('#wrapper').text(), "hello world goodfreakingTIMES goodfreakingTIMES!!!", "The component is composed correctly");
  ok(!Ember.Handlebars.helpers['borf-snorlax'], "Component wasn't saved to global Handlebars.helpers hash");
});

test("Component-like invocations are treated as bound paths if neither template nor component are registered on the container", function() {

  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{user-name}} hello {{api-key}} world</div>");

  boot(function() {
    container.register('controller:application', Ember.Controller.extend({
      'user-name': 'machty'
    }));
  });

  equal(Ember.$('#wrapper').text(), "machty hello  world", "The component is composed correctly");
});

test("Component lookups should take place on components' subcontainers", function() {
  expect(1);

  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{#sally-rutherford}}{{mach-ty}}{{/sally-rutherford}}</div>");

  boot(function() {
    container.register('component:sally-rutherford', Ember.Component.extend({
      init: function() {
        this._super();
        this.container = new Ember.Container(this.container);
        this.container.register('component:mach-ty', Ember.Component.extend({
          didInsertElement: function() {
            ok(true, "mach-ty was rendered");
          }
        }));
      }
    }));
  });
});

module("Application Lifecycle - Component Context", {
  setup: prepare,
  teardown: cleanup
});

test("Components with a block should have the proper content when a template is provided", function(){
  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{#my-component}}{{text}}{{/my-component}}</div>");
  Ember.TEMPLATES['components/my-component'] = compile("{{text}}-{{yield}}");

  boot(function() {
    container.register('controller:application', Ember.Controller.extend({
      'text': 'outer'
    }));

    container.register('component:my-component', Ember.Component.extend({
      text: 'inner'
    }));
  });

  equal(Ember.$('#wrapper').text(), "inner-outer", "The component is composed correctly");
});

test("Components with a block should yield the proper content without a template provided", function(){
  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{#my-component}}{{text}}{{/my-component}}</div>");

  boot(function() {
    container.register('controller:application', Ember.Controller.extend({
      'text': 'outer'
    }));

    container.register('component:my-component', Ember.Component.extend({
      text: 'inner'
    }));
  });

  equal(Ember.$('#wrapper').text(), "outer", "The component is composed correctly");
});

test("Components without a block should have the proper content when a template is provided", function(){
  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{my-component}}</div>");
  Ember.TEMPLATES['components/my-component'] = compile("{{text}}");

  boot(function() {
    container.register('controller:application', Ember.Controller.extend({
      'text': 'outer'
    }));

    container.register('component:my-component', Ember.Component.extend({
      text: 'inner'
    }));
  });

  equal(Ember.$('#wrapper').text(), "inner", "The component is composed correctly");
});

test("Components without a block should have the proper content", function(){
  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{my-component}}</div>");

  boot(function() {
    container.register('controller:application', Ember.Controller.extend({
      'text': 'outer'
    }));

    container.register('component:my-component', Ember.Component.extend({
      didInsertElement: function() {
        this.$().html('Some text inserted by jQuery');
      }
    }));
  });

  equal(Ember.$('#wrapper').text(), "Some text inserted by jQuery", "The component is composed correctly");
});

test("Components trigger actions in the parents context when called from within a block", function(){
  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{#my-component}}<a href='#' id='fizzbuzz' {{action 'fizzbuzz'}}>Fizzbuzz</a>{{/my-component}}</div>");

  boot(function() {
    container.register('controller:application', Ember.Controller.extend({
      actions: {
        fizzbuzz: function(){
          ok(true, 'action triggered on parent');
        }
      }
    }));

    container.register('component:my-component', Ember.Component.extend());
  });

  Ember.run(function(){
    Ember.$('#fizzbuzz', "#wrapper").click();
  });
});

test("Components trigger actions in the components context when called from within its template", function(){
  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{#my-component}}{{text}}{{/my-component}}</div>");
  Ember.TEMPLATES['components/my-component'] = compile("<a href='#' id='fizzbuzz' {{action 'fizzbuzz'}}>Fizzbuzz</a>");

  boot(function() {
    container.register('controller:application', Ember.Controller.extend());

    container.register('component:my-component', Ember.Component.extend({
      actions: {
        fizzbuzz: function(){
          ok(true, 'action triggered on component');
        }
      }
    }));
  });

  Ember.$('#fizzbuzz', "#wrapper").click();
});

})();

(function() {
var App, container;
var compile = Ember.Handlebars.compile;

function reverseHelper(value) {
  return arguments.length > 1 ? value.split('').reverse().join('') : "--";
}


module("Application Lifecycle - Helper Registration", {
  teardown: function() {
    Ember.run(function() {
      App.destroy();
      App = null;
      Ember.TEMPLATES = {};
    });
  }
});

var boot = function(callback) {
  Ember.run(function() {
    App = Ember.Application.create({
      name: 'App',
      rootElement: '#qunit-fixture'
    });

    App.deferReadiness();

    App.Router = Ember.Router.extend({
      location: 'none'
    });

    container = App.__container__;

    if (callback) { callback(); }
  });

  var router = container.lookup('router:main');

  Ember.run(App, 'advanceReadiness');
  Ember.run(function() {
    router.handleURL('/');
  });
};

test("Unbound dashed helpers registered on the container can be late-invoked", function() {

  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{x-borf}} {{x-borf YES}}</div>");

  boot(function() {
    container.register('helper:x-borf', function(val) {
      return arguments.length > 1 ? val : "BORF";
    });
  });

  equal(Ember.$('#wrapper').text(), "BORF YES", "The helper was invoked from the container");
  ok(!Ember.Handlebars.helpers['x-borf'], "Container-registered helper doesn't wind up on global helpers hash");
});

test("Bound helpers registered on the container can be late-invoked", function() {

  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{x-reverse}} {{x-reverse foo}}</div>");

  boot(function() {
    container.register('controller:application', Ember.Controller.extend({
      foo: "alex"
    }));
    container.register('helper:x-reverse', Ember.Handlebars.makeBoundHelper(reverseHelper));
  });

  equal(Ember.$('#wrapper').text(), "-- xela", "The bound helper was invoked from the container");
  ok(!Ember.Handlebars.helpers['x-reverse'], "Container-registered helper doesn't wind up on global helpers hash");
});

test("Undashed helpers registered on the container can not (presently) be invoked", function() {

  var realHelperMissing = Ember.Handlebars.helpers.helperMissing;
  Ember.Handlebars.helpers.helperMissing = function() {
    return "NOHALPER";
  };

  // Note: the reason we're not allowing undashed helpers is to avoid
  // a possible perf hit in hot code paths, i.e. _triageMustache.
  // We only presently perform container lookups if prop.indexOf('-') >= 0

  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{omg}}|{{omg 'GRRR'}}|{{yorp}}|{{yorp 'ahh'}}</div>");

  boot(function() {
    container.register('helper:omg', function() {
      return "OMG";
    });
    container.register('helper:yorp', Ember.Handlebars.makeBoundHelper(function() {
      return "YORP";
    }));
  });

  equal(Ember.$('#wrapper').text(), "|NOHALPER||NOHALPER", "The undashed helper was invoked from the container");

  Ember.Handlebars.helpers.helperMissing = realHelperMissing;
});

})();

(function() {
var Router, App, AppView, templates, router, eventDispatcher, container;
var get = Ember.get, set = Ember.set, map = Ember.ArrayPolyfills.map;

function bootApplication() {
  router = container.lookup('router:main');
  Ember.run(App, 'advanceReadiness');
}

// IE includes the host name
function normalizeUrl(url) {
  return url.replace(/https?:\/\/[^\/]+/,'');
}

function compile(template) {
  return Ember.Handlebars.compile(template);
}

function shouldNotBeActive(selector) {
  checkActive(selector, false);
}

function shouldBeActive(selector) {
  checkActive(selector, true);
}

function checkActive(selector, active) {
  var classList = Ember.$(selector, '#qunit-fixture')[0].classList;
  equal(classList.contains('active'), active, selector + " active should be " + active.toString());

}

module("The {{link-to}} helper", {
  setup: function() {
    Ember.run(function() {
      App = Ember.Application.create({
        name: "App",
        rootElement: '#qunit-fixture'
      });

      App.deferReadiness();

      App.Router.reopen({
        location: 'none'
      });

      Router = App.Router;

      Ember.TEMPLATES.app = Ember.Handlebars.compile("{{outlet}}");
      Ember.TEMPLATES.index = Ember.Handlebars.compile("<h3>Home</h3>{{#link-to 'about' id='about-link'}}About{{/link-to}}{{#link-to 'index' id='self-link'}}Self{{/link-to}}");
      Ember.TEMPLATES.about = Ember.Handlebars.compile("<h3>About</h3>{{#link-to 'index' id='home-link'}}Home{{/link-to}}{{#link-to 'about' id='self-link'}}Self{{/link-to}}");
      Ember.TEMPLATES.item = Ember.Handlebars.compile("<h3>Item</h3><p>{{name}}</p>{{#link-to 'index' id='home-link'}}Home{{/link-to}}");

      AppView = Ember.View.extend({
        templateName: 'app'
      });

      container = App.__container__;

      container.register('view:app', AppView);
      container.register('router:main', Router);
    });
  },

  teardown: function() {
    Ember.run(function() { App.destroy(); });
    Ember.TEMPLATES = {};
  }
});

test("The {{link-to}} helper moves into the named route", function() {
  Router.map(function(match) {
    this.route("about");
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(Ember.$('h3:contains(Home)', '#qunit-fixture').length, 1, "The home template was rendered");
  equal(Ember.$('#self-link.active', '#qunit-fixture').length, 1, "The self-link was rendered with active class");
  equal(Ember.$('#about-link:not(.active)', '#qunit-fixture').length, 1, "The other link was rendered without active class");

  Ember.run(function() {
    Ember.$('#about-link', '#qunit-fixture').click();
  });

  equal(Ember.$('h3:contains(About)', '#qunit-fixture').length, 1, "The about template was rendered");
  equal(Ember.$('#self-link.active', '#qunit-fixture').length, 1, "The self-link was rendered with active class");
  equal(Ember.$('#home-link:not(.active)', '#qunit-fixture').length, 1, "The other link was rendered without active class");
});

test("The {{link-to}} helper supports URL replacement", function() {
  var setCount = 0,
      replaceCount = 0;

  Ember.TEMPLATES.index = Ember.Handlebars.compile("<h3>Home</h3>{{#link-to 'about' id='about-link' replace=true}}About{{/link-to}}");

  Router.reopen({
    location: Ember.NoneLocation.createWithMixins({
      setURL: function(path) {
        setCount++;
        set(this, 'path', path);
      },

      replaceURL: function(path) {
        replaceCount++;
        set(this, 'path', path);
      }
    })
  });

  Router.map(function() {
    this.route("about");
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(setCount, 0, 'precond: setURL has not been called');
  equal(replaceCount, 0, 'precond: replaceURL has not been called');

  Ember.run(function() {
    Ember.$('#about-link', '#qunit-fixture').click();
  });

  equal(setCount, 0, 'setURL should not be called');
  equal(replaceCount, 1, 'replaceURL should be called once');
});

test("the {{link-to}} helper doesn't add an href when the tagName isn't 'a'", function() {
  Ember.TEMPLATES.index = Ember.Handlebars.compile("{{#link-to 'about' id='about-link' tagName='div'}}About{{/link-to}}");

  Router.map(function() {
    this.route("about");
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(Ember.$('#about-link').attr('href'), undefined, "there is no href attribute");
});


test("the {{link-to}} applies a 'disabled' class when disabled", function () {
  Ember.TEMPLATES.index = Ember.Handlebars.compile('{{#link-to "about" id="about-link" disabledWhen="shouldDisable"}}About{{/link-to}}');
  App.IndexController = Ember.Controller.extend({
    shouldDisable: true
  });

  Router.map(function() {
    this.route("about");
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(Ember.$('#about-link.disabled', '#qunit-fixture').length, 1, "The link is disabled when its disabledWhen is true");
});

test("the {{link-to}} doesn't apply a 'disabled' class if disabledWhen is not provided", function () {
  Ember.TEMPLATES.index = Ember.Handlebars.compile('{{#link-to "about" id="about-link"}}About{{/link-to}}');

  Router.map(function() {
    this.route("about");
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  ok(!Ember.$('#about-link', '#qunit-fixture').hasClass("disabled"), "The link is not disabled if disabledWhen not provided");
});

test("the {{link-to}} helper supports a custom disabledClass", function () {
  Ember.TEMPLATES.index = Ember.Handlebars.compile('{{#link-to "about" id="about-link" disabledWhen="shouldDisable" disabledClass="do-not-want"}}About{{/link-to}}');
  App.IndexController = Ember.Controller.extend({
    shouldDisable: true
  });

  Router.map(function() {
    this.route("about");
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(Ember.$('#about-link.do-not-want', '#qunit-fixture').length, 1, "The link can apply a custom disabled class");

});

test("the {{link-to}} helper does not respond to clicks when disabled", function () {
  Ember.TEMPLATES.index = Ember.Handlebars.compile('{{#link-to "about" id="about-link" disabledWhen="shouldDisable"}}About{{/link-to}}');
  App.IndexController = Ember.Controller.extend({
    shouldDisable: true
  });

  Router.map(function() {
    this.route("about");
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  Ember.run(function() {
    Ember.$('#about-link', '#qunit-fixture').click();
  });

  equal(Ember.$('h3:contains(About)', '#qunit-fixture').length, 0, "Transitioning did not occur");
});

test("The {{link-to}} helper supports a custom activeClass", function() {
  Ember.TEMPLATES.index = Ember.Handlebars.compile("<h3>Home</h3>{{#link-to 'about' id='about-link'}}About{{/link-to}}{{#link-to 'index' id='self-link' activeClass='zomg-active'}}Self{{/link-to}}");

  Router.map(function() {
    this.route("about");
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(Ember.$('h3:contains(Home)', '#qunit-fixture').length, 1, "The home template was rendered");
  equal(Ember.$('#self-link.zomg-active', '#qunit-fixture').length, 1, "The self-link was rendered with active class");
  equal(Ember.$('#about-link:not(.active)', '#qunit-fixture').length, 1, "The other link was rendered without active class");
});

test("The {{link-to}} helper supports leaving off .index for nested routes", function() {
  Router.map(function() {
    this.resource("about", function() {
      this.route("item");
    });
  });

  Ember.TEMPLATES.about = compile("<h1>About</h1>{{outlet}}");
  Ember.TEMPLATES['about/index'] = compile("<div id='index'>Index</div>");
  Ember.TEMPLATES['about/item'] = compile("<div id='item'>{{#link-to 'about'}}About{{/link-to}}</div>");

  bootApplication();

  Ember.run(router, 'handleURL', '/about/item');

  equal(normalizeUrl(Ember.$('#item a', '#qunit-fixture').attr('href')), '/about');
});

test("The {{link-to}} helper supports custom, nested, currentWhen", function() {
  Router.map(function(match) {
    this.resource("index", { path: "/" }, function() {
      this.route("about");
    });

    this.route("item");
  });

  Ember.TEMPLATES.index = Ember.Handlebars.compile("<h3>Home</h3>{{outlet}}");
  Ember.TEMPLATES['index/about'] = Ember.Handlebars.compile("{{#link-to 'item' id='other-link' currentWhen='index'}}ITEM{{/link-to}}");

  bootApplication();

  Ember.run(function() {
    router.handleURL("/about");
  });

  equal(Ember.$('#other-link.active', '#qunit-fixture').length, 1, "The link is active since currentWhen is a parent route");
});

test("The {{link-to}} helper defaults to bubbling", function() {
  Ember.TEMPLATES.about = Ember.Handlebars.compile("<div {{action 'hide'}}>{{#link-to 'about.contact' id='about-contact'}}About{{/link-to}}</div>{{outlet}}");
  Ember.TEMPLATES['about/contact'] = Ember.Handlebars.compile("<h1 id='contact'>Contact</h1>");

  Router.map(function() {
    this.resource("about", function() {
      this.route("contact");
    });
  });

  var hidden = 0;

  App.AboutRoute = Ember.Route.extend({
    actions: {
      hide: function() {
        hidden++;
      }
    }
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/about");
  });

  Ember.run(function() {
    Ember.$('#about-contact', '#qunit-fixture').click();
  });

  equal(Ember.$("#contact", "#qunit-fixture").text(), "Contact", "precond - the link worked");

  equal(hidden, 1, "The link bubbles");
});

test("The {{link-to}} helper supports bubbles=false", function() {
  Ember.TEMPLATES.about = Ember.Handlebars.compile("<div {{action 'hide'}}>{{#link-to 'about.contact' id='about-contact' bubbles=false}}About{{/link-to}}</div>{{outlet}}");
  Ember.TEMPLATES['about/contact'] = Ember.Handlebars.compile("<h1 id='contact'>Contact</h1>");

  Router.map(function() {
    this.resource("about", function() {
      this.route("contact");
    });
  });

  var hidden = 0;

  App.AboutRoute = Ember.Route.extend({
    actions: {
      hide: function() {
        hidden++;
      }
    }
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/about");
  });

  Ember.run(function() {
    Ember.$('#about-contact', '#qunit-fixture').click();
  });

  equal(Ember.$("#contact", "#qunit-fixture").text(), "Contact", "precond - the link worked");

  equal(hidden, 0, "The link didn't bubble");
});

test("The {{link-to}} helper moves into the named route with context", function() {
  Router.map(function(match) {
    this.route("about");
    this.resource("item", { path: "/item/:id" });
  });

  Ember.TEMPLATES.about = Ember.Handlebars.compile("<h3>List</h3><ul>{{#each controller}}<li>{{#link-to 'item' this}}{{name}}{{/link-to}}<li>{{/each}}</ul>{{#link-to 'index' id='home-link'}}Home{{/link-to}}");

  App.AboutRoute = Ember.Route.extend({
    model: function() {
      return Ember.A([
        { id: "yehuda", name: "Yehuda Katz" },
        { id: "tom", name: "Tom Dale" },
        { id: "erik", name: "Erik Brynroflsson" }
      ]);
    }
  });

  App.ItemRoute = Ember.Route.extend({
    serialize: function(object) {
      return { id: object.id };
    }
  });

  bootApplication();

  Ember.run(function() {
    router.handleURL("/about");
  });

  equal(Ember.$('h3:contains(List)', '#qunit-fixture').length, 1, "The home template was rendered");
  equal(normalizeUrl(Ember.$('#home-link').attr('href')), '/', "The home link points back at /");

  Ember.run(function() {
    Ember.$('li a:contains(Yehuda)', '#qunit-fixture').click();
  });

  equal(Ember.$('h3:contains(Item)', '#qunit-fixture').length, 1, "The item template was rendered");
  equal(Ember.$('p', '#qunit-fixture').text(), "Yehuda Katz", "The name is correct");

  Ember.run(function() { Ember.$('#home-link').click(); });
  Ember.run(function() { Ember.$('#about-link').click(); });

  equal(normalizeUrl(Ember.$('li a:contains(Yehuda)').attr('href')), "/item/yehuda");
  equal(normalizeUrl(Ember.$('li a:contains(Tom)').attr('href')), "/item/tom");
  equal(normalizeUrl(Ember.$('li a:contains(Erik)').attr('href')), "/item/erik");

  Ember.run(function() {
    Ember.$('li a:contains(Erik)', '#qunit-fixture').click();
  });

  equal(Ember.$('h3:contains(Item)', '#qunit-fixture').length, 1, "The item template was rendered");
  equal(Ember.$('p', '#qunit-fixture').text(), "Erik Brynroflsson", "The name is correct");
});

test("The {{link-to}} helper binds some anchor html tag common attributes", function() {
  Ember.TEMPLATES.index = Ember.Handlebars.compile("<h3>Home</h3>{{#link-to 'index' id='self-link' title='title-attr' rel='rel-attr'}}Self{{/link-to}}");
  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  var link = Ember.$('#self-link', '#qunit-fixture');
  equal(link.attr('title'), 'title-attr', "The self-link contains title attribute");
  equal(link.attr('rel'), 'rel-attr', "The self-link contains rel attribute");
});

test("The {{link-to}} helper accepts string/numeric arguments", function() {
  Router.map(function() {
    this.route('filter', { path: '/filters/:filter' });
    this.route('post',   { path: '/post/:post_id' });
    this.route('repo',   { path: '/repo/:owner/:name' });
  });

  App.FilterController = Ember.Controller.extend({
    filter: "unpopular",
    repo: Ember.Object.create({owner: 'ember', name: 'ember.js'}),
    post_id: 123
  });
  Ember.TEMPLATES.filter = compile('<p>{{filter}}</p>{{#link-to "filter" "unpopular" id="link"}}Unpopular{{/link-to}}{{#link-to "filter" filter id="path-link"}}Unpopular{{/link-to}}{{#link-to "post" post_id id="post-path-link"}}Post{{/link-to}}{{#link-to "post" 123 id="post-number-link"}}Post{{/link-to}}{{#link-to "repo" repo id="repo-object-link"}}Repo{{/link-to}}');

  Ember.TEMPLATES.index = compile(' ');

  bootApplication();

  Ember.run(function() { router.handleURL("/filters/popular"); });

  equal(normalizeUrl(Ember.$('#link', '#qunit-fixture').attr('href')), "/filters/unpopular");
  equal(normalizeUrl(Ember.$('#path-link', '#qunit-fixture').attr('href')), "/filters/unpopular");
  equal(normalizeUrl(Ember.$('#post-path-link', '#qunit-fixture').attr('href')), "/post/123");
  equal(normalizeUrl(Ember.$('#post-number-link', '#qunit-fixture').attr('href')), "/post/123");
  equal(normalizeUrl(Ember.$('#repo-object-link', '#qunit-fixture').attr('href')), "/repo/ember/ember.js");
});

test("The {{link-to}} helper unwraps controllers", function() {
  // The serialize hook is called thrice: once to generate the href for the
  // link, once to generate the URL when the link is clicked, and again
  // when the URL changes to check if query params have been updated
  expect(3);

  Router.map(function() {
    this.route('filter', { path: '/filters/:filter' });
  });

  var indexObject = { filter: 'popular' };

  App.FilterRoute = Ember.Route.extend({
    model: function(params) {
      return indexObject;
    },

    serialize: function(passedObject) {
      equal(passedObject, indexObject, "The unwrapped object is passed");
      return { filter: 'popular' };
    }
  });

  App.IndexRoute = Ember.Route.extend({
    model: function() {
      return indexObject;
    }
  });

  Ember.TEMPLATES.filter = compile('<p>{{filter}}</p>');
  Ember.TEMPLATES.index = compile('{{#link-to "filter" this id="link"}}Filter{{/link-to}}');

  bootApplication();

  Ember.run(function() { router.handleURL("/"); });

  Ember.$('#link', '#qunit-fixture').trigger('click');
});

test("The {{link-to}} helper doesn't change view context", function() {
  App.IndexView = Ember.View.extend({
    elementId: 'index',
    name: 'test'
  });

  Ember.TEMPLATES.index = Ember.Handlebars.compile("{{view.name}}-{{#link-to 'index' id='self-link'}}Link: {{view.name}}{{/link-to}}");

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });

  equal(Ember.$('#index', '#qunit-fixture').text(), 'test-Link: test', "accesses correct view");
});

test("Quoteless route param performs property lookup", function() {
  Ember.TEMPLATES.index = Ember.Handlebars.compile("{{#link-to 'index' id='string-link'}}string{{/link-to}}{{#link-to foo id='path-link'}}path{{/link-to}}{{#link-to view.foo id='view-link'}}{{view.foo}}{{/link-to}}");

  function assertEquality(href) {
    equal(normalizeUrl(Ember.$('#string-link', '#qunit-fixture').attr('href')), '/');
    equal(normalizeUrl(Ember.$('#path-link', '#qunit-fixture').attr('href')), href);
    equal(normalizeUrl(Ember.$('#view-link', '#qunit-fixture').attr('href')), href);
  }

  App.IndexView = Ember.View.extend({
    foo: 'index',
    elementId: 'index-view'
  });

  App.IndexController = Ember.Controller.extend({
    foo: 'index'
  });

  App.Router.map(function() {
    this.route('about');
  });

  bootApplication();

  Ember.run(router, 'handleURL', '/');

  assertEquality('/');

  var controller = container.lookup('controller:index'),
      view = Ember.View.views['index-view'];
  Ember.run(function() {
    controller.set('foo', 'about');
    view.set('foo', 'about');
  });

  assertEquality('/about');
});

test("link-to with null/undefined dynamic parameters are put in a loading state", function() {

  expect(19);

  var oldWarn = Ember.Logger.warn, warnCalled = false;
  Ember.Logger.warn = function() { warnCalled = true; };
  Ember.TEMPLATES.index = Ember.Handlebars.compile("{{#link-to destinationRoute routeContext loadingClass='i-am-loading' id='context-link'}}string{{/link-to}}{{#link-to secondRoute loadingClass='i-am-loading' id='static-link'}}string{{/link-to}}");

  var thing = Ember.Object.create({ id: 123 });

  App.IndexController = Ember.Controller.extend({
    destinationRoute: null,
    routeContext: null
  });

  App.AboutRoute = Ember.Route.extend({
    activate: function() {
      ok(true, "About was entered");
    }
  });

  App.Router.map(function() {
    this.route('thing', { path: '/thing/:thing_id' });
    this.route('about');
  });

  bootApplication();

  Ember.run(router, 'handleURL', '/');

  function assertLinkStatus($link, url) {
    if (url) {
      equal(normalizeUrl($link.attr('href')), url, "loaded link-to has expected href");
      ok(!$link.hasClass('i-am-loading'), "loaded linkView has no loadingClass");
    } else {
      equal(normalizeUrl($link.attr('href')), '#', "unloaded link-to has href='#'");
      ok($link.hasClass('i-am-loading'), "loading linkView has loadingClass");
    }
  }

  var $contextLink = Ember.$('#context-link', '#qunit-fixture'),
      $staticLink = Ember.$('#static-link', '#qunit-fixture'),
      controller = container.lookup('controller:index');

  assertLinkStatus($contextLink);
  assertLinkStatus($staticLink);

  Ember.run(function() {
    warnCalled = false;
    $contextLink.click();
    ok(warnCalled, "Logger.warn was called from clicking loading link");
  });

  // Set the destinationRoute (context is still null).
  Ember.run(controller, 'set', 'destinationRoute', 'thing');
  assertLinkStatus($contextLink);

  // Set the routeContext to an id
  Ember.run(controller, 'set', 'routeContext', '456');
  assertLinkStatus($contextLink, '/thing/456');

  // Test that 0 isn't interpreted as falsy.
  Ember.run(controller, 'set', 'routeContext', 0);
  assertLinkStatus($contextLink, '/thing/0');

  // Set the routeContext to an object
  Ember.run(controller, 'set', 'routeContext', thing);
  assertLinkStatus($contextLink, '/thing/123');

  // Set the destinationRoute back to null.
  Ember.run(controller, 'set', 'destinationRoute', null);
  assertLinkStatus($contextLink);

  Ember.run(function() {
    warnCalled = false;
    $staticLink.click();
    ok(warnCalled, "Logger.warn was called from clicking loading link");
  });

  Ember.run(controller, 'set', 'secondRoute', 'about');
  assertLinkStatus($staticLink, '/about');

  // Click the now-active link
  Ember.run($staticLink, 'click');

  Ember.Logger.warn = oldWarn;
});

test("The {{link-to}} helper refreshes href element when one of params changes", function() {
  Router.map(function() {
    this.route('post', { path: '/posts/:post_id' });
  });

  var post = Ember.Object.create({id: '1'}),
      secondPost = Ember.Object.create({id: '2'});

  Ember.TEMPLATES.index = compile('{{#link-to "post" post id="post"}}post{{/link-to}}');

  App.IndexController = Ember.Controller.extend();
  var indexController = container.lookup('controller:index');

  Ember.run(function() { indexController.set('post', post); });

  bootApplication();

  Ember.run(function() { router.handleURL("/"); });

  equal(normalizeUrl(Ember.$('#post', '#qunit-fixture').attr('href')), '/posts/1', 'precond - Link has rendered href attr properly');

  Ember.run(function() { indexController.set('post', secondPost); });

  equal(Ember.$('#post', '#qunit-fixture').attr('href'), '/posts/2', 'href attr was updated after one of the params had been changed');

  Ember.run(function() { indexController.set('post', null); });

  equal(Ember.$('#post', '#qunit-fixture').attr('href'), '#', 'href attr becomes # when one of the arguments in nullified');
});

if (Ember.FEATURES.isEnabled("query-params")) {
  test("The {{link-to}} helper supports query params", function() {
    expect(66);

    Router.map(function() {
      this.route("about", {queryParams: ['section']});
      this.resource("items", { queryParams: ['sort', 'direction'] });
    });

    Ember.TEMPLATES.about = Ember.Handlebars.compile("<h1>About</h1> {{#link-to 'about' id='about-link'}}About{{/link-to}} {{#link-to 'about' section='intro' id='about-link-with-qp'}}Intro{{/link-to}}{{#link-to 'about' section=false id='about-clear-qp'}}Intro{{/link-to}}{{#if isIntro}} <p>Here is the intro</p>{{/if}}");
    Ember.TEMPLATES.items = Ember.Handlebars.compile("<h1>Items</h1> {{#link-to 'about' id='about-link'}}About{{/link-to}} {{#link-to 'items' id='items-link' direction=otherDirection}}Sort{{/link-to}} {{#link-to 'items' id='items-sort-link' sort='name'}}Sort Ascending{{/link-to}} {{#link-to 'items' id='items-clear-link' queryParams=false}}Clear Query Params{{/link-to}}");

    App.AboutRoute = Ember.Route.extend({
      setupController: function(controller, context, queryParams) {
        controller.set('isIntro', queryParams.section === 'intro');
      }
    });

    App.ItemsRoute = Ember.Route.extend({
      setupController: function (controller, context, queryParams) {
        controller.set('currentDirection', queryParams.direction || 'asc');
      }
    });

    var shouldNotHappen = function(error) {
      console.error(error.stack);
      ok(false, "this .then handler should not be called: " + error.message);
    };

    App.ItemsController = Ember.Controller.extend({
        currentDirection: 'asc',
        otherDirection: Ember.computed(function () {
          if (get(this, 'currentDirection') === 'asc') {
            return 'desc';
          } else {
            return 'asc';
          }
        }).property('currentDirection')
    });

    bootApplication();

    Ember.run(function() {
      router.handleURL("/about");
    });

    equal(Ember.$('h1:contains(About)', '#qunit-fixture').length, 1, "The about template was rendered");
    equal(normalizeUrl(Ember.$('#about-link').attr('href')), '/about', "The about link points back at /about");
    shouldBeActive('#about-link');
    equal(normalizeUrl(Ember.$('#about-link-with-qp').attr('href')), '/about?section=intro', "The helper accepts query params");
    shouldNotBeActive('#about-link-with-qp');
    equal(normalizeUrl(Ember.$('#about-clear-qp').attr('href')), '/about', "Falsy query params work");
    shouldBeActive('#about-clear-qp');


    Ember.run(function() {
      Ember.$('#about-link-with-qp', '#qunit-fixture').click();
    });

    equal(router.get('url'), "/about?section=intro", "Clicking link-to updates the url");
    equal(Ember.$('p', '#qunit-fixture').text(), "Here is the intro", "Query param is applied to controller");
    equal(normalizeUrl(Ember.$('#about-link').attr('href')), '/about?section=intro', "The params have stuck");
    shouldBeActive('#about-link');
    equal(normalizeUrl(Ember.$('#about-link-with-qp').attr('href')), '/about?section=intro', "The helper accepts query params");
    shouldBeActive('#about-link-with-qp');
    equal(normalizeUrl(Ember.$('#about-clear-qp').attr('href')), '/about', "Falsy query params clear querystring");
    shouldNotBeActive('#about-clear-qp');


    Ember.run(function() {
      router.transitionTo("/about");
    });

    equal(router.get('url'), "/about", "handleURL clears query params");

    Ember.run(function() {
      router.transitionTo("/items");
    });

    var controller = container.lookup('controller:items');

    equal(controller.get('currentDirection'), 'asc', "Current direction is asc");
    equal(controller.get('otherDirection'), 'desc', "Other direction is desc");

    equal(Ember.$('h1:contains(Items)', '#qunit-fixture').length, 1, "The items template was rendered");
    equal(normalizeUrl(Ember.$('#about-link').attr('href')), '/about', "The params have not stuck");
    shouldNotBeActive('#about-link');
    equal(normalizeUrl(Ember.$('#items-link').attr('href')), '/items?direction=desc', "Params can come from bindings");
    shouldNotBeActive('#items-link');
    equal(normalizeUrl(Ember.$('#items-clear-link').attr('href')), '/items', "Can clear query params");
    shouldBeActive('#items-clear-link');

    Ember.run(function() {
      Ember.$('#items-link', '#qunit-fixture').click();
    });

    equal(router.get('url'), "/items?direction=desc", "Clicking link-to should direct to the correct url");
    equal(controller.get('currentDirection'), 'desc', "Current direction is desc");
    equal(controller.get('otherDirection'), 'asc', "Other direction is asc");

    equal(normalizeUrl(Ember.$('#items-sort-link').attr('href')), '/items?direction=desc&sort=name', "link-to href correctly merges query parmas");
    shouldNotBeActive('#items-sort-link');

    equal(normalizeUrl(Ember.$('#items-clear-link').attr('href')), '/items', "Can clear query params");
    shouldNotBeActive('#items-clear-link');

    Ember.run(function() {
      Ember.$('#items-sort-link', '#qunit-fixture').click();
    });


    equal(router.get('url'), "/items?sort=name&direction=desc", "The params should be merged correctly");
    equal(controller.get('currentDirection'), 'desc', "Current direction is desc");
    equal(controller.get('otherDirection'), 'asc', "Other direction is asc");

    equal(normalizeUrl(Ember.$('#items-sort-link').attr('href')), "/items?sort=name&direction=desc", "link-to href correctly merges query parmas");
    shouldBeActive('#items-sort-link');

    equal(normalizeUrl(Ember.$('#items-link').attr('href')), "/items?sort=name&direction=asc", "Params can come from bindings");
    shouldNotBeActive('#items-link');

    equal(normalizeUrl(Ember.$('#items-clear-link').attr('href')), '/items', "Can clear query params");
    shouldNotBeActive('#items-clear-link');

    Ember.run(function() {
      controller.set('currentDirection', 'asc');
    });

    equal(controller.get('currentDirection'), 'asc', "Current direction is asc");
    equal(controller.get('otherDirection'), 'desc', "Other direction is desc");

    equal(normalizeUrl(Ember.$('#items-link').attr('href')), "/items?sort=name&direction=desc", "Params are updated when bindings change");
    shouldBeActive('#items-link');
    equal(normalizeUrl(Ember.$('#items-sort-link').attr('href')), '/items?sort=name&direction=desc', "link-to href correctly merges query params when other params change");
    shouldBeActive('#items-sort-link');

    Ember.run(function() {
      Ember.$('#items-sort-link', '#qunit-fixture').click();
    });

    equal(router.get('url'), '/items?sort=name&direction=desc', "Clicking the active link should preserve the url");
    shouldBeActive('#items-sort-link');


    var promise, next;

    stop();

    Ember.run(function () {
      promise = router.transitionTo({queryParams: {sort: false}});
    });

    next = function () {
      equal(router.get('url'), '/items?direction=desc', "Transitioning updates the url");

      equal(controller.get('currentDirection'), 'desc', "Current direction is asc");
      equal(controller.get('otherDirection'), 'asc', "Other direction is desc");

      equal(normalizeUrl(Ember.$('#items-link').attr('href')), "/items?direction=asc", "Params are updated when transitioning");
      shouldNotBeActive('#items-link');

      equal(normalizeUrl(Ember.$('#items-sort-link').attr('href')), "/items?direction=desc&sort=name", "Params are updated when transitioning");
      shouldNotBeActive('#items-sort-link');

      return router.transitionTo({queryParams: {sort: 'name'}});
    };

    Ember.run(function () {
      promise.then(next, shouldNotHappen);
    });

    next = function () {
      equal(router.get('url'), '/items?sort=name&direction=desc', "Transitioning updates the url");

      equal(controller.get('currentDirection'), 'desc', "Current direction is asc");
      equal(controller.get('otherDirection'), 'asc', "Other direction is desc");

      equal(normalizeUrl(Ember.$('#items-link').attr('href')), "/items?sort=name&direction=asc", "Params are updated when transitioning");
      shouldNotBeActive('#items-link');

      equal(normalizeUrl(Ember.$('#items-sort-link').attr('href')), "/items?sort=name&direction=desc", "Params are updated when transitioning");
      shouldBeActive('#items-sort-link');


      Ember.$('#items-clear-link', '#qunit-fixture').click();

      equal(router.get('url'), '/items', "Link clears the query params");
      equal(normalizeUrl(Ember.$('#items-clear-link').attr('href')), '/items', "Can clear query params");
      shouldBeActive('#items-clear-link');


      start();
    };

    Ember.run(function () {
      promise.then(next, shouldNotHappen);
    });
  });



  test("The {{link-to}} can work without a route name if query params are supplied", function() {
    expect(4);

    Router.map(function() {
      this.route("items", { queryParams: ['page'] });
      this.route('about');
    });

    Ember.TEMPLATES.items = Ember.Handlebars.compile("<h1>Items</h1> {{#link-to page=2 id='next-page'}}Next Page{{/link-to}}");

    bootApplication();

    Ember.run(function() {
      router.handleURL("/items");
    });

    equal(normalizeUrl(Ember.$('#next-page').attr('href')), '/items?page=2', "The link-to works without a routename");
    shouldNotBeActive('#next-page');

    Ember.run(function() {
      Ember.$('#next-page', '#qunit-fixture').click();
    });

    equal(router.get('url'), "/items?page=2", "Clicking the link updates the url");
    shouldBeActive('#next-page');
  });
}

test("The {{link-to}} helper's bound parameter functionality works as expected in conjunction with an ObjectProxy/Controller", function() {
  Router.map(function() {
    this.route('post', { path: '/posts/:post_id' });
  });

  var post = Ember.Object.create({id: '1'}),
      secondPost = Ember.Object.create({id: '2'});

  Ember.TEMPLATES = {
    index: compile(' '),
    post:  compile('{{#link-to "post" this id="self-link"}}selflink{{/link-to}}')
  };

  App.PostController = Ember.ObjectController.extend();
  var postController = container.lookup('controller:post');

  bootApplication();

  Ember.run(router, 'transitionTo', 'post', post);

  var $link = Ember.$('#self-link', '#qunit-fixture');
  equal(normalizeUrl($link.attr('href')), '/posts/1', 'self link renders post 1');

  Ember.run(postController, 'set', 'content', secondPost);
  var linkView = Ember.View.views['self-link'];

  equal(normalizeUrl($link.attr('href')), '/posts/2', 'self link updated to post 2');
});

test("{{linkTo}} is aliased", function() {
  var originalLinkTo = Ember.Handlebars.helpers['link-to'],
    originalWarn = Ember.warn;

  Ember.warn = function(msg) {
    equal(msg, "The 'linkTo' view helper is deprecated in favor of 'link-to'", 'Warning called');
  };

  Ember.Handlebars.helpers['link-to'] = function() {
    equal(arguments[0], 'foo', 'First arg match');
    equal(arguments[1], 'bar', 'Second arg match');
    return 'result';
  };
  var result = Ember.Handlebars.helpers.linkTo('foo', 'bar');
  equal(result, 'result', 'Result match');

  Ember.Handlebars.helpers['link-to'] = originalLinkTo;
  Ember.warn = originalWarn;
});

test("The {{link-to}} helper is active when a resource is active", function() {
  Router.map(function() {
    this.resource("about", function() {
      this.route("item");
    });
  });

  Ember.TEMPLATES.about = compile("<div id='about'>{{#link-to 'about' id='about-link'}}About{{/link-to}} {{#link-to 'about.item' id='item-link'}}Item{{/link-to}} {{outlet}}</div>");
  Ember.TEMPLATES['about/item'] = compile(" ");
  Ember.TEMPLATES['about/index'] = compile(" ");

  bootApplication();

  Ember.run(router, 'handleURL', '/about');

  equal(Ember.$('#about-link.active', '#qunit-fixture').length, 1, "The about resource link is active");
  equal(Ember.$('#item-link.active', '#qunit-fixture').length, 0, "The item route link is inactive");

  Ember.run(router, 'handleURL', '/about/item');

  equal(Ember.$('#about-link.active', '#qunit-fixture').length, 1, "The about resource link is active");
  equal(Ember.$('#item-link.active', '#qunit-fixture').length, 1, "The item route link is active");

});

test("The {{link-to}} helper works in an #each'd array of string route names", function() {
  Router.map(function() {
    this.route('foo');
    this.route('bar');
    this.route('rar');
  });

  App.IndexController = Ember.Controller.extend({
    routeNames: Ember.A(['foo', 'bar', 'rar']),
    route1: 'bar',
    route2: 'foo'
  });

  Ember.TEMPLATES = {
    index: compile('{{#each routeName in routeNames}}{{#link-to routeName}}{{routeName}}{{/link-to}}{{/each}}{{#each routeNames}}{{#link-to this}}{{this}}{{/link-to}}{{/each}}{{#link-to route1}}a{{/link-to}}{{#link-to route2}}b{{/link-to}}')
  };

  bootApplication();

  function linksEqual($links, expected) {
    equal($links.length, expected.length, "Has correct number of links");

    var idx;
    for (idx = 0; idx < $links.length; idx++) {
      var href = Ember.$($links[idx]).attr('href');
      // Old IE includes the whole hostname as well
      equal(href.slice(-expected[idx].length), expected[idx], "Expected link to be '"+expected[idx]+"', but was '"+href+"'");
    }
  }

  linksEqual(Ember.$('a', '#qunit-fixture'), ["/foo", "/bar", "/rar", "/foo", "/bar", "/rar", "/bar", "/foo"]);

  var indexController = container.lookup('controller:index');
  Ember.run(indexController, 'set', 'route1', 'rar');

  linksEqual(Ember.$('a', '#qunit-fixture'), ["/foo", "/bar", "/rar", "/foo", "/bar", "/rar", "/rar", "/foo"]);

  Ember.run(indexController.routeNames, 'shiftObject');

  linksEqual(Ember.$('a', '#qunit-fixture'), ["/bar", "/rar", "/bar", "/rar", "/rar", "/foo"]);
});

test("The non-block form {{link-to}} helper moves into the named route", function() {
  expect(3);
  Router.map(function(match) {
    this.route("contact");
  });

  Ember.TEMPLATES.index = Ember.Handlebars.compile("<h3>Home</h3>{{link-to 'Contact us' 'contact' id='contact-link'}}{{#link-to 'index' id='self-link'}}Self{{/link-to}}");
  Ember.TEMPLATES.contact = Ember.Handlebars.compile("<h3>Contact</h3>{{link-to 'Home' 'index' id='home-link'}}{{link-to 'Self' 'contact' id='self-link'}}");

  bootApplication();

  Ember.run(function() {
    Ember.$('#contact-link', '#qunit-fixture').click();
  });

  equal(Ember.$('h3:contains(Contact)', '#qunit-fixture').length, 1, "The contact template was rendered");
  equal(Ember.$('#self-link.active', '#qunit-fixture').length, 1, "The self-link was rendered with active class");
  equal(Ember.$('#home-link:not(.active)', '#qunit-fixture').length, 1, "The other link was rendered without active class");
});

test("The non-block form {{link-to}} helper updates the link text when it is a binding", function() {
  expect(8);
  Router.map(function(match) {
    this.route("contact");
  });

  App.IndexController = Ember.Controller.extend({
    contactName: 'Jane'
  });

  Ember.TEMPLATES.index = Ember.Handlebars.compile("<h3>Home</h3>{{link-to contactName 'contact' id='contact-link'}}{{#link-to 'index' id='self-link'}}Self{{/link-to}}");
  Ember.TEMPLATES.contact = Ember.Handlebars.compile("<h3>Contact</h3>{{link-to 'Home' 'index' id='home-link'}}{{link-to 'Self' 'contact' id='self-link'}}");

  bootApplication();

  Ember.run(function() {
    router.handleURL("/");
  });
  var controller = container.lookup('controller:index');

  equal(Ember.$('#contact-link:contains(Jane)', '#qunit-fixture').length, 1, "The link title is correctly resolved");

  Ember.run(function() {
    controller.set('contactName', 'Joe');
  });
  equal(Ember.$('#contact-link:contains(Joe)', '#qunit-fixture').length, 1, "The link title is correctly updated when the bound property changes");

  Ember.run(function() {
    controller.set('contactName', 'Robert');
  });
  equal(Ember.$('#contact-link:contains(Robert)', '#qunit-fixture').length, 1, "The link title is correctly updated when the bound property changes a second time");

  Ember.run(function() {
    Ember.$('#contact-link', '#qunit-fixture').click();
  });

  equal(Ember.$('h3:contains(Contact)', '#qunit-fixture').length, 1, "The contact template was rendered");
  equal(Ember.$('#self-link.active', '#qunit-fixture').length, 1, "The self-link was rendered with active class");
  equal(Ember.$('#home-link:not(.active)', '#qunit-fixture').length, 1, "The other link was rendered without active class");

  Ember.run(function() {
    Ember.$('#home-link', '#qunit-fixture').click();
  });

  equal(Ember.$('h3:contains(Home)', '#qunit-fixture').length, 1, "The index template was rendered");
  equal(Ember.$('#contact-link:contains(Robert)', '#qunit-fixture').length, 1, "The link title is correctly updated when the route changes");
});

test("The non-block form {{link-to}} helper moves into the named route with context", function() {
  expect(5);
  Router.map(function(match) {
    this.route("item", { path: "/item/:id" });
  });

  App.IndexRoute = Ember.Route.extend({
    model: function() {
      return Ember.A([
        { id: "yehuda", name: "Yehuda Katz" },
        { id: "tom", name: "Tom Dale" },
        { id: "erik", name: "Erik Brynroflsson" }
      ]);
    }
  });

  App.ItemRoute = Ember.Route.extend({
    serialize: function(object) {
      return { id: object.id };
    }
  });

  Ember.TEMPLATES.index = Ember.Handlebars.compile("<h3>Home</h3><ul>{{#each controller}}<li>{{link-to name 'item' this}}</li>{{/each}}</ul>");
  Ember.TEMPLATES.item = Ember.Handlebars.compile("<h3>Item</h3><p>{{name}}</p>{{#link-to 'index' id='home-link'}}Home{{/link-to}}");

  bootApplication();

  Ember.run(function() {
    Ember.$('li a:contains(Yehuda)', '#qunit-fixture').click();
  });

  equal(Ember.$('h3:contains(Item)', '#qunit-fixture').length, 1, "The item template was rendered");
  equal(Ember.$('p', '#qunit-fixture').text(), "Yehuda Katz", "The name is correct");

  Ember.run(function() { Ember.$('#home-link').click(); });

  equal(normalizeUrl(Ember.$('li a:contains(Yehuda)').attr('href')), "/item/yehuda");
  equal(normalizeUrl(Ember.$('li a:contains(Tom)').attr('href')), "/item/tom");
  equal(normalizeUrl(Ember.$('li a:contains(Erik)').attr('href')), "/item/erik");

});

test("The non-block form {{link-to}} performs property lookup", function() {
  Ember.TEMPLATES.index = Ember.Handlebars.compile("{{link-to 'string' 'index' id='string-link'}}{{link-to path foo id='path-link'}}{{link-to view.foo view.foo id='view-link'}}");

  function assertEquality(href) {
    equal(normalizeUrl(Ember.$('#string-link', '#qunit-fixture').attr('href')), '/');
    equal(normalizeUrl(Ember.$('#path-link', '#qunit-fixture').attr('href')), href);
    equal(normalizeUrl(Ember.$('#view-link', '#qunit-fixture').attr('href')), href);
  }

  App.IndexView = Ember.View.extend({
    foo: 'index',
    elementId: 'index-view'
  });

  App.IndexController = Ember.Controller.extend({
    foo: 'index'
  });

  App.Router.map(function() {
    this.route('about');
  });

  bootApplication();

  Ember.run(router, 'handleURL', '/');

  assertEquality('/');

  var controller = container.lookup('controller:index'),
  view = Ember.View.views['index-view'];
  Ember.run(function() {
    controller.set('foo', 'about');
    view.set('foo', 'about');
  });

  assertEquality('/about');
});

test("the {{link-to}} helper calls preventDefault", function(){
  Router.map(function() {
    this.route("about");
  });

  bootApplication();

  Ember.run(router, 'handleURL', '/');

  var event = Ember.$.Event("click");
  Ember.$('#about-link', '#qunit-fixture').trigger(event);

  equal(event.isDefaultPrevented(), true, "should preventDefault");
});

test("the {{link-to}} helper does not call preventDefault if `preventDefault=false` is passed as an option", function(){
  Ember.TEMPLATES.index = Ember.Handlebars.compile("{{#link-to 'about' id='about-link' preventDefault=false}}About{{/link-to}}");

  Router.map(function() {
    this.route("about");
  });

  bootApplication();

  Ember.run(router, 'handleURL', '/');

  var event = Ember.$.Event("click");
  Ember.$('#about-link', '#qunit-fixture').trigger(event);

  equal(event.isDefaultPrevented(), false, "should not preventDefault");
});

test("the {{link-to}} helper does not throw an error if its route has exited", function(){
  expect(0);

  Ember.TEMPLATES.application = Ember.Handlebars.compile("{{#link-to 'index' id='home-link'}}Home{{/link-to}}{{#link-to 'post' defaultPost id='default-post-link'}}Default Post{{/link-to}}{{#if currentPost}}{{#link-to 'post' id='post-link'}}Post{{/link-to}}{{/if}}");

  App.ApplicationController = Ember.Controller.extend({
    needs: ['post'],
    currentPost: Ember.computed.alias('controllers.post.model')
  });

  App.PostController = Ember.Controller.extend({
    model: {id: 1}
  });

  Router.map(function() {
    this.route("post", {path: 'post/:post_id'});
  });

  bootApplication();

  Ember.run(router, 'handleURL', '/');

  Ember.run(function() {
    Ember.$('#default-post-link', '#qunit-fixture').click();
  });

  Ember.run(function() {
    Ember.$('#home-link', '#qunit-fixture').click();
  });
});

})();

(function() {
var App, $fixture;

function setupExample() {
  // setup templates
  Ember.TEMPLATES.application = Ember.Handlebars.compile("{{outlet}}");
  Ember.TEMPLATES.index = Ember.Handlebars.compile("<h1>People</h1><ul>{{#each model}}<li>Hello, <b>{{fullName}}</b>!</li>{{/each}}</ul>");


  App.Person = Ember.Object.extend({
    firstName: null,
    lastName: null,

    fullName: Ember.computed('firstName', 'lastName', function() {
      return this.get('firstName') + " " + this.get('lastName');
    })
  });

  App.IndexRoute = Ember.Route.extend({
    model: function() {
      var people = Ember.A([
        App.Person.create({
          firstName: "Tom",
          lastName: "Dale"
        }),
        App.Person.create({
          firstName: "Yehuda",
          lastName: "Katz"
        })
      ]);
      return people;
    }
  });
}

module("Homepage Example", {
  setup: function() {
    Ember.run(function() {
      App = Ember.Application.create({
        name: "App",
        rootElement: '#qunit-fixture'
      });
      App.deferReadiness();

      App.Router.reopen({
        location: 'none'
      });

      App.LoadingRoute = Ember.Route.extend();
    });

    $fixture = Ember.$('#qunit-fixture');


    setupExample();

  },

  teardown: function() {
    Ember.run(function() {
      App.destroy();
      App = null;

      Ember.TEMPLATES = {};
    });
  }
});


test("The example renders correctly", function() {
  Ember.run(App, 'advanceReadiness');

  equal($fixture.find('h1:contains(People)').length, 1);
  equal($fixture.find('li').length, 2);
  equal($fixture.find('li:nth-of-type(1)').text(), 'Hello, Tom Dale!');
  equal($fixture.find('li:nth-of-type(2)').text(), 'Hello, Yehuda Katz!');
});

})();

(function() {
var Router, App, AppView, templates, router, container;
var get = Ember.get,
    set = Ember.set,
    compile = Ember.Handlebars.compile,
    forEach = Ember.EnumerableUtils.forEach;

function bootApplication() {
  router = container.lookup('router:main');
  Ember.run(App, 'advanceReadiness');
}

function handleURL(path) {
  return Ember.run(function() {
    return router.handleURL(path).then(function(value) {
      ok(true, 'url: `' + path + '` was handled');
      return value;
    }, function(reason) {
      ok(false, 'failed to visit:`' + path + '` reason: `' + QUnit.jsDump.parse(reason));
      throw reason;
    });
  });
}

function handleURLAborts(path) {
  Ember.run(function() {
    router.handleURL(path).then(function(value) {
      ok(false, 'url: `' + path + '` was NOT to be handled');
    }, function(reason) {
      ok(reason && reason.message === "TransitionAborted",  'url: `' + path + '` was to be aborted');
    });
  });
}

function handleURLRejectsWith(path, expectedReason) {
  Ember.run(function() {
    router.handleURL(path).then(function(value) {
      ok(false, 'expected handleURLing: `' + path + '` to fail');
    }, function(reason) {
      equal(expectedReason, reason);
    });
  });
}

module("Basic Routing", {
  setup: function() {
    Ember.run(function() {
      App = Ember.Application.create({
        name: "App",
        rootElement: '#qunit-fixture'
      });

      App.deferReadiness();

      App.Router.reopen({
        location: 'none'
      });

      Router = App.Router;

      App.LoadingRoute = Ember.Route.extend({
      });

      container = App.__container__;

      Ember.TEMPLATES.application = compile("{{outlet}}");
      Ember.TEMPLATES.home = compile("<h3>Hours</h3>");
      Ember.TEMPLATES.homepage = compile("<h3>Megatroll</h3><p>{{home}}</p>");
      Ember.TEMPLATES.camelot = compile('<section><h3>Is a silly place</h3></section>');
    });
  },

  teardown: function() {
    Ember.run(function() {
      App.destroy();
      App = null;

      Ember.TEMPLATES = {};
    });
    Ember.TESTING_DEPRECATION = false;
  }
});

test("warn on URLs not included in the route set", function () {
  Router.map(function() {
    this.route("home", { path: "/" });
  });


  bootApplication();

  // it's tricky to use expectAssertion(fn) in a callback.
  var oldAssert = Ember.assert;
  Ember.assert = function(message, test){
    ok(true, test);
    equal("The URL '/what-is-this-i-dont-even' did not match any routes in your application", message);
  };

  Ember.run(function(){
    router.handleURL("/what-is-this-i-dont-even");
  });

  Ember.assert = oldAssert;

});

test("The Homepage", function() {
  Router.map(function() {
    this.route("home", { path: "/" });
  });

  App.HomeRoute = Ember.Route.extend({
  });

  var currentPath;

  App.ApplicationController = Ember.Controller.extend({
    currentPathDidChange: Ember.observer('currentPath', function() {
      currentPath = get(this, 'currentPath');
    })
  });

  bootApplication();

  equal(currentPath, 'home');
  equal(Ember.$('h3:contains(Hours)', '#qunit-fixture').length, 1, "The home template was rendered");
});

test("The Home page and the Camelot page with multiple Router.map calls", function() {
  Router.map(function() {
    this.route("home", { path: "/" });
  });

  Router.map(function() {
    this.route("camelot", {path: "/camelot"});
  });

  App.HomeRoute = Ember.Route.extend({
  });

  App.CamelotRoute = Ember.Route.extend({
  });

  var currentPath;

  App.ApplicationController = Ember.Controller.extend({
    currentPathDidChange: Ember.observer('currentPath', function() {
      currentPath = get(this, 'currentPath');
    })
  });

  App.CamelotController = Ember.Controller.extend({
    currentPathDidChange: Ember.observer('currentPath', function() {
      currentPath = get(this, 'currentPath');
    })
  });

  bootApplication();

  handleURL("/camelot");

  equal(currentPath, 'camelot');
  equal(Ember.$('h3:contains(silly)', '#qunit-fixture').length, 1, "The camelot template was rendered");

  handleURL("/");

  equal(currentPath, 'home');
  equal(Ember.$('h3:contains(Hours)', '#qunit-fixture').length, 1, "The home template was rendered");
});

test("The Homepage register as activeView", function() {
  Router.map(function() {
    this.route("home", { path: "/" });
    this.route("homepage");
  });

  App.HomeRoute = Ember.Route.extend({
  });

  App.HomepageRoute = Ember.Route.extend({
  });

  bootApplication();

  ok(router._lookupActiveView('home'), '`home` active view is connected');

  handleURL('/homepage');

  ok(router._lookupActiveView('homepage'), '`homepage` active view is connected');
  equal(router._lookupActiveView('home'), undefined, '`home` active view is disconnected');
});

test("The Homepage with explicit template name in renderTemplate", function() {
  Router.map(function() {
    this.route("home", { path: "/" });
  });

  App.HomeRoute = Ember.Route.extend({
    renderTemplate: function() {
      this.render('homepage');
    }
  });

  bootApplication();

  equal(Ember.$('h3:contains(Megatroll)', '#qunit-fixture').length, 1, "The homepage template was rendered");
});

test("An alternate template will pull in an alternate controller", function() {
  Router.map(function() {
    this.route("home", { path: "/" });
  });

  App.HomeRoute = Ember.Route.extend({
    renderTemplate: function() {
      this.render('homepage');
    }
  });

  App.HomepageController = Ember.Controller.extend({
    home: "Comes from homepage"
  });

  bootApplication();

  equal(Ember.$('h3:contains(Megatroll) + p:contains(Comes from homepage)', '#qunit-fixture').length, 1, "The homepage template was rendered");
});

test("The template will pull in an alternate controller via key/value", function() {
  Router.map(function() {
    this.route("homepage", { path: "/" });
  });

  App.HomepageRoute = Ember.Route.extend({
    renderTemplate: function() {
      this.render({controller: 'home'});
    }
  });

  App.HomeController = Ember.Controller.extend({
    home: "Comes from home."
  });

  bootApplication();

  equal(Ember.$('h3:contains(Megatroll) + p:contains(Comes from home.)', '#qunit-fixture').length, 1, "The homepage template was rendered from data from the HomeController");
});

test("The Homepage with explicit template name in renderTemplate and controller", function() {
  Router.map(function() {
    this.route("home", { path: "/" });
  });

  App.HomeController = Ember.Controller.extend({
    home: "YES I AM HOME"
  });

  App.HomeRoute = Ember.Route.extend({
    renderTemplate: function() {
      this.render('homepage');
    }
  });

  bootApplication();

  equal(Ember.$('h3:contains(Megatroll) + p:contains(YES I AM HOME)', '#qunit-fixture').length, 1, "The homepage template was rendered");
});

test("Renders correct view with slash notation", function() {
  Ember.TEMPLATES['home/page'] = compile("<p>{{view.name}}</p>");

  Router.map(function() {
    this.route("home", { path: "/" });
  });

  App.HomeRoute = Ember.Route.extend({
    renderTemplate: function() {
      this.render('home/page');
    }
  });

  App.HomePageView = Ember.View.extend({
    name: "Home/Page"
  });

  bootApplication();

  equal(Ember.$('p:contains(Home/Page)', '#qunit-fixture').length, 1, "The homepage template was rendered");
});

test("Renders the view given in the view option", function() {
  Ember.TEMPLATES['home'] = compile("<p>{{view.name}}</p>");

  Router.map(function() {
    this.route("home", { path: "/" });
  });

  App.HomeRoute = Ember.Route.extend({
    renderTemplate: function() {
      this.render({view: 'homePage'});
    }
  });

  App.HomePageView = Ember.View.extend({
    name: "Home/Page"
  });

  bootApplication();

  equal(Ember.$('p:contains(Home/Page)', '#qunit-fixture').length, 1, "The homepage view was rendered");
});

test('render does not replace templateName if user provided', function() {
  Router.map(function() {
    this.route("home", { path: "/" });
  });

  Ember.TEMPLATES.the_real_home_template = Ember.Handlebars.compile(
    "<p>THIS IS THE REAL HOME</p>"
  );

  App.HomeView = Ember.View.extend({
    templateName: 'the_real_home_template'
  });
  App.HomeController = Ember.Controller.extend();
  App.HomeRoute = Ember.Route.extend();

  bootApplication();

  equal(Ember.$('p', '#qunit-fixture').text(), "THIS IS THE REAL HOME", "The homepage template was rendered");
});

test('render does not replace template if user provided', function () {
  Router.map(function () {
    this.route("home", { path: "/" });
  });

  App.HomeView = Ember.View.extend({
    template: Ember.Handlebars.compile("<p>THIS IS THE REAL HOME</p>")
  });
  App.HomeController = Ember.Controller.extend();
  App.HomeRoute = Ember.Route.extend();

  bootApplication();

  Ember.run(function () {
    router.handleURL("/");
  });

  equal(Ember.$('p', '#qunit-fixture').text(), "THIS IS THE REAL HOME", "The homepage template was rendered");
});

test('render uses templateName from route', function() {
  Router.map(function() {
    this.route("home", { path: "/" });
  });

  Ember.TEMPLATES.the_real_home_template = Ember.Handlebars.compile(
    "<p>THIS IS THE REAL HOME</p>"
  );

  App.HomeController = Ember.Controller.extend();
  App.HomeRoute = Ember.Route.extend({
    templateName: 'the_real_home_template'
  });

  bootApplication();

  equal(Ember.$('p', '#qunit-fixture').text(), "THIS IS THE REAL HOME", "The homepage template was rendered");
});

test('defining templateName allows other templates to be rendered', function() {
  Router.map(function() {
    this.route("home", { path: "/" });
  });

  Ember.TEMPLATES.alert = Ember.Handlebars.compile(
    "<div class='alert-box'>Invader!</div>"
  );
  Ember.TEMPLATES.the_real_home_template = Ember.Handlebars.compile(
    "<p>THIS IS THE REAL HOME</p>{{outlet alert}}"
  );

  App.HomeController = Ember.Controller.extend();
  App.HomeRoute = Ember.Route.extend({
    templateName: 'the_real_home_template',
    actions: {
      showAlert: function(){
        this.render('alert', {
          into: 'home',
          outlet: 'alert'
        });
      }
    }
  });

  bootApplication();

  equal(Ember.$('p', '#qunit-fixture').text(), "THIS IS THE REAL HOME", "The homepage template was rendered");

  Ember.run(function(){
    router.send('showAlert');
  });

  equal(Ember.$('.alert-box', '#qunit-fixture').text(), "Invader!", "Template for alert was render into outlet");

});

test("The Homepage with a `setupController` hook", function() {
  Router.map(function() {
    this.route("home", { path: "/" });
  });

  App.HomeRoute = Ember.Route.extend({
    setupController: function(controller) {
      set(controller, 'hours', Ember.A([
        "Monday through Friday: 9am to 5pm",
        "Saturday: Noon to Midnight",
        "Sunday: Noon to 6pm"
      ]));
    }
  });

  Ember.TEMPLATES.home = Ember.Handlebars.compile(
    "<ul>{{#each entry in hours}}<li>{{entry}}</li>{{/each}}</ul>"
  );

  bootApplication();

  equal(Ember.$('ul li', '#qunit-fixture').eq(2).text(), "Sunday: Noon to 6pm", "The template was rendered with the hours context");
});

test("The route controller is still set when overriding the setupController hook", function() {
  Router.map(function() {
    this.route("home", { path: "/" });
  });

  App.HomeRoute = Ember.Route.extend({
    setupController: function(controller) {
      // no-op
      // importantly, we are not calling  this._super here
    }
  });

  container.register('controller:home', Ember.Controller.extend());

  bootApplication();

  deepEqual(container.lookup('route:home').controller, container.lookup('controller:home'), "route controller is the home controller");
});

test("The route controller can be specified via controllerName", function() {
  Router.map(function() {
    this.route("home", { path: "/" });
  });

  Ember.TEMPLATES.home = Ember.Handlebars.compile(
    "<p>{{myValue}}</p>"
  );

  App.HomeRoute = Ember.Route.extend({
    controllerName: 'myController'
  });

  container.register('controller:myController', Ember.Controller.extend({
    myValue: "foo"
  }));

  bootApplication();

  deepEqual(container.lookup('route:home').controller, container.lookup('controller:myController'), "route controller is set by controllerName");
  equal(Ember.$('p', '#qunit-fixture').text(), "foo", "The homepage template was rendered with data from the custom controller");
});

test("The route controller specified via controllerName is used in render", function() {
  Router.map(function() {
    this.route("home", { path: "/" });
  });

  Ember.TEMPLATES.alternative_home = Ember.Handlebars.compile(
    "<p>alternative home: {{myValue}}</p>"
  );

  App.HomeRoute = Ember.Route.extend({
    controllerName: 'myController',
    renderTemplate: function() {
      this.render("alternative_home");
    }
  });

  container.register('controller:myController', Ember.Controller.extend({
    myValue: "foo"
  }));

  bootApplication();

  deepEqual(container.lookup('route:home').controller, container.lookup('controller:myController'), "route controller is set by controllerName");
  equal(Ember.$('p', '#qunit-fixture').text(), "alternative home: foo", "The homepage template was rendered with data from the custom controller");
});

test("The Homepage with a `setupController` hook modifying other controllers", function() {
  Router.map(function() {
    this.route("home", { path: "/" });
  });

  App.HomeRoute = Ember.Route.extend({
    setupController: function(controller) {
      set(this.controllerFor('home'), 'hours', Ember.A([
        "Monday through Friday: 9am to 5pm",
        "Saturday: Noon to Midnight",
        "Sunday: Noon to 6pm"
      ]));
    }
  });

  Ember.TEMPLATES.home = Ember.Handlebars.compile(
    "<ul>{{#each entry in hours}}<li>{{entry}}</li>{{/each}}</ul>"
  );

  bootApplication();

  equal(Ember.$('ul li', '#qunit-fixture').eq(2).text(), "Sunday: Noon to 6pm", "The template was rendered with the hours context");
});

test("The Homepage with a computed context that does not get overridden", function() {
  Router.map(function() {
    this.route("home", { path: "/" });
  });

  App.HomeController = Ember.ArrayController.extend({
    content: Ember.computed(function() {
      return Ember.A([
        "Monday through Friday: 9am to 5pm",
        "Saturday: Noon to Midnight",
        "Sunday: Noon to 6pm"
      ]);
    })
  });

  Ember.TEMPLATES.home = Ember.Handlebars.compile(
    "<ul>{{#each}}<li>{{this}}</li>{{/each}}</ul>"
  );

  bootApplication();

  equal(Ember.$('ul li', '#qunit-fixture').eq(2).text(), "Sunday: Noon to 6pm", "The template was rendered with the context intact");
});

test("The Homepage getting its controller context via model", function() {
  Router.map(function() {
    this.route("home", { path: "/" });
  });

  App.HomeRoute = Ember.Route.extend({
    model: function() {
      return Ember.A([
        "Monday through Friday: 9am to 5pm",
        "Saturday: Noon to Midnight",
        "Sunday: Noon to 6pm"
      ]);
    },

    setupController: function(controller, model) {
      equal(this.controllerFor('home'), controller);

      set(this.controllerFor('home'), 'hours', model);
    }
  });

  Ember.TEMPLATES.home = Ember.Handlebars.compile(
    "<ul>{{#each entry in hours}}<li>{{entry}}</li>{{/each}}</ul>"
  );

  bootApplication();

  equal(Ember.$('ul li', '#qunit-fixture').eq(2).text(), "Sunday: Noon to 6pm", "The template was rendered with the hours context");
});

test("The Specials Page getting its controller context by deserializing the params hash", function() {
  Router.map(function() {
    this.route("home", { path: "/" });
    this.resource("special", { path: "/specials/:menu_item_id" });
  });

  App.SpecialRoute = Ember.Route.extend({
    model: function(params) {
      return Ember.Object.create({
        menuItemId: params.menu_item_id
      });
    },

    setupController: function(controller, model) {
      set(controller, 'content', model);
    }
  });

  Ember.TEMPLATES.special = Ember.Handlebars.compile(
    "<p>{{content.menuItemId}}</p>"
  );

  bootApplication();

  container.register('controller:special', Ember.Controller.extend());

  handleURL("/specials/1");

  equal(Ember.$('p', '#qunit-fixture').text(), "1", "The model was used to render the template");
});

test("The Specials Page defaults to looking models up via `find`", function() {
  Router.map(function() {
    this.route("home", { path: "/" });
    this.resource("special", { path: "/specials/:menu_item_id" });
  });

  App.MenuItem = Ember.Object.extend();
  App.MenuItem.reopenClass({
    find: function(id) {
      return App.MenuItem.create({
        id: id
      });
    }
  });

  App.SpecialRoute = Ember.Route.extend({
    setupController: function(controller, model) {
      set(controller, 'content', model);
    }
  });

  Ember.TEMPLATES.special = Ember.Handlebars.compile(
    "<p>{{content.id}}</p>"
  );

  bootApplication();

  container.register('controller:special', Ember.Controller.extend());

  handleURL("/specials/1");

  equal(Ember.$('p', '#qunit-fixture').text(), "1", "The model was used to render the template");
});

test("The Special Page returning a promise puts the app into a loading state until the promise is resolved", function() {
  Router.map(function() {
    this.route("home", { path: "/" });
    this.resource("special", { path: "/specials/:menu_item_id" });
  });

  var menuItem;

  App.MenuItem = Ember.Object.extend(Ember.DeferredMixin);
  App.MenuItem.reopenClass({
    find: function(id) {
      menuItem = App.MenuItem.create({
        id: id
      });

      return menuItem;
    }
  });

  App.LoadingRoute = Ember.Route.extend({

  });

  App.SpecialRoute = Ember.Route.extend({
    setupController: function(controller, model) {
      set(controller, 'content', model);
    }
  });

  Ember.TEMPLATES.special = Ember.Handlebars.compile(
    "<p>{{content.id}}</p>"
  );

  Ember.TEMPLATES.loading = Ember.Handlebars.compile(
    "<p>LOADING!</p>"
  );

  bootApplication();

  container.register('controller:special', Ember.Controller.extend());

  handleURL("/specials/1");

  equal(Ember.$('p', '#qunit-fixture').text(), "LOADING!", "The app is in the loading state");

  Ember.run(function() {
    menuItem.resolve(menuItem);
  });

  equal(Ember.$('p', '#qunit-fixture').text(), "1", "The app is now in the specials state");
});

test("The loading state doesn't get entered for promises that resolve on the same run loop", function() {
  Router.map(function() {
    this.route("home", { path: "/" });
    this.resource("special", { path: "/specials/:menu_item_id" });
  });

  App.MenuItem = Ember.Object.extend();
  App.MenuItem.reopenClass({
    find: function(id) {
      return { id: id };
    }
  });

  App.LoadingRoute = Ember.Route.extend({
    enter: function() {
      ok(false, "LoadingRoute shouldn't have been entered.");
    }
  });

  App.SpecialRoute = Ember.Route.extend({
    setupController: function(controller, model) {
      set(controller, 'content', model);
    }
  });

  Ember.TEMPLATES.special = Ember.Handlebars.compile(
    "<p>{{content.id}}</p>"
  );

  Ember.TEMPLATES.loading = Ember.Handlebars.compile(
    "<p>LOADING!</p>"
  );

  bootApplication();

  container.register('controller:special', Ember.Controller.extend());

  handleURL("/specials/1");

  equal(Ember.$('p', '#qunit-fixture').text(), "1", "The app is now in the specials state");
});

asyncTest("The Special page returning an error fires the error hook on SpecialRoute", function() {
  Router.map(function() {
    this.route("home", { path: "/" });
    this.resource("special", { path: "/specials/:menu_item_id" });
  });

  var menuItem;

  App.MenuItem = Ember.Object.extend(Ember.DeferredMixin);
  App.MenuItem.reopenClass({
    find: function(id) {
      menuItem = App.MenuItem.create({ id: id });
      Ember.run.later(function() { menuItem.resolve(menuItem); }, 1);
      return menuItem;
    }
  });

  App.SpecialRoute = Ember.Route.extend({
    setup: function() {
      throw 'Setup error';
    },
    actions: {
      error: function(reason) {
        equal(reason, 'Setup error');
        start();
      }
    }
  });

  bootApplication();

  handleURLRejectsWith('/specials/1', 'Setup error');
});

asyncTest("The Special page returning an error invokes SpecialRoute's error handler", function() {
  Router.map(function() {
    this.route("home", { path: "/" });
    this.resource("special", { path: "/specials/:menu_item_id" });
  });

  var menuItem;

  App.MenuItem = Ember.Object.extend(Ember.DeferredMixin);
  App.MenuItem.reopenClass({
    find: function(id) {
      menuItem = App.MenuItem.create({ id: id });
      Ember.run.later(function() {
        menuItem.resolve(menuItem);
      }, 1);
      return menuItem;
    }
  });

  App.SpecialRoute = Ember.Route.extend({
    setup: function() {
      throw 'Setup error';
    },
    actions: {
      error: function(reason) {
        equal(reason, 'Setup error', 'SpecialRoute#error received the error thrown from setup');
        start();
      }
    }
  });

  bootApplication();

  handleURLRejectsWith('/specials/1', 'Setup error');
});

function testOverridableErrorHandler(handlersName) {

  expect(2);

  Router.map(function() {
    this.route("home", { path: "/" });
    this.resource("special", { path: "/specials/:menu_item_id" });
  });

  var menuItem;

  App.MenuItem = Ember.Object.extend(Ember.DeferredMixin);
  App.MenuItem.reopenClass({
    find: function(id) {
      menuItem = App.MenuItem.create({ id: id });
      Ember.run.later(function() {
        menuItem.resolve(menuItem);
      }, 1);
      return menuItem;
    }
  });

  var attrs = {};
  attrs[handlersName] = {
    error: function(reason) {
      equal(reason, 'Setup error', "error was correctly passed to custom ApplicationRoute handler");
      start();
    }
  };

  App.ApplicationRoute = Ember.Route.extend(attrs);

  App.SpecialRoute = Ember.Route.extend({
    setup: function() {
      throw 'Setup error';
    }
  });

  bootApplication();

  handleURLRejectsWith("/specials/1", "Setup error");
}

asyncTest("ApplicationRoute's default error handler can be overridden", function() {
  testOverridableErrorHandler('actions');
});

asyncTest("ApplicationRoute's default error handler can be overridden (with DEPRECATED `events`)", function() {
  Ember.TESTING_DEPRECATION = true;
  testOverridableErrorHandler('events');
});

asyncTest("Moving from one page to another triggers the correct callbacks", function() {
  expect(3);

  Router.map(function() {
    this.route("home", { path: "/" });
    this.resource("special", { path: "/specials/:menu_item_id" });
  });

  App.MenuItem = Ember.Object.extend(Ember.DeferredMixin);

  App.SpecialRoute = Ember.Route.extend({
    setupController: function(controller, model) {
      set(controller, 'content', model);
    }
  });

  Ember.TEMPLATES.home = Ember.Handlebars.compile(
    "<h3>Home</h3>"
  );

  Ember.TEMPLATES.special = Ember.Handlebars.compile(
    "<p>{{content.id}}</p>"
  );

  bootApplication();

  container.register('controller:special', Ember.Controller.extend());

  var transition = handleURL('/');

  Ember.run(function() {
    transition.then(function() {
      equal(Ember.$('h3', '#qunit-fixture').text(), "Home", "The app is now in the initial state");

      var promiseContext = App.MenuItem.create({ id: 1 });
      Ember.run.later(function() {
        promiseContext.resolve(promiseContext);
      }, 1);

      return router.transitionTo('special', promiseContext);
    }).then(function(result) {
      deepEqual(router.location.path, '/specials/1');
      start();
    });
  });
});

asyncTest("Nested callbacks are not exited when moving to siblings", function() {
  Router.map(function() {
    this.resource("root", { path: "/" }, function() {
      this.resource("special", { path: "/specials/:menu_item_id" });
    });
  });

  var currentPath;

  App.ApplicationController = Ember.Controller.extend({
    currentPathDidChange: Ember.observer('currentPath', function() {
      currentPath = get(this, 'currentPath');
    })
  });

  var menuItem;

  App.MenuItem = Ember.Object.extend(Ember.DeferredMixin);
  App.MenuItem.reopenClass({
    find: function(id) {
      menuItem = App.MenuItem.create({ id: id });
      return menuItem;
    }
  });

  App.LoadingRoute = Ember.Route.extend({

  });

  App.RootRoute = Ember.Route.extend({
    model: function() {
      rootModel++;
      return this._super.apply(this, arguments);
    },

    serialize: function() {
      rootSerialize++;
      return this._super.apply(this, arguments);
    },

    setupController: function() {
      rootSetup++;
    },

    renderTemplate: function() {
      rootRender++;
    }
  });

  App.HomeRoute = Ember.Route.extend({

  });

  App.SpecialRoute = Ember.Route.extend({
    setupController: function(controller, model) {
      set(controller, 'content', model);
    }
  });

  Ember.TEMPLATES['root/index'] = Ember.Handlebars.compile(
    "<h3>Home</h3>"
  );

  Ember.TEMPLATES.special = Ember.Handlebars.compile(
    "<p>{{content.id}}</p>"
  );

  Ember.TEMPLATES.loading = Ember.Handlebars.compile(
    "<p>LOADING!</p>"
  );

  var rootSetup = 0, rootRender = 0, rootModel = 0, rootSerialize = 0;

  bootApplication();

  container.register('controller:special', Ember.Controller.extend());

  equal(Ember.$('h3', '#qunit-fixture').text(), "Home", "The app is now in the initial state");
  equal(rootSetup, 1, "The root setup was triggered");
  equal(rootRender, 1, "The root render was triggered");
  equal(rootSerialize, 0, "The root serialize was not called");
  equal(rootModel, 1, "The root model was called");

  router = container.lookup('router:main');

  Ember.run(function() {
    var menuItem = App.MenuItem.create({ id: 1 });
    Ember.run.later(function() { menuItem.resolve(menuItem); }, 1);

    router.transitionTo('special', menuItem).then(function(result) {
      equal(rootSetup, 1, "The root setup was not triggered again");
      equal(rootRender, 1, "The root render was not triggered again");
      equal(rootSerialize, 0, "The root serialize was not called");

      // TODO: Should this be changed?
      equal(rootModel, 1, "The root model was called again");

      deepEqual(router.location.path, '/specials/1');
      equal(currentPath, 'root.special');

      start();
    });
  });
});

asyncTest("Events are triggered on the controller if a matching action name is implemented", function() {
  Router.map(function() {
    this.route("home", { path: "/" });
  });

  var model = { name: "Tom Dale" };
  var stateIsNotCalled = true;

  App.HomeRoute = Ember.Route.extend({
    model: function() {
      return model;
    },

    actions: {
      showStuff: function(obj) {
        stateIsNotCalled = false;
      }
    }
  });

  Ember.TEMPLATES.home = Ember.Handlebars.compile(
    "<a {{action showStuff content}}>{{name}}</a>"
  );

  var controller = Ember.Controller.extend({
    actions: {
      showStuff: function(context) {
        ok (stateIsNotCalled, "an event on the state is not triggered");
        deepEqual(context, { name: "Tom Dale" }, "an event with context is passed");
        start();
      }
    }
  });

  container.register('controller:home', controller);

  bootApplication();

  var actionId = Ember.$("#qunit-fixture a").data("ember-action");
  var action = Ember.Handlebars.ActionHelper.registeredActions[actionId];
  var event = new Ember.$.Event("click");
  action.handler(event);
});

asyncTest("Events are triggered on the current state when defined in `actions` object", function() {
  Router.map(function() {
    this.route("home", { path: "/" });
  });

  var model = { name: "Tom Dale" };

  App.HomeRoute = Ember.Route.extend({
    model: function() {
      return model;
    },

    actions: {
      showStuff: function(obj) {
        ok(this instanceof App.HomeRoute, "the handler is an App.HomeRoute");
        // Using Ember.copy removes any private Ember vars which older IE would be confused by
        deepEqual(Ember.copy(obj, true), { name: "Tom Dale" }, "the context is correct");
        start();
      }
    }
  });

  Ember.TEMPLATES.home = Ember.Handlebars.compile(
    "<a {{action showStuff content}}>{{name}}</a>"
  );

  bootApplication();

  var actionId = Ember.$("#qunit-fixture a").data("ember-action");
  var action = Ember.Handlebars.ActionHelper.registeredActions[actionId];
  var event = new Ember.$.Event("click");
  action.handler(event);
});

asyncTest("Events defined in `actions` object are triggered on the current state when routes are nested", function() {
  Router.map(function() {
    this.resource("root", { path: "/" }, function() {
      this.route("index", { path: "/" });
    });
  });

  var model = { name: "Tom Dale" };

  App.RootRoute = Ember.Route.extend({
    actions: {
      showStuff: function(obj) {
        ok(this instanceof App.RootRoute, "the handler is an App.HomeRoute");
        // Using Ember.copy removes any private Ember vars which older IE would be confused by
        deepEqual(Ember.copy(obj, true), { name: "Tom Dale" }, "the context is correct");
        start();
      }
    }
  });

  App.RootIndexRoute = Ember.Route.extend({
    model: function() {
      return model;
    }
  });

  Ember.TEMPLATES['root/index'] = Ember.Handlebars.compile(
    "<a {{action showStuff content}}>{{name}}</a>"
  );

  bootApplication();

  var actionId = Ember.$("#qunit-fixture a").data("ember-action");
  var action = Ember.Handlebars.ActionHelper.registeredActions[actionId];
  var event = new Ember.$.Event("click");
  action.handler(event);
});

asyncTest("Events are triggered on the current state when defined in `events` object (DEPRECATED)", function() {
  Ember.TESTING_DEPRECATION = true;
  Router.map(function() {
    this.route("home", { path: "/" });
  });

  var model = { name: "Tom Dale" };

  App.HomeRoute = Ember.Route.extend({
    model: function() {
      return model;
    },

    events: {
      showStuff: function(obj) {
        ok(this instanceof App.HomeRoute, "the handler is an App.HomeRoute");
        // Using Ember.copy removes any private Ember vars which older IE would be confused by
        deepEqual(Ember.copy(obj, true), { name: "Tom Dale" }, "the context is correct");
        start();
      }
    }
  });

  Ember.TEMPLATES.home = Ember.Handlebars.compile(
    "<a {{action showStuff content}}>{{name}}</a>"
  );

  bootApplication();

  var actionId = Ember.$("#qunit-fixture a").data("ember-action");
  var action = Ember.Handlebars.ActionHelper.registeredActions[actionId];
  var event = new Ember.$.Event("click");
  action.handler(event);
});

asyncTest("Events defined in `events` object are triggered on the current state when routes are nested (DEPRECATED)", function() {
  Ember.TESTING_DEPRECATION = true;
  Router.map(function() {
    this.resource("root", { path: "/" }, function() {
      this.route("index", { path: "/" });
    });
  });

  var model = { name: "Tom Dale" };

  App.RootRoute = Ember.Route.extend({
    events: {
      showStuff: function(obj) {
        ok(this instanceof App.RootRoute, "the handler is an App.HomeRoute");
        // Using Ember.copy removes any private Ember vars which older IE would be confused by
        deepEqual(Ember.copy(obj, true), { name: "Tom Dale" }, "the context is correct");
        start();
      }
    }
  });

  App.RootIndexRoute = Ember.Route.extend({
    model: function() {
      return model;
    }
  });

  Ember.TEMPLATES['root/index'] = Ember.Handlebars.compile(
    "<a {{action showStuff content}}>{{name}}</a>"
  );

  bootApplication();

  var actionId = Ember.$("#qunit-fixture a").data("ember-action");
  var action = Ember.Handlebars.ActionHelper.registeredActions[actionId];
  var event = new Ember.$.Event("click");
  action.handler(event);
});

test("Events can be handled by inherited event handlers", function() {

  expect(4);

  App.SuperRoute = Ember.Route.extend({
    actions: {
      foo: function() {
        ok(true, 'foo');
      },
      bar: function(msg) {
        equal(msg, "HELLO");
      }
    }
  });

  App.RouteMixin = Ember.Mixin.create({
    actions: {
      bar: function(msg) {
        equal(msg, "HELLO");
        this._super(msg);
      }
    }
  });

  App.IndexRoute = App.SuperRoute.extend(App.RouteMixin, {
    actions: {
      baz: function() {
        ok(true, 'baz');
      }
    }
  });

  bootApplication();

  router.send("foo");
  router.send("bar", "HELLO");
  router.send("baz");
});

asyncTest("Events are triggered on the controller if a matching action name is implemented as a method (DEPRECATED)", function() {
  Ember.TESTING_DEPRECATION = true;
  Router.map(function() {
    this.route("home", { path: "/" });
  });

  var model = { name: "Tom Dale" };
  var stateIsNotCalled = true;

  App.HomeRoute = Ember.Route.extend({
    model: function() {
      return model;
    },

    events: {
      showStuff: function(obj) {
        stateIsNotCalled = false;
      }
    }
  });

  Ember.TEMPLATES.home = Ember.Handlebars.compile(
    "<a {{action showStuff content}}>{{name}}</a>"
  );

  var controller = Ember.Controller.extend({
    showStuff: function(context) {
      ok (stateIsNotCalled, "an event on the state is not triggered");
      deepEqual(context, { name: "Tom Dale" }, "an event with context is passed");
      start();
    }
  });

  container.register('controller:home', controller);

  bootApplication();

  var actionId = Ember.$("#qunit-fixture a").data("ember-action");
  var action = Ember.Handlebars.ActionHelper.registeredActions[actionId];
  var event = new Ember.$.Event("click");
  action.handler(event);
});


asyncTest("actions can be triggered with multiple arguments", function() {
  Router.map(function() {
    this.resource("root", { path: "/" }, function() {
      this.route("index", { path: "/" });
    });
  });

  var model1 = { name: "Tilde" },
      model2 = { name: "Tom Dale" };

  App.RootRoute = Ember.Route.extend({
    actions: {
      showStuff: function(obj1, obj2) {
        ok(this instanceof App.RootRoute, "the handler is an App.HomeRoute");
        // Using Ember.copy removes any private Ember vars which older IE would be confused by
        deepEqual(Ember.copy(obj1, true), { name: "Tilde" }, "the first context is correct");
        deepEqual(Ember.copy(obj2, true), { name: "Tom Dale" }, "the second context is correct");
        start();
      }
    }
  });

  App.RootIndexController = Ember.Controller.extend({
    model1: model1,
    model2: model2
  });

  Ember.TEMPLATES['root/index'] = Ember.Handlebars.compile(
    "<a {{action showStuff model1 model2}}>{{model1.name}}</a>"
  );

  bootApplication();

  var actionId = Ember.$("#qunit-fixture a").data("ember-action");
  var action = Ember.Handlebars.ActionHelper.registeredActions[actionId];
  var event = new Ember.$.Event("click");
  action.handler(event);
});

test("transitioning multiple times in a single run loop only sets the URL once", function() {
  Router.map(function() {
    this.route("root", { path: "/" });
    this.route("foo");
    this.route("bar");
  });

  bootApplication();

  var urlSetCount = 0;

  router.get('location').setURL = function(path) {
    urlSetCount++;
    set(this, 'path', path);
  };

  equal(urlSetCount, 0);

  Ember.run(function() {
    router.transitionTo("foo");
    router.transitionTo("bar");
  });

  equal(urlSetCount, 1);
  equal(router.get('location').getURL(), "/bar");
});

test('navigating away triggers a url property change', function() {

  expect(3);

  Router.map(function() {
    this.route('root', { path: '/' });
    this.route('foo', { path: '/foo' });
    this.route('bar', { path: '/bar' });
  });

  bootApplication();

  Ember.run(function() {
    Ember.addObserver(router, 'url', function() {
      ok(true, "url change event was fired");
    });
  });

  forEach(['foo', 'bar', '/foo'], function(destination) {
    Ember.run(router, 'transitionTo', destination);
  });
});

test("using replaceWith calls location.replaceURL if available", function() {
  var setCount = 0,
      replaceCount = 0;

  Router.reopen({
    location: Ember.NoneLocation.createWithMixins({
      setURL: function(path) {
        setCount++;
        set(this, 'path', path);
      },

      replaceURL: function(path) {
        replaceCount++;
        set(this, 'path', path);
      }
    })
  });

  Router.map(function() {
    this.route("root", { path: "/" });
    this.route("foo");
  });

  bootApplication();

  equal(setCount, 0);
  equal(replaceCount, 0);

  Ember.run(function() {
    router.replaceWith("foo");
  });

  equal(setCount, 0, 'should not call setURL');
  equal(replaceCount, 1, 'should call replaceURL once');
  equal(router.get('location').getURL(), "/foo");
});

test("using replaceWith calls setURL if location.replaceURL is not defined", function() {
  var setCount = 0;

  Router.reopen({
    location: Ember.NoneLocation.createWithMixins({
      setURL: function(path) {
        setCount++;
        set(this, 'path', path);
      }
    })
  });

  Router.map(function() {
    this.route("root", { path: "/" });
    this.route("foo");
  });

  bootApplication();

  equal(setCount, 0);

  Ember.run(function() {
    router.replaceWith("foo");
  });

  equal(setCount, 1, 'should call setURL once');
  equal(router.get('location').getURL(), "/foo");
});

test("It is possible to get the model from a parent route", function() {
  expect(9);

  Router.map(function() {
    this.resource("the_post", { path: "/posts/:post_id" }, function() {
      this.resource("comments");
    });
  });

  var post1 = {}, post2 = {}, post3 = {}, currentPost;

  var posts = {
    1: post1,
    2: post2,
    3: post3
  };

  App.ThePostRoute = Ember.Route.extend({
    model: function(params) {
      return posts[params.post_id];
    }
  });

  App.CommentsRoute = Ember.Route.extend({
    model: function() {
      // Allow both underscore / camelCase format.
      equal(this.modelFor('thePost'), currentPost);
      equal(this.modelFor('the_post'), currentPost);
    }
  });

  bootApplication();

  currentPost = post1;
  handleURL("/posts/1/comments");

  currentPost = post2;
  handleURL("/posts/2/comments");

  currentPost = post3;
  handleURL("/posts/3/comments");
});

test("A redirection hook is provided", function() {
  Router.map(function() {
    this.route("choose", { path: "/" });
    this.route("home");
  });

  var chooseFollowed = 0, destination;

  App.ChooseRoute = Ember.Route.extend({
    redirect: function() {
      if (destination) {
        this.transitionTo(destination);
      }
    },

    setupController: function() {
      chooseFollowed++;
    }
  });

  destination = 'home';

  bootApplication();

  equal(chooseFollowed, 0, "The choose route wasn't entered since a transition occurred");
  equal(Ember.$("h3:contains(Hours)", "#qunit-fixture").length, 1, "The home template was rendered");
  equal(router.container.lookup('controller:application').get('currentPath'), 'home');
});

test("Redirecting from the middle of a route aborts the remainder of the routes", function() {
  expect(3);

  Router.map(function() {
    this.route("home");
    this.resource("foo", function() {
      this.resource("bar", function() {
        this.route("baz");
      });
    });
  });

  App.BarRoute = Ember.Route.extend({
    redirect: function() {
      this.transitionTo("home");
    },
    setupController: function() {
      ok(false, "Should transition before setupController");
    }
  });

  App.BarBazRoute = Ember.Route.extend({
    enter: function() {
      ok(false, "Should abort transition getting to next route");
    }
  });

  bootApplication();

  handleURLAborts("/foo/bar/baz");

  equal(router.container.lookup('controller:application').get('currentPath'), 'home');
  equal(router.get('location').getURL(), "/home");
});

test("Redirecting to the current target in the middle of a route does not abort initial routing", function() {
  expect(5);

  Router.map(function() {
    this.route("home");
    this.resource("foo", function() {
      this.resource("bar", function() {
        this.route("baz");
      });
    });
  });

  var successCount = 0;
  App.BarRoute = Ember.Route.extend({
    redirect: function() {
      this.transitionTo("bar.baz").then(function() {
        successCount++;
      });
    },

    setupController: function() {
      ok(true, "Should still invoke bar's setupController");
    }
  });

  App.BarBazRoute = Ember.Route.extend({
    setupController: function() {
      ok(true, "Should still invoke bar.baz's setupController");
    }
  });

  bootApplication();

  handleURL("/foo/bar/baz");

  equal(router.container.lookup('controller:application').get('currentPath'), 'foo.bar.baz');
  equal(successCount, 1, 'transitionTo success handler was called once');

});

test("Redirecting to the current target with a different context aborts the remainder of the routes", function() {
  expect(4);

  Router.map(function() {
    this.route("home");
    this.resource("foo", function() {
      this.resource("bar", { path: "bar/:id" }, function() {
        this.route("baz");
      });
    });
  });

  var model = { id: 2 };

  var count = 0;

  App.BarRoute = Ember.Route.extend({
    afterModel: function(context) {
      if (count++ > 10) {
        ok(false, 'infinite loop');
      } else {
        this.transitionTo("bar.baz",  model);
      }
    },

    serialize: function(params) {
      return params;
    }
  });

  App.BarBazRoute = Ember.Route.extend({
    setupController: function() {
      ok(true, "Should still invoke setupController");
    }
  });

  bootApplication();

  handleURLAborts("/foo/bar/1/baz");

  equal(router.container.lookup('controller:application').get('currentPath'), 'foo.bar.baz');
  equal(router.get('location').getURL(), "/foo/bar/2/baz");
});

test("Transitioning from a parent event does not prevent currentPath from being set", function() {
  Router.map(function() {
    this.resource("foo", function() {
      this.resource("bar", function() {
        this.route("baz");
      });
      this.route("qux");
    });
  });

  App.FooRoute = Ember.Route.extend({
    actions: {
      goToQux: function() {
        this.transitionTo('foo.qux');
      }
    }
  });

  bootApplication();

  var applicationController = router.container.lookup('controller:application');

  handleURL("/foo/bar/baz");

  equal(applicationController.get('currentPath'), 'foo.bar.baz');

  Ember.run(function() {
    router.send("goToQux");
  });

  equal(applicationController.get('currentPath'), 'foo.qux');
  equal(router.get('location').getURL(), "/foo/qux");
});

test("Generated names can be customized when providing routes with dot notation", function() {
  expect(4);

  Ember.TEMPLATES.index = compile("<div>Index</div>");
  Ember.TEMPLATES.application = compile("<h1>Home</h1><div class='main'>{{outlet}}</div>");
  Ember.TEMPLATES.foo = compile("<div class='middle'>{{outlet}}</div>");
  Ember.TEMPLATES.bar = compile("<div class='bottom'>{{outlet}}</div>");
  Ember.TEMPLATES['bar/baz'] = compile("<p>{{name}}Bottom!</p>");

  Router.map(function() {
    this.resource("foo", { path: "/top" }, function() {
      this.resource("bar", { path: "/middle" }, function() {
        this.route("baz", { path: "/bottom" });
      });
    });
  });

  App.FooRoute = Ember.Route.extend({
    renderTemplate: function() {
      ok(true, "FooBarRoute was called");
      return this._super.apply(this, arguments);
    }
  });

  App.BarBazRoute = Ember.Route.extend({
    renderTemplate: function() {
      ok(true, "BarBazRoute was called");
      return this._super.apply(this, arguments);
    }
  });

  App.BarController = Ember.Controller.extend({
    name: "Bar"
  });

  App.BarBazController = Ember.Controller.extend({
    name: "BarBaz"
  });

  bootApplication();

  handleURL("/top/middle/bottom");

  equal(Ember.$('.main .middle .bottom p', '#qunit-fixture').text(), "BarBazBottom!", "The templates were rendered into their appropriate parents");
});

test("Child routes render into their parent route's template by default", function() {
  Ember.TEMPLATES.index = compile("<div>Index</div>");
  Ember.TEMPLATES.application = compile("<h1>Home</h1><div class='main'>{{outlet}}</div>");
  Ember.TEMPLATES.top = compile("<div class='middle'>{{outlet}}</div>");
  Ember.TEMPLATES.middle = compile("<div class='bottom'>{{outlet}}</div>");
  Ember.TEMPLATES['middle/bottom'] = compile("<p>Bottom!</p>");

  Router.map(function() {
    this.resource("top", function() {
      this.resource("middle", function() {
        this.route("bottom");
      });
    });
  });

  bootApplication();

  handleURL("/top/middle/bottom");

  equal(Ember.$('.main .middle .bottom p', '#qunit-fixture').text(), "Bottom!", "The templates were rendered into their appropriate parents");
});

test("Child routes render into specified template", function() {
  Ember.TEMPLATES.index = compile("<div>Index</div>");
  Ember.TEMPLATES.application = compile("<h1>Home</h1><div class='main'>{{outlet}}</div>");
  Ember.TEMPLATES.top = compile("<div class='middle'>{{outlet}}</div>");
  Ember.TEMPLATES.middle = compile("<div class='bottom'>{{outlet}}</div>");
  Ember.TEMPLATES['middle/bottom'] = compile("<p>Bottom!</p>");

  Router.map(function() {
    this.resource("top", function() {
      this.resource("middle", function() {
        this.route("bottom");
      });
    });
  });

  App.MiddleBottomRoute = Ember.Route.extend({
    renderTemplate: function() {
      this.render('middle/bottom', { into: 'top' });
    }
  });

  bootApplication();

  handleURL("/top/middle/bottom");

  equal(Ember.$('.main .middle .bottom p', '#qunit-fixture').length, 0, "should not render into the middle template");
  equal(Ember.$('.main .middle > p', '#qunit-fixture').text(), "Bottom!", "The template was rendered into the top template");
});

test("Rendering into specified template with slash notation", function() {
  Ember.TEMPLATES['person/profile'] = compile("profile {{outlet}}");
  Ember.TEMPLATES['person/details'] = compile("details!");

  Router.map(function() {
    this.resource("home", { path: '/' });
  });

  App.HomeRoute = Ember.Route.extend({
    renderTemplate: function() {
      this.render('person/profile');
      this.render('person/details', { into: 'person/profile' });
    }
  });

  bootApplication();

  equal(Ember.$('#qunit-fixture:contains(profile details!)').length, 1, "The templates were rendered");
});


test("Parent route context change", function() {
  var editCount = 0,
      editedPostIds = Ember.A();

  Ember.TEMPLATES.application = compile("{{outlet}}");
  Ember.TEMPLATES.posts = compile("{{outlet}}");
  Ember.TEMPLATES.post = compile("{{outlet}}");
  Ember.TEMPLATES['post/index'] = compile("showing");
  Ember.TEMPLATES['post/edit'] = compile("editing");

  Router.map(function() {
    this.resource("posts", function() {
      this.resource("post", { path: "/:postId" }, function() {
        this.route("edit");
      });
    });
  });

  App.PostsRoute = Ember.Route.extend({
    actions: {
      showPost: function(context) {
        this.transitionTo('post', context);
      }
    }
  });

  App.PostRoute = Ember.Route.extend({
    model: function(params) {
      return {id: params.postId};
    },

    actions: {
      editPost: function(context) {
        this.transitionTo('post.edit');
      }
    }
  });

  App.PostEditRoute = Ember.Route.extend({
    model: function(params) {
      var postId = this.modelFor("post").id;
      editedPostIds.push(postId);
      return null;
    },
    setup: function() {
      this._super.apply(this, arguments);
      editCount++;
    }
  });

  bootApplication();

  handleURL("/posts/1");

  Ember.run(function() {
    router.send('editPost');
  });

  Ember.run(function() {
    router.send('showPost', {id: '2'});
  });

  Ember.run(function() {
    router.send('editPost');
  });

  equal(editCount, 2, 'set up the edit route twice without failure');
  deepEqual(editedPostIds, ['1', '2'], 'modelFor posts.post returns the right context');
});

test("Router accounts for rootURL on page load when using history location", function() {
  var rootURL = window.location.pathname + '/app',
      postsTemplateRendered = false,
      setHistory,
      HistoryTestLocation;

  setHistory = function(obj, path) {
    obj.set('history', { state: { path: path } });
  };

  // Create new implementation that extends HistoryLocation
  // and set current location to rootURL + '/posts'
  HistoryTestLocation = Ember.HistoryLocation.extend({
    initState: function() {
      var path = rootURL + '/posts';

      setHistory(this, path);
      this.set('location', {
        pathname: path
      });
    },

    replaceState: function(path) {
      setHistory(this, path);
    },

    pushState: function(path) {
      setHistory(this, path);
    }
  });

  Ember.Location.registerImplementation('historyTest', HistoryTestLocation);

  Router.reopen({
    location: 'historyTest',
    rootURL: rootURL
  });

  Router.map(function() {
    this.resource("posts", { path: '/posts' });
  });

  App.PostsRoute = Ember.Route.extend({
    model: function() {},
    renderTemplate: function() {
      postsTemplateRendered = true;
    }
  });

  bootApplication();

  ok(postsTemplateRendered, "Posts route successfully stripped from rootURL");

  // clean after test
  delete Ember.Location.implementations['historyTest'];
});

test("The rootURL is passed properly to the location implementation", function() {
  expect(1);
  var rootURL = "/blahzorz",
      HistoryTestLocation;

  HistoryTestLocation = Ember.HistoryLocation.extend({
    rootURL: 'this is not the URL you are looking for',
    initState: function() {
      equal(this.get('rootURL'), rootURL);
    }
  });

  Ember.Location.registerImplementation('history-test', HistoryTestLocation);

  Router.reopen({
    location: 'history-test',
    rootURL: rootURL,
    // if we transition in this test we will receive failures
    // if the tests are run from a static file
    _doTransition: function(){}
  });

  bootApplication();

  // clean after test
  delete Ember.Location.implementations['history-test'];
});


test("Only use route rendered into main outlet for default into property on child", function() {
  Ember.TEMPLATES.application = compile("{{outlet menu}}{{outlet}}");
  Ember.TEMPLATES.posts = compile("{{outlet}}");
  Ember.TEMPLATES['posts/index'] = compile("postsIndex");
  Ember.TEMPLATES['posts/menu'] = compile("postsMenu");

  Router.map(function() {
    this.resource("posts", function() {});
  });

  App.PostsMenuView = Ember.View.extend({
    tagName: 'div',
    templateName: 'posts/menu',
    classNames: ['posts-menu']
  });

  App.PostsIndexView = Ember.View.extend({
    tagName: 'p',
    classNames: ['posts-index']
  });

  App.PostsRoute = Ember.Route.extend({
    renderTemplate: function() {
      this.render();
      this.render('postsMenu', {
        into: 'application',
        outlet: 'menu'
      });
    }
  });

  bootApplication();

  handleURL("/posts");

  equal(Ember.$('div.posts-menu:contains(postsMenu)', '#qunit-fixture').length, 1, "The posts/menu template was rendered");
  equal(Ember.$('p.posts-index:contains(postsIndex)', '#qunit-fixture').length, 1, "The posts/index template was rendered");
});

test("Generating a URL should not affect currentModel", function() {
  Router.map(function() {
    this.route("post", { path: "/posts/:post_id" });
  });

  var posts = {
    1: { id: 1 },
    2: { id: 2 }
  };

  App.PostRoute = Ember.Route.extend({
    model: function(params) {
      return posts[params.post_id];
    }
  });

  bootApplication();

  handleURL("/posts/1");

  var route = container.lookup('route:post');
  equal(route.modelFor('post'), posts[1]);

  var url = router.generate('post', posts[2]);
  equal(url, "/posts/2");

  equal(route.modelFor('post'), posts[1]);
});


test("Generated route should be an instance of App.Route if provided", function() {
  var generatedRoute;

  Router.map(function() {
    this.route('posts');
  });

  App.Route = Ember.Route.extend();

  bootApplication();

  handleURL("/posts");

  generatedRoute = container.lookup('route:posts');

  ok(generatedRoute instanceof App.Route, 'should extend the correct route');

});

test("Nested index route is not overriden by parent's implicit index route", function() {
  Router.map(function() {
    this.resource('posts', function() {
      this.route('index', { path: ':category' } );
    });
  });

  App.Route = Ember.Route.extend({
    serialize: function(model) {
      return { category: model.category };
    }
  });

  bootApplication();

  Ember.run(function() {
    router.transitionTo('posts', { category: 'emberjs' });
  });

  deepEqual(router.location.path, '/posts/emberjs');
});

test("Application template does not duplicate when re-rendered", function() {
  Ember.TEMPLATES.application = compile("<h3>I Render Once</h3>{{outlet}}");

  Router.map(function() {
    this.route('posts');
  });

  App.ApplicationRoute = Ember.Route.extend({
    model: function() {
      return Ember.A();
    }
  });

  bootApplication();

  // should cause application template to re-render
  handleURL('/posts');

  equal(Ember.$('h3:contains(I Render Once)').size(), 1);
});

test("Child routes should render inside the application template if the application template causes a redirect", function() {
  Ember.TEMPLATES.application = compile("<h3>App</h3> {{outlet}}");
  Ember.TEMPLATES.posts = compile("posts");

  Router.map(function() {
    this.route('posts');
    this.route('photos');
  });

  App.ApplicationRoute = Ember.Route.extend({
    afterModel: function() {
      this.transitionTo('posts');
    }
  });

  bootApplication();

  equal(Ember.$('#qunit-fixture > div').text(), "App posts");
});

test("The template is not re-rendered when the route's context changes", function() {
  Router.map(function() {
    this.route("page", { path: "/page/:name" });
  });

  App.PageRoute = Ember.Route.extend({
    model: function(params) {
      return Ember.Object.create({name: params.name});
    }
  });

  var insertionCount = 0;
  App.PageView = Ember.View.extend({
    didInsertElement: function() {
      insertionCount += 1;
    }
  });

  Ember.TEMPLATES.page = Ember.Handlebars.compile(
    "<p>{{name}}</p>"
  );

  bootApplication();

  handleURL("/page/first");

  equal(Ember.$('p', '#qunit-fixture').text(), "first");
  equal(insertionCount, 1);

  handleURL("/page/second");

  equal(Ember.$('p', '#qunit-fixture').text(), "second");
  equal(insertionCount, 1, "view should have inserted only once");

  Ember.run(function() {
    router.transitionTo('page', Ember.Object.create({name: 'third'}));
  });

  equal(Ember.$('p', '#qunit-fixture').text(), "third");
  equal(insertionCount, 1, "view should still have inserted only once");
});


test("The template is not re-rendered when two routes present the exact same template, view, & controller", function() {
  Router.map(function() {
    this.route("first");
    this.route("second");
    this.route("third");
    this.route("fourth");
  });

  App.SharedRoute = Ember.Route.extend({
    viewName: 'shared',
    setupController: function(controller) {
      this.controllerFor('shared').set('message', "This is the " + this.routeName + " message");
    },

    renderTemplate: function(controller, context) {
      this.render({ controller: 'shared' });
    }
  });

  App.FirstRoute  = App.SharedRoute.extend();
  App.SecondRoute = App.SharedRoute.extend();
  App.ThirdRoute  = App.SharedRoute.extend();
  App.FourthRoute = App.SharedRoute.extend({
    viewName: 'fourth'
  });

  App.SharedController = Ember.Controller.extend();

  var insertionCount = 0;
  App.SharedView = Ember.View.extend({
    templateName: 'shared',
    didInsertElement: function() {
      insertionCount += 1;
    }
  });

  // Extending, in essence, creates a different view
  App.FourthView = App.SharedView.extend();

  Ember.TEMPLATES.shared = Ember.Handlebars.compile(
    "<p>{{message}}</p>"
  );

  bootApplication();

  handleURL("/first");

  equal(Ember.$('p', '#qunit-fixture').text(), "This is the first message");
  equal(insertionCount, 1, 'expected one assertion');

  // Transition by URL
  handleURL("/second");

  equal(Ember.$('p', '#qunit-fixture').text(), "This is the second message");
  equal(insertionCount, 1, "view should have inserted only once");

  // Then transition directly by route name
  Ember.run(function() {
    router.transitionTo('third').then(function(value){
      ok(true, 'expected transition');
    }, function(reason) {
      ok(false, 'unexpected transition failure: ', QUnit.jsDump.parse(reason));
    });
  });

  equal(Ember.$('p', '#qunit-fixture').text(), "This is the third message");
  equal(insertionCount, 1, "view should still have inserted only once");

  // Lastly transition to a different view, with the same controller and template
  handleURL("/fourth");

  equal(Ember.$('p', '#qunit-fixture').text(), "This is the fourth message");
  equal(insertionCount, 2, "view should have inserted a second time");
});

test("ApplicationRoute with model does not proxy the currentPath", function() {
  var model = {};
  var currentPath;

  App.ApplicationRoute = Ember.Route.extend({
    model: function () { return model; }
  });

  App.ApplicationController = Ember.ObjectController.extend({
    currentPathDidChange: Ember.observer('currentPath', function() {
      currentPath = get(this, 'currentPath');
    })
  });

  bootApplication();

  equal(currentPath, 'index', 'currentPath is index');
  equal('currentPath' in model, false, 'should have defined currentPath on controller');
});

test("Promises encountered on app load put app into loading state until resolved", function() {

  expect(2);

  var deferred = Ember.RSVP.defer();

  App.IndexRoute = Ember.Route.extend({
    model: function() {
      return deferred.promise;
    }
  });

  Ember.TEMPLATES.index = Ember.Handlebars.compile("<p>INDEX</p>");
  Ember.TEMPLATES.loading = Ember.Handlebars.compile("<p>LOADING</p>");

  bootApplication();

  equal(Ember.$('p', '#qunit-fixture').text(), "LOADING", "The loading state is displaying.");
  Ember.run(deferred.resolve);
  equal(Ember.$('p', '#qunit-fixture').text(), "INDEX", "The index route is display.");
});

test("Route should tear down multiple outlets", function() {
  Ember.TEMPLATES.application = compile("{{outlet menu}}{{outlet}}{{outlet footer}}");
  Ember.TEMPLATES.posts = compile("{{outlet}}");
  Ember.TEMPLATES.users = compile("users");
  Ember.TEMPLATES['posts/index'] = compile("postsIndex");
  Ember.TEMPLATES['posts/menu'] = compile("postsMenu");
  Ember.TEMPLATES['posts/footer'] = compile("postsFooter");

  Router.map(function() {
    this.resource("posts", function() {});
    this.resource("users", function() {});
  });

  App.PostsMenuView = Ember.View.extend({
    tagName: 'div',
    templateName: 'posts/menu',
    classNames: ['posts-menu']
  });

  App.PostsIndexView = Ember.View.extend({
    tagName: 'p',
    classNames: ['posts-index']
  });

  App.PostsFooterView = Ember.View.extend({
    tagName: 'div',
    templateName: 'posts/footer',
    classNames: ['posts-footer']
  });

  App.PostsRoute = Ember.Route.extend({
    renderTemplate: function() {
      this.render('postsMenu', {
        into: 'application',
        outlet: 'menu'
      });

      this.render();

      this.render('postsFooter', {
        into: 'application',
        outlet: 'footer'
      });
    }
  });

  bootApplication();

  handleURL('/posts');

  equal(Ember.$('div.posts-menu:contains(postsMenu)', '#qunit-fixture').length, 1, "The posts/menu template was rendered");
  equal(Ember.$('p.posts-index:contains(postsIndex)', '#qunit-fixture').length, 1, "The posts/index template was rendered");
  equal(Ember.$('div.posts-footer:contains(postsFooter)', '#qunit-fixture').length, 1, "The posts/footer template was rendered");

  handleURL('/users');

  equal(Ember.$('div.posts-menu:contains(postsMenu)', '#qunit-fixture').length, 0, "The posts/menu template was removed");
  equal(Ember.$('p.posts-index:contains(postsIndex)', '#qunit-fixture').length, 0, "The posts/index template was removed");
  equal(Ember.$('div.posts-footer:contains(postsFooter)', '#qunit-fixture').length, 0, "The posts/footer template was removed");

});


test("Route supports clearing outlet explicitly", function() {
  Ember.TEMPLATES.application = compile("{{outlet}}{{outlet modal}}");
  Ember.TEMPLATES.posts = compile("{{outlet}}");
  Ember.TEMPLATES.users = compile("users");
  Ember.TEMPLATES['posts/index'] = compile("postsIndex {{outlet}}");
  Ember.TEMPLATES['posts/modal'] = compile("postsModal");
  Ember.TEMPLATES['posts/extra'] = compile("postsExtra");

  Router.map(function() {
    this.resource("posts", function() {});
    this.resource("users", function() {});
  });

  App.PostsIndexView = Ember.View.extend({
    classNames: ['posts-index']
  });

  App.PostsModalView = Ember.View.extend({
    templateName: 'posts/modal',
    classNames: ['posts-modal']
  });

  App.PostsExtraView = Ember.View.extend({
    templateName: 'posts/extra',
    classNames: ['posts-extra']
  });

  App.PostsRoute = Ember.Route.extend({
    actions: {
      showModal: function() {
        this.render('postsModal', {
          into: 'application',
          outlet: 'modal'
        });
      },
      hideModal: function() {
        this.disconnectOutlet({outlet: 'modal', parentView: 'application'});
      }
    }
  });

  App.PostsIndexRoute = Ember.Route.extend({
    actions: {
      showExtra: function() {
        this.render('postsExtra', {
          into: 'posts/index'
        });
      },
      hideExtra: function() {
        this.disconnectOutlet({parentView: 'posts/index'});
      }
    }
  });

  bootApplication();

  handleURL('/posts');

  equal(Ember.$('div.posts-index:contains(postsIndex)', '#qunit-fixture').length, 1, "The posts/index template was rendered");
  Ember.run(function() {
    router.send('showModal');
  });
  equal(Ember.$('div.posts-modal:contains(postsModal)', '#qunit-fixture').length, 1, "The posts/modal template was rendered");
  Ember.run(function() {
    router.send('showExtra');
  });
  equal(Ember.$('div.posts-extra:contains(postsExtra)', '#qunit-fixture').length, 1, "The posts/extra template was rendered");
  Ember.run(function() {
    router.send('hideModal');
  });
  equal(Ember.$('div.posts-modal:contains(postsModal)', '#qunit-fixture').length, 0, "The posts/modal template was removed");
  Ember.run(function() {
    router.send('hideExtra');
  });
  equal(Ember.$('div.posts-extra:contains(postsExtra)', '#qunit-fixture').length, 0, "The posts/extra template was removed");

  handleURL('/users');

  equal(Ember.$('div.posts-index:contains(postsIndex)', '#qunit-fixture').length, 0, "The posts/index template was removed");
  equal(Ember.$('div.posts-modal:contains(postsModal)', '#qunit-fixture').length, 0, "The posts/modal template was removed");
  equal(Ember.$('div.posts-extra:contains(postsExtra)', '#qunit-fixture').length, 0, "The posts/extra template was removed");
});

test("Aborting/redirecting the transition in `willTransition` prevents LoadingRoute from being entered", function() {

  expect(8);

  Router.map(function() {
    this.route("nork");
    this.route("about");
  });

  var redirect = false;

  App.IndexRoute = Ember.Route.extend({
    actions: {
      willTransition: function(transition) {
        ok(true, "willTransition was called");
        if (redirect) {
          // router.js won't refire `willTransition` for this redirect
          this.transitionTo('about');
        } else {
          transition.abort();
        }
      }
    }
  });

  var deferred = null;

  App.LoadingRoute = Ember.Route.extend({
    activate: function() {
      ok(deferred, "LoadingRoute should be entered at this time");
    },
    deactivate: function() {
      ok(true, "LoadingRoute was exited");
    }
  });

  App.NorkRoute = Ember.Route.extend({
    activate: function() {
      ok(true, "NorkRoute was entered");
    }
  });

  App.AboutRoute = Ember.Route.extend({
    activate: function() {
      ok(true, "AboutRoute was entered");
    },
    model: function() {
      if (deferred) { return deferred.promise; }
    }
  });

  bootApplication();

  // Attempted transitions out of index should abort.
  Ember.run(router, 'transitionTo', 'nork');
  Ember.run(router, 'handleURL', '/nork');

  // Attempted transitions out of index should redirect to about
  redirect = true;
  Ember.run(router, 'transitionTo', 'nork');
  Ember.run(router, 'transitionTo', 'index');

  // Redirected transitions out of index to a route with a
  // promise model should pause the transition and
  // activate LoadingRoute
  deferred = Ember.RSVP.defer();
  Ember.run(router, 'transitionTo', 'nork');
  Ember.run(deferred.resolve);
});

test("`didTransition` event fires on the router", function() {
  expect(3);

  Router.map(function(){
    this.route("nork");
  });

  router = container.lookup('router:main');

  router.one('didTransition', function(){
    ok(true, 'didTransition fired on initial routing');
  });

  bootApplication();

  router.one('didTransition', function(){
    ok(true, 'didTransition fired on the router');
    equal(router.get('url'), "/nork", 'The url property is updated by the time didTransition fires');
  });

  Ember.run(router, 'transitionTo', 'nork');
});
test("`didTransition` can be reopened", function() {
  expect(1);

  Router.map(function(){
    this.route("nork");
  });

  Router.reopen({
    didTransition: function(){
      this._super.apply(this, arguments);
      ok(true, 'reopened didTransition was called');
    }
  });

  bootApplication();
});

test("Actions can be handled by inherited action handlers", function() {

  expect(4);

  App.SuperRoute = Ember.Route.extend({
    actions: {
      foo: function() {
        ok(true, 'foo');
      },
      bar: function(msg) {
        equal(msg, "HELLO");
      }
    }
  });

  App.RouteMixin = Ember.Mixin.create({
    actions: {
      bar: function(msg) {
        equal(msg, "HELLO");
        this._super(msg);
      }
    }
  });

  App.IndexRoute = App.SuperRoute.extend(App.RouteMixin, {
    actions: {
      baz: function() {
        ok(true, 'baz');
      }
    }
  });

  bootApplication();

  router.send("foo");
  router.send("bar", "HELLO");
  router.send("baz");
});

test("currentRouteName is a property installed on ApplicationController that can be used in transitionTo", function() {

  expect(24);

  Router.map(function() {
    this.resource("be", function() {
      this.resource("excellent", function() {
        this.resource("to", function() {
          this.resource("each", function() {
            this.route("other");
          });
        });
      });
    });
  });

  bootApplication();

  var appController = router.container.lookup('controller:application');

  function transitionAndCheck(path, expectedPath, expectedRouteName) {
    if (path) { Ember.run(router, 'transitionTo', path); }
    equal(appController.get('currentPath'), expectedPath);
    equal(appController.get('currentRouteName'), expectedRouteName);
  }

  transitionAndCheck(null, 'index', 'index');
  transitionAndCheck('/be', 'be.index', 'be.index');
  transitionAndCheck('/be/excellent', 'be.excellent.index', 'excellent.index');
  transitionAndCheck('/be/excellent/to', 'be.excellent.to.index', 'to.index');
  transitionAndCheck('/be/excellent/to/each', 'be.excellent.to.each.index', 'each.index');
  transitionAndCheck('/be/excellent/to/each/other', 'be.excellent.to.each.other', 'each.other');

  transitionAndCheck('index', 'index', 'index');
  transitionAndCheck('be', 'be.index', 'be.index');
  transitionAndCheck('excellent', 'be.excellent.index', 'excellent.index');
  transitionAndCheck('to.index', 'be.excellent.to.index', 'to.index');
  transitionAndCheck('each', 'be.excellent.to.each.index', 'each.index');
  transitionAndCheck('each.other', 'be.excellent.to.each.other', 'each.other');
});

test("Route model hook finds the same model as a manual find", function() {
  var Post;
  App.Post = Ember.Object.extend();
  App.Post.reopenClass({
    find: function() {
      Post = this;
      return {};
    }
  });

  Router.map(function() {
    this.route('post', { path: '/post/:post_id' });
  });

  bootApplication();

  handleURL('/post/1');

  equal(App.Post, Post);
});

})();

(function() {
var Router, App, AppView, templates, router, container, originalTemplates;
var get = Ember.get, set = Ember.set;

function bootApplication(url) {
  router = container.lookup('router:main');
  if(url) { router.location.setURL(url); }
  Ember.run(App, 'advanceReadiness');
}

function compile(string) {
  return Ember.Handlebars.compile(string);
}

function handleURL(path) {
  return Ember.run(function() {
    return router.handleURL(path).then(function(value) {
      ok(true, 'url: `' + path + '` was handled');
      return value;
    }, function(reason) {
      ok(false, 'failed to visit:`' + path + '` reason: `' + QUnit.jsDump.parse(reason));
      throw reason;
    });
  });
}

function handleURLAborts(path) {
  Ember.run(function() {
    router.handleURL(path).then(function(value) {
      ok(false, 'url: `' + path + '` was NOT to be handled');
    }, function(reason) {
      ok(reason && reason.message === "TransitionAborted",  'url: `' + path + '` was to be aborted');
    });
  });
}

function shouldNotHappen(error) {
  console.error(error.stack);
  ok(false, "this .then handler should not be called: " + error.message);
}

function handleURLRejectsWith(path, expectedReason) {
  Ember.run(function() {
    router.handleURL(path).then(function(value) {
      ok(false, 'expected handleURLing: `' + path + '` to fail');
    }, function(reason) {
      equal(expectedReason, reason);
    });
  });
}
if (Ember.FEATURES.isEnabled("query-params")) {
  module("Routing with Query Params", {
    setup: function() {
      Ember.run(function() {
        App = Ember.Application.create({
          name: "App",
          rootElement: '#qunit-fixture'
        });

        App.deferReadiness();

        App.Router.reopen({
          location: 'none'
        });

        Router = App.Router;

        App.LoadingRoute = Ember.Route.extend({
        });

        container = App.__container__;

        originalTemplates = Ember.$.extend({}, Ember.TEMPLATES);
        Ember.TEMPLATES.application = compile("{{outlet}}");
        Ember.TEMPLATES.home = compile("<h3>Hours</h3>");
        Ember.TEMPLATES.homepage = compile("<h3>Megatroll</h3><p>{{home}}</p>");
        Ember.TEMPLATES.camelot = compile('<section><h3>Is a silly place</h3></section>');
      });
    },

    teardown: function() {
      Ember.run(function() {
        App.destroy();
        App = null;

        Ember.TEMPLATES = originalTemplates;
      });
    }
  });

  test("The Homepage with Query Params", function() {
    expect(5);

    Router.map(function() {
      this.route("index", { path: "/", queryParams: ['foo', 'baz'] });
    });

    App.IndexRoute = Ember.Route.extend({
      beforeModel: function(queryParams, transition) {
        deepEqual(queryParams, {foo: 'bar', baz: true}, "beforeModel hook is called with query params");
      },

      model: function(params, queryParams, transition) {
        deepEqual(queryParams, {foo: 'bar', baz: true}, "Model hook is called with query params");
      },

      afterModel: function(resolvedModel, queryParams, transition) {
        deepEqual(queryParams, {foo: 'bar', baz: true}, "afterModel hook is called with query params");
      },

      setupController: function (controller, context, queryParams) {
        deepEqual(queryParams, {foo: 'bar', baz: true}, "setupController hook is called with query params");
      },

      renderTemplate: function (controller, context, queryParams) {
        deepEqual(queryParams, {foo: 'bar', baz: true}, "renderTemplates hook is called with query params");
      }

    });


    bootApplication("/?foo=bar&baz");
  });


  asyncTest("Transitioning query params works on the same route", function() {
    expect(25);

    var expectedQueryParams;

    Router.map(function() {
      this.route("home", { path: "/" });
      this.resource("special", { path: "/specials/:menu_item_id", queryParams: ['view'] });
    });

    App.SpecialRoute = Ember.Route.extend({
      beforeModel: function (queryParams, transition) {
        deepEqual(queryParams, expectedQueryParams, "The query params are correct in the beforeModel hook");
      },

      model: function(params, queryParams, transition) {
        deepEqual(queryParams, expectedQueryParams, "The query params are correct in the model hook");
        return {id: params.menu_item_id};
      },

      afterModel: function (resolvedModel, queryParams, transition) {
        deepEqual(queryParams, expectedQueryParams, "The query params are correct in the beforeModel hook");
      },

      setupController: function (controller, context, queryParams) {
        deepEqual(queryParams, expectedQueryParams, "The query params are correct in the setupController hook");
      },

      renderTemplate: function (controller, context, queryParams) {
        deepEqual(queryParams, expectedQueryParams, "The query params are correct in the renderTemplates hook");
      },

      serialize: function (obj) {
        return {menu_item_id: obj.id};
      }
    });


    Ember.TEMPLATES.home = Ember.Handlebars.compile(
      "<h3>Home</h3>"
    );


    Ember.TEMPLATES.special = Ember.Handlebars.compile(
      "<p>{{content.id}}</p>"
    );

    bootApplication();

    var transition = handleURL('/');

    Ember.run(function() {
      transition.then(function() {
        equal(Ember.$('h3', '#qunit-fixture').text(), "Home", "The app is now in the initial state");

        expectedQueryParams = {};
        return router.transitionTo('special', {id: 1});
      }, shouldNotHappen).then(function(result) {
        deepEqual(router.location.path, '/specials/1', "Correct URL after transitioning");

        expectedQueryParams = {view: 'details'};
        return router.transitionTo('special', {queryParams: {view: 'details'}});
      }, shouldNotHappen).then(function (result) {
        deepEqual(router.location.path, '/specials/1?view=details', "Correct URL after transitioning with route name and query params");

        expectedQueryParams = {view: 'other'};
        return router.transitionTo({queryParams: {view: 'other'}});
      }, shouldNotHappen).then(function (result) {
        deepEqual(router.location.path, '/specials/1?view=other', "Correct URL after transitioning with query params only");

        expectedQueryParams = {view: 'three'};
        return router.transitionTo("/specials/1?view=three");
      }, shouldNotHappen).then(function (result) {
        deepEqual(router.location.path, '/specials/1?view=three', "Correct URL after transitioning with url");

        start();
      }, shouldNotHappen);
    });
  });


  asyncTest("Transitioning query params works on a different route", function() {
    expect(46);

    var expectedQueryParams, expectedOtherQueryParams;

    Router.map(function() {
      this.route("home", { path: "/" });
      this.resource("special", { path: "/specials/:menu_item_id", queryParams: ['view'] });
      this.resource("other", { path: "/others/:menu_item_id", queryParams: ['view', 'lang'] });
    });

    App.SpecialRoute = Ember.Route.extend({
      beforeModel: function (queryParams, transition) {
        deepEqual(queryParams, expectedQueryParams, "The query params are correct in the beforeModel hook");
      },

      model: function(params, queryParams, transition) {
        deepEqual(queryParams, expectedQueryParams, "The query params are correct in the model hook");
        return {id: params.menu_item_id};
      },

      afterModel: function (resolvedModel, queryParams, transition) {
        deepEqual(queryParams, expectedQueryParams, "The query params are correct in the beforeModel hook");
      },

      setupController: function (controller, context, queryParams) {
        deepEqual(queryParams, expectedQueryParams, "The query params are correct in the setupController hook");
      },

      renderTemplate: function (controller, context, queryParams) {
        deepEqual(queryParams, expectedQueryParams, "The query params are correct in the renderTemplates hook");
      },

      serialize: function (obj) {
        return {menu_item_id: obj.id};
      }
    });

    App.OtherRoute = Ember.Route.extend({
      beforeModel: function (queryParams, transition) {
        deepEqual(queryParams, expectedOtherQueryParams, "The query params are correct in the beforeModel hook");
      },

      model: function(params, queryParams, transition) {
        deepEqual(queryParams, expectedOtherQueryParams, "The query params are correct in the model hook");
        return {id: params.menu_item_id};
      },

      afterModel: function (resolvedModel, queryParams, transition) {
        deepEqual(queryParams, expectedOtherQueryParams, "The query params are correct in the beforeModel hook");
      },

      setupController: function (controller, context, queryParams) {
        deepEqual(queryParams, expectedOtherQueryParams, "The query params are correct in the setupController hook");
      },

      renderTemplate: function (controller, context, queryParams) {
        deepEqual(queryParams, expectedOtherQueryParams, "The query params are correct in the renderTemplates hook");
      },

      serialize: function (obj) {
        return {menu_item_id: obj.id};
      }
    });



    Ember.TEMPLATES.home = Ember.Handlebars.compile(
      "<h3>Home</h3>"
    );


    Ember.TEMPLATES.special = Ember.Handlebars.compile(
      "<p>{{content.id}}</p>"
    );

    bootApplication();

    var transition = handleURL('/');

    Ember.run(function() {
      transition.then(function() {
        equal(Ember.$('h3', '#qunit-fixture').text(), "Home", "The app is now in the initial state");

        expectedQueryParams = {};

        return router.transitionTo('special', {id: 1});
      }, shouldNotHappen).then(function(result) {
        deepEqual(router.location.path, '/specials/1', "Correct URL after transitioning");

        expectedQueryParams = {view: 'details'};
        return router.transitionTo('special', {queryParams: {view: 'details'}});
      }, shouldNotHappen).then(function (result) {
        deepEqual(router.location.path, '/specials/1?view=details', "Correct URL after transitioning with route name and query params");

        expectedOtherQueryParams = {view: 'details'};

        return router.transitionTo('other', {id: 2});
      }, shouldNotHappen).then(function (result) {
        deepEqual(router.location.path, '/others/2?view=details', "Correct URL after transitioning to other route");

        expectedOtherQueryParams = {view: 'details', lang: 'en'};
        return router.transitionTo({queryParams: {lang: 'en'}});
      }, shouldNotHappen).then(function (result) {
        deepEqual(router.location.path, '/others/2?view=details&lang=en', "Correct URL after transitioning to other route");

        expectedQueryParams = {view: 'details'};

        return router.transitionTo("special", {id: 2});
      }, shouldNotHappen).then(function (result) {
        deepEqual(router.location.path, '/specials/2?view=details', "Correct URL after back to special route");

        expectedQueryParams = {};

        return router.transitionTo({queryParams: false});
      }, shouldNotHappen).then(function (result) {
        deepEqual(router.location.path, '/specials/2', "queryParams: false clears queryParams");

        expectedQueryParams = {view: 'details'};

       return router.transitionTo("special", {id: 2}, {queryParams: {view: 'details'}});
      }, shouldNotHappen).then(function (result) {
        deepEqual(router.location.path, '/specials/2?view=details', "Correct URL after back to special route");

        expectedQueryParams = {};

        return router.transitionTo("/specials/2");
      }, shouldNotHappen).then(function (result) {
        deepEqual(router.location.path, '/specials/2', "url transition clears queryParams");

        start();
      }, shouldNotHappen);
    });
  });



  test("Redirecting to the current target with a different query param aborts the remainder of the routes", function() {
    expect(4);

    Router.map(function() {
      this.route("home");
      this.resource("foo", function() {
        this.resource("bar", { path: "bar/:id" }, function() {
          this.route("baz", { queryParams: ['foo']});
        });
      });
    });

    var model = { id: 2 };

    var count = 0;

    App.BarRoute = Ember.Route.extend({
      afterModel: function(context) {
        if (count++ > 10) {
          ok(false, 'infinite loop');
        } else {
          this.transitionTo("bar.baz", {queryParams: {foo: 'bar'}});
        }
      },

      serialize: function(params) {
        return params;
      }
    });

    App.BarBazRoute = Ember.Route.extend({
      setupController: function() {
        ok(true, "Should still invoke setupController");
      }
    });

    bootApplication();

    handleURLAborts("/foo/bar/2/baz");

    equal(router.container.lookup('controller:application').get('currentPath'), 'foo.bar.baz');
    equal(router.get('location').getURL(), "/foo/bar/2/baz?foo=bar");
  });

  test("Parent route query params change", function() {
    expect(4);

    var editCount = 0,
        expectedQueryParams = {};

    Ember.TEMPLATES.application = compile("{{outlet}}");
    Ember.TEMPLATES.posts = compile("{{outlet}}");
    Ember.TEMPLATES.post = compile("{{outlet}}");
    Ember.TEMPLATES['post/index'] = compile("showing");
    Ember.TEMPLATES['post/edit'] = compile("editing");

    Router.map(function() {
      this.resource("posts", {queryParams: ['sort']}, function() {
        this.resource("post", { path: "/:postId" }, function() {
          this.route("edit");
        });
      });
    });

    App.PostsRoute = Ember.Route.extend({
      actions: {
        sort: function(dir) {
          this.transitionTo({queryParams: {sort: dir}});
        }
      },

      setupController: function(controller, context, queryParams) {
        deepEqual(queryParams, expectedQueryParams, "Posts route has correct query params");
      }
    });

    App.PostRoute = Ember.Route.extend({
      actions: {
        editPost: function(context) {
          this.transitionTo('post.edit');
        }
      }
    });

    App.PostEditRoute = Ember.Route.extend({
      setup: function() {
        editCount++;
      }
    });

    bootApplication();

    handleURL("/posts/1");

    Ember.run(function() {
      router.send('editPost');
    });

    expectedQueryParams = {sort: 'desc'};

    Ember.run(function() {
      router.send('sort', 'desc');
    });

    equal(editCount, 2, 'set up the edit route twice without failure');
  });

  test("History location can handle queryparams", function() {
    var location = {
      pathname: "/foo",
      search: "?bar=baz"
    };

    var history = {
      pushState: Ember.K,
      replaceState: Ember.K
    };

    var historyLocation = Ember.HistoryLocation.create({location: location, history: history});

    equal(historyLocation.getURL(), "/foo?bar=baz", "The query params are present");
  });

  test("Hash location can handle urlencoded queryparams (issue #3390)", function() {
    // Firefox automatically de-url-encodes the hash, however we need it to
    // be URL encoded so that encoded data can be used in query params

    var location = {
      href: "http://example.com#/testing?url=http%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DkfVsfOSbJY0",
      hash: "#/testing?url=http://www.youtube.com/watch?v=kfVsfOSbJY0"
    };

    var hashLocation = Ember.HashLocation.create({location: location});

    equal(hashLocation.getURL(), "/testing?url=http%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DkfVsfOSbJY0", "The query params are still URL encoded");
  });

}

})();

(function() {
var Router, App, AppView, templates, router, container, counter;
var get = Ember.get, set = Ember.set, compile = Ember.Handlebars.compile;

function step(expectedValue, description) {
  equal(counter, expectedValue, "Step " + expectedValue + ": " + description);
  counter++;
}

function bootApplication(startingURL) {

  for (var name in templates) {
    Ember.TEMPLATES[name] = compile(templates[name]);
  }

  if (startingURL) {
    Ember.NoneLocation.reopen({
      path: startingURL
    });
  }

  startingURL = startingURL || '';
  router = container.lookup('router:main');
  Ember.run(App, 'advanceReadiness');
}

function handleURL(path) {
  return Ember.run(function() {
    return router.handleURL(path).then(function(value) {
      ok(true, 'url: `' + path + '` was handled');
      return value;
    }, function(reason) {
      ok(false, 'failed to visit:`' + path + '` reason: `' + QUnit.jsDump.parse(reason));
      throw reason;
    });
  });
}

module("Loading/Error Substates", {
  setup: function() {
    counter = 1;

    Ember.run(function() {
      App = Ember.Application.create({
        name: "App",
        rootElement: '#qunit-fixture'
      });

      App.deferReadiness();

      App.Router.reopen({
        location: 'none'
      });

      Router = App.Router;

      container = App.__container__;

      templates = {
        application: '<div id="app">{{outlet}}</div>',
        index: 'INDEX',
        loading: 'LOADING',
        bro: 'BRO',
        sis: 'SIS'
      };
    });
  },

  teardown: function() {
    Ember.run(function() {
      App.destroy();
      App = null;

      Ember.TEMPLATES = {};
    });

    Ember.NoneLocation.reopen({
      path: ''
    });
  }
});

test("Slow promise from a child route of application enters nested loading state", function() {

  var broModel = {}, broDeferred = Ember.RSVP.defer();

  Router.map(function() {
    this.route('bro');
  });

  App.ApplicationRoute = Ember.Route.extend({
    setupController: function() {
      step(2, "ApplicationRoute#setup");
    }
  });

  App.BroRoute = Ember.Route.extend({
    model: function() {
      step(1, "BroRoute#model");
      return broDeferred.promise;
    }
  });

  bootApplication('/bro');

  equal(Ember.$('#app', '#qunit-fixture').text(), "LOADING", "The Loading template is nested in application template's outlet");

  Ember.run(broDeferred, 'resolve', broModel);

  equal(Ember.$('#app', '#qunit-fixture').text(), "BRO", "bro template has loaded and replaced loading template");
});

test("Slow promises waterfall on startup", function() {

  expect(7);

  var grandmaDeferred = Ember.RSVP.defer(),
  sallyDeferred = Ember.RSVP.defer();

  Router.map(function() {
    this.resource('grandma', function() {
      this.resource('mom', function() {
        this.route('sally');
      });
    });
  });

  templates.grandma = "GRANDMA {{outlet}}";
  templates.mom = "MOM {{outlet}}";
  templates['mom/loading'] = "MOMLOADING";
  templates['mom/sally'] = "SALLY";

  App.GrandmaRoute = Ember.Route.extend({
    model: function() {
      step(1, "GrandmaRoute#model");
      return grandmaDeferred.promise;
    }
  });

  App.MomRoute = Ember.Route.extend({
    model: function() {
      step(2, "Mom#model");
      return {};
    }
  });

  App.MomSallyRoute = Ember.Route.extend({
    model: function() {
      step(3, "SallyRoute#model");
      return sallyDeferred.promise;
    },
    setupController: function() {
      step(4, "SallyRoute#setupController");
    }
  });

  bootApplication('/grandma/mom/sally');

  equal(Ember.$('#app', '#qunit-fixture').text(), "LOADING", "The Loading template is nested in application template's outlet");

  Ember.run(grandmaDeferred, 'resolve', {});
  equal(Ember.$('#app', '#qunit-fixture').text(), "GRANDMA MOM MOMLOADING", "Mom's child loading route is displayed due to sally's slow promise");

  Ember.run(sallyDeferred, 'resolve', {});
  equal(Ember.$('#app', '#qunit-fixture').text(), "GRANDMA MOM SALLY", "Sally template displayed");
});

test("ApplicationRoute#currentPath reflects loading state path", function() {

  expect(4);

  var momDeferred = Ember.RSVP.defer();

  Router.map(function() {
    this.resource('grandma', function() {
      this.route('mom');
    });
  });

  templates.grandma = "GRANDMA {{outlet}}";
  templates['grandma/loading'] = "GRANDMALOADING";
  templates['grandma/mom'] = "MOM";

  App.GrandmaMomRoute = Ember.Route.extend({
    model: function() {
      return momDeferred.promise;
    }
  });

  bootApplication('/grandma/mom');

  equal(Ember.$('#app', '#qunit-fixture').text(), "GRANDMA GRANDMALOADING");

  var appController = container.lookup('controller:application');
  equal(appController.get('currentPath'), "grandma.loading", "currentPath reflects loading state");

  Ember.run(momDeferred, 'resolve', {});
  equal(Ember.$('#app', '#qunit-fixture').text(), "GRANDMA MOM");
  equal(appController.get('currentPath'), "grandma.mom", "currentPath reflects final state");
});

test("Slow promises returned from ApplicationRoute#model don't enter LoadingRoute", function() {

  expect(2);

  var appDeferred = Ember.RSVP.defer();

  App.ApplicationRoute = Ember.Route.extend({
    model: function() {
      return appDeferred.promise;
    }
  });

  App.LoadingRoute = Ember.Route.extend({
    setupController: function() {
      ok(false, "shouldn't get here");
    }
  });

  bootApplication();

  equal(Ember.$('#app', '#qunit-fixture').text(), "", "nothing has been rendered yet");

  Ember.run(appDeferred, 'resolve', {});
  equal(Ember.$('#app', '#qunit-fixture').text(), "INDEX");
});

test("Don't enter loading route unless either route or template defined", function() {

  delete templates.loading;

  expect(2);

  var indexDeferred = Ember.RSVP.defer();

  App.ApplicationController = Ember.Controller.extend();

  App.IndexRoute = Ember.Route.extend({
    model: function() {
      return indexDeferred.promise;
    }
  });

  bootApplication();

  var appController = container.lookup('controller:application');
  ok(appController.get('currentPath') !== "loading", "loading state not entered");

  Ember.run(indexDeferred, 'resolve', {});
  equal(Ember.$('#app', '#qunit-fixture').text(), "INDEX");
});

test("Enter loading route if only LoadingRoute defined", function() {

  delete templates.loading;

  expect(4);

  var indexDeferred = Ember.RSVP.defer();

  App.IndexRoute = Ember.Route.extend({
    model: function() {
      step(1, "IndexRoute#model");
      return indexDeferred.promise;
    }
  });

  App.LoadingRoute = Ember.Route.extend({
    setupController: function() {
      step(2, "LoadingRoute#setupController");
    }
  });

  bootApplication();

  var appController = container.lookup('controller:application');
  equal(appController.get('currentPath'), "loading", "loading state entered");

  Ember.run(indexDeferred, 'resolve', {});
  equal(Ember.$('#app', '#qunit-fixture').text(), "INDEX");
});

test("Enter child loading state of pivot route", function() {

  expect(4);

  var deferred = Ember.RSVP.defer();

  Router.map(function() {
    this.resource('grandma', function() {
      this.resource('mom', function() {
        this.route('sally');
      });
      this.route('smells');
    });
  });

  templates['grandma/loading'] = "GMONEYLOADING";

  App.ApplicationController = Ember.Controller.extend();

  App.MomSallyRoute = Ember.Route.extend({
    setupController: function() {
      step(1, "SallyRoute#setupController");
    }
  });

  App.GrandmaSmellsRoute = Ember.Route.extend({
    model: function() {
      return deferred.promise;
    }
  });

  bootApplication('/grandma/mom/sally');

  var appController = container.lookup('controller:application');
  equal(appController.get('currentPath'), "grandma.mom.sally", "Initial route fully loaded");

  Ember.run(router, 'transitionTo', 'grandma.smells');
  equal(appController.get('currentPath'), "grandma.loading", "in pivot route's child loading state");

  Ember.run(deferred, 'resolve', {});

  equal(appController.get('currentPath'), "grandma.smells", "Finished transition");
});

test("Loading actions bubble to root, but don't enter substates above pivot", function() {

  expect(6);

  delete templates.loading;

  var sallyDeferred = Ember.RSVP.defer(),
  smellsDeferred = Ember.RSVP.defer();

  var shouldBubbleToApplication = true;

  Router.map(function() {
    this.resource('grandma', function() {
      this.resource('mom', function() {
        this.route('sally');
      });
      this.route('smells');
    });
  });

  App.ApplicationController = Ember.Controller.extend();

  App.ApplicationRoute = Ember.Route.extend({
    actions: {
      loading: function(transition, route) {
        ok(true, "loading action received on ApplicationRoute");
      }
    }
  });

  App.MomSallyRoute = Ember.Route.extend({
    model: function() {
      return sallyDeferred.promise;
    }
  });

  App.GrandmaSmellsRoute = Ember.Route.extend({
    model: function() {
      return smellsDeferred.promise;
    }
  });

  bootApplication('/grandma/mom/sally');

  var appController = container.lookup('controller:application');
  ok(!appController.get('currentPath'), "Initial route fully loaded");
  Ember.run(sallyDeferred, 'resolve', {});

  equal(appController.get('currentPath'), "grandma.mom.sally", "transition completed");

  Ember.run(router, 'transitionTo', 'grandma.smells');
  equal(appController.get('currentPath'), "grandma.mom.sally", "still in initial state because the only loading state is above the pivot route");

  Ember.run(smellsDeferred, 'resolve', {});

  equal(appController.get('currentPath'), "grandma.smells", "Finished transition");
});

test("Default error event moves into nested route", function() {

  expect(5);

  templates['grandma'] = "GRANDMA {{outlet}}";
  templates['grandma/error'] = "ERROR: {{msg}}";

  Router.map(function() {
    this.resource('grandma', function() {
      this.resource('mom', function() {
        this.route('sally');
      });
    });
  });

  App.ApplicationController = Ember.Controller.extend();

  App.MomSallyRoute = Ember.Route.extend({
    model: function() {
      step(1, "MomSallyRoute#model");

      return Ember.RSVP.reject({
        msg: "did it broke?"
      });
    },
    actions: {
      error: function() {
        step(2, "MomSallyRoute#actions.error");
        return true;
      }
    }
  });

  bootApplication('/grandma/mom/sally');

  step(3, "App finished booting");

  equal(Ember.$('#app', '#qunit-fixture').text(), "GRANDMA ERROR: did it broke?", "error bubbles");

  var appController = container.lookup('controller:application');
  equal(appController.get('currentPath'), 'grandma.error', "Initial route fully loaded");
});

if (Ember.FEATURES.isEnabled("ember-routing-named-substates")) {

  test("Slow promises returned from ApplicationRoute#model enter ApplicationLoadingRoute if present", function() {

    expect(2);

    var appDeferred = Ember.RSVP.defer();

    App.ApplicationRoute = Ember.Route.extend({
      model: function() {
        return appDeferred.promise;
      }
    });

    var loadingRouteEntered = false;
    App.ApplicationLoadingRoute = Ember.Route.extend({
      setupController: function() {
        loadingRouteEntered = true;
      }
    });

    bootApplication();

    ok(loadingRouteEntered, "ApplicationLoadingRoute was entered");

    Ember.run(appDeferred, 'resolve', {});
    equal(Ember.$('#app', '#qunit-fixture').text(), "INDEX");
  });

  test("Slow promises returned from ApplicationRoute#model enter application_loading if template present", function() {

    expect(3);

    templates['application_loading'] = 'TOPLEVEL LOADING';

    var appDeferred = Ember.RSVP.defer();

    App.ApplicationRoute = Ember.Route.extend({
      model: function() {
        return appDeferred.promise;
      }
    });

    var loadingRouteEntered = false;
    App.ApplicationLoadingRoute = Ember.Route.extend({
      setupController: function() {
        loadingRouteEntered = true;
      }
    });

    App.ApplicationLoadingView = Ember.View.extend({
      elementId: 'toplevel-loading'
    });

    bootApplication();

    equal(Ember.$('#qunit-fixture > #toplevel-loading').text(), "TOPLEVEL LOADING");

    Ember.run(appDeferred, 'resolve', {});

    equal(Ember.$('#toplevel-loading', '#qunit-fixture').length, 0, 'top-level loading View has been entirely removed from DOM');
    equal(Ember.$('#app', '#qunit-fixture').text(), "INDEX");
  });

  test("Default error event moves into nested route, prioritizing more specifically named error route", function() {

    expect(5);

    templates['grandma'] = "GRANDMA {{outlet}}";
    templates['grandma/error'] = "ERROR: {{msg}}";
    templates['grandma/mom_error'] = "MOM ERROR: {{msg}}";

    Router.map(function() {
      this.resource('grandma', function() {
        this.resource('mom', function() {
          this.route('sally');
        });
      });
    });

    App.ApplicationController = Ember.Controller.extend();

    App.MomSallyRoute = Ember.Route.extend({
      model: function() {
        step(1, "MomSallyRoute#model");

        return Ember.RSVP.reject({
          msg: "did it broke?"
        });
      },
      actions: {
        error: function() {
          step(2, "MomSallyRoute#actions.error");
          return true;
        }
      }
    });

    bootApplication('/grandma/mom/sally');

    step(3, "App finished booting");

    equal(Ember.$('#app', '#qunit-fixture').text(), "GRANDMA MOM ERROR: did it broke?", "the more specifically-named mom error substate was entered over the other error route");

    var appController = container.lookup('controller:application');
    equal(appController.get('currentPath'), 'grandma.mom_error', "Initial route fully loaded");
  });

  test("Prioritized substate entry works with preserved-namespace nested resources", function() {

    expect(2);

    templates['foo/bar_loading'] = "FOOBAR LOADING";
    templates['foo/bar/index'] = "YAY";

    Router.map(function() {
      this.resource('foo', function() {
        this.resource('foo.bar', { path: '/bar' }, function() {
        });
      });
    });

    App.ApplicationController = Ember.Controller.extend();

    var deferred = Ember.RSVP.defer();
    App.FooBarRoute = Ember.Route.extend({
      model: function() {
        return deferred.promise;
      }
    });

    bootApplication('/foo/bar');

    equal(Ember.$('#app', '#qunit-fixture').text(), "FOOBAR LOADING", "foo.bar_loading was entered (as opposed to something like foo/foo/bar_loading)");

    Ember.run(deferred, 'resolve');

    equal(Ember.$('#app', '#qunit-fixture').text(), "YAY");
  });

  test("Rejected promises returned from ApplicationRoute transition into top-level application_error", function() {

    expect(2);

    templates['application_error'] = '<p id="toplevel-error">TOPLEVEL ERROR: {{msg}}</p>';

    var reject = true;
    App.ApplicationRoute = Ember.Route.extend({
      model: function() {
        if (reject) {
          return Ember.RSVP.reject({ msg: "BAD NEWS BEARS" });
        } else {
          return {};
        }
      }
    });

    bootApplication();

    equal(Ember.$('#toplevel-error', '#qunit-fixture').text(), "TOPLEVEL ERROR: BAD NEWS BEARS");

    reject = false;
    Ember.run(router, 'transitionTo', 'index');

    equal(Ember.$('#app', '#qunit-fixture').text(), "INDEX");
  });

}

})();

(function() {
module("ember-states removal");

test("errors occur when attempting to use Ember.StateManager or Ember.State", function() {
  raises(function() {
    Ember.StateManager.extend();
  }, /has been moved into a plugin/);

  raises(function() {
    Ember.State.extend();
  }, /has been moved into a plugin/);

  raises(function() {
    Ember.StateManager.create();
  }, /has been moved into a plugin/);

  raises(function() {
    Ember.State.create();
  }, /has been moved into a plugin/);
});
})();

