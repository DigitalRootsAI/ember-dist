(function() {
define("route-recognizer",
  [],
  function() {
    "use strict";
    var specials = [
      '/', '.', '*', '+', '?', '|',
      '(', ')', '[', ']', '{', '}', '\\'
    ];

    var escapeRegex = new RegExp('(\\' + specials.join('|\\') + ')', 'g');

    // A Segment represents a segment in the original route description.
    // Each Segment type provides an `eachChar` and `regex` method.
    //
    // The `eachChar` method invokes the callback with one or more character
    // specifications. A character specification consumes one or more input
    // characters.
    //
    // The `regex` method returns a regex fragment for the segment. If the
    // segment is a dynamic of star segment, the regex fragment also includes
    // a capture.
    //
    // A character specification contains:
    //
    // * `validChars`: a String with a list of all valid characters, or
    // * `invalidChars`: a String with a list of all invalid characters
    // * `repeat`: true if the character specification can repeat

    function StaticSegment(string) { this.string = string; }
    StaticSegment.prototype = {
      eachChar: function(callback) {
        var string = this.string, char;

        for (var i=0, l=string.length; i<l; i++) {
          char = string.charAt(i);
          callback({ validChars: char });
        }
      },

      regex: function() {
        return this.string.replace(escapeRegex, '\\$1');
      },

      generate: function() {
        return this.string;
      }
    };

    function DynamicSegment(name) { this.name = name; }
    DynamicSegment.prototype = {
      eachChar: function(callback) {
        callback({ invalidChars: "/", repeat: true });
      },

      regex: function() {
        return "([^/]+)";
      },

      generate: function(params) {
        return params[this.name];
      }
    };

    function StarSegment(name) { this.name = name; }
    StarSegment.prototype = {
      eachChar: function(callback) {
        callback({ invalidChars: "", repeat: true });
      },

      regex: function() {
        return "(.+)";
      },

      generate: function(params) {
        return params[this.name];
      }
    };

    function EpsilonSegment() {}
    EpsilonSegment.prototype = {
      eachChar: function() {},
      regex: function() { return ""; },
      generate: function() { return ""; }
    };

    function parse(route, names, types) {
      // normalize route as not starting with a "/". Recognition will
      // also normalize.
      if (route.charAt(0) === "/") { route = route.substr(1); }

      var segments = route.split("/"), results = [];

      for (var i=0, l=segments.length; i<l; i++) {
        var segment = segments[i], match;

        if (match = segment.match(/^:([^\/]+)$/)) {
          results.push(new DynamicSegment(match[1]));
          names.push(match[1]);
          types.dynamics++;
        } else if (match = segment.match(/^\*([^\/]+)$/)) {
          results.push(new StarSegment(match[1]));
          names.push(match[1]);
          types.stars++;
        } else if(segment === "") {
          results.push(new EpsilonSegment());
        } else {
          results.push(new StaticSegment(segment));
          types.statics++;
        }
      }

      return results;
    }

    // A State has a character specification and (`charSpec`) and a list of possible
    // subsequent states (`nextStates`).
    //
    // If a State is an accepting state, it will also have several additional
    // properties:
    //
    // * `regex`: A regular expression that is used to extract parameters from paths
    //   that reached this accepting state.
    // * `handlers`: Information on how to convert the list of captures into calls
    //   to registered handlers with the specified parameters
    // * `types`: How many static, dynamic or star segments in this route. Used to
    //   decide which route to use if multiple registered routes match a path.
    //
    // Currently, State is implemented naively by looping over `nextStates` and
    // comparing a character specification against a character. A more efficient
    // implementation would use a hash of keys pointing at one or more next states.

    function State(charSpec) {
      this.charSpec = charSpec;
      this.nextStates = [];
    }

    State.prototype = {
      get: function(charSpec) {
        var nextStates = this.nextStates;

        for (var i=0, l=nextStates.length; i<l; i++) {
          var child = nextStates[i];

          var isEqual = child.charSpec.validChars === charSpec.validChars;
          isEqual = isEqual && child.charSpec.invalidChars === charSpec.invalidChars;

          if (isEqual) { return child; }
        }
      },

      put: function(charSpec) {
        var state;

        // If the character specification already exists in a child of the current
        // state, just return that state.
        if (state = this.get(charSpec)) { return state; }

        // Make a new state for the character spec
        state = new State(charSpec);

        // Insert the new state as a child of the current state
        this.nextStates.push(state);

        // If this character specification repeats, insert the new state as a child
        // of itself. Note that this will not trigger an infinite loop because each
        // transition during recognition consumes a character.
        if (charSpec.repeat) {
          state.nextStates.push(state);
        }

        // Return the new state
        return state;
      },

      // Find a list of child states matching the next character
      match: function(char) {
        // DEBUG "Processing `" + char + "`:"
        var nextStates = this.nextStates,
            child, charSpec, chars;

        // DEBUG "  " + debugState(this)
        var returned = [];

        for (var i=0, l=nextStates.length; i<l; i++) {
          child = nextStates[i];

          charSpec = child.charSpec;

          if (typeof (chars = charSpec.validChars) !== 'undefined') {
            if (chars.indexOf(char) !== -1) { returned.push(child); }
          } else if (typeof (chars = charSpec.invalidChars) !== 'undefined') {
            if (chars.indexOf(char) === -1) { returned.push(child); }
          }
        }

        return returned;
      }

      /** IF DEBUG
      , debug: function() {
        var charSpec = this.charSpec,
            debug = "[",
            chars = charSpec.validChars || charSpec.invalidChars;

        if (charSpec.invalidChars) { debug += "^"; }
        debug += chars;
        debug += "]";

        if (charSpec.repeat) { debug += "+"; }

        return debug;
      }
      END IF **/
    };

    /** IF DEBUG
    function debug(log) {
      console.log(log);
    }

    function debugState(state) {
      return state.nextStates.map(function(n) {
        if (n.nextStates.length === 0) { return "( " + n.debug() + " [accepting] )"; }
        return "( " + n.debug() + " <then> " + n.nextStates.map(function(s) { return s.debug() }).join(" or ") + " )";
      }).join(", ")
    }
    END IF **/

    // This is a somewhat naive strategy, but should work in a lot of cases
    // A better strategy would properly resolve /posts/:id/new and /posts/edit/:id
    function sortSolutions(states) {
      return states.sort(function(a, b) {
        if (a.types.stars !== b.types.stars) { return a.types.stars - b.types.stars; }
        if (a.types.dynamics !== b.types.dynamics) { return a.types.dynamics - b.types.dynamics; }
        if (a.types.statics !== b.types.statics) { return b.types.statics - a.types.statics; }

        return 0;
      });
    }

    function recognizeChar(states, char) {
      var nextStates = [];

      for (var i=0, l=states.length; i<l; i++) {
        var state = states[i];

        nextStates = nextStates.concat(state.match(char));
      }

      return nextStates;
    }

    function findHandler(state, path, queryParams) {
      var handlers = state.handlers, regex = state.regex;
      var captures = path.match(regex), currentCapture = 1;
      var result = [];

      for (var i=0, l=handlers.length; i<l; i++) {
        var handler = handlers[i], names = handler.names, params = {},
          watchedQueryParams = handler.queryParams || [],
          activeQueryParams = {},
          j, m;

        for (j=0, m=names.length; j<m; j++) {
          params[names[j]] = captures[currentCapture++];
        }
        for (j=0, m=watchedQueryParams.length; j < m; j++) {
          var key = watchedQueryParams[j];
          if(queryParams[key]){
            activeQueryParams[key] = queryParams[key];
          }
        }
        var currentResult = { handler: handler.handler, params: params, isDynamic: !!names.length };
        if(watchedQueryParams && watchedQueryParams.length > 0) {
          currentResult.queryParams = activeQueryParams;
        }
        result.push(currentResult);
      }

      return result;
    }

    function addSegment(currentState, segment) {
      segment.eachChar(function(char) {
        var state;

        currentState = currentState.put(char);
      });

      return currentState;
    }

    // The main interface

    var RouteRecognizer = function() {
      this.rootState = new State();
      this.names = {};
    };


    RouteRecognizer.prototype = {
      add: function(routes, options) {
        var currentState = this.rootState, regex = "^",
            types = { statics: 0, dynamics: 0, stars: 0 },
            handlers = [], allSegments = [], name;

        var isEmpty = true;

        for (var i=0, l=routes.length; i<l; i++) {
          var route = routes[i], names = [];

          var segments = parse(route.path, names, types);

          allSegments = allSegments.concat(segments);

          for (var j=0, m=segments.length; j<m; j++) {
            var segment = segments[j];

            if (segment instanceof EpsilonSegment) { continue; }

            isEmpty = false;

            // Add a "/" for the new segment
            currentState = currentState.put({ validChars: "/" });
            regex += "/";

            // Add a representation of the segment to the NFA and regex
            currentState = addSegment(currentState, segment);
            regex += segment.regex();
          }

          var handler = { handler: route.handler, names: names };
          if(route.queryParams) {
            handler.queryParams = route.queryParams;
          }
          handlers.push(handler);
        }

        if (isEmpty) {
          currentState = currentState.put({ validChars: "/" });
          regex += "/";
        }

        currentState.handlers = handlers;
        currentState.regex = new RegExp(regex + "$");
        currentState.types = types;

        if (name = options && options.as) {
          this.names[name] = {
            segments: allSegments,
            handlers: handlers
          };
        }
      },

      handlersFor: function(name) {
        var route = this.names[name], result = [];
        if (!route) { throw new Error("There is no route named " + name); }

        for (var i=0, l=route.handlers.length; i<l; i++) {
          result.push(route.handlers[i]);
        }

        return result;
      },

      hasRoute: function(name) {
        return !!this.names[name];
      },

      generate: function(name, params) {
        var route = this.names[name], output = "";
        if (!route) { throw new Error("There is no route named " + name); }

        var segments = route.segments;

        for (var i=0, l=segments.length; i<l; i++) {
          var segment = segments[i];

          if (segment instanceof EpsilonSegment) { continue; }

          output += "/";
          output += segment.generate(params);
        }

        if (output.charAt(0) !== '/') { output = '/' + output; }

        if (params && params.queryParams) {
          output += this.generateQueryString(params.queryParams, route.handlers);
        }

        return output;
      },

      generateQueryString: function(params, handlers) {
        var pairs = [], allowedParams = [];
        for(var i=0; i < handlers.length; i++) {
          var currentParamList = handlers[i].queryParams;
          if(currentParamList) {
            allowedParams.push.apply(allowedParams, currentParamList);
          }
        }
        for(var key in params) {
          if (params.hasOwnProperty(key)) {
            if(allowedParams.indexOf(key) === -1) {
              throw 'Query param "' + key + '" is not specified as a valid param for this route';
            }
            var value = params[key];
            var pair = encodeURIComponent(key);
            if(value !== true) {
              pair += "=" + encodeURIComponent(value);
            }
            pairs.push(pair);
          }
        }

        if (pairs.length === 0) { return ''; }

        return "?" + pairs.join("&");
      },

      parseQueryString: function(queryString) {
        var pairs = queryString.split("&"), queryParams = {};
        for(var i=0; i < pairs.length; i++) {
          var pair      = pairs[i].split('='),
              key       = decodeURIComponent(pair[0]),
              value     = pair[1] ? decodeURIComponent(pair[1]) : true;
          queryParams[key] = value;
        }
        return queryParams;
      },

      recognize: function(path) {
        var states = [ this.rootState ],
            pathLen, i, l, queryStart, queryParams = {};

        queryStart = path.indexOf('?');
        if (queryStart !== -1) {
          var queryString = path.substr(queryStart + 1, path.length);
          path = path.substr(0, queryStart);
          queryParams = this.parseQueryString(queryString);
        }

        // DEBUG GROUP path

        if (path.charAt(0) !== "/") { path = "/" + path; }

        pathLen = path.length;
        if (pathLen > 1 && path.charAt(pathLen - 1) === "/") {
          path = path.substr(0, pathLen - 1);
        }

        for (i=0, l=path.length; i<l; i++) {
          states = recognizeChar(states, path.charAt(i));
          if (!states.length) { break; }
        }

        // END DEBUG GROUP

        var solutions = [];
        for (i=0, l=states.length; i<l; i++) {
          if (states[i].handlers) { solutions.push(states[i]); }
        }

        states = sortSolutions(solutions);

        var state = solutions[0];

        if (state && state.handlers) {
          return findHandler(state, path, queryParams);
        }
      }
    };

    function Target(path, matcher, delegate) {
      this.path = path;
      this.matcher = matcher;
      this.delegate = delegate;
    }

    Target.prototype = {
      to: function(target, callback) {
        var delegate = this.delegate;

        if (delegate && delegate.willAddRoute) {
          target = delegate.willAddRoute(this.matcher.target, target);
        }

        this.matcher.add(this.path, target);

        if (callback) {
          if (callback.length === 0) { throw new Error("You must have an argument in the function passed to `to`"); }
          this.matcher.addChild(this.path, target, callback, this.delegate);
        }
        return this;
      },

      withQueryParams: function() {
        if (arguments.length === 0) { throw new Error("you must provide arguments to the withQueryParams method"); }
        for (var i = 0; i < arguments.length; i++) {
          if (typeof arguments[i] !== "string") {
            throw new Error('you should call withQueryParams with a list of strings, e.g. withQueryParams("foo", "bar")');
          }
        }
        var queryParams = [].slice.call(arguments);
        this.matcher.addQueryParams(this.path, queryParams);
      }
    };

    function Matcher(target) {
      this.routes = {};
      this.children = {};
      this.queryParams = {};
      this.target = target;
    }

    Matcher.prototype = {
      add: function(path, handler) {
        this.routes[path] = handler;
      },

      addQueryParams: function(path, params) {
        this.queryParams[path] = params;
      },

      addChild: function(path, target, callback, delegate) {
        var matcher = new Matcher(target);
        this.children[path] = matcher;

        var match = generateMatch(path, matcher, delegate);

        if (delegate && delegate.contextEntered) {
          delegate.contextEntered(target, match);
        }

        callback(match);
      }
    };

    function generateMatch(startingPath, matcher, delegate) {
      return function(path, nestedCallback) {
        var fullPath = startingPath + path;

        if (nestedCallback) {
          nestedCallback(generateMatch(fullPath, matcher, delegate));
        } else {
          return new Target(startingPath + path, matcher, delegate);
        }
      };
    }

    function addRoute(routeArray, path, handler, queryParams) {
      var len = 0;
      for (var i=0, l=routeArray.length; i<l; i++) {
        len += routeArray[i].path.length;
      }

      path = path.substr(len);
      var route = { path: path, handler: handler };
      if(queryParams) { route.queryParams = queryParams; }
      routeArray.push(route);
    }

    function eachRoute(baseRoute, matcher, callback, binding) {
      var routes = matcher.routes;
      var queryParams = matcher.queryParams;

      for (var path in routes) {
        if (routes.hasOwnProperty(path)) {
          var routeArray = baseRoute.slice();
          addRoute(routeArray, path, routes[path], queryParams[path]);

          if (matcher.children[path]) {
            eachRoute(routeArray, matcher.children[path], callback, binding);
          } else {
            callback.call(binding, routeArray);
          }
        }
      }
    }

    RouteRecognizer.prototype.map = function(callback, addRouteCallback) {
      var matcher = new Matcher();

      callback(generateMatch("", matcher, this.delegate));

      eachRoute([], matcher, function(route) {
        if (addRouteCallback) { addRouteCallback(this, route); }
        else { this.add(route); }
      }, this);
    };
    return RouteRecognizer;
  });

})();



