<script setup lang="ts">
defineProps<{
    title?: string
    subtitle?: string
}>()
</script>

<template>
    <div class="page-header">
        <div class="page-header__main">
            <h2 class="page-header__title">{{ title }}</h2>
            <p v-if="subtitle" class="page-header__subtitle">{{ subtitle }}</p>
        </div>
        <div v-if="$slots.extra" class="page-header__extra">
            <slot name="extra" />
        </div>
    </div>
</template>

<style lang="less" scoped>
.page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid #f0f0f0;

    &__title {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        color: #1a1a2e;
    }

    &__subtitle {
        margin: 6px 0 0;
        font-size: 14px;
        color: #666;
    }

    &__extra {
        flex-shrink: 0;
    }
}
</style>
