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
            devBase: '/sub-app/',
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
        // consumer：引用基座已构建的 /shared/*，须先 yarn build:main
        sharedChunks({ role: 'consumer' }),
        mode === 'analyze' && visualizer({
            filename: resolve(__dirname, 'stats.html'),
            title: 'sub-app bundle',
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
        port: 3001,
        host: true,
        cors: true,
        headers: {
            'Access-Control-Allow-Origin': '*',
        },
        proxy: {
            '/api': {
                target: 'http://localhost:9001',
                changeOrigin: true,
            },
        },
        fs: {
            allow: [resolve(__dirname, '../..')],
        },
    },
}))
