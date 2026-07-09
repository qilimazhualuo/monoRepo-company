import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { resolve } from 'path'
import Components from 'unplugin-vue-components/vite'
import { AntdvNextResolver } from '@antdv-next/auto-import-resolver'
import { visualizer } from 'rollup-plugin-visualizer'
import { appBase } from 'vite-plugin-app-base'
import { sharedChunks } from 'vite-plugin-shared-chunks'

const packagesRoot = resolve(__dirname, '../../packages')

const createWorkspacePackageAliases = (command: string) => (
    command === 'serve'
        ? [
            { find: /^wc-ui$/, replacement: resolve(packagesRoot, 'wc-ui/src') },
            { find: /^wc-page$/, replacement: resolve(packagesRoot, 'wc-page/src') },
            { find: /^wc-utils$/, replacement: resolve(packagesRoot, 'wc-utils/src') },
            { find: /^wc-basic$/, replacement: resolve(packagesRoot, 'wc-basic/src') },
        ]
        : []
)

const injectPackageStyles = (): import('vite').Plugin => ({
    name: 'inject-package-styles',
    apply: 'build',
    enforce: 'pre',
    transform(code, id) {
        if (id.includes('/src/main.ts')) {
            return `import 'wc-ui/style.css'\nimport 'wc-page/style.css'\nimport 'wc-basic/style.css'\n${code}`
        }
    },
})

export default defineConfig(({ command, mode }) => ({
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
            include: [/\.vue$/, /\.vue\?vue/, /packages\/wc-ui\/src/, /packages\/wc-page\/src/, /packages\/wc-basic\/src/],
        }),
        injectPackageStyles(),
        // consumer：引用基座已构建�?/shared/*，须�?yarn build:main
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
        alias: [
            { find: '@', replacement: resolve(__dirname, 'src') },
            ...createWorkspacePackageAliases(command),
        ],
    },
    optimizeDeps: {
        include: command === 'serve'
            ? ['vite-plugin-app-base', 'vite-plugin-shared-chunks']
            : ['wc-basic', 'wc-ui', 'wc-page', 'wc-utils', 'vite-plugin-app-base', 'vite-plugin-shared-chunks'],
        exclude: command === 'serve' ? ['wc-ui', 'wc-page', 'wc-utils', 'wc-basic'] : [],
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


