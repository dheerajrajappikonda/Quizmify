// TODO-APP: hydration warning
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _appbootstrap = require("./app-bootstrap");
(0, _appbootstrap.appBootstrap)(()=>{
    require("./app-webpack");
    const { hydrate } = require("./app-index");
    hydrate();
}) // TODO-APP: build indicator
;

if ((typeof exports.default === 'function' || (typeof exports.default === 'object' && exports.default !== null)) && typeof exports.default.__esModule === 'undefined') {
  Object.defineProperty(exports.default, '__esModule', { value: true });
  Object.assign(exports.default, exports);
  module.exports = exports.default;
}

//# sourceMappingURL=app-next-dev.js.map