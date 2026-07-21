import { resolveAntdvConsumerChunkKey, toAntdvChunkDefaultExportName, toAbsoluteSharedChunkUrl } from "./resolveChunk.js";
const parseNamedImportClause = (importClause) => {
    return importClause.split(",").map((part) => {
        const trimmed = part.trim();
        if (!trimmed) {
            return null;
        }
        const aliasMatch = trimmed.match(/^([\w$]+)\s+as\s+([\w$]+)$/);
        if (aliasMatch) {
            return { imported: aliasMatch[1], local: aliasMatch[2] };
        }
        return { imported: trimmed, local: trimmed };
    }).filter((binding) => binding !== null);
};
const formatImportBinding = ({ imported, local }) => imported === local ? imported : `${imported} as ${local}`;
const formatAntdvImportBinding = ({ imported, local }) => {
    const chunkExportName = toAntdvChunkDefaultExportName(imported);
    return `${chunkExportName} as ${local}`;
};
const rewriteBarrelImports = (code, packageName, resolveTarget) => {
    const barrelPattern = new RegExp(`import\\s*\\{([^}]+)\\}\\s*from\\s*['"]${packageName}['"]\\s*;?`, "g");
    return code.replace(barrelPattern, (fullMatch, importClause) => {
        const namedImports = parseNamedImportClause(importClause);
        if (namedImports.length === 0) {
            return fullMatch;
        }
        return namedImports.map((binding) => {
            const target = resolveTarget(binding.imported);
            const formatBinding = packageName === "antdv-next" ? formatAntdvImportBinding : formatImportBinding;
            return `import { ${formatBinding(binding)} } from ${JSON.stringify(target)};`;
        }).join(`
`);
    });
};
export const rewriteSharedBarrelImports = (code, publicPath, sharedManifest) => {
    const resolveChunkUrl = (chunkFileKey) => toAbsoluteSharedChunkUrl(chunkFileKey, publicPath, sharedManifest);
    let rewrittenCode = code;
    rewrittenCode = rewriteBarrelImports(rewrittenCode, "antdv-next", (exportName) => resolveChunkUrl(resolveAntdvConsumerChunkKey(exportName)));
    rewrittenCode = rewriteBarrelImports(rewrittenCode, "wc-page", () => resolveChunkUrl("shared/wc-page"));
    rewrittenCode = rewriteBarrelImports(rewrittenCode, "wc-ui", () => resolveChunkUrl("shared/wc-ui"));
    rewrittenCode = rewriteBarrelImports(rewrittenCode, "wc-utils", () => resolveChunkUrl("shared/wc-utils"));
    return rewrittenCode;
};
