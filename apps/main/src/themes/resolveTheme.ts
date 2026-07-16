import { unref, type ComputedRef } from 'vue'
import type { ConfigProviderProps } from 'antdv-next'
import { defaultThemeConfig } from '@/themes/defaultTheme'
import { darkThemeConfig } from '@/themes/darkTheme'
import useMuiTheme from '@/themes/muiTheme'
import useShadcnTheme from '@/themes/shadcnTheme'
import useBootstrapTheme from '@/themes/bootstrapTheme'
import useCartoonTheme from '@/themes/cartoonTheme'
import useIllustrationTheme from '@/themes/illustrationTheme'
import useGlassTheme from '@/themes/glassTheme'
import useGeekTheme from '@/themes/geekTheme'
import useLarkTheme from '@/themes/larkTheme'
import useBlossomTheme from '@/themes/blossomTheme'
import useSereneTheme from '@/themes/sereneTheme'
import type { ThemeKey } from '@/themes/themeMeta'

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
