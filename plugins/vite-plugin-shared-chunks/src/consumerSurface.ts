import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import type { SharedChunkRuleLike } from './resolveChunk.ts'
import { isAntdvVendorPackage } from './resolveChunk.ts'
import { normalizeVueDistExportName } from './patchChunkExports.ts'
import { parseChunkKeyFromSharedUrl } from './sharedBuildManifest.ts'

export const SHARED_SURFACE_VIRTUAL_ID = 'virtual:shared-chunks-consumer-surface'
export const SHARED_SURFACE_RESOLVED_ID = '\0virtual:shared-chunks-consumer-surface'
export const SHARED_SURFACE_ENTRY_NAME = 'shared-chunks-surface'

/** 单文�?shared chunk：export * 可保留完�?API 的包 */
const FULL_REEXPORT_PACKAGES = new Set([
    'pinia',
])

const CHUNK_KEY_TO_PACKAGE: Record<string, string> = {
    vue: 'vue',
    'vue-router': 'vue-router',
    pinia: 'pinia',
    'wc-ui': 'wc-ui',
    'wc-page': 'wc-page',
    'wc-utils': 'wc-utils',
}

/** Vue SFC 编译产物常引用的 runtime helper，首包构建时 consumer dist 可能尚不存在 */
export const DEFAULT_VUE_COMPILER_EXPORTS = [
    'createElementVNode',
    'createElementBlock',
    'createVNode',
    'createBlock',
    'createCommentVNode',
    'createTextVNode',
    'createStaticVNode',
    'openBlock',
    'defineComponent',
    'resolveComponent',
    'resolveDynamicComponent',
    'renderList',
    'renderSlot',
    'withCtx',
    'withDirectives',
    'withModifiers',
    'toDisplayString',
    'normalizeClass',
    'normalizeStyle',
    'normalizeProps',
    'guardReactiveProps',
    'mergeProps',
    'unref',
    'isRef',
    'toRef',
    'toRefs',
    'ref',
    'computed',
    'watch',
    'watchEffect',
    'onMounted',
    'onBeforeMount',
    'onUnmounted',
    'onBeforeUnmount',
    'onUpdated',
    'onBeforeUpdate',
    'Fragment',
    'Teleport',
    'Suspense',
    'KeepAlive',
    'cloneVNode',
    'isVNode',
    'getCurrentInstance',
    'inject',
    'provide',
    'nextTick',
    'h',
    'createApp',
    'shallowRef',
    'shallowReactive',
    'reactive',
    'isReactive',
    'markRaw',
    'toRaw',
    'effectScope',
    'onScopeDispose',
    'getCurrentScope',
    'useId',
]

const DEFAULT_VUE_ROUTER_EXPORTS = [
    'RouterView',
    'RouterLink',
    'useRoute',
    'useRouter',
    'createRouter',
    'createWebHashHistory',
    'createWebHistory',
    'createMemoryHistory',
]

const SOURCE_FILE_PATTERN = /\.(vue|[cm]?[jt]sx?)$/
const SKIP_DIR_NAMES = new Set(['node_modules', 'dist', '.git'])

const parseEnvConsumerApps = (envMap: Record<string, string>): string[] => {
    const consumerAppsText = envMap.CONSUMER_APPS ?? ''
    return consumerAppsText
        .split(',')
        .map((appName) => appName.trim())
        .filter(Boolean)
}

export const resolveConsumerRoots = (
    producerRoot: string,
    options: {
        consumerApps?: string[]
        consumerRoots?: string[]
    },
    envConsumerApps: string[] = [],
): string[] => {
    if (options.consumerRoots?.length) {
        return options.consumerRoots
            .map((consumerRoot) => resolve(producerRoot, consumerRoot))
            .filter((consumerRoot) => existsSync(consumerRoot))
    }

    const appsParentDir = resolve(producerRoot, '..')
    const producerAppName = basename(producerRoot)
    const configuredAppNames = options.consumerApps ?? envConsumerApps

    if (configuredAppNames.length > 0) {
        return configuredAppNames
            .map((appName) => resolve(appsParentDir, appName))
            .filter((consumerRoot) => existsSync(consumerRoot))
    }

    if (!existsSync(appsParentDir)) {
        return []
    }

    return readdirSync(appsParentDir)
        .filter((entryName) => {
            if (entryName === producerAppName) {
                return false
            }
            const entryPath = resolve(appsParentDir, entryName)
            return existsSync(resolve(entryPath, 'package.json'))
        })
        .map((entryName) => resolve(appsParentDir, entryName))
}

