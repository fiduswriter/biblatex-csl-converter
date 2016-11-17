(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var _printObject = require("print-object");

var _printObject2 = _interopRequireDefault(_printObject);

var _src = require("../src");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var readBibFile = function readBibFile() {
    var fileUpload = document.getElementById('file-upload');
    if (fileUpload.files.length) {
        var fr = new FileReader();
        fr.onload = function (event) {
            importBiblatex(event.target.result);
        };
        fr.readAsText(fileUpload.files[0]);
    }
};

var importBiblatex = function importBiblatex(bibString) {
    var parser = new _src.BibLatexParser(bibString);
    window.bibDB = parser.output;
    var bibDBOutput = document.getElementById('bib-db');
    window.bibDB.forEach(function (bib) {
        bibDBOutput.innerHTML += (0, _printObject2.default)(bib, { html: true });
    });
    //bibDBOutput.innerHTML = printObject(window.bibDB, {html: true})
};

document.getElementById('file-upload').addEventListener('change', readBibFile);

},{"../src":55,"print-object":46}],2:[function(require,module,exports){
'use strict';

var assign        = require('es5-ext/object/assign')
  , normalizeOpts = require('es5-ext/object/normalize-options')
  , isCallable    = require('es5-ext/object/is-callable')
  , contains      = require('es5-ext/string/#/contains')

  , d;

d = module.exports = function (dscr, value/*, options*/) {
	var c, e, w, options, desc;
	if ((arguments.length < 2) || (typeof dscr !== 'string')) {
		options = value;
		value = dscr;
		dscr = null;
	} else {
		options = arguments[2];
	}
	if (dscr == null) {
		c = w = true;
		e = false;
	} else {
		c = contains.call(dscr, 'c');
		e = contains.call(dscr, 'e');
		w = contains.call(dscr, 'w');
	}

	desc = { value: value, configurable: c, enumerable: e, writable: w };
	return !options ? desc : assign(normalizeOpts(options), desc);
};

d.gs = function (dscr, get, set/*, options*/) {
	var c, e, options, desc;
	if (typeof dscr !== 'string') {
		options = set;
		set = get;
		get = dscr;
		dscr = null;
	} else {
		options = arguments[3];
	}
	if (get == null) {
		get = undefined;
	} else if (!isCallable(get)) {
		options = get;
		get = set = undefined;
	} else if (set == null) {
		set = undefined;
	} else if (!isCallable(set)) {
		options = set;
		set = undefined;
	}
	if (dscr == null) {
		c = true;
		e = false;
	} else {
		c = contains.call(dscr, 'c');
		e = contains.call(dscr, 'e');
	}

	desc = { get: get, set: set, configurable: c, enumerable: e };
	return !options ? desc : assign(normalizeOpts(options), desc);
};

},{"es5-ext/object/assign":14,"es5-ext/object/is-callable":17,"es5-ext/object/normalize-options":21,"es5-ext/string/#/contains":25}],3:[function(require,module,exports){
'use strict';

module.exports = require('./is-implemented')()
	? Array.from
	: require('./shim');

},{"./is-implemented":4,"./shim":5}],4:[function(require,module,exports){
'use strict';

module.exports = function () {
	var from = Array.from, arr, result;
	if (typeof from !== 'function') return false;
	arr = ['raz', 'dwa'];
	result = from(arr);
	return Boolean(result && (result !== arr) && (result[1] === 'dwa'));
};

},{}],5:[function(require,module,exports){
'use strict';

var iteratorSymbol = require('es6-symbol').iterator
  , isArguments    = require('../../function/is-arguments')
  , isFunction     = require('../../function/is-function')
  , toPosInt       = require('../../number/to-pos-integer')
  , callable       = require('../../object/valid-callable')
  , validValue     = require('../../object/valid-value')
  , isString       = require('../../string/is-string')

  , isArray = Array.isArray, call = Function.prototype.call
  , desc = { configurable: true, enumerable: true, writable: true, value: null }
  , defineProperty = Object.defineProperty;

module.exports = function (arrayLike/*, mapFn, thisArg*/) {
	var mapFn = arguments[1], thisArg = arguments[2], Constructor, i, j, arr, l, code, iterator
	  , result, getIterator, value;

	arrayLike = Object(validValue(arrayLike));

	if (mapFn != null) callable(mapFn);
	if (!this || (this === Array) || !isFunction(this)) {
		// Result: Plain array
		if (!mapFn) {
			if (isArguments(arrayLike)) {
				// Source: Arguments
				l = arrayLike.length;
				if (l !== 1) return Array.apply(null, arrayLike);
				arr = new Array(1);
				arr[0] = arrayLike[0];
				return arr;
			}
			if (isArray(arrayLike)) {
				// Source: Array
				arr = new Array(l = arrayLike.length);
				for (i = 0; i < l; ++i) arr[i] = arrayLike[i];
				return arr;
			}
		}
		arr = [];
	} else {
		// Result: Non plain array
		Constructor = this;
	}

	if (!isArray(arrayLike)) {
		if ((getIterator = arrayLike[iteratorSymbol]) !== undefined) {
			// Source: Iterator
			iterator = callable(getIterator).call(arrayLike);
			if (Constructor) arr = new Constructor();
			result = iterator.next();
			i = 0;
			while (!result.done) {
				value = mapFn ? call.call(mapFn, thisArg, result.value, i) : result.value;
				if (!Constructor) {
					arr[i] = value;
				} else {
					desc.value = value;
					defineProperty(arr, i, desc);
				}
				result = iterator.next();
				++i;
			}
			l = i;
		} else if (isString(arrayLike)) {
			// Source: String
			l = arrayLike.length;
			if (Constructor) arr = new Constructor();
			for (i = 0, j = 0; i < l; ++i) {
				value = arrayLike[i];
				if ((i + 1) < l) {
					code = value.charCodeAt(0);
					if ((code >= 0xD800) && (code <= 0xDBFF)) value += arrayLike[++i];
				}
				value = mapFn ? call.call(mapFn, thisArg, value, j) : value;
				if (!Constructor) {
					arr[j] = value;
				} else {
					desc.value = value;
					defineProperty(arr, j, desc);
				}
				++j;
			}
			l = j;
		}
	}
	if (l === undefined) {
		// Source: array or array-like
		l = toPosInt(arrayLike.length);
		if (Constructor) arr = new Constructor(l);
		for (i = 0; i < l; ++i) {
			value = mapFn ? call.call(mapFn, thisArg, arrayLike[i], i) : arrayLike[i];
			if (!Constructor) {
				arr[i] = value;
			} else {
				desc.value = value;
				defineProperty(arr, i, desc);
			}
		}
	}
	if (Constructor) {
		desc.value = null;
		arr.length = l;
	}
	return arr;
};

},{"../../function/is-arguments":6,"../../function/is-function":7,"../../number/to-pos-integer":13,"../../object/valid-callable":23,"../../object/valid-value":24,"../../string/is-string":28,"es6-symbol":29}],6:[function(require,module,exports){
'use strict';

var toString = Object.prototype.toString

  , id = toString.call((function () { return arguments; }()));

module.exports = function (x) { return (toString.call(x) === id); };

},{}],7:[function(require,module,exports){
'use strict';

var toString = Object.prototype.toString

  , id = toString.call(require('./noop'));

module.exports = function (f) {
	return (typeof f === "function") && (toString.call(f) === id);
};

},{"./noop":8}],8:[function(require,module,exports){
'use strict';

module.exports = function () {};

},{}],9:[function(require,module,exports){
'use strict';

module.exports = require('./is-implemented')()
	? Math.sign
	: require('./shim');

},{"./is-implemented":10,"./shim":11}],10:[function(require,module,exports){
'use strict';

module.exports = function () {
	var sign = Math.sign;
	if (typeof sign !== 'function') return false;
	return ((sign(10) === 1) && (sign(-20) === -1));
};

},{}],11:[function(require,module,exports){
'use strict';

module.exports = function (value) {
	value = Number(value);
	if (isNaN(value) || (value === 0)) return value;
	return (value > 0) ? 1 : -1;
};

},{}],12:[function(require,module,exports){
'use strict';

var sign = require('../math/sign')

  , abs = Math.abs, floor = Math.floor;

module.exports = function (value) {
	if (isNaN(value)) return 0;
	value = Number(value);
	if ((value === 0) || !isFinite(value)) return value;
	return sign(value) * floor(abs(value));
};

},{"../math/sign":9}],13:[function(require,module,exports){
'use strict';

var toInteger = require('./to-integer')

  , max = Math.max;

module.exports = function (value) { return max(0, toInteger(value)); };

},{"./to-integer":12}],14:[function(require,module,exports){
'use strict';

module.exports = require('./is-implemented')()
	? Object.assign
	: require('./shim');

},{"./is-implemented":15,"./shim":16}],15:[function(require,module,exports){
'use strict';

module.exports = function () {
	var assign = Object.assign, obj;
	if (typeof assign !== 'function') return false;
	obj = { foo: 'raz' };
	assign(obj, { bar: 'dwa' }, { trzy: 'trzy' });
	return (obj.foo + obj.bar + obj.trzy) === 'razdwatrzy';
};

},{}],16:[function(require,module,exports){
'use strict';

var keys  = require('../keys')
  , value = require('../valid-value')

  , max = Math.max;

module.exports = function (dest, src/*, …srcn*/) {
	var error, i, l = max(arguments.length, 2), assign;
	dest = Object(value(dest));
	assign = function (key) {
		try { dest[key] = src[key]; } catch (e) {
			if (!error) error = e;
		}
	};
	for (i = 1; i < l; ++i) {
		src = arguments[i];
		keys(src).forEach(assign);
	}
	if (error !== undefined) throw error;
	return dest;
};

},{"../keys":18,"../valid-value":24}],17:[function(require,module,exports){
// Deprecated

'use strict';

module.exports = function (obj) { return typeof obj === 'function'; };

},{}],18:[function(require,module,exports){
'use strict';

module.exports = require('./is-implemented')()
	? Object.keys
	: require('./shim');

},{"./is-implemented":19,"./shim":20}],19:[function(require,module,exports){
'use strict';

module.exports = function () {
	try {
		Object.keys('primitive');
		return true;
	} catch (e) { return false; }
};

},{}],20:[function(require,module,exports){
'use strict';

var keys = Object.keys;

module.exports = function (object) {
	return keys(object == null ? object : Object(object));
};

},{}],21:[function(require,module,exports){
'use strict';

var forEach = Array.prototype.forEach, create = Object.create;

var process = function (src, obj) {
	var key;
	for (key in src) obj[key] = src[key];
};

module.exports = function (options/*, …options*/) {
	var result = create(null);
	forEach.call(arguments, function (options) {
		if (options == null) return;
		process(Object(options), result);
	});
	return result;
};

},{}],22:[function(require,module,exports){
'use strict';

var forEach = Array.prototype.forEach, create = Object.create;

module.exports = function (arg/*, …args*/) {
	var set = create(null);
	forEach.call(arguments, function (name) { set[name] = true; });
	return set;
};

},{}],23:[function(require,module,exports){
'use strict';

module.exports = function (fn) {
	if (typeof fn !== 'function') throw new TypeError(fn + " is not a function");
	return fn;
};

},{}],24:[function(require,module,exports){
'use strict';

module.exports = function (value) {
	if (value == null) throw new TypeError("Cannot use null or undefined");
	return value;
};

},{}],25:[function(require,module,exports){
'use strict';

module.exports = require('./is-implemented')()
	? String.prototype.contains
	: require('./shim');

},{"./is-implemented":26,"./shim":27}],26:[function(require,module,exports){
'use strict';

var str = 'razdwatrzy';

module.exports = function () {
	if (typeof str.contains !== 'function') return false;
	return ((str.contains('dwa') === true) && (str.contains('foo') === false));
};

},{}],27:[function(require,module,exports){
'use strict';

var indexOf = String.prototype.indexOf;

module.exports = function (searchString/*, position*/) {
	return indexOf.call(this, searchString, arguments[1]) > -1;
};

},{}],28:[function(require,module,exports){
'use strict';

var toString = Object.prototype.toString

  , id = toString.call('');

module.exports = function (x) {
	return (typeof x === 'string') || (x && (typeof x === 'object') &&
		((x instanceof String) || (toString.call(x) === id))) || false;
};

},{}],29:[function(require,module,exports){
'use strict';

module.exports = require('./is-implemented')() ? Symbol : require('./polyfill');

},{"./is-implemented":30,"./polyfill":32}],30:[function(require,module,exports){
'use strict';

var validTypes = { object: true, symbol: true };

module.exports = function () {
	var symbol;
	if (typeof Symbol !== 'function') return false;
	symbol = Symbol('test symbol');
	try { String(symbol); } catch (e) { return false; }

	// Return 'true' also for polyfills
	if (!validTypes[typeof Symbol.iterator]) return false;
	if (!validTypes[typeof Symbol.toPrimitive]) return false;
	if (!validTypes[typeof Symbol.toStringTag]) return false;

	return true;
};

},{}],31:[function(require,module,exports){
'use strict';

module.exports = function (x) {
	if (!x) return false;
	if (typeof x === 'symbol') return true;
	if (!x.constructor) return false;
	if (x.constructor.name !== 'Symbol') return false;
	return (x[x.constructor.toStringTag] === 'Symbol');
};

},{}],32:[function(require,module,exports){
// ES2015 Symbol polyfill for environments that do not support it (or partially support it)

'use strict';

var d              = require('d')
  , validateSymbol = require('./validate-symbol')

  , create = Object.create, defineProperties = Object.defineProperties
  , defineProperty = Object.defineProperty, objPrototype = Object.prototype
  , NativeSymbol, SymbolPolyfill, HiddenSymbol, globalSymbols = create(null)
  , isNativeSafe;

if (typeof Symbol === 'function') {
	NativeSymbol = Symbol;
	try {
		String(NativeSymbol());
		isNativeSafe = true;
	} catch (ignore) {}
}

var generateName = (function () {
	var created = create(null);
	return function (desc) {
		var postfix = 0, name, ie11BugWorkaround;
		while (created[desc + (postfix || '')]) ++postfix;
		desc += (postfix || '');
		created[desc] = true;
		name = '@@' + desc;
		defineProperty(objPrototype, name, d.gs(null, function (value) {
			// For IE11 issue see:
			// https://connect.microsoft.com/IE/feedbackdetail/view/1928508/
			//    ie11-broken-getters-on-dom-objects
			// https://github.com/medikoo/es6-symbol/issues/12
			if (ie11BugWorkaround) return;
			ie11BugWorkaround = true;
			defineProperty(this, name, d(value));
			ie11BugWorkaround = false;
		}));
		return name;
	};
}());

// Internal constructor (not one exposed) for creating Symbol instances.
// This one is used to ensure that `someSymbol instanceof Symbol` always return false
HiddenSymbol = function Symbol(description) {
	if (this instanceof HiddenSymbol) throw new TypeError('TypeError: Symbol is not a constructor');
	return SymbolPolyfill(description);
};

// Exposed `Symbol` constructor
// (returns instances of HiddenSymbol)
module.exports = SymbolPolyfill = function Symbol(description) {
	var symbol;
	if (this instanceof Symbol) throw new TypeError('TypeError: Symbol is not a constructor');
	if (isNativeSafe) return NativeSymbol(description);
	symbol = create(HiddenSymbol.prototype);
	description = (description === undefined ? '' : String(description));
	return defineProperties(symbol, {
		__description__: d('', description),
		__name__: d('', generateName(description))
	});
};
defineProperties(SymbolPolyfill, {
	for: d(function (key) {
		if (globalSymbols[key]) return globalSymbols[key];
		return (globalSymbols[key] = SymbolPolyfill(String(key)));
	}),
	keyFor: d(function (s) {
		var key;
		validateSymbol(s);
		for (key in globalSymbols) if (globalSymbols[key] === s) return key;
	}),

	// If there's native implementation of given symbol, let's fallback to it
	// to ensure proper interoperability with other native functions e.g. Array.from
	hasInstance: d('', (NativeSymbol && NativeSymbol.hasInstance) || SymbolPolyfill('hasInstance')),
	isConcatSpreadable: d('', (NativeSymbol && NativeSymbol.isConcatSpreadable) ||
		SymbolPolyfill('isConcatSpreadable')),
	iterator: d('', (NativeSymbol && NativeSymbol.iterator) || SymbolPolyfill('iterator')),
	match: d('', (NativeSymbol && NativeSymbol.match) || SymbolPolyfill('match')),
	replace: d('', (NativeSymbol && NativeSymbol.replace) || SymbolPolyfill('replace')),
	search: d('', (NativeSymbol && NativeSymbol.search) || SymbolPolyfill('search')),
	species: d('', (NativeSymbol && NativeSymbol.species) || SymbolPolyfill('species')),
	split: d('', (NativeSymbol && NativeSymbol.split) || SymbolPolyfill('split')),
	toPrimitive: d('', (NativeSymbol && NativeSymbol.toPrimitive) || SymbolPolyfill('toPrimitive')),
	toStringTag: d('', (NativeSymbol && NativeSymbol.toStringTag) || SymbolPolyfill('toStringTag')),
	unscopables: d('', (NativeSymbol && NativeSymbol.unscopables) || SymbolPolyfill('unscopables'))
});

// Internal tweaks for real symbol producer
defineProperties(HiddenSymbol.prototype, {
	constructor: d(SymbolPolyfill),
	toString: d('', function () { return this.__name__; })
});

// Proper implementation of methods exposed on Symbol.prototype
// They won't be accessible on produced symbol instances as they derive from HiddenSymbol.prototype
defineProperties(SymbolPolyfill.prototype, {
	toString: d(function () { return 'Symbol (' + validateSymbol(this).__description__ + ')'; }),
	valueOf: d(function () { return validateSymbol(this); })
});
defineProperty(SymbolPolyfill.prototype, SymbolPolyfill.toPrimitive, d('', function () {
	var symbol = validateSymbol(this);
	if (typeof symbol === 'symbol') return symbol;
	return symbol.toString();
}));
defineProperty(SymbolPolyfill.prototype, SymbolPolyfill.toStringTag, d('c', 'Symbol'));

// Proper implementaton of toPrimitive and toStringTag for returned symbol instances
defineProperty(HiddenSymbol.prototype, SymbolPolyfill.toStringTag,
	d('c', SymbolPolyfill.prototype[SymbolPolyfill.toStringTag]));

// Note: It's important to define `toPrimitive` as last one, as some implementations
// implement `toPrimitive` natively without implementing `toStringTag` (or other specified symbols)
// And that may invoke error in definition flow:
// See: https://github.com/medikoo/es6-symbol/issues/13#issuecomment-164146149
defineProperty(HiddenSymbol.prototype, SymbolPolyfill.toPrimitive,
	d('c', SymbolPolyfill.prototype[SymbolPolyfill.toPrimitive]));

},{"./validate-symbol":33,"d":2}],33:[function(require,module,exports){
'use strict';

var isSymbol = require('./is-symbol');

module.exports = function (value) {
	if (!isSymbol(value)) throw new TypeError(value + " is not a symbol");
	return value;
};

},{"./is-symbol":31}],34:[function(require,module,exports){
'use strict';

var esniff = require('esniff')

  , i, current, literals, substitutions, sOut, sEscape, sAhead, sIn, sInEscape, template;

sOut = function (char) {
	if (char === '\\') return sEscape;
	if (char === '$') return sAhead;
	current += char;
	return sOut;
};
sEscape = function (char) {
	if ((char !== '\\') && (char !== '$')) current += '\\';
	current += char;
	return sOut;
};
sAhead = function (char) {
	if (char === '{') {
		literals.push(current);
		current = '';
		return sIn;
	}
	if (char === '$') {
		current += '$';
		return sAhead;
	}
	current += '$' + char;
	return sOut;
};
sIn = function (char) {
	var code = template.slice(i), end;
	esniff(code, '}', function (j) {
		if (esniff.nest >= 0) return esniff.next();
		end = j;
	});
	if (end != null) {
		substitutions.push(template.slice(i, i + end));
		i += end;
		current = '';
		return sOut;
	}
	end = code.length;
	i += end;
	current += code;
	return sIn;
};
sInEscape = function (char) {
	if ((char !== '\\') && (char !== '}')) current += '\\';
	current += char;
	return sIn;
};

module.exports = function (str) {
	var length, state, result;
	current = '';
	literals = [];
	substitutions = [];

	template = String(str);
	length = template.length;

	state = sOut;
	for (i = 0; i < length; ++i) state = state(template[i]);
	if (state === sOut) {
		literals.push(current);
	} else if (state === sEscape) {
		literals.push(current + '\\');
	} else if (state === sAhead) {
		literals.push(current + '$');
	} else if (state === sIn) {
		literals[literals.length - 1] += '${' + current;
	} else if (state === sInEscape) {
		literals[literals.length - 1] += '${' + current + '\\';
	}
	result = { literals: literals, substitutions: substitutions };
	literals = substitutions = null;
	return result;
};

},{"esniff":39}],35:[function(require,module,exports){
'use strict';

var compile = require('./compile')
  , resolve = require('./resolve-to-string');

module.exports = function (template, context/*, options*/) {
	return resolve(compile(template), context, arguments[2]);
};

},{"./compile":34,"./resolve-to-string":37}],36:[function(require,module,exports){
'use strict';

var reduce = Array.prototype.reduce;

module.exports = function (literals/*, …substitutions*/) {
	var args = arguments;
	return reduce.call(literals, function (a, b, i) {
		return a + ((args[i] === undefined) ? '' :  String(args[i])) + b;
	});
};

},{}],37:[function(require,module,exports){
'use strict';

var resolve  = require('./resolve')
  , passthru = require('./passthru');

module.exports = function (data, context/*, options*/) {
	return passthru.apply(null, resolve(data, context, arguments[2]));
};

},{"./passthru":36,"./resolve":38}],38:[function(require,module,exports){
'use strict';

var value          = require('es5-ext/object/valid-value')
  , normalize      = require('es5-ext/object/normalize-options')
  , isVarNameValid = require('esniff/is-var-name-valid')

  , map = Array.prototype.map, keys = Object.keys
  , stringify = JSON.stringify;

module.exports = function (data, context/*, options*/) {
	var names, argNames, argValues, options = Object(arguments[2]);

	(value(data) && value(data.literals) && value(data.substitutions));
	context = normalize(context);
	names = keys(context).filter(isVarNameValid);
	argNames = names.join(', ');
	argValues = names.map(function (name) { return context[name]; });
	return [data.literals].concat(map.call(data.substitutions, function (expr) {
		var resolver;
		if (!expr) return undefined;
		try {
			resolver = new Function(argNames, 'return (' + expr + ')');
		} catch (e) {
			throw new TypeError("Unable to compile expression:\n\targs: " + stringify(argNames) +
				"\n\tbody: " + stringify(expr) + "\n\terror: " + e.stack);
		}
		try {
			return resolver.apply(null, argValues);
		} catch (e) {
			if (options.partial) return '${' + expr + '}';
			throw new TypeError("Unable to resolve expression:\n\targs: " + stringify(argNames) +
				"\n\tbody: " + stringify(expr) + "\n\terror: " + e.stack);
		}
	}));
};

},{"es5-ext/object/normalize-options":21,"es5-ext/object/valid-value":24,"esniff/is-var-name-valid":40}],39:[function(require,module,exports){
'use strict';

var from         = require('es5-ext/array/from')
  , primitiveSet = require('es5-ext/object/primitive-set')
  , value        = require('es5-ext/object/valid-value')
  , callable     = require('es5-ext/object/valid-callable')
  , d            = require('d')
  , eolSet       = require('./lib/ws-eol')
  , wsSet        = require('./lib/ws')

  , hasOwnProperty = Object.prototype.hasOwnProperty
  , preRegExpSet = primitiveSet.apply(null, from(';{=([,<>+-*/%&|^!~?:}'))
  , nonNameSet = primitiveSet.apply(null, from(';{=([,<>+-*/%&|^!~?:})].'))

  , move, startCollect, endCollect, collectNest
  , $ws, $common, $string, $comment, $multiComment, $regExp

  , i, char, line, columnIndex, afterWs, previousChar
  , nest, nestedTokens, results
  , userCode, userTriggerChar, isUserTriggerOperatorChar, userCallback

  , quote
  , collectIndex, data, nestRelease;

move = function (j) {
	if (!char) return;
	if (i >= j) return;
	while (i !== j) {
		if (!char) return;
		if (hasOwnProperty.call(wsSet, char)) {
			if (hasOwnProperty.call(eolSet, char)) {
				columnIndex = i;
				++line;
			}
		} else {
			previousChar = char;
		}
		char = userCode[++i];
	}
};

startCollect = function (oldNestRelease) {
	if (collectIndex != null) nestedTokens.push([data, collectIndex, oldNestRelease]);
	data = { point: i + 1, line: line, column: i + 1 - columnIndex };
	collectIndex = i;
};

endCollect = function () {
	var previous;
	data.raw = userCode.slice(collectIndex, i);
	results.push(data);
	if (nestedTokens.length) {
		previous = nestedTokens.pop();
		data = previous[0];
		collectIndex = previous[1];
		nestRelease = previous[2];
		return;
	}
	data = null;
	collectIndex = null;
	nestRelease = null;
};

collectNest = function () {
	var old = nestRelease;
	nestRelease = nest;
	++nest;
	move(i + 1);
	startCollect(old);
	return $ws;
};

$common = function () {
	if ((char === '\'') || (char === '"')) {
		quote = char;
		char = userCode[++i];
		return $string;
	}
	if ((char === '(') || (char === '{') || (char === '[')) {
		++nest;
	} else if ((char === ')') || (char === '}') || (char === ']')) {
		if (nestRelease === --nest) endCollect();
	} else if (char === '/') {
		if (hasOwnProperty.call(preRegExpSet, previousChar)) {
			char = userCode[++i];
			return $regExp;
		}
	}
	if ((char !== userTriggerChar) || (!isUserTriggerOperatorChar && previousChar && !afterWs &&
			!hasOwnProperty.call(nonNameSet, previousChar))) {
		previousChar = char;
		char = userCode[++i];
		return $ws;
	}

	return userCallback(i, previousChar, nest);
};

$comment = function () {
	while (true) {
		if (!char) return;
		if (hasOwnProperty.call(eolSet, char)) {
			columnIndex = i + 1;
			++line;
			return;
		}
		char = userCode[++i];
	}
};

$multiComment = function () {
	while (true) {
		if (!char) return;
		if (char === '*') {
			char = userCode[++i];
			if (char === '/') return;
			continue;
		}
		if (hasOwnProperty.call(eolSet, char)) {
			columnIndex = i + 1;
			++line;
		}
		char = userCode[++i];
	}
};

$ws = function () {
	var next;
	afterWs = false;
	while (true) {
		if (!char) return;
		if (hasOwnProperty.call(wsSet, char)) {
			afterWs = true;
			if (hasOwnProperty.call(eolSet, char)) {
				columnIndex = i + 1;
				++line;
			}
		} else if (char === '/') {
			next = userCode[i + 1];
			if (next === '/') {
				char = userCode[i += 2];
				afterWs = true;
				$comment();
			} else if (next === '*') {
				char = userCode[i += 2];
				afterWs = true;
				$multiComment();
			} else {
				break;
			}
		} else {
			break;
		}
		char = userCode[++i];
	}
	return $common;
};

$string = function () {
	while (true) {
		if (!char) return;
		if (char === quote) {
			char = userCode[++i];
			previousChar = quote;
			return $ws;
		}
		if (char === '\\') {
			if (hasOwnProperty.call(eolSet, userCode[++i])) {
				columnIndex = i + 1;
				++line;
			}
		}
		char = userCode[++i];
	}
};

$regExp = function () {
	while (true) {
		if (!char) return;
		if (char === '/') {
			previousChar = '/';
			char = userCode[++i];
			return $ws;
		}
		if (char === '\\') ++i;
		char = userCode[++i];
	}
};

module.exports = exports = function (code, triggerChar, callback) {
	var state;

	userCode = String(value(code));
	userTriggerChar = String(value(triggerChar));
	if (userTriggerChar.length !== 1) {
		throw new TypeError(userTriggerChar + " should be one character long string");
	}
	userCallback = callable(callback);
	isUserTriggerOperatorChar = hasOwnProperty.call(nonNameSet, userTriggerChar);
	i = 0;
	char = userCode[i];
	line = 1;
	columnIndex = 0;
	afterWs = false;
	previousChar = null;
	nest = 0;
	nestedTokens = [];
	results = [];
	exports.forceStop = false;
	state = $ws;
	while (state) state = state();
	return results;
};

Object.defineProperties(exports, {
	$ws: d($ws),
	$common: d($common),
	collectNest: d(collectNest),
	move: d(move),
	index: d.gs(function () { return i; }),
	line: d.gs(function () { return line; }),
	nest: d.gs(function () { return nest; }),
	columnIndex: d.gs(function () { return columnIndex; }),
	next: d(function (step) {
		if (!char) return;
		move(i + (step || 1));
		return $ws();
	}),
	resume: d(function () { return $common; })
});

},{"./lib/ws":43,"./lib/ws-eol":41,"d":44,"es5-ext/array/from":3,"es5-ext/object/primitive-set":22,"es5-ext/object/valid-callable":23,"es5-ext/object/valid-value":24}],40:[function(require,module,exports){
// Credit: Mathias Bynens -> https://mathiasbynens.be/demo/javascript-identifier-regex

'use strict';

module.exports = RegExp.prototype.test.bind(/^(?!(?:do|if|in|for|let|new|try|var|case|else|enum|eval|null|this|true|void|with|await|break|catch|class|const|false|super|throw|while|yield|delete|export|import|public|return|static|switch|typeof|default|extends|finally|package|private|continue|debugger|function|arguments|interface|protected|implements|instanceof)$)(?:[\$A-Z_a-z\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0-\u08B4\u08B6-\u08BD\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C80\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D54-\u0D56\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1C80-\u1C88\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2118-\u211D\u2124\u2126\u2128\u212A-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309B-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FD5\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AE\uA7B0-\uA7B7\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDE80-\uDE9C\uDEA0-\uDED0\uDF00-\uDF1F\uDF30-\uDF4A\uDF50-\uDF75\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00\uDE10-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE4\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD804[\uDC03-\uDC37\uDC83-\uDCAF\uDCD0-\uDCE8\uDD03-\uDD26\uDD50-\uDD72\uDD76\uDD83-\uDDB2\uDDC1-\uDDC4\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE2B\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEDE\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3D\uDF50\uDF5D-\uDF61]|\uD805[\uDC00-\uDC34\uDC47-\uDC4A\uDC80-\uDCAF\uDCC4\uDCC5\uDCC7\uDD80-\uDDAE\uDDD8-\uDDDB\uDE00-\uDE2F\uDE44\uDE80-\uDEAA\uDF00-\uDF19]|\uD806[\uDCA0-\uDCDF\uDCFF\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC2E\uDC40\uDC72-\uDC8F]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDED0-\uDEED\uDF00-\uDF2F\uDF40-\uDF43\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50\uDF93-\uDF9F\uDFE0]|\uD821[\uDC00-\uDFEC]|\uD822[\uDC00-\uDEF2]|\uD82C[\uDC00\uDC01]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB]|\uD83A[\uDC00-\uDCC4\uDD00-\uDD43]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1]|\uD87E[\uDC00-\uDE1D])(?:[\$0-9A-Z_a-z\xAA\xB5\xB7\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u08A0-\u08B4\u08B6-\u08BD\u08D4-\u08E1\u08E3-\u0963\u0966-\u096F\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0AF9\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C00-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58-\u0C5A\u0C60-\u0C63\u0C66-\u0C6F\u0C80-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D01-\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D54-\u0D57\u0D5F-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1369-\u1371\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19DA\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1AB0-\u1ABD\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1C80-\u1C88\u1CD0-\u1CD2\u1CD4-\u1CF6\u1CF8\u1CF9\u1D00-\u1DF5\u1DFB-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u200C\u200D\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2118-\u211D\u2124\u2126\u2128\u212A-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FD5\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AE\uA7B0-\uA7B7\uA7F7-\uA827\uA840-\uA873\uA880-\uA8C5\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA8FD\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uA9E0-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE2F\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDDFD\uDE80-\uDE9C\uDEA0-\uDED0\uDEE0\uDF00-\uDF1F\uDF30-\uDF4A\uDF50-\uDF7A\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCA0-\uDCA9\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00-\uDE03\uDE05\uDE06\uDE0C-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE38-\uDE3A\uDE3F\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE6\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD804[\uDC00-\uDC46\uDC66-\uDC6F\uDC7F-\uDCBA\uDCD0-\uDCE8\uDCF0-\uDCF9\uDD00-\uDD34\uDD36-\uDD3F\uDD50-\uDD73\uDD76\uDD80-\uDDC4\uDDCA-\uDDCC\uDDD0-\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE37\uDE3E\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEEA\uDEF0-\uDEF9\uDF00-\uDF03\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3C-\uDF44\uDF47\uDF48\uDF4B-\uDF4D\uDF50\uDF57\uDF5D-\uDF63\uDF66-\uDF6C\uDF70-\uDF74]|\uD805[\uDC00-\uDC4A\uDC50-\uDC59\uDC80-\uDCC5\uDCC7\uDCD0-\uDCD9\uDD80-\uDDB5\uDDB8-\uDDC0\uDDD8-\uDDDD\uDE00-\uDE40\uDE44\uDE50-\uDE59\uDE80-\uDEB7\uDEC0-\uDEC9\uDF00-\uDF19\uDF1D-\uDF2B\uDF30-\uDF39]|\uD806[\uDCA0-\uDCE9\uDCFF\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC36\uDC38-\uDC40\uDC50-\uDC59\uDC72-\uDC8F\uDC92-\uDCA7\uDCA9-\uDCB6]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDE60-\uDE69\uDED0-\uDEED\uDEF0-\uDEF4\uDF00-\uDF36\uDF40-\uDF43\uDF50-\uDF59\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50-\uDF7E\uDF8F-\uDF9F\uDFE0]|\uD821[\uDC00-\uDFEC]|\uD822[\uDC00-\uDEF2]|\uD82C[\uDC00\uDC01]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99\uDC9D\uDC9E]|\uD834[\uDD65-\uDD69\uDD6D-\uDD72\uDD7B-\uDD82\uDD85-\uDD8B\uDDAA-\uDDAD\uDE42-\uDE44]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB\uDFCE-\uDFFF]|\uD836[\uDE00-\uDE36\uDE3B-\uDE6C\uDE75\uDE84\uDE9B-\uDE9F\uDEA1-\uDEAF]|\uD838[\uDC00-\uDC06\uDC08-\uDC18\uDC1B-\uDC21\uDC23\uDC24\uDC26-\uDC2A]|\uD83A[\uDC00-\uDCC4\uDCD0-\uDCD6\uDD00-\uDD4A\uDD50-\uDD59]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1]|\uD87E[\uDC00-\uDE1D]|\uDB40[\uDD00-\uDDEF])*$/);

},{}],41:[function(require,module,exports){
'use strict';

var from         = require('es5-ext/array/from')
  , primitiveSet = require('es5-ext/object/primitive-set');

module.exports = primitiveSet.apply(null, from('\n\r\u2028\u2029'));

},{"es5-ext/array/from":3,"es5-ext/object/primitive-set":22}],42:[function(require,module,exports){
'use strict';

var from         = require('es5-ext/array/from')
  , primitiveSet = require('es5-ext/object/primitive-set');

module.exports = primitiveSet.apply(null, from(' \f\t\v​\u00a0\u1680​\u180e' +
	'\u2000​\u2001\u2002​\u2003\u2004​\u2005\u2006​\u2007\u2008​\u2009\u200a' +
	'​​​\u202f\u205f​\u3000'));

},{"es5-ext/array/from":3,"es5-ext/object/primitive-set":22}],43:[function(require,module,exports){
'use strict';

var primitiveSet = require('es5-ext/object/primitive-set')
  , eol          = require('./ws-eol')
  , inline       = require('./ws-inline');

module.exports = primitiveSet.apply(null,
	Object.keys(eol).concat(Object.keys(inline)));

},{"./ws-eol":41,"./ws-inline":42,"es5-ext/object/primitive-set":22}],44:[function(require,module,exports){
arguments[4][2][0].apply(exports,arguments)
},{"dup":2,"es5-ext/object/assign":14,"es5-ext/object/is-callable":17,"es5-ext/object/normalize-options":21,"es5-ext/string/#/contains":25}],45:[function(require,module,exports){
'use strict';
/* eslint-disable no-unused-vars */
var hasOwnProperty = Object.prototype.hasOwnProperty;
var propIsEnumerable = Object.prototype.propertyIsEnumerable;

function toObject(val) {
	if (val === null || val === undefined) {
		throw new TypeError('Object.assign cannot be called with null or undefined');
	}

	return Object(val);
}

function shouldUseNative() {
	try {
		if (!Object.assign) {
			return false;
		}

		// Detect buggy property enumeration order in older V8 versions.

		// https://bugs.chromium.org/p/v8/issues/detail?id=4118
		var test1 = new String('abc');  // eslint-disable-line
		test1[5] = 'de';
		if (Object.getOwnPropertyNames(test1)[0] === '5') {
			return false;
		}

		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
		var test2 = {};
		for (var i = 0; i < 10; i++) {
			test2['_' + String.fromCharCode(i)] = i;
		}
		var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
			return test2[n];
		});
		if (order2.join('') !== '0123456789') {
			return false;
		}

		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
		var test3 = {};
		'abcdefghijklmnopqrst'.split('').forEach(function (letter) {
			test3[letter] = letter;
		});
		if (Object.keys(Object.assign({}, test3)).join('') !==
				'abcdefghijklmnopqrst') {
			return false;
		}

		return true;
	} catch (e) {
		// We don't expect any of the above to throw, but better to be safe.
		return false;
	}
}

