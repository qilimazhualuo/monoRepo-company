import type { PageField, SearchField } from 'wc-page'

export const userFields: PageField[] = [
    {
        field: 'username',
        title: '用户名',
        tableParams: { width: 120, index: 1 },
        dataType: {
            type: 'text',
            show: (formData) => !formData.id,
        },
    },
    {
        field: 'password',
        title: '密码',
        dataType: {
            type: 'text',
            show: (formData) => !formData.id,
        },
        hiddenInDetail: true,
        hiddenInForm: false,
    },
    {
        field: 'nickname',
        title: '昵称',
        tableParams: { width: 120, index: 2 },
        dataType: { type: 'text' },
    },
    {
        field: 'orgName',
        title: '单位',
        tableParams: { width: 160, index: 3 },
        hiddenInForm: true,
    },
    {
        field: 'orgId',
        title: '所属单位',
        dataType: {
            type: 'select',
            options: [],
            fieldNames: { label: 'name', value: 'id' },
        },
        hiddenInDetail: true,
    },
    {
        field: 'roleNames',
        title: '角色',
        tableParams: { width: 180, index: 4 },
        hiddenInForm: true,
        customRender: (context) => {
            const text = context.text as string[] | undefined
            return text?.join('、') || '-'
        },
    },
    {
        field: 'roleIds',
        title: '角色',
        dataType: {
            type: 'multipleSelect',
            options: [],
            fieldNames: { label: 'name', value: 'id' },
            show: (formData) => !formData.id,
        },
        hiddenInDetail: true,
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
]

export const userSearchFields: SearchField[] = [
    {
        searchField: 'keyword',
        title: '关键词',
        col: 8,
    },
]
