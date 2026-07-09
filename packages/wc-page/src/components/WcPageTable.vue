<script setup lang="tsx">
import { computed, getCurrentInstance, ref, onMounted, onUnmounted, provide, nextTick } from 'vue'
import { message } from 'antdv-next'
import { createGuid } from 'wc-utils'
import { treeDataMake } from 'wc-utils'
import { PAGE_SIZE_OPTIONS, formatTotalText } from '../utils/pagination'
import type { PageField } from '../types/field'

const props = defineProps({
    tableBtn: {
        default: () => () => null,
        required: true,
    },
    refresh: {
        type: Function,
    },
    searchApi: {
        type: Function,
        default: () => Promise.resolve({}),
    },
    fields: {
        type: Array,
        default: () => [],
    },
    widthOperation: {
        type: Boolean,
        default: true,
    },
    loadDataParams: {
        type: [Object, null],
    },
    clickTableRow: {
        type: Function,
        default: () => null,
    },
    selectable: {
        type: Boolean,
        default: true,
    },
    isTreeTable: {
        type: [Boolean, Object],
        default: false,
    },
    sNo: {
        type: Boolean,
        default: false,
    },
    pagination: {
        type: Boolean,
        default: true,
    },
    paginationSize: {
        type: String,
        default: '',
    },
    pageSizeDefault: {
        type: Number,
        default: 20,
    },
    rowKey: {
        type: [String, Function],
        default: 'id',
    },
    dataHandleFun: {
        type: Function,
    },
    selectRows: {
        type: Array,
    },
    scrollHeight: {
        type: [Number, undefined],
    },
    search: {
        type: Function,
    },
    clearBeforeSearch: {
        type: Boolean,
        default: false,
    },
})

const emit = defineEmits(['update:selectRows'])

const { proxy } = getCurrentInstance()!

const wrapLegacyRender = (
    handler: (context: Record<string, unknown>) => unknown,
) => (value: unknown, record: Record<string, unknown>, index: number) => handler({
    text: value,
    value,
    record,
    index,
})

const columns = computed(() => {
    const columnList = (props.fields as PageField[])
        .filter((fieldItem) => fieldItem.tableParams)
        .sort((leftItem, rightItem) => Number(leftItem.tableParams?.index) - Number(rightItem.tableParams?.index))
        .map((fieldItem) => {
            const { field, tableParams, dataType, customRender, title } = fieldItem
            const titleText = typeof title === 'string' ? title : String(title || '')
            const columnParams: Record<string, unknown> = {
                ...tableParams,
                dataIndex: field,
                title: titleText,
            }
            delete columnParams.customRender

            if (tableParams?.fixed) {
                columnParams.title = () => <span style="font-weight: 600;">{titleText}</span>
            }

            let renderHandler = customRender
                ? wrapLegacyRender(customRender as (context: Record<string, unknown>) => unknown)
                : undefined
            if (!renderHandler && dataType) {
                const {
                    type,
                    options = [],
                    treeData = [],
                    fieldNames = { label: 'label', value: 'value' },
                } = dataType

                renderHandler = (text: unknown) => {
                    if (type === 'select' || type === 'radio' || type === 'checkbox') {
                        const option = options.find(
                            (optionItem) => optionItem[fieldNames.value as string] === text,
                        )
                        return option ? option[fieldNames.label as string] : ''
                    }

                    if (type === 'tree' || type === 'treeSelect') {
                        const valueName = fieldNames.value || 'value'
                        const labelName = fieldNames.title || fieldNames.label || 'title'
                        const childrenName = fieldNames.children || 'children'

                        const findLabel = (dataList: Array<Record<string, unknown>>, value: unknown) => {
                            for (const node of dataList) {
                                if (node[valueName] === value) {
                                    return node[labelName]
                                }
                                const children = node[childrenName] as Array<Record<string, unknown>> | undefined
                                if (children && children.length > 0) {
                                    const found = findLabel(children, value)
                                    if (found) {
                                        return found
                                    }
                                }
                            }
                            return null
                        }

                        if (Array.isArray(text)) {
                            const labels = text.map((valueItem) => findLabel(treeData, valueItem) || valueItem)
                            return labels.join('、')
                        }

                        const label = findLabel(treeData, text)
                        return label || text || ''
                    }

                    if (type === 'date') {
                        return text || ''
                    }

                    return text || ''
                }
            }

            if (renderHandler) {
                columnParams.render = renderHandler
            }

            return columnParams
        })

    if (props.widthOperation) {
        columnList.push({
            title: '操作',
            dataIndex: 'operation',
            align: 'center',
            width: 140,
            fixed: 'right',
            render: (_value: unknown, record: Record<string, unknown>) => props.tableBtn(record),
        })
    }

    if (props.sNo) {
        columnList.unshift({
            title: '序号',
            dataIndex: 'id',
            width: 60,
            fixed: 'left',
            align: 'center',
            render: (_value: unknown, _record: Record<string, unknown>, index: number) => (
                (page.value - 1) * pageSize.value + index + 1
            ),
        })
    }

    return columnList
})

const height = ref<number>()
const tableWidth = ref(0)
provide('tableWidth', tableWidth)
const uniLength = (0.058575 * document.body.clientWidth) / 100
let observer: ResizeObserver | undefined

const tableScroll = computed(() => {
    if (!height.value || Number.isNaN(height.value) || height.value <= 0) {
        return undefined
    }
    return { y: height.value }
})

