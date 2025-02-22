"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return transformSource;
    }
});
const _constants = require("../../../../lib/constants");
const _constants1 = require("../../../../shared/lib/constants");
const _warnonce = require("../../../../shared/lib/utils/warn-once");
const _getpagestaticinfo = require("../../../analysis/get-page-static-info");
const _getmodulebuildinfo = require("../get-module-build-info");
const noopHeadPath = require.resolve("next/dist/client/components/noop-head");
// For edge runtime it will be aliased to esm version by webpack
const MODULE_PROXY_PATH = "next/dist/build/webpack/loaders/next-flight-loader/module-proxy";
function transformSource(source, sourceMap) {
    var _buildInfo_rsc, _buildInfo_rsc1;
    // Avoid buffer to be consumed
    if (typeof source !== "string") {
        throw new Error("Expected source to have been transformed to a string.");
    }
    // Assign the RSC meta information to buildInfo.
    // Exclude next internal files which are not marked as client files
    const buildInfo = (0, _getmodulebuildinfo.getModuleBuildInfo)(this._module);
    buildInfo.rsc = (0, _getpagestaticinfo.getRSCModuleInformation)(source, true);
    // A client boundary.
    if (((_buildInfo_rsc = buildInfo.rsc) == null ? void 0 : _buildInfo_rsc.type) === _constants1.RSC_MODULE_TYPES.client) {
        var _this__module_parser, _this__module;
        const sourceType = (_this__module = this._module) == null ? void 0 : (_this__module_parser = _this__module.parser) == null ? void 0 : _this__module_parser.sourceType;
        const detectedClientEntryType = buildInfo.rsc.clientEntryType;
        const clientRefs = buildInfo.rsc.clientRefs;
        // It's tricky to detect the type of a client boundary, but we should always
        // use the `module` type when we can, to support `export *` and `export from`
        // syntax in other modules that import this client boundary.
        let assumedSourceType = sourceType;
        if (assumedSourceType === "auto" && detectedClientEntryType === "auto") {
            if (clientRefs.length === 0 || clientRefs.length === 1 && clientRefs[0] === "") {
                // If there's zero export detected in the client boundary, and it's the
                // `auto` type, we can safely assume it's a CJS module because it doesn't
                // have ESM exports.
                assumedSourceType = "commonjs";
            } else if (!clientRefs.includes("*")) {
                // Otherwise, we assume it's an ESM module.
                assumedSourceType = "module";
            }
        }
        if (assumedSourceType === "module") {
            if (clientRefs.includes("*")) {
                this.callback(new Error(`It's currently unsupported to use "export *" in a client boundary. Please use named exports instead.`));
                return;
            }
            let esmSource = `\
import { createProxy } from "${MODULE_PROXY_PATH}"
const proxy = createProxy(String.raw\`${this.resourcePath}\`)

// Accessing the __esModule property and exporting $$typeof are required here.
// The __esModule getter forces the proxy target to create the default export
// and the $$typeof value is for rendering logic to determine if the module
// is a client boundary.
const { __esModule, $$typeof } = proxy;
const __default__ = proxy.default;
`;
            let cnt = 0;
            for (const ref of clientRefs){
                if (ref === "") {
                    esmSource += `\nexports[''] = proxy[''];`;
                } else if (ref === "default") {
                    esmSource += `
export { __esModule, $$typeof };
export default __default__;`;
                } else {
                    esmSource += `
const e${cnt} = proxy["${ref}"];
export { e${cnt++} as ${ref} };`;
                }
            }
            this.callback(null, esmSource, sourceMap);
            return;
        }
    }
    if (((_buildInfo_rsc1 = buildInfo.rsc) == null ? void 0 : _buildInfo_rsc1.type) !== _constants1.RSC_MODULE_TYPES.client) {
        if (noopHeadPath === this.resourcePath) {
            (0, _warnonce.warnOnce)(`Warning: You're using \`next/head\` inside the \`app\` directory, please migrate to the Metadata API. See https://nextjs.org/docs/app/building-your-application/upgrading/app-router-migration#step-3-migrating-nexthead for more details.`);
        }
    }
    this.callback(null, source.replace(_constants.RSC_MOD_REF_PROXY_ALIAS, MODULE_PROXY_PATH), sourceMap);
}

//# sourceMappingURL=index.js.map