<script setup lang="ts">
import { PageHeader } from 'wc-ui'
import { formatDate, isEmpty } from 'wc-utils'

const currentTime = formatDate(new Date())
const emptyCheckText = isEmpty('') ? '工具方法 isEmpty 正常' : '异常'
</script>

<template>
    <div class="home">
        <PageHeader
            title="子应用首页"
            subtitle="从 wc-ui / wc-utils 引入"
        >
            <template #extra>
                <a-tag color="green">子应用</a-tag>
            </template>
        </PageHeader>

        <p class="home__desc">
            这是子应用框架的默认页面，公共组件和工具方法无需重复实现。
        </p>

        <a-space direction="vertical" :size="12">
            <a-alert :message="emptyCheckText" type="success" show-icon />
            <span class="home__time">当前时间：{{ currentTime }}</span>
            <a-button type="default">子应用里的 Antdv 按钮</a-button>
        </a-space>
    </div>
</template>

<style lang="less" scoped>
.home {
    &__desc {
        margin: 0 0 16px;
        color: #666;
        line-height: 1.6;
    }

    &__time {
        font-size: 13px;
        color: #999;
    }
}
</style>
