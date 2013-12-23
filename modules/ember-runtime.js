(function() {
/*globals ENV */
/**
@module ember
@submodule ember-runtime
*/

var indexOf = Ember.EnumerableUtils.indexOf;

/**
 This will compare two javascript values of possibly different types.
 It will tell you which one is greater than the other by returning:

  - -1 if the first is smaller than the second,
  - 0 if both are equal,
  - 1 if the first is greater than the second.

 The order is calculated based on `Ember.ORDER_DEFINITION`, if types are different.
 In case they have the same type an appropriate comparison for this type is made.

  ```javascript
  Ember.compare('hello', 'hello');  // 0
  Ember.compare('abc', 'dfg');      // -1
  Ember.compare(2, 1);              // 1
  ```

 @method compare
 @for Ember
 @param {Object} v First value to compare
 @param {Object} w Second value to compare
 @return {Number} -1 if v < w, 0 if v = w and 1 if v > w.
*/
Ember.compare = function compare(v, w) {
  if (v === w) { return 0; }

  var type1 = Ember.typeOf(v);
  var type2 = Ember.typeOf(w);

  var Comparable = Ember.Comparable;
  if (Comparable) {
    if (type1==='instance' && Comparable.detect(v.constructor)) {
      return v.constructor.compare(v, w);
    }

    if (type2 === 'instance' && Comparable.detect(w.constructor)) {
      return 1-w.constructor.compare(w, v);
    }
  }

  // If we haven't yet generated a reverse-mapping of Ember.ORDER_DEFINITION,
  // do so now.
  var mapping = Ember.ORDER_DEFINITION_MAPPING;
  if (!mapping) {
    var order = Ember.ORDER_DEFINITION;
    mapping = Ember.ORDER_DEFINITION_MAPPING = {};
    var idx, len;
    for (idx = 0, len = order.length; idx < len;  ++idx) {
      mapping[order[idx]] = idx;
    }

    // We no longer need Ember.ORDER_DEFINITION.
    delete Ember.ORDER_DEFINITION;
  }

  var type1Index = mapping[type1];
  var type2Index = mapping[type2];

  if (type1Index < type2Index) { return -1; }
  if (type1Index > type2Index) { return 1; }

  // types are equal - so we have to check values now
  switch (type1) {
    case 'boolean':
    case 'number':
      if (v < w) { return -1; }
      if (v > w) { return 1; }
      return 0;

    case 'string':
      var comp = v.localeCompare(w);
      if (comp < 0) { return -1; }
      if (comp > 0) { return 1; }
      return 0;

    case 'array':
      var vLen = v.length;
      var wLen = w.length;
      var l = Math.min(vLen, wLen);
      var r = 0;
      var i = 0;
      while (r === 0 && i < l) {
        r = compare(v[i],w[i]);
        i++;
      }
      if (r !== 0) { return r; }

      // all elements are equal now
      // shorter array should be ordered first
      if (vLen < wLen) { return -1; }
      if (vLen > wLen) { return 1; }
      // arrays are equal now
      return 0;

    case 'instance':
      if (Ember.Comparable && Ember.Comparable.detect(v)) {
        return v.compare(v, w);
      }
      return 0;

    case 'date':
      var vNum = v.getTime();
      var wNum = w.getTime();
      if (vNum < wNum) { return -1; }
      if (vNum > wNum) { return 1; }
      return 0;

    default:
      return 0;
  }
};

function _copy(obj, deep, seen, copies) {
  var ret, loc, key;

  // primitive data types are immutable, just return them.
  if ('object' !== typeof obj || obj===null) return obj;

  // avoid cyclical loops
  if (deep && (loc=indexOf(seen, obj))>=0) return copies[loc];

  Ember.assert('Cannot clone an Ember.Object that does not implement Ember.Copyable', !(obj instanceof Ember.Object) || (Ember.Copyable && Ember.Copyable.detect(obj)));

  // IMPORTANT: this specific test will detect a native array only. Any other
  // object will need to implement Copyable.
  if (Ember.typeOf(obj) === 'array') {
    ret = obj.slice();
    if (deep) {
      loc = ret.length;
      while(--loc>=0) ret[loc] = _copy(ret[loc], deep, seen, copies);
    }
  } else if (Ember.Copyable && Ember.Copyable.detect(obj)) {
    ret = obj.copy(deep, seen, copies);
  } else {
    ret = {};
    for(key in obj) {
      if (!obj.hasOwnProperty(key)) continue;

      // Prevents browsers that don't respect non-enumerability from
      // copying internal Ember properties
      if (key.substring(0,2) === '__') continue;

      ret[key] = deep ? _copy(obj[key], deep, seen, copies) : obj[key];
    }
  }

  if (deep) {
    seen.push(obj);
    copies.push(ret);
  }

  return ret;
}

/**
  Creates a clone of the passed object. This function can take just about
  any type of object and create a clone of it, including primitive values
  (which are not actually cloned because they are immutable).

  If the passed object implements the `clone()` method, then this function
  will simply call that method and return the result.

  @method copy
  @for Ember
  @param {Object} obj The object to clone
  @param {Boolean} deep If true, a deep copy of the object is made
  @return {Object} The cloned object
*/
Ember.copy = function(obj, deep) {
  // fast paths
  if ('object' !== typeof obj || obj===null) return obj; // can't copy primitives
  if (Ember.Copyable && Ember.Copyable.detect(obj)) return obj.copy(deep);
  return _copy(obj, deep, deep ? [] : null, deep ? [] : null);
};

/**
  Compares two objects, returning true if they are logically equal. This is
  a deeper comparison than a simple triple equal. For sets it will compare the
  internal objects. For any other object that implements `isEqual()` it will
  respect that method.

  ```javascript
  Ember.isEqual('hello', 'hello');  // true
  Ember.isEqual(1, 2);              // false
  Ember.isEqual([4,2], [4,2]);      // false
  ```

  @method isEqual
  @for Ember
  @param {Object} a first object to compare
  @param {Object} b second object to compare
  @return {Boolean}
*/
Ember.isEqual = function(a, b) {
  if (a && 'function'===typeof a.isEqual) return a.isEqual(b);
  return a === b;
};

// Used by Ember.compare
Ember.ORDER_DEFINITION = Ember.ENV.ORDER_DEFINITION || [
  'undefined',
  'null',
  'boolean',
  'number',
  'string',
  'array',
  'object',
  'instance',
  'function',
  'class',
  'date'
];

/**
  Returns all of the keys defined on an object or hash. This is useful
  when inspecting objects for debugging. On browsers that support it, this
  uses the native `Object.keys` implementation.

  @method keys
  @for Ember
  @param {Object} obj
  @return {Array} Array containing keys of obj
*/
Ember.keys = Object.keys;

if (!Ember.keys || Ember.create.isSimulated) {
  var prototypeProperties = [
    'constructor',
    'hasOwnProperty',
    'isPrototypeOf',
    'propertyIsEnumerable',
    'valueOf',
    'toLocaleString',
    'toString'
  ],
  pushPropertyName = function(obj, array, key) {
    // Prevents browsers that don't respect non-enumerability from
    // copying internal Ember properties
    if (key.substring(0,2) === '__') return;
    if (key === '_super') return;
    if (indexOf(array, key) >= 0) return;
    if (!obj.hasOwnProperty(key)) return;

    array.push(key);
  };

  Ember.keys = function(obj) {
    var ret = [], key;
    for (key in obj) {
      pushPropertyName(obj, ret, key);
    }

    // IE8 doesn't enumerate property that named the same as prototype properties.
    for (var i = 0, l = prototypeProperties.length; i < l; i++) {
      key = prototypeProperties[i];

      pushPropertyName(obj, ret, key);
    }

    return ret;
  };
}

})();



(function() {
/**
@module ember
@submodule ember-runtime
*/

var STRING_DASHERIZE_REGEXP = (/[ _]/g);
var STRING_DASHERIZE_CACHE = {};
var STRING_DECAMELIZE_REGEXP = (/([a-z\d])([A-Z])/g);
var STRING_CAMELIZE_REGEXP = (/(\-|_|\.|\s)+(.)?/g);
var STRING_UNDERSCORE_REGEXP_1 = (/([a-z\d])([A-Z]+)/g);
var STRING_UNDERSCORE_REGEXP_2 = (/\-|\s+/g);
var STRING_PARAMETERIZE_REGEXP_1 = (/[_|\/|\s]+/g);
var STRING_PARAMETERIZE_REGEXP_2 = (/[^a-z0-9\-]+/gi);
var STRING_PARAMETERIZE_REGEXP_3 = (/[\-]+/g);
var STRING_PARAMETERIZE_REGEXP_4 = (/^-+|-+$/g);

/**
  Defines the hash of localized strings for the current language. Used by
  the `Ember.String.loc()` helper. To localize, add string values to this
  hash.

  @property STRINGS
  @for Ember
  @type Hash
*/
Ember.STRINGS = {};

/**
  Defines string helper methods including string formatting and localization.
  Unless `Ember.EXTEND_PROTOTYPES.String` is `false` these methods will also be
  added to the `String.prototype` as well.

  @class String
  @namespace Ember
  @static
*/
Ember.String = {

  /**
    Apply formatting options to the string. This will look for occurrences
    of "%@" in your string and substitute them with the arguments you pass into
    this method. If you want to control the specific order of replacement,
    you can add a number after the key as well to indicate which argument
    you want to insert.

    Ordered insertions are most useful when building loc strings where values
    you need to insert may appear in different orders.

    ```javascript
    "Hello %@ %@".fmt('John', 'Doe');     // "Hello John Doe"
    "Hello %@2, %@1".fmt('John', 'Doe');  // "Hello Doe, John"
    ```

    @method fmt
    @param {String} str The string to format
    @param {Array} formats An array of parameters to interpolate into string.
    @return {String} formatted string
  */
  fmt: function(str, formats) {
    // first, replace any ORDERED replacements.
    var idx  = 0; // the current index for non-numerical replacements
    return str.replace(/%@([0-9]+)?/g, function(s, argIndex) {
      argIndex = (argIndex) ? parseInt(argIndex, 10) - 1 : idx++;
      s = formats[argIndex];
      return (s === null) ? '(null)' : (s === undefined) ? '' : Ember.inspect(s);
    }) ;
  },

  /**
    Formats the passed string, but first looks up the string in the localized
    strings hash. This is a convenient way to localize text. See
    `Ember.String.fmt()` for more information on formatting.

    Note that it is traditional but not required to prefix localized string
    keys with an underscore or other character so you can easily identify
    localized strings.

    ```javascript
    Ember.STRINGS = {
      '_Hello World': 'Bonjour le monde',
      '_Hello %@ %@': 'Bonjour %@ %@'
    };

    Ember.String.loc("_Hello World");  // 'Bonjour le monde';
    Ember.String.loc("_Hello %@ %@", ["John", "Smith"]);  // "Bonjour John Smith";
    ```

    @method loc
    @param {String} str The string to format
    @param {Array} formats Optional array of parameters to interpolate into string.
    @return {String} formatted string
  */
  loc: function(str, formats) {
    str = Ember.STRINGS[str] || str;
    return Ember.String.fmt(str, formats) ;
  },

  /**
    Splits a string into separate units separated by spaces, eliminating any
    empty strings in the process. This is a convenience method for split that
    is mostly useful when applied to the `String.prototype`.

    ```javascript
    Ember.String.w("alpha beta gamma").forEach(function(key) {
      console.log(key);
    });

    // > alpha
    // > beta
    // > gamma
    ```

    @method w
    @param {String} str The string to split
    @return {String} split string
  */
  w: function(str) { return str.split(/\s+/); },

  /**
    Converts a camelized string into all lower case separated by underscores.

    ```javascript
    'innerHTML'.decamelize();           // 'inner_html'
    'action_name'.decamelize();        // 'action_name'
    'css-class-name'.decamelize();     // 'css-class-name'
    'my favorite items'.decamelize();  // 'my favorite items'
    ```

    @method decamelize
    @param {String} str The string to decamelize.
    @return {String} the decamelized string.
  */
  decamelize: function(str) {
    return str.replace(STRING_DECAMELIZE_REGEXP, '$1_$2').toLowerCase();
  },

  /**
    Replaces underscores, spaces, or camelCase with dashes.

    ```javascript
    'innerHTML'.dasherize();          // 'inner-html'
    'action_name'.dasherize();        // 'action-name'
    'css-class-name'.dasherize();     // 'css-class-name'
    'my favorite items'.dasherize();  // 'my-favorite-items'
    ```

    @method dasherize
    @param {String} str The string to dasherize.
    @return {String} the dasherized string.
  */
  dasherize: function(str) {
    var cache = STRING_DASHERIZE_CACHE,
        hit   = cache.hasOwnProperty(str),
        ret;

    if (hit) {
      return cache[str];
    } else {
      ret = Ember.String.decamelize(str).replace(STRING_DASHERIZE_REGEXP,'-');
      cache[str] = ret;
    }

    return ret;
  },

  /**
    Returns the lowerCamelCase form of a string.

    ```javascript
    'innerHTML'.camelize();          // 'innerHTML'
    'action_name'.camelize();        // 'actionName'
    'css-class-name'.camelize();     // 'cssClassName'
    'my favorite items'.camelize();  // 'myFavoriteItems'
    'My Favorite Items'.camelize();  // 'myFavoriteItems'
    ```

    @method camelize
    @param {String} str The string to camelize.
    @return {String} the camelized string.
  */
  camelize: function(str) {
    return str.replace(STRING_CAMELIZE_REGEXP, function(match, separator, chr) {
      return chr ? chr.toUpperCase() : '';
    }).replace(/^([A-Z])/, function(match, separator, chr) {
      return match.toLowerCase();
    });
  },

  /**
    Returns the UpperCamelCase form of a string.

    ```javascript
    'innerHTML'.classify();          // 'InnerHTML'
    'action_name'.classify();        // 'ActionName'
    'css-class-name'.classify();     // 'CssClassName'
    'my favorite items'.classify();  // 'MyFavoriteItems'
    ```

    @method classify
    @param {String} str the string to classify
    @return {String} the classified string
  */
  classify: function(str) {
    var parts = str.split("."),
        out = [];

    for (var i=0, l=parts.length; i<l; i++) {
      var camelized = Ember.String.camelize(parts[i]);
      out.push(camelized.charAt(0).toUpperCase() + camelized.substr(1));
    }

    return out.join(".");
  },

  /**
    More general than decamelize. Returns the lower\_case\_and\_underscored
    form of a string.

    ```javascript
    'innerHTML'.underscore();          // 'inner_html'
    'action_name'.underscore();        // 'action_name'
    'css-class-name'.underscore();     // 'css_class_name'
    'my favorite items'.underscore();  // 'my_favorite_items'
    ```

    @method underscore
    @param {String} str The string to underscore.
    @return {String} the underscored string.
  */
  underscore: function(str) {
    return str.replace(STRING_UNDERSCORE_REGEXP_1, '$1_$2').
      replace(STRING_UNDERSCORE_REGEXP_2, '_').toLowerCase();
  },

  /**
    Returns the Capitalized form of a string

    ```javascript
    'innerHTML'.capitalize()         // 'InnerHTML'
    'action_name'.capitalize()       // 'Action_name'
    'css-class-name'.capitalize()    // 'Css-class-name'
    'my favorite items'.capitalize() // 'My favorite items'
    ```

    @method capitalize
    @param {String} str The string to capitalize.
    @return {String} The capitalized string.
  */
  capitalize: function(str) {
    return str.charAt(0).toUpperCase() + str.substr(1);
  }
};

if (Ember.FEATURES.isEnabled("string-humanize")) {
  /**
    Returns the Humanized form of a string

    Replaces underscores with spaces, and capitializes first character
    of string. Also strips "_id" suffixes.

    ```javascript
    'first_name'.humanize()       // 'First name'
    'user_id'.humanize()          // 'User'
    ```

    @method humanize
    @param {String} str The string to humanize.
    @return {String} The humanized string.
  */

  Ember.String.humanize = function(str) {
    return str.replace(/_id$/, '').
      replace(/_/g, ' ').
      replace(/^\w/g, function(s){
        return s.toUpperCase();
      });
  };
}

if (Ember.FEATURES.isEnabled("string-parameterize")) {
  /**
    Transforms a string so that it may be used as part of a 'pretty' / SEO friendly URL.

    ```javascript
    'My favorite items.'.parameterize();                        // 'my-favorite-items'
    'action_name'.parameterize();                               // 'action-name'
    '100 ways Ember.js is better than Angular.'.parameterize(); // '100-ways-emberjs-is-better-than-angular'
    ```

    @method parameterize
    @param {String} str The string to parameterize.
    @return {String} the parameterized string.
  */
  Ember.String.parameterize = function(str) {
    return str.replace(STRING_PARAMETERIZE_REGEXP_1, '-') // replace underscores, slashes and spaces with separator
              .replace(STRING_PARAMETERIZE_REGEXP_2, '')  // remove non-alphanumeric characters except the separator
              .replace(STRING_PARAMETERIZE_REGEXP_3, '-') // replace multiple occurring separators
              .replace(STRING_PARAMETERIZE_REGEXP_4, '')  // trim leading and trailing separators 
              .toLowerCase();
  };
}


})();



(function() {
/**
@module ember
@submodule ember-runtime
*/



var fmt = Ember.String.fmt,
    w   = Ember.String.w,
    loc = Ember.String.loc,
    camelize = Ember.String.camelize,
    decamelize = Ember.String.decamelize,
    dasherize = Ember.String.dasherize,
    underscore = Ember.String.underscore,
    capitalize = Ember.String.capitalize,
    classify = Ember.String.classify;

if (Ember.FEATURES.isEnabled("string-humanize")) {
  var humanize = Ember.String.humanize;
}

if (Ember.FEATURES.isEnabled("string-parameterize")) {
  var parameterize = Ember.String.parameterize;
}

if (Ember.EXTEND_PROTOTYPES === true || Ember.EXTEND_PROTOTYPES.String) {

  /**
    See [Ember.String.fmt](/api/classes/Ember.String.html#method_fmt).

    @method fmt
    @for String
  */
  String.prototype.fmt = function() {
    return fmt(this, arguments);
  };

  /**
    See [Ember.String.w](/api/classes/Ember.String.html#method_w).

    @method w
    @for String
  */
  String.prototype.w = function() {
    return w(this);
  };

  /**
    See [Ember.String.loc](/api/classes/Ember.String.html#method_loc).

    @method loc
    @for String
  */
  String.prototype.loc = function() {
    return loc(this, arguments);
  };

  /**
    See [Ember.String.camelize](/api/classes/Ember.String.html#method_camelize).

    @method camelize
    @for String
  */
  String.prototype.camelize = function() {
    return camelize(this);
  };

  /**
    See [Ember.String.decamelize](/api/classes/Ember.String.html#method_decamelize).

    @method decamelize
    @for String
  */
  String.prototype.decamelize = function() {
    return decamelize(this);
  };

  /**
    See [Ember.String.dasherize](/api/classes/Ember.String.html#method_dasherize).

    @method dasherize
    @for String
  */
  String.prototype.dasherize = function() {
    return dasherize(this);
  };

  /**
    See [Ember.String.underscore](/api/classes/Ember.String.html#method_underscore).

    @method underscore
    @for String
  */
  String.prototype.underscore = function() {
    return underscore(this);
  };

  /**
    See [Ember.String.classify](/api/classes/Ember.String.html#method_classify).

    @method classify
    @for String
  */
  String.prototype.classify = function() {
    return classify(this);
  };

  /**
    See [Ember.String.capitalize](/api/classes/Ember.String.html#method_capitalize).

    @method capitalize
    @for String
  */
  String.prototype.capitalize = function() {
    return capitalize(this);
  };

  if (Ember.FEATURES.isEnabled("string-humanize")) {
    /**
      See [Ember.String.humanize](/api/classes/Ember.String.html#method_humanize).

      @method humanize
      @for String
    */
    String.prototype.humanize = function() {
      return humanize(this);
    };
  }

  if (Ember.FEATURES.isEnabled("string-parameterize")) {
    /**
      See [Ember.String.parameterize](/api/classes/Ember.String.html#method_parameterize).

      @method parameterize
      @for String
    */
    String.prototype.parameterize = function() {
      return parameterize(this);
    };
  }

}


})();



(function() {
/**
@module ember
@submodule ember-runtime
*/

var get = Ember.get,
    set = Ember.set,
    slice = Array.prototype.slice,
    getProperties = Ember.getProperties;

/**
  ## Overview

  This mixin provides properties and property observing functionality, core
  features of the Ember object model.

  Properties and observers allow one object to observe changes to a
  property on another object. This is one of the fundamental ways that
  models, controllers and views communicate with each other in an Ember
  application.

  Any object that has this mixin applied can be used in observer
  operations. That includes `Ember.Object` and most objects you will
  interact with as you write your Ember application.

  Note that you will not generally apply this mixin to classes yourself,
  but you will use the features provided by this module frequently, so it
  is important to understand how to use it.

  ## Using `get()` and `set()`

  Because of Ember's support for bindings and observers, you will always
  access properties using the get method, and set properties using the
  set method. This allows the observing objects to be notified and
  computed properties to be handled properly.

  More documentation about `get` and `set` are below.

  ## Observing Property Changes

  You typically observe property changes simply by adding the `observes`
  call to the end of your method declarations in classes that you write.
  For example:

  ```javascript
  Ember.Object.extend({
    valueObserver: function() {
      // Executes whenever the "value" property changes
    }.observes('value')
  });
  ```

  Although this is the most common way to add an observer, this capability
  is actually built into the `Ember.Object` class on top of two methods
  defined in this mixin: `addObserver` and `removeObserver`. You can use
  these two methods to add and remove observers yourself if you need to
  do so at runtime.

  To add an observer for a property, call:

  ```javascript
  object.addObserver('propertyKey', targetObject, targetAction)
  ```

  This will call the `targetAction` method on the `targetObject` whenever
  the value of the `propertyKey` changes.

  Note that if `propertyKey` is a computed property, the observer will be
  called when any of the property dependencies are changed, even if the
  resulting value of the computed property is unchanged. This is necessary
  because computed properties are not computed until `get` is called.

  @class Observable
  @namespace Ember
*/
Ember.Observable = Ember.Mixin.create({

  /**
    Retrieves the value of a property from the object.

    This method is usually similar to using `object[keyName]` or `object.keyName`,
    however it supports both computed properties and the unknownProperty
    handler.

    Because `get` unifies the syntax for accessing all these kinds
    of properties, it can make many refactorings easier, such as replacing a
    simple property with a computed property, or vice versa.

    ### Computed Properties

    Computed properties are methods defined with the `property` modifier
    declared at the end, such as:

    ```javascript
    fullName: function() {
      return this.get('firstName') + ' ' + this.get('lastName');
    }.property('firstName', 'lastName')
    ```

    When you call `get` on a computed property, the function will be
    called and the return value will be returned instead of the function
    itself.

    ### Unknown Properties

    Likewise, if you try to call `get` on a property whose value is
    `undefined`, the `unknownProperty()` method will be called on the object.
    If this method returns any value other than `undefined`, it will be returned
    instead. This allows you to implement "virtual" properties that are
    not defined upfront.

    @method get
    @param {String} keyName The property to retrieve
    @return {Object} The property value or undefined.
  */
  get: function(keyName) {
    return get(this, keyName);
  },

  /**
    To get multiple properties at once, call `getProperties`
    with a list of strings or an array:

    ```javascript
    record.getProperties('firstName', 'lastName', 'zipCode');  // { firstName: 'John', lastName: 'Doe', zipCode: '10011' }
    ```

    is equivalent to:

    ```javascript
    record.getProperties(['firstName', 'lastName', 'zipCode']);  // { firstName: 'John', lastName: 'Doe', zipCode: '10011' }
    ```

    @method getProperties
    @param {String...|Array} list of keys to get
    @return {Hash}
  */
  getProperties: function() {
    return getProperties.apply(null, [this].concat(slice.call(arguments)));
  },

  /**
    Sets the provided key or path to the value.

    This method is generally very similar to calling `object[key] = value` or
    `object.key = value`, except that it provides support for computed
    properties, the `setUnknownProperty()` method and property observers.

    ### Computed Properties

    If you try to set a value on a key that has a computed property handler
    defined (see the `get()` method for an example), then `set()` will call
    that method, passing both the value and key instead of simply changing
    the value itself. This is useful for those times when you need to
    implement a property that is composed of one or more member
    properties.

    ### Unknown Properties

    If you try to set a value on a key that is undefined in the target
    object, then the `setUnknownProperty()` handler will be called instead. This
    gives you an opportunity to implement complex "virtual" properties that
    are not predefined on the object. If `setUnknownProperty()` returns
    undefined, then `set()` will simply set the value on the object.

    ### Property Observers

    In addition to changing the property, `set()` will also register a property
    change with the object. Unless you have placed this call inside of a
    `beginPropertyChanges()` and `endPropertyChanges(),` any "local" observers
    (i.e. observer methods declared on the same object), will be called
    immediately. Any "remote" observers (i.e. observer methods declared on
    another object) will be placed in a queue and called at a later time in a
    coalesced manner.

    ### Chaining

    In addition to property changes, `set()` returns the value of the object
    itself so you can do chaining like this:

    ```javascript
    record.set('firstName', 'Charles').set('lastName', 'Jolley');
    ```

    @method set
    @param {String} keyName The property to set
    @param {Object} value The value to set or `null`.
    @return {Ember.Observable}
  */
  set: function(keyName, value) {
    set(this, keyName, value);
    return this;
  },


  /**
    Sets a list of properties at once. These properties are set inside
    a single `beginPropertyChanges` and `endPropertyChanges` batch, so
    observers will be buffered.

    ```javascript
    record.setProperties({ firstName: 'Charles', lastName: 'Jolley' });
    ```

    @method setProperties
    @param {Hash} hash the hash of keys and values to set
    @return {Ember.Observable}
  */
  setProperties: function(hash) {
    return Ember.setProperties(this, hash);
  },

  /**
    Begins a grouping of property changes.

    You can use this method to group property changes so that notifications
    will not be sent until the changes are finished. If you plan to make a
    large number of changes to an object at one time, you should call this
    method at the beginning of the changes to begin deferring change
    notifications. When you are done making changes, call
    `endPropertyChanges()` to deliver the deferred change notifications and end
    deferring.

    @method beginPropertyChanges
    @return {Ember.Observable}
  */
  beginPropertyChanges: function() {
    Ember.beginPropertyChanges();
    return this;
  },

  /**
    Ends a grouping of property changes.

    You can use this method to group property changes so that notifications
    will not be sent until the changes are finished. If you plan to make a
    large number of changes to an object at one time, you should call
    `beginPropertyChanges()` at the beginning of the changes to defer change
    notifications. When you are done making changes, call this method to
    deliver the deferred change notifications and end deferring.

    @method endPropertyChanges
    @return {Ember.Observable}
  */
  endPropertyChanges: function() {
    Ember.endPropertyChanges();
    return this;
  },

  /**
    Notify the observer system that a property is about to change.

    Sometimes you need to change a value directly or indirectly without
    actually calling `get()` or `set()` on it. In this case, you can use this
    method and `propertyDidChange()` instead. Calling these two methods
    together will notify all observers that the property has potentially
    changed value.

    Note that you must always call `propertyWillChange` and `propertyDidChange`
    as a pair. If you do not, it may get the property change groups out of
    order and cause notifications to be delivered more often than you would
    like.

    @method propertyWillChange
    @param {String} keyName The property key that is about to change.
    @return {Ember.Observable}
  */
  propertyWillChange: function(keyName) {
    Ember.propertyWillChange(this, keyName);
    return this;
  },

  /**
    Notify the observer system that a property has just changed.

    Sometimes you need to change a value directly or indirectly without
    actually calling `get()` or `set()` on it. In this case, you can use this
    method and `propertyWillChange()` instead. Calling these two methods
    together will notify all observers that the property has potentially
    changed value.

    Note that you must always call `propertyWillChange` and `propertyDidChange`
    as a pair. If you do not, it may get the property change groups out of
    order and cause notifications to be delivered more often than you would
    like.

    @method propertyDidChange
    @param {String} keyName The property key that has just changed.
    @return {Ember.Observable}
  */
  propertyDidChange: function(keyName) {
    Ember.propertyDidChange(this, keyName);
    return this;
  },

  /**
    Convenience method to call `propertyWillChange` and `propertyDidChange` in
    succession.

    @method notifyPropertyChange
    @param {String} keyName The property key to be notified about.
    @return {Ember.Observable}
  */
  notifyPropertyChange: function(keyName) {
    this.propertyWillChange(keyName);
    this.propertyDidChange(keyName);
    return this;
  },

  addBeforeObserver: function(key, target, method) {
    Ember.addBeforeObserver(this, key, target, method);
  },

  /**
    Adds an observer on a property.

    This is the core method used to register an observer for a property.

    Once you call this method, any time the key's value is set, your observer
    will be notified. Note that the observers are triggered any time the
    value is set, regardless of whether it has actually changed. Your
    observer should be prepared to handle that.

    You can also pass an optional context parameter to this method. The
    context will be passed to your observer method whenever it is triggered.
    Note that if you add the same target/method pair on a key multiple times
    with different context parameters, your observer will only be called once
    with the last context you passed.

    ### Observer Methods

    Observer methods you pass should generally have the following signature if
    you do not pass a `context` parameter:

    ```javascript
    fooDidChange: function(sender, key, value, rev) { };
    ```

    The sender is the object that changed. The key is the property that
    changes. The value property is currently reserved and unused. The rev
    is the last property revision of the object when it changed, which you can
    use to detect if the key value has really changed or not.

    If you pass a `context` parameter, the context will be passed before the
    revision like so:

    ```javascript
    fooDidChange: function(sender, key, value, context, rev) { };
    ```

    Usually you will not need the value, context or revision parameters at
    the end. In this case, it is common to write observer methods that take
    only a sender and key value as parameters or, if you aren't interested in
    any of these values, to write an observer that has no parameters at all.

    @method addObserver
    @param {String} key The key to observer
    @param {Object} target The target object to invoke
    @param {String|Function} method The method to invoke.
    @return {Ember.Object} self
  */
  addObserver: function(key, target, method) {
    Ember.addObserver(this, key, target, method);
  },

  /**
    Remove an observer you have previously registered on this object. Pass
    the same key, target, and method you passed to `addObserver()` and your
    target will no longer receive notifications.

    @method removeObserver
    @param {String} key The key to observer
    @param {Object} target The target object to invoke
    @param {String|Function} method The method to invoke.
    @return {Ember.Observable} receiver
  */
  removeObserver: function(key, target, method) {
    Ember.removeObserver(this, key, target, method);
  },

  /**
    Returns `true` if the object currently has observers registered for a
    particular key. You can use this method to potentially defer performing
    an expensive action until someone begins observing a particular property
    on the object.

    @method hasObserverFor
    @param {String} key Key to check
    @return {Boolean}
  */
  hasObserverFor: function(key) {
    return Ember.hasListeners(this, key+':change');
  },

  /**
    Retrieves the value of a property, or a default value in the case that the
    property returns `undefined`.

    ```javascript
    person.getWithDefault('lastName', 'Doe');
    ```

    @method getWithDefault
    @param {String} keyName The name of the property to retrieve
    @param {Object} defaultValue The value to return if the property value is undefined
    @return {Object} The property value or the defaultValue.
  */
  getWithDefault: function(keyName, defaultValue) {
    return Ember.getWithDefault(this, keyName, defaultValue);
  },

  /**
    Set the value of a property to the current value plus some amount.

    ```javascript
    person.incrementProperty('age');
    team.incrementProperty('score', 2);
    ```

    @method incrementProperty
    @param {String} keyName The name of the property to increment
    @param {Number} increment The amount to increment by. Defaults to 1
    @return {Number} The new property value
  */
  incrementProperty: function(keyName, increment) {
    if (Ember.isNone(increment)) { increment = 1; }
    Ember.assert("Must pass a numeric value to incrementProperty", (!isNaN(parseFloat(increment)) && isFinite(increment)));
    set(this, keyName, (get(this, keyName) || 0) + increment);
    return get(this, keyName);
  },

  /**
    Set the value of a property to the current value minus some amount.

    ```javascript
    player.decrementProperty('lives');
    orc.decrementProperty('health', 5);
    ```

    @method decrementProperty
    @param {String} keyName The name of the property to decrement
    @param {Number} decrement The amount to decrement by. Defaults to 1
    @return {Number} The new property value
  */
  decrementProperty: function(keyName, decrement) {
    if (Ember.isNone(decrement)) { decrement = 1; }
    Ember.assert("Must pass a numeric value to decrementProperty", (!isNaN(parseFloat(decrement)) && isFinite(decrement)));
    set(this, keyName, (get(this, keyName) || 0) - decrement);
    return get(this, keyName);
  },

  /**
    Set the value of a boolean property to the opposite of it's
    current value.

    ```javascript
    starship.toggleProperty('warpDriveEngaged');
    ```

    @method toggleProperty
    @param {String} keyName The name of the property to toggle
    @return {Object} The new property value
  */
  toggleProperty: function(keyName) {
    set(this, keyName, !get(this, keyName));
    return get(this, keyName);
  },

  /**
    Returns the cached value of a computed property, if it exists.
    This allows you to inspect the value of a computed property
    without accidentally invoking it if it is intended to be
    generated lazily.

    @method cacheFor
    @param {String} keyName
    @return {Object} The cached value of the computed property, if any
  */
  cacheFor: function(keyName) {
    return Ember.cacheFor(this, keyName);
  },

  // intended for debugging purposes
  observersForKey: function(keyName) {
    return Ember.observersFor(this, keyName);
  }
});

})();



