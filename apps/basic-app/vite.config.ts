import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
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
            devBase: 'http://localhost:3002/',
        }),
        vue(),
        Components({
            resolvers: [AntdvNextResolver()],
            dts: resolve(__dirname, 'src/components.d.ts'),
        }),
        sharedChunks({ role: 'consumer' }),
        mode === 'analyze' && visualizer({
            filename: resolve(__dirname, 'stats.html'),
            title: 'basic-app bundle',
            template: 'sunburst',
            open: true,
            gzipSize: true,
            brotliSize: true,
        }),
    ],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            'wc-ui': resolve(__dirname, '../../packages/wc-ui/src'),
            'wc-utils': resolve(__dirname, '../../packages/wc-utils/src'),
        },
    },
    optimizeDeps: {
        include: ['wc-ui', 'wc-utils', 'vite-plugin-app-base', 'vite-plugin-shared-chunks'],
    },
    server: {
        port: 3002,
        host: true,
        cors: true,
        headers: {
            'Access-Control-Allow-Origin': '*',
        },
        fs: {
            allow: [resolve(__dirname, '../..')],
        },
        proxy: {
            '/api': {
                target: 'http://localhost:9000',
                changeOrigin: true,
            },
        },
    },
}))
