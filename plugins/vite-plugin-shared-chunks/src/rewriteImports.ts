import { resolveAntdvConsumerChunkKey, toAntdvChunkDefaultExportName, toAbsoluteSharedChunkUrl } from './resolveChunk.ts'
import type { SharedBuildManifest } from './sharedBuildManifest.ts'

interface NamedImportBinding {
    imported: string
    local: string
}

const parseNamedImportClause = (importClause: string): NamedImportBinding[] => {
    return importClause.split(',').map((part) => {
        const trimmed = part.trim()
        if (!trimmed) {
            return null
        }

        const aliasMatch = trimmed.match(/^([\w$]+)\s+as\s+([\w$]+)$/)
        if (aliasMatch) {
            return { imported: aliasMatch[1], local: aliasMatch[2] }
        }

        return { imported: trimmed, local: trimmed }
    }).filter((binding): binding is NamedImportBinding => binding !== null)
}

const formatImportBinding = ({ imported, local }: NamedImportBinding) => (
    imported === local ? imported : `${imported} as ${local}`
)

const formatAntdvImportBinding = ({ imported, local }: NamedImportBinding) => {
    const chunkExportName = toAntdvChunkDefaultExportName(imported)
    return `${chunkExportName} as ${local}`
}

const rewriteBarrelImports = (
    code: string,
    packageName: string,
    resolveTarget: (exportName: string) => string,
): string => {
    const barrelPattern = new RegExp(
        `import\\s*\\{([^}]+)\\}\\s*from\\s*['"]${packageName}['"]\\s*;?`,
        'g',
    )

    return code.replace(barrelPattern, (fullMatch, importClause) => {
        const namedImports = parseNamedImportClause(importClause)
        if (namedImports.length === 0) {
            return fullMatch
        }

        return namedImports.map((binding) => {
            const target = resolveTarget(binding.imported)
            const formatBinding = packageName === 'antdv-next'
                ? formatAntdvImportBinding
                : formatImportBinding
            return `import { ${formatBinding(binding)} } from ${JSON.stringify(target)};`
        }).join('\n')
    })
}

export const rewriteSharedBarrelImports = (
    code: string,
    publicPath: string,
    sharedManifest?: SharedBuildManifest | null,
): string => {
    const resolveChunkUrl = (chunkFileKey: string) => (
        toAbsoluteSharedChunkUrl(chunkFileKey, publicPath, sharedManifest)
    )

    let rewrittenCode = code

    rewrittenCode = rewriteBarrelImports(rewrittenCode, 'antdv-next', (exportName) => (
        resolveChunkUrl(resolveAntdvConsumerChunkKey(exportName))
    ))

    rewrittenCode = rewriteBarrelImports(rewrittenCode, 'wc-page', () => (
        resolveChunkUrl('shared/wc-page')
    ))

    rewrittenCode = rewriteBarrelImports(rewrittenCode, 'wc-ui', () => (
        resolveChunkUrl('shared/wc-ui')
    ))

    rewrittenCode = rewriteBarrelImports(rewrittenCode, 'wc-utils', () => (
        resolveChunkUrl('shared/wc-utils')
    ))

    return rewrittenCode
}
