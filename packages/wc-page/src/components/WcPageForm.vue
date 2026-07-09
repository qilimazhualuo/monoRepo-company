<script setup lang="ts">
import { computed, getCurrentInstance, ref } from 'vue'
import dayjs from 'dayjs'
import {
    Input,
    InputNumber,
    TextArea,
    Select,
    DatePicker,
    TimePicker,
    TimeRangePicker,
    DateRangePicker,
    Switch,
    RadioGroup,
    CheckboxGroup,
    TreeSelect,
    Cascader,
    message,
} from 'antdv-next'
import WcDrawer from '../layout/WcDrawer.vue'
import WcModal from '../layout/WcModal.vue'
import { clone, treeDataMake } from 'wc-utils'
import type { DomainMap } from 'wc-utils'
import type { PageField } from '../types/field'

type FormParamItem = PageField & {
    size: string
    placeholder: string | string[]
    component: unknown
    name: string
}

const props = defineProps({
    afterFun: {
        type: Function,
    },
    rules: {
        type: Object,
    },
    fields: {
        type: Array,
        default: () => [],
    },
    domains: {
        type: Object,
        required: true,
    },
    title: String,
    width: {
        type: String,
        default: '50vw',
    },
    widthLabel: {
        type: Boolean,
        default: true,
    },
    addApi: {
        type: Function,
        default: () => Promise.resolve(),
    },
    editApi: {
        type: Function,
        default: () => Promise.resolve(),
    },
    submitHandle: {
        type: Function,
        default: (value: Record<string, unknown>) => Promise.resolve(value),
    },
    valueChange: {
        type: Function,
        default: () => Promise.resolve(),
    },
    marks: {
        type: Array,
        default: () => [],
    },
    customEdit: {
        type: Function,
        default: (value: Record<string, unknown>) => Promise.resolve(value),
    },
    customAdd: {
        type: Function,
        default: () => Promise.resolve({}),
    },
    customErrHandle: {
        type: Function,
        required: false,
    },
    wrapType: {
        type: String,
        default: 'drawer',
    },
    wrapParams: {
        type: Object,
        default: () => ({}),
    },
    class: {
        type: String,
        default: '',
    },
    layout: {
        type: String,
        default: 'vertical',
    },
    searchMap: {
        type: Object,
        default: () => ({}),
    },
})

const { proxy } = getCurrentInstance()!

const className = computed(() => `wc-page-form ${props.class}`)
const visible = ref(false)
const isEdit = ref(true)
const thisData = ref<Record<string, unknown>>({})
const formData = ref<Record<string, unknown>>({})

const components: Record<string, unknown> = {
    text: Input,
    geom: Input,
    number: InputNumber,
    textArea: TextArea,
    longitude: InputNumber,
    latitude: InputNumber,
    mapZoom: InputNumber,
    select: Select,
    domain: Select,
    tree: TreeSelect,
    multipleSelect: Select,
    date: DatePicker,
    time: TimePicker,
    rTime: TimeRangePicker,
    range: DateRangePicker,
    switch: Switch,
    radio: RadioGroup,
    checkbox: CheckboxGroup,
    unit: TreeSelect,
    user: TreeSelect,
    cascader: Cascader,
}

const formInputExtraParams = ref<Record<string, Record<string, unknown>>>({})

