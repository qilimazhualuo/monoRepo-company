import vue from '@vitejs/plugin-vue'
import { AntdvNextResolver } from '@antdv-next/auto-import-resolver'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = dirname(fileURLToPath(import.meta.url))

const externalPackages = [
    'vue',
    'vue-router',
    'antdv-next',
    'wc-page',
    'wc-utils',
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

const suppressDynamicImportWarning = (
    warning: { code?: string; message?: string },
    warn: (warning: unknown) => void,
) => {
    if (warning.code === 'PLUGIN_WARNING' && warning.message?.includes('dynamic import will not move module')) {
        return
    }
    suppressUnusedVueImportWarning(warning, warn)
}

export default defineConfig({
    plugins: [
        vue(),
        Components({
            resolvers: [AntdvNextResolver()],
            dts: false,
        }),
        dts({
            include: ['src/**/*.ts', 'src/**/*.vue'],
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
            onwarn: suppressDynamicImportWarning,
        },
        cssCodeSplit: false,
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: true,
    },
})
