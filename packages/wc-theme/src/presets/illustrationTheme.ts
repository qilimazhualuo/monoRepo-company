import type { ConfigProviderProps } from 'antdv-next'
import { theme } from 'antdv-next'
import { computed } from 'vue'

const useIllustrationTheme = () => computed<ConfigProviderProps>(() => ({
    theme: {
                    algorithm: theme.defaultAlgorithm,
                    token: {
                        colorText: '#2C2C2C',
                        colorPrimary: '#52C41A',
                        colorSuccess: '#51CF66',
                        colorWarning: '#FFD93D',
                        colorError: '#FA5252',
                        colorInfo: '#4DABF7',
                        colorBorder: '#2C2C2C',
                        colorBorderSecondary: '#2C2C2C',
                        lineWidth: 3,
                        lineWidthBold: 3,
                        borderRadius: 12,
                        borderRadiusLG: 16,
                        borderRadiusSM: 8,
                        controlHeight: 40,
                        controlHeightSM: 34,
                        controlHeightLG: 48,
                        fontSize: 15,
                        fontWeightStrong: 600,
                        colorBgBase: '#FFF9F0',
                        colorBgContainer: '#FFFFFF',
                    },
                    components: {
                        Button: {
                            primaryShadow: 'none',
                            dangerShadow: 'none',
                            defaultShadow: 'none',
                            fontWeight: 600,
                        },
                        Modal: {
                            boxShadow: 'none',
                        },
                        Card: {
                            boxShadow: '4px 4px 0 #2C2C2C',
                            colorBgContainer: '#FFF0F6',
                        },
                        Tooltip: {
                            colorBorder: '#2C2C2C',
                            colorBgSpotlight: 'rgba(100, 100, 100, 0.95)',
                            borderRadius: 8,
                        },
                        Select: {
                            optionSelectedBg: 'transparent',
                        },
                        Slider: {
                            dotBorderColor: '#237804',
                            dotActiveBorderColor: '#237804',
                            colorPrimaryBorder: '#237804',
                            colorPrimaryBorderHover: '#237804',
                        },
                        Notification: {
                            colorSuccessBg: '#F6FFED',
                            colorErrorBg: '#FFF1F0',
                            colorInfoBg: '#E6F4FF',
                            colorWarningBg: '#FFFBE6',
                        },
                        Layout: {
                            bodyBg: '#FFF9F0',
                            footerBg: '#FFF9F0',
                            headerBg: '#FFFFFF',
                            headerColor: '#2C2C2C',
                            siderBg: '#FFF0F6',
                            triggerBg: '#FFE7BA',
                            triggerColor: '#2C2C2C',
                        },
                        Menu: {
                            activeBarBorderWidth: 0,
                            itemBg: 'transparent',
                            subMenuItemBg: 'transparent',
                        },
                        Alert: {},
                        Checkbox: {},
                        Radio: {},
                        Input: {},
                        Switch: {},
                        Progress: {
                            circleTextColor: '#2C2C2C',
                            defaultColor: '#52C41A',
                            remainingColor: '#D9F7BE',
                        },
                        Steps: {},
                        ColorPicker: {},
                    },
                },
}))

export default useIllustrationTheme
