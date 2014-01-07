(function() {
/*globals Foo:true $foo:true */

var obj, moduleOpts = {
  setup: function() {
    obj = {
      foo: {
        bar: {
          baz: { biff: 'BIFF' }
        }
      },
      falseValue: false
    };

    window.Foo = {
      bar: {
        baz: { biff: 'FooBiff' }
      }
    };

    window.$foo = {
      bar: {
        baz: { biff: '$FOOBIFF' }
      }
    };
  },

  teardown: function() {
    obj = undefined;
    window.Foo = undefined;
    window.$foo = undefined;
  }
};

module('Ember.get with path', moduleOpts);

// ..........................................................
// LOCAL PATHS
//

test('[obj, foo] -> obj.foo', function() {
  deepEqual(Ember.get(obj, 'foo'), obj.foo);
});

test('[obj, foo.bar] -> obj.foo.bar', function() {
  deepEqual(Ember.get(obj, 'foo.bar'), obj.foo.bar);
});

test('[obj, this.foo] -> obj.foo', function() {
  deepEqual(Ember.get(obj, 'this.foo'), obj.foo);
});

test('[obj, this.foo.bar] -> obj.foo.bar', function() {
  deepEqual(Ember.get(obj, 'this.foo.bar'), obj.foo.bar);
});

test('[obj, this.Foo.bar] -> (null)', function() {
  deepEqual(Ember.get(obj, 'this.Foo.bar'), undefined);
});

test('[obj, falseValue.notDefined] -> (null)', function() {
  deepEqual(Ember.get(obj, 'falseValue.notDefined'), undefined);
});

// ..........................................................
// NO TARGET
//

test('[null, Foo] -> Foo', function() {
  deepEqual(Ember.get('Foo'), Foo);
});

test('[null, Foo.bar] -> Foo.bar', function() {
  deepEqual(Ember.get('Foo.bar'), Foo.bar);
});


})();

(function() {
module('Ember.getProperties');

test('can retrieve a hash of properties from an object via an argument list or array of property names', function() {
  var obj = {
    firstName: "Steve",
    lastName: "Jobs",
    companyName: "Apple, Inc."
  };

  var getProperties = Ember.getProperties;
  deepEqual(getProperties(obj, "firstName", "lastName"), { firstName: 'Steve', lastName: 'Jobs' });
  deepEqual(getProperties(obj, "firstName", "lastName"), { firstName: 'Steve', lastName: 'Jobs' });
  deepEqual(getProperties(obj, "lastName"), { lastName: 'Jobs' });
  deepEqual(getProperties(obj), {});
  deepEqual(getProperties(obj, ["firstName", "lastName"]), { firstName: 'Steve', lastName: 'Jobs' });
  deepEqual(getProperties(obj, ["firstName"]), { firstName: 'Steve' });
  deepEqual(getProperties(obj, []), {});
});

})();

(function() {
require('ember-metal/~tests/props_helper');

module('Ember.get');

test('should get arbitrary properties on an object', function() {
  var obj = {
    string: 'string',
    number: 23,
    boolTrue: true,
    boolFalse: false,
    nullValue: null
  };

  for(var key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    equal(Ember.get(obj, key), obj[key], key);
  }

});

testBoth("should call unknownProperty on watched values if the value is undefined", function(get, set) {
  var obj = {
    count: 0,
    unknownProperty: function(key) {
      equal(key, 'foo', "should pass key");
      this.count++;
      return "FOO";
    }
  };

  var count = 0;
  Ember.addObserver(obj, 'foo', function() {
    count++;
  });

  equal(get(obj, 'foo'), 'FOO', 'should return value from unknown');
});

test('warn on attempts to get a property of undefined', function() {
  expectAssertion(function() {
    Ember.get(undefined, 'aProperty');
  }, /Cannot call get with 'aProperty' on an undefined object/i);
});

test('warn on attempts to get a property path of undefined', function() {
  expectAssertion(function() {
    Ember.get(undefined, 'aProperty.on.aPath');
  }, /Cannot call get with 'aProperty.on.aPath' on an undefined object/);
});

test('warn on attemps to get a falsy property', function() {
  var obj = {};
  expectAssertion(function() {
    Ember.get(obj, null);
  }, /Cannot call get with null key/);
  expectAssertion(function() {
    Ember.get(obj, NaN);
  }, /Cannot call get with NaN key/);
  expectAssertion(function() {
    Ember.get(obj, undefined);
  }, /Cannot call get with undefined key/);
  expectAssertion(function() {
    Ember.get(obj, false);
  }, /Cannot call get with false key/);
});

// ..........................................................
// BUGS
//

test('(regression) watched properties on unmodified inherited objects should still return their original value', function() {

  var MyMixin = Ember.Mixin.create({
    someProperty: 'foo',
    propertyDidChange: Ember.observer('someProperty', function() {
      // NOTHING TO DO
    })
  });

  var baseObject = MyMixin.apply({});
  var theRealObject = Ember.create(baseObject);

  equal(Ember.get(theRealObject, 'someProperty'), 'foo', 'should return the set value, not false');
});

module("Ember.getWithDefault");

test('should get arbitrary properties on an object', function() {
  var obj = {
    string: 'string',
    number: 23,
    boolTrue: true,
    boolFalse: false,
    nullValue: null
  };

  for(var key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    equal(Ember.getWithDefault(obj, key, "fail"), obj[key], key);
  }

  obj = {
    undef: undefined
  };

  equal(Ember.getWithDefault(obj, "undef", "default"), "default", "explicit undefined retrieves the default");
  equal(Ember.getWithDefault(obj, "not-present", "default"), "default", "non-present key retrieves the default");
});

test('should call unknownProperty if defined and value is undefined', function() {

  var obj = {
    count: 0,
    unknownProperty: function(key) {
      equal(key, 'foo', 'should pass key');
      this.count++;
      return 'FOO';
    }
  };

  equal(Ember.get(obj, 'foo'), 'FOO', 'should return value from unknown');
  equal(obj.count, 1, 'should have invoked');
});

testBoth("if unknownProperty is present, it is called", function(get, set) {
  var obj = {
    count: 0,
    unknownProperty: function(key) {
      if (key === "foo") {
        equal(key, 'foo', "should pass key");
        this.count++;
        return "FOO";
      }
    }
  };

  var count = 0;
  Ember.addObserver(obj, 'foo', function() {
    count++;
  });

  equal(Ember.getWithDefault(obj, 'foo', "fail"), 'FOO', 'should return value from unknownProperty');
  equal(Ember.getWithDefault(obj, 'bar', "default"), 'default', 'should convert undefined from unknownProperty into default');
});

// ..........................................................
// BUGS
//

test('(regression) watched properties on unmodified inherited objects should still return their original value', function() {

  var MyMixin = Ember.Mixin.create({
    someProperty: 'foo',
    propertyDidChange: Ember.observer('someProperty', function() {
      // NOTHING TO DO
    })
  });

  var baseObject = MyMixin.apply({});
  var theRealObject = Ember.create(baseObject);

  equal(Ember.getWithDefault(theRealObject, 'someProperty', "fail"), 'foo', 'should return the set value, not false');
});


})();

(function() {
module('Ember.isGlobalPath');

test("global path's are recognized", function() {
  ok( Ember.isGlobalPath('App.myProperty') );
  ok( Ember.isGlobalPath('App.myProperty.subProperty') );
});

test("if there is a 'this' in the path, it's not a global path", function() {
  ok( !Ember.isGlobalPath('this.myProperty') );
  ok( !Ember.isGlobalPath('this') );
});

test("if the path starts with a lowercase character, it is not a global path", function() {
  ok( !Ember.isGlobalPath('myObj') );
  ok( !Ember.isGlobalPath('myObj.SecondProperty') );
});

})();

(function() {
/*globals Foo:true $foo:true */

var obj, moduleOpts = {
  setup: function() {
    obj = {
      foo: {
        bar: {
          baz: {}
        }
      }
    };

    window.Foo = {
      bar: {
        baz: {}
      }
    };

    window.$foo = {
      bar: {
        baz: {}
      }
    };
  },

  teardown: function() {
    obj = undefined;
    window.Foo = undefined;
    window.$foo = undefined;
  }
};

module('Ember.normalizeTuple', moduleOpts);

// ..........................................................
// LOCAL PATHS
//

test('[obj, foo] -> [obj, foo]', function() {
  deepEqual(Ember.normalizeTuple(obj, 'foo'), [obj, 'foo']);
});

test('[obj, *] -> [obj, *]', function() {
  deepEqual(Ember.normalizeTuple(obj, '*'), [obj, '*']);
});

test('[obj, foo.bar] -> [obj, foo.bar]', function() {
  deepEqual(Ember.normalizeTuple(obj, 'foo.bar'), [obj, 'foo.bar']);
});

test('[obj, foo.*] -> [obj, foo.*]', function() {
  deepEqual(Ember.normalizeTuple(obj, 'foo.*'), [obj, 'foo.*']);
});

test('[obj, foo.*.baz] -> [obj, foo.*.baz]', function() {
  deepEqual(Ember.normalizeTuple(obj, 'foo.*.baz'), [obj, 'foo.*.baz']);
});

test('[obj, this.foo] -> [obj, foo]', function() {
  deepEqual(Ember.normalizeTuple(obj, 'this.foo'), [obj, 'foo']);
});

test('[obj, this.foo.bar] -> [obj, foo.bar]', function() {
  deepEqual(Ember.normalizeTuple(obj, 'this.foo.bar'), [obj, 'foo.bar']);
});

test('[obj, this.Foo.bar] -> [obj, Foo.bar]', function() {
  deepEqual(Ember.normalizeTuple(obj, 'this.Foo.bar'), [obj, 'Foo.bar']);
});

// ..........................................................
// GLOBAL PATHS
//

test('[obj, Foo] -> [obj, Foo]', function() {
  deepEqual(Ember.normalizeTuple(obj, 'Foo'), [obj, 'Foo']);
});

test('[obj, Foo.bar] -> [Foo, bar]', function() {
  deepEqual(Ember.normalizeTuple(obj, 'Foo.bar'), [Foo, 'bar']);
});

test('[obj, $foo.bar.baz] -> [$foo, bar.baz]', function() {
  deepEqual(Ember.normalizeTuple(obj, '$foo.bar.baz'), [$foo, 'bar.baz']);
});

// ..........................................................
// NO TARGET
//

test('[null, Foo] -> EXCEPTION', function() {
  raises(function() {
    Ember.normalizeTuple(null, 'Foo');
  }, Error);
});

test('[null, Foo.bar] -> [Foo, bar]', function() {
  deepEqual(Ember.normalizeTuple(null, 'Foo.bar'), [Foo, 'bar']);
});

})();

(function() {
var originalLookup = Ember.lookup;

var obj, moduleOpts = {
  setup: function() {
    obj = {
      foo: {
        bar: {
          baz: { biff: 'BIFF' }
        }
      }

    };

    Ember.lookup = {
      Foo: {
        bar: {
          baz: { biff: 'FooBiff' }
        }
      },

      $foo: {
        bar: {
          baz: { biff: '$FOOBIFF' }
        }
      }
    };
  },

  teardown: function() {
    obj = null;
    Ember.lookup = originalLookup;
  }
};

module('Ember.set with path', moduleOpts);

test('[Foo, bar] -> Foo.bar', function() {
  Ember.lookup.Foo = {toString: function() { return 'Foo'; }}; // Behave like an Ember.Namespace

  Ember.set(Ember.lookup.Foo, 'bar', 'baz');
  equal(Ember.get(Ember.lookup.Foo, 'bar'), 'baz');
});

// ..........................................................
// LOCAL PATHS
//

test('[obj, foo] -> obj.foo', function() {
  Ember.set(obj, 'foo', "BAM");
  equal(Ember.get(obj, 'foo'), "BAM");
});

test('[obj, foo.bar] -> obj.foo.bar', function() {
  Ember.set(obj, 'foo.bar', "BAM");
  equal(Ember.get(obj, 'foo.bar'), "BAM");
});

test('[obj, this.foo] -> obj.foo', function() {
  Ember.set(obj, 'this.foo', "BAM");
  equal(Ember.get(obj, 'foo'), "BAM");
});

test('[obj, this.foo.bar] -> obj.foo.bar', function() {
  Ember.set(obj, 'this.foo.bar', "BAM");
  equal(Ember.get(obj, 'foo.bar'), "BAM");
});

// ..........................................................
// NO TARGET
//

test('[null, Foo.bar] -> Foo.bar', function() {
  Ember.set(null, 'Foo.bar', "BAM");
  equal(Ember.get(Ember.lookup.Foo, 'bar'), "BAM");
});

// ..........................................................
// DEPRECATED
//

module("Ember.set with path - deprecated", {
  setup: function() {
    Ember.TESTING_DEPRECATION = true;
    moduleOpts.setup();
  },
  teardown: function() {
    Ember.TESTING_DEPRECATION = false;
    moduleOpts.teardown();
  }
});

test('[null, bla] gives a proper exception message', function() {
  var exceptionMessage = 'Property set failed: object in path \"bla\" could not be found or was destroyed.';
  try {
    Ember.set(null, 'bla', "BAM");
  } catch(ex) {
    equal(ex.message, exceptionMessage);
  }
});

test('[obj, bla.bla] gives a proper exception message', function() {
  var exceptionMessage = 'Property set failed: object in path \"bla\" could not be found or was destroyed.';
  try {
    Ember.set(obj, 'bla.bla', "BAM");
  } catch(ex) {
    equal(ex.message, exceptionMessage);
  }
});

test('[obj, foo.baz.bat] -> EXCEPTION', function() {
  raises(function() {
    Ember.set(obj, 'foo.baz.bat', "BAM");
  }, Error);
});

test('[obj, foo.baz.bat] -> EXCEPTION', function() {
  Ember.trySet(obj, 'foo.baz.bat', "BAM");
  ok(true, "does not raise");
});

})();

(function() {
module('Ember.set');

test('should set arbitrary properties on an object', function() {
  var obj = {
    string: 'string',
    number: 23,
    boolTrue: true,
    boolFalse: false,
    nullValue: null
  };

  var newObj = {};

  for(var key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    equal(Ember.set(newObj, key, obj[key]), obj[key], 'should return value');
    equal(Ember.get(newObj, key), obj[key], 'should set value');
  }

});

test('should call setUnknownProperty if defined and value is undefined', function() {

  var obj = {
    count: 0,

    unknownProperty: function(key, value) {
      ok(false, 'should not invoke unknownProperty if setUnknownProperty is defined');
    },

    setUnknownProperty: function(key, value) {
      equal(key, 'foo', 'should pass key');
      equal(value, 'BAR', 'should pass key');
      this.count++;
      return 'FOO';
    }
  };

  equal(Ember.set(obj, 'foo', "BAR"), 'BAR', 'should return set value');
  equal(obj.count, 1, 'should have invoked');
});


})();

(function() {
/*globals GlobalA:true GlobalB:true */

require('ember-metal/~tests/props_helper');

function performTest(binding, a, b, get, set, connect) {
  if (connect === undefined) connect = function() {binding.connect(a);};

  ok(!Ember.run.currentRunLoop, 'performTest should not have a currentRunLoop');

  equal(get(a, 'foo'), 'FOO', 'a should not have changed');
  equal(get(b, 'bar'), 'BAR', 'b should not have changed');

  connect();

  equal(get(a, 'foo'), 'BAR', 'a should have changed');
  equal(get(b, 'bar'), 'BAR', 'b should have changed');
  //
  // make sure changes sync both ways
  Ember.run(function () {
    set(b, 'bar', 'BAZZ');
  });
  equal(get(a, 'foo'), 'BAZZ', 'a should have changed');

  Ember.run(function () {
    set(a, 'foo', 'BARF');
  });
  equal(get(b, 'bar'), 'BARF', 'a should have changed');
}

module("Ember.Binding");

testBoth('Connecting a binding between two properties', function(get, set) {
  var a = { foo: 'FOO', bar: 'BAR' };

  // a.bar -> a.foo
  var binding = new Ember.Binding('foo', 'bar');

  performTest(binding, a, a, get, set);
});

testBoth('Connecting a binding between two objects', function(get, set) {
  var b = { bar: 'BAR' };
  var a = { foo: 'FOO', b: b };

  // b.bar -> a.foo
  var binding = new Ember.Binding('foo', 'b.bar');

  performTest(binding, a, b, get, set);
});

testBoth('Connecting a binding to path', function(get, set) {
  var a = { foo: 'FOO' };
  GlobalB = {
    b: { bar: 'BAR' }
  };

  var b = get(GlobalB, 'b');

  // globalB.b.bar -> a.foo
  var binding = new Ember.Binding('foo', 'GlobalB.b.bar');

  performTest(binding, a, b, get, set);

  // make sure modifications update
  b = { bar: 'BIFF' };

  Ember.run(function() {
    set(GlobalB, 'b', b);
  });

  equal(get(a, 'foo'), 'BIFF', 'a should have changed');

});

testBoth('Calling connect more than once', function(get, set) {
  var b = { bar: 'BAR' };
  var a = { foo: 'FOO', b: b };

  // b.bar -> a.foo
  var binding = new Ember.Binding('foo', 'b.bar');

  performTest(binding, a, b, get, set, function () {
    binding.connect(a);

    binding.connect(a);
  });
});

testBoth('Bindings should be inherited', function(get, set) {

  var a = { foo: 'FOO', b: { bar: 'BAR' } };
  var binding = new Ember.Binding('foo', 'b.bar');
  var a2;

  Ember.run(function () {
    binding.connect(a);

    a2 = Ember.create(a);
    Ember.rewatch(a2);
  });

  equal(get(a2, 'foo'), "BAR", "Should have synced binding on child");
  equal(get(a,  'foo'), "BAR", "Should NOT have synced binding on parent");

  Ember.run(function () {
    set(a2, 'b', { bar: 'BAZZ' });
  });

  equal(get(a2, 'foo'), "BAZZ", "Should have synced binding on child");
  equal(get(a,  'foo'), "BAR", "Should NOT have synced binding on parent");

});

test('inherited bindings should sync on create', function() {
  var a;
  Ember.run(function () {
    var A = function() {
      Ember.bind(this, 'foo', 'bar.baz');
    };

    a = new A();
    Ember.set(a, 'bar', { baz: 'BAZ' });
  });

  equal(Ember.get(a, 'foo'), 'BAZ', 'should have synced binding on new obj');
});


})();

(function() {
/*globals MyApp:true */

module('system/mixin/binding/oneWay_test', {
  setup: function() {
    MyApp = {
      foo: { value: 'FOO' },
      bar: { value: 'BAR' }
    };
  },

  teardown: function() {
    MyApp = null;
  }
});

test('oneWay(true) should only sync one way', function() {
  var binding;
  Ember.run(function() {
    binding = Ember.oneWay(MyApp, 'bar.value', 'foo.value');
  });

  equal(Ember.get('MyApp.foo.value'), 'FOO', 'foo synced');
  equal(Ember.get('MyApp.bar.value'), 'FOO', 'bar synced');

  Ember.run(function() {
    Ember.set('MyApp.bar.value', 'BAZ');
  });

  equal(Ember.get('MyApp.foo.value'), 'FOO', 'foo synced');
  equal(Ember.get('MyApp.bar.value'), 'BAZ', 'bar not synced');

  Ember.run(function() {
    Ember.set('MyApp.foo.value', 'BIFF');
  });

  equal(Ember.get('MyApp.foo.value'), 'BIFF', 'foo synced');
  equal(Ember.get('MyApp.bar.value'), 'BIFF', 'foo synced');

});


})();

(function() {
module("system/binding/sync_test.js");

testBoth("bindings should not sync twice in a single run loop", function(get, set) {
  var a, b, setValue, setCalled=0, getCalled=0;

  Ember.run(function() {
    a = {};

    Ember.defineProperty(a, 'foo', Ember.computed(function(key, value) {
      if (arguments.length === 2) {
        setCalled++;
        setValue = value;
        return value;
      } else {
        getCalled++;
        return setValue;
      }
    }).volatile());

    b = {
      a: a
    };
    Ember.bind(b, 'foo', 'a.foo');
  });

  // reset after initial binding synchronization
  getCalled = 0;

  Ember.run(function() {
    set(a, 'foo', 'trollface');
  });

  equal(get(b, 'foo'), "trollface", "the binding should sync");
  equal(setCalled, 1, "Set should only be called once");
  equal(getCalled, 1, "Get should only be called once");
});

testBoth("bindings should not infinite loop if computed properties return objects", function(get, set) {
  var a, b, getCalled=0;

  Ember.run(function() {
    a = {};

    Ember.defineProperty(a, 'foo', Ember.computed(function() {
      getCalled++;
      if (getCalled > 1000) {
        throw 'infinite loop detected';
      }
      return ['foo', 'bar'];
    }));

    b = {
      a: a
    };
    Ember.bind(b, 'foo', 'a.foo');
  });

  deepEqual(get(b, 'foo'), ['foo', 'bar'], "the binding should sync");
  equal(getCalled, 1, "Get should only be called once");
});

testBoth("bindings should do the right thing when observers trigger bindings in the opposite direction", function(get, set) {
  var a, b, c;

  Ember.run(function() {
    a = {
      foo: 'trololol'
    };

    b = {
      a: a
    };
    Ember.bind(b, 'foo', 'a.foo');

    c = {
      a: a
    };
    Ember.bind(c, 'foo', 'a.foo');
  });

  Ember.addObserver(b, 'foo', function() {
    set(c, 'foo', "what is going on");
  });

  Ember.run(function() {
    set(a, 'foo', 'trollface');
  });

  equal(get(a, 'foo'), "what is going on");
});

testBoth("bindings should do the right thing when binding is in prototype", function(get, set) {
  var obj, proto, a, b, selectionChanged;
  Ember.run(function() {
    obj = {
      selection: null
    };

    selectionChanged = 0;

    Ember.addObserver(obj, 'selection', function () {
      selectionChanged++;
    });

    proto = {
      obj: obj,
      changeSelection: function (value) {
        set(this, 'selection', value);
      }
    };
    Ember.bind(proto, 'selection', 'obj.selection');

    a = Ember.create(proto);
    b = Ember.create(proto);
    Ember.rewatch(a);
    Ember.rewatch(b);
  });

  Ember.run(function () {
    set(a, 'selection', 'a');
  });

  Ember.run(function () {
    set(b, 'selection', 'b');
  });

  Ember.run(function () {
    set(a, 'selection', 'a');
  });

  equal(selectionChanged, 3);
  equal(get(obj, 'selection'), 'a');
});

testBoth("bindings should not try to sync destroyed objects", function(get, set) {
  var a, b;

  Ember.run(function() {
    a = {
      foo: 'trololol'
    };

    b = {
      a: a
    };
    Ember.bind(b, 'foo', 'a.foo');
  });

  Ember.run(function() {
    set(a, 'foo', 'trollface');
    set(b, 'isDestroyed', true);
    ok(true, "should not raise");
  });

  Ember.run(function() {
    a = {
      foo: 'trololol'
    };

    b = {
      a: a
    };
    Ember.bind(b, 'foo', 'a.foo');
  });

  Ember.run(function() {
    set(b, 'foo', 'trollface');
    set(a, 'isDestroyed', true);
    ok(true, "should not raise");
  });
});

})();

