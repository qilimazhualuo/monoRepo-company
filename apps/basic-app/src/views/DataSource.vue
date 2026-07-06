<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { message } from 'antdv-next'
import type { DataSourceFormItem, DataSourceHealth, DataSourceSummary } from '@/api/datasource'
import {
    fetchDataSourceDetail,
    fetchDataSources,
    fetchDataSourcesHealth,
    reloadDataSources,
    switchDataSource,
    testDataSourceConnection,
} from '@/api/datasource'

const loading = ref(false)
const healthLoading = ref(false)
const saving = ref(false)
const testingId = ref<string | null>(null)
const editVisible = ref(false)

const sourceList = ref<DataSourceSummary[]>([])
const healthMap = ref<Record<string, DataSourceHealth>>({})

const editFormList = ref<DataSourceFormItem[]>([])
const defaultSourceId = ref('')

const activeSource = computed(() => sourceList.value.find((item) => item.isActive))

const loadSources = async () => {
    loading.value = true
    try {
        sourceList.value = await fetchDataSources()
    } catch (error) {
        const errorMessage = typeof error === 'object' && error !== null && 'data' in error
            ? String((error as { data: unknown }).data)
            : '加载数据源失败'
        message.error(errorMessage)
    } finally {
        loading.value = false
    }
}

const loadHealth = async () => {
    healthLoading.value = true
    try {
        const healthList = await fetchDataSourcesHealth()
        healthMap.value = Object.fromEntries(healthList.map((item) => [item.id, item]))
    } catch (error) {
        const errorMessage = typeof error === 'object' && error !== null && 'data' in error
            ? String((error as { data: unknown }).data)
            : '健康检查失败'
        message.error(errorMessage)
    } finally {
        healthLoading.value = false
    }
}

const refreshAll = async () => {
    await Promise.all([loadSources(), loadHealth()])
}

const handleSwitch = async (sourceId: string) => {
    try {
        sourceList.value = await switchDataSource(sourceId)
        message.success('已切换 basic 服务数据源')
        await loadHealth()
    } catch (error) {
        const errorMessage = typeof error === 'object' && error !== null && 'data' in error
            ? String((error as { data: unknown }).data)
            : '切换失败'
        message.error(errorMessage)
    }
}

const createEmptyFormItem = (): DataSourceFormItem => ({
    id: '',
    name: '',
    driver: 'pg',
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: '',
    database: 'mono_repo',
    isDefault: false,
})

const openEditModal = async () => {
    if (sourceList.value.length === 0) {
        editFormList.value = [createEmptyFormItem()]
        defaultSourceId.value = ''
        editVisible.value = true
        return
    }

    try {
        const detailList = await Promise.all(
            sourceList.value.map((item) => fetchDataSourceDetail(item.id)),
        )

        editFormList.value = detailList.map((detail) => ({
            id: detail.id,
            name: detail.name,
            driver: detail.driver,
            host: detail.host,
            port: detail.port,
            user: detail.user,
            password: '',
            database: detail.database,
            isDefault: detail.isDefault,
        }))

        defaultSourceId.value = sourceList.value.find((item) => item.isDefault)?.id ?? sourceList.value[0]?.id ?? ''
        editVisible.value = true
    } catch (error) {
        const errorMessage = typeof error === 'object' && error !== null && 'data' in error
            ? String((error as { data: unknown }).data)
            : '加载配置详情失败'
        message.error(errorMessage)
    }
}

const handleAddFormItem = () => {
    editFormList.value.push(createEmptyFormItem())
}

const handleRemoveFormItem = (index: number) => {
    const removedItem = editFormList.value[index]
    editFormList.value.splice(index, 1)

    if (defaultSourceId.value === removedItem?.id) {
        defaultSourceId.value = editFormList.value[0]?.id ?? ''
    }
}

const handleDriverChange = (formItem: DataSourceFormItem) => {
    formItem.port = formItem.driver === 'mysql' ? 3306 : 5432
}

