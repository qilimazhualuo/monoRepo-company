/**
 * 并行执行各 workspace 的 yarn script。
 * 从 yarn workspaces 拉取包列表，按 location 前缀过滤（不再扫目录）。
 * 用法：
 *   node scripts/run-workspaces.mjs apps server --script dev
 *   node scripts/run-workspaces.mjs packages --script build -- --watch
 *   node scripts/run-workspaces.mjs --names main,sub-app --script dev
 */
import { spawn, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import readline from 'node:readline'

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
        windowsHide: true,
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

const normalizeLocation = (locationPath) => locationPath.replace(/\\/g, '/')

const matchesDirScope = (locationPath, scopeName) => {
    const normalizedLocation = normalizeLocation(locationPath)
    const scopePrefix = normalizeLocation(scopeName).replace(/\/+$/, '')
    return (
        normalizedLocation === scopePrefix
        || normalizedLocation.startsWith(`${scopePrefix}/`)
    )
}

const buildTarget = (packageName, locationPath, scriptName) => {
    const packageDir = resolve(monorepoRoot, locationPath)
    const packageJson = readPackageJson(packageDir)
    if (!packageJson.scripts?.[scriptName]) {
        return null
    }

    return {
        packageName,
        label: normalizeLocation(locationPath),
    }
}

const collectFromDirScopes = (dirScopes, scriptName, workspaceMap) => {
    const targets = []
    const seenNames = new Set()

    for (const [packageName, workspaceInfo] of Object.entries(workspaceMap)) {
        const locationPath = workspaceInfo?.location
        if (!locationPath) continue

        const matchedScope = dirScopes.some((scopeName) => matchesDirScope(locationPath, scopeName))
        if (!matchedScope) continue

        if (seenNames.has(packageName)) continue
        seenNames.add(packageName)

        const target = buildTarget(packageName, locationPath, scriptName)
        if (!target) {
            console.log(`[run-workspaces] skip: ${packageName} (no "${scriptName}" script)`)
            continue
        }

        targets.push(target)
    }

    return targets
}

const collectFromNames = (packageNames, scriptName, workspaceMap) => {
    const targets = []

    for (const packageName of packageNames) {
        const workspaceInfo = workspaceMap[packageName]
        if (!workspaceInfo) {
            console.error(`[run-workspaces] workspace not found: ${packageName}`)
            process.exit(1)
        }

        const target = buildTarget(packageName, workspaceInfo.location, scriptName)
        if (!target) {
            console.error(`[run-workspaces] ${packageName} has no "${scriptName}" script`)
            process.exit(1)
        }

        targets.push(target)
    }

    return targets
}

const isWindows = process.platform === 'win32'

const killProcessTree = (processId) => {
    if (!processId) return false

    if (isWindows) {
        const killResult = spawnSync('taskkill', ['/pid', String(processId), '/T', '/F'], {
            encoding: 'utf-8',
            windowsHide: true,
        })
        return killResult.status === 0
    }

    try {
        process.kill(-processId, 'SIGTERM')
        return true
    } catch {
        try {
            process.kill(processId, 'SIGTERM')
            return true
        } catch {
            return false
        }
    }
}

const forceKillProcessTree = (processId) => {
    if (!processId || isWindows) return

    try {
        process.kill(-processId, 'SIGKILL')
    } catch {
        try {
            process.kill(processId, 'SIGKILL')
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

const workspaceMap = readWorkspaceMap()
if (Object.keys(workspaceMap).length === 0) {
    console.error('[run-workspaces] yarn workspaces info 为空，检查根 package.json workspaces')
    process.exit(1)
}

const targets = [
    ...(dirScopes.length ? collectFromDirScopes(dirScopes, scriptName, workspaceMap) : []),
    ...(packageNames.length ? collectFromNames(packageNames, scriptName, workspaceMap) : []),
]

if (targets.length === 0) {
    console.error(`[run-workspaces] no targets with script "${scriptName}"`)
    process.exit(1)
}

const scriptSuffix = scriptArgs.length ? ` ${scriptArgs.join(' ')}` : ''
console.log(`[run-workspaces] yarn workspace <name> run ${scriptName}${scriptSuffix}`)
console.log(`[run-workspaces] ${targets.length} 个进程由主进程后台托管（无独立 CMD 窗口）`)
for (const target of targets) {
    console.log(`  - ${target.label} (${target.packageName})`)
}

const childRecords = []
let shuttingDown = false
let exitedCount = 0
let finishedCount = 0
/** @type {((value?: void) => void) | null} */
let resolveAllFinished = null

const allChildrenFinished = () => new Promise((resolve) => {
    if (finishedCount >= childRecords.length) {
        resolve()
        return
    }
    resolveAllFinished = resolve
})

const notifyChildFinished = () => {
    if (finishedCount < childRecords.length) return
    if (resolveAllFinished) {
        const resolve = resolveAllFinished
        resolveAllFinished = null
        resolve()
    }
}

const flushStdout = () => new Promise((resolve) => {
    process.stdout.write('', () => resolve())
})

const markChildFinished = (childRecord, exitText) => {
    if (childRecord.finished) return false
    childRecord.finished = true
    finishedCount += 1
    if (exitText) {
        console.log(`[run-workspaces] ${childRecord.label} 已结束 (${exitText})`)
    }
    notifyChildFinished()
    return true
}

const shutdown = async (reason) => {
    if (shuttingDown) return
    shuttingDown = true
    console.log(`\n[run-workspaces] ${reason}，先结束全部子进程，再退出主进程…`)

    if (childRecords.length === 0) {
        console.log('[run-workspaces] 无子进程，主进程退出')
        await flushStdout()
        process.exit(0)
        return
    }

    for (const childRecord of childRecords) {
        if (childRecord.finished) {
            console.log(`[run-workspaces] ${childRecord.label} 已结束，跳过`)
            continue
        }

        const processId = childRecord.childProcess.pid
        console.log(`[run-workspaces] 正在结束 ${childRecord.label} (pid ${processId})…`)
        const killed = killProcessTree(processId)
        if (!killed) {
            console.log(`[run-workspaces] ${childRecord.label} 结束指令未生效（可能已退出）`)
        }
    }

    // 不能 unref：必须撑住事件循环，等子进程全部退出再让主进程走人
    const forceKillTimer = setTimeout(() => {
        for (const childRecord of childRecords) {
            if (childRecord.finished) continue
            console.log(`[run-workspaces] ${childRecord.label} 超时未退出，强制结束…`)
            forceKillProcessTree(childRecord.childProcess.pid)
            if (isWindows) {
                killProcessTree(childRecord.childProcess.pid)
            }
        }
    }, 2000)

    const forceMarkTimer = setTimeout(() => {
        for (const childRecord of childRecords) {
            if (childRecord.finished) continue
            console.log(`[run-workspaces] ${childRecord.label} 强制标记为已结束`)
            markChildFinished(childRecord, null)
        }
    }, 5000)

    await allChildrenFinished()
    clearTimeout(forceKillTimer)
    clearTimeout(forceMarkTimer)

    console.log('[run-workspaces] 全部子进程已关闭，主进程退出')
    await flushStdout()
    process.exit(0)
}

const bindShutdownSignals = () => {
    // 占住 stdin，避免 Windows 控制台 Ctrl+C 时 shell 提前吐提示符、日志糊成一团
    if (process.stdin.isTTY) {
        process.stdin.resume()
        const readlineInterface = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        })
        readlineInterface.on('SIGINT', () => {
            void shutdown('收到 Ctrl+C')
        })
    }

    process.on('SIGINT', () => {
        void shutdown('收到 Ctrl+C')
    })
    process.on('SIGTERM', () => {
        void shutdown('收到 SIGTERM')
    })
    process.on('SIGHUP', () => {
        void shutdown('收到 SIGHUP')
    })
}

bindShutdownSignals()

for (const target of targets) {
    // Windows：shell 必须开（Node 20+ 禁裸 spawn .cmd，否则 EINVAL），
    // 但不要 detached，否则会弹独立 CMD；windowsHide 藏住 shell 控制台。
    // Unix：detached 进独立进程组，方便 kill(-pid) 整树清理。
    // 输出全部 pipe 回主进程加前缀，由本脚本统一后台托管。
    const childProcess = spawn(
        'yarn',
        ['workspace', target.packageName, 'run', scriptName, ...scriptArgs],
        {
            cwd: monorepoRoot,
            shell: true,
            detached: !isWindows,
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'pipe'],
            env: process.env,
        },
    )

    const childRecord = {
        label: target.label,
        childProcess,
        finished: false,
    }
    childRecords.push(childRecord)

    pipeWithPrefix(target.label, childProcess.stdout, process.stdout)
    pipeWithPrefix(target.label, childProcess.stderr, process.stderr)

    childProcess.on('exit', (exitCode, signalName) => {
        const exitText = signalName
            ? `signal=${signalName}`
            : `code=${exitCode ?? 0}`

        if (shuttingDown) {
            markChildFinished(childRecord, exitText)
            return
        }

        if (!markChildFinished(childRecord, null)) return

        exitedCount += 1
        console.log(`[run-workspaces] ${target.label} 退出 (${exitText})`)

        if (exitCode !== 0 || signalName) {
            void shutdown(`${target.label} 异常退出`)
            return
        }

        if (exitedCount >= childRecords.length) {
            void (async () => {
                console.log('[run-workspaces] 全部子进程正常结束，主进程退出')
                await flushStdout()
                process.exit(0)
            })()
        }
    })

    childProcess.on('error', (error) => {
        console.error(`[run-workspaces] failed to start ${target.packageName}:`, error)
        markChildFinished(childRecord, null)
        void shutdown('启动子进程失败')
    })
}
