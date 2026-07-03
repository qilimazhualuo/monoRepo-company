import type { Plugin } from 'vite'
import { loadAppBaseEnv } from './loadEnv.ts'
import { resolveAppBase } from './resolveAppBase.ts'

export type { AppBaseEnv } from './loadEnv.ts'
export { loadAppBaseEnv } from './loadEnv.ts'
export { resolveAppBase, readAppNameFromRoot } from './resolveAppBase.ts'
export type { ResolveAppBaseOptions } from './resolveAppBase.ts'

export interface AppBasePluginOptions {
    /** 当前应用根目录（含 package.json） */
    appRoot: string
    /**
     * 本地 dev 时的 Vite base（各应用端口不同，须在 vite.config 传入）
     * 生产环境由 package.json name 自动推导，忽略应用内 VITE_BASE
     */
    devBase?: string
    /** 覆盖 .env 的 HOST_APP_NAME */
    hostAppName?: string
    /** .env 文件路径，默认 plugins/vite-plugin-app-base/.env */
    envFile?: string
}

/**
 * 强制按 package.json name 设置 Vite base：
 * - 基座：生产 /
 * - 子应用：生产 /{name}/
 */
export const appBase = (options: AppBasePluginOptions): Plugin => {
    const envConfig = loadAppBaseEnv(options.envFile)
    const hostAppName = options.hostAppName ?? envConfig.hostAppName

    return {
        name: 'vite-plugin-app-base',
        config(_, { command }) {
            const appBaseUrl = resolveAppBase({
                appRoot: options.appRoot,
                command,
                devBase: options.devBase ?? '/',
                hostAppName,
            })

            return { base: appBaseUrl }
        },
    }
}