const validateFormList = () => {
    for (const formItem of editFormList.value) {
        const requiredFields: Array<keyof DataSourceFormItem> = [
            'id', 'name', 'host', 'port', 'user', 'password', 'database',
        ]

        for (const fieldName of requiredFields) {
            if (!String(formItem[fieldName] ?? '').trim()) {
                message.warning(`请完整填写数据源「${formItem.name || formItem.id || '未命名'}」的 ${fieldName}`)
                return false
            }
        }
    }

    if (editFormList.value.length === 0) {
        message.warning('至少保留一个数据源')
        return false
    }

    if (!defaultSourceId.value) {
        message.warning('请选择默认数据源')
        return false
    }

    return true
}

const handleSaveReload = async () => {
    if (!validateFormList()) {
        return
    }

    saving.value = true
    try {
        sourceList.value = await reloadDataSources(editFormList.value, defaultSourceId.value)
        message.success('已通知各微服务切换数据源')
        editVisible.value = false
        await loadHealth()
    } catch (error) {
        const errorMessage = typeof error === 'object' && error !== null && 'data' in error
            ? String((error as { data: unknown }).data)
            : '热加载失败'
        message.error(errorMessage)
    } finally {
        saving.value = false
    }
}

const handleTestConnection = async (formItem: DataSourceFormItem) => {
    const requiredFields: Array<keyof DataSourceFormItem> = [
        'id', 'name', 'host', 'port', 'user', 'password', 'database',
    ]

    for (const fieldName of requiredFields) {
        if (!String(formItem[fieldName] ?? '').trim()) {
            message.warning('请先完整填写连接信息再测试')
            return
        }
    }

    testingId.value = formItem.id
    try {
        const result = await testDataSourceConnection(formItem)
        message.success(`连接成功，延迟 ${result.latencyMs}ms`)
    } catch (error) {
        const errorMessage = typeof error === 'object' && error !== null && 'data' in error
            ? String((error as { data: unknown }).data)
            : '连接测试失败'
        message.error(errorMessage)
    } finally {
        testingId.value = null
    }
}

const tableColumns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: '驱动', dataIndex: 'driver', key: 'driver' },
    { title: '地址', key: 'address' },
    { title: '数据库', dataIndex: 'database', key: 'database' },
    { title: '状态', key: 'status' },
    { title: '操作', key: 'action', width: 180 },
]

onMounted(() => {
    refreshAll()
})
</script>