module.exports = shouldUseNative() ? Object.assign : function (target, source) {
	var from;
	var to = toObject(target);
	var symbols;

	for (var s = 1; s < arguments.length; s++) {
		from = Object(arguments[s]);

		for (var key in from) {
			if (hasOwnProperty.call(from, key)) {
				to[key] = from[key];
			}
		}

		if (Object.getOwnPropertySymbols) {
			symbols = Object.getOwnPropertySymbols(from);
			for (var i = 0; i < symbols.length; i++) {
				if (propIsEnumerable.call(from, symbols[i])) {
					to[symbols[i]] = from[symbols[i]];
				}
			}
		}
	}

	return to;
};

},{}],46:[function(require,module,exports){
'use strict';

var objectAssign = require('object-assign');
var compile  = require('es6-template-strings/compile');
var template = require('es6-template-strings');
var resolve  = require('es6-template-strings/resolve-to-string');

module.exports = function(obj, opts){

    var options = objectAssign({}, opts);

    if (!obj) {
        throw new Error('You must supply an object to print');
    }

    var unpacked;

    if (options.html){
        unpacked = unpackEmbeddedObjects(obj, '', '<br>');
        return printToHTML(unpacked, options);
    } else {
        unpacked = unpackEmbeddedObjects(obj, '\n  ', '');
        return printObject(unpacked, '', '\n');
    }


};

/**
 *
 * @param {Object} obj
 * @param {String} beforeLine
 * @param {String} afterLine
 * @returns {{}}
 */

function unpackEmbeddedObjects(obj, beforeLine, afterLine){

    var o = {};

    for(var key in obj){

        if (obj.hasOwnProperty(key)){

            var value = obj[key];
            var isArray = Array.isArray(value);

            if (!isArray && typeof value === 'object'){
                o[key] = printObject(value, beforeLine, afterLine);
            } else {
                o[key] = value;
            }
        }

    }

    return o;

}

function printObject(obj, beforeLine, afterLine){

    var s = '';

    for (var key in obj){
        if (obj.hasOwnProperty(key)){
            s += beforeLine + key + ": "+obj[key].toString();
            s += afterLine;
        }
    }

    return s;
}

function printToHTML(obj, opts){

    var options = objectAssign({}, opts);

    var element = options.tag ? options.tag : 'table';
    var tableStart = compile('<table${s1}${c}${s2}${a}>');
    var trTemplate = compile('<tr><td>${key}</td><td>${value}</td></tr>');
    var divStart = compile('<div${c}${a}>');
    var divTemplate = compile('<div><span>${key}</span><span>${value}</span></div>');
    var closeTags = ['</table>', '</div>'];

    var className = options.class ? template('class="${c}"', {c:options.class}) : '';
    var htmlAttr = options.attr || '';

    var spacer1 = className.length > 0 ? ' ' : '';
    var spacer2 = htmlAttr.length  > 0 ? ' ' : '';

    var row;
    var start;
    var end;

    if (element === 'table'){
        row = trTemplate;
        start = resolve(tableStart, {s1:spacer1, c:className, s2:spacer2, a:htmlAttr });
        end = closeTags[0];
    } else {
        row = divTemplate;
        start = resolve(divStart, {c:className, s:spacer, a:htmlAttr });
        end = closeTags[1];
    }

    var html = start;

    for(var key in obj){

        if (obj.hasOwnProperty(key)){
            var value = obj[key];
            html += resolve(row, {key:key, value:value});
        }
    }

    html += end;

    return html;

}


},{"es6-template-strings":35,"es6-template-strings/compile":34,"es6-template-strings/resolve-to-string":37,"object-assign":45}],47:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
/** A list of field types of Bibligraphy DB with lookup by field name. */
var BibFieldTypes = exports.BibFieldTypes = {
    'abstract': {
        type: 'f_literal',
        biblatex: 'abstract',
        csl: 'abstract'
    },
    'addendum': {
        type: 'f_literal',
        biblatex: 'addendum'
    },
    'afterword': {
        type: 'l_name',
        biblatex: 'afterword'
    },
    'annotation': {
        type: 'f_literal',
        biblatex: 'annotation'
    },
    'annotator': {
        type: 'l_name',
        biblatex: 'annotator'
    },
    'author': {
        type: 'l_name',
        biblatex: 'author',
        csl: 'author'
    },
    'authortype': {
        type: 'f_key',
        biblatex: 'authortype'
    },
    'bookauthor': {
        type: 'l_name',
        biblatex: 'bookauthor',
        csl: 'container-author'
    },
    'bookpagination': {
        type: 'f_key',
        biblatex: 'bookpagination',
        localization: 'pagination'
    },
    'booksubtitle': {
        type: 'f_literal',
        biblatex: 'booksubtitle'
    },
    'booktitle': {
        type: 'f_literal',
        biblatex: 'booktitle',
        csl: 'container-title'
    },
    'booktitleaddon': {
        type: 'f_literal',
        biblatex: 'booktitleaddon'
    },
    'chapter': {
        type: 'f_literal',
        biblatex: 'chapter',
        csl: 'chapter-number'
    },
    'commentator': {
        type: 'l_name',
        biblatex: 'commentator'
    },
    'date': {
        type: 'f_date',
        biblatex: 'date',
        csl: 'issued'
    },
    'doi': {
        type: 'f_verbatim',
        biblatex: 'doi',
        csl: 'DOI'
    },
    'edition': {
        type: 'f_integer',
        biblatex: 'edition',
        csl: 'edition'
    },
    'editor': {
        type: 'l_name',
        biblatex: 'editor',
        csl: 'editor'
    },
    'editora': {
        type: 'l_name',
        biblatex: 'editora'
    },
    'editorb': {
        type: 'l_name',
        biblatex: 'editorb'
    },
    'editorc': {
        type: 'l_name',
        biblatex: 'editorc'
    },
    'editortype': {
        type: 'f_key',
        biblatex: 'editortype'
    },
    'editoratype': {
        type: 'f_key',
        biblatex: 'editoratype'
    },
    'editorbtype': {
        type: 'f_key',
        biblatex: 'editorbtype'
    },
    'editorctype': {
        type: 'f_key',
        biblatex: 'editorctype'
    },
    'eid': {
        type: 'f_literal',
        biblatex: 'eid'
    },
    'entrysubtype': {
        type: 'f_literal',
        biblatex: 'entrysubtype'
    },
    'eprint': {
        type: 'f_verbatim',
        biblatex: 'eprint'
    },
    'eprintclass': {
        type: 'l_literal',
        biblatex: 'eprintclass'
    },
    'eprinttype': {
        type: 'f_literal',
        biblatex: 'eprinttype'
    },
    'eventdate': {
        type: 'f_date',
        biblatex: 'eventdate',
        csl: 'event-date'
    },
    'eventtitle': {
        type: 'f_literal',
        biblatex: 'eventtitle',
        csl: 'event'
    },
    'file': {
        type: 'f_verbatim',
        biblatex: 'file'
    },
    'foreword': {
        type: 'l_name',
        biblatex: 'foreword'
    },
    'holder': {
        type: 'l_name',
        biblatex: 'holder'
    },
    'howpublished': {
        type: 'f_literal',
        biblatex: 'howpublished',
        csl: 'medium'
    },
    'indextitle': {
        type: 'f_literal',
        biblatex: 'indextitle'
    },
    'institution': {
        type: 'l_literal',
        biblatex: 'institution'
    },
    'introduction': {
        type: 'l_name',
        biblatex: 'introduction'
    },
    'isan': {
        type: 'f_literal',
        biblatex: 'isan'
    },
    'isbn': {
        type: 'f_literal',
        biblatex: 'isbn',
        csl: 'ISBN'
    },
    'ismn': {
        type: 'f_literal',
        biblatex: 'ismn'
    },
    'isrn': {
        type: 'f_literal',
        biblatex: 'isrn'
    },
    'issn': {
        type: 'f_literal',
        biblatex: 'issn',
        csl: 'ISSN'
    },
    'issue': {
        type: 'f_literal',
        biblatex: 'issue',
        csl: 'issue'
    },
    'issuesubtitle': {
        type: 'f_literal',
        biblatex: 'issuesubtitle'
    },
    'issuetitle': {
        type: 'f_literal',
        biblatex: 'issuetitle'
    },
    'iswc': {
        type: 'f_literal',
        biblatex: 'iswc'
    },
    'journalsubtitle': {
        type: 'f_literal',
        biblatex: 'journalsubtitle'
    },
    'journaltitle': {
        type: 'f_literal',
        biblatex: 'journaltitle',
        csl: 'container-title'
    },
    'label': {
        type: 'f_literal',
        biblatex: 'label'
    },
    'language': {
        type: 'l_key',
        biblatex: 'language',
        csl: 'language'
    },
    'library': {
        type: 'f_literal',
        biblatex: 'library'
    },
    'location': {
        type: 'l_literal',
        biblatex: 'location',
        csl: 'publisher-place'
    },
    'mainsubtitle': {
        type: 'f_literal',
        biblatex: 'mainsubtitle'
    },
    'maintitle': {
        type: 'f_literal',
        biblatex: 'maintitle'
    },
    'maintitleaddon': {
        type: 'f_literal',
        biblatex: 'maintitleaddon'
    },
    'nameaddon': {
        type: 'f_literal',
        biblatex: 'nameaddon'
    },
    'note': {
        type: 'f_literal',
        biblatex: 'note',
        csl: 'note'
    },
    'number': {
        type: 'f_literal',
        biblatex: 'number',
        csl: 'number'
    },
    'organization': {
        type: 'l_literal',
        biblatex: 'organization'
    },
    'origdate': {
        type: 'f_date',
        biblatex: 'origdate',
        csl: 'original-date'
    },
    'origlanguage': {
        type: 'f_key',
        biblatex: 'origlanguage'
    },
    'origlocation': {
        type: 'l_literal',
        biblatex: 'origlocation',
        csl: 'original-publisher-place'
    },
    'origpublisher': {
        type: 'l_literal',
        biblatex: 'origpublisher',
        csl: 'original-publisher'
    },
    'origtitle': {
        type: 'f_literal',
        biblatex: 'origtitle',
        csl: 'original-title'
    },
    'pages': {
        type: 'f_range',
        biblatex: 'pages',
        csl: 'page'
    },
    'pagetotal': {
        type: 'f_literal',
        biblatex: 'pagetotal',
        csl: 'number-of-pages'
    },
    'pagination': {
        type: 'f_key',
        biblatex: 'pagination',
        localization: 'pagination'
    },
    'part': {
        type: 'f_literal',
        biblatex: 'part'
    },
    'publisher': {
        type: 'l_literal',
        biblatex: 'publisher',
        csl: 'publisher'
    },
    'pubstate': {
        type: 'f_key',
        biblatex: 'pubstate',
        csl: 'status',
        localization: 'publication_state'
    },
    'reprinttitle': {
        type: 'f_literal',
        biblatex: 'reprinttitle'
    },
    'series': {
        type: 'f_literal',
        biblatex: 'series',
        csl: 'collection-title'
    },
    'shortauthor': {
        type: 'l_name',
        biblatex: 'shortauthor'
    },
    'shorteditor': {
        type: 'l_name',
        biblatex: 'shorteditor'
    },
    'shorthand': {
        type: 'f_literal',
        biblatex: 'shorthand'
    },
    'shorthandintro': {
        type: 'f_literal',
        biblatex: 'shorthandintro'
    },
    'shortjournal': {
        type: 'f_literal',
        biblatex: 'shortjournal',
        csl: 'container-title-short'
    },
    'shortseries': {
        type: 'f_literal',
        biblatex: 'shortseries'
    },
    'shorttitle': {
        type: 'f_literal',
        biblatex: 'shorttitle',
        csl: 'title-short'
    },
    'subtitle': {
        type: 'f_literal',
        biblatex: 'subtitle'
    },
    'title': {
        type: 'f_literal',
        biblatex: 'title',
        csl: 'title'
    },
    'titleaddon': {
        type: 'f_literal',
        biblatex: 'titleaddon'
    },
    'translator': {
        type: 'l_name',
        biblatex: 'translator',
        csl: 'translator'
    },
    'type': {
        type: 'f_key',
        biblatex: 'type',
        localization: 'types'
    },
    'url': {
        type: 'f_uri',
        biblatex: 'url',
        csl: 'URL'
    },
    'urldate': {
        type: 'f_date',
        biblatex: 'urldate',
        csl: 'accessed'
    },
    'venue': {
        type: 'f_literal',
        biblatex: 'venue',
        csl: 'event-place'
    },
    'version': {
        type: 'f_literal',
        biblatex: 'version',
        csl: 'version'
    },
    'volume': {
        type: 'f_literal',
        biblatex: 'volume',
        csl: 'volume'
    },
    'volumes': {
        type: 'f_literal',
        biblatex: 'volumes',
        csl: 'number-of-volumes'
    }
};

