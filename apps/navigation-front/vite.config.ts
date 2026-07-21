import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import Components from 'unplugin-vue-components/vite'
import { AntdvNextResolver } from '@antdv-next/auto-import-resolver'
import { appBase } from 'vite-plugin-app-base'

export default defineConfig({
    plugins: [
        appBase({
            appRoot: __dirname,
            devBase: '/navigation-front/',
        }),
        vue(),
        Components({
            resolvers: [AntdvNextResolver()],
            dts: resolve(__dirname, 'src/components.d.ts'),
            include: [
                /\.vue$/,
                /\.vue\?vue/,
                /packages\/wc-theme\/src/,
            ],
        }),
    ],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            map: resolve(__dirname, '../../packages/map/index.js'),
        },
    },
    optimizeDeps: {
        include: ['ol', 'vite-plugin-app-base'],
        exclude: ['wc-theme', 'wc-utils', 'map'],
    },
    css: {
        preprocessorOptions: {
            less: {
                additionalData: '@import "wc-theme/theme-vars.less";\n',
            },
        },
    },
    server: {
        port: 3002,
        host: true,
        fs: {
            allow: [resolve(__dirname, '../..')],
        },
        proxy: {
            // 独立跑导航前端时直连导航后端；嵌在 main 里则用主应用代理 /nav-api
            '/api': {
                target: 'http://localhost:9002',
                changeOrigin: true,
            },
            '/nav-api': {
                target: 'http://localhost:9002',
                changeOrigin: true,
                rewrite: (requestPath: string) => requestPath.replace(/^\/nav-api/, '/api'),
            },
        },
    },
})
