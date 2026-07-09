export interface TreeNode<T> {
    children: TreeNode<T>[]
}

export const buildTree = <T extends { id: number; parentId: number | null }>(
    items: T[],
    parentId: number | null = null,
): Array<T & { children: Array<T & { children: unknown[] }> }> => {
    return items
        .filter((item) => (item.parentId ?? null) === parentId)
        .sort((leftItem, rightItem) => {
            const leftSort = 'sort' in leftItem ? Number((leftItem as { sort?: number }).sort) : 0
            const rightSort = 'sort' in rightItem ? Number((rightItem as { sort?: number }).sort) : 0
            return leftSort - rightSort
        })
        .map((item) => ({
            ...item,
            children: buildTree(items, item.id),
        }))
}

export const parsePageQuery = (query: Record<string, string | undefined>) => {
    const page = Math.max(1, Number(query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 10))
    return { page, pageSize, offset: (page - 1) * pageSize }
}
