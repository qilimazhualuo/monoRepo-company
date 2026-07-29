<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'antdv-next'
import { LoginPanel } from 'wc-ui'
import { fetchPublicKey, fetchSliderCaptcha, login } from '@/api/auth'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const publicKeyPem = ref('')
const loginPanelRef = ref<InstanceType<typeof LoginPanel>>()

const loadPublicKey = async () => {
    try {
        publicKeyPem.value = await fetchPublicKey()
    } catch {
        message.error('登录公钥获取失败，请刷新页面重试')
    }
}

const handleLoginSubmit = async (payload: {
    username: string
    password: string
    vCodeKey: string
    blockX: number
    blockY: number
    blockWidthRatio: number
    blockHeightRatio: number
}) => {
    await loadPublicKey()

    if (!publicKeyPem.value) {
        message.error('登录公钥未就绪，请刷新页面重试')
        loginPanelRef.value?.refreshCaptcha()
        return
    }

    loading.value = true

    try {
        const result = await login(
            {
                username: payload.username,
                password: payload.password,
                vCodeKey: payload.vCodeKey,
                blockX: payload.blockX,
                blockY: payload.blockY,
                blockWidthRatio: payload.blockWidthRatio,
                blockHeightRatio: payload.blockHeightRatio,
            },
            publicKeyPem.value,
        )

        userStore.setUser(result.data)
        message.success('登录成功')
        router.push('/')
    } catch (error) {
        const errorResult = error as { code?: string; data?: string }
        const errorMessage = errorResult.data || '登录失败'
        message.warning(errorMessage)
        loginPanelRef.value?.refreshCaptcha()

        if (errorResult.code === '400' && errorMessage.includes('密码解密失败')) {
            await loadPublicKey()
        }

        if (errorResult.code === '500') {
            loginPanelRef.value?.closeVerifyPanel()
        }
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    loadPublicKey()
})
</script>

<template>
    <div class="login-page">
        <div class="login-page__panel">
            <LoginPanel
                ref="loginPanelRef"
                title="欢迎登录"
                :loading="loading"
                :fetch-captcha="fetchSliderCaptcha"
                @submit="handleLoginSubmit"
            />
        </div>
    </div>
</template>

<style lang="less" scoped>
.login-page {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    min-height: 100vh;
    background: linear-gradient(
        135deg,
        @app-color-primary 0%,
        @app-color-primary-hover 45%,
        @app-color-primary-bg 100%
    );

    &__panel {
        display: flex;
        flex-direction: column;
        justify-content: center;
        width: 480px;
        min-width: 480px;
        min-height: 100vh;
        padding: 48px 24px;
        background: linear-gradient(
            158deg,
            @app-color-bg-layout 2.01%,
            @app-color-bg-container 97.19%
        );
        box-shadow: @app-box-shadow;
        backdrop-filter: blur(4px);
        color: @app-color-text;
    }
}
</style>
