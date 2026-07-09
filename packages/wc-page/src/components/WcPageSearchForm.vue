<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
    Input,
    InputNumber,
    Select,
    DatePicker,
    TimePicker,
    TimeRangePicker,
    DateRangePicker,
    Switch,
    CheckboxGroup,
    TreeSelect,
    Cascader,
    RadioGroup,
} from 'antdv-next'
import { SearchOutlined } from '@ant-design/icons-vue'
import type { DomainMap } from 'wc-utils'
import type { PageField, SearchField } from '../types/field'

const props = defineProps({
    searchMap: {
        type: Object,
        required: true,
    },
    fields: {
        type: Array,
        default: () => [],
    },
    searchFields: {
        type: Array,
        default: () => [],
    },
    domains: {
        type: Object,
        required: true,
    },
    searchFun: {
        type: Function,
    },
    resetFun: {
        type: Function,
        required: false,
    },
    size: {
        type: [String, Array],
        default: 'default',
    },
    widthLabel: {
        type: Boolean,
        default: false,
    },
    formGutter: {
        type: Array,
        default: () => [12, 12],
    },
    btnsGutter: {
        type: Array,
        default: () => [12, 12],
    },
    class: {
        type: String,
        default: '',
    },
    loading: {
        type: Boolean,
    },
    btns: {
        type: Array,
        default: () => ['search', 'reset'],
    },
})

const className = computed(() => `wc-page-search-form ${props.class}`)
const inputSize = typeof props.size === 'string' ? props.size : props.size[0]
const btnSize = typeof props.size === 'string' ? props.size : props.size[1]

const map = ref({ ...props.searchMap })
watch(
    () => props.searchMap,
    (searchMapValue) => {
        map.value = searchMapValue
    },
)

const components: Record<string, unknown> = {
    text: Input,
    geom: Input,
    number: InputNumber,
    textArea: Input,
    longitude: InputNumber,
    latitude: InputNumber,
    mapZoom: InputNumber,
    select: Select,
    domain: Select,
    date: DatePicker,
    time: TimePicker,
    rTime: TimeRangePicker,
    range: DateRangePicker,
    switch: Switch,
    radio: RadioGroup,
    checkbox: CheckboxGroup,
    tree: TreeSelect,
    unit: TreeSelect,
    user: TreeSelect,
    cascader: Cascader,
}

const params = computed(() => {
    const searchParams: Array<Record<string, unknown>> = []

    props.searchFields.forEach((searchFieldItem) => {
        const fieldItem = props.fields.find(
            (item) => (item as PageField).field === (searchFieldItem as SearchField).field,
        ) as PageField | undefined
        const typedSearchField = searchFieldItem as SearchField

        if (fieldItem) {
            const dataType = fieldItem.dataType || {}
            const fieldType = typedSearchField.type || dataType.type
            const fieldParams: Record<string, unknown> = { type: fieldType }

            if (fieldType === 'domain') {
                fieldParams.options = (props.domains as DomainMap)[String(dataType.dataMark)]
            } else if (fieldType === 'select') {
                fieldParams.options = dataType.options
                fieldParams.fieldNames = dataType.fieldNames
                fieldParams.type = 'select'
            }

            const component = components[String(fieldType)]
            const placeholderSuffix = props.widthLabel ? '' : typedSearchField.title || fieldItem.title
            const placeholder =
                {
                    range: [placeholderSuffix, placeholderSuffix],
                    rTime: [placeholderSuffix, placeholderSuffix],
                    select: `请选择${placeholderSuffix}`,
                    tree: `请选择${placeholderSuffix}`,
                }[String(fieldType)] || `请输入${placeholderSuffix}`

            searchParams.push({
                name: typedSearchField.title || fieldItem.title,
                ...dataType,
                ...fieldParams,
                component,
                placeholder,
                ...typedSearchField,
            })
            return
        }

        searchParams.push({
            ...typedSearchField,
            component: Input,
            placeholder: `请输入${typedSearchField.name || typedSearchField.title || ''}`,
        })
    })

    return searchParams
})

const search = async () => {
    if (props.searchFun) {
        await props.searchFun(JSON.parse(JSON.stringify(map.value)))
    }
}

const reset = () => {
    if (props.resetFun instanceof Function) {
        props.resetFun()
    }
}
</script>

<template>
    <a-form
        ref="formRef"
        layout="inline"
        :model="map"
        size="small"
        :class="className"
        @finish="search"
    >
        <div class="wc-page-search-form-content">
            <div class="wc-page-search-form-content-input">
                <a-row :gutter="formGutter">
                    <a-col v-for="item in params" :key="String(item.name)" :span="item.col">
                        <a-form-item :name="item.field" :label="widthLabel ? String(item.name) : ''">
                            <component
                                :is="item.component"
                                v-bind="{ ...item }"
                                v-model:value="map[item.searchField as string]"
                                :size="inputSize"
                            />
                        </a-form-item>
                    </a-col>
                </a-row>
            </div>

            <div class="wc-page-search-form-content-btn">
                <a-row :gutter="btnsGutter" justify="end" class="wc-page-search-form-btns">
                    <slot name="btn-before"></slot>

                    <a-col v-if="btns.includes('search')">
                        <a-form-item>
                            <a-button type="primary" html-type="submit" :size="btnSize" :loading="loading">
                                <template #icon>
                                    <SearchOutlined />
                                </template>
                                查询
                            </a-button>
                        </a-form-item>
                    </a-col>

                    <a-col v-if="btns.includes('reset')">
                        <a-form-item>
                            <a-button :size="btnSize" @click.stop="reset">重置</a-button>
                        </a-form-item>
                    </a-col>

                    <slot name="btn-after"></slot>
                </a-row>
            </div>
        </div>
    </a-form>
</template>

<style lang="less">
@import '../styles/variables.less';

.wc-page-search-form {
    .wc-page-search-form-content {
        width: 100%;
        display: flex;
        padding: @gap;
        gap: @gap;

        .wc-page-search-form-content-input {
            width: 20px;
            flex: 1 1 auto;

            .ant-form-item {
                margin-inline-end: 0;
            }

            .ant-form-item-label {
                display: flex !important;
                align-items: center;
                font-weight: 700;
            }

            .ant-form-item-control-input-content {
                > * {
                    width: 100%;
                }
            }
        }
    }

    .wc-page-search-form-btns {
        flex-wrap: nowrap;

        .ant-form-item {
            margin-right: 0;
        }
    }
}
</style>