(function() {
/**
  @module ember
  @submodule ember-runtime
*/


// NOTE: this object should never be included directly. Instead use `Ember.Object`.
// We only define this separately so that `Ember.Set` can depend on it.


var set = Ember.set, get = Ember.get,
    o_create = Ember.create,
    o_defineProperty = Ember.platform.defineProperty,
    GUID_KEY = Ember.GUID_KEY,
    guidFor = Ember.guidFor,
    generateGuid = Ember.generateGuid,
    meta = Ember.meta,
    rewatch = Ember.rewatch,
    finishChains = Ember.finishChains,
    sendEvent = Ember.sendEvent,
    destroy = Ember.destroy,
    schedule = Ember.run.schedule,
    Mixin = Ember.Mixin,
    applyMixin = Mixin._apply,
    finishPartial = Mixin.finishPartial,
    reopen = Mixin.prototype.reopen,
    MANDATORY_SETTER = Ember.ENV.MANDATORY_SETTER,
    indexOf = Ember.EnumerableUtils.indexOf;

var undefinedDescriptor = {
  configurable: true,
  writable: true,
  enumerable: false,
  value: undefined
};

function makeCtor() {

  // Note: avoid accessing any properties on the object since it makes the
  // method a lot faster. This is glue code so we want it to be as fast as
  // possible.

  var wasApplied = false, initMixins, initProperties;

  var Class = function() {
    if (!wasApplied) {
      Class.proto(); // prepare prototype...
    }
    o_defineProperty(this, GUID_KEY, undefinedDescriptor);
    o_defineProperty(this, '_super', undefinedDescriptor);
    var m = meta(this), proto = m.proto;
    m.proto = this;
    if (initMixins) {
      // capture locally so we can clear the closed over variable
      var mixins = initMixins;
      initMixins = null;
      this.reopen.apply(this, mixins);
    }
    if (initProperties) {
      // capture locally so we can clear the closed over variable
      var props = initProperties;
      initProperties = null;

      var concatenatedProperties = this.concatenatedProperties;

      for (var i = 0, l = props.length; i < l; i++) {
        var properties = props[i];

        Ember.assert("Ember.Object.create no longer supports mixing in other definitions, use createWithMixins instead.", !(properties instanceof Ember.Mixin));

        if (typeof properties !== 'object' && properties !== undefined) {
          throw new Ember.Error("Ember.Object.create only accepts objects.");
        }

        if (!properties) { continue; }

        var keyNames = Ember.keys(properties);

        for (var j = 0, ll = keyNames.length; j < ll; j++) {
          var keyName = keyNames[j];
          if (!properties.hasOwnProperty(keyName)) { continue; }

          var value = properties[keyName],
              IS_BINDING = Ember.IS_BINDING;

          if (IS_BINDING.test(keyName)) {
            var bindings = m.bindings;
            if (!bindings) {
              bindings = m.bindings = {};
            } else if (!m.hasOwnProperty('bindings')) {
              bindings = m.bindings = o_create(m.bindings);
            }
            bindings[keyName] = value;
          }

          var desc = m.descs[keyName];

          Ember.assert("Ember.Object.create no longer supports defining computed properties.", !(value instanceof Ember.ComputedProperty));
          Ember.assert("Ember.Object.create no longer supports defining methods that call _super.", !(typeof value === 'function' && value.toString().indexOf('._super') !== -1));
          Ember.assert("`actions` must be provided at extend time, not at create time, when Ember.ActionHandler is used (i.e. views, controllers & routes).", !((keyName === 'actions') && Ember.ActionHandler.detect(this)));

          if (concatenatedProperties && indexOf(concatenatedProperties, keyName) >= 0) {
            var baseValue = this[keyName];

            if (baseValue) {
              if ('function' === typeof baseValue.concat) {
                value = baseValue.concat(value);
              } else {
                value = Ember.makeArray(baseValue).concat(value);
              }
            } else {
              value = Ember.makeArray(value);
            }
          }

          if (desc) {
            desc.set(this, keyName, value);
          } else {
            if (typeof this.setUnknownProperty === 'function' && !(keyName in this)) {
              this.setUnknownProperty(keyName, value);
            } else if (MANDATORY_SETTER) {
              Ember.defineProperty(this, keyName, null, value); // setup mandatory setter
            } else {
              this[keyName] = value;
            }
          }
        }
      }
    }
    finishPartial(this, m);
    this.init.apply(this, arguments);
    m.proto = proto;
    finishChains(this);
    sendEvent(this, "init");
  };

  Class.toString = Mixin.prototype.toString;
  Class.willReopen = function() {
    if (wasApplied) {
      Class.PrototypeMixin = Mixin.create(Class.PrototypeMixin);
    }

    wasApplied = false;
  };
  Class._initMixins = function(args) { initMixins = args; };
  Class._initProperties = function(args) { initProperties = args; };

  Class.proto = function() {
    var superclass = Class.superclass;
    if (superclass) { superclass.proto(); }

    if (!wasApplied) {
      wasApplied = true;
      Class.PrototypeMixin.applyPartial(Class.prototype);
      rewatch(Class.prototype);
    }

    return this.prototype;
  };

  return Class;

}

/**
  @class CoreObject
  @namespace Ember
*/
var CoreObject = makeCtor();
CoreObject.toString = function() { return "Ember.CoreObject"; };

CoreObject.PrototypeMixin = Mixin.create({
  reopen: function() {
    applyMixin(this, arguments, true);
    return this;
  },

  /**
    An overridable method called when objects are instantiated. By default,
    does nothing unless it is overridden during class definition.

    Example:

    ```javascript
    App.Person = Ember.Object.extend({
      init: function() {
        alert('Name is ' + this.get('name'));
      }
    });

    var steve = App.Person.create({
      name: "Steve"
    });

    // alerts 'Name is Steve'.
    ```

    NOTE: If you do override `init` for a framework class like `Ember.View` or
    `Ember.ArrayController`, be sure to call `this._super()` in your
    `init` declaration! If you don't, Ember may not have an opportunity to
    do important setup work, and you'll see strange behavior in your
    application.

    @method init
  */
  init: function() {},

  /**
    Defines the properties that will be concatenated from the superclass
    (instead of overridden).

    By default, when you extend an Ember class a property defined in
    the subclass overrides a property with the same name that is defined
    in the superclass. However, there are some cases where it is preferable
    to build up a property's value by combining the superclass' property
    value with the subclass' value. An example of this in use within Ember
    is the `classNames` property of `Ember.View`.

    Here is some sample code showing the difference between a concatenated
    property and a normal one:

    ```javascript
    App.BarView = Ember.View.extend({
      someNonConcatenatedProperty: ['bar'],
      classNames: ['bar']
    });

    App.FooBarView = App.BarView.extend({
      someNonConcatenatedProperty: ['foo'],
      classNames: ['foo'],
    });

    var fooBarView = App.FooBarView.create();
    fooBarView.get('someNonConcatenatedProperty'); // ['foo']
    fooBarView.get('classNames'); // ['ember-view', 'bar', 'foo']
    ```

    This behavior extends to object creation as well. Continuing the
    above example:

    ```javascript
    var view = App.FooBarView.create({
      someNonConcatenatedProperty: ['baz'],
      classNames: ['baz']
    })
    view.get('someNonConcatenatedProperty'); // ['baz']
    view.get('classNames'); // ['ember-view', 'bar', 'foo', 'baz']
    ```
    Adding a single property that is not an array will just add it in the array:

    ```javascript
    var view = App.FooBarView.create({
      classNames: 'baz'
    })
    view.get('classNames'); // ['ember-view', 'bar', 'foo', 'baz']
    ```

    Using the `concatenatedProperties` property, we can tell to Ember that mix
    the content of the properties.

    In `Ember.View` the `classNameBindings` and `attributeBindings` properties
    are also concatenated, in addition to `classNames`.

    This feature is available for you to use throughout the Ember object model,
    although typical app developers are likely to use it infrequently. Since
    it changes expectations about behavior of properties, you should properly
    document its usage in each individual concatenated property (to not
    mislead your users to think they can override the property in a subclass).

    @property concatenatedProperties
    @type Array
    @default null
  */
  concatenatedProperties: null,

  /**
    Destroyed object property flag.

    if this property is `true` the observers and bindings were already
    removed by the effect of calling the `destroy()` method.

    @property isDestroyed
    @default false
  */
  isDestroyed: false,

  /**
    Destruction scheduled flag. The `destroy()` method has been called.

    The object stays intact until the end of the run loop at which point
    the `isDestroyed` flag is set.

    @property isDestroying
    @default false
  */
  isDestroying: false,

  /**
    Destroys an object by setting the `isDestroyed` flag and removing its
    metadata, which effectively destroys observers and bindings.

    If you try to set a property on a destroyed object, an exception will be
    raised.

    Note that destruction is scheduled for the end of the run loop and does not
    happen immediately.  It will set an isDestroying flag immediately.

    @method destroy
    @return {Ember.Object} receiver
  */
  destroy: function() {
    if (this.isDestroying) { return; }
    this.isDestroying = true;

    schedule('actions', this, this.willDestroy);
    schedule('destroy', this, this._scheduledDestroy);
    return this;
  },

  /**
    Override to implement teardown.

    @method willDestroy
   */
  willDestroy: Ember.K,

  /**
    @private

    Invoked by the run loop to actually destroy the object. This is
    scheduled for execution by the `destroy` method.

    @method _scheduledDestroy
  */
  _scheduledDestroy: function() {
    if (this.isDestroyed) { return; }
    destroy(this);
    this.isDestroyed = true;
  },

  bind: function(to, from) {
    if (!(from instanceof Ember.Binding)) { from = Ember.Binding.from(from); }
    from.to(to).connect(this);
    return from;
  },

  /**
    Returns a string representation which attempts to provide more information
    than Javascript's `toString` typically does, in a generic way for all Ember
    objects.

    ```javascript
    App.Person = Em.Object.extend()
    person = App.Person.create()
    person.toString() //=> "<App.Person:ember1024>"
    ```

    If the object's class is not defined on an Ember namespace, it will
    indicate it is a subclass of the registered superclass:

   ```javascript
    Student = App.Person.extend()
    student = Student.create()
    student.toString() //=> "<(subclass of App.Person):ember1025>"
    ```

    If the method `toStringExtension` is defined, its return value will be
    included in the output.

    ```javascript
    App.Teacher = App.Person.extend({
      toStringExtension: function() {
        return this.get('fullName');
      }
    });
    teacher = App.Teacher.create()
    teacher.toString(); //=> "<App.Teacher:ember1026:Tom Dale>"
    ```

    @method toString
    @return {String} string representation
  */
  toString: function toString() {
    var hasToStringExtension = typeof this.toStringExtension === 'function',
        extension = hasToStringExtension ? ":" + this.toStringExtension() : '';
    var ret = '<'+this.constructor.toString()+':'+guidFor(this)+extension+'>';
    this.toString = makeToString(ret);
    return ret;
  }
});

CoreObject.PrototypeMixin.ownerConstructor = CoreObject;

function makeToString(ret) {
  return function() { return ret; };
}

if (Ember.config.overridePrototypeMixin) {
  Ember.config.overridePrototypeMixin(CoreObject.PrototypeMixin);
}

CoreObject.__super__ = null;

var ClassMixin = Mixin.create({

  ClassMixin: Ember.required(),

  PrototypeMixin: Ember.required(),

  isClass: true,

  isMethod: false,

  /**
    Creates a new subclass.

    ```javascript
    App.Person = Ember.Object.extend({
      say: function(thing) {
        alert(thing);
       }
    });
    ```

    This defines a new subclass of Ember.Object: `App.Person`. It contains one method: `say()`.

    You can also create a subclass from any existing class by calling its `extend()`  method. For example, you might want to create a subclass of Ember's built-in `Ember.View` class:

    ```javascript
    App.PersonView = Ember.View.extend({
      tagName: 'li',
      classNameBindings: ['isAdministrator']
    });
    ```

    When defining a subclass, you can override methods but still access the implementation of your parent class by calling the special `_super()` method:

    ```javascript
    App.Person = Ember.Object.extend({
      say: function(thing) {
        var name = this.get('name');
        alert(name + ' says: ' + thing);
      }
    });

    App.Soldier = App.Person.extend({
      say: function(thing) {
        this._super(thing + ", sir!");
      },
      march: function(numberOfHours) {
        alert(this.get('name') + ' marches for ' + numberOfHours + ' hours.')
      }
    });

    var yehuda = App.Soldier.create({
      name: "Yehuda Katz"
    });

    yehuda.say("Yes");  // alerts "Yehuda Katz says: Yes, sir!"
    ```

    The `create()` on line #17 creates an *instance* of the `App.Soldier` class. The `extend()` on line #8 creates a *subclass* of `App.Person`. Any instance of the `App.Person` class will *not* have the `march()` method.

    You can also pass `Ember.Mixin` classes to add additional properties to the subclass.

    ```javascript
    App.Person = Ember.Object.extend({
      say: function(thing) {
        alert(this.get('name') + ' says: ' + thing);
      }
    });

    App.SingingMixin = Ember.Mixin.create({
      sing: function(thing){
        alert(this.get('name') + ' sings: la la la ' + thing);
      }
    });

    App.BroadwayStar = App.Person.extend(App.SingingMixin, {
      dance: function() {
        alert(this.get('name') + ' dances: tap tap tap tap ');
      }
    });
    ```

    The `App.BroadwayStar` class contains three methods: `say()`, `sing()`, and `dance()`.

    @method extend
    @static

    @param {Ember.Mixin} [mixins]* One or more Ember.Mixin classes
    @param {Object} [arguments]* Object containing values to use within the new class
  */
  extend: function() {
    var Class = makeCtor(), proto;
    Class.ClassMixin = Mixin.create(this.ClassMixin);
    Class.PrototypeMixin = Mixin.create(this.PrototypeMixin);

    Class.ClassMixin.ownerConstructor = Class;
    Class.PrototypeMixin.ownerConstructor = Class;

    reopen.apply(Class.PrototypeMixin, arguments);

    Class.superclass = this;
    Class.__super__  = this.prototype;

    proto = Class.prototype = o_create(this.prototype);
    proto.constructor = Class;
    generateGuid(proto);
    meta(proto).proto = proto; // this will disable observers on prototype

    Class.ClassMixin.apply(Class);
    return Class;
  },

  /**
    Equivalent to doing `extend(arguments).create()`.
    If possible use the normal `create` method instead.

    @method createWithMixins
    @static
    @param [arguments]*
  */
  createWithMixins: function() {
    var C = this;
    if (arguments.length>0) { this._initMixins(arguments); }
    return new C();
  },

  /**
    Creates an instance of a class. Accepts either no arguments, or an object
    containing values to initialize the newly instantiated object with.

    ```javascript
    App.Person = Ember.Object.extend({
      helloWorld: function() {
        alert("Hi, my name is " + this.get('name'));
      }
    });

    var tom = App.Person.create({
      name: 'Tom Dale'
    });

    tom.helloWorld(); // alerts "Hi, my name is Tom Dale".
    ```

    `create` will call the `init` function if defined during
    `Ember.AnyObject.extend`

    If no arguments are passed to `create`, it will not set values to the new
    instance during initialization:

    ```javascript
    var noName = App.Person.create();
    noName.helloWorld(); // alerts undefined
    ```

    NOTE: For performance reasons, you cannot declare methods or computed
    properties during `create`. You should instead declare methods and computed
    properties when using `extend` or use the `createWithMixins` shorthand.

    @method create
    @static
    @param [arguments]*
  */
  create: function() {
    var C = this;
    if (arguments.length>0) { this._initProperties(arguments); }
    return new C();
  },

  /**
    Augments a constructor's prototype with additional
    properties and functions:

    ```javascript
    MyObject = Ember.Object.extend({
      name: 'an object'
    });

    o = MyObject.create();
    o.get('name'); // 'an object'

    MyObject.reopen({
      say: function(msg){
        console.log(msg);
      }
    })

    o2 = MyObject.create();
    o2.say("hello"); // logs "hello"

    o.say("goodbye"); // logs "goodbye"
    ```

    To add functions and properties to the constructor itself,
    see `reopenClass`

    @method reopen
  */
  reopen: function() {
    this.willReopen();
    reopen.apply(this.PrototypeMixin, arguments);
    return this;
  },

  /**
    Augments a constructor's own properties and functions:

    ```javascript
    MyObject = Ember.Object.extend({
      name: 'an object'
    });

    MyObject.reopenClass({
      canBuild: false
    });

    MyObject.canBuild; // false
    o = MyObject.create();
    ```

    In other words, this creates static properties and functions for the class. These are only available on the class
    and not on any instance of that class.

    ```javascript
    App.Person = Ember.Object.extend({
      name : "",
      sayHello : function(){
        alert("Hello. My name is " + this.get('name'));
      }
    });

    App.Person.reopenClass({
      species : "Homo sapiens",
      createPerson: function(newPersonsName){
        return App.Person.create({
          name:newPersonsName
        });
      }
    });

    var tom = App.Person.create({
      name : "Tom Dale"
    });
    var yehuda = App.Person.createPerson("Yehuda Katz");

    tom.sayHello(); // "Hello. My name is Tom Dale"
    yehuda.sayHello(); // "Hello. My name is Yehuda Katz"
    alert(App.Person.species); // "Homo sapiens"
    ```

    Note that `species` and `createPerson` are *not* valid on the `tom` and `yehuda`
    variables. They are only valid on `App.Person`.

    To add functions and properties to instances of
    a constructor by extending the constructor's prototype
    see `reopen`

    @method reopenClass
  */
  reopenClass: function() {
    reopen.apply(this.ClassMixin, arguments);
    applyMixin(this, arguments, false);
    return this;
  },

  detect: function(obj) {
    if ('function' !== typeof obj) { return false; }
    while(obj) {
      if (obj===this) { return true; }
      obj = obj.superclass;
    }
    return false;
  },

  detectInstance: function(obj) {
    return obj instanceof this;
  },

  /**
    In some cases, you may want to annotate computed properties with additional
    metadata about how they function or what values they operate on. For
    example, computed property functions may close over variables that are then
    no longer available for introspection.

    You can pass a hash of these values to a computed property like this:

    ```javascript
    person: function() {
      var personId = this.get('personId');
      return App.Person.create({ id: personId });
    }.property().meta({ type: App.Person })
    ```

    Once you've done this, you can retrieve the values saved to the computed
    property from your class like this:

    ```javascript
    MyClass.metaForProperty('person');
    ```

    This will return the original hash that was passed to `meta()`.

    @method metaForProperty
    @param key {String} property name
  */
  metaForProperty: function(key) {
    var desc = meta(this.proto(), false).descs[key];

    Ember.assert("metaForProperty() could not find a computed property with key '"+key+"'.", !!desc && desc instanceof Ember.ComputedProperty);
    return desc._meta || {};
  },

  /**
    Iterate over each computed property for the class, passing its name
    and any associated metadata (see `metaForProperty`) to the callback.

    @method eachComputedProperty
    @param {Function} callback
    @param {Object} binding
  */
  eachComputedProperty: function(callback, binding) {
    var proto = this.proto(),
        descs = meta(proto).descs,
        empty = {},
        property;

    for (var name in descs) {
      property = descs[name];

      if (property instanceof Ember.ComputedProperty) {
        callback.call(binding || this, name, property._meta || empty);
      }
    }
  }

});

ClassMixin.ownerConstructor = CoreObject;

if (Ember.config.overrideClassMixin) {
  Ember.config.overrideClassMixin(ClassMixin);
}

CoreObject.ClassMixin = ClassMixin;
ClassMixin.apply(CoreObject);

Ember.CoreObject = CoreObject;

})();



(function() {
/**
@module ember
@submodule ember-runtime
*/

/**
  `Ember.Object` is the main base class for all Ember objects. It is a subclass
  of `Ember.CoreObject` with the `Ember.Observable` mixin applied. For details,
  see the documentation for each of these.

  @class Object
  @namespace Ember
  @extends Ember.CoreObject
  @uses Ember.Observable
*/
Ember.Object = Ember.CoreObject.extend(Ember.Observable);
Ember.Object.toString = function() { return "Ember.Object"; };

})();



(function() {
/**
@module ember
@submodule ember-runtime
*/

var get = Ember.get, indexOf = Ember.ArrayPolyfills.indexOf;

/**
  A Namespace is an object usually used to contain other objects or methods
  such as an application or framework. Create a namespace anytime you want
  to define one of these new containers.

  # Example Usage

  ```javascript
  MyFramework = Ember.Namespace.create({
    VERSION: '1.0.0'
  });
  ```

  @class Namespace
  @namespace Ember
  @extends Ember.Object
*/
var Namespace = Ember.Namespace = Ember.Object.extend({
  isNamespace: true,

  init: function() {
    Ember.Namespace.NAMESPACES.push(this);
    Ember.Namespace.PROCESSED = false;
  },

  toString: function() {
    var name = get(this, 'name');
    if (name) { return name; }

    findNamespaces();
    return this[Ember.GUID_KEY+'_name'];
  },

  nameClasses: function() {
    processNamespace([this.toString()], this, {});
  },

  destroy: function() {
    var namespaces = Ember.Namespace.NAMESPACES;
    Ember.lookup[this.toString()] = undefined;
    namespaces.splice(indexOf.call(namespaces, this), 1);
    this._super();
  }
});

Namespace.reopenClass({
  NAMESPACES: [Ember],
  NAMESPACES_BY_ID: {},
  PROCESSED: false,
  processAll: processAllNamespaces,
  byName: function(name) {
    if (!Ember.BOOTED) {
      processAllNamespaces();
    }

    return NAMESPACES_BY_ID[name];
  }
});

var NAMESPACES_BY_ID = Namespace.NAMESPACES_BY_ID;

var hasOwnProp = ({}).hasOwnProperty,
    guidFor = Ember.guidFor;

function processNamespace(paths, root, seen) {
  var idx = paths.length;

  NAMESPACES_BY_ID[paths.join('.')] = root;

  // Loop over all of the keys in the namespace, looking for classes
  for(var key in root) {
    if (!hasOwnProp.call(root, key)) { continue; }
    var obj = root[key];

    // If we are processing the `Ember` namespace, for example, the
    // `paths` will start with `["Ember"]`. Every iteration through
    // the loop will update the **second** element of this list with
    // the key, so processing `Ember.View` will make the Array
    // `['Ember', 'View']`.
    paths[idx] = key;

    // If we have found an unprocessed class
    if (obj && obj.toString === classToString) {
      // Replace the class' `toString` with the dot-separated path
      // and set its `NAME_KEY`
      obj.toString = makeToString(paths.join('.'));
      obj[NAME_KEY] = paths.join('.');

    // Support nested namespaces
    } else if (obj && obj.isNamespace) {
      // Skip aliased namespaces
      if (seen[guidFor(obj)]) { continue; }
      seen[guidFor(obj)] = true;

      // Process the child namespace
      processNamespace(paths, obj, seen);
    }
  }

  paths.length = idx; // cut out last item
}

function findNamespaces() {
  var Namespace = Ember.Namespace, lookup = Ember.lookup, obj, isNamespace;

  if (Namespace.PROCESSED) { return; }

  for (var prop in lookup) {
    // These don't raise exceptions but can cause warnings
    if (prop === "parent" || prop === "top" || prop === "frameElement" || prop === "webkitStorageInfo") { continue; }

    //  get(window.globalStorage, 'isNamespace') would try to read the storage for domain isNamespace and cause exception in Firefox.
    // globalStorage is a storage obsoleted by the WhatWG storage specification. See https://developer.mozilla.org/en/DOM/Storage#globalStorage
    if (prop === "globalStorage" && lookup.StorageList && lookup.globalStorage instanceof lookup.StorageList) { continue; }
    // Unfortunately, some versions of IE don't support window.hasOwnProperty
    if (lookup.hasOwnProperty && !lookup.hasOwnProperty(prop)) { continue; }

    // At times we are not allowed to access certain properties for security reasons.
    // There are also times where even if we can access them, we are not allowed to access their properties.
    try {
      obj = Ember.lookup[prop];
      isNamespace = obj && obj.isNamespace;
    } catch (e) {
      continue;
    }

    if (isNamespace) {
      Ember.deprecate("Namespaces should not begin with lowercase.", /^[A-Z]/.test(prop));
      obj[NAME_KEY] = prop;
    }
  }
}

var NAME_KEY = Ember.NAME_KEY = Ember.GUID_KEY + '_name';

function superClassString(mixin) {
  var superclass = mixin.superclass;
  if (superclass) {
    if (superclass[NAME_KEY]) { return superclass[NAME_KEY]; }
    else { return superClassString(superclass); }
  } else {
    return;
  }
}

function classToString() {
  if (!Ember.BOOTED && !this[NAME_KEY]) {
    processAllNamespaces();
  }

  var ret;

  if (this[NAME_KEY]) {
    ret = this[NAME_KEY];
  } else if (this._toString) {
    ret = this._toString; 
  } else {
    var str = superClassString(this);
    if (str) {
      ret = "(subclass of " + str + ")";
    } else {
      ret = "(unknown mixin)";
    }
    this.toString = makeToString(ret);
  }

  return ret;
}

function processAllNamespaces() {
  var unprocessedNamespaces = !Namespace.PROCESSED,
      unprocessedMixins = Ember.anyUnprocessedMixins;

  if (unprocessedNamespaces) {
    findNamespaces();
    Namespace.PROCESSED = true;
  }

  if (unprocessedNamespaces || unprocessedMixins) {
    var namespaces = Namespace.NAMESPACES, namespace;
    for (var i=0, l=namespaces.length; i<l; i++) {
      namespace = namespaces[i];
      processNamespace([namespace.toString()], namespace, {});
    }

    Ember.anyUnprocessedMixins = false;
  }
}

function makeToString(ret) {
  return function() { return ret; };
}

Ember.Mixin.prototype.toString = classToString;

})();



(function() {
/**
@module ember
@submodule ember-runtime
*/

var get = Ember.get,
    set = Ember.set,
    fmt = Ember.String.fmt,
    addBeforeObserver = Ember.addBeforeObserver,
    addObserver = Ember.addObserver,
    removeBeforeObserver = Ember.removeBeforeObserver,
    removeObserver = Ember.removeObserver,
    propertyWillChange = Ember.propertyWillChange,
    propertyDidChange = Ember.propertyDidChange,
    meta = Ember.meta,
    defineProperty = Ember.defineProperty;

function contentPropertyWillChange(content, contentKey) {
  var key = contentKey.slice(8); // remove "content."
  if (key in this) { return; }  // if shadowed in proxy
  propertyWillChange(this, key);
}

function contentPropertyDidChange(content, contentKey) {
  var key = contentKey.slice(8); // remove "content."
  if (key in this) { return; } // if shadowed in proxy
  propertyDidChange(this, key);
}

/**
  `Ember.ObjectProxy` forwards all properties not defined by the proxy itself
  to a proxied `content` object.

  ```javascript
  object = Ember.Object.create({
    name: 'Foo'
  });

  proxy = Ember.ObjectProxy.create({
    content: object
  });

  // Access and change existing properties
  proxy.get('name')          // 'Foo'
  proxy.set('name', 'Bar');
  object.get('name')         // 'Bar'

  // Create new 'description' property on `object`
  proxy.set('description', 'Foo is a whizboo baz');
  object.get('description')  // 'Foo is a whizboo baz'
  ```

  While `content` is unset, setting a property to be delegated will throw an
  Error.

  ```javascript
  proxy = Ember.ObjectProxy.create({
    content: null,
    flag: null
  });
  proxy.set('flag', true);
  proxy.get('flag');         // true
  proxy.get('foo');          // undefined
  proxy.set('foo', 'data');  // throws Error
  ```

  Delegated properties can be bound to and will change when content is updated.

  Computed properties on the proxy itself can depend on delegated properties.

  ```javascript
  ProxyWithComputedProperty = Ember.ObjectProxy.extend({
    fullName: function () {
      var firstName = this.get('firstName'),
          lastName = this.get('lastName');
      if (firstName && lastName) {
        return firstName + ' ' + lastName;
      }
      return firstName || lastName;
    }.property('firstName', 'lastName')
  });

  proxy = ProxyWithComputedProperty.create();

  proxy.get('fullName');  // undefined
  proxy.set('content', {
    firstName: 'Tom', lastName: 'Dale'
  }); // triggers property change for fullName on proxy

  proxy.get('fullName');  // 'Tom Dale'
  ```

  @class ObjectProxy
  @namespace Ember
  @extends Ember.Object
*/
Ember.ObjectProxy = Ember.Object.extend(/** @scope Ember.ObjectProxy.prototype */ {
  /**
    The object whose properties will be forwarded.

    @property content
    @type Ember.Object
    @default null
  */
  content: null,
  _contentDidChange: Ember.observer('content', function() {
    Ember.assert("Can't set ObjectProxy's content to itself", this.get('content') !== this);
  }),

  isTruthy: Ember.computed.bool('content'),

  _debugContainerKey: null,

  willWatchProperty: function (key) {
    var contentKey = 'content.' + key;
    addBeforeObserver(this, contentKey, null, contentPropertyWillChange);
    addObserver(this, contentKey, null, contentPropertyDidChange);
  },

  didUnwatchProperty: function (key) {
    var contentKey = 'content.' + key;
    removeBeforeObserver(this, contentKey, null, contentPropertyWillChange);
    removeObserver(this, contentKey, null, contentPropertyDidChange);
  },

  unknownProperty: function (key) {
    var content = get(this, 'content');
    if (content) {
      return get(content, key);
    }
  },

  setUnknownProperty: function (key, value) {
    var m = meta(this);
    if (m.proto === this) {
      // if marked as prototype then just defineProperty
      // rather than delegate
      defineProperty(this, key, null, value);
      return value;
    }

    var content = get(this, 'content');
    Ember.assert(fmt("Cannot delegate set('%@', %@) to the 'content' property of object proxy %@: its 'content' is undefined.", [key, value, this]), content);
    return set(content, key, value);
  }

});

})();