const setTableHeight = () => {
    const tableContent = proxy.$refs.tableContent as HTMLElement | undefined
    if (!tableContent) {
        return
    }

    const topElement = tableContent.getElementsByClassName('ant-table-thead')[0] as HTMLElement | undefined
    let extraHeight = topElement?.clientHeight ?? 0

    if (props.pagination) {
        const paginationElement = (proxy.$refs.pagination as { $el?: HTMLElement } | undefined)?.$el
        extraHeight += paginationElement?.clientHeight ?? 0
        extraHeight += 12 * uniLength
    }

    const calculatedHeight = props.scrollHeight ?? (tableContent.offsetHeight - extraHeight)
    height.value = calculatedHeight > 0 ? calculatedHeight : undefined
    tableWidth.value = tableContent.offsetWidth
}

onMounted(() => {
    setTableHeight()
    observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
            if (entry.target === proxy.$refs.tableContent) {
                setTableHeight()
            }
        }
    })
    observer.observe(proxy.$refs.tableContent as HTMLElement)
})

onUnmounted(() => {
    observer?.disconnect()
})

const page = ref(1)
const pageSize = ref(props.pageSizeDefault)
const total = ref(0)

const change = () => {
    props.search?.()
}

const loading = ref(false)
const tableData = ref<Array<Record<string, unknown>>>([])
let currentSearchMap: Record<string, unknown> = {}
let pendingResolve: ((value: unknown) => void) | null = null
const expandedRowKeys = ref<Array<string | number>>([])
let requestId = ''

const loadData = async (searchMap: Record<string, unknown>, resolveHandler?: (value: unknown) => void) => {
    tableData.value = props.clearBeforeSearch ? [] : tableData.value
    emit('update:selectRows', [])
    currentSearchMap = searchMap
    pendingResolve = resolveHandler || null

    for (const key in currentSearchMap) {
        if (currentSearchMap[key] === null) {
            delete currentSearchMap[key]
        }
    }

    const requestParams = { ...currentSearchMap }
    if (props.pagination) {
        requestParams.page = page.value
        requestParams.size = pageSize.value
    }

    const currentRequestId = createGuid()
    requestId = currentRequestId
    loading.value = true

    props
        .searchApi(requestParams)
        .then(async (response) => {
            if (currentRequestId !== requestId) {
                return
            }

            let result = response
            if (props.dataHandleFun) {
                result = await props.dataHandleFun(response)
            }

            if (props.pagination) {
                if (result.pagination) {
                    total.value = Number(result.pagination.total)
                    tableData.value = result.data
                } else {
                    total.value = Number(result.total)
                    tableData.value = result.data
                }
            } else if (props.isTreeTable instanceof Object) {
                const { parentId, dataId } = props.isTreeTable as { parentId: string; dataId: string }
                tableData.value = treeDataMake(result.data, parentId, dataId)
            } else if (Array.isArray(result.data)) {
                tableData.value = result.data
            } else if (Array.isArray(result.list)) {
                tableData.value = result.list
            } else {
                tableData.value = treeDataMake(result.data || result.list || [])
            }

            if (expandedRowKeys.value.length === 0) {
                tableData.value.forEach((rowItem) => {
                    expandedRowKeys.value.push(rowItem.id as string | number)
                })
            }

            pendingResolve?.(tableData.value)
            nextTick(() => {
                setTableHeight()
            })
        })
        .catch((error: { message?: string }) => {
            message.error(error.message || '数据加载失败')
            pendingResolve?.(error)
        })
        .finally(() => {
            loading.value = false
        })
}

const onChangeRow = (_keys: Array<string | number>, selectedRows: Array<Record<string, unknown>>) => {
    emit('update:selectRows', selectedRows)
}

const expandedRowsChange = (expandedRows: Array<string | number>) => {
    expandedRowKeys.value = expandedRows
}

const customRow = (record: Record<string, unknown>, index: number) => ({
    onClick: (event: MouseEvent) => {
        props.clickTableRow?.(record, index, event)
    },
})

const setBlank = () => {
    tableData.value = []
    total.value = 0
}

const searchTable = (searchMap: Record<string, unknown>) => {
    return new Promise((resolve) => {
        const params = JSON.parse(JSON.stringify(searchMap))
        setBlank()
        loadData(params, resolve)
    })
}

defineExpose({
    search: searchTable,
})
</script>

<template>
    <div ref="tableContent" class="wc-page-table-content">
        <a-table
            :scroll="tableScroll"
            :columns="columns"
            bordered
            size="small"
            :pagination="false"
            :data-source="tableData"
            :loading="loading"
            :row-key="rowKey"
            :expanded-row-keys="expandedRowKeys"
            :on-row="customRow"
            :row-selection="
                selectable
                    ? {
                          fixed: true,
                          selectedRowKeys: (selectRows || []).map((rowItem) => rowItem[rowKey as string]),
                          onChange: onChangeRow,
                      }
                    : undefined
            "
            v-bind="$attrs"
            @expanded-rows-change="expandedRowsChange"
        />

        <a-pagination
            v-if="pagination"
            ref="pagination"
            v-model:current="page"
            v-model:page-size="pageSize"
            :page-size-options="PAGE_SIZE_OPTIONS"
            :total="total"
            show-size-changer
            show-quick-jumper
            :size="paginationSize"
            :show-total="formatTotalText"
            @change="change"
        />
    </div>
</template>

<style lang="less" scoped>
@import '../styles/variables.less';

.wc-page-table-content {
    height: 2px;
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    gap: @gap;
}
</style>