(function() {
/*globals Global:true */

require('ember-metal/~tests/props_helper');

var obj, count;

module('Ember.computed');

test('computed property should be an instance of descriptor', function() {
  ok(Ember.computed(function() {}) instanceof Ember.Descriptor);
});

test('defining computed property should invoke property on get', function() {

  var obj = {};
  var count = 0;
  Ember.defineProperty(obj, 'foo', Ember.computed(function(key) {
    count++;
    return 'computed '+key;
  }));

  equal(Ember.get(obj, 'foo'), 'computed foo', 'should return value');
  equal(count, 1, 'should have invoked computed property');
});

test('defining computed property should invoke property on set', function() {

  var obj = {};
  var count = 0;
  Ember.defineProperty(obj, 'foo', Ember.computed(function(key, value) {
    if (value !== undefined) {
      count++;
      this['__'+key] = 'computed '+value;
    }
    return this['__'+key];
  }));

  equal(Ember.set(obj, 'foo', 'bar'), 'bar', 'should return set value');
  equal(count, 1, 'should have invoked computed property');
  equal(Ember.get(obj, 'foo'), 'computed bar', 'should return new value');
});

var objA, objB;
module('Ember.computed should inherit through prototype', {
  setup: function() {
    objA = { __foo: 'FOO' } ;
    Ember.defineProperty(objA, 'foo', Ember.computed(function(key, value) {
      if (value !== undefined) {
        this['__'+key] = 'computed '+value;
      }
      return this['__'+key];
    }));

    objB = Ember.create(objA);
    objB.__foo = 'FOO'; // make a copy;
  },

  teardown: function() {
    objA = objB = null;
  }
});

testBoth('using get() and set()', function(get, set) {
  equal(get(objA, 'foo'), 'FOO', 'should get FOO from A');
  equal(get(objB, 'foo'), 'FOO', 'should get FOO from B');

  set(objA, 'foo', 'BIFF');
  equal(get(objA, 'foo'), 'computed BIFF', 'should change A');
  equal(get(objB, 'foo'), 'FOO', 'should NOT change B');

  set(objB, 'foo', 'bar');
  equal(get(objB, 'foo'), 'computed bar', 'should change B');
  equal(get(objA, 'foo'), 'computed BIFF', 'should NOT change A');

  set(objA, 'foo', 'BAZ');
  equal(get(objA, 'foo'), 'computed BAZ', 'should change A');
  equal(get(objB, 'foo'), 'computed bar', 'should NOT change B');
});

module('redefining computed property to normal', {
  setup: function() {
    objA = { __foo: 'FOO' } ;
    Ember.defineProperty(objA, 'foo', Ember.computed(function(key, value) {
      if (value !== undefined) {
        this['__'+key] = 'computed '+value;
      }
      return this['__'+key];
    }));

    objB = Ember.create(objA);
    Ember.defineProperty(objB, 'foo'); // make this just a normal property.
  },

  teardown: function() {
    objA = objB = null;
  }
});

testBoth('using get() and set()', function(get, set) {
  equal(get(objA, 'foo'), 'FOO', 'should get FOO from A');
  equal(get(objB, 'foo'), undefined, 'should get undefined from B');

  set(objA, 'foo', 'BIFF');
  equal(get(objA, 'foo'), 'computed BIFF', 'should change A');
  equal(get(objB, 'foo'), undefined, 'should NOT change B');

  set(objB, 'foo', 'bar');
  equal(get(objB, 'foo'), 'bar', 'should change B');
  equal(get(objA, 'foo'), 'computed BIFF', 'should NOT change A');

  set(objA, 'foo', 'BAZ');
  equal(get(objA, 'foo'), 'computed BAZ', 'should change A');
  equal(get(objB, 'foo'), 'bar', 'should NOT change B');
});

module('redefining computed property to another property', {
  setup: function() {
    objA = { __foo: 'FOO' } ;
    Ember.defineProperty(objA, 'foo', Ember.computed(function(key, value) {
      if (value !== undefined) {
        this['__'+key] = 'A '+value;
      }
      return this['__'+key];
    }));

    objB = Ember.create(objA);
    objB.__foo = 'FOO';
    Ember.defineProperty(objB, 'foo', Ember.computed(function(key, value) {
      if (value !== undefined) {
        this['__'+key] = 'B '+value;
      }
      return this['__'+key];
    }));
  },

  teardown: function() {
    objA = objB = null;
  }
});

testBoth('using get() and set()', function(get, set) {
  equal(get(objA, 'foo'), 'FOO', 'should get FOO from A');
  equal(get(objB, 'foo'), 'FOO', 'should get FOO from B');

  set(objA, 'foo', 'BIFF');
  equal(get(objA, 'foo'), 'A BIFF', 'should change A');
  equal(get(objB, 'foo'), 'FOO', 'should NOT change B');

  set(objB, 'foo', 'bar');
  equal(get(objB, 'foo'), 'B bar', 'should change B');
  equal(get(objA, 'foo'), 'A BIFF', 'should NOT change A');

  set(objA, 'foo', 'BAZ');
  equal(get(objA, 'foo'), 'A BAZ', 'should change A');
  equal(get(objB, 'foo'), 'B bar', 'should NOT change B');
});

module('Ember.computed - metadata');

test("can set metadata on a computed property", function() {
  var computedProperty = Ember.computed(function() { });
  computedProperty.meta({ key: 'keyValue' });

  equal(computedProperty.meta().key, 'keyValue', "saves passed meta hash to the _meta property");
});

test("meta should return an empty hash if no meta is set", function() {
  var computedProperty = Ember.computed(function() { });
  deepEqual(computedProperty.meta(), {}, "returned value is an empty hash");
});

// ..........................................................
// CACHEABLE
//

module('Ember.computed - cacheable', {
  setup: function() {
    obj = {};
    count = 0;
    Ember.defineProperty(obj, 'foo', Ember.computed(function(key, value) {
      count++;
      return 'bar '+count;
    }));
  },

  teardown: function() {
    obj = count = null;
  }
});

testBoth('cacheable should cache', function(get, set) {
  equal(get(obj, 'foo'), 'bar 1', 'first get');
  equal(get(obj, 'foo'), 'bar 1', 'second get');
  equal(count, 1, 'should only invoke once');
});

testBoth('modifying a cacheable property should update cache', function(get, set) {
  equal(get(obj, 'foo'), 'bar 1', 'first get');
  equal(get(obj, 'foo'), 'bar 1', 'second get');

  equal(set(obj, 'foo', 'baz'), 'baz', 'setting');
  equal(get(obj, 'foo'), 'bar 2', 'third get');
  equal(count, 2, 'should not invoke again');
});

testBoth('inherited property should not pick up cache', function(get, set) {
  var objB = Ember.create(obj);

  equal(get(obj, 'foo'), 'bar 1', 'obj first get');
  equal(get(objB, 'foo'), 'bar 2', 'objB first get');

  equal(get(obj, 'foo'), 'bar 1', 'obj second get');
  equal(get(objB, 'foo'), 'bar 2', 'objB second get');

  set(obj, 'foo', 'baz'); // modify A
  equal(get(obj, 'foo'), 'bar 3', 'obj third get');
  equal(get(objB, 'foo'), 'bar 2', 'objB third get');
});

testBoth('cacheFor should return the cached value', function(get, set) {
  equal(Ember.cacheFor(obj, 'foo'), undefined, "should not yet be a cached value");

  get(obj, 'foo');

  equal(Ember.cacheFor(obj, 'foo'), "bar 1", "should retrieve cached value");
});

testBoth('cacheFor should return falsy cached values', function(get, set) {

  Ember.defineProperty(obj, 'falsy', Ember.computed(function() {
    return false;
  }));

  equal(Ember.cacheFor(obj, 'falsy'), undefined, "should not yet be a cached value");

  get(obj, 'falsy');

  equal(Ember.cacheFor(obj, 'falsy'), false, "should retrieve cached value");
});

testBoth("setting a cached computed property passes the old value as the third argument", function(get, set) {
  var obj = {
    foo: 0
  };

  var receivedOldValue;

  Ember.defineProperty(obj, 'plusOne', Ember.computed(
    function(key, value, oldValue) {
      receivedOldValue = oldValue;
      return value;
    }).property('foo')
  );

  set(obj, 'plusOne', 1);
  strictEqual(receivedOldValue, undefined, "oldValue should be undefined");

  set(obj, 'plusOne', 2);
  strictEqual(receivedOldValue, 1, "oldValue should be 1");

  set(obj, 'plusOne', 3);
  strictEqual(receivedOldValue, 2, "oldValue should be 2");
});

testBoth("the old value is only passed in if the computed property specifies three arguments", function(get, set) {
  var obj = {
    foo: 0
  };

  var receivedOldValue;

  Ember.defineProperty(obj, 'plusOne', Ember.computed(
    function(key, value) {
      equal(arguments.length, 2, "computed property is only invoked with two arguments");
      return value;
    }).property('foo')
  );

  set(obj, 'plusOne', 1);
  set(obj, 'plusOne', 2);
  set(obj, 'plusOne', 3);
});

// ..........................................................
// DEPENDENT KEYS
//

module('Ember.computed - dependentkey', {
  setup: function() {
    obj = { bar: 'baz' };
    count = 0;
    Ember.defineProperty(obj, 'foo', Ember.computed(function(key, value) {
      count++;
      Ember.get(this, 'bar');
      return 'bar '+count;
    }).property('bar'));
  },

  teardown: function() {
    obj = count = null;
  }
});

testBoth('should lazily watch dependent keys on set', function (get, set) {
  equal(Ember.isWatching(obj, 'bar'), false, 'precond not watching dependent key');
  set(obj, 'foo', 'bar');
  equal(Ember.isWatching(obj, 'bar'), true, 'lazily watching dependent key');
});

testBoth('should lazily watch dependent keys on get', function (get, set) {
  equal(Ember.isWatching(obj, 'bar'), false, 'precond not watching dependent key');
  get(obj, 'foo');
  equal(Ember.isWatching(obj, 'bar'), true, 'lazily watching dependent key');
});

testBoth('local dependent key should invalidate cache', function(get, set) {
  equal(Ember.isWatching(obj, 'bar'), false, 'precond not watching dependent key');
  equal(get(obj, 'foo'), 'bar 1', 'get once');
  equal(Ember.isWatching(obj, 'bar'), true, 'lazily setup watching dependent key');
  equal(get(obj, 'foo'), 'bar 1', 'cached retrieve');

  set(obj, 'bar', 'BIFF'); // should invalidate foo

  equal(get(obj, 'foo'), 'bar 2', 'should recache');
  equal(get(obj, 'foo'), 'bar 2', 'cached retrieve');
});

testBoth('should invalidate multiple nested dependent keys', function(get, set) {
  var count = 0;
  Ember.defineProperty(obj, 'bar', Ember.computed(function() {
    count++;
    get(this, 'baz');
    return 'baz '+count;
  }).property('baz'));

  equal(Ember.isWatching(obj, 'bar'), false, 'precond not watching dependent key');
  equal(Ember.isWatching(obj, 'baz'), false, 'precond not watching dependent key');
  equal(get(obj, 'foo'), 'bar 1', 'get once');
  equal(Ember.isWatching(obj, 'bar'), true, 'lazily setup watching dependent key');
  equal(Ember.isWatching(obj, 'baz'), true, 'lazily setup watching dependent key');
  equal(get(obj, 'foo'), 'bar 1', 'cached retrieve');

  set(obj, 'baz', 'BIFF'); // should invalidate bar -> foo
  equal(Ember.isWatching(obj, 'bar'), false, 'should not be watching dependent key after cache cleared');
  equal(Ember.isWatching(obj, 'baz'), false, 'should not be watching dependent key after cache cleared');

  equal(get(obj, 'foo'), 'bar 2', 'should recache');
  equal(get(obj, 'foo'), 'bar 2', 'cached retrieve');
  equal(Ember.isWatching(obj, 'bar'), true, 'lazily setup watching dependent key');
  equal(Ember.isWatching(obj, 'baz'), true, 'lazily setup watching dependent key');
});

testBoth('circular keys should not blow up', function(get, set) {

  Ember.defineProperty(obj, 'bar', Ember.computed(function(key, value) {
    count++;
    return 'bar '+count;
  }).property('foo'));

  Ember.defineProperty(obj, 'foo', Ember.computed(function(key, value) {
    count++;
    return 'foo '+count;
  }).property('bar'));

  equal(get(obj, 'foo'), 'foo 1', 'get once');
  equal(get(obj, 'foo'), 'foo 1', 'cached retrieve');

  set(obj, 'bar', 'BIFF'); // should invalidate bar -> foo -> bar

  equal(get(obj, 'foo'), 'foo 3', 'should recache');
  equal(get(obj, 'foo'), 'foo 3', 'cached retrieve');
});

testBoth('redefining a property should undo old depenent keys', function(get ,set) {

  equal(Ember.isWatching(obj, 'bar'), false, 'precond not watching dependent key');
  equal(get(obj, 'foo'), 'bar 1');
  equal(Ember.isWatching(obj, 'bar'), true, 'lazily watching dependent key');

  Ember.defineProperty(obj, 'foo', Ember.computed(function() {
    count++;
    return 'baz '+count;
  }).property('baz'));

  equal(Ember.isWatching(obj, 'bar'), false, 'after redefining should not be watching dependent key');

  equal(get(obj, 'foo'), 'baz 2');

  set(obj, 'bar', 'BIFF'); // should not kill cache
  equal(get(obj, 'foo'), 'baz 2');

  set(obj, 'baz', 'BOP');
  equal(get(obj, 'foo'), 'baz 3');
});

if (Ember.FEATURES.isEnabled('propertyBraceExpansion')) {
  testBoth('can watch multiple dependent keys specified declaratively via brace expansion', function (get, set) {
    Ember.defineProperty(obj, 'foo', Ember.computed(function(key, value) {
      count++;
      return 'foo '+count;
    }).property('qux.{bar,baz}'));

    equal(get(obj, 'foo'), 'foo 1', "get once");
    equal(get(obj, 'foo'), 'foo 1', "cached retrieve");

    set(obj, 'qux', {});
    set(obj, 'qux.bar', 'bar'); // invalidate foo

    equal(get(obj, 'foo'), 'foo 2', "foo invalidated from bar");

    set(obj, 'qux.baz', 'baz'); // invalidate foo

    equal(get(obj, 'foo'), 'foo 3', "foo invalidated from baz");

    set(obj, 'qux.quux', 'quux'); // do not invalidate foo

    equal(get(obj, 'foo'), 'foo 3', "foo not invalidated by quux");
  });
}

// ..........................................................
// CHAINED DEPENDENT KEYS
//

var func, moduleOpts = {
  setup: function() {
    obj = {
      foo: {
        bar: {
          baz: {
            biff: "BIFF"
          }
        }
      }
    };

    Global = {
      foo: {
        bar: {
          baz: {
            biff: "BIFF"
          }
        }
      }
    };

    count = 0;
    func = function() {
      count++;
      return Ember.get(obj, 'foo.bar.baz.biff')+' '+count;
    };
  },

  teardown: function() {
    obj = count = func = Global = null;
  }
};

module('Ember.computed - dependentkey with chained properties', moduleOpts);

testBoth('depending on simple chain', function(get, set) {

  // assign computed property
  Ember.defineProperty(obj, 'prop',
    Ember.computed(func).property('foo.bar.baz.biff'));

  equal(get(obj, 'prop'), 'BIFF 1');

  set(Ember.get(obj, 'foo.bar.baz'), 'biff', 'BUZZ');
  equal(get(obj, 'prop'), 'BUZZ 2');
  equal(get(obj, 'prop'), 'BUZZ 2');

  set(Ember.get(obj, 'foo.bar'),  'baz', { biff: 'BLOB' });
  equal(get(obj, 'prop'), 'BLOB 3');
  equal(get(obj, 'prop'), 'BLOB 3');

  set(Ember.get(obj, 'foo.bar.baz'), 'biff', 'BUZZ');
  equal(get(obj, 'prop'), 'BUZZ 4');
  equal(get(obj, 'prop'), 'BUZZ 4');

  set(Ember.get(obj, 'foo'), 'bar', { baz: { biff: 'BOOM' } });
  equal(get(obj, 'prop'), 'BOOM 5');
  equal(get(obj, 'prop'), 'BOOM 5');

  set(Ember.get(obj, 'foo.bar.baz'), 'biff', 'BUZZ');
  equal(get(obj, 'prop'), 'BUZZ 6');
  equal(get(obj, 'prop'), 'BUZZ 6');

  set(obj, 'foo', { bar: { baz: { biff: 'BLARG' } } });
  equal(get(obj, 'prop'), 'BLARG 7');
  equal(get(obj, 'prop'), 'BLARG 7');

  set(Ember.get(obj, 'foo.bar.baz'), 'biff', 'BUZZ');
  equal(get(obj, 'prop'), 'BUZZ 8');
  equal(get(obj, 'prop'), 'BUZZ 8');

  Ember.defineProperty(obj, 'prop');
  set(obj, 'prop', 'NONE');
  equal(get(obj, 'prop'), 'NONE');

  set(obj, 'foo', { bar: { baz: { biff: 'BLARG' } } });
  equal(get(obj, 'prop'), 'NONE'); // should do nothing
  equal(count, 8, 'should be not have invoked computed again');

});

testBoth('depending on Global chain', function(get, set) {

  // assign computed property
  Ember.defineProperty(obj, 'prop', Ember.computed(function() {
    count++;
    return Ember.get('Global.foo.bar.baz.biff')+' '+count;
  }).property('Global.foo.bar.baz.biff'));

  equal(get(obj, 'prop'), 'BIFF 1');

  set(Ember.get(Global, 'foo.bar.baz'), 'biff', 'BUZZ');
  equal(get(obj, 'prop'), 'BUZZ 2');
  equal(get(obj, 'prop'), 'BUZZ 2');

  set(Ember.get(Global, 'foo.bar'), 'baz', { biff: 'BLOB' });
  equal(get(obj, 'prop'), 'BLOB 3');
  equal(get(obj, 'prop'), 'BLOB 3');

  set(Ember.get(Global, 'foo.bar.baz'), 'biff', 'BUZZ');
  equal(get(obj, 'prop'), 'BUZZ 4');
  equal(get(obj, 'prop'), 'BUZZ 4');

  set(Ember.get(Global, 'foo'), 'bar', { baz: { biff: 'BOOM' } });
  equal(get(obj, 'prop'), 'BOOM 5');
  equal(get(obj, 'prop'), 'BOOM 5');

  set(Ember.get(Global, 'foo.bar.baz'), 'biff', 'BUZZ');
  equal(get(obj, 'prop'), 'BUZZ 6');
  equal(get(obj, 'prop'), 'BUZZ 6');

  set(Global, 'foo', { bar: { baz: { biff: 'BLARG' } } });
  equal(get(obj, 'prop'), 'BLARG 7');
  equal(get(obj, 'prop'), 'BLARG 7');

  set(Ember.get(Global, 'foo.bar.baz'), 'biff', 'BUZZ');
  equal(get(obj, 'prop'), 'BUZZ 8');
  equal(get(obj, 'prop'), 'BUZZ 8');

  Ember.defineProperty(obj, 'prop');
  set(obj, 'prop', 'NONE');
  equal(get(obj, 'prop'), 'NONE');

  set(Global, 'foo', { bar: { baz: { biff: 'BLARG' } } });
  equal(get(obj, 'prop'), 'NONE'); // should do nothing
  equal(count, 8, 'should be not have invoked computed again');

});

testBoth('chained dependent keys should evaluate computed properties lazily', function(get,set) {
  Ember.defineProperty(obj.foo.bar, 'b', Ember.computed(func));
  Ember.defineProperty(obj.foo, 'c', Ember.computed(function() {}).property('bar.b'));
  equal(count, 0, 'b should not run');
});


// ..........................................................
// BUGS
//

module('computed edge cases');

test('adding a computed property should show up in key iteration',function() {

  var obj = {};
  Ember.defineProperty(obj, 'foo', Ember.computed(function() {}));

  var found = [];
  for(var key in obj) found.push(key);
  ok(Ember.EnumerableUtils.indexOf(found, 'foo')>=0, 'should find computed property in iteration found='+found);
  ok('foo' in obj, 'foo in obj should pass');
});


module('Ember.computed - setter');

testBoth('setting a watched computed property', function(get, set) {
  var obj = {
    firstName: 'Yehuda',
    lastName: 'Katz'
  };
  Ember.defineProperty(obj, 'fullName', Ember.computed(
    function(key, value) {
      if (arguments.length > 1) {
        var values = value.split(' ');
        set(this, 'firstName', values[0]);
        set(this, 'lastName', values[1]);
        return value;
      }
      return get(this, 'firstName') + ' ' + get(this, 'lastName');
    }).property('firstName', 'lastName')
  );
  var fullNameWillChange = 0,
      fullNameDidChange = 0,
      firstNameWillChange = 0,
      firstNameDidChange = 0,
      lastNameWillChange = 0,
      lastNameDidChange = 0;
  Ember.addBeforeObserver(obj, 'fullName', function () {
    fullNameWillChange++;
  });
  Ember.addObserver(obj, 'fullName', function () {
    fullNameDidChange++;
  });
  Ember.addBeforeObserver(obj, 'firstName', function () {
    firstNameWillChange++;
  });
  Ember.addObserver(obj, 'firstName', function () {
    firstNameDidChange++;
  });
  Ember.addBeforeObserver(obj, 'lastName', function () {
    lastNameWillChange++;
  });
  Ember.addObserver(obj, 'lastName', function () {
    lastNameDidChange++;
  });

  equal(get(obj, 'fullName'), 'Yehuda Katz');

  set(obj, 'fullName', 'Yehuda Katz');

  set(obj, 'fullName', 'Kris Selden');

  equal(get(obj, 'fullName'), 'Kris Selden');
  equal(get(obj, 'firstName'), 'Kris');
  equal(get(obj, 'lastName'), 'Selden');

  equal(fullNameWillChange, 1);
  equal(fullNameDidChange, 1);
  equal(firstNameWillChange, 1);
  equal(firstNameDidChange, 1);
  equal(lastNameWillChange, 1);
  equal(lastNameDidChange, 1);
});

testBoth('setting a cached computed property that modifies the value you give it', function(get, set) {
  var obj = {
    foo: 0
  };
  Ember.defineProperty(obj, 'plusOne', Ember.computed(
    function(key, value) {
      if (arguments.length > 1) {
        set(this, 'foo', value);
        return value + 1;
      }
      return get(this, 'foo') + 1;
    }).property('foo')
  );
  var plusOneWillChange = 0,
      plusOneDidChange = 0;
  Ember.addBeforeObserver(obj, 'plusOne', function () {
    plusOneWillChange++;
  });
  Ember.addObserver(obj, 'plusOne', function () {
    plusOneDidChange++;
  });

  equal(get(obj, 'plusOne'), 1);
  set(obj, 'plusOne', 1);
  equal(get(obj, 'plusOne'), 2);
  set(obj, 'plusOne', 1);
  equal(get(obj, 'plusOne'), 2);

  equal(plusOneWillChange, 1);
  equal(plusOneDidChange, 1);

  set(obj, 'foo', 5);
  equal(get(obj, 'plusOne'), 6);

  equal(plusOneWillChange, 2);
  equal(plusOneDidChange, 2);
});

module('Ember.computed - default setter');

testBoth("when setting a value on a computed property that doesn't handle sets", function(get, set) {
  var obj = {}, observerFired = false;

  Ember.defineProperty(obj, 'foo', Ember.computed(function() {
    return 'foo';
  }));

  Ember.addObserver(obj, 'foo', null, function() {
    observerFired = true;
  });

  Ember.set(obj, 'foo', 'bar');

  equal(Ember.get(obj, 'foo'), 'bar', 'The set value is properly returned');
  ok(!Ember.meta(obj).descs.foo, 'The computed property was removed');
  ok(observerFired, 'The observer was still notified');
});

module('Ember.computed - readOnly');

test('is chainable', function() {
  var computed = Ember.computed(function() {}).readOnly();

  ok(computed instanceof Ember.Descriptor);
  ok(computed instanceof Ember.ComputedProperty);
});

testBoth('protects against setting', function(get, set) {
  var obj = {  };

  Ember.defineProperty(obj, 'bar', Ember.computed(function(key) {
    return 'barValue';
  }).readOnly());

  equal(get(obj, 'bar'), 'barValue');

  raises(function() {
    set(obj, 'bar', 'newBar');
  }, /Cannot Set: bar on:/ );

  equal(get(obj, 'bar'), 'barValue');
});

module('CP macros');

testBoth('Ember.computed.not', function(get, set) {
  var obj = {foo: true};
  Ember.defineProperty(obj, 'notFoo', Ember.computed.not('foo'));
  equal(get(obj, 'notFoo'), false);

  obj = {foo: {bar: true}};
  Ember.defineProperty(obj, 'notFoo', Ember.computed.not('foo.bar'));
  equal(get(obj, 'notFoo'), false);
});

testBoth('Ember.computed.empty', function(get, set) {
  var obj = {foo: [], bar: undefined, baz: null, quz: ''};
  Ember.defineProperty(obj, 'fooEmpty', Ember.computed.empty('foo'));
  Ember.defineProperty(obj, 'barEmpty', Ember.computed.empty('bar'));
  Ember.defineProperty(obj, 'bazEmpty', Ember.computed.empty('baz'));
  Ember.defineProperty(obj, 'quzEmpty', Ember.computed.empty('quz'));

  equal(get(obj, 'fooEmpty'), true);
  set(obj, 'foo', [1]);
  equal(get(obj, 'fooEmpty'), false);
  equal(get(obj, 'barEmpty'), true);
  equal(get(obj, 'bazEmpty'), true);
  equal(get(obj, 'quzEmpty'), true);
  set(obj, 'quz', 'asdf');
  equal(get(obj, 'quzEmpty'), false);
});

testBoth('Ember.computed.bool', function(get, set) {
  var obj = {foo: function() {}, bar: 'asdf', baz: null, quz: false};
  Ember.defineProperty(obj, 'fooBool', Ember.computed.bool('foo'));
  Ember.defineProperty(obj, 'barBool', Ember.computed.bool('bar'));
  Ember.defineProperty(obj, 'bazBool', Ember.computed.bool('baz'));
  Ember.defineProperty(obj, 'quzBool', Ember.computed.bool('quz'));
  equal(get(obj, 'fooBool'), true);
  equal(get(obj, 'barBool'), true);
  equal(get(obj, 'bazBool'), false);
  equal(get(obj, 'quzBool'), false);
});

testBoth('Ember.computed.alias', function(get, set) {
  var obj = { bar: 'asdf', baz: null, quz: false};
  Ember.defineProperty(obj, 'bay', Ember.computed(function(key) {
    return 'apple';
  }));

  Ember.defineProperty(obj, 'barAlias', Ember.computed.alias('bar'));
  Ember.defineProperty(obj, 'bazAlias', Ember.computed.alias('baz'));
  Ember.defineProperty(obj, 'quzAlias', Ember.computed.alias('quz'));
  Ember.defineProperty(obj, 'bayAlias', Ember.computed.alias('bay'));

  equal(get(obj, 'barAlias'), 'asdf');
  equal(get(obj, 'bazAlias'), null);
  equal(get(obj, 'quzAlias'), false);
  equal(get(obj, 'bayAlias'), 'apple');

  set(obj, 'barAlias', 'newBar');
  set(obj, 'bazAlias', 'newBaz');
  set(obj, 'quzAlias', null);

  equal(get(obj, 'barAlias'), 'newBar');
  equal(get(obj, 'bazAlias'), 'newBaz');
  equal(get(obj, 'quzAlias'), null);

  equal(get(obj, 'bar'), 'newBar');
  equal(get(obj, 'baz'), 'newBaz');
  equal(get(obj, 'quz'), null);
});

testBoth('Ember.computed.defaultTo', function(get, set) {
  var obj = { source: 'original source value' };
  Ember.defineProperty(obj, 'copy', Ember.computed.defaultTo('source'));

  equal(get(obj, 'copy'), 'original source value');

  set(obj, 'copy', 'new copy value');
  equal(get(obj, 'source'), 'original source value');
  equal(get(obj, 'copy'), 'new copy value');

  set(obj, 'source', 'new source value');
  equal(get(obj, 'copy'), 'new copy value');

  set(obj, 'copy', null);
  equal(get(obj, 'copy'), 'new source value');
});

testBoth('Ember.computed.match', function(get, set) {
  var obj = { name: 'Paul' };
  Ember.defineProperty(obj, 'isPaul', Ember.computed.match('name', /Paul/));

  equal(get(obj, 'isPaul'), true, 'is Paul');

  set(obj, 'name', 'Pierre');

  equal(get(obj, 'isPaul'), false, 'is not Paul anymore');
});

testBoth('Ember.computed.notEmpty', function(get, set) {
  var obj = { items: [1] };
  Ember.defineProperty(obj, 'hasItems', Ember.computed.notEmpty('items'));

  equal(get(obj, 'hasItems'), true, 'is not empty');

  set(obj, 'items', []);

  equal(get(obj, 'hasItems'), false, 'is empty');
});

testBoth('Ember.computed.equal', function(get, set) {
  var obj = { name: 'Paul' };
  Ember.defineProperty(obj, 'isPaul', Ember.computed.equal('name', 'Paul'));

  equal(get(obj, 'isPaul'), true, 'is Paul');

  set(obj, 'name', 'Pierre');

  equal(get(obj, 'isPaul'), false, 'is not Paul anymore');
});

testBoth('Ember.computed.gt', function(get, set) {
  var obj = { number: 2 };
  Ember.defineProperty(obj, 'isGreaterThenOne', Ember.computed.gt('number', 1));

  equal(get(obj, 'isGreaterThenOne'), true, 'is gt');

  set(obj, 'number', 1);

  equal(get(obj, 'isGreaterThenOne'), false, 'is not gt');

  set(obj, 'number', 0);

  equal(get(obj, 'isGreaterThenOne'), false, 'is not gt');
});

testBoth('Ember.computed.gte', function(get, set) {
  var obj = { number: 2 };
  Ember.defineProperty(obj, 'isGreaterOrEqualThenOne', Ember.computed.gte('number', 1));

  equal(get(obj, 'isGreaterOrEqualThenOne'), true, 'is gte');

  set(obj, 'number', 1);

  equal(get(obj, 'isGreaterOrEqualThenOne'), true, 'is gte');

  set(obj, 'number', 0);

  equal(get(obj, 'isGreaterOrEqualThenOne'), false, 'is not gte');
});

testBoth('Ember.computed.lt', function(get, set) {
  var obj = { number: 0 };
  Ember.defineProperty(obj, 'isLesserThenOne', Ember.computed.lt('number', 1));

  equal(get(obj, 'isLesserThenOne'), true, 'is lt');

  set(obj, 'number', 1);

  equal(get(obj, 'isLesserThenOne'), false, 'is not lt');

  set(obj, 'number', 2);

  equal(get(obj, 'isLesserThenOne'), false, 'is not lt');
});

testBoth('Ember.computed.lte', function(get, set) {
  var obj = { number: 0 };
  Ember.defineProperty(obj, 'isLesserOrEqualThenOne', Ember.computed.lte('number', 1));

  equal(get(obj, 'isLesserOrEqualThenOne'), true, 'is lte');

  set(obj, 'number', 1);

  equal(get(obj, 'isLesserOrEqualThenOne'), true, 'is lte');

  set(obj, 'number', 2);

  equal(get(obj, 'isLesserOrEqualThenOne'), false, 'is not lte');
});

testBoth('Ember.computed.and', function(get, set) {
  var obj = { one: true, two: true };
  Ember.defineProperty(obj, 'oneAndTwo', Ember.computed.and('one', 'two'));

  equal(get(obj, 'oneAndTwo'), true, 'one and two');

  set(obj, 'one', false);

  equal(get(obj, 'oneAndTwo'), false, 'one and not two');
});

testBoth('Ember.computed.or', function(get, set) {
  var obj = { one: true, two: true };
  Ember.defineProperty(obj, 'oneOrTwo', Ember.computed.or('one', 'two'));

  equal(get(obj, 'oneOrTwo'), true, 'one or two');

  set(obj, 'one', false);

  equal(get(obj, 'oneOrTwo'), true, 'one or two');

  set(obj, 'two', false);

  equal(get(obj, 'oneOrTwo'), false, 'nore one nore two');

  set(obj, 'one', true);

  equal(get(obj, 'oneOrTwo'), true, 'one or two');
});

testBoth('Ember.computed.any', function(get, set) {
  var obj = { one: 'foo', two: 'bar' };
  Ember.defineProperty(obj, 'anyOf', Ember.computed.any('one', 'two'));

  equal(get(obj, 'anyOf'), 'foo', 'is foo');

  set(obj, 'one', false);

  equal(get(obj, 'anyOf'), 'bar', 'is bar');
});

testBoth('Ember.computed.collect', function(get, set) {
  var obj = { one: 'foo', two: 'bar', three: null };
  Ember.defineProperty(obj, 'all', Ember.computed.collect('one', 'two', 'three', 'four'));

  deepEqual(get(obj, 'all'), ['foo', 'bar', null, null], 'have all of them');

  set(obj, 'four', true);

  deepEqual(get(obj, 'all'), ['foo', 'bar', null, true], 'have all of them');

  var a = [];
  set(obj, 'one', 0);
  set(obj, 'three', a);

  deepEqual(get(obj, 'all'), [0, 'bar', a, true], 'have all of them');
});

testBoth('Ember.computed.oneWay', function(get, set) {
  var obj = {
    firstName: 'Teddy',
    lastName: 'Zeenny'
  };

  Ember.defineProperty(obj, 'nickName', Ember.computed.oneWay('firstName'));

  equal(get(obj, 'firstName'), 'Teddy');
  equal(get(obj, 'lastName'), 'Zeenny');
  equal(get(obj, 'nickName'), 'Teddy');

  set(obj, 'nickName', 'TeddyBear');

  equal(get(obj, 'firstName'), 'Teddy');
  equal(get(obj, 'lastName'), 'Zeenny');

  equal(get(obj, 'nickName'), 'TeddyBear');

  set(obj, 'firstName', 'TEDDDDDDDDYYY');

  equal(get(obj, 'nickName'), 'TeddyBear');
});

})();