(function() {
/**
@module ember
@submodule ember-runtime
*/

// ..........................................................
// HELPERS
//

var get = Ember.get, set = Ember.set;
var a_slice = Array.prototype.slice;
var a_indexOf = Ember.EnumerableUtils.indexOf;

var contexts = [];

function popCtx() {
  return contexts.length===0 ? {} : contexts.pop();
}

function pushCtx(ctx) {
  contexts.push(ctx);
  return null;
}

function iter(key, value) {
  var valueProvided = arguments.length === 2;

  function i(item) {
    var cur = get(item, key);
    return valueProvided ? value===cur : !!cur;
  }
  return i ;
}

/**
  This mixin defines the common interface implemented by enumerable objects
  in Ember. Most of these methods follow the standard Array iteration
  API defined up to JavaScript 1.8 (excluding language-specific features that
  cannot be emulated in older versions of JavaScript).

  This mixin is applied automatically to the Array class on page load, so you
  can use any of these methods on simple arrays. If Array already implements
  one of these methods, the mixin will not override them.

  ## Writing Your Own Enumerable

  To make your own custom class enumerable, you need two items:

  1. You must have a length property. This property should change whenever
     the number of items in your enumerable object changes. If you using this
     with an `Ember.Object` subclass, you should be sure to change the length
     property using `set().`

  2. You must implement `nextObject().` See documentation.

  Once you have these two methods implement, apply the `Ember.Enumerable` mixin
  to your class and you will be able to enumerate the contents of your object
  like any other collection.

  ## Using Ember Enumeration with Other Libraries

  Many other libraries provide some kind of iterator or enumeration like
  facility. This is often where the most common API conflicts occur.
  Ember's API is designed to be as friendly as possible with other
  libraries by implementing only methods that mostly correspond to the
  JavaScript 1.8 API.

  @class Enumerable
  @namespace Ember
  @since Ember 0.9
*/
Ember.Enumerable = Ember.Mixin.create({

  /**
    Implement this method to make your class enumerable.

    This method will be call repeatedly during enumeration. The index value
    will always begin with 0 and increment monotonically. You don't have to
    rely on the index value to determine what object to return, but you should
    always check the value and start from the beginning when you see the
    requested index is 0.

    The `previousObject` is the object that was returned from the last call
    to `nextObject` for the current iteration. This is a useful way to
    manage iteration if you are tracing a linked list, for example.

    Finally the context parameter will always contain a hash you can use as
    a "scratchpad" to maintain any other state you need in order to iterate
    properly. The context object is reused and is not reset between
    iterations so make sure you setup the context with a fresh state whenever
    the index parameter is 0.

    Generally iterators will continue to call `nextObject` until the index
    reaches the your current length-1. If you run out of data before this
    time for some reason, you should simply return undefined.

    The default implementation of this method simply looks up the index.
    This works great on any Array-like objects.

    @method nextObject
    @param {Number} index the current index of the iteration
    @param {Object} previousObject the value returned by the last call to
      `nextObject`.
    @param {Object} context a context object you can use to maintain state.
    @return {Object} the next object in the iteration or undefined
  */
  nextObject: Ember.required(Function),

  /**
    Helper method returns the first object from a collection. This is usually
    used by bindings and other parts of the framework to extract a single
    object if the enumerable contains only one item.

    If you override this method, you should implement it so that it will
    always return the same value each time it is called. If your enumerable
    contains only one object, this method should always return that object.
    If your enumerable is empty, this method should return `undefined`.

    ```javascript
    var arr = ["a", "b", "c"];
    arr.get('firstObject');  // "a"

    var arr = [];
    arr.get('firstObject');  // undefined
    ```

    @property firstObject
    @return {Object} the object or undefined
  */
  firstObject: Ember.computed(function() {
    if (get(this, 'length')===0) return undefined ;

    // handle generic enumerables
    var context = popCtx(), ret;
    ret = this.nextObject(0, null, context);
    pushCtx(context);
    return ret ;
  }).property('[]'),

  /**
    Helper method returns the last object from a collection. If your enumerable
    contains only one object, this method should always return that object.
    If your enumerable is empty, this method should return `undefined`.

    ```javascript
    var arr = ["a", "b", "c"];
    arr.get('lastObject');  // "c"

    var arr = [];
    arr.get('lastObject');  // undefined
    ```

    @property lastObject
    @return {Object} the last object or undefined
  */
  lastObject: Ember.computed(function() {
    var len = get(this, 'length');
    if (len===0) return undefined ;
    var context = popCtx(), idx=0, cur, last = null;
    do {
      last = cur;
      cur = this.nextObject(idx++, last, context);
    } while (cur !== undefined);
    pushCtx(context);
    return last;
  }).property('[]'),

  /**
    Returns `true` if the passed object can be found in the receiver. The
    default version will iterate through the enumerable until the object
    is found. You may want to override this with a more efficient version.

    ```javascript
    var arr = ["a", "b", "c"];
    arr.contains("a"); // true
    arr.contains("z"); // false
    ```

    @method contains
    @param {Object} obj The object to search for.
    @return {Boolean} `true` if object is found in enumerable.
  */
  contains: function(obj) {
    return this.find(function(item) { return item===obj; }) !== undefined;
  },

  /**
    Iterates through the enumerable, calling the passed function on each
    item. This method corresponds to the `forEach()` method defined in
    JavaScript 1.6.

    The callback method you provide should have the following signature (all
    parameters are optional):

    ```javascript
    function(item, index, enumerable);
    ```

    - `item` is the current item in the iteration.
    - `index` is the current index in the iteration.
    - `enumerable` is the enumerable object itself.

    Note that in addition to a callback, you can also pass an optional target
    object that will be set as `this` on the context. This is a good way
    to give your iterator function access to the current object.

    @method forEach
    @param {Function} callback The callback to execute
    @param {Object} [target] The target object to use
    @return {Object} receiver
  */
  forEach: function(callback, target) {
    if (typeof callback !== "function") throw new TypeError() ;
    var len = get(this, 'length'), last = null, context = popCtx();

    if (target === undefined) target = null;

    for(var idx=0;idx<len;idx++) {
      var next = this.nextObject(idx, last, context) ;
      callback.call(target, next, idx, this);
      last = next ;
    }
    last = null ;
    context = pushCtx(context);
    return this ;
  },

  /**
    Alias for `mapBy`

    @method getEach
    @param {String} key name of the property
    @return {Array} The mapped array.
  */
  getEach: function(key) {
    return this.mapBy(key);
  },

  /**
    Sets the value on the named property for each member. This is more
    efficient than using other methods defined on this helper. If the object
    implements Ember.Observable, the value will be changed to `set(),` otherwise
    it will be set directly. `null` objects are skipped.

    @method setEach
    @param {String} key The key to set
    @param {Object} value The object to set
    @return {Object} receiver
  */
  setEach: function(key, value) {
    return this.forEach(function(item) {
      set(item, key, value);
    });
  },

  /**
    Maps all of the items in the enumeration to another value, returning
    a new array. This method corresponds to `map()` defined in JavaScript 1.6.

    The callback method you provide should have the following signature (all
    parameters are optional):

    ```javascript
    function(item, index, enumerable);
    ```

    - `item` is the current item in the iteration.
    - `index` is the current index in the iteration.
    - `enumerable` is the enumerable object itself.

    It should return the mapped value.

    Note that in addition to a callback, you can also pass an optional target
    object that will be set as `this` on the context. This is a good way
    to give your iterator function access to the current object.

    @method map
    @param {Function} callback The callback to execute
    @param {Object} [target] The target object to use
    @return {Array} The mapped array.
  */
  map: function(callback, target) {
    var ret = Ember.A();
    this.forEach(function(x, idx, i) {
      ret[idx] = callback.call(target, x, idx,i);
    });
    return ret ;
  },

  /**
    Similar to map, this specialized function returns the value of the named
    property on all items in the enumeration.

    @method mapBy
    @param {String} key name of the property
    @return {Array} The mapped array.
  */
  mapBy: function(key) {
    return this.map(function(next) {
      return get(next, key);
    });
  },

  /**
    Similar to map, this specialized function returns the value of the named
    property on all items in the enumeration.

    @method mapProperty
    @param {String} key name of the property
    @return {Array} The mapped array.
    @deprecated Use `mapBy` instead
  */

  mapProperty: Ember.aliasMethod('mapBy'),

  /**
    Returns an array with all of the items in the enumeration that the passed
    function returns true for. This method corresponds to `filter()` defined in
    JavaScript 1.6.

    The callback method you provide should have the following signature (all
    parameters are optional):

    ```javascript
    function(item, index, enumerable);
    ```

    - `item` is the current item in the iteration.
    - `index` is the current index in the iteration.
    - `enumerable` is the enumerable object itself.

    It should return the `true` to include the item in the results, `false`
    otherwise.

    Note that in addition to a callback, you can also pass an optional target
    object that will be set as `this` on the context. This is a good way
    to give your iterator function access to the current object.

    @method filter
    @param {Function} callback The callback to execute
    @param {Object} [target] The target object to use
    @return {Array} A filtered array.
  */
  filter: function(callback, target) {
    var ret = Ember.A();
    this.forEach(function(x, idx, i) {
      if (callback.call(target, x, idx, i)) ret.push(x);
    });
    return ret ;
  },

  /**
    Returns an array with all of the items in the enumeration where the passed
    function returns false for. This method is the inverse of filter().

    The callback method you provide should have the following signature (all
    parameters are optional):

    ```javascript
    function(item, index, enumerable);
    ```

    - *item* is the current item in the iteration.
    - *index* is the current index in the iteration
    - *enumerable* is the enumerable object itself.

    It should return the a falsey value to include the item in the results.

    Note that in addition to a callback, you can also pass an optional target
    object that will be set as "this" on the context. This is a good way
    to give your iterator function access to the current object.

    @method reject
    @param {Function} callback The callback to execute
    @param {Object} [target] The target object to use
    @return {Array} A rejected array.
   */
  reject: function(callback, target) {
    return this.filter(function() {
      return !(callback.apply(target, arguments));
    });
  },

  /**
    Returns an array with just the items with the matched property. You
    can pass an optional second argument with the target value. Otherwise
    this will match any property that evaluates to `true`.

    @method filterBy
    @param {String} key the property to test
    @param {String} [value] optional value to test against.
    @return {Array} filtered array
  */
  filterBy: function(key, value) {
    return this.filter(iter.apply(this, arguments));
  },

  /**
    Returns an array with just the items with the matched property. You
    can pass an optional second argument with the target value. Otherwise
    this will match any property that evaluates to `true`.

    @method filterProperty
    @param {String} key the property to test
    @param {String} [value] optional value to test against.
    @return {Array} filtered array
    @deprecated Use `filterBy` instead
  */
  filterProperty: Ember.aliasMethod('filterBy'),

  /**
    Returns an array with the items that do not have truthy values for
    key.  You can pass an optional second argument with the target value.  Otherwise
    this will match any property that evaluates to false.

    @method rejectBy
    @param {String} key the property to test
    @param {String} [value] optional value to test against.
    @return {Array} rejected array
  */
  rejectBy: function(key, value) {
    var exactValue = function(item) { return get(item, key) === value; },
        hasValue = function(item) { return !!get(item, key); },
        use = (arguments.length === 2 ? exactValue : hasValue);

    return this.reject(use);
  },

  /**
    Returns an array with the items that do not have truthy values for
    key.  You can pass an optional second argument with the target value.  Otherwise
    this will match any property that evaluates to false.

    @method rejectProperty
    @param {String} key the property to test
    @param {String} [value] optional value to test against.
    @return {Array} rejected array
    @deprecated Use `rejectBy` instead
  */
  rejectProperty: Ember.aliasMethod('rejectBy'),

  /**
    Returns the first item in the array for which the callback returns true.
    This method works similar to the `filter()` method defined in JavaScript 1.6
    except that it will stop working on the array once a match is found.

    The callback method you provide should have the following signature (all
    parameters are optional):

    ```javascript
    function(item, index, enumerable);
    ```

    - `item` is the current item in the iteration.
    - `index` is the current index in the iteration.
    - `enumerable` is the enumerable object itself.

    It should return the `true` to include the item in the results, `false`
    otherwise.

    Note that in addition to a callback, you can also pass an optional target
    object that will be set as `this` on the context. This is a good way
    to give your iterator function access to the current object.

    @method find
    @param {Function} callback The callback to execute
    @param {Object} [target] The target object to use
    @return {Object} Found item or `undefined`.
  */
  find: function(callback, target) {
    var len = get(this, 'length') ;
    if (target === undefined) target = null;

    var last = null, next, found = false, ret ;
    var context = popCtx();
    for(var idx=0;idx<len && !found;idx++) {
      next = this.nextObject(idx, last, context) ;
      if (found = callback.call(target, next, idx, this)) ret = next ;
      last = next ;
    }
    next = last = null ;
    context = pushCtx(context);
    return ret ;
  },

  /**
    Returns the first item with a property matching the passed value. You
    can pass an optional second argument with the target value. Otherwise
    this will match any property that evaluates to `true`.

    This method works much like the more generic `find()` method.

    @method findBy
    @param {String} key the property to test
    @param {String} [value] optional value to test against.
    @return {Object} found item or `undefined`
  */
  findBy: function(key, value) {
    return this.find(iter.apply(this, arguments));
  },

  /**
    Returns the first item with a property matching the passed value. You
    can pass an optional second argument with the target value. Otherwise
    this will match any property that evaluates to `true`.

    This method works much like the more generic `find()` method.

    @method findProperty
    @param {String} key the property to test
    @param {String} [value] optional value to test against.
    @return {Object} found item or `undefined`
    @deprecated Use `findBy` instead
  */
  findProperty: Ember.aliasMethod('findBy'),

  /**
    Returns `true` if the passed function returns true for every item in the
    enumeration. This corresponds with the `every()` method in JavaScript 1.6.

    The callback method you provide should have the following signature (all
    parameters are optional):

    ```javascript
    function(item, index, enumerable);
    ```

    - `item` is the current item in the iteration.
    - `index` is the current index in the iteration.
    - `enumerable` is the enumerable object itself.

    It should return the `true` or `false`.

    Note that in addition to a callback, you can also pass an optional target
    object that will be set as `this` on the context. This is a good way
    to give your iterator function access to the current object.

    Example Usage:

    ```javascript
    if (people.every(isEngineer)) { Paychecks.addBigBonus(); }
    ```

    @method every
    @param {Function} callback The callback to execute
    @param {Object} [target] The target object to use
    @return {Boolean}
  */
  every: function(callback, target) {
    return !this.find(function(x, idx, i) {
      return !callback.call(target, x, idx, i);
    });
  },

  /**
    @method everyBy
    @param {String} key the property to test
    @param {String} [value] optional value to test against.
    @deprecated Use `isEvery` instead
    @return {Boolean}
  */
  everyBy: Ember.aliasMethod('isEvery'),

  /**
    @method everyProperty
    @param {String} key the property to test
    @param {String} [value] optional value to test against.
    @deprecated Use `isEvery` instead
    @return {Boolean}
  */
  everyProperty: Ember.aliasMethod('isEvery'),

  /**
    Returns `true` if the passed property resolves to `true` for all items in
    the enumerable. This method is often simpler/faster than using a callback.

    @method isEvery
    @param {String} key the property to test
    @param {String} [value] optional value to test against.
    @return {Boolean}
  */
  isEvery: function(key, value) {
    return this.every(iter.apply(this, arguments));
  },

  /**
    Returns `true` if the passed function returns true for any item in the
    enumeration. This corresponds with the `some()` method in JavaScript 1.6.

    The callback method you provide should have the following signature (all
    parameters are optional):

    ```javascript
    function(item, index, enumerable);
    ```

    - `item` is the current item in the iteration.
    - `index` is the current index in the iteration.
    - `enumerable` is the enumerable object itself.

    It should return the `true` to include the item in the results, `false`
    otherwise.

    Note that in addition to a callback, you can also pass an optional target
    object that will be set as `this` on the context. This is a good way
    to give your iterator function access to the current object.

    Usage Example:

    ```javascript
    if (people.any(isManager)) { Paychecks.addBiggerBonus(); }
    ```

    @method any
    @param {Function} callback The callback to execute
    @param {Object} [target] The target object to use
    @return {Boolean} `true` if the passed function returns `true` for any item
  */
  any: function(callback, target) {
    var found = this.find(function(x, idx, i) {
      return !!callback.call(target, x, idx, i);
    });

    return typeof found !== 'undefined';
  },

  /**
    Returns `true` if the passed function returns true for any item in the
    enumeration. This corresponds with the `some()` method in JavaScript 1.6.

    The callback method you provide should have the following signature (all
    parameters are optional):

    ```javascript
    function(item, index, enumerable);
    ```

    - `item` is the current item in the iteration.
    - `index` is the current index in the iteration.
    - `enumerable` is the enumerable object itself.

    It should return the `true` to include the item in the results, `false`
    otherwise.

    Note that in addition to a callback, you can also pass an optional target
    object that will be set as `this` on the context. This is a good way
    to give your iterator function access to the current object.

    Usage Example:

    ```javascript
    if (people.some(isManager)) { Paychecks.addBiggerBonus(); }
    ```

    @method some
    @param {Function} callback The callback to execute
    @param {Object} [target] The target object to use
    @return {Boolean} `true` if the passed function returns `true` for any item
    @deprecated Use `any` instead
  */
  some: Ember.aliasMethod('any'),

  /**
    Returns `true` if the passed property resolves to `true` for any item in
    the enumerable. This method is often simpler/faster than using a callback.

    @method isAny
    @param {String} key the property to test
    @param {String} [value] optional value to test against.
    @return {Boolean} `true` if the passed function returns `true` for any item
  */
  isAny: function(key, value) {
    return this.any(iter.apply(this, arguments));
  },

  /**
    @method anyBy
    @param {String} key the property to test
    @param {String} [value] optional value to test against.
    @return {Boolean} `true` if the passed function returns `true` for any item
    @deprecated Use `isAny` instead
  */
  anyBy: Ember.aliasMethod('isAny'),

  /**
    @method someProperty
    @param {String} key the property to test
    @param {String} [value] optional value to test against.
    @return {Boolean} `true` if the passed function returns `true` for any item
    @deprecated Use `isAny` instead
  */
  someProperty: Ember.aliasMethod('isAny'),

  /**
    This will combine the values of the enumerator into a single value. It
    is a useful way to collect a summary value from an enumeration. This
    corresponds to the `reduce()` method defined in JavaScript 1.8.

    The callback method you provide should have the following signature (all
    parameters are optional):

    ```javascript
    function(previousValue, item, index, enumerable);
    ```

    - `previousValue` is the value returned by the last call to the iterator.
    - `item` is the current item in the iteration.
    - `index` is the current index in the iteration.
    - `enumerable` is the enumerable object itself.

    Return the new cumulative value.

    In addition to the callback you can also pass an `initialValue`. An error
    will be raised if you do not pass an initial value and the enumerator is
    empty.

    Note that unlike the other methods, this method does not allow you to
    pass a target object to set as this for the callback. It's part of the
    spec. Sorry.

    @method reduce
    @param {Function} callback The callback to execute
    @param {Object} initialValue Initial value for the reduce
    @param {String} reducerProperty internal use only.
    @return {Object} The reduced value.
  */
  reduce: function(callback, initialValue, reducerProperty) {
    if (typeof callback !== "function") { throw new TypeError(); }

    var ret = initialValue;

    this.forEach(function(item, i) {
      ret = callback(ret, item, i, this, reducerProperty);
    }, this);

    return ret;
  },

  /**
    Invokes the named method on every object in the receiver that
    implements it. This method corresponds to the implementation in
    Prototype 1.6.

    @method invoke
    @param {String} methodName the name of the method
    @param {Object...} args optional arguments to pass as well.
    @return {Array} return values from calling invoke.
  */
  invoke: function(methodName) {
    var args, ret = Ember.A();
    if (arguments.length>1) args = a_slice.call(arguments, 1);

    this.forEach(function(x, idx) {
      var method = x && x[methodName];
      if ('function' === typeof method) {
        ret[idx] = args ? method.apply(x, args) : x[methodName]();
      }
    }, this);

    return ret;
  },

  /**
    Simply converts the enumerable into a genuine array. The order is not
    guaranteed. Corresponds to the method implemented by Prototype.

    @method toArray
    @return {Array} the enumerable as an array.
  */
  toArray: function() {
    var ret = Ember.A();
    this.forEach(function(o, idx) { ret[idx] = o; });
    return ret ;
  },

  /**
    Returns a copy of the array with all null and undefined elements removed.

    ```javascript
    var arr = ["a", null, "c", undefined];
    arr.compact();  // ["a", "c"]
    ```

    @method compact
    @return {Array} the array without null and undefined elements.
  */
  compact: function() {
    return this.filter(function(value) { return value != null; });
  },

  /**
    Returns a new enumerable that excludes the passed value. The default
    implementation returns an array regardless of the receiver type unless
    the receiver does not contain the value.

    ```javascript
    var arr = ["a", "b", "a", "c"];
    arr.without("a");  // ["b", "c"]
    ```

    @method without
    @param {Object} value
    @return {Ember.Enumerable}
  */
  without: function(value) {
    if (!this.contains(value)) return this; // nothing to do
    var ret = Ember.A();
    this.forEach(function(k) {
      if (k !== value) ret[ret.length] = k;
    }) ;
    return ret ;
  },

  /**
    Returns a new enumerable that contains only unique values. The default
    implementation returns an array regardless of the receiver type.

    ```javascript
    var arr = ["a", "a", "b", "b"];
    arr.uniq();  // ["a", "b"]
    ```

    @method uniq
    @return {Ember.Enumerable}
  */
  uniq: function() {
    var ret = Ember.A();
    this.forEach(function(k) {
      if (a_indexOf(ret, k)<0) ret.push(k);
    });
    return ret;
  },

  /**
    This property will trigger anytime the enumerable's content changes.
    You can observe this property to be notified of changes to the enumerables
    content.

    For plain enumerables, this property is read only. `Ember.Array` overrides
    this method.

    @property []
    @type Ember.Array
    @return this
  */
  '[]': Ember.computed(function(key, value) {
    return this;
  }),

  // ..........................................................
  // ENUMERABLE OBSERVERS
  //

  /**
    Registers an enumerable observer. Must implement `Ember.EnumerableObserver`
    mixin.

    @method addEnumerableObserver
    @param {Object} target
    @param {Hash} [opts]
    @return this
  */
  addEnumerableObserver: function(target, opts) {
    var willChange = (opts && opts.willChange) || 'enumerableWillChange',
        didChange  = (opts && opts.didChange) || 'enumerableDidChange';

    var hasObservers = get(this, 'hasEnumerableObservers');
    if (!hasObservers) Ember.propertyWillChange(this, 'hasEnumerableObservers');
    Ember.addListener(this, '@enumerable:before', target, willChange);
    Ember.addListener(this, '@enumerable:change', target, didChange);
    if (!hasObservers) Ember.propertyDidChange(this, 'hasEnumerableObservers');
    return this;
  },

  /**
    Removes a registered enumerable observer.

    @method removeEnumerableObserver
    @param {Object} target
    @param {Hash} [opts]
    @return this
  */
  removeEnumerableObserver: function(target, opts) {
    var willChange = (opts && opts.willChange) || 'enumerableWillChange',
        didChange  = (opts && opts.didChange) || 'enumerableDidChange';

    var hasObservers = get(this, 'hasEnumerableObservers');
    if (hasObservers) Ember.propertyWillChange(this, 'hasEnumerableObservers');
    Ember.removeListener(this, '@enumerable:before', target, willChange);
    Ember.removeListener(this, '@enumerable:change', target, didChange);
    if (hasObservers) Ember.propertyDidChange(this, 'hasEnumerableObservers');
    return this;
  },

  /**
    Becomes true whenever the array currently has observers watching changes
    on the array.

    @property hasEnumerableObservers
    @type Boolean
  */
  hasEnumerableObservers: Ember.computed(function() {
    return Ember.hasListeners(this, '@enumerable:change') || Ember.hasListeners(this, '@enumerable:before');
  }),


  /**
    Invoke this method just before the contents of your enumerable will
    change. You can either omit the parameters completely or pass the objects
    to be removed or added if available or just a count.

    @method enumerableContentWillChange
    @param {Ember.Enumerable|Number} removing An enumerable of the objects to
      be removed or the number of items to be removed.
    @param {Ember.Enumerable|Number} adding An enumerable of the objects to be
      added or the number of items to be added.
    @chainable
  */
  enumerableContentWillChange: function(removing, adding) {

    var removeCnt, addCnt, hasDelta;

    if ('number' === typeof removing) removeCnt = removing;
    else if (removing) removeCnt = get(removing, 'length');
    else removeCnt = removing = -1;

    if ('number' === typeof adding) addCnt = adding;
    else if (adding) addCnt = get(adding,'length');
    else addCnt = adding = -1;

    hasDelta = addCnt<0 || removeCnt<0 || addCnt-removeCnt!==0;

    if (removing === -1) removing = null;
    if (adding   === -1) adding   = null;

    Ember.propertyWillChange(this, '[]');
    if (hasDelta) Ember.propertyWillChange(this, 'length');
    Ember.sendEvent(this, '@enumerable:before', [this, removing, adding]);

    return this;
  },

  /**
    Invoke this method when the contents of your enumerable has changed.
    This will notify any observers watching for content changes. If your are
    implementing an ordered enumerable (such as an array), also pass the
    start and end values where the content changed so that it can be used to
    notify range observers.

    @method enumerableContentDidChange
    @param {Ember.Enumerable|Number} removing An enumerable of the objects to
      be removed or the number of items to be removed.
    @param {Ember.Enumerable|Number} adding  An enumerable of the objects to
      be added or the number of items to be added.
    @chainable
  */
  enumerableContentDidChange: function(removing, adding) {
    var removeCnt, addCnt, hasDelta;

    if ('number' === typeof removing) removeCnt = removing;
    else if (removing) removeCnt = get(removing, 'length');
    else removeCnt = removing = -1;

    if ('number' === typeof adding) addCnt = adding;
    else if (adding) addCnt = get(adding, 'length');
    else addCnt = adding = -1;

    hasDelta = addCnt<0 || removeCnt<0 || addCnt-removeCnt!==0;

    if (removing === -1) removing = null;
    if (adding   === -1) adding   = null;

    Ember.sendEvent(this, '@enumerable:change', [this, removing, adding]);
    if (hasDelta) Ember.propertyDidChange(this, 'length');
    Ember.propertyDidChange(this, '[]');

    return this ;
  },

  /**
    Converts the enumerable into an array and sorts by the keys
    specified in the argument.

    You may provide multiple arguments to sort by multiple properties.

    @method sortBy
    @param {String} property name(s) to sort on
    @return {Array} The sorted array.
    */
  sortBy: function() {
    var sortKeys = arguments;
    return this.toArray().sort(function(a, b){
      for(var i = 0; i < sortKeys.length; i++) {
        var key = sortKeys[i],
        propA = get(a, key),
        propB = get(b, key);
        // return 1 or -1 else continue to the next sortKey
        var compareValue = Ember.compare(propA, propB);
        if (compareValue) { return compareValue; }
      }
      return 0;
    });
  }
});

})();



