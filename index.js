'use strict';

var path = require('path')
  , vm = require('vm')
  , fs = require('fs');

/**
 * Load:
 *
 * Loads plain'ol JavaScript files without exports, module patterns in to Node.
 * The only assumption it makes is that it introduces at least one global.
 *
 * @param {String} location
 * @returns {Mixed}
 * @api public
 */
function load(location) {
  if (!path.extname(location)) location = location +'.js';
  location = path.resolve(path.dirname(module.parent.filename), location);

  return compiler(read(location), path.basename(location));
}

/**
 * The module compiler.
 *
 * @param {String} code The source code that needs to be compiled
 * @param {String} name The name of the file.
 * @returns {Mixed} Things.
 * @api public
 */
function compiler(code, name) {
  var context = { load: require };

  // Add the missing globals that are not present in vm module.
  Object.keys(missing).forEach(function missingInVM(global) {
    context[global] = missing[global];
  });

  // Run it in a context so we can expose the globals.
  context = vm.createContext(context);
  vm.runInContext(code, context, name);

  // Remove the load module if it's still unchanged
  if (context.load === require) delete context.load;
  Object.keys(missing).forEach(function missingInVM(global) {
    if (context[global] === missing[global]) {
      delete context[global];
    }
  });

  // If only one global was exported, we should simply expose it using the
  // `module.exports` patter. If there are more globals exported, expose them
  // all.
  var globals = Object.keys(context);

  if (globals.length === 1) return context[globals.pop()];
  return globals.reduce(function reduce(exports, method) {
    exports[method] = context[method];
    return exports;
  }, Object.create(null));
}

/**
 * Code reading and cleaning up.
 *
 * @param {String} location
 * @api private
 */
function read(location) {
  var code = fs.readFileSync(location, 'utf-8');

  //
  // Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
  // because the buffer-to-string conversion in `fs.readFileSync()`
  // translates it to FEFF, the UTF-16 BOM.
  //
  if (code.charCodeAt(0) === 0xFEFF) {
    code = code.slice(1);
  }

  return code;
}

/**
 * The following properties are missing when loading plain ol files.
 *
 * @type {Object}
 * @private
 */
var missing = Object.keys(global).reduce(function add(missing, prop) {
  missing[prop] = global[prop];
  return missing;
}, { require: require });

//
// Expose the module.
//
load.compiler = compiler;
module.exports = load;
