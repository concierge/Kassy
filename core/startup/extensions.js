/**
 * Extensions to the standard type prototypes and global definitions.
 *
 * Written By:
 *         Matthew Knox
 *
 * License:
 *        MIT License. All code unless otherwise specified is
 *        Copyright (c) Matthew Knox and Contributors 2016.
 */
'use strict';

module.exports = (rootPath) => {
    const path = require('path');
    // Arbitary location module loading requirements
    global.__rootPath = rootPath;
    global.rootPathJoin = function() {
        return path.join.apply(this, [global.__rootPath].concat(Array.from(arguments)));
    };
    global.__modulesPath = global.rootPathJoin('modules/');

    // Platform status flags
    global.StatusFlag = {
        NotStarted: Symbol('NotStarted'),
        Unknown: Symbol('Unknown'),
        Started: Symbol('Started'),
        Shutdown: Symbol('Shutdown'),
        ShutdownShouldRestart: Symbol('ShutdownShouldRestart')
    };


    // babel and coffee-script setup
    require(global.rootPathJoin('core/unsafe/require.js'));
    const babylon = require('babylon'),
        requireInjectionStr = 'require=global.requireHook(require,__dirname);';
    require('babel-register')({
        plugins: [{
            visitor: {
                Program (path)
                {
                    path.unshiftContainer('body', babylon.parse(requireInjectionStr).program.body[0]);
                }
            }
        }]});
    require('babel-polyfill');
    const cs = require('coffee-script');
    cs.register();
    // inject require modifications into all coffeescript code because babel wont
    const origcs = cs._compileFile;
    cs._compileFile = function () {
        const res = origcs.apply(this, arguments);
        return requireInjectionStr + res;
    };

    // Prototypes
    String.prototype.toProperCase = function () {
        return this.replace(/\w\S*/g, (txt) => {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    };
    String.prototype.contains = function (str) {
        return this.indexOf(str) !== -1;
    };
    String.prototype.capitiliseFirst = function () {
        return this.length >= 2 ? this[0].toUpperCase() + this.substring(1) : this;
    };

    // console modifications
    require(rootPathJoin('core/unsafe/console.js'));

    // Raw stack traces
    if (!Error.prepareStackTrace) {
        throw new Error('Coffee-script has changed their approach...');
    }
    const origionalPrepare = Error.prepareStackTrace;
    Error.prepareStackTrace = (error, stack) => {
        try {
            error.rawStackTrace = stack;
        }
        catch (e) {}
        return origionalPrepare(error, stack);
    };
    global.getStackTrace = () => {
        const result = {};
        Error.captureStackTrace(result, global.getStackTrace);
        result.stack; // call prepareStackTrace
        return result.rawStackTrace;
    };

    // Blame
    global.getBlame = (min = null, max = null, error = null) => {
        let stack;
        if (error) {
            error.stack; // calls prepareStackTrace
            stack = error.rawStackTrace;
        }
        else {
            stack = global.getStackTrace();
            min = min === null ? 1 : min;
        }
        const m = max || stack.length,
            s = min || 0;
        for (let i = s; i < m; i++) {
            const file = stack[i].getFileName();
            if (file.startsWith(global.__modulesPath)) {
                const trimmed = file.substr(global.__modulesPath.length);
                return trimmed.substr(0, trimmed.indexOf(path.sep));
            }
        }
        return null;
    };
};