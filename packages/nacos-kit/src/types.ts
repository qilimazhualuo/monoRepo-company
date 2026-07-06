export interface NacosKitOptions {
    serviceName: string
    configDataId: string
    envFilePath: string
}

export interface NacosBootstrapConfig {
    enabled: boolean
    serverAddr: string
    namespace: string
    group: string
    configDataId: string
    serviceName: string
    serviceIp: string
    username: string
    password: string
}

export interface NacosServiceHandle {
    deregister: () => Promise<void>
}
