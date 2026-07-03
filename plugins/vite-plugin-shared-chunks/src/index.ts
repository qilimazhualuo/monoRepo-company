import type { OutputAsset, OutputChunk } from 'rollup'
import type { Plugin, UserConfig } from 'vite'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import {
    generateConsumerSurfaceModule,
    resolveConsumerRoots,
    scanConsumerDistSharedImports,
    scanConsumerSourceExports,
    DEFAULT_VUE_COMPILER_EXPORTS,
    SHARED_SURFACE_RESOLVED_ID,
    SHARED_SURFACE_VIRTUAL_ID,
} from './consumerSurface.ts'
import { createRulesFromPackages, loadSharedChunksEnv } from './loadEnv.ts'
import {
    dedupeScanRoots,
    discoverSharedPackages,
    formatDiscoveredPackagesLog,
    resolveSharedRules,
} from './discoverSharedPackages.ts'
import {
    collectRequiredExportsForChunk,
    patchSharedChunkExportAliases,
} from './patchChunkExports.ts'
import { rewriteSharedBarrelImports } from './rewriteImports.ts'
import {
    buildSharedManifest,
    createSharedBuildId,
    loadSharedBuildManifest,
    resolveSharedBuildDir,
    serializeSharedManifest,
    SHARED_MANIFEST_FILE_NAME,
    sharedJsUrlPattern,
    toSharedBundleDirName,
    toSharedBundlePrefix,
    type SharedBuildManifest,
} from './sharedBuildManifest.ts'
import {
    resolveSharedChunkFileKey,
    resolveSharedChunkName,
    resolveVueVendorChunkName,
    toAbsoluteSharedAssetUrl,
    toAbsoluteSharedChunkUrl,
} from './resolveChunk.ts'

export type { SharedChunksEnv } from './loadEnv.ts'
export { createRulesFromPackages, loadSharedChunksEnv } from './loadEnv.ts'
export {
    collectAppRuntimePackages,
    createRulesFromDiscoveredPackages,
    dedupeScanRoots,
    discoverSharedPackages,
    resolveSharedRules,
} from './discoverSharedPackages.ts'
export {
    defaultResolveChunkName,
    isAntdvVendorPackage,
    resolveAntdvSharedChunkName,
    resolveWorkspaceSharedChunkName,
} from './resolveChunk.ts'

export interface SharedChunkRule {
    /** node_modules 包名，如 antdv-next、@vue/reactivity */
    packageName: string
    /**
     * 生成固定 chunk 名（不含扩展名），返回 null 表示该模块不单独拆包
     * @param moduleId Rollup 模块 id
     */
    resolveChunkName?: (moduleId: string) => string | null
}

export type SharedChunksRole = 'producer' | 'consumer'

export interface SharedChunksPluginOptions {
    /**
     * producer：打出 /shared/*.js（基座）
     * consumer：外部引用基座已构建的 /shared/*（子应用，须先 build:main）
     */
    role?: SharedChunksRole
    /**
     * 共享 chunk 在站点上的绝对路径前缀
     * 默认读取插件包 .env 的 PUBLIC_PATH
     */
    publicPath?: string
    /** 覆盖 .env 的 PACKAGES，作为额外追加的共享包 */
    packages?: string[]
    /** 依赖规则，优先级最高（指定后不再自动发现） */
    rules?: SharedChunkRule[]
    /** 是否自动扫描多应用重复依赖，默认 true */
    autoDiscover?: boolean
    /** 自动发现时至少被多少个应用使用，默认 2 */
    minAppCount?: number
    /** 自动发现时强制排除的包名 */
    excludePackages?: string[]
    /** .env 文件路径，默认 plugins/vite-plugin-shared-chunks/.env */
    envFile?: string
    /**
     * consumer 模式下基座 shared 目录，用于按需注入同名 .css
     * 默认 {cwd}/../main/dist/shared
     */
    consumerSharedDir?: string
    /**
     * producer 扫描的应用目录名（相对 apps/），默认读 .env CONSUMER_APPS 或 apps 下除自身外全部
     */
    consumerApps?: string[]
    /** producer 扫描的子应用绝对/相对路径，优先级高于 consumerApps */
    consumerRoots?: string[]
}