(function() {
/**
@module ember
@submodule ember-runtime
*/

// ..........................................................
// HELPERS
//

var get = Ember.get, set = Ember.set, isNone = Ember.isNone, map = Ember.EnumerableUtils.map, cacheFor = Ember.cacheFor;

// ..........................................................
// ARRAY
//
/**
  This module implements Observer-friendly Array-like behavior. This mixin is
  picked up by the Array class as well as other controllers, etc. that want to
  appear to be arrays.

  Unlike `Ember.Enumerable,` this mixin defines methods specifically for
  collections that provide index-ordered access to their contents. When you
  are designing code that needs to accept any kind of Array-like object, you
  should use these methods instead of Array primitives because these will
  properly notify observers of changes to the array.

  Although these methods are efficient, they do add a layer of indirection to
  your application so it is a good idea to use them only when you need the
  flexibility of using both true JavaScript arrays and "virtual" arrays such
  as controllers and collections.

  You can use the methods defined in this module to access and modify array
  contents in a KVO-friendly way. You can also be notified whenever the
  membership of an array changes by changing the syntax of the property to
  `.observes('*myProperty.[]')`.

  To support `Ember.Array` in your own class, you must override two
  primitives to use it: `replace()` and `objectAt()`.

  Note that the Ember.Array mixin also incorporates the `Ember.Enumerable`
  mixin. All `Ember.Array`-like objects are also enumerable.

  @class Array
  @namespace Ember
  @uses Ember.Enumerable
  @since Ember 0.9.0
*/
Ember.Array = Ember.Mixin.create(Ember.Enumerable, /** @scope Ember.Array.prototype */ {

  /**
    Your array must support the `length` property. Your replace methods should
    set this property whenever it changes.

    @property {Number} length
  */
  length: Ember.required(),

  /**
    Returns the object at the given `index`. If the given `index` is negative
    or is greater or equal than the array length, returns `undefined`.

    This is one of the primitives you must implement to support `Ember.Array`.
    If your object supports retrieving the value of an array item using `get()`
    (i.e. `myArray.get(0)`), then you do not need to implement this method
    yourself.

    ```javascript
    var arr = ['a', 'b', 'c', 'd'];
    arr.objectAt(0);   // "a"
    arr.objectAt(3);   // "d"
    arr.objectAt(-1);  // undefined
    arr.objectAt(4);   // undefined
    arr.objectAt(5);   // undefined
    ```

    @method objectAt
    @param {Number} idx The index of the item to return.
    @return {*} item at index or undefined
  */
  objectAt: function(idx) {
    if ((idx < 0) || (idx>=get(this, 'length'))) return undefined ;
    return get(this, idx);
  },

  /**
    This returns the objects at the specified indexes, using `objectAt`.

    ```javascript
    var arr = ['a', 'b', 'c', 'd'];
    arr.objectsAt([0, 1, 2]);  // ["a", "b", "c"]
    arr.objectsAt([2, 3, 4]);  // ["c", "d", undefined]
    ```

    @method objectsAt
    @param {Array} indexes An array of indexes of items to return.
    @return {Array}
   */
  objectsAt: function(indexes) {
    var self = this;
    return map(indexes, function(idx) { return self.objectAt(idx); });
  },

  // overrides Ember.Enumerable version
  nextObject: function(idx) {
    return this.objectAt(idx);
  },

  /**
    This is the handler for the special array content property. If you get
    this property, it will return this. If you set this property it a new
    array, it will replace the current content.

    This property overrides the default property defined in `Ember.Enumerable`.

    @property []
    @return this
  */
  '[]': Ember.computed(function(key, value) {
    if (value !== undefined) this.replace(0, get(this, 'length'), value) ;
    return this ;
  }),

  firstObject: Ember.computed(function() {
    return this.objectAt(0);
  }),

  lastObject: Ember.computed(function() {
    return this.objectAt(get(this, 'length')-1);
  }),

  // optimized version from Enumerable
  contains: function(obj) {
    return this.indexOf(obj) >= 0;
  },

  // Add any extra methods to Ember.Array that are native to the built-in Array.
  /**
    Returns a new array that is a slice of the receiver. This implementation
    uses the observable array methods to retrieve the objects for the new
    slice.

    ```javascript
    var arr = ['red', 'green', 'blue'];
    arr.slice(0);       // ['red', 'green', 'blue']
    arr.slice(0, 2);    // ['red', 'green']
    arr.slice(1, 100);  // ['green', 'blue']
    ```

    @method slice
    @param {Integer} beginIndex (Optional) index to begin slicing from.
    @param {Integer} endIndex (Optional) index to end the slice at (but not included).
    @return {Array} New array with specified slice
  */
  slice: function(beginIndex, endIndex) {
    var ret = Ember.A();
    var length = get(this, 'length') ;
    if (isNone(beginIndex)) beginIndex = 0 ;
    if (isNone(endIndex) || (endIndex > length)) endIndex = length ;

    if (beginIndex < 0) beginIndex = length + beginIndex;
    if (endIndex < 0) endIndex = length + endIndex;

    while(beginIndex < endIndex) {
      ret[ret.length] = this.objectAt(beginIndex++) ;
    }
    return ret ;
  },

  /**
    Returns the index of the given object's first occurrence.
    If no `startAt` argument is given, the starting location to
    search is 0. If it's negative, will count backward from
    the end of the array. Returns -1 if no match is found.

    ```javascript
    var arr = ["a", "b", "c", "d", "a"];
    arr.indexOf("a");       //  0
    arr.indexOf("z");       // -1
    arr.indexOf("a", 2);    //  4
    arr.indexOf("a", -1);   //  4
    arr.indexOf("b", 3);    // -1
    arr.indexOf("a", 100);  // -1
    ```

    @method indexOf
    @param {Object} object the item to search for
    @param {Number} startAt optional starting location to search, default 0
    @return {Number} index or -1 if not found
  */
  indexOf: function(object, startAt) {
    var idx, len = get(this, 'length');

    if (startAt === undefined) startAt = 0;
    if (startAt < 0) startAt += len;

    for(idx=startAt;idx<len;idx++) {
      if (this.objectAt(idx) === object) return idx ;
    }
    return -1;
  },

  /**
    Returns the index of the given object's last occurrence.
    If no `startAt` argument is given, the search starts from
    the last position. If it's negative, will count backward
    from the end of the array. Returns -1 if no match is found.

    ```javascript
    var arr = ["a", "b", "c", "d", "a"];
    arr.lastIndexOf("a");       //  4
    arr.lastIndexOf("z");       // -1
    arr.lastIndexOf("a", 2);    //  0
    arr.lastIndexOf("a", -1);   //  4
    arr.lastIndexOf("b", 3);    //  1
    arr.lastIndexOf("a", 100);  //  4
    ```

    @method lastIndexOf
    @param {Object} object the item to search for
    @param {Number} startAt optional starting location to search, default 0
    @return {Number} index or -1 if not found
  */
  lastIndexOf: function(object, startAt) {
    var idx, len = get(this, 'length');

    if (startAt === undefined || startAt >= len) startAt = len-1;
    if (startAt < 0) startAt += len;

    for(idx=startAt;idx>=0;idx--) {
      if (this.objectAt(idx) === object) return idx ;
    }
    return -1;
  },

  // ..........................................................
  // ARRAY OBSERVERS
  //

  /**
    Adds an array observer to the receiving array. The array observer object
    normally must implement two methods:

    * `arrayWillChange(observedObj, start, removeCount, addCount)` - This method will be
      called just before the array is modified.
    * `arrayDidChange(observedObj, start, removeCount, addCount)` - This method will be
      called just after the array is modified.

    Both callbacks will be passed the observed object, starting index of the
    change as well a a count of the items to be removed and added. You can use
    these callbacks to optionally inspect the array during the change, clear
    caches, or do any other bookkeeping necessary.

    In addition to passing a target, you can also include an options hash
    which you can use to override the method names that will be invoked on the
    target.

    @method addArrayObserver
    @param {Object} target The observer object.
    @param {Hash} opts Optional hash of configuration options including
      `willChange` and `didChange` option.
    @return {Ember.Array} receiver
  */
  addArrayObserver: function(target, opts) {
    var willChange = (opts && opts.willChange) || 'arrayWillChange',
        didChange  = (opts && opts.didChange) || 'arrayDidChange';

    var hasObservers = get(this, 'hasArrayObservers');
    if (!hasObservers) Ember.propertyWillChange(this, 'hasArrayObservers');
    Ember.addListener(this, '@array:before', target, willChange);
    Ember.addListener(this, '@array:change', target, didChange);
    if (!hasObservers) Ember.propertyDidChange(this, 'hasArrayObservers');
    return this;
  },

  /**
    Removes an array observer from the object if the observer is current
    registered. Calling this method multiple times with the same object will
    have no effect.

    @method removeArrayObserver
    @param {Object} target The object observing the array.
    @param {Hash} opts Optional hash of configuration options including
      `willChange` and `didChange` option.
    @return {Ember.Array} receiver
  */
  removeArrayObserver: function(target, opts) {
    var willChange = (opts && opts.willChange) || 'arrayWillChange',
        didChange  = (opts && opts.didChange) || 'arrayDidChange';

    var hasObservers = get(this, 'hasArrayObservers');
    if (hasObservers) Ember.propertyWillChange(this, 'hasArrayObservers');
    Ember.removeListener(this, '@array:before', target, willChange);
    Ember.removeListener(this, '@array:change', target, didChange);
    if (hasObservers) Ember.propertyDidChange(this, 'hasArrayObservers');
    return this;
  },

  /**
    Becomes true whenever the array currently has observers watching changes
    on the array.

    @property {Boolean} hasArrayObservers
  */
  hasArrayObservers: Ember.computed(function() {
    return Ember.hasListeners(this, '@array:change') || Ember.hasListeners(this, '@array:before');
  }),

  /**
    If you are implementing an object that supports `Ember.Array`, call this
    method just before the array content changes to notify any observers and
    invalidate any related properties. Pass the starting index of the change
    as well as a delta of the amounts to change.

    @method arrayContentWillChange
    @param {Number} startIdx The starting index in the array that will change.
    @param {Number} removeAmt The number of items that will be removed. If you
      pass `null` assumes 0
    @param {Number} addAmt The number of items that will be added. If you
      pass `null` assumes 0.
    @return {Ember.Array} receiver
  */
  arrayContentWillChange: function(startIdx, removeAmt, addAmt) {

    // if no args are passed assume everything changes
    if (startIdx===undefined) {
      startIdx = 0;
      removeAmt = addAmt = -1;
    } else {
      if (removeAmt === undefined) removeAmt=-1;
      if (addAmt    === undefined) addAmt=-1;
    }

    // Make sure the @each proxy is set up if anyone is observing @each
    if (Ember.isWatching(this, '@each')) { get(this, '@each'); }

    Ember.sendEvent(this, '@array:before', [this, startIdx, removeAmt, addAmt]);

    var removing, lim;
    if (startIdx>=0 && removeAmt>=0 && get(this, 'hasEnumerableObservers')) {
      removing = [];
      lim = startIdx+removeAmt;
      for(var idx=startIdx;idx<lim;idx++) removing.push(this.objectAt(idx));
    } else {
      removing = removeAmt;
    }

    this.enumerableContentWillChange(removing, addAmt);

    return this;
  },

  /**
    If you are implementing an object that supports `Ember.Array`, call this
    method just after the array content changes to notify any observers and
    invalidate any related properties. Pass the starting index of the change
    as well as a delta of the amounts to change.

    @method arrayContentDidChange
    @param {Number} startIdx The starting index in the array that did change.
    @param {Number} removeAmt The number of items that were removed. If you
      pass `null` assumes 0
    @param {Number} addAmt The number of items that were added. If you
      pass `null` assumes 0.
    @return {Ember.Array} receiver
  */
  arrayContentDidChange: function(startIdx, removeAmt, addAmt) {

    // if no args are passed assume everything changes
    if (startIdx===undefined) {
      startIdx = 0;
      removeAmt = addAmt = -1;
    } else {
      if (removeAmt === undefined) removeAmt=-1;
      if (addAmt    === undefined) addAmt=-1;
    }

    var adding, lim;
    if (startIdx>=0 && addAmt>=0 && get(this, 'hasEnumerableObservers')) {
      adding = [];
      lim = startIdx+addAmt;
      for(var idx=startIdx;idx<lim;idx++) adding.push(this.objectAt(idx));
    } else {
      adding = addAmt;
    }

    this.enumerableContentDidChange(removeAmt, adding);
    Ember.sendEvent(this, '@array:change', [this, startIdx, removeAmt, addAmt]);

    var length      = get(this, 'length'),
        cachedFirst = cacheFor(this, 'firstObject'),
        cachedLast  = cacheFor(this, 'lastObject');
    if (this.objectAt(0) !== cachedFirst) {
      Ember.propertyWillChange(this, 'firstObject');
      Ember.propertyDidChange(this, 'firstObject');
    }
    if (this.objectAt(length-1) !== cachedLast) {
      Ember.propertyWillChange(this, 'lastObject');
      Ember.propertyDidChange(this, 'lastObject');
    }

    return this;
  },

  // ..........................................................
  // ENUMERATED PROPERTIES
  //

  /**
    Returns a special object that can be used to observe individual properties
    on the array. Just get an equivalent property on this object and it will
    return an enumerable that maps automatically to the named key on the
    member objects.

    If you merely want to watch for any items being added or removed to the array,
    use the `[]` property instead of `@each`.

    @property @each
  */
  '@each': Ember.computed(function() {
    if (!this.__each) this.__each = new Ember.EachProxy(this);
    return this.__each;
  })

}) ;

})();



(function() {
var e_get = Ember.get,
    set = Ember.set,
    guidFor = Ember.guidFor,
    metaFor = Ember.meta,
    propertyWillChange = Ember.propertyWillChange,
    propertyDidChange = Ember.propertyDidChange,
    addBeforeObserver = Ember.addBeforeObserver,
    removeBeforeObserver = Ember.removeBeforeObserver,
    addObserver = Ember.addObserver,
    removeObserver = Ember.removeObserver,
    ComputedProperty = Ember.ComputedProperty,
    a_slice = [].slice,
    o_create = Ember.create,
    forEach = Ember.EnumerableUtils.forEach,
    // Here we explicitly don't allow `@each.foo`; it would require some special
    // testing, but there's no particular reason why it should be disallowed.
    eachPropertyPattern = /^(.*)\.@each\.(.*)/,
    doubleEachPropertyPattern = /(.*\.@each){2,}/,
    arrayBracketPattern = /\.\[\]$/;

if (Ember.FEATURES.isEnabled('propertyBraceExpansion')) {
  var expandProperties = Ember.expandProperties;
}

function get(obj, key) {
  if (key === '@this') {
    return obj;
  }

  return e_get(obj, key);
}

/*
  Tracks changes to dependent arrays, as well as to properties of items in
  dependent arrays.

  @class DependentArraysObserver
*/
function DependentArraysObserver(callbacks, cp, instanceMeta, context, propertyName, sugarMeta) {
  // user specified callbacks for `addedItem` and `removedItem`
  this.callbacks = callbacks;

  // the computed property: remember these are shared across instances
  this.cp = cp;

  // the ReduceComputedPropertyInstanceMeta this DependentArraysObserver is
  // associated with
  this.instanceMeta = instanceMeta;

  // A map of array guids to dependentKeys, for the given context.  We track
  // this because we want to set up the computed property potentially before the
  // dependent array even exists, but when the array observer fires, we lack
  // enough context to know what to update: we can recover that context by
  // getting the dependentKey.
  this.dependentKeysByGuid = {};

  // a map of dependent array guids -> Ember.TrackedArray instances.  We use
  // this to lazily recompute indexes for item property observers.
  this.trackedArraysByGuid = {};

  // We suspend observers to ignore replacements from `reset` when totally
  // recomputing.  Unfortunately we cannot properly suspend the observers
  // because we only have the key; instead we make the observers no-ops
  this.suspended = false;

  // This is used to coalesce item changes from property observers.
  this.changedItems = {};
}

function ItemPropertyObserverContext (dependentArray, index, trackedArray) {
  Ember.assert("Internal error: trackedArray is null or undefined", trackedArray);

  this.dependentArray = dependentArray;
  this.index = index;
  this.item = dependentArray.objectAt(index);
  this.trackedArray = trackedArray;
  this.beforeObserver = null;
  this.observer = null;

  this.destroyed = false;
}

DependentArraysObserver.prototype = {
  setValue: function (newValue) {
    this.instanceMeta.setValue(newValue, true);
  },
  getValue: function () {
    return this.instanceMeta.getValue();
  },

  setupObservers: function (dependentArray, dependentKey) {
    Ember.assert("dependent array must be an `Ember.Array`", Ember.Array.detect(dependentArray));

    this.dependentKeysByGuid[guidFor(dependentArray)] = dependentKey;

    dependentArray.addArrayObserver(this, {
      willChange: 'dependentArrayWillChange',
      didChange: 'dependentArrayDidChange'
    });

    if (this.cp._itemPropertyKeys[dependentKey]) {
      this.setupPropertyObservers(dependentKey, this.cp._itemPropertyKeys[dependentKey]);
    }
  },

  teardownObservers: function (dependentArray, dependentKey) {
    var itemPropertyKeys = this.cp._itemPropertyKeys[dependentKey] || [];

    delete this.dependentKeysByGuid[guidFor(dependentArray)];

    this.teardownPropertyObservers(dependentKey, itemPropertyKeys);

    dependentArray.removeArrayObserver(this, {
      willChange: 'dependentArrayWillChange',
      didChange: 'dependentArrayDidChange'
    });
  },

  suspendArrayObservers: function (callback, binding) {
    var oldSuspended = this.suspended;
    this.suspended = true;
    callback.call(binding);
    this.suspended = oldSuspended;
  },

  setupPropertyObservers: function (dependentKey, itemPropertyKeys) {
    var dependentArray = get(this.instanceMeta.context, dependentKey),
        length = get(dependentArray, 'length'),
        observerContexts = new Array(length);

    this.resetTransformations(dependentKey, observerContexts);

    forEach(dependentArray, function (item, index) {
      var observerContext = this.createPropertyObserverContext(dependentArray, index, this.trackedArraysByGuid[dependentKey]);
      observerContexts[index] = observerContext;

      forEach(itemPropertyKeys, function (propertyKey) {
        addBeforeObserver(item, propertyKey, this, observerContext.beforeObserver);
        addObserver(item, propertyKey, this, observerContext.observer);
      }, this);
    }, this);
  },

  teardownPropertyObservers: function (dependentKey, itemPropertyKeys) {
    var dependentArrayObserver = this,
        trackedArray = this.trackedArraysByGuid[dependentKey],
        beforeObserver,
        observer,
        item;

    if (!trackedArray) { return; }

    trackedArray.apply(function (observerContexts, offset, operation) {
      if (operation === Ember.TrackedArray.DELETE) { return; }

      forEach(observerContexts, function (observerContext) {
        observerContext.destroyed = true;
        beforeObserver = observerContext.beforeObserver;
        observer = observerContext.observer;
        item = observerContext.item;

        forEach(itemPropertyKeys, function (propertyKey) {
          removeBeforeObserver(item, propertyKey, dependentArrayObserver, beforeObserver);
          removeObserver(item, propertyKey, dependentArrayObserver, observer);
        });
      });
    });
  },

  createPropertyObserverContext: function (dependentArray, index, trackedArray) {
    var observerContext = new ItemPropertyObserverContext(dependentArray, index, trackedArray);

    this.createPropertyObserver(observerContext);

    return observerContext;
  },

  createPropertyObserver: function (observerContext) {
    var dependentArrayObserver = this;

    observerContext.beforeObserver = function (obj, keyName) {
      return dependentArrayObserver.itemPropertyWillChange(obj, keyName, observerContext.dependentArray, observerContext);
    };
    observerContext.observer = function (obj, keyName) {
      return dependentArrayObserver.itemPropertyDidChange(obj, keyName, observerContext.dependentArray, observerContext);
    };
  },

  resetTransformations: function (dependentKey, observerContexts) {
    this.trackedArraysByGuid[dependentKey] = new Ember.TrackedArray(observerContexts);
  },

  trackAdd: function (dependentKey, index, newItems) {
    var trackedArray = this.trackedArraysByGuid[dependentKey];
    if (trackedArray) {
      trackedArray.addItems(index, newItems);
    }
  },

  trackRemove: function (dependentKey, index, removedCount) {
    var trackedArray = this.trackedArraysByGuid[dependentKey];

    if (trackedArray) {
      return trackedArray.removeItems(index, removedCount);
    }

    return [];
  },

  updateIndexes: function (trackedArray, array) {
    var length = get(array, 'length');
    // OPTIMIZE: we could stop updating once we hit the object whose observer
    // fired; ie partially apply the transformations
    trackedArray.apply(function (observerContexts, offset, operation) {
      // we don't even have observer contexts for removed items, even if we did,
      // they no longer have any index in the array
      if (operation === Ember.TrackedArray.DELETE) { return; }
      if (operation === Ember.TrackedArray.RETAIN && observerContexts.length === length && offset === 0) {
        // If we update many items we don't want to walk the array each time: we
        // only need to update the indexes at most once per run loop.
        return;
      }

      forEach(observerContexts, function (context, index) {
        context.index = index + offset;
      });
    });
  },

  dependentArrayWillChange: function (dependentArray, index, removedCount, addedCount) {
    if (this.suspended) { return; }

    var removedItem = this.callbacks.removedItem,
        changeMeta,
        guid = guidFor(dependentArray),
        dependentKey = this.dependentKeysByGuid[guid],
        itemPropertyKeys = this.cp._itemPropertyKeys[dependentKey] || [],
        length = get(dependentArray, 'length'),
        normalizedIndex = normalizeIndex(index, length, 0),
        normalizedRemoveCount = normalizeRemoveCount(normalizedIndex, length, removedCount),
        item,
        itemIndex,
        sliceIndex,
        observerContexts;

    observerContexts = this.trackRemove(dependentKey, normalizedIndex, normalizedRemoveCount);

    function removeObservers(propertyKey) {
      observerContexts[sliceIndex].destroyed = true;
      removeBeforeObserver(item, propertyKey, this, observerContexts[sliceIndex].beforeObserver);
      removeObserver(item, propertyKey, this, observerContexts[sliceIndex].observer);
    }

    for (sliceIndex = normalizedRemoveCount - 1; sliceIndex >= 0; --sliceIndex) {
      itemIndex = normalizedIndex + sliceIndex;
      if (itemIndex >= length) { break; }

      item = dependentArray.objectAt(itemIndex);

      forEach(itemPropertyKeys, removeObservers, this);

      changeMeta = createChangeMeta(dependentArray, item, itemIndex, this.instanceMeta.propertyName, this.cp);
      this.setValue( removedItem.call(
        this.instanceMeta.context, this.getValue(), item, changeMeta, this.instanceMeta.sugarMeta));
    }
  },

  dependentArrayDidChange: function (dependentArray, index, removedCount, addedCount) {
    if (this.suspended) { return; }

    var addedItem = this.callbacks.addedItem,
        guid = guidFor(dependentArray),
        dependentKey = this.dependentKeysByGuid[guid],
        observerContexts = new Array(addedCount),
        itemPropertyKeys = this.cp._itemPropertyKeys[dependentKey],
        length = get(dependentArray, 'length'),
        normalizedIndex = normalizeIndex(index, length, addedCount),
        changeMeta,
        observerContext;

    forEach(dependentArray.slice(normalizedIndex, normalizedIndex + addedCount), function (item, sliceIndex) {
      if (itemPropertyKeys) {
        observerContext =
          observerContexts[sliceIndex] =
          this.createPropertyObserverContext(dependentArray, normalizedIndex + sliceIndex, this.trackedArraysByGuid[dependentKey]);
        forEach(itemPropertyKeys, function (propertyKey) {
          addBeforeObserver(item, propertyKey, this, observerContext.beforeObserver);
          addObserver(item, propertyKey, this, observerContext.observer);
        }, this);
      }

      changeMeta = createChangeMeta(dependentArray, item, normalizedIndex + sliceIndex, this.instanceMeta.propertyName, this.cp);
      this.setValue( addedItem.call(
        this.instanceMeta.context, this.getValue(), item, changeMeta, this.instanceMeta.sugarMeta));
    }, this);

    this.trackAdd(dependentKey, normalizedIndex, observerContexts);
  },

  itemPropertyWillChange: function (obj, keyName, array, observerContext) {
    var guid = guidFor(obj);

    if (!this.changedItems[guid]) {
      this.changedItems[guid] = {
        array:            array,
        observerContext:  observerContext,
        obj:              obj,
        previousValues:   {}
      };
    }

    this.changedItems[guid].previousValues[keyName] = get(obj, keyName);
  },

  itemPropertyDidChange: function(obj, keyName, array, observerContext) {
    this.flushChanges();
  },

  flushChanges: function() {
    var changedItems = this.changedItems, key, c, changeMeta;

    for (key in changedItems) {
      c = changedItems[key];
      if (c.observerContext.destroyed) { continue; }

      this.updateIndexes(c.observerContext.trackedArray, c.observerContext.dependentArray);

      changeMeta = createChangeMeta(c.array, c.obj, c.observerContext.index, this.instanceMeta.propertyName, this.cp, c.previousValues);
      this.setValue(
        this.callbacks.removedItem.call(this.instanceMeta.context, this.getValue(), c.obj, changeMeta, this.instanceMeta.sugarMeta));
      this.setValue(
        this.callbacks.addedItem.call(this.instanceMeta.context, this.getValue(), c.obj, changeMeta, this.instanceMeta.sugarMeta));
    }
    this.changedItems = {};
  }
};

function normalizeIndex(index, length, newItemsOffset) {
  if (index < 0) {
    return Math.max(0, length + index);
  } else if (index < length) {
    return index;
  } else /* index > length */ {
    return Math.min(length - newItemsOffset, index);
  }
}

function normalizeRemoveCount(index, length, removedCount) {
  return Math.min(removedCount, length - index);
}

function createChangeMeta(dependentArray, item, index, propertyName, property, previousValues) {
  var meta = {
    arrayChanged: dependentArray,
    index: index,
    item: item,
    propertyName: propertyName,
    property: property
  };

  if (previousValues) {
    // previous values only available for item property changes
    meta.previousValues = previousValues;
  }

  return meta;
}

function addItems (dependentArray, callbacks, cp, propertyName, meta) {
  forEach(dependentArray, function (item, index) {
    meta.setValue( callbacks.addedItem.call(
      this, meta.getValue(), item, createChangeMeta(dependentArray, item, index, propertyName, cp), meta.sugarMeta));
  }, this);
}

function reset(cp, propertyName) {
  var callbacks = cp._callbacks(),
      meta;

  if (cp._hasInstanceMeta(this, propertyName)) {
    meta = cp._instanceMeta(this, propertyName);
    meta.setValue(cp.resetValue(meta.getValue()));
  } else {
    meta = cp._instanceMeta(this, propertyName);
  }

  if (cp.options.initialize) {
    cp.options.initialize.call(this, meta.getValue(), { property: cp, propertyName: propertyName }, meta.sugarMeta);
  }
}

function partiallyRecomputeFor(obj, dependentKey) {
  if (arrayBracketPattern.test(dependentKey)) {
    return false;
  }

  var value = get(obj, dependentKey);
  return Ember.Array.detect(value);
}

function ReduceComputedPropertyInstanceMeta(context, propertyName, initialValue) {
  this.context = context;
  this.propertyName = propertyName;
  this.cache = metaFor(context).cache;

  this.dependentArrays = {};
  this.sugarMeta = {};

  this.initialValue = initialValue;
}

ReduceComputedPropertyInstanceMeta.prototype = {
  getValue: function () {
    if (this.propertyName in this.cache) {
      return this.cache[this.propertyName];
    } else {
      return this.initialValue;
    }
  },

  setValue: function(newValue, triggerObservers) {
    // This lets sugars force a recomputation, handy for very simple
    // implementations of eg max.
    if (newValue !== undefined) {
      var fireObservers = triggerObservers && (newValue !== this.cache[this.propertyName]);

      if (fireObservers) {
        propertyWillChange(this.context, this.propertyName);
      }

      this.cache[this.propertyName] = newValue;

      if (fireObservers) {
        propertyDidChange(this.context, this.propertyName);
      }
    } else {
      delete this.cache[this.propertyName];
    }
  }
};

/**
  A computed property whose dependent keys are arrays and which is updated with
  "one at a time" semantics.

  @class ReduceComputedProperty
  @namespace Ember
  @extends Ember.ComputedProperty
  @constructor
*/
function ReduceComputedProperty(options) {
  var cp = this;

  this.options = options;
  this._instanceMetas = {};

  this._dependentKeys = null;
  // A map of dependentKey -> [itemProperty, ...] that tracks what properties of
  // items in the array we must track to update this property.
  this._itemPropertyKeys = {};
  this._previousItemPropertyKeys = {};

  this.readOnly();
  this.cacheable();

  this.recomputeOnce = function(propertyName) {
    // What we really want to do is coalesce by <cp, propertyName>.
    // We need a form of `scheduleOnce` that accepts an arbitrary token to
    // coalesce by, in addition to the target and method.
    Ember.run.once(this, recompute, propertyName);
  };
  var recompute = function(propertyName) {
    var dependentKeys = cp._dependentKeys,
        meta = cp._instanceMeta(this, propertyName),
        callbacks = cp._callbacks();

    reset.call(this, cp, propertyName);

    meta.dependentArraysObserver.suspendArrayObservers(function () {
      forEach(cp._dependentKeys, function (dependentKey) {
        if (Ember.FEATURES.isEnabled('reduceComputed-non-array-dependencies')) {
          if (!partiallyRecomputeFor(this, dependentKey)) { return; }
        }

        var dependentArray = get(this, dependentKey),
            previousDependentArray = meta.dependentArrays[dependentKey];

        if (dependentArray === previousDependentArray) {
          // The array may be the same, but our item property keys may have
          // changed, so we set them up again.  We can't easily tell if they've
          // changed: the array may be the same object, but with different
          // contents.
          if (cp._previousItemPropertyKeys[dependentKey]) {
            delete cp._previousItemPropertyKeys[dependentKey];
            meta.dependentArraysObserver.setupPropertyObservers(dependentKey, cp._itemPropertyKeys[dependentKey]);
          }
        } else {
          meta.dependentArrays[dependentKey] = dependentArray;

          if (previousDependentArray) {
            meta.dependentArraysObserver.teardownObservers(previousDependentArray, dependentKey);
          }

          if (dependentArray) {
            meta.dependentArraysObserver.setupObservers(dependentArray, dependentKey);
          }
        }
      }, this);
    }, this);

    forEach(cp._dependentKeys, function(dependentKey) {
      if (Ember.FEATURES.isEnabled('reduceComputed-non-array-dependencies')) {
        if (!partiallyRecomputeFor(this, dependentKey)) { return; }
      }

      var dependentArray = get(this, dependentKey);
      if (dependentArray) {
        addItems.call(this, dependentArray, callbacks, cp, propertyName, meta);
      }
    }, this);
  };

  this.func = function (propertyName) {
    Ember.assert("Computed reduce values require at least one dependent key", cp._dependentKeys);

    recompute.call(this, propertyName);

    return cp._instanceMeta(this, propertyName).getValue();
  };
}

Ember.ReduceComputedProperty = ReduceComputedProperty;
ReduceComputedProperty.prototype = o_create(ComputedProperty.prototype);

function defaultCallback(computedValue) {
  return computedValue;
}

ReduceComputedProperty.prototype._callbacks = function () {
  if (!this.callbacks) {
    var options = this.options;
    this.callbacks = {
      removedItem: options.removedItem || defaultCallback,
      addedItem: options.addedItem || defaultCallback
    };
  }
  return this.callbacks;
};

ReduceComputedProperty.prototype._hasInstanceMeta = function (context, propertyName) {
  var guid = guidFor(context),
      key = guid + ':' + propertyName;

  return !!this._instanceMetas[key];
};

ReduceComputedProperty.prototype._instanceMeta = function (context, propertyName) {
  var guid = guidFor(context),
      key = guid + ':' + propertyName,
      meta = this._instanceMetas[key];

  if (!meta) {
    meta = this._instanceMetas[key] = new ReduceComputedPropertyInstanceMeta(context, propertyName, this.initialValue());
    meta.dependentArraysObserver = new DependentArraysObserver(this._callbacks(), this, meta, context, propertyName, meta.sugarMeta);
  }

  return meta;
};

ReduceComputedProperty.prototype.initialValue = function () {
  if (typeof this.options.initialValue === 'function') {
    return this.options.initialValue();
  }
  else {
    return this.options.initialValue;
  }
};

ReduceComputedProperty.prototype.resetValue = function (value) {
  return this.initialValue();
};

ReduceComputedProperty.prototype.itemPropertyKey = function (dependentArrayKey, itemPropertyKey) {
  this._itemPropertyKeys[dependentArrayKey] = this._itemPropertyKeys[dependentArrayKey] || [];
  this._itemPropertyKeys[dependentArrayKey].push(itemPropertyKey);
};

ReduceComputedProperty.prototype.clearItemPropertyKeys = function (dependentArrayKey) {
  if (this._itemPropertyKeys[dependentArrayKey]) {
    this._previousItemPropertyKeys[dependentArrayKey] = this._itemPropertyKeys[dependentArrayKey];
    this._itemPropertyKeys[dependentArrayKey] = [];
  }
};

ReduceComputedProperty.prototype.property = function () {
  var cp = this,
      args = a_slice.call(arguments),
      propertyArgs = new Ember.Set(),
      match,
      dependentArrayKey,
      itemPropertyKey;

  forEach(a_slice.call(arguments), function (dependentKey) {
    if (doubleEachPropertyPattern.test(dependentKey)) {
      throw new Ember.Error("Nested @each properties not supported: " + dependentKey);
    } else if (match = eachPropertyPattern.exec(dependentKey)) {
      dependentArrayKey = match[1];

      if (Ember.FEATURES.isEnabled('propertyBraceExpansion')) {
        var itemPropertyKeyPattern = match[2],
            addItemPropertyKey = function (itemPropertyKey) {
              cp.itemPropertyKey(dependentArrayKey, itemPropertyKey);
            };

        expandProperties(itemPropertyKeyPattern, addItemPropertyKey);
      } else {
        itemPropertyKey = match[2];
        cp.itemPropertyKey(dependentArrayKey, itemPropertyKey);
      }
      propertyArgs.add(dependentArrayKey);
    } else {
      propertyArgs.add(dependentKey);
    }
  });

  return ComputedProperty.prototype.property.apply(this, propertyArgs.toArray());

};

/**
  Creates a computed property which operates on dependent arrays and
  is updated with "one at a time" semantics. When items are added or
  removed from the dependent array(s) a reduce computed only operates
  on the change instead of re-evaluating the entire array.

  If there are more than one arguments the first arguments are
  considered to be dependent property keys. The last argument is
  required to be an options object. The options object can have the
  following four properties:

  `initialValue` - A value or function that will be used as the initial
  value for the computed. If this property is a function the result of calling
  the function will be used as the initial value. This property is required.

  `initialize` - An optional initialize function. Typically this will be used
  to set up state on the instanceMeta object.

  `removedItem` - A function that is called each time an element is removed
  from the array.

  `addedItem` - A function that is called each time an element is added to
  the array.


  The `initialize` function has the following signature:

  ```javascript
   function (initialValue, changeMeta, instanceMeta)
  ```

  `initialValue` - The value of the `initialValue` property from the
  options object.

  `changeMeta` - An object which contains meta information about the
  computed. It contains the following properties:

     - `property` the computed property
     - `propertyName` the name of the property on the object

  `instanceMeta` - An object that can be used to store meta
  information needed for calculating your computed. For example a
  unique computed might use this to store the number of times a given
  element is found in the dependent array.


  The `removedItem` and `addedItem` functions both have the following signature:

  ```javascript
  function (accumulatedValue, item, changeMeta, instanceMeta)
  ```

  `accumulatedValue` - The value returned from the last time
  `removedItem` or `addedItem` was called or `initialValue`.

  `item` - the element added or removed from the array

  `changeMeta` - An object which contains meta information about the
  change. It contains the following properties:

    - `property` the computed property
    - `propertyName` the name of the property on the object
    - `index` the index of the added or removed item
    - `item` the added or removed item: this is exactly the same as
      the second arg
    - `arrayChanged` the array that triggered the change. Can be
      useful when depending on multiple arrays.

  For property changes triggered on an item property change (when
  depKey is something like `someArray.@each.someProperty`),
  `changeMeta` will also contain the following property:

    - `previousValues` an object whose keys are the properties that changed on
    the item, and whose values are the item's previous values.

  `previousValues` is important Ember coalesces item property changes via
  Ember.run.once. This means that by the time removedItem gets called, item has
  the new values, but you may need the previous value (eg for sorting &
  filtering).

  `instanceMeta` - An object that can be used to store meta
  information needed for calculating your computed. For example a
  unique computed might use this to store the number of times a given
  element is found in the dependent array.

  The `removedItem` and `addedItem` functions should return the accumulated
  value. It is acceptable to not return anything (ie return undefined)
  to invalidate the computation. This is generally not a good idea for
  arrayComputed but it's used in eg max and min.

  Note that observers will be fired if either of these functions return a value
  that differs from the accumulated value.  When returning an object that
  mutates in response to array changes, for example an array that maps
  everything from some other array (see `Ember.computed.map`), it is usually
  important that the *same* array be returned to avoid accidentally triggering observers.

  Example

  ```javascript
  Ember.computed.max = function (dependentKey) {
    return Ember.reduceComputed(dependentKey, {
      initialValue: -Infinity,

      addedItem: function (accumulatedValue, item, changeMeta, instanceMeta) {
        return Math.max(accumulatedValue, item);
      },

      removedItem: function (accumulatedValue, item, changeMeta, instanceMeta) {
        if (item < accumulatedValue) {
          return accumulatedValue;
        }
      }
    });
  };
  ```

  Dependent keys may refer to `@this` to observe changes to the object itself,
  which must be array-like, rather than a property of the object.  This is
  mostly useful for array proxies, to ensure objects are retrieved via
  `objectAtContent`.  This is how you could sort items by properties defined on an item controller.

  Example

  ```javascript
  App.PeopleController = Ember.ArrayController.extend({
    itemController: 'person',

    sortedPeople: Ember.computed.sort('@this.@each.reversedName', function(personA, personB) {
      // `reversedName` isn't defined on Person, but we have access to it via
      // the item controller App.PersonController.  If we'd used
      // `content.@each.reversedName` above, we would be getting the objects
      // directly and not have access to `reversedName`.
      //
      var reversedNameA = get(personA, 'reversedName'),
          reversedNameB = get(personB, 'reversedName');

      return Ember.compare(reversedNameA, reversedNameB);
    })
  });

  App.PersonController = Ember.ObjectController.extend({
    reversedName: function () {
      return reverse(get(this, 'name'));
    }.property('name')
  })
  ```

  Dependent keys whose values are not arrays are treated as regular
  dependencies: when they change, the computed property is completely
  recalculated.  It is sometimes useful to have dependent arrays with similar
  semantics.  Dependent keys which end in `.[]` do not use "one at a time"
  semantics.  When an item is added or removed from such a dependency, the
  computed property is completely recomputed.

  Example

  ```javascript
  Ember.Object.extend({
    // When `string` is changed, `computed` is completely recomputed.
    string: 'a string',

    // When an item is added to `array`, `addedItem` is called.
    array: [],

    // When an item is added to `anotherArray`, `computed` is completely
    // recomputed.
    anotherArray: [],

    computed: Ember.reduceComputed('string', 'array', 'anotherArray.[]', {
      addedItem: addedItemCallback,
      removedItem: removedItemCallback
    })
  });
  ```

  @method reduceComputed
  @for Ember
  @param {String} [dependentKeys*]
  @param {Object} options
  @return {Ember.ComputedProperty}
*/
Ember.reduceComputed = function (options) {
  var args;

  if (arguments.length > 1) {
    args = a_slice.call(arguments, 0, -1);
    options = a_slice.call(arguments, -1)[0];
  }

  if (typeof options !== "object") {
    throw new Ember.Error("Reduce Computed Property declared without an options hash");
  }

  if (!('initialValue' in options)) {
    throw new Ember.Error("Reduce Computed Property declared without an initial value");
  }

  var cp = new ReduceComputedProperty(options);

  if (args) {
    cp.property.apply(cp, args);
  }

  return cp;
};

})();