<template>
    <div class="datasource">
        <div class="datasource__toolbar">
            <div class="datasource__summary">
                <span>当前活跃：</span>
                <a-tag v-if="activeSource" color="green">{{ activeSource.name }} ({{ activeSource.id }})</a-tag>
                <a-tag v-else color="default">无</a-tag>
                <span class="datasource__hint">basic 自身读 .env；保存后会通知各微服务切换</span>
            </div>
            <div class="datasource__actions">
                <a-button :loading="healthLoading" @click="loadHealth">健康检查</a-button>
                <a-button :loading="loading" @click="refreshAll">刷新</a-button>
                <a-button type="primary" @click="openEditModal">编辑配置</a-button>
            </div>
        </div>

        <a-table
            :columns="tableColumns"
            :data-source="sourceList"
            :loading="loading"
            row-key="id"
            :pagination="false"
            class="datasource__table"
        >
            <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'address'">
                    {{ record.host }}:{{ record.port }}
                </template>
                <template v-else-if="column.key === 'status'">
                    <a-space>
                        <a-tag v-if="record.isActive" color="green">活跃</a-tag>
                        <a-tag v-if="record.isDefault" color="blue">默认</a-tag>
                        <template v-if="healthMap[record.id]">
                            <a-tag :color="healthMap[record.id].ok ? 'success' : 'error'">
                                {{ healthMap[record.id].ok ? `${healthMap[record.id].latencyMs}ms` : '异常' }}
                            </a-tag>
                        </template>
                    </a-space>
                </template>
                <template v-else-if="column.key === 'action'">
                    <a-button
                        type="link"
                        size="small"
                        :disabled="record.isActive"
                        @click="handleSwitch(record.id)"
                    >
                        切换
                    </a-button>
                </template>
            </template>
        </a-table>

        <a-modal
            v-model:open="editVisible"
            title="编辑数据源配置"
            width="720px"
            :confirm-loading="saving"
            ok-text="保存并热加载"
            cancel-text="取消"
            @ok="handleSaveReload"
        >
            <div class="datasource__edit-list">
                <div
                    v-for="(formItem, index) in editFormList"
                    :key="index"
                    class="datasource__edit-item"
                >
                    <div class="datasource__edit-item-header">
                        <span>数据源 #{{ index + 1 }}</span>
                        <a-button
                            v-if="editFormList.length > 1"
                            type="link"
                            danger
                            size="small"
                            @click="handleRemoveFormItem(index)"
                        >
                            删除
                        </a-button>
                    </div>

                    <a-form layout="vertical" class="datasource__edit-form">
                        <div class="datasource__edit-row">
                            <a-form-item label="ID" required>
                                <a-input v-model:value="formItem.id" placeholder="唯一标识，如 default" />
                            </a-form-item>
                            <a-form-item label="名称" required>
                                <a-input v-model:value="formItem.name" placeholder="显示名称" />
                            </a-form-item>
                        </div>
                        <div class="datasource__edit-row">
                            <a-form-item label="驱动" required>
                                <a-select
                                    v-model:value="formItem.driver"
                                    @change="handleDriverChange(formItem)"
                                >
                                    <a-select-option value="pg">PostgreSQL</a-select-option>
                                    <a-select-option value="mysql">MySQL</a-select-option>
                                </a-select>
                            </a-form-item>
                            <a-form-item label="端口" required>
                                <a-input-number v-model:value="formItem.port" :min="1" :max="65535" style="width: 100%" />
                            </a-form-item>
                        </div>
                        <div class="datasource__edit-row">
                            <a-form-item label="主机" required>
                                <a-input v-model:value="formItem.host" />
                            </a-form-item>
                            <a-form-item label="数据库" required>
                                <a-input v-model:value="formItem.database" />
                            </a-form-item>
                        </div>
                        <div class="datasource__edit-row">
                            <a-form-item label="用户名" required>
                                <a-input v-model:value="formItem.user" />
                            </a-form-item>
                            <a-form-item label="密码" required>
                                <a-input-password v-model:value="formItem.password" placeholder="热加载需填写完整密码" />
                            </a-form-item>
                        </div>
                        <a-button
                            size="small"
                            :loading="testingId === formItem.id"
                            @click="handleTestConnection(formItem)"
                        >
                            测试连接
                        </a-button>
                    </a-form>
                </div>

                <a-button block type="dashed" @click="handleAddFormItem">添加数据源</a-button>

                <a-form-item label="默认数据源" class="datasource__default-select">
                    <a-select v-model:value="defaultSourceId" placeholder="选择默认数据源">
                        <a-select-option
                            v-for="formItem in editFormList"
                            :key="formItem.id || `new-${formItem.name}`"
                            :value="formItem.id"
                            :disabled="!formItem.id"
                        >
                            {{ formItem.name || formItem.id || '未命名' }}
                        </a-select-option>
                    </a-select>
                </a-form-item>
            </div>
        </a-modal>
    </div>
</template>

<style lang="less" scoped>
.datasource {
    &__toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
        gap: 16px;
        flex-wrap: wrap;
    }

    &__summary {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        color: #666;
        flex-wrap: wrap;
    }

    &__hint {
        font-size: 12px;
        color: #999;
    }

    &__actions {
        display: flex;
        gap: 8px;
    }

    &__edit-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
        max-height: 60vh;
        overflow-y: auto;
    }

    &__edit-item {
        padding: 12px;
        border: 1px solid #f0f0f0;
        border-radius: 8px;
        background: #fafafa;
    }

    &__edit-item-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
        font-weight: 600;
        color: #333;
    }

    &__edit-form {
        .datasource__edit-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }
    }

    &__default-select {
        margin-top: 8px;
        margin-bottom: 0;
    }
}
</style>
