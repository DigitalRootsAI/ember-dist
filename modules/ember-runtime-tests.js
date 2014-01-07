(function() {
var map = Ember.EnumerableUtils.map,
    a_forEach = Ember.ArrayPolyfills.forEach,
    get = Ember.get,
    set = Ember.set,
    setProperties = Ember.setProperties,
    ObjectProxy = Ember.ObjectProxy,
    obj, sorted, sortProps, items, userFnCalls, todos, filtered;

module('Ember.computed.map', {
  setup: function() {
    Ember.run(function() {
      userFnCalls = 0;
      obj = Ember.Object.createWithMixins({
        array: Ember.A([{ v: 1 }, { v: 3}, { v: 2 }, { v: 1 }]),

        mapped: Ember.computed.map('array.@each.v', function(item) {
          ++userFnCalls;
          return item.v;
        }),

        arrayObjects: Ember.A([
          Ember.Object.create({ v: { name: 'Robert' }}),
          Ember.Object.create({ v: { name: 'Leanna' }})]),
        mappedObjects: Ember.computed.map('arrayObjects.@each.v', function (item) {
          return {
            name: item.v.name
          };
        })
      });
    });
  },
  teardown: function() {
    Ember.run(function() {
      obj.destroy();
    });
  }
});

test("it maps simple properties", function() {
  deepEqual(get(obj, 'mapped'), [1, 3, 2, 1]);

  Ember.run(function() {
    obj.get('array').pushObject({ v: 5 });
  });

  deepEqual(get(obj, 'mapped'), [1, 3, 2, 1, 5]);

  Ember.run(function() {
    obj.get('array').removeAt(3);
  });

  deepEqual(get(obj, 'mapped'), [1, 3, 2, 5]);
});

test("it caches properly", function() {
  var array = get(obj, 'array'),
      mapped = get(obj, 'mapped');

  equal(userFnCalls, 4, "precond - mapper called expected number of times");

  Ember.run(function() {
    array.addObject({v: 7});
  });

  equal(userFnCalls, 5, "precond - mapper called expected number of times");

  get(obj, 'mapped');

  equal(userFnCalls, 5, "Ember.computed.map caches properly");
});

test("it maps simple unshifted properties", function() {
  var array = Ember.A([]);

  Ember.run(function() {
    obj = Ember.Object.createWithMixins({
      array: array,
      mapped: Ember.computed.map('array', function (item) { return item.toUpperCase(); })
    });
    get(obj, 'mapped');
  });

  Ember.run(function() {
    array.unshiftObject('c');
    array.unshiftObject('b');
    array.unshiftObject('a');

    array.popObject();
  });

  deepEqual(get(obj, 'mapped'), ['A', 'B'], "properties unshifted in sequence are mapped correctly");
});

test("it maps objects", function() {
  deepEqual(get(obj, 'mappedObjects'), [{ name: 'Robert'}, { name: 'Leanna' }]);

  Ember.run(function() {
    obj.get('arrayObjects').pushObject({ v: { name: 'Eddard' }});
  });

  deepEqual(get(obj, 'mappedObjects'), [{ name: 'Robert' }, { name: 'Leanna' }, { name: 'Eddard' }]);

  Ember.run(function() {
    obj.get('arrayObjects').removeAt(1);
  });

  deepEqual(get(obj, 'mappedObjects'), [{ name: 'Robert' }, { name: 'Eddard' }]);

  Ember.run(function() {
    obj.get('arrayObjects').objectAt(0).set('v', { name: 'Stannis' });
  });

  deepEqual(get(obj, 'mappedObjects'), [{ name: 'Stannis' }, { name: 'Eddard' }]);
});

test("it maps unshifted objects with property observers", function() {
  var array = Ember.A([]),
      cObj = { v: 'c' };

  Ember.run(function() {
    obj = Ember.Object.createWithMixins({
      array: array,
      mapped: Ember.computed.map('array.@each.v', function (item) {
        return get(item, 'v').toUpperCase();
      })
    });
    get(obj, 'mapped');
  });

  Ember.run(function() {
    array.unshiftObject(cObj);
    array.unshiftObject({ v: 'b' });
    array.unshiftObject({ v: 'a' });

    set(cObj, 'v', 'd');
  });

  deepEqual(array.mapBy('v'), ['a', 'b', 'd'], "precond - unmapped array is correct");
  deepEqual(get(obj, 'mapped'), ['A', 'B', 'D'], "properties unshifted in sequence are mapped correctly");
});

module('Ember.computed.mapBy', {
  setup: function() {
    Ember.run(function() {
      obj = Ember.Object.createWithMixins({
        array: Ember.A([{ v: 1 }, { v: 3}, { v: 2 }, { v: 1 }]),
        mapped: Ember.computed.mapBy('array', 'v')
      });
    });
  },
  teardown: function() {
    Ember.run(function() {
      obj.destroy();
    });
  }
});

test("it maps properties", function() {
  var mapped = get(obj, 'mapped');

  deepEqual(get(obj, 'mapped'), [1, 3, 2, 1]);

  Ember.run(function() {
    obj.get('array').pushObject({ v: 5 });
  });

  deepEqual(get(obj, 'mapped'), [1, 3, 2, 1, 5]);

  Ember.run(function() {
    obj.get('array').removeAt(3);
  });

  deepEqual(get(obj, 'mapped'), [1, 3, 2, 5]);
});

test("it is observerable", function() {
  var mapped = get(obj, 'mapped'),
      calls = 0;

  deepEqual(get(obj, 'mapped'), [1, 3, 2, 1]);

  Ember.addObserver(obj, 'mapped.@each', function() {
    calls++;
  });

  Ember.run(function() {
    obj.get('array').pushObject({ v: 5 });
  });

  equal(calls, 1, 'Ember.computed.mapBy is observerable');
});


module('Ember.computed.filter', {
  setup: function() {
    Ember.run(function() {
      userFnCalls = 0;
      obj = Ember.Object.createWithMixins({
        array: Ember.A([1, 2, 3, 4, 5, 6, 7, 8]),
        filtered: Ember.computed.filter('array', function(item) {
          ++userFnCalls;
          return item % 2 === 0;
        })
      });
    });
  },
  teardown: function() {
    Ember.run(function() {
      obj.destroy();
    });
  }
});

test("it filters according to the specified filter function", function() {
  var filtered = get(obj, 'filtered');

  deepEqual(filtered, [2,4,6,8], "Ember.computed.filter filters by the specified function");
});

test("it caches properly", function() {
  var array = get(obj, 'array'),
      filtered = get(obj, 'filtered');

  equal(userFnCalls, 8, "precond - filter called expected number of times");

  Ember.run(function() {
    array.addObject(11);
  });

  equal(userFnCalls, 9, "precond - filter called expected number of times");

  get(obj, 'filtered');

  equal(userFnCalls, 9, "Ember.computed.filter caches properly");
});

test("it updates as the array is modified", function() {
  var array = get(obj, 'array'),
      filtered = get(obj, 'filtered');

  deepEqual(filtered, [2,4,6,8], "precond - filtered array is initially correct");

  Ember.run(function() {
    array.addObject(11);
  });
  deepEqual(filtered, [2,4,6,8], "objects not passing the filter are not added");

  Ember.run(function() {
    array.addObject(12);
  });
  deepEqual(filtered, [2,4,6,8,12], "objects passing the filter are added");

  Ember.run(function() {
    array.removeObject(3);
    array.removeObject(4);
  });
  deepEqual(filtered, [2,6,8,12], "objects removed from the dependent array are removed from the computed array");
});

test("the dependent array can be cleared one at a time", function() {
  var array = get(obj, 'array'),
      filtered = get(obj, 'filtered');

  deepEqual(filtered, [2,4,6,8], "precond - filtered array is initially correct");

  Ember.run(function() {
    // clear 1-8 but in a random order
    array.removeObject(3);
    array.removeObject(1);
    array.removeObject(2);
    array.removeObject(4);
    array.removeObject(8);
    array.removeObject(6);
    array.removeObject(5);
    array.removeObject(7);
  });

  deepEqual(filtered, [], "filtered array cleared correctly");
});

test("the dependent array can be `clear`ed directly (#3272)", function() {
  var array = get(obj, 'array'),
      filtered = get(obj, 'filtered');

  deepEqual(filtered, [2,4,6,8], "precond - filtered array is initially correct");

  Ember.run(function() {
    array.clear();
  });

  deepEqual(filtered, [], "filtered array cleared correctly");
});

test("it updates as the array is replaced", function() {
  var array = get(obj, 'array'),
      filtered = get(obj, 'filtered');

  deepEqual(filtered, [2,4,6,8], "precond - filtered array is initially correct");

  Ember.run(function() {
    set(obj, 'array', Ember.A([20,21,22,23,24]));
  });
  deepEqual(filtered, [20,22,24], "computed array is updated when array is changed");
});

module('Ember.computed.filterBy', {
  setup: function() {
    obj = Ember.Object.createWithMixins({
      array: Ember.A([
        {name: "one", a:1, b:false},
        {name: "two", a:2, b:false},
        {name: "three", a:1, b:true},
        {name: "four", b:true}
      ]),
      a1s: Ember.computed.filterBy('array', 'a', 1),
      as: Ember.computed.filterBy('array', 'a'),
      bs: Ember.computed.filterBy('array', 'b')
    });
  },
  teardown: function() {
    Ember.run(function() {
      obj.destroy();
    });
  }
});

test("properties can be filtered by truthiness", function() {
  var array = get(obj, 'array'),
      as = get(obj, 'as'),
      bs = get(obj, 'bs');

  deepEqual(as.mapBy('name'), ['one', 'two', 'three'], "properties can be filtered by existence");
  deepEqual(bs.mapBy('name'), ['three', 'four'], "booleans can be filtered");

  Ember.run(function() {
    set(array.objectAt(0), 'a', undefined);
    set(array.objectAt(3), 'a', true);

    set(array.objectAt(0), 'b', true);
    set(array.objectAt(3), 'b', false);
  });
  deepEqual(as.mapBy('name'), ['two', 'three', 'four'], "arrays computed by filter property respond to property changes");
  deepEqual(bs.mapBy('name'), ['one', 'three'], "arrays computed by filtered property respond to property changes");

  Ember.run(function() {
    array.pushObject({name:"five", a:6, b:true});
  });
  deepEqual(as.mapBy('name'), ['two', 'three', 'four', 'five'], "arrays computed by filter property respond to added objects");
  deepEqual(bs.mapBy('name'), ['one', 'three', 'five'], "arrays computed by filtered property respond to added objects");

  Ember.run(function() {
    array.popObject();
  });
  deepEqual(as.mapBy('name'), ['two', 'three', 'four'], "arrays computed by filter property respond to removed objects");
  deepEqual(bs.mapBy('name'), ['one', 'three'], "arrays computed by filtered property respond to removed objects");

  Ember.run(function() {
    set(obj, 'array', Ember.A([{name: "six", a:12, b:true}]));
  });
  deepEqual(as.mapBy('name'), ['six'], "arrays computed by filter property respond to array changes");
  deepEqual(bs.mapBy('name'), ['six'], "arrays computed by filtered property respond to array changes");
});

test("properties can be filtered by values", function() {
  var array = get(obj, 'array'),
      a1s = get(obj, 'a1s');

  deepEqual(a1s.mapBy('name'), ['one', 'three'], "properties can be filtered by matching value");

  Ember.run(function() {
    array.pushObject({ name: "five", a:1 });
  });
  deepEqual(a1s.mapBy('name'), ['one', 'three', 'five'], "arrays computed by matching value respond to added objects");

  Ember.run(function() {
    array.popObject();
  });
  deepEqual(a1s.mapBy('name'), ['one', 'three'], "arrays computed by matching value respond to removed objects");

  Ember.run(function() {
    set(array.objectAt(1), 'a', 1);
    set(array.objectAt(2), 'a', 2);
  });
  deepEqual(a1s.mapBy('name'), ['one', 'two'], "arrays computed by matching value respond to modified properties");
});

a_forEach.call(['uniq', 'union'], function (alias) {
  module('Ember.computed.' + alias, {
    setup: function() {
      Ember.run(function() {
        obj = Ember.Object.createWithMixins({
          array: Ember.A([1,2,3,4,5,6]),
          array2: Ember.A([4,5,6,7,8,9,4,5,6,7,8,9]),
          array3: Ember.A([1,8,10]),
          union: Ember.computed[alias]('array', 'array2', 'array3')
        });
      });
    },
    teardown: function() {
      Ember.run(function() {
        obj.destroy();
      });
    }
  });

  test("does not include duplicates", function() {
    var array = get(obj, 'array'),
        array2 = get(obj, 'array2'),
        array3 = get(obj, 'array3'),
        union = get(obj, 'union');

    deepEqual(union, [1,2,3,4,5,6,7,8,9,10], alias + " does not include duplicates");

    Ember.run(function() {
      array.pushObject(8);
    });

    deepEqual(union, [1,2,3,4,5,6,7,8,9,10], alias + " does not add existing items");

    Ember.run(function() {
      array.pushObject(11);
    });

    deepEqual(union, [1,2,3,4,5,6,7,8,9,10,11], alias + " adds new items");

    Ember.run(function() {
      array2.removeAt(6); // remove 7
    });

    deepEqual(union, [1,2,3,4,5,6,7,8,9,10,11], alias + " does not remove items that are still in the dependent array");

    Ember.run(function() {
      array2.removeObject(7);
    });

    deepEqual(union, [1,2,3,4,5,6,8,9,10,11], alias + " removes items when their last instance is gone");
  });

  test("has set-union semantics", function() {
    var array = get(obj, 'array'),
        array2 = get(obj, 'array2'),
        array3 = get(obj, 'array3'),
        union = get(obj, 'union');

    deepEqual(union, [1,2,3,4,5,6,7,8,9,10], alias + " is initially correct");

    Ember.run(function() {
      array.removeObject(6);
    });

    deepEqual(union, [1,2,3,4,5,6,7,8,9,10], "objects are not removed if they exist in other dependent arrays");

    Ember.run(function() {
      array.clear();
    });

    deepEqual(union, [1,4,5,6,7,8,9,10], "objects are removed when they are no longer in any dependent array");
  });
});

module('Ember.computed.intersect', {
  setup: function() {
    Ember.run(function() {
      obj = Ember.Object.createWithMixins({
        array: Ember.A([1,2,3,4,5,6]),
        array2: Ember.A([3,3,3,4,5]),
        array3: Ember.A([3,5,6,7,8]),
        intersection: Ember.computed.intersect('array', 'array2', 'array3')
      });
    });
  },
  teardown: function() {
    Ember.run(function() {
      obj.destroy();
    });
  }
});

test("it has set-intersection semantics", function() {
  var array = get(obj, 'array'),
      array2 = get(obj, 'array2'),
      array3 = get(obj, 'array3'),
      intersection = get(obj, 'intersection');

  deepEqual(intersection, [3,5], "intersection is initially correct");

  Ember.run(function() {
    array2.shiftObject();
  });
  deepEqual(intersection, [3,5], "objects are not removed when they are still in all dependent arrays");

  Ember.run(function() {
    array2.shiftObject();
  });
  deepEqual(intersection, [3,5], "objects are not removed when they are still in all dependent arrays");

  Ember.run(function() {
    array2.shiftObject();
  });
  deepEqual(intersection, [5], "objects are removed once they are gone from all dependent arrays");

  Ember.run(function() {
    array2.pushObject(1);
  });
  deepEqual(intersection, [5], "objects are not added as long as they are missing from any dependent array");

  Ember.run(function() {
    array3.pushObject(1);
  });
  deepEqual(intersection, [5,1], "objects added once they belong to all dependent arrays");
});


module('Ember.computed.setDiff', {
  setup: function() {
    Ember.run(function() {
      obj = Ember.Object.createWithMixins({
        array: Ember.A([1,2,3,4,5,6,7]),
        array2: Ember.A([3,4,5,10]),
        diff: Ember.computed.setDiff('array', 'array2')
      });
    });
  },
  teardown: function() {
    Ember.run(function() {
      obj.destroy();
    });
  }
});

test("it throws an error if given fewer or more than two dependent properties", function() {
  throws(function () {
    Ember.Object.createWithMixins({
        array: Ember.A([1,2,3,4,5,6,7]),
        array2: Ember.A([3,4,5]),
        diff: Ember.computed.setDiff('array')
    });
  }, /requires exactly two dependent arrays/, "setDiff requires two dependent arrays");

  throws(function () {
    Ember.Object.createWithMixins({
        array: Ember.A([1,2,3,4,5,6,7]),
        array2: Ember.A([3,4,5]),
        array3: Ember.A([7]),
        diff: Ember.computed.setDiff('array', 'array2', 'array3')
    });
  }, /requires exactly two dependent arrays/, "setDiff requires two dependent arrays");
});


test("it has set-diff semantics", function() {
  var array1 = get(obj, 'array'),
      array2 = get(obj, 'array2'),
      diff = get(obj, 'diff');

  deepEqual(diff, [1, 2, 6, 7], "set-diff is initially correct");

  Ember.run(function() {
    array2.popObject();
  });
  deepEqual(diff, [1,2,6,7], "removing objects from the remove set has no effect if the object is not in the keep set");

  Ember.run(function() {
    array2.shiftObject();
  });
  deepEqual(diff, [1, 2, 6, 7, 3], "removing objects from the remove set adds them if they're in the keep set");

  Ember.run(function() {
    array1.removeObject(3);
  });
  deepEqual(diff, [1, 2, 6, 7], "removing objects from the keep array removes them from the computed array");

  Ember.run(function() {
    array1.pushObject(5);
  });
  deepEqual(diff, [1, 2, 6, 7], "objects added to the keep array that are in the remove array are not added to the computed array");

  Ember.run(function() {
    array1.pushObject(22);
  });
  deepEqual(diff, [1, 2, 6, 7, 22], "objects added to the keep array not in the remove array are added to the computed array");
});


function commonSortTests() {
  test("arrays are initially sorted", function() {
    Ember.run(function() {
      sorted = get(obj, 'sortedItems');
    });

    deepEqual(sorted.mapBy('fname'), ['Cersei', 'Jaime', 'Bran', 'Robb'], "array is initially sorted");
  });

  test("changing the dependent array updates the sorted array", function() {
    Ember.run(function() {
      sorted = get(obj, 'sortedItems');
    });

    deepEqual(sorted.mapBy('fname'), ['Cersei', 'Jaime', 'Bran', 'Robb'], "precond - array is initially sorted");

    Ember.run(function() {
      set(obj, 'items', Ember.A([{
        fname: 'Roose', lname: 'Bolton'
      }, {
        fname: 'Theon', lname: 'Greyjoy'
      }, {
        fname: 'Ramsey', lname: 'Bolton'
      }, {
        fname: 'Stannis', lname: 'Baratheon'
      }]));
    });

    deepEqual(sorted.mapBy('fname'), ['Stannis', 'Ramsey', 'Roose', 'Theon'], "changing dependent array updates sorted array");
  });

  test("adding to the dependent array updates the sorted array", function() {
    Ember.run(function() {
      sorted = get(obj, 'sortedItems');
      items = get(obj, 'items');
    });

    deepEqual(sorted.mapBy('fname'), ['Cersei', 'Jaime', 'Bran', 'Robb'], "precond - array is initially sorted");

    Ember.run(function() {
      items.pushObject({ fname: 'Tyrion', lname: 'Lannister' });
    });

    deepEqual(sorted.mapBy('fname'), ['Cersei', 'Jaime', 'Tyrion', 'Bran', 'Robb'], "Adding to the dependent array updates the sorted array");
  });

  test("removing from the dependent array updates the sorted array", function() {
    Ember.run(function() {
      sorted = get(obj, 'sortedItems');
      items = get(obj, 'items');
    });

    deepEqual(sorted.mapBy('fname'), ['Cersei', 'Jaime', 'Bran', 'Robb'], "precond - array is initially sorted");

    Ember.run(function() {
      items.popObject();
    });

    deepEqual(sorted.mapBy('fname'), ['Cersei', 'Jaime', 'Robb'], "Removing from the dependent array updates the sorted array");
  });

  test("distinct items may be sort-equal, although their relative order will not be guaranteed", function() {
    var jaime, jaimeInDisguise;

    Ember.run(function() {
      // We recreate jaime and "Cersei" here only for test stability: we want
      // their guid-ordering to be deterministic
      jaimeInDisguise = Ember.Object.create({
        fname: 'Cersei', lname: 'Lannister', age: 34
      });
      jaime = Ember.Object.create({
        fname: 'Jaime', lname: 'Lannister', age: 34
      });
      items = get(obj, 'items');

      items.replace(0, 1, jaime);
      items.replace(1, 1, jaimeInDisguise);
      sorted = get(obj, 'sortedItems');
    });

    deepEqual(sorted.mapBy('fname'), ['Cersei', 'Jaime', 'Bran', 'Robb'], "precond - array is initially sorted");

    Ember.run(function() {
      // comparator will now return 0.
      // Apparently it wasn't a very good disguise.
      jaimeInDisguise.set('fname', 'Jaime');
    });

    deepEqual(sorted.mapBy('fname'), ['Jaime', 'Jaime', 'Bran', 'Robb'], "sorted array is updated");

    Ember.run(function() {
      // comparator will again return non-zero
      jaimeInDisguise.set('fname', 'Cersei');
    });


    deepEqual(sorted.mapBy('fname'), ['Cersei', 'Jaime', 'Bran', 'Robb'], "sorted array is updated");
  });

  test("guid sort-order fallback with a serach proxy is not confused by non-search ObjectProxys", function() {
    var tyrion = { fname: "Tyrion", lname: "Lannister" },
        tyrionInDisguise = ObjectProxy.create({
          fname: "Yollo",
          lname: "",
          content: tyrion
        });

    items = get(obj, 'items');
    sorted = get(obj, 'sortedItems');

    Ember.run(function() {
      items.pushObject(tyrion);
    });

    deepEqual(sorted.mapBy('fname'), ['Cersei', 'Jaime', 'Tyrion', 'Bran', 'Robb']);

    Ember.run(function() {
      items.pushObject(tyrionInDisguise);
    });

    deepEqual(sorted.mapBy('fname'), ['Yollo', 'Cersei', 'Jaime', 'Tyrion', 'Bran', 'Robb']);
  });
}

module('Ember.computed.sort - sortProperties', {
  setup: function() {
    Ember.run(function() {
      obj = Ember.Object.createWithMixins({
        itemSorting: Ember.A(['lname', 'fname']),
        items: Ember.A([{
          fname: "Jaime", lname: "Lannister", age: 34
        }, {
          fname: "Cersei", lname: "Lannister", age: 34
        }, {
          fname: "Robb", lname: "Stark", age: 16
        }, {
          fname: "Bran", lname: "Stark", age: 8
        }]),

        sortedItems: Ember.computed.sort('items', 'itemSorting')
      });
    });
  },
  teardown: function() {
    Ember.run(function() {
      obj.destroy();
    });
  }
});

commonSortTests();

test("updating sort properties updates the sorted array", function() {
  Ember.run(function() {
    sorted = get(obj, 'sortedItems');
  });

  deepEqual(sorted.mapBy('fname'), ['Cersei', 'Jaime', 'Bran', 'Robb'], "precond - array is initially sorted");

  Ember.run(function() {
    set(obj, 'itemSorting', Ember.A(['fname:desc']));
  });

  deepEqual(sorted.mapBy('fname'), ['Robb', 'Jaime', 'Cersei', 'Bran'], "after updating sort properties array is updated");
});

test("updating sort properties in place updates the sorted array", function() {
  Ember.run(function() {
    sorted = get(obj, 'sortedItems');
    sortProps = get(obj, 'itemSorting');
  });

  deepEqual(sorted.mapBy('fname'), ['Cersei', 'Jaime', 'Bran', 'Robb'], "precond - array is initially sorted");
  
  Ember.run(function() {
    sortProps.clear();
    sortProps.pushObject('fname');
  });

  deepEqual(sorted.mapBy('fname'), ['Bran', 'Cersei', 'Jaime', 'Robb'], "after updating sort properties array is updated");
});

test("updating new sort properties in place updates the sorted array", function() {
  Ember.run(function() {
    sorted = get(obj, 'sortedItems');
  });

  deepEqual(sorted.mapBy('fname'), ['Cersei', 'Jaime', 'Bran', 'Robb'], "precond - array is initially sorted");

  Ember.run(function() {
    set(obj, 'itemSorting', Ember.A(['age:desc', 'fname:asc']));
  });

  deepEqual(sorted.mapBy('fname'), ['Cersei', 'Jaime', 'Robb', 'Bran'], "precond - array is correct after item sorting is changed");

  Ember.run(function() {
    items = get(obj, 'items');

    var cersei = items.objectAt(1);
    set(cersei, 'age', 29); // how vain
  });

  deepEqual(sorted.mapBy('fname'), ['Jaime', 'Cersei', 'Robb', 'Bran'], "after updating sort properties array is updated");
});

test("sort direction defaults to ascending", function() {
  Ember.run(function() {
    sorted = get(obj, 'sortedItems');
  });

  deepEqual(sorted.mapBy('fname'), ['Cersei', 'Jaime', 'Bran', 'Robb'], "precond - array is initially sorted");

  Ember.run(function() {
    set(obj, 'itemSorting', Ember.A(['fname']));
  });

  deepEqual(sorted.mapBy('fname'), ['Bran', 'Cersei', 'Jaime', 'Robb'], "sort direction defaults to ascending");
});

test("updating an item's sort properties updates the sorted array", function() {
  var tyrionInDisguise;

  Ember.run(function() {
    sorted = get(obj, 'sortedItems');
    items = get(obj, 'items');
  });

  tyrionInDisguise = items.objectAt(1);

  deepEqual(sorted.mapBy('fname'), ['Cersei', 'Jaime', 'Bran', 'Robb'], "precond - array is initially sorted");

  Ember.run(function() {
    set(tyrionInDisguise, 'fname', 'Tyrion');
  });

  deepEqual(sorted.mapBy('fname'), ['Jaime', 'Tyrion', 'Bran', 'Robb'], "updating an item's sort properties updates the sorted array");
});

test("updating several of an item's sort properties updated the sorted array", function() {
  var sansaInDisguise;

  Ember.run(function() {
    sorted = get(obj, 'sortedItems');
    items = get(obj, 'items');
  });

  sansaInDisguise = items.objectAt(1);

  deepEqual(sorted.mapBy('fname'), ['Cersei', 'Jaime', 'Bran', 'Robb'], "precond - array is initially sorted");

  Ember.run(function() {
    setProperties(sansaInDisguise, {
      fname: 'Sansa',
      lname: 'Stark'
    });
  });

  deepEqual(sorted.mapBy('fname'), ['Jaime', 'Bran', 'Robb', 'Sansa'], "updating an item's sort properties updates the sorted array");
});

test("updating an item's sort properties does not error when binary search does a self compare (#3273)", function() {
  var jaime, cersei;

  Ember.run(function() {
    jaime = Ember.Object.create({
      name: 'Jaime',
      status: 1
    });
    cersei = Ember.Object.create({
      name: 'Cersei',
      status: 2
    });

    obj = Ember.Object.createWithMixins({
      people: Ember.A([jaime, cersei]),
      sortProps: Ember.A(['status']),
      sortedPeople: Ember.computed.sort('people', 'sortProps')
    });
  });

  deepEqual(get(obj, 'sortedPeople'), [jaime, cersei], "precond - array is initially sorted");

  Ember.run(function() {
    cersei.set('status', 3);
  });

  deepEqual(get(obj, 'sortedPeople'), [jaime, cersei], "array is sorted correctly");

  Ember.run(function() {
    cersei.set('status', 2);
  });

  deepEqual(get(obj, 'sortedPeople'), [jaime, cersei], "array is sorted correctly");
});


function sortByLnameFname(a, b) {
  var lna = get(a, 'lname'),
      lnb = get(b, 'lname');

  if (lna !== lnb) {
    return lna > lnb ? 1 : -1;
  }

  return sortByFnameAsc(a,b);
}

function sortByFnameAsc(a, b) {
  var fna = get(a, 'fname'),
      fnb = get(b, 'fname');

  if (fna === fnb) {
    return 0;
  }
  return fna > fnb ? 1 : -1;
}

function sortByFnameDesc(a, b) {
  return -sortByFnameAsc(a,b);
}

module('Ember.computed.sort - sort function', {
  setup: function() {
    Ember.run(function() {
      obj = Ember.Object.createWithMixins({
        items: Ember.A([{
          fname: "Jaime", lname: "Lannister", age: 34
        }, {
          fname: "Cersei", lname: "Lannister", age: 34
        }, {
          fname: "Robb", lname: "Stark", age: 16
        }, {
          fname: "Bran", lname: "Stark", age: 8
        }]),

        sortedItems: Ember.computed.sort('items.@each.fname', sortByLnameFname)
      });
    });
  },
  teardown: function() {
    Ember.run(function() {
      obj.destroy();
    });
  }
});

commonSortTests();

test("changing item properties specified via @each triggers a resort of the modified item", function() {
  var tyrionInDisguise;

  Ember.run(function() {
    sorted = get(obj, 'sortedItems');
    items = get(obj, 'items');
  });

  tyrionInDisguise = items.objectAt(1);

  deepEqual(sorted.mapBy('fname'), ['Cersei', 'Jaime', 'Bran', 'Robb'], "precond - array is initially sorted");

  Ember.run(function() {
    set(tyrionInDisguise, 'fname', 'Tyrion');
  });

  deepEqual(sorted.mapBy('fname'), ['Jaime', 'Tyrion', 'Bran', 'Robb'], "updating a specified property on an item resorts it");
});

test("changing item properties not specified via @each does not trigger a resort", function() {
  var cersei;

  Ember.run(function() {
    sorted = get(obj, 'sortedItems');
    items = get(obj, 'items');
  });

  cersei = items.objectAt(1);

  deepEqual(sorted.mapBy('fname'), ['Cersei', 'Jaime', 'Bran', 'Robb'], "precond - array is initially sorted");

  Ember.run(function() {
    set(cersei, 'lname', 'Stark'); // plot twist! (possibly not canon)
  });

  // The array has become unsorted.  If your sort function is sensitive to
  // properties, they *must* be specified as dependent item property keys or
  // we'll be doing binary searches on unsorted arrays.
  deepEqual(sorted.mapBy('fname'), ['Cersei', 'Jaime', 'Bran', 'Robb'], "updating an unspecified property on an item does not resort it");
});

module('Ember.computed.max', {
  setup: function() {
    Ember.run(function() {
      obj = Ember.Object.createWithMixins({
        items: Ember.A([1,2,3]),
        max: Ember.computed.max('items')
      });
    });
  },
  teardown: function() {
    Ember.run(function() {
      obj.destroy();
    });
  }
});

test("max tracks the max number as objects are added", function() {
  equal(get(obj, 'max'), 3, "precond - max is initially correct");

  Ember.run(function() {
    items = get(obj, 'items');
  });

  Ember.run(function() {
    items.pushObject(5);
  });

  equal(get(obj, 'max'), 5, "max updates when a larger number is added");

  Ember.run(function() {
    items.pushObject(2);
  });

  equal(get(obj, 'max'), 5, "max does not update when a smaller number is added");
});

test("max recomputes when the current max is removed", function() {
  equal(get(obj, 'max'), 3, "precond - max is initially correct");

  Ember.run(function() {
    items = get(obj, 'items');
    items.removeObject(2);
  });

  equal(get(obj, 'max'), 3, "max is unchanged when a non-max item is removed");

  Ember.run(function() {
    items.removeObject(3);
  });

  equal(get(obj, 'max'), 1, "max is recomputed when the current max is removed");
});

module('Ember.computed.min', {
  setup: function() {
    Ember.run(function() {
      obj = Ember.Object.createWithMixins({
        items: Ember.A([1,2,3]),
        min: Ember.computed.min('items')
      });
    });
  },
  teardown: function() {
    Ember.run(function() {
      obj.destroy();
    });
  }
});

test("min tracks the min number as objects are added", function() {
  equal(get(obj, 'min'), 1, "precond - min is initially correct");

  Ember.run(function() {
    items = get(obj, 'items');
  });

  Ember.run(function() {
    items.pushObject(-2);
  });

  equal(get(obj, 'min'), -2, "min updates when a smaller number is added");

  Ember.run(function() {
    items.pushObject(2);
  });

  equal(get(obj, 'min'), -2, "min does not update when a larger number is added");
});

test("min recomputes when the current min is removed", function() {
  equal(get(obj, 'min'), 1, "precond - min is initially correct");

  Ember.run(function() {
    items = get(obj, 'items');
    items.removeObject(2);
  });

  equal(get(obj, 'min'), 1, "min is unchanged when a non-min item is removed");

  Ember.run(function() {
    items.removeObject(1);
  });

  equal(get(obj, 'min'), 3, "min is recomputed when the current min is removed");
});

module('Ember.arrayComputed - mixed sugar', {
  setup: function() {
    Ember.run(function() {
      obj = Ember.Object.createWithMixins({
        items: Ember.A([{
          fname: "Jaime", lname: "Lannister", age: 34
        }, {
          fname: "Cersei", lname: "Lannister", age: 34
        }, {
          fname: "Robb", lname: "Stark", age: 16
        }, {
          fname: "Bran", lname: "Stark", age: 8
        }]),

        lannisters: Ember.computed.filterBy('items', 'lname', 'Lannister'),
        lannisterSorting: Ember.A(['fname']),
        sortedLannisters: Ember.computed.sort('lannisters', 'lannisterSorting'),


        starks: Ember.computed.filterBy('items', 'lname', 'Stark'),
        starkAges: Ember.computed.mapBy('starks', 'age'),
        oldestStarkAge: Ember.computed.max('starkAges')
      });
    });
  },
  teardown: function() {
    Ember.run(function() {
      obj.destroy();
    });
  }
});

test("filtering and sorting can be combined", function() {
  Ember.run(function() {
    items = get(obj, 'items');
    sorted = get(obj, 'sortedLannisters');
  });

  deepEqual(sorted.mapBy('fname'), ['Cersei', 'Jaime'], "precond - array is initially filtered and sorted");

  Ember.run(function() {
    items.pushObject({fname: 'Tywin',   lname: 'Lannister'});
    items.pushObject({fname: 'Lyanna',  lname: 'Stark'});
    items.pushObject({fname: 'Gerion',  lname: 'Lannister'});
  });

  deepEqual(sorted.mapBy('fname'), ['Cersei', 'Gerion', 'Jaime', 'Tywin'], "updates propagate to array");
});

test("filtering, sorting and reduce (max) can be combined", function() {
  Ember.run(function() {
    items = get(obj, 'items');
  });

  equal(16, get(obj, 'oldestStarkAge'), "precond - end of chain is initially correct");

  Ember.run(function() {
    items.pushObject({fname: 'Rickon', lname: 'Stark', age: 5});
  });

  equal(16, get(obj, 'oldestStarkAge'), "chain is updated correctly");

  Ember.run(function() {
    items.pushObject({fname: 'Eddard', lname: 'Stark', age: 35});
  });

  equal(35, get(obj, 'oldestStarkAge'), "chain is updated correctly");
});

function todo(name, priority) {
  return Ember.Object.create({name: name, priority: priority});
}

function priorityComparator(todoA, todoB) {
  var pa = parseInt(get(todoA, 'priority'), 10),
      pb = parseInt(get(todoB, 'priority'), 10);

  return pa - pb;
}

function evenPriorities(todo) {
  var p = parseInt(get(todo, 'priority'), 10);

  return p % 2 === 0;
}

module('Ember.arrayComputed - chains', {
  setup: function() {
    obj = Ember.Object.createWithMixins({
      todos: Ember.A([todo('E', 4), todo('D', 3), todo('C', 2), todo('B', 1), todo('A', 0)]),
      sorted: Ember.computed.sort('todos.@each.priority', priorityComparator),
      filtered: Ember.computed.filter('sorted.@each.priority', evenPriorities)
    });
  },
  teardown: function() {
    Ember.run(function() {
      obj.destroy();
    });
  }
});

test("it can filter and sort when both depend on the same item property", function() {
  filtered = get(obj, 'filtered');
  sorted = get(obj, 'sorted');
  todos = get(obj, 'todos');

  deepEqual(todos.mapProperty('name'), ['E', 'D', 'C', 'B', 'A'], "precond - todos initially correct");
  deepEqual(sorted.mapProperty('name'), ['A', 'B', 'C', 'D', 'E'], "precond - sorted initially correct");
  deepEqual(filtered.mapProperty('name'), ['A', 'C', 'E'], "precond - filtered initially correct");

  Ember.run(function() {
    Ember.beginPropertyChanges();
    // here we trigger several changes
    //  A. D.priority 3 -> 6
    //    1. updated sorted from item property change
    //      a. remove D; reinsert D
    //      b. update filtered from sorted change
    //    2. update filtered from item property change
    //
    // If 1.b happens before 2 it should invalidate 2
    todos.objectAt(1).set('priority', 6);
    Ember.endPropertyChanges();
  });

  deepEqual(todos.mapProperty('name'), ['E', 'D', 'C', 'B', 'A'], "precond - todos remain correct");
  deepEqual(sorted.mapProperty('name'), ['A', 'B', 'C', 'E', 'D'], "precond - sorted updated correctly");
  deepEqual(filtered.mapProperty('name'), ['A', 'C', 'E', 'D'], "filtered updated correctly");
});

module('Chaining array and reduced CPs', {
  setup: function() {
    Ember.run(function() {
      userFnCalls = 0;
      obj = Ember.Object.createWithMixins({
        array: Ember.A([{ v: 1 }, { v: 3}, { v: 2 }, { v: 1 }]),
        mapped: Ember.computed.mapBy('array', 'v'),
        max: Ember.computed.max('mapped'),
        maxDidChange: Ember.observer('max', function(){
          userFnCalls++;
        })
      });
    });
  },
  teardown: function() {
    Ember.run(function() {
      obj.destroy();
    });
  }
});

test("it computes interdependent array computed properties", function() {
  var mapped = get(obj, 'mapped');

  equal(get(obj, 'max'), 3, 'sanity - it properly computes the maximum value');
  equal(userFnCalls, 0, 'observer is not called on initialisation');

  var calls = 0;
  Ember.addObserver(obj, 'max', function(){ calls++; });

  Ember.run(function() {
    obj.get('array').pushObject({ v: 5 });
  });

  equal(get(obj, 'max'), 5, 'maximum value is updated correctly');
  equal(userFnCalls, 1, 'object defined observers fire');
  equal(calls, 1, 'runtime created observers fire');
});


})();

