import type { PageField, SearchField } from 'wc-page'

export const dictTypeFields: PageField[] = [
    {
        field: 'name',
        title: '字典名称',
        tableParams: { width: 160, index: 1 },
        dataType: { type: 'text' },
    },
    {
        field: 'type',
        title: '字典类型',
        tableParams: { width: 180, index: 2 },
        dataType: { type: 'text' },
    },
    {
        field: 'status',
        title: '状态',
        tableParams: { width: 100, index: 3 },
        dataType: {
            type: 'domain',
            dataMark: 'sys_normal_disable',
        },
    },
    {
        field: 'remark',
        title: '备注',
        tableParams: { width: 220, index: 4, ellipsis: true },
        dataType: { type: 'text' },
    },
]

export const dictTypeSearchFields: SearchField[] = [
    {
        searchField: 'keyword',
        title: '关键词',
        col: 8,
    },
]

export const dictDataFields: PageField[] = [
    {
        field: 'dictType',
        title: '字典类型',
        tableParams: { width: 160, index: 1 },
        dataType: {
            type: 'select',
            options: [],
            fieldNames: { label: 'name', value: 'type' },
        },
    },
    {
        field: 'label',
        title: '字典标签',
        tableParams: { width: 140, index: 2 },
        dataType: { type: 'text' },
    },
    {
        field: 'value',
        title: '字典键值',
        tableParams: { width: 140, index: 3 },
        dataType: { type: 'text' },
    },
    {
        field: 'sort',
        title: '排序',
        tableParams: { width: 80, index: 4 },
        dataType: { type: 'number' },
    },
    {
        field: 'status',
        title: '状态',
        tableParams: { width: 100, index: 5 },
        dataType: {
            type: 'domain',
            dataMark: 'sys_normal_disable',
        },
    },
    {
        field: 'remark',
        title: '备注',
        tableParams: { width: 200, index: 6, ellipsis: true },
        dataType: { type: 'text' },
    },
]

export const dictDataSearchFields: SearchField[] = [
    {
        searchField: 'dictType',
        title: '字典类型',
        col: 8,
        type: 'select',
    },
    {
        searchField: 'keyword',
        title: '关键词',
        col: 8,
    },
]
