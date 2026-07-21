import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { resolve } from 'path'
import Components from 'unplugin-vue-components/vite'
import { AntdvNextResolver } from '@antdv-next/auto-import-resolver'
import { visualizer } from 'rollup-plugin-visualizer'
import { appBase } from 'vite-plugin-app-base'
import { sharedChunks } from 'vite-plugin-shared-chunks'

export default defineConfig(({ mode }) => ({
    plugins: [
        appBase({
            appRoot: __dirname,
            devBase: '/',
        }),
        vue(),
        vueJsx(),
        Components({
            resolvers: [AntdvNextResolver()],
            dts: resolve(__dirname, 'src/components.d.ts'),
            include: [
                /\.vue$/,
                /\.vue\?vue/,
                /packages\/wc-ui\/src/,
                /packages\/wc-page\/src/,
                /packages\/wc-basic\/src/,
                /packages\/wc-theme\/src/,
            ],
        }),
        sharedChunks(),
        mode === 'analyze' && visualizer({
            filename: resolve(__dirname, 'stats.html'),
            title: 'main bundle',
            template: 'sunburst',
            open: true,
            gzipSize: true,
            brotliSize: true,
        }),
    ],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },
    optimizeDeps: {
        include: ['vite-plugin-app-base', 'vite-plugin-shared-chunks'],
        exclude: ['wc-ui', 'wc-page', 'wc-utils', 'wc-basic', 'wc-theme'],
    },
    css: {
        preprocessorOptions: {
            less: {
                additionalData: '@import "wc-theme/theme-vars.less";\n',
            },
        },
    },
    server: {
        port: 3000,
        host: true,
        fs: {
            allow: [resolve(__dirname, '../..')],
        },
        proxy: {
            '/api': {
                target: 'http://localhost:9001',
                changeOrigin: true,
            },
            // 子应用静态资源：前缀 = package.json name，指向各子应用 vite 端口
            '/sub-app': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
            '/navigation-front': {
                target: 'http://localhost:3002',
                changeOrigin: true,
            },
            // 导航后端 API（子应用内 fetch /nav-api/* 时走这里；避免和主应用 /api 冲突）
            '/nav-api': {
                target: 'http://localhost:9002',
                changeOrigin: true,
                rewrite: (requestPath: string) => requestPath.replace(/^\/nav-api/, '/api'),
            },
        },
    },
}))
