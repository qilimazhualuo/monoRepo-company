import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { AntdvNextResolver } from '@antdv-next/auto-import-resolver'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = dirname(fileURLToPath(import.meta.url))

const externalPackages = [
    'vue',
    'antdv-next',
    'wc-utils',
    '@ant-design/icons-vue',
    'dayjs',
]

const isExternal = (source: string) => (
    externalPackages.some((packageName) => (
        source === packageName || source.startsWith(`${packageName}/`)
    ))
)

const suppressUnusedVueImportWarning = (
    warning: { code?: string; message?: string },
    warn: (warning: unknown) => void,
) => {
    if (
        warning.code === 'UNUSED_EXTERNAL_IMPORT'
        && warning.message?.includes('resolveComponent')
    ) {
        return
    }
    warn(warning)
}

export default defineConfig({
    plugins: [
        vue(),
        vueJsx(),
        Components({
            resolvers: [AntdvNextResolver()],
            dts: false,
        }),
        dts({
            include: ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.vue'],
            outDir: 'dist',
            rollupTypes: true,
            insertTypesEntry: true,
            tsconfigPath: './tsconfig.dts.json',
        }),
    ],
    build: {
        lib: {
            entry: resolve(packageRoot, 'src/index.ts'),
            formats: ['es'],
            fileName: 'index',
        },
        rollupOptions: {
            external: isExternal,
            onwarn: suppressUnusedVueImportWarning,
        },
        cssCodeSplit: false,
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: true,
    },
})
