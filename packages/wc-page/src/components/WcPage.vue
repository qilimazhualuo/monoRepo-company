<script setup lang="tsx">
import { computed, ref, watch, onMounted, useSlots } from 'vue'
import { message, theme } from 'antdv-next'
import {
    PlusOutlined,
    DeleteOutlined,
    EditOutlined,
    UnorderedListOutlined,
    SettingOutlined,
} from '@ant-design/icons-vue'
import WcPageTree from './WcPageTree.vue'
import WcPageSearchForm from './WcPageSearchForm.vue'
import WcPageTable from './WcPageTable.vue'
import WcPageForm from './WcPageForm.vue'
import WcPageDetail from './WcPageDetail.vue'
import { useDict } from 'wc-utils'
import type { PageField, SearchField, TreeConfig } from '../types/field'

const props = defineProps({
    fields: {
        type: Array,
        default: () => [],
    },
    widthBatch: {
        type: Boolean,
        default: false,
    },
    widthTree: {
        type: [Boolean, Object],
        default: false,
    },
    searchFields: {
        type: Array,
        default: () => [],
    },
    class: {
        type: String,
        default: '',
    },
    searchParams: {
        type: Object,
        default: () => ({}),
    },
    tableParams: {
        type: Object,
        default: () => ({ defaultBtn: true, otherBtn: [], params: {} }),
    },
    formParams: {
        type: Object,
        default: () => ({}),
    },
    detailParams: {
        type: Object,
        default: () => ({}),
    },
    domains: {
        type: Object,
        default: undefined,
    },
    delsApi: {
        type: Function,
        default: () => Promise.resolve(),
    },
    searchApi: {
        type: Function,
        default: () => Promise.resolve(),
    },
    editApi: {
        type: Function,
        default: () => Promise.resolve(),
    },
    addApi: {
        type: Function,
        default: () => Promise.resolve(),
    },
    title: {
        type: String,
        default: '',
    },
    btnGroup: {
        type: Object,
        default: () => ({ add: true, del: true }),
    },
    customAdd: {
        type: Function,
        default: () => Promise.resolve({}),
    },
})

const emit = defineEmits(['treeSelect'])

const slots = useSlots()

const tableRef = ref<InstanceType<typeof WcPageTable> | null>(null)
const formRef = ref<InstanceType<typeof WcPageForm> | null>(null)
const detailRef = ref<InstanceType<typeof WcPageDetail> | null>(null)

const pageRefs = {
    tableRef,
    formRef,
    detailRef,
}

const className = computed(() => `wc-page bus-block ${props.class}`)
const loading = ref(true)
const searchMap = ref<Record<string, unknown>>({})
const searchMapOrigin: Record<string, unknown> = {}

const resetFun = () => {
    for (const key in searchMapOrigin) {
        searchMap.value[key] = searchMapOrigin[key]
    }
    search()
}

watch(
    () => props.searchFields,
    (searchFieldList) => {
        const searchTemp: Record<string, unknown> = {}
        ;(searchFieldList as SearchField[]).forEach((searchFieldItem) => {
            const { field, value = undefined, searchField } = searchFieldItem
            if (field || searchField) {
                searchTemp[searchField] = value
            }
        })
        searchMap.value = searchTemp
        Object.assign(searchMapOrigin, searchTemp)
    },
    { immediate: true, deep: true },
)

const treeConfig = computed(() => props.widthTree as TreeConfig)
const treeData = computed(() => treeConfig.value?.data || [])

const treeSelectFun = (selectedKeys: Array<string | number>) => {
    if (treeConfig.value?.field) {
        searchMap.value[treeConfig.value.field] = selectedKeys.toString()
    }
    emit('treeSelect', selectedKeys)
    search()
}

const search = () => {
    return new Promise<void>((resolve) => {
        loading.value = true
        const searchPromise = tableRef.value?.search(searchMap.value)
        if (!searchPromise) {
            loading.value = false
            resolve()
            return
        }

        searchPromise.finally(() => {
            loading.value = false
            rowLoadingMap.value = new Map()
            resolve()
        })
    })
}

const domainNames = (props.fields as PageField[])
    .filter((fieldItem) => fieldItem.dataType && fieldItem.dataType.type === 'domain')
    .map((fieldItem) => String(fieldItem.dataType?.dataMark))

const dictDomains = useDict(...domainNames)
const domains = computed(() => props.domains || dictDomains.value)

