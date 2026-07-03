<script setup lang="ts">
/** 须与 apps/sub-app/package.json 的 name 一致 */
const subAppName = 'sub-app'

const subAppUrl = import.meta.env.DEV
    ? 'http://localhost:3001/'
    : `/${subAppName}/`
</script>

<template>
    <div class="sub-app-container">
        <!-- Vite 子应用必须用 iframe 沙箱，默认 with 沙箱无法处理 type="module" 的脚本 -->
        <micro-app
            :name="subAppName"
            :url="subAppUrl"
            :baseroute="`/${subAppName}`"
            router-mode="native"
            iframe
        />
    </div>
</template>

<style lang="less" scoped>
.sub-app-container {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
    overflow: hidden;
    min-height: 500px;

    micro-app {
        display: block;
        width: 100%;
        min-height: 500px;
    }
}
</style>