(function() {
define("router",
  ["route-recognizer","rsvp","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    /**
      @private

      This file references several internal structures:

      ## `RecognizedHandler`

      * `{String} handler`: A handler name
      * `{Object} params`: A hash of recognized parameters

      ## `HandlerInfo`

      * `{Boolean} isDynamic`: whether a handler has any dynamic segments
      * `{String} name`: the name of a handler
      * `{Object} handler`: a handler object
      * `{Object} context`: the active context for the handler
    */

    var RouteRecognizer = __dependency1__;
    var RSVP = __dependency2__;

    var slice = Array.prototype.slice;



    /**
      @private

      A Transition is a thennable (a promise-like object) that represents
      an attempt to transition to another route. It can be aborted, either
      explicitly via `abort` or by attempting another transition while a
      previous one is still underway. An aborted transition can also
      be `retry()`d later.
     */

    function Transition(router, promise) {
      this.router = router;
      this.promise = promise;
      this.data = {};
      this.resolvedModels = {};
      this.providedModels = {};
      this.providedModelsArray = [];
      this.sequence = ++Transition.currentSequence;
      this.params = {};
    }

    Transition.currentSequence = 0;

    Transition.prototype = {
      targetName: null,
      urlMethod: 'update',
      providedModels: null,
      resolvedModels: null,
      params: null,
      pivotHandler: null,
      resolveIndex: 0,
      handlerInfos: null,

      isActive: true,

      /**
        The Transition's internal promise. Calling `.then` on this property
        is that same as calling `.then` on the Transition object itself, but
        this property is exposed for when you want to pass around a
        Transition's promise, but not the Transition object itself, since
        Transition object can be externally `abort`ed, while the promise
        cannot.
       */
      promise: null,

      /**
        Custom state can be stored on a Transition's `data` object.
        This can be useful for decorating a Transition within an earlier
        hook and shared with a later hook. Properties set on `data` will
        be copied to new transitions generated by calling `retry` on this
        transition.
       */
      data: null,

      /**
        A standard promise hook that resolves if the transition
        succeeds and rejects if it fails/redirects/aborts.

        Forwards to the internal `promise` property which you can
        use in situations where you want to pass around a thennable,
        but not the Transition itself.

        @param {Function} success
        @param {Function} failure
       */
      then: function(success, failure) {
        return this.promise.then(success, failure);
      },

      /**
        Aborts the Transition. Note you can also implicitly abort a transition
        by initiating another transition while a previous one is underway.
       */
      abort: function() {
        if (this.isAborted) { return this; }
        log(this.router, this.sequence, this.targetName + ": transition was aborted");
        this.isAborted = true;
        this.isActive = false;
        this.router.activeTransition = null;
        return this;
      },

      /**
        Retries a previously-aborted transition (making sure to abort the
        transition if it's still active). Returns a new transition that
        represents the new attempt to transition.
       */
      retry: function() {
        this.abort();
        var recogHandlers = this.router.recognizer.handlersFor(this.targetName),
            handlerInfos  = generateHandlerInfosWithQueryParams(this.router, recogHandlers, this.queryParams),
            newTransition = performTransition(this.router, handlerInfos, this.providedModelsArray, this.params, this.queryParams, this.data);

        return newTransition;
      },

      /**
        Sets the URL-changing method to be employed at the end of a
        successful transition. By default, a new Transition will just
        use `updateURL`, but passing 'replace' to this method will
        cause the URL to update using 'replaceWith' instead. Omitting
        a parameter will disable the URL change, allowing for transitions
        that don't update the URL at completion (this is also used for
        handleURL, since the URL has already changed before the
        transition took place).

        @param {String} method the type of URL-changing method to use
          at the end of a transition. Accepted values are 'replace',
          falsy values, or any other non-falsy value (which is
          interpreted as an updateURL transition).

        @return {Transition} this transition
       */
      method: function(method) {
        this.urlMethod = method;
        return this;
      },

      /**
        Fires an event on the current list of resolved/resolving
        handlers within this transition. Useful for firing events
        on route hierarchies that haven't fully been entered yet.

        @param {Boolean} ignoreFailure the name of the event to fire
        @param {String} name the name of the event to fire
       */
      trigger: function(ignoreFailure) {
        var args = slice.call(arguments);
        if (typeof ignoreFailure === 'boolean') {
          args.shift();
        } else {
          // Throw errors on unhandled trigger events by default
          ignoreFailure = false;
        }
        trigger(this.router, this.handlerInfos.slice(0, this.resolveIndex + 1), ignoreFailure, args);
      },

      toString: function() {
        return "Transition (sequence " + this.sequence + ")";
      }
    };

    function Router() {
      this.recognizer = new RouteRecognizer();
    }

    // TODO: separate into module?
    Router.Transition = Transition;

    __exports__["default"] = Router;


    /**
      Promise reject reasons passed to promise rejection
      handlers for failed transitions.
     */
    Router.UnrecognizedURLError = function(message) {
      this.message = (message || "UnrecognizedURLError");
      this.name = "UnrecognizedURLError";
    };

    Router.TransitionAborted = function(message) {
      this.message = (message || "TransitionAborted");
      this.name = "TransitionAborted";
    };

    function errorTransition(router, reason) {
      return new Transition(router, RSVP.reject(reason));
    }


    Router.prototype = {
      /**
        The main entry point into the router. The API is essentially
        the same as the `map` method in `route-recognizer`.

        This method extracts the String handler at the last `.to()`
        call and uses it as the name of the whole route.

        @param {Function} callback
      */
      map: function(callback) {
        this.recognizer.delegate = this.delegate;

        this.recognizer.map(callback, function(recognizer, route) {
          var lastHandler = route[route.length - 1].handler;
          var args = [route, { as: lastHandler }];
          recognizer.add.apply(recognizer, args);
        });
      },

      hasRoute: function(route) {
        return this.recognizer.hasRoute(route);
      },

      /**
        Clears the current and target route handlers and triggers exit
        on each of them starting at the leaf and traversing up through
        its ancestors.
      */
      reset: function() {
        eachHandler(this.currentHandlerInfos || [], function(handlerInfo) {
          var handler = handlerInfo.handler;
          if (handler.exit) {
            handler.exit();
          }
        });
        this.currentHandlerInfos = null;
        this.targetHandlerInfos = null;
      },

      activeTransition: null,

      /**
        var handler = handlerInfo.handler;
        The entry point for handling a change to the URL (usually
        via the back and forward button).

        Returns an Array of handlers and the parameters associated
        with those parameters.

        @param {String} url a URL to process

        @return {Array} an Array of `[handler, parameter]` tuples
      */
      handleURL: function(url) {
        // Perform a URL-based transition, but don't change
        // the URL afterward, since it already happened.
        var args = slice.call(arguments);
        if (url.charAt(0) !== '/') { args[0] = '/' + url; }
        return doTransition(this, args).method(null);
      },

      /**
        Hook point for updating the URL.

        @param {String} url a URL to update to
      */
      updateURL: function() {
        throw new Error("updateURL is not implemented");
      },

      /**
        Hook point for replacing the current URL, i.e. with replaceState

        By default this behaves the same as `updateURL`

        @param {String} url a URL to update to
      */
      replaceURL: function(url) {
        this.updateURL(url);
      },

      /**
        Transition into the specified named route.

        If necessary, trigger the exit callback on any handlers
        that are no longer represented by the target route.

        @param {String} name the name of the route
      */
      transitionTo: function(name) {
        return doTransition(this, arguments);
      },

      intermediateTransitionTo: function(name) {
        doTransition(this, arguments, true);
      },

      /**
        Identical to `transitionTo` except that the current URL will be replaced
        if possible.

        This method is intended primarily for use with `replaceState`.

        @param {String} name the name of the route
      */
      replaceWith: function(name) {
        return doTransition(this, arguments).method('replace');
      },

      /**
        @private

        This method takes a handler name and a list of contexts and returns
        a serialized parameter hash suitable to pass to `recognizer.generate()`.

        @param {String} handlerName
        @param {Array[Object]} contexts
        @return {Object} a serialized parameter hash
      */

      paramsForHandler: function(handlerName, contexts) {
        var partitionedArgs = extractQueryParams(slice.call(arguments, 1));
        return paramsForHandler(this, handlerName, partitionedArgs[0], partitionedArgs[1]);
      },

      /**
        This method takes a handler name and returns a list of query params
        that are valid to pass to the handler or its parents

        @param {String} handlerName
        @return {Array[String]} a list of query parameters
      */
      queryParamsForHandler: function (handlerName) {
        return queryParamsForHandler(this, handlerName);
      },

      /**
        Take a named route and context objects and generate a
        URL.

        @param {String} name the name of the route to generate
          a URL for
        @param {...Object} objects a list of objects to serialize

        @return {String} a URL
      */
      generate: function(handlerName) {
        var partitionedArgs = extractQueryParams(slice.call(arguments, 1)),
          suppliedParams = partitionedArgs[0],
          queryParams = partitionedArgs[1];

        var params = paramsForHandler(this, handlerName, suppliedParams, queryParams),
          validQueryParams = queryParamsForHandler(this, handlerName);

        var missingParams = [];

        for (var key in queryParams) {
          if (queryParams.hasOwnProperty(key) && !~validQueryParams.indexOf(key)) {
            missingParams.push(key);
          }
        }

        if (missingParams.length > 0) {
          var err = 'You supplied the params ';
          err += missingParams.map(function(param) {
            return '"' + param + "=" + queryParams[param] + '"';
          }).join(' and ');

          err += ' which are not valid for the "' + handlerName + '" handler or its parents';

          throw new Error(err);
        }

        return this.recognizer.generate(handlerName, params);
      },

      isActive: function(handlerName) {
        var partitionedArgs   = extractQueryParams(slice.call(arguments, 1)),
            contexts          = partitionedArgs[0],
            queryParams       = partitionedArgs[1],
            activeQueryParams  = {},
            effectiveQueryParams = {};

        var targetHandlerInfos = this.targetHandlerInfos,
            found = false, names, object, handlerInfo, handlerObj;

        if (!targetHandlerInfos) { return false; }

        var recogHandlers = this.recognizer.handlersFor(targetHandlerInfos[targetHandlerInfos.length - 1].name);
        for (var i=targetHandlerInfos.length-1; i>=0; i--) {
          handlerInfo = targetHandlerInfos[i];
          if (handlerInfo.name === handlerName) { found = true; }

          if (found) {
            var recogHandler = recogHandlers[i];

            merge(activeQueryParams, handlerInfo.queryParams);
            if (queryParams !== false) {
              merge(effectiveQueryParams, handlerInfo.queryParams);
              mergeSomeKeys(effectiveQueryParams, queryParams, recogHandler.queryParams);
            }

            if (handlerInfo.isDynamic && contexts.length > 0) {
              object = contexts.pop();

              if (isParam(object)) {
                var name = recogHandler.names[0];
                if (!this.currentParams || "" + object !== this.currentParams[name]) { return false; }
              } else if (handlerInfo.context !== object) {
                return false;
              }
            }
          }
        }


        return contexts.length === 0 && found && queryParamsEqual(activeQueryParams, effectiveQueryParams);
      },

      trigger: function(name) {
        var args = slice.call(arguments);
        trigger(this, this.currentHandlerInfos, false, args);
      },

      /**
        Hook point for logging transition status updates.

        @param {String} message The message to log.
      */
      log: null
    };

    /**
      @private

      Used internally for both URL and named transition to determine
      a shared pivot parent route and other data necessary to perform
      a transition.
     */
    function getMatchPoint(router, handlers, objects, inputParams, queryParams) {

      var matchPoint = handlers.length,
          providedModels = {}, i,
          currentHandlerInfos = router.currentHandlerInfos || [],
          params = {},
          oldParams = router.currentParams || {},
          activeTransition = router.activeTransition,
          handlerParams = {},
          obj;

      objects = slice.call(objects);
      merge(params, inputParams);

      for (i = handlers.length - 1; i >= 0; i--) {
        var handlerObj = handlers[i],
            handlerName = handlerObj.handler,
            oldHandlerInfo = currentHandlerInfos[i],
            hasChanged = false;

        // Check if handler names have changed.
        if (!oldHandlerInfo || oldHandlerInfo.name !== handlerObj.handler) { hasChanged = true; }

        if (handlerObj.isDynamic) {
          // URL transition.

          if (obj = getMatchPointObject(objects, handlerName, activeTransition, true, params)) {
            hasChanged = true;
            providedModels[handlerName] = obj;
          } else {
            handlerParams[handlerName] = {};
            for (var prop in handlerObj.params) {
              if (!handlerObj.params.hasOwnProperty(prop)) { continue; }
              var newParam = handlerObj.params[prop];
              if (oldParams[prop] !== newParam) { hasChanged = true; }
              handlerParams[handlerName][prop] = params[prop] = newParam;
            }
          }
        } else if (handlerObj.hasOwnProperty('names')) {
          // Named transition.

          if (objects.length) { hasChanged = true; }

          if (obj = getMatchPointObject(objects, handlerName, activeTransition, handlerObj.names[0], params)) {
            providedModels[handlerName] = obj;
          } else {
            var names = handlerObj.names;
            handlerParams[handlerName] = {};
            for (var j = 0, len = names.length; j < len; ++j) {
              var name = names[j];
              handlerParams[handlerName][name] = params[name] = params[name] || oldParams[name];
            }
          }
        }

        // If there is an old handler, see if query params are the same. If there isn't an old handler,
        // hasChanged will already be true here
        if(oldHandlerInfo && !queryParamsEqual(oldHandlerInfo.queryParams, handlerObj.queryParams)) {
            hasChanged = true;
        }

        if (hasChanged) { matchPoint = i; }
      }

      if (objects.length > 0) {
        throw new Error("More context objects were passed than there are dynamic segments for the route: " + handlers[handlers.length - 1].handler);
      }

      var pivotHandlerInfo = currentHandlerInfos[matchPoint - 1],
          pivotHandler = pivotHandlerInfo && pivotHandlerInfo.handler;

      return { matchPoint: matchPoint, providedModels: providedModels, params: params, handlerParams: handlerParams, pivotHandler: pivotHandler };
    }

    function getMatchPointObject(objects, handlerName, activeTransition, paramName, params) {

      if (objects.length && paramName) {

        var object = objects.pop();

        // If provided object is string or number, treat as param.
        if (isParam(object)) {
          params[paramName] = object.toString();
        } else {
          return object;
        }
      } else if (activeTransition) {
        // Use model from previous transition attempt, preferably the resolved one.
        return activeTransition.resolvedModels[handlerName] ||
               (paramName && activeTransition.providedModels[handlerName]);
      }
    }

    function isParam(object) {
      return (typeof object === "string" || object instanceof String || typeof object === "number" || object instanceof Number);
    }



    /**
      @private

      This method takes a handler name and returns a list of query params
      that are valid to pass to the handler or its parents

      @param {Router} router
      @param {String} handlerName
      @return {Array[String]} a list of query parameters
    */
    function queryParamsForHandler(router, handlerName) {
      var handlers = router.recognizer.handlersFor(handlerName),
        queryParams = [];

      for (var i = 0; i < handlers.length; i++) {
        queryParams.push.apply(queryParams, handlers[i].queryParams || []);
      }

      return queryParams;
    }
    /**
      @private

      This method takes a handler name and a list of contexts and returns
      a serialized parameter hash suitable to pass to `recognizer.generate()`.

      @param {Router} router
      @param {String} handlerName
      @param {Array[Object]} objects
      @return {Object} a serialized parameter hash
    */
    function paramsForHandler(router, handlerName, objects, queryParams) {

      var handlers = router.recognizer.handlersFor(handlerName),
          params = {},
          handlerInfos = generateHandlerInfosWithQueryParams(router, handlers, queryParams),
          matchPoint = getMatchPoint(router, handlerInfos, objects).matchPoint,
          mergedQueryParams = {},
          object, handlerObj, handler, names, i;

      params.queryParams = {};

      for (i=0; i<handlers.length; i++) {
        handlerObj = handlers[i];
        handler = router.getHandler(handlerObj.handler);
        names = handlerObj.names;

        // If it's a dynamic segment
        if (names.length) {
          // If we have objects, use them
          if (i >= matchPoint) {
            object = objects.shift();
          // Otherwise use existing context
          } else {
            object = handler.context;
          }

          // Serialize to generate params
          merge(params, serialize(handler, object, names));
        }
        if (queryParams !== false) {
          mergeSomeKeys(params.queryParams, router.currentQueryParams, handlerObj.queryParams);
          mergeSomeKeys(params.queryParams, queryParams, handlerObj.queryParams);
        }
      }

      if (queryParamsEqual(params.queryParams, {})) { delete params.queryParams; }
      return params;
    }

    function merge(hash, other) {
      for (var prop in other) {
        if (other.hasOwnProperty(prop)) { hash[prop] = other[prop]; }
      }
    }

    function mergeSomeKeys(hash, other, keys) {
      if (!other || !keys) { return; }
      for(var i = 0; i < keys.length; i++) {
        var key = keys[i], value;
        if(other.hasOwnProperty(key)) {
          value = other[key];
          if(value === null || value === false || typeof value === "undefined") {
            delete hash[key];
          } else {
            hash[key] = other[key];
          }
        }
      }
    }

    /**
      @private
    */

    function generateHandlerInfosWithQueryParams(router, handlers, queryParams) {
      var handlerInfos = [];

      for (var i = 0; i < handlers.length; i++) {
        var handler = handlers[i],
          handlerInfo = { handler: handler.handler, names: handler.names, context: handler.context, isDynamic: handler.isDynamic },
          activeQueryParams = {};

        if (queryParams !== false) {
          mergeSomeKeys(activeQueryParams, router.currentQueryParams, handler.queryParams);
          mergeSomeKeys(activeQueryParams, queryParams, handler.queryParams);
        }

        if (handler.queryParams && handler.queryParams.length > 0) {
          handlerInfo.queryParams = activeQueryParams;
        }

        handlerInfos.push(handlerInfo);
      }

      return handlerInfos;
    }

    /**
      @private
    */
    function createQueryParamTransition(router, queryParams, isIntermediate) {
      var currentHandlers = router.currentHandlerInfos,
          currentHandler = currentHandlers[currentHandlers.length - 1],
          name = currentHandler.name;

      log(router, "Attempting query param transition");

      return createNamedTransition(router, [name, queryParams], isIntermediate);
    }

    /**
      @private
    */
    function createNamedTransition(router, args, isIntermediate) {
      var partitionedArgs     = extractQueryParams(args),
        pureArgs              = partitionedArgs[0],
        queryParams           = partitionedArgs[1],
        handlers              = router.recognizer.handlersFor(pureArgs[0]),
        handlerInfos          = generateHandlerInfosWithQueryParams(router, handlers, queryParams);


      log(router, "Attempting transition to " + pureArgs[0]);

      return performTransition(router,
                               handlerInfos,
                               slice.call(pureArgs, 1),
                               router.currentParams,
                               queryParams,
                               null,
                               isIntermediate);
    }

    /**
      @private
    */
    function createURLTransition(router, url, isIntermediate) {
      var results = router.recognizer.recognize(url),
          currentHandlerInfos = router.currentHandlerInfos,
          queryParams = {},
          i, len;

      log(router, "Attempting URL transition to " + url);

      if (results) {
        // Make sure this route is actually accessible by URL.
        for (i = 0, len = results.length; i < len; ++i) {

          if (router.getHandler(results[i].handler).inaccessibleByURL) {
            results = null;
            break;
          }
        }
      }

      if (!results) {
        return errorTransition(router, new Router.UnrecognizedURLError(url));
      }

      for(i = 0, len = results.length; i < len; i++) {
        merge(queryParams, results[i].queryParams);
      }

      return performTransition(router, results, [], {}, queryParams, null, isIntermediate);
    }


    /**
      @private

      Takes an Array of `HandlerInfo`s, figures out which ones are
      exiting, entering, or changing contexts, and calls the
      proper handler hooks.

      For example, consider the following tree of handlers. Each handler is
      followed by the URL segment it handles.

      ```
      |~index ("/")
      | |~posts ("/posts")
      | | |-showPost ("/:id")
      | | |-newPost ("/new")
      | | |-editPost ("/edit")
      | |~about ("/about/:id")
      ```

      Consider the following transitions:

      1. A URL transition to `/posts/1`.
         1. Triggers the `*model` callbacks on the
            `index`, `posts`, and `showPost` handlers
         2. Triggers the `enter` callback on the same
         3. Triggers the `setup` callback on the same
      2. A direct transition to `newPost`
         1. Triggers the `exit` callback on `showPost`
         2. Triggers the `enter` callback on `newPost`
         3. Triggers the `setup` callback on `newPost`
      3. A direct transition to `about` with a specified
         context object
         1. Triggers the `exit` callback on `newPost`
            and `posts`
         2. Triggers the `serialize` callback on `about`
         3. Triggers the `enter` callback on `about`
         4. Triggers the `setup` callback on `about`

      @param {Transition} transition
      @param {Array[HandlerInfo]} handlerInfos
    */
    function setupContexts(transition, handlerInfos) {
      var router = transition.router,
          partition = partitionHandlers(router.currentHandlerInfos || [], handlerInfos);

      router.targetHandlerInfos = handlerInfos;

      eachHandler(partition.exited, function(handlerInfo) {
        var handler = handlerInfo.handler;
        delete handler.context;
        if (handler.exit) { handler.exit(); }
      });

      var currentHandlerInfos = partition.unchanged.slice();
      router.currentHandlerInfos = currentHandlerInfos;

      eachHandler(partition.updatedContext, function(handlerInfo) {
        handlerEnteredOrUpdated(transition, currentHandlerInfos, handlerInfo, false);
      });

      eachHandler(partition.entered, function(handlerInfo) {
        handlerEnteredOrUpdated(transition, currentHandlerInfos, handlerInfo, true);
      });
    }

    /**
      @private

      Helper method used by setupContexts. Handles errors or redirects
      that may happen in enter/setup.
    */
    function handlerEnteredOrUpdated(transition, currentHandlerInfos, handlerInfo, enter) {
      var handler = handlerInfo.handler,
          context = handlerInfo.context;

      try {
        if (enter && handler.enter) { handler.enter(); }
        checkAbort(transition);

        setContext(handler, context);
        setQueryParams(handler, handlerInfo.queryParams);

        if (handler.setup) { handler.setup(context, handlerInfo.queryParams); }
        checkAbort(transition);
      } catch(e) {
        if (!(e instanceof Router.TransitionAborted)) {
          // Trigger the `error` event starting from this failed handler.
          transition.trigger(true, 'error', e, transition, handler);
        }

        // Propagate the error so that the transition promise will reject.
        throw e;
      }

      currentHandlerInfos.push(handlerInfo);
    }


    /**
      @private

      Iterates over an array of `HandlerInfo`s, passing the handler
      and context into the callback.

      @param {Array[HandlerInfo]} handlerInfos
      @param {Function(Object, Object)} callback
    */
    function eachHandler(handlerInfos, callback) {
      for (var i=0, l=handlerInfos.length; i<l; i++) {
        callback(handlerInfos[i]);
      }
    }

    /**
      @private

      determines if two queryparam objects are the same or not
    **/
    function queryParamsEqual(a, b) {
      a = a || {};
      b = b || {};
      var checkedKeys = [], key;
      for(key in a) {
        if (!a.hasOwnProperty(key)) { continue; }
        if(b[key] !== a[key]) { return false; }
        checkedKeys.push(key);
      }
      for(key in b) {
        if (!b.hasOwnProperty(key)) { continue; }
        if (~checkedKeys.indexOf(key)) { continue; }
        // b has a key not in a
        return false;
      }
      return true;
    }

    /**
      @private

      This function is called when transitioning from one URL to
      another to determine which handlers are no longer active,
      which handlers are newly active, and which handlers remain
      active but have their context changed.

      Take a list of old handlers and new handlers and partition
      them into four buckets:

      * unchanged: the handler was active in both the old and
        new URL, and its context remains the same
      * updated context: the handler was active in both the
        old and new URL, but its context changed. The handler's
        `setup` method, if any, will be called with the new
        context.
      * exited: the handler was active in the old URL, but is
        no longer active.
      * entered: the handler was not active in the old URL, but
        is now active.

      The PartitionedHandlers structure has four fields:

      * `updatedContext`: a list of `HandlerInfo` objects that
        represent handlers that remain active but have a changed
        context
      * `entered`: a list of `HandlerInfo` objects that represent
        handlers that are newly active
      * `exited`: a list of `HandlerInfo` objects that are no
        longer active.
      * `unchanged`: a list of `HanderInfo` objects that remain active.

      @param {Array[HandlerInfo]} oldHandlers a list of the handler
        information for the previous URL (or `[]` if this is the
        first handled transition)
      @param {Array[HandlerInfo]} newHandlers a list of the handler
        information for the new URL

      @return {Partition}
    */
    function partitionHandlers(oldHandlers, newHandlers) {
      var handlers = {
            updatedContext: [],
            exited: [],
            entered: [],
            unchanged: []
          };

      var handlerChanged, contextChanged, queryParamsChanged, i, l;

      for (i=0, l=newHandlers.length; i<l; i++) {
        var oldHandler = oldHandlers[i], newHandler = newHandlers[i];

        if (!oldHandler || oldHandler.handler !== newHandler.handler) {
          handlerChanged = true;
        } else if (!queryParamsEqual(oldHandler.queryParams, newHandler.queryParams)) {
          queryParamsChanged = true;
        }

        if (handlerChanged) {
          handlers.entered.push(newHandler);
          if (oldHandler) { handlers.exited.unshift(oldHandler); }
        } else if (contextChanged || oldHandler.context !== newHandler.context || queryParamsChanged) {
          contextChanged = true;
          handlers.updatedContext.push(newHandler);
        } else {
          handlers.unchanged.push(oldHandler);
        }
      }

      for (i=newHandlers.length, l=oldHandlers.length; i<l; i++) {
        handlers.exited.unshift(oldHandlers[i]);
      }

      return handlers;
    }

    function trigger(router, handlerInfos, ignoreFailure, args) {
      if (router.triggerEvent) {
        router.triggerEvent(handlerInfos, ignoreFailure, args);
        return;
      }

      var name = args.shift();

      if (!handlerInfos) {
        if (ignoreFailure) { return; }
        throw new Error("Could not trigger event '" + name + "'. There are no active handlers");
      }

      var eventWasHandled = false;

      for (var i=handlerInfos.length-1; i>=0; i--) {
        var handlerInfo = handlerInfos[i],
            handler = handlerInfo.handler;

        if (handler.events && handler.events[name]) {
          if (handler.events[name].apply(handler, args) === true) {
            eventWasHandled = true;
          } else {
            return;
          }
        }
      }

      if (!eventWasHandled && !ignoreFailure) {
        throw new Error("Nothing handled the event '" + name + "'.");
      }
    }

    function setContext(handler, context) {
      handler.context = context;
      if (handler.contextDidChange) { handler.contextDidChange(); }
    }

    function setQueryParams(handler, queryParams) {
      handler.queryParams = queryParams;
      if (handler.queryParamsDidChange) { handler.queryParamsDidChange(); }
    }


    /**
      @private

      Extracts query params from the end of an array
    **/

    function extractQueryParams(array) {
      var len = (array && array.length), head, queryParams;

      if(len && len > 0 && array[len - 1] && array[len - 1].hasOwnProperty('queryParams')) {
        queryParams = array[len - 1].queryParams;
        head = slice.call(array, 0, len - 1);
        return [head, queryParams];
      } else {
        return [array, null];
      }
    }

    function performIntermediateTransition(router, recogHandlers, matchPointResults) {

      var handlerInfos = generateHandlerInfos(router, recogHandlers);
      for (var i = 0; i < handlerInfos.length; ++i) {
        var handlerInfo = handlerInfos[i];
        handlerInfo.context = matchPointResults.providedModels[handlerInfo.name];
      }

      var stubbedTransition = {
        router: router,
        isAborted: false
      };

      setupContexts(stubbedTransition, handlerInfos);
    }

    /**
      @private

      Creates, begins, and returns a Transition.
     */
    function performTransition(router, recogHandlers, providedModelsArray, params, queryParams, data, isIntermediate) {

      var matchPointResults = getMatchPoint(router, recogHandlers, providedModelsArray, params, queryParams),
          targetName = recogHandlers[recogHandlers.length - 1].handler,
          wasTransitioning = false,
          currentHandlerInfos = router.currentHandlerInfos;

      if (isIntermediate) {
        return performIntermediateTransition(router, recogHandlers, matchPointResults);
      }

      // Check if there's already a transition underway.
      if (router.activeTransition) {
        if (transitionsIdentical(router.activeTransition, targetName, providedModelsArray, queryParams)) {
          return router.activeTransition;
        }
        router.activeTransition.abort();
        wasTransitioning = true;
      }

      var deferred = RSVP.defer(),
          transition = new Transition(router, deferred.promise);

      transition.targetName = targetName;
      transition.providedModels = matchPointResults.providedModels;
      transition.providedModelsArray = providedModelsArray;
      transition.params = matchPointResults.params;
      transition.data = data || {};
      transition.queryParams = queryParams;
      transition.pivotHandler = matchPointResults.pivotHandler;
      router.activeTransition = transition;

      var handlerInfos = generateHandlerInfos(router, recogHandlers);
      transition.handlerInfos = handlerInfos;

      // Fire 'willTransition' event on current handlers, but don't fire it
      // if a transition was already underway.
      if (!wasTransitioning) {
        trigger(router, currentHandlerInfos, true, ['willTransition', transition]);
      }

      log(router, transition.sequence, "Beginning validation for transition to " + transition.targetName);
      validateEntry(transition, matchPointResults.matchPoint, matchPointResults.handlerParams)
                   .then(transitionSuccess, transitionFailure);

      return transition;

      function transitionSuccess() {
        checkAbort(transition);

        try {
          finalizeTransition(transition, handlerInfos);

          // currentHandlerInfos was updated in finalizeTransition
          trigger(router, router.currentHandlerInfos, true, ['didTransition']);

          if (router.didTransition) {
            router.didTransition(handlerInfos);
          }

          log(router, transition.sequence, "TRANSITION COMPLETE.");

          // Resolve with the final handler.
          transition.isActive = false;
          deferred.resolve(handlerInfos[handlerInfos.length - 1].handler);
        } catch(e) {
          deferred.reject(e);
        }

        // Don't nullify if another transition is underway (meaning
        // there was a transition initiated with enter/setup).
        if (!transition.isAborted) {
          router.activeTransition = null;
        }
      }

      function transitionFailure(reason) {
        deferred.reject(reason);
      }
    }

    /**
      @private

      Accepts handlers in Recognizer format, either returned from
      recognize() or handlersFor(), and returns unified
      `HandlerInfo`s.
     */
    function generateHandlerInfos(router, recogHandlers) {
      var handlerInfos = [];
      for (var i = 0, len = recogHandlers.length; i < len; ++i) {
        var handlerObj = recogHandlers[i],
            isDynamic = handlerObj.isDynamic || (handlerObj.names && handlerObj.names.length);

        var handlerInfo = {
          isDynamic: !!isDynamic,
          name: handlerObj.handler,
          handler: router.getHandler(handlerObj.handler)
        };
        if(handlerObj.queryParams) {
          handlerInfo.queryParams = handlerObj.queryParams;
        }
        handlerInfos.push(handlerInfo);
      }
      return handlerInfos;
    }

    /**
      @private
     */
    function transitionsIdentical(oldTransition, targetName, providedModelsArray, queryParams) {

      if (oldTransition.targetName !== targetName) { return false; }

      var oldModels = oldTransition.providedModelsArray;
      if (oldModels.length !== providedModelsArray.length) { return false; }

      for (var i = 0, len = oldModels.length; i < len; ++i) {
        if (oldModels[i] !== providedModelsArray[i]) { return false; }
      }

      if(!queryParamsEqual(oldTransition.queryParams, queryParams)) {
        return false;
      }

      return true;
    }

    /**
      @private

      Updates the URL (if necessary) and calls `setupContexts`
      to update the router's array of `currentHandlerInfos`.
     */
    function finalizeTransition(transition, handlerInfos) {

      log(transition.router, transition.sequence, "Validation succeeded, finalizing transition;");

      var router = transition.router,
          seq = transition.sequence,
          handlerName = handlerInfos[handlerInfos.length - 1].name,
          urlMethod = transition.urlMethod,
          i;

      // Collect params for URL.
      var objects = [], providedModels = transition.providedModelsArray.slice();
      for (i = handlerInfos.length - 1; i>=0; --i) {
        var handlerInfo = handlerInfos[i];
        if (handlerInfo.isDynamic) {
          var providedModel = providedModels.pop();
          objects.unshift(isParam(providedModel) ? providedModel.toString() : handlerInfo.context);
        }

        if (handlerInfo.handler.inaccessibleByURL) {
          urlMethod = null;
        }
      }

      var newQueryParams = {};
      for (i = handlerInfos.length - 1; i>=0; --i) {
        merge(newQueryParams, handlerInfos[i].queryParams);
      }
      router.currentQueryParams = newQueryParams;


      var params = paramsForHandler(router, handlerName, objects, transition.queryParams);

      router.currentParams = params;

      if (urlMethod) {
        var url = router.recognizer.generate(handlerName, params);

        if (urlMethod === 'replace') {
          router.replaceURL(url);
        } else {
          // Assume everything else is just a URL update for now.
          router.updateURL(url);
        }
      }

      setupContexts(transition, handlerInfos);
    }

    /**
      @private

      Internal function used to construct the chain of promises used
      to validate a transition. Wraps calls to `beforeModel`, `model`,
      and `afterModel` in promises, and checks for redirects/aborts
      between each.
     */
    function validateEntry(transition, matchPoint, handlerParams) {

      var handlerInfos = transition.handlerInfos,
          index = transition.resolveIndex;

      if (index === handlerInfos.length) {
        // No more contexts to resolve.
        return RSVP.resolve(transition.resolvedModels);
      }

      var router = transition.router,
          handlerInfo = handlerInfos[index],
          handler = handlerInfo.handler,
          handlerName = handlerInfo.name,
          seq = transition.sequence;

      if (index < matchPoint) {
        log(router, seq, handlerName + ": using context from already-active handler");

        // We're before the match point, so don't run any hooks,
        // just use the already resolved context from the handler.
        transition.resolvedModels[handlerInfo.name] =
          transition.providedModels[handlerInfo.name] ||
          handlerInfo.handler.context;
        return proceed();
      }

      transition.trigger(true, 'willResolveModel', transition, handler);

      return RSVP.resolve().then(handleAbort)
                           .then(beforeModel)
                           .then(handleAbort)
                           .then(model)
                           .then(handleAbort)
                           .then(afterModel)
                           .then(handleAbort)
                           .then(null, handleError)
                           .then(proceed);

      function handleAbort(result) {
        if (transition.isAborted) {
          log(transition.router, transition.sequence, "detected abort.");
          return RSVP.reject(new Router.TransitionAborted());
        }

        return result;
      }

      function handleError(reason) {
        if (reason instanceof Router.TransitionAborted || transition.isAborted) {
          // if the transition was aborted and *no additional* error was thrown,
          // reject with the Router.TransitionAborted instance
          return RSVP.reject(reason);
        }

        // otherwise, we're here because of a different error
        transition.abort();

        log(router, seq, handlerName + ": handling error: " + reason);

        // An error was thrown / promise rejected, so fire an
        // `error` event from this handler info up to root.
        transition.trigger(true, 'error', reason, transition, handlerInfo.handler);

        // Propagate the original error.
        return RSVP.reject(reason);
      }

      function beforeModel() {

        log(router, seq, handlerName + ": calling beforeModel hook");

        var args;

        if (handlerInfo.queryParams) {
          args = [handlerInfo.queryParams, transition];
        } else {
          args = [transition];
        }

        var p = handler.beforeModel && handler.beforeModel.apply(handler, args);
        return (p instanceof Transition) ? null : p;
      }

      function model() {
        log(router, seq, handlerName + ": resolving model");
        var p = getModel(handlerInfo, transition, handlerParams[handlerName], index >= matchPoint);
        return (p instanceof Transition) ? null : p;
      }

      function afterModel(context) {

        log(router, seq, handlerName + ": calling afterModel hook");

        // Pass the context and resolved parent contexts to afterModel, but we don't
        // want to use the value returned from `afterModel` in any way, but rather
        // always resolve with the original `context` object.

        transition.resolvedModels[handlerInfo.name] = context;

        var args;

        if (handlerInfo.queryParams) {
          args = [context, handlerInfo.queryParams, transition];
        } else {
          args = [context, transition];
        }

        var p = handler.afterModel && handler.afterModel.apply(handler, args);
        return (p instanceof Transition) ? null : p;
      }

      function proceed() {
        log(router, seq, handlerName + ": validation succeeded, proceeding");

        handlerInfo.context = transition.resolvedModels[handlerInfo.name];
        transition.resolveIndex++;
        return validateEntry(transition, matchPoint, handlerParams);
      }
    }

    /**
      @private

      Throws a TransitionAborted if the provided transition has been aborted.
     */
    function checkAbort(transition) {
      if (transition.isAborted) {
        log(transition.router, transition.sequence, "detected abort.");
        throw new Router.TransitionAborted();
      }
    }

    /**
      @private

      Encapsulates the logic for whether to call `model` on a route,
      or use one of the models provided to `transitionTo`.
     */
    function getModel(handlerInfo, transition, handlerParams, needsUpdate) {
      var handler = handlerInfo.handler,
          handlerName = handlerInfo.name, args;

      if (!needsUpdate && handler.hasOwnProperty('context')) {
        return handler.context;
      }

      if (transition.providedModels.hasOwnProperty(handlerName)) {
        var providedModel = transition.providedModels[handlerName];
        return typeof providedModel === 'function' ? providedModel() : providedModel;
      }

      if (handlerInfo.queryParams) {
        args = [handlerParams || {}, handlerInfo.queryParams, transition];
      } else {
        args = [handlerParams || {}, transition, handlerInfo.queryParams];
      }

      return handler.model && handler.model.apply(handler, args);
    }

    /**
      @private
     */
    function log(router, sequence, msg) {

      if (!router.log) { return; }

      if (arguments.length === 3) {
        router.log("Transition #" + sequence + ": " + msg);
      } else {
        msg = sequence;
        router.log(msg);
      }
    }

    /**
      @private

      Begins and returns a Transition based on the provided
      arguments. Accepts arguments in the form of both URL
      transitions and named transitions.

      @param {Router} router
      @param {Array[Object]} args arguments passed to transitionTo,
        replaceWith, or handleURL
    */
    function doTransition(router, args, isIntermediate) {
      // Normalize blank transitions to root URL transitions.
      var name = args[0] || '/';

      if(args.length === 1 && args[0].hasOwnProperty('queryParams')) {
        return createQueryParamTransition(router, args[0], isIntermediate);
      } else if (name.charAt(0) === '/') {
        return createURLTransition(router, name, isIntermediate);
      } else {
        return createNamedTransition(router, slice.call(args), isIntermediate);
      }
    }

    /**
      @private

      Serializes a handler using its custom `serialize` method or
      by a default that looks up the expected property name from
      the dynamic segment.

      @param {Object} handler a router handler
      @param {Object} model the model to be serialized for this handler
      @param {Array[Object]} names the names array attached to an
        handler object returned from router.recognizer.handlersFor()
    */
    function serialize(handler, model, names) {

      var object = {};
      if (isParam(model)) {
        object[names[0]] = model;
        return object;
      }

      // Use custom serialize if it exists.
      if (handler.serialize) {
        return handler.serialize(model, names);
      }

      if (names.length !== 1) { return; }

      var name = names[0];

      if (/_id$/.test(name)) {
        object[name] = model.id;
      } else {
        object[name] = model;
      }
      return object;
    }
  });

})();



