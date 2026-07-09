/**
 * antdv-next 依赖的 @v-c/util/dynamicCSS 在卸载样式时，
 * 可能从 head 移除已挂到其它父节点的 style 标签，触发 NotFoundError。
 * 微前端、路由切换、HMR 时较常见。
 */
const PATCH_FLAG = '__wcAntdvDynamicCssPatched__'

export const patchAntdvDynamicCss = (): void => {
    if (typeof window === 'undefined') {
        return
    }

    const globalWindow = window as Window & { [PATCH_FLAG]?: boolean }
    if (globalWindow[PATCH_FLAG]) {
        return
    }

    const originalRemoveChild = Node.prototype.removeChild

    Node.prototype.removeChild = function <T extends Node>(child: T): T {
        try {
            return originalRemoveChild.call(this, child) as T
        } catch (error) {
            const domError = error as DOMException
            if (domError?.name !== 'NotFoundError') {
                throw error
            }

            if (child.parentNode && child.parentNode !== this) {
                return child.parentNode.removeChild(child) as T
            }

            return child
        }
    }

    globalWindow[PATCH_FLAG] = true
}

patchAntdvDynamicCss()
