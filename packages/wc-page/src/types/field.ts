export type FieldDataType = {
    type?: string
    options?: Array<Record<string, unknown>>
    treeData?: Array<Record<string, unknown>>
    fieldNames?: Record<string, string>
    dataMark?: string
    component?: unknown
    show?: boolean | ((formData: Record<string, unknown>) => boolean)
    picker?: string
    showTime?: boolean
    widthInMap?: boolean
    [key: string]: unknown
}

export type PageField = {
    field: string
    title: string
    rules?: unknown[]
    dataType?: FieldDataType
    tableParams?: Record<string, unknown> & { index?: number }
    hiddenInForm?: boolean
    hiddenInDetail?: boolean
    customRender?: (context: Record<string, unknown>) => unknown
    mark?: string
    [key: string]: unknown
}

export type SearchField = {
    field?: string
    searchField: string
    title?: string
    name?: string
    col?: number
    value?: unknown
    type?: string
    allowClear?: boolean
    [key: string]: unknown
}

export type TreeConfig = {
    data?: Array<Record<string, unknown>>
    field?: string
    multiple?: boolean
    selectData?: Array<string | number>
    placeholder?: string
}