(function() {
/**
@module ember
@submodule ember-routing
*/

function DSL(name) {
  this.parent = name;
  this.matches = [];
}

DSL.prototype = {
  resource: function(name, options, callback) {
    if (arguments.length === 2 && typeof options === 'function') {
      callback = options;
      options = {};
    }

    if (arguments.length === 1) {
      options = {};
    }

    if (typeof options.path !== 'string') {
      options.path = "/" + name;
    }

    if (callback) {
      var dsl = new DSL(name);
      route(dsl, 'loading');
      route(dsl, 'error', { path: "/_unused_dummy_error_path_route_" + name + "/:error" });
      callback.call(dsl);
      this.push(options.path, name, dsl.generate(), options.queryParams);
    } else {
      this.push(options.path, name, null, options.queryParams);
    }


    if (Ember.FEATURES.isEnabled("ember-routing-named-substates")) {
      // For namespace-preserving nested resource (e.g. resource('foo.bar') within
      // resource('foo')) we only want to use the last route name segment to determine
      // the names of the error/loading substates (e.g. 'bar_loading')
      name = name.split('.').pop();
      route(this, name + '_loading');
      route(this, name + '_error', { path: "/_unused_dummy_error_path_route_" + name + "/:error" });
    }
  },

  push: function(url, name, callback, queryParams) {
    var parts = name.split('.');
    if (url === "" || url === "/" || parts[parts.length-1] === "index") { this.explicitIndex = true; }

    this.matches.push([url, name, callback, queryParams]);
  },

  route: function(name, options) {
    route(this, name, options);
    if (Ember.FEATURES.isEnabled("ember-routing-named-substates")) {
      route(this, name + '_loading');
      route(this, name + '_error', { path: "/_unused_dummy_error_path_route_" + name + "/:error" });
    }
  },

  generate: function() {
    var dslMatches = this.matches;

    if (!this.explicitIndex) {
      this.route("index", { path: "/" });
    }

    return function(match) {
      for (var i=0, l=dslMatches.length; i<l; i++) {
        var dslMatch = dslMatches[i];
        var matchObj = match(dslMatch[0]).to(dslMatch[1], dslMatch[2]);
        if (Ember.FEATURES.isEnabled("query-params")) {
          if(dslMatch[3]) {
            matchObj.withQueryParams.apply(matchObj, dslMatch[3]);
          }
        }
      }
    };
  }
};

function route(dsl, name, options) {
  Ember.assert("You must use `this.resource` to nest", typeof options !== 'function');

  options = options || {};

  if (typeof options.path !== 'string') {
    options.path = "/" + name;
  }

  if (dsl.parent && dsl.parent !== 'application') {
    name = dsl.parent + "." + name;
  }

  dsl.push(options.path, name, null, options.queryParams);
}

DSL.map = function(callback) {
  var dsl = new DSL();
  callback.call(dsl);
  return dsl;
};

Ember.RouterDSL = DSL;

})();



(function() {
var get = Ember.get;

/**
@module ember
@submodule ember-routing
*/

/**

  Finds a controller instance.

  @for Ember
  @method controllerFor
  @private
*/
Ember.controllerFor = function(container, controllerName, lookupOptions) {
  return container.lookup('controller:' + controllerName, lookupOptions);
};

/**
  Generates a controller factory

  The type of the generated controller factory is derived
  from the context. If the context is an array an array controller
  is generated, if an object, an object controller otherwise, a basic
  controller is generated.

  You can customize your generated controllers by defining
  `App.ObjectController` or `App.ArrayController`.

  @for Ember
  @method generateControllerFactory
  @private
*/
Ember.generateControllerFactory = function(container, controllerName, context) {
  var Factory, fullName, instance, name, factoryName, controllerType;

  if (context && Ember.isArray(context)) {
    controllerType = 'array';
  } else if (context) {
    controllerType = 'object';
  } else {
    controllerType = 'basic';
  }

  factoryName = 'controller:' + controllerType;

  Factory = container.lookupFactory(factoryName).extend({
    isGenerated: true,
    toString: function() {
      return "(generated " + controllerName + " controller)";
    }
  });

  fullName = 'controller:' + controllerName;

  container.register(fullName,  Factory);

  return Factory;
};

/**
  Generates and instantiates a controller.

  The type of the generated controller factory is derived
  from the context. If the context is an array an array controller
  is generated, if an object, an object controller otherwise, a basic
  controller is generated.

  @for Ember
  @method generateController
  @private
*/
Ember.generateController = function(container, controllerName, context) {
  Ember.generateControllerFactory(container, controllerName, context);
  var fullName = 'controller:' + controllerName;
  var instance = container.lookup(fullName);

  if (get(instance, 'namespace.LOG_ACTIVE_GENERATION')) {
    Ember.Logger.info("generated -> " + fullName, { fullName: fullName });
  }

  return instance;
};

})();



