(function() {
var stringify = Ember.Handlebars.JavaScriptCompiler.stringifyLastBlockHelperMissingInvocation,
    s;

module("stringifyLastBlockHelperMissingInvocation", {
  setup: function() {
  },

  teardown: function() {
  }
});

function shouldBecome(expected) {
  var source = [s];
  stringify(source);
  equal(source[0], expected);
}

test('basic', function() {
  s = "if (!helpers['expand']) { stack1 = blockHelperMissing.call(depth0, stack1, options); }";
  shouldBecome("if (!helpers['expand']) { stack1 = blockHelperMissing.call(depth0, 'expand', options); }");
});

test('dot lookup', function() {
  s = "if (!helpers.expand) { stack1 = blockHelperMissing.call(depth0, stack1, options); }";
  shouldBecome("if (!helpers.expand) { stack1 = blockHelperMissing.call(depth0, 'expand', options); }");
});

test('dot lookup', function() {
  s = "if (!helpers.view) { stack1 = blockHelperMissing.call(depth0, stack1, options); }";
  shouldBecome("if (!helpers.view) { stack1 = blockHelperMissing.call(depth0, 'view', options); }");
});

test('dashed helper invocation', function() {
  s = "if (!helpers['expand-it']) { stack1 = blockHelperMissing.call(depth0, stack1, options); }";
  shouldBecome("if (!helpers['expand-it']) { stack1 = blockHelperMissing.call(depth0, 'expand-it', options); }");
});

test('weird chars invocation', function() {
  s = "if (!helpers['blorg/snork']) { stack1 = blockHelperMissing.call(depth0, stack1, options); }";
  shouldBecome("if (!helpers['blorg/snork']) { stack1 = blockHelperMissing.call(depth0, 'blorg/snork', options); }");
});

test('large stack/depth numbers', function() {
  s = "if (!helpers['blorg/snork']) { stack6236 = blockHelperMissing.call(depth512, stack6129, options); }";
  shouldBecome("if (!helpers['blorg/snork']) { stack6236 = blockHelperMissing.call(depth512, 'blorg/snork', options); }");
});


})();

(function() {
module("Ember.Handlebars.makeViewHelper");

test("makes helpful assertion when called with invalid arguments", function(){
  var viewClass = {toString: function(){ return 'Some Random Class';}};

  var helper = Ember.Handlebars.makeViewHelper(viewClass);

  expectAssertion(function(){
    helper({foo: 'bar'}, this);
  }, "You can only pass attributes (such as name=value) not bare values to a helper for a View found in 'Some Random Class'");
});

})();

