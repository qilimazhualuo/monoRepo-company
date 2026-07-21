import { unref, type ComputedRef } from 'vue'
import type { ConfigProviderProps } from 'antdv-next'
import { defaultThemeConfig } from './presets/defaultTheme'
import { darkThemeConfig } from './presets/darkTheme'
import useMuiTheme from './presets/muiTheme'
import useShadcnTheme from './presets/shadcnTheme'
import useBootstrapTheme from './presets/bootstrapTheme'
import useCartoonTheme from './presets/cartoonTheme'
import useIllustrationTheme from './presets/illustrationTheme'
import useGlassTheme from './presets/glassTheme'
import useGeekTheme from './presets/geekTheme'
import useLarkTheme from './presets/larkTheme'
import useBlossomTheme from './presets/blossomTheme'
import useSereneTheme from './presets/sereneTheme'
import type { ThemeKey } from './presets/themeMeta'

type ThemeConfigSource = ConfigProviderProps | ComputedRef<ConfigProviderProps>

let themeConfigMap: Record<ThemeKey, ThemeConfigSource> | null = null

/** 在 setup 里调用，初始化各主题 composable */
export const createThemeConfigMap = (): Record<ThemeKey, ThemeConfigSource> => {
    themeConfigMap = {
        default: defaultThemeConfig,
        dark: darkThemeConfig,
        mui: useMuiTheme(),
        shadcn: useShadcnTheme(),
        bootstrap: useBootstrapTheme(),
        cartoon: useCartoonTheme(),
        illustration: useIllustrationTheme(),
        glass: useGlassTheme(),
        geek: useGeekTheme(),
        lark: useLarkTheme(),
        blossom: useBlossomTheme(),
        serene: useSereneTheme(),
    }
    return themeConfigMap
}

export const resolveThemeConfig = (themeKey: ThemeKey): ConfigProviderProps => {
    if (!themeConfigMap) {
        throw new Error('themeConfigMap 未初始化，请先在 setup 中调用 createThemeConfigMap')
    }
    return unref(themeConfigMap[themeKey])
}
