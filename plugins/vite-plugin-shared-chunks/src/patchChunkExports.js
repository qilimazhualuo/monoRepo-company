import { toAntdvDistSegment } from "./resolveChunk.js";
const VUE_SHARED_EXPORT_ALIASES = {
    createElementVNode: "createBaseVNode"
};
const VUE_DIST_IMPORT_NORMALIZE = Object.fromEntries(Object.entries(VUE_SHARED_EXPORT_ALIASES).map(([publicName, bundledName]) => [
    bundledName,
    publicName
]));
export const normalizeVueDistExportName = (exportName) => VUE_DIST_IMPORT_NORMALIZE[exportName] ?? exportName;
export const resolveAntdvDefaultExportName = (componentName) => `${toAntdvDistSegment(componentName)}_default`;
const buildAntdvExportAliasMap = (requiredExportNames) => {
    const aliasMap = {};
    for (const exportName of requiredExportNames) {
        aliasMap[exportName] = resolveAntdvDefaultExportName(exportName);
    }
    return aliasMap;
};
export const patchAntdvChunkExportAliases = (chunkCode, requiredExportNames) => {
    if (requiredExportNames.size === 0) {
        return chunkCode;
    }
    return patchSharedChunkExportAliases(chunkCode, requiredExportNames, buildAntdvExportAliasMap(requiredExportNames));
};
const parseExportBindingMap = (exportClause) => {
    const exportNameToBinding = new Map;
    for (const exportPart of exportClause.split(",")) {
        const trimmedPart = exportPart.trim();
        if (!trimmedPart) {
            continue;
        }
        const aliasMatch = trimmedPart.match(/^([\w$]+)\s+as\s+([\w$]+)$/);
        if (aliasMatch) {
            exportNameToBinding.set(aliasMatch[2], aliasMatch[1]);
            continue;
        }
        exportNameToBinding.set(trimmedPart, trimmedPart);
    }
    return exportNameToBinding;
};
const resolveMissingExportBinding = (exportName, exportNameToBinding, aliasMap) => {
    if (exportNameToBinding.has(exportName)) {
        return null;
    }
    const aliasSourceName = aliasMap[exportName];
    if (!aliasSourceName) {
        return null;
    }
    const bindingName = exportNameToBinding.get(aliasSourceName);
    if (!bindingName) {
        return null;
    }
    return `${bindingName} as ${exportName}`;
};
export const patchSharedChunkExportAliases = (chunkCode, requiredExportNames, aliasMap = VUE_SHARED_EXPORT_ALIASES) => {
    if (requiredExportNames.size === 0) {
        return chunkCode;
    }
    const exportStart = chunkCode.lastIndexOf("export{");
    if (exportStart === -1) {
        return chunkCode;
    }
    const clauseStart = exportStart + "export{".length;
    const clauseEnd = chunkCode.indexOf("}", clauseStart);
    if (clauseEnd === -1) {
        return chunkCode;
    }
    const exportClause = chunkCode.slice(clauseStart, clauseEnd);
    const exportNameToBinding = parseExportBindingMap(exportClause);
    const extraExportParts = [];
    for (const exportName of requiredExportNames) {
        const missingBinding = resolveMissingExportBinding(exportName, exportNameToBinding, aliasMap);
        if (missingBinding) {
            extraExportParts.push(missingBinding);
        }
    }
    if (extraExportParts.length === 0) {
        return chunkCode;
    }
    const patchedExportClause = `${exportClause},${extraExportParts.join(",")}`;
    return `${chunkCode.slice(0, clauseStart)}${patchedExportClause}${chunkCode.slice(clauseEnd)}`;
};
export const collectRequiredExportsForChunk = (chunkFileKey, distSharedImports, defaultExports = []) => {
    const requiredExportNames = new Set(defaultExports);
    const chunkKey = chunkFileKey.replace(/^shared\//, "").replace(/\.js$/, "");
    const distExports = distSharedImports.get(chunkKey);
    if (distExports) {
        for (const exportName of distExports) {
            requiredExportNames.add(exportName);
        }
    }
    return requiredExportNames;
};