(function() {
var map = Ember.EnumerableUtils.map,
    get = Ember.get,
    set = Ember.set,
    metaFor = Ember.meta,
    keys = Ember.keys,
    obj, addCalls, removeCalls, callbackItems;

module('Ember.arrayComputed', {
  setup: function () {
    addCalls = removeCalls = 0;

    obj = Ember.Object.createWithMixins({
      numbers:  Ember.A([ 1, 2, 3, 4, 5, 6 ]),
      otherNumbers: Ember.A([ 7, 8, 9 ]),

      // Users would obviously just use `Ember.computed.map`
      // This implemantion is fine for these tests, but doesn't properly work as
      // it's not index based.
      evenNumbers: Ember.arrayComputed('numbers', {
        addedItem: function (array, item) {
          addCalls++;
          if (item % 2 === 0) {
            array.pushObject(item);
          }
          return array;
        },
        removedItem: function (array, item) {
          removeCalls++;
          array.removeObject(item);
          return array;
        }
      }),

      evenNumbersMultiDep: Ember.arrayComputed('numbers', 'otherNumbers', {
        addedItem: function (array, item) {
          if (item % 2 === 0) {
            array.pushObject(item);
          }
          return array;
        }
      }),

      nestedNumbers:  Ember.A(map([1,2,3,4,5,6], function (n) {
                        return Ember.Object.create({ p: 'otherProperty', v: n });
                      })),

      evenNestedNumbers: Ember.arrayComputed({
        addedItem: function (array, item, keyName) {
          var value = item.get('v');
          if (value % 2 === 0) {
            array.pushObject(value);
          }
          return array;
        },
        removedItem: function (array, item, keyName) {
          array.removeObject(item.get('v'));
          return array;
        }
      }).property('nestedNumbers.@each.v')
    });
  },

  teardown: function() {
    Ember.run(function() {
      obj.destroy();
    });
  }
});


test("array computed properties are instances of Ember.ComputedProperty", function() {
  ok(Ember.arrayComputed({}) instanceof Ember.ComputedProperty);
});

test("when the dependent array is null or undefined, `addedItem` is not called and only the initial value is returned", function() {
  obj = Ember.Object.createWithMixins({
    numbers: null,
    doubledNumbers: Ember.arrayComputed('numbers', {
      addedItem: function (array, n) {
        addCalls++;
        array.pushObject(n * 2);
        return array;
      }
    })
  });

  deepEqual(get(obj, 'doubledNumbers'), [], "When the dependent array is null, the initial value is returned");
  equal(addCalls, 0,  "`addedItem` is not called when the dependent array is null");

  Ember.run(function() {
    set(obj, 'numbers', Ember.A([1,2]));
  });

  deepEqual(get(obj, 'doubledNumbers'), [2,4], "An initially null dependent array can still be set later");
  equal(addCalls, 2, "`addedItem` is called when the dependent array is initially set");
});

test("on first retrieval, array computed properties are computed", function() {
  deepEqual(get(obj, 'evenNumbers'), [2,4,6], "array computed properties are correct on first invocation");
});

test("on first retrieval, array computed properties with multiple dependent keys are computed", function() {
  deepEqual(get(obj, 'evenNumbersMultiDep'), [2, 4, 6, 8], "array computed properties are correct on first invocation");
});

test("on first retrieval, array computed properties dependent on nested objects are computed", function() {
  deepEqual(get(obj, 'evenNestedNumbers'), [2,4,6], "array computed properties are correct on first invocation");
});

test("after the first retrieval, array computed properties observe additions to dependent arrays", function() {
  var numbers = get(obj, 'numbers'),
      // set up observers
      evenNumbers = get(obj, 'evenNumbers');

  Ember.run(function() {
    numbers.pushObjects([7, 8]);
  });

  deepEqual(evenNumbers, [2, 4, 6, 8], "array computed properties watch dependent arrays");
});

test("after the first retrieval, array computed properties observe removals from dependent arrays", function() {
  var numbers = get(obj, 'numbers'),
      // set up observers
      evenNumbers = get(obj, 'evenNumbers');

  Ember.run(function() {
    numbers.removeObjects([3, 4]);
  });

  deepEqual(evenNumbers, [2, 6], "array computed properties watch dependent arrays");
});

test("after first retrieval, array computed properties can observe properties on array items", function() {
  var nestedNumbers = get(obj, 'nestedNumbers'),
      evenNestedNumbers = get(obj, 'evenNestedNumbers');

  deepEqual(evenNestedNumbers, [2, 4, 6], 'precond -- starts off with correct values');

  Ember.run(function() {
    nestedNumbers.objectAt(0).set('v', 22);
  });

  deepEqual(nestedNumbers.mapBy('v'), [22, 2, 3, 4, 5, 6], 'nested numbers is updated');
  deepEqual(evenNestedNumbers, [2, 4, 6, 22], 'adds new number');
});

test("changes to array computed properties happen synchronously", function() {
  var nestedNumbers = get(obj, 'nestedNumbers'),
      evenNestedNumbers = get(obj, 'evenNestedNumbers');

  deepEqual(evenNestedNumbers, [2, 4, 6], 'precond -- starts off with correct values');

  Ember.run(function() {
    nestedNumbers.objectAt(0).set('v', 22);
    deepEqual(nestedNumbers.mapBy('v'), [22, 2, 3, 4, 5, 6], 'nested numbers is updated');
    deepEqual(evenNestedNumbers, [2, 4, 6, 22], 'adds new number');
  });
});

if (Ember.FEATURES.isEnabled('propertyBraceExpansion')) {
  test("multiple dependent keys can be specified via brace expansion", function() {
    var obj = Ember.Object.createWithMixins({
          bar: Ember.A(),
          baz: Ember.A(),
          foo: Ember.reduceComputed({
            initialValue: Ember.A(),
            addedItem: function(array, item) { array.pushObject('a:' + item); return array; },
            removedItem: function(array, item) { array.pushObject('r:' + item); return array; }
          }).property('{bar,baz}')
        });

    deepEqual(get(obj, 'foo'), [], "initially empty");

    get(obj, 'bar').pushObject(1);

    deepEqual(get(obj, 'foo'), ['a:1'], "added item from brace-expanded dependency");

    get(obj, 'baz').pushObject(2);

    deepEqual(get(obj, 'foo'), ['a:1', 'a:2'], "added item from brace-expanded dependency");

    get(obj, 'bar').popObject();

    deepEqual(get(obj, 'foo'), ['a:1', 'a:2', 'r:1'], "removed item from brace-expanded dependency");

    get(obj, 'baz').popObject();

    deepEqual(get(obj, 'foo'), ['a:1', 'a:2', 'r:1', 'r:2'], "removed item from brace-expanded dependency");
  });

  test("multiple item property keys can be specified via brace expansion", function() {
    var addedCalls = 0,
        removedCalls = 0,
        expected = Ember.A(),
        item = { propA: 'A', propB: 'B', propC: 'C' },
        obj = Ember.Object.createWithMixins({
          bar: Ember.A([item]),
          foo: Ember.reduceComputed({
            initialValue: Ember.A(),
            addedItem: function(array, item, changeMeta) {
              array.pushObject('a:' + get(item, 'propA') + ':' + get(item, 'propB') + ':' + get(item, 'propC'));
              return array;
            },
            removedItem: function(array, item, changeMeta) {
              array.pushObject('r:' + get(item, 'propA') + ':' + get(item, 'propB') + ':' + get(item, 'propC'));
              return array;
            }
          }).property('bar.@each.{propA,propB}')
        });

    expected.pushObjects(['a:A:B:C']);
    deepEqual(get(obj, 'foo'), expected, "initially added dependent item");

    set(item, 'propA', 'AA');

    expected.pushObjects(['r:AA:B:C', 'a:AA:B:C']);
    deepEqual(get(obj, 'foo'), expected, "observing item property key specified via brace expansion");

    set(item, 'propB', 'BB');

    expected.pushObjects(['r:AA:BB:C', 'a:AA:BB:C']);
    deepEqual(get(obj, 'foo'), expected, "observing item property key specified via brace expansion");

    set(item, 'propC', 'CC');

    deepEqual(get(obj, 'foo'), expected, "not observing unspecified item properties");
  });
}

test("doubly nested item property keys (@each.foo.@each) are not supported", function() {
  Ember.run(function() {
    obj = Ember.Object.createWithMixins({
      peopleByOrdinalPosition: Ember.A([{ first: Ember.A([Ember.Object.create({ name: "Jaime Lannister" })])}]),
      people: Ember.arrayComputed({
        addedItem: function (array, item) {
          array.pushObject(get(item, 'first.firstObject'));
          return array;
        }
      }).property('peopleByOrdinalPosition.@each.first'),
      names: Ember.arrayComputed({
        addedItem: function (array, item) {
          equal(get(item, 'name'), 'Jaime Lannister');
          array.pushObject(item.get('name'));
          return array;
        }
      }).property('people.@each.name')
    });
  });

  equal(obj.get('names.firstObject'), 'Jaime Lannister', "Doubly nested item properties can be retrieved manually");

  throws(function() {
    obj = Ember.Object.createWithMixins({
      people: [{ first: Ember.A([Ember.Object.create({ name: "Jaime Lannister" })])}],
      names: Ember.arrayComputed({
        addedItem: function (array, item) {
          array.pushObject(item);
          return array;
        }
      }).property('people.@each.first.@each.name')
    });
  }, /Nested @each/, "doubly nested item property keys are not supported");
});

test("after the first retrieval, array computed properties observe dependent arrays", function() {
  var numbers = get(obj, 'numbers'),
      evenNumbers = get(obj, 'evenNumbers');

  deepEqual(evenNumbers, [2, 4, 6], 'precond -- starts off with correct values');

  Ember.run(function() {
    set(obj, 'numbers', Ember.A([20, 23, 28]));
  });

  deepEqual(evenNumbers, [20, 28], "array computed properties watch dependent arrays");
});

test("array observers are torn down when dependent arrays change", function() {
  var numbers = get(obj, 'numbers'),
      evenNumbers = get(obj, 'evenNumbers');

  equal(addCalls, 6, 'precond - add has been called for each item in the array');
  equal(removeCalls, 0, 'precond - removed has not been called');

  Ember.run(function() {
    set(obj, 'numbers', Ember.A([20, 23, 28]));
  });

  equal(addCalls, 9, 'add is called for each item in the new array');
  equal(removeCalls, 0, 'remove is not called when the array is reset');

  numbers.replace(0, numbers.get('length'), Ember.A([7,8,9,10]));

  equal(addCalls, 9, 'add is not called');
  equal(removeCalls, 0, 'remove is not called');
});

test("modifying properties on dependent array items triggers observers exactly once", function() {
  var numbers = get(obj, 'numbers'),
      evenNumbers = get(obj, 'evenNumbers');

  equal(addCalls, 6, 'precond - add has not been called for each item in the array');
  equal(removeCalls, 0, 'precond - removed has not been called');

  Ember.run(function() {
    numbers.replace(0,2,[7,8,9,10]);
  });

  equal(addCalls, 10, 'add is called for each item added');
  equal(removeCalls, 2, 'removed is called for each item removed');
  deepEqual(evenNumbers, [4,6,8,10], 'sanity check - dependent arrays are updated');
});

test("multiple array computed properties on the same object can observe dependent arrays", function() {
  var numbers = get(obj, 'numbers'),
      otherNumbers = get(obj, 'otherNumbers');

  deepEqual(get(obj, 'evenNumbers'), [2,4,6], "precond - evenNumbers is initially correct");
  deepEqual(get(obj, 'evenNumbersMultiDep'), [2, 4, 6, 8], "precond - evenNumbersMultiDep is initially correct");

  Ember.run(function() {
    numbers.pushObject(12);
    otherNumbers.pushObject(14);
  });

  deepEqual(get(obj, 'evenNumbers'), [2,4,6,12], "evenNumbers is updated");
  deepEqual(get(obj, 'evenNumbersMultiDep'), [2, 4, 6, 8, 12, 14], "evenNumbersMultiDep is updated");
});

test("an error is thrown when a reduceComputed is defined without an initialValue property", function() {
  var defineExploder = function() {
    Ember.Object.createWithMixins({
      collection: Ember.A(),
      exploder: Ember.reduceComputed('collection', {
        initialize: function(initialValue, changeMeta, instanceMeta) {},

        addedItem: function(accumulatedValue,item,changeMeta,instanceMeta) {
          return item;
        },

        removedItem: function(accumulatedValue,item,changeMeta,instanceMeta) {
          return item;
        }
      })
    });
  };

  throws(defineExploder, /declared\ without\ an\ initial\ value/, "an error is thrown when the reduceComputed is defined without an initialValue");
});

test("dependent arrays with multiple item properties are not double-counted", function() {
  var obj = Ember.Object.extend({
    items: Ember.A([{ foo: true }, { bar: false }, { bar: true }]),
    countFooOrBar: Ember.reduceComputed({
      initialValue: 0,
      addedItem: function (acc) {
        ++addCalls;
        return acc;
      },

      removedItem: function (acc) {
        ++removeCalls;
        return acc;
      }
    }).property('items.@each.foo', 'items.@each.bar', 'items')
  }).create();

  equal(0, addCalls, "precond - no adds yet");
  equal(0, removeCalls, "precond - no removes yet");

  get(obj, 'countFooOrBar');

  equal(3, addCalls, "all items added once");
  equal(0, removeCalls, "no removes yet");
});

test("dependent arrays can use `replace` with an out of bounds index to add items", function() {
  var dependentArray = Ember.A(),
      array;

  obj = Ember.Object.extend({
    dependentArray: dependentArray,
    computed: Ember.arrayComputed('dependentArray', {
      addedItem: function (acc, item, changeMeta) {
        acc.insertAt(changeMeta.index, item);
        return acc;
      },
      removedItem: function (acc) { return acc; }
    })
  }).create();

  array = get(obj, 'computed');

  deepEqual(array, [], "precond - computed array is initially empty");

  dependentArray.replace(100, 0, [1, 2]);

  deepEqual(array, [1, 2], "index >= length treated as a push");

  dependentArray.replace(-100, 0, [3, 4]);

  deepEqual(array, [3, 4, 1, 2], "index < 0 treated as an unshift");
});

test("dependent arrays can use `replace` with a negative index to remove items indexed from the right", function() {
  var dependentArray = Ember.A([1,2,3,4,5]),
      array;

  obj = Ember.Object.extend({
    dependentArray: dependentArray,
    computed: Ember.arrayComputed('dependentArray', {
      addedItem: function (acc, item) { return acc; },
      removedItem: function (acc, item) { acc.pushObject(item); return acc; }
    })
  }).create();

  array = get(obj, 'computed');

  deepEqual(array, [], "precond - no items have been removed initially");

  dependentArray.replace(-3, 2);

  deepEqual(array, [4,3], "index < 0 used as a right index for removal");
});

test("dependent arrays that call `replace` with an out of bounds index to remove items is a no-op", function() {
  var dependentArray = Ember.A([1, 2]),
      array;

  obj = Ember.Object.extend({
    dependentArray: dependentArray,
    computed: Ember.arrayComputed('dependentArray', {
      addedItem: function (acc, item, changeMeta) { return acc; },
      removedItem: function (acc) {
        ok(false, "no items have been removed");
      }
    })
  }).create();

  array = get(obj, 'computed');

  deepEqual(array, [], "precond - computed array is initially empty");

  dependentArray.replace(100, 2);
});

test("dependent arrays that call `replace` with a too-large removedCount a) works and b) still right-truncates", function() {
  var dependentArray = Ember.A([1, 2]),
      array;

  obj = Ember.Object.extend({
    dependentArray: dependentArray,
    computed: Ember.arrayComputed('dependentArray', {
      addedItem: function (acc, item) { return acc; },
      removedItem: function (acc, item) { acc.pushObject(item); return acc; }
    })
  }).create();

  array = get(obj, 'computed');

  deepEqual(array, [], "precond - computed array is initially empty");

  dependentArray.replace(1, 200);

  deepEqual(array, [2], "array was correctly right-truncated");
});

test("removedItem is not erroneously called for dependent arrays during a recomputation", function() {
  function addedItem(array, item, changeMeta) {
    array.insertAt(changeMeta.index, item);
    return array;
  }

  function removedItem(array, item, changeMeta) {
    ok(get(array, 'length') > changeMeta.index, "removedItem not called with invalid index");
    array.removeAt(changeMeta.index, 1);
    return array;
  }

  var dependentArray = Ember.A(),
      options = {
        addedItem: addedItem,
        removedItem: removedItem
      };

  obj = Ember.Object.extend({
    dependentArray: Ember.A([1, 2]),
    identity0: Ember.arrayComputed('dependentArray', options),
    identity1: Ember.arrayComputed('identity0', options)
  }).create();

  get(obj, 'identity1');
  Ember.run(function() {
    obj.notifyPropertyChange('dependentArray');
  });

  ok(true, "removedItem not invoked with invalid index");
});

module('Ember.arrayComputed - recomputation DKs', {
  setup: function() {
    obj = Ember.Object.extend({
      people: Ember.A([{
        name: 'Jaime Lannister',
        title: 'Kingsguard'
      }, {
        name: 'Cersei Lannister',
        title: 'Queen'
      }]),

      titles: Ember.arrayComputed('people', {
        addedItem: function (acc, person) {
          acc.pushObject(get(person, 'title'));
          return acc;
        }
      })
    }).create();
  },
  teardown: function() {
    Ember.run(function() {
      obj.destroy();
    });
  }
});

test("recomputations from `arrayComputed` observers add back dependent keys", function() {
  var meta = metaFor(obj),
      people = get(obj, 'people'),
      titles;

  equal(meta.deps, undefined, "precond - nobody depends on people'");
  equal(meta.watching.people, undefined, "precond - nobody is watching people");

  titles = get(obj, 'titles');

  deepEqual(titles, ["Kingsguard", "Queen"], "precond - value is correct");

  ok(meta.deps.people !== undefined, "people has dependencies");
  deepEqual(keys(meta.deps.people), ["titles"], "only titles depends on people");
  equal(meta.deps.people.titles, 1, "titles depends on people exactly once");
  equal(meta.watching.people, 2, "people has two watchers: the array listener and titles");

  Ember.run(function() {
    set(obj, 'people', Ember.A());
  });

  // Regular CPs are invalidated when their dependent keys change, but array
  // computeds keep refs up to date
  deepEqual(titles, [], "value is correct");
  equal(meta.cache.titles, titles, "value remains cached");
  ok(meta.deps.people !== undefined, "people has dependencies");
  deepEqual(keys(meta.deps.people), ["titles"], "meta.deps.people is unchanged");
  equal(meta.deps.people.titles, 1, "deps.people.titles is unchanged");
  equal(meta.watching.people, 2, "watching.people is unchanged");
});

module('Ember.arryComputed - self chains', {
  setup: function() {
    var a = Ember.Object.create({ name: 'a' }),
    b = Ember.Object.create({ name: 'b' });

    obj = Ember.ArrayProxy.createWithMixins({
      content: Ember.A([a, b]),
      names: Ember.arrayComputed('@this.@each.name', {
        addedItem: function (array, item, changeMeta, instanceMeta) {
          var mapped = get(item, 'name');
          array.insertAt(changeMeta.index, mapped);
          return array;
        },
        removedItem: function(array, item, changeMeta, instanceMeta) {
          array.removeAt(changeMeta.index, 1);
          return array;
        }
      })
    });
  },
  teardown: function() {
    Ember.run(function() {
      obj.destroy();
    });
  }
});

test("@this can be used to treat the object as the array itself", function() {
  var names = get(obj, 'names');

  deepEqual(names, ['a', 'b'], "precond - names is initially correct");

  Ember.run(function() {
    obj.objectAt(1).set('name', 'c');
  });

  deepEqual(names, ['a', 'c'], "@this can be used with item property observers");

  Ember.run(function() {
    obj.pushObject({ name: 'd' });
  });

  deepEqual(names, ['a', 'c', 'd'], "@this observes new items");
});

module('Ember.arrayComputed - changeMeta property observers', {
  setup: function() {
    callbackItems = [];
    Ember.run(function() {
      obj = Ember.Object.createWithMixins({
        items: Ember.A([Ember.Object.create({ n: 'zero' }), Ember.Object.create({ n: 'one' })]),
        itemsN: Ember.arrayComputed('items.@each.n', {
          addedItem: function (array, item, changeMeta, instanceMeta) {
            callbackItems.push('add:' + changeMeta.index + ":" + get(changeMeta.item, 'n'));
          },
          removedItem: function (array, item, changeMeta, instanceMeta) {
            callbackItems.push('remove:' + changeMeta.index + ":" + get(changeMeta.item, 'n'));
          }
        })
      });
    });
  },
  teardown: function() {
    Ember.run(function() {
      obj.destroy();
    });
  }
});

test("changeMeta includes item and index", function() {
  var expected, items, item;

  items = get(obj, 'items');

  // initial computation add0 add1
  Ember.run(function() {
    obj.get('itemsN');
  });

  // add2
  Ember.run(function() {
    items.pushObject(Ember.Object.create({ n: 'two' }));
  });

  // remove2
  Ember.run(function() {
    items.popObject();
  });

  // remove0 add0
  Ember.run(function() {
    set(get(items, 'firstObject'), 'n', "zero'");
  });

  expected = ["add:0:zero", "add:1:one", "add:2:two", "remove:2:two", "remove:0:zero'", "add:0:zero'"];
  deepEqual(callbackItems, expected, "changeMeta includes items");

  // [zero', one] -> [zero', one, five, six]
  // add2 add3
  Ember.run(function() {
    items.pushObject(Ember.Object.create({ n: 'five' }));
    items.pushObject(Ember.Object.create({ n: 'six' }));
  });

  // remove0 add0
  Ember.run(function() {
    items.objectAt(0).set('n', "zero''");
  });

  expected = expected.concat(['add:2:five', 'add:3:six', "remove:0:zero''", "add:0:zero''"]);
  deepEqual(callbackItems, expected, "changeMeta includes items");

  // [zero'', one, five, six] -> [zero'', five, six]
  // remove1
  Ember.run(function() {
    item = items.objectAt(1);
    items.removeAt(1, 1);
  });

  Ember.run(function() {
    // observer should have been removed from the deleted item
    item.set('n', 'ten thousand');
  });

  // [zero'', five, six] -> [zero'', five, seven]
  // remove2 add2
  Ember.run(function() {
    items.objectAt(2).set('n', "seven");
  });

  // observer should have been added to the new item
  expected = expected.concat(['remove:1:one', 'remove:2:seven', 'add:2:seven']);
  deepEqual(callbackItems, expected, "changeMeta includes items");

  // reset (does not call remove)
  Ember.run(function() {
    item = items.objectAt(1);
    set(obj, 'items', Ember.A([]));
  });

  Ember.run(function() {
    // observers should have been removed from the items in the old array
    set(item, 'n', 'eleven thousand');
  });

  deepEqual(callbackItems, expected, "items removed from the array had observers removed");
});

test("when initialValue is undefined, everything works as advertised", function() {
  var chars = Ember.Object.createWithMixins({
    letters: Ember.A(),
    firstUpper: Ember.reduceComputed('letters', {
      initialValue: undefined,

      initialize: function(initialValue, changeMeta, instanceMeta) {
        instanceMeta.matchingItems = Ember.A();
        instanceMeta.subArray = new Ember.SubArray();
        instanceMeta.firstMatch = function() {
          return Ember.getWithDefault(instanceMeta.matchingItems, 'firstObject', initialValue);
        };
      },

      addedItem: function(accumulatedValue,item,changeMeta,instanceMeta) {
        var filterIndex;
        filterIndex = instanceMeta.subArray.addItem(changeMeta.index, item.toUpperCase() === item);
        if (filterIndex > -1) {
          instanceMeta.matchingItems.insertAt(filterIndex, item);
        }
        return instanceMeta.firstMatch();
      },

      removedItem: function(accumulatedValue,item,changeMeta,instanceMeta) {
        var filterIndex = instanceMeta.subArray.removeItem(changeMeta.index);
        if (filterIndex > -1) {
          instanceMeta.matchingItems.removeAt(filterIndex);
        }
        return instanceMeta.firstMatch();
      }
    })
  });
  equal(get(chars, 'firstUpper'), undefined, "initialValue is undefined");

  get(chars, 'letters').pushObjects(['a', 'b', 'c']);

  equal(get(chars, 'firstUpper'), undefined, "result is undefined when no matches are present");

  get(chars, 'letters').pushObjects(['A', 'B', 'C']);

  equal(get(chars, 'firstUpper'), 'A', "result is the first match when matching objects are present");

  get(chars, 'letters').removeAt(3);

  equal(get(chars, 'firstUpper'), 'B', "result is the next match when the first matching object is removed");
});

module('Ember.arrayComputed - completely invalidating dependencies', {
  setup: function () {
    addCalls = removeCalls = 0;
  }
});

test("non-array dependencies completely invalidate a reduceComputed CP", function() {
  var dependentArray = Ember.A();

  obj = Ember.Object.extend({
    nonArray: 'v0',
    dependentArray: dependentArray,

    computed: Ember.arrayComputed('dependentArray', 'nonArray', {
      addedItem: function (array) {
        ++addCalls;
        return array;
      },

      removedItem: function (array) {
        --removeCalls;
        return array;
      }
    })
  }).create();

  get(obj, 'computed');

  equal(addCalls, 0, "precond - add has not initially been called");
  equal(removeCalls, 0, "precond - remove has not initially been called");

  dependentArray.pushObjects([1, 2]);

  equal(addCalls, 2, "add called one-at-a-time for dependent array changes");
  equal(removeCalls, 0, "remove not called");

  Ember.run(function() {
    set(obj, 'nonArray', 'v1');
  });

  equal(addCalls, 4, "array completely recomputed when non-array dependency changed");
  equal(removeCalls, 0, "remove not called");
});

test("array dependencies specified with `.[]` completely invalidate a reduceComputed CP", function() {
  var dependentArray = Ember.A(),
  totallyInvalidatingDependentArray = Ember.A();

  obj = Ember.Object.extend({
    totallyInvalidatingDependentArray: totallyInvalidatingDependentArray,
    dependentArray: dependentArray,

    computed: Ember.arrayComputed('dependentArray', 'totallyInvalidatingDependentArray.[]', {
      addedItem: function (array, item) {
        ok(item !== 3, "totally invalidating items are never passed to the one-at-a-time callbacks");
        ++addCalls;
        return array;
      },

      removedItem: function (array, item) {
        ok(item !== 3, "totally invalidating items are never passed to the one-at-a-time callbacks");
        --removeCalls;
        return array;
      }
    })
  }).create();

  get(obj, 'computed');

  equal(addCalls, 0, "precond - add has not initially been called");
  equal(removeCalls, 0, "precond - remove has not initially been called");

  dependentArray.pushObjects([1, 2]);

  equal(addCalls, 2, "add called one-at-a-time for dependent array changes");
  equal(removeCalls, 0, "remove not called");

  Ember.run(function() {
    totallyInvalidatingDependentArray.pushObject(3);
  });

  equal(addCalls, 4, "array completely recomputed when totally invalidating dependent array modified");
  equal(removeCalls, 0, "remove not called");
});

})();

(function() {
require('ember-runtime/~tests/suites/mutable_array');

module("ember-runtime/controllers/array_controller_test");

Ember.MutableArrayTests.extend({

  name: 'Ember.ArrayController',

  newObject: function(ary) {
    var ret = ary ? ary.slice() : this.newFixture(3);
    return Ember.ArrayController.create({
      content: Ember.A(ret)
    });
  },

  mutate: function(obj) {
    obj.pushObject(Ember.get(obj, 'length')+1);
  },

  toArray: function(obj) {
    return obj.toArray ? obj.toArray() : obj.slice();
  }
}).run();

test("defaults it's `content` to an empty array", function () {
  var Controller = Ember.ArrayController.extend();
  deepEqual(Controller.create().get("content"), [], "`ArrayController` defaults it's content to an empty array");
  equal(Controller.create().get('firstObject'), undefined, 'can fetch firstObject');
  equal(Controller.create().get('lastObject'), undefined, 'can fetch lastObject');
});


test("Ember.ArrayController length property works even if content was not set initially", function() {
  var controller = Ember.ArrayController.create();
  controller.pushObject('item');
  equal(controller.get('length'), 1);
});

})();

(function() {
module('Ember.Controller event handling');

test("Action can be handled by a function on actions object", function() {
  expect(1);
  var TestController = Ember.Controller.extend({
    actions: {
      poke: function() {
        ok(true, 'poked');
      }
    }
  });
  var controller = TestController.create({});
  controller.send("poke");
});

// TODO: Can we support this?
// test("Actions handlers can be configured to use another name", function() {
//   expect(1);
//   var TestController = Ember.Controller.extend({
//     actionsProperty: 'actionHandlers',
//     actionHandlers: {
//       poke: function() {
//         ok(true, 'poked');
//       }
//     }
//   });
//   var controller = TestController.create({});
//   controller.send("poke");
// });

test("When `_actions` is provided, `actions` is left alone", function() {
  expect(2);
  var TestController = Ember.Controller.extend({
    actions: ['foo', 'bar'],
    _actions: {
      poke: function() {
        ok(true, 'poked');
      }
    }
  });
  var controller = TestController.create({});
  controller.send("poke");
  equal('foo', controller.get("actions")[0], 'actions property is not untouched');
});

test("Actions object doesn't shadow a proxied object's 'actions' property", function() {
  var TestController = Ember.ObjectController.extend({
    content: {
      actions: 'foo'
    },
    actions: {
      poke: function() {
        console.log('ouch');
      }
    }
  });
  var controller = TestController.create({});
  equal(controller.get("actions"), 'foo', "doesn't shadow the content's actions property");
});

test("A handled action can be bubbled to the target for continued processing", function() {
  expect(2);
  var TestController = Ember.Controller.extend({
    actions: {
      poke: function() {
        ok(true, 'poked 1');
        return true;
      }
    }
  });

  var controller = TestController.create({
    target: Ember.Controller.extend({
      actions: {
        poke: function() {
          ok(true, 'poked 2');
        }
      }
    }).create()
  });
  controller.send("poke");
});

test("Action can be handled by a superclass' actions object", function() {
  expect(4);

  var SuperController = Ember.Controller.extend({
    actions: {
      foo: function() {
        ok(true, 'foo');
      },
      bar: function(msg) {
        equal(msg, "HELLO");
      }
    }
  });

  var BarControllerMixin = Ember.Mixin.create({
    actions: {
      bar: function(msg) {
        equal(msg, "HELLO");
        this._super(msg);
      }
    }
  });

  var IndexController = SuperController.extend(BarControllerMixin, {
    actions: {
      baz: function() {
        ok(true, 'baz');
      }
    }
  });

  var controller = IndexController.create({});
  controller.send("foo");
  controller.send("bar", "HELLO");
  controller.send("baz");
});

module('Ember.Controller deprecations',{
  setup: function() {
    Ember.TESTING_DEPRECATION = true;
  },
  teardown: function() {
    Ember.TESTING_DEPRECATION = false;
  }
});

test("Action can be handled by method directly on controller (DEPRECATED)", function() {
  expect(1);
  var TestController = Ember.Controller.extend({
    poke: function() {
      ok(true, 'poked');
    }
  });
  var controller = TestController.create({});
  controller.send("poke");
});

})();