export const DEFAULT_SHARED_CHUNK_RULES: SharedChunkRule[] = [
    { packageName: 'vue', resolveChunkName: resolveVueVendorChunkName },
    { packageName: 'vue-router' },
    { packageName: 'pinia' },
    { packageName: '@vue/shared', resolveChunkName: resolveVueVendorChunkName },
    { packageName: '@vue/reactivity', resolveChunkName: resolveVueVendorChunkName },
    { packageName: '@vue/runtime-core', resolveChunkName: resolveVueVendorChunkName },
    { packageName: '@vue/runtime-dom', resolveChunkName: resolveVueVendorChunkName },
]

const normalizePublicPath = (publicPath: string) => {
    const trimmedPath = publicPath.trim()
    if (!trimmedPath) {
        return '/shared/'
    }
    const withLeadingSlash = trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`
    return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
}

const isSharedChunkName = (chunkName?: string) => {
    return Boolean(chunkName?.startsWith('shared/'))
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const rewriteSharedImportPaths = (code: string, sharedManifest: SharedBuildManifest) => {
    const manifestBase = sharedManifest.base.replace(/\/$/, '')
    const bundleDirPattern = escapeRegExp(sharedManifest.dir)
    const relativeSharedPattern = new RegExp(
        `(from|import|import\\()\\s*(['"])(?:\\.\\.\\/)+${bundleDirPattern}\\/`,
        'g',
    )
    const legacyNestedPattern = new RegExp(
        `(from|import|import\\()\\s*(['"])(?:\\.\\.\\/)+shared\\/${escapeRegExp(sharedManifest.buildId)}\\/`,
        'g',
    )

    return code
        .replace(relativeSharedPattern, `$1$2${manifestBase}/`)
        .replace(legacyNestedPattern, `$1$2${manifestBase}/`)
        .replace(
            new RegExp(`(${escapeRegExp(manifestBase)}/)${bundleDirPattern}/`, 'g'),
            '$1',
        )
}

const rewriteLegacyAbsoluteSharedPaths = (
    code: string,
    publicPath: string,
    sharedManifest: SharedBuildManifest,
) => {
    const bundlePrefix = toSharedBundlePrefix(publicPath)
    const manifestBase = sharedManifest.base.replace(/\/$/, '')
    const legacyNestedPattern = new RegExp(
        `/${bundlePrefix}/${sharedManifest.buildId}/`,
        'g',
    )
    const legacyFlatPattern = new RegExp(
        `/${bundlePrefix}/(?!${sharedManifest.buildId}/)([\\w./-]+\\.(?:js|css))`,
        'g',
    )

    return code
        .replace(legacyNestedPattern, `/${sharedManifest.dir}/`)
        .replace(legacyFlatPattern, `${manifestBase}/$1`)
}

const isSharedBundlePath = (fileName: string, bundleDirName: string) => {
    const normalizedFileName = fileName.replace(/\\/g, '/')
    return normalizedFileName.startsWith(`${bundleDirName}/`)
}

const getSharedChunkOutputPath = (chunkName: string, bundleDirName: string) => {
    const relativeChunkPath = chunkName.replace(/^shared\//, '')
    return `${bundleDirName}/${relativeChunkPath}.js`
}

const getSharedAssetOutputPath = (assetLogicalName: string, bundleDirName: string) => {
    const relativeAssetPath = assetLogicalName.replace(/^shared\//, '')
    if (/\.[a-z0-9]+$/i.test(relativeAssetPath)) {
        return `${bundleDirName}/${relativeAssetPath}`
    }
    return `${bundleDirName}/${relativeAssetPath}[extname]`
}

const isExternalSharedModuleId = (moduleId: string) => (
    /^\/shared(?:-[a-f0-9]{8})?\//i.test(moduleId)
)

const stripSharedFromHtml = (html: string) => {
    return html
        .replace(/<link[^>]*\shref="(?:\.\.\/)+shared[^"]*"[^>]*>\s*/gi, '')
        .replace(/<link[^>]*\shref="\/shared[^"]*"[^>]*>\s*/gi, '')
        .replace(/<script[^>]*\ssrc="(?:\.\.\/)+shared[^"]*"[^>]*>\s*<\/script>\s*/gi, '')
        .replace(/<script[^>]*\ssrc="\/shared[^"]*"[^>]*>\s*<\/script>\s*/gi, '')
}

const collectSharedCssFiles = (sharedDir: string, relativeDir = ''): Set<string> => {
    const cssFiles = new Set<string>()
    const currentDir = resolve(sharedDir, relativeDir)

    if (!existsSync(currentDir)) {
        return cssFiles
    }

    for (const entryName of readdirSync(currentDir)) {
        const relativePath = relativeDir ? `${relativeDir}/${entryName}` : entryName
        const entryPath = resolve(currentDir, entryName)
        const entryStat = statSync(entryPath)

        if (entryStat.isDirectory()) {
            for (const nestedCssFile of collectSharedCssFiles(sharedDir, relativePath)) {
                cssFiles.add(nestedCssFile)
            }
            continue
        }

        if (entryName.endsWith('.css')) {
            cssFiles.add(relativePath.replace(/\\/g, '/'))
        }
    }

    return cssFiles
}

const SHARED_CSS_ES_IMPORT_PATTERN = /import\s*["'](?:\/shared(?:-[a-f0-9]{8})?\/|(?:\.\.\/)+shared[^"']*\/)[^"']+\.css["']\s*;?/gi

const stripSharedCssEsImports = (code: string): string => (
    code.replace(SHARED_CSS_ES_IMPORT_PATTERN, '')
)

const buildSharedCssLoaderSnippet = (cssUrls: string[]): string => {
    if (cssUrls.length === 0) {
        return ''
    }

    const cssUrlsJson = JSON.stringify(cssUrls)
    return `(()=>{const sharedCssUrls=${cssUrlsJson};for(const cssUrl of sharedCssUrls){if(document.querySelector(\`link[rel="stylesheet"][href="\${cssUrl}"]\`))continue;const link=document.createElement("link");link.rel="stylesheet";link.href=cssUrl;document.head.appendChild(link)}})();`
}

const collectSharedCssUrlsFromBundle = (
    bundle: Record<string, OutputAsset | OutputChunk>,
    publicPath: string,
    sharedManifest: SharedBuildManifest,
    availableCssFiles?: Set<string>,
): string[] => {
    const cssUrls = new Set<string>()
    const sharedJsPattern = sharedJsUrlPattern(sharedManifest.base)

    for (const bundleItem of Object.values(bundle)) {
        if (bundleItem.type !== 'chunk') {
            continue
        }

        const outputChunk = bundleItem as OutputChunk
        const referencedSharedJs = outputChunk.code.match(sharedJsPattern) ?? []
        for (const sharedJsUrl of referencedSharedJs) {
            const sharedCssUrl = sharedJsUrl.replace(/\.js$/, '.css')
            if (!availableCssFiles) {
                cssUrls.add(sharedCssUrl)
                continue
            }

            const cssRelativePath = sharedCssUrl
                .replace(sharedManifest.base, '')
                .replace(/^\//, '')
            if (availableCssFiles.has(cssRelativePath)) {
                cssUrls.add(sharedCssUrl)
            }
        }

        const mapDepsMatch = outputChunk.code.match(/\bf=\[([^\]]+)\]/)
        if (!mapDepsMatch) {
            continue
        }

        for (const cssPathMatch of mapDepsMatch[1].matchAll(/"([^"]+\.css)"/g)) {
            const cssPath = cssPathMatch[1].replace(/\\/g, '/')
            if (!cssPath.includes('shared')) {
                continue
            }
            cssUrls.add(toAbsoluteSharedAssetUrl(
                cssPath.replace(/^\.\.\//, ''),
                publicPath,
                sharedManifest,
            ))
        }
    }

    return [...cssUrls].sort()
}

const collectSharedCssAssetsFromBundle = (
    bundle: Record<string, OutputAsset | OutputChunk>,
    bundleDirName: string,
): Set<string> => {
    const cssFiles = new Set<string>()

    for (const bundleItem of Object.values(bundle)) {
        if (bundleItem.type !== 'asset') {
            continue
        }

        const assetFileName = bundleItem.fileName.replace(/\\/g, '/')
        if (isSharedBundlePath(assetFileName, bundleDirName) && assetFileName.endsWith('.css')) {
            cssFiles.add(assetFileName.replace(`${bundleDirName}/`, ''))
        }
    }

    return cssFiles
}

const injectSharedCssViaLinkLoader = (
    bundle: Record<string, OutputAsset | OutputChunk>,
    publicPath: string,
    sharedManifest: SharedBuildManifest,
    availableCssFiles?: Set<string>,
) => {
    const sharedCssUrls = collectSharedCssUrlsFromBundle(
        bundle,
        publicPath,
        sharedManifest,
        availableCssFiles,
    )

    for (const bundleItem of Object.values(bundle)) {
        if (bundleItem.type !== 'chunk') {
            continue
        }

        const outputChunk = bundleItem as OutputChunk
        outputChunk.code = stripSharedCssEsImports(outputChunk.code)
    }

    if (sharedCssUrls.length === 0) {
        return
    }

    const cssLoaderSnippet = buildSharedCssLoaderSnippet(sharedCssUrls)
    for (const bundleItem of Object.values(bundle)) {
        if (bundleItem.type !== 'chunk' || !bundleItem.isEntry) {
            continue
        }

        const outputChunk = bundleItem as OutputChunk
        if (!outputChunk.code.includes(cssLoaderSnippet)) {
            outputChunk.code = `${cssLoaderSnippet}${outputChunk.code}`
        }
    }
}

const injectConsumerSharedCss = (
    bundle: Record<string, OutputAsset | OutputChunk>,
    publicPath: string,
    consumerSharedDir?: string,
) => {
    if (!consumerSharedDir || !existsSync(consumerSharedDir)) {
        return
    }

    const sharedManifest = loadSharedBuildManifest(consumerSharedDir, publicPath)
    if (!sharedManifest) {
        return
    }

    const sharedBuildDir = resolveSharedBuildDir(consumerSharedDir, publicPath, sharedManifest)
    const availableCssFiles = collectSharedCssFiles(sharedBuildDir)
    injectSharedCssViaLinkLoader(
        bundle,
        publicPath,
        sharedManifest,
        availableCssFiles,
    )
}

/**
 * 生产构建：将依赖拆到固定文件名的 shared chunk，并通过绝对 URL 引用，
 * 便于 micro-app 跨应用复用（需同域部署 /shared/）。
 * antdv / wc-ui / wc-utils 按组件或子路径拆分，各应用只加载引用到的 chunk。
 */
export const sharedChunks = (options: SharedChunksPluginOptions = {}): Plugin | Plugin[] => {
    const role = options.role ?? 'producer'
    const envConfig = loadSharedChunksEnv(options.envFile)
    const publicPath = normalizePublicPath(options.publicPath ?? envConfig.publicPath)
    const consumerSharedDir = options.consumerSharedDir
        ?? resolve(process.cwd(), '../main/dist')
    const autoDiscover = options.autoDiscover ?? true
    const extraPackages = [
        ...(options.packages ?? []),
        ...envConfig.packages,
    ].filter((packageName, index, allPackages) => (
        packageName && allPackages.indexOf(packageName) === index
    ))

    let activeRules: SharedChunkRule[] = DEFAULT_SHARED_CHUNK_RULES
    let discoverLogPrinted = false
    let sharedBuildId = ''
    let activeSharedManifest: SharedBuildManifest | null = null

    const resolveConsumerSharedManifest = (): SharedBuildManifest | null => {
        if (role === 'producer') {
            if (!sharedBuildId) {
                return null
            }
            return buildSharedManifest(sharedBuildId, publicPath)
        }

        return loadSharedBuildManifest(consumerSharedDir, publicPath) ?? activeSharedManifest
    }

    const getSharedBundleDirName = () => (
        sharedBuildId ? toSharedBundleDirName(publicPath, sharedBuildId) : ''
    )

    const refreshActiveRules = (projectRoot: string) => {
        const producerRoot = role === 'consumer'
            ? resolve(projectRoot, '../main')
            : projectRoot

        const appScanRoots = role === 'consumer'
            ? [projectRoot]
            : resolveConsumerRoots(
                projectRoot,
                {
                    consumerApps: options.consumerApps,
                    consumerRoots: options.consumerRoots,
                },
                envConfig.consumerApps,
            )

        const scanRoots = dedupeScanRoots([
            producerRoot,
            ...appScanRoots,
        ])

        const distScanRoots = appScanRoots.filter((appRoot) => (
            appRoot.replace(/\\/g, '/') !== producerRoot.replace(/\\/g, '/')
        ))

        if (!autoDiscover) {
            activeRules = options.rules
                ?? (extraPackages.length > 0 ? createRulesFromPackages(extraPackages) : null)
                ?? DEFAULT_SHARED_CHUNK_RULES
            return { scanRoots, distScanRoots }
        }

        activeRules = resolveSharedRules({
            producerRoot,
            consumerRoots: appScanRoots,
            explicitRules: options.rules,
            explicitPackages: extraPackages,
            excludePackages: options.excludePackages,
            minAppCount: options.minAppCount,
        }) as SharedChunkRule[]

        if (!options.rules && !discoverLogPrinted) {
            const discoveredPackages = discoverSharedPackages({
                producerRoot,
                consumerRoots: appScanRoots,
                extraPackages,
                excludePackages: options.excludePackages,
                minAppCount: options.minAppCount,
            })
            console.log(formatDiscoveredPackagesLog(scanRoots, discoveredPackages))
            discoverLogPrinted = true
        }

        return { scanRoots, distScanRoots }
    }

    let consumerSurfaceModuleCode = ''
    let resolvedScanRoots: string[] = []
    let resolvedDistScanRoots: string[] = []
    let producerProjectRoot = process.cwd()

    const sharedOutputOptions = {
        minifyInternalExports: false,
        chunkFileNames(chunkInfo: { name?: string }) {
            const bundleDirName = getSharedBundleDirName()
            if (isSharedChunkName(chunkInfo.name) && bundleDirName) {
                return getSharedChunkOutputPath(chunkInfo.name!, bundleDirName)
            }
            return 'assets/[name]-[hash].js'
        },
        assetFileNames(assetInfo: { names?: string[] }) {
            const assetNames = assetInfo.names ?? []
            const sharedAssetName = assetNames.find((name) => name.startsWith('shared/'))
            const bundleDirName = getSharedBundleDirName()
            if (sharedAssetName && bundleDirName) {
                return getSharedAssetOutputPath(sharedAssetName, bundleDirName)
            }
            return 'assets/[name]-[hash][extname]'
        },
    }

    const producerRollupInput = (projectRoot: string): UserConfig['build'] => ({
        modulePreload: false,
        rollupOptions: {
            output: {
                ...sharedOutputOptions,
                manualChunks(moduleId: string) {
                    return resolveSharedChunkName(moduleId, activeRules) ?? undefined
                },
            },
            treeshake: {
                moduleSideEffects: (moduleId) => {
                    const normalizedId = moduleId.replace(/\\/g, '/')
                    if (normalizedId.includes(SHARED_SURFACE_RESOLVED_ID)
                        || normalizedId.includes(SHARED_SURFACE_VIRTUAL_ID)) {
                        return true
                    }
                    return null
                },
            },
        },
    })

    const isProducerEntryFile = (fileId: string) => {
        const normalizedId = fileId.replace(/\\/g, '/').split('?')[0]
        return normalizedId.endsWith('/src/main.ts')
    }

    const producerSurfacePlugin: Plugin = {
        name: 'vite-plugin-shared-chunks-surface',
        apply: 'build',
        enforce: 'pre',
        config(userConfig): UserConfig {
            const projectRoot = userConfig.root ?? process.cwd()
            producerProjectRoot = projectRoot
            const { scanRoots, distScanRoots } = refreshActiveRules(projectRoot)
            resolvedScanRoots = scanRoots
            resolvedDistScanRoots = distScanRoots
            consumerSurfaceModuleCode = generateConsumerSurfaceModule(
                activeRules,
                resolvedScanRoots,
                resolvedDistScanRoots,
            )
            return {}
        },
        resolveId(source) {
            if (source === SHARED_SURFACE_VIRTUAL_ID) {
                return SHARED_SURFACE_RESOLVED_ID
            }
            return null
        },
        load(moduleId) {
            if (moduleId !== SHARED_SURFACE_RESOLVED_ID) {
                return null
            }
            return consumerSurfaceModuleCode
        },
        transform(code, id) {
            if (!isProducerEntryFile(id) || code.includes(SHARED_SURFACE_VIRTUAL_ID)) {
                return null
            }
            return {
                code: `import ${JSON.stringify(SHARED_SURFACE_VIRTUAL_ID)};\n${code}`,
                map: null,
            }
        },
    }

    const createConsumerBuildOutputConfig = (): UserConfig['build'] => {
        const sharedManifest = resolveConsumerSharedManifest()

        return {
            modulePreload: false,
            rollupOptions: {
                external: (moduleId) => {
                    if (isExternalSharedModuleId(moduleId)) {
                        return true
                    }
                    return resolveSharedChunkFileKey(moduleId, activeRules) !== null
                },
                output: {
                    ...sharedOutputOptions,
                    paths: (moduleId) => {
                        if (isExternalSharedModuleId(moduleId)) {
                            return moduleId
                        }
                        const chunkFileKey = resolveSharedChunkFileKey(moduleId, activeRules)
                        if (!chunkFileKey) {
                            return moduleId
                        }
                        return toAbsoluteSharedChunkUrl(chunkFileKey, publicPath, sharedManifest)
                    },
                },
            },
        }
    }

    const sharedChunksPlugin: Plugin = {
        name: 'vite-plugin-shared-chunks',
        apply: 'build',
        enforce: 'post',
        buildStart() {
            if (role === 'producer') {
                sharedBuildId = createSharedBuildId()
                activeSharedManifest = buildSharedManifest(sharedBuildId, publicPath)
            }
        },
        config(userConfig): UserConfig {
            const projectRoot = userConfig.root ?? process.cwd()

            if (role === 'consumer') {
                const { scanRoots } = refreshActiveRules(projectRoot)
                resolvedScanRoots = scanRoots
                activeSharedManifest = resolveConsumerSharedManifest()
                return { build: createConsumerBuildOutputConfig() }
            }

            producerProjectRoot = projectRoot
            const { scanRoots, distScanRoots } = refreshActiveRules(projectRoot)
            resolvedScanRoots = scanRoots
            resolvedDistScanRoots = distScanRoots
            consumerSurfaceModuleCode = generateConsumerSurfaceModule(
                activeRules,
                resolvedScanRoots,
                resolvedDistScanRoots,
            )

            return {
                build: producerRollupInput(projectRoot),
            }
        },
        transformIndexHtml(html) {
            return stripSharedFromHtml(html)
        },
        transform(code, id) {
            if (role !== 'consumer' || id.includes('node_modules')) {
                return null
            }
            const rewrittenCode = rewriteSharedBarrelImports(
                code,
                publicPath,
                resolveConsumerSharedManifest(),
            )
            if (rewrittenCode === code) {
                return null
            }
            return { code: rewrittenCode, map: null }
        },
        generateBundle(_, bundle) {
            if (role === 'consumer') {
                injectConsumerSharedCss(bundle, publicPath, consumerSharedDir)
                return
            }

            if (!sharedBuildId) {
                return
            }

            const sharedManifest = buildSharedManifest(sharedBuildId, publicPath)
            activeSharedManifest = sharedManifest

            for (const bundleItem of Object.values(bundle)) {
                if (bundleItem.type === 'chunk') {
                    const outputChunk = bundleItem as OutputChunk
                    outputChunk.code = rewriteSharedImportPaths(outputChunk.code, sharedManifest)
                    outputChunk.code = rewriteLegacyAbsoluteSharedPaths(
                        outputChunk.code,
                        publicPath,
                        sharedManifest,
                    )
                }
            }

            const distSharedImports = scanConsumerDistSharedImports(resolvedDistScanRoots)
            for (const bundleItem of Object.values(bundle)) {
                if (bundleItem.type !== 'chunk') {
                    continue
                }

                const outputChunk = bundleItem as OutputChunk
                if (outputChunk.name !== 'shared/vue') {
                    continue
                }

                const requiredVueExports = collectRequiredExportsForChunk(
                    'shared/vue',
                    distSharedImports,
                    DEFAULT_VUE_COMPILER_EXPORTS,
                )
                outputChunk.code = patchSharedChunkExportAliases(
                    outputChunk.code,
                    requiredVueExports,
                )
            }

            for (const bundleItem of Object.values(bundle)) {
                if (bundleItem.type !== 'asset') {
                    continue
                }

                const outputAsset = bundleItem as OutputAsset
                if (typeof outputAsset.source !== 'string') {
                    continue
                }

                const assetFileName = outputAsset.fileName.replace(/\\/g, '/')
                if (!isSharedBundlePath(assetFileName, sharedManifest.dir)) {
                    continue
                }

                const absoluteAssetPath = toAbsoluteSharedAssetUrl(
                    assetFileName,
                    publicPath,
                    sharedManifest,
                )
                for (const bundleChunk of Object.values(bundle)) {
                    if (bundleChunk.type !== 'chunk') {
                        continue
                    }
                    const chunkCode = bundleChunk as OutputChunk
                    const relativePattern = new RegExp(
                        `(["'])${escapeRegExp(assetFileName)}\\1`,
                        'g',
                    )
                    const assetsRelativePattern = new RegExp(
                        `(["'])\\.?\\.?/?assets/${escapeRegExp(assetFileName)}\\1`,
                        'g',
                    )
                    chunkCode.code = chunkCode.code
                        .replace(relativePattern, `$1${absoluteAssetPath}$1`)
                        .replace(assetsRelativePattern, `$1${absoluteAssetPath}$1`)
                }
            }

            this.emitFile({
                type: 'asset',
                fileName: SHARED_MANIFEST_FILE_NAME,
                source: serializeSharedManifest(sharedManifest),
            })

            injectSharedCssViaLinkLoader(
                bundle,
                publicPath,
                sharedManifest,
                collectSharedCssAssetsFromBundle(bundle, sharedManifest.dir),
            )
        },
    }

    if (role === 'producer') {
        return [producerSurfacePlugin, sharedChunksPlugin]
    }

    return sharedChunksPlugin
}

/** @deprecated 使用 sharedChunks */
export const createSharedChunksPlugin = sharedChunks