(function() {
/**
@module ember
@submodule ember-routing
*/

var Router = requireModule("router")['default'];
var get = Ember.get, set = Ember.set;
var defineProperty = Ember.defineProperty;
var slice = Array.prototype.slice;

var DefaultView = Ember._MetamorphView;
/**
  The `Ember.Router` class manages the application state and URLs. Refer to
  the [routing guide](http://emberjs.com/guides/routing/) for documentation.

  @class Router
  @namespace Ember
  @extends Ember.Object
*/
Ember.Router = Ember.Object.extend(Ember.Evented, {
  location: 'hash',

  init: function() {
    this.router = this.constructor.router || this.constructor.map(Ember.K);
    this._activeViews = {};
    this._setupLocation();

    if (get(this, 'namespace.LOG_TRANSITIONS_INTERNAL')) {
      this.router.log = Ember.Logger.debug;
    }
  },

  url: Ember.computed(function() {
    return get(this, 'location').getURL();
  }),

  startRouting: function() {
    this.router = this.router || this.constructor.map(Ember.K);

    var router = this.router,
        location = get(this, 'location'),
        container = this.container,
        self = this;

    this._setupRouter(router, location);

    container.register('view:default', DefaultView);
    container.register('view:toplevel', Ember.View.extend());

    location.onUpdateURL(function(url) {
      self.handleURL(url);
    });

    this.handleURL(location.getURL());
  },

  didTransition: function(infos) {
    updatePaths(this);

    this._cancelLoadingEvent();

    this.notifyPropertyChange('url');

    // Put this in the runloop so url will be accurate. Seems
    // less surprising than didTransition being out of sync.
    Ember.run.once(this, this.trigger, 'didTransition');

    if (get(this, 'namespace').LOG_TRANSITIONS) {
      Ember.Logger.log("Transitioned into '" + Ember.Router._routePath(infos) + "'");
    }
  },

  handleURL: function(url) {
    return this._doTransition('handleURL', [url]);
  },

  transitionTo: function() {
    return this._doTransition('transitionTo', arguments);
  },

  intermediateTransitionTo: function() {
    this.router.intermediateTransitionTo.apply(this.router, arguments);

    updatePaths(this);

    var infos = this.router.currentHandlerInfos;
    if (get(this, 'namespace').LOG_TRANSITIONS) {
      Ember.Logger.log("Intermediate-transitioned into '" + Ember.Router._routePath(infos) + "'");
    }
  },

  replaceWith: function() {
    return this._doTransition('replaceWith', arguments);
  },

  generate: function() {
    var url = this.router.generate.apply(this.router, arguments);
    return this.location.formatURL(url);
  },

  isActive: function(routeName) {
    var router = this.router;
    return router.isActive.apply(router, arguments);
  },

  send: function(name, context) {
    this.router.trigger.apply(this.router, arguments);
  },

  hasRoute: function(route) {
    return this.router.hasRoute(route);
  },

  /**
    @private

    Resets the state of the router by clearing the current route
    handlers and deactivating them.

    @method reset
   */
  reset: function() {
    this.router.reset();
  },

  _lookupActiveView: function(templateName) {
    var active = this._activeViews[templateName];
    return active && active[0];
  },

  _connectActiveView: function(templateName, view) {
    var existing = this._activeViews[templateName];

    if (existing) {
      existing[0].off('willDestroyElement', this, existing[1]);
    }

    var disconnect = function() {
      delete this._activeViews[templateName];
    };

    this._activeViews[templateName] = [view, disconnect];
    view.one('willDestroyElement', this, disconnect);
  },

  _setupLocation: function() {
    var location = get(this, 'location'),
        rootURL = get(this, 'rootURL');

    if ('string' === typeof location && this.container) {
      var resolvedLocation = this.container.lookup('location:' + location);

      if ('undefined' !== typeof resolvedLocation) {
        location = set(this, 'location', resolvedLocation);
      } else {
        // Allow for deprecated registration of custom location API's
        var options = {implementation: location};

        location = set(this, 'location', Ember.Location.create(options));
      }
    }

    if (typeof rootURL === 'string') {
      location.rootURL = rootURL;
    }

    // ensure that initState is called AFTER the rootURL is set on
    // the location instance
    if (typeof location.initState === 'function') { location.initState(); }
  },

  _getHandlerFunction: function() {
    var seen = {}, container = this.container,
        DefaultRoute = container.lookupFactory('route:basic'),
        self = this;

    return function(name) {
      var routeName = 'route:' + name,
          handler = container.lookup(routeName);

      if (seen[name]) { return handler; }

      seen[name] = true;

      if (!handler) {
        container.register(routeName, DefaultRoute.extend());
        handler = container.lookup(routeName);

        if (get(self, 'namespace.LOG_ACTIVE_GENERATION')) {
          Ember.Logger.info("generated -> " + routeName, { fullName: routeName });
        }
      }

      handler.routeName = name;
      return handler;
    };
  },

  _setupRouter: function(router, location) {
    var lastURL, emberRouter = this;

    router.getHandler = this._getHandlerFunction();

    var doUpdateURL = function() {
      location.setURL(lastURL);
    };

    router.updateURL = function(path) {
      lastURL = path;
      Ember.run.once(doUpdateURL);
    };

    if (location.replaceURL) {
      var doReplaceURL = function() {
        location.replaceURL(lastURL);
      };

      router.replaceURL = function(path) {
        lastURL = path;
        Ember.run.once(doReplaceURL);
      };
    }

    router.didTransition = function(infos) {
      emberRouter.didTransition(infos);
    };
  },

  _doTransition: function(method, args) {
    // Normalize blank route to root URL.
    args = slice.call(args);
    args[0] = args[0] || '/';

    var passedName = args[0], name, self = this,
      isQueryParamsOnly = false;

    if (Ember.FEATURES.isEnabled("query-params")) {
      isQueryParamsOnly = (args.length === 1 && args[0].hasOwnProperty('queryParams'));
    }

    if (!isQueryParamsOnly && passedName.charAt(0) === '/') {
      name = passedName;
    } else if (!isQueryParamsOnly) {
      if (!this.router.hasRoute(passedName)) {
        name = args[0] = passedName + '.index';
      } else {
        name = passedName;
      }

      Ember.assert("The route " + passedName + " was not found", this.router.hasRoute(name));
    }

    var transitionPromise = this.router[method].apply(this.router, args);

    transitionPromise.then(null, function(error) {
      if (error.name === "UnrecognizedURLError") {
        Ember.assert("The URL '" + error.message + "' did not match any routes in your application");
      }
    });

    // We want to return the configurable promise object
    // so that callers of this function can use `.method()` on it,
    // which obviously doesn't exist for normal RSVP promises.
    return transitionPromise;
  },

  _scheduleLoadingEvent: function(transition, originRoute) {
    this._cancelLoadingEvent();
    this._loadingStateTimer = Ember.run.scheduleOnce('routerTransitions', this, '_fireLoadingEvent', transition, originRoute);
  },

  _fireLoadingEvent: function(transition, originRoute) {
    if (!this.router.activeTransition) {
      // Don't fire an event if we've since moved on from
      // the transition that put us in a loading state.
      return;
    }

    transition.trigger(true, 'loading', transition, originRoute);
  },

  _cancelLoadingEvent: function () {
    if (this._loadingStateTimer) {
      Ember.run.cancel(this._loadingStateTimer);
    }
    this._loadingStateTimer = null;
  }
});

/**
  @private

  Helper function for iterating root-ward, starting
  from (but not including) the provided `originRoute`.

  Returns true if the last callback fired requested
  to bubble upward.
 */
function forEachRouteAbove(originRoute, transition, callback) {
  var handlerInfos = transition.handlerInfos,
      originRouteFound = false;

  for (var i = handlerInfos.length - 1; i >= 0; --i) {
    var handlerInfo = handlerInfos[i],
        route = handlerInfo.handler;

    if (!originRouteFound) {
      if (originRoute === route) {
        originRouteFound = true;
      }
      continue;
    }

    if (callback(route, handlerInfos[i + 1].handler) !== true) {
      return false;
    }
  }
  return true;
}

// These get invoked when an action bubbles above ApplicationRoute
// and are not meant to be overridable.
var defaultActionHandlers = {

  willResolveModel: function(transition, originRoute) {
    originRoute.router._scheduleLoadingEvent(transition, originRoute);
  },

  error: function(error, transition, originRoute) {
    // Attempt to find an appropriate error substate to enter.
    var router = originRoute.router;

    var tryTopLevel = forEachRouteAbove(originRoute, transition, function(route, childRoute) {
      var childErrorRouteName = findChildRouteName(route, childRoute, 'error');
      if (childErrorRouteName) {
        router.intermediateTransitionTo(childErrorRouteName, error);
        return;
      }
      return true;
    });

    if (tryTopLevel) {
      // Check for top-level error state to enter.
      if (routeHasBeenDefined(originRoute.router, 'application_error')) {
        router.intermediateTransitionTo('application_error', error);
        return;
      }
    } else {
      // Don't fire an assertion if we found an error substate.
      return;
    }

    Ember.Logger.error('Error while loading route: ' + error.stack);
  },

  loading: function(transition, originRoute) {
    // Attempt to find an appropriate loading substate to enter.
    var router = originRoute.router;

    var tryTopLevel = forEachRouteAbove(originRoute, transition, function(route, childRoute) {
      var childLoadingRouteName = findChildRouteName(route, childRoute, 'loading');

      if (childLoadingRouteName) {
        router.intermediateTransitionTo(childLoadingRouteName);
        return;
      }

      // Don't bubble above pivot route.
      if (transition.pivotHandler !== route) {
        return true;
      }
    });

    if (tryTopLevel) {
      // Check for top-level loading state to enter.
      if (routeHasBeenDefined(originRoute.router, 'application_loading')) {
        router.intermediateTransitionTo('application_loading');
        return;
      }
    }
  }
};

function findChildRouteName(parentRoute, originatingChildRoute, name) {
  var router = parentRoute.router,
      childName,
      targetChildRouteName = originatingChildRoute.routeName.split('.').pop(),
      namespace = parentRoute.routeName === 'application' ? '' : parentRoute.routeName + '.';

  if (Ember.FEATURES.isEnabled("ember-routing-named-substates")) {
    // First, try a named loading state, e.g. 'foo_loading'
    childName = namespace + targetChildRouteName + '_' + name;
    if (routeHasBeenDefined(router, childName)) {
      return childName;
    }
  }

  // Second, try general loading state, e.g. 'loading'
  childName = namespace + name;
  if (routeHasBeenDefined(router, childName)) {
    return childName;
  }
}

function routeHasBeenDefined(router, name) {
  var container = router.container;
  return router.hasRoute(name) &&
         (container.has('template:' + name) || container.has('route:' + name));
}

function triggerEvent(handlerInfos, ignoreFailure, args) {
  var name = args.shift();

  if (!handlerInfos) {
    if (ignoreFailure) { return; }
    throw new Ember.Error("Can't trigger action '" + name + "' because your app hasn't finished transitioning into its first route. To trigger an action on destination routes during a transition, you can call `.send()` on the `Transition` object passed to the `model/beforeModel/afterModel` hooks.");
  }

  var eventWasHandled = false;

  for (var i = handlerInfos.length - 1; i >= 0; i--) {
    var handlerInfo = handlerInfos[i],
        handler = handlerInfo.handler;

    if (handler._actions && handler._actions[name]) {
      if (handler._actions[name].apply(handler, args) === true) {
        eventWasHandled = true;
      } else {
        return;
      }
    }
  }

  if (defaultActionHandlers[name]) {
    defaultActionHandlers[name].apply(null, args);
    return;
  }

  if (!eventWasHandled && !ignoreFailure) {
    throw new Ember.Error("Nothing handled the action '" + name + "'. If you did handle the action, this error can be caused by returning true from an action handler in a controller, causing the action to bubble.");
  }
}

function updatePaths(router) {
  var appController = router.container.lookup('controller:application');

  if (!appController) {
    // appController might not exist when top-level loading/error
    // substates have been entered since ApplicationRoute hasn't
    // actually been entered at that point.
    return;
  }

  var infos = router.router.currentHandlerInfos,
      path = Ember.Router._routePath(infos);

  if (!('currentPath' in appController)) {
    defineProperty(appController, 'currentPath');
  }

  set(appController, 'currentPath', path);

  if (!('currentRouteName' in appController)) {
    defineProperty(appController, 'currentRouteName');
  }

  set(appController, 'currentRouteName', infos[infos.length - 1].name);
}

Ember.Router.reopenClass({
  router: null,
  map: function(callback) {
    var router = this.router;
    if (!router) {
      router = new Router();
      router.callbacks = [];
      router.triggerEvent = triggerEvent;
      this.reopenClass({ router: router });
    }

    var dsl = Ember.RouterDSL.map(function() {
      this.resource('application', { path: "/" }, function() {
        for (var i=0; i < router.callbacks.length; i++) {
          router.callbacks[i].call(this);
        }
        callback.call(this);
      });
    });

    router.callbacks.push(callback);
    router.map(dsl.generate());
    return router;
  },

  _routePath: function(handlerInfos) {
    var path = [];

    // We have to handle coalescing resource names that
    // are prefixed with their parent's names, e.g.
    // ['foo', 'foo.bar.baz'] => 'foo.bar.baz', not 'foo.foo.bar.baz'

    function intersectionMatches(a1, a2) {
      for (var i = 0, len = a1.length; i < len; ++i) {
        if (a1[i] !== a2[i]) {
          return false;
        }
      }
      return true;
    }

    for (var i=1, l=handlerInfos.length; i<l; i++) {
      var name = handlerInfos[i].name,
          nameParts = name.split("."),
          oldNameParts = slice.call(path);

      while (oldNameParts.length) {
        if (intersectionMatches(oldNameParts, nameParts)) {
          break;
        }
        oldNameParts.shift();
      }

      path.push.apply(path, nameParts.slice(oldNameParts.length));
    }

    return path.join(".");
  }
});

Router.Transition.prototype.send = Router.Transition.prototype.trigger;



})();



