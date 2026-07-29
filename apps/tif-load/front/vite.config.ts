import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import Components from 'unplugin-vue-components/vite'
import { AntdvNextResolver } from '@antdv-next/auto-import-resolver'
import { appBase } from 'vite-plugin-app-base'
import cesium from 'vite-plugin-cesium'

const cesiumBuildRootPath = resolve(__dirname, '../../../node_modules/cesium/Build')
const cesiumBuildPath = resolve(cesiumBuildRootPath, 'Cesium')

export default defineConfig({
    plugins: [
        appBase({
            appRoot: __dirname,
            devBase: '/tif-load-front/',
        }),
        cesium({
            cesiumBuildRootPath,
            cesiumBuildPath: `${cesiumBuildPath}/`,
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
        port: 3003,
        host: true,
        fs: {
            allow: [resolve(__dirname, '../../..')],
        },
        proxy: {
            '/api': {
                target: 'http://localhost:9003',
                changeOrigin: true,
            },
            '/tif-api': {
                target: 'http://localhost:9003',
                changeOrigin: true,
                rewrite: (requestPath: string) => requestPath.replace(/^\/tif-api/, '/api'),
            },
        },
    },
})
