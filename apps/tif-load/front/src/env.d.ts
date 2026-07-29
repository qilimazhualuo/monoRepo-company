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

declare module 'map' {
    type MapClickPayload = {
        coordinate: [number, number]
        pickedFeature?: unknown
    }

    export default class Map {
        constructor(options: {
            target: string | HTMLElement
            center: [number, number]
            zoom?: number
            mode?: 2 | 3
            mapType?: string
            baseLayerConfig?: Array<{ mapType: string; token?: string; tiandituKey?: string }>
            tiandituKey?: string
            callback?: (engine: unknown) => void
        })

        createLayer: (params?: {
            id?: string
            zIndex?: number
            opacity?: number
            visible?: boolean
        }) => string

        clearLayer: (layerId: string) => { code: number; msg: string }
        addEvent: (type: string, handler: (payload: MapClickPayload) => void, layerId?: string) => void
        removeEvent: (type?: string, handler?: Function, layerId?: string) => void
        switchMode: (
            mode: 2 | 3,
            options?: { keepView?: boolean; callback?: () => void },
        ) => void
        setCenter: (
            positions: [number, number] | Array<[number, number]>,
            fitOption?: { maxZoom?: number; duration?: number },
        ) => void
        loadHeightmapTerrain?: (params: {
            meta: Record<string, unknown>
            heightmapBuffer: ArrayBuffer
        }) => { code: number; msg?: string }
        draw?: (type: string, style?: Record<string, unknown>, clearBeforeStart?: boolean) => Promise<unknown>
        destroy: () => void
    }
}
