import type { OutputAsset, OutputChunk } from 'rollup'
import { toAntdvDistSegment } from './resolveChunk.ts'

/** Vue 对外导出名与 Rollup 产物内实际 export 名的差异 */
const VUE_SHARED_EXPORT_ALIASES: Record<string, string> = {
    createElementVNode: 'createBaseVNode',
}

export const resolveAntdvDefaultExportName = (componentName: string): string => (
    `${toAntdvDistSegment(componentName)}_default`
)

const buildAntdvExportAliasMap = (requiredExportNames: Set<string>): Record<string, string> => {
    const aliasMap: Record<string, string> = {}

    for (const exportName of requiredExportNames) {
        aliasMap[exportName] = resolveAntdvDefaultExportName(exportName)
    }

    return aliasMap
}

export const patchAntdvChunkExportAliases = (
    chunkCode: string,
    requiredExportNames: Set<string>,
): string => {
    if (requiredExportNames.size === 0) {
        return chunkCode
    }

    return patchSharedChunkExportAliases(
        chunkCode,
        requiredExportNames,
        buildAntdvExportAliasMap(requiredExportNames),
    )
}

const parseExportBindingMap = (exportClause: string): Map<string, string> => {
    const exportNameToBinding = new Map<string, string>()

    for (const exportPart of exportClause.split(',')) {
        const trimmedPart = exportPart.trim()
        if (!trimmedPart) {
            continue
        }

        const aliasMatch = trimmedPart.match(/^([\w$]+)\s+as\s+([\w$]+)$/)
        if (aliasMatch) {
            exportNameToBinding.set(aliasMatch[2], aliasMatch[1])
            continue
        }

        exportNameToBinding.set(trimmedPart, trimmedPart)
    }

    return exportNameToBinding
}

const resolveMissingExportBinding = (
    exportName: string,
    exportNameToBinding: Map<string, string>,
    aliasMap: Record<string, string>,
): string | null => {
    if (exportNameToBinding.has(exportName)) {
        return null
    }

    const aliasSourceName = aliasMap[exportName]
    if (!aliasSourceName) {
        return null
    }

    const bindingName = exportNameToBinding.get(aliasSourceName)
    if (!bindingName) {
        return null
    }

    return `${bindingName} as ${exportName}`
}

export const patchSharedChunkExportAliases = (
    chunkCode: string,
    requiredExportNames: Set<string>,
    aliasMap: Record<string, string> = VUE_SHARED_EXPORT_ALIASES,
): string => {
    if (requiredExportNames.size === 0) {
        return chunkCode
    }

    const exportStart = chunkCode.lastIndexOf('export{')
    if (exportStart === -1) {
        return chunkCode
    }

    const clauseStart = exportStart + 'export{'.length
    const clauseEnd = chunkCode.indexOf('}', clauseStart)
    if (clauseEnd === -1) {
        return chunkCode
    }

    const exportClause = chunkCode.slice(clauseStart, clauseEnd)
    const exportNameToBinding = parseExportBindingMap(exportClause)
    const extraExportParts: string[] = []

    for (const exportName of requiredExportNames) {
        const missingBinding = resolveMissingExportBinding(
            exportName,
            exportNameToBinding,
            aliasMap,
        )
        if (missingBinding) {
            extraExportParts.push(missingBinding)
        }
    }

    if (extraExportParts.length === 0) {
        return chunkCode
    }

    const patchedExportClause = `${exportClause},${extraExportParts.join(',')}`
    return `${chunkCode.slice(0, clauseStart)}${patchedExportClause}${chunkCode.slice(clauseEnd)}`
}

export const collectRequiredExportsForChunk = (
    chunkFileKey: string,
    distSharedImports: Map<string, Set<string>>,
    defaultExports: string[] = [],
): Set<string> => {
    const requiredExportNames = new Set(defaultExports)

    const chunkKey = chunkFileKey.replace(/^shared\//, '').replace(/\.js$/, '')
    const distExports = distSharedImports.get(chunkKey)
    if (distExports) {
        for (const exportName of distExports) {
            requiredExportNames.add(exportName)
        }
    }

    return requiredExportNames
}
