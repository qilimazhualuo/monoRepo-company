import { createHttpClient } from 'wc-utils'
import type { DictDataItem, DictTypeItem, PageResult } from 'wc-utils'

const httpClient = createHttpClient({ baseUrl: '/api' })

export const fetchDictTypes = async (params: { page?: number; pageSize?: number; keyword?: string }) => {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.set('page', String(params.page))
    if (params.pageSize) searchParams.set('pageSize', String(params.pageSize))
    if (params.keyword) searchParams.set('keyword', params.keyword)
    const query = searchParams.toString()
    const result = await httpClient.get<PageResult<DictTypeItem>>(`/system/dict/types${query ? `?${query}` : ''}`)
    return result.data
}

export const createDictType = async (payload: Omit<DictTypeItem, 'id' | 'createdAt'>) => {
    const result = await httpClient.post<{ id: number }>('/system/dict/types', payload)
    return result.data
}

export const updateDictType = async (dictTypeId: number, payload: Omit<DictTypeItem, 'id' | 'createdAt'>) => {
    const result = await httpClient.put<boolean>(`/system/dict/types/${dictTypeId}`, payload)
    return result.data
}

export const deleteDictType = async (dictTypeId: number) => {
    const result = await httpClient.delete<boolean>(`/system/dict/types/${dictTypeId}`)
    return result.data
}

export const fetchDictDataList = async (params: {
    page?: number
    pageSize?: number
    keyword?: string
    dictType?: string
}) => {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.set('page', String(params.page))
    if (params.pageSize) searchParams.set('pageSize', String(params.pageSize))
    if (params.keyword) searchParams.set('keyword', params.keyword)
    if (params.dictType) searchParams.set('dictType', params.dictType)
    const query = searchParams.toString()
    const result = await httpClient.get<PageResult<DictDataItem>>(`/system/dict/data${query ? `?${query}` : ''}`)
    return result.data
}

export const createDictData = async (payload: Omit<DictDataItem, 'id' | 'createdAt'>) => {
    const result = await httpClient.post<{ id: number }>('/system/dict/data', payload)
    return result.data
}

export const updateDictData = async (dictDataId: number, payload: Omit<DictDataItem, 'id' | 'createdAt'>) => {
    const result = await httpClient.put<boolean>(`/system/dict/data/${dictDataId}`, payload)
    return result.data
}

export const deleteDictData = async (dictDataId: number) => {
    const result = await httpClient.delete<boolean>(`/system/dict/data/${dictDataId}`)
    return result.data
}

export const fetchAllDictTypes = async () => {
    const pageResult = await fetchDictTypes({ page: 1, pageSize: 500 })
    return pageResult.list
}