(function() {
var ReduceComputedProperty = Ember.ReduceComputedProperty,
    a_slice = [].slice,
    o_create = Ember.create,
    forEach = Ember.EnumerableUtils.forEach;

function ArrayComputedProperty() {
  var cp = this;

  ReduceComputedProperty.apply(this, arguments);

  this.func = (function(reduceFunc) {
    return function (propertyName) {
      if (!cp._hasInstanceMeta(this, propertyName)) {
        // When we recompute an array computed property, we need already
        // retrieved arrays to be updated; we can't simply empty the cache and
        // hope the array is re-retrieved.
        forEach(cp._dependentKeys, function(dependentKey) {
          Ember.addObserver(this, dependentKey, function() {
            cp.recomputeOnce.call(this, propertyName);
          });
        }, this);
      }

      return reduceFunc.apply(this, arguments);
    };
  })(this.func);

  return this;
}
Ember.ArrayComputedProperty = ArrayComputedProperty;
ArrayComputedProperty.prototype = o_create(ReduceComputedProperty.prototype);
ArrayComputedProperty.prototype.initialValue = function () {
  return Ember.A();
};
ArrayComputedProperty.prototype.resetValue = function (array) {
  array.clear();
  return array;
};

/**
  Creates a computed property which operates on dependent arrays and
  is updated with "one at a time" semantics. When items are added or
  removed from the dependent array(s) an array computed only operates
  on the change instead of re-evaluating the entire array. This should
  return an array, if you'd like to use "one at a time" semantics and
  compute some value other then an array look at
  `Ember.reduceComputed`.

  If there are more than one arguments the first arguments are
  considered to be dependent property keys. The last argument is
  required to be an options object. The options object can have the
  following three properties.

  `initialize` - An optional initialize function. Typically this will be used
  to set up state on the instanceMeta object.

  `removedItem` - A function that is called each time an element is
  removed from the array.

  `addedItem` - A function that is called each time an element is
  added to the array.


  The `initialize` function has the following signature:

  ```javascript
   function (array, changeMeta, instanceMeta)
  ```

  `array` - The initial value of the arrayComputed, an empty array.

  `changeMeta` - An object which contains meta information about the
  computed. It contains the following properties:

     - `property` the computed property
     - `propertyName` the name of the property on the object

  `instanceMeta` - An object that can be used to store meta
  information needed for calculating your computed. For example a
  unique computed might use this to store the number of times a given
  element is found in the dependent array.


  The `removedItem` and `addedItem` functions both have the following signature:

  ```javascript
  function (accumulatedValue, item, changeMeta, instanceMeta)
  ```

  `accumulatedValue` - The value returned from the last time
  `removedItem` or `addedItem` was called or an empty array.

  `item` - the element added or removed from the array

  `changeMeta` - An object which contains meta information about the
  change. It contains the following properties:

    - `property` the computed property
    - `propertyName` the name of the property on the object
    - `index` the index of the added or removed item
    - `item` the added or removed item: this is exactly the same as
      the second arg
    - `arrayChanged` the array that triggered the change. Can be
      useful when depending on multiple arrays.

  For property changes triggered on an item property change (when
  depKey is something like `someArray.@each.someProperty`),
  `changeMeta` will also contain the following property:

    - `previousValues` an object whose keys are the properties that changed on
    the item, and whose values are the item's previous values.

  `previousValues` is important Ember coalesces item property changes via
  Ember.run.once. This means that by the time removedItem gets called, item has
  the new values, but you may need the previous value (eg for sorting &
  filtering).

  `instanceMeta` - An object that can be used to store meta
  information needed for calculating your computed. For example a
  unique computed might use this to store the number of times a given
  element is found in the dependent array.

  The `removedItem` and `addedItem` functions should return the accumulated
  value. It is acceptable to not return anything (ie return undefined)
  to invalidate the computation. This is generally not a good idea for
  arrayComputed but it's used in eg max and min.

  Example

  ```javascript
  Ember.computed.map = function(dependentKey, callback) {
    var options = {
      addedItem: function(array, item, changeMeta, instanceMeta) {
        var mapped = callback(item);
        array.insertAt(changeMeta.index, mapped);
        return array;
      },
      removedItem: function(array, item, changeMeta, instanceMeta) {
        array.removeAt(changeMeta.index, 1);
        return array;
      }
    };

    return Ember.arrayComputed(dependentKey, options);
  };
  ```

  @method arrayComputed
  @for Ember
  @param {String} [dependentKeys*]
  @param {Object} options
  @return {Ember.ComputedProperty}
*/
Ember.arrayComputed = function (options) {
  var args;

  if (arguments.length > 1) {
    args = a_slice.call(arguments, 0, -1);
    options = a_slice.call(arguments, -1)[0];
  }

  if (typeof options !== "object") {
    throw new Ember.Error("Array Computed Property declared without an options hash");
  }

  var cp = new ArrayComputedProperty(options);

  if (args) {
    cp.property.apply(cp, args);
  }

  return cp;
};

})();



(function() {
/**
@module ember
@submodule ember-runtime
*/

var get = Ember.get,
    set = Ember.set,
    guidFor = Ember.guidFor,
    merge = Ember.merge,
    a_slice = [].slice,
    forEach = Ember.EnumerableUtils.forEach,
    map = Ember.EnumerableUtils.map,
    SearchProxy;

/**
  A computed property that calculates the maximum value in the
  dependent array. This will return `-Infinity` when the dependent
  array is empty.

  Example

  ```javascript
  App.Person = Ember.Object.extend({
    childAges: Ember.computed.mapBy('children', 'age'),
    maxChildAge: Ember.computed.max('childAges')
  });

  var lordByron = App.Person.create({children: []});
  lordByron.get('maxChildAge'); // -Infinity
  lordByron.get('children').pushObject({name: 'Augusta Ada Byron', age: 7});
  lordByron.get('maxChildAge'); // 7
  lordByron.get('children').pushObjects([{name: 'Allegra Byron', age: 5}, {name: 'Elizabeth Medora Leigh', age: 8}]);
  lordByron.get('maxChildAge'); // 8
  ```

  @method computed.max
  @for Ember
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computes the largest value in the dependentKey's array
*/
Ember.computed.max = function (dependentKey) {
  return Ember.reduceComputed(dependentKey, {
    initialValue: -Infinity,

    addedItem: function (accumulatedValue, item, changeMeta, instanceMeta) {
      return Math.max(accumulatedValue, item);
    },

    removedItem: function (accumulatedValue, item, changeMeta, instanceMeta) {
      if (item < accumulatedValue) {
        return accumulatedValue;
      }
    }
  });
};

/**
  A computed property that calculates the minimum value in the
  dependent array. This will return `Infinity` when the dependent
  array is empty.

  Example

  ```javascript
  App.Person = Ember.Object.extend({
    childAges: Ember.computed.mapBy('children', 'age'),
    minChildAge: Ember.computed.min('childAges')
  });

  var lordByron = App.Person.create({children: []});
  lordByron.get('minChildAge'); // Infinity
  lordByron.get('children').pushObject({name: 'Augusta Ada Byron', age: 7});
  lordByron.get('minChildAge'); // 7
  lordByron.get('children').pushObjects([{name: 'Allegra Byron', age: 5}, {name: 'Elizabeth Medora Leigh', age: 8}]);
  lordByron.get('minChildAge'); // 5
  ```

  @method computed.min
  @for Ember
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computes the smallest value in the dependentKey's array
*/
Ember.computed.min = function (dependentKey) {
  return Ember.reduceComputed(dependentKey, {
    initialValue: Infinity,

    addedItem: function (accumulatedValue, item, changeMeta, instanceMeta) {
      return Math.min(accumulatedValue, item);
    },

    removedItem: function (accumulatedValue, item, changeMeta, instanceMeta) {
      if (item > accumulatedValue) {
        return accumulatedValue;
      }
    }
  });
};

/**
  Returns an array mapped via the callback

  The callback method you provide should have the following signature:

  ```javascript
  function(item);
  ```

  - `item` is the current item in the iteration.

  Example

  ```javascript
  App.Hamster = Ember.Object.extend({
    excitingChores: Ember.computed.map('chores', function(chore) {
      return chore.toUpperCase() + '!';
    })
  });

  var hamster = App.Hamster.create({chores: ['cook', 'clean', 'write more unit tests']});
  hamster.get('excitingChores'); // ['COOK!', 'CLEAN!', 'WRITE MORE UNIT TESTS!']
  ```

  @method computed.map
  @for Ember
  @param {String} dependentKey
  @param {Function} callback
  @return {Ember.ComputedProperty} an array mapped via the callback
*/
Ember.computed.map = function(dependentKey, callback) {
  var options = {
    addedItem: function(array, item, changeMeta, instanceMeta) {
      var mapped = callback.call(this, item);
      array.insertAt(changeMeta.index, mapped);
      return array;
    },
    removedItem: function(array, item, changeMeta, instanceMeta) {
      array.removeAt(changeMeta.index, 1);
      return array;
    }
  };

  return Ember.arrayComputed(dependentKey, options);
};

/**
  Returns an array mapped to the specified key.

  Example

  ```javascript
  App.Person = Ember.Object.extend({
    childAges: Ember.computed.mapBy('children', 'age')
  });

  var lordByron = App.Person.create({children: []});
  lordByron.get('childAges'); // []
  lordByron.get('children').pushObject({name: 'Augusta Ada Byron', age: 7});
  lordByron.get('childAges'); // [7]
  lordByron.get('children').pushObjects([{name: 'Allegra Byron', age: 5}, {name: 'Elizabeth Medora Leigh', age: 8}]);
  lordByron.get('childAges'); // [7, 5, 8]
  ```

  @method computed.mapBy
  @for Ember
  @param {String} dependentKey
  @param {String} propertyKey
  @return {Ember.ComputedProperty} an array mapped to the specified key
*/
Ember.computed.mapBy = function(dependentKey, propertyKey) {
  var callback = function(item) { return get(item, propertyKey); };
  return Ember.computed.map(dependentKey + '.@each.' + propertyKey, callback);
};

/**
  @method computed.mapProperty
  @for Ember
  @deprecated Use `Ember.computed.mapBy` instead
  @param dependentKey
  @param propertyKey
*/
Ember.computed.mapProperty = Ember.computed.mapBy;

/**
  Filters the array by the callback.

  The callback method you provide should have the following signature:

  ```javascript
  function(item);
  ```

  - `item` is the current item in the iteration.

  Example

  ```javascript
  App.Hamster = Ember.Object.extend({
    remainingChores: Ember.computed.filter('chores', function(chore) {
      return !chore.done;
    })
  });

  var hamster = App.Hamster.create({chores: [
    {name: 'cook', done: true},
    {name: 'clean', done: true},
    {name: 'write more unit tests', done: false}
  ]});
  hamster.get('remainingChores'); // [{name: 'write more unit tests', done: false}]
  ```

  @method computed.filter
  @for Ember
  @param {String} dependentKey
  @param {Function} callback
  @return {Ember.ComputedProperty} the filtered array
*/
Ember.computed.filter = function(dependentKey, callback) {
  var options = {
    initialize: function (array, changeMeta, instanceMeta) {
      instanceMeta.filteredArrayIndexes = new Ember.SubArray();
    },

    addedItem: function(array, item, changeMeta, instanceMeta) {
      var match = !!callback.call(this, item),
          filterIndex = instanceMeta.filteredArrayIndexes.addItem(changeMeta.index, match);

      if (match) {
        array.insertAt(filterIndex, item);
      }

      return array;
    },

    removedItem: function(array, item, changeMeta, instanceMeta) {
      var filterIndex = instanceMeta.filteredArrayIndexes.removeItem(changeMeta.index);

      if (filterIndex > -1) {
        array.removeAt(filterIndex);
      }

      return array;
    }
  };

  return Ember.arrayComputed(dependentKey, options);
};

/**
  Filters the array by the property and value

  Example

  ```javascript
  App.Hamster = Ember.Object.extend({
    remainingChores: Ember.computed.filterBy('chores', 'done', false)
  });

  var hamster = App.Hamster.create({chores: [
    {name: 'cook', done: true},
    {name: 'clean', done: true},
    {name: 'write more unit tests', done: false}
  ]});
  hamster.get('remainingChores'); // [{name: 'write more unit tests', done: false}]
  ```

  @method computed.filterBy
  @for Ember
  @param {String} dependentKey
  @param {String} propertyKey
  @param {String} value
  @return {Ember.ComputedProperty} the filtered array
*/
Ember.computed.filterBy = function(dependentKey, propertyKey, value) {
  var callback;

  if (arguments.length === 2) {
    callback = function(item) {
      return get(item, propertyKey);
    };
  } else {
    callback = function(item) {
      return get(item, propertyKey) === value;
    };
  }

  return Ember.computed.filter(dependentKey + '.@each.' + propertyKey, callback);
};

/**
  @method computed.filterProperty
  @for Ember
  @param dependentKey
  @param propertyKey
  @param value
  @deprecated Use `Ember.computed.filterBy` instead
*/
Ember.computed.filterProperty = Ember.computed.filterBy;

/**
  A computed property which returns a new array with all the unique
  elements from one or more dependent arrays.

  Example

  ```javascript
  App.Hamster = Ember.Object.extend({
    uniqueFruits: Ember.computed.uniq('fruits')
  });

  var hamster = App.Hamster.create({fruits: [
    'banana',
    'grape',
    'kale',
    'banana'
  ]});
  hamster.get('uniqueFruits'); // ['banana', 'grape', 'kale']
  ```

  @method computed.uniq
  @for Ember
  @param {String} propertyKey*
  @return {Ember.ComputedProperty} computes a new array with all the
  unique elements from the dependent array
*/
Ember.computed.uniq = function() {
  var args = a_slice.call(arguments);
  args.push({
    initialize: function(array, changeMeta, instanceMeta) {
      instanceMeta.itemCounts = {};
    },

    addedItem: function(array, item, changeMeta, instanceMeta) {
      var guid = guidFor(item);

      if (!instanceMeta.itemCounts[guid]) {
        instanceMeta.itemCounts[guid] = 1;
      } else {
        ++instanceMeta.itemCounts[guid];
      }
      array.addObject(item);
      return array;
    },
    removedItem: function(array, item, _, instanceMeta) {
      var guid = guidFor(item),
          itemCounts = instanceMeta.itemCounts;

      if (--itemCounts[guid] === 0) {
        array.removeObject(item);
      }
      return array;
    }
  });
  return Ember.arrayComputed.apply(null, args);
};

/**
  Alias for [Ember.computed.uniq](/api/#method_computed_uniq).

  @method computed.union
  @for Ember
  @param {String} propertyKey*
  @return {Ember.ComputedProperty} computes a new array with all the
  unique elements from the dependent array
*/
Ember.computed.union = Ember.computed.uniq;

/**
  A computed property which returns a new array with all the duplicated
  elements from two or more dependeny arrays.

  Example

  ```javascript
  var obj = Ember.Object.createWithMixins({
    adaFriends: ['Charles Babbage', 'John Hobhouse', 'William King', 'Mary Somerville'],
    charlesFriends: ['William King', 'Mary Somerville', 'Ada Lovelace', 'George Peacock'],
    friendsInCommon: Ember.computed.intersect('adaFriends', 'charlesFriends')
  });

  obj.get('friendsInCommon'); // ['William King', 'Mary Somerville']
  ```

  @method computed.intersect
  @for Ember
  @param {String} propertyKey*
  @return {Ember.ComputedProperty} computes a new array with all the
  duplicated elements from the dependent arrays
*/
Ember.computed.intersect = function () {
  var getDependentKeyGuids = function (changeMeta) {
    return map(changeMeta.property._dependentKeys, function (dependentKey) {
      return guidFor(dependentKey);
    });
  };

  var args = a_slice.call(arguments);
  args.push({
    initialize: function (array, changeMeta, instanceMeta) {
      instanceMeta.itemCounts = {};
    },

    addedItem: function(array, item, changeMeta, instanceMeta) {
      var itemGuid = guidFor(item),
          dependentGuids = getDependentKeyGuids(changeMeta),
          dependentGuid = guidFor(changeMeta.arrayChanged),
          numberOfDependentArrays = changeMeta.property._dependentKeys.length,
          itemCounts = instanceMeta.itemCounts;

      if (!itemCounts[itemGuid]) { itemCounts[itemGuid] = {}; }
      if (itemCounts[itemGuid][dependentGuid] === undefined) { itemCounts[itemGuid][dependentGuid] = 0; }

      if (++itemCounts[itemGuid][dependentGuid] === 1 &&
          numberOfDependentArrays === Ember.keys(itemCounts[itemGuid]).length) {

        array.addObject(item);
      }
      return array;
    },
    removedItem: function(array, item, changeMeta, instanceMeta) {
      var itemGuid = guidFor(item),
          dependentGuids = getDependentKeyGuids(changeMeta),
          dependentGuid = guidFor(changeMeta.arrayChanged),
          numberOfDependentArrays = changeMeta.property._dependentKeys.length,
          numberOfArraysItemAppearsIn,
          itemCounts = instanceMeta.itemCounts;

      if (itemCounts[itemGuid][dependentGuid] === undefined) { itemCounts[itemGuid][dependentGuid] = 0; }
      if (--itemCounts[itemGuid][dependentGuid] === 0) {
        delete itemCounts[itemGuid][dependentGuid];
        numberOfArraysItemAppearsIn = Ember.keys(itemCounts[itemGuid]).length;

        if (numberOfArraysItemAppearsIn === 0) {
          delete itemCounts[itemGuid];
        }
        array.removeObject(item);
      }
      return array;
    }
  });
  return Ember.arrayComputed.apply(null, args);
};

/**
  A computed property which returns a new array with all the
  properties from the first dependent array that are not in the second
  dependent array.

  Example

  ```javascript
  App.Hamster = Ember.Object.extend({
    likes: ['banana', 'grape', 'kale'],
    wants: Ember.computed.setDiff('likes', 'fruits')
  });

  var hamster = App.Hamster.create({fruits: [
    'grape',
    'kale',
  ]});
  hamster.get('wants'); // ['banana']
  ```

  @method computed.setDiff
  @for Ember
  @param {String} setAProperty
  @param {String} setBProperty
  @return {Ember.ComputedProperty} computes a new array with all the
  items from the first dependent array that are not in the second
  dependent array
*/
Ember.computed.setDiff = function (setAProperty, setBProperty) {
  if (arguments.length !== 2) {
    throw new Ember.Error("setDiff requires exactly two dependent arrays.");
  }
  return Ember.arrayComputed(setAProperty, setBProperty, {
    addedItem: function (array, item, changeMeta, instanceMeta) {
      var setA = get(this, setAProperty),
          setB = get(this, setBProperty);

      if (changeMeta.arrayChanged === setA) {
        if (!setB.contains(item)) {
          array.addObject(item);
        }
      } else {
        array.removeObject(item);
      }
      return array;
    },

    removedItem: function (array, item, changeMeta, instanceMeta) {
      var setA = get(this, setAProperty),
          setB = get(this, setBProperty);

      if (changeMeta.arrayChanged === setB) {
        if (setA.contains(item)) {
          array.addObject(item);
        }
      } else {
        array.removeObject(item);
      }
      return array;
    }
  });
};

function binarySearch(array, item, low, high) {
  var mid, midItem, res, guidMid, guidItem;

  if (arguments.length < 4) { high = get(array, 'length'); }
  if (arguments.length < 3) { low = 0; }

  if (low === high) {
    return low;
  }

  mid = low + Math.floor((high - low) / 2);
  midItem = array.objectAt(mid);

  guidMid = _guidFor(midItem);
  guidItem = _guidFor(item);

  if (guidMid === guidItem) {
    return mid;
  }

  res = this.order(midItem, item);
  if (res === 0) {
    res = guidMid < guidItem ? -1 : 1;
  }


  if (res < 0) {
    return this.binarySearch(array, item, mid+1, high);
  } else if (res > 0) {
    return this.binarySearch(array, item, low, mid);
  }

  return mid;

  function _guidFor(item) {
    if (SearchProxy.detectInstance(item)) {
      return guidFor(get(item, 'content'));
    }
    return guidFor(item);
  }
}


SearchProxy = Ember.ObjectProxy.extend();

/**
  A computed property which returns a new array with all the
  properties from the first dependent array sorted based on a property
  or sort function.

  The callback method you provide should have the following signature:

  ```javascript
  function(itemA, itemB);
  ```

  - `itemA` the first item to compare.
  - `itemB` the second item to compare.

  This function should return `-1` when `itemA` should come before
  `itemB`. It should return `1` when `itemA` should come after
  `itemB`. If the `itemA` and `itemB` are equal this function should return `0`.

  Example

  ```javascript
  var ToDoList = Ember.Object.extend({
    todosSorting: ['name'],
    sortedTodos: Ember.computed.sort('todos', 'todosSorting'),
    priorityTodos: Ember.computed.sort('todos', function(a, b){
      if (a.priority > b.priority) {
        return 1;
      } else if (a.priority < b.priority) {
        return -1;
      }
      return 0;
    }),
  });
  var todoList = ToDoList.create({todos: [
    {name: 'Unit Test', priority: 2},
    {name: 'Documentation', priority: 3},
    {name: 'Release', priority: 1}
  ]});

  todoList.get('sortedTodos'); // [{name:'Documentation', priority:3}, {name:'Release', priority:1}, {name:'Unit Test', priority:2}]
  todoList.get('priorityTodos'); // [{name:'Release', priority:1}, {name:'Unit Test', priority:2}, {name:'Documentation', priority:3}]
  ```

  @method computed.sort
  @for Ember
  @param {String} dependentKey
  @param {String or Function} sortDefinition a dependent key to an
  array of sort properties or a function to use when sorting
  @return {Ember.ComputedProperty} computes a new sorted array based
  on the sort property array or callback function
*/
Ember.computed.sort = function (itemsKey, sortDefinition) {
  Ember.assert("Ember.computed.sort requires two arguments: an array key to sort and either a sort properties key or sort function", arguments.length === 2);

  var initFn, sortPropertiesKey;

  if (typeof sortDefinition === 'function') {
    initFn = function (array, changeMeta, instanceMeta) {
      instanceMeta.order = sortDefinition;
      instanceMeta.binarySearch = binarySearch;
    };
  } else {
    sortPropertiesKey = sortDefinition;
    initFn = function (array, changeMeta, instanceMeta) {
      function setupSortProperties() {
        var sortPropertyDefinitions = get(this, sortPropertiesKey),
            sortProperty,
            sortProperties = instanceMeta.sortProperties = [],
            sortPropertyAscending = instanceMeta.sortPropertyAscending = {},
            idx,
            asc;

        Ember.assert("Cannot sort: '" + sortPropertiesKey + "' is not an array.", Ember.isArray(sortPropertyDefinitions));

        changeMeta.property.clearItemPropertyKeys(itemsKey);

        forEach(sortPropertyDefinitions, function (sortPropertyDefinition) {
          if ((idx = sortPropertyDefinition.indexOf(':')) !== -1) {
            sortProperty = sortPropertyDefinition.substring(0, idx);
            asc = sortPropertyDefinition.substring(idx+1).toLowerCase() !== 'desc';
          } else {
            sortProperty = sortPropertyDefinition;
            asc = true;
          }

          sortProperties.push(sortProperty);
          sortPropertyAscending[sortProperty] = asc;
          changeMeta.property.itemPropertyKey(itemsKey, sortProperty);
        });

        sortPropertyDefinitions.addObserver('@each', this, updateSortPropertiesOnce);
      }

      function updateSortPropertiesOnce() {
        Ember.run.once(this, updateSortProperties, changeMeta.propertyName);
      }

      function updateSortProperties(propertyName) {
        setupSortProperties.call(this);
        changeMeta.property.recomputeOnce.call(this, propertyName);
      }

      Ember.addObserver(this, sortPropertiesKey, updateSortPropertiesOnce);

      setupSortProperties.call(this);


      instanceMeta.order = function (itemA, itemB) {
        var sortProperty, result, asc;
        for (var i = 0; i < this.sortProperties.length; ++i) {
          sortProperty = this.sortProperties[i];
          result = Ember.compare(get(itemA, sortProperty), get(itemB, sortProperty));

          if (result !== 0) {
            asc = this.sortPropertyAscending[sortProperty];
            return asc ? result : (-1 * result);
          }
        }

        return 0;
      };

      instanceMeta.binarySearch = binarySearch;
    };
  }

  return Ember.arrayComputed(itemsKey, {
    initialize: initFn,

    addedItem: function (array, item, changeMeta, instanceMeta) {
      var index = instanceMeta.binarySearch(array, item);
      array.insertAt(index, item);
      return array;
    },

    removedItem: function (array, item, changeMeta, instanceMeta) {
      var proxyProperties, index, searchItem;

      if (changeMeta.previousValues) {
        proxyProperties = merge({ content: item }, changeMeta.previousValues);

        searchItem = SearchProxy.create(proxyProperties);
      } else {
        searchItem = item;
      }

      index = instanceMeta.binarySearch(array, searchItem);
      array.removeAt(index);
      return array;
    }
  });
};

})();



(function() {
Ember.RSVP = requireModule('rsvp');

Ember.RSVP.onerrorDefault = function(error) {
  if (error instanceof Error) {
    if (Ember.testing) {
      if (Ember.Test && Ember.Test.adapter) {
        Ember.Test.adapter.exception(error);
      } else {
        throw error;
      }
    } else {
      Ember.Logger.error(error.stack);
      Ember.assert(error, false);
    }
  }
};

Ember.RSVP.on('error', Ember.RSVP.onerrorDefault);

})();



(function() {
/**
@module ember
@submodule ember-runtime
*/

var a_slice = Array.prototype.slice;

if (Ember.FEATURES.isEnabled('propertyBraceExpansion')) {
  var expandProperties = Ember.expandProperties;
}

if (Ember.EXTEND_PROTOTYPES === true || Ember.EXTEND_PROTOTYPES.Function) {

  /**
    The `property` extension of Javascript's Function prototype is available
    when `Ember.EXTEND_PROTOTYPES` or `Ember.EXTEND_PROTOTYPES.Function` is
    `true`, which is the default.

    Computed properties allow you to treat a function like a property:

    ```javascript
    MyApp.President = Ember.Object.extend({
      firstName: '',
      lastName:  '',

      fullName: function() {
        return this.get('firstName') + ' ' + this.get('lastName');

        // Call this flag to mark the function as a property
      }.property()
    });

    var president = MyApp.President.create({
      firstName: "Barack",
      lastName: "Obama"
    });

    president.get('fullName');    // "Barack Obama"
    ```

    Treating a function like a property is useful because they can work with
    bindings, just like any other property.

    Many computed properties have dependencies on other properties. For
    example, in the above example, the `fullName` property depends on
    `firstName` and `lastName` to determine its value. You can tell Ember
    about these dependencies like this:

    ```javascript
    MyApp.President = Ember.Object.extend({
      firstName: '',
      lastName:  '',

      fullName: function() {
        return this.get('firstName') + ' ' + this.get('lastName');

        // Tell Ember.js that this computed property depends on firstName
        // and lastName
      }.property('firstName', 'lastName')
    });
    ```

    Make sure you list these dependencies so Ember knows when to update
    bindings that connect to a computed property. Changing a dependency
    will not immediately trigger an update of the computed property, but
    will instead clear the cache so that it is updated when the next `get`
    is called on the property.

    See [Ember.ComputedProperty](/api/classes/Ember.ComputedProperty.html), [Ember.computed](/api/#method_computed).

    @method property
    @for Function
  */
  Function.prototype.property = function() {
    var ret = Ember.computed(this);
    // ComputedProperty.prototype.property expands properties; no need for us to
    // do so here.
    return ret.property.apply(ret, arguments);
  };

  /**
    The `observes` extension of Javascript's Function prototype is available
    when `Ember.EXTEND_PROTOTYPES` or `Ember.EXTEND_PROTOTYPES.Function` is
    true, which is the default.

    You can observe property changes simply by adding the `observes`
    call to the end of your method declarations in classes that you write.
    For example:

    ```javascript
    Ember.Object.extend({
      valueObserver: function() {
        // Executes whenever the "value" property changes
      }.observes('value')
    });
    ```

    In the future this method may become asynchronous. If you want to ensure
    synchronous behavior, use `observesImmediately`.

    See `Ember.observer`.

    @method observes
    @for Function
  */
  Function.prototype.observes = function() {
    if (Ember.FEATURES.isEnabled('propertyBraceExpansion')) {
      var addWatchedProperty = function (obs) { watched.push(obs); };
      var watched = [];

      for (var i=0; i<arguments.length; ++i) {
        expandProperties(arguments[i], addWatchedProperty);
      }

      this.__ember_observes__ = watched;
    } else {
      this.__ember_observes__ = a_slice.call(arguments);
    }

    return this;
  };

  /**
    The `observesImmediately` extension of Javascript's Function prototype is
    available when `Ember.EXTEND_PROTOTYPES` or
    `Ember.EXTEND_PROTOTYPES.Function` is true, which is the default.

    You can observe property changes simply by adding the `observesImmediately`
    call to the end of your method declarations in classes that you write.
    For example:

    ```javascript
    Ember.Object.extend({
      valueObserver: function() {
        // Executes immediately after the "value" property changes
      }.observesImmediately('value')
    });
    ```

    In the future, `observes` may become asynchronous. In this event,
    `observesImmediately` will maintain the synchronous behavior.

    See `Ember.immediateObserver`.

    @method observesImmediately
    @for Function
  */
  Function.prototype.observesImmediately = function() {
    for (var i=0, l=arguments.length; i<l; i++) {
      var arg = arguments[i];
      Ember.assert("Immediate observers must observe internal properties only, not properties on other objects.", arg.indexOf('.') === -1);
    }

    // observes handles property expansion
    return this.observes.apply(this, arguments);
  };

  /**
    The `observesBefore` extension of Javascript's Function prototype is
    available when `Ember.EXTEND_PROTOTYPES` or
    `Ember.EXTEND_PROTOTYPES.Function` is true, which is the default.

    You can get notified when a property change is about to happen by
    by adding the `observesBefore` call to the end of your method
    declarations in classes that you write. For example:

    ```javascript
    Ember.Object.extend({
      valueObserver: function() {
        // Executes whenever the "value" property is about to change
      }.observesBefore('value')
    });
    ```

    See `Ember.beforeObserver`.

    @method observesBefore
    @for Function
  */
  Function.prototype.observesBefore = function() {
    if (Ember.FEATURES.isEnabled('propertyBraceExpansion')) {
      var addWatchedProperty = function (obs) { watched.push(obs); };
      var watched = [];

      for (var i=0; i<arguments.length; ++i) {
        expandProperties(arguments[i], addWatchedProperty);
      }

      this.__ember_observesBefore__ = watched;
    } else {
      this.__ember_observesBefore__ = a_slice.call(arguments);
    }

    return this;
  };

  /**
    The `on` extension of Javascript's Function prototype is available
    when `Ember.EXTEND_PROTOTYPES` or `Ember.EXTEND_PROTOTYPES.Function` is
    true, which is the default.

    You can listen for events simply by adding the `on` call to the end of
    your method declarations in classes or mixins that you write. For example:

    ```javascript
    Ember.Mixin.create({
      doSomethingWithElement: function() {
        // Executes whenever the "didInsertElement" event fires
      }.on('didInsertElement')
    });
    ```

    See `Ember.on`.

    @method on
    @for Function
  */
  Function.prototype.on = function() {
    var events = a_slice.call(arguments);
    this.__ember_listens__ = events;
    return this;
  };
}


})();



