export interface SharedChunkRuleLike {
    packageName: string
    resolveChunkName?: (moduleId: string) => string | null
}

export const VUE_VENDOR_CHUNK = 'shared/vue'

const isVueVendorPackage = (packageName: string) =>
    packageName === 'vue' || packageName.startsWith('@vue/')

export const isAntdvVendorPackage = (packageName: string) =>
    packageName === 'antdv-next'
    || packageName === '@ant-design/icons-vue'
    || packageName.startsWith('@ant-design/')
    || packageName.startsWith('@rc-component/')

export const hasAntdvVendorRule = (rules: SharedChunkRuleLike[]) =>
    rules.some((rule) => isAntdvVendorPackage(rule.packageName))

/** antdv 内核：与 runtime 循环依赖的模块必须同 chunk，否则运行时�?Cannot access before initialization */
const ANTDV_CORE_SEGMENTS = new Set([
    '_util',
    'theme',
    'config-provider',
    'style',
    'locale',
    'version',
    '_virtual',
    'space',
    'tooltip',
    'affix',
    'time-picker',
    'date-picker',
    'calendar',
    'message',
    'notification',
    'app',
    'table',
    'color-picker',
    'grid',
])

const ANTDV_CORE_CHUNK = 'shared/antdv/core'

const resolveAntdvSegmentChunk = (segment: string): string => {
    if (ANTDV_CORE_SEGMENTS.has(segment) || segment.includes('.')) {
        return ANTDV_CORE_CHUNK
    }
    return `shared/antdv/${segment}`
}

/** antdv-next �?dist 子目录拆包：core（运行时�? 各业务组件独�?chunk */
export const resolveAntdvSharedChunkName = (packageName: string, moduleId: string): string => {
    const normalizedId = moduleId.replace(/\\/g, '/')

    if (packageName === 'antdv-next') {
        const segmentMatch = normalizedId.match(/node_modules\/antdv-next\/dist\/([^/]+)/)
        if (segmentMatch) {
            return resolveAntdvSegmentChunk(segmentMatch[1])
        }
        return ANTDV_CORE_CHUNK
    }

    if (packageName === '@ant-design/icons-vue') {
        const iconMatch = normalizedId.match(/icons-vue\/(?:es\/icons|lib\/icons|)([^/.]+)\.js/)
        if (iconMatch) {
            return `shared/ant-design/icons/${iconMatch[1]}`
        }
        return 'shared/ant-design/icons-vue'
    }

    if (packageName.startsWith('@ant-design/')) {
        return `shared/${packageName.replace('@', '').replace('/', '-')}`
    }

    if (packageName.startsWith('@rc-component/')) {
        return `shared/${packageName.replace('@', '').replace('/', '-')}`
    }

    return ANTDV_CORE_CHUNK
}

/** 子应�?consumer 按导出名解析 chunk；core 内模块统一�?core.js */
export const resolveAntdvConsumerChunkKey = (exportName: string): string => {
    const segment = toAntdvDistSegment(exportName)
    if (ANTDV_CORE_SEGMENTS.has(segment)) {
        return ANTDV_CORE_CHUNK
    }
    return `shared/antdv/${segment}`
}

/** FormItem -> form，DescriptionsItem -> descriptions */
export const toAntdvDistSegment = (exportName: string): string => {
    const kebabCase = exportName
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
        .toLowerCase()

    return kebabCase.split('-')[0]
}

/** antdv 拆包 chunk 内实际导出名：Button -> button_default */
export const toAntdvChunkDefaultExportName = (exportName: string): string => (
    `${toAntdvDistSegment(exportName)}_default`
)

/** 工作区包体量小，保持单文�?shared/wc-ui、shared/wc-utils */
export const resolveWorkspaceSharedChunkName = (packageName: string, _moduleId: string): string => {
    return `shared/${packageName}`
}

export const resolveVueVendorChunkName = (): string => VUE_VENDOR_CHUNK

export const defaultResolveChunkName = (packageName: string, moduleId: string): string | null => {
    if (isVueVendorPackage(packageName)) {
        return VUE_VENDOR_CHUNK
    }

    if (isAntdvVendorPackage(packageName)) {
        return resolveAntdvSharedChunkName(packageName, moduleId)
    }

    if (packageName === 'vue-router' || packageName === 'pinia') {
        return `shared/${packageName}`
    }

    if (packageName === 'wc-ui' || packageName === 'wc-page' || packageName === 'wc-utils') {
        return resolveWorkspaceSharedChunkName(packageName, moduleId)
    }

    return `shared/${packageName.replace('@', '').replace('/', '-')}`
}

export const isShareableModuleId = (moduleId: string): boolean => {
    const normalizedId = moduleId.replace(/\\/g, '/')
    return normalizedId.includes('node_modules') || normalizedId.includes('/packages/')
}

