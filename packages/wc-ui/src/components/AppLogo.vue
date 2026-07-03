<script setup lang="ts">
defineProps<{
    text?: string
}>()
</script>

<template>
    <div class="app-logo">
        <span class="app-logo__icon">M</span>
        <span class="app-logo__text">{{ text || 'MonoRepo' }}</span>
    </div>
</template>

<style lang="less" scoped>
.app-logo {
    display: inline-flex;
    align-items: center;
    gap: 8px;

    &__icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: 6px;
        background: linear-gradient(135deg, #1677ff, #69b1ff);
        color: #fff;
        font-size: 14px;
        font-weight: 700;
    }

    &__text {
        font-size: 16px;
        font-weight: 600;
        color: #1a1a2e;
    }
}
</style>
