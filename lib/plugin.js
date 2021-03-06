/** Helper module for writing plugins
 * @module plugin
 */

'use strict';

var deps = require('./deps.js');

/**
 * Calls callback with auto populated dependencies.
 * @arg {function} cb - callback function.
 * @example
 * var plugin = require(...);
 * module.exports = plugin.init(function(app, config, docker) {
 *   // Add plugin code here.
 * });
 * @example
 * var plugin = require(...);
 * module.exports = plugin.init(function(logger, app) {
 *   // Add plugin code here.
 * });
 */
module.exports.init = function(cb) {
  deps.call(cb);
};
