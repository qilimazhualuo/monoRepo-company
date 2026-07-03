import { createHash, randomBytes } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { OutputAsset, OutputChunk } from 'rollup'

export const SHARED_MANIFEST_FILE_NAME = 'shared-manifest.json'

export interface SharedBuildManifest {
    buildId: string
    /** 磁盘目录名，如 shared-6f35cb5c */
    dir: string
    /** 站点绝对路径前缀，如 /shared-6f35cb5c/ */
    base: string
}

export const toSharedBundlePrefix = (publicPath: string) => (
    publicPath.replace(/^\/+|\/+$/g, '') || 'shared'
)

export const toSharedBundleDirName = (publicPath: string, buildId: string) => (
    `${toSharedBundlePrefix(publicPath)}-${buildId}`
)

export const parseBuildIdFromBundleDirName = (
    dirName: string,
    publicPath: string,
): string | null => {
    const bundlePrefix = `${toSharedBundlePrefix(publicPath)}-`
    if (!dirName.startsWith(bundlePrefix)) {
        return null
    }

    const buildId = dirName.slice(bundlePrefix.length)
    return /^[a-f0-9]{8}$/i.test(buildId) ? buildId : null
}

export const isSharedBundleDirName = (dirName: string, publicPath: string) => (
    parseBuildIdFromBundleDirName(dirName, publicPath) !== null
)

export const createSharedBuildId = (): string => (
    randomBytes(4).toString('hex')
)

export const createSharedBuildIdFromBundle = (
    bundle: Record<string, OutputAsset | OutputChunk>,
    publicPath: string,
): string => {
    const hashBuilder = createHash('sha256')

    const sharedEntries = Object.values(bundle)
        .filter((bundleItem) => {
            const fileName = bundleItem.fileName.replace(/\\/g, '/')
            return isSharedBundleOutputPath(fileName, publicPath)
        })
        .sort((leftItem, rightItem) => leftItem.fileName.localeCompare(rightItem.fileName))

    for (const bundleItem of sharedEntries) {
        hashBuilder.update(bundleItem.fileName)
        if (bundleItem.type === 'chunk') {
            hashBuilder.update((bundleItem as OutputChunk).code)
            continue
        }
        const outputAsset = bundleItem as OutputAsset
        if (typeof outputAsset.source === 'string') {
            hashBuilder.update(outputAsset.source)
        }
    }

    return hashBuilder.digest('hex').slice(0, 8)
}

export const isSharedBundleOutputPath = (fileName: string, publicPath: string) => {
    const normalizedFileName = fileName.replace(/\\/g, '/')
    const bundlePrefix = toSharedBundlePrefix(publicPath)
    return new RegExp(`^${bundlePrefix}-[a-f0-9]{8}/`).test(normalizedFileName)
}

export const buildSharedManifest = (
    buildId: string,
    publicPath: string,
): SharedBuildManifest => {
    const dir = toSharedBundleDirName(publicPath, buildId)
    return {
        buildId,
        dir,
        base: `/${dir}/`,
    }
}

export const loadSharedBuildManifest = (
    appDistDir: string,
    publicPath: string,
): SharedBuildManifest | null => {
    const manifestPath = resolve(appDistDir, SHARED_MANIFEST_FILE_NAME)
    if (existsSync(manifestPath)) {
        try {
            const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as SharedBuildManifest
            if (manifest.buildId && manifest.dir && manifest.base) {
                return manifest
            }
        }
        catch {
            // fallback to directory scan
        }
    }

    if (!existsSync(appDistDir)) {
        return null
    }

    for (const entryName of readdirSync(appDistDir)) {
        const buildId = parseBuildIdFromBundleDirName(entryName, publicPath)
        if (!buildId) {
            continue
        }

        const bundleDir = resolve(appDistDir, entryName)
        if (existsSync(resolve(bundleDir, 'vue.js')) || existsSync(bundleDir)) {
            return buildSharedManifest(buildId, publicPath)
        }
    }

    return null
}

export const resolveSharedBuildDir = (
    appDistDir: string,
    publicPath: string,
    manifest?: SharedBuildManifest | null,
): string => {
    const resolvedManifest = manifest ?? loadSharedBuildManifest(appDistDir, publicPath)
    if (!resolvedManifest) {
        return appDistDir
    }
    return resolve(appDistDir, resolvedManifest.dir)
}

export const toSharedChunkRelativePath = (chunkFileKey: string): string => (
    `${chunkFileKey.replace(/^shared\//, '')}.js`
)

export const toSharedAssetRelativePath = (assetFileKey: string): string => (
    assetFileKey.replace(/^shared\//, '')
)

export const toAbsoluteSharedUrl = (
    relativePath: string,
    manifest: SharedBuildManifest,
): string => {
    const normalizedRelativePath = relativePath.replace(/^\/+/, '')
    return `${manifest.base}${normalizedRelativePath}`
}

export const toAbsoluteSharedChunkUrlFromManifest = (
    chunkFileKey: string,
    manifest: SharedBuildManifest,
): string => (
    toAbsoluteSharedUrl(toSharedChunkRelativePath(chunkFileKey), manifest)
)

export const toAbsoluteSharedAssetUrlFromManifest = (
    assetFileKey: string,
    manifest: SharedBuildManifest,
): string => (
    toAbsoluteSharedUrl(toSharedAssetRelativePath(assetFileKey), manifest)
)

/** 从 /shared-6f35cb5c/vue.js 还原逻辑 key：shared/vue */
export const parseChunkKeyFromSharedUrl = (sharedUrl: string): string | null => {
    const normalizedUrl = sharedUrl.replace(/\\/g, '/').split('?')[0]
    const withoutLeadingSlash = normalizedUrl.replace(/^\/+/, '')

    const hashedBundleMatch = withoutLeadingSlash.match(/^shared-[a-f0-9]{8}\/(.+)\.js$/i)
    if (hashedBundleMatch) {
        return `shared/${hashedBundleMatch[1]}`
    }

    const legacyNestedMatch = withoutLeadingSlash.match(/^shared\/[a-f0-9]{8}\/(.+)\.js$/i)
    if (legacyNestedMatch) {
        return `shared/${legacyNestedMatch[1]}`
    }

    const legacyFlatMatch = withoutLeadingSlash.match(/^shared\/(.+)\.js$/i)
    if (legacyFlatMatch) {
        return `shared/${legacyFlatMatch[1]}`
    }

    return null
}

export const sharedJsUrlPattern = (manifestBase: string) => {
    const publicPrefix = manifestBase.replace(/\/$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(
        `${publicPrefix}/[\\w./-]+\\.js`,
        'g',
    )
}

export const serializeSharedManifest = (manifest: SharedBuildManifest): string => (
    `${JSON.stringify(manifest, null, 4)}\n`
)
