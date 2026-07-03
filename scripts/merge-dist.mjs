import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const monorepoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const deployDistDir = resolve(monorepoRoot, 'dist')
const hostAppName = 'main'
const microAppNames = ['sub-app']
const sharedBundlePattern = /^shared-[a-f0-9]{8}$/i

const copyEntry = (sourcePath, targetPath) => {
    const sourceStat = statSync(sourcePath)
    if (sourceStat.isDirectory()) {
        cpSync(sourcePath, targetPath, { recursive: true })
        return
    }
    cpSync(sourcePath, targetPath)
}

const isSharedBundleEntry = (entryName) => (
    sharedBundlePattern.test(entryName) || entryName === 'shared-manifest.json'
)

const copyDirectoryExcept = (sourceDir, targetDir, excludeDirNames = []) => {
    mkdirSync(targetDir, { recursive: true })
    for (const entryName of readdirSync(sourceDir)) {
        if (excludeDirNames.includes(entryName) || isSharedBundleEntry(entryName)) {
            continue
        }
        copyEntry(resolve(sourceDir, entryName), resolve(targetDir, entryName))
    }
}

/** 合并 shared 版本目录：已存在的文件以先写入的为准（基座优先） */
const mergeSharedEntry = (sourcePath, targetPath) => {
    const sourceStat = statSync(sourcePath)

    if (sourceStat.isDirectory()) {
        mkdirSync(targetPath, { recursive: true })
        for (const entryName of readdirSync(sourcePath)) {
            mergeSharedEntry(resolve(sourcePath, entryName), resolve(targetPath, entryName))
        }
        return
    }

    if (existsSync(targetPath)) {
        return
    }

    copyEntry(sourcePath, targetPath)
}

const mergeSharedBundles = (sourceDistDir, targetDistDir) => {
    if (!existsSync(sourceDistDir)) {
        return
    }

    for (const entryName of readdirSync(sourceDistDir)) {
        if (!sharedBundlePattern.test(entryName)) {
            continue
        }

        mergeSharedEntry(resolve(sourceDistDir, entryName), resolve(targetDistDir, entryName))
    }

    const manifestPath = resolve(sourceDistDir, 'shared-manifest.json')
    if (existsSync(manifestPath)) {
        cpSync(manifestPath, resolve(targetDistDir, 'shared-manifest.json'))
    }
}

const mergeFrontendDist = () => {
    rmSync(deployDistDir, { recursive: true, force: true })
    mkdirSync(deployDistDir, { recursive: true })

    const hostDistDir = resolve(monorepoRoot, 'apps', hostAppName, 'dist')
    if (!existsSync(hostDistDir)) {
        console.error(`[merge-dist] 未找到基座构建产物: ${hostDistDir}`)
        console.error('[merge-dist] 请先执行 yarn build:front')
        process.exit(1)
    }

    copyDirectoryExcept(hostDistDir, deployDistDir, [])
    mergeSharedBundles(hostDistDir, deployDistDir)

    for (const microAppName of microAppNames) {
        const microAppDistDir = resolve(monorepoRoot, 'apps', microAppName, 'dist')
        if (!existsSync(microAppDistDir)) {
            console.error(`[merge-dist] 未找到子应用构建产物: ${microAppDistDir}`)
            process.exit(1)
        }

        const microAppDeployDir = resolve(deployDistDir, microAppName)
        copyDirectoryExcept(microAppDistDir, microAppDeployDir, [])
        mergeSharedBundles(microAppDistDir, deployDistDir)
    }

    console.log(`[merge-dist] 已合并到 ${deployDistDir}`)
    console.log(`[merge-dist] 基座: /  子应用: ${microAppNames.map((name) => `/${name}/`).join(', ')}`)
}

mergeFrontendDist()
