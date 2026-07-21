import type { ConfigProviderProps } from 'antdv-next'
import { theme } from 'antdv-next'

export const darkThemeConfig: ConfigProviderProps = {
    theme: {
        algorithm: theme.darkAlgorithm,
        token: {
            colorBgBase: '#000000',
            colorBgLayout: '#050505',
            colorBgContainer: '#111111',
            colorBgElevated: '#1a1a1a',
        },
        components: {
            Layout: {
                bodyBg: '#050505',
                footerBg: '#050505',
                headerBg: '#111111',
                headerColor: 'rgba(255, 255, 255, 0.88)',
                siderBg: '#050505',
                triggerBg: '#111111',
                triggerColor: 'rgba(255, 255, 255, 0.88)',
            },
            Menu: {
                darkItemBg: 'transparent',
                darkItemColor: 'rgba(255, 255, 255, 0.68)',
                darkItemHoverBg: 'rgba(255, 255, 255, 0.08)',
                darkItemHoverColor: '#fff',
                darkItemSelectedBg: 'rgba(22, 119, 255, 0.28)',
                darkItemSelectedColor: '#fff',
                darkSubMenuItemBg: 'transparent',
            },
            Progress: {
                circleTextColor: 'rgba(255, 255, 255, 0.88)',
                defaultColor: '#1677FF',
                remainingColor: 'rgba(255, 255, 255, 0.12)',
            },
        },
    },
}