export const getPackageNameFromModuleId = (moduleId: string): string | null => {
    const normalizedId = moduleId.replace(/\\/g, '/')
    const nodeModulesMatch = normalizedId.match(/node_modules\/((?:@[^/]+\/[^/]+)|(?:[^/]+))/)
    if (nodeModulesMatch) {
        return nodeModulesMatch[1]
    }

    const workspaceMatch = normalizedId.match(/\/packages\/((?:@[^/]+\/[^/]+)|(?:[^/]+))(?:\/|$)/)
    return workspaceMatch?.[1] ?? null
}

export const resolveSharedChunkName = (
    moduleId: string,
    rules: SharedChunkRuleLike[],
): string | null => {
    if (!isShareableModuleId(moduleId)) {
        return null
    }

    const packageName = getPackageNameFromModuleId(moduleId)
    if (!packageName) {
        return null
    }

    const matchedRule = rules.find((rule) => rule.packageName === packageName)
    if (!matchedRule) {
        if (isVueVendorPackage(packageName) && rules.some((rule) => isVueVendorPackage(rule.packageName))) {
            return VUE_VENDOR_CHUNK
        }
        if (isAntdvVendorPackage(packageName) && hasAntdvVendorRule(rules)) {
            return resolveAntdvSharedChunkName(packageName, moduleId)
        }
        return null
    }

    if (matchedRule.resolveChunkName) {
        return matchedRule.resolveChunkName(moduleId)
    }

    return defaultResolveChunkName(packageName, moduleId)
}

export const resolveSharedChunkFileKey = (
    moduleId: string,
    rules: SharedChunkRuleLike[],
): string | null => {
    const chunkFromPath = resolveSharedChunkName(moduleId, rules)
    if (chunkFromPath) {
        return chunkFromPath
    }

    const bareSpecifier = moduleId.replace(/\\/g, '/').split('?')[0]
    const matchedRule = rules.find((rule) => rule.packageName === bareSpecifier)
    if (matchedRule) {
        if (matchedRule.resolveChunkName) {
            return matchedRule.resolveChunkName(moduleId)
        }
        return defaultResolveChunkName(bareSpecifier, moduleId)
    }

    if (isVueVendorPackage(bareSpecifier) && rules.some((rule) => isVueVendorPackage(rule.packageName))) {
        return VUE_VENDOR_CHUNK
    }

    if (isAntdvVendorPackage(bareSpecifier) && hasAntdvVendorRule(rules)) {
        return resolveAntdvSharedChunkName(bareSpecifier, moduleId)
    }

    if (bareSpecifier === 'wc-ui' || bareSpecifier === 'wc-page' || bareSpecifier === 'wc-utils') {
        return resolveWorkspaceSharedChunkName(bareSpecifier, moduleId)
    }

    return null
}

export const toAbsoluteSharedChunkUrl = (
    chunkFileKey: string,
    publicPath: string,
    manifest?: { base: string } | null,
): string => {
    if (manifest?.base) {
        const chunkRelativePath = `${chunkFileKey.replace(/^shared\//, '')}.js`
        return `${manifest.base}${chunkRelativePath}`
    }

    const chunkFileName = `${chunkFileKey}.js`.replace(/^shared\//, '')
    const normalizedPublicPath = publicPath.endsWith('/') ? publicPath : `${publicPath}/`
    return `${normalizedPublicPath}${chunkFileName}`
}

export const toAbsoluteSharedAssetUrl = (
    assetFileName: string,
    publicPath: string,
    manifest?: { base: string; dir?: string; buildId?: string } | null,
): string => {
    if (manifest?.base) {
        let relativePath = assetFileName.replace(/\\/g, '/')
        if (manifest.dir && relativePath.startsWith(`${manifest.dir}/`)) {
            relativePath = relativePath.slice(manifest.dir.length + 1)
        }
        else if (manifest.buildId && relativePath.startsWith(`shared/${manifest.buildId}/`)) {
            relativePath = relativePath.slice(`shared/${manifest.buildId}/`.length)
        }
        else {
            relativePath = relativePath.replace(/^shared\//, '')
        }
        return `${manifest.base}${relativePath}`
    }

    const relativePath = assetFileName.replace(/\\/g, '/').replace(/^shared\//, '')
    const normalizedPublicPath = publicPath.endsWith('/') ? publicPath : `${publicPath}/`
    return `${normalizedPublicPath}${relativePath}`
}

export const sharedJsUrlPattern = (manifestBase: string) => {
    const publicPrefix = manifestBase.replace(/\/$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(
        `${publicPrefix}/[\\w./-]+\\.js`,
        'g',
    )
}
