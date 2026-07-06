import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const monorepoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const isWindows = process.platform === 'win32'

const phasedServiceList = [
    { name: 'gateway', command: 'yarn', args: ['workspace', 'gateway', 'dev'], delayMs: 0 },
    { name: 'basic', command: 'yarn', args: ['workspace', 'basic', 'dev'], delayMs: 2500 },
    { name: 'auth', command: 'yarn', args: ['workspace', 'auth', 'dev'], delayMs: 5500 },
    { name: 'main', command: 'yarn', args: ['workspace', 'main', 'dev'], delayMs: 5500 },
    { name: 'sub', command: 'yarn', args: ['workspace', 'sub-app', 'dev'], delayMs: 5500 },
    { name: 'basic-app', command: 'yarn', args: ['workspace', 'basic-app', 'dev'], delayMs: 5500 },
]

const childList = []
let isShuttingDown = false

const writePrefixedLines = (serviceName, chunk, stream) => {
    const text = chunk.toString()
    const lines = text.split(/\r?\n/)

    for (const line of lines) {
        if (!line) {
            continue
        }

        stream.write(`[${serviceName}] ${line}\n`)
    }
}

const killProcessTree = (childProcess) => {
    if (!childProcess.pid || childProcess.killed) {
        return
    }

    if (isWindows) {
        spawn('taskkill', ['/PID', String(childProcess.pid), '/T', '/F'], {
            shell: true,
            stdio: 'ignore',
        })
        return
    }

    childProcess.kill('SIGTERM')
}

const shutdown = (exitCode = 0) => {
    if (isShuttingDown) {
        return
    }

    isShuttingDown = true
    process.stdout.write('\n[dev] 正在停止所有服务...\n')

    for (const childProcess of childList) {
        killProcessTree(childProcess)
    }

    setTimeout(() => {
        process.exit(exitCode)
    }, 300)
}

const spawnService = (service) => {
    const childProcess = spawn(service.command, service.args, {
        cwd: monorepoRoot,
        shell: isWindows,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
    })

    childProcess.stdout.on('data', (chunk) => {
        writePrefixedLines(service.name, chunk, process.stdout)
    })

    childProcess.stderr.on('data', (chunk) => {
        writePrefixedLines(service.name, chunk, process.stderr)
    })

    childProcess.on('exit', (exitCode) => {
        if (isShuttingDown) {
            return
        }

        process.stdout.write(`[dev] ${service.name} 已退出 (code ${exitCode ?? 'unknown'})\n`)
        shutdown(typeof exitCode === 'number' ? exitCode : 1)
    })

    childList.push(childProcess)
}

for (const service of phasedServiceList) {
    setTimeout(() => {
        if (!isShuttingDown) {
            spawnService(service)
        }
    }, service.delayMs)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

process.stdout.write('[dev] 启动顺序: gateway -> basic(+2.5s) -> auth/前端(+5.5s)\n')
