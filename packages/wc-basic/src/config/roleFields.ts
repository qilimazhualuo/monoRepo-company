import type { PageField } from 'wc-page'

export const roleFields: PageField[] = [
    {
        field: 'code',
        title: '角色编码',
        tableParams: { width: 140, index: 1 },
        dataType: { type: 'text' },
    },
    {
        field: 'name',
        title: '角色名称',
        tableParams: { width: 140, index: 2 },
        dataType: { type: 'text' },
    },
    {
        field: 'description',
        title: '描述',
        tableParams: { width: 220, index: 3, ellipsis: true },
        dataType: { type: 'text' },
    },
    {
        field: 'status',
        title: '状态',
        tableParams: { width: 100, index: 4 },
        dataType: {
            type: 'select',
            options: [
                { label: '启用', value: 1 },
                { label: '停用', value: 0 },
            ],
        },
    },
]
