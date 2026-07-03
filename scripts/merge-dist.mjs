import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const monorepoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const deployDistDir = resolve(monorepoRoot, 'dist')
const hostAppName = 'main'
const microAppNames = ['sub-app']

const copyEntry = (sourcePath, targetPath) => {
    const sourceStat = statSync(sourcePath)
    if (sourceStat.isDirectory()) {
        cpSync(sourcePath, targetPath, { recursive: true })
        return
    }
    cpSync(sourcePath, targetPath)
}

const copyDirectoryExcept = (sourceDir, targetDir, excludeDirNames = []) => {
    mkdirSync(targetDir, { recursive: true })
    for (const entryName of readdirSync(sourceDir)) {
        if (excludeDirNames.includes(entryName)) {
            continue
        }
        copyEntry(resolve(sourceDir, entryName), resolve(targetDir, entryName))
    }
}

/** 合并 shared：已存在的文件以先写入的为准（基座优先），避免子应用覆盖 pinia 等同名 chunk */
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

const mergeSharedDirectory = (sourceSharedDir, targetSharedDir) => {
    if (!existsSync(sourceSharedDir)) {
        return
    }

    mkdirSync(targetSharedDir, { recursive: true })
    for (const entryName of readdirSync(sourceSharedDir)) {
        mergeSharedEntry(resolve(sourceSharedDir, entryName), resolve(targetSharedDir, entryName))
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
    mergeSharedDirectory(resolve(hostDistDir, 'shared'), resolve(deployDistDir, 'shared'))

    for (const microAppName of microAppNames) {
        const microAppDistDir = resolve(monorepoRoot, 'apps', microAppName, 'dist')
        if (!existsSync(microAppDistDir)) {
            console.error(`[merge-dist] 未找到子应用构建产物: ${microAppDistDir}`)
            process.exit(1)
        }

        const microAppDeployDir = resolve(deployDistDir, microAppName)
        copyDirectoryExcept(microAppDistDir, microAppDeployDir, ['shared'])
        mergeSharedDirectory(resolve(microAppDistDir, 'shared'), resolve(deployDistDir, 'shared'))
    }

    console.log(`[merge-dist] 已合并到 ${deployDistDir}`)
    console.log(`[merge-dist] 基座: /  子应用: ${microAppNames.map((name) => `/${name}/`).join(', ')}`)
}

mergeFrontendDist()