const collectSourceFiles = (scanRoot: string): string[] => {
    const sourceFiles: string[] = []

    const walkDirectory = (currentDir: string) => {
        if (!existsSync(currentDir)) {
            return
        }

        for (const entryName of readdirSync(currentDir)) {
            const entryPath = resolve(currentDir, entryName)
            const entryStat = statSync(entryPath)

            if (entryStat.isDirectory()) {
                if (SKIP_DIR_NAMES.has(entryName)) {
                    continue
                }
                walkDirectory(entryPath)
                continue
            }

            if (SOURCE_FILE_PATTERN.test(entryName)) {
                sourceFiles.push(entryPath)
            }
        }
    }

    walkDirectory(resolve(scanRoot, 'src'))
    return sourceFiles
}

const parseNamedImportClause = (importClause: string): string[] => {
    return importClause.split(',').map((part) => {
        const trimmed = part.trim()
        if (!trimmed || trimmed.startsWith('type ')) {
            return null
        }

        const aliasMatch = trimmed.match(/^([\w$]+)\s+as\s+([\w$]+)$/)
        if (aliasMatch) {
            return aliasMatch[1]
        }

        return trimmed
    }).filter((exportName): exportName is string => Boolean(exportName))
}

const parseNamedImportsFromPackage = (code: string, packageName: string): Set<string> => {
    const exportNames = new Set<string>()
    const importPattern = new RegExp(
        `import\\s+(?!type\\s)\\{([^}]+)\\}\\s*from\\s*['"]${packageName}['"]`,
        'g',
    )

    for (const match of code.matchAll(importPattern)) {
        for (const exportName of parseNamedImportClause(match[1])) {
            exportNames.add(exportName)
        }
    }

    return exportNames
}

const kebabToPascalCase = (kebabName: string): string => (
    kebabName
        .split('-')
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join('')
)

/** consumer dist 里是 button_default，antdv-next 包根只认 Button */
const normalizeAntdvComponentExportName = (exportName: string): string | null => {
    if (exportName.endsWith('_default')) {
        return kebabToPascalCase(exportName.replace(/_default$/, ''))
    }

    if (/^[A-Z]/.test(exportName)) {
        return exportName
    }

    return null
}

const appendAntdvExportsFromDist = (
    antdvExportNames: Set<string>,
    distSharedImports: Map<string, Set<string>>,
) => {
    for (const [chunkKey, exportNames] of distSharedImports) {
        if (!chunkKey.startsWith('antdv/')) {
            continue
        }

        const segment = chunkKey.replace('antdv/', '')
        if (segment !== 'core') {
            antdvExportNames.add(kebabToPascalCase(segment))
        }

        for (const exportName of exportNames) {
            const normalizedName = normalizeAntdvComponentExportName(exportName)
            if (normalizedName) {
                antdvExportNames.add(normalizedName)
            }
        }
    }
}

const sanitizeAntdvExportNames = (exportNames: Set<string>): Set<string> => {
    const sanitizedNames = new Set<string>()

    for (const exportName of exportNames) {
        const normalizedName = normalizeAntdvComponentExportName(exportName)
        if (normalizedName) {
            sanitizedNames.add(normalizedName)
        }
    }

    return sanitizedNames
}

const parseAntdvTemplateComponents = (vueCode: string): Set<string> => {
    const componentNames = new Set<string>()
    const templateMatch = vueCode.match(/<template[\s\S]*?<\/template>/i)
    if (!templateMatch) {
        return componentNames
    }

    const antdvTagPattern = /<a-([a-z][a-z0-9-]*)/gi
    for (const match of templateMatch[0].matchAll(antdvTagPattern)) {
        componentNames.add(kebabToPascalCase(match[1]))
    }

    return componentNames
}

const parseAntdvTypeReferences = (code: string): Set<string> => {
    const componentNames = new Set<string>()
    const typeRefPattern = /import\('antdv-next'\)\['(\w+)'\]/g

    for (const match of code.matchAll(typeRefPattern)) {
        componentNames.add(match[1])
    }

    return componentNames
}

