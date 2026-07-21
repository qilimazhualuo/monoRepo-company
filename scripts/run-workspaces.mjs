/**
 * 并行执行各 workspace 的 yarn script。
 * 用法：
 *   node scripts/run-workspaces.mjs apps server --script dev
 *   node scripts/run-workspaces.mjs packages --script build -- --watch
 *   node scripts/run-workspaces.mjs --names main,sub-app --script dev
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const monorepoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const parseArgs = (argv) => {
    const dirScopes = []
    const packageNames = []
    let scriptName = 'dev'
    const scriptArgs = []

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index]

        if (arg === '--') {
            scriptArgs.push(...argv.slice(index + 1))
            break
        }

        if (arg === '--script') {
            scriptName = argv[index + 1]
            index += 1
            continue
        }

        if (arg.startsWith('--script=')) {
            scriptName = arg.slice('--script='.length)
            continue
        }

        if (arg === '--names') {
            const nameList = argv[index + 1] || ''
            packageNames.push(...nameList.split(',').map((name) => name.trim()).filter(Boolean))
            index += 1
            continue
        }

        if (arg.startsWith('--names=')) {
            packageNames.push(
                ...arg.slice('--names='.length).split(',').map((name) => name.trim()).filter(Boolean),
            )
            continue
        }

        if (arg.startsWith('-')) {
            console.error(`[run-workspaces] unknown flag: ${arg}`)
            process.exit(1)
        }

        dirScopes.push(arg)
    }

    return { dirScopes, packageNames, scriptName, scriptArgs }
}

const readPackageJson = (packageDir) => {
    const packageJsonPath = resolve(packageDir, 'package.json')
    return JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
}

const readWorkspaceMap = () => {
    const infoResult = spawnSync('yarn', ['workspaces', 'info', '--json'], {
        cwd: monorepoRoot,
        encoding: 'utf-8',
        shell: true,
    })

    const outputText = infoResult.stdout || ''
    const jsonStart = outputText.indexOf('{')
    const jsonEnd = outputText.lastIndexOf('}')
    if (jsonStart < 0 || jsonEnd <= jsonStart) {
        return {}
    }

    try {
        return JSON.parse(outputText.slice(jsonStart, jsonEnd + 1))
    } catch {
        return {}
    }
}

const collectFromDirs = (dirScopes, scriptName) => {
    const targets = []

    for (const scopeName of dirScopes) {
        const scopePath = resolve(monorepoRoot, scopeName)
        if (!existsSync(scopePath)) {
            console.error(`[run-workspaces] directory not found: ${scopeName}`)
            process.exit(1)
        }

        for (const entryName of readdirSync(scopePath)) {
            const packageDir = resolve(scopePath, entryName)
            const packageJsonPath = resolve(packageDir, 'package.json')
            if (!existsSync(packageJsonPath)) continue

            const packageJson = readPackageJson(packageDir)
            const packageName = packageJson.name
            if (!packageName) {
                console.log(`[run-workspaces] skip: ${scopeName}/${entryName} (missing name)`)
                continue
            }
            if (!packageJson.scripts?.[scriptName]) {
                console.log(`[run-workspaces] skip: ${packageName} (no "${scriptName}" script)`)
                continue
            }

            targets.push({
                packageName,
                label: `${scopeName}/${entryName}`,
            })
        }
    }

    return targets
}

const collectFromNames = (packageNames, scriptName) => {
    const workspaceMap = readWorkspaceMap()
    const targets = []

    for (const packageName of packageNames) {
        const workspaceInfo = workspaceMap[packageName]
        if (!workspaceInfo) {
            console.error(`[run-workspaces] workspace not found: ${packageName}`)
            process.exit(1)
        }

        const packageDir = resolve(monorepoRoot, workspaceInfo.location)
        const packageJson = readPackageJson(packageDir)
        if (!packageJson.scripts?.[scriptName]) {
            console.error(`[run-workspaces] ${packageName} has no "${scriptName}" script`)
            process.exit(1)
        }

        targets.push({
            packageName,
            label: packageName,
        })
    }

    return targets
}

const killProcessTree = (processId) => {
    if (!processId) return

    if (process.platform === 'win32') {
        spawnSync('taskkill', ['/pid', String(processId), '/T', '/F'], {
            stdio: 'ignore',
            windowsHide: true,
        })
        return
    }

    try {
        process.kill(-processId, 'SIGTERM')
    } catch {
        try {
            process.kill(processId, 'SIGTERM')
        } catch {
            // already gone
        }
    }
}

const pipeWithPrefix = (label, readable, writable) => {
    let pendingText = ''

    readable.on('data', (chunk) => {
        pendingText += chunk.toString()
        const lines = pendingText.split(/\r?\n/)
        pendingText = lines.pop() ?? ''
        for (const line of lines) {
            writable.write(`[${label}] ${line}\n`)
        }
    })

    readable.on('end', () => {
        if (pendingText) {
            writable.write(`[${label}] ${pendingText}\n`)
            pendingText = ''
        }
    })
}

const { dirScopes, packageNames, scriptName, scriptArgs } = parseArgs(process.argv.slice(2))

if (dirScopes.length === 0 && packageNames.length === 0) {
    console.error(
        '[run-workspaces] usage: node scripts/run-workspaces.mjs apps server --script dev',
    )
    process.exit(1)
}

const targets = [
    ...(dirScopes.length ? collectFromDirs(dirScopes, scriptName) : []),
    ...(packageNames.length ? collectFromNames(packageNames, scriptName) : []),
]

if (targets.length === 0) {
    console.error(`[run-workspaces] no targets with script "${scriptName}"`)
    process.exit(1)
}

const scriptSuffix = scriptArgs.length ? ` ${scriptArgs.join(' ')}` : ''
console.log(`[run-workspaces] yarn workspace <name> run ${scriptName}${scriptSuffix}`)
for (const target of targets) {
    console.log(`  - ${target.label} (${target.packageName})`)
}

const childProcesses = []
let shuttingDown = false
let exitedCount = 0

const shutdown = (reason) => {
    if (shuttingDown) return
    shuttingDown = true
    console.log(`\n[run-workspaces] ${reason}，正在关闭全部子进程…`)
    for (const childProcess of childProcesses) {
        killProcessTree(childProcess.pid)
    }
    setTimeout(() => process.exit(0), 4000).unref()
}

process.on('SIGINT', () => shutdown('收到 Ctrl+C'))
process.on('SIGTERM', () => shutdown('收到 SIGTERM'))
process.on('SIGHUP', () => shutdown('收到 SIGHUP'))

for (const target of targets) {
    const childProcess = spawn(
        'yarn',
        ['workspace', target.packageName, 'run', scriptName, ...scriptArgs],
        {
            cwd: monorepoRoot,
            shell: true,
            stdio: ['ignore', 'pipe', 'pipe'],
            env: process.env,
        },
    )

    pipeWithPrefix(target.label, childProcess.stdout, process.stdout)
    pipeWithPrefix(target.label, childProcess.stderr, process.stderr)

    childProcess.on('exit', (exitCode, signalName) => {
        if (shuttingDown) return

        exitedCount += 1
        const reason = signalName
            ? `${target.label} 被信号终止 (${signalName})`
            : `${target.label} 退出 (code ${exitCode})`

        if (exitCode !== 0 || signalName) {
            shutdown(reason)
            return
        }

        if (exitedCount >= childProcesses.length) {
            process.exit(0)
        }
    })

    childProcess.on('error', (error) => {
        console.error(`[run-workspaces] failed to start ${target.packageName}:`, error)
        shutdown('启动子进程失败')
    })

    childProcesses.push(childProcess)
}
