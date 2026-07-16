<script setup lang="ts">
defineOptions({ name: 'home' })

import { computed } from 'vue'
import { AppLogo, PageHeader } from 'wc-ui'
import { formatDate } from 'wc-utils'

const appTitle = 'MonoRepo 微前端'
const currentTime = computed(() => formatDate(new Date()))
</script>

<template>
    <div class="home">
        <PageHeader
            :title="appTitle"
            subtitle="主应用基座 · 共享 packages 已接入"
        >
            <template #extra>
                <a-tag color="blue">主应用</a-tag>
            </template>
        </PageHeader>

        <div class="home__card">
            <p class="home__desc">
                点击顶部导航「子应用」可加载微前端子应用。基础依赖与公共模块统一由 packages 管理。
            </p>

            <a-descriptions bordered :column="1" size="small">
                <a-descriptions-item label="组件库">antdv-next</a-descriptions-item>
                <a-descriptions-item label="状态管理">Pinia（主应用）</a-descriptions-item>
                <a-descriptions-item label="工具方法">wc-utils</a-descriptions-item>
                <a-descriptions-item label="当前时间">{{ currentTime }}</a-descriptions-item>
            </a-descriptions>

            <div class="home__actions">
                <a-button type="primary">Antdv 按钮</a-button>
                <AppLogo text="Shared UI" />
            </div>
        </div>
    </div>
</template>

<style lang="less" scoped>
@import '@/styles/theme-vars.less';

.home {
    &__card {
        padding: 24px;
        background: @app-color-bg-container;
        border-radius: @app-border-radius-lg;
        box-shadow: @app-box-shadow;
        border: 1px solid @app-color-border-secondary;
    }

    &__desc {
        margin: 0 0 20px;
        color: @app-color-text-secondary;
        line-height: 1.6;
    }

    &__actions {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-top: 20px;
    }
}
</style>
