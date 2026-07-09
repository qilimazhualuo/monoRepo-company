<script setup lang="ts">
</script>

<template>
    <div class="about">
        <h3 class="about__title">关于子应用</h3>
        <p class="about__desc">
            子应用已配置 wujie 生命周期（__WUJIE_MOUNT / __WUJIE_UNMOUNT），支持独立运行和被主应用嵌入。
        </p>
        <dl class="about__info">
            <dt>技术栈</dt>
            <dd>Vue 3 + Vite + TypeScript + Less</dd>
            <dt>跨域</dt>
            <dd>已配置 Access-Control-Allow-Origin</dd>
            <dt>路由模式</dt>
            <dd>History 模式，wujie 自动同步路由</dd>
        </dl>
    </div>
</template>

<style lang="less" scoped>
.about {
    &__title {
        margin: 0 0 8px;
        font-size: 18px;
        color: #2c3e50;
    }

    &__desc {
        margin: 0 0 20px;
        color: #666;
        line-height: 1.6;
    }

    &__info {
        margin: 0;
        padding: 16px;
        background: #f8f9fa;
        border-radius: 8px;

        dt {
            margin-bottom: 4px;
            font-size: 13px;
            font-weight: 600;
            color: #333;
        }

        dd {
            margin: 0 0 12px;
            font-size: 13px;
            color: #666;

            &:last-child {
                margin-bottom: 0;
            }
        }
    }
}
</style>
