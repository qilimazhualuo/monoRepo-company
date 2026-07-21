import type { ConfigProviderProps } from 'antdv-next'
import { theme } from 'antdv-next'
import { computed } from 'vue'

const useBootstrapTheme = () => computed<ConfigProviderProps>(() => ({
    theme: {
                    algorithm: theme.defaultAlgorithm,
                    token: {
                        borderRadius: 4,
                        borderRadiusLG: 6,
                        colorInfo: '#3a87ad',
                    },
                    components: {
                        Tooltip: {
                            fontSize: 12,
                        },
                        Checkbox: {
                            colorBorder: '#666',
                            borderRadius: 2,
                            algorithm: true,
                        },
                        Radio: {
                            colorBorder: '#666',
                            borderRadius: 2,
                            algorithm: true,
                        },
                        Notification: {
                            colorSuccessBg: '#dff0d8',
                            colorErrorBg: '#f2dede',
                            colorInfoBg: '#d9edf7',
                            colorWarningBg: '#fcf8e3',
                        },
                        Layout: {
                            bodyBg: '#f8f9fa',
                            footerBg: '#f8f9fa',
                            headerBg: '#ffffff',
                            headerColor: '#212529',
                            siderBg: '#ffffff',
                            triggerBg: '#e9ecef',
                            triggerColor: '#212529',
                        },
                        Menu: {
                            activeBarBorderWidth: 0,
                            itemBg: 'transparent',
                            subMenuItemBg: 'transparent',
                        },
                        Button: {},
                        Alert: {},
                        Modal: {},
                        Card: {},
                        Select: {},
                        Input: {},
                        Switch: {},
                        Progress: {
                            circleTextColor: '#212529',
                            defaultColor: '#337ab7',
                            remainingColor: '#f5f5f5',
                        },
                        Steps: {},
                        Slider: {},
                        ColorPicker: {},
                    },
                },
}))

export default useBootstrapTheme
