import { generateKeyPairSync, privateDecrypt, constants } from 'node:crypto'
import { env } from '../config/env'

let publicKeyPem = ''
let privateKeyPem = ''

const formatPemForEnv = (pem: string) => `"${pem.replace(/\n/g, '\\n')}"`

export const initRsaKeys = () => {
    if (env.rsaPublicKey && env.rsaPrivateKey) {
        publicKeyPem = env.rsaPublicKey
        privateKeyPem = env.rsaPrivateKey
        return
    }

    const keyPair = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem',
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
        },
    })

    publicKeyPem = keyPair.publicKey
    privateKeyPem = keyPair.privateKey

    console.warn('[server] RSA_PUBLIC_KEY / RSA_PRIVATE_KEY 未配置，当前使用临时密钥（重启后会变）')
    console.warn(`[server] 请将以下内容写入 server/.env：`)
    console.warn(`RSA_PUBLIC_KEY=${formatPemForEnv(publicKeyPem)}`)
    console.warn(`RSA_PRIVATE_KEY=${formatPemForEnv(privateKeyPem)}`)
}

export const getPublicKeyPem = () => publicKeyPem

export const decryptRsaPassword = (encryptedPassword: string): string => {
    const decryptedBuffer = privateDecrypt(
        {
            key: privateKeyPem,
            padding: constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256',
        },
        Buffer.from(encryptedPassword, 'base64'),
    )

    return decryptedBuffer.toString('utf8')
}
