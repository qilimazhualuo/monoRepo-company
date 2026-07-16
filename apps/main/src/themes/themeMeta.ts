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

export const THEME_STORAGE_KEY = 'main-app-ui-theme'
