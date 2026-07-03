import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const monorepoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** 与 merge-dist.mjs 一致：基座必须先于子应用（子应用 consumer 依赖 apps/main/dist/shared） */
const hostAppName = 'main'
const microAppNames = ['sub-app']

/** 仅编译需要产物的应用（apps/*），server / plugins / packages 均不参与 */
const buildableWorkspacePatterns = ['apps/*']

const readPackageJson = (packageDir) => {
    const packageJsonPath = resolve(packageDir, 'package.json')
    return JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
}

const collectWorkspaceDirs = () => {
    const workspaceDirs = []

    for (const workspacePattern of buildableWorkspacePatterns) {
        const workspaceBase = workspacePattern.replace(/\/\*$/, '')
        const workspaceBasePath = resolve(monorepoRoot, workspaceBase)

        if (!existsSync(workspaceBasePath)) {
            continue
        }

        for (const entryName of readdirSync(workspaceBasePath)) {
            const packageDir = resolve(workspaceBasePath, entryName)
            if (existsSync(resolve(packageDir, 'package.json'))) {
                workspaceDirs.push(packageDir)
            }
        }
    }

    return workspaceDirs
}

const sortBuildOrder = (packageNames) => {
    const orderedNames = []

    if (packageNames.includes(hostAppName)) {
        orderedNames.push(hostAppName)
    }

    for (const microAppName of microAppNames) {
        if (packageNames.includes(microAppName)) {
            orderedNames.push(microAppName)
        }
    }

    for (const packageName of packageNames) {
        if (!orderedNames.includes(packageName)) {
            orderedNames.push(packageName)
        }
    }

    return orderedNames
}

const runWorkspaceBuild = (packageName) => {
    console.log(`[build-all] building ${packageName}...`)
    const buildResult = spawnSync('yarn', ['workspace', packageName, 'build'], {
        cwd: monorepoRoot,
        stdio: 'inherit',
        shell: true,
    })

    if (buildResult.status !== 0) {
        process.exit(buildResult.status ?? 1)
    }
}

const buildAllPackages = () => {
    const packagesToBuild = []

    for (const packageDir of collectWorkspaceDirs()) {
        const packageJson = readPackageJson(packageDir)
        const packageName = packageJson.name

        if (!packageJson.scripts?.build) {
            console.log(`[build-all] skip: ${packageName} (no build script)`)
            continue
        }

        packagesToBuild.push(packageName)
    }

    if (packagesToBuild.length === 0) {
        console.log('[build-all] no packages to build')
        return
    }

    const orderedPackageNames = sortBuildOrder(packagesToBuild)

    for (const packageName of orderedPackageNames) {
        runWorkspaceBuild(packageName)
    }

    console.log(`[build-all] done: ${orderedPackageNames.join(' → ')}`)
}

buildAllPackages()
