import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export interface ResolveAppBaseOptions {
    /** 应用根目录（含 package.json） */
    appRoot: string
    command: 'build' | 'serve'
    /** 本地 dev 时的 base，子应用一般为带端口的完整地址 */
    devBase?: string
    /** 基座应用名，其生产 base 为 / */
    hostAppName?: string
}

const readAppName = (appRoot: string) => {
    const packageJsonPath = resolve(appRoot, 'package.json')
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as { name: string }
    return packageJson.name
}

/**
 * 根据 package.json 的 name 解析 Vite base。
 * - 基座（默认 main）：生产 /
 * - 子应用：生产 /{应用名}/，忽略应用内 VITE_BASE 等自定义配置
 */
export const resolveAppBase = (options: ResolveAppBaseOptions): string => {
    const { appRoot, command, devBase = '/', hostAppName = 'main' } = options
    const appName = readAppName(appRoot)

    if (command === 'serve') {
        return devBase
    }

    if (appName === hostAppName) {
        return '/'
    }

    return `/${appName}/`
}

export const readAppNameFromRoot = readAppName
