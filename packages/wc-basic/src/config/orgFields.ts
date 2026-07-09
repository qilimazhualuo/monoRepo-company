import type { PageField } from 'wc-page'

export const orgFields: PageField[] = [
    {
        field: 'name',
        title: '单位名称',
        tableParams: { width: 180, index: 1 },
        dataType: { type: 'text' },
    },
    {
        field: 'code',
        title: '单位编码',
        tableParams: { width: 140, index: 2 },
        dataType: { type: 'text' },
    },
    {
        field: 'sort',
        title: '排序',
        tableParams: { width: 80, index: 3 },
        dataType: { type: 'number' },
    },
    {
        field: 'status',
        title: '状态',
        dataType: {
            type: 'select',
            options: [
                { label: '启用', value: 1 },
                { label: '停用', value: 0 },
            ],
        },
    },
    {
        field: 'parentId',
        title: '上级单位',
        hiddenInTable: true,
        hiddenInDetail: true,
        dataType: { type: 'number' },
    },
]
