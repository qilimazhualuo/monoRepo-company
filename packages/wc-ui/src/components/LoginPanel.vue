<script setup lang="ts">
import { reactive, ref } from 'vue'
import { LockOutlined, UserOutlined } from '@ant-design/icons-vue'
import VerifySlider from './VerifySlider.vue'
import type { SliderCaptchaImage, SliderVerifyPayload } from './VerifySlider.vue'

export interface LoginFormModel {
    username: string
    password: string
}

const {
    title = '欢迎登录',
    loading = false,
    fetchCaptcha,
} = defineProps<{
    title?: string
    loading?: boolean
    fetchCaptcha: () => Promise<SliderCaptchaImage>
}>()

const emit = defineEmits<{
    submit: [payload: LoginFormModel & SliderVerifyPayload]
    'before-verify': []
}>()

const formRef = ref()
const verifySliderRef = ref<InstanceType<typeof VerifySlider>>()
const showVerifyPanel = ref(false)

const formModel = reactive<LoginFormModel>({
    username: '',
    password: '',
})

const formRules = {
    username: [{ required: true, message: '请输入用户名' }],
    password: [{ required: true, message: '请输入密码' }],
}

const handleLoginClick = async () => {
    try {
        await formRef.value?.validate()
        emit('before-verify')
        showVerifyPanel.value = true
    } catch {
        verifySliderRef.value?.refreshCode()
    }
}

const handleVerifySuccess = (verifyPayload: SliderVerifyPayload) => {
    emit('submit', {
        ...formModel,
        ...verifyPayload,
    })
}

const closeVerifyPanel = () => {
    showVerifyPanel.value = false
}

const refreshCaptcha = () => {
    verifySliderRef.value?.refreshCode()
}

defineExpose({
    closeVerifyPanel,
    refreshCaptcha,
})
</script>

<template>
    <div class="login-panel">
        <div class="login-panel__title">{{ title }}</div>

        <a-form
            v-if="!showVerifyPanel"
            ref="formRef"
            :model="formModel"
            :rules="formRules"
            class="login-panel__form"
            @finish="handleLoginClick"
        >
            <a-form-item name="username">
                <a-input
                    v-model:value="formModel.username"
                    placeholder="用户名"
                    size="large"
                    :disabled="loading"
                >
                    <template #prefix>
                        <UserOutlined />
                    </template>
                </a-input>
            </a-form-item>

            <a-form-item name="password">
                <a-input-password
                    v-model:value="formModel.password"
                    placeholder="密码"
                    size="large"
                    autocomplete="on"
                    :disabled="loading"
                >
                    <template #prefix>
                        <LockOutlined />
                    </template>
                </a-input-password>
            </a-form-item>

            <a-form-item>
                <a-button
                    type="primary"
                    html-type="submit"
                    block
                    size="large"
                    class="login-panel__submit"
                    :loading="loading"
                >
                    登录
                </a-button>
            </a-form-item>
        </a-form>

        <div v-else class="login-panel__verify">
            <div class="login-panel__verify-header">
                <span>滑动验证</span>
                <a-button type="text" @click="closeVerifyPanel">关闭</a-button>
            </div>
            <a-spin :spinning="loading">
                <VerifySlider
                    ref="verifySliderRef"
                    :fetch-captcha="fetchCaptcha"
                    :after-change="handleVerifySuccess"
                />
            </a-spin>
        </div>
    </div>
</template>

<style lang="less" scoped>
.login-panel {
    width: 100%;

    &__title {
        margin-bottom: 32px;
        color: #000;
        font-size: 40px;
        font-weight: 700;
        letter-spacing: 4px;
        text-align: center;
    }

    &__form {
        padding: 0 24px;

        :deep(.ant-input-affix-wrapper) {
            padding: 12px 14px;
            border-radius: 12px;
            background: #fff !important;

            .anticon {
                color: #4a85f9;
            }
        }
    }

    &__submit {
        height: 48px;
        margin-top: 8px;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 600;
    }

    &__verify {
        width: 100%;
        padding: 0 0 12px;
        background: #fff;
        border: 1px solid #e8e8e8;
        border-radius: 8px;

        &-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            color: rgba(0, 0, 0, 0.65);
        }

        :deep(.verify-slider) {
            padding: 0 12px;
        }
    }
}
</style>