(function() {
var lannisters, arrayController, controllerClass, otherControllerClass, container, itemControllerCount,
    tywin, jaime, cersei, tyrion,
    get = Ember.get;

module("Ember.ArrayController - itemController", {
  setup: function() {
    container = new Ember.Container();

    tywin = Ember.Object.create({ name: 'Tywin' });
    jaime = Ember.Object.create({ name: 'Jaime' });
    cersei = Ember.Object.create({ name: 'Cersei' });
    tyrion = Ember.Object.create({ name: 'Tyrion' });
    lannisters = Ember.A([ tywin, jaime, cersei ]);

    itemControllerCount = 0;
    controllerClass = Ember.ObjectController.extend({
      init: function() {
        ++itemControllerCount;
        this._super();
      },

      toString: function() {
        return "itemController for " + this.get('name');
      }
    });

    otherControllerClass = Ember.ObjectController.extend({
      toString: function() {
        return "otherItemController for " + this.get('name');
      }
    });

    container.register("controller:Item", controllerClass);
    container.register("controller:OtherItem", otherControllerClass);
  },
  teardown: function() {
    Ember.run(function() {
      container.destroy();
    });
  }
});

function createUnwrappedArrayController() {
  arrayController = Ember.ArrayController.create({
    container: container,
    content: lannisters
  });
}

function createArrayController() {
  arrayController = Ember.ArrayController.create({
    container: container,
    itemController: 'Item',
    content: lannisters
  });
}

function createDynamicArrayController() {
  arrayController = Ember.ArrayController.create({
    container: container,
    lookupItemController: function(object) {
      if ("Tywin" === object.get("name")) {
        return "Item";
      } else {
        return "OtherItem";
      }
    },
    content: lannisters
  });
}

test("when no `itemController` is set, `objectAtContent` returns objects directly", function() {
  createUnwrappedArrayController();

  strictEqual(arrayController.objectAtContent(1), jaime, "No controller is returned when itemController is not set");
});

test("when `itemController` is set, `objectAtContent` returns an instance of the controller", function() {
  createArrayController();

  var jaimeController = arrayController.objectAtContent(1);

  ok(controllerClass.detectInstance(jaimeController), "A controller is returned when itemController is set");
});


test("when `idx` is out of range, `objectAtContent` does not create a controller", function() {
  controllerClass.reopen({
    init: function() {
      ok(false, "Controllers should not be created when `idx` is out of range");
    }
  });

  createArrayController();
  strictEqual(arrayController.objectAtContent(50), undefined, "no controllers are created for out of range indexes");
});

test("when the underlying object is null, a controller is still returned", function() {
  createArrayController();
  arrayController.unshiftObject(null);
  var firstController = arrayController.objectAtContent(0);
  ok(controllerClass.detectInstance(firstController), "A controller is still created for null objects");
});

test("the target of item controllers is the parent controller", function() {
  createArrayController();

  var jaimeController = arrayController.objectAtContent(1);

  equal(jaimeController.get('target'), arrayController, "Item controllers' targets are their parent controller");
});

test("the parentController property of item controllers is set to the parent controller", function() {
  createArrayController();

  var jaimeController = arrayController.objectAtContent(1);

  equal(jaimeController.get('parentController'), arrayController, "Item controllers' targets are their parent controller");
});

test("when the underlying object has not changed, `objectAtContent` always returns the same instance", function() {
  createArrayController();

  strictEqual(arrayController.objectAtContent(1), arrayController.objectAtContent(1), "Controller instances are reused");
});

test("when the index changes, `objectAtContent` still returns the same instance", function() {
  createArrayController();
  var jaimeController = arrayController.objectAtContent(1);
  arrayController.unshiftObject(tyrion);

  strictEqual(arrayController.objectAtContent(2), jaimeController, "Controller instances are reused");
});

test("when the underlying array changes, old subcontainers are destroyed", function() {
  createArrayController();
  // cause some controllers to be instantiated
  arrayController.objectAtContent(1);
  arrayController.objectAtContent(2);

  // Not a public API; just checking for cleanup
  var subControllers = get(arrayController, '_subControllers'),
      jaimeController = subControllers[1],
      cerseiController = subControllers[2];

  equal(!!jaimeController.isDestroying, false, "precond - nobody is destroyed yet");
  equal(!!cerseiController.isDestroying, false, "precond - nobody is destroyed yet");

  Ember.run(function() {
    arrayController.set('content', Ember.A());
  });

  equal(!!jaimeController.isDestroying, true, "old subcontainers are destroyed");
  equal(!!cerseiController.isDestroying, true, "old subcontainers are destroyed");
});


test("item controllers are created lazily", function() {
  createArrayController();

  equal(itemControllerCount, 0, "precond - no item controllers yet");

  arrayController.objectAtContent(1);

  equal(itemControllerCount, 1, "item controllers are created lazily");
});

test("when items are removed from the arrayController, their respective subcontainers are destroyed", function() {
  createArrayController();
  var jaimeController = arrayController.objectAtContent(1),
      cerseiController = arrayController.objectAtContent(2),
      subControllers = get(arrayController, '_subControllers');

  equal(!!jaimeController.isDestroyed, false, "precond - nobody is destroyed yet");
  equal(!!cerseiController.isDestroyed, false, "precond - nobody is destroyed yet");

  Ember.run(function() {
    arrayController.removeObject(cerseiController);
  });

  equal(!!cerseiController.isDestroying, true, "Removed objects' containers are cleaned up");
  equal(!!jaimeController.isDestroying, false, "Retained objects' containers are not cleaned up");
});

test("one cannot remove wrapped content directly when specifying `itemController`", function() {
  createArrayController();
  var jaimeController = arrayController.objectAtContent(1),
      cerseiController = arrayController.objectAtContent(2);

  equal(arrayController.get('length'), 3, "precondition - array is in initial state");
  arrayController.removeObject(cersei);

  equal(arrayController.get('length'), 3, "cannot remove wrapped objects directly");

  Ember.run(function() {
    arrayController.removeObject(cerseiController);
  });
  equal(arrayController.get('length'), 2, "can remove wrapper objects");
});

test("when items are removed from the underlying array, their respective subcontainers are destroyed", function() {
  createArrayController();
  var jaimeController = arrayController.objectAtContent(1),
      cerseiController = arrayController.objectAtContent(2),
      subContainers = get(arrayController, 'subContainers');

  equal(!!jaimeController.isDestroying, false, "precond - nobody is destroyed yet");
  equal(!!cerseiController.isDestroying, false, "precond - nobody is destroyed yet");

  Ember.run(function() {
    lannisters.removeObject(cersei); // if only it were that easy
  });

  equal(!!jaimeController.isDestroyed, false, "Retained objects' containers are not cleaned up");
  equal(!!cerseiController.isDestroyed, true, "Removed objects' containers are cleaned up");
});

test("`itemController` can be dynamic by overwriting `lookupItemController`", function() {
  createDynamicArrayController();

  var tywinController = arrayController.objectAtContent(0),
      jaimeController = arrayController.objectAtContent(1);

  ok(controllerClass.detectInstance(tywinController), "lookupItemController can return different classes for different objects");
  ok(otherControllerClass.detectInstance(jaimeController), "lookupItemController can return different classes for different objects");
});

test("when `idx` is out of range, `lookupItemController` is not called", function() {
  arrayController = Ember.ArrayController.create({
    container: container,
    lookupItemController: function(object) {
      ok(false, "`lookupItemController` should not be called when `idx` is out of range");
    },
    content: lannisters
  });

  strictEqual(arrayController.objectAtContent(50), undefined, "no controllers are created for indexes that are superior to the length");
  strictEqual(arrayController.objectAtContent(-1), undefined, "no controllers are created for indexes less than zero");
});

test("if `lookupItemController` returns a string, it must be resolvable by the container", function() {
  arrayController = Ember.ArrayController.create({
    container: container,
    lookupItemController: function(object) {
      return "NonExistant";
    },
    content: lannisters
  });

  throws(function() {
      arrayController.objectAtContent(1);
    },
    /NonExistant/,
    "`lookupItemController` must return either null or a valid controller name");
});

test("array observers can invoke `objectAt` without overwriting existing item controllers", function() {
  createArrayController();

  var tywinController = arrayController.objectAtContent(0),
      arrayObserverCalled = false;

  arrayController.reopen({
    lannistersWillChange: Ember.K,
    lannistersDidChange: function(_, idx, removedAmt, addedAmt) {
      arrayObserverCalled = true;
      equal(this.objectAt(idx).get('name'), "Tyrion", "Array observers get the right object via `objectAt`");
    }
  });
  arrayController.addArrayObserver(arrayController, {
    willChange: 'lannistersWillChange',
    didChange: 'lannistersDidChange'
  });

  Ember.run(function() {
    lannisters.unshiftObject(tyrion);
  });

  equal(arrayObserverCalled, true, "Array observers are called normally");
  equal(tywinController.get('name'), "Tywin", "Array observers calling `objectAt` does not overwrite existing controllers' content");
});

module('Ember.ArrayController - itemController with arrayComputed', {
  setup: function() {
    container = new Ember.Container();

    cersei = Ember.Object.create({ name: 'Cersei' });
    jaime = Ember.Object.create({ name: 'Jaime' });
    lannisters = Ember.A([ jaime, cersei ]);

    controllerClass = Ember.ObjectController.extend({
      title: Ember.computed(function () {
        switch (get(this, 'name')) {
          case 'Jaime':   return 'Kingsguard';
          case 'Cersei':  return 'Queen';
        }
      }).property('name'),

      toString: function() {
        return "itemController for " + this.get('name');
      }
    });

    container.register("controller:Item", controllerClass);
  },
  teardown: function() {
    Ember.run(function() {
      container.destroy();
    });
  }
});

test("item controllers can be used to provide properties for array computed macros", function() {
  createArrayController();

  ok(Ember.compare(Ember.guidFor(cersei), Ember.guidFor(jaime)) < 0, "precond - guid tiebreaker would fail test");

  arrayController.reopen({
    sortProperties: Ember.A(['title']),
    sorted: Ember.computed.sort('@this', 'sortProperties')
  });

  deepEqual(arrayController.get('sorted').mapProperty('name'), ['Jaime', 'Cersei'], "ArrayController items can be sorted on itemController properties");
});

})();

(function() {
/*globals module ok equals same test MyApp */

// test parsing of query string
var v = [];
module("Ember.compare()", {
  setup: function() {
    // setup dummy data
    v[0]  = null;
    v[1]  = false;
    v[2]  = true;
    v[3]  = -12;
    v[4]  = 3.5;
    v[5]  = 'a string';
    v[6]  = 'another string';
    v[7]  = 'last string';
    v[8]  = [1,2];
    v[9]  = [1,2,3];
    v[10] = [1,3];
    v[11] = {a: 'hash'};
    v[12] = Ember.Object.create();
    v[13] = function (a) {return a;};
    v[14] = new Date('2012/01/01');
    v[15] = new Date('2012/06/06');
  }
});


// ..........................................................
// TESTS
//

test("ordering should work", function() {
  for (var j=0; j < v.length; j++) {
    equal(Ember.compare(v[j],v[j]), 0, j +' should equal itself');
    for (var i=j+1; i < v.length; i++) {
      equal(Ember.compare(v[j],v[i]), -1, 'v[' + j + '] (' + Ember.typeOf(v[j]) + ') should be smaller than v[' + i + '] (' + Ember.typeOf(v[i]) + ')' );
    }

  }
});


})();

(function() {
module("Ember Copy Method");

test("Ember.copy null", function() {
  var obj = {field: null};
  equal(Ember.copy(obj, true).field, null, "null should still be null");
});


})();

(function() {
module("Ember.inspect");

var inspect = Ember.inspect;

test("strings", function() {
  equal(inspect("foo"), "foo");
});

test("numbers", function() {
  equal(inspect(2.6), "2.6");
});

test("null", function() {
  equal(inspect(null), "null");
});

test("undefined", function() {
  equal(inspect(undefined), "undefined");
});

test("true", function() {
  equal(inspect(true), "true");
});

test("false", function() {
  equal(inspect(false), "false");
});

test("object", function() {
  equal(inspect({}), "{}");
  equal(inspect({ foo: 'bar' }), "{foo: bar}");
  equal(inspect({ foo: Ember.K }), "{foo: function() { ... }}");
});

test("array", function() {
  equal(inspect([1,2,3]), "[1,2,3]");
});

test("regexp", function() {
  equal(inspect(/regexp/), "/regexp/");
});

test("date", function() {
  var inspected = inspect(new Date("Sat Apr 30 2011 13:24:11"));
  ok(inspected.match(/Sat Apr 30/), "The inspected date has its date");
  ok(inspected.match(/2011/), "The inspected date has its year");
  ok(inspected.match(/13:24:11/), "The inspected date has its time");
});

})();

(function() {
// ========================================================================
// Ember.isEqual Tests
// ========================================================================
/*globals module test */

module("isEqual");

test("undefined and null", function() {
  ok(  Ember.isEqual(undefined, undefined), "undefined is equal to undefined" );
  ok( !Ember.isEqual(undefined, null),      "undefined is not equal to null" );
  ok(  Ember.isEqual(null, null),           "null is equal to null" );
  ok( !Ember.isEqual(null, undefined),      "null is not equal to undefined" );
});

test("strings should be equal",function() {
	ok( !Ember.isEqual("Hello", "Hi"),    "different Strings are unequal" );
	ok(  Ember.isEqual("Hello", "Hello"), "same Strings are equal" );
});

test("numericals should be equal",function() {
  ok(  Ember.isEqual(24, 24), "same numbers are equal" );
	ok( !Ember.isEqual(24, 21), "different numbers are inequal" );
});

test("array should be equal",function() {
	// NOTE: We don't test for array contents -- that would be too expensive.
	ok( !Ember.isEqual( [1,2], [1,2] ), 'two array instances with the same values should not be equal' );
	ok( !Ember.isEqual( [1,2], [1] ),   'two array instances with different values should not be equal' );
});

test("first object implements isEqual should use it", function() {
  ok(Ember.isEqual({ isEqual: function() { return true; } }, null), 'should return true always');

  var obj = { isEqual: function() { return false; } };
  equal(Ember.isEqual(obj, obj), false, 'should return false because isEqual returns false');
});



})();

(function() {
module("Ember Type Checking");

test("Ember.isArray" ,function() {
  var arrayProxy = Ember.ArrayProxy.create({ content: Ember.A() });

  equal(Ember.isArray(arrayProxy), true, "[]");
});

})();

(function() {
module("Ember.isEmpty");

test("Ember.isEmpty", function() {
  var arrayProxy = Ember.ArrayProxy.create({ content: Ember.A() });

  equal(true,  Ember.isEmpty(arrayProxy), "for an ArrayProxy that has empty content");
});

})();

(function() {
// ========================================================================
// Ember.keys Tests
// ========================================================================
/*globals module test */

module("Fetch Keys ");

test("should get a key array for a specified object", function() {
  var object1 = {};

  object1.names = "Rahul";
  object1.age = "23";
  object1.place = "Mangalore";

  var object2 = Ember.keys(object1);

  deepEqual(object2, ['names','age','place']);
});

test("should get a key array for a specified Ember.Object", function() {
  var object1 = Ember.Object.create({
    names: "Rahul",
    age: "23",
    place: "Mangalore"
  });

  var object2 = Ember.keys(object1);

  deepEqual(object2, ['names','age','place']);
});

// This test is for IE8.
test("should get a key array for property that is named the same as prototype property", function() {
  var object1 = {
    toString: function() {}
  };

  var object2 = Ember.keys(object1);

  deepEqual(object2, ['toString']);
});

test('should not contain properties declared in the prototype', function () {
  var beer = Ember.Object.extend({
    type: 'ipa'
  }).create();

  var keys = Ember.keys(beer);

  deepEqual(keys, []);
});

test('should return properties that were set after object creation', function () {
  var beer = Ember.Object.extend({
    type: 'ipa'
  }).create();

  Ember.set(beer, 'brand', 'big daddy');

  var keys = Ember.keys(beer);

  deepEqual(keys, ['brand']);
});

module('Keys behavior with observers');

test('should not leak properties on the prototype', function () {
  var beer = Ember.Object.extend({
    type: 'ipa'
  }).create();

  Ember.addObserver(beer, 'type', Ember.K);
  deepEqual(Ember.keys(beer), []);
  Ember.removeObserver(beer, 'type', Ember.K);
});

test('observing a non existent property', function () {
  var beer = Ember.Object.extend({
    type: 'ipa'
  }).create();

  Ember.addObserver(beer, 'brand', Ember.K);

  deepEqual(Ember.keys(beer), []);

  Ember.set(beer, 'brand', 'Corona');
  deepEqual(Ember.keys(beer), ['brand']);

  Ember.removeObserver(beer, 'brand', Ember.K);
});

test('with observers switched on and off', function () {
  var beer = Ember.Object.extend({
    type: 'ipa'
  }).create();

  Ember.addObserver(beer, 'type', Ember.K);
  Ember.removeObserver(beer, 'type', Ember.K);

  deepEqual(Ember.keys(beer), []);
});

test('observers switched on and off with setter in between', function () {
  var beer = Ember.Object.extend({
    type: 'ipa'
  }).create();

  Ember.addObserver(beer, 'type', Ember.K);
  Ember.set(beer, 'type', 'ale');
  Ember.removeObserver(beer, 'type', Ember.K);

  deepEqual(Ember.keys(beer), ['type']);
});

test('observer switched on and off and then setter', function () {
  var beer = Ember.Object.extend({
    type: 'ipa'
  }).create();

  Ember.addObserver(beer, 'type', Ember.K);
  Ember.removeObserver(beer, 'type', Ember.K);
  Ember.set(beer, 'type', 'ale');

  deepEqual(Ember.keys(beer), ['type']);
});

})();

(function() {
module("Ember Type Checking");

test("Ember.typeOf", function() {
	var a = null,
      arr = [1,2,3],
      obj = {},
      object = Ember.Object.create({ method: function() {} });

  equal(Ember.typeOf(undefined),     'undefined', "item of type undefined");
  equal(Ember.typeOf(a),             'null',      "item of type null");
	equal(Ember.typeOf(arr),           'array',     "item of type array");
	equal(Ember.typeOf(obj),           'object',    "item of type object");
	equal(Ember.typeOf(object),        'instance',  "item of type instance");
	equal(Ember.typeOf(object.method), 'function',  "item of type function") ;
	equal(Ember.typeOf(Ember.Object),     'class',     "item of type class");
  equal(Ember.typeOf(new Error()),   'error',     "item of type error");
});


})();

(function() {
/*globals testBoth */

require('ember-runtime/~tests/props_helper');

module('Function.prototype.observes() helper');

testBoth('global observer helper takes multiple params', function(get, set) {

  if (Ember.EXTEND_PROTOTYPES === false) {
    ok("undefined" === typeof Function.prototype.observes, 'Function.prototype helper disabled');
    return ;
  }

  var MyMixin = Ember.Mixin.create({

    count: 0,

    foo: function() {
      set(this, 'count', get(this, 'count')+1);
    }.observes('bar', 'baz')

  });

  var obj = Ember.mixin({}, MyMixin);
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', "BAZ");
  set(obj, 'baz', "BAZ");
  equal(get(obj, 'count'), 2, 'should invoke observer after change');
});

module('Function.prototype.on() helper');

testBoth('sets up an event listener, and can trigger the function on multiple events', function(get, set) {

  if (Ember.EXTEND_PROTOTYPES === false) {
    ok("undefined" === typeof Function.prototype.on, 'Function.prototype helper disabled');
    return ;
  }

  var MyMixin = Ember.Mixin.create({

    count: 0,

    foo: function() {
      set(this, 'count', get(this, 'count')+1);
    }.on('bar', 'baz')

  });

  var obj = Ember.mixin({}, Ember.Evented, MyMixin);
  equal(get(obj, 'count'), 0, 'should not invoke listener immediately');

  obj.trigger('bar');
  obj.trigger('baz');
  equal(get(obj, 'count'), 2, 'should invoke listeners when events trigger');
});

testBoth('can be chained with observes', function(get, set) {

  if (Ember.EXTEND_PROTOTYPES === false) {
    ok('Function.prototype helper disabled');
    return ;
  }

  var MyMixin = Ember.Mixin.create({

    count: 0,
    bay: 'bay',
    foo: function() {
      set(this, 'count', get(this, 'count')+1);
    }.observes('bay').on('bar')
  });

  var obj = Ember.mixin({}, Ember.Evented, MyMixin);
  equal(get(obj, 'count'), 0, 'should not invoke listener immediately');

  set(obj, 'bay', 'BAY');
  obj.trigger('bar');
  equal(get(obj, 'count'), 2, 'should invoke observer and listener');
});

module('Function.prototype.property() helper');

testBoth('sets up a ComputedProperty', function(get, set) {

  if (Ember.EXTEND_PROTOTYPES === false) {
    ok("undefined" === typeof Function.prototype.property, 'Function.prototype helper disabled');
    return ;
  }

  var MyClass = Ember.Object.extend({
    firstName: null,
    lastName: null,
    fullName: function() {
      return get(this, 'firstName') + ' ' + get(this, 'lastName');
    }.property('firstName', 'lastName')
  });

  var obj = MyClass.create({firstName: 'Fred', lastName: 'Flinstone'});
  equal(get(obj, 'fullName'), 'Fred Flinstone', 'should return the computed value');

  set(obj, 'firstName', "Wilma");
  equal(get(obj, 'fullName'), 'Wilma Flinstone', 'should return the new computed value');

  set(obj, 'lastName', "");
  equal(get(obj, 'fullName'), 'Wilma ', 'should return the new computed value');
});

})();

(function() {
module('system/mixin/binding_test');

test('Defining a property ending in Binding should setup binding when applied', function() {

  var MyMixin = Ember.Mixin.create({
    fooBinding: 'bar.baz'
  });

  var obj = { bar: { baz: 'BIFF' } };

  Ember.run(function() {
    MyMixin.apply(obj);
  });

  ok(Ember.get(obj, 'fooBinding') instanceof Ember.Binding, 'should be a binding object');
  equal(Ember.get(obj, 'foo'), 'BIFF', 'binding should be created and synced');

});

test('Defining a property ending in Binding should apply to prototype children', function() {
  var MyMixin, obj, obj2;

  Ember.run(function() {
    MyMixin = Ember.Mixin.create({
      fooBinding: 'bar.baz'
    });
  });

  obj = { bar: { baz: 'BIFF' } };

  Ember.run(function() {
    MyMixin.apply(obj);
  });


  obj2 = Ember.create(obj);
  Ember.run(function() {
    Ember.set(Ember.get(obj2, 'bar'), 'baz', 'BARG');
  });


  ok(Ember.get(obj2, 'fooBinding') instanceof Ember.Binding, 'should be a binding object');
  equal(Ember.get(obj2, 'foo'), 'BARG', 'binding should be created and synced');

});

})();

(function() {
module('Ember.RSVP');

test('Ensure that errors thrown from within a promise are sent to the console', function(){
  var error = new Error('Error thrown in a promise for testing purposes.');

  try {
    Ember.run(function(){
      new Ember.RSVP.Promise(function(resolve, reject){
        throw error;
      });
    });
    ok(false, 'expected assertion to be thrown');
  } catch (e) {
    equal(e, error, "error was re-thrown");
  }
});

})();

(function() {
/*
  NOTE: This test is adapted from the 1.x series of unit tests.  The tests
  are the same except for places where we intend to break the API we instead
  validate that we warn the developer appropriately.

  CHANGES FROM 1.6:

  * changed obj.set() and obj.get() to Ember.set() and Ember.get()
  * changed obj.addObserver() to Ember.addObserver()
*/

var get = Ember.get, set = Ember.set;

module("Ember.Observable - Observing with @each");

test("chained observers on enumerable properties are triggered when the observed property of any item changes", function() {
  var family = Ember.Object.create({ momma: null });
  var momma = Ember.Object.create({ children: [] });

  var child1 = Ember.Object.create({ name: "Bartholomew" });
  var child2 = Ember.Object.create({ name: "Agnes" });
  var child3 = Ember.Object.create({ name: "Dan" });
  var child4 = Ember.Object.create({ name: "Nancy" });

  set(family, 'momma', momma);
  set(momma, 'children', Ember.A([child1, child2, child3]));

  var observerFiredCount = 0;
  Ember.addObserver(family, 'momma.children.@each.name', this, function() {
    observerFiredCount++;
  });

  observerFiredCount = 0;
  Ember.run(function() { get(momma, 'children').setEach('name', 'Juan'); });
  equal(observerFiredCount, 3, "observer fired after changing child names");

  observerFiredCount = 0;
  Ember.run(function() { get(momma, 'children').pushObject(child4); });
  equal(observerFiredCount, 1, "observer fired after adding a new item");

  observerFiredCount = 0;
  Ember.run(function() { set(child4, 'name', "Herbert"); });
  equal(observerFiredCount, 1, "observer fired after changing property on new object");

  set(momma, 'children', []);

  observerFiredCount = 0;
  Ember.run(function() { set(child1, 'name', "Hanna"); });
  equal(observerFiredCount, 0, "observer did not fire after removing changing property on a removed object");
});


})();

(function() {
/*global Namespace:true DepObj:true*/

var get = Ember.get, set = Ember.set;
var forEach = Ember.EnumerableUtils.forEach;

/*
  NOTE: This test is adapted from the 1.x series of unit tests.  The tests
  are the same except for places where we intend to break the API we instead
  validate that we warn the developer appropriately.

  CHANGES FROM 1.6:

  * Added ObservableObject which applies the Ember.Observable mixin.
  * Changed reference to Ember.T_FUNCTION to 'function'
  * Changed all references to sc_super to this._super()
  * Changed Ember.objectForPropertyPath() to Ember.getPath()
  * Removed allPropertiesDidChange test - no longer supported
  * Changed test that uses 'ObjectE' as path to 'objectE' to reflect new
    rule on using capital letters for property paths.
  * Removed test passing context to addObserver.  context param is no longer
    supported.
  * Changed calls to Ember.Binding.flushPendingChanges() -> Ember.run.sync()
  * removed test in observer around line 862 that expected key/value to be
    the last item in the chained path.  Should be root and chained path

*/

// ========================================================================
// Ember.Observable Tests
// ========================================================================

var object, ObjectC, ObjectD, objectA, objectB ;

var ObservableObject = Ember.Object.extend(Ember.Observable);
var originalLookup = Ember.lookup, lookup;

// ..........................................................
// GET()
//

module("object.get()", {

  setup: function() {
    object = ObservableObject.createWithMixins(Ember.Observable, {

      normal: 'value',
      numberVal: 24,
      toggleVal: true,

      computed: Ember.computed(function() { return 'value'; }).volatile(),

      method: function() { return "value"; },

      nullProperty: null,

      unknownProperty: function(key, value) {
        this.lastUnknownProperty = key ;
        return "unknown" ;
      }

    });
  }

});

test("should get normal properties", function() {
  equal(object.get('normal'), 'value') ;
});

test("should call computed properties and return their result", function() {
  equal(object.get("computed"), "value") ;
});

test("should return the function for a non-computed property", function() {
  var value = object.get("method") ;
  equal(Ember.typeOf(value), 'function') ;
});

test("should return null when property value is null", function() {
  equal(object.get("nullProperty"), null) ;
});

test("should call unknownProperty when value is undefined", function() {
  equal(object.get("unknown"), "unknown") ;
  equal(object.lastUnknownProperty, "unknown") ;
});

// ..........................................................
// Ember.GET()
//
module("Ember.get()", {
  setup: function() {
    objectA = ObservableObject.createWithMixins({

      normal: 'value',
      numberVal: 24,
      toggleVal: true,

      computed: Ember.computed(function() { return 'value'; }).volatile(),

      method: function() { return "value"; },

      nullProperty: null,

      unknownProperty: function(key, value) {
        this.lastUnknownProperty = key ;
        return "unknown" ;
      }

    });

    objectB = {
      normal: 'value',

      nullProperty: null
    };
  }
});

test("should get normal properties on Ember.Observable", function() {
  equal(Ember.get(objectA, 'normal'), 'value') ;
});

test("should call computed properties on Ember.Observable and return their result", function() {
  equal(Ember.get(objectA, "computed"), "value") ;
});

test("should return the function for a non-computed property on Ember.Observable", function() {
  var value = Ember.get(objectA, "method") ;
  equal(Ember.typeOf(value), 'function') ;
});

test("should return null when property value is null on Ember.Observable", function() {
  equal(Ember.get(objectA, "nullProperty"), null) ;
});

test("should call unknownProperty when value is undefined on Ember.Observable", function() {
  equal(Ember.get(object, "unknown"), "unknown") ;
  equal(object.lastUnknownProperty, "unknown") ;
});

test("should get normal properties on standard objects", function() {
  equal(Ember.get(objectB, 'normal'), 'value');
});

test("should return null when property is null on standard objects", function() {
  equal(Ember.get(objectB, 'nullProperty'), null);
});

/*
test("raise if the provided object is null", function() {
  raises(function() {
    Ember.get(null, 'key');
  });
});
*/

test("raise if the provided object is undefined", function() {
  expectAssertion(function() {
    Ember.get(undefined, 'key');
  }, /Cannot call get with 'key' on an undefined object/i);
});

test("should work when object is Ember (used in Ember.get)", function() {
  equal(Ember.get('Ember.RunLoop'), Ember.RunLoop, 'Ember.get');
  equal(Ember.get(Ember, 'RunLoop'), Ember.RunLoop, 'Ember.get(Ember, RunLoop)');
});

module("Ember.get() with paths", {
  setup: function() {
    lookup = Ember.lookup = {};
  },

  teardown: function() {
    Ember.lookup = originalLookup;
  }
});

test("should return a property at a given path relative to the lookup", function() {
  lookup.Foo = ObservableObject.create({
    Bar: ObservableObject.createWithMixins({
      Baz: Ember.computed(function() { return "blargh"; }).volatile()
    })
  });

  equal(Ember.get('Foo.Bar.Baz'), "blargh");
});

test("should return a property at a given path relative to the passed object", function() {
  var foo = ObservableObject.create({
    bar: ObservableObject.createWithMixins({
      baz: Ember.computed(function() { return "blargh"; }).volatile()
    })
  });

  equal(Ember.get(foo, 'bar.baz'), "blargh");
});

test("should return a property at a given path relative to the lookup - JavaScript hash", function() {
  lookup.Foo = {
    Bar: {
      Baz: "blargh"
    }
  };

  equal(Ember.get('Foo.Bar.Baz'), "blargh");
});

test("should return a property at a given path relative to the passed object - JavaScript hash", function() {
  var foo = {
    bar: {
      baz: "blargh"
    }
  };

  equal(Ember.get(foo, 'bar.baz'), "blargh");
});

// ..........................................................
// SET()
//

module("object.set()", {

  setup: function() {
    object = ObservableObject.createWithMixins({

      // normal property
      normal: 'value',

      // computed property
      _computed: "computed",
      computed: Ember.computed(function(key, value) {
        if (value !== undefined) {
          this._computed = value ;
        }
        return this._computed ;
      }).volatile(),

      // method, but not a property
      _method: "method",
      method: function(key, value) {
        if (value !== undefined) {
          this._method = value ;
        }
        return this._method ;
      },

      // null property
      nullProperty: null,

      // unknown property
      _unknown: 'unknown',
      unknownProperty: function(key) {
        return this._unknown ;
      },

      setUnknownProperty: function(key, value) {
        this._unknown = value ;
        return this._unknown ;
      }
    });
  }

});

test("should change normal properties and return this", function() {
  var ret = object.set("normal", "changed") ;
  equal(object.normal, "changed") ;
  equal(ret, object) ;
});

test("should call computed properties passing value and return this", function() {
  var ret = object.set("computed", "changed") ;
  equal(object._computed, "changed") ;
  equal(ret, object) ;
});

test("should change normal properties when passing undefined", function() {
  var ret = object.set('normal', undefined);
  equal(object.normal, undefined);
  equal(ret, object);
});

test("should replace the function for a non-computed property and return this", function() {
  var ret = object.set("method", "changed") ;
  equal(object._method, "method") ; // make sure this was NOT run
  ok(Ember.typeOf(object.method) !== 'function') ;
  equal(ret, object) ;
});

test("should replace prover when property value is null", function() {
  var ret = object.set("nullProperty", "changed") ;
  equal(object.nullProperty, "changed") ;
  equal(ret, object) ;
});

test("should call unknownProperty with value when property is undefined", function() {
  var ret = object.set("unknown", "changed") ;
  equal(object._unknown, "changed") ;
  equal(ret, object) ;
});

// ..........................................................
// COMPUTED PROPERTIES
//

module("Computed properties", {
  setup: function() {
    lookup = Ember.lookup = {};

    object = ObservableObject.createWithMixins({

      // REGULAR

      computedCalls: [],
      computed: Ember.computed(function(key, value) {
        this.computedCalls.push(value);
        return 'computed';
      }).volatile(),

      computedCachedCalls: [],
      computedCached: Ember.computed(function(key, value) {
        this.computedCachedCalls.push(value);
        return 'computedCached';
      }),


      // DEPENDENT KEYS

      changer: 'foo',

      dependentCalls: [],
      dependent: Ember.computed(function(key, value) {
        this.dependentCalls.push(value);
        return 'dependent';
      }).property('changer').volatile(),

      dependentFrontCalls: [],
      dependentFront: Ember.computed('changer', function(key, value) {
        this.dependentFrontCalls.push(value);
        return 'dependentFront';
      }).volatile(),

      dependentCachedCalls: [],
      dependentCached: Ember.computed(function(key, value) {
        this.dependentCachedCalls.push(value);
        return 'dependentCached';
      }).property('changer'),

      // everytime it is recomputed, increments call
      incCallCount: 0,
      inc: Ember.computed(function() {
        return this.incCallCount++;
      }).property('changer'),

      // depends on cached property which depends on another property...
      nestedIncCallCount: 0,
      nestedInc: Ember.computed(function(key, value) {
        Ember.get(this, 'inc');
        return this.nestedIncCallCount++;
      }).property('inc'),

      // two computed properties that depend on a third property
      state: 'on',
      isOn: Ember.computed(function(key, value) {
        if (value !== undefined) this.set('state', 'on');
        return this.get('state') === 'on';
      }).property('state').volatile(),

      isOff: Ember.computed(function(key, value) {
        if (value !== undefined) this.set('state', 'off');
        return this.get('state') === 'off';
      }).property('state').volatile()

    }) ;
  },
  teardown: function() {
    Ember.lookup = originalLookup;
  }
});

test("getting values should call function return value", function() {

  // get each property twice. Verify return.
  var keys = Ember.String.w('computed computedCached dependent dependentFront dependentCached');

  forEach(keys, function(key) {
    equal(object.get(key), key, Ember.String.fmt('Try #1: object.get(%@) should run function', [key]));
    equal(object.get(key), key, Ember.String.fmt('Try #2: object.get(%@) should run function', [key]));
  });

  // verify each call count.  cached should only be called once
  forEach(Ember.String.w('computedCalls dependentFrontCalls dependentCalls'), function(key) {
    equal(object[key].length, 2, Ember.String.fmt('non-cached property %@ should be called 2x', [key]));
  });

  forEach(Ember.String.w('computedCachedCalls dependentCachedCalls'), function(key) {
    equal(object[key].length, 1, Ember.String.fmt('non-cached property %@ should be called 1x', [key]));
  });

});

test("setting values should call function return value", function() {

  // get each property twice. Verify return.
  var keys = Ember.String.w('computed dependent dependentFront computedCached dependentCached');
  var values = Ember.String.w('value1 value2');

  forEach(keys, function(key) {

    equal(object.set(key, values[0]), object, Ember.String.fmt('Try #1: object.set(%@, %@) should run function', [key, values[0]]));

    equal(object.set(key, values[1]), object, Ember.String.fmt('Try #2: object.set(%@, %@) should run function', [key, values[1]]));

    equal(object.set(key, values[1]), object, Ember.String.fmt('Try #3: object.set(%@, %@) should not run function since it is setting same value as before', [key, values[1]]));

  });


  // verify each call count.  cached should only be called once
  forEach(keys, function(key) {
    var calls = object[key + 'Calls'], idx;
    var expectedLength;

    // Cached properties first check their cached value before setting the
    // property. Other properties blindly call set.
    expectedLength = 3;
    equal(calls.length, expectedLength, Ember.String.fmt('set(%@) should be called the right amount of times', [key]));
    for(idx=0;idx<2;idx++) {
      equal(calls[idx], values[idx], Ember.String.fmt('call #%@ to set(%@) should have passed value %@', [idx+1, key, values[idx]]));
    }
  });

});

test("notify change should clear cache", function() {

  // call get several times to collect call count
  object.get('computedCached'); // should run func
  object.get('computedCached'); // should not run func

  object.propertyWillChange('computedCached')
    .propertyDidChange('computedCached');

  object.get('computedCached'); // should run again
  equal(object.computedCachedCalls.length, 2, 'should have invoked method 2x');
});

test("change dependent should clear cache", function() {

  // call get several times to collect call count
  var ret1 = object.get('inc'); // should run func
  equal(object.get('inc'), ret1, 'multiple calls should not run cached prop');

  object.set('changer', 'bar');

  equal(object.get('inc'), ret1+1, 'should increment after dependent key changes'); // should run again
});

test("just notifying change of dependent should clear cache", function() {

  // call get several times to collect call count
  var ret1 = object.get('inc'); // should run func
  equal(object.get('inc'), ret1, 'multiple calls should not run cached prop');

  object.notifyPropertyChange('changer');

  equal(object.get('inc'), ret1+1, 'should increment after dependent key changes'); // should run again
});

test("changing dependent should clear nested cache", function() {

  // call get several times to collect call count
  var ret1 = object.get('nestedInc'); // should run func
  equal(object.get('nestedInc'), ret1, 'multiple calls should not run cached prop');

  object.set('changer', 'bar');

  equal(object.get('nestedInc'), ret1+1, 'should increment after dependent key changes'); // should run again

});

test("just notifying change of dependent should clear nested cache", function() {

  // call get several times to collect call count
  var ret1 = object.get('nestedInc'); // should run func
  equal(object.get('nestedInc'), ret1, 'multiple calls should not run cached prop');

  object.notifyPropertyChange('changer');

  equal(object.get('nestedInc'), ret1+1, 'should increment after dependent key changes'); // should run again

});


// This verifies a specific bug encountered where observers for computed
// properties would fire before their prop caches were cleared.
test("change dependent should clear cache when observers of dependent are called", function() {

  // call get several times to collect call count
  var ret1 = object.get('inc'); // should run func
  equal(object.get('inc'), ret1, 'multiple calls should not run cached prop');

  // add observer to verify change...
  object.addObserver('inc', this, function() {
    equal(object.get('inc'), ret1+1, 'should increment after dependent key changes'); // should run again
  });

  // now run
  object.set('changer', 'bar');

});

test('setting one of two computed properties that depend on a third property should clear the kvo cache', function() {
  // we have to call set twice to fill up the cache
  object.set('isOff', true);
  object.set('isOn', true);

  // setting isOff to true should clear the kvo cache
  object.set('isOff', true);
  equal(object.get('isOff'), true, 'object.isOff should be true');
  equal(object.get('isOn'), false, 'object.isOn should be false');
});

test("dependent keys should be able to be specified as property paths", function() {
  var depObj = ObservableObject.createWithMixins({
    menu: ObservableObject.create({
      price: 5
    }),

    menuPrice: Ember.computed(function() {
      return this.get('menu.price');
    }).property('menu.price')
  });

  equal(depObj.get('menuPrice'), 5, "precond - initial value returns 5");

  depObj.set('menu.price', 6);

  equal(depObj.get('menuPrice'), 6, "cache is properly invalidated after nested property changes");
});

test("nested dependent keys should propagate after they update", function() {
  var bindObj;
  Ember.run(function () {
    lookup.DepObj = ObservableObject.createWithMixins({
      restaurant: ObservableObject.create({
        menu: ObservableObject.create({
          price: 5
        })
      }),

      price: Ember.computed(function() {
        return this.get('restaurant.menu.price');
      }).property('restaurant.menu.price')
    });

    bindObj = ObservableObject.createWithMixins({
      priceBinding: "DepObj.price"
    });
  });

  equal(bindObj.get('price'), 5, "precond - binding propagates");

  Ember.run(function () {
    lookup.DepObj.set('restaurant.menu.price', 10);
  });

  equal(bindObj.get('price'), 10, "binding propagates after a nested dependent keys updates");

  Ember.run(function () {
    lookup.DepObj.set('restaurant.menu', ObservableObject.create({
      price: 15
    }));
  });

  equal(bindObj.get('price'), 15, "binding propagates after a middle dependent keys updates");
});

test("cacheable nested dependent keys should clear after their dependencies update", function() {
  ok(true);

  var DepObj;

  Ember.run(function() {
    lookup.DepObj = DepObj = ObservableObject.createWithMixins({
      restaurant: ObservableObject.create({
        menu: ObservableObject.create({
          price: 5
        })
      }),

      price: Ember.computed(function() {
        return this.get('restaurant.menu.price');
      }).property('restaurant.menu.price')
    });
  });

  equal(DepObj.get('price'), 5, "precond - computed property is correct");

  Ember.run(function() {
    DepObj.set('restaurant.menu.price', 10);
  });
  equal(DepObj.get('price'), 10, "cacheable computed properties are invalidated even if no run loop occurred");

  Ember.run(function() {
    DepObj.set('restaurant.menu.price', 20);
  });
  equal(DepObj.get('price'), 20, "cacheable computed properties are invalidated after a second get before a run loop");
  equal(DepObj.get('price'), 20, "precond - computed properties remain correct after a run loop");

  Ember.run(function() {
    DepObj.set('restaurant.menu', ObservableObject.create({
      price: 15
    }));
  });


  equal(DepObj.get('price'), 15, "cacheable computed properties are invalidated after a middle property changes");

  Ember.run(function() {
    DepObj.set('restaurant.menu', ObservableObject.create({
      price: 25
    }));
  });

  equal(DepObj.get('price'), 25, "cacheable computed properties are invalidated after a middle property changes again, before a run loop");
});



// ..........................................................
// OBSERVABLE OBJECTS
//

module("Observable objects & object properties ", {

  setup: function() {
    object = ObservableObject.createWithMixins({

      normal: 'value',
      abnormal: 'zeroValue',
      numberVal: 24,
      toggleVal: true,
      observedProperty: 'beingWatched',
      testRemove: 'observerToBeRemoved',
      normalArray: Ember.A([1,2,3,4,5]),

      getEach: function() {
        var keys = ['normal','abnormal'];
        var ret = [];
        for(var idx=0; idx<keys.length;idx++) {
          ret[ret.length] = this.get(keys[idx]);
        }
        return ret ;
      },

      newObserver:function() {
        this.abnormal = 'changedValueObserved';
      },

      testObserver: Ember.observer('normal', function() {
        this.abnormal = 'removedObserver';
      }),

      testArrayObserver: Ember.observer('normalArray.[]', function() {
        this.abnormal = 'notifiedObserver';
      })

    });
  }

});

test('incrementProperty and decrementProperty',function() {
  var newValue = object.incrementProperty('numberVal');

  equal(25,newValue,'numerical value incremented');
  object.numberVal = 24;
  newValue = object.decrementProperty('numberVal');
  equal(23,newValue,'numerical value decremented');
  object.numberVal = 25;
  newValue = object.incrementProperty('numberVal', 5);
  equal(30,newValue,'numerical value incremented by specified increment');
  object.numberVal = 25;
  newValue = object.incrementProperty('numberVal', -5);
  equal(20,newValue,'minus numerical value incremented by specified increment');
  object.numberVal = 25;
  newValue = object.incrementProperty('numberVal', 0);
  equal(25,newValue,'zero numerical value incremented by specified increment');

  expectAssertion(function() {
    newValue = object.incrementProperty('numberVal', (0 - void(0))); // Increment by NaN
  }, /Must pass a numeric value to incrementProperty/i);

  expectAssertion(function() {
    newValue = object.incrementProperty('numberVal', 'Ember'); // Increment by non-numeric String
  }, /Must pass a numeric value to incrementProperty/i);

  expectAssertion(function() {
    newValue = object.incrementProperty('numberVal', 1/0); // Increment by Infinity
  }, /Must pass a numeric value to incrementProperty/i);

  equal(25,newValue,'Attempting to increment by non-numeric values should not increment value');

  object.numberVal = 25;
  newValue = object.decrementProperty('numberVal',5);
  equal(20,newValue,'numerical value decremented by specified increment');
  object.numberVal = 25;
  newValue = object.decrementProperty('numberVal', -5);
  equal(30,newValue,'minus numerical value decremented by specified increment');
  object.numberVal = 25;
  newValue = object.decrementProperty('numberVal', 0);
  equal(25,newValue,'zero numerical value decremented by specified increment');

  expectAssertion(function() {
    newValue = object.decrementProperty('numberVal', (0 - void(0))); // Decrement by NaN
  }, /Must pass a numeric value to decrementProperty/i);

  expectAssertion(function() {
    newValue = object.decrementProperty('numberVal', 'Ember'); // Decrement by non-numeric String
  }, /Must pass a numeric value to decrementProperty/i);

  expectAssertion(function() {
    newValue = object.decrementProperty('numberVal', 1/0); // Decrement by Infinity
  }, /Must pass a numeric value to decrementProperty/i);

  equal(25,newValue,'Attempting to decrement by non-numeric values should not decrement value');
});

test('toggle function, should be boolean',function() {
  equal(object.toggleProperty('toggleVal',true,false),object.get('toggleVal'));
  equal(object.toggleProperty('toggleVal',true,false),object.get('toggleVal'));
  equal(object.toggleProperty('toggleVal',undefined,undefined),object.get('toggleVal'));
});

test('should notify array observer when array changes',function() {
  get(object, 'normalArray').replace(0,0,6);
  equal(object.abnormal, 'notifiedObserver', 'observer should be notified');
});

module("object.addObserver()", {
  setup: function() {

    ObjectC = ObservableObject.create({

      objectE:ObservableObject.create({
        propertyVal:"chainedProperty"
      }),

      normal: 'value',
      normal1: 'zeroValue',
      normal2: 'dependentValue',
      incrementor: 10,

      action: function() {
        this.normal1= 'newZeroValue';
      },

      observeOnceAction: function() {
        this.incrementor= this.incrementor+1;
      },

      chainedObserver:function() {
        this.normal2 = 'chainedPropertyObserved' ;
      }

    });
  }
});

test("should register an observer for a property", function() {
  ObjectC.addObserver('normal', ObjectC, 'action');
  ObjectC.set('normal','newValue');
  equal(ObjectC.normal1, 'newZeroValue');
});

test("should register an observer for a property - Special case of chained property", function() {
  ObjectC.addObserver('objectE.propertyVal',ObjectC,'chainedObserver');
  ObjectC.objectE.set('propertyVal',"chainedPropertyValue");
  equal('chainedPropertyObserved',ObjectC.normal2);
  ObjectC.normal2 = 'dependentValue';
  ObjectC.set('objectE','');
  equal('chainedPropertyObserved',ObjectC.normal2);
});

module("object.removeObserver()", {
  setup: function() {
    ObjectD = ObservableObject.create({

      objectF:ObservableObject.create({
        propertyVal:"chainedProperty"
      }),

      normal: 'value',
      normal1: 'zeroValue',
      normal2: 'dependentValue',
      ArrayKeys: ['normal','normal1'],

      addAction: function() {
        this.normal1 = 'newZeroValue';
      },
      removeAction: function() {
        this.normal2 = 'newDependentValue';
      },
      removeChainedObserver:function() {
        this.normal2 = 'chainedPropertyObserved' ;
      },

      observableValue: "hello world",

      observer1: function() {
        // Just an observer
      },
      observer2: function() {
        this.removeObserver('observableValue', null, 'observer1');
        this.removeObserver('observableValue', null, 'observer2');
        this.hasObserverFor('observableValue');   // Tickle 'getMembers()'
        this.removeObserver('observableValue', null, 'observer3');
      },
      observer3: function() {
        // Just an observer
      }
    });

  }
});

test("should unregister an observer for a property", function() {
  ObjectD.addObserver('normal', ObjectD, 'addAction');
  ObjectD.set('normal','newValue');
  equal(ObjectD.normal1, 'newZeroValue');

  ObjectD.set('normal1','zeroValue');

  ObjectD.removeObserver('normal', ObjectD, 'addAction');
  ObjectD.set('normal','newValue');
  equal(ObjectD.normal1, 'zeroValue');
});


test("should unregister an observer for a property - special case when key has a '.' in it.", function() {
  ObjectD.addObserver('objectF.propertyVal',ObjectD,'removeChainedObserver');
  ObjectD.objectF.set('propertyVal',"chainedPropertyValue");
  ObjectD.removeObserver('objectF.propertyVal',ObjectD,'removeChainedObserver');
  ObjectD.normal2 = 'dependentValue';
  ObjectD.objectF.set('propertyVal',"removedPropertyValue");
  equal('dependentValue',ObjectD.normal2);
  ObjectD.set('objectF','');
  equal('dependentValue',ObjectD.normal2);
});


test("removing an observer inside of an observer shouldn’t cause any problems", function() {
  // The observable system should be protected against clients removing
  // observers in the middle of observer notification.
  var encounteredError = false;
  try {
    ObjectD.addObserver('observableValue', null, 'observer1');
    ObjectD.addObserver('observableValue', null, 'observer2');
    ObjectD.addObserver('observableValue', null, 'observer3');
    Ember.run(function() { ObjectD.set('observableValue', "hi world"); });
  }
  catch(e) {
    encounteredError = true;
  }
  equal(encounteredError, false);
});



module("Bind function ", {

  setup: function() {
    objectA = ObservableObject.create({
      name: "Sproutcore",
      location: "Timbaktu"
    });

    objectB = ObservableObject.create({
      normal: "value",
      computed:function() {
        this.normal = 'newValue';
      }
    }) ;

    Namespace = {
      objectA: objectA,
      objectB: objectB
    } ;
  }
});

test("should bind property with method parameter as undefined", function() {
  // creating binding
  Ember.run(function() {
    objectA.bind("name", "Namespace.objectB.normal",undefined) ;
  });

  // now make a change to see if the binding triggers.
  Ember.run(function() {
    objectB.set("normal", "changedValue") ;
  });

  // support new-style bindings if available
  equal("changedValue", objectA.get("name"), "objectA.name is binded");
});

// ..........................................................
// SPECIAL CASES
//

test("changing chained observer object to null should not raise exception", function() {

  var obj = ObservableObject.create({
    foo: ObservableObject.create({
      bar: ObservableObject.create({ bat: "BAT" })
    })
  });

  var callCount = 0;
  obj.foo.addObserver('bar.bat', obj, function(target, key, value) {
    callCount++;
  });

  Ember.run(function() {
    obj.foo.set('bar', null);
  });

  equal(callCount, 1, 'changing bar should trigger observer');
  expect(1);
});

})();