const formParams = computed((): FormParamItem[] => {
    return (props.fields as PageField[])
        .filter((fieldItem) => !fieldItem.hiddenInForm)
        .map((fieldItem): FormParamItem | null => {
            const { field, dataType = {} } = fieldItem
            const {
                type = 'text',
                options = [],
                treeData = [],
                fieldNames = { label: 'label', value: 'value' },
                show = true,
            } = dataType
            const showValue = typeof show === 'function' ? show(formData.value) : show
            if (!showValue) {
                return null
            }

            const extraParams = formInputExtraParams.value[field] || {}
            const component = dataType.component || components[String(type)]
            const placeholderSuffix = props.widthLabel ? '' : fieldItem.title
            const placeholder =
                {
                    range: [`请输入${placeholderSuffix}`, `请输入${placeholderSuffix}`],
                    rTime: [`请输入${placeholderSuffix}`, `请输入${placeholderSuffix}`],
                    select: `请选择${placeholderSuffix}`,
                    multipleSelect: `请选择${placeholderSuffix}`,
                    tree: `请选择${placeholderSuffix}`,
                }[String(type)] || `请输入${placeholderSuffix}`

            const fieldParams: Record<string, unknown> = {
                placeholder,
                component,
                name: fieldItem.title,
            }

            if (type === 'domain') {
                fieldParams.options = (props.domains as DomainMap)[String(dataType.dataMark)]
            } else if (type === 'select' || type === 'radio' || type === 'checkbox' || type === 'cascader') {
                fieldParams.options = options
                fieldParams.fieldNames = fieldNames
            } else if (type === 'tree') {
                fieldParams.treeData = treeDataMake(
                    clone(treeData as Array<Record<string, unknown>>),
                    fieldNames.parentId,
                    fieldNames.value,
                )
                fieldParams.fieldNames = fieldNames
            } else if (type === 'multipleSelect') {
                fieldParams.mode = 'multiple'
                fieldParams.options = options
                fieldParams.fieldNames = fieldNames
            } else if (type === 'longitude') {
                fieldParams.min = -180
                fieldParams.max = 180
            } else if (type === 'latitude') {
                fieldParams.min = -90
                fieldParams.max = 90
            }

            return {
                size: 'default',
                ...dataType,
                ...fieldParams,
                ...fieldItem,
                ...extraParams,
            } as FormParamItem
        })
        .filter((fieldItem): fieldItem is FormParamItem => fieldItem !== null)
})

const show = (record?: Record<string, unknown>) => {
    return new Promise<void>((resolve) => {
        isEdit.value = !!(record && record.id)
        if (record) {
            props
                .customEdit(record, props.searchMap)
                .then((editRecord: Record<string, unknown>) => {
                    thisData.value = editRecord
                    const temp = clone(editRecord)
                    ;(props.fields as PageField[]).forEach(({ field, dataType = {} }) => {
                        const { type = 'text' } = dataType
                        if (type === 'date' || type === 'time') {
                            temp[field] = record[field] ? dayjs(record[field] as string) : undefined
                        } else if (type === 'range' || type === 'rTime') {
                            if (record[field] instanceof Array) {
                                const [start, end] = record[field] as Array<string | undefined>
                                temp[field] = [
                                    start ? dayjs(start) : undefined,
                                    end ? dayjs(end) : undefined,
                                ]
                            } else {
                                temp[field] = undefined
                            }
                        } else {
                            temp[field] = record[field]
                        }
                    })
                    formData.value = temp
                    visible.value = true
                    resolve()
                })
                .catch((error: { message?: string }) => {
                    message.error(error.message || '加载失败')
                    resolve()
                })
            return
        }

        props.customAdd({}, props.searchMap).then((defaultValue: Record<string, unknown>) => {
            thisData.value = {}
            formData.value = defaultValue
            visible.value = true
            resolve()
        })
    })
}

const okFun = (valid = true) => {
    return new Promise<void>((resolve) => {
        const callback = () => {
            const value = clone(formData.value)
            if (isEdit.value) {
                value.id = thisData.value.id
            }

            ;(props.fields as PageField[]).forEach(({ field, dataType = {} }) => {
                if (!value[field]) {
                    return
                }
                const { type = 'text', picker = 'date', showTime = false } = dataType
                const formatMap: Record<string, string> = {
                    date: 'YYYY-MM-DD HH:mm:ss',
                    month: 'YYYY-MM',
                    year: 'YYYY',
                }
                const format = showTime ? formatMap.date : formatMap[String(picker)] || formatMap.date

                if (type === 'date' || type === 'time') {
                    value[field] = dayjs(value[field] as string).format(format)
                } else if (type === 'range' || type === 'rTime') {
                    if (value[field] instanceof Array) {
                        const [start, end] = value[field] as Array<dayjs.Dayjs | undefined>
                        value[field] = [
                            start ? dayjs(start).format(format) : undefined,
                            end ? dayjs(end).format(format) : undefined,
                        ]
                    }
                }
            })

            props
                .submitHandle(value, valid)
                .then((submitValue: Record<string, unknown>) => {
                    if (!submitValue) {
                        props.afterFun?.(resolve)
                        visible.value = false
                        return
                    }

                    const saveApi = isEdit.value ? props.editApi : props.addApi
                    saveApi(submitValue)
                        .then(() => {
                            props.afterFun?.(resolve)
                            visible.value = false
                        })
                        .catch((error: { code?: string; message?: string }) => {
                            if (error.code !== '200' && props.customErrHandle) {
                                props.customErrHandle(error)
                                return
                            }
                            message.error(error.message || '保存失败')
                        })
                        .finally(() => {
                            resolve()
                        })
                })
                .catch(() => {
                    resolve()
                })
        }

        if (valid) {
            ;(proxy?.$refs.formRef as { validate: () => Promise<void>; scrollToField: (name: string, options: Record<string, string>) => void })
                .validate()
                .then(() => {
                    callback()
                })
                .catch((error: { errorFields: Array<{ name: string[] }> }) => {
                    const firstField = error.errorFields[0].name[0]
                    ;(proxy?.$refs.formRef as { scrollToField: (name: string, options: Record<string, string>) => void }).scrollToField(
                        firstField,
                        { behavior: 'smooth' },
                    )
                    resolve()
                })
            return
        }

        callback()
    })
}