/** A list of all bib types and their fields. */
var BibTypes = exports.BibTypes = {
    'article': {
        order: 1,
        biblatex: 'article',
        csl: 'article',
        required: ['journaltitle', 'title', 'author', 'date'],
        eitheror: [],
        optional: ['addendum', 'annotator', 'commentator', 'doi', 'editor', 'editora', 'editorb', 'editorc', 'eid', 'eprint', 'eprintclass', 'eprinttype', 'issn', 'issue', 'issuesubtitle', 'issuetitle', 'journalsubtitle', 'language', 'note', 'number', 'origlanguage', 'pages', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'version', 'volume']
    },
    'article-magazine': {
        order: 2,
        biblatex: 'article',
        csl: 'article-magazine',
        required: ['journaltitle', 'title', 'author', 'date'],
        eitheror: [],
        optional: ['addendum', 'annotator', 'commentator', 'doi', 'editor', 'editora', 'editorb', 'editorc', 'eid', 'eprint', 'eprintclass', 'eprinttype', 'issn', 'issue', 'issuesubtitle', 'issuetitle', 'journalsubtitle', 'language', 'note', 'number', 'origlanguage', 'pages', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'version', 'volume']
    },
    'article-newspaper': {
        order: 3,
        biblatex: 'article',
        csl: 'article-newspaper',
        required: ['journaltitle', 'title', 'author', 'date'],
        eitheror: [],
        optional: ['addendum', 'annotator', 'commentator', 'doi', 'editor', 'editora', 'editorb', 'editorc', 'eid', 'eprint', 'eprintclass', 'eprinttype', 'issn', 'issue', 'issuesubtitle', 'issuetitle', 'journalsubtitle', 'language', 'note', 'number', 'origlanguage', 'pages', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'version', 'volume']
    },
    'article-journal': {
        order: 4,
        biblatex: 'article',
        csl: 'article-journal',
        required: ['journaltitle', 'title', 'author', 'date'],
        eitheror: [],
        optional: ['addendum', 'annotator', 'commentator', 'doi', 'editor', 'editora', 'editorb', 'editorc', 'eid', 'eprint', 'eprintclass', 'eprinttype', 'issn', 'issue', 'issuesubtitle', 'issuetitle', 'journalsubtitle', 'language', 'note', 'number', 'origlanguage', 'pages', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'version', 'volume']
    },
    'post-weblog': {
        order: 5,
        biblatex: 'online',
        csl: 'post-weblog',
        required: ['date', 'title', 'url'],
        eitheror: ['editor', 'author'],
        optional: ['addendum', 'pubstate', 'subtitle', 'language', 'urldate', 'titleaddon', 'version', 'note', 'organization']
    },
    'book': {
        order: 10,
        biblatex: 'book',
        csl: 'book',
        required: ['title', 'author', 'date'],
        eitheror: [],
        optional: ['addendum', 'afterword', 'annotator', 'chapter', 'commentator', 'doi', 'edition', 'editor', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'origlanguage', 'pages', 'pagetotal', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volume', 'volumes']
    },
    'mvbook': {
        order: 11,
        biblatex: 'mvbook',
        csl: 'book',
        required: ['title', 'author', 'date'],
        eitheror: [],
        optional: ['addendum', 'afterword', 'annotator', 'commentator', 'doi', 'edition', 'editor', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'note', 'number', 'origlanguage', 'pagetotal', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volumes']
    },
    'inbook': {
        order: 12,
        biblatex: 'inbook',
        csl: 'chapter',
        required: ['title', 'booktitle', 'author', 'date'],
        eitheror: [],
        optional: ['addendum', 'afterword', 'annotator', 'bookauthor', 'booksubtitle', 'booktitleaddon', 'chapter', 'commentator', 'doi', 'edition', 'editor', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'origlanguage', 'pages', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volume', 'volumes']
    },
    'bookinbook': {
        order: 13,
        biblatex: 'bookinbook',
        csl: 'chapter',
        required: ['title', 'booktitle', 'author', 'date'],
        eitheror: [],
        optional: ['addendum', 'afterword', 'annotator', 'bookauthor', 'booksubtitle', 'booktitleaddon', 'chapter', 'commentator', 'doi', 'edition', 'editor', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'origlanguage', 'pages', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volume', 'volumes']
    },
    'suppbook': {
        order: 14,
        biblatex: 'suppbook',
        csl: 'chapter',
        required: ['title', 'booktitle', 'author', 'date'],
        eitheror: [],
        optional: ['addendum', 'afterword', 'annotator', 'bookauthor', 'booksubtitle', 'booktitleaddon', 'chapter', 'commentator', 'doi', 'edition', 'editor', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'origlanguage', 'pages', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volume', 'volumes']
    },
    'booklet': {
        order: 15,
        biblatex: 'booklet',
        csl: 'pamphlet',
        required: ['title', 'date'],
        eitheror: ['editor', 'author'],
        optional: ['titleaddon', 'addendum', 'pages', 'howpublished', 'type', 'pubstate', 'chapter', 'doi', 'subtitle', 'language', 'location', 'url', 'urldate', 'pagetotal', 'note', 'eprint', 'eprintclass', 'eprinttype']
    },
    'collection': {
        order: 20,
        biblatex: 'collection',
        csl: 'dataset',
        required: ['editor', 'title', 'date'],
        eitheror: [],
        optional: ['addendum', 'afterword', 'annotator', 'chapter', 'commentator', 'doi', 'edition', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'origlanguage', 'pages', 'pagetotal', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volume', 'volumes']
    },
    'mvcollection': {
        order: 21,
        biblatex: 'mvcollection',
        csl: 'dataset',
        required: ['editor', 'title', 'date'],
        eitheror: [],
        optional: ['addendum', 'afterword', 'annotator', 'commentator', 'doi', 'edition', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'note', 'number', 'origlanguage', 'pagetotal', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volumes']
    },
    'incollection': {
        order: 22,
        biblatex: 'incollection',
        csl: 'entry',
        required: ['title', 'editor', 'booktitle', 'author', 'date'],
        eitheror: [],
        optional: ['addendum', 'afterword', 'annotator', 'booksubtitle', 'booktitleaddon', 'chapter', 'commentator', 'doi', 'edition', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'origlanguage', 'pages', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volume', 'volumes']
    },
    'suppcollection': {
        order: 23,
        biblatex: 'suppcollection',
        csl: 'entry',
        required: ['title', 'editor', 'booktitle', 'author', 'date'],
        eitheror: [],
        optional: ['addendum', 'afterword', 'annotator', 'booksubtitle', 'booktitleaddon', 'chapter', 'commentator', 'doi', 'edition', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'origlanguage', 'pages', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volume', 'volumes']
    },
    'post': {
        order: 30,
        biblatex: 'online',
        csl: 'post',
        required: ['date', 'title', 'url'],
        eitheror: ['editor', 'author'],
        optional: ['addendum', 'pubstate', 'subtitle', 'language', 'urldate', 'titleaddon', 'version', 'note', 'organization']
    },
    'manual': {
        order: 40,
        biblatex: 'manual',
        csl: 'book',
        required: ['title', 'date'],
        eitheror: ['editor', 'author'],
        optional: ['addendum', 'chapter', 'doi', 'edition', 'eprint', 'eprintclass', 'eprinttype', 'isbn', 'language', 'location', 'note', 'number', 'organization', 'pages', 'pagetotal', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'type', 'url', 'urldate', 'version']
    },
    'misc': {
        order: 41,
        biblatex: 'misc',
        csl: 'entry',
        required: ['title', 'date'],
        eitheror: ['editor', 'author'],
        optional: ['addendum', 'howpublished', 'type', 'pubstate', 'organization', 'doi', 'subtitle', 'language', 'location', 'url', 'urldate', 'titleaddon', 'version', 'note', 'eprint', 'eprintclass', 'eprinttype']
    },
    'online': {
        order: 42,
        biblatex: 'online',
        csl: 'webpage',
        required: ['date', 'title', 'url'],
        eitheror: ['editor', 'author'],
        optional: ['addendum', 'pubstate', 'subtitle', 'language', 'urldate', 'titleaddon', 'version', 'note', 'organization']
    },
    'patent': {
        order: 43,
        biblatex: 'patent',
        csl: 'patent',
        required: ['title', 'number', 'author', 'date'],
        eitheror: [],
        optional: ['addendum', 'holder', 'location', 'pubstate', 'doi', 'subtitle', 'titleaddon', 'type', 'url', 'urldate', 'version', 'note', 'eprint', 'eprintclass', 'eprinttype']
    },
    'periodical': {
        order: 50,
        biblatex: 'periodical',
        csl: 'book',
        required: ['editor', 'title', 'date'],
        eitheror: [],
        optional: ['addendum', 'volume', 'pubstate', 'number', 'series', 'issn', 'issue', 'issuesubtitle', 'issuetitle', 'doi', 'subtitle', 'editora', 'editorb', 'editorc', 'url', 'urldate', 'language', 'note', 'eprint', 'eprintclass', 'eprinttype']
    },
    'suppperiodical': {
        order: 51,
        biblatex: 'suppperiodical',
        csl: 'entry',
        required: ['journaltitle', 'title', 'author', 'date'],
        eitheror: [],
        optional: ['addendum', 'annotator', 'commentator', 'doi', 'editor', 'editora', 'editorb', 'editorc', 'eid', 'eprint', 'eprintclass', 'eprinttype', 'issn', 'issue', 'issuesubtitle', 'issuetitle', 'journalsubtitle', 'language', 'note', 'number', 'origlanguage', 'pages', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'version', 'volume']
    },
    'proceedings': {
        order: 60,
        biblatex: 'proceedings',
        csl: 'entry',
        required: ['editor', 'title', 'date'],
        eitheror: [],
        optional: ['addendum', 'chapter', 'doi', 'eprint', 'eprintclass', 'eprinttype', 'eventdate', 'eventtitle', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'organization', 'pages', 'pagetotal', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'url', 'urldate', 'venue', 'volume', 'volumes']
    },
    'mvproceedings': {
        order: 61,
        biblatex: 'mvproceedings',
        csl: 'entry',
        required: ['editor', 'title', 'date'],
        eitheror: [],
        optional: ['addendum', 'doi', 'eprint', 'eprintclass', 'eprinttype', 'eventdate', 'eventtitle', 'isbn', 'language', 'location', 'note', 'number', 'organization', 'pagetotal', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'url', 'urldate', 'venue', 'volumes']
    },
    'inproceedings': {
        order: 62,
        biblatex: 'inproceedings',
        csl: 'paper-conference',
        required: ['title', 'editor', 'booktitle', 'author', 'date'],
        eitheror: [],
        optional: ['addendum', 'booksubtitle', 'booktitleaddon', 'chapter', 'doi', 'eprint', 'eprintclass', 'eprinttype', 'eventdate', 'eventtitle', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'organization', 'pages', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'url', 'urldate', 'venue', 'volume', 'volumes']
    },
    'reference': {
        order: 70,
        biblatex: 'book',
        csl: 'reference',
        required: ['editor', 'title', 'date'],
        eitheror: [],
        optional: ['addendum', 'afterword', 'annotator', 'chapter', 'commentator', 'doi', 'edition', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'origlanguage', 'pages', 'pagetotal', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volume', 'volumes']
    },
    'mvreference': {
        order: 71,
        biblatex: 'mvreference',
        csl: 'book',
        required: ['editor', 'title', 'date'],
        eitheror: [],
        optional: ['addendum', 'afterword', 'annotator', 'commentator', 'doi', 'edition', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'note', 'number', 'origlanguage', 'pagetotal', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volumes']
    },
    'inreference': {
        order: 72,
        biblatex: 'inreference',
        csl: 'entry',
        required: ['title', 'editor', 'booktitle', 'author', 'date'],
        eitheror: [],
        optional: ['addendum', 'afterword', 'annotator', 'booksubtitle', 'booktitleaddon', 'chapter', 'commentator', 'doi', 'edition', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'origlanguage', 'pages', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volume', 'volumes']
    },
    'entry-encyclopedia': {
        order: 73,
        biblatex: 'inreference',
        csl: 'entry-encyclopedia',
        required: ['title', 'editor', 'booktitle', 'author', 'date'],
        eitheror: [],
        optional: ['addendum', 'afterword', 'annotator', 'booksubtitle', 'booktitleaddon', 'chapter', 'commentator', 'doi', 'edition', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'origlanguage', 'pages', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volume', 'volumes']
    },
    'entry-dictionary': {
        order: 74,
        biblatex: 'inreference',
        csl: 'entry-dictionary',
        required: ['title', 'editor', 'booktitle', 'author', 'date'],
        eitheror: [],
        optional: ['addendum', 'afterword', 'annotator', 'booksubtitle', 'booktitleaddon', 'chapter', 'commentator', 'doi', 'edition', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'origlanguage', 'pages', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volume', 'volumes']
    },
    'report': {
        order: 80,
        biblatex: 'report',
        csl: 'report',
        required: ['author', 'title', 'type', 'institution', 'date'],
        eitheror: [],
        optional: ['addendum', 'pages', 'pagetotal', 'pubstate', 'number', 'isrn', 'chapter', 'doi', 'subtitle', 'language', 'location', 'url', 'urldate', 'titleaddon', 'version', 'note', 'eprint', 'eprintclass', 'eprinttype']
    },
    'thesis': {
        order: 81,
        biblatex: 'thesis',
        csl: 'thesis',
        required: ['author', 'title', 'type', 'institution', 'date'],
        eitheror: [],
        optional: ['addendum', 'pages', 'pagetotal', 'pubstate', 'isbn', 'chapter', 'doi', 'subtitle', 'language', 'location', 'url', 'urldate', 'titleaddon', 'note', 'eprint', 'eprintclass', 'eprinttype']
    },
    'unpublished': {
        order: 90,
        biblatex: 'unpublished',
        csl: 'manuscript',
        required: ['title', 'author', 'date'],
        eitheror: [],
        optional: ['addendum', 'howpublished', 'pubstate', 'isbn', 'date', 'subtitle', 'language', 'location', 'url', 'urldate', 'titleaddon', 'note']
    }
};

},{}],48:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.BibLatexExporter = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _const = require("./const");

var _const2 = require("../const");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/** Export a list of bibliography items to bibLateX and serve the file to the user as a ZIP-file.
 * @class BibLatexExporter
 * @param pks A list of pks of the bibliography items that are to be exported.
 */

var BibLatexExporter = exports.BibLatexExporter = function () {
    function BibLatexExporter(bibDB, pks) {
        _classCallCheck(this, BibLatexExporter);

        this.bibDB = bibDB; // The bibliography database to export from.
        if (pks) {
            this.pks = pks; // A list of pk values of the bibliography items to be exported.
        } else {
            this.pks = Object.keys(bibDB); // If none are selected, all keys are exporter
        }
    }

    _createClass(BibLatexExporter, [{
        key: "_reformDate",
        value: function _reformDate(theValue, typeName) {
            //reform date-field
            var dates = theValue.split('/'),
                datesValue = [],
                len = dates.length;

            for (var i = 0; i < len; i++) {
                var eachDate = dates[i];
                var dateParts = eachDate.split('-');
                var dateValue = [];
                var len2 = dateParts.length;
                for (var j = 0; j < len2; j++) {
                    var datePart = dateParts[j];
                    if (datePart != parseInt(datePart)) {
                        break;
                    }
                    dateValue[dateValue.length] = datePart;
                }
                datesValue[datesValue.length] = dateValue;
            }
            var valueList = {};
            var dateLen = datesValue[0].length;
            if (1 < datesValue.length) dateLen = Math.min(dateLen, datesValue[1].length);
            if (3 == dateLen) {
                theValue = datesValue[0].join('-');
                if (1 < datesValue.length) theValue += '/' + datesValue[1].join('-');
                valueList[typeName] = theValue;
            } else if ('date' == typeName) {
                var year = datesValue[0][0];
                if (1 < datesValue.length) year += '/' + datesValue[1][0];
                valueList.year = year;
                if (2 == dateLen) {
                    var month = datesValue[0][1];
                    if (1 < datesValue.length) month += '/' + datesValue[1][1];
                    valueList.month = month;
                }
            } else {
                if (dateLen < datesValue[0].length) datesValue[0].splice(dateLen);
                theValue = datesValue[0].join('-');
                if (1 < datesValue.length) {
                    if (dateLen < datesValue[1].length) datesValue[1].splice(dateLen);
                    theValue += '/' + datesValue[1].join('-');
                }
                valueList[typeName] = theValue;
            }
            return valueList;
        }
    }, {
        key: "_escapeTexSpecialChars",
        value: function _escapeTexSpecialChars(theValue, short) {
            if ('string' != typeof theValue) {
                return false;
            }
            var texChars = short ? _const.TexSpecialCharsShort : _const.TexSpecialChars;
            var len = texChars.length;
            for (var i = 0; i < len; i++) {
                theValue = theValue.replace(texChars[i][0], texChars[i][1]);
            }
            return theValue;
        }
    }, {
        key: "_htmlToLatex",
        value: function _htmlToLatex(theValue) {
            var el = document.createElement('div');
            el.innerHTML = theValue;
            var walker = this._htmlToLatexTreeWalker(el, "");
            return walker;
        }
    }, {
        key: "_htmlToLatexTreeWalker",
        value: function _htmlToLatexTreeWalker(el, outString) {
            if (el.nodeType === 3) {
                // Text node
                outString += this._escapeTexSpecialChars(el.nodeValue, false);
            } else if (el.nodeType === 1) {
                var braceEnd = "";
                if (jQuery(el).is('i')) {
                    outString += "\\emph{";
                    braceEnd = "}";
                } else if (jQuery(el).is('b')) {
                    outString += "\\textbf{";
                    braceEnd = "}";
                } else if (jQuery(el).is('sup')) {
                    outString += "$^{";
                    braceEnd = "}$";
                } else if (jQuery(el).is('sub')) {
                    outString += "$_{";
                    braceEnd = "}$";
                } else if (jQuery(el).is('span[class*="nocase"]')) {
                    outString += "{{";
                    braceEnd = "}}";
                } else if (jQuery(el).is('span[style*="small-caps"]')) {
                    outString += "\\textsc{";
                    braceEnd = "}";
                }
                for (var i = 0; i < el.childNodes.length; i++) {
                    outString = this._htmlToLatexTreeWalker(el.childNodes[i], outString);
                }
                outString += braceEnd;
            }
            return outString;
        }
    }, {
        key: "_getBibtexString",
        value: function _getBibtexString(biblist) {
            var len = biblist.length,
                str = '';
            for (var i = 0; i < len; i++) {
                if (0 < i) {
                    str += '\r\n\r\n';
                }
                var data = biblist[i];
                str += '@' + data.type + '{' + data.key;
                for (var vKey in data.values) {
                    str += ',\r\n' + vKey + ' = {' + data.values[vKey] + '}';
                }
                str += "\r\n}";
            }
            return str;
        }
    }, {
        key: "output",
        get: function get() {
            this.bibtexArray = [];
            this.bibtexStr = '';

            var len = this.pks.length;

            for (var i = 0; i < len; i++) {
                var pk = this.pks[i];
                var bib = this.bibDB[pk];
                var bibEntry = {
                    'type': _const2.BibTypes[bib['bib_type']]['biblatex'],
                    'key': bib['entry_key']
                };
                var fValues = {};
                for (var fKey in bib) {
                    if (!_const2.BibFieldTypes[fKey]) {
                        continue;
                    }
                    var fValue = bib[fKey];
                    if ("" === fValue) continue;
                    var fType = _const2.BibFieldTypes[fKey]['type'];
                    switch (fType) {
                        case 'f_date':
                            var dateParts = this._reformDate(fValue, fKey);
                            for (var datePart in dateParts) {
                                fValues[datePart] = dateParts[datePart];
                            }
                            break;
                        case 'f_literal':
                            fValue = this._htmlToLatex(fValue);
                            fValues[_const2.BibFieldTypes[fKey]['biblatex']] = fValue;
                            break;
                        default:
                            fValue = this._escapeTexSpecialChars(fValue, true);
                            fValues[_const2.BibFieldTypes[fKey]['biblatex']] = fValue;
                    }
                }
                bibEntry.values = fValues;
                this.bibtexArray[this.bibtexArray.length] = bibEntry;
            }
            this.bibtexStr = this._getBibtexString(this.bibtexArray);
            return this.bibtexStr;
        }
    }]);

    return BibLatexExporter;
}();

},{"../const":47,"./const":49}],49:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
// A much smaller list for export than for import, as biblatex does understand utf8
var TexSpecialChars = exports.TexSpecialChars = [[/\\/g, '\\textbackslash '], [/\{/g, '\\{ '], [/\}/g, '\\} '], [/&/g, '{\\&}'], [/%/g, '{\\%}'], [/\$/g, '{\\$}'], [/#/g, '{\\#}'], [/_/g, '{\\_}'], [/~/g, '{\\textasciitilde}'], [/\^/g, '{\\textasciicircum}']];

// Same list as above, but without braces which are present in name fields. TODO: get rid of this!
var TexSpecialCharsShort = exports.TexSpecialCharsShort = [[/\\/g, '\\textbackslash '], [/&/g, '{\\&}'], [/%/g, '{\\%}'], [/\$/g, '{\\$}'], [/#/g, '{\\#}'], [/_/g, '{\\_}'], [/~/g, '{\\textasciitilde}'], [/\^/g, '{\\textasciicircum}']];

},{}],50:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.CSLExporter = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _const = require('../const');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/** Converts a BibDB to a DB of the CSL type.
 * @param bibDB The bibliography database to convert.
 */

var CSLExporter = exports.CSLExporter = function () {
    function CSLExporter(bibDB, pks) {
        _classCallCheck(this, CSLExporter);

        this.bibDB = bibDB;
        if (pks) {
            this.pks = pks; // A list of pk values of the bibliography items to be exported.
        } else {
            this.pks = Object.keys(bibDB); // If none are selected, all keys are exporter
        }
        this.cslDB = {};
    }

    _createClass(CSLExporter, [{
        key: 'getCSLEntry',

        /** Converts one BibDB entry to CSL format.
         * @function getCSLEntry
         * @param id The id identifying the bibliography entry.
         */
        value: function getCSLEntry(id) {
            var bib = this.bibDB[id],
                cslOutput = {};

            for (var fKey in bib) {
                if (bib[fKey] !== '' && fKey in _const.BibFieldTypes && 'csl' in _const.BibFieldTypes[fKey]) {
                    var fType = _const.BibFieldTypes[fKey]['type'];
                    if ('f_date' == fType) {
                        cslOutput[_const.BibFieldTypes[fKey]['csl']] = this._reformDate(bib[fKey]);
                    } else if ('l_name' == fType) {
                        cslOutput[_const.BibFieldTypes[fKey]['csl']] = this._reformName(bib[fKey]);
                    } else {
                        cslOutput[_const.BibFieldTypes[fKey]['csl']] = bib[fKey];
                    }
                }
            }
            cslOutput['type'] = _const.BibTypes[bib.bib_type].csl;
            return cslOutput;
        }
    }, {
        key: '_reformDate',
        value: function _reformDate(theValue) {
            //reform date-field
            var dates = theValue.split('/'),
                datesValue = [],
                len = dates.length;
            for (var i = 0; i < len; i++) {
                var eachDate = dates[i];
                var dateParts = eachDate.split('-');
                var dateValue = [];
                var len2 = dateParts.length;
                for (var j = 0; j < len2; j++) {
                    var datePart = dateParts[j];
                    if (datePart != parseInt(datePart)) break;
                    dateValue[dateValue.length] = datePart;
                }
                datesValue[datesValue.length] = dateValue;
            }

            return {
                'date-parts': datesValue
            };
        }
    }, {
        key: '_reformName',
        value: function _reformName(theValue) {
            //reform name-field
            var names = theValue.substring(1, theValue.length - 1).split('} and {'),
                namesValue = [],
                len = names.length;
            for (var i = 0; i < len; i++) {
                var eachName = names[i];
                var nameParts = eachName.split('} {');
                var nameValue = void 0;
                if (nameParts.length > 1) {
                    nameValue = {
                        'family': nameParts[1].replace(/[{}]/g, ''),
                        'given': nameParts[0].replace(/[{}]/g, '')
                    };
                } else {
                    nameValue = {
                        'literal': nameParts[0].replace(/[{}]/g, '')
                    };
                }
                namesValue[namesValue.length] = nameValue;
            }

            return namesValue;
        }
    }, {
        key: 'output',
        get: function get() {
            for (var bibId in this.bibDB) {
                if (this.pks.indexOf(bibId) !== -1) {
                    this.cslDB[bibId] = this.getCSLEntry(bibId);
                    this.cslDB[bibId].id = bibId;
                }
            }
            return this.cslDB;
        }
    }]);

    return CSLExporter;
}();

},{"../const":47}],51:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.BibLatexParser = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _const = require("../const");

var _const2 = require("./const");

var _nameStringParser = require("./name-string-parser");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/** Parses files in BibTeX/BibLaTeX format
 * @function bibTexParser
 */

var BibLatexParser = exports.BibLatexParser = function () {
    function BibLatexParser(input) {
        _classCallCheck(this, BibLatexParser);

        this.input = input;
        this.pos = 0;
        this.entries = [];
        this.bibDB = {};
        this.currentKey = "";
        this.currentEntry = false;
        this.currentType = "";
        this.errors = [];
    }

    _createClass(BibLatexParser, [{
        key: "isWhitespace",
        value: function isWhitespace(s) {
            return s == ' ' || s == '\r' || s == '\t' || s == '\n';
        }
    }, {
        key: "match",
        value: function match(s) {
            this.skipWhitespace();
            if (this.input.substring(this.pos, this.pos + s.length) == s) {
                this.pos += s.length;
            } else {
                console.warn("Token mismatch, expected " + s + ", found " + this.input.substring(this.pos));
            }
            this.skipWhitespace();
        }
    }, {
        key: "tryMatch",
        value: function tryMatch(s) {
            this.skipWhitespace();
            if (this.input.substring(this.pos, this.pos + s.length) == s) {
                return true;
            } else {
                return false;
            }
            this.skipWhitespace();
        }
    }, {
        key: "skipWhitespace",
        value: function skipWhitespace() {
            while (this.isWhitespace(this.input[this.pos])) {
                this.pos++;
            }
            if (this.input[this.pos] == "%") {
                while (this.input[this.pos] != "\n") {
                    this.pos++;
                }
                this.skipWhitespace();
            }
        }
    }, {
        key: "skipToNext",
        value: function skipToNext() {
            while (this.input.length > this.pos && this.input[this.pos] != "@") {
                this.pos++;
            }
            if (this.input.length == this.pos) {
                return false;
            } else {
                return true;
            }
        }
    }, {
        key: "valueBraces",
        value: function valueBraces() {
            var bracecount = 0;
            this.match("{");
            var start = this.pos;
            while (true) {
                if (this.input[this.pos] == '}' && this.input[this.pos - 1] != '\\') {
                    if (bracecount > 0) {
                        bracecount--;
                    } else {
                        var end = this.pos;
                        this.match("}");
                        return this.input.substring(start, end);
                    }
                } else if (this.input[this.pos] == '{' && this.input[this.pos - 1] != '\\') {
                    bracecount++;
                } else if (this.pos == this.input.length - 1) {
                    console.warn("Unterminated value");
                }
                this.pos++;
            }
        }
    }, {
        key: "valueQuotes",
        value: function valueQuotes() {
            this.match('"');
            var start = this.pos;
            while (true) {
                if (this.input[this.pos] == '"' && this.input[this.pos - 1] != '\\') {
                    var end = this.pos;
                    this.match('"');
                    return this.input.substring(start, end);
                } else if (this.pos == this.input.length - 1) {
                    console.warn("Unterminated value:" + this.input.substring(start));
                }
                this.pos++;
            }
        }
    }, {
        key: "singleValue",
        value: function singleValue() {
            var start = this.pos;
            if (this.tryMatch("{")) {
                return this.valueBraces();
            } else if (this.tryMatch('"')) {
                return this.valueQuotes();
            } else {
                var k = this.key();
                if (_const2.MONTH_ABBREVS[k.toUpperCase()]) {
                    return _const2.MONTH_ABBREVS[k.toUpperCase()];
                } else if (k.match("^[0-9]+$")) {
                    return k;
                } else {
                    console.warn("Value unexpected:" + this.input.substring(start));
                }
            }
        }
    }, {
        key: "value",
        value: function value() {
            var values = [];
            values.push(this.singleValue());
            while (this.tryMatch("#")) {
                this.match("#");
                values.push(this.singleValue());
            }
            return values.join("");
        }
    }, {
        key: "key",
        value: function key() {
            var start = this.pos;
            while (true) {
                if (this.pos == this.input.length) {
                    console.warn("Runaway key");
                    return;
                }
                if (this.input[this.pos].match("[a-zA-Z0-9_:;`\\.\\\?+/-]")) {
                    this.pos++;
                } else {
                    return this.input.substring(start, this.pos).toLowerCase();
                }
            }
        }
    }, {
        key: "keyEqualsValue",
        value: function keyEqualsValue() {
            var key = this.key();
            if (this.tryMatch("=")) {
                this.match("=");
                var val = this.value();
                return [key, val];
            } else {
                console.warn("... = value expected, equals sign missing: " + this.input.substring(this.pos));
            }
        }
    }, {
        key: "keyValueList",
        value: function keyValueList() {
            var kv = this.keyEqualsValue();
            if (typeof kv === 'undefined') {
                // Entry has no fields, so we delete it.
                // It was the last one pushed, so we remove the last one
                this.entries.pop();
                return;
            }
            this.currentEntry['fields'][kv[0]] = this.scanBibtexString(kv[1]);
            // date may come either as year, year + month or as date field.
            // We therefore need to catch these hear and transform it to the
            // date field after evaluating all the fields.
            // All other date fields only come in the form of a date string.
            var date = {};
            while (this.tryMatch(",")) {
                this.match(",");
                //fixes problems with commas at the end of a list
                if (this.tryMatch("}")) {
                    break;
                }
                kv = this.keyEqualsValue();
                if (typeof kv === 'undefined') {
                    this.errors.push({ type: 'variable_error' });
                    break;
                }
                var val = this.scanBibtexString(kv[1]);
                switch (kv[0]) {
                    case 'date':
                    case 'month':
                    case 'year':
                        date[kv[0]] = val;
                        break;
                    default:
                        this.currentEntry['fields'][kv[0]] = val;
                }
            }
            if (date.date) {
                // date string has precedence.
                this.currentEntry['fields']['date'] = date.date;
            } else if (date.year && date.month) {
                this.currentEntry['fields']['date'] = date.year + "-" + date.month;
            } else if (date.year) {
                this.currentEntry['fields']['date'] = "" + date.year;
            }

            for (var fKey in this.currentEntry['fields']) {
                // Replace alias fields with their main term.
                if (_const2.BiblatexFieldAliasTypes[fKey]) {
                    var value = this.currentEntry['fields'][fKey];
                    delete this.currentEntry['fields'][fKey];
                    fKey = _const2.BiblatexFieldAliasTypes[fKey];
                    this.currentEntry['fields'][fKey] = value;
                }
                var field = _const.BibFieldTypes[fKey];

                if ('undefined' == typeof field) {
                    this.errors.push({
                        type: 'unknown_field',
                        entry: this.currentEntry['entry_key'],
                        field_name: fKey
                    });
                    delete this.currentEntry['fields'][fKey];
                    continue;
                }
                var fType = field['type'];
                var fValue = this.currentEntry['fields'][fKey];
                switch (fType) {
                    case 'l_name':
                        this.currentEntry['fields'][fKey] = this.reformNameList(fValue);
                        break;
                    case 'f_date':
                        this.currentEntry['fields'][fKey] = this.reformDate(fValue);
                        break;
                    case 'f_literal':
                        this.currentEntry['fields'][fKey] = this.reformLiteral(fValue);
                        break;
                }
            }
        }
    }, {
        key: "reformNameList",
        value: function reformNameList(nameString) {
            var nameStringParser = new _nameStringParser.BibLatexNameStringParser(nameString);
            return nameStringParser.output.join(' and ');
        }
    }, {
        key: "reformDate",
        value: function reformDate(dateStr) {
            // TODO: handle start/end dates
            dateStr = dateStr.replace(/-AA/g, '');
            var dateFormat = '%Y-AA-AA';
            var dateLen = dateStr.split(/[\s,\./\-]/g).length;
            if (2 < dateLen) {
                dateFormat = '%Y-%m-%d';
            } else if (2 === dateLen) {
                dateFormat = '%Y-%m-AA';
            }
            var theDate = new Date(dateStr);
            if ('Invalid Date' == theDate) {
                dateFormat = '';
            } else {
                dateFormat = dateFormat.replace('%d', ("0" + theDate.getDate()).slice(-2));
                dateFormat = dateFormat.replace('%m', ("0" + (theDate.getMonth() + 1)).slice(-2));
                dateFormat = dateFormat.replace('%Y', theDate.getFullYear());
            }
            return dateFormat;
        }
    }, {
        key: "reformLiteral",
        value: function reformLiteral(theValue) {
            var openBraces = (theValue.match(/\{/g) || []).length,
                closeBraces = (theValue.match(/\}/g) || []).length;
            if (openBraces === 0 && closeBraces === 0) {
                // There are no braces, return the original value
                return theValue;
            } else if (openBraces != closeBraces) {
                // There are different amount of open and close braces, so we return the original string.
                return theValue;
            } else {
                // There are the same amount of open and close braces, but we don't know if they are in the right order.
                var braceLevel = 0,
                    len = theValue.length,
                    i = 0,
                    output = '',
                    braceClosings = [],
                    inCasePreserve = false;

                var latexCommands = [['\\textbf{', '<b>', '</b>'], ['\\textit{', '<i>', '</i>'], ['\\emph{', '<i>', '</i>'], ['\\textsc{', '<span style="font-variant:small-caps;">', '</span>']];
                parseString: while (i < len) {
                    if (theValue[i] === '\\') {
                        var _iteratorNormalCompletion = true;
                        var _didIteratorError = false;
                        var _iteratorError = undefined;

                        try {

                            for (var _iterator = latexCommands[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                                var s = _step.value;

                                if (theValue.substring(i, i + s[0].length) === s[0]) {
                                    braceLevel++;
                                    i += s[0].length;
                                    output += s[1];
                                    braceClosings.push(s[2]);
                                    continue parseString;
                                }
                            }
                        } catch (err) {
                            _didIteratorError = true;
                            _iteratorError = err;
                        } finally {
                            try {
                                if (!_iteratorNormalCompletion && _iterator.return) {
                                    _iterator.return();
                                }
                            } finally {
                                if (_didIteratorError) {
                                    throw _iteratorError;
                                }
                            }
                        }

                        if (i + 1 < len) {
                            i += 2;
                            output += theValue[i + 1];
                            continue parseString;
                        }
                    }
                    if (theValue[i] === '_' && theValue.substring(i, i + 2) === '_{') {
                        braceLevel++;
                        i += 2;
                        output = +'<sub>';
                        braceClosings.push('</sub>');
                    }
                    if (theValue[i] === '^' && theValue.substring(i, i + 2) === '^{') {
                        braceLevel++;
                        i += 2;
                        output = +'<sup>';
                        braceClosings.push('</sup>');
                    }
                    if (theValue[i] === '{') {
                        braceLevel++;
                        if (inCasePreserve) {
                            // If already inside case preservation, do not add a second
                            braceClosings.push('');
                        } else {
                            inCasePreserve = braceLevel;
                            output += '<span class="nocase">';
                            braceClosings.push('</span>');
                        }
                        i++;
                        continue parseString;
                    }
                    if (theValue[i] === '}') {
                        if (inCasePreserve === braceLevel) {
                            inCasePreserve = false;
                        }
                        braceLevel--;
                        if (braceLevel > -1) {
                            output += braceClosings.pop();
                            i++;
                            continue parseString;
                        }
                    }
                    if (braceLevel < 0) {
                        // A brace was closed before it was opened. Abort and return the original string.
                        return theValue;
                    }
                    // math env, just remove
                    if (theValue[i] === '$') {
                        i++;
                        continue parseString;
                    }
                    if (theValue[i] === '<') {
                        output += "&lt;";
                        i++;
                        continue parseString;
                    }
                    if (theValue[i] === '>') {
                        output += "&gt;";
                        i++;
                        continue parseString;
                    }
                    output += theValue[i];
                    i++;
                }

                if (braceLevel > 0) {
                    // Too many opening braces, we return the original string.
                    return theValue;
                }
                // Braces were accurate.
                return output;
            }
        }
    }, {
        key: "bibType",
        value: function bibType() {
            var biblatexType = this.currentType;
            if (_const2.BiblatexAliasTypes[biblatexType]) {
                biblatexType = _const2.BiblatexAliasTypes[biblatexType];
            }

            var bibType = '';
            Object.keys(_const.BibTypes).forEach(function (bType) {
                if (_const.BibTypes[bType]['biblatex'] === biblatexType) {
                    bibType = bType;
                }
            });

            if (bibType === '') {
                this.errors.push({
                    type: 'unknown_type',
                    type_name: biblatexType
                });
                bibType = 'misc';
            }

            return bibType;
        }
    }, {
        key: "newEntry",
        value: function newEntry() {
            this.currentEntry = {
                'bib_type': this.bibType(),
                'entry_key': this.key(),
                'fields': {}
            };
            this.entries.push(this.currentEntry);
            this.match(",");
            this.keyValueList();
        }
    }, {
        key: "directive",
        value: function directive() {
            this.match("@");
            this.currentType = this.key();
            return "@" + this.currentType;
        }
    }, {
        key: "string",
        value: function string() {
            var kv = this.keyEqualsValue();
            _const2.MONTH_ABBREVS[kv[0].toUpperCase()] = kv[1];
        }
    }, {
        key: "preamble",
        value: function preamble() {
            this.value();
        }
    }, {
        key: "scanBibtexString",
        value: function scanBibtexString(value) {
            var len = _const2.TexSpecialChars.length;
            for (var i = 0; i < len; i++) {
                var texChar = _const2.TexSpecialChars[i];
                var texCharRegExp = new window.RegExp(texChar[0], 'g');
                value = value.replace(texCharRegExp, texChar[1]);
            }
            // Delete multiple spaces
            value = value.replace(/ +(?= )/g, '');
            return value;
        }
    }, {
        key: "output",
        get: function get() {
            while (this.skipToNext()) {
                var d = this.directive();
                this.match("{");
                if (d == "@string") {
                    this.string();
                } else if (d == "@preamble") {
                    this.preamble();
                } else if (d == "@comment") {
                    continue;
                } else {
                    this.newEntry();
                }
                this.match("}");
            }
            return this.entries;
        }
    }]);

    return BibLatexParser;
}();

},{"../const":47,"./const":52,"./name-string-parser":53}],52:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var MONTH_NAMES = exports.MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

var MONTH_ABBREVS = exports.MONTH_ABBREVS = {
    JAN: "January",
    FEB: "February",
    MAR: "March",
    APR: "April",
    MAY: "May",
    JUN: "June",
    JUL: "July",
    AUG: "August",
    SEP: "September",
    OCT: "October",
    NOV: "November",
    DEC: "December"
};

/** A list of all field aliases and what they refer to. */
var BiblatexFieldAliasTypes = exports.BiblatexFieldAliasTypes = {
    'address': 'location',
    'annote': 'annotation',
    'archiveprefix': 'eprinttype',
    'journal': 'journaltitle',
    'pdf': 'file',
    'primaryclass': 'eprintclass',
    'school': 'institution'
};

/** A list of all bibentry aliases and what they refer to. */
var BiblatexAliasTypes = exports.BiblatexAliasTypes = {
    'conference': 'inproceedings',
    'electronic': 'online',
    'mastersthesis': 'thesis',
    'phdthesis': 'thesis',
    'techreport': 'thesis',
    'www': 'online'
};

/** A list of special chars in Tex and their unicode equivalent. */
var TexSpecialChars = exports.TexSpecialChars = [["{---}", '—'], ["{\\textexclamdown}", '¡'], ["{\\textcent}", '¢'], ["{\\textsterling}", '£'], ["{\\textyen}", '¥'], ["{\\textbrokenbar}", '¦'], ["{\\textsection}", '§'], ["{\\textasciidieresis}", '¨'], ["{\\textcopyright}", '©'], ["{\\textordfeminine}", 'ª'], ["{\\guillemotleft}", '«'], ["{\\textlnot}", '¬'], ["{\\textregistered}", '®'], ["{\\textasciimacron}", '¯'], ["{\\textdegree}", '°'], ["{\\textpm}", '±'], ["{\\texttwosuperior}", '²'], ["{\\textthreesuperior}", '³'], ["{\\textasciiacute}", '´'], ["{\\textmu}", 'µ'], ["{\\textparagraph}", '¶'], ["{\\textperiodcentered}", '·'], ["{\\c\\ }", '¸'], ["{\\textonesuperior}", '¹'], ["{\\textordmasculine}", 'º'], ["{\\guillemotright}", '»'], ["{\\textonequarter}", '¼'], ["{\\textonehalf}", '½'], ["{\\textthreequarters}", '¾'], ["{\\textquestiondown}", '¿'], ["{\\AE}", 'Æ'], ["{\\DH}", 'Ð'], ["{\\texttimes}", '×'], ["{\\TH}", 'Þ'], ["{\\ss}", 'ß'], ["{\\ae}", 'æ'], ["{\\dh}", 'ð'], ["{\\textdiv}", '÷'], ["{\\th}", 'þ'], ["{\\i}", 'ı'], ["{\\NG}", 'Ŋ'], ["{\\ng}", 'ŋ'], ["{\\OE}", 'Œ'], ["{\\oe}", 'œ'], ["{\\textasciicircum}", 'ˆ'], ["{\\~}", '˜'], ["{\\textacutedbl}", '˝'], ["{\\textendash}", '–'], ["{\\textemdash}", '—'], ["{\\textemdash}", '―'], ["{\\textbardbl}", '‖'], ["{\\textunderscore}", '‗'], ["{\\textquoteleft}", '‘'], ["{\\textquoteright}", '’'], ["{\\quotesinglbase}", '‚'], ["{\\textquotedblleft}", '“'], ["{\\textquotedblright}", '”'], ["{\\quotedblbase}", '„'], ["{\\quotedblbase}", '‟'], ["{\\textdagger}", '†'], ["{\\textdaggerdbl}", '‡'], ["{\\textbullet}", '•'], ["{\\textellipsis}", '…'], ["{\\textperthousand}", '‰'], ["{\\guilsinglleft}", '‹'], ["{\\guilsinglright}", '›'], ["{\\textfractionsolidus}", '⁄'], ["{\\texteuro}", '€'], ["{\\textcelsius}", '℃'], ["{\\textnumero}", '№'], ["{\\textcircledP}", '℗'], ["{\\textservicemark}", '℠'], ["{\\texttrademark}", '™'], ["{\\textohm}", 'Ω'], ["{\\textestimated}", '℮'], ["{\\textleftarrow}", '←'], ["{\\textuparrow}", '↑'], ["{\\textrightarrow}", '→'], ["{\\textdownarrow}", '↓'], ["{\\infty}", '∞'], ["{\\~}", '∼'], ["{\\#}", '⋕'], ["{\\textlangle}", '〈'], ["{\\textrangle}", '〉'], ["{\\textvisiblespace}", '␣'], ["{\\textopenbullet}", '◦'], ["{\\%<}", '✁'], ["{\\`A}", 'À'], ["{\\'A}", 'Á'], ["{\\^A}", 'Â'], ["{\\~A}", 'Ã'], ["{\\\"A}", 'Ä'], ["{\\rA}", 'Å'], ["{\\cC}", 'Ç'], ["{\\`E}", 'È'], ["{\\'E}", 'É'], ["{\\^E}", 'Ê'], ["{\\\"E}", 'Ë'], ["{\\`I}", 'Ì'], ["{\\'I}", 'Í'], ["{\\^I}", 'Î'], ["{\\\"I}", 'Ï'], ["{\\~N}", 'Ñ'], ["{\\`O}", 'Ò'], ["{\\'O}", 'Ó'], ["{\\^O}", 'Ô'], ["{\\~O}", 'Õ'], ["{\\\"O}", 'Ö'], ["{\\`U}", 'Ù'], ["{\\'U}", 'Ú'], ["{\\^U}", 'Û'], ["{\\\"U}", 'Ü'], ["{\\'Y}", 'Ý'], ["{\\`a}", 'à'], ["{\\'a}", 'á'], ["{\\^a}", 'â'], ["{\\~a}", 'ã'], ["{\\\"a}", 'ä'], ["{\\ra}", 'å'], ["{\\cc}", 'ç'], ["{\\`e}", 'è'], ["{\\'e}", 'é'], ["{\\^e}", 'ê'], ["{\\\"e}", 'ë'], ["{\\`i}", 'ì'], ["{\\'i}", 'í'], ["{\\^i}", 'î'], ["{\\\"i}", 'ï'], ["{\\~n}", 'ñ'], ["{\\`o}", 'ò'], ["{\\'o}", 'ó'], ["{\\^o}", 'ô'], ["{\\~o}", 'õ'], ["{\\\"o}", 'ö'], ["{\\`u}", 'ù'], ["{\\'u}", 'ú'], ["{\\^u}", 'û'], ["{\\\"u}", 'ü'], ["{\\'y}", 'ý'], ["{\\\"y}", 'ÿ'], ["{\\=A}", 'Ā'], ["{\\=a}", 'ā'], ["{\\uA}", 'Ă'], ["{\\ua}", 'ă'], ["{\\kA}", 'Ą'], ["{\\ka}", 'ą'], ["{\\'C}", 'Ć'], ["{\\'c}", 'ć'], ["{\\^C}", 'Ĉ'], ["{\\^c}", 'ĉ'], ["{\\.C}", 'Ċ'], ["{\\.c}", 'ċ'], ["{\\vC}", 'Č'], ["{\\vc}", 'č'], ["{\\vD}", 'Ď'], ["{\\vd}", 'ď'], ["{\\=E}", 'Ē'], ["{\\=e}", 'ē'], ["{\\uE}", 'Ĕ'], ["{\\ue}", 'ĕ'], ["{\\.E}", 'Ė'], ["{\\.e}", 'ė'], ["{\\kE}", 'Ę'], ["{\\ke}", 'ę'], ["{\\vE}", 'Ě'], ["{\\ve}", 'ě'], ["{\\^G}", 'Ĝ'], ["{\\^g}", 'ĝ'], ["{\\uG}", 'Ğ'], ["{\\ug}", 'ğ'], ["{\\.G}", 'Ġ'], ["{\\.g}", 'ġ'], ["{\\cG}", 'Ģ'], ["{\\cg}", 'ģ'], ["{\\^H}", 'Ĥ'], ["{\\^h}", 'ĥ'], ["{\\~I}", 'Ĩ'], ["{\\~i}", 'ĩ'], ["{\\=I}", 'Ī'], ["{\\=i}", 'ī'], ["{\\uI}", 'Ĭ'], ["{\\ui}", 'ĭ'], ["{\\kI}", 'Į'], ["{\\ki}", 'į'], ["{\\.I}", 'İ'], ["{\\^J}", 'Ĵ'], ["{\\^j}", 'ĵ'], ["{\\cK}", 'Ķ'], ["{\\ck}", 'ķ'], ["{\\'L}", 'Ĺ'], ["{\\'l}", 'ĺ'], ["{\\cL}", 'Ļ'], ["{\\cl}", 'ļ'], ["{\\vL}", 'Ľ'], ["{\\vl}", 'ľ'], ["\\\\L{}", 'Ł'], ["\\\\l{}", 'ł'], ["{\\'N}", 'Ń'], ["{\\'n}", 'ń'], ["{\\cN}", 'Ņ'], ["{\\cn}", 'ņ'], ["{\\vN}", 'Ň'], ["{\\vn}", 'ň'], ["{\\=O}", 'Ō'], ["{\\=o}", 'ō'], ["{\\uO}", 'Ŏ'], ["{\\uo}", 'ŏ'], ["{\\HO}", 'Ő'], ["{\\Ho}", 'ő'], ["{\\'R}", 'Ŕ'], ["{\\'r}", 'ŕ'], ["{\\cR}", 'Ŗ'], ["{\\cr}", 'ŗ'], ["{\\vR}", 'Ř'], ["{\\vr}", 'ř'], ["{\\'S}", 'Ś'], ["{\\'s}", 'ś'], ["{\\^S}", 'Ŝ'], ["{\\^s}", 'ŝ'], ["{\\cS}", 'Ş'], ["{\\cs}", 'ş'], ["{\\vS}", 'Š'], ["{\\vs}", 'š'], ["{\\cT}", 'Ţ'], ["{\\ct}", 'ţ'], ["{\\vT}", 'Ť'], ["{\\vt}", 'ť'], ["{\\~U}", 'Ũ'], ["{\\~u}", 'ũ'], ["{\\=U}", 'Ū'], ["{\\=u}", 'ū'], ["{\\uU}", 'Ŭ'], ["{\\uu}", 'ŭ'], ["{\\HU}", 'Ű'], ["{\\Hu}", 'ű'], ["{\\kU}", 'Ų'], ["{\\ku}", 'ų'], ["{\\^W}", 'Ŵ'], ["{\\^w}", 'ŵ'], ["{\\^Y}", 'Ŷ'], ["{\\^y}", 'ŷ'], ["{\\\"Y}", 'Ÿ'], ["{\\'Z}", 'Ź'], ["{\\'z}", 'ź'], ["{\\.Z}", 'Ż'], ["{\\.z}", 'ż'], ["{\\vZ}", 'Ž'], ["{\\vz}", 'ž'], ["{\\vA}", 'Ǎ'], ["{\\va}", 'ǎ'], ["{\\vI}", 'Ǐ'], ["{\\vi}", 'ǐ'], ["{\\vO}", 'Ǒ'], ["{\\vo}", 'ǒ'], ["{\\vU}", 'Ǔ'], ["{\\vu}", 'ǔ'], ["{\\vG}", 'Ǧ'], ["{\\vg}", 'ǧ'], ["{\\vK}", 'Ǩ'], ["{\\vk}", 'ǩ'], ["{\\kO}", 'Ǫ'], ["{\\ko}", 'ǫ'], ["{\\vj}", 'ǰ'], ["{\\'G}", 'Ǵ'], ["{\\'g}", 'ǵ'], ["{\\.B}", 'Ḃ'], ["{\\.b}", 'ḃ'], ["{\\dB}", 'Ḅ'], ["{\\db}", 'ḅ'], ["{\\bB}", 'Ḇ'], ["{\\bb}", 'ḇ'], ["{\\.D}", 'Ḋ'], ["{\\.d}", 'ḋ'], ["{\\dD}", 'Ḍ'], ["{\\dd}", 'ḍ'], ["{\\bD}", 'Ḏ'], ["{\\bd}", 'ḏ'], ["{\\cD}", 'Ḑ'], ["{\\cd}", 'ḑ'], ["{\\.F}", 'Ḟ'], ["{\\.f}", 'ḟ'], ["{\\=G}", 'Ḡ'], ["{\\=g}", 'ḡ'], ["{\\.H}", 'Ḣ'], ["{\\.h}", 'ḣ'], ["{\\dH}", 'Ḥ'], ["{\\dh}", 'ḥ'], ["{\\\"H}", 'Ḧ'], ["{\\\"h}", 'ḧ'], ["{\\cH}", 'Ḩ'], ["{\\ch}", 'ḩ'], ["{\\'K}", 'Ḱ'], ["{\\'k}", 'ḱ'], ["{\\dK}", 'Ḳ'], ["{\\dk}", 'ḳ'], ["{\\bK}", 'Ḵ'], ["{\\bk}", 'ḵ'], ["{\\dL}", 'Ḷ'], ["{\\dl}", 'ḷ'], ["{\\bL}", 'Ḻ'], ["{\\bl}", 'ḻ'], ["{\\'M}", 'Ḿ'], ["{\\'m}", 'ḿ'], ["{\\.M}", 'Ṁ'], ["{\\.m}", 'ṁ'], ["{\\dM}", 'Ṃ'], ["{\\dm}", 'ṃ'], ["{\\.N}", 'Ṅ'], ["{\\.n}", 'ṅ'], ["{\\dN}", 'Ṇ'], ["{\\dn}", 'ṇ'], ["{\\bN}", 'Ṉ'], ["{\\bn}", 'ṉ'], ["{\\'P}", 'Ṕ'], ["{\\'p}", 'ṕ'], ["{\\.P}", 'Ṗ'], ["{\\.p}", 'ṗ'], ["{\\.R}", 'Ṙ'], ["{\\.r}", 'ṙ'], ["{\\dR}", 'Ṛ'], ["{\\dr}", 'ṛ'], ["{\\bR}", 'Ṟ'], ["{\\br}", 'ṟ'], ["{\\.S}", 'Ṡ'], ["{\\.s}", 'ṡ'], ["{\\dS}", 'Ṣ'], ["{\\ds}", 'ṣ'], ["{\\.T}", 'Ṫ'], ["{\\.t}", 'ṫ'], ["{\\dT}", 'Ṭ'], ["{\\dt}", 'ṭ'], ["{\\bT}", 'Ṯ'], ["{\\bt}", 'ṯ'], ["{\\~V}", 'Ṽ'], ["{\\~v}", 'ṽ'], ["{\\dV}", 'Ṿ'], ["{\\dv}", 'ṿ'], ["{\\`W}", 'Ẁ'], ["{\\`w}", 'ẁ'], ["{\\'W}", 'Ẃ'], ["{\\'w}", 'ẃ'], ["{\\\"W}", 'Ẅ'], ["{\\\"w}", 'ẅ'], ["{\\.W}", 'Ẇ'], ["{\\.w}", 'ẇ'], ["{\\dW}", 'Ẉ'], ["{\\dw}", 'ẉ'], ["{\\.X}", 'Ẋ'], ["{\\.x}", 'ẋ'], ["{\\\"X}", 'Ẍ'], ["{\\\"x}", 'ẍ'], ["{\\.Y}", 'Ẏ'], ["{\\.y}", 'ẏ'], ["{\\^Z}", 'Ẑ'], ["{\\^z}", 'ẑ'], ["{\\dZ}", 'Ẓ'], ["{\\dz}", 'ẓ'], ["{\\bZ}", 'Ẕ'], ["{\\bz}", 'ẕ'], ["{\\bh}", 'ẖ'], ["{\\\"t}", 'ẗ'], ["{\\dA}", 'Ạ'], ["{\\da}", 'ạ'], ["{\\dE}", 'Ẹ'], ["{\\de}", 'ẹ'], ["{\\~E}", 'Ẽ'], ["{\\~e}", 'ẽ'], ["{\\dI}", 'Ị'], ["{\\di}", 'ị'], ["{\\dO}", 'Ọ'], ["{\\do}", 'ọ'], ["{\\dU}", 'Ụ'], ["{\\du}", 'ụ'], ["{\\`Y}", 'Ỳ'], ["{\\`y}", 'ỳ'], ["{\\dY}", 'Ỵ'], ["{\\dy}", 'ỵ'], ["{\\~Y}", 'Ỹ'], ["{\\~y}", 'ỹ'], ["{\\pounds}", '£'], ["{\\glqq}", '„'], ["{\\grqq}", '“'], ["{\\`{A}}", 'À'], ["{\\'{A}}", 'Á'], ["{\\^{A}}", 'Â'], ["{\\~{A}}", 'Ã'], ["{\\\"{A}}", 'Ä'], ["{\\r{A}}", 'Å'], ["{\\c{C}}", 'Ç'], ["{\\`{E}}", 'È'], ["{\\'{E}}", 'É'], ["{\\^{E}}", 'Ê'], ["{\\\"{E}}", 'Ë'], ["{\\`{I}}", 'Ì'], ["{\\'{I}}", 'Í'], ["{\\^{I}}", 'Î'], ["{\\\"{I}}", 'Ï'], ["{\\~{N}}", 'Ñ'], ["{\\`{O}}", 'Ò'], ["{\\'{O}}", 'Ó'], ["{\\^{O}}", 'Ô'], ["{\\~{O}}", 'Õ'], ["{\\\"{O}}", 'Ö'], ["{\\`{U}}", 'Ù'], ["{\\'{U}}", 'Ú'], ["{\\^{U}}", 'Û'], ["{\\\"{U}}", 'Ü'], ["{\\'{Y}}", 'Ý'], ["{\\`{a}}", 'à'], ["{\\'{a}}", 'á'], ["{\\^{a}}", 'â'], ["{\\~{a}}", 'ã'], ["{\\\"{a}}", 'ä'], ["{\\r{a}}", 'å'], ["{\\c{c}}", 'ç'], ["{\\`{e}}", 'è'], ["{\\'{e}}", 'é'], ["{\\^{e}}", 'ê'], ["{\\\"{e}}", 'ë'], ["{\\`{i}}", 'ì'], ["{\\'{i}}", 'í'], ["{\\^{i}}", 'î'], ["{\\\"{i}}", 'ï'], ["{\\~{n}}", 'ñ'], ["{\\`{o}}", 'ò'], ["{\\'{o}}", 'ó'], ["{\\^{o}}", 'ô'], ["{\\~{o}}", 'õ'], ["{\\\"{o}}", 'ö'], ["{\\`{u}}", 'ù'], ["{\\'{u}}", 'ú'], ["{\\^{u}}", 'û'], ["{\\\"{u}}", 'ü'], ["{\\'{y}}", 'ý'], ["{\\\"{y}}", 'ÿ'], ["{\\={A}}", 'Ā'], ["{\\={a}}", 'ā'], ["{\\u{A}}", 'Ă'], ["{\\u{a}}", 'ă'], ["{\\k{A}}", 'Ą'], ["{\\k{a}}", 'ą'], ["{\\'{C}}", 'Ć'], ["{\\'{c}}", 'ć'], ["{\\^{C}}", 'Ĉ'], ["{\\^{c}}", 'ĉ'], ["{\\.{C}}", 'Ċ'], ["{\\.{c}}", 'ċ'], ["{\\v{C}}", 'Č'], ["{\\v{c}}", 'č'], ["{\\v{D}}", 'Ď'], ["{\\v{d}}", 'ď'], ["{\\={E}}", 'Ē'], ["{\\={e}}", 'ē'], ["{\\u{E}}", 'Ĕ'], ["{\\u{e}}", 'ĕ'], ["{\\.{E}}", 'Ė'], ["{\\.{e}}", 'ė'], ["{\\k{E}}", 'Ę'], ["{\\k{e}}", 'ę'], ["{\\v{E}}", 'Ě'], ["{\\v{e}}", 'ě'], ["{\\^{G}}", 'Ĝ'], ["{\\^{g}}", 'ĝ'], ["{\\u{G}}", 'Ğ'], ["{\\u{g}}", 'ğ'], ["{\\.{G}}", 'Ġ'], ["{\\.{g}}", 'ġ'], ["{\\c{G}}", 'Ģ'], ["{\\c{g}}", 'ģ'], ["{\\^{H}}", 'Ĥ'], ["{\\^{h}}", 'ĥ'], ["{\\~{I}}", 'Ĩ'], ["{\\~{i}}", 'ĩ'], ["{\\={I}}", 'Ī'], ["{\\={i}}", 'ī'], ["{\\u{I}}", 'Ĭ'], ["{\\u{i}}", 'ĭ'], ["{\\k{I}}", 'Į'], ["{\\k{i}}", 'į'], ["{\\.{I}}", 'İ'], ["{\\^{J}}", 'Ĵ'], ["{\\^{j}}", 'ĵ'], ["{\\c{K}}", 'Ķ'], ["{\\c{k}}", 'ķ'], ["{\\'{L}}", 'Ĺ'], ["{\\'{l}}", 'ĺ'], ["{\\c{L}}", 'Ļ'], ["{\\c{l}}", 'ļ'], ["{\\v{L}}", 'Ľ'], ["{\\v{l}}", 'ľ'], ["{\\L{}}", 'Ł'], ["{\\l{}}", 'ł'], ["{\\'{N}}", 'Ń'], ["{\\'{n}}", 'ń'], ["{\\c{N}}", 'Ņ'], ["{\\c{n}}", 'ņ'], ["{\\v{N}}", 'Ň'], ["{\\v{n}}", 'ň'], ["{\\={O}}", 'Ō'], ["{\\={o}}", 'ō'], ["{\\u{O}}", 'Ŏ'], ["{\\u{o}}", 'ŏ'], ["{\\H{O}}", 'Ő'], ["{\\H{o}}", 'ő'], ["{\\'{R}}", 'Ŕ'], ["{\\'{r}}", 'ŕ'], ["{\\c{R}}", 'Ŗ'], ["{\\c{r}}", 'ŗ'], ["{\\v{R}}", 'Ř'], ["{\\v{r}}", 'ř'], ["{\\'{S}}", 'Ś'], ["{\\'{s}}", 'ś'], ["{\\^{S}}", 'Ŝ'], ["{\\^{s}}", 'ŝ'], ["{\\c{S}}", 'Ş'], ["{\\c{s}}", 'ş'], ["{\\v{S}}", 'Š'], ["{\\v{s}}", 'š'], ["{\\c{T}}", 'Ţ'], ["{\\c{t}}", 'ţ'], ["{\\v{T}}", 'Ť'], ["{\\v{t}}", 'ť'], ["{\\~{U}}", 'Ũ'], ["{\\~{u}}", 'ũ'], ["{\\={U}}", 'Ū'], ["{\\={u}}", 'ū'], ["{\\u{U}}", 'Ŭ'], ["{\\u{u}}", 'ŭ'], ["{\\H{U}}", 'Ű'], ["{\\H{u}}", 'ű'], ["{\\k{U}}", 'Ų'], ["{\\k{u}}", 'ų'], ["{\\^{W}}", 'Ŵ'], ["{\\^{w}}", 'ŵ'], ["{\\^{Y}}", 'Ŷ'], ["{\\^{y}}", 'ŷ'], ["{\\\"{Y}}", 'Ÿ'], ["{\\'{Z}}", 'Ź'], ["{\\'{z}}", 'ź'], ["{\\.{Z}}", 'Ż'], ["{\\.{z}}", 'ż'], ["{\\v{Z}}", 'Ž'], ["{\\v{z}}", 'ž'], ["{\\v{A}}", 'Ǎ'], ["{\\v{a}}", 'ǎ'], ["{\\v{I}}", 'Ǐ'], ["{\\v{i}}", 'ǐ'], ["{\\v{O}}", 'Ǒ'], ["{\\v{o}}", 'ǒ'], ["{\\v{U}}", 'Ǔ'], ["{\\v{u}}", 'ǔ'], ["{\\v{G}}", 'Ǧ'], ["{\\v{g}}", 'ǧ'], ["{\\v{K}}", 'Ǩ'], ["{\\v{k}}", 'ǩ'], ["{\\k{O}}", 'Ǫ'], ["{\\k{o}}", 'ǫ'], ["{\\v{j}}", 'ǰ'], ["{\\'{G}}", 'Ǵ'], ["{\\'{g}}", 'ǵ'], ["{\\.{B}}", 'Ḃ'], ["{\\.{b}}", 'ḃ'], ["{\\d{B}}", 'Ḅ'], ["{\\d{b}}", 'ḅ'], ["{\\b{B}}", 'Ḇ'], ["{\\b{b}}", 'ḇ'], ["{\\.{D}}", 'Ḋ'], ["{\\.{d}}", 'ḋ'], ["{\\d{D}}", 'Ḍ'], ["{\\d{d}}", 'ḍ'], ["{\\b{D}}", 'Ḏ'], ["{\\b{d}}", 'ḏ'], ["{\\c{D}}", 'Ḑ'], ["{\\c{d}}", 'ḑ'], ["{\\.{F}}", 'Ḟ'], ["{\\.{f}}", 'ḟ'], ["{\\={G}}", 'Ḡ'], ["{\\={g}}", 'ḡ'], ["{\\.{H}}", 'Ḣ'], ["{\\.{h}}", 'ḣ'], ["{\\d{H}}", 'Ḥ'], ["{\\d{h}}", 'ḥ'], ["{\\\"{H}}", 'Ḧ'], ["{\\\"{h}}", 'ḧ'], ["{\\c{H}}", 'Ḩ'], ["{\\c{h}}", 'ḩ'], ["{\\'{K}}", 'Ḱ'], ["{\\'{k}}", 'ḱ'], ["{\\d{K}}", 'Ḳ'], ["{\\d{k}}", 'ḳ'], ["{\\b{K}}", 'Ḵ'], ["{\\b{k}}", 'ḵ'], ["{\\d{L}}", 'Ḷ'], ["{\\d{l}}", 'ḷ'], ["{\\b{L}}", 'Ḻ'], ["{\\b{l}}", 'ḻ'], ["{\\'{M}}", 'Ḿ'], ["{\\'{m}}", 'ḿ'], ["{\\.{M}}", 'Ṁ'], ["{\\.{m}}", 'ṁ'], ["{\\d{M}}", 'Ṃ'], ["{\\d{m}}", 'ṃ'], ["{\\.{N}}", 'Ṅ'], ["{\\.{n}}", 'ṅ'], ["{\\d{N}}", 'Ṇ'], ["{\\d{n}}", 'ṇ'], ["{\\b{N}}", 'Ṉ'], ["{\\b{n}}", 'ṉ'], ["{\\'{P}}", 'Ṕ'], ["{\\'{p}}", 'ṕ'], ["{\\.{P}}", 'Ṗ'], ["{\\.{p}}", 'ṗ'], ["{\\.{R}}", 'Ṙ'], ["{\\.{r}}", 'ṙ'], ["{\\d{R}}", 'Ṛ'], ["{\\d{r}}", 'ṛ'], ["{\\b{R}}", 'Ṟ'], ["{\\b{r}}", 'ṟ'], ["{\\.{S}}", 'Ṡ'], ["{\\.{s}}", 'ṡ'], ["{\\d{S}}", 'Ṣ'], ["{\\d{s}}", 'ṣ'], ["{\\.{T}}", 'Ṫ'], ["{\\.{t}}", 'ṫ'], ["{\\d{T}}", 'Ṭ'], ["{\\d{t}}", 'ṭ'], ["{\\b{T}}", 'Ṯ'], ["{\\b{t}}", 'ṯ'], ["{\\~{V}}", 'Ṽ'], ["{\\~{v}}", 'ṽ'], ["{\\d{V}}", 'Ṿ'], ["{\\d{v}}", 'ṿ'], ["{\\`{W}}", 'Ẁ'], ["{\\`{w}}", 'ẁ'], ["{\\'{W}}", 'Ẃ'], ["{\\'{w}}", 'ẃ'], ["{\\\"{W}}", 'Ẅ'], ["{\\\"{w}}", 'ẅ'], ["{\\.{W}}", 'Ẇ'], ["{\\.{w}}", 'ẇ'], ["{\\d{W}}", 'Ẉ'], ["{\\d{w}}", 'ẉ'], ["{\\.{X}}", 'Ẋ'], ["{\\.{x}}", 'ẋ'], ["{\\\"{X}}", 'Ẍ'], ["{\\\"{x}}", 'ẍ'], ["{\\.{Y}}", 'Ẏ'], ["{\\.{y}}", 'ẏ'], ["{\\^{Z}}", 'Ẑ'], ["{\\^{z}}", 'ẑ'], ["{\\d{Z}}", 'Ẓ'], ["{\\d{z}}", 'ẓ'], ["{\\b{Z}}", 'Ẕ'], ["{\\b{z}}", 'ẕ'], ["{\\b{h}}", 'ẖ'], ["{\\\"{t}}", 'ẗ'], ["{\\d{A}}", 'Ạ'], ["{\\d{a}}", 'ạ'], ["{\\d{E}}", 'Ẹ'], ["{\\d{e}}", 'ẹ'], ["{\\~{E}}", 'Ẽ'], ["{\\~{e}}", 'ẽ'], ["{\\d{I}}", 'Ị'], ["{\\d{i}}", 'ị'], ["{\\d{O}}", 'Ọ'], ["{\\d{o}}", 'ọ'], ["{\\d{U}}", 'Ụ'], ["{\\d{u}}", 'ụ'], ["{\\`{Y}}", 'Ỳ'], ["{\\`{y}}", 'ỳ'], ["{\\d{Y}}", 'Ỵ'], ["{\\d{y}}", 'ỵ'], ["{\\~{Y}}", 'Ỹ'], ["{\\~{y}}", 'ỹ']];

},{}],53:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.BibLatexNameStringParser = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _singleNameParser = require('./single-name-parser');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var BibLatexNameStringParser = exports.BibLatexNameStringParser = function () {
    function BibLatexNameStringParser(nameString) {
        _classCallCheck(this, BibLatexNameStringParser);

        nameString = nameString.trim();
        this.people = [];
        if (nameString) {
            this.parsePeople(nameString);
        }
    }

    _createClass(BibLatexNameStringParser, [{
        key: 'parsePeople',
        value: function parsePeople(nameString) {
            var _this = this;

            var people = [];
            var tokenRe = /([^\s{}]+|\s|{|})/g;
            var j = 0;
            var k = 0;
            var item = void 0;
            while ((item = tokenRe.exec(nameString)) !== null) {
                var token = item[0];
                if (k === people.length) {
                    people.push('');
                }
                if ('{' === token) {
                    j += 1;
                }
                if ('}' === token) {
                    j -= 1;
                }
                if ('and' === token && 0 === j) {
                    k += 1;
                } else {
                    people[k] += token;
                }
            }
            people.forEach(function (person) {
                var nameParser = new _singleNameParser.BibLatexSingleNameParser(person);
                _this.people.push(nameParser.output);
            });
        }
    }, {
        key: 'output',
        get: function get() {
            var ref = [];
            this.people.forEach(function (person) {
                var name = '';
                if (person['first']) {
                    name = '{' + person['first'] + '}';
                }
                if (person['last']) {
                    if ('' === name) {
                        name = '{' + person['last'] + '}';
                    } else {
                        name += ' {' + person['last'] + '}';
                    }
                }
                ref.push(name);
            });
            return ref;
        }
    }]);

    return BibLatexNameStringParser;
}();

},{"./single-name-parser":54}],54:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var BibLatexSingleNameParser = exports.BibLatexSingleNameParser = function () {
    function BibLatexSingleNameParser(nameString) {
        _classCallCheck(this, BibLatexSingleNameParser);

        this.nameString = nameString;
        this.nameDict = {};
        this._first = [];
        this._last = [];
    }

    _createClass(BibLatexSingleNameParser, [{
        key: 'splitTexString',
        value: function splitTexString(string) {
            var sep = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

            if (sep === null) {
                sep = '[\\s~]+';
            }
            var braceLevel = 0;
            var nameStart = 0;
            var result = [];
            var stringLen = string.length;
            var pos = 0;
            while (pos < stringLen) {
                var char = string.charAt(pos);
                if (char === '{') {
                    braceLevel += 1;
                } else if (char === '}') {
                    braceLevel -= 1;
                } else if (braceLevel === 0 && pos > 0) {
                    var match = string.slice(pos).match(window.RegExp('^' + sep));
                    if (match) {
                        var sepLen = match[0].length;
                        if (pos + sepLen < stringLen) {
                            result.push(string.slice(nameStart, pos));
                            nameStart = pos + sepLen;
                        }
                    }
                }
                pos++;
            }
            if (nameStart < stringLen) {
                result.push(string.slice(nameStart));
            }
            return result.map(function (string) {
                return string.replace(/^(\s|{|})+|(\s|{|})+$/g, '');
            });
        }
    }, {
        key: 'processFirstMiddle',
        value: function processFirstMiddle(parts) {
            this._first = this._first.concat(parts);
            this.nameDict['first'] = this._first.join(' ');
        }
    }, {
        key: 'processVonLast',
        value: function processVonLast(parts) {
            var lineage = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

            var rSplit = this.rsplitAt(parts);
            var von = rSplit[0];
            var last = rSplit[1];
            if (von && !last) {
                last.push(von.pop());
            }
            this._last = this._last.concat(von);
            this._last = this._last.concat(last);
            this._last = this._last.concat(lineage);
            this.nameDict['last'] = this._last.join(' ');
        }
    }, {
        key: 'findFirstLowerCaseWord',
        value: function findFirstLowerCaseWord(lst) {
            // return index of first lowercase word in lst. Else return length of lst.
            for (var i = 0; i < lst.length; i++) {
                var word = lst[i];
                if (word === word.toLowerCase()) {
                    return i;
                }
            }
            return lst.length;
        }
    }, {
        key: 'splitAt',
        value: function splitAt(lst) {
            // Split the given list into two parts.
            // The second part starts with the first lowercase word.
            var pos = this.findFirstLowerCaseWord(lst);
            return [lst.slice(0, pos), lst.slice(pos)];
        }
    }, {
        key: 'rsplitAt',
        value: function rsplitAt(lst) {
            var rpos = this.findFirstLowerCaseWord(lst.slice().reverse());
            var pos = lst.length - rpos;
            return [lst.slice(0, pos), lst.slice(pos)];
        }
    }, {
        key: 'output',
        get: function get() {
            var parts = this.splitTexString(this.nameString, ',');
            if (parts.length === 3) {
                // von Last, Jr, First
                this.processVonLast(this.splitTexString(parts[0]), this.splitTexString(parts[1]));
                this.processFirstMiddle(this.splitTexString(parts[2]));
            } else if (parts.length === 2) {
                // von Last, First
                this.processVonLast(this.splitTexString(parts[0]));
                this.processFirstMiddle(this.splitTexString(parts[1]));
            } else if (parts.length === 1) {
                // First von Last
                var spacedParts = this.splitTexString(this.nameString);
                if (spacedParts.length === 1) {
                    this.nameDict['first'] = spacedParts[0];
                } else {
                    var split = this.splitAt(spacedParts);
                    var firstMiddle = split[0];
                    var vonLast = split[1];
                    if (vonLast.length === 0 && firstMiddle.length > 1) {
                        var last = firstMiddle.pop();
                        vonLast.push(last);
                    }
                    this.processFirstMiddle(firstMiddle);
                    this.processVonLast(vonLast);
                }
            } else {
                this.nameDict['first'] = this.nameString;
            }
            return this.nameDict;
        }
    }]);

    return BibLatexSingleNameParser;
}();

},{}],55:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _biblatex = require("./import/biblatex");

Object.defineProperty(exports, "BibLatexParser", {
  enumerable: true,
  get: function get() {
    return _biblatex.BibLatexParser;
  }
});

var _biblatex2 = require("./export/biblatex");

Object.defineProperty(exports, "BibLatexExporter", {
  enumerable: true,
  get: function get() {
    return _biblatex2.BibLatexExporter;
  }
});

var _csl = require("./export/csl");

Object.defineProperty(exports, "CSLExporter", {
  enumerable: true,
  get: function get() {
    return _csl.CSLExporter;
  }
});

var _const = require("./const");

Object.defineProperty(exports, "BibFieldTypes", {
  enumerable: true,
  get: function get() {
    return _const.BibFieldTypes;
  }
});
Object.defineProperty(exports, "BibTypes", {
  enumerable: true,
  get: function get() {
    return _const.BibTypes;
  }
});

},{"./const":47,"./export/biblatex":48,"./export/csl":50,"./import/biblatex":51}]},{},[1]);