export const scanConsumerSourceExports = (consumerRoots: string[]): Map<string, Set<string>> => {
    const exportsByPackage = new Map<string, Set<string>>()

    const addExportName = (packageName: string, exportName: string) => {
        if (!exportsByPackage.has(packageName)) {
            exportsByPackage.set(packageName, new Set())
        }
        exportsByPackage.get(packageName)?.add(exportName)
    }

    for (const consumerRoot of consumerRoots) {
        for (const sourceFile of collectSourceFiles(consumerRoot)) {
            const sourceCode = readFileSync(sourceFile, 'utf-8')

            for (const exportName of parseNamedImportsFromPackage(sourceCode, 'antdv-next')) {
                addExportName('antdv-next', exportName)
            }

            if (sourceFile.endsWith('.vue')) {
                for (const exportName of parseAntdvTemplateComponents(sourceCode)) {
                    addExportName('antdv-next', exportName)
                }
            }

            if (sourceFile.endsWith('.d.ts')) {
                for (const exportName of parseAntdvTypeReferences(sourceCode)) {
                    addExportName('antdv-next', exportName)
                }
            }
        }
    }

    return exportsByPackage
}

const collectDistAssetFiles = (distDir: string): string[] => {
    const assetFiles: string[] = []

    const walkDirectory = (currentDir: string) => {
        if (!existsSync(currentDir)) {
            return
        }

        for (const entryName of readdirSync(currentDir)) {
            const entryPath = resolve(currentDir, entryName)
            const entryStat = statSync(entryPath)

            if (entryStat.isDirectory()) {
                walkDirectory(entryPath)
                continue
            }

            if (entryName.endsWith('.js')) {
                assetFiles.push(entryPath)
            }
        }
    }

    walkDirectory(distDir)
    return assetFiles
}

/** consumer 已构建时，从产物里收集对 /shared/*.js 的具�?import（含 Vue 编译�?helper�?*/
export const scanConsumerDistSharedImports = (consumerRoots: string[]): Map<string, Set<string>> => {
    const exportsByChunk = new Map<string, Set<string>>()
    const sharedImportPattern = /import\s*\{([^}]+)\}\s*from\s*["'](\/shared[^"']+)["']/g

    const addExportName = (chunkKey: string, exportName: string) => {
        if (!exportsByChunk.has(chunkKey)) {
            exportsByChunk.set(chunkKey, new Set())
        }
        exportsByChunk.get(chunkKey)?.add(exportName)
    }

    for (const consumerRoot of consumerRoots) {
        const distDir = resolve(consumerRoot, 'dist')
        for (const assetFile of collectDistAssetFiles(distDir)) {
            const assetCode = readFileSync(assetFile, 'utf-8')

            for (const match of assetCode.matchAll(sharedImportPattern)) {
                const chunkKey = parseChunkKeyFromSharedUrl(match[2])
                    ?? `shared/${match[2].replace(/^\/shared(?:-[a-f0-9]{8})?\//i, '').replace(/\.js$/, '')}`
                for (const exportName of parseNamedImportClause(match[1])) {
                    addExportName(chunkKey, exportName)
                }
            }
        }
    }

    return exportsByChunk
}

const resolvePackageFromChunkKey = (chunkKey: string): string | null => {
    if (CHUNK_KEY_TO_PACKAGE[chunkKey]) {
        return CHUNK_KEY_TO_PACKAGE[chunkKey]
    }
    return null
}

