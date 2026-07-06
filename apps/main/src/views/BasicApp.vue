<script setup lang="ts">
/** 须与 apps/basic-app/package.json 的 name 一致 */
const basicAppName = 'basic-app'

const basicAppUrl = import.meta.env.DEV
    ? 'http://localhost:3002/'
    : `/${basicAppName}/`
</script>

<template>
    <div class="basic-app-container">
        <micro-app
            :name="basicAppName"
            :url="basicAppUrl"
            :baseroute="`/${basicAppName}`"
            router-mode="native"
            iframe
        />
    </div>
</template>

<style lang="less" scoped>
.basic-app-container {
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
