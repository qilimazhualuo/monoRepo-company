import type { PageField } from 'wc-page'

export const menuFields: PageField[] = [
    {
        field: 'name',
        title: '菜单名称',
        tableParams: { width: 180, index: 1 },
        dataType: { type: 'text' },
    },
    {
        field: 'type',
        title: '类型',
        tableParams: { width: 90, index: 2 },
        dataType: {
            type: 'select',
            options: [
                { label: '目录', value: 'dir' },
                { label: '菜单', value: 'menu' },
                { label: '按钮', value: 'button' },
            ],
        },
    },
    {
        field: 'path',
        title: '路由路径',
        tableParams: { width: 180, index: 3, ellipsis: true },
        dataType: { type: 'text' },
    },
    {
        field: 'permission',
        title: '权限标识',
        tableParams: { width: 180, index: 4, ellipsis: true },
        dataType: { type: 'text' },
    },
    {
        field: 'sort',
        title: '排序',
        tableParams: { width: 80, index: 5 },
        dataType: { type: 'number' },
    },
    {
        field: 'parentId',
        title: '上级菜单',
        hiddenInTable: true,
        hiddenInDetail: true,
        dataType: { type: 'number' },
    },
]
