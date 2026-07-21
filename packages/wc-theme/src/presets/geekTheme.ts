import type { ConfigProviderProps } from 'antdv-next'
import { theme } from 'antdv-next'
import { computed } from 'vue'

const useGeekTheme = () => computed<ConfigProviderProps>(() => ({
    theme: {
                    algorithm: theme.darkAlgorithm,
                    token: {
                        borderRadius: 0,
                        lineWidth: 2,
                        colorPrimary: '#39ff14',
                        colorText: '#39ff14',
                        colorInfo: '#39ff14',
                        colorBgBase: '#000000',
                        colorBgLayout: '#030603',
                        colorBgContainer: '#051105',
                        colorBgElevated: '#0a1a0a',
                        controlHeightSM: 26,
                        controlHeight: 34,
                    },
                    components: {
                        Notification: {
                            colorSuccessBg: 'rgba(57, 255, 20, 0.08)',
                            colorErrorBg: 'rgba(255, 77, 79, 0.12)',
                            colorInfoBg: 'rgba(57, 255, 20, 0.08)',
                            colorWarningBg: 'rgba(250, 219, 20, 0.12)',
                        },
                        Layout: {
                            bodyBg: '#030603',
                            footerBg: '#030603',
                            headerBg: '#051105',
                            headerColor: '#39ff14',
                            siderBg: '#030603',
                            triggerBg: '#051105',
                            triggerColor: '#39ff14',
                        },
                        Menu: {
                            darkGroupTitleColor: 'rgba(57, 255, 20, 0.45)',
                            darkItemBg: 'transparent',
                            darkItemColor: 'rgba(57, 255, 20, 0.72)',
                            darkItemHoverBg: 'rgba(57, 255, 20, 0.12)',
                            darkItemHoverColor: '#39ff14',
                            darkItemSelectedBg: '#39ff14',
                            darkItemSelectedColor: '#39ff14',
                            darkPopupBg: '#030603',
                            darkSubMenuItemBg: 'transparent',
                        },
                        Button: {},
                        Alert: {},
                        Modal: {},
                        Card: {},
                        Tooltip: {},
                        Checkbox: {},
                        Radio: {},
                        Select: {},
                        Input: {},
                        Switch: {},
                        Progress: {
                            circleTextColor: '#39ff14',
                            defaultColor: '#39ff14',
                            remainingColor: 'rgba(57, 255, 20, 0.18)',
                        },
                        Steps: {},
                        Slider: {},
                        ColorPicker: {},
                    },
                },
}))

export default useGeekTheme
