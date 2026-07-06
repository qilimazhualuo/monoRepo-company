<script setup lang="ts">
</script>

<template>
    <div class="home">
        <h3 class="home__title">基础管理子应用</h3>
        <p class="home__desc">
            管理系统、单位、人员、菜单、角色，以及多数据源配置。
        </p>
        <div class="home__cards">
            <router-link class="home__card" :to="{ name: 'datasource' }">
                <span class="home__card-title">数据源配置</span>
                <span class="home__card-desc">查看、切换、热加载数据库连接</span>
            </router-link>
        </div>
    </div>
</template>

<style lang="less" scoped>
.home {
    &__title {
        margin: 0 0 8px;
        font-size: 18px;
        color: #333;
    }

    &__desc {
        margin: 0 0 24px;
        color: #666;
        font-size: 14px;
    }

    &__cards {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 16px;
    }

    &__card {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 16px;
        border: 1px solid #e8e8e8;
        border-radius: 8px;
        text-decoration: none;
        transition: all 0.2s;

        &:hover {
            border-color: #81c784;
            box-shadow: 0 2px 8px rgba(46, 125, 50, 0.12);
        }
    }

    &__card-title {
        font-size: 15px;
        font-weight: 600;
        color: #2e7d32;
    }

    &__card-desc {
        font-size: 13px;
        color: #888;
    }
}
</style>
