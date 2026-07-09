export const treeDataMake = <T extends Record<string, unknown>>(
    data: T[],
    parentId = 'pid',
    id = 'id',
): T[] => {
    const aloneArr: T[] = []

    for (let index = 0; index < data.length; index += 1) {
        let hasParent = false
        for (let innerIndex = 0; innerIndex < data.length; innerIndex += 1) {
            if (data[index][parentId] === data[innerIndex][id]) {
                hasParent = true
            }
        }
        if (!hasParent) {
            aloneArr.push(data[index])
        }
    }

    const treeLoop = (dataList: T[], top: T & { children?: T[] }) => {
        top.children = []
        for (let index = 0; index < dataList.length; index += 1) {
            if (dataList[index][parentId] === top[id]) {
                const node = dataList[index]
                treeLoop(dataList, node as T & { children?: T[] })
                top.children.push(node)
            }
        }
        if (top.children.length === 0) {
            delete top.children
        }
        return top
    }

    return aloneArr.map((item) => treeLoop(data, item as T & { children?: T[] }))
}