(function() {
/*
  NOTE: This test is adapted from the 1.x series of unit tests.  The tests
  are the same except for places where we intend to break the API we instead
  validate that we warn the developer appropriately.

  CHANGES FROM 1.6:

  * Create ObservableObject which includes Ember.Observable
*/

// ========================================================================
// Ember.Observable Tests
// ========================================================================
/*globals module test ok isObj equals expects Namespace */

var ObservableObject = Ember.Object.extend(Ember.Observable);

// ..........................................................
// GET()
//

module("object.observesForKey()");

test("should get observers", function() {
  var o1 = ObservableObject.create({ foo: 100 }),
      o2 = ObservableObject.create({ func: function() {} }),
      o3 = ObservableObject.create({ func: function() {} }),
      observers = null;

  equal(Ember.get(o1.observersForKey('foo'), 'length'), 0, "o1.observersForKey should return empty array");

  o1.addObserver('foo', o2, o2.func);
  o1.addObserver('foo', o3, o3.func);

  observers = o1.observersForKey('foo');

  equal(Ember.get(observers, 'length'), 2, "o2.observersForKey should return an array with length 2");
  equal(observers[0][0], o2, "first item in observers array should be o2");
  equal(observers[1][0], o3, "second item in observers array should be o3");
});

})();

(function() {
/*
  NOTE: This test is adapted from the 1.x series of unit tests.  The tests
  are the same except for places where we intend to break the API we instead
  validate that we warn the developer appropriately.

  CHANGES FROM 1.6:

  * Create ObservableObject which includes Ember.Observable
  * Remove test that tests internal _kvo_changeLevel property.  This is an
    implementation detail.
  * Remove test for allPropertiesDidChange
  * Removed star observer test.  no longer supported
  * Removed property revision test.  no longer supported
*/

// ========================================================================
// Ember.Observable Tests
// ========================================================================
/*globals module test ok isObj equals expects */

var ObservableObject = Ember.Object.extend(Ember.Observable);

var revMatches = false , ObjectA;

module("object.propertyChanges", {
  setup: function() {
    ObjectA = ObservableObject.createWithMixins({
      foo  : 'fooValue',
      prop : 'propValue',

      action: Ember.observer('foo', function() {
        this.set('prop', 'changedPropValue');
      }),

      newFoo : 'newFooValue',
      newProp: 'newPropValue',

      notifyAction: Ember.observer('newFoo', function() {
        this.set('newProp', 'changedNewPropValue');
      }),

      notifyAllAction: Ember.observer('prop', function() {
        this.set('newFoo', 'changedNewFooValue');
      }),

      starProp: null,
      starObserver: function(target, key, value, rev) {
        revMatches = (rev === target.propertyRevision) ;
        this.starProp = key;
      }

    });
    }
});


test("should observe the changes within the nested begin / end property changes", function() {

  //start the outer nest
  ObjectA.beginPropertyChanges();
    // Inner nest
    ObjectA.beginPropertyChanges();
        ObjectA.set('foo', 'changeFooValue');
      equal(ObjectA.prop, "propValue") ;
      ObjectA.endPropertyChanges();

    //end inner nest
    ObjectA.set('prop', 'changePropValue');
    equal(ObjectA.newFoo, "newFooValue") ;
  //close the outer nest
  ObjectA.endPropertyChanges();

  equal(ObjectA.prop, "changedPropValue") ;
  equal(ObjectA.newFoo, "changedNewFooValue") ;

});

test("should observe the changes within the begin and end property changes", function() {

  ObjectA.beginPropertyChanges();
    ObjectA.set('foo', 'changeFooValue');

  equal(ObjectA.prop, "propValue") ;
    ObjectA.endPropertyChanges();

  equal(ObjectA.prop, "changedPropValue") ;
});

test("should indicate that the property of an object has just changed", function() {
  // inidicate that proprty of foo will change to its subscribers
  ObjectA.propertyWillChange('foo') ;

  //Value of the prop is unchanged yet as this will be changed when foo changes
  equal(ObjectA.prop, 'propValue' ) ;

  //change the value of foo.
  ObjectA.set('foo', 'changeFooValue');

  // Indicate the subscribers of foo that the value has just changed
  ObjectA.propertyDidChange('foo', null) ;

  // Values of prop has just changed
  equal(ObjectA.prop,'changedPropValue') ;
});

test("should notify that the property of an object has changed", function() {
  // Notify to its subscriber that the values of 'newFoo' will be changed. In this
  // case the observer is "newProp". Therefore this will call the notifyAction function
  // and value of "newProp" will be changed.
  ObjectA.notifyPropertyChange('newFoo','fooValue');

  //value of newProp changed.
  equal(ObjectA.newProp,'changedNewPropValue') ;
});

test("should invalidate function property cache when notifyPropertyChange is called", function() {

  var a = ObservableObject.createWithMixins({
    _b: null,
    b: Ember.computed(function(key, value) {
      if (value !== undefined) {
        this._b = value;
        return this;
      }
      return this._b;
    }).volatile()
  });

  a.set('b', 'foo');
  equal(a.get('b'), 'foo', 'should have set the correct value for property b');

  a._b = 'bar';
  a.notifyPropertyChange('b');
  a.set('b', 'foo');
  equal(a.get('b'), 'foo', 'should have invalidated the cache so that the newly set value is actually set');

});

})();

(function() {
/*global TestNamespace:true*/

/*
  NOTE: This test is adapted from the 1.x series of unit tests.  The tests
  are the same except for places where we intend to break the API we instead
  validate that we warn the developer appropriately.

  CHANGES FROM 1.6:

  * All calls to Ember.run.sync() were changed to
    Ember.run.sync()

  * Bindings no longer accept a root object as their second param.  Instead
    our test binding objects were put under a single object they could
    originate from.

  * tests that inspected internal properties were removed.

  * converted foo.get/foo.set to use Ember.get/Ember.set

  * Removed tests for Ember.Binding.isConnected.  Since binding instances are now
    shared this property no longer makes sense.

  * Changed call calls for obj.bind(...) to Ember.bind(obj, ...);

  * Changed all calls to sc_super() to this._super()

  * Changed all calls to disconnect() to pass the root object.

  * removed calls to Ember.Binding.destroy() as that method is no longer useful
    (or defined)

  * changed use of T_STRING to 'string'
*/

var get = Ember.get, set = Ember.set;

// ========================================================================
// Ember.Binding Tests
// ========================================================================

var fromObject, toObject, binding, Bon1, bon2, root; // global variables

module("basic object binding", {
  setup: function() {
    fromObject = Ember.Object.create({ value: 'start' }) ;
    toObject = Ember.Object.create({ value: 'end' }) ;
    root = { fromObject: fromObject, toObject: toObject };
    Ember.run(function () {
      binding = Ember.bind(root, 'toObject.value', 'fromObject.value');
    });
  }
});

test("binding should have synced on connect", function() {
  equal(get(toObject, "value"), "start", "toObject.value should match fromObject.value");
});

test("fromObject change should propagate to toObject only after flush", function() {
  Ember.run(function () {
    set(fromObject, "value", "change") ;
    equal(get(toObject, "value"), "start") ;
  });
  equal(get(toObject, "value"), "change") ;
});

test("toObject change should propagate to fromObject only after flush", function() {
  Ember.run(function () {
    set(toObject, "value", "change") ;
    equal(get(fromObject, "value"), "start") ;
  });
  equal(get(fromObject, "value"), "change") ;
});

test("deferred observing during bindings", function() {

  // setup special binding
  fromObject = Ember.Object.create({
    value1: 'value1',
    value2: 'value2'
  });

  toObject = Ember.Object.createWithMixins({
    value1: 'value1',
    value2: 'value2',

    callCount: 0,

    observer: Ember.observer('value1', 'value2', function() {
      equal(get(this, 'value1'), 'CHANGED', 'value1 when observer fires');
      equal(get(this, 'value2'), 'CHANGED', 'value2 when observer fires');
      this.callCount++;
    })
  });

  var root = { fromObject: fromObject, toObject: toObject };
  Ember.run(function () {
    Ember.bind(root, 'toObject.value1', 'fromObject.value1');
    Ember.bind(root, 'toObject.value2', 'fromObject.value2');

    // change both value1 + value2, then  flush bindings.  observer should only
    // fire after bindings are done flushing.
    set(fromObject, 'value1', 'CHANGED');
    set(fromObject, 'value2', 'CHANGED');
  });

  equal(toObject.callCount, 2, 'should call observer twice');
});

test("binding disconnection actually works", function() {
  binding.disconnect(root);
  Ember.run(function () {
    set(fromObject, 'value', 'change');
  });
  equal(get(toObject, 'value'), 'start');
});

// ..........................................................
// one way binding
//

module("one way binding", {

  setup: function() {
    Ember.run(function() {
      fromObject = Ember.Object.create({ value: 'start' }) ;
      toObject = Ember.Object.create({ value: 'end' }) ;
      root = { fromObject: fromObject, toObject: toObject };
      binding = Ember.oneWay(root, 'toObject.value', 'fromObject.value');
    });
  },
  teardown: function() {
    Ember.run.cancelTimers();
  }
});

test("fromObject change should propagate after flush", function() {
  Ember.run(function() {
    set(fromObject, "value", "change");
    equal(get(toObject, "value"), "start");
  });
  equal(get(toObject, "value"), "change");
});

test("toObject change should NOT propagate", function() {
  Ember.run(function() {
    set(toObject, "value", "change");
    equal(get(fromObject, "value"), "start");
  });
  equal(get(fromObject, "value"), "start");
});

var first, second, third, binding1, binding2; // global variables

// ..........................................................
// chained binding
//

module("chained binding", {

  setup: function() {
    Ember.run(function() {
      first = Ember.Object.create({ output: 'first' }) ;

      second = Ember.Object.createWithMixins({
        input: 'second',
        output: 'second',

        inputDidChange: Ember.observer("input", function() {
          set(this, "output", get(this, "input")) ;
        })
      }) ;

      third = Ember.Object.create({ input: "third" }) ;

      root = { first: first, second: second, third: third };
      binding1 = Ember.bind(root, 'second.input', 'first.output');
      binding2 = Ember.bind(root, 'second.output', 'third.input');
    });
  },
  teardown: function() {
    Ember.run.cancelTimers();
  }
});

test("changing first output should propograte to third after flush", function() {
  Ember.run(function() {
    set(first, "output", "change") ;
    equal("change", get(first, "output"), "first.output") ;
    ok("change" !== get(third, "input"), "third.input") ;
  });

  equal("change", get(first, "output"), "first.output") ;
  equal("change", get(second, "input"), "second.input") ;
  equal("change", get(second, "output"), "second.output") ;
  equal("change", get(third,"input"), "third.input") ;
});

// ..........................................................
// Custom Binding
//

module("Custom Binding", {
  setup: function() {
    Bon1 = Ember.Object.extend({
      value1: "hi",
      value2: 83,
      array1: []
    });

    bon2 = Ember.Object.create({
      val1: "hello",
      val2: 25,
      arr: [1,2,3,4]
    });

    TestNamespace = {
      bon2: bon2,
      Bon1: Bon1
    };
  },
  teardown: function() {
    Bon1 = bon2 = TestNamespace  = null;
    Ember.run.cancelTimers();
  }
});

test("two bindings to the same value should sync in the order they are initialized", function() {

  Ember.run.begin();

  var a = Ember.Object.create({
    foo: "bar"
  });

  var b = Ember.Object.createWithMixins({
    foo: "baz",
    fooBinding: "a.foo",

    a: a,

    C: Ember.Object.extend({
      foo: "bee",
      fooBinding: "owner.foo"
    }),

    init: function() {
      this._super();
      set(this, 'c', this.C.create({ owner: this }));
    }

  });

  Ember.run.end();

  equal(get(a, 'foo'), "bar", 'a.foo should not change');
  equal(get(b, 'foo'), "bar", 'a.foo should propagate up to b.foo');
  equal(get(b.c, 'foo'), "bar", 'a.foo should propagate up to b.c.foo');
});

// ..........................................................
// propertyNameBinding with longhand
//

module("propertyNameBinding with longhand", {
  setup: function() {
    TestNamespace = {};
    Ember.run(function () {
      TestNamespace.fromObject = Ember.Object.create({
        value: "originalValue"
      });

      TestNamespace.toObject = Ember.Object.createWithMixins({
          valueBinding: Ember.Binding.from('TestNamespace.fromObject.value'),
          localValue: "originalLocal",
          relativeBinding: Ember.Binding.from('localValue')
      });
    });
  },
  teardown: function() {
    TestNamespace = undefined;
  }
});

test("works with full path", function() {
  Ember.run(function () {
    set(TestNamespace.fromObject, 'value', "updatedValue");
  });

  equal(get(TestNamespace.toObject, 'value'), "updatedValue");

  Ember.run(function () {
    set(TestNamespace.fromObject, 'value', "newerValue");
  });

  equal(get(TestNamespace.toObject, 'value'), "newerValue");
});

test("works with local path", function() {
  Ember.run(function () {
    set(TestNamespace.toObject, 'localValue', "updatedValue");
  });

  equal(get(TestNamespace.toObject, 'relative'), "updatedValue");

  Ember.run(function () {
    set(TestNamespace.toObject, 'localValue', "newerValue");
  });

  equal(get(TestNamespace.toObject, 'relative'), "newerValue");
});

})();

(function() {
/*globals TestNamespace:true*/

/*
  NOTE: This test is adapted from the 1.x series of unit tests.  The tests
  are the same except for places where we intend to break the API we instead
  validate that we warn the developer appropriately.

  CHANGES FROM 1.6:

  * Changed get(obj, ) and set(obj, ) to Ember.get() and Ember.set()
  * Removed obj.instanceOf() and obj.kindOf() tests.  use obj instanceof Foo
    instead
  * Removed respondsTo() and tryToPerform() tests.  Can be brought back in a
    utils package.
  * Removed destroy() test.  You can impl yourself but not built in
  * Changed Class.subclassOf() test to Class.detect()
  * Remove broken test for 'superclass' property.
  * Removed obj.didChangeFor()
*/

// ========================================================================
// Ember.Object Base Tests
// ========================================================================

var obj, obj1, don, don1 ; // global variables

var get = Ember.get, set = Ember.set;

module("A new Ember.Object instance", {

  setup: function() {
    obj = Ember.Object.create({
      foo: "bar",
      total: 12345,
      aMethodThatExists: function() {},
      aMethodThatReturnsTrue: function() { return true; },
      aMethodThatReturnsFoobar: function() { return "Foobar"; },
      aMethodThatReturnsFalse: function() { return false; }
    });
  },

  teardown: function() {
    obj = undefined ;
  }

});

test("Should return it's properties when requested using Ember.Object#get", function() {
  equal(get(obj, 'foo'), 'bar') ;
  equal(get(obj, 'total'), 12345) ;
});

test("Should allow changing of those properties by calling Ember.Object#set", function() {
  equal(get(obj,'foo'), 'bar') ;
  equal(get(obj, 'total'), 12345) ;

  set(obj,  'foo', 'Chunky Bacon' ) ;
  set(obj,  'total', 12 ) ;

  equal(get(obj, 'foo'), 'Chunky Bacon') ;
  equal(get(obj, 'total'), 12) ;
});


module("Ember.Object observers", {
  setup: function() {
    // create a namespace
    TestNamespace = {
      obj: Ember.Object.create({
        value: "test"
      })
    };

    // create an object
    obj = Ember.Object.createWithMixins({
      prop1: null,

      // normal observer
      observer: Ember.observer("prop1", function() {
        this._normal = true;
      }),

      globalObserver: Ember.observer("TestNamespace.obj.value", function() {
        this._global = true;
      }),

      bothObserver: Ember.observer("prop1", "TestNamespace.obj.value", function() {
        this._both = true;
      })
    });

  }
});

test("Local observers work", function() {
  obj._normal = false;
  set(obj, "prop1", false);
  equal(obj._normal, true, "Normal observer did change.");
});

test("Global observers work", function() {
  obj._global = false;
  set(TestNamespace.obj, "value", "test2");
  equal(obj._global, true, "Global observer did change.");
});

test("Global+Local observer works", function() {
  obj._both = false;
  set(obj, "prop1", false);
  equal(obj._both, true, "Both observer did change.");
});



module("Ember.Object superclass and subclasses", {
  setup: function() {
    obj = Ember.Object.extend ({
    method1: function() {
      return "hello";
    }
	});
	obj1 = obj.extend();
	don = obj1.create ({
    method2: function() {
      return this.superclass();
    }
	});
  },

  teardown: function() {
	obj = undefined ;
    obj1 = undefined ;
    don = undefined ;
  }
});

test("Checking the detect() function on an object and its subclass", function() {
	equal(obj.detect(obj1), true);
	equal(obj1.detect(obj), false);
});

test("Checking the detectInstance() function on an object and its subclass", function() {
  ok(Ember.Object.detectInstance(obj.create()));
  ok(obj.detectInstance(obj.create()));
});

})();

(function() {
/*globals TestNamespace:true*/

/*
  NOTE: This test is adapted from the 1.x series of unit tests.  The tests
  are the same except for places where we intend to break the API we instead
  validate that we warn the developer appropriately.

  CHANGES FROM 1.6:

  * changed Ember.Bending.flushPendingChanges() -> Ember.run.sync();
  * changes obj.set() and obj.get() to Ember.set() and Ember.get()
  * Fixed an actual bug in unit tests around line 133
  * fixed 'bindings should disconnect on destroy' test to use Ember.destroy.
*/

// ========================================================================
// Ember.Object bindings Tests
// ========================================================================

var testObject, fromObject, extraObject, TestObject;

var set = Ember.set, get = Ember.get;

var bindModuleOpts = {

  setup: function() {
    testObject = Ember.Object.create({
      foo: "bar",
      bar: "foo",
      extraObject: null
    });

    fromObject = Ember.Object.create({
      bar: "foo",
      extraObject: null
    }) ;

    extraObject = Ember.Object.create({
      foo: "extraObjectValue"
    }) ;

    TestNamespace = {
      fromObject: fromObject,
      testObject: testObject
    } ;
  },

  teardown: function() {
    testObject = fromObject = extraObject = null ;
  }

};

module("bind() method", bindModuleOpts);

test("bind(TestNamespace.fromObject.bar) should follow absolute path", function() {
  Ember.run(function() {
    // create binding
    testObject.bind("foo", "TestNamespace.fromObject.bar");

    // now make a change to see if the binding triggers.
    set(fromObject, "bar", "changedValue");
  });

  equal("changedValue", get(testObject, "foo"), "testObject.foo");
});

test("bind(.bar) should bind to relative path", function() {
  Ember.run(function() {
    // create binding
    testObject.bind("foo", "bar") ;

    // now make a change to see if the binding triggers.
    set(testObject, "bar", "changedValue") ;
  });

  equal("changedValue", get(testObject, "foo"), "testObject.foo");
});

var fooBindingModuleOpts = {

  setup: function() {
    TestObject = Ember.Object.extend({
      foo: "bar",
      bar: "foo",
      extraObject: null
    });

    fromObject = Ember.Object.create({
      bar: "foo",
      extraObject: null
    }) ;

    extraObject = Ember.Object.create({
      foo: "extraObjectValue"
    }) ;

    TestNamespace = {
      fromObject: fromObject,
      testObject: TestObject
    } ;
  },

  teardown: function() {
    TestObject = fromObject = extraObject = null ;
  //  delete TestNamespace ;
  }

};

module("fooBinding method", fooBindingModuleOpts);


test("fooBinding: TestNamespace.fromObject.bar should follow absolute path", function() {
  // create binding
  Ember.run(function() {
    testObject = TestObject.createWithMixins({
      fooBinding: "TestNamespace.fromObject.bar"
    }) ;

    // now make a change to see if the binding triggers.
    set(fromObject, "bar", "changedValue") ;
  });


  equal("changedValue", get(testObject, "foo"), "testObject.foo");
});

test("fooBinding: .bar should bind to relative path", function() {
  Ember.run(function() {
    testObject = TestObject.createWithMixins({
      fooBinding: "bar"
    });
    // now make a change to see if the binding triggers.
    set(testObject, "bar", "changedValue");
  });

  equal("changedValue", get(testObject, "foo"), "testObject.foo");
});

test('fooBinding: should disconnect bindings when destroyed', function () {
  Ember.run(function() {
    testObject = TestObject.createWithMixins({
      fooBinding: "TestNamespace.fromObject.bar"
    });

    set(TestNamespace.fromObject, 'bar', 'BAZ');
  });

  equal(get(testObject, 'foo'), 'BAZ', 'binding should have synced');

  Ember.destroy(testObject);

  Ember.run(function() {
    set(TestNamespace.fromObject, 'bar', 'BIFF');
  });

  ok(get(testObject, 'foo') !== 'bar', 'binding should not have synced');
});

})();

(function() {
/*
  NOTE: This test is adapted from the 1.x series of unit tests.  The tests
  are the same except for places where we intend to break the API we instead
  validate that we warn the developer appropriately.

  CHANGES FROM 1.6:

  * changed get(obj, ) and set(obj, ) to Ember.get() and Ember.set()
  * converted uses of obj.isEqual() to use deepEqual() test since isEqual is not
    always defined
*/



  var klass, get = Ember.get, set = Ember.set;

  module("Ember.Object Concatenated Properties", {
    setup: function() {
      klass = Ember.Object.extend({
        concatenatedProperties: ['values', 'functions'],
        values: ['a', 'b', 'c'],
        functions: [Ember.K]
      });
    }
  });

  test("concatenates instances", function() {
    var obj = klass.create({
      values: ['d', 'e', 'f']
    });

    var values = get(obj, 'values'),
        expected = ['a', 'b', 'c', 'd', 'e', 'f'];
    deepEqual(values, expected, Ember.String.fmt("should concatenate values property (expected: %@, got: %@)", [expected, values]));
  });

  test("concatenates subclasses", function() {
    var subKlass = klass.extend({
      values: ['d', 'e', 'f']
    });
    var obj = subKlass.create();

    var values = get(obj, 'values'),
        expected = ['a', 'b', 'c', 'd', 'e', 'f'];
    deepEqual(values, expected, Ember.String.fmt("should concatenate values property (expected: %@, got: %@)", [expected, values]));
  });

  test("concatenates reopen", function() {
    klass.reopen({
      values: ['d', 'e', 'f']
    });
    var obj = klass.create();

    var values = get(obj, 'values'),
        expected = ['a', 'b', 'c', 'd', 'e', 'f'];
    deepEqual(values, expected, Ember.String.fmt("should concatenate values property (expected: %@, got: %@)", [expected, values]));
  });

  test("concatenates mixin", function() {
    var mixin = {
      values: ['d', 'e']
    };
    var subKlass = klass.extend(mixin, {
      values: ['f']
    });
    var obj = subKlass.create();

    var values = get(obj, 'values'),
        expected = ['a', 'b', 'c', 'd', 'e', 'f'];
    deepEqual(values, expected, Ember.String.fmt("should concatenate values property (expected: %@, got: %@)", [expected, values]));
  });

  test("concatenates reopen, subclass, and instance", function() {
    klass.reopen({ values: ['d'] });
    var subKlass = klass.extend({ values: ['e'] });
    var obj = subKlass.create({ values: ['f'] });

    var values = get(obj, 'values'),
        expected = ['a', 'b', 'c', 'd', 'e', 'f'];
    deepEqual(values, expected, Ember.String.fmt("should concatenate values property (expected: %@, got: %@)", [expected, values]));
  });

  test("concatenates subclasses when the values are functions", function() {
    var subKlass = klass.extend({
      functions: Ember.K
    });
    var obj = subKlass.create();

    var values = get(obj, 'functions'),
        expected = [Ember.K, Ember.K];
    deepEqual(values, expected, Ember.String.fmt("should concatenate functions property (expected: %@, got: %@)", [expected, values]));
  });




})();

(function() {
/*
  NOTE: This test is adapted from the 1.x series of unit tests.  The tests
  are the same except for places where we intend to break the API we instead
  validate that we warn the developer appropriately.

  CHANGES FROM 1.6:

  * Updated the API usage for setting up and syncing Ember.Binding since these
    are not the APIs this file is testing.

  * Disabled a call to invokeOnce() around line 127 because it appeared to be
    broken anyway.  I don't think it ever even worked.
*/

var MyApp, binding1, binding2, previousPreventRunloop;

module("System:run_loop() - chained binding", {
  setup: function() {
    MyApp = {};
    MyApp.first = Ember.Object.createWithMixins(Ember.Observable, {
      output: 'MyApp.first'
    }) ;

    MyApp.second = Ember.Object.createWithMixins(Ember.Observable, {
      input: 'MyApp.second',
      output: 'MyApp.second',

      inputDidChange: Ember.observer("input", function() {
        this.set("output", this.get("input")) ;
      })

    }) ;

    MyApp.third = Ember.Object.createWithMixins(Ember.Observable, {
      input: "MyApp.third"
    }) ;
  }
});

test("Should propagate bindings after the RunLoop completes (using Ember.RunLoop)", function() {
  Ember.run(function () {

    //Binding of output of MyApp.first object to input of MyApp.second object
      binding1 = Ember.Binding.from("first.output")
        .to("second.input").connect(MyApp) ;

    //Binding of output of MyApp.second object to input of MyApp.third object
    binding2 = Ember.Binding.from("second.output")
      .to("third.input").connect(MyApp) ;

  });
  Ember.run(function () {
    // Based on the above binding if you change the output of MyApp.first
    // object it should change the all the variable of
    //  MyApp.first,MyApp.second and MyApp.third object
    MyApp.first.set("output", "change") ;

    //Changes the output of the MyApp.first object
    equal(MyApp.first.get("output"), "change") ;

    //since binding has not taken into effect the value still remains as change.
    equal(MyApp.second.get("output"), "MyApp.first") ;

  }); // allows bindings to trigger...

  //Value of the output variable changed to 'change'
  equal(MyApp.first.get("output"), "change") ;

  //Since binding triggered after the end loop the value changed to 'change'.
  equal(MyApp.second.get("output"), "change") ;
});

test("Should propagate bindings after the RunLoop completes", function() {
  Ember.run(function () {
    //Binding of output of MyApp.first object to input of MyApp.second object
    binding1 = Ember.Binding.from("first.output")
      .to("second.input").connect(MyApp) ;

    //Binding of output of MyApp.second object to input of MyApp.third object
    binding2 = Ember.Binding.from("second.output")
        .to("third.input").connect(MyApp) ;
  });

  Ember.run(function () {
    //Based on the above binding if you change the output of MyApp.first object it should
    //change the all the variable of MyApp.first,MyApp.second and MyApp.third object
    MyApp.first.set("output", "change") ;

    //Changes the output of the MyApp.first object
    equal(MyApp.first.get("output"), "change") ;

    //since binding has not taken into effect the value still remains as change.
    equal(MyApp.second.get("output"), "MyApp.first") ;
  });

  //Value of the output variable changed to 'change'
  equal(MyApp.first.get("output"), "change") ;

  //Since binding triggered after the end loop the value changed to 'change'.
  equal(MyApp.second.get("output"), "change") ;
});

})();