const cancleFun = () => {
    return new Promise<void>((resolve) => {
        ;(proxy?.$refs.formRef as { resetFields: () => void }).resetFields()
        resolve()
    })
}

const change = (
    field: string,
    value: unknown,
    item: FormParamItem,
    formData?: Record<string, unknown>,
    formInputExtraParams?: Record<string, Record<string, unknown>>,
) => {
    props.valueChange({ field, val: value, formData, formInputExtraParams })
    if (item.change instanceof Function) {
        item.change({ val: value, formData, item, formInputExtraParams })
    }
}

type MarkConfig = {
    mark: string
    component?: unknown
}

const getMarkKey = (mark: unknown) => (mark as MarkConfig).mark

const getMarkComponent = (mark: unknown) => (mark as MarkConfig).component

const hasMarkComponent = (mark: unknown) => Boolean(getMarkComponent(mark))

const isMarkMatched = (fieldItem: FormParamItem | null, mark: unknown) => (
    fieldItem?.mark === getMarkKey(mark)
)

defineExpose({
    show,
})
</script>

<template>
    <component
        :is="wrapType === 'drawer' ? WcDrawer : WcModal"
        v-model:visible="visible"
        :title="(isEdit ? '编辑' : '新增') + (title || '')"
        :ok-fun="okFun"
        :cancle-fun="cancleFun"
        :width="width"
        :class="className"
        v-bind="{ ...wrapParams }"
    >
        <a-form
            ref="formRef"
            :layout="layout"
            :model="formData"
            :rules="rules"
            class="wc-page-form-inner"
            size="small"
            v-bind="$attrs"
        >
            <template v-for="mark in marks" :key="getMarkKey(mark)">
                <component
                    v-if="hasMarkComponent(mark)"
                    :is="getMarkComponent(mark)"
                    :mark="getMarkKey(mark)"
                    :data="formData"
                >
                    <a-form-item
                        v-for="item in formParams.filter((fieldItem) => isMarkMatched(fieldItem, mark))"
                        :key="String(item?.field)"
                        v-bind="{ ...item }"
                        :name="item?.field"
                        :label="widthLabel ? String(item?.name) : ''"
                    >
                        <component
                            v-if="item?.type === 'customWidthMoreInput'"
                            :is="item.component"
                            :data="formData"
                            :origin-data="thisData"
                            v-bind="{ ...item }"
                            :field="item.field"
                            v-model:value="formData[item.field as string]"
                            @change="(value: unknown) => change(String(item.field), value, item)"
                        />

                        <component
                            v-else
                            :is="item?.component"
                            v-bind="{ ...item }"
                            v-model:value="formData[item?.field as string]"
                            @change="(value: unknown) => change(String(item?.field), value, item)"
                        />
                    </a-form-item>
                </component>
            </template>

            <a-form-item
                v-for="item in formParams.filter((fieldItem) => !fieldItem?.mark)"
                :key="String(item?.field)"
                :name="item?.field"
                :label="widthLabel ? String(item?.name) : ''"
            >
                <component
                    v-if="item?.type === 'customWidthMoreInput'"
                    :is="item.component"
                    :data="formData"
                    v-bind="{ ...item }"
                    v-model:value="formData[item.field as string]"
                    @change="(value: unknown) => change(String(item.field), value, item)"
                />

                <component
                    v-else
                    :is="item?.component"
                    v-bind="{ ...item }"
                    v-model:value="formData[item?.field as string]"
                    @change="(value: unknown) => change(String(item?.field), value, item)"
                />
            </a-form-item>
        </a-form>
    </component>
</template>