(function() {
module("Ember.isEmpty");

test("Ember.isEmpty", function() {
  var string = "string", fn = function() {},
      object = {length: 0};

  equal(true,  Ember.isEmpty(null),      "for null");
  equal(true,  Ember.isEmpty(undefined), "for undefined");
  equal(true,  Ember.isEmpty(""),        "for an empty String");
  equal(false, Ember.isEmpty(true),      "for true");
  equal(false, Ember.isEmpty(false),     "for false");
  equal(false, Ember.isEmpty(string),    "for a String");
  equal(false, Ember.isEmpty(fn),        "for a Function");
  equal(false, Ember.isEmpty(0),         "for 0");
  equal(true,  Ember.isEmpty([]),        "for an empty Array");
  equal(false, Ember.isEmpty({}),        "for an empty Object");
  equal(true,  Ember.isEmpty(object),     "for an Object that has zero 'length'");
});

})();

(function() {
module("Ember.isNone");

test("Ember.isNone", function() {
  var string = "string", fn = function() {};

  equal(true,  Ember.isNone(null),      "for null");
  equal(true,  Ember.isNone(undefined), "for undefined");
  equal(false, Ember.isNone(""),        "for an empty String");
  equal(false, Ember.isNone(true),      "for true");
  equal(false, Ember.isNone(false),     "for false");
  equal(false, Ember.isNone(string),    "for a String");
  equal(false, Ember.isNone(fn),        "for a Function");
  equal(false, Ember.isNone(0),         "for 0");
  equal(false, Ember.isNone([]),        "for an empty Array");
  equal(false, Ember.isNone({}),        "for an empty Object");
});

})();

(function() {
module('Ember.EnumerableUtils.intersection');

test('returns an array of objects that appear in both enumerables', function() {
  var a = [1,2,3], b = [2,3,4], result;

  result = Ember.EnumerableUtils.intersection(a, b);

  deepEqual(result, [2,3]);
});

test("large replace", function() {
  expect(0);

  // https://code.google.com/p/chromium/issues/detail?id=56588
  Ember.EnumerableUtils.replace([], 0, undefined, new Array(62401));   // max + 1 in Chrome  28.0.1500.71
  Ember.EnumerableUtils.replace([], 0, undefined, new Array(65535));   // max + 1 in Safari  6.0.5 (8536.30.1)
  Ember.EnumerableUtils.replace([], 0, undefined, new Array(491519));  // max + 1 in FireFox 22.0
});

})();

(function() {
module("Ember Error Throwing");

test("new Ember.Error displays provided message", function() {
  raises( function() {
    throw new Ember.Error('A Message');
  }, function(e) {
    return e.message === 'A Message';
  }, 'the assigned message was displayed' );
});

})();

(function() {
module('system/props/events_test');

test('listener should receive event - removing should remove', function() {
  var obj = {}, count = 0;
  var F = function() { count++; };

  Ember.addListener(obj, 'event!', F);
  equal(count, 0, 'nothing yet');

  Ember.sendEvent(obj, 'event!');
  equal(count, 1, 'received event');

  Ember.removeListener(obj, 'event!', F);

  count = 0;
  Ember.sendEvent(obj, 'event!');
  equal(count, 0, 'received event');
});

test('listeners should be inherited', function() {
  var obj = {}, count = 0;
  var F = function() { count++; };

  Ember.addListener(obj, 'event!', F);

  var obj2 = Ember.create(obj);

  equal(count, 0, 'nothing yet');

  Ember.sendEvent(obj2, 'event!');
  equal(count, 1, 'received event');

  Ember.removeListener(obj2, 'event!', F);

  count = 0;
  Ember.sendEvent(obj2, 'event!');
  equal(count, 0, 'did not receive event');

  Ember.sendEvent(obj, 'event!');
  equal(count, 1, 'should still invoke on parent');

});


test('adding a listener more than once should only invoke once', function() {

  var obj = {}, count = 0;
  var F = function() { count++; };
  Ember.addListener(obj, 'event!', F);
  Ember.addListener(obj, 'event!', F);

  Ember.sendEvent(obj, 'event!');
  equal(count, 1, 'should only invoke once');
});

test('adding a listener with a target should invoke with target', function() {
  var obj = {}, target;

  target = {
    count: 0,
    method: function() { this.count++; }
  };

  Ember.addListener(obj, 'event!', target, target.method);
  Ember.sendEvent(obj, 'event!');
  equal(target.count, 1, 'should invoke');
});

test('suspending a listener should not invoke during callback', function() {
  var obj = {}, target, otherTarget;

  target = {
    count: 0,
    method: function() { this.count++; }
  };

  otherTarget = {
    count: 0,
    method: function() { this.count++; }
  };

  Ember.addListener(obj, 'event!', target, target.method);
  Ember.addListener(obj, 'event!', otherTarget, otherTarget.method);

  function callback() {
      equal(this, target);

      Ember.sendEvent(obj, 'event!');

      return 'result';
  }

  Ember.sendEvent(obj, 'event!');

  equal(Ember._suspendListener(obj, 'event!', target, target.method, callback), 'result');

  Ember.sendEvent(obj, 'event!');

  equal(target.count, 2, 'should invoke');
  equal(otherTarget.count, 3, 'should invoke');
});

test('adding a listener with string method should lookup method on event delivery', function() {
  var obj = {}, target;

  target = {
    count: 0,
    method: function() {}
  };

  Ember.addListener(obj, 'event!', target, 'method');
  Ember.sendEvent(obj, 'event!');
  equal(target.count, 0, 'should invoke but do nothing');

  target.method = function() { this.count++; };
  Ember.sendEvent(obj, 'event!');
  equal(target.count, 1, 'should invoke now');
});

test('calling sendEvent with extra params should be passed to listeners', function() {

  var obj = {}, params = null;
  Ember.addListener(obj, 'event!', function() {
    params = Array.prototype.slice.call(arguments);
  });

  Ember.sendEvent(obj, 'event!', ['foo', 'bar']);
  deepEqual(params, ['foo', 'bar'], 'params should be saved');
});

test('implementing sendEvent on object should invoke', function() {
  var obj = {
    sendEvent: function(eventName, params) {
      equal(eventName, 'event!', 'eventName');
      deepEqual(params, ['foo', 'bar']);
      this.count++;
    },

    count: 0
  };

  Ember.addListener(obj, 'event!', obj, function() { this.count++; });

  Ember.sendEvent(obj, 'event!', ['foo', 'bar']);
  equal(obj.count, 2, 'should have invoked method & listener');
});

test('hasListeners tells you if there are listeners for a given event', function() {

  var obj = {}, F = function() {}, F2 = function() {};

  equal(Ember.hasListeners(obj, 'event!'), false, 'no listeners at first');

  Ember.addListener(obj, 'event!', F);
  Ember.addListener(obj, 'event!', F2);

  equal(Ember.hasListeners(obj, 'event!'), true, 'has listeners');

  Ember.removeListener(obj, 'event!', F);
  equal(Ember.hasListeners(obj, 'event!'), true, 'has listeners');

  Ember.removeListener(obj, 'event!', F2);
  equal(Ember.hasListeners(obj, 'event!'), false, 'has no more listeners');

  Ember.addListener(obj, 'event!', F);
  equal(Ember.hasListeners(obj, 'event!'), true, 'has listeners');
});

test('calling removeListener without method should remove all listeners', function() {
  var obj = {}, F = function() {}, F2 = function() {};

  equal(Ember.hasListeners(obj, 'event!'), false, 'no listeners at first');

  Ember.addListener(obj, 'event!', F);
  Ember.addListener(obj, 'event!', F2);

  equal(Ember.hasListeners(obj, 'event!'), true, 'has listeners');

  Ember.removeListener(obj, 'event!');

  equal(Ember.hasListeners(obj, 'event!'), false, 'has no more listeners');
});

test('while suspended, it should not be possible to add a duplicate listener', function() {
  var obj = {}, target;

  target = {
    count: 0,
    method: function() { this.count++; }
  };

  Ember.addListener(obj, 'event!', target, target.method);

  function callback() {
    Ember.addListener(obj, 'event!', target, target.method);
  }

  Ember.sendEvent(obj, 'event!');

  Ember._suspendListener(obj, 'event!', target, target.method, callback);

  equal(target.count, 1, 'should invoke');
  equal(Ember.meta(obj).listeners['event!'].length, 3, "a duplicate listener wasn't added");

  // now test _suspendListeners...

  Ember.sendEvent(obj, 'event!');

  Ember._suspendListeners(obj, ['event!'], target, target.method, callback);

  equal(target.count, 2, 'should have invoked again');
  equal(Ember.meta(obj).listeners['event!'].length, 3, "a duplicate listener wasn't added");
});

test('a listener can be added as part of a mixin', function() {
  var triggered = 0;
  var MyMixin = Ember.Mixin.create({
    foo1: Ember.on('bar', function() {
      triggered++;
    }),

    foo2: Ember.on('bar', function() {
      triggered++;
    })
  });

  var obj = {};
  MyMixin.apply(obj);

  Ember.sendEvent(obj, 'bar');
  equal(triggered, 2, 'should invoke listeners');
});

test('a listener added as part of a mixin may be overridden', function() {

  var triggered = 0;
  var FirstMixin = Ember.Mixin.create({
    foo: Ember.on('bar', function() {
      triggered++;
    })
  });
  var SecondMixin = Ember.Mixin.create({
    foo: Ember.on('baz', function() {
      triggered++;
    })
  });

  var obj = {};
  FirstMixin.apply(obj);
  SecondMixin.apply(obj);

  Ember.sendEvent(obj, 'bar');
  equal(triggered, 0, 'should not invoke from overriden property');

  Ember.sendEvent(obj, 'baz');
  equal(triggered, 1, 'should invoke from subclass property');
});

})();

(function() {
var isEnabled = Ember.FEATURES.isEnabled,
    origFeatures, origEnableAll, origEnableOptional;

module("Ember.FEATURES.isEnabled", {
  setup: function(){
    origFeatures       = Ember.FEATURES;
    origEnableAll      = Ember.ENV.ENABLE_ALL_FEATURES;
    origEnableOptional = Ember.ENV.ENABLE_OPTIONAL_FEATURES;
  },

  teardown: function(){
    Ember.FEATURES                     = origFeatures;
    Ember.ENV.ENABLE_ALL_FEATURES      = origEnableAll;
    Ember.ENV.ENABLE_OPTIONAL_FEATURES = origEnableOptional;
  }
});

test("ENV.ENABLE_ALL_FEATURES", function() {
  Ember.ENV.ENABLE_ALL_FEATURES = true;
  Ember.FEATURES['fred'] = false;
  Ember.FEATURES['wilma'] = null;

  equal(isEnabled('fred'),  true, "overrides features set to false");
  equal(isEnabled('wilma'), true, "enables optional features");
  equal(isEnabled('betty'), true, "enables non-specified features");
});

test("ENV.ENABLE_OPTIONAL_FEATURES", function() {
  Ember.ENV.ENABLE_OPTIONAL_FEATURES = true;
  Ember.FEATURES['fred'] = false;
  Ember.FEATURES['barney'] = true;
  Ember.FEATURES['wilma'] = null;

  equal(isEnabled('fred'),   false, "returns flag value if false");
  equal(isEnabled('barney'), true,  "returns flag value if true");
  equal(isEnabled('wilma'),  true,  "returns true if flag is not true|false|undefined");
  equal(isEnabled('betty'),  undefined, "returns flag value if undefined");
});

test("isEnabled without ENV options", function(){
  Ember.ENV.ENABLE_ALL_FEATURES = false;
  Ember.ENV.ENABLE_OPTIONAL_FEATURES = false;

  Ember.FEATURES['fred'] = false;
  Ember.FEATURES['barney'] = true;
  Ember.FEATURES['wilma'] = null;

  equal(isEnabled('fred'),   false, "returns flag value if false");
  equal(isEnabled('barney'), true,  "returns flag value if true");
  equal(isEnabled('wilma'),  false, "returns false if flag is not set");
  equal(isEnabled('betty'),  undefined, "returns flag value if undefined");
});

})();

(function() {
var instrument = Ember.Instrumentation;

module("Ember Instrumentation", {
  setup: function() {

  },
  teardown: function() {
    instrument.reset();
  }
});

test("subscribing to a simple path receives the listener", function() {
  expect(12);

  var sentPayload = {}, count = 0;

  instrument.subscribe("render", {
    before: function(name, timestamp, payload) {
      if (count === 0) {
        strictEqual(name, "render");
      } else {
        strictEqual(name, "render.handlebars");
      }

      ok(typeof timestamp === 'number');
      strictEqual(payload, sentPayload);
    },

    after: function(name, timestamp, payload) {
      if (count === 0) {
        strictEqual(name, "render");
      } else {
        strictEqual(name, "render.handlebars");
      }

      ok(typeof timestamp === 'number');
      strictEqual(payload, sentPayload);

      count++;
    }
  });

  instrument.instrument("render", sentPayload, function() {

  });

  instrument.instrument("render.handlebars", sentPayload, function() {

  });
});

test("returning a value from the before callback passes it to the after callback", function() {
  expect(2);

  var passthru1 = {}, passthru2 = {};

  instrument.subscribe("render", {
    before: function(name, timestamp, payload) {
      return passthru1;
    },
    after: function(name, timestamp, payload, beforeValue) {
      strictEqual(beforeValue, passthru1);
    }
  });

  instrument.subscribe("render", {
    before: function(name, timestamp, payload) {
      return passthru2;
    },
    after: function(name, timestamp, payload, beforeValue) {
      strictEqual(beforeValue, passthru2);
    }
  });

  instrument.instrument("render", null, function() {});
});

test("raising an exception in the instrumentation attaches it to the payload", function() {
  expect(2);

  var error = new Error("Instrumentation");

  instrument.subscribe("render", {
    before: function() {},
    after: function(name, timestamp, payload) {
      strictEqual(payload.exception, error);
    }
  });

  instrument.subscribe("render", {
    before: function() {},
    after: function(name, timestamp, payload) {
      strictEqual(payload.exception, error);
    }
  });

  instrument.instrument("render.handlebars", null, function() {
    throw error;
  });
});

test("it is possible to add a new subscriber after the first instrument", function() {
  instrument.instrument("render.handlebars", null, function() {});

  instrument.subscribe("render", {
    before: function() {
      ok(true, "Before callback was called");
    },
    after: function() {
      ok(true, "After callback was called");
    }
  });

  instrument.instrument("render.handlebars", null, function() {});
});

test("it is possible to remove a subscriber", function() {
  expect(4);

  var count = 0;

  var subscriber = instrument.subscribe("render", {
    before: function() {
      equal(count, 0);
      ok(true, "Before callback was called");
    },
    after: function() {
      equal(count, 0);
      ok(true, "After callback was called");
      count++;
    }
  });

  instrument.instrument("render.handlebars", null, function() {});

  instrument.unsubscribe(subscriber);

  instrument.instrument("render.handlebars", null, function() {});
});

})();

(function() {
var libs = Ember.libraries;

test('Ember registers itself', function() {
  equal(libs[0].name, "Ember");
});

test('core libraries come before other libraries', function() {
  var l = libs.length;

  libs.register("my-lib", "2.0.0a");
  libs.registerCoreLibrary("DS", "1.0.0-beta.2");

  equal(libs[l].name, "DS");
  equal(libs[l+1].name, "my-lib");

  libs.deRegister("my-lib");
  libs.deRegister("DS");
});

test('only the first registration of a library is stored', function() {
  var l = libs.length;

  libs.register("magic", 1.23);
  libs.register("magic", 2.23);
  libs.register("magic", 3.23);

  equal(libs[l].name, "magic");
  equal(libs[l].version, 1.23);
  equal(libs.length, l+1);

  libs.deRegister("magic");
});

test('libraries can be de-registered', function() {
  var l = libs.length;

  libs.register("lib1", "1.0.0b");
  libs.register("lib2", "1.0.0b");
  libs.register("lib3", "1.0.0b");

  libs.deRegister("lib1");
  libs.deRegister("lib3");

  equal(libs[l].name, "lib2");
  equal(libs.length, l+1);

  libs.deRegister("lib2");
});

})();

