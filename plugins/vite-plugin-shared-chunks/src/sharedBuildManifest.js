import { createHash, randomBytes } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
export const SHARED_MANIFEST_FILE_NAME = "shared-manifest.json";
export const toSharedBundlePrefix = (publicPath) => publicPath.replace(/^\/+|\/+$/g, "") || "shared";
export const toSharedBundleDirName = (publicPath, buildId) => `${toSharedBundlePrefix(publicPath)}-${buildId}`;
export const parseBuildIdFromBundleDirName = (dirName, publicPath) => {
    const bundlePrefix = `${toSharedBundlePrefix(publicPath)}-`;
    if (!dirName.startsWith(bundlePrefix)) {
        return null;
    }
    const buildId = dirName.slice(bundlePrefix.length);
    return /^[a-f0-9]{8}$/i.test(buildId) ? buildId : null;
};
export const isSharedBundleDirName = (dirName, publicPath) => parseBuildIdFromBundleDirName(dirName, publicPath) !== null;
export const createSharedBuildId = () => randomBytes(4).toString("hex");
export const createSharedBuildIdFromBundle = (bundle, publicPath) => {
    const hashBuilder = createHash("sha256");
    const sharedEntries = Object.values(bundle).filter((bundleItem) => {
        const fileName = bundleItem.fileName.replace(/\\/g, "/");
        return isSharedBundleOutputPath(fileName, publicPath);
    }).sort((leftItem, rightItem) => leftItem.fileName.localeCompare(rightItem.fileName));
    for (const bundleItem of sharedEntries) {
        hashBuilder.update(bundleItem.fileName);
        if (bundleItem.type === "chunk") {
            hashBuilder.update(bundleItem.code);
            continue;
        }
        const outputAsset = bundleItem;
        if (typeof outputAsset.source === "string") {
            hashBuilder.update(outputAsset.source);
        }
    }
    return hashBuilder.digest("hex").slice(0, 8);
};
export const isSharedBundleOutputPath = (fileName, publicPath) => {
    const normalizedFileName = fileName.replace(/\\/g, "/");
    const bundlePrefix = toSharedBundlePrefix(publicPath);
    return new RegExp(`^${bundlePrefix}-[a-f0-9]{8}/`).test(normalizedFileName);
};
export const buildSharedManifest = (buildId, publicPath) => {
    const dir = toSharedBundleDirName(publicPath, buildId);
    return {
        buildId,
        dir,
        base: `/${dir}/`
    };
};
export const loadSharedBuildManifest = (appDistDir, publicPath) => {
    const manifestPath = resolve(appDistDir, SHARED_MANIFEST_FILE_NAME);
    if (existsSync(manifestPath)) {
        try {
            const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
            if (manifest.buildId && manifest.dir && manifest.base) {
                return manifest;
            }
        } catch {}
    }
    if (!existsSync(appDistDir)) {
        return null;
    }
    for (const entryName of readdirSync(appDistDir)) {
        const buildId = parseBuildIdFromBundleDirName(entryName, publicPath);
        if (!buildId) {
            continue;
        }
        const bundleDir = resolve(appDistDir, entryName);
        if (existsSync(resolve(bundleDir, "vue.js")) || existsSync(bundleDir)) {
            return buildSharedManifest(buildId, publicPath);
        }
    }
    return null;
};
export const resolveSharedBuildDir = (appDistDir, publicPath, manifest) => {
    const resolvedManifest = manifest ?? loadSharedBuildManifest(appDistDir, publicPath);
    if (!resolvedManifest) {
        return appDistDir;
    }
    return resolve(appDistDir, resolvedManifest.dir);
};
export const toSharedChunkRelativePath = (chunkFileKey) => `${chunkFileKey.replace(/^shared\//, "")}.js`;
export const toSharedAssetRelativePath = (assetFileKey) => assetFileKey.replace(/^shared\//, "");
export const toAbsoluteSharedUrl = (relativePath, manifest) => {
    const normalizedRelativePath = relativePath.replace(/^\/+/, "");
    return `${manifest.base}${normalizedRelativePath}`;
};
export const toAbsoluteSharedChunkUrlFromManifest = (chunkFileKey, manifest) => toAbsoluteSharedUrl(toSharedChunkRelativePath(chunkFileKey), manifest);
export const toAbsoluteSharedAssetUrlFromManifest = (assetFileKey, manifest) => toAbsoluteSharedUrl(toSharedAssetRelativePath(assetFileKey), manifest);
export const parseChunkKeyFromSharedUrl = (sharedUrl) => {
    const normalizedUrl = sharedUrl.replace(/\\/g, "/").split("?")[0];
    const withoutLeadingSlash = normalizedUrl.replace(/^\/+/, "");
    const hashedBundleMatch = withoutLeadingSlash.match(/^shared-[a-f0-9]{8}\/(.+)\.js$/i);
    if (hashedBundleMatch) {
        return `shared/${hashedBundleMatch[1]}`;
    }
    const legacyNestedMatch = withoutLeadingSlash.match(/^shared\/[a-f0-9]{8}\/(.+)\.js$/i);
    if (legacyNestedMatch) {
        return `shared/${legacyNestedMatch[1]}`;
    }
    const legacyFlatMatch = withoutLeadingSlash.match(/^shared\/(.+)\.js$/i);
    if (legacyFlatMatch) {
        return `shared/${legacyFlatMatch[1]}`;
    }
    return null;
};
export const sharedJsUrlPattern = (manifestBase) => {
    const publicPrefix = manifestBase.replace(/\/$/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`${publicPrefix}/[\\w./-]+\\.js`, "g");
};
export const serializeSharedManifest = (manifest) => `${JSON.stringify(manifest, null, 4)}
`;