(function() {
// NOTE: This test is adapted from the 1.x series of unit tests.  The tests
// are the same except for places where we intend to break the API we instead
// validate that we warn the developer appropriately.
//
//  * Changed Ember.Set.clone() call to Ember.Set.copy()

// ========================================================================
// Ember.Set Tests
// ========================================================================

var a, b, c ; // global variables

module("creating Ember.Set instances", {

  setup: function() {
    // create objects...
    a = { name: "a" } ;
    b = { name: "b" } ;
    c = { name: "c" } ;
  },

  teardown: function() {
    a = undefined ;
    b = undefined ;
    c = undefined ;
  }

});

test("new Ember.Set() should create empty set", function() {
  var set = new Ember.Set() ;
  equal(set.length, 0) ;
});

test("new Ember.Set([1,2,3]) should create set with three items in them", function() {
  var set = new Ember.Set(Ember.A([a,b,c])) ;
  equal(set.length, 3) ;
  equal(set.contains(a), true) ;
  equal(set.contains(b), true) ;
  equal(set.contains(c), true) ;
});

test("new Ember.Set() should accept anything that implements Ember.Array", function() {
  var arrayLikeObject = Ember.Object.createWithMixins(Ember.Array, {
    _content: [a,b,c],
    length: 3,
    objectAt: function(idx) { return this._content[idx]; }
  }) ;

  var set = new Ember.Set(arrayLikeObject) ;
  equal(set.length, 3) ;
  equal(set.contains(a), true) ;
  equal(set.contains(b), true) ;
  equal(set.contains(c), true) ;
});

var set ; // global variables

// The tests below also end up testing the contains() method pretty
// exhaustively.
module("Ember.Set.add + Ember.Set.contains", {

  setup: function() {
    set = new Ember.Set() ;
  },

  teardown: function() {
    set = undefined ;
  }

});

test("should add an Ember.Object", function() {
  var obj = Ember.Object.create() ;

  var oldLength = set.length ;
  set.add(obj) ;
  equal(set.contains(obj), true, "contains()") ;
  equal(set.length, oldLength+1, "new set length") ;
});

test("should add a regular hash", function() {
  var obj = {} ;

  var oldLength = set.length ;
  set.add(obj) ;
  equal(set.contains(obj), true, "contains()") ;
  equal(set.length, oldLength+1, "new set length") ;
});

test("should add a string", function() {
  var obj = "String!" ;

  var oldLength = set.length ;
  set.add(obj) ;
  equal(set.contains(obj), true, "contains()") ;
  equal(set.length, oldLength+1, "new set length") ;
});

test("should add a number", function() {
  var obj = 23 ;

  var oldLength = set.length ;
  set.add(obj) ;
  equal(set.contains(obj), true, "contains()") ;
  equal(set.length, oldLength+1, "new set length") ;
});

test("should add bools", function() {
  var oldLength = set.length ;

  set.add(true) ;
  equal(set.contains(true), true, "contains(true)");
  equal(set.length, oldLength+1, "new set length");

  set.add(false);
  equal(set.contains(false), true, "contains(false)");
  equal(set.length, oldLength+2, "new set length");
});

test("should add 0", function() {
  var oldLength = set.length ;

  set.add(0) ;
  equal(set.contains(0), true, "contains(0)");
  equal(set.length, oldLength+1, "new set length");
});

test("should add a function", function() {
  var obj = function() { return "Test function"; } ;

  var oldLength = set.length ;
  set.add(obj) ;
  equal(set.contains(obj), true, "contains()") ;
  equal(set.length, oldLength+1, "new set length") ;
});

test("should NOT add a null", function() {
  set.add(null) ;
  equal(set.length, 0) ;
  equal(set.contains(null), false) ;
});

test("should NOT add an undefined", function() {
  set.add(undefined) ;
  equal(set.length, 0) ;
  equal(set.contains(undefined), false) ;
});

test("adding an item, removing it, adding another item", function() {
  var item1 = "item1" ;
  var item2 = "item2" ;

  set.add(item1) ; // add to set
  set.remove(item1) ; //remove from set
  set.add(item2) ;

  equal(set.contains(item1), false, "set.contains(item1)") ;

  set.add(item1) ; // re-add to set
  equal(set.length, 2, "set.length") ;
});

module("Ember.Set.remove + Ember.Set.contains", {

  // generate a set with every type of object, but none of the specific
  // ones we add in the tests below...
  setup: function() {
    set = new Ember.Set(Ember.A([
      Ember.Object.create({ dummy: true }),
      { isHash: true },
      "Not the String",
      16, true, false, 0])) ;
  },

  teardown: function() {
    set = undefined ;
  }

});

test("should remove an Ember.Object and reduce length", function() {
  var obj = Ember.Object.create() ;
  set.add(obj) ;
  equal(set.contains(obj), true) ;
  var oldLength = set.length ;

  set.remove(obj) ;
  equal(set.contains(obj), false, "should be removed") ;
  equal(set.length, oldLength-1, "should be 1 shorter") ;
});

test("should remove a regular hash and reduce length", function() {
  var obj = {} ;
  set.add(obj) ;
  equal(set.contains(obj), true) ;
  var oldLength = set.length ;

  set.remove(obj) ;
  equal(set.contains(obj), false, "should be removed") ;
  equal(set.length, oldLength-1, "should be 1 shorter") ;
});

test("should remove a string and reduce length", function() {
  var obj = "String!" ;
  set.add(obj) ;
  equal(set.contains(obj), true) ;
  var oldLength = set.length ;

  set.remove(obj) ;
  equal(set.contains(obj), false, "should be removed") ;
  equal(set.length, oldLength-1, "should be 1 shorter") ;
});

test("should remove a number and reduce length", function() {
  var obj = 23 ;
  set.add(obj) ;
  equal(set.contains(obj), true) ;
  var oldLength = set.length ;

  set.remove(obj) ;
  equal(set.contains(obj), false, "should be removed") ;
  equal(set.length, oldLength-1, "should be 1 shorter") ;
});

test("should remove a bools and reduce length", function() {
  var oldLength = set.length ;
  set.remove(true) ;
  equal(set.contains(true), false, "should be removed") ;
  equal(set.length, oldLength-1, "should be 1 shorter") ;

  set.remove(false);
  equal(set.contains(false), false, "should be removed") ;
  equal(set.length, oldLength-2, "should be 2 shorter") ;
});

test("should remove 0 and reduce length", function() {
  var oldLength = set.length;
  set.remove(0) ;
  equal(set.contains(0), false, "should be removed") ;
  equal(set.length, oldLength-1, "should be 1 shorter") ;
});

test("should remove a function and reduce length", function() {
  var obj = function() { return "Test function"; } ;
  set.add(obj) ;
  equal(set.contains(obj), true) ;
  var oldLength = set.length ;

  set.remove(obj) ;
  equal(set.contains(obj), false, "should be removed") ;
  equal(set.length, oldLength-1, "should be 1 shorter") ;
});

test("should NOT remove a null", function() {
  var oldLength = set.length ;
  set.remove(null) ;
  equal(set.length, oldLength) ;
});

test("should NOT remove an undefined", function() {
  var oldLength = set.length ;
  set.remove(undefined) ;
  equal(set.length, oldLength) ;
});

test("should ignore removing an object not in the set", function() {
  var obj = Ember.Object.create() ;
  var oldLength = set.length ;
  set.remove(obj) ;
  equal(set.length, oldLength) ;
});

module("Ember.Set.pop + Ember.Set.copy", {
// generate a set with every type of object, but none of the specific
// ones we add in the tests below...
  setup: function() {
    set = new Ember.Set(Ember.A([
      Ember.Object.create({ dummy: true }),
      { isHash: true },
      "Not the String",
      16, false])) ;
    },

    teardown: function() {
      set = undefined ;
    }
});

test("the pop() should remove an arbitrary object from the set", function() {
  var oldLength = set.length ;
  var obj = set.pop();
  ok(!Ember.isNone(obj), 'pops up an item');
  equal(set.length, oldLength-1, 'length shorter by 1');
});

test("should pop false and 0", function() {
  set = new Ember.Set(Ember.A([false]));
  ok(set.pop() === false, "should pop false");

  set = new Ember.Set(Ember.A([0]));
  ok(set.pop() === 0, "should pop 0");
});

test("the copy() should return an indentical set", function() {
  var oldLength = set.length ;
  var obj = set.copy();
  equal(oldLength,obj.length,'length of the clone should be same');
  equal(obj.contains(set[0]), true);
  equal(obj.contains(set[1]), true);
  equal(obj.contains(set[2]), true);
  equal(obj.contains(set[3]), true);
  equal(obj.contains(set[4]), true);
});

})();

(function() {
/*globals testBoth */

require('ember-runtime/~tests/props_helper');
require('ember-runtime/~tests/suites/array');

/*
  Implement a basic fake mutable array.  This validates that any non-native
  enumerable can impl this API.
*/
var TestArray = Ember.Object.extend(Ember.Array, {

  _content: null,

  init: function(ary) {
    this._content = ary || [];
  },

  // some methods to modify the array so we can test changes.  Note that
  // arrays can be modified even if they don't implement MutableArray.  The
  // MutableArray is just a standard API for mutation but not required.
  addObject: function(obj) {
    var idx = this._content.length;
    this.arrayContentWillChange(idx, 0, 1);
    this._content.push(obj);
    this.arrayContentDidChange(idx, 0, 1);
  },

  removeFirst: function(idx) {
    this.arrayContentWillChange(0, 1, 0);
    this._content.shift();
    this.arrayContentDidChange(0, 1, 0);
  },

  objectAt: function(idx) {
    return this._content[idx];
  },

  length: Ember.computed(function() {
    return this._content.length;
  })
});


Ember.ArrayTests.extend({

  name: 'Basic Mutable Array',

  newObject: function(ary) {
    ary = ary ? ary.slice() : this.newFixture(3);
    return new TestArray(ary);
  },

  // allows for testing of the basic enumerable after an internal mutation
  mutate: function(obj) {
    obj.addObject(this.getFixture(1)[0]);
  },

  toArray: function(obj) {
    return obj.slice();
  }

}).run();

test("the return value of slice has Ember.Array applied", function() {
  var x = Ember.Object.createWithMixins(Ember.Array, {
    length: 0
  });
  var y = x.slice(1);
  equal(Ember.Array.detect(y), true, "mixin should be applied");
});

test("slice supports negative index arguments", function() {
  var testArray = new TestArray([1,2,3,4]);

  deepEqual(testArray.slice(-2),      [3, 4],     'slice(-2)');
  deepEqual(testArray.slice(-2, -1),  [3],        'slice(-2, -1');
  deepEqual(testArray.slice(-2, -2),  [],         'slice(-2, -2)');
  deepEqual(testArray.slice(-1, -2),  [],         'slice(-1, -2)');

  deepEqual(testArray.slice(-4, 1),   [1],        'slice(-4, 1)');
  deepEqual(testArray.slice(-4, 5),   [1,2,3,4],  'slice(-4, 5)');
  deepEqual(testArray.slice(-4),      [1,2,3,4],  'slice(-4)');

  deepEqual(testArray.slice(0, -1),   [1,2,3],    'slice(0, -1)');
  deepEqual(testArray.slice(0, -4),   [],         'slice(0, -4)');
  deepEqual(testArray.slice(0, -3),   [1],        'slice(0, -3)');

});

// ..........................................................
// CONTENT DID CHANGE
//

var DummyArray = Ember.Object.extend(Ember.Array, {
  nextObject: function() {},
  length: 0,
  objectAt: function(idx) { return 'ITEM-'+idx; }
});

var obj, observer;


// ..........................................................
// NOTIFY ARRAY OBSERVERS
//

module('mixins/array/arrayContent[Will|Did]Change');

test('should notify observers of []', function() {

  obj = DummyArray.createWithMixins({
    _count: 0,
    enumerablePropertyDidChange: Ember.observer('[]', function() {
      this._count++;
    })
  });

  equal(obj._count, 0, 'should not have invoked yet');

  obj.arrayContentWillChange(0, 1, 1);
  obj.arrayContentDidChange(0, 1, 1);

  equal(obj._count, 1, 'should have invoked');

});

// ..........................................................
// NOTIFY CHANGES TO LENGTH
//

module('notify observers of length', {
  setup: function() {
    obj = DummyArray.createWithMixins({
      _after: 0,
      lengthDidChange: Ember.observer('length', function() {
        this._after++;
      })

    });

    equal(obj._after, 0, 'should not have fired yet');
  },

  teardown: function() {
    obj = null;
  }
});

test('should notify observers when call with no params', function() {
  obj.arrayContentWillChange();
  equal(obj._after, 0);

  obj.arrayContentDidChange();
  equal(obj._after, 1);
});

// API variation that included items only
test('should not notify when passed lengths are same', function() {
  obj.arrayContentWillChange(0, 1, 1);
  equal(obj._after, 0);

  obj.arrayContentDidChange(0, 1, 1);
  equal(obj._after, 0);
});

test('should notify when passed lengths are different', function() {
  obj.arrayContentWillChange(0, 1, 2);
  equal(obj._after, 0);

  obj.arrayContentDidChange(0, 1, 2);
  equal(obj._after, 1);
});


// ..........................................................
// NOTIFY ARRAY OBSERVER
//

module('notify array observers', {
  setup: function() {
    obj = DummyArray.create();

    observer = Ember.Object.createWithMixins({
      _before: null,
      _after: null,

      arrayWillChange: function() {
        equal(this._before, null); // should only call once
        this._before = Array.prototype.slice.call(arguments);
      },

      arrayDidChange: function() {
        equal(this._after, null); // should only call once
        this._after = Array.prototype.slice.call(arguments);
      }
    });

    obj.addArrayObserver(observer);
  },

  teardown: function() {
    obj = observer = null;
  }
});

test('should notify enumerable observers when called with no params', function() {
  obj.arrayContentWillChange();
  deepEqual(observer._before, [obj, 0, -1, -1]);

  obj.arrayContentDidChange();
  deepEqual(observer._after, [obj, 0, -1, -1]);
});

// API variation that included items only
test('should notify when called with same length items', function() {
  obj.arrayContentWillChange(0, 1, 1);
  deepEqual(observer._before, [obj, 0, 1, 1]);

  obj.arrayContentDidChange(0, 1, 1);
  deepEqual(observer._after, [obj, 0, 1, 1]);
});

test('should notify when called with diff length items', function() {
  obj.arrayContentWillChange(0, 2, 1);
  deepEqual(observer._before, [obj, 0, 2, 1]);

  obj.arrayContentDidChange(0, 2, 1);
  deepEqual(observer._after, [obj, 0, 2, 1]);
});

test('removing enumerable observer should disable', function() {
  obj.removeArrayObserver(observer);
  obj.arrayContentWillChange();
  deepEqual(observer._before, null);

  obj.arrayContentDidChange();
  deepEqual(observer._after, null);
});

// ..........................................................
// NOTIFY ENUMERABLE OBSERVER
//

module('notify enumerable observers as well', {
  setup: function() {
    obj = DummyArray.create();

    observer = Ember.Object.createWithMixins({
      _before: null,
      _after: null,

      enumerableWillChange: function() {
        equal(this._before, null); // should only call once
        this._before = Array.prototype.slice.call(arguments);
      },

      enumerableDidChange: function() {
        equal(this._after, null); // should only call once
        this._after = Array.prototype.slice.call(arguments);
      }
    });

    obj.addEnumerableObserver(observer);
  },

  teardown: function() {
    obj = observer = null;
  }
});

test('should notify enumerable observers when called with no params', function() {
  obj.arrayContentWillChange();
  deepEqual(observer._before, [obj, null, null], 'before');

  obj.arrayContentDidChange();
  deepEqual(observer._after, [obj, null, null], 'after');
});

// API variation that included items only
test('should notify when called with same length items', function() {
  obj.arrayContentWillChange(0, 1, 1);
  deepEqual(observer._before, [obj, ['ITEM-0'], 1], 'before');

  obj.arrayContentDidChange(0, 1, 1);
  deepEqual(observer._after, [obj, 1, ['ITEM-0']], 'after');
});

test('should notify when called with diff length items', function() {
  obj.arrayContentWillChange(0, 2, 1);
  deepEqual(observer._before, [obj, ['ITEM-0', 'ITEM-1'], 1], 'before');

  obj.arrayContentDidChange(0, 2, 1);
  deepEqual(observer._after, [obj, 2, ['ITEM-0']], 'after');
});

test('removing enumerable observer should disable', function() {
  obj.removeEnumerableObserver(observer);
  obj.arrayContentWillChange();
  deepEqual(observer._before, null, 'before');

  obj.arrayContentDidChange();
  deepEqual(observer._after, null, 'after');
});

// ..........................................................
// @each
//

var ary;

module('Ember.Array.@each support', {
  setup: function() {
    ary = new TestArray([
      { isDone: true,  desc: 'Todo 1' },
      { isDone: false, desc: 'Todo 2' },
      { isDone: true,  desc: 'Todo 3' },
      { isDone: false, desc: 'Todo 4' }
    ]);
  },

  teardown: function() {
    ary = null;
  }
});

test('adding an object should notify (@each)', function() {

  var get = Ember.get, set = Ember.set;
  var called = 0;

  var observerObject = Ember.Object.create({
    wasCalled: function() {
      called++;
    }
  });

  // Ember.get(ary, '@each');
  Ember.addObserver(ary, '@each', observerObject, 'wasCalled');

  ary.addObject(Ember.Object.create({
    desc: "foo",
    isDone: false
  }));

  equal(called, 1, "calls observer when object is pushed");

});

test('adding an object should notify (@each.isDone)', function() {

  var get = Ember.get, set = Ember.set;
  var called = 0;

  var observerObject = Ember.Object.create({
    wasCalled: function() {
      called++;
    }
  });

  Ember.addObserver(ary, '@each.isDone', observerObject, 'wasCalled');

  ary.addObject(Ember.Object.create({
    desc: "foo",
    isDone: false
  }));

  equal(called, 1, "calls observer when object is pushed");

});

test('using @each to observe arrays that does not return objects raise error', function() {

  var get = Ember.get, set = Ember.set;
  var called = 0;

  var observerObject = Ember.Object.create({
    wasCalled: function() {
      called++;
    }
  });

  ary = TestArray.create({
    objectAt: function(idx) {
      return get(this._content[idx], 'desc');
    }
  });

  Ember.addObserver(ary, '@each.isDone', observerObject, 'wasCalled');

  expectAssertion(function() {
    ary.addObject(Ember.Object.create({
      desc: "foo",
      isDone: false
    }));
  }, /When using @each to observe the array/);

  equal(called, 0, 'not calls observer when object is pushed');
});

test('modifying the array should also indicate the isDone prop itself has changed', function() {
  // NOTE: we never actually get the '@each.isDone' property here.  This is
  // important because it tests the case where we don't have an isDone
  // EachArray materialized but just want to know when the property has
  // changed.

  var get = Ember.get, set = Ember.set;
  var each = get(ary, '@each');
  var count = 0;

  Ember.addObserver(each, 'isDone', function() { count++; });

  count = 0;
  var item = ary.objectAt(2);
  set(item, 'isDone', !get(item, 'isDone'));
  equal(count, 1, '@each.isDone should have notified');
});


testBoth("should be clear caches for computed properties that have dependent keys on arrays that are changed after object initialization", function(get, set) {
  var obj = Ember.Object.createWithMixins({
    init: function() {
      set(this, 'resources', Ember.A());
    },

    common: Ember.computed(function() {
      return get(get(this, 'resources').objectAt(0), 'common');
    }).property('resources.@each.common')
  });

  get(obj, 'resources').pushObject(Ember.Object.create({ common: "HI!" }));
  equal("HI!", get(obj, 'common'));

  set(get(obj, 'resources').objectAt(0), 'common', "BYE!");
  equal("BYE!", get(obj, 'common'));
});

testBoth("observers that contain @each in the path should fire only once the first time they are accessed", function(get, set) {
  var count = 0;

  var obj = Ember.Object.createWithMixins({
    init: function() {
      // Observer does not fire on init
      set(this, 'resources', Ember.A());
    },

    commonDidChange: Ember.observer('resources.@each.common', function() {
      count++;
    })
  });

  // Observer fires second time when new object is added
  get(obj, 'resources').pushObject(Ember.Object.create({ common: "HI!" }));
  // Observer fires third time when property on an object is changed
  set(get(obj, 'resources').objectAt(0), 'common', "BYE!");

  equal(count, 2, "observers should only be called once");
});

})();

(function() {
/*globals module test ok isObj equals expects */

var Rectangle = Ember.Object.extend(Ember.Comparable, {
  length: 0,
  width: 0,

  area: function() {
    return Ember.get(this,'length') * Ember.get(this, 'width');
  },

  compare: function(a, b) {
    return Ember.compare(a.area(), b.area());
  }

});

var r1, r2;

module("Comparable", {

  setup: function() {
    r1 = Rectangle.create({length: 6, width: 12});
    r2 = Rectangle.create({length: 6, width: 13});
  },

  teardown: function() {
  }

});

test("should be comparable and return the correct result", function() {
  equal(Ember.Comparable.detect(r1), true);
  equal(Ember.compare(r1, r1), 0);
  equal(Ember.compare(r1, r2), -1);
  equal(Ember.compare(r2, r1), 1);
});

})();

(function() {
require('ember-runtime/~tests/suites/copyable');

// NOTE: See debug/suites/copyable.js for mosts tests

var CopyableObject = Ember.Object.extend(Ember.Copyable, {

  id: null,

  init: function() {
    this._super();
    Ember.set(this, 'id', Ember.generateGuid());
  },

  copy: function() {
    var ret = new CopyableObject();
    Ember.set(ret, 'id', Ember.get(this, 'id'));
    return ret;
  }
});

Ember.CopyableTests.extend({

  name: 'Ember.Copyable Basic Test',

  newObject: function() {
    return new CopyableObject();
  },

  isEqual: function(a, b) {
    if (!(a instanceof CopyableObject) || !(b instanceof CopyableObject)) return false;
    return Ember.get(a, 'id') === Ember.get(b,'id');
  }
}).run();

})();

