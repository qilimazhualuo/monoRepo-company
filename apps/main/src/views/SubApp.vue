<script setup lang="ts">
import { WcWujie } from 'wc-ui'

/** 须与 apps/sub-app/package.json 的 name 一致 */
const subAppName = 'sub-app'

const subAppUrl = import.meta.env.DEV
    ? '/sub-app/'
    : `/${subAppName}/`
</script>

<template>
    <div class="sub-app-container">
        <WcWujie :name="subAppName" :url="subAppUrl" sync alive />
    </div>
</template>

<style lang="less" scoped>
.sub-app-container {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
    overflow: hidden;
    min-height: 500px;
}
</style>