(function() {
var object, number, string, map;

var varieties = ['Map', 'MapWithDefault'], variety;

function testMap(variety) {
  module("Ember." + variety + " (forEach and get are implicitly tested)", {
    setup: function() {
      object = {};
      number = 42;
      string = "foo";

      map = Ember[variety].create();
    }
  });

  var mapHasLength = function(expected, theMap) {
    theMap = theMap || map;

    var length = 0;
    theMap.forEach(function() {
      length++;
    });

    equal(length, expected, "map should contain " + expected + " items");
  };

  var mapHasEntries = function(entries, theMap) {
    theMap = theMap || map;

    for (var i = 0, l = entries.length; i < l; i++) {
      equal(theMap.get(entries[i][0]), entries[i][1]);
      equal(theMap.has(entries[i][0]), true);
    }

    mapHasLength(entries.length, theMap);
  };

  test("add", function() {
    map.set(object, "winning");
    map.set(number, "winning");
    map.set(string, "winning");

    mapHasEntries([
      [ object, "winning" ],
      [ number, "winning" ],
      [ string, "winning" ]
    ]);

    map.set(object, "losing");
    map.set(number, "losing");
    map.set(string, "losing");

    mapHasEntries([
      [ object, "losing" ],
      [ number, "losing" ],
      [ string, "losing" ]
    ]);

    equal(map.has("nope"), false);
    equal(map.has({}), false);
  });

  test("remove", function() {
    map.set(object, "winning");
    map.set(number, "winning");
    map.set(string, "winning");

    map.remove(object);
    map.remove(number);
    map.remove(string);

    // doesn't explode
    map.remove({});

    mapHasEntries([]);
  });

  test("copy and then update", function() {
    map.set(object, "winning");
    map.set(number, "winning");
    map.set(string, "winning");

    var map2 = map.copy();

    map2.set(object, "losing");
    map2.set(number, "losing");
    map2.set(string, "losing");

    mapHasEntries([
      [ object, "winning" ],
      [ number, "winning" ],
      [ string, "winning" ]
    ]);

    mapHasEntries([
      [ object, "losing" ],
      [ number, "losing" ],
      [ string, "losing" ]
    ], map2);
  });

  test("copy and then remove", function() {
    map.set(object, "winning");
    map.set(number, "winning");
    map.set(string, "winning");

    var map2 = map.copy();

    map2.remove(object);
    map2.remove(number);
    map2.remove(string);

    mapHasEntries([
      [ object, "winning" ],
      [ number, "winning" ],
      [ string, "winning" ]
    ]);

    mapHasEntries([ ], map2);
  });
    
  test("length", function() {
    //Add a key twice
    equal(map.length, 0);
    map.set(string, "a string");
    equal(map.length, 1);
    map.set(string, "the same string");
    equal(map.length, 1);
    
    //Add another
    map.set(number, "a number");
    equal(map.length, 2);
    
    //Remove one that doesn't exist
    map.remove('does not exist');
    equal(map.length, 2);
    
    //Check copy
    var copy = map.copy();
    equal(copy.length, 2);
    
    //Remove a key twice
    map.remove(number);
    equal(map.length, 1);
    map.remove(number);
    equal(map.length, 1);
    
    //Remove the last key
    map.remove(string);
    equal(map.length, 0);
    map.remove(string);
    equal(map.length, 0);
  });
}

for (var i = 0;  i < varieties.length;  i++) {
  testMap(varieties[i]);
}

module("MapWithDefault - default values");

test("Retrieving a value that has not been set returns and sets a default value", function() {
  var map = Ember.MapWithDefault.create({
    defaultValue: function(key) {
      return [key];
    }
  });

  var value = map.get('ohai');
  deepEqual(value, [ 'ohai' ]);

  strictEqual(value, map.get('ohai'));
});

test("Copying a MapWithDefault copies the default value", function() {
  var map = Ember.MapWithDefault.create({
    defaultValue: function(key) {
      return [key];
    }
  });

  map.set('ohai', 1);
  map.get('bai');

  var map2 = map.copy();

  equal(map2.get('ohai'), 1);
  deepEqual(map2.get('bai'), ['bai']);

  map2.set('kthx', 3);

  deepEqual(map.get('kthx'), ['kthx']);
  equal(map2.get('kthx'), 3);

  deepEqual(map2.get('default'), ['default']);

  map2.defaultValue = function(key) {
    return ['tom is on', key];
  };

  deepEqual(map2.get('drugs'), ['tom is on', 'drugs']);
});

})();

(function() {
module('Ember.aliasMethod');

function validateAliasMethod(obj) {
  equal(obj.fooMethod(), 'FOO', 'obj.fooMethod()');
  equal(obj.barMethod(), 'FOO', 'obj.barMethod should be a copy of foo');
}

test('methods of another name are aliased when the mixin is applied', function() {

  var MyMixin = Ember.Mixin.create({
    fooMethod: function() { return 'FOO'; },
    barMethod: Ember.aliasMethod('fooMethod')
  });

  var obj = MyMixin.apply({});
  validateAliasMethod(obj);
});

test('should follow aliasMethods all the way down', function() {
  var MyMixin = Ember.Mixin.create({
    bar: Ember.aliasMethod('foo'), // put first to break ordered iteration
    baz: function() { return 'baz'; },
    foo: Ember.aliasMethod('baz')
  });

  var obj = MyMixin.apply({});
  equal(Ember.get(obj, 'bar')(), 'baz', 'should have followed aliasMethods');
});

test('should alias methods from other dependent mixins', function() {

  var BaseMixin = Ember.Mixin.create({
    fooMethod: function() { return 'FOO'; }
  });

  var MyMixin = Ember.Mixin.create(BaseMixin, {
    barMethod: Ember.aliasMethod('fooMethod')
  });

  var obj = MyMixin.apply({});
  validateAliasMethod(obj);
});

test('should alias methods from other mixins applied at same time', function() {

  var BaseMixin = Ember.Mixin.create({
    fooMethod: function() { return 'FOO'; }
  });

  var MyMixin = Ember.Mixin.create({
    barMethod: Ember.aliasMethod('fooMethod')
  });

  var obj = Ember.mixin({}, BaseMixin, MyMixin);
  validateAliasMethod(obj);
});

test('should alias methods from mixins already applied on object', function() {

  var BaseMixin = Ember.Mixin.create({
    quxMethod: function() { return 'qux'; }
  });

  var MyMixin = Ember.Mixin.create({
    bar: Ember.aliasMethod('foo'),
    barMethod: Ember.aliasMethod('fooMethod')
  });

  var obj = {
    fooMethod: function() { return 'FOO'; }
  };

  BaseMixin.apply(obj);
  MyMixin.apply(obj);

  validateAliasMethod(obj);
});

})();

(function() {
module('Ember.alias',{
  setup: function() {
    Ember.TESTING_DEPRECATION = true;
  },
  teardown: function() {
    Ember.TESTING_DEPRECATION = false;
  }
});

function validateAlias(obj) {
  var get = Ember.get;
  equal(get(obj, 'foo'), 'foo', 'obj.foo');
  equal(get(obj, 'bar'), 'foo', 'obj.bar should be a copy of foo');

  equal(get(obj, 'computedFoo'), 'cfoo', 'obj.computedFoo');
  equal(get(obj, 'computedBar'), 'cfoo', 'obj.computedBar should be a copy of computedFoo');

  equal(obj.fooMethod(), 'FOO', 'obj.fooMethod()');
  equal(obj.barMethod(), 'FOO', 'obj.barMethod should be a copy of foo');
}

test('copies the property values from another key when the mixin is applied', function() {

  var MyMixin = Ember.Mixin.create({
    foo: 'foo',
    bar: Ember.alias('foo'),

    computedFoo: Ember.computed(function() {
      return 'cfoo';
    }),

    computedBar: Ember.alias('computedFoo'),

    fooMethod: function() { return 'FOO'; },
    barMethod: Ember.alias('fooMethod')
  });

  var obj = MyMixin.apply({});
  validateAlias(obj);
});

test('should follow aliases all the way down', function() {
  var MyMixin = Ember.Mixin.create({
    bar: Ember.alias('foo'), // put first to break ordered iteration
    baz: 'baz',
    foo: Ember.alias('baz')
  });

  var obj = MyMixin.apply({});
  equal(Ember.get(obj, 'bar'), 'baz', 'should have followed aliases');
});

test('should copy from other dependent mixins', function() {

  var BaseMixin = Ember.Mixin.create({
    foo: 'foo',

    computedFoo: Ember.computed(function() {
      return 'cfoo';
    }),

    fooMethod: function() { return 'FOO'; }
  });

  var MyMixin = Ember.Mixin.create(BaseMixin, {
    bar: Ember.alias('foo'),
    computedBar: Ember.alias('computedFoo'),
    barMethod: Ember.alias('fooMethod')
  });

  var obj = MyMixin.apply({});
  validateAlias(obj);
});

test('should copy from other mixins applied at same time', function() {

  var BaseMixin = Ember.Mixin.create({
    foo: 'foo',

    computedFoo: Ember.computed(function() {
      return 'cfoo';
    }),

    fooMethod: function() { return 'FOO'; }
  });

  var MyMixin = Ember.Mixin.create({
    bar: Ember.alias('foo'),
    computedBar: Ember.alias('computedFoo'),
    barMethod: Ember.alias('fooMethod')
  });

  var obj = Ember.mixin({}, BaseMixin, MyMixin);
  validateAlias(obj);
});

test('should copy from properties already applied on object', function() {

  var BaseMixin = Ember.Mixin.create({
    foo: 'foo',

    computedFoo: Ember.computed(function() {
      return 'cfoo';
    })

  });

  var MyMixin = Ember.Mixin.create({
    bar: Ember.alias('foo'),
    computedBar: Ember.alias('computedFoo'),
    barMethod: Ember.alias('fooMethod')
  });

  var obj = {
    fooMethod: function() { return 'FOO'; }
  };

  BaseMixin.apply(obj);
  MyMixin.apply(obj);

  validateAlias(obj);
});

})();

(function() {
/*globals raises */

module('Ember.Mixin.apply');

function K() {}

test('using apply() should apply properties', function() {
  var MixinA = Ember.Mixin.create({ foo: 'FOO', baz: K });
  var obj = {};
  Ember.mixin(obj, MixinA);

  equal(Ember.get(obj, 'foo'), "FOO", 'should apply foo');
  equal(Ember.get(obj, 'baz'), K, 'should apply foo');
});

test('applying anonymous properties', function() {
  var obj = {};
  Ember.mixin(obj, {
    foo: 'FOO',
    baz: K
  });

  equal(Ember.get(obj, 'foo'), "FOO", 'should apply foo');
  equal(Ember.get(obj, 'baz'), K, 'should apply foo');
});

test('applying null values', function() {
  expectAssertion(function() {
    Ember.mixin({}, null);
  });
});

test('applying a property with an undefined value', function() {
  var obj = { tagName: '' };
  Ember.mixin(obj, { tagName: undefined });

  strictEqual(Ember.get(obj, 'tagName'), '');
});

})();

(function() {
var get = Ember.get,
    set = Ember.set;

module('Ember.Mixin Computed Properties');

test('overriding computed properties', function() {
  var MixinA, MixinB, MixinC, MixinD;
  var obj;

  MixinA = Ember.Mixin.create({
    aProp: Ember.computed(function() {
      return 'A';
    })
  });

  MixinB = Ember.Mixin.create(MixinA, {
    aProp: Ember.computed(function() {
      return this._super()+'B';
    })
  });

  MixinC = Ember.Mixin.create(MixinA, {
    aProp: Ember.computed(function() {
      return this._super()+'C';
    })
  });

  MixinD = Ember.Mixin.create({
    aProp: Ember.computed(function() {
      return this._super()+'D';
    })
  });

  obj = {};
  MixinB.apply(obj);
  equal(get(obj, 'aProp'), 'AB', "should expose super for B");

  obj = {};
  MixinC.apply(obj);
  equal(get(obj, 'aProp'), 'AC', "should expose super for C");

  obj = {};

  MixinA.apply(obj);
  MixinD.apply(obj);
  equal(get(obj, 'aProp'), 'AD', "should define super for D");

  obj = { };
  Ember.defineProperty(obj, 'aProp', Ember.computed(function(key, value) {
    return 'obj';
  }));
  MixinD.apply(obj);
  equal(get(obj, 'aProp'), "objD", "should preserve original computed property");
});

test('calling set on overridden computed properties', function() {
  var SuperMixin, SubMixin;
  var obj;

  var superGetOccurred = false,
      superSetOccurred = false;

  SuperMixin = Ember.Mixin.create({
    aProp: Ember.computed(function(key, val) {
      if (arguments.length === 1) {
        superGetOccurred = true;
      } else {
        superSetOccurred = true;
      }
      return true;
    })
  });

  SubMixin = Ember.Mixin.create(SuperMixin, {
    aProp: Ember.computed(function(key, val) {
      return this._super.apply(this, arguments);
    })
  });

  obj = {};
  SubMixin.apply(obj);

  set(obj, 'aProp', 'set thyself');
  ok(superSetOccurred, 'should pass set to _super');

  superSetOccurred = false; // reset the set assertion

  obj = {};
  SubMixin.apply(obj);

  get(obj, 'aProp');
  ok(superGetOccurred, 'should pass get to _super');

  set(obj, 'aProp', 'set thyself');
  ok(superSetOccurred, 'should pass set to _super after getting');
});

test('setter behavior works properly when overriding computed properties', function() {
  var obj = {};

  var MixinA = Ember.Mixin.create({
    cpWithSetter2: Ember.computed(Ember.K),
    cpWithSetter3: Ember.computed(Ember.K),
    cpWithoutSetter: Ember.computed(Ember.K)
  });

  var cpWasCalled = false;

  var MixinB = Ember.Mixin.create({
    cpWithSetter2: Ember.computed(function(k, v) {
      cpWasCalled = true;
    }),

    cpWithSetter3: Ember.computed(function(k, v) {
      cpWasCalled = true;
    }),

    cpWithoutSetter: Ember.computed(function(k) {
      cpWasCalled = true;
    })
  });

  MixinA.apply(obj);
  MixinB.apply(obj);

  set(obj, 'cpWithSetter2', 'test');
  ok(cpWasCalled, "The computed property setter was called when defined with two args");
  cpWasCalled = false;

  set(obj, 'cpWithSetter3', 'test');
  ok(cpWasCalled, "The computed property setter was called when defined with three args");
  cpWasCalled = false;

  set(obj, 'cpWithoutSetter', 'test');
  equal(Ember.get(obj, 'cpWithoutSetter'), 'test', "The default setter was called, the value is correct");
  ok(!cpWasCalled, "The default setter was called, not the CP itself");
});

})();

(function() {
/*globals setup */

module('Ember.Mixin concatenatedProperties');

test('defining concatenated properties should concat future version', function() {

  var MixinA = Ember.Mixin.create({
    concatenatedProperties: ['foo'],
    foo: ['a', 'b', 'c']
  });

  var MixinB = Ember.Mixin.create({
    foo: ['d', 'e', 'f']
  });

  var obj = Ember.mixin({}, MixinA, MixinB);
  deepEqual(Ember.get(obj, 'foo'), ['a', 'b', 'c', 'd', 'e', 'f']);
});

test('concatenatedProperties should be concatenated', function() {

  var MixinA = Ember.Mixin.create({
    concatenatedProperties: ['foo'],
    foo: ['a', 'b', 'c']
  });

  var MixinB = Ember.Mixin.create({
    concatenatedProperties: 'bar',
    foo: ['d', 'e', 'f'],
    bar: [1,2,3]
  });

  var MixinC = Ember.Mixin.create({
    bar: [4,5,6]
  });

  var obj = Ember.mixin({}, MixinA, MixinB, MixinC);
  deepEqual(Ember.get(obj, 'concatenatedProperties'), ['foo', 'bar'], 'get concatenatedProperties');
  deepEqual(Ember.get(obj, 'foo'), ['a', 'b', 'c', 'd', 'e', 'f'], 'get foo');
  deepEqual(Ember.get(obj, 'bar'), [1,2,3,4,5,6], 'get bar');
});

test('adding a prop that is not an array should make array', function() {

  var MixinA = Ember.Mixin.create({
    concatenatedProperties: ['foo'],
    foo: [1,2,3]
  });

  var MixinB = Ember.Mixin.create({
    foo: 4
  });

  var obj = Ember.mixin({}, MixinA, MixinB);
  deepEqual(Ember.get(obj, 'foo'), [1,2,3,4]);
});

test('adding a prop that is not an array should make array', function() {

  var MixinA = Ember.Mixin.create({
    concatenatedProperties: ['foo'],
    foo: 'bar'
  });

  var obj = Ember.mixin({}, MixinA);
  deepEqual(Ember.get(obj, 'foo'), ['bar']);
});

test('adding a non-concatenable property that already has a defined value should result in an array with both values', function() {

  var mixinA = Ember.Mixin.create({
    foo: 1
  });

  var mixinB = Ember.Mixin.create({
    concatenatedProperties: ['foo'],
    foo: 2
  });

  var obj = Ember.mixin({}, mixinA, mixinB);
  deepEqual(Ember.get(obj, 'foo'), [1, 2]);
});

test('adding a concatenable property that already has a defined value should result in a concatenated value', function() {

  var mixinA = Ember.Mixin.create({
    foobar: 'foo'
  });

  var mixinB = Ember.Mixin.create({
    concatenatedProperties: ['foobar'],
    foobar: 'bar'
  });

  var obj = Ember.mixin({}, mixinA, mixinB);
  equal(Ember.get(obj, 'foobar'), 'foobar');
});

})();

(function() {
module('Mixin.detect');

test('detect() finds a directly applied mixin', function() {

  var MixinA = Ember.Mixin.create();
  var obj = {};

  equal(MixinA.detect(obj), false, 'MixinA.detect(obj) before apply()');

  MixinA.apply(obj);
  equal(MixinA.detect(obj), true, 'MixinA.detect(obj) after apply()');
});

test('detect() finds nested mixins', function() {
  var MixinA = Ember.Mixin.create({});
  var MixinB = Ember.Mixin.create(MixinA);
  var obj = {};

  equal(MixinA.detect(obj), false, 'MixinA.detect(obj) before apply()');

  MixinB.apply(obj);
  equal(MixinA.detect(obj), true, 'MixinA.detect(obj) after apply()');
});

test('detect() finds mixins on other mixins', function() {
  var MixinA = Ember.Mixin.create({});
  var MixinB = Ember.Mixin.create(MixinA);
  equal(MixinA.detect(MixinB), true, 'MixinA is part of MixinB');
  equal(MixinB.detect(MixinA), false, 'MixinB is not part of MixinA');
});

test('detect handles null values', function() {
  var MixinA = Ember.Mixin.create();
  equal(MixinA.detect(null), false);
});

})();

(function() {
// NOTE: A previous iteration differentiated between public and private props
// as well as methods vs props.  We are just keeping these for testing; the
// current impl doesn't care about the differences as much...

var PrivateProperty = Ember.Mixin.create({
  _foo: '_FOO'
});

var PublicProperty = Ember.Mixin.create({
  foo: 'FOO'
});

var PrivateMethod = Ember.Mixin.create({
  _fooMethod: function() {}
});

var PublicMethod = Ember.Mixin.create({
  fooMethod: function() {}
});

var BarProperties = Ember.Mixin.create({
  _bar: '_BAR',
  bar: 'bar'
});

var BarMethods = Ember.Mixin.create({
  _barMethod: function() {},
  barMethod: function() {}
});

var Combined = Ember.Mixin.create(BarProperties, BarMethods);

var obj ;

module('Basic introspection', {
  setup: function() {
    obj = {};
    Ember.mixin(obj, PrivateProperty, PublicProperty, PrivateMethod, PublicMethod, Combined);
  }
});

test('Ember.mixins()', function() {

  function mapGuids(ary) {
    return Ember.EnumerableUtils.map(ary, function(x) { return Ember.guidFor(x); });
  }

  deepEqual(mapGuids(Ember.Mixin.mixins(obj)), mapGuids([PrivateProperty, PublicProperty, PrivateMethod, PublicMethod, Combined, BarProperties, BarMethods]), 'should return included mixins');
});

})();

(function() {
/*globals setup */

module('Ember.Mixin mergedProperties');

test('defining mergedProperties should merge future version', function() {

  var MixinA = Ember.Mixin.create({
    mergedProperties: ['foo'],
    foo: { a: true, b: true, c: true }
  });

  var MixinB = Ember.Mixin.create({
    foo: { d: true, e: true, f: true }
  });

  var obj = Ember.mixin({}, MixinA, MixinB);
  deepEqual(Ember.get(obj, 'foo'), 
    { a: true, b: true, c: true, d: true, e: true, f: true });
});

test('defining mergedProperties on future mixin should merged into past', function() {

  var MixinA = Ember.Mixin.create({
    foo: { a: true, b: true, c: true }
  });

  var MixinB = Ember.Mixin.create({
    mergedProperties: ['foo'],
    foo: { d: true, e: true, f: true }
  });

  var obj = Ember.mixin({}, MixinA, MixinB);
  deepEqual(Ember.get(obj, 'foo'), 
    { a: true, b: true, c: true, d: true, e: true, f: true });
});

test('defining mergedProperties with null properties should keep properties null', function() {

  var MixinA = Ember.Mixin.create({
    mergedProperties: ['foo'],
    foo: null
  });

  var MixinB = Ember.Mixin.create({
    foo: null
  });

  var obj = Ember.mixin({}, MixinA, MixinB);
  equal(Ember.get(obj, 'foo'), null);
});

test("mergedProperties' properties can get overwritten", function() {

  var MixinA = Ember.Mixin.create({
    mergedProperties: ['foo'],
    foo: { a: 1 }
  });

  var MixinB = Ember.Mixin.create({
    foo: { a: 2 }
  });

  var obj = Ember.mixin({}, MixinA, MixinB);
  deepEqual(Ember.get(obj, 'foo'), { a: 2 });
});

test('mergedProperties should be concatenated', function() {

  var MixinA = Ember.Mixin.create({
    mergedProperties: ['foo'],
    foo: { a: true, b: true, c: true }
  });

  var MixinB = Ember.Mixin.create({
    mergedProperties: 'bar',
    foo: { d: true, e: true, f: true },
    bar: { a: true, l: true }
  });

  var MixinC = Ember.Mixin.create({
    bar: { e: true, x: true }
  });

  var obj = Ember.mixin({}, MixinA, MixinB, MixinC);
  deepEqual(Ember.get(obj, 'mergedProperties'), ['foo', 'bar'], 'get mergedProperties');
  deepEqual(Ember.get(obj, 'foo'), { a: true, b: true, c: true, d: true, e: true, f: true }, "get foo");
  deepEqual(Ember.get(obj, 'bar'), { a: true, l: true, e: true, x: true }, "get bar");
});

test("mergedProperties' overwriting methods can call _super", function() {

  expect(4);

  var MixinA = Ember.Mixin.create({
    mergedProperties: ['foo'],
    foo: {
      meth: function(a) {
        equal(a, "WOOT", "_super successfully called MixinA's `foo.meth` method");
        return "WAT";
      }
    }
  });

  var MixinB = Ember.Mixin.create({
    foo: {
      meth: function(a) {
        ok(true, "MixinB's `foo.meth` method called");
        return this._super.apply(this, arguments);
      }
    }
  });

  var MixinC = Ember.Mixin.create({
    foo: {
      meth: function(a) {
        ok(true, "MixinC's `foo.meth` method called");
        return this._super(a);
      }
    }
  });

  var obj = Ember.mixin({}, MixinA, MixinB, MixinC);
  equal(obj.foo.meth("WOOT"), "WAT");
});

})();

(function() {
/*globals raises */

module('Mixin Methods');

test('defining simple methods', function() {

  var MixinA, obj, props;

  props = {
    publicMethod: function() { return 'publicMethod'; },
    _privateMethod: function() { return 'privateMethod'; }
  };

  MixinA = Ember.Mixin.create(props);
  obj = {};
  MixinA.apply(obj);

  // but should be defined
  equal(props.publicMethod(), 'publicMethod', 'publicMethod is func');
  equal(props._privateMethod(), 'privateMethod', 'privateMethod is func');
});

test('overriding public methods', function() {
  var MixinA, MixinB, MixinC, MixinD, MixinE, MixinF, obj;

  MixinA = Ember.Mixin.create({
    publicMethod: function() { return 'A'; }
  });

  MixinB = Ember.Mixin.create(MixinA, {
    publicMethod: function() { return this._super()+'B'; }
  });

  MixinD = Ember.Mixin.create(MixinA, {
    publicMethod: function() { return this._super()+'D'; }
  });

  MixinF = Ember.Mixin.create({
    publicMethod: function() { return this._super()+'F'; }
  });

  obj = {};
  MixinB.apply(obj);
  equal(obj.publicMethod(), 'AB', 'should define super for A and B');

  obj = {};
  MixinD.apply(obj);
  equal(obj.publicMethod(), 'AD', 'should define super for A and B');

  obj = {};
  MixinA.apply(obj);
  MixinF.apply(obj);
  equal(obj.publicMethod(), 'AF', 'should define super for A and F');

  obj = { publicMethod: function() { return 'obj'; } };
  MixinF.apply(obj);
  equal(obj.publicMethod(), 'objF', 'should define super for F');
});


test('overriding inherited objects', function() {

  var cnt = 0;
  var MixinA = Ember.Mixin.create({
    foo: function() { cnt++; }
  });

  var MixinB = Ember.Mixin.create({
    foo: function() { this._super(); cnt++; }
  });

  var objA = {};
  MixinA.apply(objA);

  var objB = Ember.create(objA);
  MixinB.apply(objB);

  cnt = 0;
  objB.foo();
  equal(cnt, 2, 'should invoke both methods');

  cnt = 0;
  objA.foo();
  equal(cnt, 1, 'should not screw w/ parent obj');
});

test('Including the same mixin more than once will only run once', function() {
  var cnt = 0;
  var MixinA = Ember.Mixin.create({
    foo: function() { cnt++; }
  });

  var MixinB = Ember.Mixin.create(MixinA, {
    foo: function() { this._super(); }
  });

  var MixinC = Ember.Mixin.create(MixinA, {
    foo: function() { this._super(); }
  });

  var MixinD = Ember.Mixin.create(MixinB, MixinC, MixinA, {
    foo: function() { this._super(); }
  });

  var obj = {};
  MixinD.apply(obj);
  MixinA.apply(obj); // try to apply again..

  cnt = 0;
  obj.foo();

  equal(cnt, 1, 'should invoke MixinA.foo one time');
});

// ..........................................................
// CONFLICTS
//

module('Method Conflicts');


test('overriding toString', function() {
  var MixinA = Ember.Mixin.create({
    toString: function() { return 'FOO'; }
  });

  var obj = {};
  MixinA.apply(obj);
  equal(obj.toString(), 'FOO', 'should override toString w/o error');

  obj = {};
  Ember.mixin(obj, { toString: function() { return 'FOO'; } });
  equal(obj.toString(), 'FOO', 'should override toString w/o error');
});

// ..........................................................
// BUGS
//

module('system/mixin/method_test BUGS');

test('applying several mixins at once with sup already defined causes infinite loop', function() {

  var cnt = 0;
  var MixinA = Ember.Mixin.create({
    foo: function() { cnt++; }
  });

  var MixinB = Ember.Mixin.create({
    foo: function() { this._super(); cnt++; }
  });

  var MixinC = Ember.Mixin.create({
    foo: function() { this._super(); cnt++; }
  });

  var obj = {};
  Ember.mixin(obj, MixinA); // sup already exists
  Ember.mixin(obj, MixinB, MixinC); // must be more than one mixin

  cnt = 0;
  obj.foo();
  equal(cnt, 3, 'should invoke all 3 methods');
});

})();

