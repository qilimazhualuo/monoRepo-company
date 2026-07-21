import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";
import {
    isAntdvVendorPackage,
    resolveVueVendorChunkName
} from "./resolveChunk.js";
const SOURCE_FILE_PATTERN = /\.(vue|[cm]?[jt]sx?)$/;
const SKIP_DIR_NAMES = new Set(["node_modules", "dist", ".git"]);
const NEVER_SHARED_PACKAGES = new Set([
    "wujie",
    "wujie-vue3",
    "vite-plugin-app-base",
    "vite-plugin-shared-chunks"
]);
const normalizeRootPath = (rootPath) => rootPath.replace(/\\/g, "/");
export const dedupeScanRoots = (scanRoots) => {
    return scanRoots.filter((scanRoot, index, allRoots) => existsSync(scanRoot) && allRoots.findIndex((candidateRoot) => normalizeRootPath(candidateRoot) === normalizeRootPath(scanRoot)) === index);
};
const resolveAllScanRoots = (options) => dedupeScanRoots([
    options.producerRoot,
    ...options.consumerRoots
]);
const readPackageJson = (appRoot) => {
    const packageJsonPath = resolve(appRoot, "package.json");
    if (!existsSync(packageJsonPath)) {
        return null;
    }
    return JSON.parse(readFileSync(packageJsonPath, "utf-8"));
};
const collectSourceFiles = (scanRoot) => {
    const sourceFiles = [];
    const sourceDir = resolve(scanRoot, "src");
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
    walkDirectory(sourceDir);
    return sourceFiles;
};
const parsePackageNameFromSpecifier = (specifier) => {
    const normalized = specifier.split("?")[0].trim();
    if (!normalized || normalized.startsWith(".") || normalized.startsWith("/")) {
        return null;
    }
    if (normalized.startsWith("@")) {
        const scopedParts = normalized.split("/");
        if (scopedParts.length < 2) {
            return null;
        }
        return `${scopedParts[0]}/${scopedParts[1]}`;
    }
    return normalized.split("/")[0] || null;
};
const collectSourceImportPackages = (appRoot) => {
    const packageNames = new Set;
    const importPattern = /(?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,]+from\s+)?['"]([^'"]+)['"]/g;
    for (const sourceFile of collectSourceFiles(appRoot)) {
        const sourceCode = readFileSync(sourceFile, "utf-8");
        for (const match of sourceCode.matchAll(importPattern)) {
            const packageName = parsePackageNameFromSpecifier(match[1]);
            if (packageName) {
                packageNames.add(packageName);
            }
        }
    }
    return packageNames;
};
const collectPackageJsonDependencies = (appRoot) => {
    const packageNames = new Set;
    const packageJson = readPackageJson(appRoot);
    if (!packageJson) {
        return packageNames;
    }
    for (const field of ["dependencies", "peerDependencies", "optionalDependencies"]) {
        const fieldValue = packageJson[field];
        if (!fieldValue || typeof fieldValue !== "object") {
            continue;
        }
        for (const packageName of Object.keys(fieldValue)) {
            packageNames.add(packageName);
        }
    }
    return packageNames;
};
export const collectAppRuntimePackages = (appRoot) => {
    const packageNames = new Set;
    for (const packageName of collectPackageJsonDependencies(appRoot)) {
        packageNames.add(packageName);
    }
    for (const packageName of collectSourceImportPackages(appRoot)) {
        packageNames.add(packageName);
    }
    return packageNames;
};
const isVueEcosystemPackage = (packageName) => packageName === "vue" || packageName.startsWith("@vue/");
const expandSharedPackageClosure = (packageNames) => {
    const expandedPackages = new Set(packageNames);
    const usesVueEcosystem = [...expandedPackages].some(isVueEcosystemPackage);
    if (usesVueEcosystem) {
        expandedPackages.add("vue");
    }
    if (expandedPackages.has("antdv-next")) {
        expandedPackages.add("antdv-next");
    }
    return [...expandedPackages];
};
const filterShareablePackages = (packageNames, excludePackages) => {
    return packageNames.filter((packageName) => {
        if (NEVER_SHARED_PACKAGES.has(packageName)) {
            return false;
        }
        if (excludePackages.has(packageName)) {
            return false;
        }
        if (packageName.startsWith("vite") || packageName.startsWith("@vitejs/")) {
            return false;
        }
        if (packageName.startsWith("@types/")) {
            return false;
        }
        return true;
    });
};
export const discoverSharedPackages = (options) => {
    const appRoots = resolveAllScanRoots(options);
    const minAppCount = options.minAppCount ?? 2;
    const packageAppCount = new Map;
    for (const appRoot of appRoots) {
        const appPackages = collectAppRuntimePackages(appRoot);
        for (const packageName of appPackages) {
            packageAppCount.set(packageName, (packageAppCount.get(packageName) ?? 0) + 1);
        }
    }
    const duplicatePackages = [...packageAppCount.entries()].filter(([, appCount]) => appCount >= minAppCount).map(([packageName]) => packageName);
    const excludePackages = new Set(options.excludePackages ?? []);
    const mergedPackages = filterShareablePackages(expandSharedPackageClosure([
        ...duplicatePackages,
        ...options.extraPackages ?? []
    ]), excludePackages);
    return [...new Set(mergedPackages)].sort();
};
export const createRulesFromDiscoveredPackages = (packageNames) => {
    const rules = [];
    const packageSet = new Set(packageNames);
    if ([...packageSet].some(isVueEcosystemPackage)) {
        rules.push({
            packageName: "vue",
            resolveChunkName: resolveVueVendorChunkName
        });
    }
    for (const packageName of packageNames) {
        if (packageName === "vue") {
            continue;
        }
        if (isVueEcosystemPackage(packageName)) {
            rules.push({
                packageName,
                resolveChunkName: resolveVueVendorChunkName
            });
            continue;
        }
        rules.push({ packageName });
    }
    if (packageSet.has("antdv-next")) {
        const hasAntdvRule = rules.some((rule) => isAntdvVendorPackage(rule.packageName));
        if (!hasAntdvRule) {
            rules.push({ packageName: "antdv-next" });
        }
    }
    const uniqueRules = [];
    const seenPackages = new Set;
    for (const rule of rules) {
        if (seenPackages.has(rule.packageName)) {
            continue;
        }
        seenPackages.add(rule.packageName);
        uniqueRules.push(rule);
    }
    return uniqueRules;
};
export const resolveSharedRules = (options) => {
    if (options.explicitRules?.length) {
        return options.explicitRules;
    }
    const discoveredPackages = discoverSharedPackages({
        producerRoot: options.producerRoot,
        consumerRoots: options.consumerRoots,
        extraPackages: options.explicitPackages,
        excludePackages: options.excludePackages,
        minAppCount: options.minAppCount
    });
    return createRulesFromDiscoveredPackages(discoveredPackages);
};
export const formatDiscoveredPackagesLog = (scanRoots, packageNames) => {
    const rootNames = scanRoots.map((scanRoot) => basename(scanRoot)).join(", ");
    return `[vite-plugin-shared-chunks] auto shared (${rootNames}): ${packageNames.join(", ")}`;
};