(function() {
/**
@module ember
@submodule ember-routing
*/

var get = Ember.get, set = Ember.set,
    getProperties = Ember.getProperties,
    classify = Ember.String.classify,
    fmt = Ember.String.fmt,
    a_forEach = Ember.EnumerableUtils.forEach,
    a_replace = Ember.EnumerableUtils.replace;


/**
  The `Ember.Route` class is used to define individual routes. Refer to
  the [routing guide](http://emberjs.com/guides/routing/) for documentation.

  @class Route
  @namespace Ember
  @extends Ember.Object
*/
Ember.Route = Ember.Object.extend(Ember.ActionHandler, {

  /**
    @private

    @method exit
  */
  exit: function() {
    this.deactivate();
    this.teardownViews();
  },

  /**
    @private

    @method enter
  */
  enter: function() {
    this.activate();
  },

  /**
    The collection of functions, keyed by name, available on this route as
    action targets.

    These functions will be invoked when a matching `{{action}}` is triggered
    from within a template and the application's current route is this route.

    Actions can also be invoked from other parts of your application via `Route#send`
    or `Controller#send`.

    The `actions` hash will inherit action handlers from
    the `actions` hash defined on extended Route parent classes
    or mixins rather than just replace the entire hash, e.g.:

    ```js
    App.CanDisplayBanner = Ember.Mixin.create({
      actions: {
        displayBanner: function(msg) {
          // ...
        }
      }
    });

    App.WelcomeRoute = Ember.Route.extend(App.CanDisplayBanner, {
      actions: {
        playMusic: function() {
          // ...
        }
      }
    });

    // `WelcomeRoute`, when active, will be able to respond
    // to both actions, since the actions hash is merged rather
    // then replaced when extending mixins / parent classes.
    this.send('displayBanner');
    this.send('playMusic');
    ```

    Within a route's action handler, the value of the `this` context
    is the Route object:

    ```js
    App.SongRoute = Ember.Route.extend({
      actions: {
        myAction: function() {
          this.controllerFor("song");
          this.transitionTo("other.route");
          ...
        }
      }
    });
    ```

    It is also possible to call `this._super()` from within an
    action handler if it overrides a handler defined on a parent
    class or mixin:

    Take for example the following routes:

    ```js
    App.DebugRoute = Ember.Mixin.create({
      actions: {
        debugRouteInformation: function() {
          console.debug("trololo");
        }
      }
    });

    App.AnnoyingDebugRoute = Ember.Route.extend(App.DebugRoute, {
      actions: {
        debugRouteInformation: function() {
          // also call the debugRouteInformation of mixed in App.DebugRoute
          this._super();

          // show additional annoyance
          window.alert(...);
        }
      }
    });
    ```

    ## Bubbling

    By default, an action will stop bubbling once a handler defined
    on the `actions` hash handles it. To continue bubbling the action,
    you must return `true` from the handler:

    ```js
    App.Router.map(function() {
      this.resource("album", function() {
        this.route("song");
      });
    });

    App.AlbumRoute = Ember.Route.extend({
      actions: {
        startPlaying: function() {
        }
      }
    });

    App.AlbumSongRoute = Ember.Route.extend({
      actions: {
        startPlaying: function() {
          // ...

          if (actionShouldAlsoBeTriggeredOnParentRoute) {
            return true;
          }
        }
      }
    });
    ```

    ## Built-in actions

    There are a few built-in actions pertaining to transitions that you
    can use to customize transition behavior: `willTransition` and
    `error`.

    ### `willTransition`

    The `willTransition` action is fired at the beginning of any
    attempted transition with a `Transition` object as the sole
    argument. This action can be used for aborting, redirecting,
    or decorating the transition from the currently active routes.

    A good example is preventing navigation when a form is
    half-filled out:

    ```js
    App.ContactFormRoute = Ember.Route.extend({
      actions: {
        willTransition: function(transition) {
          if (this.controller.get('userHasEnteredData')) {
            this.controller.displayNavigationConfirm();
            transition.abort();
          }
        }
      }
    });
    ```

    You can also redirect elsewhere by calling
    `this.transitionTo('elsewhere')` from within `willTransition`.
    Note that `willTransition` will not be fired for the
    redirecting `transitionTo`, since `willTransition` doesn't
    fire when there is already a transition underway. If you want
    subsequent `willTransition` actions to fire for the redirecting
    transition, you must first explicitly call
    `transition.abort()`.

    ### `error`

    When attempting to transition into a route, any of the hooks
    may throw an error, or return a promise that rejects, at which
    point an `error` action will be fired on the partially-entered
    routes, allowing for per-route error handling logic, or shared
    error handling logic defined on a parent route.

    Here is an example of an error handler that will be invoked
    for rejected promises / thrown errors from the various hooks
    on the route, as well as any unhandled errors from child
    routes:

    ```js
    App.AdminRoute = Ember.Route.extend({
      beforeModel: function() {
        throw "bad things!";
        // ...or, equivalently:
        return Ember.RSVP.reject("bad things!");
      },

      actions: {
        error: function(error, transition) {
          // Assuming we got here due to the error in `beforeModel`,
          // we can expect that error === "bad things!",
          // but a promise model rejecting would also
          // call this hook, as would any errors encountered
          // in `afterModel`.

          // The `error` hook is also provided the failed
          // `transition`, which can be stored and later
          // `.retry()`d if desired.

          this.transitionTo('login');
        }
      }
    });
    ```

    `error` actions that bubble up all the way to `ApplicationRoute`
    will fire a default error handler that logs the error. You can
    specify your own global default error handler by overriding the
    `error` handler on `ApplicationRoute`:

    ```js
    App.ApplicationRoute = Ember.Route.extend({
      actions: {
        error: function(error, transition) {
          this.controllerFor('banner').displayError(error.message);
        }
      }
    });
    ```

    @see {Ember.Route#send}
    @see {Handlebars.helpers.action}

    @property actions
    @type Hash
    @default null
  */
  actions: null,

  /**
    @deprecated

    Please use `actions` instead.
    @method events
  */
  events: null,

  mergedProperties: ['events'],

  /**
    This hook is executed when the router completely exits this route. It is
    not executed when the model for the route changes.

    @method deactivate
  */
  deactivate: Ember.K,

  /**
    This hook is executed when the router enters the route. It is not executed
    when the model for the route changes.

    @method activate
  */
  activate: Ember.K,

  /**
    Transition into another route. Optionally supply model(s) for the
    route in question. If multiple models are supplied they will be applied
    last to first recursively up the resource tree (see Multiple Models Example
    below). The model(s) will be serialized into the URL using the appropriate
    route's `serialize` hook. See also 'replaceWith'.

    Simple Transition Example

    ```javascript
    App.Router.map(function() {
      this.route("index");
      this.route("secret");
      this.route("fourOhFour", { path: "*:"});
    });

    App.IndexRoute = Ember.Route.extend({
      actions: {
        moveToSecret: function(context){
          if (authorized()){
            this.transitionTo('secret', context);
          }
            this.transitionTo('fourOhFour');
        }
      }
    });
    ```

   Transition to a nested route

   ```javascript
   App.Router.map(function() {
     this.resource('articles', { path: '/articles' }, function() {
       this.route('new');
     });
   });

   App.IndexRoute = Ember.Route.extend({
     actions: {
       transitionToNewArticle: function() {
         this.transitionTo('articles.new');
       }
     }
   });
   ```

    Multiple Models Example

    ```javascript
    App.Router.map(function() {
      this.route("index");
      this.resource('breakfast', {path:':breakfastId'}, function(){
        this.resource('cereal', {path: ':cerealId'});
      });
    });

    App.IndexRoute = Ember.Route.extend({
      actions: {
        moveToChocolateCereal: function(){
          var cereal = { cerealId: "ChocolateYumminess"},
              breakfast = {breakfastId: "CerealAndMilk"};

          this.transitionTo('cereal', breakfast, cereal);
        }
      }
    });

    @method transitionTo
    @param {String} name the name of the route
    @param {...Object} models the model(s) to be used while transitioning
    to the route.
  */
  transitionTo: function(name, context) {
    var router = this.router;
    return router.transitionTo.apply(router, arguments);
  },

  /**
    Perform a synchronous transition into another route with out attempting
    to resolve promises, update the URL, or abort any currently active
    asynchronous transitions (i.e. regular transitions caused by
    `transitionTo` or URL changes).

    This method is handy for performing intermediate transitions on the
    way to a final destination route, and is called internally by the
    default implementations of the `error` and `loading` handlers.

    @method intermediateTransitionTo
    @param {String} name the name of the route
    @param {...Object} models the model(s) to be used while transitioning
    to the route.
   */
  intermediateTransitionTo: function() {
    var router = this.router;
    router.intermediateTransitionTo.apply(router, arguments);
  },

  /**
    Transition into another route while replacing the current URL, if possible.
    This will replace the current history entry instead of adding a new one.
    Beside that, it is identical to `transitionTo` in all other respects. See
    'transitionTo' for additional information regarding multiple models.

    Example

    ```javascript
    App.Router.map(function() {
      this.route("index");
      this.route("secret");
    });

    App.SecretRoute = Ember.Route.extend({
      afterModel: function() {
        if (!authorized()){
          this.replaceWith('index');
        }
      }
    });
    ```

    @method replaceWith
    @param {String} name the name of the route
    @param {...Object} models the model(s) to be used while transitioning
    to the route.
  */
  replaceWith: function() {
    var router = this.router;
    return router.replaceWith.apply(router, arguments);
  },

  /**
    Sends an action to the router, which will delegate it to the currently
    active route hierarchy per the bubbling rules explained under `actions`.

    Example

    ```javascript
    App.Router.map(function() {
      this.route("index");
    });

    App.ApplicationRoute = Ember.Route.extend({
      actions: {
        track: function(arg) {
          console.log(arg, 'was clicked');
        }
      }
    });

    App.IndexRoute = Ember.Route.extend({
      actions: {
        trackIfDebug: function(arg) {
          if (debug) {
            this.send('track', arg);
          }
        }
      }
    });
    ```

    @method send
    @param {String} name the name of the action to trigger
    @param {...*} args
  */
  send: function() {
    return this.router.send.apply(this.router, arguments);
  },

  /**
    @private

    This hook is the entry point for router.js

    @method setup
  */
  setup: function(context, queryParams) {
    var controllerName = this.controllerName || this.routeName,
        controller = this.controllerFor(controllerName, true);
    if (!controller) {
      controller =  this.generateController(controllerName, context);
    }

    // Assign the route's controller so that it can more easily be
    // referenced in action handlers
    this.controller = controller;

    var args = [controller, context];

    if (Ember.FEATURES.isEnabled("query-params")) {
      args.push(queryParams);
    }

    if (this.setupControllers) {
      Ember.deprecate("Ember.Route.setupControllers is deprecated. Please use Ember.Route.setupController(controller, model) instead.");
      this.setupControllers(controller, context);
    } else {
      this.setupController.apply(this, args);
    }

    if (this.renderTemplates) {
      Ember.deprecate("Ember.Route.renderTemplates is deprecated. Please use Ember.Route.renderTemplate(controller, model) instead.");
      this.renderTemplates(context);
    } else {
      this.renderTemplate.apply(this, args);
    }
  },

  /**
    A hook you can implement to optionally redirect to another route.

    If you call `this.transitionTo` from inside of this hook, this route
    will not be entered in favor of the other hook.

    Note that this hook is called by the default implementation of
    `afterModel`, so if you override `afterModel`, you must either
    explicitly call `redirect` or just put your redirecting
    `this.transitionTo()` call within `afterModel`.

    @method redirect
    @param {Object} model the model for this route
  */
  redirect: Ember.K,

  /**
    This hook is the first of the route entry validation hooks
    called when an attempt is made to transition into a route
    or one of its children. It is called before `model` and
    `afterModel`, and is appropriate for cases when:

    1) A decision can be made to redirect elsewhere without
       needing to resolve the model first.
    2) Any async operations need to occur first before the
       model is attempted to be resolved.

    This hook is provided the current `transition` attempt
    as a parameter, which can be used to `.abort()` the transition,
    save it for a later `.retry()`, or retrieve values set
    on it from a previous hook. You can also just call
    `this.transitionTo` to another route to implicitly
    abort the `transition`.

    You can return a promise from this hook to pause the
    transition until the promise resolves (or rejects). This could
    be useful, for instance, for retrieving async code from
    the server that is required to enter a route.

    ```js
    App.PostRoute = Ember.Route.extend({
      beforeModel: function(transition) {
        if (!App.Post) {
          return Ember.$.getScript('/models/post.js');
        }
      }
    });
    ```

    If `App.Post` doesn't exist in the above example,
    `beforeModel` will use jQuery's `getScript`, which
    returns a promise that resolves after the server has
    successfully retrieved and executed the code from the
    server. Note that if an error were to occur, it would
    be passed to the `error` hook on `Ember.Route`, but
    it's also possible to handle errors specific to
    `beforeModel` right from within the hook (to distinguish
    from the shared error handling behavior of the `error`
    hook):

    ```js
    App.PostRoute = Ember.Route.extend({
      beforeModel: function(transition) {
        if (!App.Post) {
          var self = this;
          return Ember.$.getScript('post.js').then(null, function(e) {
            self.transitionTo('help');

            // Note that the above transitionTo will implicitly
            // halt the transition. If you were to return
            // nothing from this promise reject handler,
            // according to promise semantics, that would
            // convert the reject into a resolve and the
            // transition would continue. To propagate the
            // error so that it'd be handled by the `error`
            // hook, you would have to either
            return Ember.RSVP.reject(e);
            // or
            throw e;
          });
        }
      }
    });
    ```

    @method beforeModel
    @param {Transition} transition
    @param {Object} queryParams the active query params for this route
    @return {Promise} if the value returned from this hook is
      a promise, the transition will pause until the transition
      resolves. Otherwise, non-promise return values are not
      utilized in any way.
  */
  beforeModel: Ember.K,

  /**
    This hook is called after this route's model has resolved.
    It follows identical async/promise semantics to `beforeModel`
    but is provided the route's resolved model in addition to
    the `transition`, and is therefore suited to performing
    logic that can only take place after the model has already
    resolved.

    ```js
    App.PostsRoute = Ember.Route.extend({
      afterModel: function(posts, transition) {
        if (posts.length === 1) {
          this.transitionTo('post.show', posts[0]);
        }
      }
    });
    ```

    Refer to documentation for `beforeModel` for a description
    of transition-pausing semantics when a promise is returned
    from this hook.

    @method afterModel
    @param {Object} resolvedModel the value returned from `model`,
      or its resolved value if it was a promise
    @param {Transition} transition
    @param {Object} queryParams the active query params for this handler
    @return {Promise} if the value returned from this hook is
      a promise, the transition will pause until the transition
      resolves. Otherwise, non-promise return values are not
      utilized in any way.
   */
  afterModel: function(resolvedModel, transition, queryParams) {
    this.redirect(resolvedModel, transition);
  },


  /**
    @private

    Called when the context is changed by router.js.

    @method contextDidChange
  */
  contextDidChange: function() {
    this.currentModel = this.context;
  },

  /**
    A hook you can implement to convert the URL into the model for
    this route.

    ```js
    App.Router.map(function() {
      this.resource('post', {path: '/posts/:post_id'});
    });
    ```

    The model for the `post` route is `App.Post.find(params.post_id)`.

    By default, if your route has a dynamic segment ending in `_id`:

    * The model class is determined from the segment (`post_id`'s
      class is `App.Post`)
    * The find method is called on the model class with the value of
      the dynamic segment.

    Note that for routes with dynamic segments, this hook is only
    executed when entered via the URL. If the route is entered
    through a transition (e.g. when using the `link-to` Handlebars
    helper), then a model context is already provided and this hook
    is not called. Routes without dynamic segments will always
    execute the model hook.

    This hook follows the asynchronous/promise semantics
    described in the documentation for `beforeModel`. In particular,
    if a promise returned from `model` fails, the error will be
    handled by the `error` hook on `Ember.Route`.

    Example

    ```js
    App.PostRoute = Ember.Route.extend({
      model: function(params) {
        return App.Post.find(params.post_id);
      }
    });
    ```

    @method model
    @param {Object} params the parameters extracted from the URL
    @param {Transition} transition
    @param {Object} queryParams the query params for this route
    @return {Object|Promise} the model for this route. If
      a promise is returned, the transition will pause until
      the promise resolves, and the resolved value of the promise
      will be used as the model for this route.
  */
  model: function(params, transition) {
    var match, name, sawParams, value;

    for (var prop in params) {
      if (match = prop.match(/^(.*)_id$/)) {
        name = match[1];
        value = params[prop];
      }
      sawParams = true;
    }

    if (!name && sawParams) { return params; }
    else if (!name) { return; }

    return this.findModel(name, value);
  },

  /**

    @method findModel
    @param {String} type the model type
    @param {Object} value the value passed to find
  */
  findModel: function(){
    var store = get(this, 'store');
    return store.find.apply(store, arguments);
  },

  /**
    Store property provides a hook for data persistence libraries to inject themselves.

    By default, this store property provides the exact same functionality previously
    in the model hook.

    Currently, the required interface is:

    `store.find(modelName, findArguments)`

    @method store
    @param {Object} store
  */
  store: Ember.computed(function(){
    var container = this.container;
    var routeName = this.routeName;
    var namespace = get(this, 'router.namespace');

    return {
      find: function(name, value) {
        var modelClass = container.lookupFactory('model:' + name);

        Ember.assert("You used the dynamic segment " + name + "_id in your route "+ routeName + ", but " + namespace + "." + classify(name) + " did not exist and you did not override your route's `model` hook.", modelClass);

        return modelClass.find(value);
      }
    };
  }),

  /**
    A hook you can implement to convert the route's model into parameters
    for the URL.

    ```js
    App.Router.map(function() {
      this.resource('post', {path: '/posts/:post_id'});
    });

    App.PostRoute = Ember.Route.extend({
      model: function(params) {
        // the server returns `{ id: 12 }`
        return jQuery.getJSON("/posts/" + params.post_id);
      },

      serialize: function(model) {
        // this will make the URL `/posts/12`
        return { post_id: model.id };
      }
    });
    ```

    The default `serialize` method will insert the model's `id` into the
    route's dynamic segment (in this case, `:post_id`) if the segment contains '_id'.
    If the route has multiple dynamic segments or does not contain '_id', `serialize`
    will return `Ember.getProperties(model, params)`

    This method is called when `transitionTo` is called with a context
    in order to populate the URL.

    @method serialize
    @param {Object} model the route's model
    @param {Array} params an Array of parameter names for the current
      route (in the example, `['post_id']`.
    @return {Object} the serialized parameters
  */
  serialize: function(model, params) {
    if (params.length < 1) { return; }
    if (!model) { return; }

    var name = params[0], object = {};

    if (/_id$/.test(name) && params.length === 1) {
      object[name] = get(model, "id");
    } else {
      object = getProperties(model, params);
    }

    return object;
  },

  /**
    A hook you can use to setup the controller for the current route.

    This method is called with the controller for the current route and the
    model supplied by the `model` hook.

    By default, the `setupController` hook sets the `content` property of
    the controller to the `model`.

    This means that your template will get a proxy for the model as its
    context, and you can act as though the model itself was the context.

    The provided controller will be one resolved based on the name
    of this route.

    If no explicit controller is defined, Ember will automatically create
    an appropriate controller for the model.

    * if the model is an `Ember.Array` (including record arrays from Ember
      Data), the controller is an `Ember.ArrayController`.
    * otherwise, the controller is an `Ember.ObjectController`.

    As an example, consider the router:

    ```js
    App.Router.map(function() {
      this.resource('post', {path: '/posts/:post_id'});
    });
    ```

    For the `post` route, a controller named `App.PostController` would
    be used if it is defined. If it is not defined, an `Ember.ObjectController`
    instance would be used.

    Example

    ```js
    App.PostRoute = Ember.Route.extend({
      setupController: function(controller, model) {
        controller.set('model', model);
      }
    });
    ```

    @method setupController
    @param {Controller} controller instance
    @param {Object} model
  */
  setupController: function(controller, context) {
    if (controller && (context !== undefined)) {
      set(controller, 'model', context);
    }
  },

  /**
    Returns the controller for a particular route or name.

    The controller instance must already have been created, either through entering the
    associated route or using `generateController`.

    ```js
    App.PostRoute = Ember.Route.extend({
      setupController: function(controller, post) {
        this._super(controller, post);
        this.controllerFor('posts').set('currentPost', post);
      }
    });
    ```

    @method controllerFor
    @param {String} name the name of the route or controller
    @return {Ember.Controller}
  */
  controllerFor: function(name, _skipAssert) {
    var container = this.container,
        route = container.lookup('route:'+name),
        controller;

    if (route && route.controllerName) {
      name = route.controllerName;
    }

    controller = container.lookup('controller:' + name);

    // NOTE: We're specifically checking that skipAssert is true, because according
    //   to the old API the second parameter was model. We do not want people who
    //   passed a model to skip the assertion.
    Ember.assert("The controller named '"+name+"' could not be found. Make sure that this route exists and has already been entered at least once. If you are accessing a controller not associated with a route, make sure the controller class is explicitly defined.", controller || _skipAssert === true);

    return controller;
  },

  /**
    Generates a controller for a route.

    If the optional model is passed then the controller type is determined automatically,
    e.g., an ArrayController for arrays.

    Example

    ```js
    App.PostRoute = Ember.Route.extend({
      setupController: function(controller, post) {
        this._super(controller, post);
        this.generateController('posts', post);
      }
    });
    ```

    @method generateController
    @param {String} name the name of the controller
    @param {Object} model the model to infer the type of the controller (optional)
  */
  generateController: function(name, model) {
    var container = this.container;

    model = model || this.modelFor(name);

    return Ember.generateController(container, name, model);
  },

  /**
    Returns the current model for a given route.

    This is the object returned by the `model` hook of the route
    in question.

    Example

    ```js
    App.Router.map(function() {
        this.resource('post', { path: '/post/:post_id' }, function() {
            this.resource('comments');
        });
    });

    App.CommentsRoute = Ember.Route.extend({
        afterModel: function() {
            this.set('post', this.modelFor('post'));
        }
    });
    ```

    @method modelFor
    @param {String} name the name of the route
    @return {Object} the model object
  */
  modelFor: function(name) {

    var route = this.container.lookup('route:' + name),
        transition = this.router.router.activeTransition;

    // If we are mid-transition, we want to try and look up
    // resolved parent contexts on the current transitionEvent.
    if (transition) {
      var modelLookupName = (route && route.routeName) || name;
      if (transition.resolvedModels.hasOwnProperty(modelLookupName)) {
        return transition.resolvedModels[modelLookupName];
      }
    }

    return route && route.currentModel;
  },

  /**
    A hook you can use to render the template for the current route.

    This method is called with the controller for the current route and the
    model supplied by the `model` hook. By default, it renders the route's
    template, configured with the controller for the route.

    This method can be overridden to set up and render additional or
    alternative templates.

    ```js
    App.PostsRoute = Ember.Route.extend({
      renderTemplate: function(controller, model) {
        var favController = this.controllerFor('favoritePost');

        // Render the `favoritePost` template into
        // the outlet `posts`, and display the `favoritePost`
        // controller.
        this.render('favoritePost', {
          outlet: 'posts',
          controller: favController
        });
      }
    });
    ```

    @method renderTemplate
    @param {Object} controller the route's controller
    @param {Object} model the route's model
  */
  renderTemplate: function(controller, model) {
    this.render();
  },

  /**
    Renders a template into an outlet.

    This method has a number of defaults, based on the name of the
    route specified in the router.

    For example:

    ```js
    App.Router.map(function() {
      this.route('index');
      this.resource('post', {path: '/posts/:post_id'});
    });

    App.PostRoute = App.Route.extend({
      renderTemplate: function() {
        this.render();
      }
    });
    ```

    The name of the `PostRoute`, as defined by the router, is `post`.

    By default, render will:

    * render the `post` template
    * with the `post` view (`PostView`) for event handling, if one exists
    * and the `post` controller (`PostController`), if one exists
    * into the `main` outlet of the `application` template

    You can override this behavior:

    ```js
    App.PostRoute = App.Route.extend({
      renderTemplate: function() {
        this.render('myPost', {   // the template to render
          into: 'index',          // the template to render into
          outlet: 'detail',       // the name of the outlet in that template
          controller: 'blogPost'  // the controller to use for the template
        });
      }
    });
    ```

    Remember that the controller's `content` will be the route's model. In
    this case, the default model will be `App.Post.find(params.post_id)`.

    @method render
    @param {String} name the name of the template to render
    @param {Object} options the options
  */
  render: function(name, options) {
    Ember.assert("The name in the given arguments is undefined", arguments.length > 0 ? !Ember.isNone(arguments[0]) : true);

    var namePassed = !!name;

    if (typeof name === 'object' && !options) {
      options = name;
      name = this.routeName;
    }

    options = options || {};

    var templateName;

    if (name) {
      name = name.replace(/\//g, '.');
      templateName = name;
    } else {
      name = this.routeName;
      templateName = this.templateName || name;
    }

    var viewName = options.view || this.viewName || name;

    var container = this.container,
        view = container.lookup('view:' + viewName),
        template = view ? view.get('template') : null;

    if (!template) {
      template = container.lookup('template:' + templateName);
    }

    if (!view && !template) {
      Ember.assert("Could not find \"" + name + "\" template or view.", !namePassed);
      if (get(this.router, 'namespace.LOG_VIEW_LOOKUPS')) {
        Ember.Logger.info("Could not find \"" + name + "\" template or view. Nothing will be rendered", { fullName: 'template:' + name });
      }
      return;
    }

    options = normalizeOptions(this, name, template, options);
    view = setupView(view, container, options);

    if (options.outlet === 'main') { this.lastRenderedTemplate = name; }

    appendView(this, view, options);
  },

  /**
    Disconnects a view that has been rendered into an outlet.

    You may pass any or all of the following options to `disconnectOutlet`:

    * `outlet`: the name of the outlet to clear (default: 'main')
    * `parentView`: the name of the view containing the outlet to clear
       (default: the view rendered by the parent route)

    Example:

    ```js
    App.ApplicationRoute = App.Route.extend({
      actions: {
        showModal: function(evt) {
          this.render(evt.modalName, {
            outlet: 'modal',
            into: 'application'
          });
        },
        hideModal: function(evt) {
          this.disconnectOutlet({
            outlet: 'modal',
            parentView: 'application'
          });
        }
      }
    });
    ```

    @method disconnectOutlet
    @param {Object} options the options
  */
  disconnectOutlet: function(options) {
    options = options || {};
    options.parentView = options.parentView ? options.parentView.replace(/\//g, '.') : parentTemplate(this);
    options.outlet = options.outlet || 'main';

    var parentView = this.router._lookupActiveView(options.parentView);
    parentView.disconnectOutlet(options.outlet);
  },

  willDestroy: function() {
    this.teardownViews();
  },

  /**
    @private

    @method teardownViews
  */
  teardownViews: function() {
    // Tear down the top level view
    if (this.teardownTopLevelView) { this.teardownTopLevelView(); }

    // Tear down any outlets rendered with 'into'
    var teardownOutletViews = this.teardownOutletViews || [];
    a_forEach(teardownOutletViews, function(teardownOutletView) {
      teardownOutletView();
    });

    delete this.teardownTopLevelView;
    delete this.teardownOutletViews;
    delete this.lastRenderedTemplate;
  }
});

function parentRoute(route) {
  var handlerInfos = route.router.router.targetHandlerInfos;

  if (!handlerInfos) { return; }

  var parent, current;

  for (var i=0, l=handlerInfos.length; i<l; i++) {
    current = handlerInfos[i].handler;
    if (current === route) { return parent; }
    parent = current;
  }
}

function parentTemplate(route) {
  var parent = parentRoute(route), template;

  if (!parent) { return; }

  if (template = parent.lastRenderedTemplate) {
    return template;
  } else {
    return parentTemplate(parent);
  }
}

function normalizeOptions(route, name, template, options) {
  options = options || {};
  options.into = options.into ? options.into.replace(/\//g, '.') : parentTemplate(route);
  options.outlet = options.outlet || 'main';
  options.name = name;
  options.template = template;
  options.LOG_VIEW_LOOKUPS = get(route.router, 'namespace.LOG_VIEW_LOOKUPS');

  Ember.assert("An outlet ("+options.outlet+") was specified but was not found.", options.outlet === 'main' || options.into);

  var controller = options.controller, namedController;

  if (options.controller) {
    controller = options.controller;
  } else if (namedController = route.container.lookup('controller:' + name)) {
    controller = namedController;
  } else {
    controller = route.controllerName || route.routeName;
  }

  if (typeof controller === 'string') {
    controller = route.container.lookup('controller:' + controller);
  }

  options.controller = controller;

  return options;
}

function setupView(view, container, options) {
  if (view) {
    if (options.LOG_VIEW_LOOKUPS) {
      Ember.Logger.info("Rendering " + options.name + " with " + view, { fullName: 'view:' + options.name });
    }
  } else {
    var defaultView = options.into ? 'view:default' : 'view:toplevel';
    view = container.lookup(defaultView);
    if (options.LOG_VIEW_LOOKUPS) {
      Ember.Logger.info("Rendering " + options.name + " with default view " + view, { fullName: 'view:' + options.name });
    }
  }

  if (!get(view, 'templateName')) {
    set(view, 'template', options.template);

    set(view, '_debugTemplateName', options.name);
  }

  set(view, 'renderedName', options.name);
  set(view, 'controller', options.controller);

  return view;
}

function appendView(route, view, options) {
  if (options.into) {
    var parentView = route.router._lookupActiveView(options.into);
    var teardownOutletView = generateOutletTeardown(parentView, options.outlet);
    if (!route.teardownOutletViews) { route.teardownOutletViews = []; }
    a_replace(route.teardownOutletViews, 0, 0, [teardownOutletView]);
    parentView.connectOutlet(options.outlet, view);
  } else {
    var rootElement = get(route, 'router.namespace.rootElement');
    // tear down view if one is already rendered
    if (route.teardownTopLevelView) {
      route.teardownTopLevelView();
    }
    route.router._connectActiveView(options.name, view);
    route.teardownTopLevelView = generateTopLevelTeardown(view);
    view.appendTo(rootElement);
  }
}

function generateTopLevelTeardown(view) {
  return function() { view.destroy(); };
}

function generateOutletTeardown(parentView, outlet) {
  return function() { parentView.disconnectOutlet(outlet); };
}

})();



(function() {

})();



(function() {
Ember.onLoad('Ember.Handlebars', function() {
  var handlebarsResolve = Ember.Handlebars.resolveParams,
      map = Ember.ArrayPolyfills.map,
      get = Ember.get,
      handlebarsGet = Ember.Handlebars.get;

  function resolveParams(context, params, options) {
    return map.call(resolvePaths(context, params, options), function(path, i) {
      if (null === path) {
        // Param was string/number, not a path, so just return raw string/number.
        return params[i];
      } else {
        return handlebarsGet(context, path, options);
      }
    });
  }

  function resolvePaths(context, params, options) {
    var resolved = handlebarsResolve(context, params, options),
        types = options.types;

    return map.call(resolved, function(object, i) {
      if (types[i] === 'ID') {
        return unwrap(object, params[i]);
      } else {
        return null;
      }
    });

    function unwrap(object, path) {
      if (path === 'controller') { return path; }

      if (Ember.ControllerMixin.detect(object)) {
        return unwrap(get(object, 'model'), path ? path + '.model' : 'model');
      } else {
        return path;
      }
    }
  }

  Ember.Router.resolveParams = resolveParams;
  Ember.Router.resolvePaths = resolvePaths;
});

})();



(function() {
/**
@module ember
@submodule ember-routing
*/

var get = Ember.get, set = Ember.set, fmt = Ember.String.fmt;
Ember.onLoad('Ember.Handlebars', function(Handlebars) {

  var resolveParams = Ember.Router.resolveParams,
      resolvePaths  = Ember.Router.resolvePaths,
      isSimpleClick = Ember.ViewUtils.isSimpleClick;

  function fullRouteName(router, name) {
    var nameWithIndex;
    if (!router.hasRoute(name)) {
      nameWithIndex = name + '.index';
      Ember.assert(fmt("The attempt to link-to route '%@' failed (also tried '%@'). The router did not find '%@' in its possible routes: '%@'", [name, nameWithIndex, name, Ember.keys(router.router.recognizer.names).join("', '")]), router.hasRoute(nameWithIndex));
      name = nameWithIndex;
    }

    return name;
  }

  function getResolvedPaths(options) {

    var types = options.options.types,
        data = options.options.data;

    return resolvePaths(options.context, options.params, { types: types, data: data });
  }

  /**
    `Ember.LinkView` renders an element whose `click` event triggers a
    transition of the application's instance of `Ember.Router` to
    a supplied route by name.

    Instances of `LinkView` will most likely be created through
    the `link-to` Handlebars helper, but properties of this class
    can be overridden to customize application-wide behavior.

    @class LinkView
    @namespace Ember
    @extends Ember.View
    @see {Handlebars.helpers.link-to}
  **/
  var LinkView = Ember.LinkView = Ember.View.extend({
    tagName: 'a',
    currentWhen: null,

    /**
      Sets the `title` attribute of the `LinkView`'s HTML element.

      @property title
      @default null
    **/
    title: null,

    /**
      Sets the `rel` attribute of the `LinkView`'s HTML element.

      @property rel
      @default null
    **/
    rel: null,

    /**
      The CSS class to apply to `LinkView`'s element when its `active`
      property is `true`.

      @property activeClass
      @type String
      @default active
    **/
    activeClass: 'active',

    /**
      The CSS class to apply to `LinkView`'s element when its `loading`
      property is `true`.

      @property loadingClass
      @type String
      @default loading
    **/
    loadingClass: 'loading',

    /**
      The CSS class to apply to a `LinkView`'s element when its `disabled`
      property is `true`.

      @property disabledClass
      @type String
      @default disabled
    **/
    disabledClass: 'disabled',
    _isDisabled: false,

    /**
      Determines whether the `LinkView` will trigger routing via
      the `replaceWith` routing strategy.

      @property replace
      @type Boolean
      @default false
    **/
    replace: false,

    /**
      By default the `{{link-to}}` helper will bind to the `href` and
      `title` attributes. It's discourage that you override these defaults,
      however you can push onto the array if needed.

      @property attributeBindings
      @type Array | String
      @default ['href', 'title', 'rel']
     **/
    attributeBindings: ['href', 'title', 'rel'],

    /**
      By default the `{{link-to}}` helper will bind to the `active`, `loading`, and
      `disabled` classes. It is discouraged to override these directly.

      @property classNameBindings
      @type Array
      @default ['active', 'loading', 'disabled']
     **/
    classNameBindings: ['active', 'loading', 'disabled'],

    /**
      By default the `{{link-to}}` helper responds to the `click` event. You
      can override this globally by setting this property to your custom
      event name.

      This is particularly useful on mobile when one wants to avoid the 300ms
      click delay using some sort of custom `tap` event.

      @property eventName
      @type String
      @default click
    */
    eventName: 'click',

    // this is doc'ed here so it shows up in the events
    // section of the API documentation, which is where
    // people will likely go looking for it.
    /**
      Triggers the `LinkView`'s routing behavior. If
      `eventName` is changed to a value other than `click`
      the routing behavior will trigger on that custom event
      instead.

      @event click
    **/

    /**
      An overridable method called when LinkView objects are instantiated.

      Example:

      ```javascript
      App.MyLinkView = Ember.LinkView.extend({
        init: function() {
          this._super();
          Ember.Logger.log('Event is ' + this.get('eventName'));
        }
      });
      ```

      NOTE: If you do override `init` for a framework class like `Ember.View` or
      `Ember.ArrayController`, be sure to call `this._super()` in your
      `init` declaration! If you don't, Ember may not have an opportunity to
      do important setup work, and you'll see strange behavior in your
      application.

      @method init
    */
    init: function() {
      this._super.apply(this, arguments);

      // Map desired event name to invoke function
      var eventName = get(this, 'eventName'), i;
      this.on(eventName, this, this._invoke);

      if (Ember.FEATURES.isEnabled("query-params")) {
        var queryParams = get(this, '_potentialQueryParams') || [];

        for(i=0; i < queryParams.length; i++) {
          this.registerObserver(this, queryParams[i], this, this._queryParamsChanged);
        }
      }
    },

    /**
      @private

      This method is invoked by observers installed during `init` that fire
      whenever the params change
      @method _paramsChanged
     */
    _paramsChanged: function() {
      this.notifyPropertyChange('resolvedParams');
    },

    /**
      @private

     This is called to setup observers that will trigger a rerender.

     @method _setupPathObservers
    **/
    _setupPathObservers: function(){
      var helperParameters = this.parameters,
          linkTextPath     = helperParameters.options.linkTextPath,
          paths = getResolvedPaths(helperParameters),
          length = paths.length,
          path, i, normalizedPath;

      if (linkTextPath) {
        normalizedPath = Ember.Handlebars.normalizePath(helperParameters.context, linkTextPath, helperParameters.options.data);
        this.registerObserver(normalizedPath.root, normalizedPath.path, this, this.rerender);
      }

      for(i=0; i < length; i++) {
        path = paths[i];
        if (null === path) {
          // A literal value was provided, not a path, so nothing to observe.
          continue;
        }

        normalizedPath = Ember.Handlebars.normalizePath(helperParameters.context, path, helperParameters.options.data);
        this.registerObserver(normalizedPath.root, normalizedPath.path, this, this._paramsChanged);
      }
    },

    afterRender: function(){
      this._super.apply(this, arguments);
      this._setupPathObservers();
    },

    /**
      @private

      This method is invoked by observers installed during `init` that fire
      whenever the query params change
     */
    _queryParamsChanged: function (object, path) {
      this.notifyPropertyChange('queryParams');
    },


    /**
      @private

      Even though this isn't a virtual view, we want to treat it as if it is
      so that you can access the parent with {{view.prop}}

      @method concreteView
    **/
    concreteView: Ember.computed(function() {
      return get(this, 'parentView');
    }).property('parentView'),

    /**

      Accessed as a classname binding to apply the `LinkView`'s `disabledClass`
      CSS `class` to the element when the link is disabled.

      When `true` interactions with the element will not trigger route changes.
      @property disabled
    */
    disabled: Ember.computed(function computeLinkViewDisabled(key, value) {
      if (value !== undefined) { this.set('_isDisabled', value); }

      return value ? get(this, 'disabledClass') : false;
    }),

    /**
      Accessed as a classname binding to apply the `LinkView`'s `activeClass`
      CSS `class` to the element when the link is active.

      A `LinkView` is considered active when its `currentWhen` property is `true`
      or the application's current route is the route the `LinkView` would trigger
      transitions into.

      @property active
    **/
    active: Ember.computed(function computeLinkViewActive() {
      if (get(this, 'loading')) { return false; }

      var router = get(this, 'router'),
          routeArgs = get(this, 'routeArgs'),
          contexts = routeArgs.slice(1),
          resolvedParams = get(this, 'resolvedParams'),
          currentWhen = this.currentWhen || resolvedParams[0],
          currentWithIndex = currentWhen + '.index',
          isActive = router.isActive.apply(router, [currentWhen].concat(contexts)) ||
                     router.isActive.apply(router, [currentWithIndex].concat(contexts));

      if (isActive) { return get(this, 'activeClass'); }
    }).property('resolvedParams', 'routeArgs', 'router.url'),

    /**
      Accessed as a classname binding to apply the `LinkView`'s `loadingClass`
      CSS `class` to the element when the link is loading.

      A `LinkView` is considered loading when it has at least one
      parameter whose value is currently null or undefined. During
      this time, clicking the link will perform no transition and
      emit a warning that the link is still in a loading state.

      @property loading
    **/
    loading: Ember.computed(function computeLinkViewLoading() {
      if (!get(this, 'routeArgs')) { return get(this, 'loadingClass'); }
    }).property('routeArgs'),

    /**
      @private

      Returns the application's main router from the container.

      @property router
    **/
    router: Ember.computed(function() {
      return get(this, 'controller').container.lookup('router:main');
    }),

    /**
      @private

      Event handler that invokes the link, activating the associated route.

      @method _invoke
      @param {Event} event
    */
    _invoke: function(event) {
      if (!isSimpleClick(event)) { return true; }

      if (this.preventDefault !== false) { event.preventDefault(); }
      if (this.bubbles === false) { event.stopPropagation(); }

      if (get(this, '_isDisabled')) { return false; }

      if (get(this, 'loading')) {
        Ember.Logger.warn("This link-to is in an inactive loading state because at least one of its parameters presently has a null/undefined value, or the provided route name is invalid.");
        return false;
      }

      var router = get(this, 'router'),
          routeArgs = get(this, 'routeArgs');

      if (get(this, 'replace')) {
        router.replaceWith.apply(router, routeArgs);
      } else {
        router.transitionTo.apply(router, routeArgs);
      }
    },

    /**
      @private

      Computed property that returns the resolved parameters.

      @property
      @return {Array}
     */
    resolvedParams: Ember.computed(function() {
      var parameters = this.parameters,
          options = parameters.options,
          types = options.types,
          data = options.data;

      if (Ember.FEATURES.isEnabled("query-params")) {
        if (parameters.params.length === 0) {
          var appController = this.container.lookup('controller:application');
          return [get(appController, 'currentRouteName')];
        } else {
          return resolveParams(parameters.context, parameters.params, { types: types, data: data });
        }
      }

      // Original implementation if query params not enabled
      return resolveParams(parameters.context, parameters.params, { types: types, data: data });
    }).property(),

    /**
      @private

      Computed property that returns the current route name and
      any dynamic segments.

      @property
      @return {Array} An array with the route name and any dynamic segments
     */
    routeArgs: Ember.computed(function computeLinkViewRouteArgs() {
      var resolvedParams = get(this, 'resolvedParams').slice(0),
          router = get(this, 'router'),
          namedRoute = resolvedParams[0];

      if (!namedRoute) { return; }

      namedRoute = fullRouteName(router, namedRoute);
      resolvedParams[0] = namedRoute;

      for (var i = 1, len = resolvedParams.length; i < len; ++i) {
        var param = resolvedParams[i];
        if (param === null || typeof param === 'undefined') {
          // If contexts aren't present, consider the linkView unloaded.
          return;
        }
      }

      if (Ember.FEATURES.isEnabled("query-params")) {
        var queryParams = get(this, 'queryParams');

        if (queryParams || queryParams === false) { resolvedParams.push({queryParams: queryParams}); }
      }

      return resolvedParams;
    }).property('resolvedParams', 'queryParams', 'router.url'),


    _potentialQueryParams: Ember.computed(function () {
      var namedRoute = get(this, 'resolvedParams')[0];
      if (!namedRoute) { return null; }
      var router          = get(this, 'router');

      namedRoute = fullRouteName(router, namedRoute);

      return router.router.queryParamsForHandler(namedRoute);
    }).property('resolvedParams'),

    queryParams: Ember.computed(function () {
      var self              = this,
        queryParams         = null,
        allowedQueryParams  = get(this, '_potentialQueryParams');

      if (!allowedQueryParams) { return null; }
      allowedQueryParams.forEach(function (param) {
        var value = get(self, param);
        if (typeof value !== 'undefined') {
          queryParams = queryParams || {};
          queryParams[param] = value;
        }
      });


      return queryParams;
    }).property('_potentialQueryParams.[]'),

    /**
      Sets the element's `href` attribute to the url for
      the `LinkView`'s targeted route.

      If the `LinkView`'s `tagName` is changed to a value other
      than `a`, this property will be ignored.

      @property href
    **/
    href: Ember.computed(function computeLinkViewHref() {
      if (get(this, 'tagName') !== 'a') { return; }

      var router = get(this, 'router'),
          routeArgs = get(this, 'routeArgs');

      return routeArgs ? router.generate.apply(router, routeArgs) : get(this, 'loadingHref');
    }).property('routeArgs'),

    /**
      The default href value to use while a link-to is loading.
      Only applies when tagName is 'a'

      @property loadingHref
      @type String
      @default #
    */
    loadingHref: '#'
  });

  LinkView.toString = function() { return "LinkView"; };

  /**
    The `{{link-to}}` helper renders a link to the supplied
    `routeName` passing an optionally supplied model to the
    route as its `model` context of the route. The block
    for `{{link-to}}` becomes the innerHTML of the rendered
    element:

    ```handlebars
    {{#link-to 'photoGallery'}}
      Great Hamster Photos
    {{/link-to}}
    ```

    ```html
    <a href="/hamster-photos">
      Great Hamster Photos
    </a>
    ```

    ### Supplying a tagName
    By default `{{link-to}}` renders an `<a>` element. This can
    be overridden for a single use of `{{link-to}}` by supplying
    a `tagName` option:

    ```handlebars
    {{#link-to 'photoGallery' tagName="li"}}
      Great Hamster Photos
    {{/link-to}}
    ```

    ```html
    <li>
      Great Hamster Photos
    </li>
    ```

    To override this option for your entire application, see
    "Overriding Application-wide Defaults".

    ### Disabling the `link-to` helper
    By default `{{link-to}}` is enabled.
    any passed value to `disabled` helper property will disable the `link-to` helper.

    static use: the `disabled` option:

    ```handlebars
    {{#link-to 'photoGallery' disabled=true}}
      Great Hamster Photos
    {{/link-to}}
    ```

    dynamic use: the `disabledWhen` option:

    ```handlebars
    {{#link-to 'photoGallery' disabledWhen=controller.someProperty}}
      Great Hamster Photos
    {{/link-to}}
    ```

    any passed value to `disabled` will disable it except `undefined`.
    to ensure that only `true` disable the `link-to` helper you can
    override the global behaviour of `Ember.LinkView`.

    ```javascript
    Ember.LinkView.reopen({
      disabled: Ember.computed(function(key, value) {
        if (value !== undefined) {
          this.set('_isDisabled', value === true);
        }
        return value === true ? get(this, 'disabledClass') : false;
      })
    });
    ```

    see "Overriding Application-wide Defaults" for more.

    ### Handling `href`
    `{{link-to}}` will use your application's Router to
    fill the element's `href` property with a url that
    matches the path to the supplied `routeName` for your
    routers's configured `Location` scheme, which defaults
    to Ember.HashLocation.

    ### Handling current route
    `{{link-to}}` will apply a CSS class name of 'active'
    when the application's current route matches
    the supplied routeName. For example, if the application's
    current route is 'photoGallery.recent' the following
    use of `{{link-to}}`:

    ```handlebars
    {{#link-to 'photoGallery.recent'}}
      Great Hamster Photos from the last week
    {{/link-to}}
    ```

    will result in

    ```html
    <a href="/hamster-photos/this-week" class="active">
      Great Hamster Photos
    </a>
    ```

    The CSS class name used for active classes can be customized
    for a single use of `{{link-to}}` by passing an `activeClass`
    option:

    ```handlebars
    {{#link-to 'photoGallery.recent' activeClass="current-url"}}
      Great Hamster Photos from the last week
    {{/link-to}}
    ```

    ```html
    <a href="/hamster-photos/this-week" class="current-url">
      Great Hamster Photos
    </a>
    ```

    To override this option for your entire application, see
    "Overriding Application-wide Defaults".

    ### Supplying a model
    An optional model argument can be used for routes whose
    paths contain dynamic segments. This argument will become
    the model context of the linked route:

    ```javascript
    App.Router.map(function() {
      this.resource("photoGallery", {path: "hamster-photos/:photo_id"});
    });
    ```

    ```handlebars
    {{#link-to 'photoGallery' aPhoto}}
      {{aPhoto.title}}
    {{/link-to}}
    ```

    ```html
    <a href="/hamster-photos/42">
      Tomster
    </a>
    ```

    ### Supplying multiple models
    For deep-linking to route paths that contain multiple
    dynamic segments, multiple model arguments can be used.
    As the router transitions through the route path, each
    supplied model argument will become the context for the
    route with the dynamic segments:

    ```javascript
    App.Router.map(function() {
      this.resource("photoGallery", {path: "hamster-photos/:photo_id"}, function() {
        this.route("comment", {path: "comments/:comment_id"});
      });
    });
    ```
    This argument will become the model context of the linked route:

    ```handlebars
    {{#link-to 'photoGallery.comment' aPhoto comment}}
      {{comment.body}}
    {{/link-to}}
    ```

    ```html
    <a href="/hamster-photos/42/comment/718">
      A+++ would snuggle again.
    </a>
    ```

    ### Supplying an explicit dynamic segment value
    If you don't have a model object available to pass to `{{link-to}}`,
    an optional string or integer argument can be passed for routes whose
    paths contain dynamic segments. This argument will become the value
    of the dynamic segment:

    ```javascript
    App.Router.map(function() {
      this.resource("photoGallery", {path: "hamster-photos/:photo_id"});
    });
    ```

    ```handlebars
    {{#link-to 'photoGallery' aPhotoId}}
      {{aPhoto.title}}
    {{/link-to}}
    ```

    ```html
    <a href="/hamster-photos/42">
      Tomster
    </a>
    ```

    When transitioning into the linked route, the `model` hook will
    be triggered with parameters including this passed identifier.

    ### Allowing Default Action

   By default the `{{link-to}}` helper prevents the default browser action
   by calling `preventDefault()` as this sort of action bubbling is normally
   handled internally and we do not want to take the browser to a new URL (for
   example).

   If you need to override this behavior specify `preventDefault=false` in
   your template:

    ```handlebars
    {{#link-to 'photoGallery' aPhotoId preventDefault=false}}
      {{aPhotoId.title}}
    {{/link-to}}
    ```

    ### Overriding attributes
    You can override any given property of the Ember.LinkView
    that is generated by the `{{link-to}}` helper by passing
    key/value pairs, like so:

    ```handlebars
    {{#link-to  aPhoto tagName='li' title='Following this link will change your life' classNames=['pic', 'sweet']}}
      Uh-mazing!
    {{/link-to}}
    ```

    See [Ember.LinkView](/api/classes/Ember.LinkView.html) for a
    complete list of overrideable properties. Be sure to also
    check out inherited properties of `LinkView`.

    ### Overriding Application-wide Defaults
    ``{{link-to}}`` creates an instance of Ember.LinkView
    for rendering. To override options for your entire
    application, reopen Ember.LinkView and supply the
    desired values:

    ``` javascript
    Ember.LinkView.reopen({
      activeClass: "is-active",
      tagName: 'li'
    })
    ```

    It is also possible to override the default event in
    this manner:

    ``` javascript
    Ember.LinkView.reopen({
      eventName: 'customEventName'
    });
    ```

    @method link-to
    @for Ember.Handlebars.helpers
    @param {String} routeName
    @param {Object} [context]*
    @param [options] {Object} Handlebars key/value pairs of options, you can override any property of Ember.LinkView
    @return {String} HTML string
    @see {Ember.LinkView}
  */
  Ember.Handlebars.registerHelper('link-to', function linkToHelper(name) {
    var options = [].slice.call(arguments, -1)[0],
        params = [].slice.call(arguments, 0, -1),
        hash = options.hash;

    hash.disabledBinding = hash.disabledWhen;

    if (!options.fn) {
      var linkTitle = params.shift();
      var linkType = options.types.shift();
      var context = this;
      if (linkType === 'ID') {
        options.linkTextPath = linkTitle;
        options.fn = function() {
          return Ember.Handlebars.get(context, linkTitle, options);
        };
      } else {
        options.fn = function() {
          return linkTitle;
        };
      }
    }

    hash.parameters = {
      context: this,
      options: options,
      params: params
    };

    return Ember.Handlebars.helpers.view.call(this, LinkView, options);
  });

  /**
    See [link-to](/api/classes/Ember.Handlebars.helpers.html#method_link-to)

    @method linkTo
    @for Ember.Handlebars.helpers
    @deprecated
    @param {String} routeName
    @param {Object} [context]*
    @return {String} HTML string
  */
  Ember.Handlebars.registerHelper('linkTo', function linkToHelper() {
    Ember.warn("The 'linkTo' view helper is deprecated in favor of 'link-to'");
    return Ember.Handlebars.helpers['link-to'].apply(this, arguments);
  });
});



})();



(function() {
/**
@module ember
@submodule ember-routing
*/

var get = Ember.get, set = Ember.set;
Ember.onLoad('Ember.Handlebars', function(Handlebars) {
  /**
  @module ember
  @submodule ember-routing
  */

  Handlebars.OutletView = Ember.ContainerView.extend(Ember._Metamorph);

  /**
    The `outlet` helper is a placeholder that the router will fill in with
    the appropriate template based on the current state of the application.

    ``` handlebars
    {{outlet}}
    ```

    By default, a template based on Ember's naming conventions will be rendered
    into the `outlet` (e.g. `App.PostsRoute` will render the `posts` template).

    You can render a different template by using the `render()` method in the
    route's `renderTemplate` hook. The following will render the `favoritePost`
    template into the `outlet`.

    ``` javascript
    App.PostsRoute = Ember.Route.extend({
      renderTemplate: function() {
        this.render('favoritePost');
      }
    });
    ```

    You can create custom named outlets for more control.

    ``` handlebars
    {{outlet 'favoritePost'}}
    {{outlet 'posts'}}
    ```

    Then you can define what template is rendered into each outlet in your
    route.


    ``` javascript
    App.PostsRoute = Ember.Route.extend({
      renderTemplate: function() {
        this.render('favoritePost', { outlet: 'favoritePost' });
        this.render('posts', { outlet: 'posts' });
      }
    });
    ```

    You can specify the view class that the outlet uses to contain and manage the
    templates rendered into it.

    ``` handlebars
    {{outlet viewClass=App.SectionContainer}}
    ```

    ``` javascript
    App.SectionContainer = Ember.ContainerView.extend({
      tagName: 'section',
      classNames: ['special']
    });
    ```

    @method outlet
    @for Ember.Handlebars.helpers
    @param {String} property the property on the controller
      that holds the view for this outlet
    @return {String} HTML string
  */
  Handlebars.registerHelper('outlet', function outletHelper(property, options) {
    var outletSource, outletContainerClass;

    if (property && property.data && property.data.isRenderData) {
      options = property;
      property = 'main';
    }

    outletSource = options.data.view;
    while (!outletSource.get('template.isTop')) {
      outletSource = outletSource.get('_parentView');
    }

    outletContainerClass = options.hash.viewClass || Handlebars.OutletView;

    options.data.view.set('outletSource', outletSource);
    options.hash.currentViewBinding = '_view.outletSource._outlets.' + property;

    return Handlebars.helpers.view.call(this, outletContainerClass, options);
  });
});

})();



(function() {
/**
@module ember
@submodule ember-routing
*/

var get = Ember.get, set = Ember.set;
Ember.onLoad('Ember.Handlebars', function(Handlebars) {

  /**
    Calling ``{{render}}`` from within a template will insert another
    template that matches the provided name. The inserted template will
    access its properties on its own controller (rather than the controller
    of the parent template).

    If a view class with the same name exists, the view class also will be used.

    Note: A given controller may only be used *once* in your app in this manner.
    A singleton instance of the controller will be created for you.

    Example:

    ```javascript
    App.NavigationController = Ember.Controller.extend({
      who: "world"
    });
    ```

    ```handlebars
    <!-- navigation.hbs -->
    Hello, {{who}}.
    ```

    ```handelbars
    <!-- application.hbs -->
    <h1>My great app</h1>
    {{render navigation}}
    ```

    ```html
    <h1>My great app</h1>
    <div class='ember-view'>
      Hello, world.
    </div>
    ```

    Optionally you may provide a second argument: a property path
    that will be bound to the `model` property of the controller.

    If a `model` property path is specified, then a new instance of the
    controller will be created and `{{render}}` can be used multiple times
    with the same name.

   For example if you had this `author` template.

   ```handlebars
<div class="author">
  Written by {{firstName}} {{lastName}}.
  Total Posts: {{postCount}}
</div>
  ```

  You could render it inside the `post` template using the `render` helper.

  ```handlebars
<div class="post">
  <h1>{{title}}</h1>
  <div>{{body}}</div>
  {{render "author" author}}
</div>
   ```

    @method render
    @for Ember.Handlebars.helpers
    @param {String} name
    @param {Object?} contextString
    @param {Hash} options
    @return {String} HTML string
  */
  Ember.Handlebars.registerHelper('render', function renderHelper(name, contextString, options) {
    var length = arguments.length;

    var contextProvided = length === 3,
        container, router, controller, view, context, lookupOptions;

    container = (options || contextString).data.keywords.controller.container;
    router = container.lookup('router:main');

    if (length === 2) {
      // use the singleton controller
      options = contextString;
      contextString = undefined;
      Ember.assert("You can only use the {{render}} helper once without a model object as its second argument, as in {{render \"post\" post}}.", !router || !router._lookupActiveView(name));
    } else if (length === 3) {
      // create a new controller
      context = Ember.Handlebars.get(options.contexts[1], contextString, options);
    } else {
      throw Ember.Error("You must pass a templateName to render");
    }

    // # legacy namespace
    name = name.replace(/\//g, '.');
    // \ legacy slash as namespace support


    view = container.lookup('view:' + name) || container.lookup('view:default');

    // provide controller override
    var controllerName = options.hash.controller || name;
    var controllerFullName = 'controller:' + controllerName;

    if (options.hash.controller) {
      Ember.assert("The controller name you supplied '" + controllerName + "' did not resolve to a controller.", container.has(controllerFullName));
    }

    var target = options.data.keywords.controller;

    // choose name
    if (length > 2) {
      var factory = container.lookupFactory(controllerFullName) ||
                    Ember.generateControllerFactory(container, controllerName, context);

      controller = factory.create({
        model: context,
        target: target
      });

    } else {
      controller = container.lookup(controllerFullName) ||
                   Ember.generateController(container, controllerName);

      controller.set('target', target);
    }

    var root = options.contexts[1];

    if (root) {
      view.registerObserver(root, contextString, function() {
        controller.set('model', Ember.Handlebars.get(root, contextString, options));
      });
    }

    options.hash.viewName = Ember.String.camelize(name);
    options.hash.template = container.lookup('template:' + name);
    options.hash.controller = controller;

    if (router && !context) {
      router._connectActiveView(name, view);
    }

    Ember.Handlebars.helpers.view.call(this, view, options);
  });
});

})();



(function() {
/**
@module ember
@submodule ember-routing
*/
Ember.onLoad('Ember.Handlebars', function(Handlebars) {

  var resolveParams = Ember.Router.resolveParams,
      isSimpleClick = Ember.ViewUtils.isSimpleClick;

  var EmberHandlebars = Ember.Handlebars,
      handlebarsGet = EmberHandlebars.get,
      SafeString = EmberHandlebars.SafeString,
      forEach = Ember.ArrayPolyfills.forEach,
      get = Ember.get,
      a_slice = Array.prototype.slice;

  function args(options, actionName) {
    var ret = [];
    if (actionName) { ret.push(actionName); }

    var types = options.options.types.slice(1),
        data = options.options.data;

    return ret.concat(resolveParams(options.context, options.params, { types: types, data: data }));
  }

  var ActionHelper = EmberHandlebars.ActionHelper = {
    registeredActions: {}
  };

  var keys = ["alt", "shift", "meta", "ctrl"];

  var POINTER_EVENT_TYPE_REGEX = /^click|mouse|touch/;

  var isAllowedEvent = function(event, allowedKeys) {
    if (typeof allowedKeys === "undefined") {
      if (POINTER_EVENT_TYPE_REGEX.test(event.type)) {
        return isSimpleClick(event);
      } else {
        allowedKeys = '';
      }
    }

    if (allowedKeys.indexOf("any") >= 0) {
      return true;
    }

    var allowed = true;

    forEach.call(keys, function(key) {
      if (event[key + "Key"] && allowedKeys.indexOf(key) === -1) {
        allowed = false;
      }
    });

    return allowed;
  };

  ActionHelper.registerAction = function(actionName, options, allowedKeys) {
    var actionId = (++Ember.uuid).toString();

    ActionHelper.registeredActions[actionId] = {
      eventName: options.eventName,
      handler: function handleRegisteredAction(event) {
        if (!isAllowedEvent(event, allowedKeys)) { return true; }

        if (options.preventDefault !== false) {
          event.preventDefault();
        }

        if (options.bubbles === false) {
          event.stopPropagation();
        }

        var target = options.target;

        if (target.target) {
          target = handlebarsGet(target.root, target.target, target.options);
        } else {
          target = target.root;
        }

        Ember.run(function runRegisteredAction() {
          if (target.send) {
            target.send.apply(target, args(options.parameters, actionName));
          } else {
            Ember.assert("The action '" + actionName + "' did not exist on " + target, typeof target[actionName] === 'function');
            target[actionName].apply(target, args(options.parameters));
          }
        });
      }
    };

    options.view.on('willClearRender', function() {
      delete ActionHelper.registeredActions[actionId];
    });

    return actionId;
  };

  /**
    The `{{action}}` helper registers an HTML element within a template for DOM
    event handling and forwards that interaction to the templates's controller
    or supplied `target` option (see 'Specifying a Target').

    If the controller does not implement the event, the event is sent
    to the current route, and it bubbles up the route hierarchy from there.

    User interaction with that element will invoke the supplied action name on
    the appropriate target.

    Given the following application Handlebars template on the page

    ```handlebars
    <div {{action 'anActionName'}}>
      click me
    </div>
    ```

    And application code

    ```javascript
    App.ApplicationController = Ember.Controller.extend({
      actions: {
        anActionName: function() {
        }
      }
    });
    ```

    Will result in the following rendered HTML

    ```html
    <div class="ember-view">
      <div data-ember-action="1">
        click me
      </div>
    </div>
    ```

    Clicking "click me" will trigger the `anActionName` action of the
    `App.ApplicationController`. In this case, no additional parameters will be passed.

    If you provide additional parameters to the helper:

    ```handlebars
    <button {{action 'edit' post}}>Edit</button>
    ```

    Those parameters will be passed along as arguments to the JavaScript
    function implementing the action.

    ### Event Propagation

    Events triggered through the action helper will automatically have
    `.preventDefault()` called on them. You do not need to do so in your event
    handlers. If you need to allow event propagation (to handle file inputs for
    example) you can supply the `preventDefault=false` option to the `{{action}}` helper:

    ```handlebars
    <div {{action "sayHello" preventDefault=false}}>
      <input type="file" />
      <input type="checkbox" />
    </div>
    ```

    To disable bubbling, pass `bubbles=false` to the helper:

    ```handlebars
    <button {{action 'edit' post bubbles=false}}>Edit</button>
    ```

    If you need the default handler to trigger you should either register your
    own event handler, or use event methods on your view class. See [Ember.View](/api/classes/Ember.View.html)
    'Responding to Browser Events' for more information.

    ### Specifying DOM event type

    By default the `{{action}}` helper registers for DOM `click` events. You can
    supply an `on` option to the helper to specify a different DOM event name:

    ```handlebars
    <div {{action "anActionName" on="doubleClick"}}>
      click me
    </div>
    ```

    See `Ember.View` 'Responding to Browser Events' for a list of
    acceptable DOM event names.

    NOTE: Because `{{action}}` depends on Ember's event dispatch system it will
    only function if an `Ember.EventDispatcher` instance is available. An
    `Ember.EventDispatcher` instance will be created when a new `Ember.Application`
    is created. Having an instance of `Ember.Application` will satisfy this
    requirement.

    ### Specifying whitelisted modifier keys

    By default the `{{action}}` helper will ignore click event with pressed modifier
    keys. You can supply an `allowedKeys` option to specify which keys should not be ignored.

    ```handlebars
    <div {{action "anActionName" allowedKeys="alt"}}>
      click me
    </div>
    ```

    This way the `{{action}}` will fire when clicking with the alt key pressed down.

    Alternatively, supply "any" to the `allowedKeys` option to accept any combination of modifier keys.

    ```handlebars
    <div {{action "anActionName" allowedKeys="any"}}>
      click me with any key pressed
    </div>
    ```

    ### Specifying a Target

    There are several possible target objects for `{{action}}` helpers:

    In a typical Ember application, where views are managed through use of the
    `{{outlet}}` helper, actions will bubble to the current controller, then
    to the current route, and then up the route hierarchy.

    Alternatively, a `target` option can be provided to the helper to change
    which object will receive the method call. This option must be a path
    to an object, accessible in the current context:

    ```handlebars
    {{! the application template }}
    <div {{action "anActionName" target=view}}>
      click me
    </div>
    ```

    ```javascript
    App.ApplicationView = Ember.View.extend({
      actions: {
        anActionName: function(){}
      }
    });

    ```

    ### Additional Parameters

    You may specify additional parameters to the `{{action}}` helper. These
    parameters are passed along as the arguments to the JavaScript function
    implementing the action.

    ```handlebars
    {{#each person in people}}
      <div {{action "edit" person}}>
        click me
      </div>
    {{/each}}
    ```

    Clicking "click me" will trigger the `edit` method on the current controller
    with the value of `person` as a parameter.

    @method action
    @for Ember.Handlebars.helpers
    @param {String} actionName
    @param {Object} [context]*
    @param {Hash} options
  */
  EmberHandlebars.registerHelper('action', function actionHelper(actionName) {
    var options = arguments[arguments.length - 1],
        contexts = a_slice.call(arguments, 1, -1);

    var hash = options.hash,
        controller;

    // create a hash to pass along to registerAction
    var action = {
      eventName: hash.on || "click"
    };

    action.parameters = {
      context: this,
      options: options,
      params: contexts
    };

    action.view = options.data.view;

    var root, target;

    if (hash.target) {
      root = this;
      target = hash.target;
    } else if (controller = options.data.keywords.controller) {
      root = controller;
    }

    action.target = { root: root, target: target, options: options };
    action.bubbles = hash.bubbles;
    action.preventDefault = hash.preventDefault;

    var actionId = ActionHelper.registerAction(actionName, action, hash.allowedKeys);
    return new SafeString('data-ember-action="' + actionId + '"');
  });

});

})();



(function() {

})();



(function() {
/**
@module ember
@submodule ember-routing
*/

var get = Ember.get, set = Ember.set;

Ember.ControllerMixin.reopen({
  /**
    Transition the application into another route. The route may
    be either a single route or route path:

    ```javascript
      aController.transitionToRoute('blogPosts');
      aController.transitionToRoute('blogPosts.recentEntries');
    ```

    Optionally supply a model for the route in question. The model
    will be serialized into the URL using the `serialize` hook of
    the route:

    ```javascript
      aController.transitionToRoute('blogPost', aPost);
    ```

    Multiple models will be applied last to first recursively up the
    resource tree.

    ```javascript

      this.resource('blogPost', {path:':blogPostId'}, function(){
        this.resource('blogComment', {path: ':blogCommentId'});
      });
      
      aController.transitionToRoute('blogComment', aPost, aComment);
    ```

    See also 'replaceRoute'.

    @param {String} name the name of the route
    @param {...Object} models the model(s) to be used while transitioning
    to the route.
    @for Ember.ControllerMixin
    @method transitionToRoute
  */
  transitionToRoute: function() {
    // target may be either another controller or a router
    var target = get(this, 'target'),
        method = target.transitionToRoute || target.transitionTo;
    return method.apply(target, arguments);
  },

  /**
    @deprecated
    @for Ember.ControllerMixin
    @method transitionTo
  */
  transitionTo: function() {
    Ember.deprecate("transitionTo is deprecated. Please use transitionToRoute.");
    return this.transitionToRoute.apply(this, arguments);
  },

  /**
    Transition into another route while replacing the current URL, if possible.
    This will replace the current history entry instead of adding a new one. 
    Beside that, it is identical to `transitionToRoute` in all other respects.

    ```javascript
      aController.replaceRoute('blogPosts');
      aController.replaceRoute('blogPosts.recentEntries');
    ```

    Optionally supply a model for the route in question. The model
    will be serialized into the URL using the `serialize` hook of
    the route:

    ```javascript
      aController.replaceRoute('blogPost', aPost);
    ```

    Multiple models will be applied last to first recursively up the
    resource tree.

    ```javascript

      this.resource('blogPost', {path:':blogPostId'}, function(){
        this.resource('blogComment', {path: ':blogCommentId'});
      });
      
      aController.replaceRoute('blogComment', aPost, aComment);
    ```

    @param {String} name the name of the route
    @param {...Object} models the model(s) to be used while transitioning
    to the route.
    @for Ember.ControllerMixin
    @method replaceRoute
  */
  replaceRoute: function() {
    // target may be either another controller or a router
    var target = get(this, 'target'),
        method = target.replaceRoute || target.replaceWith;
    return method.apply(target, arguments);
  },

  /**
    @deprecated
    @for Ember.ControllerMixin
    @method replaceWith
  */
  replaceWith: function() {
    Ember.deprecate("replaceWith is deprecated. Please use replaceRoute.");
    return this.replaceRoute.apply(this, arguments);
  }
});

})();



(function() {
/**
@module ember
@submodule ember-routing
*/

var get = Ember.get, set = Ember.set;

Ember.View.reopen({

  /**
    Sets the private `_outlets` object on the view.

    @method init
   */
  init: function() {
    set(this, '_outlets', {});
    this._super();
  },

  /**
    Manually fill any of a view's `{{outlet}}` areas with the
    supplied view.

    Example

    ```javascript
    var MyView = Ember.View.extend({
      template: Ember.Handlebars.compile('Child view: {{outlet "main"}} ')
    });
    var myView = MyView.create();
    myView.appendTo('body');
    // The html for myView now looks like:
    // <div id="ember228" class="ember-view">Child view: </div>

    myView.connectOutlet('main', Ember.View.extend({
      template: Ember.Handlebars.compile('<h1>Foo</h1> ')
    }));
    // The html for myView now looks like:
    // <div id="ember228" class="ember-view">Child view:
    //   <div id="ember234" class="ember-view"><h1>Foo</h1> </div>
    // </div>
    ```
    @method connectOutlet
    @param  {String} outletName A unique name for the outlet
    @param  {Object} view       An Ember.View
   */
  connectOutlet: function(outletName, view) {
    if (this._pendingDisconnections) {
      delete this._pendingDisconnections[outletName];
    }

    if (this._hasEquivalentView(outletName, view)) {
      view.destroy();
      return;
    }

    var outlets = get(this, '_outlets'),
        container = get(this, 'container'),
        router = container && container.lookup('router:main'),
        renderedName = get(view, 'renderedName');

    set(outlets, outletName, view);

    if (router && renderedName) {
      router._connectActiveView(renderedName, view);
    }
  },

  /**
    @private

    Determines if the view has already been created by checking if
    the view has the same constructor, template, and context as the
    view in the `_outlets` object.

    @method _hasEquivalentView
    @param  {String} outletName The name of the outlet we are checking
    @param  {Object} view       An Ember.View
    @return {Boolean}
   */
  _hasEquivalentView: function(outletName, view) {
    var existingView = get(this, '_outlets.'+outletName);
    return existingView &&
      existingView.constructor === view.constructor &&
      existingView.get('template') === view.get('template') &&
      existingView.get('context') === view.get('context');
  },

  /**
    Removes an outlet from the view.

    Example

    ```javascript
    var MyView = Ember.View.extend({
      template: Ember.Handlebars.compile('Child view: {{outlet "main"}} ')
    });
    var myView = MyView.create();
    myView.appendTo('body');
    // myView's html:
    // <div id="ember228" class="ember-view">Child view: </div>

    myView.connectOutlet('main', Ember.View.extend({
      template: Ember.Handlebars.compile('<h1>Foo</h1> ')
    }));
    // myView's html:
    // <div id="ember228" class="ember-view">Child view:
    //   <div id="ember234" class="ember-view"><h1>Foo</h1> </div>
    // </div>

    myView.disconnectOutlet('main');
    // myView's html:
    // <div id="ember228" class="ember-view">Child view: </div>
    ```

    @method disconnectOutlet
    @param  {String} outletName The name of the outlet to be removed
   */
  disconnectOutlet: function(outletName) {
    if (!this._pendingDisconnections) {
      this._pendingDisconnections = {};
    }
    this._pendingDisconnections[outletName] = true;
    Ember.run.once(this, '_finishDisconnections');
  },

  /**
    @private

    Gets an outlet that is pending disconnection and then
    nullifys the object on the `_outlet` object.

    @method _finishDisconnections
   */
  _finishDisconnections: function() {
    var outlets = get(this, '_outlets');
    var pendingDisconnections = this._pendingDisconnections;
    this._pendingDisconnections = null;

    for (var outletName in pendingDisconnections) {
      set(outlets, outletName, null);
    }
  }
});

})();



(function() {
/**
@module ember
@submodule ember-views
*/

// Add a new named queue after the 'actions' queue (where RSVP promises
// resolve), which is used in router transitions to prevent unnecessary
// loading state entry if all context promises resolve on the 
// 'actions' queue first.

var queues = Ember.run.queues,
    indexOf = Ember.ArrayPolyfills.indexOf;
queues.splice(indexOf.call(queues, 'actions') + 1, 0, 'routerTransitions');

})();



(function() {
/**
@module ember
@submodule ember-routing
*/

var get = Ember.get, set = Ember.set;

/*
  This file implements the `location` API used by Ember's router.

  That API is:

  getURL: returns the current URL
  setURL(path): sets the current URL
  replaceURL(path): replace the current URL (optional)
  onUpdateURL(callback): triggers the callback when the URL changes
  formatURL(url): formats `url` to be placed into `href` attribute

  Calling setURL or replaceURL will not trigger onUpdateURL callbacks.

  TODO: This should perhaps be moved so that it's visible in the doc output.
*/

/**
  Ember.Location returns an instance of the correct implementation of
  the `location` API.

  You can pass it a `implementation` ('hash', 'history', 'none') to force a
  particular implementation.

  @class Location
  @namespace Ember
  @static
*/
Ember.Location = {
  /**
   Create an instance of a an implementation of the `location` API. Requires
   an options object with an `implementation` property.

   Example

   ```javascript
   var hashLocation = Ember.Location.create({implementation: 'hash'});
   var historyLocation = Ember.Location.create({implementation: 'history'});
   var noneLocation = Ember.Location.create({implementation: 'none'});
   ```

    @method create
    @param {Object} options
    @return {Object} an instance of an implementation of the `location` API
  */
  create: function(options) {
    var implementation = options && options.implementation;
    Ember.assert("Ember.Location.create: you must specify a 'implementation' option", !!implementation);

    var implementationClass = this.implementations[implementation];
    Ember.assert("Ember.Location.create: " + implementation + " is not a valid implementation", !!implementationClass);

    return implementationClass.create.apply(implementationClass, arguments);
  },

  /**
   Registers a class that implements the `location` API with an implementation
   name. This implementation name can then be specified by the location property on
   the application's router class.

   Example

   ```javascript
   Ember.Location.registerImplementation('history', Ember.HistoryLocation);

   App.Router.reopen({
     location: 'history'
   });
   ```

    @method registerImplementation
    @param {String} name
    @param {Object} implementation of the `location` API
  */
  registerImplementation: function(name, implementation) {
    Ember.deprecate('Using the Ember.Location.registerImplementation is no longer supported. Register your custom location implementation with the container instead.', false);

    this.implementations[name] = implementation;
  },

  implementations: {}
};

})();



(function() {
/**
@module ember
@submodule ember-routing
*/

var get = Ember.get, set = Ember.set;

/**
  Ember.NoneLocation does not interact with the browser. It is useful for
  testing, or when you need to manage state with your Router, but temporarily
  don't want it to muck with the URL (for example when you embed your
  application in a larger page).

  @class NoneLocation
  @namespace Ember
  @extends Ember.Object
*/
Ember.NoneLocation = Ember.Object.extend({
  implementation: 'none',
  path: '',

  /**
    @private

    Returns the current path.

    @method getURL
    @return {String} path
  */
  getURL: function() {
    return get(this, 'path');
  },

  /**
    @private

    Set the path and remembers what was set. Using this method
    to change the path will not invoke the `updateURL` callback.

    @method setURL
    @param path {String}
  */
  setURL: function(path) {
    set(this, 'path', path);
  },

  /**
    @private

    Register a callback to be invoked when the path changes. These
    callbacks will execute when the user presses the back or forward
    button, but not after `setURL` is invoked.

    @method onUpdateURL
    @param callback {Function}
  */
  onUpdateURL: function(callback) {
    this.updateCallback = callback;
  },

  /**
    @private

    Sets the path and calls the `updateURL` callback.

    @method handleURL
    @param callback {Function}
  */
  handleURL: function(url) {
    set(this, 'path', url);
    this.updateCallback(url);
  },

  /**
    @private

    Given a URL, formats it to be placed into the page as part
    of an element's `href` attribute.

    This is used, for example, when using the {{action}} helper
    to generate a URL based on an event.

    @method formatURL
    @param url {String}
    @return {String} url
  */
  formatURL: function(url) {
    // The return value is not overly meaningful, but we do not want to throw
    // errors when test code renders templates containing {{action href=true}}
    // helpers.
    return url;
  }
});

})();



(function() {
/**
@module ember
@submodule ember-routing
*/

var get = Ember.get, set = Ember.set;

/**
  Ember.HashLocation implements the location API using the browser's
  hash. At present, it relies on a hashchange event existing in the
  browser.

  @class HashLocation
  @namespace Ember
  @extends Ember.Object
*/
Ember.HashLocation = Ember.Object.extend({
  implementation: 'hash',

  init: function() {
    set(this, 'location', get(this, 'location') || window.location);
  },

  /**
    @private

    Returns the current `location.hash`, minus the '#' at the front.

    @method getURL
  */
  getURL: function() {
    if (Ember.FEATURES.isEnabled("query-params")) {
      // location.hash is not used because it is inconsistently
      // URL-decoded between browsers.
      var href = get(this, 'location').href,
        hashIndex = href.indexOf('#');

      if ( hashIndex === -1 ) {
        return "";
      } else {
        return href.substr(hashIndex + 1);
      }
    }
    // Default implementation without feature flag enabled
    return get(this, 'location').hash.substr(1);
  },

  /**
    @private

    Set the `location.hash` and remembers what was set. This prevents
    `onUpdateURL` callbacks from triggering when the hash was set by
    `HashLocation`.

    @method setURL
    @param path {String}
  */
  setURL: function(path) {
    get(this, 'location').hash = path;
    set(this, 'lastSetURL', path);
  },

  /**
    @private

    Uses location.replace to update the url without a page reload
    or history modification.

    @method replaceURL
    @param path {String}
  */
  replaceURL: function(path) {
    get(this, 'location').replace('#' + path);
  },

  /**
    @private

    Register a callback to be invoked when the hash changes. These
    callbacks will execute when the user presses the back or forward
    button, but not after `setURL` is invoked.

    @method onUpdateURL
    @param callback {Function}
  */
  onUpdateURL: function(callback) {
    var self = this;
    var guid = Ember.guidFor(this);

    Ember.$(window).on('hashchange.ember-location-'+guid, function() {
      Ember.run(function() {
        var path = location.hash.substr(1);
        if (get(self, 'lastSetURL') === path) { return; }

        set(self, 'lastSetURL', null);

        callback(path);
      });
    });
  },

  /**
    @private

    Given a URL, formats it to be placed into the page as part
    of an element's `href` attribute.

    This is used, for example, when using the {{action}} helper
    to generate a URL based on an event.

    @method formatURL
    @param url {String}
  */
  formatURL: function(url) {
    return '#'+url;
  },

  /**
    @private

    Cleans up the HashLocation event listener.

    @method willDestroy
  */
  willDestroy: function() {
    var guid = Ember.guidFor(this);

    Ember.$(window).off('hashchange.ember-location-'+guid);
  }
});

})();



(function() {
/**
@module ember
@submodule ember-routing
*/

var get = Ember.get, set = Ember.set;
var popstateFired = false;
var supportsHistoryState = window.history && 'state' in window.history;

/**
  Ember.HistoryLocation implements the location API using the browser's
  history.pushState API.

  @class HistoryLocation
  @namespace Ember
  @extends Ember.Object
*/
Ember.HistoryLocation = Ember.Object.extend({
  implementation: 'history',

  init: function() {
    set(this, 'location', get(this, 'location') || window.location);
  },

  /**
    @private

    Used to set state on first call to setURL

    @method initState
  */
  initState: function() {
    set(this, 'history', get(this, 'history') || window.history);
    this.replaceState(this.formatURL(this.getURL()));
  },

  /**
    Will be pre-pended to path upon state change

    @property rootURL
    @default '/'
  */
  rootURL: '/',

  /**
    @private

    Returns the current `location.pathname` without rootURL

    @method getURL
    @return url {String}
  */
  getURL: function() {
    var rootURL = get(this, 'rootURL'),
        location = get(this, 'location'),
        path = location.pathname;

    rootURL = rootURL.replace(/\/$/, '');
    var url = path.replace(rootURL, '');

    if (Ember.FEATURES.isEnabled("query-params")) {
      var search = location.search || '';
      url += search;
    }

    return url;
  },

  /**
    @private

    Uses `history.pushState` to update the url without a page reload.

    @method setURL
    @param path {String}
  */
  setURL: function(path) {
    var state = this.getState();
    path = this.formatURL(path);

    if (state && state.path !== path) {
      this.pushState(path);
    }
  },

  /**
    @private

    Uses `history.replaceState` to update the url without a page reload
    or history modification.

    @method replaceURL
    @param path {String}
  */
  replaceURL: function(path) {
    var state = this.getState();
    path = this.formatURL(path);

    if (state && state.path !== path) {
      this.replaceState(path);
    }
  },

  /**
   @private

   Get the current `history.state`
   Polyfill checks for native browser support and falls back to retrieving
   from a private _historyState variable

   @method getState
   @return state {Object}
  */
  getState: function() {
    return supportsHistoryState ? get(this, 'history').state : this._historyState;
  },

  /**
   @private

   Pushes a new state

   @method pushState
   @param path {String}
  */
  pushState: function(path) {
    var state = { path: path };

    get(this, 'history').pushState(state, null, path);

    // store state if browser doesn't support `history.state`
    if (!supportsHistoryState) {
      this._historyState = state;
    }

    // used for webkit workaround
    this._previousURL = this.getURL();
  },

  /**
   @private

   Replaces the current state

   @method replaceState
   @param path {String}
  */
  replaceState: function(path) {
    var state = { path: path };

    get(this, 'history').replaceState(state, null, path);

    // store state if browser doesn't support `history.state`
    if (!supportsHistoryState) {
      this._historyState = state;
    }

    // used for webkit workaround
    this._previousURL = this.getURL();
  },

  /**
    @private

    Register a callback to be invoked whenever the browser
    history changes, including using forward and back buttons.

    @method onUpdateURL
    @param callback {Function}
  */
  onUpdateURL: function(callback) {
    var guid = Ember.guidFor(this),
        self = this;

    Ember.$(window).on('popstate.ember-location-'+guid, function(e) {
      // Ignore initial page load popstate event in Chrome
      if (!popstateFired) {
        popstateFired = true;
        if (self.getURL() === self._previousURL) { return; }
      }
      callback(self.getURL());
    });
  },

  /**
    @private

    Used when using `{{action}}` helper.  The url is always appended to the rootURL.

    @method formatURL
    @param url {String}
    @return formatted url {String}
  */
  formatURL: function(url) {
    var rootURL = get(this, 'rootURL');

    if (url !== '') {
      rootURL = rootURL.replace(/\/$/, '');
    }

    return rootURL + url;
  },

  /**
    @private

    Cleans up the HistoryLocation event listener.

    @method willDestroy
  */
  willDestroy: function() {
    var guid = Ember.guidFor(this);

    Ember.$(window).off('popstate.ember-location-'+guid);
  }
});

})();



(function() {

})();



(function() {
/**
Ember Routing

@module ember
@submodule ember-routing
@requires ember-views
*/

})();