(function() {
/*globals testBoth */

require('ember-metal/~tests/props_helper');

module('Ember.Mixin observer');

testBoth('global observer helper', function(get, set) {

  var MyMixin = Ember.Mixin.create({

    count: 0,

    foo: Ember.observer('bar', function() {
      set(this, 'count', get(this, 'count')+1);
    })

  });

  var obj = Ember.mixin({}, MyMixin);
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', "BAZ");
  equal(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('global observer helper takes multiple params', function(get, set) {

  var MyMixin = Ember.Mixin.create({

    count: 0,

    foo: Ember.observer('bar', 'baz', function() {
      set(this, 'count', get(this, 'count')+1);
    })

  });

  var obj = Ember.mixin({}, MyMixin);
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', "BAZ");
  set(obj, 'baz', "BAZ");
  equal(get(obj, 'count'), 2, 'should invoke observer after change');
});


testBoth('replacing observer should remove old observer', function(get, set) {

  var MyMixin = Ember.Mixin.create({

    count: 0,

    foo: Ember.observer('bar', function() {
      set(this, 'count', get(this, 'count')+1);
    })

  });

  var Mixin2 = Ember.Mixin.create({
    foo: Ember.observer('baz', function() {
      set(this, 'count', get(this, 'count')+10);
    })
  });

  var obj = Ember.mixin({}, MyMixin, Mixin2);
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', "BAZ");
  equal(get(obj, 'count'), 0, 'should not invoke observer after change');

  set(obj, 'baz', "BAZ");
  equal(get(obj, 'count'), 10, 'should invoke observer after change');

});

testBoth('observing chain with property before', function(get, set) {
  var obj2 = {baz: 'baz'};

  var MyMixin = Ember.Mixin.create({
    count: 0,
    bar: obj2,
    foo: Ember.observer('bar.baz', function() {
      set(this, 'count', get(this, 'count')+1);
    })
  });

  var obj = Ember.mixin({}, MyMixin);
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj2, 'baz', "BAZ");
  equal(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('observing chain with property after', function(get, set) {
  var obj2 = {baz: 'baz'};

  var MyMixin = Ember.Mixin.create({
    count: 0,
    foo: Ember.observer('bar.baz', function() {
      set(this, 'count', get(this, 'count')+1);
    }),
    bar: obj2
  });

  var obj = Ember.mixin({}, MyMixin);
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj2, 'baz', "BAZ");
  equal(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('observing chain with property in mixin applied later', function(get, set) {
  var obj2 = {baz: 'baz'};

  var MyMixin = Ember.Mixin.create({

    count: 0,
    foo: Ember.observer('bar.baz', function() {
      set(this, 'count', get(this, 'count')+1);
    })
  });

  var MyMixin2 = Ember.Mixin.create({bar: obj2});

  var obj = Ember.mixin({}, MyMixin);
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  MyMixin2.apply(obj);
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj2, 'baz', "BAZ");
  equal(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('observing chain with existing property', function(get, set) {
  var obj2 = {baz: 'baz'};

  var MyMixin = Ember.Mixin.create({
    count: 0,
    foo: Ember.observer('bar.baz', function() {
      set(this, 'count', get(this, 'count')+1);
    })
  });

  var obj = Ember.mixin({bar: obj2}, MyMixin);
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj2, 'baz', "BAZ");
  equal(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('observing chain with property in mixin before', function(get, set) {
  var obj2 = {baz: 'baz'};
  var MyMixin2 = Ember.Mixin.create({bar: obj2});

  var MyMixin = Ember.Mixin.create({
    count: 0,
    foo: Ember.observer('bar.baz', function() {
      set(this, 'count', get(this, 'count')+1);
    })
  });

  var obj = Ember.mixin({}, MyMixin2, MyMixin);
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj2, 'baz', "BAZ");
  equal(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('observing chain with property in mixin after', function(get, set) {
  var obj2 = {baz: 'baz'};
  var MyMixin2 = Ember.Mixin.create({bar: obj2});

  var MyMixin = Ember.Mixin.create({
    count: 0,
    foo: Ember.observer('bar.baz', function() {
      set(this, 'count', get(this, 'count')+1);
    })
  });

  var obj = Ember.mixin({}, MyMixin, MyMixin2);
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj2, 'baz', "BAZ");
  equal(get(obj, 'count'), 1, 'should invoke observer after change');
});

testBoth('observing chain with overriden property', function(get, set) {
  var obj2 = {baz: 'baz'};
  var obj3 = {baz: 'foo'};

  var MyMixin2 = Ember.Mixin.create({bar: obj3});

  var MyMixin = Ember.Mixin.create({
    count: 0,
    foo: Ember.observer('bar.baz', function() {
      set(this, 'count', get(this, 'count')+1);
    })
  });

  var obj = Ember.mixin({bar: obj2}, MyMixin, MyMixin2);
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  equal(Ember.isWatching(obj2, 'baz'), false, 'should not be watching baz');
  equal(Ember.isWatching(obj3, 'baz'), true, 'should be watching baz');

  set(obj2, 'baz', "BAZ");
  equal(get(obj, 'count'), 0, 'should not invoke observer after change');

  set(obj3, 'baz', "BEAR");
  equal(get(obj, 'count'), 1, 'should invoke observer after change');
});

})();

(function() {
module('Ember.Mixin#reopen');

test('using reopen() to add more properties to a simple', function() {
  var MixinA = Ember.Mixin.create({ foo: 'FOO', baz: 'BAZ' });
  MixinA.reopen({ bar: 'BAR', foo: 'FOO2' });
  var obj = {};
  MixinA.apply(obj);

  equal(Ember.get(obj, 'foo'), 'FOO2', 'mixin() should override');
  equal(Ember.get(obj, 'baz'), 'BAZ', 'preserve MixinA props');
  equal(Ember.get(obj, 'bar'), 'BAR', 'include MixinB props');
});


})();

(function() {
/*globals setup raises */

var PartialMixin, FinalMixin, obj;

module('Module.required', {
  setup: function() {
    PartialMixin = Ember.Mixin.create({
      foo: Ember.required(),
      bar: 'BAR'
    });

    FinalMixin = Ember.Mixin.create({
      foo: 'FOO'
    });

    obj = {};
  },

  teardown: function() {
    PartialMixin = FinalMixin = obj = null;
  }
});

test('applying a mixin to meet requirement', function() {
  FinalMixin.apply(obj);
  PartialMixin.apply(obj);
  equal(Ember.get(obj, 'foo'), 'FOO', 'should now be defined');
});

test('combined mixins to meet requirement', function() {
  Ember.Mixin.create(PartialMixin, FinalMixin).apply(obj);
  equal(Ember.get(obj, 'foo'), 'FOO', 'should now be defined');
});

test('merged mixin', function() {
  Ember.Mixin.create(PartialMixin, { foo: 'FOO' }).apply(obj);
  equal(Ember.get(obj, 'foo'), 'FOO', 'should now be defined');
});

test('define property on source object', function() {
  obj.foo = 'FOO';
  PartialMixin.apply(obj);
  equal(Ember.get(obj, 'foo'), 'FOO', 'should now be defined');
});

test('using apply', function() {
  Ember.mixin(obj, PartialMixin, { foo: 'FOO' });
  equal(Ember.get(obj, 'foo'), 'FOO', 'should now be defined');
});


})();

(function() {
/*globals setup */

test('without should create a new mixin excluding named properties', function() {

  var MixinA = Ember.Mixin.create({
    foo: 'FOO',
    bar: 'BAR'
  });

  var MixinB = MixinA.without('bar');

  var obj = {};
  MixinB.apply(obj);

  equal(obj.foo, 'FOO', 'should defined foo');
  equal(obj.bar, undefined, 'should not define bar');

});

})();

(function() {
/*globals Global:true */

require('ember-metal/~tests/props_helper');

// ..........................................................
// ADD OBSERVER
//

module('Ember.addObserver');

testBoth('observer should fire when property is modified', function(get,set) {

  var obj = {};
  var count = 0;

  Ember.addObserver(obj, 'foo', function() {
    equal(get(obj, 'foo'), 'bar', 'should invoke AFTER value changed');
    count++;
  });

  set(obj, 'foo', 'bar');
  equal(count, 1, 'should have invoked observer');
});

testBoth('observer should fire when dependent property is modified', function(get, set) {
  var obj = { bar: 'bar' };
  Ember.defineProperty(obj, 'foo', Ember.computed(function() {
    return get(this,'bar').toUpperCase();
  }).property('bar'));

  get(obj, 'foo');

  var count = 0;
  Ember.addObserver(obj, 'foo', function() {
    equal(get(obj, 'foo'), 'BAZ', 'should have invoked after prop change');
    count++;
  });

  set(obj, 'bar', 'baz');
  equal(count, 1, 'should have invoked observer');
});

if (Ember.FEATURES.isEnabled('propertyBraceExpansion')) {
  if (Ember.EXTEND_PROTOTYPES) {
    testBoth('observer added declaratively via brace expansion should fire when property changes', function (get, set) {
      var obj = { };
      var count = 0;

      Ember.mixin(obj, {
        observeFooAndBar: function () {
          count++;
        }.observes('{foo,bar}')
      });

      set(obj, 'foo', 'foo');
      equal(count, 1, 'observer specified via brace expansion invoked on property change');

      set(obj, 'bar', 'bar');
      equal(count, 2, 'observer specified via brace expansion invoked on property change');

      set(obj, 'baz', 'baz');
      equal(count, 2, 'observer not invoked on unspecified property');
    });

    testBoth('observer specified declaratively via brace expansion should fire when dependent property changes', function (get, set) {
      var obj = { baz: 'Initial' };
      var count = 0;

      Ember.defineProperty(obj, 'foo', Ember.computed(function() {
        return get(this,'bar').toLowerCase();
      }).property('bar'));

      Ember.defineProperty(obj, 'bar', Ember.computed(function() {
        return get(this,'baz').toUpperCase();
      }).property('baz'));

      Ember.mixin(obj, {
        fooAndBarWatcher: function () {
          count++;
        }.observes('{foo,bar}')
      });

      get(obj, 'foo');
      set(obj, 'baz', 'Baz');
      // fire once for foo, once for bar
      equal(count, 2, 'observer specified via brace expansion invoked on dependent property change');

      set(obj, 'quux', 'Quux');
      equal(count, 2, 'observer not fired on unspecified property');
    });
  }

  testBoth('observers watching multiple properties via brace expansion should fire when the properties change', function (get, set) {
    var obj = { };
    var count = 0;

    Ember.mixin(obj, {
      observeFooAndBar: Ember.observer('{foo,bar}', function () {
        count++;
      })
    });

    set(obj, 'foo', 'foo');
    equal(count, 1, 'observer specified via brace expansion invoked on property change');

    set(obj, 'bar', 'bar');
    equal(count, 2, 'observer specified via brace expansion invoked on property change');

    set(obj, 'baz', 'baz');
    equal(count, 2, 'observer not invoked on unspecified property');
  });

  testBoth('observers watching multiple properties via brace expansion should fire when dependent properties change', function (get, set) {
    var obj = { baz: 'Initial' };
    var count = 0;

    Ember.defineProperty(obj, 'foo', Ember.computed(function() {
      return get(this,'bar').toLowerCase();
    }).property('bar'));

    Ember.defineProperty(obj, 'bar', Ember.computed(function() {
      return get(this,'baz').toUpperCase();
    }).property('baz'));

    Ember.mixin(obj, {
      fooAndBarWatcher: Ember.observer('{foo,bar}', function () {
        count++;
      })
    });

    get(obj, 'foo');
    set(obj, 'baz', 'Baz');
    // fire once for foo, once for bar
    equal(count, 2, 'observer specified via brace expansion invoked on dependent property change');

    set(obj, 'quux', 'Quux');
    equal(count, 2, 'observer not fired on unspecified property');
  });
}

testBoth('nested observers should fire in order', function(get,set) {
  var obj = { foo: 'foo', bar: 'bar' };
  var fooCount = 0, barCount = 0;

  Ember.addObserver(obj, 'foo' ,function() { fooCount++; });
  Ember.addObserver(obj, 'bar', function() {
    set(obj, 'foo', 'BAZ');
    equal(fooCount, 1, 'fooCount should have fired already');
    barCount++;
  });

  set(obj, 'bar', 'BIFF');
  equal(barCount, 1, 'barCount should have fired');
  equal(fooCount, 1, 'foo should have fired');

});

testBoth('removing an chain observer on change should not fail', function(get,set) {
  var foo = { bar: 'bar' },
    obj1 = { foo: foo }, obj2 = { foo: foo }, obj3 = { foo: foo }, obj4 = { foo: foo },
    count1=0, count2=0, count3=0, count4=0;
  function observer1() { count1++; }
  function observer2() { count2++; }
  function observer3() {
    count3++;
    Ember.removeObserver(obj1, 'foo.bar', observer1);
    Ember.removeObserver(obj2, 'foo.bar', observer2);
    Ember.removeObserver(obj4, 'foo.bar', observer4);
  }
  function observer4() { count4++; }

  Ember.addObserver(obj1, 'foo.bar' , observer1);
  Ember.addObserver(obj2, 'foo.bar' , observer2);
  Ember.addObserver(obj3, 'foo.bar' , observer3);
  Ember.addObserver(obj4, 'foo.bar' , observer4);

  set(foo, 'bar', 'baz');

  equal(count1, 1, 'observer1 fired');
  equal(count2, 1, 'observer2 fired');
  equal(count3, 1, 'observer3 fired');
  equal(count4, 0, 'observer4 did not fire');
});

testBoth('removing an chain before observer on change should not fail', function(get,set) {
  var foo = { bar: 'bar' },
    obj1 = { foo: foo }, obj2 = { foo: foo }, obj3 = { foo: foo }, obj4 = { foo: foo },
    count1=0, count2=0, count3=0, count4=0;
  function observer1() { count1++; }
  function observer2() { count2++; }
  function observer3() {
    count3++;
    Ember.removeBeforeObserver(obj1, 'foo.bar', observer1);
    Ember.removeBeforeObserver(obj2, 'foo.bar', observer2);
    Ember.removeBeforeObserver(obj4, 'foo.bar', observer4);
  }
  function observer4() { count4++; }

  Ember.addBeforeObserver(obj1, 'foo.bar' , observer1);
  Ember.addBeforeObserver(obj2, 'foo.bar' , observer2);
  Ember.addBeforeObserver(obj3, 'foo.bar' , observer3);
  Ember.addBeforeObserver(obj4, 'foo.bar' , observer4);

  set(foo, 'bar', 'baz');

  equal(count1, 1, 'observer1 fired');
  equal(count2, 1, 'observer2 fired');
  equal(count3, 1, 'observer3 fired');
  equal(count4, 0, 'observer4 did not fire');
});

testBoth('suspending an observer should not fire during callback', function(get,set) {
  var obj = {}, target, otherTarget;

  target = {
    values: [],
    method: function() { this.values.push(get(obj, 'foo')); }
  };

  otherTarget = {
    values: [],
    method: function() { this.values.push(get(obj, 'foo')); }
  };

  Ember.addObserver(obj, 'foo', target, target.method);
  Ember.addObserver(obj, 'foo', otherTarget, otherTarget.method);

  function callback() {
      equal(this, target);

      set(obj, 'foo', '2');

      return 'result';
  }

  set(obj, 'foo', '1');

  equal(Ember._suspendObserver(obj, 'foo', target, target.method, callback), 'result');

  set(obj, 'foo', '3');

  deepEqual(target.values, ['1', '3'], 'should invoke');
  deepEqual(otherTarget.values, ['1', '2', '3'], 'should invoke');
});


testBoth('suspending an observer should not defer change notifications during callback', function(get,set) {
  var obj = {}, target, otherTarget;

  target = {
    values: [],
    method: function() { this.values.push(get(obj, 'foo')); }
  };

  otherTarget = {
    values: [],
    method: function() { this.values.push(get(obj, 'foo')); }
  };

  Ember.addObserver(obj, 'foo', target, target.method);
  Ember.addObserver(obj, 'foo', otherTarget, otherTarget.method);

  function callback() {
      equal(this, target);

      set(obj, 'foo', '2');

      return 'result';
  }

  set(obj, 'foo', '1');

  Ember.beginPropertyChanges();
  equal(Ember._suspendObserver(obj, 'foo', target, target.method, callback), 'result');
  Ember.endPropertyChanges();

  set(obj, 'foo', '3');

  deepEqual(target.values, ['1', '3'], 'should invoke');
  deepEqual(otherTarget.values, ['1', '2', '3'], 'should invoke');
});

testBoth('suspending observers should not fire during callback', function(get,set) {
  var obj = {}, target, otherTarget;

  target = {
    values: [],
    method: function() { this.values.push(get(obj, 'foo')); }
  };

  otherTarget = {
    values: [],
    method: function() { this.values.push(get(obj, 'foo')); }
  };

  Ember.addObserver(obj, 'foo', target, target.method);
  Ember.addObserver(obj, 'foo', otherTarget, otherTarget.method);

  function callback() {
      equal(this, target);

      set(obj, 'foo', '2');

      return 'result';
  }

  set(obj, 'foo', '1');

  equal(Ember._suspendObservers(obj, ['foo'], target, target.method, callback), 'result');

  set(obj, 'foo', '3');

  deepEqual(target.values, ['1', '3'], 'should invoke');
  deepEqual(otherTarget.values, ['1', '2', '3'], 'should invoke');
});


testBoth('suspending observers should not defer change notifications during callback', function(get,set) {
  var obj = {}, target, otherTarget;

  target = {
    values: [],
    method: function() { this.values.push(get(obj, 'foo')); }
  };

  otherTarget = {
    values: [],
    method: function() { this.values.push(get(obj, 'foo')); }
  };

  Ember.addObserver(obj, 'foo', target, target.method);
  Ember.addObserver(obj, 'foo', otherTarget, otherTarget.method);

  function callback() {
      equal(this, target);

      set(obj, 'foo', '2');

      return 'result';
  }

  set(obj, 'foo', '1');

  Ember.beginPropertyChanges();
  equal(Ember._suspendObservers(obj, ['foo'], target, target.method, callback), 'result');
  Ember.endPropertyChanges();

  set(obj, 'foo', '3');

  deepEqual(target.values, ['1', '3'], 'should invoke');
  deepEqual(otherTarget.values, ['1', '2', '3'], 'should invoke');
});

testBoth('deferring property change notifications', function(get,set) {
  var obj = { foo: 'foo' };
  var fooCount = 0;

  Ember.addObserver(obj, 'foo' ,function() { fooCount++; });

  Ember.beginPropertyChanges(obj);
  set(obj, 'foo', 'BIFF');
  set(obj, 'foo', 'BAZ');
  Ember.endPropertyChanges(obj);

  equal(fooCount, 1, 'foo should have fired once');
});

testBoth('deferring property change notifications safely despite exceptions', function(get,set) {
  var obj = { foo: 'foo' };
  var fooCount = 0;
  var exc = new Error("Something unexpected happened!");

  expect(2);
  Ember.addObserver(obj, 'foo' ,function() { fooCount++; });

  try {
    Ember.changeProperties(function() {
      set(obj, 'foo', 'BIFF');
      set(obj, 'foo', 'BAZ');
      throw exc;
    });
  } catch(err) {
    if (err !== exc)
      throw err;
  }

  equal(fooCount, 1, 'foo should have fired once');

  Ember.changeProperties(function() {
    set(obj, 'foo', 'BIFF2');
    set(obj, 'foo', 'BAZ2');
  });

  equal(fooCount, 2, 'foo should have fired again once');
});

testBoth('deferring property change notifications will not defer before observers', function(get,set) {
  var obj = { foo: 'foo' };
  var fooCount = 0;

  Ember.addBeforeObserver(obj, 'foo' ,function() { fooCount++; });

  Ember.beginPropertyChanges(obj);
  set(obj, 'foo', 'BIFF');
  equal(fooCount, 1, 'should fire before observer immediately');
  set(obj, 'foo', 'BAZ');
  Ember.endPropertyChanges(obj);

  equal(fooCount, 1, 'should not fire before observer twice');
});

testBoth('implementing sendEvent on object should invoke when deferring property change notifications ends', function(get, set) {
  var count = 0, events = [];
  var obj = {
    sendEvent: function(eventName) {
      events.push(eventName);
    },
    foo: 'baz'
  };

  Ember.addObserver(obj, 'foo', function() { count++; });

  Ember.beginPropertyChanges(obj);
  set(obj, 'foo', 'BAZ');

  equal(count, 0, 'should have not invoked observer');
  equal(events.length, 1, 'should have invoked sendEvent for before');

  Ember.endPropertyChanges(obj);

  equal(count, 1, 'should have invoked observer');
  equal(events.length, 2, 'should have invoked sendEvent');
  equal(events[0], 'foo:before');
  equal(events[1], 'foo:change');
});

testBoth('addObserver should propagate through prototype', function(get,set) {
  var obj = { foo: 'foo', count: 0 }, obj2;

  Ember.addObserver(obj, 'foo', function() { this.count++; });
  obj2 = Ember.create(obj);

  set(obj2, 'foo', 'bar');

  equal(obj2.count, 1, 'should have invoked observer on inherited');
  equal(obj.count, 0, 'should not have invoked observer on parent');

  obj2.count = 0;
  set(obj, 'foo', 'baz');
  equal(obj.count, 1, 'should have invoked observer on parent');
  equal(obj2.count, 0, 'should not have invoked observer on inherited');
});

testBoth('addObserver should respect targets with methods', function(get,set) {
  var observed = { foo: 'foo' };

  var target1 = {
    count: 0,

    didChange: function(obj, keyName) {
      var value = get(obj, keyName);
      equal(this, target1, 'should invoke with this');
      equal(obj, observed, 'param1 should be observed object');
      equal(keyName, 'foo', 'param2 should be keyName');
      equal(value, 'BAZ', 'param3 should new value');
      this.count++;
    }
  };

  var target2 = {
    count: 0,

    didChange: function(obj, keyName) {
      var value = get(obj, keyName);
      equal(this, target2, 'should invoke with this');
      equal(obj, observed, 'param1 should be observed object');
      equal(keyName, 'foo', 'param2 should be keyName');
      equal(value, 'BAZ', 'param3 should new value');
      this.count++;
    }
  };

  Ember.addObserver(observed, 'foo', target1, 'didChange');
  Ember.addObserver(observed, 'foo', target2, target2.didChange);

  set(observed, 'foo', 'BAZ');
  equal(target1.count, 1, 'target1 observer should have fired');
  equal(target2.count, 1, 'target2 observer should have fired');

});

testBoth('addObserver should allow multiple objects to observe a property', function(get, set) { var observed = { foo: 'foo' };

  var target1 = {
    count: 0,

    didChange: function(obj, keyName, value) {
      this.count++;
    }
  };

  var target2 = {
    count: 0,

    didChange: function(obj, keyName, value) {
      this.count++;
    }
  };

  Ember.addObserver(observed, 'foo', target1, 'didChange');
  Ember.addObserver(observed, 'foo', target2, 'didChange');

  set(observed, 'foo', 'BAZ');
  equal(target1.count, 1, 'target1 observer should have fired');
  equal(target2.count, 1, 'target2 observer should have fired');
});

// ..........................................................
// REMOVE OBSERVER
//

module('Ember.removeObserver');

testBoth('removing observer should stop firing', function(get,set) {

  var obj = {};
  var count = 0;
  function F() { count++; }
  Ember.addObserver(obj, 'foo', F);

  set(obj, 'foo', 'bar');
  equal(count, 1, 'should have invoked observer');

  Ember.removeObserver(obj, 'foo', F);

  set(obj, 'foo', 'baz');
  equal(count, 1, "removed observer shouldn't fire");
});

testBoth('local observers can be removed', function(get, set) {
  var barObserved = 0;

  var MyMixin = Ember.Mixin.create({
    foo1: Ember.observer('bar', function() {
      barObserved++;
    }),

    foo2: Ember.observer('bar', function() {
      barObserved++;
    })
  });

  var obj = {};
  MyMixin.apply(obj);

  set(obj, 'bar', 'HI!');
  equal(barObserved, 2, 'precond - observers should be fired');

  Ember.removeObserver(obj, 'bar', null, 'foo1');

  barObserved = 0;
  set(obj, 'bar', 'HI AGAIN!');

  equal(barObserved, 1, 'removed observers should not be called');
});

testBoth('removeObserver should respect targets with methods', function(get,set) {
  var observed = { foo: 'foo' };

  var target1 = {
    count: 0,

    didChange: function() {
      this.count++;
    }
  };

  var target2 = {
    count: 0,

    didChange: function() {
      this.count++;
    }
  };

  Ember.addObserver(observed, 'foo', target1, 'didChange');
  Ember.addObserver(observed, 'foo', target2, target2.didChange);

  set(observed, 'foo', 'BAZ');
  equal(target1.count, 1, 'target1 observer should have fired');
  equal(target2.count, 1, 'target2 observer should have fired');

  Ember.removeObserver(observed, 'foo', target1, 'didChange');
  Ember.removeObserver(observed, 'foo', target2, target2.didChange);

  target1.count = target2.count = 0;
  set(observed, 'foo', 'BAZ');
  equal(target1.count, 0, 'target1 observer should not fire again');
  equal(target2.count, 0, 'target2 observer should not fire again');
});

// ..........................................................
// BEFORE OBSERVER
//

module('Ember.addBeforeObserver');

testBoth('observer should fire before a property is modified', function(get,set) {

  var obj = { foo: 'foo' };
  var count = 0;

  Ember.addBeforeObserver(obj, 'foo', function() {
    equal(get(obj, 'foo'), 'foo', 'should invoke before value changed');
    count++;
  });

  set(obj, 'foo', 'bar');
  equal(count, 1, 'should have invoked observer');
});

testBoth('observer should fire before dependent property is modified', function(get, set) {
  var obj = { bar: 'bar' };
  Ember.defineProperty(obj, 'foo', Ember.computed(function() {
    return get(this,'bar').toUpperCase();
  }).property('bar'));

  get(obj, 'foo');

  var count = 0;
  Ember.addBeforeObserver(obj, 'foo', function() {
    equal(get(obj, 'foo'), 'BAR', 'should have invoked after prop change');
    count++;
  });

  set(obj, 'bar', 'baz');
  equal(count, 1, 'should have invoked observer');
});

if (Ember.FEATURES.isEnabled('propertyBraceExpansion')) {
  if (Ember.EXTEND_PROTOTYPES) {
    testBoth('before observer added declaratively via brace expansion should fire when property changes', function (get, set) {
      var obj = {};
      var count = 0;

      Ember.mixin(obj, {
        fooAndBarWatcher: function () {
          count++;
        }.observesBefore('{foo,bar}')
      });

      set(obj, 'foo', 'foo');
      equal(count, 1, 'observer specified via brace expansion invoked on property change');

      set(obj, 'bar', 'bar');
      equal(count, 2, 'observer specified via brace expansion invoked on property change');

      set(obj, 'baz', 'baz');
      equal(count, 2, 'observer not invoked on unspecified property');
    });

    testBoth('before observer specified declaratively via brace expansion should fire when dependent property changes', function (get, set) {
      var obj = { baz: 'Initial' };
      var count = 0;

      Ember.defineProperty(obj, 'foo', Ember.computed(function() {
        return get(this,'bar').toLowerCase();
      }).property('bar'));

      Ember.defineProperty(obj, 'bar', Ember.computed(function() {
        return get(this,'baz').toUpperCase();
      }).property('baz'));

      Ember.mixin(obj, {
        fooAndBarWatcher: function () {
          count++;
        }.observesBefore('{foo,bar}')
      });

      get(obj, 'foo');
      set(obj, 'baz', 'Baz');
      // fire once for foo, once for bar
      equal(count, 2, 'observer specified via brace expansion invoked on dependent property change');

      set(obj, 'quux', 'Quux');
      equal(count, 2, 'observer not fired on unspecified property');
    });
  }

  testBoth('before observer watching multiple properties via brce expansion should fire when properties change', function (get, set) {
    var obj = {};
    var count = 0;

    Ember.mixin(obj, {
      fooAndBarWatcher: Ember.beforeObserver('{foo,bar}', function () {
        count++;
      })
    });

    set(obj, 'foo', 'foo');
    equal(count, 1, 'observer specified via brace expansion invoked on property change');

    set(obj, 'bar', 'bar');
    equal(count, 2, 'observer specified via brace expansion invoked on property change');

    set(obj, 'baz', 'baz');
    equal(count, 2, 'observer not invoked on unspecified property');
  });

  testBoth('before observer watching multiple properties via brace expansion should fire when dependent property changes', function (get, set) {
    var obj = { baz: 'Initial' };
    var count = 0;

    Ember.defineProperty(obj, 'foo', Ember.computed(function() {
      return get(this,'bar').toLowerCase();
    }).property('bar'));

    Ember.defineProperty(obj, 'bar', Ember.computed(function() {
      return get(this,'baz').toUpperCase();
    }).property('baz'));

    Ember.mixin(obj, {
      fooAndBarWatcher: Ember.beforeObserver('{foo,bar}', function () {
        count++;
      })
    });

    get(obj, 'foo');
    set(obj, 'baz', 'Baz');
    // fire once for foo, once for bar
    equal(count, 2, 'observer specified via brace expansion invoked on dependent property change');

    set(obj, 'quux', 'Quux');
    equal(count, 2, 'observer not fired on unspecified property');
  });
}

testBoth('addBeforeObserver should propagate through prototype', function(get,set) {
  var obj = { foo: 'foo', count: 0 }, obj2;

  Ember.addBeforeObserver(obj, 'foo', function() { this.count++; });
  obj2 = Ember.create(obj);

  set(obj2, 'foo', 'bar');
  equal(obj2.count, 1, 'should have invoked observer on inherited');
  equal(obj.count, 0, 'should not have invoked observer on parent');

  obj2.count = 0;
  set(obj, 'foo', 'baz');
  equal(obj.count, 1, 'should have invoked oberver on parent');
  equal(obj2.count, 0, 'should not have invoked observer on inherited');
});

testBoth('addBeforeObserver should respect targets with methods', function(get,set) {
  var observed = { foo: 'foo' };

  var target1 = {
    count: 0,

    willChange: function(obj, keyName) {
      var value = get(obj, keyName);
      equal(this, target1, 'should invoke with this');
      equal(obj, observed, 'param1 should be observed object');
      equal(keyName, 'foo', 'param2 should be keyName');
      equal(value, 'foo', 'param3 should old value');
      this.count++;
    }
  };

  var target2 = {
    count: 0,

    willChange: function(obj, keyName) {
      var value = get(obj, keyName);
      equal(this, target2, 'should invoke with this');
      equal(obj, observed, 'param1 should be observed object');
      equal(keyName, 'foo', 'param2 should be keyName');
      equal(value, 'foo', 'param3 should old value');
      this.count++;
    }
  };

  Ember.addBeforeObserver(observed, 'foo', target1, 'willChange');
  Ember.addBeforeObserver(observed, 'foo', target2, target2.willChange);

  set(observed, 'foo', 'BAZ');
  equal(target1.count, 1, 'target1 observer should have fired');
  equal(target2.count, 1, 'target2 observer should have fired');

});

// ..........................................................
// CHAINED OBSERVERS
//

var obj, count;
var originalLookup = Ember.lookup, lookup;

module('Ember.addObserver - dependentkey with chained properties', {
  setup: function() {
    obj = {
      foo: {
        bar: {
          baz: {
            biff: "BIFF"
          }
        }
      }
    };

    Ember.lookup = lookup = {
      Global: {
        foo: {
          bar: {
            baz: {
              biff: "BIFF"
            }
          }
        }
      }
    };

    count = 0;
  },

  teardown: function() {
    obj = count = null;
    Ember.lookup = originalLookup;
  }
});


testBoth('depending on a chain with a computed property', function (get, set){
  Ember.defineProperty(obj, 'computed', Ember.computed(function () {
    return {foo: 'bar'};
  }));

  var changed = 0;
  Ember.addObserver(obj, 'computed.foo', function () {
    changed++;
  });

  equal(undefined, Ember.cacheFor(obj, 'computed'), 'addObserver should not compute CP');

  set(obj, 'computed.foo', 'baz');

  equal(changed, 1, 'should fire observer');
});

testBoth('depending on a simple chain', function(get, set) {

  var val ;
  Ember.addObserver(obj, 'foo.bar.baz.biff', function(target, key) {
    val = Ember.get(target, key);
    count++;
  });

  set(Ember.get(obj, 'foo.bar.baz'), 'biff', 'BUZZ');
  equal(val, 'BUZZ');
  equal(count, 1);

  set(Ember.get(obj, 'foo.bar'), 'baz', { biff: 'BLARG' });
  equal(val, 'BLARG');
  equal(count, 2);

  set(Ember.get(obj, 'foo'), 'bar', { baz: { biff: 'BOOM' } });
  equal(val, 'BOOM');
  equal(count, 3);

  set(obj, 'foo', { bar: { baz: { biff: 'BLARG' } } });
  equal(val, 'BLARG');
  equal(count, 4);

  set(Ember.get(obj, 'foo.bar.baz'), 'biff', 'BUZZ');
  equal(val, 'BUZZ');
  equal(count, 5);

  var foo = get(obj, 'foo');

  set(obj, 'foo', 'BOO');
  equal(val, undefined);
  equal(count, 6);

  set(foo.bar.baz, 'biff', "BOOM");
  equal(count, 6, 'should be not have invoked observer');
});

testBoth('depending on a Global chain', function(get, set) {
  var Global = lookup.Global, val;

  Ember.addObserver(obj, 'Global.foo.bar.baz.biff', function(target, key) {
    val = Ember.get(lookup, key);
    count++;
  });

  set(Ember.get(Global, 'foo.bar.baz'),  'biff', 'BUZZ');
  equal(val, 'BUZZ');
  equal(count, 1);

  set(Ember.get(Global, 'foo.bar'),  'baz', { biff: 'BLARG' });
  equal(val, 'BLARG');
  equal(count, 2);

  set(Ember.get(Global, 'foo'),  'bar', { baz: { biff: 'BOOM' } });
  equal(val, 'BOOM');
  equal(count, 3);

  set(Global, 'foo', { bar: { baz: { biff: 'BLARG' } } });
  equal(val, 'BLARG');
  equal(count, 4);

  set(Ember.get(Global, 'foo.bar.baz'),  'biff', 'BUZZ');
  equal(val, 'BUZZ');
  equal(count, 5);

  var foo = get(obj, 'foo');

  set(Global, 'foo', 'BOO');
  equal(val, undefined);
  equal(count, 6);

  set(foo.bar.baz, 'biff', "BOOM");
  equal(count, 6, 'should be not have invoked observer');
});

module('Ember.removeBeforeObserver');

// ..........................................................
// SETTING IDENTICAL VALUES
//

module('props/observer_test - setting identical values');

testBoth('setting simple prop should not trigger', function(get, set) {

  var obj = { foo: 'bar' };
  var count = 0;

  Ember.addObserver(obj, 'foo', function() { count++; });

  set(obj, 'foo', 'bar');
  equal(count, 0, 'should not trigger observer');

  set(obj, 'foo', 'baz');
  equal(count, 1, 'should trigger observer');

  set(obj, 'foo', 'baz');
  equal(count, 1, 'should not trigger observer again');
});

// The issue here is when a computed property is directly set with a value, then has a
// dependent key change (which triggers a cache expiration and recomputation), observers will
// not be fired if the CP setter is called with the last set value.
testBoth('setting a cached computed property whose value has changed should trigger', function(get, set) {
  var obj = {};

  Ember.defineProperty(obj, 'foo', Ember.computed(function(key, value) {
    if (arguments.length === 2) { return value; }
    return get(this, 'baz');
  }).property('baz'));

  var count = 0;

  Ember.addObserver(obj, 'foo', function() { count++; });

  set(obj, 'foo', 'bar');
  equal(count, 1);
  equal(get(obj, 'foo'), 'bar');

  set(obj, 'baz', 'qux');
  equal(count, 2);
  equal(get(obj, 'foo'), 'qux');

  get(obj, 'foo');
  set(obj, 'foo', 'bar');
  equal(count, 3);
  equal(get(obj, 'foo'), 'bar');
});

module("Ember.immediateObserver");

testBoth("immediate observers should fire synchronously", function(get, set) {
  var obj = {},
      observerCalled = 0,
      mixin;

  // explicitly create a run loop so we do not inadvertently
  // trigger deferred behavior
  Ember.run(function() {
    mixin = Ember.Mixin.create({
      fooDidChange: Ember.immediateObserver('foo', function() {
        observerCalled++;
        equal(get(this, 'foo'), "barbaz", "newly set value is immediately available");
      })
    });

    mixin.apply(obj);

    Ember.defineProperty(obj, 'foo', Ember.computed(function(key, value) {
      if (arguments.length > 1) {
        return value;
      }
      return "yes hello this is foo";
    }));

    equal(get(obj, 'foo'), "yes hello this is foo", "precond - computed property returns a value");
    equal(observerCalled, 0, "observer has not yet been called");

    set(obj, 'foo', 'barbaz');

    equal(observerCalled, 1, "observer was called once");
  });
});


if (Ember.FEATURES.isEnabled('propertyBraceExpansion')) {
  if (Ember.EXTEND_PROTOTYPES) {
    testBoth('immediate observers added declaratively via brace expansion fire synchronously', function (get, set) {
      var obj = {},
          observerCalled = 0,
          mixin;

      // explicitly create a run loop so we do not inadvertently
      // trigger deferred behavior
      Ember.run(function() {
        mixin = Ember.Mixin.create({
          fooDidChange: function() {
            observerCalled++;
            equal(get(this, 'foo'), "barbaz", "newly set value is immediately available");
          }.observesImmediately('{foo,bar}')
        });

        mixin.apply(obj);

        Ember.defineProperty(obj, 'foo', Ember.computed(function(key, value) {
          if (arguments.length > 1) {
            return value;
          }
          return "yes hello this is foo";
        }));

        equal(get(obj, 'foo'), "yes hello this is foo", "precond - computed property returns a value");
        equal(observerCalled, 0, "observer has not yet been called");

        set(obj, 'foo', 'barbaz');

        equal(observerCalled, 1, "observer was called once");
      });
    });
  }

  testBoth('immediate observers watching multiple properties via brace expansion fire synchronously', function (get, set) {
    var obj = {},
        observerCalled = 0,
        mixin;

    // explicitly create a run loop so we do not inadvertently
    // trigger deferred behavior
    Ember.run(function() {
      mixin = Ember.Mixin.create({
        fooDidChange: Ember.immediateObserver('{foo,bar}', function() {
          observerCalled++;
          equal(get(this, 'foo'), "barbaz", "newly set value is immediately available");
        })
      });

      mixin.apply(obj);

      Ember.defineProperty(obj, 'foo', Ember.computed(function(key, value) {
        if (arguments.length > 1) {
          return value;
        }
        return "yes hello this is foo";
      }));

      equal(get(obj, 'foo'), "yes hello this is foo", "precond - computed property returns a value");
      equal(observerCalled, 0, "observer has not yet been called");

      set(obj, 'foo', 'barbaz');

      equal(observerCalled, 1, "observer was called once");
    });
  });
}

testBoth("immediate observers are for internal properties only", function(get, set) {
  expectAssertion(function() {
    Ember.immediateObserver('foo.bar', Ember.K);
  }, 'Immediate observers must observe internal properties only, not properties on other objects.');
});

module("Ember.changeProperties");

testBoth("observers added/removed during changeProperties should do the right thing.", function(get,set) {
  var obj = {
    foo: 0
  };
  function Observer() {
    this.willChangeCount = 0;
    this.didChangeCount = 0;
  }
  Observer.prototype = {
    add: function () {
      Ember.addBeforeObserver(obj, 'foo', this, 'willChange');
      Ember.addObserver(obj, 'foo', this, 'didChange');
    },
    remove: function() {
      Ember.removeBeforeObserver(obj, 'foo', this, 'willChange');
      Ember.removeObserver(obj, 'foo', this, 'didChange');
    },
    willChange: function () {
      this.willChangeCount++;
    },
    didChange: function () {
      this.didChangeCount++;
    }
  };
  var addedBeforeFirstChangeObserver = new Observer();
  var addedAfterFirstChangeObserver = new Observer();
  var addedAfterLastChangeObserver = new Observer();
  var removedBeforeFirstChangeObserver = new Observer();
  var removedBeforeLastChangeObserver = new Observer();
  var removedAfterLastChangeObserver = new Observer();
  removedBeforeFirstChangeObserver.add();
  removedBeforeLastChangeObserver.add();
  removedAfterLastChangeObserver.add();
  Ember.changeProperties(function () {
    removedBeforeFirstChangeObserver.remove();
    addedBeforeFirstChangeObserver.add();

    set(obj, 'foo', 1);

    equal(addedBeforeFirstChangeObserver.willChangeCount, 1, 'addBeforeObserver called before the first change invoked immediately');
    equal(addedBeforeFirstChangeObserver.didChangeCount, 0, 'addObserver called before the first change is deferred');

    addedAfterFirstChangeObserver.add();
    removedBeforeLastChangeObserver.remove();

    set(obj, 'foo', 2);

    equal(addedAfterFirstChangeObserver.willChangeCount, 1, 'addBeforeObserver called after the first change invoked immediately');
    equal(addedAfterFirstChangeObserver.didChangeCount, 0, 'addObserver called after the first change is deferred');

    addedAfterLastChangeObserver.add();
    removedAfterLastChangeObserver.remove();
  });

  equal(removedBeforeFirstChangeObserver.willChangeCount, 0, 'removeBeforeObserver called before the first change sees none');
  equal(removedBeforeFirstChangeObserver.didChangeCount,  0, 'removeObserver called before the first change sees none');
  equal(addedBeforeFirstChangeObserver.willChangeCount,   1, 'addBeforeObserver called before the first change sees only 1');
  equal(addedBeforeFirstChangeObserver.didChangeCount,    1, 'addObserver called before the first change sees only 1');
  equal(addedAfterFirstChangeObserver.willChangeCount,    1, 'addBeforeObserver called after the first change sees 1');
  equal(addedAfterFirstChangeObserver.didChangeCount,     1, 'addObserver called after the first change sees 1');
  equal(addedAfterLastChangeObserver.willChangeCount,     0, 'addBeforeObserver called after the last change sees none');
  equal(addedAfterLastChangeObserver.didChangeCount,      0, 'addObserver called after the last change sees none');
  equal(removedBeforeLastChangeObserver.willChangeCount,  1, 'removeBeforeObserver called before the last change still sees 1');
  equal(removedBeforeLastChangeObserver.didChangeCount,   1, 'removeObserver called before the last change still sees 1');
  equal(removedAfterLastChangeObserver.willChangeCount,   1, 'removeBeforeObserver called after the last change still sees 1');
  equal(removedAfterLastChangeObserver.didChangeCount,    1, 'removeObserver called after the last change still sees 1');
});

})();

(function() {
/*
  This test file is designed to capture performance regressions related to
  deferred computation. Things like run loops, computed properties, and bindings
  should run the minimum amount of times to achieve best performance, so any
  bugs that cause them to get evaluated more than necessary should be put here.
*/

module("Computed Properties - Number of times evaluated");

test("computed properties that depend on multiple properties should run only once per run loop", function() {
  var obj = {a: 'a', b: 'b', c: 'c'};
  var cpCount = 0, obsCount = 0;

  Ember.defineProperty(obj, 'abc', Ember.computed(function(key) {
    cpCount++;
    return 'computed '+key;
  }).property('a', 'b', 'c'));

  Ember.get(obj, 'abc');

  cpCount = 0;

  Ember.addObserver(obj, 'abc', function() {
    obsCount++;
  });

  Ember.beginPropertyChanges();
  Ember.set(obj, 'a', 'aa');
  Ember.set(obj, 'b', 'bb');
  Ember.set(obj, 'c', 'cc');
  Ember.endPropertyChanges();

  Ember.get(obj, 'abc');

  equal(cpCount, 1, "The computed property is only invoked once");
  equal(obsCount, 1, "The observer is only invoked once");
});

test("computed properties are not executed if they are the last segment of an observer chain pain", function() {
  var foo = { bar: { baz: { } } };

  var count = 0;

  Ember.defineProperty(foo.bar.baz, 'bam', Ember.computed(function() {
    count++;
  }));

  Ember.addObserver(foo, 'bar.baz.bam', function() {});

  Ember.propertyDidChange(Ember.get(foo, 'bar.baz'), 'bam');

  equal(count, 0, "should not have recomputed property");
});

})();

(function() {
module("Ember.create()");

test("should inherit the properties from the parent object", function() {
  var obj = { foo: 'FOO' };
  var obj2 = Ember.create(obj);
  ok(obj !== obj2, 'should be a new instance');
  equal(obj2.foo, obj.foo, 'should inherit from parent');

  obj2.foo = 'BAR';
  equal(obj2.foo, 'BAR', 'should change foo');
  equal(obj.foo, 'FOO', 'modifying obj2 should not modify obj');
});

// NOTE: jshint may interfere with this test since it defines its own Object.create if missing
test("passing additional property descriptors should define", function() {
  var obj = { foo: 'FOO', repl: 'obj' };
  var obj2 = Ember.create(obj, {
    bar: {
      value: 'BAR'
    },

    repl: {
      value: 'obj2'
    }
  });

  equal(obj2.bar, 'BAR', 'should have defined');
  equal(obj2.repl, 'obj2', 'should have replaced parent');
});

test("passing additional property descriptors should not pollute parent object", function() {
  var obj = { foo: 'FOO', repl: 'obj' };
  var obj2 = Ember.create(obj, {
    repl: {
      value: 'obj2'
    }
  });

  notEqual(obj.repl, obj2.repl, 'should not pollute parent object');
});

})();

(function() {
function isEnumerable(obj, keyName) {
  var keys = [];
  for(var key in obj) {
    if (obj.hasOwnProperty(key)) keys.push(key);
  }
  return Ember.EnumerableUtils.indexOf(keys, keyName)>=0;
}

module("Ember.platform.defineProperty()");

test("defining a simple property", function() {
  var obj = {};
  Ember.platform.defineProperty(obj, 'foo', {
    enumerable:   true,
    writable:     true,
    value: 'FOO'
  });

  equal(obj.foo, 'FOO', 'should have added property');

  obj.foo = "BAR";
  equal(obj.foo, 'BAR', 'writable defined property should be writable');
  equal(isEnumerable(obj, 'foo'), true, 'foo should be enumerable');
});

test('defining a read only property', function() {
  var obj = {};
  Ember.platform.defineProperty(obj, 'foo', {
    enumerable:   true,
    writable:     false,
    value: 'FOO'
  });

  equal(obj.foo, 'FOO', 'should have added property');

  obj.foo = "BAR";
  if (Ember.platform.defineProperty.isSimulated) {
    equal(obj.foo, 'BAR', 'simulated defineProperty should silently work');
  } else {
    equal(obj.foo, 'FOO', 'real defined property should not be writable');
  }

});

test('defining a non enumerable property', function() {
  var obj = {};
  Ember.platform.defineProperty(obj, 'foo', {
    enumerable:   false,
    writable:     true,
    value: 'FOO'
  });

  if (Ember.platform.defineProperty.isSimulated) {
    equal(isEnumerable(obj, 'foo'), true, 'simulated defineProperty will leave properties enumerable');
  } else {
    equal(isEnumerable(obj, 'foo'), false, 'real defineProperty will make property not-enumerable');
  }
});

// If accessors don't exist, behavior that relies on getters
// and setters don't do anything
if (Ember.platform.hasPropertyAccessors) {
  test('defining a getter/setter', function() {
    var obj = {}, getCnt = 0, setCnt = 0, v = 'FOO';

    var desc = {
      enumerable: true,
      get: function() { getCnt++; return v; },
      set: function(val) { setCnt++; v = val; }
    };

    if (Ember.platform.hasPropertyAccessors) {
      Ember.platform.defineProperty(obj, 'foo', desc);
      equal(obj.foo, 'FOO', 'should return getter');
      equal(getCnt, 1, 'should have invoked getter');

      obj.foo = 'BAR';
      equal(obj.foo, 'BAR', 'setter should have worked');
      equal(setCnt, 1, 'should have invoked setter');

    }

  });

  test('defining getter/setter along with writable', function() {
    var obj  ={};
    raises(function() {
      Ember.platform.defineProperty(obj, 'foo', {
        enumerable: true,
        get: function() {},
        set: function() {},
        writable: true
      });
    }, Error, 'defining writable and get/set should throw exception');
  });

  test('defining getter/setter along with value', function() {
    var obj  ={};
    raises(function() {
      Ember.platform.defineProperty(obj, 'foo', {
        enumerable: true,
        get: function() {},
        set: function() {},
        value: 'FOO'
      });
    }, Error, 'defining value and get/set should throw exception');
  });
}

})();

(function() {
module('Ember.defineProperty');

test('toString', function() {

  var obj = {};
  Ember.defineProperty(obj, 'toString', undefined, function() { return 'FOO'; });
  equal(obj.toString(), 'FOO', 'should replace toString');
});

test("for data properties, didDefineProperty hook should be called if implemented", function() {
  expect(2);

  var obj = {
    didDefineProperty: function(obj, keyName, value) {
      equal(keyName, 'foo', "key name should be foo");
      equal(value, 'bar', "value should be bar");
    }
  };

  Ember.defineProperty(obj, 'foo', undefined, "bar");
});

test("for descriptor properties, didDefineProperty hook should be called if implemented", function() {
  expect(2);

  var computedProperty = Ember.computed(Ember.K);

  var obj = {
    didDefineProperty: function(obj, keyName, value) {
      equal(keyName, 'foo', "key name should be foo");
      strictEqual(value, computedProperty, "value should be passed descriptor");
    }
  };

  Ember.defineProperty(obj, 'foo', computedProperty);
});


})();

(function() {
var originalDebounce = Ember.run.backburner.debounce;
var wasCalled = false;
module('Ember.run.debounce',{
  setup: function() {
    Ember.run.backburner.debounce = function() { wasCalled = true; };
  },
  teardown: function() {
    Ember.run.backburner.debounce = originalDebounce;
  }
});

test('Ember.run.debounce uses Backburner.debounce', function() {
  Ember.run.debounce(function() {});
  ok(wasCalled, 'Ember.run.debounce used');
});


})();

(function() {
module('system/run_loop/join_test');

test('Ember.run.join brings its own run loop if none provided', function() {
  ok(!Ember.run.currentRunLoop, 'expects no existing run-loop');

  Ember.run.join(function() {
    ok(Ember.run.currentRunLoop, 'brings its own run loop');
  });
});

test('Ember.run.join joins and existing run-loop, and fires its action queue.', function() {
  var outerRunLoop, wasInvoked;

  Ember.run(function() {
    outerRunLoop = Ember.run.currentRunLoop;

    Ember.run.join(function() {
      wasInvoked = true;
      deepEqual(outerRunLoop, Ember.run.currentRunLoop, 'joined the existing run-loop');
    });

    ok(!wasInvoked, 'expected the joined callback not be invoked yet');
  });
  ok(wasInvoked, 'expected the joined callback to have invoked');
});

test('Ember.run.join returns a value if creating a new run-loop', function() {
  var value = 'returned value';

  var result = Ember.run.join(function() {
    return value;
  });

  equal(value, result, 'returns expected output');
});

test('Ember.run.join returns undefined if joining another run-loop', function() {
  var value = 'returned value',
  result;

  Ember.run(function() {
    var result = Ember.run.join(function() {
      return value;
    });
  });

  equal(result, undefined, 'returns nothing');
});


})();

(function() {

var originalSetTimeout = window.setTimeout,
    originalDateValueOf = Date.prototype.valueOf;

var wait = function(callback, maxWaitCount) {
  maxWaitCount = Ember.isNone(maxWaitCount) ? 100 : maxWaitCount;

  originalSetTimeout(function() {
    if (maxWaitCount > 0 && (Ember.run.hasScheduledTimers() || Ember.run.currentRunLoop)) {
      wait(callback, maxWaitCount - 1);

      return;
    }

    callback();
  }, 10);
};

module('Ember.run.later', {
  teardown: function() {
    window.setTimeout = originalSetTimeout;
    Date.prototype.valueOf = originalDateValueOf;
  }
});

asyncTest('should invoke after specified period of time - function only', function() {

  var invoked = false;

  Ember.run(function() {
    Ember.run.later(function() { invoked = true; }, 100);
  });

  wait(function() {
    start();
    equal(invoked, true, 'should have invoked later item');
  });
});

asyncTest('should invoke after specified period of time - target/method', function() {

  var obj = { invoked: false } ;

  Ember.run(function() {
    Ember.run.later(obj, function() { this.invoked = true; }, 100);
  });

  wait(function() {
    start();
    equal(obj.invoked, true, 'should have invoked later item');
  });
});

asyncTest('should invoke after specified period of time - target/method/args', function() {

  var obj = { invoked: 0 } ;

  Ember.run(function() {
    Ember.run.later(obj, function(amt) { this.invoked += amt; }, 10, 100);
  });

  wait(function() {
    start();
    equal(obj.invoked, 10, 'should have invoked later item');
  });
});

asyncTest('should always invoke within a separate runloop', function() {
  var obj = { invoked: 0 }, firstRunLoop, secondRunLoop;

  Ember.run(function() {
    firstRunLoop = Ember.run.currentRunLoop;

    Ember.run.later(obj, function(amt) {
      this.invoked += amt;
      secondRunLoop = Ember.run.currentRunLoop;
    }, 10, 1);

    // Synchronous "sleep". This simulates work being done
    // after run.later was called but before the run loop
    // has flushed. In previous versions, this would have
    // caused the run.later callback to have run from
    // within the run loop flush, since by the time the
    // run loop has to flush, it would have considered
    // the timer already expired.
    var pauseUntil = +new Date() + 100;
    while(+new Date() < pauseUntil) { /* do nothing - sleeping */ }
  });

  ok(firstRunLoop, "first run loop captured");
  ok(!Ember.run.currentRunLoop, "shouldn't be in a run loop after flush");
  equal(obj.invoked, 0, "shouldn't have invoked later item yet");

  wait(function() {
    start();
    equal(obj.invoked, 10, "should have invoked later item");
    ok(secondRunLoop, "second run loop took place");
    ok(secondRunLoop !== firstRunLoop, "two different run loops took place");
  });
});

// Our current implementation doesn't allow us to correctly enforce this ordering.
// We should probably implement a queue to provide this guarantee.
// See https://github.com/emberjs/ember.js/issues/3526 for more information.

// asyncTest('callback order', function() {
//   var array = [];
//   function fn(val) { array.push(val); }

//   Ember.run(function() {
//     Ember.run.later(this, fn, 4, 5);
//     Ember.run.later(this, fn, 1, 1);
//     Ember.run.later(this, fn, 5, 10);
//     Ember.run.later(this, fn, 2, 3);
//     Ember.run.later(this, fn, 3, 3);
//   });

//   deepEqual(array, []);

//   wait(function() {
//     start();
//     deepEqual(array, [1,2,3,4,5], 'callbacks were called in expected order');
//   });
// });


// Out current implementation doesn't allow us to properly enforce what is tested here.
// We should probably fix it, but it's not technically a bug right now.
// See https://github.com/emberjs/ember.js/issues/3522 for more information.

// asyncTest('callbacks coalesce into same run loop if expiring at the same time', function() {
//   var array = [];
//   function fn(val) { array.push(Ember.run.currentRunLoop); }

//   Ember.run(function() {

//     // Force +new Date to return the same result while scheduling
//     // run.later timers. Otherwise: non-determinism!
//     var now = +new Date();
//     Date.prototype.valueOf = function() { return now; };

//     Ember.run.later(this, fn, 10);
//     Ember.run.later(this, fn, 200);
//     Ember.run.later(this, fn, 200);

//     Date.prototype.valueOf = originalDateValueOf;
//   });

//   deepEqual(array, []);

//   wait(function() {
//     start();
//     equal(array.length, 3, 'all callbacks called');
//     ok(array[0] !== array[1], 'first two callbacks have different run loops');
//     ok(array[0], 'first runloop present');
//     ok(array[1], 'second runloop present');
//     equal(array[1], array[2], 'last two callbacks got the same run loop');
//   });
// });

asyncTest('inception calls to run.later should run callbacks in separate run loops', function() {

  var runLoop, finished;

  Ember.run(function() {
    runLoop = Ember.run.currentRunLoop;
    ok(runLoop);

    Ember.run.later(function() {
      ok(Ember.run.currentRunLoop && Ember.run.currentRunLoop !== runLoop,
         'first later callback has own run loop');
      runLoop = Ember.run.currentRunLoop;

      Ember.run.later(function() {
        ok(Ember.run.currentRunLoop && Ember.run.currentRunLoop !== runLoop,
           'second later callback has own run loop');
        finished = true;
      }, 40);
    }, 40);
  });

  wait(function() {
    start();
    ok(finished, 'all .later callbacks run');
  });
});

asyncTest('setTimeout should never run with a negative wait', function() {

  // Rationale: The old run loop code was susceptible to an occasional
  // bug where invokeLaterTimers would be scheduled with a setTimeout
  // with a negative wait. Modern browsers normalize this to 0, but
  // older browsers (IE <= 8) break with a negative wait, which
  // happens when an expired timer callback takes a while to run,
  // which is what we simulate here.
  var newSetTimeoutUsed;
  window.setTimeout = function() {
    var wait = arguments[arguments.length - 1];
    newSetTimeoutUsed = true;
    ok(!isNaN(wait) && wait >= 0, 'wait is a non-negative number');
    // In IE8, `setTimeout.apply` is `undefined`.
    var apply = Function.prototype.apply;
    return apply.apply(originalSetTimeout, [this, arguments]);
  };

  var count = 0;
  Ember.run(function() {

    Ember.run.later(function() {
      count++;

      // This will get run first. Waste some time.
      // This is intended to break invokeLaterTimers code by taking a
      // long enough time that other timers should technically expire. It's
      // fine that they're not called in this run loop; just need to
      // make sure that invokeLaterTimers doesn't end up scheduling
      // a negative setTimeout.
      var pauseUntil = +new Date() + 60;
      while(+new Date() < pauseUntil) { /* do nothing - sleeping */ }
    }, 1);

    Ember.run.later(function() {
      equal(count, 1, 'callbacks called in order');
    }, 50);
  });

  wait(function() {
    window.setTimeout = originalSetTimeout;
    start();
    ok(newSetTimeoutUsed, 'stub setTimeout was used');
  });
});

})();

(function() {
module('Ember.run.next');

asyncTest('should invoke immediately on next timeout', function() {

  var invoked = false;

  Ember.run(function() {
    Ember.run.next(function() { invoked = true; });
  });

  equal(invoked, false, 'should not have invoked yet');


  setTimeout(function() {
    start();
    equal(invoked, true, 'should have invoked later item');
  }, 20);

});

asyncTest('callback should be called from within separate loop', function() {
  var firstRunLoop, secondRunLoop;
  Ember.run(function() {
    firstRunLoop = Ember.run.currentRunLoop;
    Ember.run.next(function() { secondRunLoop = Ember.run.currentRunLoop; });
  });

  setTimeout(function() {
    start();
    ok(secondRunLoop, 'callback was called from within run loop');
    ok(firstRunLoop && secondRunLoop !== firstRunLoop, 'two seperate run loops were invoked');
  }, 20);
});

asyncTest('multiple calls to Ember.run.next share coalesce callbacks into same run loop', function() {
  var firstRunLoop, secondRunLoop, thirdRunLoop;
  Ember.run(function() {
    firstRunLoop = Ember.run.currentRunLoop;
    Ember.run.next(function() { secondRunLoop = Ember.run.currentRunLoop; });
    Ember.run.next(function() { thirdRunLoop  = Ember.run.currentRunLoop; });
  });

  setTimeout(function() {
    start();
    ok(secondRunLoop && secondRunLoop === thirdRunLoop, 'callbacks coalesced into same run loop');
  }, 20);
});

})();

(function() {
module('system/run_loop/once_test');

test('calling invokeOnce more than once invokes only once', function() {

  var count = 0;
  Ember.run(function() {
    var F = function() { count++; };
    Ember.run.once(F);
    Ember.run.once(F);
    Ember.run.once(F);
  });

  equal(count, 1, 'should have invoked once');
});

test('should differentiate based on target', function() {

  var A = { count: 0 }, B = { count: 0 };
  Ember.run(function() {
    var F = function() { this.count++; };
    Ember.run.once(A, F);
    Ember.run.once(B, F);
    Ember.run.once(A, F);
    Ember.run.once(B, F);
  });

  equal(A.count, 1, 'should have invoked once on A');
  equal(B.count, 1, 'should have invoked once on B');
});


test('should ignore other arguments - replacing previous ones', function() {

  var A = { count: 0 }, B = { count: 0 };
  Ember.run(function() {
    var F = function(amt) { this.count += amt; };
    Ember.run.once(A, F, 10);
    Ember.run.once(B, F, 20);
    Ember.run.once(A, F, 30);
    Ember.run.once(B, F, 40);
  });

  equal(A.count, 30, 'should have invoked once on A');
  equal(B.count, 40, 'should have invoked once on B');
});

test('should be inside of a runloop when running', function() {

  Ember.run(function() {
    Ember.run.once(function() {
      ok(!!Ember.run.currentRunLoop, 'should have a runloop');
    });
  });
});



})();

(function() {
module('system/run_loop/onerror_test');

test('With Ember.onerror undefined, errors in Ember.run are thrown', function () {
  var thrown = new Error('Boom!'),
      caught;

  try {
    Ember.run(function() { throw thrown; });
  } catch (error) {
    caught = error;
  }

  deepEqual(caught, thrown);
});

test('With Ember.onerror set, errors in Ember.run are caught', function () {
  var thrown = new Error('Boom!'),
      caught;

  Ember.onerror = function(error) { caught = error; };

  Ember.run(function() { throw thrown; });

  deepEqual(caught, thrown);

  Ember.onerror = undefined;
});

})();

(function() {
module('system/run_loop/run_test');

test('Ember.run invokes passed function, returning value', function() {
  var obj = {
    foo: function() { return [this.bar, 'FOO']; },
    bar: 'BAR',
    checkArgs: function(arg1, arg2) { return [ arg1, this.bar, arg2 ]; }
  };

  equal(Ember.run(function() { return 'FOO'; }), 'FOO', 'pass function only');
  deepEqual(Ember.run(obj, obj.foo), ['BAR', 'FOO'], 'pass obj and obj.method');
  deepEqual(Ember.run(obj, 'foo'), ['BAR', 'FOO'], 'pass obj and "method"');
  deepEqual(Ember.run(obj, obj.checkArgs, 'hello', 'world'), ['hello', 'BAR', 'world'], 'pass obj, obj.method, and extra arguments');
});

})();

(function() {
module('system/run_loop/schedule_test');

test('scheduling item in queue should defer until finished', function() {
  var cnt = 0;

  Ember.run(function() {
    Ember.run.schedule('actions', function() { cnt++; });
    Ember.run.schedule('actions', function() { cnt++; });
    equal(cnt, 0, 'should not run action yet') ;
  });

  equal(cnt, 2, 'should flush actions now');

});

test('nested runs should queue each phase independently', function() {
  var cnt = 0;

  Ember.run(function() {
    Ember.run.schedule('actions', function() { cnt++; });
    equal(cnt, 0, 'should not run action yet') ;

    Ember.run(function() {
      Ember.run.schedule('actions', function() { cnt++; });
    });
    equal(cnt, 1, 'should not run action yet') ;

  });

  equal(cnt, 2, 'should flush actions now');

});

test('prior queues should be flushed before moving on to next queue', function() {
  var order = [];

  Ember.run(function() {
    var runLoop = Ember.run.currentRunLoop;
    ok(runLoop, 'run loop present');

    Ember.run.schedule('sync', function() {
      order.push('sync');
      equal(runLoop, Ember.run.currentRunLoop, 'same run loop used');
    });
    Ember.run.schedule('actions', function() {
      order.push('actions');
      equal(runLoop, Ember.run.currentRunLoop, 'same run loop used');

      Ember.run.schedule('actions', function() {
        order.push('actions');
        equal(runLoop, Ember.run.currentRunLoop, 'same run loop used');
      });

      Ember.run.schedule('sync', function() {
        order.push('sync');
        equal(runLoop, Ember.run.currentRunLoop, 'same run loop used');
      });
    });
    Ember.run.schedule('destroy', function() {
      order.push('destroy');
      equal(runLoop, Ember.run.currentRunLoop, 'same run loop used');
    });
  });

  deepEqual(order, ['sync', 'actions', 'sync', 'actions', 'destroy']);
});

test('makes sure it does not trigger an autorun during testing', function() {
  expectAssertion(function() {
    Ember.run.schedule('actions', function() {});
  }, /wrap any code with asynchronous side-effects in an Ember.run/);

  // make sure not just the first violation is asserted.
  expectAssertion(function() {
    Ember.run.schedule('actions', function() {});
  }, /wrap any code with asynchronous side-effects in an Ember.run/);
});

})();

(function() {
module('system/run_loop/sync_test');

test('sync() will immediately flush the sync queue only', function() {
  var cnt = 0;

  Ember.run(function() {

    function cntup() { cnt++; }

    function syncfunc() {
      if (++cnt<5) Ember.run.schedule('sync', syncfunc);
      Ember.run.schedule('actions', cntup);
    }

    syncfunc();

    equal(cnt, 1, 'should not run action yet') ;
    Ember.run.sync();

    equal(cnt, 5, 'should have run sync queue continuously');
  });

  equal(cnt, 10, 'should flush actions now too');

});

test('calling sync() outside a run loop does not cause an error', function() {
  expect(0);

  Ember.run.sync();
});

})();

(function() {
module('system/run_loop/unwind_test');

test('RunLoop unwinds despite unhandled exception', function() {
  var initialRunLoop = Ember.run.currentRunLoop;

  raises(function() {
    Ember.run(function() {
      Ember.run.schedule('actions', function() { throw new Ember.Error("boom!"); });
    });
  }, Error, "boom!");

  // The real danger at this point is that calls to autorun will stick
  // tasks into the already-dead runloop, which will never get
  // flushed. I can't easily demonstrate this in a unit test because
  // autorun explicitly doesn't work in test mode. - ef4
  equal(Ember.run.currentRunLoop, initialRunLoop, "Previous run loop should be cleaned up despite exception");

  // Prevent a failure in this test from breaking subsequent tests.
  Ember.run.currentRunLoop = initialRunLoop;

});

test('Ember.run unwinds despite unhandled exception', function() {
  var initialRunLoop = Ember.run.currentRunLoop;

  raises(function() {
    Ember.run(function() {
      throw new Ember.Error("boom!");
    });
  }, Ember.Error, "boom!");

  equal(Ember.run.currentRunLoop, initialRunLoop, "Previous run loop should be cleaned up despite exception");

  // Prevent a failure in this test from breaking subsequent tests.
  Ember.run.currentRunLoop = initialRunLoop;

});


})();

(function() {
var obj;

module("Ember.canInvoke", {
  setup: function() {
    obj = {
      foobar: "foobar",
      aMethodThatExists: function() {}
    };
  },

  teardown: function() {
    obj = undefined;
  }
});

test("should return false if the object doesn't exist", function() {
  equal(Ember.canInvoke(undefined, 'aMethodThatDoesNotExist'), false);
});

test("should return true if the method exists on the object", function() {
  equal(Ember.canInvoke(obj, 'aMethodThatExists'), true);
});

test("should return false if the method doesn't exist on the object", function() {
  equal(Ember.canInvoke(obj, 'aMethodThatDoesNotExist'), false);
});

test("should return false if the property exists on the object but is a non-function", function() {
  equal(Ember.canInvoke(obj, 'foobar'), false);
});

})();

(function() {
module("Ember.generateGuid");

test("Prefix", function() {
  var a = {};
  
  ok( Ember.generateGuid(a, 'tyrell').indexOf('tyrell') > -1, "guid can be prefixed" );
});

})();

(function() {
module("Ember.guidFor");

var sameGuid = function(a, b, message) {
  equal( Ember.guidFor(a), Ember.guidFor(b), message );
};

var diffGuid = function(a, b, message) {
  ok( Ember.guidFor(a) !== Ember.guidFor(b), message);
};

var nanGuid = function(obj) {
  var type = typeof obj;
  ok( isNaN(parseInt(Ember.guidFor(obj), 0)), "guids for " + type + "don't parse to numbers");
};

test("Object", function() {
  var a = {}, b = {};

  sameGuid( a, a, "same object always yields same guid" );
  diffGuid( a, b, "different objects yield different guids" );
  nanGuid( a );
});

test("Object with prototype", function() {
  var Class = function() { };

  Ember.guidFor(Class.prototype);

  var a = new Class();
  var b = new Class();

  sameGuid( a, b , "without calling rewatch, objects copy the guid from their prototype");

  Ember.rewatch(a);
  Ember.rewatch(b);

  diffGuid( a, b, "after calling rewatch, objects don't share guids" );
});

test("strings", function() {
  var a = "string A", aprime = "string A", b = "String B";

  sameGuid( a, a,      "same string always yields same guid" );
  sameGuid( a, aprime, "identical strings always yield the same guid" );
  diffGuid( a, b,      "different strings yield different guids" );
  nanGuid( a );
});

test("numbers", function() {
  var a = 23, aprime = 23, b = 34;

  sameGuid( a, a,      "same numbers always yields same guid" );
  sameGuid( a, aprime, "identical numbers always yield the same guid" );
  diffGuid( a, b,      "different numbers yield different guids" );
  nanGuid( a );
});

test("numbers", function() {
  var a = true, aprime = true, b = false;

  sameGuid( a, a,      "same booleans always yields same guid" );
  sameGuid( a, aprime, "identical booleans always yield the same guid" );
  diffGuid( a, b,      "different boolean yield different guids" );
  nanGuid( a );
  nanGuid( b );
});

test("null and undefined", function() {
  var a = null, aprime = null, b;

  sameGuid( a, a,      "null always returns the same guid" );
  sameGuid( b, b,      "undefined always returns the same guid" );
  sameGuid( a, aprime, "different nulls return the same guid" );
  diffGuid( a, b,      "null and undefined return different guids" );
  nanGuid( a );
  nanGuid( b );
});

test("arrays", function() {
  var a = ["a", "b", "c"], aprime = ["a", "b", "c"], b = ["1", "2", "3"];

  sameGuid( a, a,      "same instance always yields same guid" );
  diffGuid( a, aprime, "identical arrays always yield the same guid" );
  diffGuid( a, b,      "different arrays yield different guids" );
  nanGuid( a );
});


})();

(function() {
module("Ember Type Checking");

var global = this;

test("Ember.isArray" ,function() {
  var numarray      = [1,2,3],
      number        = 23,
      strarray      = ["Hello", "Hi"],
      string        = "Hello",
      object         = {},
      length        = {length: 12},
      fn            = function() {};

  equal( Ember.isArray(numarray), true,  "[1,2,3]" );
  equal( Ember.isArray(number),   false, "23" );
  equal( Ember.isArray(strarray), true,  '["Hello", "Hi"]' );
  equal( Ember.isArray(string),   false, '"Hello"' );
  equal( Ember.isArray(object),   false, "{}" );
  equal( Ember.isArray(length),   true,  "{length: 12}" );
  equal( Ember.isArray(global),   false, "global" );
  equal( Ember.isArray(fn),       false, "function() {}" );
});

})();

(function() {
/*global jQuery*/

module("Ember.meta");

test("should return the same hash for an object", function() {
  var obj = {};

  Ember.meta(obj).foo = "bar";

  equal(Ember.meta(obj).foo, "bar", "returns same hash with multiple calls to Ember.meta()");
});

module("Ember.metaPath", {
  setup: function() {
    Ember.TESTING_DEPRECATION = true;
  },
  teardown: function() {
    Ember.TESTING_DEPRECATION = false;
  }
});

test("should not create nested objects if writable is false", function() {
  var obj = {};

  ok(!Ember.meta(obj).foo, "precond - foo property on meta does not yet exist");
  equal(Ember.metaPath(obj, ['foo', 'bar', 'baz'], false), undefined, "should return undefined when writable is false and doesn't already exist") ;
  equal(Ember.meta(obj).foo, undefined, "foo property is not created");
});

test("should create nested objects if writable is true", function() {
  var obj = {};

  ok(!Ember.meta(obj).foo, "precond - foo property on meta does not yet exist");

  equal(typeof Ember.metaPath(obj, ['foo', 'bar', 'baz'], true), "object", "should return hash when writable is true and doesn't already exist") ;
  ok(Ember.meta(obj).foo.bar.baz['bat'] = true, "can set a property on the newly created hash");
});

test("getMeta and setMeta", function() {
  var obj = {};

  ok(!Ember.getMeta(obj, 'foo'), "precond - foo property on meta does not yet exist");
  Ember.setMeta(obj, 'foo', "bar");
  equal(Ember.getMeta(obj, 'foo'), "bar", "foo property on meta now exists");
});

module("Ember.meta enumerable");
// Tests fix for https://github.com/emberjs/ember.js/issues/344
// This is primarily for older browsers such as IE8
if (Ember.platform.defineProperty.isSimulated) {
  if (Ember.imports.jQuery) {
    test("meta is not jQuery.isPlainObject", function () {
      var proto, obj;
      proto = {foo: 'bar'};
      equal(jQuery.isPlainObject(Ember.meta(proto)), false, 'meta should not be isPlainObject when meta property cannot be marked as enumerable: false');
      obj = Ember.create(proto);
      equal(jQuery.isPlainObject(Ember.meta(obj)), false, 'meta should not be isPlainObject when meta property cannot be marked as enumerable: false');
    });
  }
} else {
  test("meta is not enumerable", function () {
    var proto, obj, props, prop;
    proto = {foo: 'bar'};
    Ember.meta(proto);
    obj = Ember.create(proto);
    Ember.meta(obj);
    obj.bar = 'baz';
    props = [];
    for (prop in obj) {
      props.push(prop);
    }
    deepEqual(props.sort(), ['bar', 'foo']);
    if (typeof JSON !== 'undefined' && 'stringify' in JSON) {
      try {
        JSON.stringify(obj);
      } catch (e) {
        ok(false, 'meta should not fail JSON.stringify');
      }
    }
  });
}

})();

(function() {
var tryCount, catchCount, finalizeCount, tryable, catchable, finalizer, error,
tryableResult, catchableResult, finalizerResult;

module("Ember.tryFinally", {
  setup: function() {
    error = new Error('Test Error');
    tryCount = 0;
    finalizeCount = 0;
    catchCount = 0;
    tryableResult = 'tryable return value';
    catchableResult = 'catchable return value';
    finalizerResult = undefined;

    tryable   = function() { tryCount++;      return tryableResult;   };
    catchable = function() { catchCount++;    return catchableResult; };
    finalizer = function() { finalizeCount++; return finalizerResult; };
  },

  teardown: function() {
    tryCount = catchCount, finalizeCount = tryable = catchable = finalizer =
    finalizeCount =tryableResult = null;
  }
});

function callTryCatchFinallyWithError() {
  var errorWasThrown;
  try {
    Ember.tryCatchFinally(tryable, catchable, finalizer);
  } catch(e) {
    errorWasThrown = true;
    equal(e, error, 'correct error was thrown');
  }

  equal(errorWasThrown, true,  'error was thrown');
}

test("no failure", function() {
  equal(Ember.tryCatchFinally(tryable, catchable, finalizer), tryableResult, 'correct return value');

  equal(tryCount,      1, 'tryable was called once');
  equal(catchCount,    0, 'catchable was never called');
  equal(finalizeCount, 1, 'finalize was called once');
});

test("no failure, return from finally", function() {
  finalizerResult = 'finalizer return value';

  equal(Ember.tryCatchFinally(tryable, catchable, finalizer), finalizerResult, 'correct return value');

  equal(tryCount,      1, 'tryable was called once');
  equal(catchCount,    0, 'catchable was never called');
  equal(finalizeCount, 1, 'finalize was called once');
});

test("try failed", function() {
  tryable = function() { tryCount++; throw error; };

  var result = Ember.tryCatchFinally(tryable, catchable, finalizer);

  equal(result, catchableResult, 'correct return value');

  equal(tryCount,      1, 'tryable was called once');
  equal(catchCount,    1, 'catchable was called once');
  equal(finalizeCount, 1, 'finalize was called once');
});

test("catch failed", function() {
  catchable = function() { catchCount++; throw error; };

  Ember.tryCatchFinally(tryable, catchable, finalizer);

  equal(tryCount,      1, 'tryable was called once');
  equal(catchCount,    0, 'catchable was called once');
  equal(finalizeCount, 1, 'finalize was called once');
});

test("try and catch failed", function() {
  tryable = function() { tryCount++; throw error; };
  catchable = function() { catchCount++; throw error; };

  callTryCatchFinallyWithError();

  equal(tryCount,      1, 'tryable was called once');
  equal(catchCount,    1, 'catchable was called once');
  equal(finalizeCount, 1, 'finalize was called once');
});

test("finally failed", function() {
  finalizer = function() { finalizeCount++; throw error; };

  callTryCatchFinallyWithError();

  equal(tryCount,      1, 'tryable was called once');
  equal(catchCount,    0, 'catchable was never called');
  equal(finalizeCount, 1, 'finalize was called once');
});

test("finally and try failed", function() {
  tryable   = function() { tryCount++;      throw error; };
  finalizer = function() { finalizeCount++; throw error; };

  callTryCatchFinallyWithError();

  equal(tryCount,      1, 'tryable was called once');
  equal(catchCount,    1, 'catchable was called once');
  equal(finalizeCount, 1, 'finalize was called once');
});

test("finally, catch and try failed", function() {
  tryable   = function() { tryCount++;      throw error; };
  catchable = function() { catchCount++; throw error; };
  finalizer = function() { finalizeCount++; throw error; };

  callTryCatchFinallyWithError();

  equal(tryCount,      1, 'tryable was called once');
  equal(catchCount,    1, 'catchable was called once');
  equal(finalizeCount, 1, 'finalize was called once');
});

})();

(function() {
var tryCount, finalizeCount, tryable, finalizer, error, tryableResult, finalizerResult;

module("Ember.tryFinally", {
  setup: function() {
    error = new Error('Test Error');
    tryCount = 0;
    finalizeCount = 0;
    tryableResult = 'tryable return value';
    finalizerResult = undefined;

    tryable   = function() { tryCount++;      return tryableResult;   };
    finalizer = function() { finalizeCount++; return finalizerResult; };
  },

  teardown: function() {
    tryCount = finalizeCount = tryable = finalizer = finalizeCount, tryableResult = null;
  }
});

function callTryFinallyWithError() {
  var errorWasThrown;
  try {
    Ember.tryFinally(tryable, finalizer);
  } catch(e) {
    errorWasThrown = true;
    equal(e, error, 'correct error was thrown');
  }

  equal(errorWasThrown, true,  'error was thrown');
}

test("no failure", function() {
  equal(Ember.tryFinally(tryable, finalizer), tryableResult, 'correct return value');

  equal(tryCount,      1, 'tryable was called once');
  equal(finalizeCount, 1, 'finalize was called once');
});

test("no failure, return from finally", function() {
  finalizerResult = 'finalizer return value';

  equal(Ember.tryFinally(tryable, finalizer), finalizerResult, 'crrect return value');

  equal(tryCount,      1, 'tryable was called once');
  equal(finalizeCount, 1, 'finalize was called once');
});

test("try failed", function() {
  tryable = function() { tryCount++; throw error; };

  callTryFinallyWithError();

  equal(tryCount,      1, 'tryable was called once');
  equal(finalizeCount, 1, 'finalize was called once');
});

test("finally failed", function() {
  finalizer = function() { finalizeCount++; throw error; };

  callTryFinallyWithError();

  equal(tryCount,      1, 'tryable was called once');
  equal(finalizeCount, 1, 'finalize was called once');
});

test("finally and try failed", function() {
  tryable   = function() { tryCount++;      throw error; };
  finalizer = function() { finalizeCount++; throw error; };

  callTryFinallyWithError();

  equal(tryCount,      1, 'tryable was called once');
  equal(finalizeCount, 1, 'finalize was called once');
});

})();

(function() {
var obj;

module("Ember.tryInvoke", {
  setup: function() {
    obj = {
      aMethodThatExists: function() { return true; },
      aMethodThatTakesArguments: function(arg1, arg2) { return arg1 === arg2; }
    };
  },

  teardown: function() {
    obj = undefined;
  }
});

test("should return undefined when the object doesn't exist", function() {
  equal(Ember.tryInvoke(undefined, 'aMethodThatDoesNotExist'), undefined);
});

test("should return undefined when asked to perform a method that doesn't exist on the object", function() {
  equal(Ember.tryInvoke(obj, 'aMethodThatDoesNotExist'), undefined);
});

test("should return what the method returns when asked to perform a method that exists on the object", function() {
  equal(Ember.tryInvoke(obj, 'aMethodThatExists'), true);
});

test("should return what the method returns when asked to perform a method that takes arguments and exists on the object", function() {
  equal(Ember.tryInvoke(obj, 'aMethodThatTakesArguments', [true, true]), true);
});

})();

(function() {
module("Ember Type Checking");

test("Ember.typeOf", function() {
  var MockedDate = function() { };
  MockedDate.prototype = new Date();

  var mockedDate  = new MockedDate(),
      date        = new Date(),
      error       = new Error('boum'),
      object      = {a: 'b'};

  equal( Ember.typeOf(),            'undefined',  "undefined");
  equal( Ember.typeOf(null),        'null',       "null");
  equal( Ember.typeOf('Cyril'),     'string',     "Cyril");
  equal( Ember.typeOf(101),         'number',     "101");
  equal( Ember.typeOf(true),        'boolean',    "true");
  equal( Ember.typeOf([1,2,90]),    'array',      "[1,2,90]");
  equal( Ember.typeOf(/abc/),       'regexp',     "/abc/");
  equal( Ember.typeOf(date),        'date',       "new Date()");
  equal( Ember.typeOf(mockedDate),  'date',       "mocked date");
  equal( Ember.typeOf(error),       'error',      "error");
  equal( Ember.typeOf(object),      'object',     "object");

  if(Ember.Object) {
    var klass       = Ember.Object.extend(),
        instance    = Ember.Object.create();

    equal( Ember.typeOf(klass),     'class',      "class");
    equal( Ember.typeOf(instance),  'instance',   "instance");
  }
});

})();

(function() {
module('Ember.isWatching');

var testObserver = function(setup, teardown, key) {
  var obj = {}, fn = function() {};
  key = key || 'foo';

  equal(Ember.isWatching(obj, key), false, "precond - isWatching is false by default");
  setup(obj, key, fn);
  equal(Ember.isWatching(obj, key), true, "isWatching is true when observers are added");
  teardown(obj, key, fn);
  equal(Ember.isWatching(obj, key), false, "isWatching is false after observers are removed");
};

test("isWatching is true for regular local observers", function() {
  testObserver(function(obj, key, fn) {
    Ember.Mixin.create({
      didChange: Ember.observer(key, fn)
    }).apply(obj);
  }, function(obj, key, fn) {
    Ember.removeObserver(obj, key, obj, fn);
  });
});

test("isWatching is true for nonlocal observers", function() {
  testObserver(function(obj, key, fn) {
    Ember.addObserver(obj, key, obj, fn);
  }, function(obj, key, fn) {
    Ember.removeObserver(obj, key, obj, fn);
  });
});

test("isWatching is true for chained observers", function() {
  testObserver(function(obj, key, fn) {
    Ember.addObserver(obj, key + '.bar', obj, fn);
  }, function(obj, key, fn) {
    Ember.removeObserver(obj, key + '.bar', obj, fn);
  });
});

test("isWatching is true for computed properties", function() {
  testObserver(function(obj, key, fn) {
    Ember.defineProperty(obj, 'computed', Ember.computed(fn).property(key));
    Ember.get(obj, 'computed');
  }, function(obj, key, fn) {
    Ember.defineProperty(obj, 'computed', null);
  });
});

test("isWatching is true for chained computed properties", function() {
  testObserver(function(obj, key, fn) {
    Ember.defineProperty(obj, 'computed', Ember.computed(fn).property(key + '.bar'));
    Ember.get(obj, 'computed');
  }, function(obj, key, fn) {
    Ember.defineProperty(obj, 'computed', null);
  });
});

// can't watch length on Array - it is special...
// But you should be able to watch a length property of an object
test("isWatching is true for 'length' property on object", function() {
  testObserver(function(obj, key, fn) {
    Ember.defineProperty(obj, 'length', null, '26.2 miles');
    Ember.addObserver(obj, 'length', obj, fn);
  }, function(obj, key, fn) {
    Ember.removeObserver(obj, 'length', obj, fn);
  }, 'length');
});

})();

(function() {
/*globals testBoth */

require('ember-metal/~tests/props_helper');

var willCount = 0 , didCount = 0,
    willChange = Ember.propertyWillChange,
    didChange = Ember.propertyDidChange;

module('Ember.unwatch', {
  setup: function() {
    willCount = didCount = 0;
    Ember.propertyWillChange = function(cur, keyName) {
      willCount++;
      willChange.call(this, cur, keyName);
    };

    Ember.propertyDidChange = function(cur, keyName) {
      didCount++;
      didChange.call(this, cur, keyName);
    };
  },

  teardown: function() {
    Ember.propertyWillChange = willChange;
    Ember.propertyDidChange  = didChange;
  }
});

testBoth('unwatching a computed property - regular get/set', function(get, set) {

  var obj = {};
  Ember.defineProperty(obj, 'foo', Ember.computed(function(keyName, value) {
    if (value !== undefined) this.__foo = value;
    return this.__foo;
  }));

  Ember.watch(obj, 'foo');
  set(obj, 'foo', 'bar');
  equal(willCount, 1, 'should have invoked willCount');
  equal(didCount, 1, 'should have invoked didCount');

  Ember.unwatch(obj, 'foo');
  willCount = didCount = 0;
  set(obj, 'foo', 'BAZ');
  equal(willCount, 0, 'should NOT have invoked willCount');
  equal(didCount, 0, 'should NOT have invoked didCount');
});


testBoth('unwatching a regular property - regular get/set', function(get, set) {

  var obj = { foo: 'BIFF' };

  Ember.watch(obj, 'foo');
  set(obj, 'foo', 'bar');
  equal(willCount, 1, 'should have invoked willCount');
  equal(didCount, 1, 'should have invoked didCount');

  Ember.unwatch(obj, 'foo');
  willCount = didCount = 0;
  set(obj, 'foo', 'BAZ');
  equal(willCount, 0, 'should NOT have invoked willCount');
  equal(didCount, 0, 'should NOT have invoked didCount');
});

test('unwatching should be nested', function() {

  var obj = { foo: 'BIFF' };

  Ember.watch(obj, 'foo');
  Ember.watch(obj, 'foo');
  Ember.set(obj, 'foo', 'bar');
  equal(willCount, 1, 'should have invoked willCount');
  equal(didCount, 1, 'should have invoked didCount');

  Ember.unwatch(obj, 'foo');
  willCount = didCount = 0;
  Ember.set(obj, 'foo', 'BAZ');
  equal(willCount, 1, 'should NOT have invoked willCount');
  equal(didCount, 1, 'should NOT have invoked didCount');

  Ember.unwatch(obj, 'foo');
  willCount = didCount = 0;
  Ember.set(obj, 'foo', 'BAZ');
  equal(willCount, 0, 'should NOT have invoked willCount');
  equal(didCount, 0, 'should NOT have invoked didCount');
});

testBoth('unwatching "length" property on an object', function(get, set) {

  var obj = { foo: 'RUN' };

  // Can watch length when it is undefined
  Ember.watch(obj, 'length');
  set(obj, 'length', '10k');
  equal(willCount, 1, 'should have invoked willCount');
  equal(didCount, 1, 'should have invoked didCount');

  // Should stop watching despite length now being defined (making object 'array-like')
  Ember.unwatch(obj, 'length');
  willCount = didCount = 0;
  set(obj, 'length', '5k');
  equal(willCount, 0, 'should NOT have invoked willCount');
  equal(didCount, 0, 'should NOT have invoked didCount');

});

})();

(function() {
/*globals Global:true */

require('ember-metal/~tests/props_helper');

var willCount, didCount,
    willKeys, didKeys,
    indexOf = Ember.EnumerableUtils.indexOf;

module('Ember.watch', {
  setup: function() {
    willCount = didCount = 0;
    willKeys = [];
    didKeys = [];
  }
});

function addListeners(obj, keyPath) {
  Ember.addListener(obj, keyPath + ':before', function() {
    willCount++;
    willKeys.push(keyPath);
  });
  Ember.addListener(obj, keyPath + ':change', function() {
    didCount++;
    didKeys.push(keyPath);
  });
}

testBoth('watching a computed property', function(get, set) {

  var obj = {};
  Ember.defineProperty(obj, 'foo', Ember.computed(function(keyName, value) {
    if (value !== undefined) this.__foo = value;
    return this.__foo;
  }));
  addListeners(obj, 'foo');

  Ember.watch(obj, 'foo');
  set(obj, 'foo', 'bar');
  equal(willCount, 1, 'should have invoked willCount');
  equal(didCount, 1, 'should have invoked didCount');
});

testBoth('watching a regular defined property', function(get, set) {

  var obj = { foo: 'baz' };
  addListeners(obj, 'foo');

  Ember.watch(obj, 'foo');
  equal(get(obj, 'foo'), 'baz', 'should have original prop');

  set(obj, 'foo', 'bar');
  equal(willCount, 1, 'should have invoked willCount');
  equal(didCount, 1, 'should have invoked didCount');

  equal(get(obj, 'foo'), 'bar', 'should get new value');
  equal(obj.foo, 'bar', 'property should be accessible on obj');
});

testBoth('watching a regular undefined property', function(get, set) {

  var obj = { };
  addListeners(obj, 'foo');

  Ember.watch(obj, 'foo');

  equal('foo' in obj, false, 'precond undefined');

  set(obj, 'foo', 'bar');

  equal(willCount, 1, 'should have invoked willCount');
  equal(didCount, 1, 'should have invoked didCount');

  equal(get(obj, 'foo'), 'bar', 'should get new value');
  equal(obj.foo, 'bar', 'property should be accessible on obj');
});

testBoth('watches should inherit', function(get, set) {

  var obj = { foo: 'baz' };
  var objB = Ember.create(obj);

  addListeners(obj, 'foo');
  Ember.watch(obj, 'foo');
  equal(get(obj, 'foo'), 'baz', 'should have original prop');

  set(obj, 'foo', 'bar');
  set(objB, 'foo', 'baz');
  equal(willCount, 2, 'should have invoked willCount once only');
  equal(didCount, 2, 'should have invoked didCount once only');
});

test("watching an object THEN defining it should work also", function() {

  var obj = {};
  addListeners(obj, 'foo');

  Ember.watch(obj, 'foo');

  Ember.defineProperty(obj, 'foo');
  Ember.set(obj, 'foo', 'bar');

  equal(Ember.get(obj, 'foo'), 'bar', 'should have set');
  equal(willCount, 1, 'should have invoked willChange once');
  equal(didCount, 1, 'should have invoked didChange once');

});

test("watching a chain then defining the property", function () {
  var obj = {};
  var foo = {bar: 'bar'};
  addListeners(obj, 'foo.bar');
  addListeners(foo, 'bar');

  Ember.watch(obj, 'foo.bar');

  Ember.defineProperty(obj, 'foo', undefined, foo);
  Ember.set(foo, 'bar', 'baz');

  deepEqual(willKeys, ['foo.bar', 'bar'], 'should have invoked willChange with bar, foo.bar');
  deepEqual(didKeys, ['foo.bar', 'bar'], 'should have invoked didChange with bar, foo.bar');
  equal(willCount, 2, 'should have invoked willChange twice');
  equal(didCount, 2, 'should have invoked didChange twice');
});

test("watching a chain then defining the nested property", function () {
  var bar = {};
  var obj = {foo: bar};
  var baz = {baz: 'baz'};
  addListeners(obj, 'foo.bar.baz');
  addListeners(baz, 'baz');

  Ember.watch(obj, 'foo.bar.baz');

  Ember.defineProperty(bar, 'bar', undefined, baz);
  Ember.set(baz, 'baz', 'BOO');

  deepEqual(willKeys, ['foo.bar.baz', 'baz'], 'should have invoked willChange with bar, foo.bar');
  deepEqual(didKeys, ['foo.bar.baz', 'baz'], 'should have invoked didChange with bar, foo.bar');
  equal(willCount, 2, 'should have invoked willChange twice');
  equal(didCount, 2, 'should have invoked didChange twice');
});

testBoth('watching an object value then unwatching should restore old value', function(get, set) {

  var obj = { foo: { bar: { baz: { biff: 'BIFF' } } } };
  addListeners(obj, 'foo.bar.baz.biff');

  Ember.watch(obj, 'foo.bar.baz.biff');

  var foo = Ember.get(obj, 'foo');
  equal(get(get(get(foo, 'bar'), 'baz'), 'biff'), 'BIFF', 'biff should exist');

  Ember.unwatch(obj, 'foo.bar.baz.biff');
  equal(get(get(get(foo, 'bar'), 'baz'), 'biff'), 'BIFF', 'biff should exist');
});

testBoth('watching a global object that does not yet exist should queue', function(get, set) {
  Global = null;

  var obj = {};
  addListeners(obj, 'Global.foo');

  Ember.watch(obj, 'Global.foo'); // only works on global chained props

  equal(willCount, 0, 'should not have fired yet');
  equal(didCount, 0, 'should not have fired yet');

  Global = { foo: 'bar' };
  addListeners(Global, 'foo');

  Ember.watch.flushPending(); // this will also be invoked automatically on ready

  equal(willCount, 0, 'should not have fired yet');
  equal(didCount, 0, 'should not have fired yet');

  set(Global, 'foo', 'baz');

  // should fire twice because this is a chained property (once on key, once
  // on path)
  equal(willCount, 2, 'should be watching');
  equal(didCount, 2, 'should be watching');

  Global = null; // reset
});

test('when watching a global object, destroy should remove chain watchers from the global object', function() {

  Global = { foo: 'bar' };
  var obj = {};
  addListeners(obj, 'Global.foo');

  Ember.watch(obj, 'Global.foo');

  var meta_Global = Ember.meta(Global);
  var chainNode = Ember.meta(obj).chains._chains.Global._chains.foo;
  var index = indexOf(meta_Global.chainWatchers.foo, chainNode);

  equal(meta_Global.watching.foo, 1, 'should be watching foo');
  strictEqual(meta_Global.chainWatchers.foo[index], chainNode, 'should have chain watcher');

  Ember.destroy(obj);

  index = indexOf(meta_Global.chainWatchers.foo, chainNode);
  equal(meta_Global.watching.foo, 0, 'should not be watching foo');
  equal(index, -1, 'should not have chain watcher');

  Global = null; // reset
});

test('when watching another object, destroy should remove chain watchers from the other object', function() {

  var objA = {};
  var objB = {foo: 'bar'};
  objA.b = objB;
  addListeners(objA, 'b.foo');

  Ember.watch(objA, 'b.foo');

  var meta_objB = Ember.meta(objB);
  var chainNode = Ember.meta(objA).chains._chains.b._chains.foo;
  var index = indexOf(meta_objB.chainWatchers.foo, chainNode);

  equal(meta_objB.watching.foo, 1, 'should be watching foo');
  strictEqual(meta_objB.chainWatchers.foo[index], chainNode, 'should have chain watcher');

  Ember.destroy(objA);

  index = indexOf(meta_objB.chainWatchers.foo, chainNode);
  equal(meta_objB.watching.foo, 0, 'should not be watching foo');
  equal(index, -1, 'should not have chain watcher');
});

// TESTS for length property

testBoth('watching "length" property on an object', function(get, set) {

  var obj = { length: '26.2 miles' };
  addListeners(obj, 'length');

  Ember.watch(obj, 'length');
  equal(get(obj, 'length'), '26.2 miles', 'should have original prop');

  set(obj, 'length', '10k');
  equal(willCount, 1, 'should have invoked willCount');
  equal(didCount, 1, 'should have invoked didCount');

  equal(get(obj, 'length'), '10k', 'should get new value');
  equal(obj.length, '10k', 'property should be accessible on obj');
});

testBoth('watching "length" property on an array', function(get, set) {

  var arr = [];
  addListeners(arr, 'length');

  Ember.watch(arr, 'length');
  equal(get(arr, 'length'), 0, 'should have original prop');

  set(arr, 'length', '10');
  equal(willCount, 0, 'should NOT have invoked willCount');
  equal(didCount, 0, 'should NOT have invoked didCount');

  equal(get(arr, 'length'), 10, 'should get new value');
  equal(arr.length, 10, 'property should be accessible on arr');
});

})();

