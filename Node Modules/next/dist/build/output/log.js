"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    prefixes: null,
    bootstrap: null,
    wait: null,
    error: null,
    warn: null,
    ready: null,
    info: null,
    event: null,
    trace: null,
    warnOnce: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    prefixes: function() {
        return prefixes;
    },
    bootstrap: function() {
        return bootstrap;
    },
    wait: function() {
        return wait;
    },
    error: function() {
        return error;
    },
    warn: function() {
        return warn;
    },
    ready: function() {
        return ready;
    },
    info: function() {
        return info;
    },
    event: function() {
        return event;
    },
    trace: function() {
        return trace;
    },
    warnOnce: function() {
        return warnOnce;
    }
});
const _picocolors = require("../../lib/picocolors");
const prefixes = {
    wait: (0, _picocolors.white)((0, _picocolors.bold)("○")),
    error: (0, _picocolors.red)((0, _picocolors.bold)("⨯")),
    warn: (0, _picocolors.yellow)((0, _picocolors.bold)("⚠")),
    ready: (0, _picocolors.bold)("▲"),
    info: (0, _picocolors.white)((0, _picocolors.bold)(" ")),
    event: (0, _picocolors.green)((0, _picocolors.bold)("✓")),
    trace: (0, _picocolors.magenta)((0, _picocolors.bold)("\xbb"))
};
const LOGGING_METHOD = {
    log: "log",
    warn: "warn",
    error: "error"
};
function prefixedLog(prefixType, ...message) {
    if ((message[0] === "" || message[0] === undefined) && message.length === 1) {
        message.shift();
    }
    const consoleMethod = prefixType in LOGGING_METHOD ? LOGGING_METHOD[prefixType] : "log";
    const prefix = prefixes[prefixType];
    // If there's no message, don't print the prefix but a new line
    if (message.length === 0) {
        console[consoleMethod]("");
    } else {
        console[consoleMethod](" " + prefix, ...message);
    }
}
function bootstrap(...message) {
    console.log(" ", ...message);
}
function wait(...message) {
    prefixedLog("wait", ...message);
}
function error(...message) {
    prefixedLog("error", ...message);
}
function warn(...message) {
    prefixedLog("warn", ...message);
}
function ready(...message) {
    prefixedLog("ready", ...message);
}
function info(...message) {
    prefixedLog("info", ...message);
}
function event(...message) {
    prefixedLog("event", ...message);
}
function trace(...message) {
    prefixedLog("trace", ...message);
}
const warnOnceMessages = new Set();
function warnOnce(...message) {
    if (!warnOnceMessages.has(message[0])) {
        warnOnceMessages.add(message.join(" "));
        warn(...message);
    }
}

//# sourceMappingURL=log.js.map