const delLoading = ref(false)
const del = (record?: Record<string, unknown>) => {
    return new Promise<void>((resolve) => {
        let data: Array<string | number>
        if (record) {
            data = [record.id as string | number]
        } else {
            delLoading.value = true
            data = selectRows.value.map((rowItem) => rowItem.id as string | number)
            if (data.length === 0) {
                message.info('请选择要删除的数据！')
                resolve()
                return
            }
        }

        props
            .delsApi(data)
            .catch((error: { message?: string }) => {
                message.error(error.message || '删除失败')
            })
            .finally(() => {
                search()
                resolve()
                if (!record) {
                    delLoading.value = false
                }
            })
    })
}

const edit = (record: Record<string, unknown>) => {
    return formRef.value?.show(record) ?? Promise.resolve()
}

const detail = (record: Record<string, unknown>) => {
    return detailRef.value?.show(record) ?? Promise.resolve()
}

const selectRows = ref<Array<Record<string, unknown>>>([])

const rules: Record<string, unknown[]> = {}
;(props.fields as PageField[]).forEach((fieldItem) => {
    if (fieldItem.rules) {
        rules[fieldItem.field] = fieldItem.rules
    }
})

const isShowCustom = ref(false)
const cureCheckList = ref<string[]>([])

watch(
    () => props.fields,
    (fieldList) => {
        cureCheckList.value = (fieldList as PageField[])
            .filter((fieldItem) => fieldItem.tableParams)
            .map((fieldItem) => fieldItem.field)
    },
    { immediate: true, deep: true },
)

const tableColumnsCheck = computed(() => {
    return (props.fields as PageField[])
        .filter((fieldItem) => fieldItem.tableParams)
        .filter((fieldItem) => cureCheckList.value.includes(fieldItem.field))
})

const rowLoadingMap = ref(new Map<string | number, ReturnType<typeof ref<boolean>>>())

const tableBtn = (record: Record<string, unknown>) => {
    let defaultBtn = props.tableParams.defaultBtn
    if (typeof defaultBtn === 'function') {
        defaultBtn = defaultBtn(record)
    }

    let btnList: string[] = []
    if (typeof defaultBtn === 'boolean') {
        btnList = defaultBtn ? ['detail', 'edit', 'del'] : []
    } else if (defaultBtn instanceof Array) {
        btnList = defaultBtn
    }

    if (!rowLoadingMap.value.has(record.id as string | number)) {
        rowLoadingMap.value.set(record.id as string | number, ref(false))
    }
    const rowLoading = rowLoadingMap.value.get(record.id as string | number)!

    return (
        <>
            {btnList.includes('detail') && (
                <a-tooltip title="详情">
                    <a-button
                        type="text"
                        size="small"
                        icon={<UnorderedListOutlined />}
                        loading={rowLoading.value}
                        onClick={() => {
                            rowLoading.value = true
                            detailRef.value
                                ?.show(record)
                                .finally(() => {
                                    rowLoading.value = false
                                })
                        }}
                    />
                </a-tooltip>
            )}
            {btnList.includes('edit') && (
                <a-tooltip title="编辑">
                    <a-button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        loading={rowLoading.value}
                        onClick={() => {
                            rowLoading.value = true
                            formRef.value
                                ?.show(record)
                                .finally(() => {
                                    rowLoading.value = false
                                })
                        }}
                    />
                </a-tooltip>
            )}
            {btnList.includes('del') && (
                <a-tooltip title="删除">
                    <a-button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        loading={rowLoading.value}
                        onClick={() => {
                            rowLoading.value = true
                            del(record).finally(() => {
                                rowLoading.value = false
                            })
                        }}
                    />
                </a-tooltip>
            )}
            {slots.tableBtn?.({ record, loading: rowLoading })}
        </>
    )
}

const openAddForm = () => {
    formRef.value?.show()
}

onMounted(() => {
    search()
})

defineExpose({
    search,
    setSearchMap: (searchParams: Record<string, unknown>) => {
        searchMap.value = {
            ...searchMap.value,
            ...searchParams,
        }
    },
    openForm: (record?: Record<string, unknown>) => formRef.value?.show(record),
})

const { token } = theme.useToken()
const borderRadius = `${token.value.borderRadius}px`
</script>

