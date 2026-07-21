export type ThemeKey =
    | 'default'
    | 'mui'
    | 'shadcn'
    | 'bootstrap'
    | 'cartoon'
    | 'dark'
    | 'illustration'
    | 'glass'
    | 'geek'
    | 'lark'
    | 'blossom'
    | 'serene'

export type ThemeOption = {
    key: ThemeKey
    label: string
}

export const themeOptions: ThemeOption[] = [
    { key: 'default', label: '默认风格' },
    { key: 'mui', label: '类 MUI' },
    { key: 'shadcn', label: '类 shadcn' },
    { key: 'bootstrap', label: 'Bootstrap 拟物' },
    { key: 'cartoon', label: '卡通风格' },
    { key: 'dark', label: '暗黑风格' },
    { key: 'illustration', label: '插画风格' },
    { key: 'glass', label: '玻璃风格' },
    { key: 'geek', label: '极客风格' },
    { key: 'lark', label: '知识协作' },
    { key: 'blossom', label: '桃花粉' },
    { key: 'serene', label: '静谧' },
]

/** localStorage key，主/子应用共用 */
export const THEME_STORAGE_KEY = 'wc-ui-theme'

/** 无界 bus 事件名，主应用切换后通知子应用 */
export const THEME_CHANGE_EVENT = 'wc-theme-change'

export const DARK_THEME_KEYS: ThemeKey[] = ['dark', 'geek']

export const isThemeKey = (value: string): value is ThemeKey => (
    themeOptions.some((option) => option.key === value)
)

export const isDarkThemeKey = (themeKey: ThemeKey) => (
    DARK_THEME_KEYS.includes(themeKey)
)