(function() {

})();



(function() {
/**
@module ember
@submodule ember-runtime
*/


/**
  Implements some standard methods for comparing objects. Add this mixin to
  any class you create that can compare its instances.

  You should implement the `compare()` method.

  @class Comparable
  @namespace Ember
  @since Ember 0.9
*/
Ember.Comparable = Ember.Mixin.create( /** @scope Ember.Comparable.prototype */{

  /**
    Override to return the result of the comparison of the two parameters. The
    compare method should return:

    - `-1` if `a < b`
    - `0` if `a == b`
    - `1` if `a > b`

    Default implementation raises an exception.

    @method compare
    @param a {Object} the first object to compare
    @param b {Object} the second object to compare
    @return {Integer} the result of the comparison
  */
  compare: Ember.required(Function)

});


})();



(function() {
/**
@module ember
@submodule ember-runtime
*/



var get = Ember.get, set = Ember.set;

/**
  Implements some standard methods for copying an object. Add this mixin to
  any object you create that can create a copy of itself. This mixin is
  added automatically to the built-in array.

  You should generally implement the `copy()` method to return a copy of the
  receiver.

  Note that `frozenCopy()` will only work if you also implement
  `Ember.Freezable`.

  @class Copyable
  @namespace Ember
  @since Ember 0.9
*/
Ember.Copyable = Ember.Mixin.create(/** @scope Ember.Copyable.prototype */ {

  /**
    Override to return a copy of the receiver. Default implementation raises
    an exception.

    @method copy
    @param {Boolean} deep if `true`, a deep copy of the object should be made
    @return {Object} copy of receiver
  */
  copy: Ember.required(Function),

  /**
    If the object implements `Ember.Freezable`, then this will return a new
    copy if the object is not frozen and the receiver if the object is frozen.

    Raises an exception if you try to call this method on a object that does
    not support freezing.

    You should use this method whenever you want a copy of a freezable object
    since a freezable object can simply return itself without actually
    consuming more memory.

    @method frozenCopy
    @return {Object} copy of receiver or receiver
  */
  frozenCopy: function() {
    if (Ember.Freezable && Ember.Freezable.detect(this)) {
      return get(this, 'isFrozen') ? this : this.copy().freeze();
    } else {
      throw new Ember.Error(Ember.String.fmt("%@ does not support freezing", [this]));
    }
  }
});

})();



(function() {
/**
@module ember
@submodule ember-runtime
*/


var get = Ember.get, set = Ember.set;

/**
  The `Ember.Freezable` mixin implements some basic methods for marking an
  object as frozen. Once an object is frozen it should be read only. No changes
  may be made the internal state of the object.

  ## Enforcement

  To fully support freezing in your subclass, you must include this mixin and
  override any method that might alter any property on the object to instead
  raise an exception. You can check the state of an object by checking the
  `isFrozen` property.

  Although future versions of JavaScript may support language-level freezing
  object objects, that is not the case today. Even if an object is freezable,
  it is still technically possible to modify the object, even though it could
  break other parts of your application that do not expect a frozen object to
  change. It is, therefore, very important that you always respect the
  `isFrozen` property on all freezable objects.

  ## Example Usage

  The example below shows a simple object that implement the `Ember.Freezable`
  protocol.

  ```javascript
  Contact = Ember.Object.extend(Ember.Freezable, {
    firstName: null,
    lastName: null,

    // swaps the names
    swapNames: function() {
      if (this.get('isFrozen')) throw Ember.FROZEN_ERROR;
      var tmp = this.get('firstName');
      this.set('firstName', this.get('lastName'));
      this.set('lastName', tmp);
      return this;
    }

  });

  c = Contact.create({ firstName: "John", lastName: "Doe" });
  c.swapNames();  // returns c
  c.freeze();
  c.swapNames();  // EXCEPTION
  ```

  ## Copying

  Usually the `Ember.Freezable` protocol is implemented in cooperation with the
  `Ember.Copyable` protocol, which defines a `frozenCopy()` method that will
  return a frozen object, if the object implements this method as well.

  @class Freezable
  @namespace Ember
  @since Ember 0.9
*/
Ember.Freezable = Ember.Mixin.create(/** @scope Ember.Freezable.prototype */ {

  /**
    Set to `true` when the object is frozen. Use this property to detect
    whether your object is frozen or not.

    @property isFrozen
    @type Boolean
  */
  isFrozen: false,

  /**
    Freezes the object. Once this method has been called the object should
    no longer allow any properties to be edited.

    @method freeze
    @return {Object} receiver
  */
  freeze: function() {
    if (get(this, 'isFrozen')) return this;
    set(this, 'isFrozen', true);
    return this;
  }

});

Ember.FROZEN_ERROR = "Frozen object cannot be modified.";

})();



(function() {
/**
@module ember
@submodule ember-runtime
*/

var forEach = Ember.EnumerableUtils.forEach;

/**
  This mixin defines the API for modifying generic enumerables. These methods
  can be applied to an object regardless of whether it is ordered or
  unordered.

  Note that an Enumerable can change even if it does not implement this mixin.
  For example, a MappedEnumerable cannot be directly modified but if its
  underlying enumerable changes, it will change also.

  ## Adding Objects

  To add an object to an enumerable, use the `addObject()` method. This
  method will only add the object to the enumerable if the object is not
  already present and is of a type supported by the enumerable.

  ```javascript
  set.addObject(contact);
  ```

  ## Removing Objects

  To remove an object from an enumerable, use the `removeObject()` method. This
  will only remove the object if it is present in the enumerable, otherwise
  this method has no effect.

  ```javascript
  set.removeObject(contact);
  ```

  ## Implementing In Your Own Code

  If you are implementing an object and want to support this API, just include
  this mixin in your class and implement the required methods. In your unit
  tests, be sure to apply the Ember.MutableEnumerableTests to your object.

  @class MutableEnumerable
  @namespace Ember
  @uses Ember.Enumerable
*/
Ember.MutableEnumerable = Ember.Mixin.create(Ember.Enumerable, {

  /**
    __Required.__ You must implement this method to apply this mixin.

    Attempts to add the passed object to the receiver if the object is not
    already present in the collection. If the object is present, this method
    has no effect.

    If the passed object is of a type not supported by the receiver,
    then this method should raise an exception.

    @method addObject
    @param {Object} object The object to add to the enumerable.
    @return {Object} the passed object
  */
  addObject: Ember.required(Function),

  /**
    Adds each object in the passed enumerable to the receiver.

    @method addObjects
    @param {Ember.Enumerable} objects the objects to add.
    @return {Object} receiver
  */
  addObjects: function(objects) {
    Ember.beginPropertyChanges(this);
    forEach(objects, function(obj) { this.addObject(obj); }, this);
    Ember.endPropertyChanges(this);
    return this;
  },

  /**
    __Required.__ You must implement this method to apply this mixin.

    Attempts to remove the passed object from the receiver collection if the
    object is present in the collection. If the object is not present,
    this method has no effect.

    If the passed object is of a type not supported by the receiver,
    then this method should raise an exception.

    @method removeObject
    @param {Object} object The object to remove from the enumerable.
    @return {Object} the passed object
  */
  removeObject: Ember.required(Function),


  /**
    Removes each object in the passed enumerable from the receiver.

    @method removeObjects
    @param {Ember.Enumerable} objects the objects to remove
    @return {Object} receiver
  */
  removeObjects: function(objects) {
    Ember.beginPropertyChanges(this);
    forEach(objects, function(obj) { this.removeObject(obj); }, this);
    Ember.endPropertyChanges(this);
    return this;
  }

});

})();



(function() {
/**
@module ember
@submodule ember-runtime
*/
// ..........................................................
// CONSTANTS
//

var OUT_OF_RANGE_EXCEPTION = "Index out of range" ;
var EMPTY = [];

// ..........................................................
// HELPERS
//

var get = Ember.get, set = Ember.set;

/**
  This mixin defines the API for modifying array-like objects. These methods
  can be applied only to a collection that keeps its items in an ordered set.

  Note that an Array can change even if it does not implement this mixin.
  For example, one might implement a SparseArray that cannot be directly
  modified, but if its underlying enumerable changes, it will change also.

  @class MutableArray
  @namespace Ember
  @uses Ember.Array
  @uses Ember.MutableEnumerable
*/
Ember.MutableArray = Ember.Mixin.create(Ember.Array, Ember.MutableEnumerable,/** @scope Ember.MutableArray.prototype */ {

  /**
    __Required.__ You must implement this method to apply this mixin.

    This is one of the primitives you must implement to support `Ember.Array`.
    You should replace amt objects started at idx with the objects in the
    passed array. You should also call `this.enumerableContentDidChange()`

    @method replace
    @param {Number} idx Starting index in the array to replace. If
      idx >= length, then append to the end of the array.
    @param {Number} amt Number of elements that should be removed from
      the array, starting at *idx*.
    @param {Array} objects An array of zero or more objects that should be
      inserted into the array at *idx*
  */
  replace: Ember.required(),

  /**
    Remove all elements from self. This is useful if you
    want to reuse an existing array without having to recreate it.

    ```javascript
    var colors = ["red", "green", "blue"];
    color.length();   //  3
    colors.clear();   //  []
    colors.length();  //  0
    ```

    @method clear
    @return {Ember.Array} An empty Array.
  */
  clear: function () {
    var len = get(this, 'length');
    if (len === 0) return this;
    this.replace(0, len, EMPTY);
    return this;
  },

  /**
    This will use the primitive `replace()` method to insert an object at the
    specified index.

    ```javascript
    var colors = ["red", "green", "blue"];
    colors.insertAt(2, "yellow");  // ["red", "green", "yellow", "blue"]
    colors.insertAt(5, "orange");  // Error: Index out of range
    ```

    @method insertAt
    @param {Number} idx index of insert the object at.
    @param {Object} object object to insert
    @return this
  */
  insertAt: function(idx, object) {
    if (idx > get(this, 'length')) throw new Ember.Error(OUT_OF_RANGE_EXCEPTION) ;
    this.replace(idx, 0, [object]) ;
    return this ;
  },

  /**
    Remove an object at the specified index using the `replace()` primitive
    method. You can pass either a single index, or a start and a length.

    If you pass a start and length that is beyond the
    length this method will throw an `OUT_OF_RANGE_EXCEPTION`.

    ```javascript
    var colors = ["red", "green", "blue", "yellow", "orange"];
    colors.removeAt(0);     // ["green", "blue", "yellow", "orange"]
    colors.removeAt(2, 2);  // ["green", "blue"]
    colors.removeAt(4, 2);  // Error: Index out of range
    ```

    @method removeAt
    @param {Number} start index, start of range
    @param {Number} len length of passing range
    @return {Object} receiver
  */
  removeAt: function(start, len) {
    if ('number' === typeof start) {

      if ((start < 0) || (start >= get(this, 'length'))) {
        throw new Ember.Error(OUT_OF_RANGE_EXCEPTION);
      }

      // fast case
      if (len === undefined) len = 1;
      this.replace(start, len, EMPTY);
    }

    return this ;
  },

  /**
    Push the object onto the end of the array. Works just like `push()` but it
    is KVO-compliant.

    ```javascript
    var colors = ["red", "green"];
    colors.pushObject("black");     // ["red", "green", "black"]
    colors.pushObject(["yellow"]);  // ["red", "green", ["yellow"]]
    ```

    @method pushObject
    @param {*} obj object to push
    @return The same obj passed as param
  */
  pushObject: function(obj) {
    this.insertAt(get(this, 'length'), obj) ;
    return obj;
  },

  /**
    Add the objects in the passed numerable to the end of the array. Defers
    notifying observers of the change until all objects are added.

    ```javascript
    var colors = ["red"];
    colors.pushObjects(["yellow", "orange"]);  // ["red", "yellow", "orange"]
    ```

    @method pushObjects
    @param {Ember.Enumerable} objects the objects to add
    @return {Ember.Array} receiver
  */
  pushObjects: function(objects) {
    if (!(Ember.Enumerable.detect(objects) || Ember.isArray(objects))) {
      throw new TypeError("Must pass Ember.Enumerable to Ember.MutableArray#pushObjects");
    }
    this.replace(get(this, 'length'), 0, objects);
    return this;
  },

  /**
    Pop object from array or nil if none are left. Works just like `pop()` but
    it is KVO-compliant.

    ```javascript
    var colors = ["red", "green", "blue"];
    colors.popObject();   // "blue"
    console.log(colors);  // ["red", "green"]
    ```

    @method popObject
    @return object
  */
  popObject: function() {
    var len = get(this, 'length') ;
    if (len === 0) return null ;

    var ret = this.objectAt(len-1) ;
    this.removeAt(len-1, 1) ;
    return ret ;
  },

  /**
    Shift an object from start of array or nil if none are left. Works just
    like `shift()` but it is KVO-compliant.

    ```javascript
    var colors = ["red", "green", "blue"];
    colors.shiftObject();  // "red"
    console.log(colors);   // ["green", "blue"]
    ```

    @method shiftObject
    @return object
  */
  shiftObject: function() {
    if (get(this, 'length') === 0) return null ;
    var ret = this.objectAt(0) ;
    this.removeAt(0) ;
    return ret ;
  },

  /**
    Unshift an object to start of array. Works just like `unshift()` but it is
    KVO-compliant.

    ```javascript
    var colors = ["red"];
    colors.unshiftObject("yellow");    // ["yellow", "red"]
    colors.unshiftObject(["black"]);   // [["black"], "yellow", "red"]
    ```

    @method unshiftObject
    @param {*} obj object to unshift
    @return The same obj passed as param
  */
  unshiftObject: function(obj) {
    this.insertAt(0, obj) ;
    return obj ;
  },

  /**
    Adds the named objects to the beginning of the array. Defers notifying
    observers until all objects have been added.

    ```javascript
    var colors = ["red"];
    colors.unshiftObjects(["black", "white"]);   // ["black", "white", "red"]
    colors.unshiftObjects("yellow"); // Type Error: 'undefined' is not a function
    ```

    @method unshiftObjects
    @param {Ember.Enumerable} objects the objects to add
    @return {Ember.Array} receiver
  */
  unshiftObjects: function(objects) {
    this.replace(0, 0, objects);
    return this;
  },

  /**
    Reverse objects in the array. Works just like `reverse()` but it is
    KVO-compliant.

    @method reverseObjects
    @return {Ember.Array} receiver
   */
  reverseObjects: function() {
    var len = get(this, 'length');
    if (len === 0) return this;
    var objects = this.toArray().reverse();
    this.replace(0, len, objects);
    return this;
  },

  /**
    Replace all the the receiver's content with content of the argument.
    If argument is an empty array receiver will be cleared.

    ```javascript
    var colors = ["red", "green", "blue"];
    colors.setObjects(["black", "white"]);  // ["black", "white"]
    colors.setObjects([]);                  // []
    ```

    @method setObjects
    @param {Ember.Array} objects array whose content will be used for replacing
        the content of the receiver
    @return {Ember.Array} receiver with the new content
   */
  setObjects: function(objects) {
    if (objects.length === 0) return this.clear();

    var len = get(this, 'length');
    this.replace(0, len, objects);
    return this;
  },

  // ..........................................................
  // IMPLEMENT Ember.MutableEnumerable
  //

  removeObject: function(obj) {
    var loc = get(this, 'length') || 0;
    while(--loc >= 0) {
      var curObject = this.objectAt(loc) ;
      if (curObject === obj) this.removeAt(loc) ;
    }
    return this ;
  },

  addObject: function(obj) {
    if (!this.contains(obj)) this.pushObject(obj);
    return this ;
  }

});

})();



(function() {
/**
@module ember
@submodule ember-runtime
*/

var get = Ember.get, set = Ember.set;

/**
`Ember.TargetActionSupport` is a mixin that can be included in a class
to add a `triggerAction` method with semantics similar to the Handlebars
`{{action}}` helper. In normal Ember usage, the `{{action}}` helper is
usually the best choice. This mixin is most often useful when you are
doing more complex event handling in View objects.

See also `Ember.ViewTargetActionSupport`, which has
view-aware defaults for target and actionContext.

@class TargetActionSupport
@namespace Ember
@extends Ember.Mixin
*/
Ember.TargetActionSupport = Ember.Mixin.create({
  target: null,
  action: null,
  actionContext: null,

  targetObject: Ember.computed(function() {
    var target = get(this, 'target');

    if (Ember.typeOf(target) === "string") {
      var value = get(this, target);
      if (value === undefined) { value = get(Ember.lookup, target); }
      return value;
    } else {
      return target;
    }
  }).property('target'),

  actionContextObject: Ember.computed(function() {
    var actionContext = get(this, 'actionContext');

    if (Ember.typeOf(actionContext) === "string") {
      var value = get(this, actionContext);
      if (value === undefined) { value = get(Ember.lookup, actionContext); }
      return value;
    } else {
      return actionContext;
    }
  }).property('actionContext'),

  /**
  Send an "action" with an "actionContext" to a "target". The action, actionContext
  and target will be retrieved from properties of the object. For example:

  ```javascript
  App.SaveButtonView = Ember.View.extend(Ember.TargetActionSupport, {
    target: Ember.computed.alias('controller'),
    action: 'save',
    actionContext: Ember.computed.alias('context'),
    click: function() {
      this.triggerAction(); // Sends the `save` action, along with the current context
                            // to the current controller
    }
  });
  ```

  The `target`, `action`, and `actionContext` can be provided as properties of
  an optional object argument to `triggerAction` as well.

  ```javascript
  App.SaveButtonView = Ember.View.extend(Ember.TargetActionSupport, {
    click: function() {
      this.triggerAction({
        action: 'save',
        target: this.get('controller'),
        actionContext: this.get('context'),
      }); // Sends the `save` action, along with the current context
          // to the current controller
    }
  });
  ```

  The `actionContext` defaults to the object you mixing `TargetActionSupport` into.
  But `target` and `action` must be specified either as properties or with the argument
  to `triggerAction`, or a combination:

  ```javascript
  App.SaveButtonView = Ember.View.extend(Ember.TargetActionSupport, {
    target: Ember.computed.alias('controller'),
    click: function() {
      this.triggerAction({
        action: 'save'
      }); // Sends the `save` action, along with a reference to `this`,
          // to the current controller
    }
  });
  ```

  @method triggerAction
  @param opts {Hash} (optional, with the optional keys action, target and/or actionContext)
  @return {Boolean} true if the action was sent successfully and did not return false
  */
  triggerAction: function(opts) {
    opts = opts || {};
    var action = opts.action || get(this, 'action'),
        target = opts.target || get(this, 'targetObject'),
        actionContext = opts.actionContext;

    function args(options, actionName) {
      var ret = [];
      if (actionName) { ret.push(actionName); }

      return ret.concat(options);
    }

    if (typeof actionContext === 'undefined') {
      actionContext = get(this, 'actionContextObject') || this;
    }

    if (target && action) {
      var ret;

      if (target.send) {
        ret = target.send.apply(target, args(actionContext, action));
      } else {
        Ember.assert("The action '" + action + "' did not exist on " + target, typeof target[action] === 'function');
        ret = target[action].apply(target, args(actionContext));
      }

      if (ret !== false) ret = true;

      return ret;
    } else {
      return false;
    }
  }
});

})();



(function() {
/**
@module ember
@submodule ember-runtime
*/

/**
  This mixin allows for Ember objects to subscribe to and emit events.

  ```javascript
  App.Person = Ember.Object.extend(Ember.Evented, {
    greet: function() {
      // ...
      this.trigger('greet');
    }
  });

  var person = App.Person.create();

  person.on('greet', function() {
    console.log('Our person has greeted');
  });

  person.greet();

  // outputs: 'Our person has greeted'
  ```

  You can also chain multiple event subscriptions:

  ```javascript
  person.on('greet', function() {
    console.log('Our person has greeted');
  }).one('greet', function() {
    console.log('Offer one-time special');
  }).off('event', this, forgetThis);
  ```

  @class Evented
  @namespace Ember
 */
Ember.Evented = Ember.Mixin.create({

  /**
   Subscribes to a named event with given function.

   ```javascript
   person.on('didLoad', function() {
     // fired once the person has loaded
   });
   ```

   An optional target can be passed in as the 2nd argument that will
   be set as the "this" for the callback. This is a good way to give your
   function access to the object triggering the event. When the target
   parameter is used the callback becomes the third argument.

   @method on
   @param {String} name The name of the event
   @param {Object} [target] The "this" binding for the callback
   @param {Function} method The callback to execute
   @return this
  */
  on: function(name, target, method) {
    Ember.addListener(this, name, target, method);
    return this;
  },

  /**
    Subscribes a function to a named event and then cancels the subscription
    after the first time the event is triggered. It is good to use ``one`` when
    you only care about the first time an event has taken place.

    This function takes an optional 2nd argument that will become the "this"
    value for the callback. If this argument is passed then the 3rd argument
    becomes the function.

    @method one
    @param {String} name The name of the event
    @param {Object} [target] The "this" binding for the callback
    @param {Function} method The callback to execute
    @return this
  */
  one: function(name, target, method) {
    if (!method) {
      method = target;
      target = null;
    }

    Ember.addListener(this, name, target, method, true);
    return this;
  },

  /**
    Triggers a named event for the object. Any additional arguments
    will be passed as parameters to the functions that are subscribed to the
    event.

    ```javascript
    person.on('didEat', function(food) {
      console.log('person ate some ' + food);
    });

    person.trigger('didEat', 'broccoli');

    // outputs: person ate some broccoli
    ```
    @method trigger
    @param {String} name The name of the event
    @param {Object...} args Optional arguments to pass on
  */
  trigger: function(name) {
    var args = [], i, l;
    for (i = 1, l = arguments.length; i < l; i++) {
      args.push(arguments[i]);
    }
    Ember.sendEvent(this, name, args);
  },

  /**
    Cancels subscription for given name, target, and method.

    @method off
    @param {String} name The name of the event
    @param {Object} target The target of the subscription
    @param {Function} method The function of the subscription
    @return this
  */
  off: function(name, target, method) {
    Ember.removeListener(this, name, target, method);
    return this;
  },

  /**
    Checks to see if object has any subscriptions for named event.

    @method has
    @param {String} name The name of the event
    @return {Boolean} does the object have a subscription for event
   */
  has: function(name) {
    return Ember.hasListeners(this, name);
  }
});

})();



(function() {
var RSVP = requireModule("rsvp");

RSVP.configure('async', function(callback, promise) {
  Ember.run.schedule('actions', promise, callback, promise);
});

RSVP.Promise.prototype.fail = function(callback, label){
  Ember.deprecate('RSVP.Promise.fail has been renamed as RSVP.Promise.catch');
  return this['catch'](callback, label);
};

/**
@module ember
@submodule ember-runtime
*/

var get = Ember.get;

/**
  @class Deferred
  @namespace Ember
 */
Ember.DeferredMixin = Ember.Mixin.create({
  /**
    Add handlers to be called when the Deferred object is resolved or rejected.

    @method then
    @param {Function} resolve a callback function to be called when done
    @param {Function} reject  a callback function to be called when failed
  */
  then: function(resolve, reject) {
    var deferred, promise, entity;

    entity = this;
    deferred = get(this, '_deferred');
    promise = deferred.promise;

    function fulfillmentHandler(fulfillment) {
      if (fulfillment === promise) {
        return resolve(entity);
      } else {
        return resolve(fulfillment);
      }
    }

    return promise.then(resolve && fulfillmentHandler, reject);
  },

  /**
    Resolve a Deferred object and call any `doneCallbacks` with the given args.

    @method resolve
  */
  resolve: function(value) {
    var deferred, promise;

    deferred = get(this, '_deferred');
    promise = deferred.promise;

    if (value === this) {
      deferred.resolve(promise);
    } else {
      deferred.resolve(value);
    }
  },

  /**
    Reject a Deferred object and call any `failCallbacks` with the given args.

    @method reject
  */
  reject: function(value) {
    get(this, '_deferred').reject(value);
  },

  _deferred: Ember.computed(function() {
    return RSVP.defer();
  })
});


})();



(function() {
/**
@module ember
@submodule ember-runtime
*/

var get = Ember.get, typeOf = Ember.typeOf;

/**
  The `Ember.ActionHandler` mixin implements support for moving an `actions`
  property to an `_actions` property at extend time, and adding `_actions`
  to the object's mergedProperties list.

  `Ember.ActionHandler` is used internally by Ember in  `Ember.View`,
  `Ember.Controller`, and `Ember.Route`.

  @class ActionHandler
  @namespace Ember
*/
Ember.ActionHandler = Ember.Mixin.create({
  mergedProperties: ['_actions'],

  /**
    @private

    Moves `actions` to `_actions` at extend time. Note that this currently
    modifies the mixin themselves, which is technically dubious but
    is practically of little consequence. This may change in the future.

    @method willMergeMixin
  */
  willMergeMixin: function(props) {
    var hashName;

    if (!props._actions) {
      Ember.assert(this + " 'actions' should not be a function", typeof(props.actions) !== 'function');

      if (typeOf(props.actions) === 'object') {
        hashName = 'actions';
      } else if (typeOf(props.events) === 'object') {
        Ember.deprecate('Action handlers contained in an `events` object are deprecated in favor of putting them in an `actions` object', false);
        hashName = 'events';
      }

      if (hashName) {
        props._actions = Ember.merge(props._actions || {}, props[hashName]);
      }

      delete props[hashName];
    }
  },

  send: function(actionName) {
    var args = [].slice.call(arguments, 1), target;

    if (this._actions && this._actions[actionName]) {
      if (this._actions[actionName].apply(this, args) === true) {
        // handler returned true, so this action will bubble
      } else {
        return;
      }
    } else if (this.deprecatedSend && this.deprecatedSendHandles && this.deprecatedSendHandles(actionName)) {
      if (this.deprecatedSend.apply(this, [].slice.call(arguments)) === true) {
        // handler return true, so this action will bubble
      } else {
        return;
      }
    }

    if (target = get(this, 'target')) {
      Ember.assert("The `target` for " + this + " (" + target + ") does not have a `send` method", typeof target.send === 'function');
      target.send.apply(target, arguments);
    }
  }

});

})();



(function() {
var set = Ember.set, get = Ember.get,
    not = Ember.computed.not,
    or = Ember.computed.or;

/**
  @module ember
  @submodule ember-runtime
 */

function tap(proxy, promise) {
  return promise.then(function(value) {
    set(proxy, 'isFulfilled', true);
    set(proxy, 'content', value);
    return value;
  }, function(reason) {
    set(proxy, 'isRejected', true);
    set(proxy, 'reason', reason);
    throw reason;
  });
}

/**
  A low level mixin making ObjectProxy, ObjectController or ArrayController's promise aware.

  ```javascript
  var ObjectPromiseController = Ember.ObjectController.extend(Ember.PromiseProxyMixin);

  var controller = ObjectPromiseController.create({
    promise: $.getJSON('/some/remote/data.json')
  });

  controller.then(function(json){
     // the json
  }, function(reason) {
     // the reason why you have no json
  });
  ```

  the controller has bindable attributes which
  track the promises life cycle

  ```javascript
  controller.get('isPending')   //=> true
  controller.get('isSettled')  //=> false
  controller.get('isRejected')  //=> false
  controller.get('isFulfilled') //=> false
  ```

  When the the $.getJSON completes, and the promise is fulfilled
  with json, the life cycle attributes will update accordingly.

  ```javascript
  controller.get('isPending')   //=> false
  controller.get('isSettled')   //=> true
  controller.get('isRejected')  //=> false
  controller.get('isFulfilled') //=> true
  ```

  As the controller is an ObjectController, and the json now its content,
  all the json properties will be available directly from the controller.

  ```javascript
  // Assuming the following json:
  {
    firstName: 'Stefan',
    lastName: 'Penner'
  }

  // both properties will accessible on the controller
  controller.get('firstName') //=> 'Stefan'
  controller.get('lastName')  //=> 'Penner'
  ```

  If the controller is backing a template, the attributes are 
  bindable from within that template

  ```handlebars
  {{#if isPending}}
    loading...
  {{else}}
    firstName: {{firstName}}
    lastName: {{lastName}}
  {{/if}}
  ```
  @class Ember.PromiseProxyMixin
*/
Ember.PromiseProxyMixin = Ember.Mixin.create({
  reason:    null,
  isPending:  not('isSettled').readOnly(),
  isSettled:  or('isRejected', 'isFulfilled').readOnly(),
  isRejected:  false,
  isFulfilled: false,

  promise: Ember.computed(function(key, promise) {
    if (arguments.length === 2) {
      return tap(this, promise);
    } else {
      throw new Ember.Error("PromiseProxy's promise must be set");
    }
  }),

  then: function(fulfill, reject) {
    return get(this, 'promise').then(fulfill, reject);
  }
});



})();



(function() {

})();