<template>
    <div :class="className">
        <WcPageTree
            v-if="!!widthTree"
            class="wc-page-tree-panel"
            :style="{ borderRadius }"
            :data="treeData"
            :multiple="typeof treeConfig?.multiple === 'boolean' ? treeConfig?.multiple : true"
            :select-data="treeConfig?.selectData"
            :select-fun="treeSelectFun"
            width-search
            selected-width-child
            :placeholder="treeConfig?.placeholder"
        />

        <div class="wc-page-content">
            <WcPageSearchForm
                v-if="searchFields.length"
                class="wc-page-search"
                :style="{ borderRadius }"
                :search-map="searchMap"
                :fields="fields"
                :domains="domains"
                :search-fields="searchFields"
                :search-fun="search"
                :loading="loading"
                :reset-fun="resetFun"
                v-bind="{ ...searchParams }"
            >
                <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
                    <slot :name="slotName" v-bind="slotProps"></slot>
                </template>
            </WcPageSearchForm>

            <div class="wc-page-table-panel" :style="{ borderRadius }">
                <div class="wc-page-btn-group">
                    <div class="wc-page-btn-group-left">
                        <a-button
                            v-if="btnGroup.add"
                            type="primary"
                            @click="openAddForm"
                        >
                            <template #icon>
                                <PlusOutlined />
                            </template>
                            新增
                        </a-button>

                        <a-popconfirm
                            v-if="btnGroup.del"
                            ok-text="确定"
                            cancel-text="取消"
                            title="确定删除吗？"
                            :disabled="selectRows.length === 0"
                            @confirm="del()"
                        >
                            <a-button danger :disabled="selectRows.length === 0" :loading="delLoading">
                                <template #icon>
                                    <DeleteOutlined />
                                </template>
                                删除
                            </a-button>
                        </a-popconfirm>

                        <slot name="btn-group" :select-rows="selectRows" :refs="pageRefs"></slot>
                    </div>

                    <div class="wc-page-btn-group-right">
                        <slot name="btn-group-right"></slot>

                        <a-button @click.stop="isShowCustom = !isShowCustom">
                            <template #icon>
                                <SettingOutlined />
                            </template>
                            自定义列
                        </a-button>

                        <div v-if="isShowCustom" class="wc-page-custom-setting">
                            <a-checkbox-group
                                v-model:value="cureCheckList"
                                :options="
                                    (fields as PageField[])
                                        .filter((fieldItem) => fieldItem.tableParams)
                                        .map((fieldItem) => ({
                                            label: fieldItem.title,
                                            value: fieldItem.field,
                                        }))
                                "
                                style="display: flex; flex-direction: column"
                            />
                        </div>
                    </div>
                </div>

                <WcPageTable
                    ref="tableRef"
                    :fields="tableColumnsCheck"
                    :table-btn="tableBtn"
                    :search-api="searchApi"
                    :edit="edit"
                    :detail="detail"
                    :del="del"
                    :search="search"
                    :select-rows="selectRows"
                    v-bind="{ ...tableParams }"
                    @update:select-rows="selectRows = $event"
                />
            </div>
        </div>
    </div>

    <WcPageForm
        ref="formRef"
        :rules="rules"
        :title="title"
        :fields="fields"
        :domains="domains"
        :after-fun="search"
        :search-map="searchMap"
        :add-api="addApi"
        :edit-api="editApi"
        :custom-add="customAdd"
        v-bind="{ ...formParams }"
    />

    <WcPageDetail
        ref="detailRef"
        :fields="fields"
        :domains="domains"
        :title="title"
        v-bind="{ ...detailParams }"
    >
        <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
            <slot :name="slotName" v-bind="slotProps"></slot>
        </template>
    </WcPageDetail>
</template>

<style lang="less">
@import '../styles/variables.less';

@boxShadow: 0 2px 4px 2px rgba(224 224 224 / 0.15);

.wc-page {
    height: 100%;
    display: flex;
    gap: @gap;

    .wc-page-tree-panel {
        width: 15%;
        min-width: 200px;
        box-shadow: @boxShadow;
    }

    .wc-page-content {
        width: 2px;
        flex: 1 1 auto;
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: @gap;

        .wc-page-search {
            background-color: #fff;
            box-shadow: @boxShadow;
        }

        .wc-page-table-panel {
            height: 2px;
            flex: 1 1 auto;
            display: flex;
            flex-direction: column;
            gap: @gap;
            background-color: #fff;
            padding: @gap;
            box-shadow: @boxShadow;

            .wc-page-btn-group {
                display: flex;
                align-items: flex-end;
                justify-content: space-between;
                gap: @gap;

                .wc-page-btn-group-left {
                    display: flex;
                    align-items: flex-end;
                    gap: @gap;
                }

                .wc-page-btn-group-right {
                    display: flex;
                    align-items: center;
                    gap: @gap;
                    position: relative;

                    .wc-page-custom-setting {
                        position: absolute;
                        right: 0;
                        top: calc(100% + @gap);
                        background: #fff;
                        border: 1px solid #dcdcdc;
                        padding: 8px;
                        z-index: 999;
                        max-height: 300px;
                        overflow-y: auto;
                    }
                }
            }
        }
    }
}
</style>

