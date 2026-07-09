import { defineConfig } from 'vite'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = dirname(fileURLToPath(import.meta.url))

const externalPackages = ['vue', 'pinia']

const isExternal = (source: string) => (
    externalPackages.some((packageName) => (
        source === packageName || source.startsWith(`${packageName}/`)
    ))
)

export default defineConfig({
    build: {
        lib: {
            entry: resolve(packageRoot, 'src/index.ts'),
            formats: ['es'],
            fileName: 'index',
        },
        rollupOptions: {
            external: isExternal,
        },
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: true,
    },
})
