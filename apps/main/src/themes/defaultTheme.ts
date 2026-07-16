import type { ConfigProviderProps } from 'antdv-next'
import { theme } from 'antdv-next'

export const defaultThemeConfig: ConfigProviderProps = {
    theme: {
        algorithm: theme.defaultAlgorithm,
        components: {
            Layout: {
                bodyBg: '#f5f8ff',
                footerBg: '#f5f8ff',
                headerBg: '#ffffff',
                headerColor: 'rgba(0, 0, 0, 0.88)',
                siderBg: '#ffffff',
                triggerBg: '#f0f5ff',
                triggerColor: 'rgba(0, 0, 0, 0.88)',
            },
            Menu: {
                activeBarBorderWidth: 0,
                itemBg: 'transparent',
                subMenuItemBg: 'transparent',
            },
            Progress: {
                circleTextColor: 'rgba(0, 0, 0, 0.88)',
                defaultColor: '#1677FF',
                remainingColor: 'rgba(0, 0, 0, 0.06)',
            },
        },
    },
}
