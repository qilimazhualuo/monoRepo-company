import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";
import { isAntdvVendorPackage } from "./resolveChunk.js";
import { normalizeVueDistExportName } from "./patchChunkExports.js";
import { parseChunkKeyFromSharedUrl } from "./sharedBuildManifest.js";
export const SHARED_SURFACE_VIRTUAL_ID = "virtual:shared-chunks-consumer-surface";
export const SHARED_SURFACE_RESOLVED_ID = "\x00virtual:shared-chunks-consumer-surface";
export const SHARED_SURFACE_ENTRY_NAME = "shared-chunks-surface";
const FULL_REEXPORT_PACKAGES = new Set([
    "pinia"
]);
const CHUNK_KEY_TO_PACKAGE = {
    vue: "vue",
    "vue-router": "vue-router",
    pinia: "pinia",
    "wc-ui": "wc-ui",
    "wc-page": "wc-page",
    "wc-utils": "wc-utils"
};
export const DEFAULT_VUE_COMPILER_EXPORTS = [
    "createElementVNode",
    "createElementBlock",
    "createVNode",
    "createBlock",
    "createCommentVNode",
    "createTextVNode",
    "createStaticVNode",
    "openBlock",
    "defineComponent",
    "resolveComponent",
    "resolveDynamicComponent",
    "renderList",
    "renderSlot",
    "withCtx",
    "withDirectives",
    "withModifiers",
    "toDisplayString",
    "normalizeClass",
    "normalizeStyle",
    "normalizeProps",
    "guardReactiveProps",
    "mergeProps",
    "unref",
    "isRef",
    "toRef",
    "toRefs",
    "ref",
    "computed",
    "watch",
    "watchEffect",
    "onMounted",
    "onBeforeMount",
    "onUnmounted",
    "onBeforeUnmount",
    "onUpdated",
    "onBeforeUpdate",
    "Fragment",
    "Teleport",
    "Suspense",
    "KeepAlive",
    "cloneVNode",
    "isVNode",
    "getCurrentInstance",
    "inject",
    "provide",
    "nextTick",
    "h",
    "createApp",
    "shallowRef",
    "shallowReactive",
    "reactive",
    "isReactive",
    "markRaw",
    "toRaw",
    "effectScope",
    "onScopeDispose",
    "getCurrentScope",
    "useId"
];
const DEFAULT_VUE_ROUTER_EXPORTS = [
    "RouterView",
    "RouterLink",
    "useRoute",
    "useRouter",
    "createRouter",
    "createWebHashHistory",
    "createWebHistory",
    "createMemoryHistory"
];
const SOURCE_FILE_PATTERN = /\.(vue|[cm]?[jt]sx?)$/;
const SKIP_DIR_NAMES = new Set(["node_modules", "dist", ".git"]);
const parseEnvConsumerApps = (envMap) => {
    const consumerAppsText = envMap.CONSUMER_APPS ?? "";
    return consumerAppsText.split(",").map((appName) => appName.trim()).filter(Boolean);
};
export const resolveConsumerRoots = (producerRoot, options, envConsumerApps = []) => {
    if (options.consumerRoots?.length) {
        return options.consumerRoots.map((consumerRoot) => resolve(producerRoot, consumerRoot)).filter((consumerRoot) => existsSync(consumerRoot));
    }
    const appsParentDir = resolve(producerRoot, "..");
    const producerAppName = basename(producerRoot);
    const configuredAppNames = options.consumerApps ?? envConsumerApps;
    if (configuredAppNames.length > 0) {
        return configuredAppNames.map((appName) => resolve(appsParentDir, appName)).filter((consumerRoot) => existsSync(consumerRoot));
    }
    if (!existsSync(appsParentDir)) {
        return [];
    }
    return readdirSync(appsParentDir).filter((entryName) => {
        if (entryName === producerAppName) {
            return false;
        }
        const entryPath = resolve(appsParentDir, entryName);
        return existsSync(resolve(entryPath, "package.json"));
    }).map((entryName) => resolve(appsParentDir, entryName));
};
const collectSourceFiles = (scanRoot) => {
    const sourceFiles = [];
    const walkDirectory = (currentDir) => {
        if (!existsSync(currentDir)) {
            return;
        }
        for (const entryName of readdirSync(currentDir)) {
            const entryPath = resolve(currentDir, entryName);
            const entryStat = statSync(entryPath);
            if (entryStat.isDirectory()) {
                if (SKIP_DIR_NAMES.has(entryName)) {
                    continue;
                }
                walkDirectory(entryPath);
                continue;
            }
            if (SOURCE_FILE_PATTERN.test(entryName)) {
                sourceFiles.push(entryPath);
            }
        }
    };
    walkDirectory(resolve(scanRoot, "src"));
    return sourceFiles;
};
const parseNamedImportClause = (importClause) => {
    return importClause.split(",").map((part) => {
        const trimmed = part.trim();
        if (!trimmed || trimmed.startsWith("type ")) {
            return null;
        }
        const aliasMatch = trimmed.match(/^([\w$]+)\s+as\s+([\w$]+)$/);
        if (aliasMatch) {
            return aliasMatch[1];
        }
        return trimmed;
    }).filter((exportName) => Boolean(exportName));
};
const parseNamedImportsFromPackage = (code, packageName) => {
    const exportNames = new Set;
    const importPattern = new RegExp(`import\\s+(?!type\\s)\\{([^}]+)\\}\\s*from\\s*['"]${packageName}['"]`, "g");
    for (const match of code.matchAll(importPattern)) {
        for (const exportName of parseNamedImportClause(match[1])) {
            exportNames.add(exportName);
        }
    }
    return exportNames;
};
const kebabToPascalCase = (kebabName) => kebabName.split("-").map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1)).join("");
const normalizeAntdvComponentExportName = (exportName) => {
    if (exportName.endsWith("_default")) {
        return kebabToPascalCase(exportName.replace(/_default$/, ""));
    }
    if (/^[A-Z]/.test(exportName)) {
        return exportName;
    }
    return null;
};
const appendAntdvExportsFromDist = (antdvExportNames, distSharedImports) => {
    for (const [chunkKey, exportNames] of distSharedImports) {
        if (!chunkKey.startsWith("antdv/")) {
            continue;
        }
        const segment = chunkKey.replace("antdv/", "");
        if (segment !== "core") {
            antdvExportNames.add(kebabToPascalCase(segment));
        }
        for (const exportName of exportNames) {
            const normalizedName = normalizeAntdvComponentExportName(exportName);
            if (normalizedName) {
                antdvExportNames.add(normalizedName);
            }
        }
    }
};
const sanitizeAntdvExportNames = (exportNames) => {
    const sanitizedNames = new Set;
    for (const exportName of exportNames) {
        const normalizedName = normalizeAntdvComponentExportName(exportName);
        if (normalizedName) {
            sanitizedNames.add(normalizedName);
        }
    }
    return sanitizedNames;
};
const parseAntdvTemplateComponents = (vueCode) => {
    const componentNames = new Set;
    const templateMatch = vueCode.match(/<template[\s\S]*?<\/template>/i);
    if (!templateMatch) {
        return componentNames;
    }
    const antdvTagPattern = /<a-([a-z][a-z0-9-]*)/gi;
    for (const match of templateMatch[0].matchAll(antdvTagPattern)) {
        componentNames.add(kebabToPascalCase(match[1]));
    }
    return componentNames;
};
const parseAntdvTypeReferences = (code) => {
    const componentNames = new Set;
    const typeRefPattern = /import\('antdv-next'\)\['(\w+)'\]/g;
    for (const match of code.matchAll(typeRefPattern)) {
        componentNames.add(match[1]);
    }
    return componentNames;
};
export const scanConsumerSourceExports = (consumerRoots) => {
    const exportsByPackage = new Map;
    const addExportName = (packageName, exportName) => {
        if (!exportsByPackage.has(packageName)) {
            exportsByPackage.set(packageName, new Set);
        }
        exportsByPackage.get(packageName)?.add(exportName);
    };
    for (const consumerRoot of consumerRoots) {
        for (const sourceFile of collectSourceFiles(consumerRoot)) {
            const sourceCode = readFileSync(sourceFile, "utf-8");
            for (const exportName of parseNamedImportsFromPackage(sourceCode, "antdv-next")) {
                addExportName("antdv-next", exportName);
            }
            if (sourceFile.endsWith(".vue")) {
                for (const exportName of parseAntdvTemplateComponents(sourceCode)) {
                    addExportName("antdv-next", exportName);
                }
            }
            if (sourceFile.endsWith(".d.ts")) {
                for (const exportName of parseAntdvTypeReferences(sourceCode)) {
                    addExportName("antdv-next", exportName);
                }
            }
        }
    }
    return exportsByPackage;
};
const collectDistAssetFiles = (distDir) => {
    const assetFiles = [];
    const walkDirectory = (currentDir) => {
        if (!existsSync(currentDir)) {
            return;
        }
        for (const entryName of readdirSync(currentDir)) {
            const entryPath = resolve(currentDir, entryName);
            const entryStat = statSync(entryPath);
            if (entryStat.isDirectory()) {
                walkDirectory(entryPath);
                continue;
            }
            if (entryName.endsWith(".js")) {
                assetFiles.push(entryPath);
            }
        }
    };
    walkDirectory(distDir);
    return assetFiles;
};
export const scanConsumerDistSharedImports = (consumerRoots) => {
    const exportsByChunk = new Map;
    const sharedImportPattern = /import\s*\{([^}]+)\}\s*from\s*["'](\/shared[^"']+)["']/g;
    const addExportName = (chunkKey, exportName) => {
        if (!exportsByChunk.has(chunkKey)) {
            exportsByChunk.set(chunkKey, new Set);
        }
        exportsByChunk.get(chunkKey)?.add(exportName);
    };
    for (const consumerRoot of consumerRoots) {
        const distDir = resolve(consumerRoot, "dist");
        for (const assetFile of collectDistAssetFiles(distDir)) {
            const assetCode = readFileSync(assetFile, "utf-8");
            for (const match of assetCode.matchAll(sharedImportPattern)) {
                const chunkKey = parseChunkKeyFromSharedUrl(match[2]) ?? `shared/${match[2].replace(/^\/shared(?:-[a-f0-9]{8})?\//i, "").replace(/\.js$/, "")}`;
                for (const exportName of parseNamedImportClause(match[1])) {
                    addExportName(chunkKey, exportName);
                }
            }
        }
    }
    return exportsByChunk;
};
const resolvePackageFromChunkKey = (chunkKey) => {
    if (CHUNK_KEY_TO_PACKAGE[chunkKey]) {
        return CHUNK_KEY_TO_PACKAGE[chunkKey];
    }
    return null;
};
const collectExplicitPackageExports = (rules, scanRoots, distScanRoots) => {
    const exportsByPackage = new Map;
    const addExportName = (packageName, exportName) => {
        if (!exportsByPackage.has(packageName)) {
            exportsByPackage.set(packageName, new Set);
        }
        exportsByPackage.get(packageName)?.add(exportName);
    };
    if (isPackageInRules("vue", rules)) {
        for (const exportName of DEFAULT_VUE_COMPILER_EXPORTS) {
            addExportName("vue", exportName);
        }
    }
    if (isPackageInRules("vue-router", rules)) {
        for (const exportName of DEFAULT_VUE_ROUTER_EXPORTS) {
            addExportName("vue-router", exportName);
        }
    }
    const sourceExports = scanConsumerSourceExports(scanRoots);
    for (const [packageName, exportNames] of sourceExports) {
        if (!isPackageInRules(packageName, rules)) {
            continue;
        }
        for (const exportName of exportNames) {
            addExportName(packageName, exportName);
        }
    }
    for (const sourceFile of scanRoots.flatMap((scanRoot) => collectSourceFiles(scanRoot))) {
        const sourceCode = readFileSync(sourceFile, "utf-8");
        for (const packageName of ["vue", "vue-router", "pinia", "wc-ui", "wc-page", "wc-utils"]) {
            if (!isPackageInRules(packageName, rules)) {
                continue;
            }
            for (const exportName of parseNamedImportsFromPackage(sourceCode, packageName)) {
                addExportName(packageName, exportName);
            }
        }
    }
    const distSharedImports = scanConsumerDistSharedImports(distScanRoots);
    for (const [chunkKey, exportNames] of distSharedImports) {
        const packageName = resolvePackageFromChunkKey(chunkKey);
        if (!packageName || !isPackageInRules(packageName, rules)) {
            continue;
        }
        for (const exportName of exportNames) {
            const normalizedExportName = packageName === "vue" ? normalizeVueDistExportName(exportName) : exportName;
            addExportName(packageName, normalizedExportName);
        }
    }
    return exportsByPackage;
};
const appendExplicitPackagePreservation = (importLines, preservedBindings, packageName, exportNames) => {
    if (exportNames.size === 0) {
        return;
    }
    const sortedExports = [...exportNames].sort();
    importLines.push(`import { ${sortedExports.join(", ")} } from ${JSON.stringify(packageName)};`);
    preservedBindings.push(...sortedExports);
};
const isPackageInRules = (packageName, rules) => {
    if (packageName === "vue") {
        return rules.some((rule) => rule.packageName === "vue" || rule.packageName.startsWith("@vue/"));
    }
    if (FULL_REEXPORT_PACKAGES.has(packageName) || packageName === "vue-router") {
        return rules.some((rule) => rule.packageName === packageName);
    }
    return rules.some((rule) => rule.packageName === packageName);
};
const resolveFullReexportPackages = (rules) => {
    return [...FULL_REEXPORT_PACKAGES].filter((packageName) => isPackageInRules(packageName, rules));
};
export const generateConsumerSurfaceModule = (rules, scanRoots, distScanRoots = scanRoots) => {
    const importLines = [
        "/** Generated by vite-plugin-shared-chunks: keep consumer-required shared exports in producer build. */"
    ];
    const preservedBindings = [];
    if (isPackageInRules("pinia", rules)) {
        importLines.push('import * as __sharedPinia from "pinia";');
        preservedBindings.push("__sharedPinia");
    }
    const explicitExports = collectExplicitPackageExports(rules, scanRoots, distScanRoots);
    const antdvExportNames = new Set(explicitExports.get("antdv-next") ?? []);
    const sourceAntdvExports = scanConsumerSourceExports(scanRoots).get("antdv-next");
    if (sourceAntdvExports) {
        for (const exportName of sourceAntdvExports) {
            antdvExportNames.add(exportName);
        }
    }
    const distSharedImports = scanConsumerDistSharedImports(distScanRoots);
    appendAntdvExportsFromDist(antdvExportNames, distSharedImports);
    if (antdvExportNames.size > 0) {
        explicitExports.set("antdv-next", sanitizeAntdvExportNames(antdvExportNames));
    }
    for (const packageName of ["vue", "vue-router", "wc-ui", "wc-page", "wc-utils", "antdv-next"]) {
        if (!isPackageInRules(packageName, rules)) {
            continue;
        }
        appendExplicitPackagePreservation(importLines, preservedBindings, packageName, explicitExports.get(packageName) ?? new Set);
    }
    if (preservedBindings.length > 0) {
        importLines.push(`globalThis.__SHARED_CHUNK_SURFACE__ = { ${preservedBindings.join(", ")} };`);
    }
    return `${importLines.join(`
`)}
`;
};
export const loadConsumerAppsFromEnv = (envMap) => parseEnvConsumerApps(envMap);