(function() {
var get = Ember.get,
    forEach = Ember.EnumerableUtils.forEach,
    RETAIN = 'r',
    INSERT = 'i',
    DELETE = 'd';

/**
  An `Ember.TrackedArray` tracks array operations.  It's useful when you want to
  lazily compute the indexes of items in an array after they've been shifted by
  subsequent operations.

  @class TrackedArray
  @namespace Ember
  @param {array} [items=[]] The array to be tracked.  This is used just to get
  the initial items for the starting state of retain:n.
*/
Ember.TrackedArray = function (items) {
  if (arguments.length < 1) { items = []; }

  var length = get(items, 'length');

  if (length) {
    this._operations = [new ArrayOperation(RETAIN, length, items)];
  } else {
    this._operations = [];
  }
};

Ember.TrackedArray.RETAIN = RETAIN;
Ember.TrackedArray.INSERT = INSERT;
Ember.TrackedArray.DELETE = DELETE;

Ember.TrackedArray.prototype = {

  /**
    Track that `newItems` were added to the tracked array at `index`.

    @method addItems
    @param index
    @param newItems
  */
  addItems: function (index, newItems) {
    var count = get(newItems, 'length');
    if (count < 1) { return; }

    var match = this._findArrayOperation(index),
        arrayOperation = match.operation,
        arrayOperationIndex = match.index,
        arrayOperationRangeStart = match.rangeStart,
        composeIndex,
        splitIndex,
        splitItems,
        splitArrayOperation,
        newArrayOperation;

    newArrayOperation = new ArrayOperation(INSERT, count, newItems);

    if (arrayOperation) {
      if (!match.split) {
        // insert left of arrayOperation
        this._operations.splice(arrayOperationIndex, 0, newArrayOperation);
        composeIndex = arrayOperationIndex;
      } else {
        this._split(arrayOperationIndex, index - arrayOperationRangeStart, newArrayOperation);
        composeIndex = arrayOperationIndex + 1;
      }
    } else {
      // insert at end
      this._operations.push(newArrayOperation);
      composeIndex = arrayOperationIndex;
    }

    this._composeInsert(composeIndex);
  },

  /**
    Track that `count` items were removed at `index`.

    @method removeItems
    @param index
    @param count
  */
  removeItems: function (index, count) {
    if (count < 1) { return; }

    var match = this._findArrayOperation(index),
        arrayOperation = match.operation,
        arrayOperationIndex = match.index,
        arrayOperationRangeStart = match.rangeStart,
        newArrayOperation,
        composeIndex;

    newArrayOperation = new ArrayOperation(DELETE, count);
    if (!match.split) {
      // insert left of arrayOperation
      this._operations.splice(arrayOperationIndex, 0, newArrayOperation);
      composeIndex = arrayOperationIndex;
    } else {
      this._split(arrayOperationIndex, index - arrayOperationRangeStart, newArrayOperation);
      composeIndex = arrayOperationIndex + 1;
    }

    return this._composeDelete(composeIndex);
  },

  /**
    Apply all operations, reducing them to retain:n, for `n`, the number of
    items in the array.

    `callback` will be called for each operation and will be passed the following arguments:
      * {array} items The items for the given operation
      * {number} offset The computed offset of the items, ie the index in the
      array of the first item for this operation.
      * {string} operation The type of the operation.  One of
      `Ember.TrackedArray.{RETAIN, DELETE, INSERT}`

    @method apply
    @param {function} callback
  */
  apply: function (callback) {
    var items = [],
        offset = 0;

    forEach(this._operations, function (arrayOperation) {
      callback(arrayOperation.items, offset, arrayOperation.type);

      if (arrayOperation.type !== DELETE) {
        offset += arrayOperation.count;
        items = items.concat(arrayOperation.items);
      }
    });

    this._operations = [new ArrayOperation(RETAIN, items.length, items)];
  },

  /**
    Return an ArrayOperationMatch for the operation that contains the item at `index`.

    @method _findArrayOperation

    @param {number} index the index of the item whose operation information
    should be returned.
    @private
  */
  _findArrayOperation: function (index) {
    var arrayOperationIndex,
        len,
        split = false,
        arrayOperation,
        arrayOperationRangeStart,
        arrayOperationRangeEnd;

    // OPTIMIZE: we could search these faster if we kept a balanced tree.
    // find leftmost arrayOperation to the right of `index`
    for (arrayOperationIndex = arrayOperationRangeStart = 0, len = this._operations.length; arrayOperationIndex < len; ++arrayOperationIndex) {
      arrayOperation = this._operations[arrayOperationIndex];

      if (arrayOperation.type === DELETE) { continue; }

      arrayOperationRangeEnd = arrayOperationRangeStart + arrayOperation.count - 1;

      if (index === arrayOperationRangeStart) {
        break;
      } else if (index > arrayOperationRangeStart && index <= arrayOperationRangeEnd) {
        split = true;
        break;
      } else {
        arrayOperationRangeStart = arrayOperationRangeEnd + 1;
      }
    }

    return new ArrayOperationMatch(arrayOperation, arrayOperationIndex, split, arrayOperationRangeStart);
  },

  _split: function (arrayOperationIndex, splitIndex, newArrayOperation) {
    var arrayOperation = this._operations[arrayOperationIndex],
        splitItems = arrayOperation.items.slice(splitIndex),
        splitArrayOperation = new ArrayOperation(arrayOperation.type, splitItems.length, splitItems);

    // truncate LHS
    arrayOperation.count = splitIndex;
    arrayOperation.items = arrayOperation.items.slice(0, splitIndex);

    this._operations.splice(arrayOperationIndex + 1, 0, newArrayOperation, splitArrayOperation);
  },

  // see SubArray for a better implementation.
  _composeInsert: function (index) {
    var newArrayOperation = this._operations[index],
        leftArrayOperation = this._operations[index-1], // may be undefined
        rightArrayOperation = this._operations[index+1], // may be undefined
        leftOp = leftArrayOperation && leftArrayOperation.type,
        rightOp = rightArrayOperation && rightArrayOperation.type;

    if (leftOp === INSERT) {
        // merge left
        leftArrayOperation.count += newArrayOperation.count;
        leftArrayOperation.items = leftArrayOperation.items.concat(newArrayOperation.items);

      if (rightOp === INSERT) {
        // also merge right (we have split an insert with an insert)
        leftArrayOperation.count += rightArrayOperation.count;
        leftArrayOperation.items = leftArrayOperation.items.concat(rightArrayOperation.items);
        this._operations.splice(index, 2);
      } else {
        // only merge left
        this._operations.splice(index, 1);
      }
    } else if (rightOp === INSERT) {
      // merge right
      newArrayOperation.count += rightArrayOperation.count;
      newArrayOperation.items = newArrayOperation.items.concat(rightArrayOperation.items);
      this._operations.splice(index + 1, 1);
    }
  },

  _composeDelete: function (index) {
    var arrayOperation = this._operations[index],
        deletesToGo = arrayOperation.count,
        leftArrayOperation = this._operations[index-1], // may be undefined
        leftOp = leftArrayOperation && leftArrayOperation.type,
        nextArrayOperation,
        nextOp,
        nextCount,
        removeNewAndNextOp = false,
        removedItems = [];

    if (leftOp === DELETE) {
      arrayOperation = leftArrayOperation;
      index -= 1;
    }

    for (var i = index + 1; deletesToGo > 0; ++i) {
      nextArrayOperation = this._operations[i];
      nextOp = nextArrayOperation.type;
      nextCount = nextArrayOperation.count;

      if (nextOp === DELETE) {
        arrayOperation.count += nextCount;
        continue;
      }

      if (nextCount > deletesToGo) {
        // d:2 {r,i}:5  we reduce the retain or insert, but it stays
        removedItems = removedItems.concat(nextArrayOperation.items.splice(0, deletesToGo));
        nextArrayOperation.count -= deletesToGo;

        // In the case where we truncate the last arrayOperation, we don't need to
        // remove it; also the deletesToGo reduction is not the entirety of
        // nextCount
        i -= 1;
        nextCount = deletesToGo;

        deletesToGo = 0;
      } else {
        if (nextCount === deletesToGo) {
          // Handle edge case of d:2 i:2 in which case both operations go away
          // during composition.
          removeNewAndNextOp = true;
        }
        removedItems = removedItems.concat(nextArrayOperation.items);
        deletesToGo -= nextCount;
      }

      if (nextOp === INSERT) {
        // d:2 i:3 will result in delete going away
        arrayOperation.count -= nextCount;
      }
    }

    if (arrayOperation.count > 0) {
      // compose our new delete with possibly several operations to the right of
      // disparate types
      this._operations.splice(index+1, i-1-index);
    } else {
      // The delete operation can go away; it has merely reduced some other
      // operation, as in d:3 i:4; it may also have eliminated that operation,
      // as in d:3 i:3.
      this._operations.splice(index, removeNewAndNextOp ? 2 : 1);
    }

    return removedItems;
  },

  toString: function () {
    var str = "";
    forEach(this._operations, function (operation) {
      str += " " + operation.type + ":" + operation.count;
    });
    return str.substring(1);
  }
};

/**
  Internal data structure to represent an array operation.

  @method ArrayOperation
  @private
  @property {string} type The type of the operation.  One of
  `Ember.TrackedArray.{RETAIN, INSERT, DELETE}`
  @property {number} count The number of items in this operation.
  @property {array} items The items of the operation, if included.  RETAIN and
  INSERT include their items, DELETE does not.
*/
function ArrayOperation (operation, count, items) {
  this.type = operation; // RETAIN | INSERT | DELETE
  this.count = count;
  this.items = items;
}

/**
  Internal data structure used to include information when looking up operations
  by item index.

  @method ArrayOperationMatch
  @private
  @property {ArrayOperation} operation
  @property {number} index The index of `operation` in the array of operations.
  @property {boolean} split Whether or not the item index searched for would
  require a split for a new operation type.
  @property {number} rangeStart The index of the first item in the operation,
  with respect to the tracked array.  The index of the last item can be computed
  from `rangeStart` and `operation.count`.
*/
function ArrayOperationMatch(operation, index, split, rangeStart) {
  this.operation = operation;
  this.index = index;
  this.split = split;
  this.rangeStart = rangeStart;
}

})();



(function() {
var get = Ember.get,
    forEach = Ember.EnumerableUtils.forEach,
    RETAIN = 'r',
    FILTER = 'f';

function Operation (type, count) {
  this.type = type;
  this.count = count;
}

/**
  An `Ember.SubArray` tracks an array in a way similar to, but more specialized
  than, `Ember.TrackedArray`.  It is useful for keeping track of the indexes of
  items within a filtered array.

  @class SubArray
  @namespace Ember
*/
Ember.SubArray = function (length) {
  if (arguments.length < 1) { length = 0; }

  if (length > 0) {
    this._operations = [new Operation(RETAIN, length)];
  } else {
    this._operations = [];
  }
};

Ember.SubArray.prototype = {
  /**
    Track that an item was added to the tracked array.

    @method addItem

    @param {number} index The index of the item in the tracked array.
    @param {boolean} match `true` iff the item is included in the subarray.

    @return {number} The index of the item in the subarray.
  */
  addItem: function(index, match) {
    var returnValue = -1,
        itemType = match ? RETAIN : FILTER,
        self = this;

    this._findOperation(index, function(operation, operationIndex, rangeStart, rangeEnd, seenInSubArray) {
      var newOperation, splitOperation;

      if (itemType === operation.type) {
        ++operation.count;
      } else if (index === rangeStart) {
        // insert to the left of `operation`
        self._operations.splice(operationIndex, 0, new Operation(itemType, 1));
      } else {
        newOperation = new Operation(itemType, 1);
        splitOperation = new Operation(operation.type, rangeEnd - index + 1);
        operation.count = index - rangeStart;

        self._operations.splice(operationIndex + 1, 0, newOperation, splitOperation);
      }

      if (match) {
        if (operation.type === RETAIN) {
          returnValue = seenInSubArray + (index - rangeStart);
        } else {
          returnValue = seenInSubArray;
        }
      }

      self._composeAt(operationIndex);
    }, function(seenInSubArray) {
      self._operations.push(new Operation(itemType, 1));

      if (match) {
        returnValue = seenInSubArray;
      }

      self._composeAt(self._operations.length-1);
    });

    return returnValue;
  },

  /**
    Track that an item was removed from the tracked array.

    @method removeItem

    @param {number} index The index of the item in the tracked array.

    @return {number} The index of the item in the subarray, or `-1` if the item
    was not in the subarray.
  */
  removeItem: function(index) {
    var returnValue = -1,
        self = this;

    this._findOperation(index, function (operation, operationIndex, rangeStart, rangeEnd, seenInSubArray) {
      if (operation.type === RETAIN) {
        returnValue = seenInSubArray + (index - rangeStart);
      }

      if (operation.count > 1) {
        --operation.count;
      } else {
        self._operations.splice(operationIndex, 1);
        self._composeAt(operationIndex);
      }
    }, function() {
      throw new Ember.Error("Can't remove an item that has never been added.");
    });

    return returnValue;
  },


  _findOperation: function (index, foundCallback, notFoundCallback) {
    var operationIndex,
        len,
        operation,
        rangeStart,
        rangeEnd,
        seenInSubArray = 0;

    // OPTIMIZE: change to balanced tree
    // find leftmost operation to the right of `index`
    for (operationIndex = rangeStart = 0, len = this._operations.length; operationIndex < len; rangeStart = rangeEnd + 1, ++operationIndex) {
      operation = this._operations[operationIndex];
      rangeEnd = rangeStart + operation.count - 1;

      if (index >= rangeStart && index <= rangeEnd) {
        foundCallback(operation, operationIndex, rangeStart, rangeEnd, seenInSubArray);
        return;
      } else if (operation.type === RETAIN) {
        seenInSubArray += operation.count;
      }
    }

    notFoundCallback(seenInSubArray);
  },

  _composeAt: function(index) {
    var op = this._operations[index],
        otherOp;

    if (!op) {
      // Composing out of bounds is a no-op, as when removing the last operation
      // in the list.
      return;
    }

    if (index > 0) {
      otherOp = this._operations[index-1];
      if (otherOp.type === op.type) {
        op.count += otherOp.count;
        this._operations.splice(index-1, 1);
        --index;
      }
    }

    if (index < this._operations.length-1) {
      otherOp = this._operations[index+1];
      if (otherOp.type === op.type) {
        op.count += otherOp.count;
        this._operations.splice(index+1, 1);
      }
    }
  },

  toString: function () {
    var str = "";
    forEach(this._operations, function (operation) {
      str += " " + operation.type + ":" + operation.count;
    });
    return str.substring(1);
  }
};

})();



(function() {
Ember.Container = requireModule('container');
Ember.Container.set = Ember.set;

})();



(function() {
Ember.Application = Ember.Namespace.extend();

})();



(function() {
/**
@module ember
@submodule ember-runtime
*/

var OUT_OF_RANGE_EXCEPTION = "Index out of range";
var EMPTY = [];

var get = Ember.get, set = Ember.set;

/**
  An ArrayProxy wraps any other object that implements `Ember.Array` and/or
  `Ember.MutableArray,` forwarding all requests. This makes it very useful for
  a number of binding use cases or other cases where being able to swap
  out the underlying array is useful.

  A simple example of usage:

  ```javascript
  var pets = ['dog', 'cat', 'fish'];
  var ap = Ember.ArrayProxy.create({ content: Ember.A(pets) });

  ap.get('firstObject');                        // 'dog'
  ap.set('content', ['amoeba', 'paramecium']);
  ap.get('firstObject');                        // 'amoeba'
  ```

  This class can also be useful as a layer to transform the contents of
  an array, as they are accessed. This can be done by overriding
  `objectAtContent`:

  ```javascript
  var pets = ['dog', 'cat', 'fish'];
  var ap = Ember.ArrayProxy.create({
      content: Ember.A(pets),
      objectAtContent: function(idx) {
          return this.get('content').objectAt(idx).toUpperCase();
      }
  });

  ap.get('firstObject'); // . 'DOG'
  ```

  @class ArrayProxy
  @namespace Ember
  @extends Ember.Object
  @uses Ember.MutableArray
*/
Ember.ArrayProxy = Ember.Object.extend(Ember.MutableArray,/** @scope Ember.ArrayProxy.prototype */ {

  /**
    The content array. Must be an object that implements `Ember.Array` and/or
    `Ember.MutableArray.`

    @property content
    @type Ember.Array
  */
  content: null,

  /**
   The array that the proxy pretends to be. In the default `ArrayProxy`
   implementation, this and `content` are the same. Subclasses of `ArrayProxy`
   can override this property to provide things like sorting and filtering.

   @property arrangedContent
  */
  arrangedContent: Ember.computed.alias('content'),

  /**
    Should actually retrieve the object at the specified index from the
    content. You can override this method in subclasses to transform the
    content item to something new.

    This method will only be called if content is non-`null`.

    @method objectAtContent
    @param {Number} idx The index to retrieve.
    @return {Object} the value or undefined if none found
  */
  objectAtContent: function(idx) {
    return get(this, 'arrangedContent').objectAt(idx);
  },

  /**
    Should actually replace the specified objects on the content array.
    You can override this method in subclasses to transform the content item
    into something new.

    This method will only be called if content is non-`null`.

    @method replaceContent
    @param {Number} idx The starting index
    @param {Number} amt The number of items to remove from the content.
    @param {Array} objects Optional array of objects to insert or null if no
      objects.
    @return {void}
  */
  replaceContent: function(idx, amt, objects) {
    get(this, 'content').replace(idx, amt, objects);
  },

  /**
    @private

    Invoked when the content property is about to change. Notifies observers that the
    entire array content will change.

    @method _contentWillChange
  */
  _contentWillChange: Ember.beforeObserver('content', function() {
    this._teardownContent();
  }),

  _teardownContent: function() {
    var content = get(this, 'content');

    if (content) {
      content.removeArrayObserver(this, {
        willChange: 'contentArrayWillChange',
        didChange: 'contentArrayDidChange'
      });
    }
  },

  contentArrayWillChange: Ember.K,
  contentArrayDidChange: Ember.K,

  /**
    @private

    Invoked when the content property changes. Notifies observers that the
    entire array content has changed.

    @method _contentDidChange
  */
  _contentDidChange: Ember.observer('content', function() {
    var content = get(this, 'content');

    Ember.assert("Can't set ArrayProxy's content to itself", content !== this);

    this._setupContent();
  }),

  _setupContent: function() {
    var content = get(this, 'content');

    if (content) {
      content.addArrayObserver(this, {
        willChange: 'contentArrayWillChange',
        didChange: 'contentArrayDidChange'
      });
    }
  },

  _arrangedContentWillChange: Ember.beforeObserver('arrangedContent', function() {
    var arrangedContent = get(this, 'arrangedContent'),
        len = arrangedContent ? get(arrangedContent, 'length') : 0;

    this.arrangedContentArrayWillChange(this, 0, len, undefined);
    this.arrangedContentWillChange(this);

    this._teardownArrangedContent(arrangedContent);
  }),

  _arrangedContentDidChange: Ember.observer('arrangedContent', function() {
    var arrangedContent = get(this, 'arrangedContent'),
        len = arrangedContent ? get(arrangedContent, 'length') : 0;

    Ember.assert("Can't set ArrayProxy's content to itself", arrangedContent !== this);

    this._setupArrangedContent();

    this.arrangedContentDidChange(this);
    this.arrangedContentArrayDidChange(this, 0, undefined, len);
  }),

  _setupArrangedContent: function() {
    var arrangedContent = get(this, 'arrangedContent');

    if (arrangedContent) {
      arrangedContent.addArrayObserver(this, {
        willChange: 'arrangedContentArrayWillChange',
        didChange: 'arrangedContentArrayDidChange'
      });
    }
  },

  _teardownArrangedContent: function() {
    var arrangedContent = get(this, 'arrangedContent');

    if (arrangedContent) {
      arrangedContent.removeArrayObserver(this, {
        willChange: 'arrangedContentArrayWillChange',
        didChange: 'arrangedContentArrayDidChange'
      });
    }
  },

  arrangedContentWillChange: Ember.K,
  arrangedContentDidChange: Ember.K,

  objectAt: function(idx) {
    return get(this, 'content') && this.objectAtContent(idx);
  },

  length: Ember.computed(function() {
    var arrangedContent = get(this, 'arrangedContent');
    return arrangedContent ? get(arrangedContent, 'length') : 0;
    // No dependencies since Enumerable notifies length of change
  }),

  _replace: function(idx, amt, objects) {
    var content = get(this, 'content');
    Ember.assert('The content property of '+ this.constructor + ' should be set before modifying it', content);
    if (content) this.replaceContent(idx, amt, objects);
    return this;
  },

  replace: function() {
    if (get(this, 'arrangedContent') === get(this, 'content')) {
      this._replace.apply(this, arguments);
    } else {
      throw new Ember.Error("Using replace on an arranged ArrayProxy is not allowed.");
    }
  },

  _insertAt: function(idx, object) {
    if (idx > get(this, 'content.length')) throw new Ember.Error(OUT_OF_RANGE_EXCEPTION);
    this._replace(idx, 0, [object]);
    return this;
  },

  insertAt: function(idx, object) {
    if (get(this, 'arrangedContent') === get(this, 'content')) {
      return this._insertAt(idx, object);
    } else {
      throw new Ember.Error("Using insertAt on an arranged ArrayProxy is not allowed.");
    }
  },

  removeAt: function(start, len) {
    if ('number' === typeof start) {
      var content = get(this, 'content'),
          arrangedContent = get(this, 'arrangedContent'),
          indices = [], i;

      if ((start < 0) || (start >= get(this, 'length'))) {
        throw new Ember.Error(OUT_OF_RANGE_EXCEPTION);
      }

      if (len === undefined) len = 1;

      // Get a list of indices in original content to remove
      for (i=start; i<start+len; i++) {
        // Use arrangedContent here so we avoid confusion with objects transformed by objectAtContent
        indices.push(content.indexOf(arrangedContent.objectAt(i)));
      }

      // Replace in reverse order since indices will change
      indices.sort(function(a,b) { return b - a; });

      Ember.beginPropertyChanges();
      for (i=0; i<indices.length; i++) {
        this._replace(indices[i], 1, EMPTY);
      }
      Ember.endPropertyChanges();
    }

    return this ;
  },

  pushObject: function(obj) {
    this._insertAt(get(this, 'content.length'), obj) ;
    return obj ;
  },

  pushObjects: function(objects) {
    if (!(Ember.Enumerable.detect(objects) || Ember.isArray(objects))) {
      throw new TypeError("Must pass Ember.Enumerable to Ember.MutableArray#pushObjects");
    }
    this._replace(get(this, 'length'), 0, objects);
    return this;
  },

  setObjects: function(objects) {
    if (objects.length === 0) return this.clear();

    var len = get(this, 'length');
    this._replace(0, len, objects);
    return this;
  },

  unshiftObject: function(obj) {
    this._insertAt(0, obj) ;
    return obj ;
  },

  unshiftObjects: function(objects) {
    this._replace(0, 0, objects);
    return this;
  },

  slice: function() {
    var arr = this.toArray();
    return arr.slice.apply(arr, arguments);
  },

  arrangedContentArrayWillChange: function(item, idx, removedCnt, addedCnt) {
    this.arrayContentWillChange(idx, removedCnt, addedCnt);
  },

  arrangedContentArrayDidChange: function(item, idx, removedCnt, addedCnt) {
    this.arrayContentDidChange(idx, removedCnt, addedCnt);
  },

  init: function() {
    this._super();
    this._setupContent();
    this._setupArrangedContent();
  },

  willDestroy: function() {
    this._teardownArrangedContent();
    this._teardownContent();
  }
});

})();



(function() {
/**
@module ember
@submodule ember-runtime
*/


var set = Ember.set, get = Ember.get, guidFor = Ember.guidFor;
var forEach = Ember.EnumerableUtils.forEach,
    indexOf = Ember.ArrayPolyfills.indexOf;

var EachArray = Ember.Object.extend(Ember.Array, {

  init: function(content, keyName, owner) {
    this._super();
    this._keyName = keyName;
    this._owner   = owner;
    this._content = content;
  },

  objectAt: function(idx) {
    var item = this._content.objectAt(idx);
    return item && get(item, this._keyName);
  },

  length: Ember.computed(function() {
    var content = this._content;
    return content ? get(content, 'length') : 0;
  })

});

var IS_OBSERVER = /^.+:(before|change)$/;

function addObserverForContentKey(content, keyName, proxy, idx, loc) {
  var objects = proxy._objects, guid;
  if (!objects) objects = proxy._objects = {};

  while(--loc>=idx) {
    var item = content.objectAt(loc);
    if (item) {
      Ember.assert('When using @each to observe the array ' + content + ', the array must return an object', Ember.typeOf(item) === 'instance' || Ember.typeOf(item) === 'object');
      Ember.addBeforeObserver(item, keyName, proxy, 'contentKeyWillChange');
      Ember.addObserver(item, keyName, proxy, 'contentKeyDidChange');

      // keep track of the index each item was found at so we can map
      // it back when the obj changes.
      guid = guidFor(item);
      if (!objects[guid]) objects[guid] = [];
      objects[guid].push(loc);
    }
  }
}

function removeObserverForContentKey(content, keyName, proxy, idx, loc) {
  var objects = proxy._objects;
  if (!objects) objects = proxy._objects = {};
  var indicies, guid;

  while(--loc>=idx) {
    var item = content.objectAt(loc);
    if (item) {
      Ember.removeBeforeObserver(item, keyName, proxy, 'contentKeyWillChange');
      Ember.removeObserver(item, keyName, proxy, 'contentKeyDidChange');

      guid = guidFor(item);
      indicies = objects[guid];
      indicies[indexOf.call(indicies, loc)] = null;
    }
  }
}

/**
  This is the object instance returned when you get the `@each` property on an
  array. It uses the unknownProperty handler to automatically create
  EachArray instances for property names.

  @private
  @class EachProxy
  @namespace Ember
  @extends Ember.Object
*/
Ember.EachProxy = Ember.Object.extend({

  init: function(content) {
    this._super();
    this._content = content;
    content.addArrayObserver(this);

    // in case someone is already observing some keys make sure they are
    // added
    forEach(Ember.watchedEvents(this), function(eventName) {
      this.didAddListener(eventName);
    }, this);
  },

  /**
    You can directly access mapped properties by simply requesting them.
    The `unknownProperty` handler will generate an EachArray of each item.

    @method unknownProperty
    @param keyName {String}
    @param value {*}
  */
  unknownProperty: function(keyName, value) {
    var ret;
    ret = new EachArray(this._content, keyName, this);
    Ember.defineProperty(this, keyName, null, ret);
    this.beginObservingContentKey(keyName);
    return ret;
  },

  // ..........................................................
  // ARRAY CHANGES
  // Invokes whenever the content array itself changes.

  arrayWillChange: function(content, idx, removedCnt, addedCnt) {
    var keys = this._keys, key, lim;

    lim = removedCnt>0 ? idx+removedCnt : -1;
    Ember.beginPropertyChanges(this);

    for(key in keys) {
      if (!keys.hasOwnProperty(key)) { continue; }

      if (lim>0) { removeObserverForContentKey(content, key, this, idx, lim); }

      Ember.propertyWillChange(this, key);
    }

    Ember.propertyWillChange(this._content, '@each');
    Ember.endPropertyChanges(this);
  },

  arrayDidChange: function(content, idx, removedCnt, addedCnt) {
    var keys = this._keys, lim;

    lim = addedCnt>0 ? idx+addedCnt : -1;
    Ember.changeProperties(function() {
      for(var key in keys) {
        if (!keys.hasOwnProperty(key)) { continue; }

        if (lim>0) { addObserverForContentKey(content, key, this, idx, lim); }

        Ember.propertyDidChange(this, key);
      }

      Ember.propertyDidChange(this._content, '@each');
    }, this);
  },

  // ..........................................................
  // LISTEN FOR NEW OBSERVERS AND OTHER EVENT LISTENERS
  // Start monitoring keys based on who is listening...

  didAddListener: function(eventName) {
    if (IS_OBSERVER.test(eventName)) {
      this.beginObservingContentKey(eventName.slice(0, -7));
    }
  },

  didRemoveListener: function(eventName) {
    if (IS_OBSERVER.test(eventName)) {
      this.stopObservingContentKey(eventName.slice(0, -7));
    }
  },

  // ..........................................................
  // CONTENT KEY OBSERVING
  // Actual watch keys on the source content.

  beginObservingContentKey: function(keyName) {
    var keys = this._keys;
    if (!keys) keys = this._keys = {};
    if (!keys[keyName]) {
      keys[keyName] = 1;
      var content = this._content,
          len = get(content, 'length');
      addObserverForContentKey(content, keyName, this, 0, len);
    } else {
      keys[keyName]++;
    }
  },

  stopObservingContentKey: function(keyName) {
    var keys = this._keys;
    if (keys && (keys[keyName]>0) && (--keys[keyName]<=0)) {
      var content = this._content,
          len     = get(content, 'length');
      removeObserverForContentKey(content, keyName, this, 0, len);
    }
  },

  contentKeyWillChange: function(obj, keyName) {
    Ember.propertyWillChange(this, keyName);
  },

  contentKeyDidChange: function(obj, keyName) {
    Ember.propertyDidChange(this, keyName);
  }

});



})();



(function() {
/**
@module ember
@submodule ember-runtime
*/


var get = Ember.get, set = Ember.set, replace = Ember.EnumerableUtils._replace;

// Add Ember.Array to Array.prototype. Remove methods with native
// implementations and supply some more optimized versions of generic methods
// because they are so common.
var NativeArray = Ember.Mixin.create(Ember.MutableArray, Ember.Observable, Ember.Copyable, {

  // because length is a built-in property we need to know to just get the
  // original property.
  get: function(key) {
    if (key==='length') return this.length;
    else if ('number' === typeof key) return this[key];
    else return this._super(key);
  },

  objectAt: function(idx) {
    return this[idx];
  },

  // primitive for array support.
  replace: function(idx, amt, objects) {

    if (this.isFrozen) throw Ember.FROZEN_ERROR;

    // if we replaced exactly the same number of items, then pass only the
    // replaced range. Otherwise, pass the full remaining array length
    // since everything has shifted
    var len = objects ? get(objects, 'length') : 0;
    this.arrayContentWillChange(idx, amt, len);

    if (len === 0) {
      this.splice(idx, amt);
    } else {
      replace(this, idx, amt, objects);
    }

    this.arrayContentDidChange(idx, amt, len);
    return this;
  },

  // If you ask for an unknown property, then try to collect the value
  // from member items.
  unknownProperty: function(key, value) {
    var ret;// = this.reducedProperty(key, value) ;
    if ((value !== undefined) && ret === undefined) {
      ret = this[key] = value;
    }
    return ret ;
  },

  // If browser did not implement indexOf natively, then override with
  // specialized version
  indexOf: function(object, startAt) {
    var idx, len = this.length;

    if (startAt === undefined) startAt = 0;
    else startAt = (startAt < 0) ? Math.ceil(startAt) : Math.floor(startAt);
    if (startAt < 0) startAt += len;

    for(idx=startAt;idx<len;idx++) {
      if (this[idx] === object) return idx ;
    }
    return -1;
  },

  lastIndexOf: function(object, startAt) {
    var idx, len = this.length;

    if (startAt === undefined) startAt = len-1;
    else startAt = (startAt < 0) ? Math.ceil(startAt) : Math.floor(startAt);
    if (startAt < 0) startAt += len;

    for(idx=startAt;idx>=0;idx--) {
      if (this[idx] === object) return idx ;
    }
    return -1;
  },

  copy: function(deep) {
    if (deep) {
      return this.map(function(item) { return Ember.copy(item, true); });
    }

    return this.slice();
  }
});

// Remove any methods implemented natively so we don't override them
var ignore = ['length'];
Ember.EnumerableUtils.forEach(NativeArray.keys(), function(methodName) {
  if (Array.prototype[methodName]) ignore.push(methodName);
});

if (ignore.length>0) {
  NativeArray = NativeArray.without.apply(NativeArray, ignore);
}

/**
  The NativeArray mixin contains the properties needed to to make the native
  Array support Ember.MutableArray and all of its dependent APIs. Unless you
  have `Ember.EXTEND_PROTOTYPES` or `Ember.EXTEND_PROTOTYPES.Array` set to
  false, this will be applied automatically. Otherwise you can apply the mixin
  at anytime by calling `Ember.NativeArray.activate`.

  @class NativeArray
  @namespace Ember
  @uses Ember.MutableArray
  @uses Ember.Observable
  @uses Ember.Copyable
*/
Ember.NativeArray = NativeArray;

/**
  Creates an `Ember.NativeArray` from an Array like object.
  Does not modify the original object. Ember.A is not needed if
  `Ember.EXTEND_PROTOTYPES` is `true` (the default value). However,
  it is recommended that you use Ember.A when creating addons for
  ember or when you can not guarantee that `Ember.EXTEND_PROTOTYPES`
  will be `true`.

  Example

  ```js
  var Pagination = Ember.CollectionView.extend({
    tagName: 'ul',
    classNames: ['pagination'],
    init: function() {
      this._super();
      if (!this.get('content')) {
        this.set('content', Ember.A([]));
      }
    }
  });
  ```

  @method A
  @for Ember
  @return {Ember.NativeArray}
*/
Ember.A = function(arr) {
  if (arr === undefined) { arr = []; }
  return Ember.Array.detect(arr) ? arr : Ember.NativeArray.apply(arr);
};

/**
  Activates the mixin on the Array.prototype if not already applied. Calling
  this method more than once is safe. This will be called when ember is loaded
  unless you have `Ember.EXTEND_PROTOTYPES` or `Ember.EXTEND_PROTOTYPES.Array`
  set to `false`.

  Example

  ```js
  if (Ember.EXTEND_PROTOTYPES === true || Ember.EXTEND_PROTOTYPES.Array) {
    Ember.NativeArray.activate();
  }
  ```

  @method activate
  @for Ember.NativeArray
  @static
  @return {void}
*/
Ember.NativeArray.activate = function() {
  NativeArray.apply(Array.prototype);

  Ember.A = function(arr) { return arr || []; };
};

if (Ember.EXTEND_PROTOTYPES === true || Ember.EXTEND_PROTOTYPES.Array) {
  Ember.NativeArray.activate();
}


})();



