/// <reference types="vite/client" />

declare module '*.less' {
    const classes: Record<string, string>
    export default classes
}

declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<object, object, unknown>
    export default component
}
