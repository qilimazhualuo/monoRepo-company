<script setup lang="ts">
import { computed, getCurrentInstance, ref } from 'vue'
import WcDetail from '../block/WcDetail.vue'
import type { PageField } from '../types/field'

const props = defineProps({
    fields: {
        type: Array,
        default: () => [],
    },
    title: {
        type: String,
        default: '',
    },
    customEdit: {
        type: Function,
        default: (value: Record<string, unknown>) => Promise.resolve(value),
    },
    className: {
        type: String,
        default: '',
    },
})

const { proxy } = getCurrentInstance()!

const detailParams = computed(() => {
    return (props.fields as PageField[])
        .filter((fieldItem) => !fieldItem.hiddenInDetail)
        .map((fieldItem) => {
            const { field, dataType = {}, customRender, title, mark } = fieldItem
            const params: Record<string, unknown> = { key: field, title, mark }
            const {
                type = 'text',
                options = [],
                treeData = [],
                fieldNames = { label: 'label', value: 'value' },
            } = dataType

            if (customRender) {
                params.customRender = (text: unknown, record: Record<string, unknown>) =>
                    customRender({ text, record, isDetail: true, ...fieldItem })
            } else if (type === 'select' || type === 'radio' || type === 'checkbox') {
                params.customRender = (text: unknown) =>
                    options.find((optionItem) => optionItem[fieldNames.value as string] === text)?.[
                        fieldNames.label as string
                    ]
            } else if (type === 'tree' || type === 'treeSelect') {
                const valueName = fieldNames.value || 'value'
                const labelName = fieldNames.title || 'title'
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

                params.customRender = (text: unknown) => findLabel(treeData, text) || text
            }

            return params
        })
})

const formData = ref<Record<string, unknown>>({})

const show = (record: Record<string, unknown>) => {
    return new Promise<void>((resolve) => {
        props.customEdit(record).then((detailRecord) => {
            ;(proxy.$refs.detailRef as { show: (row: Record<string, unknown>) => void }).show(detailRecord)
            formData.value = detailRecord
            resolve()
        })
    })
}

const closeDetail = () => {
    ;(proxy.$refs.detailRef as { cancleFun: () => void }).cancleFun()
}

defineExpose({
    show,
    closeDetail,
})
</script>

<template>
    <WcDetail
        ref="detailRef"
        :name="title"
        :detail-params="detailParams"
        :class="'wc-page-detail ' + className"
        v-bind="$attrs"
    >
        <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
            <slot :name="slotName" v-bind="slotProps"></slot>
        </template>

        <template #supplyContent>
            <slot name="detailExtra" :form-data="formData" :close-detail="closeDetail"></slot>
        </template>
    </WcDetail>
</template>

<style lang="less">
.wc-page-detail {
    .ant-descriptions-item-label {
        width: 50%;
        max-width: 50% !important;
    }
}
</style>
