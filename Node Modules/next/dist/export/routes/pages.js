"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    ExportedPagesFiles: null,
    exportPages: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    ExportedPagesFiles: function() {
        return ExportedPagesFiles;
    },
    exportPages: function() {
        return exportPages;
    }
});
const _renderresult = /*#__PURE__*/ _interop_require_default(require("../../server/render-result"));
const _path = require("path");
const _ampmode = require("../../shared/lib/amp-mode");
const _constants = require("../../lib/constants");
const _nossrerror = require("../../shared/lib/lazy-dynamic/no-ssr-error");
const _amphtmlvalidator = /*#__PURE__*/ _interop_require_default(require("next/dist/compiled/amphtml-validator"));
const _fileexists = require("../../lib/file-exists");
const _modulerender = require("../../server/future/route-modules/pages/module.render");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
var ExportedPagesFiles;
(function(ExportedPagesFiles) {
    ExportedPagesFiles["HTML"] = "HTML";
    ExportedPagesFiles["DATA"] = "DATA";
    ExportedPagesFiles["AMP_HTML"] = "AMP_HTML";
    ExportedPagesFiles["AMP_DATA"] = "AMP_PAGE_DATA";
})(ExportedPagesFiles || (ExportedPagesFiles = {}));
async function exportPages(req, res, path, page, query, htmlFilepath, htmlFilename, ampPath, subFolders, outDir, ampValidatorPath, pagesDataDir, buildExport, isDynamic, hasOrigQueryValues, renderOpts, components, fileWriter) {
    var _components_pageConfig, _components_pageConfig1;
    const ampState = {
        ampFirst: ((_components_pageConfig = components.pageConfig) == null ? void 0 : _components_pageConfig.amp) === true,
        hasQuery: Boolean(query.amp),
        hybrid: ((_components_pageConfig1 = components.pageConfig) == null ? void 0 : _components_pageConfig1.amp) === "hybrid"
    };
    const inAmpMode = (0, _ampmode.isInAmpMode)(ampState);
    const hybridAmp = ampState.hybrid;
    if (components.getServerSideProps) {
        throw new Error(`Error for page ${page}: ${_constants.SERVER_PROPS_EXPORT_ERROR}`);
    }
    // for non-dynamic SSG pages we should have already
    // prerendered the file
    if (!buildExport && components.getStaticProps && !isDynamic) {
        return;
    }
    if (components.getStaticProps && !htmlFilepath.endsWith(".html")) {
        // make sure it ends with .html if the name contains a dot
        htmlFilepath += ".html";
        htmlFilename += ".html";
    }
    let renderResult;
    if (typeof components.Component === "string") {
        renderResult = _renderresult.default.fromStatic(components.Component);
        if (hasOrigQueryValues) {
            throw new Error(`\nError: you provided query values for ${path} which is an auto-exported page. These can not be applied since the page can no longer be re-rendered on the server. To disable auto-export for this page add \`getInitialProps\`\n`);
        }
    } else {
        /**
     * This sets environment variable to be used at the time of static export by head.tsx.
     * Using this from process.env allows targeting SSR by calling
     * `process.env.__NEXT_OPTIMIZE_FONTS`.
     * TODO(prateekbh@): Remove this when experimental.optimizeFonts are being cleaned up.
     */ if (renderOpts.optimizeFonts) {
            process.env.__NEXT_OPTIMIZE_FONTS = JSON.stringify(renderOpts.optimizeFonts);
        }
        if (renderOpts.optimizeCss) {
            process.env.__NEXT_OPTIMIZE_CSS = JSON.stringify(true);
        }
        try {
            renderResult = await (0, _modulerender.lazyRenderPagesPage)(req, res, page, query, renderOpts);
        } catch (err) {
            if (err.digest !== _nossrerror.NEXT_DYNAMIC_NO_SSR_CODE) {
                throw err;
            }
        }
    }
    const ssgNotFound = renderResult == null ? void 0 : renderResult.metadata.isNotFound;
    const ampValidations = [];
    const validateAmp = async (rawAmpHtml, ampPageName, validatorPath)=>{
        const validator = await _amphtmlvalidator.default.getInstance(validatorPath);
        const result = validator.validateString(rawAmpHtml);
        const errors = result.errors.filter((e)=>e.severity === "ERROR");
        const warnings = result.errors.filter((e)=>e.severity !== "ERROR");
        if (warnings.length || errors.length) {
            ampValidations.push({
                page: ampPageName,
                result: {
                    errors,
                    warnings
                }
            });
        }
    };
    const html = renderResult && !renderResult.isNull ? renderResult.toUnchunkedString() : "";
    let ampRenderResult;
    if (inAmpMode && !renderOpts.ampSkipValidation) {
        if (!ssgNotFound) {
            await validateAmp(html, path, ampValidatorPath);
        }
    } else if (hybridAmp) {
        const ampHtmlFilename = subFolders ? (0, _path.join)(ampPath, "index.html") : `${ampPath}.html`;
        const ampHtmlFilepath = (0, _path.join)(outDir, ampHtmlFilename);
        const exists = await (0, _fileexists.fileExists)(ampHtmlFilepath, _fileexists.FileType.File);
        if (!exists) {
            try {
                ampRenderResult = await (0, _modulerender.lazyRenderPagesPage)(req, res, page, {
                    ...query,
                    amp: "1"
                }, renderOpts);
            } catch (err) {
                if (err.digest !== _nossrerror.NEXT_DYNAMIC_NO_SSR_CODE) {
                    throw err;
                }
            }
            const ampHtml = ampRenderResult && !ampRenderResult.isNull ? ampRenderResult.toUnchunkedString() : "";
            if (!renderOpts.ampSkipValidation) {
                await validateAmp(ampHtml, page + "?amp=1");
            }
            await fileWriter("AMP_HTML", ampHtmlFilepath, ampHtml, "utf8");
        }
    }
    const metadata = (renderResult == null ? void 0 : renderResult.metadata) || (ampRenderResult == null ? void 0 : ampRenderResult.metadata) || {};
    if (metadata.pageData) {
        const dataFile = (0, _path.join)(pagesDataDir, htmlFilename.replace(/\.html$/, ".json"));
        await fileWriter("DATA", dataFile, JSON.stringify(metadata.pageData), "utf8");
        if (hybridAmp) {
            await fileWriter("AMP_PAGE_DATA", dataFile.replace(/\.json$/, ".amp.json"), JSON.stringify(metadata.pageData), "utf8");
        }
    }
    if (!ssgNotFound) {
        // don't attempt writing to disk if getStaticProps returned not found
        await fileWriter("HTML", htmlFilepath, html, "utf8");
    }
    return {
        ampValidations,
        revalidate: metadata.revalidate ?? false,
        ssgNotFound
    };
}

//# sourceMappingURL=pages.js.map