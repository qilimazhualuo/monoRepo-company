<script setup lang="ts">
import { computed, ref } from 'vue'
import WcDrawer from '../layout/WcDrawer.vue'

const props = defineProps({
    name: {
        type: String,
        required: true,
    },
    detailParams: {
        type: Array,
        required: true,
    },
    class: {
        type: String,
        default: '',
    },
    width: {
        type: String,
        default: '35vw',
    },
    marks: {
        type: Array,
        default: () => [],
    },
})

const className = computed(() => `wc-page-block-detail ${props.class}`)

const visible = ref(false)
const dataMap = ref<Array<Record<string, unknown>>>([])
const data = ref<Record<string, unknown>>({})

const show = (record: Record<string, unknown>) => {
    data.value = record
    dataMap.value = []
    const detailItems: Array<Record<string, unknown>> = []

    props.detailParams.forEach((item) => {
        const detailItem = item as Record<string, unknown>
        let text = record[detailItem.key as string]
        if (detailItem.customRender) {
            text = (detailItem.customRender as (value: unknown, row: Record<string, unknown>) => unknown)(text, record)
        } else if (detailItem.type === 'map') {
            text = (detailItem.map as Record<string, unknown>)[String(text)]
        } else if (detailItem.type === 'iMap') {
            text = (detailItem.map as Record<number, unknown>)[Number(text)]
        }
        detailItems.push({
            title: detailItem.title,
            type: detailItem.type,
            value: text,
            key: detailItem.key,
            mark: detailItem.mark,
        })
    })

    dataMap.value = detailItems
    visible.value = true
}

const cancleFun = () => {
    visible.value = false
}

const getDetailData = () => data.value

const labelWidth = computed(() => {
    const fontNum = dataMap.value.reduce((previousValue, currentValue) => {
        const titleLength = String(currentValue.title).length
        return titleLength > previousValue ? titleLength : previousValue
    }, 0)
    return fontNum
})

type MarkConfig = {
    mark: string
    component?: unknown
}

const getMarkKey = (mark: unknown) => (mark as MarkConfig).mark

const getMarkComponent = (mark: unknown) => (mark as MarkConfig).component

const hasMarkComponent = (mark: unknown) => Boolean(getMarkComponent(mark))

const isMarkMatched = (item: Record<string, unknown>, mark: unknown) => (
    item.mark === getMarkKey(mark)
)

const isVNodeValue = (value: unknown) => (
    Boolean(value && typeof value === 'object' && '__v_isVNode' in (value as object))
)

defineExpose({
    show,
    cancleFun,
    getDetailData,
})
</script>

<template>
    <WcDrawer
        v-model:visible="visible"
        :title="name + '详情'"
        :footer="false"
        :cancle-fun="cancleFun"
        :width="width"
        :class-name="className"
    >
        <template v-for="mark in marks" :key="getMarkKey(mark)">
            <component
                v-if="hasMarkComponent(mark)"
                :is="getMarkComponent(mark)"
                :mark="getMarkKey(mark)"
                :data="data"
            >
                <a-descriptions
                    v-if="dataMap.filter((item) => isMarkMatched(item, mark)).length !== 0"
                    title=""
                    bordered
                    :column="24"
                    size="middle"
                    class="wc-page-detail"
                    :label-style="{
                        width: `calc(${labelWidth}rem + 48px)`,
                    }"
                >
                    <a-descriptions-item
                        v-for="item in dataMap.filter((detailItem) => isMarkMatched(detailItem, mark))"
                        :key="String(item.title)"
                        :span="24"
                        :label="String(item.title)"
                    >
                        <slot name="descitem" :item="item" :value="item.value" :record="dataMap">
                            <img
                                v-if="item.type === 'img'"
                                class="wc-page-detail-img"
                                :src="String(item.value)"
                            />
                            <component
                                v-else-if="item.value && isVNodeValue(item.value)"
                                :is="item.value"
                            />
                            <span v-else>{{ item.value }}</span>
                        </slot>
                    </a-descriptions-item>
                </a-descriptions>
            </component>
        </template>

        <a-descriptions
            v-if="dataMap.filter((item) => !item.mark).length !== 0"
            title=""
            bordered
            :column="24"
            size="middle"
            class="wc-page-detail"
            :label-style="{
                width: `calc(${labelWidth}rem + 48px)`,
            }"
        >
            <a-descriptions-item
                v-for="item in dataMap.filter((detailItem) => !detailItem.mark)"
                :key="String(item.title)"
                :span="24"
                :label="String(item.title)"
            >
                <slot name="descitem" :item="item" :value="item.value" :record="dataMap">
                    <img
                        v-if="item.type === 'img'"
                        class="wc-page-detail-img"
                        :src="String(item.value)"
                    />
                    <component
                        v-else-if="item.value && isVNodeValue(item.value)"
                        :is="item.value"
                    />
                    <span v-else>{{ item.value }}</span>
                </slot>
            </a-descriptions-item>
        </a-descriptions>

        <slot name="supplyContent" :data="data"></slot>
    </WcDrawer>
</template>

<style lang="less">
@import '../styles/variables.less';

.wc-page-detail {
    .wc-page-detail-img {
        width: @uni * 160;
    }
}
</style>
