import { existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import {
    generateConsumerSurfaceModule,
    resolveConsumerRoots,
    scanConsumerDistSharedImports,
    scanConsumerSourceExports,
    DEFAULT_VUE_COMPILER_EXPORTS,
    SHARED_SURFACE_RESOLVED_ID,
    SHARED_SURFACE_VIRTUAL_ID
} from "./consumerSurface.js";
import { createRulesFromPackages, loadSharedChunksEnv } from "./loadEnv.js";
import {
    dedupeScanRoots,
    discoverSharedPackages,
    formatDiscoveredPackagesLog,
    resolveSharedRules
} from "./discoverSharedPackages.js";
import {
    collectRequiredExportsForChunk,
    patchSharedChunkExportAliases
} from "./patchChunkExports.js";
import { rewriteSharedBarrelImports } from "./rewriteImports.js";
import {
    buildSharedManifest,
    createSharedBuildId,
    loadSharedBuildManifest,
    resolveSharedBuildDir,
    serializeSharedManifest,
    SHARED_MANIFEST_FILE_NAME,
    sharedJsUrlPattern,
    toSharedBundleDirName,
    toSharedBundlePrefix
} from "./sharedBuildManifest.js";
import {
    resolveSharedChunkFileKey,
    resolveSharedChunkName,
    resolveVueVendorChunkName,
    toAbsoluteSharedAssetUrl,
    toAbsoluteSharedChunkUrl
} from "./resolveChunk.js";
export { createRulesFromPackages, loadSharedChunksEnv } from "./loadEnv.js";
export {
    collectAppRuntimePackages,
    createRulesFromDiscoveredPackages,
    dedupeScanRoots,
    discoverSharedPackages,
    resolveSharedRules
} from "./discoverSharedPackages.js";
export {
    defaultResolveChunkName,
    isAntdvVendorPackage,
    resolveAntdvSharedChunkName,
    resolveWorkspaceSharedChunkName
} from "./resolveChunk.js";
export const DEFAULT_SHARED_CHUNK_RULES = [
    { packageName: "vue", resolveChunkName: resolveVueVendorChunkName },
    { packageName: "vue-router" },
    { packageName: "pinia" },
    { packageName: "@vue/shared", resolveChunkName: resolveVueVendorChunkName },
    { packageName: "@vue/reactivity", resolveChunkName: resolveVueVendorChunkName },
    { packageName: "@vue/runtime-core", resolveChunkName: resolveVueVendorChunkName },
    { packageName: "@vue/runtime-dom", resolveChunkName: resolveVueVendorChunkName }
];
const normalizePublicPath = (publicPath) => {
    const trimmedPath = publicPath.trim();
    if (!trimmedPath) {
        return "/shared/";
    }
    const withLeadingSlash = trimmedPath.startsWith("/") ? trimmedPath : `/${trimmedPath}`;
    return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
};
const isSharedChunkName = (chunkName) => {
    return Boolean(chunkName?.startsWith("shared/"));
};
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const rewriteSharedImportPaths = (code, sharedManifest) => {
    const manifestBase = sharedManifest.base.replace(/\/$/, "");
    const bundleDirPattern = escapeRegExp(sharedManifest.dir);
    const relativeSharedPattern = new RegExp(`(from|import|import\\()\\s*(['"])(?:\\.\\.\\/)+${bundleDirPattern}\\/`, "g");
    const legacyNestedPattern = new RegExp(`(from|import|import\\()\\s*(['"])(?:\\.\\.\\/)+shared\\/${escapeRegExp(sharedManifest.buildId)}\\/`, "g");
    return code.replace(relativeSharedPattern, `$1$2${manifestBase}/`).replace(legacyNestedPattern, `$1$2${manifestBase}/`).replace(new RegExp(`(${escapeRegExp(manifestBase)}/)${bundleDirPattern}/`, "g"), "$1");
};
const rewriteLegacyAbsoluteSharedPaths = (code, publicPath, sharedManifest) => {
    const bundlePrefix = toSharedBundlePrefix(publicPath);
    const manifestBase = sharedManifest.base.replace(/\/$/, "");
    const legacyNestedPattern = new RegExp(`/${bundlePrefix}/${sharedManifest.buildId}/`, "g");
    const legacyFlatPattern = new RegExp(`/${bundlePrefix}/(?!${sharedManifest.buildId}/)([\\w./-]+\\.(?:js|css))`, "g");
    return code.replace(legacyNestedPattern, `/${sharedManifest.dir}/`).replace(legacyFlatPattern, `${manifestBase}/$1`);
};
const isSharedBundlePath = (fileName, bundleDirName) => {
    const normalizedFileName = fileName.replace(/\\/g, "/");
    return normalizedFileName.startsWith(`${bundleDirName}/`);
};
const getSharedChunkOutputPath = (chunkName, bundleDirName) => {
    const relativeChunkPath = chunkName.replace(/^shared\//, "");
    return `${bundleDirName}/${relativeChunkPath}.js`;
};
const getSharedAssetOutputPath = (assetLogicalName, bundleDirName) => {
    const relativeAssetPath = assetLogicalName.replace(/^shared\//, "");
    if (/\.[a-z0-9]+$/i.test(relativeAssetPath)) {
        return `${bundleDirName}/${relativeAssetPath}`;
    }
    return `${bundleDirName}/${relativeAssetPath}[extname]`;
};
const isExternalSharedModuleId = (moduleId) => /^\/shared(?:-[a-f0-9]{8})?\//i.test(moduleId);
const stripSharedFromHtml = (html) => {
    return html.replace(/<link[^>]*\shref="(?:\.\.\/)+shared[^"]*"[^>]*>\s*/gi, "").replace(/<link[^>]*\shref="\/shared[^"]*"[^>]*>\s*/gi, "").replace(/<script[^>]*\ssrc="(?:\.\.\/)+shared[^"]*"[^>]*>\s*<\/script>\s*/gi, "").replace(/<script[^>]*\ssrc="\/shared[^"]*"[^>]*>\s*<\/script>\s*/gi, "");
};
const collectSharedCssFiles = (sharedDir, relativeDir = "") => {
    const cssFiles = new Set;
    const currentDir = resolve(sharedDir, relativeDir);
    if (!existsSync(currentDir)) {
        return cssFiles;
    }
    for (const entryName of readdirSync(currentDir)) {
        const relativePath = relativeDir ? `${relativeDir}/${entryName}` : entryName;
        const entryPath = resolve(currentDir, entryName);
        const entryStat = statSync(entryPath);
        if (entryStat.isDirectory()) {
            for (const nestedCssFile of collectSharedCssFiles(sharedDir, relativePath)) {
                cssFiles.add(nestedCssFile);
            }
            continue;
        }
        if (entryName.endsWith(".css")) {
            cssFiles.add(relativePath.replace(/\\/g, "/"));
        }
    }
    return cssFiles;
};
const SHARED_CSS_ES_IMPORT_PATTERN = /import\s*["'](?:\/shared(?:-[a-f0-9]{8})?\/|(?:\.\.\/)+shared[^"']*\/)[^"']+\.css["']\s*;?/gi;
const stripSharedCssEsImports = (code) => code.replace(SHARED_CSS_ES_IMPORT_PATTERN, "");
const buildSharedCssLoaderSnippet = (cssUrls) => {
    if (cssUrls.length === 0) {
        return "";
    }
    const cssUrlsJson = JSON.stringify(cssUrls);
    return `(()=>{const sharedCssUrls=${cssUrlsJson};for(const cssUrl of sharedCssUrls){if(document.querySelector(\`link[rel="stylesheet"][href="\${cssUrl}"]\`))continue;const link=document.createElement("link");link.rel="stylesheet";link.href=cssUrl;document.head.appendChild(link)}})();`;
};
const collectSharedCssUrlsFromBundle = (bundle, publicPath, sharedManifest, availableCssFiles) => {
    const cssUrls = new Set;
    const sharedJsPattern = sharedJsUrlPattern(sharedManifest.base);
    for (const bundleItem of Object.values(bundle)) {
        if (bundleItem.type !== "chunk") {
            continue;
        }
        const outputChunk = bundleItem;
        const referencedSharedJs = outputChunk.code.match(sharedJsPattern) ?? [];
        for (const sharedJsUrl of referencedSharedJs) {
            const sharedCssUrl = sharedJsUrl.replace(/\.js$/, ".css");
            if (!availableCssFiles) {
                cssUrls.add(sharedCssUrl);
                continue;
            }
            const cssRelativePath = sharedCssUrl.replace(sharedManifest.base, "").replace(/^\//, "");
            if (availableCssFiles.has(cssRelativePath)) {
                cssUrls.add(sharedCssUrl);
            }
        }
        const mapDepsMatch = outputChunk.code.match(/\bf=\[([^\]]+)\]/);
        if (!mapDepsMatch) {
            continue;
        }
        for (const cssPathMatch of mapDepsMatch[1].matchAll(/"([^"]+\.css)"/g)) {
            const cssPath = cssPathMatch[1].replace(/\\/g, "/");
            if (!cssPath.includes("shared")) {
                continue;
            }
            cssUrls.add(toAbsoluteSharedAssetUrl(cssPath.replace(/^\.\.\//, ""), publicPath, sharedManifest));
        }
    }
    return [...cssUrls].sort();
};
const collectSharedCssAssetsFromBundle = (bundle, bundleDirName) => {
    const cssFiles = new Set;
    for (const bundleItem of Object.values(bundle)) {
        if (bundleItem.type !== "asset") {
            continue;
        }
        const assetFileName = bundleItem.fileName.replace(/\\/g, "/");
        if (isSharedBundlePath(assetFileName, bundleDirName) && assetFileName.endsWith(".css")) {
            cssFiles.add(assetFileName.replace(`${bundleDirName}/`, ""));
        }
    }
    return cssFiles;
};
const injectSharedCssViaLinkLoader = (bundle, publicPath, sharedManifest, availableCssFiles) => {
    const sharedCssUrls = collectSharedCssUrlsFromBundle(bundle, publicPath, sharedManifest, availableCssFiles);
    for (const bundleItem of Object.values(bundle)) {
        if (bundleItem.type !== "chunk") {
            continue;
        }
        const outputChunk = bundleItem;
        outputChunk.code = stripSharedCssEsImports(outputChunk.code);
    }
    if (sharedCssUrls.length === 0) {
        return;
    }
    const cssLoaderSnippet = buildSharedCssLoaderSnippet(sharedCssUrls);
    for (const bundleItem of Object.values(bundle)) {
        if (bundleItem.type !== "chunk" || !bundleItem.isEntry) {
            continue;
        }
        const outputChunk = bundleItem;
        if (!outputChunk.code.includes(cssLoaderSnippet)) {
            outputChunk.code = `${cssLoaderSnippet}${outputChunk.code}`;
        }
    }
};
const injectConsumerSharedCss = (bundle, publicPath, consumerSharedDir) => {
    if (!consumerSharedDir || !existsSync(consumerSharedDir)) {
        return;
    }
    const sharedManifest = loadSharedBuildManifest(consumerSharedDir, publicPath);
    if (!sharedManifest) {
        return;
    }
    const sharedBuildDir = resolveSharedBuildDir(consumerSharedDir, publicPath, sharedManifest);
    const availableCssFiles = collectSharedCssFiles(sharedBuildDir);
    injectSharedCssViaLinkLoader(bundle, publicPath, sharedManifest, availableCssFiles);
};
export const sharedChunks = (options = {}) => {
    const role = options.role ?? "producer";
    const envConfig = loadSharedChunksEnv(options.envFile);
    const publicPath = normalizePublicPath(options.publicPath ?? envConfig.publicPath);
    const consumerSharedDir = options.consumerSharedDir ?? resolve(process.cwd(), "../main/dist");
    const autoDiscover = options.autoDiscover ?? true;
    const extraPackages = [
        ...options.packages ?? [],
        ...envConfig.packages
    ].filter((packageName, index, allPackages) => packageName && allPackages.indexOf(packageName) === index);
    let activeRules = DEFAULT_SHARED_CHUNK_RULES;
    let discoverLogPrinted = false;
    let sharedBuildId = "";
    let activeSharedManifest = null;
    const resolveConsumerSharedManifest = () => {
        if (role === "producer") {
            if (!sharedBuildId) {
                return null;
            }
            return buildSharedManifest(sharedBuildId, publicPath);
        }
        return loadSharedBuildManifest(consumerSharedDir, publicPath) ?? activeSharedManifest;
    };
    const getSharedBundleDirName = () => sharedBuildId ? toSharedBundleDirName(publicPath, sharedBuildId) : "";
    const refreshActiveRules = (projectRoot) => {
        const producerRoot = role === "consumer" ? resolve(projectRoot, "../main") : projectRoot;
        const appScanRoots = role === "consumer" ? [projectRoot] : resolveConsumerRoots(projectRoot, {
            consumerApps: options.consumerApps,
            consumerRoots: options.consumerRoots
        }, envConfig.consumerApps);
        const scanRoots = dedupeScanRoots([
            producerRoot,
            ...appScanRoots
        ]);
        const distScanRoots = appScanRoots.filter((appRoot) => appRoot.replace(/\\/g, "/") !== producerRoot.replace(/\\/g, "/"));
        if (!autoDiscover) {
            activeRules = options.rules ?? (extraPackages.length > 0 ? createRulesFromPackages(extraPackages) : null) ?? DEFAULT_SHARED_CHUNK_RULES;
            return { scanRoots, distScanRoots };
        }
        activeRules = resolveSharedRules({
            producerRoot,
            consumerRoots: appScanRoots,
            explicitRules: options.rules,
            explicitPackages: extraPackages,
            excludePackages: options.excludePackages,
            minAppCount: options.minAppCount
        });
        if (!options.rules && !discoverLogPrinted) {
            const discoveredPackages = discoverSharedPackages({
                producerRoot,
                consumerRoots: appScanRoots,
                extraPackages,
                excludePackages: options.excludePackages,
                minAppCount: options.minAppCount
            });
            console.log(formatDiscoveredPackagesLog(scanRoots, discoveredPackages));
            discoverLogPrinted = true;
        }
        return { scanRoots, distScanRoots };
    };
    let consumerSurfaceModuleCode = "";
    let resolvedScanRoots = [];
    let resolvedDistScanRoots = [];
    let producerProjectRoot = process.cwd();
    const sharedOutputOptions = {
        minifyInternalExports: false,
        chunkFileNames(chunkInfo) {
            const bundleDirName = getSharedBundleDirName();
            if (isSharedChunkName(chunkInfo.name) && bundleDirName) {
                return getSharedChunkOutputPath(chunkInfo.name, bundleDirName);
            }
            return "assets/[name]-[hash].js";
        },
        assetFileNames(assetInfo) {
            const assetNames = assetInfo.names ?? [];
            const sharedAssetName = assetNames.find((name) => name.startsWith("shared/"));
            const bundleDirName = getSharedBundleDirName();
            if (sharedAssetName && bundleDirName) {
                return getSharedAssetOutputPath(sharedAssetName, bundleDirName);
            }
            return "assets/[name]-[hash][extname]";
        }
    };
    const producerRollupInput = (projectRoot) => ({
        modulePreload: false,
        rollupOptions: {
            output: {
                ...sharedOutputOptions,
                manualChunks(moduleId) {
                    return resolveSharedChunkName(moduleId, activeRules) ?? undefined;
                }
            },
            treeshake: {
                moduleSideEffects: (moduleId) => {
                    const normalizedId = moduleId.replace(/\\/g, "/");
                    if (normalizedId.includes(SHARED_SURFACE_RESOLVED_ID) || normalizedId.includes(SHARED_SURFACE_VIRTUAL_ID)) {
                        return true;
                    }
                    return null;
                }
            }
        }
    });
    const isProducerEntryFile = (fileId) => {
        const normalizedId = fileId.replace(/\\/g, "/").split("?")[0];
        return normalizedId.endsWith("/src/main.ts");
    };
    const producerSurfacePlugin = {
        name: "vite-plugin-shared-chunks-surface",
        apply: "build",
        enforce: "pre",
        config(userConfig) {
            const projectRoot = userConfig.root ?? process.cwd();
            producerProjectRoot = projectRoot;
            const { scanRoots, distScanRoots } = refreshActiveRules(projectRoot);
            resolvedScanRoots = scanRoots;
            resolvedDistScanRoots = distScanRoots;
            consumerSurfaceModuleCode = generateConsumerSurfaceModule(activeRules, resolvedScanRoots, resolvedDistScanRoots);
            return {};
        },
        resolveId(source) {
            if (source === SHARED_SURFACE_VIRTUAL_ID) {
                return SHARED_SURFACE_RESOLVED_ID;
            }
            return null;
        },
        load(moduleId) {
            if (moduleId !== SHARED_SURFACE_RESOLVED_ID) {
                return null;
            }
            return consumerSurfaceModuleCode;
        },
        transform(code, id) {
            if (!isProducerEntryFile(id) || code.includes(SHARED_SURFACE_VIRTUAL_ID)) {
                return null;
            }
            return {
                code: `import ${JSON.stringify(SHARED_SURFACE_VIRTUAL_ID)};
${code}`,
                map: null
            };
        }
    };
    const createConsumerBuildOutputConfig = () => {
        const sharedManifest = resolveConsumerSharedManifest();
        return {
            modulePreload: false,
            rollupOptions: {
                external: (moduleId) => {
                    if (isExternalSharedModuleId(moduleId)) {
                        return true;
                    }
                    return resolveSharedChunkFileKey(moduleId, activeRules) !== null;
                },
                output: {
                    ...sharedOutputOptions,
                    paths: (moduleId) => {
                        if (isExternalSharedModuleId(moduleId)) {
                            return moduleId;
                        }
                        const chunkFileKey = resolveSharedChunkFileKey(moduleId, activeRules);
                        if (!chunkFileKey) {
                            return moduleId;
                        }
                        return toAbsoluteSharedChunkUrl(chunkFileKey, publicPath, sharedManifest);
                    }
                }
            }
        };
    };
    const sharedChunksPlugin = {
        name: "vite-plugin-shared-chunks",
        apply: "build",
        enforce: "post",
        buildStart() {
            if (role === "producer") {
                sharedBuildId = createSharedBuildId();
                activeSharedManifest = buildSharedManifest(sharedBuildId, publicPath);
            }
        },
        config(userConfig) {
            const projectRoot = userConfig.root ?? process.cwd();
            if (role === "consumer") {
                const { scanRoots } = refreshActiveRules(projectRoot);
                resolvedScanRoots = scanRoots;
                activeSharedManifest = resolveConsumerSharedManifest();
                return { build: createConsumerBuildOutputConfig() };
            }
            producerProjectRoot = projectRoot;
            const { scanRoots, distScanRoots } = refreshActiveRules(projectRoot);
            resolvedScanRoots = scanRoots;
            resolvedDistScanRoots = distScanRoots;
            consumerSurfaceModuleCode = generateConsumerSurfaceModule(activeRules, resolvedScanRoots, resolvedDistScanRoots);
            return {
                build: producerRollupInput(projectRoot)
            };
        },
        transformIndexHtml(html) {
            return stripSharedFromHtml(html);
        },
        transform(code, id) {
            if (role !== "consumer" || id.includes("node_modules")) {
                return null;
            }
            const rewrittenCode = rewriteSharedBarrelImports(code, publicPath, resolveConsumerSharedManifest());
            if (rewrittenCode === code) {
                return null;
            }
            return { code: rewrittenCode, map: null };
        },
        generateBundle(_, bundle) {
            if (role === "consumer") {
                injectConsumerSharedCss(bundle, publicPath, consumerSharedDir);
                return;
            }
            if (!sharedBuildId) {
                return;
            }
            const sharedManifest = buildSharedManifest(sharedBuildId, publicPath);
            activeSharedManifest = sharedManifest;
            for (const bundleItem of Object.values(bundle)) {
                if (bundleItem.type === "chunk") {
                    const outputChunk = bundleItem;
                    outputChunk.code = rewriteSharedImportPaths(outputChunk.code, sharedManifest);
                    outputChunk.code = rewriteLegacyAbsoluteSharedPaths(outputChunk.code, publicPath, sharedManifest);
                }
            }
            const distSharedImports = scanConsumerDistSharedImports(resolvedDistScanRoots);
            for (const bundleItem of Object.values(bundle)) {
                if (bundleItem.type !== "chunk") {
                    continue;
                }
                const outputChunk = bundleItem;
                if (outputChunk.name !== "shared/vue") {
                    continue;
                }
                const requiredVueExports = collectRequiredExportsForChunk("shared/vue", distSharedImports, DEFAULT_VUE_COMPILER_EXPORTS);
                outputChunk.code = patchSharedChunkExportAliases(outputChunk.code, requiredVueExports);
            }
            for (const bundleItem of Object.values(bundle)) {
                if (bundleItem.type !== "asset") {
                    continue;
                }
                const outputAsset = bundleItem;
                if (typeof outputAsset.source !== "string") {
                    continue;
                }
                const assetFileName = outputAsset.fileName.replace(/\\/g, "/");
                if (!isSharedBundlePath(assetFileName, sharedManifest.dir)) {
                    continue;
                }
                const absoluteAssetPath = toAbsoluteSharedAssetUrl(assetFileName, publicPath, sharedManifest);
                for (const bundleChunk of Object.values(bundle)) {
                    if (bundleChunk.type !== "chunk") {
                        continue;
                    }
                    const chunkCode = bundleChunk;
                    const relativePattern = new RegExp(`(["'])${escapeRegExp(assetFileName)}\\1`, "g");
                    const assetsRelativePattern = new RegExp(`(["'])\\.?\\.?/?assets/${escapeRegExp(assetFileName)}\\1`, "g");
                    chunkCode.code = chunkCode.code.replace(relativePattern, `$1${absoluteAssetPath}$1`).replace(assetsRelativePattern, `$1${absoluteAssetPath}$1`);
                }
            }
            this.emitFile({
                type: "asset",
                fileName: SHARED_MANIFEST_FILE_NAME,
                source: serializeSharedManifest(sharedManifest)
            });
            injectSharedCssViaLinkLoader(bundle, publicPath, sharedManifest, collectSharedCssAssetsFromBundle(bundle, sharedManifest.dir));
        }
    };
    if (role === "producer") {
        return [producerSurfacePlugin, sharedChunksPlugin];
    }
    return sharedChunksPlugin;
};
export const createSharedChunksPlugin = sharedChunks;
