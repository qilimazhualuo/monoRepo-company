/// <reference types="vite/client" />

declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<object, object, unknown>
    export default component
}

interface Window {
    __POWERED_BY_WUJIE__?: boolean
    __WUJIE_MOUNTED?: boolean
    __WUJIE_UNMOUNTED?: boolean
    __WUJIE_MOUNT: () => void
    __WUJIE_UNMOUNT: () => void
    $wujie?: {
        bus: {
            $on: (event: string, handler: (...args: unknown[]) => void) => void
            $off: (event: string, handler?: (...args: unknown[]) => void) => void
            $emit: (event: string, ...args: unknown[]) => void
        }
        props: Record<string, unknown>
    }
}
