<script setup lang="ts">
import { ref, computed } from 'vue'
import { clone, treeDataMake } from 'wc-utils'

const props = defineProps({
    data: {
        type: Array,
        required: true,
    },
    selectData: {
        type: Array,
        default: () => [],
    },
    selectFun: {
        type: Function,
        default: () => null,
    },
    multiple: {
        type: Boolean,
        default: false,
    },
    defaultExpandAll: {
        type: Boolean,
        default: true,
    },
    fieldNames: {
        type: Object,
        default: () => ({
            children: 'children',
            title: 'title',
            value: 'value',
            parentId: 'parentId',
        }),
    },
    widthSearch: {
        type: Boolean,
        default: true,
    },
    placeholder: {
        type: String,
        default: '请输入',
    },
    selectedWidthChild: {
        type: Boolean,
        default: false,
    },
    showLine: {
        type: Boolean,
        default: true,
    },
    class: {
        type: String,
        default: '',
    },
})

const className = computed(() => `wc-page-tree ${props.class}`)

const getAllChildrenIds = (nodes: Array<Record<string, unknown>>, ids: Array<string | number>) => {
    nodes.forEach((node) => {
        ids.push(node[props.fieldNames.value] as string | number)
        const children = node.children as Array<Record<string, unknown>> | undefined
        if (children && children.length > 0) {
            getAllChildrenIds(children, ids)
        }
    })
}

const selectedKeys = ref([...props.selectData])
const select = (
    selectedKeyList: Array<string | number>,
    { selectedNodes }: { selectedNodes: Array<Record<string, unknown>> },
) => {
    selectedKeys.value = selectedKeyList
    const keys = selectedNodes.map((node) => node[props.fieldNames.value])
    if (!props.selectFun) {
        return
    }
    if (props.selectedWidthChild) {
        const childIds: Array<string | number> = []
        getAllChildrenIds(selectedNodes, childIds)
        props.selectFun(childIds)
        return
    }
    props.selectFun(keys)
}

const getSelect = () => selectedKeys.value

const searchVal = ref('')
const treeData = computed(() => {
    const originData = clone(props.data as Array<Record<string, unknown>>)
    return treeDataMake(
        originData.filter((item) => String(item[props.fieldNames.title] ?? '').includes(searchVal.value)),
        props.fieldNames.parentId,
        props.fieldNames.value,
    )
})

const search = (name: string) => {
    searchVal.value = name
}

defineExpose({
    getSelect,
})
</script>

<template>
    <div :class="className">
        <a-input-search
            v-if="widthSearch"
            class="wc-page-tree-search"
            :placeholder="placeholder"
            @search="search"
        />

        <a-tree
            v-if="treeData && treeData.length"
            class="wc-page-tree-content"
            :tree-data="treeData"
            :default-expand-all="defaultExpandAll"
            :multiple="multiple"
            :field-names="fieldNames"
            selectable
            :show-line="showLine && { showLeafIcon: false }"
            v-model:selected-keys="selectedKeys"
            v-bind="$attrs"
            @select="select"
        />
    </div>
</template>

<style lang="less" scoped>
@import '../styles/variables.less';

.wc-page-tree {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: @gap;
    background-color: #fff;

    .wc-page-tree-search {
        margin-bottom: 8px;
    }

    :deep(.wc-page-tree-content) {
        height: 20px;
        flex: 1 1 auto;
        overflow: auto;
    }
}
</style>