(function() {
module("Ember.DeferredMixin");

test("can resolve deferred", function() {
  var deferred, count = 0;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  deferred.then(function(a) {
    count++;
  });

  Ember.run(deferred, 'resolve', deferred);

  equal(count, 1, "was fulfilled");
});

test("can reject deferred", function() {

  var deferred, count = 0;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  deferred.then(null, function() {
    count++;
  });

  Ember.run(deferred, 'reject');

  equal(count, 1, "fail callback was called");
});

test("can resolve with then", function() {

  var deferred, count1 = 0 ,count2 = 0;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  deferred.then(function() {
    count1++;
  }, function() {
    count2++;
  });

  Ember.run(deferred, 'resolve', deferred);

  equal(count1, 1, "then were resolved");
  equal(count2, 0, "then was not rejected");
});

test("can reject with then", function() {

  var deferred, count1 = 0 ,count2 = 0;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  deferred.then(function() {
    count1++;
  }, function() {
    count2++;
  });

  Ember.run(deferred, 'reject');

  equal(count1, 0, "then was not resolved");
  equal(count2, 1, "then were rejected");
});

test("can call resolve multiple times", function() {

  var deferred, count = 0;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  deferred.then(function() {
    count++;
  });

  Ember.run(function() {
    deferred.resolve(deferred);
    deferred.resolve(deferred);
    deferred.resolve(deferred);
  });

  equal(count, 1, "calling resolve multiple times has no effect");
});

test("resolve prevent reject", function() {
  var deferred, resolved = false, rejected = false, progress = 0;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  deferred.then(function() {
    resolved = true;
  }, function() {
    rejected = true;
  });

  Ember.run(deferred, 'resolve', deferred);
  Ember.run(deferred, 'reject');

  equal(resolved, true, "is resolved");
  equal(rejected, false, "is not rejected");
});

test("reject prevent resolve", function() {
  var deferred, resolved = false, rejected = false, progress = 0;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  deferred.then(function() {
    resolved = true;
  }, function() {
    rejected = true;
  });

  Ember.run(deferred, 'reject');
  Ember.run(deferred, 'reject', deferred);

  equal(resolved, false, "is not resolved");
  equal(rejected, true, "is rejected");
});

test("will call callbacks if they are added after resolution", function() {

  var deferred, count1 = 0;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  Ember.run(deferred, 'resolve', 'toto');

  Ember.run(function() {
    deferred.then(function(context) {
      if (context === 'toto') {
        count1++;
      }
    });

    deferred.then(function(context) {
      if (context === 'toto') {
        count1++;
      }
    });
  });

  equal(count1, 2, "callbacks called after resolution");
});

test("then is chainable", function() {
  var deferred, count = 0;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  deferred.then(function() {
    eval('error'); // Use eval to pass JSHint
  }).then(null, function() {
    count++;
  });

  Ember.run(deferred, 'resolve', deferred);

  equal(count, 1, "chained callback was called");
});



test("can self fulfill", function() {
  expect(1);
  var deferred;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  deferred.then(function(value) {
    equal(value, deferred, "successfully resolved to itself");
  });

  Ember.run(deferred, 'resolve', deferred);
});


test("can self reject", function() {
  expect(1);
  var deferred;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  deferred.then(function() {
    ok(false, 'should not fulfill'); 
  },function(value) {
    equal(value, deferred, "successfully rejected to itself");
  });

  Ember.run(deferred, 'reject', deferred);
});

test("can fulfill to a custom value", function() {
  expect(1);
  var deferred, obj = {};

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  deferred.then(function(value) {
    equal(value, obj, "successfully resolved to given value");
  });

  Ember.run(deferred, 'resolve', obj);
});


test("can chain self fulfilling objects", function() {
  expect(2);
  var firstDeferred, secondDeferred;

  Ember.run(function() {
    firstDeferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
    secondDeferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  firstDeferred.then(function(value) {
    equal(value, firstDeferred, "successfully resolved to the first deferred");
    return secondDeferred;
  }).then(function(value) {
    equal(value, secondDeferred, "successfully resolved to the second deferred");
  });

  Ember.run(function() {
    firstDeferred.resolve(firstDeferred);
    secondDeferred.resolve(secondDeferred);
  });
});

test("can do multi level assimilation", function() {
  expect(1);
  var firstDeferred, secondDeferred, firstDeferredResolved = false;

  Ember.run(function() {
    firstDeferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
    secondDeferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  firstDeferred.then(function() {
    firstDeferredResolved = true;
  });

  secondDeferred.then(function() {
    ok(firstDeferredResolved, "first deferred already resolved");
  });

  Ember.run(secondDeferred, 'resolve', firstDeferred);
  Ember.run(firstDeferred, 'resolve', firstDeferred);
});


test("can handle rejection without rejection handler", function() {
  expect(2);

  var reason = 'some reason';

  var deferred = Ember.run(function() {
    return Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  deferred.then().then(function() {
    ok(false, 'expected rejection, got fulfillment');
  }, function(actualReason) {
    ok(true, 'expected fulfillment');
    equal(actualReason, reason);
  });

  Ember.run(deferred, 'reject', reason);
});

test("can handle fulfillment without  fulfillment handler", function() {
  expect(2);

  var fulfillment = 'some fulfillment';

  var deferred = Ember.run(function() {
    return Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  deferred.then().then(function(actualFulfillment) {
    ok(true, 'expected fulfillment');
    equal(fulfillment, actualFulfillment);
  }, function(reason) {
    ok(false, 'expected fulfillment, got reason' + reason);
  });

  Ember.run(deferred, 'resolve', fulfillment);
});

})();

(function() {
require('ember-runtime/~tests/suites/enumerable');

var indexOf = Ember.EnumerableUtils.indexOf;

/*
  Implement a basic fake enumerable.  This validates that any non-native
  enumerable can impl this API.
*/
var TestEnumerable = Ember.Object.extend(Ember.Enumerable, {

  _content: null,

  init: function(ary) {
    this._content = ary || [];
  },

  addObject: function(obj) {
    if (indexOf(this._content, obj)>=0) return this;
    this._content.push(obj);
    this.enumerableContentDidChange();
  },

  nextObject: function(idx) {
    return idx >= Ember.get(this, 'length') ? undefined : this._content[idx];
  },

  length: Ember.computed(function() {
    return this._content.length;
  }),

  slice: function() {
    return this._content.slice();
  }

});


Ember.EnumerableTests.extend({

  name: 'Basic Enumerable',

  newObject: function(ary) {
    ary = ary ? ary.slice() : this.newFixture(3);
    return new TestEnumerable(ary);
  },

  // allows for testing of the basic enumerable after an internal mutation
  mutate: function(obj) {
    obj.addObject(obj._content.length+1);
  },

  toArray: function(obj) {
    return obj.slice();
  }

}).run();

module('Ember.Enumerable');

test("should apply Ember.Array to return value of map", function() {
  var x = Ember.Object.createWithMixins(Ember.Enumerable);
  var y = x.map(Ember.K);
  equal(Ember.Array.detect(y), true, "should have mixin applied");
});

test("should apply Ember.Array to return value of filter", function() {
  var x = Ember.Object.createWithMixins(Ember.Enumerable);
  var y = x.filter(Ember.K);
  equal(Ember.Array.detect(y), true, "should have mixin applied");
});

test("should apply Ember.Array to return value of invoke", function() {
  var x = Ember.Object.createWithMixins(Ember.Enumerable);
  var y = x.invoke(Ember.K);
  equal(Ember.Array.detect(y), true, "should have mixin applied");
});

test("should apply Ember.Array to return value of toArray", function() {
  var x = Ember.Object.createWithMixins(Ember.Enumerable);
  var y = x.toArray(Ember.K);
  equal(Ember.Array.detect(y), true, "should have mixin applied");
});

test("should apply Ember.Array to return value of without", function() {
  var x = Ember.Object.createWithMixins(Ember.Enumerable, {
    contains: function() {
      return true;
    }
  });
  var y = x.without(Ember.K);
  equal(Ember.Array.detect(y), true, "should have mixin applied");
});

test("should apply Ember.Array to return value of uniq", function() {
  var x = Ember.Object.createWithMixins(Ember.Enumerable);
  var y = x.uniq(Ember.K);
  equal(Ember.Array.detect(y), true, "should have mixin applied");
});

test('any', function() {
  var kittens = Ember.A([{
    color: 'white'
  }, {
    color: 'black'
  }, {
    color: 'white'
  }]),
  foundWhite = kittens.any(function(kitten) { return kitten.color === 'white'; }),
  foundWhite2 = kittens.isAny('color', 'white');

  equal(foundWhite, true);
  equal(foundWhite2, true);
});

test('any with NaN', function() {
  var numbers = Ember.A([1,2,NaN,4]);

  var hasNaN = numbers.any(function(n){ return isNaN(n); });

  equal(hasNaN, true, "works when matching NaN");
});

test('every', function() {
  var allColorsKittens = Ember.A([{
    color: 'white'
  }, {
    color: 'black'
  }, {
    color: 'white'
  }]),
  allWhiteKittens = Ember.A([{
    color: 'white'
  }, {
    color: 'white'
  }, {
    color: 'white'
  }]),
  allWhite = false,
  whiteKittenPredicate = function(kitten) { return kitten.color === 'white'; };

  allWhite = allColorsKittens.every(whiteKittenPredicate);
  equal(allWhite, false);

  allWhite = allWhiteKittens.every(whiteKittenPredicate);
  equal(allWhite, true);

  allWhite = allColorsKittens.isEvery('color', 'white');
  equal(allWhite, false);

  allWhite = allWhiteKittens.isEvery('color', 'white');
  equal(allWhite, true);
});

// ..........................................................
// CONTENT DID CHANGE
//

var DummyEnum = Ember.Object.extend(Ember.Enumerable, {
  nextObject: function() {},
  length: 0
});

var obj, observer;

// ..........................................................
// NOTIFY ENUMERABLE PROPERTY
//

module('mixins/enumerable/enumerableContentDidChange');

test('should notify observers of []', function() {

  var obj = Ember.Object.createWithMixins(Ember.Enumerable, {
    nextObject: function() {}, // avoid exceptions

    _count: 0,
    enumerablePropertyDidChange: Ember.observer('[]', function() {
      this._count++;
    })
  });

  equal(obj._count, 0, 'should not have invoked yet');
  obj.enumerableContentWillChange();
  obj.enumerableContentDidChange();
  equal(obj._count, 1, 'should have invoked');

});

// ..........................................................
// NOTIFY CHANGES TO LENGTH
//

module('notify observers of length', {
  setup: function() {
    obj = DummyEnum.createWithMixins({
      _after: 0,
      lengthDidChange: Ember.observer('length', function() {
        this._after++;
      })

    });

    equal(obj._after, 0, 'should not have fired yet');
  },

  teardown: function() {
    obj = null;
  }
});

test('should notify observers when call with no params', function() {
  obj.enumerableContentWillChange();
  equal(obj._after, 0);

  obj.enumerableContentDidChange();
  equal(obj._after, 1);
});

// API variation that included items only
test('should not notify when passed arrays of same length', function() {
  var added = ['foo'], removed = ['bar'];
  obj.enumerableContentWillChange(removed, added);
  equal(obj._after, 0);

  obj.enumerableContentDidChange(removed, added);
  equal(obj._after, 0);
});

test('should notify when passed arrays of different length', function() {
  var added = ['foo'], removed = ['bar', 'baz'];
  obj.enumerableContentWillChange(removed, added);
  equal(obj._after, 0);

  obj.enumerableContentDidChange(removed, added);
  equal(obj._after, 1);
});

// API variation passes indexes only
test('should not notify when passed with indexes', function() {
  obj.enumerableContentWillChange(1, 1);
  equal(obj._after, 0);

  obj.enumerableContentDidChange(1, 1);
  equal(obj._after, 0);
});

test('should notify when passed old index API with delta', function() {
  obj.enumerableContentWillChange(1, 2);
  equal(obj._after, 0);

  obj.enumerableContentDidChange(1, 2);
  equal(obj._after, 1);
});


// ..........................................................
// NOTIFY ENUMERABLE OBSERVER
//

module('notify enumerable observers', {
  setup: function() {
    obj = DummyEnum.create();

    observer = Ember.Object.createWithMixins({
      _before: null,
      _after: null,

      enumerableWillChange: function() {
        equal(this._before, null); // should only call once
        this._before = Array.prototype.slice.call(arguments);
      },

      enumerableDidChange: function() {
        equal(this._after, null); // should only call once
        this._after = Array.prototype.slice.call(arguments);
      }
    });

    obj.addEnumerableObserver(observer);
  },

  teardown: function() {
    obj = observer = null;
  }
});

test('should notify enumerable observers when called with no params', function() {
  obj.enumerableContentWillChange();
  deepEqual(observer._before, [obj, null, null]);

  obj.enumerableContentDidChange();
  deepEqual(observer._after, [obj, null, null]);
});

// API variation that included items only
test('should notify when called with same length items', function() {
  var added = ['foo'], removed = ['bar'];
  obj.enumerableContentWillChange(removed, added);
  deepEqual(observer._before, [obj, removed, added]);

  obj.enumerableContentDidChange(removed, added);
  deepEqual(observer._after, [obj, removed, added]);
});

test('should notify when called with diff length items', function() {
  var added = ['foo', 'baz'], removed = ['bar'];
  obj.enumerableContentWillChange(removed, added);
  deepEqual(observer._before, [obj, removed, added]);

  obj.enumerableContentDidChange(removed, added);
  deepEqual(observer._after, [obj, removed, added]);
});

test('should not notify when passed with indexes only', function() {
  obj.enumerableContentWillChange(1, 2);
  deepEqual(observer._before, [obj, 1, 2]);

  obj.enumerableContentDidChange(1, 2);
  deepEqual(observer._after, [obj, 1, 2]);
});

test('removing enumerable observer should disable', function() {
  obj.removeEnumerableObserver(observer);
  obj.enumerableContentWillChange();
  deepEqual(observer._before, null);

  obj.enumerableContentDidChange();
  deepEqual(observer._after, null);
});


})();

(function() {
require('ember-runtime/~tests/suites/mutable_array');

/*
  Implement a basic fake mutable array.  This validates that any non-native
  enumerable can impl this API.
*/
var TestMutableArray = Ember.Object.extend(Ember.MutableArray, {

  _content: null,

  init: function(ary) {
    this._content = Ember.A(ary || []);
  },

  replace: function(idx, amt, objects) {

    var args = objects ? objects.slice() : [],
        removeAmt = amt,
        addAmt    = args.length;

    this.arrayContentWillChange(idx, removeAmt, addAmt);

    args.unshift(amt);
    args.unshift(idx);
    this._content.splice.apply(this._content, args);
    this.arrayContentDidChange(idx, removeAmt, addAmt);
    return this;
  },

  objectAt: function(idx) {
    return this._content[idx];
  },

  length: Ember.computed(function() {
    return this._content.length;
  }),

  slice: function() {
    return this._content.slice();
  }

});


Ember.MutableArrayTests.extend({

  name: 'Basic Mutable Array',

  newObject: function(ary) {
    ary = ary ? ary.slice() : this.newFixture(3);
    return new TestMutableArray(ary);
  },

  // allows for testing of the basic enumerable after an internal mutation
  mutate: function(obj) {
    obj.addObject(this.getFixture(1)[0]);
  },

  toArray: function(obj) {
    return obj.slice();
  }

}).run();




})();

(function() {
require('ember-runtime/~tests/suites/mutable_enumerable');

var indexOf = Ember.EnumerableUtils.indexOf;

/*
  Implement a basic fake mutable array.  This validates that any non-native
  enumerable can impl this API.
*/
var TestMutableEnumerable = Ember.Object.extend(Ember.MutableEnumerable, {

  _content: null,

  addObject: function(obj) {
    if (indexOf(this._content, obj)>=0) return this;
    this.enumerableContentWillChange(null, [obj]);
    this._content.push(obj);
    this.enumerableContentDidChange(null, [obj]);
  },

  removeObject: function(obj) {
    var idx = indexOf(this._content, obj);
    if (idx<0) return this;

    this.enumerableContentWillChange([obj], null);
    this._content.splice(idx, 1);
    this.enumerableContentDidChange([obj], null);
    return this;
  },

  init: function(ary) {
    this._content = ary || [];
  },

  nextObject: function(idx) {
    return idx>=Ember.get(this, 'length') ? undefined : this._content[idx];
  },

  length: Ember.computed(function() {
    return this._content.length;
  }),

  slice: function() {
    return this._content.slice();
  }
});


Ember.MutableEnumerableTests.extend({

  name: 'Basic Mutable Array',

  newObject: function(ary) {
    ary = ary ? ary.slice() : this.newFixture(3);
    return new TestMutableEnumerable(ary);
  },

  // allows for testing of the basic enumerable after an internal mutation
  mutate: function(obj) {
    obj.addObject(this.getFixture(1)[0]);
  },

  toArray: function(obj) {
    return obj.slice();
  }

}).run();




})();

(function() {
module('mixins/observable');

test('should be able to use getProperties to get a POJO of provided keys', function() {
  var obj = Ember.Object.create({
    firstName: "Steve",
    lastName: "Jobs",
    companyName: "Apple, Inc."
  });

  var pojo = obj.getProperties("firstName", "lastName");
  equal("Steve", pojo.firstName);
  equal("Jobs", pojo.lastName);
});

test('should be able to use getProperties with array parameter to get a POJO of provided keys', function() {
  var obj = Ember.Object.create({
    firstName: "Steve",
    lastName: "Jobs",
    companyName: "Apple, Inc."
  });

  var pojo = obj.getProperties(["firstName", "lastName"]);
  equal("Steve", pojo.firstName);
  equal("Jobs", pojo.lastName);
});

test('should be able to use setProperties to set multiple properties at once', function() {
  var obj = Ember.Object.create({
    firstName: "Steve",
    lastName: "Jobs",
    companyName: "Apple, Inc."
  });

  obj.setProperties({firstName: "Tim", lastName: "Cook"});
  equal("Tim", obj.get("firstName"));
  equal("Cook", obj.get("lastName"));
});

testBoth('calling setProperties completes safely despite exceptions', function(get,set) {
  var exc = new Error("Something unexpected happened!");
  var obj = Ember.Object.createWithMixins({
    firstName: "Steve",
    lastName: "Jobs",
    companyName: Ember.computed(function(key, value) {
      if (value !== undefined) {
        throw exc;
      }
      return "Apple, Inc.";
    })
  });

  var firstNameChangedCount = 0;

  Ember.addObserver(obj, 'firstName', function() { firstNameChangedCount++; });

  try {
    obj.setProperties({
      firstName: 'Tim',
      lastName: 'Cook',
      companyName: 'Fruit Co., Inc.'
    });
  } catch(err) {
    if (err !== exc) {
      throw err;
    }
  }

  equal(firstNameChangedCount, 1, 'firstName should have fired once');
});

testBoth("should be able to retrieve cached values of computed properties without invoking the computed property", function(get) {
  var obj = Ember.Object.createWithMixins({
    foo: Ember.computed(function() {
      return "foo";
    }),

    bar: "bar"
  });

  equal(obj.cacheFor('foo'), undefined, "should return undefined if no value has been cached");
  get(obj, 'foo');

  equal(get(obj, 'foo'), "foo", "precond - should cache the value");
  equal(obj.cacheFor('foo'), "foo", "should return the cached value after it is invoked");

  equal(obj.cacheFor('bar'), undefined, "returns undefined if the value is not a computed property");
});

})();

(function() {
var ObjectPromiseProxy;
var get = Ember.get;

test("present on ember namespace", function(){
  ok(Ember.PromiseProxyMixin, "expected Ember.PromiseProxyMixin to exist");
});

module("Ember.PromiseProxy - ObjectProxy", {
  setup: function() {
    ObjectPromiseProxy = Ember.ObjectProxy.extend(Ember.PromiseProxyMixin);
  }
});

test("no promise, invoking then should raise", function(){
  var value = {
    firstName: 'stef',
    lastName: 'penner'
  };

  var proxy = ObjectPromiseProxy.create();

  raises(function(){
    proxy.then(Ember.K, Ember.K);
  }, new RegExp("PromiseProxy's promise must be set"));
});

test("fulfillment", function(){
  var value = {
    firstName: 'stef',
    lastName: 'penner'
  };

  var deferred = Ember.RSVP.defer();

  var proxy = ObjectPromiseProxy.create({
    promise: deferred.promise
  });

  var didFulfillCount = 0;
  var didRejectCount  = 0;

  proxy.then(function(){
    didFulfillCount++;
  }, function(){
    didRejectCount++;
  });

  equal(get(proxy, 'content'),     undefined, 'expects the proxy to have no content');
  equal(get(proxy, 'reason'),      undefined, 'expects the proxy to have no reason');
  equal(get(proxy, 'isPending'),   true,  'expects the proxy to indicate that it is loading');
  equal(get(proxy, 'isSettled'),   false, 'expects the proxy to indicate that it is not settled');
  equal(get(proxy, 'isRejected'),  false, 'expects the proxy to indicate that it is not rejected');
  equal(get(proxy, 'isFulfilled'), false, 'expects the proxy to indicate that it is not fulfilled');

  equal(didFulfillCount, 0, 'should not yet have been fulfilled');
  equal(didRejectCount, 0, 'should not yet have been rejected');

  Ember.run(deferred, 'resolve', value);

  equal(didFulfillCount, 1, 'should have been fulfilled');
  equal(didRejectCount, 0, 'should not have been rejected');

  equal(get(proxy, 'content'),     value, 'expects the proxy to have content');
  equal(get(proxy, 'reason'),      undefined, 'expects the proxy to still have no reason');
  equal(get(proxy, 'isPending'),   false, 'expects the proxy to indicate that it is no longer loading');
  equal(get(proxy, 'isSettled'),   true,  'expects the proxy to indicate that it is settled');
  equal(get(proxy, 'isRejected'),  false, 'expects the proxy to indicate that it is not rejected');
  equal(get(proxy, 'isFulfilled'), true,  'expects the proxy to indicate that it is fulfilled');

  Ember.run(deferred, 'resolve', value);

  equal(didFulfillCount, 1, 'should still have been only fulfilled once');
  equal(didRejectCount,  0, 'should still not have been rejected');

  Ember.run(deferred, 'reject', value);

  equal(didFulfillCount, 1, 'should still have been only fulfilled once');
  equal(didRejectCount,  0, 'should still not have been rejected');

  equal(get(proxy, 'content'),     value, 'expects the proxy to have still have same content');
  equal(get(proxy, 'reason'),      undefined, 'expects the proxy still to have no reason');
  equal(get(proxy, 'isPending'),   false, 'expects the proxy to indicate that it is no longer loading');
  equal(get(proxy, 'isSettled'),   true,  'expects the proxy to indicate that it is settled');
  equal(get(proxy, 'isRejected'),  false, 'expects the proxy to indicate that it is not rejected');
  equal(get(proxy, 'isFulfilled'), true,  'expects the proxy to indicate that it is fulfilled');

  // rest of the promise semantics are tested in directly in RSVP
});

test("rejection", function(){
  var reason = new Error("failure");
  var deferred = Ember.RSVP.defer();
  var proxy = ObjectPromiseProxy.create({
    promise: deferred.promise
  });

  var didFulfillCount = 0;
  var didRejectCount  = 0;

  proxy.then(function(){
    didFulfillCount++;
  }, function(){
    didRejectCount++;
  });

  equal(get(proxy, 'content'),     undefined, 'expects the proxy to have no content');
  equal(get(proxy, 'reason'),      undefined, 'expects the proxy to have no reason');
  equal(get(proxy, 'isPending'),   true,  'expects the proxy to indicate that it is loading');
  equal(get(proxy, 'isSettled'),   false, 'expects the proxy to indicate that it is not settled');
  equal(get(proxy, 'isRejected'),  false, 'expects the proxy to indicate that it is not rejected');
  equal(get(proxy, 'isFulfilled'), false, 'expects the proxy to indicate that it is not fulfilled');

  equal(didFulfillCount, 0, 'should not yet have been fulfilled');
  equal(didRejectCount, 0, 'should not yet have been rejected');

  Ember.run(deferred, 'reject', reason);

  equal(didFulfillCount, 0, 'should not yet have been fulfilled');
  equal(didRejectCount, 1, 'should have been rejected');

  equal(get(proxy, 'content'),     undefined, 'expects the proxy to have no content');
  equal(get(proxy, 'reason'),      reason, 'expects the proxy to have a reason');
  equal(get(proxy, 'isPending'),   false, 'expects the proxy to indicate that it is not longer loading');
  equal(get(proxy, 'isSettled'),   true,  'expects the proxy to indicate that it is settled');
  equal(get(proxy, 'isRejected'),  true, 'expects the proxy to indicate that it is  rejected');
  equal(get(proxy, 'isFulfilled'), false,  'expects the proxy to indicate that it is not fulfilled');

  Ember.run(deferred, 'reject', reason);

  equal(didFulfillCount, 0, 'should stll not yet have been fulfilled');
  equal(didRejectCount, 1, 'should still remain rejected');

  Ember.run(deferred, 'resolve', 1);

  equal(didFulfillCount, 0, 'should stll not yet have been fulfilled');
  equal(didRejectCount, 1, 'should still remain rejected');

  equal(get(proxy, 'content'),     undefined, 'expects the proxy to have no content');
  equal(get(proxy, 'reason'),      reason, 'expects the proxy to have a reason');
  equal(get(proxy, 'isPending'),   false, 'expects the proxy to indicate that it is not longer loading');
  equal(get(proxy, 'isSettled'),   true,  'expects the proxy to indicate that it is settled');
  equal(get(proxy, 'isRejected'),  true, 'expects the proxy to indicate that it is  rejected');
  equal(get(proxy, 'isFulfilled'), false,  'expects the proxy to indicate that it is not fulfilled');
});

test("unhandled rejects still propogate to RSVP.on('error', ...) ", function(){
  expect(1);

  Ember.RSVP.on('error', onerror);
  Ember.RSVP.off('error', Ember.RSVP.onerrorDefault);

  var expectedReason = new Error("failure");
  var deferred = Ember.RSVP.defer();

  var proxy = ObjectPromiseProxy.create({
    promise: deferred.promise
  });

  var promise = proxy.get('promise');

  function onerror(reason) {
    equal(reason, expectedReason, 'expected reason');
  }

  Ember.RSVP.on('error', onerror);
  Ember.RSVP.off('error', Ember.RSVP.onerrorDefault);

  Ember.run(deferred, 'reject', expectedReason);

  Ember.RSVP.on('error', Ember.RSVP.onerrorDefault);
  Ember.RSVP.off('error', onerror);

  Ember.run(deferred, 'reject', expectedReason);

  Ember.RSVP.on('error', Ember.RSVP.onerrorDefault);
  Ember.RSVP.off('error', onerror);
});


})();

(function() {
var get = Ember.get, set = Ember.set;

var unsortedArray, sortedArrayController;

module("Ember.Sortable");

module("Ember.Sortable with content", {
  setup: function() {
    Ember.run(function() {
      var array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }, { id: 3, name: "Scumbag Bryn" }];

      unsortedArray = Ember.A(Ember.A(array).copy());

      sortedArrayController = Ember.ArrayProxy.createWithMixins(Ember.SortableMixin, {
        content: unsortedArray
      });
    });
  },

  teardown: function() {
    Ember.run(function() {
      sortedArrayController.set('content', null);
      sortedArrayController.destroy();
    });
  }
});

test("if you do not specify `sortProperties` sortable have no effect", function() {
  equal(sortedArrayController.get('length'), 3, 'array has 3 items');
  equal(sortedArrayController.objectAt(0).name, 'Scumbag Dale', 'array is in it natural order');

  unsortedArray.pushObject({id: 4, name: 'Scumbag Chavard'});

  equal(sortedArrayController.get('length'), 4, 'array has 4 items');
  equal(sortedArrayController.objectAt(3).name, 'Scumbag Chavard', 'a new object was inserted in the natural order');
});

test("you can change sorted properties", function() {
  sortedArrayController.set('sortProperties', ['id']);

  equal(sortedArrayController.objectAt(0).name, 'Scumbag Dale', 'array is sorted by id');
  equal(sortedArrayController.get('length'), 3, 'array has 3 items');

  sortedArrayController.set('sortAscending', false);

  equal(sortedArrayController.objectAt(0).name, 'Scumbag Bryn', 'array is sorted by id in DESC order');
  equal(sortedArrayController.objectAt(2).name, 'Scumbag Dale', 'array is sorted by id in DESC order');
  equal(sortedArrayController.get('length'), 3, 'array has 3 items');

  sortedArrayController.set('sortProperties', ['name']);

  equal(sortedArrayController.objectAt(0).name, 'Scumbag Katz', 'array is sorted by name in DESC order');
  equal(sortedArrayController.get('length'), 3, 'array has 3 items');
});

test("changing sort order triggers observers", function() {
  var observer, changeCount = 0;
  observer = Ember.Object.createWithMixins({
    array: sortedArrayController,
    arrangedDidChange: Ember.observer('array.[]', function() {
      changeCount++;
    })
  });

  equal(changeCount, 0, 'precond - changeCount starts at 0');

  sortedArrayController.set('sortProperties', ['id']);

  equal(changeCount, 1, 'setting sortProperties increments changeCount');

  sortedArrayController.set('sortAscending', false);

  equal(changeCount, 2, 'changing sortAscending increments changeCount');

  sortedArrayController.set('sortAscending', true);

  equal(changeCount, 3, 'changing sortAscending again increments changeCount');

  Ember.run(function() { observer.destroy(); });
});

module("Ember.Sortable with content and sortProperties", {
  setup: function() {
    Ember.run(function() {
      var array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }, { id: 3, name: "Scumbag Bryn" }];

      unsortedArray = Ember.A(Ember.A(array).copy());

      sortedArrayController = Ember.ArrayController.create({
        content: unsortedArray,
        sortProperties: ['name']
      });
    });
  },

  teardown: function() {
    Ember.run(function() {
      sortedArrayController.destroy();
    });
  }
});

test("sortable object will expose associated content in the right order", function() {
  equal(sortedArrayController.get('length'), 3, 'array has 3 items');
  equal(sortedArrayController.objectAt(0).name, 'Scumbag Bryn', 'array is sorted by name');
});

test("you can add objects in sorted order", function() {
  equal(sortedArrayController.get('length'), 3, 'array has 3 items');

  unsortedArray.pushObject({id: 4, name: 'Scumbag Chavard'});

  equal(sortedArrayController.get('length'), 4, 'array has 4 items');
  equal(sortedArrayController.objectAt(1).name, 'Scumbag Chavard', 'a new object added to content was inserted according to given constraint');

  sortedArrayController.addObject({id: 5, name: 'Scumbag Fucs'});

  equal(sortedArrayController.get('length'), 5, 'array has 5 items');
  equal(sortedArrayController.objectAt(3).name, 'Scumbag Fucs', 'a new object added to controller was inserted according to given constraint');
});

test("you can push objects in sorted order", function() {
  equal(sortedArrayController.get('length'), 3, 'array has 3 items');

  unsortedArray.pushObject({id: 4, name: 'Scumbag Chavard'});

  equal(sortedArrayController.get('length'), 4, 'array has 4 items');
  equal(sortedArrayController.objectAt(1).name, 'Scumbag Chavard', 'a new object added to content was inserted according to given constraint');

  sortedArrayController.pushObject({id: 5, name: 'Scumbag Fucs'});

  equal(sortedArrayController.get('length'), 5, 'array has 5 items');
  equal(sortedArrayController.objectAt(3).name, 'Scumbag Fucs', 'a new object added to controller was inserted according to given constraint');
});

test("you can unshift objects in sorted order", function() {
  equal(sortedArrayController.get('length'), 3, 'array has 3 items');

  unsortedArray.unshiftObject({id: 4, name: 'Scumbag Chavard'});

  equal(sortedArrayController.get('length'), 4, 'array has 4 items');
  equal(sortedArrayController.objectAt(1).name, 'Scumbag Chavard', 'a new object added to content was inserted according to given constraint');

  sortedArrayController.addObject({id: 5, name: 'Scumbag Fucs'});

  equal(sortedArrayController.get('length'), 5, 'array has 5 items');
  equal(sortedArrayController.objectAt(3).name, 'Scumbag Fucs', 'a new object added to controller was inserted according to given constraint');
});

test("addObject does not insert duplicates", function() {
  var sortedArrayProxy, obj = {};
  sortedArrayProxy = Ember.ArrayProxy.createWithMixins(Ember.SortableMixin, {
    content: Ember.A([obj])
  });

  equal(sortedArrayProxy.get('length'), 1, 'array has 1 item');

  sortedArrayProxy.addObject(obj);

  equal(sortedArrayProxy.get('length'), 1, 'array still has 1 item');
});

test("you can change a sort property and the content will rearrenge", function() {
  equal(sortedArrayController.get('length'), 3, 'array has 3 items');
  equal(sortedArrayController.objectAt(0).name, 'Scumbag Bryn', 'bryn is first');

  set(sortedArrayController.objectAt(0), 'name', 'Scumbag Fucs');
  equal(sortedArrayController.objectAt(0).name, 'Scumbag Dale', 'dale is first now');
  equal(sortedArrayController.objectAt(1).name, 'Scumbag Fucs', 'foucs is second');
});

test("you can change the position of the middle item", function() {
  equal(sortedArrayController.get('length'), 3, 'array has 3 items');

  equal(sortedArrayController.objectAt(1).name, 'Scumbag Dale', 'Dale is second');
  set(sortedArrayController.objectAt(1), 'name', 'Alice'); // Change Dale to Alice

  equal(sortedArrayController.objectAt(0).name, 'Alice', 'Alice (previously Dale) is first now');
});

test("don't remove and insert if position didn't change", function() {
  var insertItemSortedCalled = false;

  sortedArrayController.reopen({
    insertItemSorted: function(item) {
      insertItemSortedCalled = true;
      this._super(item);
    }
  });

  sortedArrayController.set('sortProperties', ['name']);

  Ember.set(sortedArrayController.objectAt(0), 'name', 'Scumbag Brynjolfsson');

  ok(!insertItemSortedCalled, "insertItemSorted should not have been called");
});

test("sortProperties observers removed on content removal", function() {
  var removedObject = unsortedArray.objectAt(2);
  equal(Ember.listenersFor(removedObject, 'name:change').length, 1,
    "Before removal, there should be one listener for sortProperty change.");
  unsortedArray.replace(2, 1, []);
  equal(Ember.listenersFor(removedObject, 'name:change').length, 0,
    "After removal, there should be no listeners for sortProperty change.");
});

module("Ember.Sortable with sortProperties", {
  setup: function() {
    Ember.run(function() {
      sortedArrayController = Ember.ArrayController.create({
        sortProperties: ['name']
      });
      var array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }, { id: 3, name: "Scumbag Bryn" }];
      unsortedArray = Ember.A(Ember.A(array).copy());
    });
  },

  teardown: function() {
    Ember.run(function() {
      sortedArrayController.destroy();
    });
  }
});

test("you can set content later and it will be sorted", function() {
  equal(sortedArrayController.get('length'), 0, 'array has 0 items');

  Ember.run(function() {
    sortedArrayController.set('content', unsortedArray);
  });

  equal(sortedArrayController.get('length'), 3, 'array has 3 items');
  equal(sortedArrayController.objectAt(0).name, 'Scumbag Bryn', 'array is sorted by name');
});

module("Ember.Sortable with sortFunction and sortProperties", {
  setup: function() {
    Ember.run(function() {
      sortedArrayController = Ember.ArrayController.create({
        sortProperties: ['name'],
        sortFunction: function(v, w) {
            var lowerV = v.toLowerCase(),
                lowerW = w.toLowerCase();

            if (lowerV < lowerW) {
              return -1;
            }
            if (lowerV > lowerW) {
              return 1;
            }
            return 0;
        }
      });
      var array = [{ id: 1, name: "Scumbag Dale" },
                   { id: 2, name: "Scumbag Katz" },
                   { id: 3, name: "Scumbag bryn" }];
      unsortedArray = Ember.A(Ember.A(array).copy());
    });
  },

  teardown: function() {
    Ember.run(function() {
      sortedArrayController.destroy();
    });
  }
});

test("you can sort with custom sorting function", function() {
  equal(sortedArrayController.get('length'), 0, 'array has 0 items');

  Ember.run(function() {
    sortedArrayController.set('content', unsortedArray);
  });

  equal(sortedArrayController.get('length'), 3, 'array has 3 items');
  equal(sortedArrayController.objectAt(0).name, 'Scumbag bryn', 'array is sorted by custom sort');
});

})();

(function() {
/*global Test:true*/

var originalLookup;

module("Ember.TargetActionSupport", {
  setup: function() {
    originalLookup = Ember.lookup;
  },
  teardown: function() {
    Ember.lookup = originalLookup;
  }
});

test("it should return false if no target or action are specified", function() {
  expect(1);

  var obj = Ember.Object.createWithMixins(Ember.TargetActionSupport);

  ok(false === obj.triggerAction(), "no target or action was specified");
});

test("it should support actions specified as strings", function() {
  expect(2);

  var obj = Ember.Object.createWithMixins(Ember.TargetActionSupport, {
    target: Ember.Object.create({
      anEvent: function() {
        ok(true, "anEvent method was called");
      }
    }),

    action: 'anEvent'
  });

  ok(true === obj.triggerAction(), "a valid target and action were specified");
});

test("it should invoke the send() method on objects that implement it", function() {
  expect(3);

  var obj = Ember.Object.createWithMixins(Ember.TargetActionSupport, {
    target: Ember.Object.create({
      send: function(evt, context) {
        equal(evt, 'anEvent', "send() method was invoked with correct event name");
        equal(context, obj, "send() method was invoked with correct context");
      }
    }),

    action: 'anEvent'
  });

  ok(true === obj.triggerAction(), "a valid target and action were specified");
});

test("it should find targets specified using a property path", function() {
  expect(2);

  var Test = {};
  Ember.lookup = { Test: Test };

  Test.targetObj = Ember.Object.create({
    anEvent: function() {
      ok(true, "anEvent method was called on global object");
    }
  });

  var myObj = Ember.Object.createWithMixins(Ember.TargetActionSupport, {
    target: 'Test.targetObj',
    action: 'anEvent'
  });

  ok(true === myObj.triggerAction(), "a valid target and action were specified");
});

test("it should use an actionContext object specified as a property on the object", function() {
  expect(2);
  var obj = Ember.Object.createWithMixins(Ember.TargetActionSupport,{
        action: 'anEvent',
        actionContext: {},
        target: Ember.Object.create({
          anEvent: function(ctx) {
            ok(obj.actionContext === ctx, "anEvent method was called with the expected context");
          }
        })
      });
  ok(true === obj.triggerAction(), "a valid target and action were specified");
});

test("it should find an actionContext specified as a property path", function() {
  expect(2);

  var Test = {};
  Ember.lookup = { Test: Test };
  Test.aContext = {};

  var obj = Ember.Object.createWithMixins(Ember.TargetActionSupport,{
        action: 'anEvent',
        actionContext: 'Test.aContext',
        target: Ember.Object.create({
          anEvent: function(ctx) {
            ok(Test.aContext === ctx, "anEvent method was called with the expected context");
          }
        })
      });
  ok(true === obj.triggerAction(), "a valid target and action were specified");
});

test("it should use the target specified in the argument", function() {
  expect(2);
  var targetObj = Ember.Object.create({
        anEvent: function() {
          ok(true, "anEvent method was called");
        }
      }),
      obj = Ember.Object.createWithMixins(Ember.TargetActionSupport,{
        action: 'anEvent'
      });
  ok(true === obj.triggerAction({target: targetObj}), "a valid target and action were specified");
});

test("it should use the action specified in the argument", function() {
  expect(2);

  var obj = Ember.Object.createWithMixins(Ember.TargetActionSupport,{
    target: Ember.Object.create({
      anEvent: function() {
        ok(true, "anEvent method was called");
      }
    })
  });
  ok(true === obj.triggerAction({action: 'anEvent'}), "a valid target and action were specified");
});

test("it should use the actionContext specified in the argument", function() {
  expect(2);
  var context = {},
      obj = Ember.Object.createWithMixins(Ember.TargetActionSupport,{
    target: Ember.Object.create({
      anEvent: function(ctx) {
        ok(context === ctx, "anEvent method was called with the expected context");
      }
    }),
    action: 'anEvent'
  });
  ok(true === obj.triggerAction({actionContext: context}), "a valid target and action were specified");
});

test("it should allow multiple arguments from actionContext", function() {
  expect(3);
  var param1 = 'someParam',
      param2 = 'someOtherParam',
      obj = Ember.Object.createWithMixins(Ember.TargetActionSupport,{
    target: Ember.Object.create({
      anEvent: function(first, second) {
        ok(first === param1, "anEvent method was called with the expected first argument");
        ok(second === param2, "anEvent method was called with the expected second argument");
      }
    }),
    action: 'anEvent'
  });
  ok(true === obj.triggerAction({actionContext: [param1, param2]}), "a valid target and action were specified");
});

test("it should use a null value specified in the actionContext argument", function() {
  expect(2);
  var obj = Ember.Object.createWithMixins(Ember.TargetActionSupport,{
    target: Ember.Object.create({
      anEvent: function(ctx) {
        ok(null === ctx, "anEvent method was called with the expected context (null)");
      }
    }),
    action: 'anEvent'
  });
  ok(true === obj.triggerAction({actionContext: null}), "a valid target and action were specified");
});

})();

(function() {
module('Ember.Application');

test('Ember.Application should be a subclass of Ember.Namespace', function() {

  ok(Ember.Namespace.detect(Ember.Application), 'Ember.Application subclass of Ember.Namespace');

});

})();

(function() {
var array;

module("Ember.ArrayProxy - arrangedContent", {
  setup: function() {
    Ember.run(function() {
      array = Ember.ArrayProxy.createWithMixins({
        content: Ember.A([1,2,4,5]),
        arrangedContent: Ember.computed(function() {
          var content = this.get('content');
          return content && Ember.A(content.slice().sort(function(a,b) {
            if (a == null) { a = -1; }
            if (b == null) { b = -1; }
            return b - a;
          }));
        }).property('content.[]')
      });
    });
  },
  teardown: function() {
    Ember.run(function() {
      array.destroy();
    });
  }
});

test("addObject - adds to end of 'content' if not present", function() {
  Ember.run(function() { array.addObject(3); });
  deepEqual(array.get('content'), [1,2,4,5,3], 'adds to end of content');
  deepEqual(array.get('arrangedContent'), [5,4,3,2,1], 'arrangedContent stays sorted');

  Ember.run(function() { array.addObject(1); });
  deepEqual(array.get('content'), [1,2,4,5,3], 'does not add existing number to content');
});

test("addObjects - adds to end of 'content' if not present", function() {
  Ember.run(function() { array.addObjects([1,3,6]); });
  deepEqual(array.get('content'), [1,2,4,5,3,6], 'adds to end of content');
  deepEqual(array.get('arrangedContent'), [6,5,4,3,2,1], 'arrangedContent stays sorted');
});

test("compact - returns arrangedContent without nulls and undefined", function() {
  Ember.run(function() { array.set('content', Ember.A([1,3,null,2,undefined])); });
  deepEqual(array.compact(), [3,2,1]);
});

test("indexOf - returns index of object in arrangedContent", function() {
  equal(array.indexOf(4), 1, 'returns arranged index');
});

test("insertAt - raises, indeterminate behavior", function() {
  raises(function() {
    Ember.run(function() { array.insertAt(2,3); });
  });
});

test("lastIndexOf - returns last index of object in arrangedContent", function() {
  Ember.run(function() { array.pushObject(4); });
  equal(array.lastIndexOf(4), 2, 'returns last arranged index');
});

test("nextObject - returns object at index in arrangedContent", function() {
  equal(array.nextObject(1), 4, 'returns object at index');
});

test("objectAt - returns object at index in arrangedContent", function() {
  equal(array.objectAt(1), 4, 'returns object at index');
});

// Not sure if we need a specific test for it, since it's internal
test("objectAtContent - returns object at index in arrangedContent", function() {
  equal(array.objectAtContent(1), 4, 'returns object at index');
});

test("objectsAt - returns objects at indices in arrangedContent", function() {
  deepEqual(array.objectsAt([0,2,4]), [5,2,undefined], 'returns objects at indices');
});

test("popObject - removes last object in arrangedContent", function() {
  var popped;
  Ember.run(function() { popped = array.popObject(); });
  equal(popped, 1, 'returns last object');
  deepEqual(array.get('content'), [2,4,5], 'removes from content');
});

test("pushObject - adds to end of content even if it already exists", function() {
  Ember.run(function() { array.pushObject(1); });
  deepEqual(array.get('content'), [1,2,4,5,1], 'adds to end of content');
});

test("pushObjects - adds multiple to end of content even if it already exists", function() {
  Ember.run(function() { array.pushObjects([1,2,4]); });
  deepEqual(array.get('content'), [1,2,4,5,1,2,4], 'adds to end of content');
});

test("removeAt - removes from index in arrangedContent", function() {
  Ember.run(function() { array.removeAt(1,2); });
  deepEqual(array.get('content'), [1,5]);
});

test("removeObject - removes object from content", function() {
  Ember.run(function() { array.removeObject(2); });
  deepEqual(array.get('content'), [1,4,5]);
});

test("removeObjects - removes objects from content", function() {
  Ember.run(function() { array.removeObjects([2,4,6]); });
  deepEqual(array.get('content'), [1,5]);
});

test("replace - raises, indeterminate behavior", function() {
  raises(function() {
    Ember.run(function() { array.replace(1, 2, [3]); });
  });
});

test("replaceContent - does a standard array replace on content", function() {
  Ember.run(function() { array.replaceContent(1, 2, [3]); });
  deepEqual(array.get('content'), [1,3,5]);
});

test("reverseObjects - raises, use Sortable#sortAscending", function() {
  raises(function() {
    Ember.run(function() { array.reverseObjects(); });
  });
});

test("setObjects - replaces entire content", function() {
  Ember.run(function() { array.setObjects([6,7,8]); });
  deepEqual(array.get('content'), [6,7,8], 'replaces content');
});

test("shiftObject - removes from start of arrangedContent", function() {
  var shifted;
  Ember.run(function() { shifted = array.shiftObject(); });
  equal(shifted, 5, 'returns first object');
  deepEqual(array.get('content'), [1,2,4], 'removes object from content');
});

test("slice - returns a slice of the arrangedContent", function() {
  deepEqual(array.slice(1,3), [4,2], 'returns sliced arrangedContent');
});

test("toArray - returns copy of arrangedContent", function() {
  deepEqual(array.toArray(), [5,4,2,1]);
});

test("unshiftObject - adds to start of content", function() {
  Ember.run(function() { array.unshiftObject(6); });
  deepEqual(array.get('content'), [6,1,2,4,5], 'adds to start of content');
});

test("unshiftObjects - adds to start of content", function() {
  Ember.run(function() { array.unshiftObjects([6,7]); });
  deepEqual(array.get('content'), [6,7,1,2,4,5], 'adds to start of content');
});

test("without - returns arrangedContent without object", function() {
  deepEqual(array.without(2), [5,4,1], 'returns arranged without object');
});

test("lastObject - returns last arranged object", function() {
  equal(array.get('lastObject'), 1, 'returns last arranged object');
});

test("firstObject - returns first arranged object", function() {
  equal(array.get('firstObject'), 5, 'returns first arranged object');
});


module("Ember.ArrayProxy - arrangedContent matching content", {
  setup: function() {
    Ember.run(function() {
      array = Ember.ArrayProxy.createWithMixins({
        content: Ember.A([1,2,4,5])
      });
    });
  },
  teardown: function() {
    Ember.run(function() {
      array.destroy();
    });
  }
});

test("insertAt - inserts object at specified index", function() {
  Ember.run(function() { array.insertAt(2, 3); });
  deepEqual(array.get('content'), [1,2,3,4,5]);
});

test("replace - does a standard array replace", function() {
  Ember.run(function() { array.replace(1, 2, [3]); });
  deepEqual(array.get('content'), [1,3,5]);
});

test("reverseObjects - reverses content", function() {
  Ember.run(function() { array.reverseObjects(); });
  deepEqual(array.get('content'), [5,4,2,1]);
});

module("Ember.ArrayProxy - arrangedContent with transforms", {
  setup: function() {
    Ember.run(function() {
      array = Ember.ArrayProxy.createWithMixins({
        content: Ember.A([1,2,4,5]),

        arrangedContent: Ember.computed(function() {
          var content = this.get('content');
          return content && Ember.A(content.slice().sort(function(a,b) {
            if (a == null) { a = -1; }
            if (b == null) { b = -1; }
            return b - a;
          }));
        }).property('content.[]'),

        objectAtContent: function(idx) {
          var obj = this.get('arrangedContent').objectAt(idx);
          return obj && obj.toString();
        }
      });
    });
  },
  teardown: function() {
    Ember.run(function() {
      array.destroy();
    });
  }
});

test("indexOf - returns index of object in arrangedContent", function() {
  equal(array.indexOf('4'), 1, 'returns arranged index');
});

test("lastIndexOf - returns last index of object in arrangedContent", function() {
  Ember.run(function() { array.pushObject(4); });
  equal(array.lastIndexOf('4'), 2, 'returns last arranged index');
});

test("nextObject - returns object at index in arrangedContent", function() {
  equal(array.nextObject(1), '4', 'returns object at index');
});

test("objectAt - returns object at index in arrangedContent", function() {
  equal(array.objectAt(1), '4', 'returns object at index');
});

// Not sure if we need a specific test for it, since it's internal
test("objectAtContent - returns object at index in arrangedContent", function() {
  equal(array.objectAtContent(1), '4', 'returns object at index');
});

test("objectsAt - returns objects at indices in arrangedContent", function() {
  deepEqual(array.objectsAt([0,2,4]), ['5','2',undefined], 'returns objects at indices');
});

test("popObject - removes last object in arrangedContent", function() {
  var popped;
  Ember.run(function() { popped = array.popObject(); });
  equal(popped, '1', 'returns last object');
  deepEqual(array.get('content'), [2,4,5], 'removes from content');
});

test("removeObject - removes object from content", function() {
  Ember.run(function() { array.removeObject('2'); });
  deepEqual(array.get('content'), [1,4,5]);
});

test("removeObjects - removes objects from content", function() {
  Ember.run(function() { array.removeObjects(['2','4','6']); });
  deepEqual(array.get('content'), [1,5]);
});

test("shiftObject - removes from start of arrangedContent", function() {
  var shifted;
  Ember.run(function() { shifted = array.shiftObject(); });
  equal(shifted, '5', 'returns first object');
  deepEqual(array.get('content'), [1,2,4], 'removes object from content');
});

test("slice - returns a slice of the arrangedContent", function() {
  deepEqual(array.slice(1,3), ['4','2'], 'returns sliced arrangedContent');
});

test("toArray - returns copy of arrangedContent", function() {
  deepEqual(array.toArray(), ['5','4','2','1']);
});

test("without - returns arrangedContent without object", function() {
  deepEqual(array.without('2'), ['5','4','1'], 'returns arranged without object');
});

test("lastObject - returns last arranged object", function() {
  equal(array.get('lastObject'), '1', 'returns last arranged object');
});

test("firstObject - returns first arranged object", function() {
  equal(array.get('firstObject'), '5', 'returns first arranged object');
});

})();

(function() {
module("Ember.ArrayProxy - content change");

test("should update length for null content", function() {
  var proxy = Ember.ArrayProxy.create({
        content: Ember.A([1,2,3])
      });

  equal(proxy.get('length'), 3, "precond - length is 3");

  proxy.set('content', null);

  equal(proxy.get('length'), 0, "length updates");
});

test("The `arrangedContentWillChange` method is invoked before `content` is changed.", function() {
  var callCount = 0,
      expectedLength;

  var proxy = Ember.ArrayProxy.extend({
    content: Ember.A([1, 2, 3]),

    arrangedContentWillChange: function() {
      equal(this.get('arrangedContent.length'), expectedLength, "hook should be invoked before array has changed");
      callCount++;
    }
  }).create();

  proxy.pushObject(4);
  equal(callCount, 0, "pushing content onto the array doesn't trigger it");

  proxy.get('content').pushObject(5);
  equal(callCount, 0, "pushing content onto the content array doesn't trigger it");

  expectedLength = 5;
  proxy.set('content', Ember.A(['a', 'b']));
  equal(callCount, 1, "replacing the content array triggers the hook");
});

test("The `arrangedContentDidChange` method is invoked after `content` is changed.", function() {
  var callCount = 0,
      expectedLength;

  var proxy = Ember.ArrayProxy.extend({
    content: Ember.A([1, 2, 3]),

    arrangedContentDidChange: function() {
      equal(this.get('arrangedContent.length'), expectedLength, "hook should be invoked after array has changed");
      callCount++;
    }
  }).create();

  equal(callCount, 0, "hook is not called after creating the object");

  proxy.pushObject(4);
  equal(callCount, 0, "pushing content onto the array doesn't trigger it");

  proxy.get('content').pushObject(5);
  equal(callCount, 0, "pushing content onto the content array doesn't trigger it");

  expectedLength = 2;
  proxy.set('content', Ember.A(['a', 'b']));
  equal(callCount, 1, "replacing the content array triggers the hook");
});

})();

(function() {
// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module("Ember.ArrayProxy - content update");

test("The `contentArrayDidChange` method is invoked after `content` is updated.", function() {

  var proxy, observerCalled = false;

  proxy = Ember.ArrayProxy.createWithMixins({
    content: Ember.A(),

    arrangedContent: Ember.computed('content', function(key, value) {
      // setup arrangedContent as a different object than content,
      // which is the default
      return Ember.A(this.get('content').slice());
    }),

    contentArrayDidChange: function(array, idx, removedCount, addedCount) {
      observerCalled = true;
      return this._super(array, idx, removedCount, addedCount);
    }
  });

  proxy.pushObject(1);

  ok(observerCalled, "contentArrayDidChange is invoked");
});

})();

(function() {
Ember.MutableArrayTests.extend({

  name: 'Ember.ArrayProxy',

  newObject: function(ary) {
    var ret = ary ? ary.slice() : this.newFixture(3);
    return Ember.ArrayProxy.create({ content: Ember.A(ret) });
  },

  mutate: function(obj) {
    obj.pushObject(Ember.get(obj, 'length')+1);
  },

  toArray: function(obj) {
    return obj.toArray ? obj.toArray() : obj.slice();
  }

}).run();




})();

(function() {
module("Ember.Deferred all-in-one");

asyncTest("Can resolve a promise", function() {
  var value = { value: true };

  var promise = Ember.Deferred.promise(function(deferred) {
    setTimeout(function() {
      Ember.run(function() { deferred.resolve(value); });
    });
  });

  promise.then(function(resolveValue) {
    start();
    equal(resolveValue, value, "The resolved value should be correct");
  });
});

asyncTest("Can reject a promise", function() {
  var rejected = { rejected: true };

  var promise = Ember.Deferred.promise(function(deferred) {
    setTimeout(function() {
      Ember.run(function() { deferred.reject(rejected); });
    });
  });

  promise.then(null, function(rejectedValue) {
    start();
    equal(rejectedValue, rejected, "The resolved value should be correct");
  });
});



})();

(function() {
module("Lazy Loading");

test("if a load hook is registered, it is executed when runLoadHooks are exected", function() {
  var count = 0;

  Ember.run(function() {
    Ember.onLoad("__test_hook__", function(object) {
      count += object;
    });
  });

  Ember.run(function() {
    Ember.runLoadHooks("__test_hook__", 1);
  });

  equal(count, 1, "the object was passed into the load hook");
});

test("if runLoadHooks was already run, it executes newly added hooks immediately", function() {
  var count = 0;
  Ember.run(function() {
    Ember.onLoad("__test_hook__", function(object) {
      count += object;
    });
  });

  Ember.run(function() {
    Ember.runLoadHooks("__test_hook__", 1);
  });

  count = 0;
  Ember.run(function() {
    Ember.onLoad("__test_hook__", function(object) {
      count += object;
    });
  });

  equal(count, 1, "the original object was passed into the load hook");
});

test("hooks in ENV.EMBER_LOAD_HOOKS['hookName'] get executed", function() {

  // Note that the necessary code to perform this test is run before
  // the Ember lib is loaded in tests/index.html

  Ember.run(function() {
    Ember.runLoadHooks("__before_ember_test_hook__", 1);
  });

  equal(window.ENV.__test_hook_count__, 1, "the object was passed into the load hook");
});

})();

(function() {
// ==========================================================================
// Project:  Ember Runtime
// ==========================================================================

var get = Ember.get, originalLookup = Ember.lookup, lookup;

module('Ember.Namespace', {
  setup: function() {
    Ember.BOOTED = false;

    lookup = Ember.lookup = {};
  },
  teardown: function() {
    Ember.BOOTED = false;

    if (lookup.NamespaceA) { Ember.run(function() { lookup.NamespaceA.destroy(); }); }
    if (lookup.NamespaceB) { Ember.run(function() { lookup.NamespaceB.destroy(); }); }
    if (lookup.namespaceC) {
      try {
        Ember.TESTING_DEPRECATION = true;
        Ember.run(function() {
          lookup.namespaceC.destroy();
        });
      } finally {
        Ember.TESTING_DEPRECATION = false;
      }
    }

    Ember.lookup = originalLookup;
  }
});

test('Ember.Namespace should be a subclass of Ember.Object', function() {
  ok(Ember.Object.detect(Ember.Namespace));
});

test("Ember.Namespace should be duck typed", function() {
  ok(get(Ember.Namespace.create(), 'isNamespace'), "isNamespace property is true");
});

test('Ember.Namespace is found and named', function() {
  var nsA = lookup.NamespaceA = Ember.Namespace.create();
  equal(nsA.toString(), "NamespaceA", "namespaces should have a name if they are on lookup");

  var nsB = lookup.NamespaceB = Ember.Namespace.create();
  equal(nsB.toString(), "NamespaceB", "namespaces work if created after the first namespace processing pass");
});

test("Classes under an Ember.Namespace are properly named", function() {
  var nsA = lookup.NamespaceA = Ember.Namespace.create();
  nsA.Foo = Ember.Object.extend();
  equal(nsA.Foo.toString(), "NamespaceA.Foo", "Classes pick up their parent namespace");

  nsA.Bar = Ember.Object.extend();
  equal(nsA.Bar.toString(), "NamespaceA.Bar", "New Classes get the naming treatment too");

  var nsB = lookup.NamespaceB = Ember.Namespace.create();
  nsB.Foo = Ember.Object.extend();
  equal(nsB.Foo.toString(), "NamespaceB.Foo", "Classes in new namespaces get the naming treatment");
});

test("Classes under Ember are properly named", function() {
  equal(Ember.Array.toString(), "Ember.Array", "precond - existing classes are processed");

  Ember.TestObject = Ember.Object.extend({});
  equal(Ember.TestObject.toString(), "Ember.TestObject", "class under Ember is given a string representation");
});

test("Lowercase namespaces should be deprecated", function() {
  lookup.namespaceC = Ember.Namespace.create();

  var originalWarn = Ember.Logger.warn,
      loggerWarning;

  Ember.Logger.warn = function(msg) { loggerWarning = msg; };

  try {
    lookup.namespaceC.toString();
  } finally {
    Ember.Logger.warn = originalWarn;
  }

  // Ignore backtrace
  equal(loggerWarning.split("\n")[0], "DEPRECATION: Namespaces should not begin with lowercase.");
});

test("A namespace can be assigned a custom name", function() {
  var nsA = Ember.Namespace.create({
    name: "NamespaceA"
  });

  var nsB = lookup.NamespaceB = Ember.Namespace.create({
    name: "CustomNamespaceB"
  });

  nsA.Foo = Ember.Object.extend();
  nsB.Foo = Ember.Object.extend();

  equal(nsA.Foo.toString(), "NamespaceA.Foo", "The namespace's name is used when the namespace is not in the lookup object");
  equal(nsB.Foo.toString(), "CustomNamespaceB.Foo", "The namespace's name is used when the namespace is in the lookup object");
});

test("Calling namespace.nameClasses() eagerly names all classes", function() {
  Ember.BOOTED = true;

  var namespace = lookup.NS = Ember.Namespace.create();

  namespace.ClassA = Ember.Object.extend();
  namespace.ClassB = Ember.Object.extend();

  Ember.Namespace.processAll();

  equal(namespace.ClassA.toString(), "NS.ClassA");
  equal(namespace.ClassB.toString(), "NS.ClassB");
});

test("A namespace can be looked up by its name", function() {
  var NS = lookup.NS = Ember.Namespace.create();
  var UI = lookup.UI = Ember.Namespace.create();
  var CF = lookup.CF = Ember.Namespace.create();

  equal(Ember.Namespace.byName('NS'), NS);
  equal(Ember.Namespace.byName('UI'), UI);
  equal(Ember.Namespace.byName('CF'), CF);
});

test("A nested namespace can be looked up by its name", function() {
  var UI = lookup.UI = Ember.Namespace.create();
  UI.Nav = Ember.Namespace.create();

  equal(Ember.Namespace.byName('UI.Nav'), UI.Nav);
});

})();

(function() {
// ..........................................................
// COPYABLE TESTS
//
Ember.CopyableTests.extend({
  name: 'NativeArray Copyable',

  newObject: function() {
    return Ember.A([Ember.generateGuid()]);
  },

  isEqual: function(a,b) {
    if (!(a instanceof Array)) return false;
    if (!(b instanceof Array)) return false;
    if (a.length !== b.length) return false;
    return a[0]===b[0];
  },

  shouldBeFreezable: false
}).run();

module("NativeArray Copyable");

test("deep copy is respected", function() {
  var array = Ember.A([ { id: 1 }, { id: 2 }, { id: 3 } ]);

  var copiedArray = array.copy(true);

  deepEqual(copiedArray, array, "copied array is equivalent");
  ok(copiedArray[0] !== array[0], "objects inside should be unique");
});

})();

(function() {
Ember.MutableArrayTests.extend({

  name: 'Native Array',

  newObject: function(ary) {
    return Ember.A(ary ? ary.slice() : this.newFixture(3));
  },

  mutate: function(obj) {
    obj.pushObject(obj.length+1);
  },

  toArray: function(obj) {
    return obj.slice(); // make a copy.
  }

}).run();




})();

(function() {
require('ember-runtime/~tests/props_helper');

module('Ember.Object computed property');

testWithDefault('computed property on instance', function(get, set) {

  var MyClass = Ember.Object.extend({
    foo: Ember.computed(function() { return 'FOO'; })
  });

  equal(get(new MyClass(), 'foo'), 'FOO');

});


testWithDefault('computed property on subclass', function(get, set) {

  var MyClass = Ember.Object.extend({
    foo: Ember.computed(function() { return 'FOO'; })
  });

  var Subclass = MyClass.extend({
    foo: Ember.computed(function() { return 'BAR'; })
  });

  equal(get(new Subclass(), 'foo'), 'BAR');

});


testWithDefault('replacing computed property with regular val', function(get, set) {

  var MyClass = Ember.Object.extend({
    foo: Ember.computed(function() { return 'FOO'; })
  });

  var Subclass = MyClass.extend({
    foo: 'BAR'
  });

  equal(get(new Subclass(), 'foo'), 'BAR');

});

testWithDefault('complex depndent keys', function(get, set) {

  var MyClass = Ember.Object.extend({

    init: function() {
      this._super();
      set(this, 'bar', { baz: 'BIFF' });
    },

    count: 0,

    foo: Ember.computed(function() {
      set(this, 'count', get(this, 'count')+1);
      return Ember.get(get(this, 'bar'), 'baz') + ' ' + get(this, 'count');
    }).property('bar.baz')

  });

  var Subclass = MyClass.extend({
    count: 20
  });

  var obj1 = new MyClass(),
      obj2 = new Subclass();

  equal(get(obj1, 'foo'), 'BIFF 1');
  equal(get(obj2, 'foo'), 'BIFF 21');

  set(get(obj1, 'bar'), 'baz', 'BLARG');

  equal(get(obj1, 'foo'), 'BLARG 2');
  equal(get(obj2, 'foo'), 'BIFF 21');

  set(get(obj2, 'bar'), 'baz', 'BOOM');

  equal(get(obj1, 'foo'), 'BLARG 2');
  equal(get(obj2, 'foo'), 'BOOM 22');
});

testWithDefault('complex depndent keys changing complex dependent keys', function(get, set) {

  var MyClass = Ember.Object.extend({

    init: function() {
      this._super();
      set(this, 'bar', { baz: 'BIFF' });
    },

    count: 0,

    foo: Ember.computed(function() {
      set(this, 'count', get(this, 'count')+1);
      return Ember.get(get(this, 'bar'), 'baz') + ' ' + get(this, 'count');
    }).property('bar.baz')

  });

  var Subclass = MyClass.extend({

    init: function() {
      this._super();
      set(this, 'bar2', { baz: 'BIFF2' });
    },

    count: 0,

    foo: Ember.computed(function() {
      set(this, 'count', get(this, 'count')+1);
      return Ember.get(get(this, 'bar2'), 'baz') + ' ' + get(this, 'count');
    }).property('bar2.baz')
  });

  var obj2 = new Subclass();

  equal(get(obj2, 'foo'), 'BIFF2 1');

  set(get(obj2, 'bar'), 'baz', 'BLARG');
  equal(get(obj2, 'foo'), 'BIFF2 1', 'should not invalidate property');

  set(get(obj2, 'bar2'), 'baz', 'BLARG');
  equal(get(obj2, 'foo'), 'BLARG 2', 'should invalidate property');
});

test("can retrieve metadata for a computed property", function() {
  var get = Ember.get;

  var MyClass = Ember.Object.extend({
    computedProperty: Ember.computed(function() {
    }).meta({ key: 'keyValue' })
  });

  equal(get(MyClass.metaForProperty('computedProperty'), 'key'), 'keyValue', "metadata saved on the computed property can be retrieved");

  var ClassWithNoMetadata = Ember.Object.extend({
    computedProperty: Ember.computed(function() {
    }).volatile(),

    staticProperty: 12
  });

  equal(typeof ClassWithNoMetadata.metaForProperty('computedProperty'), "object", "returns empty hash if no metadata has been saved");

  expectAssertion(function() {
    ClassWithNoMetadata.metaForProperty('nonexistentProperty');
  }, "metaForProperty() could not find a computed property with key 'nonexistentProperty'.");

  expectAssertion(function() {
    ClassWithNoMetadata.metaForProperty('staticProperty');
  }, "metaForProperty() could not find a computed property with key 'staticProperty'.");
});

testBoth("can iterate over a list of computed properties for a class", function(get, set) {
  var MyClass = Ember.Object.extend({
    foo: Ember.computed(function() {

    }),

    fooDidChange: Ember.observer('foo', function() {

    }),

    bar: Ember.computed(function() {

    })
  });

  var SubClass = MyClass.extend({
    baz: Ember.computed(function() {

    })
  });

  SubClass.reopen({
    bat: Ember.computed(function() {

    }).meta({ iAmBat: true })
  });

  var list = [];

  MyClass.eachComputedProperty(function(name) {
    list.push(name);
  });

  deepEqual(list.sort(), ['bar', 'foo'], "watched and unwatched computed properties are iterated");

  list = [];

  SubClass.eachComputedProperty(function(name, meta) {
    list.push(name);

    if (name === 'bat') {
      deepEqual(meta, { iAmBat: true });
    } else {
      deepEqual(meta, {});
    }
  });

  deepEqual(list.sort(), ['bar', 'bat', 'baz', 'foo'], "all inherited properties are included");
});

})();

(function() {
/*globals TestObject:true */

module('Ember.Object.create');

test("simple properties are set", function() {
  var o = Ember.Object.create({ohai: 'there'});
  equal(o.get('ohai'), 'there');
});

test("calls computed property setters", function() {
  var MyClass = Ember.Object.extend({
    foo: Ember.computed(function(key, val) {
      if (arguments.length === 2) { return val; }
      return "this is not the value you're looking for";
    })
  });

  var o = MyClass.create({foo: 'bar'});
  equal(o.get('foo'), 'bar');
});

test("sets up mandatory setters for watched simple properties", function() {
  var MyClass = Ember.Object.extend({
    foo: null,
    bar: null,
    fooDidChange: Ember.observer('foo', function() {})
  });

  var o = MyClass.create({foo: 'bar', bar: 'baz'});
  equal(o.get('foo'), 'bar');

  // Catch IE8 where Object.getOwnPropertyDescriptor exists but only works on DOM elements
  try {
    Object.getOwnPropertyDescriptor({}, 'foo');
  } catch(e) {
    return;
  }

  var descriptor = Object.getOwnPropertyDescriptor(o, 'foo');
  ok(descriptor.set, 'Mandatory setter was setup');

  descriptor = Object.getOwnPropertyDescriptor(o, 'bar');
  ok(!descriptor.set, 'Mandatory setter was not setup');
});

test("allows bindings to be defined", function() {
  var obj = Ember.Object.create({
    foo: 'foo',
    barBinding: 'foo'
  });

  equal(obj.get('bar'), 'foo', 'The binding value is correct');
});

test("calls setUnknownProperty if defined", function() {
  var setUnknownPropertyCalled = false;

  var MyClass = Ember.Object.extend({
    setUnknownProperty: function(key, value) {
      setUnknownPropertyCalled = true;
    }
  });

  var o = MyClass.create({foo: 'bar'});
  ok(setUnknownPropertyCalled, 'setUnknownProperty was called');
});

test("throws if you try to define a computed property", function() {
  expectAssertion(function() {
    Ember.Object.create({
      foo: Ember.computed(function() {})
    });
  }, 'Ember.Object.create no longer supports defining computed properties.');
});

test("throws if you try to call _super in a method", function() {
  expectAssertion(function() {
     Ember.Object.create({
      foo: function() {
        this._super();
      }
    });
  }, 'Ember.Object.create no longer supports defining methods that call _super.');
});

test("throws if you try to 'mixin' a definition", function() {
  var myMixin = Ember.Mixin.create({
    adder: function(arg1, arg2) {
      return arg1 + arg2;
    }
  });

  expectAssertion(function() {
    var o = Ember.Object.create(myMixin);
  }, "Ember.Object.create no longer supports mixing in other definitions, use createWithMixins instead.");
});

// This test is for IE8.
test("property name is the same as own prototype property", function() {
  var MyClass = Ember.Object.extend({
    toString: function() { return 'MyClass'; }
  });

  equal(MyClass.create().toString(), 'MyClass', "should inherit property from the arguments of `Ember.Object.create`");
});

test("inherits properties from passed in Ember.Object", function() {
  var baseObj = Ember.Object.create({ foo: 'bar' }),
      secondaryObj = Ember.Object.create(baseObj);

  equal(secondaryObj.foo, baseObj.foo, "Em.O.create inherits properties from Ember.Object parameter");
});

test("throws if you try to pass anything a string as a parameter", function(){
  var expected = "Ember.Object.create only accepts an objects.";

  throws(function() {
    var o = Ember.Object.create("some-string");
  }, expected);
});

test("Ember.Object.create can take undefined as a parameter", function(){
  var o = Ember.Object.create(undefined);
  deepEqual(Ember.Object.create(), o);
});

test("Ember.Object.create can take null as a parameter", function(){
  var o = Ember.Object.create(null);
  deepEqual(Ember.Object.create(), o);
});

module('Ember.Object.createWithMixins');

test("Creates a new object that contains passed properties", function() {

  var called = false;
  var obj = Ember.Object.createWithMixins({
    prop: 'FOO',
    method: function() { called=true; }
  });

  equal(Ember.get(obj, 'prop'), 'FOO', 'obj.prop');
  obj.method();
  ok(called, 'method executed');
});

// ..........................................................
// WORKING WITH MIXINS
//

test("Creates a new object that includes mixins and properties", function() {

  var MixinA = Ember.Mixin.create({ mixinA: 'A' });
  var obj = Ember.Object.createWithMixins(MixinA, { prop: 'FOO' });

  equal(Ember.get(obj, 'mixinA'), 'A', 'obj.mixinA');
  equal(Ember.get(obj, 'prop'), 'FOO', 'obj.prop');
});

// ..........................................................
// LIFECYCLE
//

test("Configures _super() on methods with override", function() {
  var completed = false;
  var MixinA = Ember.Mixin.create({ method: function() {} });
  var obj = Ember.Object.createWithMixins(MixinA, {
    method: function() {
      this._super();
      completed = true;
    }
  });

  obj.method();
  ok(completed, 'should have run method without error');
});

test("Calls init if defined", function() {
  var completed = false;
  var obj = Ember.Object.createWithMixins({
    init: function() {
      this._super();
      completed = true;
    }
  });

  ok(completed, 'should have run init without error');
});

test("Calls all mixin inits if defined", function() {
  var completed = 0;
  var Mixin1 = Ember.Mixin.create({
    init: function() { this._super(); completed++; }
  });

  var Mixin2 = Ember.Mixin.create({
    init: function() { this._super(); completed++; }
  });

  Ember.Object.createWithMixins(Mixin1, Mixin2);
  equal(completed, 2, 'should have called init for both mixins.');
});

test("Triggers init", function() {
  var completed = false;
  var obj = Ember.Object.createWithMixins({
    markAsCompleted: Ember.on("init", function(){
      completed = true;
    })
  });

  ok(completed, 'should have triggered init which should have run markAsCompleted');
});

test('creating an object with required properties', function() {
  var ClassA = Ember.Object.extend({
    foo: Ember.required()
  });

  var obj = ClassA.createWithMixins({ foo: 'FOO' }); // should not throw
  equal(Ember.get(obj,'foo'), 'FOO');
});


// ..........................................................
// BUGS
//

test('create should not break observed values', function() {

  var CountObject = Ember.Object.extend({
    value: null,

    _count: 0,

    reset: function() {
      this._count = 0;
      return this;
    },

    valueDidChange: Ember.observer('value', function() {
      this._count++;
    })
  });

  var obj = CountObject.createWithMixins({ value: 'foo' });
  equal(obj._count, 0, 'should not fire yet');

  Ember.set(obj, 'value', 'BAR');
  equal(obj._count, 1, 'should fire');
});

test('bindings on a class should only sync on instances', function() {
  TestObject = Ember.Object.createWithMixins({
    foo: 'FOO'
  });

  var Class, inst;

  Ember.run(function() {
    Class = Ember.Object.extend({
      fooBinding: 'TestObject.foo'
    });

    inst = Class.createWithMixins();
  });

  equal(Ember.get(Class.prototype, 'foo'), undefined, 'should not sync binding');
  equal(Ember.get(inst, 'foo'), 'FOO', 'should sync binding');

});


test('inherited bindings should only sync on instances', function() {
  TestObject = Ember.Object.createWithMixins({
    foo: 'FOO'
  });

  var Class, Subclass, inst;

  Ember.run(function() {
    Class = Ember.Object.extend({
      fooBinding: 'TestObject.foo'
    });
  });

  Ember.run(function() {
    Subclass = Class.extend();
    inst = Subclass.createWithMixins();
  });

  equal(Ember.get(Class.prototype, 'foo'), undefined, 'should not sync binding on Class');
  equal(Ember.get(Subclass.prototype, 'foo'), undefined, 'should not sync binding on Subclass');
  equal(Ember.get(inst, 'foo'), 'FOO', 'should sync binding on inst');

  Ember.run(function() {
    Ember.set(TestObject, 'foo', 'BAR');
  });

  equal(Ember.get(Class.prototype, 'foo'), undefined, 'should not sync binding on Class');
  equal(Ember.get(Subclass.prototype, 'foo'), undefined, 'should not sync binding on Subclass');
  equal(Ember.get(inst, 'foo'), 'BAR', 'should sync binding on inst');

});

test("created objects should not share a guid with their superclass", function() {
  ok(Ember.guidFor(Ember.Object), "Ember.Object has a guid");

  var objA = Ember.Object.createWithMixins(),
      objB = Ember.Object.createWithMixins();

  ok(Ember.guidFor(objA) !== Ember.guidFor(objB), "two instances do not share a guid");
});

})();

(function() {
/*globals raises */

module('ember-runtime/system/object/destroy_test');

testBoth("should schedule objects to be destroyed at the end of the run loop", function(get, set) {
  var obj = Ember.Object.create(), meta;

  Ember.run(function() {
    obj.destroy();
    meta = obj[Ember.META_KEY];
    ok(meta, "meta is not destroyed immediately");
    ok(get(obj, 'isDestroying'), "object is marked as destroying immediately");
    ok(!get(obj, 'isDestroyed'), "object is not destroyed immediately");
  });

  meta = obj[Ember.META_KEY];
  ok(!meta, "meta is destroyed after run loop finishes");
  ok(get(obj, 'isDestroyed'), "object is destroyed after run loop finishes");
});

test("should raise an exception when modifying watched properties on a destroyed object", function() {
  if (Ember.platform.hasAccessors) {
    var obj = Ember.Object.createWithMixins({
      foo: "bar",
      fooDidChange: Ember.observer('foo', function() { })
    });

    Ember.run(function() {
      obj.destroy();
    });

    raises(function() {
      Ember.set(obj, 'foo', 'baz');
    }, Error, "raises an exception");
  } else {
    expect(0);
  }
});

test("observers should not fire after an object has been destroyed", function() {
  var count = 0;
  var obj = Ember.Object.createWithMixins({
    fooDidChange: Ember.observer('foo', function() {
      count++;
    })
  });

  obj.set('foo', 'bar');

  equal(count, 1, "observer was fired once");

  Ember.run(function() {
    Ember.beginPropertyChanges();
    obj.set('foo', 'quux');
    obj.destroy();
    Ember.endPropertyChanges();
  });

  equal(count, 1, "observer was not called after object was destroyed");
});

test("destroyed objects should not see each others changes during teardown but a long lived object should", function () {
  var shouldChange = 0, shouldNotChange = 0;

  var objs = {};

  var A = Ember.Object.extend({
    objs: objs,
    isAlive: true,
    willDestroy: function () {
      this.set('isAlive', false);
    },
    bDidChange: Ember.observer('objs.b.isAlive', function () {
      shouldNotChange++;
    }),
    cDidChange: Ember.observer('objs.c.isAlive', function () {
      shouldNotChange++;
    })
  });

  var B = Ember.Object.extend({
    objs: objs,
    isAlive: true,
    willDestroy: function () {
      this.set('isAlive', false);
    },
    aDidChange: Ember.observer('objs.a.isAlive', function () {
      shouldNotChange++;
    }),
    cDidChange: Ember.observer('objs.c.isAlive', function () {
      shouldNotChange++;
    })
  });

  var C = Ember.Object.extend({
    objs: objs,
    isAlive: true,
    willDestroy: function () {
      this.set('isAlive', false);
    },
    aDidChange: Ember.observer('objs.a.isAlive', function () {
      shouldNotChange++;
    }),
    bDidChange: Ember.observer('objs.b.isAlive', function () {
      shouldNotChange++;
    })
  });

  var LongLivedObject =  Ember.Object.extend({
    objs: objs,
    isAliveDidChange: Ember.observer('objs.a.isAlive', function () {
      shouldChange++;
    })
  });

  objs.a = new A();

  objs.b = new B();

  objs.c = new C();

  var longLivedObject = new LongLivedObject();

  Ember.run(function () {
    var keys = Ember.keys(objs);
    for (var i = 0, l = keys.length; i < l; i++) {
      objs[keys[i]].destroy();
    }
  });

  equal(shouldNotChange, 0, 'destroyed graph objs should not see change in willDestroy');
  equal(shouldChange, 1, 'long lived should see change in willDestroy');
});

test("bindings should be synced when are updated in the willDestroy hook", function() {
  var bar = Ember.Object.create({
    value: false,
    willDestroy: function() {
      this.set('value', true);
    }
  });

  var foo = Ember.Object.create({
    value: null,
    bar: bar
  });

  Ember.run(function() {
    Ember.bind(foo, 'value', 'bar.value');
  });

  ok(bar.get('value') === false, 'the initial value has been bound');

  Ember.run(function() {
    bar.destroy();
  });

  ok(foo.get('value'), 'foo is synced when the binding is updated in the willDestroy hook');
});

})();

(function() {
module('system/object/detectInstance');

test('detectInstance detects instances correctly', function() {

  var A = Ember.Object.extend();
  var B = A.extend();
  var C = A.extend();

  var o = Ember.Object.create(),
      a = A.create(),
      b = B.create(),
      c = C.create();

  ok( Ember.Object.detectInstance(o), 'o is an instance of Ember.Object' );
  ok( Ember.Object.detectInstance(a), 'a is an instance of Ember.Object' );
  ok( Ember.Object.detectInstance(b), 'b is an instance of Ember.Object' );
  ok( Ember.Object.detectInstance(c), 'c is an instance of Ember.Object' );

  ok( !A.detectInstance(o), 'o is not an instance of A');
  ok( A.detectInstance(a), 'a is an instance of A' );
  ok( A.detectInstance(b), 'b is an instance of A' );
  ok( A.detectInstance(c), 'c is an instance of A' );

  ok( !B.detectInstance(o), 'o is not an instance of B' );
  ok( !B.detectInstance(a), 'a is not an instance of B' );
  ok( B.detectInstance(b), 'b is an instance of B' );
  ok( !B.detectInstance(c), 'c is not an instance of B' );

  ok( !C.detectInstance(o), 'o is not an instance of C' );
  ok( !C.detectInstance(a), 'a is not an instance of C' );
  ok( !C.detectInstance(b), 'b is not an instance of C' );
  ok( C.detectInstance(c), 'c is an instance of C' );

});
})();

(function() {
module('system/object/detect');

test('detect detects classes correctly', function() {

  var A = Ember.Object.extend();
  var B = A.extend();
  var C = A.extend();

  ok( Ember.Object.detect(Ember.Object), 'Ember.Object is an Ember.Object class' );
  ok( Ember.Object.detect(A), 'A is an Ember.Object class' );
  ok( Ember.Object.detect(B), 'B is an Ember.Object class' );
  ok( Ember.Object.detect(C), 'C is an Ember.Object class' );

  ok( !A.detect(Ember.Object), 'Ember.Object is not an A class' );
  ok( A.detect(A), 'A is an A class' );
  ok( A.detect(B), 'B is an A class' );
  ok( A.detect(C), 'C is an A class' );

  ok( !B.detect(Ember.Object), 'Ember.Object is not a B class' );
  ok( !B.detect(A), 'A is not a B class' );
  ok( B.detect(B), 'B is a B class' );
  ok( !B.detect(C), 'C is not a B class' );

  ok( !C.detect(Ember.Object), 'Ember.Object is not a C class' );
  ok( !C.detect(A), 'A is not a C class' );
  ok( !C.detect(B), 'B is not a C class' );
  ok( C.detect(C), 'C is a C class' );

});
})();

(function() {
module("Object events");

test("a listener can be added to an object", function() {
  var count = 0;
  var F = function() { count++; };

  var obj = Ember.Object.createWithMixins(Ember.Evented);

  obj.on('event!', F);
  obj.trigger('event!');

  equal(count, 1, "the event was triggered");

  obj.trigger('event!');

  equal(count, 2, "the event was triggered");
});

test("a listener can be added and removed automatically the first time it is triggered", function() {
  var count = 0;
  var F = function() { count++; };

  var obj = Ember.Object.createWithMixins(Ember.Evented);

  obj.one('event!', F);
  obj.trigger('event!');

  equal(count, 1, "the event was triggered");

  obj.trigger('event!');

  equal(count, 1, "the event was not triggered again");
});

test("triggering an event can have arguments", function() {
  var self, args;

  var obj = Ember.Object.createWithMixins(Ember.Evented);

  obj.on('event!', function() {
    args = [].slice.call(arguments);
    self = this;
  });

  obj.trigger('event!', "foo", "bar");

  deepEqual(args, [ "foo", "bar" ]);
  equal(self, obj);
});

test("a listener can be added and removed automatically and have arguments", function() {
  var self, args, count = 0;

  var obj = Ember.Object.createWithMixins(Ember.Evented);

  obj.one('event!', function() {
    args = [].slice.call(arguments);
    self = this;
    count++;
  });

  obj.trigger('event!', "foo", "bar");

  deepEqual(args, [ "foo", "bar" ]);
  equal(self, obj);
  equal(count, 1, "the event is triggered once");

  obj.trigger('event!', "baz", "bat");

  deepEqual(args, [ "foo", "bar" ]);
  equal(count, 1, "the event was not triggered again");
  equal(self, obj);
});

test("binding an event can specify a different target", function() {
  var self, args;

  var obj = Ember.Object.createWithMixins(Ember.Evented);
  var target = {};

  obj.on('event!', target, function() {
    args = [].slice.call(arguments);
    self = this;
  });

  obj.trigger('event!', "foo", "bar");

  deepEqual(args, [ "foo", "bar" ]);
  equal(self, target);
});

test("a listener registered with one can take method as string and can be added with different target", function() {
  var count = 0;
  var target = {};
  target.fn = function() { count++; };

  var obj = Ember.Object.createWithMixins(Ember.Evented);

  obj.one('event!', target, 'fn');
  obj.trigger('event!');

  equal(count, 1, "the event was triggered");

  obj.trigger('event!');

  equal(count, 1, "the event was not triggered again");
});

test("a listener registered with one can be removed with off", function() {
  var obj = Ember.Object.createWithMixins(Ember.Evented, {
    F: function() {}
  });
  var F = function() {};

  obj.one('event!', F);
  obj.one('event!', obj, 'F');

  equal(obj.has('event!'), true, 'has events');

  obj.off('event!', F);
  obj.off('event!', obj, 'F');

  equal(obj.has('event!'), false, 'has no more events');
});

test("adding and removing listeners should be chainable", function() {
  var obj = Ember.Object.createWithMixins(Ember.Evented);
  var F = function() {};

  var ret = obj.on('event!', F);
  equal(ret, obj, '#on returns self');

  ret = obj.off('event!', F);
  equal(ret, obj, '#off returns self');

  ret = obj.one('event!', F);
  equal(ret, obj, '#one returns self');
});
})();

(function() {
var get = Ember.get;

module('Ember.Object.extend');

test('Basic extend', function() {
  var SomeClass = Ember.Object.extend({ foo: 'BAR' });
  ok(SomeClass.isClass, "A class has isClass of true");
  var obj = new SomeClass();
  equal(obj.foo, 'BAR');
});

test('Sub-subclass', function() {
  var SomeClass = Ember.Object.extend({ foo: 'BAR' });
  var AnotherClass = SomeClass.extend({ bar: 'FOO' });
  var obj = new AnotherClass();
  equal(obj.foo, 'BAR');
  equal(obj.bar, 'FOO');
});

test('Overriding a method several layers deep', function() {
  var SomeClass = Ember.Object.extend({
    fooCnt: 0,
    foo: function() { this.fooCnt++; },

    barCnt: 0,
    bar: function() { this.barCnt++; }
  });

  var AnotherClass = SomeClass.extend({
    barCnt: 0,
    bar: function() { this.barCnt++; this._super(); }
  });

  var FinalClass = AnotherClass.extend({
    fooCnt: 0,
    foo: function() { this.fooCnt++; this._super(); }
  });

  var obj = new FinalClass();
  obj.foo();
  obj.bar();
  equal(obj.fooCnt, 2, 'should invoke both');
  equal(obj.barCnt, 2, 'should invoke both');

  // Try overriding on create also
  obj = FinalClass.createWithMixins({
    foo: function() { this.fooCnt++; this._super(); }
  });

  obj.foo();
  obj.bar();
  equal(obj.fooCnt, 3, 'should invoke final as well');
  equal(obj.barCnt, 2, 'should invoke both');
});

test('With concatenatedProperties', function(){
  var SomeClass = Ember.Object.extend({ things: 'foo', concatenatedProperties: ['things'] });
  var AnotherClass = SomeClass.extend({ things: 'bar' });
  var YetAnotherClass = SomeClass.extend({ things: 'baz' });
  var some = new SomeClass();
  var another = new AnotherClass();
  var yetAnother = new YetAnotherClass();
  deepEqual(some.get('things'), ['foo'], 'base class should have just its value');
  deepEqual(another.get('things'), ['foo', 'bar'], "subclass should have base class' and it's own");
  deepEqual(yetAnother.get('things'), ['foo', 'baz'], "subclass should have base class' and it's own");
});

test('With concatenatedProperties class properties', function(){
  var SomeClass = Ember.Object.extend();
  SomeClass.reopenClass({
    concatenatedProperties: ['things'],
    things: 'foo'
  });
  var AnotherClass = SomeClass.extend();
  AnotherClass.reopenClass({ things: 'bar' });
  var YetAnotherClass = SomeClass.extend();
  YetAnotherClass.reopenClass({ things: 'baz' });
  var some = new SomeClass();
  var another = new AnotherClass();
  var yetAnother = new YetAnotherClass();
  deepEqual(get(some.constructor, 'things'), ['foo'], 'base class should have just its value');
  deepEqual(get(another.constructor, 'things'), ['foo', 'bar'], "subclass should have base class' and it's own");
  deepEqual(get(yetAnother.constructor, 'things'), ['foo', 'baz'], "subclass should have base class' and it's own");
});


})();

(function() {
/*globals testBoth */

require('ember-runtime/~tests/props_helper');

module('Ember.Object observer');

testBoth('observer on class', function(get, set) {

  var MyClass = Ember.Object.extend({

    count: 0,

    foo: Ember.observer('bar', function() {
      set(this, 'count', get(this, 'count')+1);
    })

  });

  var obj = new MyClass();
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', "BAZ");
  equal(get(obj, 'count'), 1, 'should invoke observer after change');

});

testBoth('observer on subclass', function(get, set) {

  var MyClass = Ember.Object.extend({

    count: 0,

    foo: Ember.observer('bar', function() {
      set(this, 'count', get(this, 'count')+1);
    })

  });

  var Subclass = MyClass.extend({
    foo: Ember.observer('baz', function() {
      set(this, 'count', get(this, 'count')+1);
    })
  });

  var obj = new Subclass();
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', "BAZ");
  equal(get(obj, 'count'), 0, 'should not invoke observer after change');

  set(obj, 'baz', "BAZ");
  equal(get(obj, 'count'), 1, 'should invoke observer after change');

});

testBoth('observer on instance', function(get, set) {

  var obj = Ember.Object.createWithMixins({

    count: 0,

    foo: Ember.observer('bar', function() {
      set(this, 'count', get(this, 'count')+1);
    })

  });

  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', "BAZ");
  equal(get(obj, 'count'), 1, 'should invoke observer after change');

});

testBoth('observer on instance overridding class', function(get, set) {

  var MyClass = Ember.Object.extend({

    count: 0,

    foo: Ember.observer('bar', function() {
      set(this, 'count', get(this, 'count')+1);
    })

  });

  var obj = MyClass.createWithMixins({
    foo: Ember.observer('baz', function() { // <-- change property we observe
      set(this, 'count', get(this, 'count')+1);
    })
  });

  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', "BAZ");
  equal(get(obj, 'count'), 0, 'should not invoke observer after change');

  set(obj, 'baz', "BAZ");
  equal(get(obj, 'count'), 1, 'should invoke observer after change');

});

testBoth('observer should not fire after being destroyed', function(get, set) {

  var obj = Ember.Object.createWithMixins({
    count: 0,
    foo: Ember.observer('bar', function() {
      set(this, 'count', get(this, 'count')+1);
    })
  });

  equal(get(obj, 'count'), 0, 'precond - should not invoke observer immediately');

  Ember.run(function() { obj.destroy(); });

  if (Ember.assert) {
    expectAssertion(function() {
      set(obj, 'bar', "BAZ");
    }, "calling set on destroyed object");
  } else {
    set(obj, 'bar', "BAZ");
  }

  equal(get(obj, 'count'), 0, 'should not invoke observer after change');
});
// ..........................................................
// COMPLEX PROPERTIES
//


testBoth('chain observer on class', function(get, set) {

  var MyClass = Ember.Object.extend({
    count: 0,

    foo: Ember.observer('bar.baz', function() {
      set(this, 'count', get(this, 'count')+1);
    })
  });

  var obj1 = MyClass.create({
    bar: { baz: 'biff' }
  });

  var obj2 = MyClass.create({
    bar: { baz: 'biff2' }
  });

  equal(get(obj1, 'count'), 0, 'should not invoke yet');
  equal(get(obj2, 'count'), 0, 'should not invoke yet');

  set(get(obj1, 'bar'), 'baz', 'BIFF1');
  equal(get(obj1, 'count'), 1, 'should invoke observer on obj1');
  equal(get(obj2, 'count'), 0, 'should not invoke yet');

  set(get(obj2, 'bar'), 'baz', 'BIFF2');
  equal(get(obj1, 'count'), 1, 'should not invoke again');
  equal(get(obj2, 'count'), 1, 'should invoke observer on obj2');
});


testBoth('chain observer on class', function(get, set) {

  var MyClass = Ember.Object.extend({
    count: 0,

    foo: Ember.observer('bar.baz', function() {
      set(this, 'count', get(this, 'count')+1);
    })
  });

  var obj1 = MyClass.createWithMixins({
    bar: { baz: 'biff' }
  });

  var obj2 = MyClass.createWithMixins({
    bar: { baz: 'biff2' },
    bar2: { baz: 'biff3' },

    foo: Ember.observer('bar2.baz', function() {
      set(this, 'count', get(this, 'count')+1);
    })
  });

  equal(get(obj1, 'count'), 0, 'should not invoke yet');
  equal(get(obj2, 'count'), 0, 'should not invoke yet');

  set(get(obj1, 'bar'), 'baz', 'BIFF1');
  equal(get(obj1, 'count'), 1, 'should invoke observer on obj1');
  equal(get(obj2, 'count'), 0, 'should not invoke yet');

  set(get(obj2, 'bar'), 'baz', 'BIFF2');
  equal(get(obj1, 'count'), 1, 'should not invoke again');
  equal(get(obj2, 'count'), 0, 'should not invoke yet');

  set(get(obj2, 'bar2'), 'baz', 'BIFF3');
  equal(get(obj1, 'count'), 1, 'should not invoke again');
  equal(get(obj2, 'count'), 1, 'should invoke observer on obj2');
});

})();

(function() {
module('system/object/reopenClass');

test('adds new properties to subclass', function() {

  var Subclass = Ember.Object.extend();
  Subclass.reopenClass({
    foo: function() { return 'FOO'; },
    bar: 'BAR'
  });

  equal(Subclass.foo(), 'FOO', 'Adds method');
  equal(Ember.get(Subclass, 'bar'), 'BAR', 'Adds property');
});

test('class properties inherited by subclasses', function() {

  var Subclass = Ember.Object.extend();
  Subclass.reopenClass({
    foo: function() { return 'FOO'; },
    bar: 'BAR'
  });

  var SubSub = Subclass.extend();

  equal(SubSub.foo(), 'FOO', 'Adds method');
  equal(Ember.get(SubSub, 'bar'), 'BAR', 'Adds property');
});


})();

(function() {
module('system/core_object/reopen');

test('adds new properties to subclass instance', function() {

  var Subclass = Ember.Object.extend();
  Subclass.reopen({
    foo: function() { return 'FOO'; },
    bar: 'BAR'
  });

  equal( new Subclass().foo(), 'FOO', 'Adds method');
  equal(Ember.get(new Subclass(), 'bar'), 'BAR', 'Adds property');
});

test('reopened properties inherited by subclasses', function() {

  var Subclass = Ember.Object.extend();
  var SubSub = Subclass.extend();

  Subclass.reopen({
    foo: function() { return 'FOO'; },
    bar: 'BAR'
  });


  equal( new SubSub().foo(), 'FOO', 'Adds method');
  equal(Ember.get(new SubSub(), 'bar'), 'BAR', 'Adds property');
});

// We plan to allow this in the future
test('does not allow reopening already instantiated classes', function() {
  var Subclass = Ember.Object.extend();

  Subclass.create();

  Subclass.reopen({
    trololol: true
  });

  equal(Subclass.create().get('trololol'), true, "reopen works");
});

})();

(function() {
module('system/object/subclasses');

test('chains should copy forward to subclasses when prototype created', function () {
  var ObjectWithChains, objWithChains, SubWithChains, SubSub, subSub;
  Ember.run(function () {
    ObjectWithChains = Ember.Object.extend({
      obj: {
        a: 'a',
        hi: 'hi'
      },
      aBinding: 'obj.a' // add chain
    });
    // realize prototype
    objWithChains = ObjectWithChains.create();
    // should not copy chains from parent yet
    SubWithChains = ObjectWithChains.extend({
      hiBinding: 'obj.hi', // add chain
      hello: Ember.computed(function() {
        return this.get('obj.hi') + ' world';
      }).property('hi'), // observe chain
      greetingBinding: 'hello'
    });
    SubSub = SubWithChains.extend();
    // should realize prototypes and copy forward chains
    subSub = SubSub.create();
  });
  equal(subSub.get('greeting'), 'hi world');
  Ember.run(function () {
    objWithChains.set('obj.hi', 'hello');
  });
  equal(subSub.get('greeting'), 'hello world');
});

})();

(function() {
var guidFor = Ember.guidFor, originalLookup = Ember.lookup, lookup;

module('system/object/toString', {
  setup: function() {
    lookup = Ember.lookup = {};
  },
  teardown: function() {
    Ember.lookup = originalLookup;
  }
});

test("toString() returns the same value if called twice", function() {
  var Foo = Ember.Namespace.create();
  Foo.toString = function() { return "Foo"; };

  Foo.Bar = Ember.Object.extend();

  equal(Foo.Bar.toString(), "Foo.Bar");
  equal(Foo.Bar.toString(), "Foo.Bar");

  var obj = Foo.Bar.create();

  equal(obj.toString(), "<Foo.Bar:" + guidFor(obj) + ">");
  equal(obj.toString(), "<Foo.Bar:" + guidFor(obj) + ">");

  equal(Foo.Bar.toString(), "Foo.Bar");
});

test("toString on a class returns a useful value when nested in a namespace", function() {
  var obj;

  var Foo = Ember.Namespace.create();
  Foo.toString = function() { return "Foo"; };

  Foo.Bar = Ember.Object.extend();
  equal(Foo.Bar.toString(), "Foo.Bar");

  obj = Foo.Bar.create();
  equal(obj.toString(), "<Foo.Bar:" + guidFor(obj) + ">");

  Foo.Baz = Foo.Bar.extend();
  equal(Foo.Baz.toString(), "Foo.Baz");

  obj = Foo.Baz.create();
  equal(obj.toString(), "<Foo.Baz:" + guidFor(obj) + ">");

  obj = Foo.Bar.create();
  equal(obj.toString(), "<Foo.Bar:" + guidFor(obj) + ">");
});

test("toString on a namespace finds the namespace in Ember.lookup", function() {
  var Foo = lookup.Foo = Ember.Namespace.create();

  equal(Foo.toString(), "Foo");
});

test("toString on a namespace finds the namespace in Ember.lookup", function() {
  var Foo = lookup.Foo = Ember.Namespace.create(), obj;

  Foo.Bar = Ember.Object.extend();

  equal(Foo.Bar.toString(), "Foo.Bar");

  obj = Foo.Bar.create();
  equal(obj.toString(), "<Foo.Bar:" + guidFor(obj) + ">");
});

test('toString includes toStringExtension if defined', function() {
  var Foo = Ember.Object.extend({
        toStringExtension: function() {
          return "fooey";
        }
      }),
      foo = Foo.create(),
      Bar = Ember.Object.extend({}),
      bar = Bar.create();
    // simulate these classes being defined on a Namespace
    Foo[Ember.GUID_KEY+'_name'] = 'Foo';
    Bar[Ember.GUID_KEY+'_name'] = 'Bar';

  equal(bar.toString(), '<Bar:'+Ember.guidFor(bar)+'>', 'does not include toStringExtension part');
  equal(foo.toString(), '<Foo:'+Ember.guidFor(foo)+':fooey>', 'Includes toStringExtension result');
});

})();

(function() {
module("Ember.ObjectProxy");

testBoth("should not proxy properties passed to create", function (get, set) {
  var Proxy = Ember.ObjectProxy.extend({
    cp: Ember.computed(function (key, value) {
      if (value) {
        this._cp = value;
      }
      return this._cp;
    })
  });
  var proxy = Proxy.create({
    prop: 'Foo',
    cp: 'Bar'
  });

  equal(get(proxy, 'prop'), 'Foo', 'should not have tried to proxy set');
  equal(proxy._cp, 'Bar', 'should use CP setter');
});

testBoth("should proxy properties to content", function(get, set) {
  var content = {
        firstName: 'Tom',
        lastName: 'Dale',
        unknownProperty: function (key) { return key + ' unknown';}
      },
      proxy = Ember.ObjectProxy.create();

  equal(get(proxy, 'firstName'), undefined, 'get on proxy without content should return undefined');
  expectAssertion(function () {
    set(proxy, 'firstName', 'Foo');
  }, /Cannot delegate set\('firstName', Foo\) to the 'content'/i);

  set(proxy, 'content', content);

  equal(get(proxy, 'firstName'), 'Tom', 'get on proxy with content should forward to content');
  equal(get(proxy, 'lastName'), 'Dale', 'get on proxy with content should forward to content');
  equal(get(proxy, 'foo'), 'foo unknown', 'get on proxy with content should forward to content');

  set(proxy, 'lastName', 'Huda');

  equal(get(content, 'lastName'), 'Huda', 'content should have new value from set on proxy');
  equal(get(proxy, 'lastName'), 'Huda', 'proxy should have new value from set on proxy');

  set(proxy, 'content', {firstName: 'Yehuda', lastName: 'Katz'});

  equal(get(proxy, 'firstName'), 'Yehuda', 'proxy should reflect updated content');
  equal(get(proxy, 'lastName'), 'Katz', 'proxy should reflect updated content');
});

testBoth("should work with watched properties", function(get, set) {
  var content1 = {firstName: 'Tom', lastName: 'Dale'},
    content2 = {firstName: 'Yehuda', lastName: 'Katz'},
    Proxy,
    proxy,
    count = 0,
    last;

  Proxy = Ember.ObjectProxy.extend({
    fullName: Ember.computed(function () {
      var firstName = this.get('firstName'),
          lastName = this.get('lastName');
      if (firstName && lastName) {
        return firstName + ' ' + lastName;
      }
      return firstName || lastName;
    }).property('firstName', 'lastName')
  });

  proxy = Proxy.create();

  Ember.addObserver(proxy, 'fullName', function () {
    last = get(proxy, 'fullName');
    count++;
  });

  // proxy without content returns undefined
  equal(get(proxy, 'fullName'), undefined);

  // setting content causes all watched properties to change
  set(proxy, 'content', content1);
  // both dependent keys changed
  equal(count, 2);
  equal(last, 'Tom Dale');

  // setting property in content causes proxy property to change
  set(content1, 'lastName', 'Huda');
  equal(count, 3);
  equal(last, 'Tom Huda');

  // replacing content causes all watched properties to change
  set(proxy, 'content', content2);
  // both dependent keys changed
  equal(count, 5);
  equal(last, 'Yehuda Katz');
  // content1 is no longer watched
  ok(!Ember.isWatching(content1, 'firstName'), 'not watching firstName');
  ok(!Ember.isWatching(content1, 'lastName'), 'not watching lastName');

  // setting property in new content
  set(content2, 'firstName', 'Tomhuda');
  equal(last, 'Tomhuda Katz');
  equal(count, 6);

  // setting property in proxy syncs with new content
  set(proxy, 'lastName', 'Katzdale');
  equal(count, 7);
  equal(last, 'Tomhuda Katzdale');
  equal(get(content2, 'firstName'), 'Tomhuda');
  equal(get(content2, 'lastName'), 'Katzdale');
});

test("set and get should work with paths", function () {
  var content = {foo: {bar: 'baz'}},
      proxy = Ember.ObjectProxy.create({content: content}),
      count = 0;
  proxy.set('foo.bar', 'hello');
  equal(proxy.get('foo.bar'), 'hello');
  equal(proxy.get('content.foo.bar'), 'hello');

  proxy.addObserver('foo.bar', function () {
    count++;
  });

  proxy.set('foo.bar', 'bye');

  equal(count, 1);
  equal(proxy.get('foo.bar'), 'bye');
  equal(proxy.get('content.foo.bar'), 'bye');
});

testBoth("should transition between watched and unwatched strategies", function(get, set) {
  var content = {foo: 'foo'},
      proxy = Ember.ObjectProxy.create({content: content}),
      count = 0;

  function observer() {
    count++;
  }

  equal(get(proxy, 'foo'), 'foo');

  set(content, 'foo', 'bar');

  equal(get(proxy, 'foo'), 'bar');

  set(proxy, 'foo', 'foo');

  equal(get(content, 'foo'), 'foo');
  equal(get(proxy, 'foo'), 'foo');

  Ember.addObserver(proxy, 'foo', observer);

  equal(count, 0);
  equal(get(proxy, 'foo'), 'foo');

  set(content, 'foo', 'bar');

  equal(count, 1);
  equal(get(proxy, 'foo'), 'bar');

  set(proxy, 'foo', 'foo');

  equal(count, 2);
  equal(get(content, 'foo'), 'foo');
  equal(get(proxy, 'foo'), 'foo');

  Ember.removeObserver(proxy, 'foo', observer);

  set(content, 'foo', 'bar');

  equal(get(proxy, 'foo'), 'bar');

  set(proxy, 'foo', 'foo');

  equal(get(content, 'foo'), 'foo');
  equal(get(proxy, 'foo'), 'foo');
});

})();

(function() {
// ..........................................................
// COPYABLE TESTS
//
Ember.CopyableTests.extend({
  name: 'Ember.Set Copyable',

  newObject: function() {
    var set = new Ember.Set();
    set.addObject(Ember.generateGuid());
    return set;
  },

  isEqual: function(a,b) {
    if (!(a instanceof Ember.Set)) return false;
    if (!(b instanceof Ember.Set)) return false;
    return Ember.get(a, 'firstObject') === Ember.get(b, 'firstObject');
  },

  shouldBeFreezable: true
}).run();



})();

(function() {
// ..........................................................
// MUTABLE ENUMERABLE TESTS
//
Ember.MutableEnumerableTests.extend({

  name: 'Ember.Set',

  newObject: function(ary) {
    ary = ary ? ary.slice() : this.newFixture(3);
    var ret = new Ember.Set();
    ret.addObjects(ary);
    return ret;
  },

  mutate: function(obj) {
    obj.addObject(Ember.get(obj, 'length')+1);
  },

  toArray: function(obj) {
    return obj.toArray ? obj.toArray() : obj.slice(); // make a copy.
  }

}).run();

})();

(function() {
// ..........................................................
// Ember.Set.init
//

module('Ember.Set.init');

test('passing an array to new Ember.Set() should instantiate w/ items', function() {

  var get = Ember.get;
  var ary  = [1,2,3];
  var aSet = new Ember.Set(ary);
  var count = 0;

  equal(get(aSet, 'length'), 3, 'should have three items');
  aSet.forEach(function(x) {
    ok(Ember.EnumerableUtils.indexOf(ary, x)>=0, 'should find passed item in array');
    count++;
  });
  equal(count, 3, 'iterating should have returned three objects');
});


// ..........................................................
// Ember.Set.clear
//

module('Ember.Set.clear');

test('should clear a set of its content', function() {

  var get = Ember.get, set = Ember.set;
  var aSet = new Ember.Set([1,2,3]);
  var count = 0;

  equal(get(aSet, 'length'), 3, 'should have three items');
  ok(get(aSet, 'firstObject'), 'firstObject should return an object');
  ok(get(aSet, 'lastObject'), 'lastObject should return an object');
  Ember.addObserver(aSet, '[]', function() { count++; });

  aSet.clear();
  equal(get(aSet, 'length'), 0, 'should have 0 items');
  equal(count, 1, 'should have notified of content change');
  equal(get(aSet, 'firstObject'), null, 'firstObject should return nothing');
  equal(get(aSet, 'lastObject'), null, 'lastObject should return nothing');

  count = 0;
  aSet.forEach(function() { count++; });
  equal(count, 0, 'iterating over items should not invoke callback');

});

// ..........................................................
// Ember.Set.pop
//

module('Ember.Set.pop');

test('calling pop should return an object and remove it', function() {

  var aSet = new Ember.Set([1,2,3]);
  var count = 0, obj;
  while(count<10 && (obj = aSet.pop())) {
    equal(aSet.contains(obj), false, 'set should no longer contain object');
    count++;
    equal(Ember.get(aSet, 'length'), 3-count, 'length should be shorter');
  }

  equal(count, 3, 'should only pop 3 objects');
  equal(Ember.get(aSet, 'length'), 0, 'final length should be zero');
  equal(aSet.pop(), null, 'extra pops should do nothing');
});

// ..........................................................
// Ember.Set.aliases
//

module('Ember.Set aliases');

test('method aliases', function() {
  var aSet = new Ember.Set();
  equal(aSet.add, aSet.addObject, 'add -> addObject');
  equal(aSet.remove, aSet.removeObject, 'remove -> removeObject');
  equal(aSet.addEach, aSet.addObjects, 'addEach -> addObjects');
  equal(aSet.removeEach, aSet.removeObjects, 'removeEach -> removeObjects');

  equal(aSet.push, aSet.addObject, 'push -> addObject');
  equal(aSet.unshift, aSet.addObject, 'unshift -> addObject');
  equal(aSet.shift, aSet.pop, 'shift -> pop');
});



})();

(function() {
var oldString;

module('Ember.String.loc', {
  setup: function() {
    oldString = Ember.STRINGS;
    Ember.STRINGS = {
      '_Hello World': 'Bonjour le monde',
      '_Hello %@ %@': 'Bonjour %@ %@',
      '_Hello %@# %@#': 'Bonjour %@2 %@1'
    };
  },

  teardown: function() {
    Ember.STRINGS = oldString;
  }
});

if (!Ember.EXTEND_PROTOTYPES && !Ember.EXTEND_PROTOTYPES.String) {
  test("String.prototype.loc is not available without EXTEND_PROTOTYPES", function() {
    ok("undefined" === typeof String.prototype.loc, 'String.prototype helper disabled');
  });
}

test("'_Hello World'.loc() => 'Bonjour le monde'", function() {
  equal(Ember.String.loc('_Hello World'), 'Bonjour le monde');
  if (Ember.EXTEND_PROTOTYPES) {
    equal('_Hello World'.loc(), 'Bonjour le monde');
  }
});

test("'_Hello %@ %@'.loc('John', 'Doe') => 'Bonjour John Doe'", function() {
  equal(Ember.String.loc('_Hello %@ %@', ['John', 'Doe']), 'Bonjour John Doe');
  if (Ember.EXTEND_PROTOTYPES) {
    equal('_Hello %@ %@'.loc('John', 'Doe'), 'Bonjour John Doe');
  }
});

test("'_Hello %@# %@#'.loc('John', 'Doe') => 'Bonjour Doe John'", function() {
  equal(Ember.String.loc('_Hello %@# %@#', ['John', 'Doe']), 'Bonjour Doe John');
  if (Ember.EXTEND_PROTOTYPES) {
    equal('_Hello %@# %@#'.loc('John', 'Doe'), 'Bonjour Doe John');
  }
});

test("'_Not In Strings'.loc() => '_Not In Strings'", function() {
  equal(Ember.String.loc('_Not In Strings'), '_Not In Strings');
  if (Ember.EXTEND_PROTOTYPES) {
    equal('_Not In Strings'.loc(), '_Not In Strings');
  }
});



})();

(function() {
module('Ember.String.w');

if (!Ember.EXTEND_PROTOTYPES && !Ember.EXTEND_PROTOTYPES.String) {
  test("String.prototype.w is not available without EXTEND_PROTOTYPES", function() {
    ok("undefined" === typeof String.prototype.w, 'String.prototype helper disabled');
  });
}

test("'one two three'.w() => ['one','two','three']", function() {
  deepEqual(Ember.String.w('one two three'), ['one','two','three']);
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('one two three'.w(), ['one','two','three']);
  }
});

test("'one    two    three'.w() with extra spaces between words => ['one','two','three']", function() {
  deepEqual(Ember.String.w('one   two  three'), ['one','two','three']);
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('one   two  three'.w(), ['one','two','three']);
  }
});

test("'one two three'.w() with tabs", function() {
  deepEqual(Ember.String.w('one\ttwo  three'), ['one','two','three']);
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('one\ttwo  three'.w(), ['one','two','three']);
  }
});



})();

