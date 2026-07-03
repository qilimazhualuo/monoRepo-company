const pemToArrayBuffer = (publicKeyPem: string): ArrayBuffer => {
    const pemBody = publicKeyPem
        .replace(/-----BEGIN PUBLIC KEY-----/g, '')
        .replace(/-----END PUBLIC KEY-----/g, '')
        .replace(/\s/g, '')
    const binaryText = atob(pemBody)
    const bytes = new Uint8Array(binaryText.length)

    for (let charIndex = 0; charIndex < binaryText.length; charIndex += 1) {
        bytes[charIndex] = binaryText.charCodeAt(charIndex)
    }

    return bytes.buffer
}

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer)
    let binaryText = ''

    for (let byteIndex = 0; byteIndex < bytes.length; byteIndex += 1) {
        binaryText += String.fromCharCode(bytes[byteIndex])
    }

    return btoa(binaryText)
}

/**
 * RSA-OAEP（SHA-256）公钥加密
 */
export const encryptWithRsa = async (
    plainText: string,
    publicKeyPem: string,
): Promise<string | false> => {
    try {
        const publicKey = await crypto.subtle.importKey(
            'spki',
            pemToArrayBuffer(publicKeyPem),
            {
                name: 'RSA-OAEP',
                hash: 'SHA-256',
            },
            false,
            ['encrypt'],
        )

        const encryptedBuffer = await crypto.subtle.encrypt(
            { name: 'RSA-OAEP' },
            publicKey,
            new TextEncoder().encode(plainText),
        )

        return arrayBufferToBase64(encryptedBuffer)
    } catch {
        return false
    }
}