const collectExplicitPackageExports = (
    rules: SharedChunkRuleLike[],
    scanRoots: string[],
    distScanRoots: string[],
): Map<string, Set<string>> => {
    const exportsByPackage = new Map<string, Set<string>>()

    const addExportName = (packageName: string, exportName: string) => {
        if (!exportsByPackage.has(packageName)) {
            exportsByPackage.set(packageName, new Set())
        }
        exportsByPackage.get(packageName)?.add(exportName)
    }

    if (isPackageInRules('vue', rules)) {
        for (const exportName of DEFAULT_VUE_COMPILER_EXPORTS) {
            addExportName('vue', exportName)
        }
    }

    if (isPackageInRules('vue-router', rules)) {
        for (const exportName of DEFAULT_VUE_ROUTER_EXPORTS) {
            addExportName('vue-router', exportName)
        }
    }

    const sourceExports = scanConsumerSourceExports(scanRoots)
    for (const [packageName, exportNames] of sourceExports) {
        if (!isPackageInRules(packageName, rules)) {
            continue
        }
        for (const exportName of exportNames) {
            addExportName(packageName, exportName)
        }
    }

    for (const sourceFile of scanRoots.flatMap((scanRoot) => collectSourceFiles(scanRoot))) {
        const sourceCode = readFileSync(sourceFile, 'utf-8')
        for (const packageName of ['vue', 'vue-router', 'pinia', 'wc-ui', 'wc-page', 'wc-utils']) {
            if (!isPackageInRules(packageName, rules)) {
                continue
            }
            for (const exportName of parseNamedImportsFromPackage(sourceCode, packageName)) {
                addExportName(packageName, exportName)
            }
        }
    }

    const distSharedImports = scanConsumerDistSharedImports(distScanRoots)
    for (const [chunkKey, exportNames] of distSharedImports) {
        const packageName = resolvePackageFromChunkKey(chunkKey)
        if (!packageName || !isPackageInRules(packageName, rules)) {
            continue
        }
        for (const exportName of exportNames) {
            const normalizedExportName = packageName === 'vue'
                ? normalizeVueDistExportName(exportName)
                : exportName
            addExportName(packageName, normalizedExportName)
        }
    }

    return exportsByPackage
}

const appendExplicitPackagePreservation = (
    importLines: string[],
    preservedBindings: string[],
    packageName: string,
    exportNames: Set<string>,
) => {
    if (exportNames.size === 0) {
        return
    }

    const sortedExports = [...exportNames].sort()
    importLines.push(
        `import { ${sortedExports.join(', ')} } from ${JSON.stringify(packageName)};`,
    )
    preservedBindings.push(...sortedExports)
}

const isPackageInRules = (packageName: string, rules: SharedChunkRuleLike[]): boolean => {
    if (packageName === 'vue') {
        return rules.some((rule) => rule.packageName === 'vue' || rule.packageName.startsWith('@vue/'))
    }

    if (FULL_REEXPORT_PACKAGES.has(packageName) || packageName === 'vue-router') {
        return rules.some((rule) => rule.packageName === packageName)
    }

    return rules.some((rule) => rule.packageName === packageName)
}

const resolveFullReexportPackages = (rules: SharedChunkRuleLike[]): string[] => {
    return [...FULL_REEXPORT_PACKAGES].filter((packageName) => isPackageInRules(packageName, rules))
}

export const generateConsumerSurfaceModule = (
    rules: SharedChunkRuleLike[],
    scanRoots: string[],
    distScanRoots: string[] = scanRoots,
): string => {
    const importLines: string[] = [
        '/** Generated by vite-plugin-shared-chunks: keep consumer-required shared exports in producer build. */',
    ]
    const preservedBindings: string[] = []

    if (isPackageInRules('pinia', rules)) {
        importLines.push('import * as __sharedPinia from "pinia";')
        preservedBindings.push('__sharedPinia')
    }

    const explicitExports = collectExplicitPackageExports(rules, scanRoots, distScanRoots)
    const antdvExportNames = new Set<string>(explicitExports.get('antdv-next') ?? [])
    const sourceAntdvExports = scanConsumerSourceExports(scanRoots).get('antdv-next')
    if (sourceAntdvExports) {
        for (const exportName of sourceAntdvExports) {
            antdvExportNames.add(exportName)
        }
    }

    const distSharedImports = scanConsumerDistSharedImports(distScanRoots)
    appendAntdvExportsFromDist(antdvExportNames, distSharedImports)

    if (antdvExportNames.size > 0) {
        explicitExports.set('antdv-next', sanitizeAntdvExportNames(antdvExportNames))
    }

    for (const packageName of ['vue', 'vue-router', 'wc-ui', 'wc-page', 'wc-utils', 'antdv-next']) {
        if (!isPackageInRules(packageName, rules)) {
            continue
        }
        appendExplicitPackagePreservation(
            importLines,
            preservedBindings,
            packageName,
            explicitExports.get(packageName) ?? new Set(),
        )
    }

    if (preservedBindings.length > 0) {
        importLines.push(
            `globalThis.__SHARED_CHUNK_SURFACE__ = { ${preservedBindings.join(', ')} };`,
        )
    }

    return `${importLines.join('\n')}\n`
}

export const loadConsumerAppsFromEnv = (envMap: Record<string, string>): string[] => (
    parseEnvConsumerApps(envMap)
)