(function() {
/**
@module ember
@submodule ember-runtime
*/

var get = Ember.get, set = Ember.set, guidFor = Ember.guidFor, isNone = Ember.isNone, fmt = Ember.String.fmt;

/**
  An unordered collection of objects.

  A Set works a bit like an array except that its items are not ordered. You
  can create a set to efficiently test for membership for an object. You can
  also iterate through a set just like an array, even accessing objects by
  index, however there is no guarantee as to their order.

  All Sets are observable via the Enumerable Observer API - which works
  on any enumerable object including both Sets and Arrays.

  ## Creating a Set

  You can create a set like you would most objects using
  `new Ember.Set()`. Most new sets you create will be empty, but you can
  also initialize the set with some content by passing an array or other
  enumerable of objects to the constructor.

  Finally, you can pass in an existing set and the set will be copied. You
  can also create a copy of a set by calling `Ember.Set#copy()`.

  ```javascript
  // creates a new empty set
  var foundNames = new Ember.Set();

  // creates a set with four names in it.
  var names = new Ember.Set(["Charles", "Tom", "Juan", "Alex"]); // :P

  // creates a copy of the names set.
  var namesCopy = new Ember.Set(names);

  // same as above.
  var anotherNamesCopy = names.copy();
  ```

  ## Adding/Removing Objects

  You generally add or remove objects from a set using `add()` or
  `remove()`. You can add any type of object including primitives such as
  numbers, strings, and booleans.

  Unlike arrays, objects can only exist one time in a set. If you call `add()`
  on a set with the same object multiple times, the object will only be added
  once. Likewise, calling `remove()` with the same object multiple times will
  remove the object the first time and have no effect on future calls until
  you add the object to the set again.

  NOTE: You cannot add/remove `null` or `undefined` to a set. Any attempt to do
  so will be ignored.

  In addition to add/remove you can also call `push()`/`pop()`. Push behaves
  just like `add()` but `pop()`, unlike `remove()` will pick an arbitrary
  object, remove it and return it. This is a good way to use a set as a job
  queue when you don't care which order the jobs are executed in.

  ## Testing for an Object

  To test for an object's presence in a set you simply call
  `Ember.Set#contains()`.

  ## Observing changes

  When using `Ember.Set`, you can observe the `"[]"` property to be
  alerted whenever the content changes. You can also add an enumerable
  observer to the set to be notified of specific objects that are added and
  removed from the set. See [Ember.Enumerable](/api/classes/Ember.Enumerable.html)
  for more information on enumerables.

  This is often unhelpful. If you are filtering sets of objects, for instance,
  it is very inefficient to re-filter all of the items each time the set
  changes. It would be better if you could just adjust the filtered set based
  on what was changed on the original set. The same issue applies to merging
  sets, as well.

  ## Other Methods

  `Ember.Set` primary implements other mixin APIs. For a complete reference
  on the methods you will use with `Ember.Set`, please consult these mixins.
  The most useful ones will be `Ember.Enumerable` and
  `Ember.MutableEnumerable` which implement most of the common iterator
  methods you are used to on Array.

  Note that you can also use the `Ember.Copyable` and `Ember.Freezable`
  APIs on `Ember.Set` as well. Once a set is frozen it can no longer be
  modified. The benefit of this is that when you call `frozenCopy()` on it,
  Ember will avoid making copies of the set. This allows you to write
  code that can know with certainty when the underlying set data will or
  will not be modified.

  @class Set
  @namespace Ember
  @extends Ember.CoreObject
  @uses Ember.MutableEnumerable
  @uses Ember.Copyable
  @uses Ember.Freezable
  @since Ember 0.9
*/
Ember.Set = Ember.CoreObject.extend(Ember.MutableEnumerable, Ember.Copyable, Ember.Freezable,
  /** @scope Ember.Set.prototype */ {

  // ..........................................................
  // IMPLEMENT ENUMERABLE APIS
  //

  /**
    This property will change as the number of objects in the set changes.

    @property length
    @type number
    @default 0
  */
  length: 0,

  /**
    Clears the set. This is useful if you want to reuse an existing set
    without having to recreate it.

    ```javascript
    var colors = new Ember.Set(["red", "green", "blue"]);
    colors.length;  // 3
    colors.clear();
    colors.length;  // 0
    ```

    @method clear
    @return {Ember.Set} An empty Set
  */
  clear: function() {
    if (this.isFrozen) { throw new Ember.Error(Ember.FROZEN_ERROR); }

    var len = get(this, 'length');
    if (len === 0) { return this; }

    var guid;

    this.enumerableContentWillChange(len, 0);
    Ember.propertyWillChange(this, 'firstObject');
    Ember.propertyWillChange(this, 'lastObject');

    for (var i=0; i < len; i++) {
      guid = guidFor(this[i]);
      delete this[guid];
      delete this[i];
    }

    set(this, 'length', 0);

    Ember.propertyDidChange(this, 'firstObject');
    Ember.propertyDidChange(this, 'lastObject');
    this.enumerableContentDidChange(len, 0);

    return this;
  },

  /**
    Returns true if the passed object is also an enumerable that contains the
    same objects as the receiver.

    ```javascript
    var colors = ["red", "green", "blue"],
        same_colors = new Ember.Set(colors);

    same_colors.isEqual(colors);               // true
    same_colors.isEqual(["purple", "brown"]);  // false
    ```

    @method isEqual
    @param {Ember.Set} obj the other object.
    @return {Boolean}
  */
  isEqual: function(obj) {
    // fail fast
    if (!Ember.Enumerable.detect(obj)) return false;

    var loc = get(this, 'length');
    if (get(obj, 'length') !== loc) return false;

    while(--loc >= 0) {
      if (!obj.contains(this[loc])) return false;
    }

    return true;
  },

  /**
    Adds an object to the set. Only non-`null` objects can be added to a set
    and those can only be added once. If the object is already in the set or
    the passed value is null this method will have no effect.

    This is an alias for `Ember.MutableEnumerable.addObject()`.

    ```javascript
    var colors = new Ember.Set();
    colors.add("blue");     // ["blue"]
    colors.add("blue");     // ["blue"]
    colors.add("red");      // ["blue", "red"]
    colors.add(null);       // ["blue", "red"]
    colors.add(undefined);  // ["blue", "red"]
    ```

    @method add
    @param {Object} obj The object to add.
    @return {Ember.Set} The set itself.
  */
  add: Ember.aliasMethod('addObject'),

  /**
    Removes the object from the set if it is found. If you pass a `null` value
    or an object that is already not in the set, this method will have no
    effect. This is an alias for `Ember.MutableEnumerable.removeObject()`.

    ```javascript
    var colors = new Ember.Set(["red", "green", "blue"]);
    colors.remove("red");     // ["blue", "green"]
    colors.remove("purple");  // ["blue", "green"]
    colors.remove(null);      // ["blue", "green"]
    ```

    @method remove
    @param {Object} obj The object to remove
    @return {Ember.Set} The set itself.
  */
  remove: Ember.aliasMethod('removeObject'),

  /**
    Removes the last element from the set and returns it, or `null` if it's empty.

    ```javascript
    var colors = new Ember.Set(["green", "blue"]);
    colors.pop();  // "blue"
    colors.pop();  // "green"
    colors.pop();  // null
    ```

    @method pop
    @return {Object} The removed object from the set or null.
  */
  pop: function() {
    if (get(this, 'isFrozen')) throw new Ember.Error(Ember.FROZEN_ERROR);
    var obj = this.length > 0 ? this[this.length-1] : null;
    this.remove(obj);
    return obj;
  },

  /**
    Inserts the given object on to the end of the set. It returns
    the set itself.

    This is an alias for `Ember.MutableEnumerable.addObject()`.

    ```javascript
    var colors = new Ember.Set();
    colors.push("red");   // ["red"]
    colors.push("green"); // ["red", "green"]
    colors.push("blue");  // ["red", "green", "blue"]
    ```

    @method push
    @return {Ember.Set} The set itself.
  */
  push: Ember.aliasMethod('addObject'),

  /**
    Removes the last element from the set and returns it, or `null` if it's empty.

    This is an alias for `Ember.Set.pop()`.

    ```javascript
    var colors = new Ember.Set(["green", "blue"]);
    colors.shift();  // "blue"
    colors.shift();  // "green"
    colors.shift();  // null
    ```

    @method shift
    @return {Object} The removed object from the set or null.
  */
  shift: Ember.aliasMethod('pop'),

  /**
    Inserts the given object on to the end of the set. It returns
    the set itself.

    This is an alias of `Ember.Set.push()`

    ```javascript
    var colors = new Ember.Set();
    colors.unshift("red");    // ["red"]
    colors.unshift("green");  // ["red", "green"]
    colors.unshift("blue");   // ["red", "green", "blue"]
    ```

    @method unshift
    @return {Ember.Set} The set itself.
  */
  unshift: Ember.aliasMethod('push'),

  /**
    Adds each object in the passed enumerable to the set.

    This is an alias of `Ember.MutableEnumerable.addObjects()`

    ```javascript
    var colors = new Ember.Set();
    colors.addEach(["red", "green", "blue"]);  // ["red", "green", "blue"]
    ```

    @method addEach
    @param {Ember.Enumerable} objects the objects to add.
    @return {Ember.Set} The set itself.
  */
  addEach: Ember.aliasMethod('addObjects'),

  /**
    Removes each object in the passed enumerable to the set.

    This is an alias of `Ember.MutableEnumerable.removeObjects()`

    ```javascript
    var colors = new Ember.Set(["red", "green", "blue"]);
    colors.removeEach(["red", "blue"]);  //  ["green"]
    ```

    @method removeEach
    @param {Ember.Enumerable} objects the objects to remove.
    @return {Ember.Set} The set itself.
  */
  removeEach: Ember.aliasMethod('removeObjects'),

  // ..........................................................
  // PRIVATE ENUMERABLE SUPPORT
  //

  init: function(items) {
    this._super();
    if (items) this.addObjects(items);
  },

  // implement Ember.Enumerable
  nextObject: function(idx) {
    return this[idx];
  },

  // more optimized version
  firstObject: Ember.computed(function() {
    return this.length > 0 ? this[0] : undefined;
  }),

  // more optimized version
  lastObject: Ember.computed(function() {
    return this.length > 0 ? this[this.length-1] : undefined;
  }),

  // implements Ember.MutableEnumerable
  addObject: function(obj) {
    if (get(this, 'isFrozen')) throw new Ember.Error(Ember.FROZEN_ERROR);
    if (isNone(obj)) return this; // nothing to do

    var guid = guidFor(obj),
        idx  = this[guid],
        len  = get(this, 'length'),
        added ;

    if (idx>=0 && idx<len && (this[idx] === obj)) return this; // added

    added = [obj];

    this.enumerableContentWillChange(null, added);
    Ember.propertyWillChange(this, 'lastObject');

    len = get(this, 'length');
    this[guid] = len;
    this[len] = obj;
    set(this, 'length', len+1);

    Ember.propertyDidChange(this, 'lastObject');
    this.enumerableContentDidChange(null, added);

    return this;
  },

  // implements Ember.MutableEnumerable
  removeObject: function(obj) {
    if (get(this, 'isFrozen')) throw new Ember.Error(Ember.FROZEN_ERROR);
    if (isNone(obj)) return this; // nothing to do

    var guid = guidFor(obj),
        idx  = this[guid],
        len = get(this, 'length'),
        isFirst = idx === 0,
        isLast = idx === len-1,
        last, removed;


    if (idx>=0 && idx<len && (this[idx] === obj)) {
      removed = [obj];

      this.enumerableContentWillChange(removed, null);
      if (isFirst) { Ember.propertyWillChange(this, 'firstObject'); }
      if (isLast)  { Ember.propertyWillChange(this, 'lastObject'); }

      // swap items - basically move the item to the end so it can be removed
      if (idx < len-1) {
        last = this[len-1];
        this[idx] = last;
        this[guidFor(last)] = idx;
      }

      delete this[guid];
      delete this[len-1];
      set(this, 'length', len-1);

      if (isFirst) { Ember.propertyDidChange(this, 'firstObject'); }
      if (isLast)  { Ember.propertyDidChange(this, 'lastObject'); }
      this.enumerableContentDidChange(removed, null);
    }

    return this;
  },

  // optimized version
  contains: function(obj) {
    return this[guidFor(obj)]>=0;
  },

  copy: function() {
    var C = this.constructor, ret = new C(), loc = get(this, 'length');
    set(ret, 'length', loc);
    while(--loc>=0) {
      ret[loc] = this[loc];
      ret[guidFor(this[loc])] = loc;
    }
    return ret;
  },

  toString: function() {
    var len = this.length, idx, array = [];
    for(idx = 0; idx < len; idx++) {
      array[idx] = this[idx];
    }
    return fmt("Ember.Set<%@>", [array.join(',')]);
  }

});

})();



(function() {
var DeferredMixin = Ember.DeferredMixin, // mixins/deferred
    get = Ember.get;

var Deferred = Ember.Object.extend(DeferredMixin);

Deferred.reopenClass({
  promise: function(callback, binding) {
    var deferred = Deferred.create();
    callback.call(binding, deferred);
    return deferred;
  }
});

Ember.Deferred = Deferred;

})();



(function() {
var forEach = Ember.ArrayPolyfills.forEach;

/**
  @module ember
  @submodule ember-runtime
*/

var loadHooks = Ember.ENV.EMBER_LOAD_HOOKS || {};
var loaded = {};

/**
  Detects when a specific package of Ember (e.g. 'Ember.Handlebars')
  has fully loaded and is available for extension.

  The provided `callback` will be called with the `name` passed
  resolved from a string into the object:


  ``` javascript
  Ember.onLoad('Ember.Handlebars' function(hbars){
    hbars.registerHelper(...);
  });
  ```

  @method onLoad
  @for Ember
  @param name {String} name of hook
  @param callback {Function} callback to be called
*/
Ember.onLoad = function(name, callback) {
  var object;

  loadHooks[name] = loadHooks[name] || Ember.A();
  loadHooks[name].pushObject(callback);

  if (object = loaded[name]) {
    callback(object);
  }
};

/**
  Called when an Ember.js package (e.g Ember.Handlebars) has finished
  loading. Triggers any callbacks registered for this event.

  @method runLoadHooks
  @for Ember
  @param name {String} name of hook
  @param object {Object} object to pass to callbacks
*/
Ember.runLoadHooks = function(name, object) {
  loaded[name] = object;

  if (loadHooks[name]) {
    forEach.call(loadHooks[name], function(callback) {
      callback(object);
    });
  }
};

})();



(function() {

})();



(function() {
var get = Ember.get;

/**
@module ember
@submodule ember-runtime
*/

/**
  `Ember.ControllerMixin` provides a standard interface for all classes that
  compose Ember's controller layer: `Ember.Controller`,
  `Ember.ArrayController`, and `Ember.ObjectController`.

  @class ControllerMixin
  @namespace Ember
*/
Ember.ControllerMixin = Ember.Mixin.create(Ember.ActionHandler, {
  /* ducktype as a controller */
  isController: true,

  /**
    The object to which actions from the view should be sent.

    For example, when a Handlebars template uses the `{{action}}` helper,
    it will attempt to send the action to the view's controller's `target`.

    By default, a controller's `target` is set to the router after it is
    instantiated by `Ember.Application#initialize`.

    @property target
    @default null
  */
  target: null,

  container: null,

  parentController: null,

  store: null,

  model: Ember.computed.alias('content'),

  deprecatedSendHandles: function(actionName) {
    return !!this[actionName];
  },

  deprecatedSend: function(actionName) {
    var args = [].slice.call(arguments, 1);
    Ember.assert('' + this + " has the action " + actionName + " but it is not a function", typeof this[actionName] === 'function');
    Ember.deprecate('Action handlers implemented directly on controllers are deprecated in favor of action handlers on an `actions` object (' + actionName + ' on ' + this + ')', false);
    this[actionName].apply(this, args);
    return;
  }
});

/**
  @class Controller
  @namespace Ember
  @extends Ember.Object
  @uses Ember.ControllerMixin
*/
Ember.Controller = Ember.Object.extend(Ember.ControllerMixin);

})();



(function() {
/**
@module ember
@submodule ember-runtime
*/

var get = Ember.get, set = Ember.set, forEach = Ember.EnumerableUtils.forEach;

/**
  `Ember.SortableMixin` provides a standard interface for array proxies
  to specify a sort order and maintain this sorting when objects are added,
  removed, or updated without changing the implicit order of their underlying
  content array:

  ```javascript
  songs = [
    {trackNumber: 4, title: 'Ob-La-Di, Ob-La-Da'},
    {trackNumber: 2, title: 'Back in the U.S.S.R.'},
    {trackNumber: 3, title: 'Glass Onion'},
  ];

  songsController = Ember.ArrayController.create({
    content: songs,
    sortProperties: ['trackNumber'],
    sortAscending: true
  });

  songsController.get('firstObject');  // {trackNumber: 2, title: 'Back in the U.S.S.R.'}

  songsController.addObject({trackNumber: 1, title: 'Dear Prudence'});
  songsController.get('firstObject');  // {trackNumber: 1, title: 'Dear Prudence'}
  ```

  If you add or remove the properties to sort by or change the sort direction the content
  sort order will be automatically updated.

  ```javascript
  songsController.set('sortProperties', ['title']);
  songsController.get('firstObject'); // {trackNumber: 2, title: 'Back in the U.S.S.R.'}

  songsController.toggleProperty('sortAscending');
  songsController.get('firstObject'); // {trackNumber: 4, title: 'Ob-La-Di, Ob-La-Da'}
  ```

  SortableMixin works by sorting the arrangedContent array, which is the array that
  arrayProxy displays. Due to the fact that the underlying 'content' array is not changed, that
  array will not display the sorted list:

   ```javascript
  songsController.get('content').get('firstObject'); // Returns the unsorted original content
  songsController.get('firstObject'); // Returns the sorted content.
  ``` 
  
  Although the sorted content can also be accessed through the arrangedContent property,
  it is preferable to use the proxied class and not the arrangedContent array directly.

  @class SortableMixin
  @namespace Ember
  @uses Ember.MutableEnumerable
*/
Ember.SortableMixin = Ember.Mixin.create(Ember.MutableEnumerable, {

  /**
    Specifies which properties dictate the arrangedContent's sort order.

    When specifying multiple properties the sorting will use properties
    from the `sortProperties` array prioritized from first to last.

    @property {Array} sortProperties
  */
  sortProperties: null,

  /**
    Specifies the arrangedContent's sort direction

    @property {Boolean} sortAscending
  */
  sortAscending: true,

  /**
    The function used to compare two values. You can override this if you
    want to do custom comparisons. Functions must be of the type expected by
    Array#sort, i.e.
      return 0 if the two parameters are equal,
      return a negative value if the first parameter is smaller than the second or
      return a positive value otherwise:

    ```javascript
    function(x,y) { // These are assumed to be integers
      if (x === y)
        return 0;
      return x < y ? -1 : 1;
    }
    ```

    @property sortFunction
    @type {Function}
    @default Ember.compare
  */
  sortFunction: Ember.compare,

  orderBy: function(item1, item2) {
    var result = 0,
        sortProperties = get(this, 'sortProperties'),
        sortAscending = get(this, 'sortAscending'),
        sortFunction = get(this, 'sortFunction');

    Ember.assert("you need to define `sortProperties`", !!sortProperties);

    forEach(sortProperties, function(propertyName) {
      if (result === 0) {
        result = sortFunction(get(item1, propertyName), get(item2, propertyName));
        if ((result !== 0) && !sortAscending) {
          result = (-1) * result;
        }
      }
    });

    return result;
  },

  destroy: function() {
    var content = get(this, 'content'),
        sortProperties = get(this, 'sortProperties');

    if (content && sortProperties) {
      forEach(content, function(item) {
        forEach(sortProperties, function(sortProperty) {
          Ember.removeObserver(item, sortProperty, this, 'contentItemSortPropertyDidChange');
        }, this);
      }, this);
    }

    return this._super();
  },

  isSorted: Ember.computed.bool('sortProperties'),

  /**
    Overrides the default arrangedContent from arrayProxy in order to sort by sortFunction.
    Also sets up observers for each sortProperty on each item in the content Array.
    
    @property arrangedContent
  */

  arrangedContent: Ember.computed('content', 'sortProperties.@each', function(key, value) {
    var content = get(this, 'content'),
        isSorted = get(this, 'isSorted'),
        sortProperties = get(this, 'sortProperties'),
        self = this;

    if (content && isSorted) {
      content = content.slice();
      content.sort(function(item1, item2) {
        return self.orderBy(item1, item2);
      });
      forEach(content, function(item) {
        forEach(sortProperties, function(sortProperty) {
          Ember.addObserver(item, sortProperty, this, 'contentItemSortPropertyDidChange');
        }, this);
      }, this);
      return Ember.A(content);
    }

    return content;
  }),

  _contentWillChange: Ember.beforeObserver('content', function() {
    var content = get(this, 'content'),
        sortProperties = get(this, 'sortProperties');

    if (content && sortProperties) {
      forEach(content, function(item) {
        forEach(sortProperties, function(sortProperty) {
          Ember.removeObserver(item, sortProperty, this, 'contentItemSortPropertyDidChange');
        }, this);
      }, this);
    }

    this._super();
  }),

  sortAscendingWillChange: Ember.beforeObserver('sortAscending', function() {
    this._lastSortAscending = get(this, 'sortAscending');
  }),

  sortAscendingDidChange: Ember.observer('sortAscending', function() {
    if (get(this, 'sortAscending') !== this._lastSortAscending) {
      var arrangedContent = get(this, 'arrangedContent');
      arrangedContent.reverseObjects();
    }
  }),

  contentArrayWillChange: function(array, idx, removedCount, addedCount) {
    var isSorted = get(this, 'isSorted');

    if (isSorted) {
      var arrangedContent = get(this, 'arrangedContent');
      var removedObjects = array.slice(idx, idx+removedCount);
      var sortProperties = get(this, 'sortProperties');

      forEach(removedObjects, function(item) {
        arrangedContent.removeObject(item);

        forEach(sortProperties, function(sortProperty) {
          Ember.removeObserver(item, sortProperty, this, 'contentItemSortPropertyDidChange');
        }, this);
      }, this);
    }

    return this._super(array, idx, removedCount, addedCount);
  },

  contentArrayDidChange: function(array, idx, removedCount, addedCount) {
    var isSorted = get(this, 'isSorted'),
        sortProperties = get(this, 'sortProperties');

    if (isSorted) {
      var addedObjects = array.slice(idx, idx+addedCount);

      forEach(addedObjects, function(item) {
        this.insertItemSorted(item);

        forEach(sortProperties, function(sortProperty) {
          Ember.addObserver(item, sortProperty, this, 'contentItemSortPropertyDidChange');
        }, this);
      }, this);
    }

    return this._super(array, idx, removedCount, addedCount);
  },

  insertItemSorted: function(item) {
    var arrangedContent = get(this, 'arrangedContent');
    var length = get(arrangedContent, 'length');

    var idx = this._binarySearch(item, 0, length);
    arrangedContent.insertAt(idx, item);
  },

  contentItemSortPropertyDidChange: function(item) {
    var arrangedContent = get(this, 'arrangedContent'),
        oldIndex = arrangedContent.indexOf(item),
        leftItem = arrangedContent.objectAt(oldIndex - 1),
        rightItem = arrangedContent.objectAt(oldIndex + 1),
        leftResult = leftItem && this.orderBy(item, leftItem),
        rightResult = rightItem && this.orderBy(item, rightItem);

    if (leftResult < 0 || rightResult > 0) {
      arrangedContent.removeObject(item);
      this.insertItemSorted(item);
    }
  },

  _binarySearch: function(item, low, high) {
    var mid, midItem, res, arrangedContent;

    if (low === high) {
      return low;
    }

    arrangedContent = get(this, 'arrangedContent');

    mid = low + Math.floor((high - low) / 2);
    midItem = arrangedContent.objectAt(mid);

    res = this.orderBy(midItem, item);

    if (res < 0) {
      return this._binarySearch(item, mid+1, high);
    } else if (res > 0) {
      return this._binarySearch(item, low, mid);
    }

    return mid;
  }
});

})();



(function() {
/**
@module ember
@submodule ember-runtime
*/

var get = Ember.get, set = Ember.set, forEach = Ember.EnumerableUtils.forEach,
    replace = Ember.EnumerableUtils.replace;

/**
  `Ember.ArrayController` provides a way for you to publish a collection of
  objects so that you can easily bind to the collection from a Handlebars
  `#each` helper, an `Ember.CollectionView`, or other controllers.

  The advantage of using an `ArrayController` is that you only have to set up
  your view bindings once; to change what's displayed, simply swap out the
  `content` property on the controller.

  For example, imagine you wanted to display a list of items fetched via an XHR
  request. Create an `Ember.ArrayController` and set its `content` property:

  ```javascript
  MyApp.listController = Ember.ArrayController.create();

  $.get('people.json', function(data) {
    MyApp.listController.set('content', data);
  });
  ```

  Then, create a view that binds to your new controller:

  ```handlebars
  {{#each MyApp.listController}}
    {{firstName}} {{lastName}}
  {{/each}}
  ```

  Although you are binding to the controller, the behavior of this controller
  is to pass through any methods or properties to the underlying array. This
  capability comes from `Ember.ArrayProxy`, which this class inherits from.

  Sometimes you want to display computed properties within the body of an
  `#each` helper that depend on the underlying items in `content`, but are not
  present on those items.   To do this, set `itemController` to the name of a
  controller (probably an `ObjectController`) that will wrap each individual item.

  For example:

  ```handlebars
    {{#each post in controller}}
      <li>{{title}} ({{titleLength}} characters)</li>
    {{/each}}
  ```

  ```javascript
  App.PostsController = Ember.ArrayController.extend({
    itemController: 'post'
  });

  App.PostController = Ember.ObjectController.extend({
    // the `title` property will be proxied to the underlying post.

    titleLength: function() {
      return this.get('title').length;
    }.property('title')
  });
  ```

  In some cases it is helpful to return a different `itemController` depending
  on the particular item.  Subclasses can do this by overriding
  `lookupItemController`.

  For example:

  ```javascript
  App.MyArrayController = Ember.ArrayController.extend({
    lookupItemController: function( object ) {
      if (object.get('isSpecial')) {
        return "special"; // use App.SpecialController
      } else {
        return "regular"; // use App.RegularController
      }
    }
  });
  ```

  The itemController instances will have a `parentController` property set to
  either the the `parentController` property of the `ArrayController`
  or to the `ArrayController` instance itself.

  @class ArrayController
  @namespace Ember
  @extends Ember.ArrayProxy
  @uses Ember.SortableMixin
  @uses Ember.ControllerMixin
*/

Ember.ArrayController = Ember.ArrayProxy.extend(Ember.ControllerMixin,
  Ember.SortableMixin, {

  /**
    The controller used to wrap items, if any.

    @property itemController
    @type String
    @default null
  */
  itemController: null,

  /**
    Return the name of the controller to wrap items, or `null` if items should
    be returned directly.  The default implementation simply returns the
    `itemController` property, but subclasses can override this method to return
    different controllers for different objects.

    For example:

    ```javascript
    App.MyArrayController = Ember.ArrayController.extend({
      lookupItemController: function( object ) {
        if (object.get('isSpecial')) {
          return "special"; // use App.SpecialController
        } else {
          return "regular"; // use App.RegularController
        }
      }
    });
    ```

    @method lookupItemController
    @param {Object} object
    @return {String}
  */
  lookupItemController: function(object) {
    return get(this, 'itemController');
  },

  objectAtContent: function(idx) {
    var length = get(this, 'length'),
        arrangedContent = get(this,'arrangedContent'),
        object = arrangedContent && arrangedContent.objectAt(idx);

    if (idx >= 0 && idx < length) {
      var controllerClass = this.lookupItemController(object);
      if (controllerClass) {
        return this.controllerAt(idx, object, controllerClass);
      }
    }

    // When `controllerClass` is falsy, we have not opted in to using item
    // controllers, so return the object directly.

    // When the index is out of range, we want to return the "out of range"
    // value, whatever that might be.  Rather than make assumptions
    // (e.g. guessing `null` or `undefined`) we defer this to `arrangedContent`.
    return object;
  },

  arrangedContentDidChange: function() {
    this._super();
    this._resetSubControllers();
  },

  arrayContentDidChange: function(idx, removedCnt, addedCnt) {
    var subControllers = get(this, '_subControllers'),
        subControllersToRemove = subControllers.slice(idx, idx+removedCnt);

    forEach(subControllersToRemove, function(subController) {
      if (subController) { subController.destroy(); }
    });

    replace(subControllers, idx, removedCnt, new Array(addedCnt));

    // The shadow array of subcontrollers must be updated before we trigger
    // observers, otherwise observers will get the wrong subcontainer when
    // calling `objectAt`
    this._super(idx, removedCnt, addedCnt);
  },

  init: function() {
    this._super();

    this.set('_subControllers', Ember.A());
  },

  content: Ember.computed(function () {
    return Ember.A();
  }),

  controllerAt: function(idx, object, controllerClass) {
    var container = get(this, 'container'),
        subControllers = get(this, '_subControllers'),
        subController = subControllers[idx],
        factory, fullName;

    if (subController) { return subController; }

    fullName = "controller:" + controllerClass;

    if (!container.has(fullName)) {
      throw new Ember.Error('Could not resolve itemController: "' + controllerClass + '"');
    }

    subController = container.lookupFactory(fullName).create({
      target: this,
      parentController: get(this, 'parentController') || this,
      content: object
    });

    subControllers[idx] = subController;

    return subController;
  },

  _subControllers: null,

  _resetSubControllers: function() {
    var subControllers = get(this, '_subControllers');
    if (subControllers) {
      forEach(subControllers, function(subController) {
        if (subController) { subController.destroy(); }
      });
    }

    this.set('_subControllers', Ember.A());
  }
});

})();



(function() {
/**
@module ember
@submodule ember-runtime
*/

/**
  `Ember.ObjectController` is part of Ember's Controller layer. It is intended
  to wrap a single object, proxying unhandled attempts to `get` and `set` to the underlying
  content object, and to forward unhandled action attempts to its `target`.

  `Ember.ObjectController` derives this functionality from its superclass
  `Ember.ObjectProxy` and the `Ember.ControllerMixin` mixin.

  @class ObjectController
  @namespace Ember
  @extends Ember.ObjectProxy
  @uses Ember.ControllerMixin
**/
Ember.ObjectController = Ember.ObjectProxy.extend(Ember.ControllerMixin);

})();



(function() {

})();



(function() {
/**
Ember Runtime

@module ember
@submodule ember-runtime
@requires ember-metal
*/

})();