(function() {
var forEach = Ember.EnumerableUtils.forEach, subarray;

module('Ember.SubArray', {
  setup: function () {
    subarray = new Ember.SubArray();
  }
});

function operationsString() {
  var str = "";
  forEach(subarray._operations, function (operation) {
    str += " " + operation.type + ":" + operation.count;
  });
  return str.substring(1);
}

test("Subarray operations are initially retain:n", function() {
  subarray = new Ember.SubArray(10);

  equal(operationsString(), "r:10", "subarray operations are initially retain n");
});

test("Retains compose with retains on insert", function() {
  subarray.addItem(0, true);
  subarray.addItem(1, true);
  subarray.addItem(2, true);

  equal(operationsString(), "r:3", "Retains compose with retains on insert.");
});

test("Retains compose with retains on removal", function() {
  subarray.addItem(0, true);
  subarray.addItem(1, false);
  subarray.addItem(2, true);

  equal(operationsString(), "r:1 f:1 r:1", "precond - operations are initially correct.");

  subarray.removeItem(1);

  equal(operationsString(), "r:2", "Retains compose with retains on removal.");
});

test("Filters compose with filters on insert", function() {
  subarray.addItem(0, false);
  subarray.addItem(1, false);
  subarray.addItem(2, false);

  equal(operationsString(), "f:3", "Retains compose with retains on insert.");
});

test("Filters compose with filters on removal", function() {
  subarray.addItem(0, false);
  subarray.addItem(1, true);
  subarray.addItem(2, false);

  equal(operationsString(), "f:1 r:1 f:1", "precond - operations are initially correct.");

  subarray.removeItem(1);

  equal(operationsString(), "f:2", "Filters compose with filters on removal.");
});

test("Filters split retains", function() {
  subarray.addItem(0, true);
  subarray.addItem(1, true);
  subarray.addItem(1, false);

  equal(operationsString(), "r:1 f:1 r:1", "Filters split retains.");
});

test("Retains split filters", function() {
  subarray.addItem(0, false);
  subarray.addItem(1, false);
  subarray.addItem(1, true);

  equal(operationsString(), "f:1 r:1 f:1", "Retains split filters.");
});

test("`addItem` returns the index of the item in the subarray", function() {
  var indexes = [];

  equal(subarray.addItem(0, true), 0, "`addItem` returns the index of the item in the subarray");
  subarray.addItem(1, false);
  equal(subarray.addItem(2, true), 1, "`addItem` returns the index of the item in the subarray");

  equal(operationsString(), "r:1 f:1 r:1", "Operations are correct.");
});

test("`addItem` returns -1 if the new item is not in the subarray", function() {
  equal(subarray.addItem(0, false), -1, "`addItem` returns -1 if the item is not in the subarray");
});

test("`removeItem` returns the index of the item in the subarray", function() {
  subarray.addItem(0, true);
  subarray.addItem(1, false);
  subarray.addItem(2, true);

  equal(subarray.removeItem(2), 1, "`removeItem` returns the index of the item in the subarray");
  equal(subarray.removeItem(0), 0, "`removeItem` returns the index of the item in the subarray");
});

test("`removeItem` returns -1 if the item was not in the subarray", function() {
  subarray.addItem(0, true);
  subarray.addItem(1, false);

  equal(subarray.removeItem(1), -1, "`removeItem` returns -1 if the item is not in the subarray");
});

test("`removeItem` raises a sensible exception when there are no operations in the subarray", function() {
  var subarrayExploder = function() {
    subarray.removeItem(9);
  };
  throws(subarrayExploder, /never\ been\ added/, "`removeItem` raises a sensible exception when there are no operations in the subarray");
});

test("left composition does not confuse a subsequent right non-composition", function() {
  subarray.addItem(0, true);
  subarray.addItem(1, false);
  subarray.addItem(2, true);
  equal(operationsString(), "r:1 f:1 r:1", "precond - initial state of subarray is as expected");

  subarray.addItem(1, true);
  equal(operationsString(), "r:2 f:1 r:1", "left-composition does not confuse right non-composition");
});

})();

