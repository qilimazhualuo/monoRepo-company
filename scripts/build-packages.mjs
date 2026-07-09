import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const monorepoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** 按依赖顺序构建：wc-utils → wc-ui → wc-basic */
const packageBuildOrder = ['wc-utils', 'wc-page', 'wc-ui', 'wc-basic']

const runWorkspaceBuild = (packageName) => {
    console.log(`[build-packages] building ${packageName}...`)
    const buildResult = spawnSync('yarn', ['workspace', packageName, 'build'], {
        cwd: monorepoRoot,
        stdio: 'inherit',
        shell: true,
    })

    if (buildResult.status !== 0) {
        process.exit(buildResult.status ?? 1)
    }
}

for (const packageName of packageBuildOrder) {
    runWorkspaceBuild(packageName)
}

console.log(`[build-packages] done: ${packageBuildOrder.join(' → ')}`)
