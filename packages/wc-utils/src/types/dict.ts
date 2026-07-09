export type DictOption = {
    label: string
    value: string | number
}

export type DictMap = Record<string, DictOption[]>

export type DomainOption = DictOption
export type DomainMap = DictMap

export interface DictTypeItem {
    id: number
    name: string
    type: string
    status: number
    remark: string | null
    createdAt?: string | Date
}

export interface DictDataItem {
    id: number
    dictType: string
    label: string
    value: string
    sort: number
    status: number
    remark: string | null
    createdAt?: string | Date
}

export interface DictCachePayload {
    updatedAt: number
    data: DictMap
}