(function() {
var forEach = Ember.EnumerableUtils.forEach, trackedArray,
    RETAIN = Ember.TrackedArray.RETAIN,
    INSERT = Ember.TrackedArray.INSERT,
    DELETE = Ember.TrackedArray.DELETE;

module('Ember.TrackedArray');

test("operations for a tracked array of length n are initially retain:n", function() {
  trackedArray = new Ember.TrackedArray([1,2,3,4]);

  equal("r:4", trackedArray.toString(), "initial mutation is retain n");
});

test("insert zero items is a no-op", function() {
  trackedArray = new Ember.TrackedArray([1,2,3,4]);

  trackedArray.addItems(2, []);

  equal(trackedArray.toString(), "r:4", "insert:0 is a no-op");

  deepEqual(trackedArray._operations[0].items, [1,2,3,4], "after a no-op, existing operation has right items");
});

test("inserts can split retains", function() {
  trackedArray = new Ember.TrackedArray([1,2,3,4]);

  trackedArray.addItems(2, ['a']);

  equal(trackedArray.toString(), "r:2 i:1 r:2", "inserts can split retains");

  deepEqual(trackedArray._operations[0].items, [1,2], "split retains have the right items");
  deepEqual(trackedArray._operations[1].items, ['a'], "inserts have the right items");
  deepEqual(trackedArray._operations[2].items, [3,4], "split retains have the right items");
});

test("inserts can expand (split/compose) inserts", function() {
  trackedArray = new Ember.TrackedArray([]);

  trackedArray.addItems(0, [1,2,3,4]);
  trackedArray.addItems(2, ['a']);

  equal(trackedArray.toString(), "i:5", "inserts can expand inserts");

  deepEqual(trackedArray._operations[0].items, [1,2,'a',3,4], "expanded inserts have the right items");
});

test("inserts left of inserts compose", function() {
  trackedArray = new Ember.TrackedArray([1,2,3,4]);

  trackedArray.addItems(2, ['b']);
  trackedArray.addItems(2, ['a']);

  equal(trackedArray.toString(), "r:2 i:2 r:2", "inserts left of inserts compose");

  deepEqual(trackedArray._operations[0].items, [1,2], "split retains have the right items");
  deepEqual(trackedArray._operations[1].items, ['a', 'b'], "composed inserts have the right items");
  deepEqual(trackedArray._operations[2].items, [3,4], "split retains have the right items");
});

test("inserts right of inserts compose", function() {
  trackedArray = new Ember.TrackedArray([1,2,3,4]);

  trackedArray.addItems(2, ['a']);
  trackedArray.addItems(3, ['b']);

  equal(trackedArray.toString(), "r:2 i:2 r:2", "inserts right of inserts compose");

  deepEqual(trackedArray._operations[0].items, [1,2], "split retains have the right items");
  deepEqual(trackedArray._operations[1].items, ['a', 'b'], "composed inserts have the right items");
  deepEqual(trackedArray._operations[2].items, [3,4], "split retains have the right items");
});

test("delete zero items is a no-op", function() {
  trackedArray = new Ember.TrackedArray([1,2,3,4]);

  trackedArray.addItems(2, []);

  equal(trackedArray.toString(), "r:4", "insert:0 is a no-op");

  deepEqual(trackedArray._operations[0].items, [1,2,3,4], "after a no-op, existing operation has right items");
});

test("deletes compose with several inserts and retains", function() {
  trackedArray = new Ember.TrackedArray([1,2,3,4]);

  trackedArray.addItems(4, ['e']);
  trackedArray.addItems(3, ['d']);
  trackedArray.addItems(2, ['c']);
  trackedArray.addItems(1, ['b']);
  trackedArray.addItems(0, ['a']); // a1b2c3d4e i1r1i1r1i1r1i1r1i1

  trackedArray.removeItems(0, 9);
  equal(trackedArray.toString(), "d:4", "deletes compose with several inserts and retains");
});

test("deletes compose with several inserts and retains and an adjacent delete", function() {
  trackedArray = new Ember.TrackedArray([1,2,3,4,5]);

  trackedArray.removeItems(0, 1);
  trackedArray.addItems(4, ['e']);
  trackedArray.addItems(3, ['d']);
  trackedArray.addItems(2, ['c']);
  trackedArray.addItems(1, ['b']);
  trackedArray.addItems(0, ['a']); // a2b3c4d5e d1i1r1i1r1i1r1i1r1i1

  trackedArray.removeItems(0, 9);
  equal(trackedArray.toString(), "d:5", "deletes compose with several inserts, retains, and a single prior delete");
});

test("deletes compose with several inserts and retains and can reduce the last one", function() {
  trackedArray = new Ember.TrackedArray([1,2,3,4]);

  trackedArray.addItems(4, ['e', 'f']);
  trackedArray.addItems(3, ['d']);
  trackedArray.addItems(2, ['c']);
  trackedArray.addItems(1, ['b']);
  trackedArray.addItems(0, ['a']); // a1b2c3d4e i1r1i1r1i1r1i1r1i2

  trackedArray.removeItems(0, 9);
  equal(trackedArray.toString(), "d:4 i:1", "deletes compose with several inserts and retains, reducing the last one");
  deepEqual(trackedArray._operations[1].items, ['f'], "last mutation's items is correct");
});

test("deletes can split retains", function() {
  trackedArray = new Ember.TrackedArray([1,2,3,4]);
  trackedArray.removeItems(0, 2);

  equal(trackedArray.toString(), "d:2 r:2", "deletes can split retains");
  deepEqual(trackedArray._operations[1].items, [3,4], "retains reduced by delete have the right items");
});

test("deletes can trim retains on the right", function() {
  trackedArray = new Ember.TrackedArray([1,2,3]);
  trackedArray.removeItems(2, 1);

  equal(trackedArray.toString(), "r:2 d:1", "deletes can trim retains on the right");
  deepEqual(trackedArray._operations[0].items, [1,2], "retains reduced by delete have the right items");
});

test("deletes can trim retains on the left", function() {
  trackedArray = new Ember.TrackedArray([1,2,3]);
  trackedArray.removeItems(0, 1);

  equal(trackedArray.toString(), "d:1 r:2", "deletes can trim retains on the left");
  deepEqual(trackedArray._operations[1].items, [2,3], "retains reduced by delete have the right items");
});

test("deletes can split inserts", function() {
  trackedArray = new Ember.TrackedArray([]);
  trackedArray.addItems(0, ['a','b','c']);
  trackedArray.removeItems(0, 1);

  equal(trackedArray.toString(), "i:2", "deletes can split inserts");
  deepEqual(trackedArray._operations[0].items, ['b', 'c'], "inserts reduced by delete have the right items");
});

test("deletes can trim inserts on the right", function() {
  trackedArray = new Ember.TrackedArray([]);
  trackedArray.addItems(0, ['a','b','c']);
  trackedArray.removeItems(2, 1);

  equal(trackedArray.toString(), "i:2", "deletes can trim inserts on the right");
  deepEqual(trackedArray._operations[0].items, ['a', 'b'], "inserts reduced by delete have the right items");
});

test("deletes can trim inserts on the left", function() {
  trackedArray = new Ember.TrackedArray([]);
  trackedArray.addItems(0, ['a','b','c']);
  trackedArray.removeItems(0, 1);

  equal(trackedArray.toString(), "i:2", "deletes can trim inserts on the right");
  deepEqual(trackedArray._operations[0].items, ['b', 'c'], "inserts reduced by delete have the right items");
});

test("deletes can trim inserts on the left while composing with a delete on the left", function() {
  trackedArray = new Ember.TrackedArray(['a']);
  trackedArray.removeItems(0, 1);
  trackedArray.addItems(0, ['b', 'c']);
  trackedArray.removeItems(0, 1);

  equal(trackedArray.toString(), "d:1 i:1", "deletes can trim inserts and compose with a delete on the left");
  deepEqual(trackedArray._operations[1].items, ['c'], "inserts reduced by delete have the right items");
});

test("deletes can reduce an insert or retain, compose with several mutations of different types and reduce the last mutation if it is non-delete", function() {
  trackedArray = new Ember.TrackedArray([1,2,3,4]);

  trackedArray.addItems(4, ['e', 'f']);    // 1234ef
  trackedArray.addItems(3, ['d']);         // 123d4ef
  trackedArray.addItems(2, ['c']);         // 12c3d4ef
  trackedArray.addItems(1, ['b']);         // 1b2c3d4ef
  trackedArray.addItems(0, ['a','a','a']); // aaa1b2c3d4ef i3r1i1r1i1r1i1r1i2

  trackedArray.removeItems(1, 10);
  equal(trackedArray.toString(), "i:1 d:4 i:1", "deletes reduce an insert, compose with several inserts and retains, reducing the last one");
  deepEqual(trackedArray._operations[0].items, ['a'], "first reduced mutation's items is correct");
  deepEqual(trackedArray._operations[2].items, ['f'], "last reduced mutation's items is correct");
});

test("removeItems returns the removed items", function() {
  trackedArray = new Ember.TrackedArray([1,2,3,4]);
  deepEqual(trackedArray.removeItems(1, 2), [2,3], "`removeItems` returns the removed items");
});

test("apply invokes the callback with each group of items and the mutation's calculated offset", function() {
  var i = 0;
  trackedArray = new Ember.TrackedArray([1,2,3,4]);

  trackedArray.addItems(2, ['a','b','c']); // 12abc34
  trackedArray.removeItems(4, 2);          // 12ab4
  trackedArray.addItems(1, ['d']);         // 1d2ab4 r1 i1 r1 i2 d1 r1

  equal(trackedArray.toString(), "r:1 i:1 r:1 i:2 d:1 r:1", "precond - trackedArray is in expected state");

  trackedArray.apply(function (items, offset, operation) {
    switch (i++) {
      case 0:
        deepEqual(items, [1], "callback passed right items");
        equal(offset, 0, "callback passed right offset");
        equal(operation, RETAIN, "callback passed right operation");
        break;
      case 1:
        deepEqual(items, ['d'], "callback passed right items");
        equal(offset, 1, "callback passed right offset");
        equal(operation, INSERT, "callback passed right operation");
        break;
      case 2:
        deepEqual(items, [2], "callback passed right items");
        equal(offset, 2, "callback passed right offset");
        equal(operation, RETAIN, "callback passed right operation");
        break;
      case 3:
        deepEqual(items, ['a','b'], "callback passed right items");
        equal(offset, 3, "callback passed right offset");
        equal(operation, INSERT, "callback passed right operation");
        break;
      case 4:
        // deletes not passed items at the moment; that might need to be added
        // if TrackedArray is used more widely
        equal(offset, 5, "callback passed right offset");
        equal(operation, DELETE, "callback passed right operation");
        break;
      case 5:
        deepEqual(items, [4], "callback passed right items");
        equal(offset, 5, "callback passed right offset");
        equal(operation, RETAIN, "callback passed right operation");
        break;
    }
  });
  equal(i, 6, "`apply` invoked callback right number of times");

  equal(trackedArray.toString(), "r:6", "after `apply` operations become retain:n");
});

})();

