// @ts-nocheck
import type { Directive } from 'vue'
/**
 * 拖拽指令
 * 使用方式: v-drag="{ handle: '.drag-handle', boundary: true, axis: 'y', onStart: () => {}, onMove: () => {}, onEnd: () => {} }"
 * 参数:
 * - handle: 拖拽句柄选择器, 默认整个元素可拖拽
 * - boundary: 是否限制在父元素内, 默认 true
 * - axis: 拖拽方向 'x' | 'y' | 'both', 默认 'both'
 * - onStart: 拖拽开始回调函数
 * - onMove: 拖拽中回调函数
 * - onEnd: 拖拽结束回调函数
 */
import './index.less'
let globalZIndexSeed = 3000
const nextZIndex = () => ++globalZIndexSeed

const dragDirective: Directive = {
    mounted(el, binding) {
        // 获取参数配置
        const config = {
            handle: null, // 拖拽句柄选择器
            boundary: false, // 是否限制在父元素内，默认 false
            axis: 'both', // 'x' | 'y' | 'both'
            onStart: null, // 拖拽开始回调
            onMove: null, // 拖拽中回调
            onEnd: null, // 拖拽结束回调
            resize: false,
            position: null,
            resizeHandleSize: 12,
            resizeMinWidth: 100,
            resizeMinHeight: 100,
            resizeMaxWidth: null,
            resizeMaxHeight: null,
            resizeKeepInViewport: false,
            autoZIndex: null,
            stopClickPropagation: null,
            ...binding.value,
        }

        // 保存元素原有的 transform 值
        const originalTransform = el.style.transform || ''
        // 保存元素原有的 transition 值
        const originalTransition = el.style.transition || ''

        // 存储拖拽状态
        // 移动端使用更大的阈值，避免点击被误判为拖拽
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent,
        )
        const defaultThreshold = isMobile ? 10 : 5 // 移动端 10px，PC 端 5px

        el._dragState = {
            isDragging: false,
            hasDragged: false, // 标记是否发生了实际拖拽
            isResizing: false,
            startX: 0,
            startY: 0,
            translateX: 0,
            translateY: 0,
            initialTranslateX: 0,
            initialTranslateY: 0,
            left: 0,
            top: 0,
            initialLeft: 0,
            initialTop: 0,
            config: config,
            originalTransform: originalTransform,
            originalTransition: originalTransition,
            originalLeft: el.style.left,
            originalTop: el.style.top,
            originalRight: el.style.right,
            originalBottom: el.style.bottom,
            originalWidth: el.style.width,
            originalHeight: el.style.height,
            originalPosition: el.style.position,
            originalMargin: el.style.margin,
            dragThreshold: config.dragThreshold || defaultThreshold, // 拖拽阈值
            preventClickTimer: null, // 用于清除点击阻止的定时器
            hasPixelPosition: false,
            mode: config.resize || config.position ? 'position' : 'translate',
            resizeCleanup: null,
        }

        // 只设置必要的交互样式，不影响布局
        // 有 handle 时只给 handle 设置鼠标悬浮样式，否则给整个元素设置
        const handle = config.handle ? el.querySelector(config.handle) : el
        if (!handle) {
            console.warn(`[v-drag] 未找到拖拽句柄: ${config.handle}`)
            return
        }

        if (config.handle) {
            handle.style.cursor = 'move'
        } else {
            el.style.cursor = 'move'
        }
        el.style.userSelect = 'none'
        el.style.touchAction = 'none' // 阻止移动端的默认触摸行为

        const clamp = (n, min, max) => Math.min(max, Math.max(min, n))
        const toPx = (n) => `${Math.round(n)}px`
        const parseMaybePx = (v) => {
            const n = parseFloat(v)
            return Number.isFinite(n) ? n : null
        }
        const resolveSize = (v, base) => {
            if (v == null) return null
            if (typeof v === 'number' && Number.isFinite(v)) return v
            if (typeof v !== 'string') return null
            if (v === 'center') return null
            const num = parseFloat(v)
            if (!Number.isFinite(num)) return null
            if (v.includes('vw')) return (window.innerWidth * num) / 100
            if (v.includes('vh')) return (window.innerHeight * num) / 100
            if (v.includes('%')) return (base * num) / 100
            return num
        }
        const ensurePixelPosition = () => {
            if (el._dragState.hasPixelPosition) return
            const computed = window.getComputedStyle(el)
            if (computed.position === 'static') el.style.position = 'fixed'
            const rect = el.getBoundingClientRect()
            el.style.transform = 'none'
            el.style.margin = '0'
            el.style.right = 'auto'
            el.style.bottom = 'auto'
            el.style.left = toPx(rect.left)
            el.style.top = toPx(rect.top)
            el._dragState.hasPixelPosition = true
        }

        const enableAutoZIndex = config.autoZIndex ?? (config.resize || config.position)
        const enableStopClickPropagation = config.stopClickPropagation ?? (config.resize || config.position)

        const bringToFront = () => {
            if (!enableAutoZIndex) return
            const zIndex = nextZIndex()
            el.style.zIndex = String(zIndex)
            el._dragState.zIndex = zIndex
        }

        const stopClickPropagation = (e) => {
            if (!enableStopClickPropagation) return
            bringToFront()
            e.stopPropagation()
        }
        const handlePointerDownCapture = () => {
            // 捕获阶段先置顶，避免子组件 stopPropagation 导致无法置顶
            bringToFront()
        }

        el.addEventListener('click', stopClickPropagation)
        el.addEventListener('pointerdown', handlePointerDownCapture, true)
        el._dragState.stopClickPropagation = stopClickPropagation
        el._dragState.handlePointerDownCapture = handlePointerDownCapture

        const applyPositionConfig = () => {
            if (!config.position) return
            const rect = el.getBoundingClientRect()
            const { left: cfgLeft, right: cfgRight, top: cfgTop, bottom: cfgBottom } = config.position || {}
            let nextLeft = null
            let nextTop = null

            if (cfgLeft === 'center') nextLeft = (window.innerWidth - rect.width) / 2
            else if (typeof cfgLeft === 'number') nextLeft = cfgLeft
            else if (typeof cfgRight === 'number') nextLeft = window.innerWidth - rect.width - cfgRight

            if (cfgTop === 'center') nextTop = (window.innerHeight - rect.height) / 2
            else if (typeof cfgTop === 'number') nextTop = cfgTop
            else if (typeof cfgBottom === 'number') nextTop = window.innerHeight - rect.height - cfgBottom

            if (nextLeft != null || nextTop != null) {
                ensurePixelPosition()
                if (nextLeft != null) el.style.left = toPx(nextLeft)
                if (nextTop != null) el.style.top = toPx(nextTop)
            }
        }
        applyPositionConfig()

        const createResizeOverlay = () => {
            if (!config.resize) return null
            ensurePixelPosition()

            const originalHandleSizeVar = el.style.getPropertyValue('--v-drag-resize-handle-size')
            el.style.setProperty('--v-drag-resize-handle-size', `${config.resizeHandleSize}px`)
            el.classList.add('v-drag-resize-enabled')

            const overlay = document.createElement('div')
            overlay.dataset.dragResizeOverlay = 'true'
            overlay.className = 'v-drag-resize-overlay'

            const createResizeHandle = (corner) => {
                const h = document.createElement('div')
                h.dataset.dragResizeHandle = 'true'
                h.dataset.dragResizeCorner = corner
                h.className = `v-drag-resize-handle v-drag-resize-handle--${corner}`
                return h
            }

            const handles = ['tl', 'tr', 'bl', 'br'].map(createResizeHandle)
            handles.forEach((h) => overlay.appendChild(h))

            const saved = {
                cursor: el.style.cursor,
                bodyCursor: document.body.style.cursor,
            }

            let activePointerId = null
            let corner = 'br'
            let startX = 0
            let startY = 0
            let startW = 0
            let startH = 0
            let startLeft = 0
            let startTop = 0
            let minW = 0
            let minH = 0
            let maxW = Number.POSITIVE_INFINITY
            let maxH = Number.POSITIVE_INFINITY

            const onResizeDown = (e) => {
                const h = e.target?.closest?.('[data-drag-resize-handle="true"]')
                if (!h) return
                if (activePointerId != null) return
                bringToFront()
                activePointerId = e.pointerId
                corner = h.dataset.dragResizeCorner || 'br'
                el._dragState.isResizing = true
                el.classList.add('v-drag-resizing')
                el._dragState.mode = 'position'
                ensurePixelPosition()

                if (e.cancelable) e.preventDefault()
                e.stopPropagation()

                const rect = el.getBoundingClientRect()
                el.style.width = toPx(rect.width)
                el.style.height = toPx(rect.height)

                startX = e.clientX
                startY = e.clientY
                startW = rect.width
                startH = rect.height
                startLeft = parseMaybePx(el.style.left) ?? rect.left
                startTop = parseMaybePx(el.style.top) ?? rect.top

                const cs = window.getComputedStyle(el)
                minW = resolveSize(config.resizeMinWidth, window.innerWidth) ?? parseMaybePx(cs.minWidth) ?? 100
                minH = resolveSize(config.resizeMinHeight, window.innerHeight) ?? parseMaybePx(cs.minHeight) ?? 100
                const cssMaxW = cs.maxWidth && cs.maxWidth !== 'none' ? parseMaybePx(cs.maxWidth) : null
                const cssMaxH = cs.maxHeight && cs.maxHeight !== 'none' ? parseMaybePx(cs.maxHeight) : null
                maxW =
                    resolveSize(config.resizeMaxWidth, window.innerWidth) ??
                    cssMaxW ??
                    Number.POSITIVE_INFINITY
                maxH =
                    resolveSize(config.resizeMaxHeight, window.innerHeight) ??
                    cssMaxH ??
                    Number.POSITIVE_INFINITY

                saved.cursor = el.style.cursor
                saved.bodyCursor = document.body.style.cursor
                el.style.cursor = window.getComputedStyle(h).cursor
                document.body.style.cursor = window.getComputedStyle(h).cursor

                try {
                    h.setPointerCapture?.(e.pointerId)
                } catch (err) {
                    console.error(err)
                }

                document.addEventListener('pointermove', onResizeMove)
                document.addEventListener('pointerup', onResizeUp, { once: true })
                document.addEventListener('pointercancel', onResizeUp, { once: true })
            }

            const onResizeMove = (e) => {
                if (activePointerId != null && e.pointerId !== activePointerId) return
                if (e.cancelable) e.preventDefault()

                const dx = e.clientX - startX
                const dy = e.clientY - startY

                let width = startW
                let height = startH
                let left = startLeft
                let top = startTop

                if (corner === 'br') {
                    width = startW + dx
                    height = startH + dy
                } else if (corner === 'tr') {
                    width = startW + dx
                    height = startH - dy
                    top = startTop + dy
                } else if (corner === 'bl') {
                    width = startW - dx
                    left = startLeft + dx
                    height = startH + dy
                } else if (corner === 'tl') {
                    width = startW - dx
                    left = startLeft + dx
                    height = startH - dy
                    top = startTop + dy
                }

                width = clamp(width, minW, maxW)
                height = clamp(height, minH, maxH)

                if (corner === 'bl' || corner === 'tl') {
                    left = startLeft + (startW - width)
                }
                if (corner === 'tr' || corner === 'tl') {
                    top = startTop + (startH - height)
                }

                el.style.width = toPx(width)
                el.style.height = toPx(height)
                el.style.left = toPx(left)
                el.style.top = toPx(top)
            }

            const onResizeUp = () => {
                document.removeEventListener('pointermove', onResizeMove)
                el._dragState.isResizing = false
                activePointerId = null
                el.classList.remove('v-drag-resizing')
                document.body.style.cursor = saved.bodyCursor
                el.style.cursor = saved.cursor
            }

            overlay.addEventListener('pointerdown', onResizeDown)
            el.appendChild(overlay)
            return () => {
                document.removeEventListener('pointermove', onResizeMove)
                document.removeEventListener('pointerup', onResizeUp)
                document.removeEventListener('pointercancel', onResizeUp)
                overlay.removeEventListener('pointerdown', onResizeDown)
                overlay.remove()
                el.classList.remove('v-drag-resizing')
                el.classList.remove('v-drag-resize-enabled')
                if (originalHandleSizeVar) el.style.setProperty('--v-drag-resize-handle-size', originalHandleSizeVar)
                else el.style.removeProperty('--v-drag-resize-handle-size')
            }
        }
        el._dragState.resizeCleanup = createResizeOverlay()
        bringToFront()

        // 解析 transform 中的 translate 值
        const parseTransform = (transformStr) => {
            if (!transformStr) return { x: 0, y: 0 }
            const match = transformStr.match(/translate\(([^)]+)\)/)
            if (match) {
                const values = match[1].split(',').map((v) => parseFloat(v.trim()))
                return {
                    x: values[0] || 0,
                    y: values[1] || 0,
                }
            }
            return { x: 0, y: 0 }
        }

        // 获取坐标的通用函数（支持鼠标和触摸事件）
        const getEventCoordinates = (e) => {
            if (e.touches && e.touches.length > 0) {
                // 触摸事件
                return {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY,
                }
            } else {
                // 鼠标事件
                return {
                    x: e.clientX,
                    y: e.clientY,
                }
            }
        }

        // 开始拖拽的通用函数
        const startDrag = (e) => {
            bringToFront()
            e.preventDefault()
            e.stopPropagation()

            const coords = getEventCoordinates(e)
            el._dragState.isDragging = true
            el._dragState.hasDragged = false // 重置拖拽标记
            el._dragState.startX = coords.x
            el._dragState.startY = coords.y

            // 禁用 transition 动画，确保拖拽时响应迅速
            el.style.transition = 'none'

            if (el._dragState.mode === 'position') {
                ensurePixelPosition()
                const rect = el.getBoundingClientRect()
                const left = parseMaybePx(el.style.left) ?? rect.left
                const top = parseMaybePx(el.style.top) ?? rect.top
                el._dragState.initialLeft = left
                el._dragState.initialTop = top
                el._dragState.left = left
                el._dragState.top = top
                el._dragState.initialRect = rect
                el._dragState.initialParentRect = el.parentElement ? el.parentElement.getBoundingClientRect() : null
                el._dragState.translateX = 0
                el._dragState.translateY = 0
                el._dragState.initialTranslateX = 0
                el._dragState.initialTranslateY = 0
                if (config.onStart && typeof config.onStart === 'function') {
                    config.onStart({
                        element: el,
                        x: rect.left,
                        y: rect.top,
                        translateX: 0,
                        translateY: 0,
                    })
                }
                return
            }

            // 获取当前的 translate 值
            const currentTransform = el.style.transform || ''
            const currentTranslate = parseTransform(currentTransform)
            el._dragState.initialTranslateX = currentTranslate.x
            el._dragState.initialTranslateY = currentTranslate.y
            el._dragState.translateX = currentTranslate.x
            el._dragState.translateY = currentTranslate.y

            // 保存元素的初始位置（不包含 translate 的位置）
            // 临时移除 translate 来获取真实位置
            const tempTransform = el.style.transform
            el.style.transform = originalTransform.replace(/translate\([^)]+\)/g, '').trim()
            const initialRect = el.getBoundingClientRect()
            const parentRect = el.parentElement ? el.parentElement.getBoundingClientRect() : null
            el.style.transform = tempTransform

            // 保存初始位置信息
            el._dragState.initialRect = initialRect
            el._dragState.initialParentRect = parentRect

            // 触发拖拽开始回调
            if (config.onStart && typeof config.onStart === 'function') {
                const rect = el.getBoundingClientRect()
                config.onStart({
                    element: el,
                    x: rect.left,
                    y: rect.top,
                    translateX: currentTranslate.x,
                    translateY: currentTranslate.y,
                })
            }
        }

        // 鼠标按下事件
        const handleMouseDown = (e) => {
            startDrag(e)
            // 添加全局事件监听
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
        }

        // 触摸开始事件（不阻止默认行为，让点击可以正常触发）
        const handleTouchStart = (e) => {
            bringToFront()
            // 不调用 preventDefault，让点击事件可以正常触发
            const coords = getEventCoordinates(e)
            el._dragState.isDragging = true
            el._dragState.hasDragged = false
            el._dragState.startX = coords.x
            el._dragState.startY = coords.y

            // 禁用 transition 动画，确保拖拽时响应迅速
            el.style.transition = 'none'

            if (el._dragState.mode === 'position') {
                ensurePixelPosition()
                const rect = el.getBoundingClientRect()
                const left = parseMaybePx(el.style.left) ?? rect.left
                const top = parseMaybePx(el.style.top) ?? rect.top
                el._dragState.initialLeft = left
                el._dragState.initialTop = top
                el._dragState.left = left
                el._dragState.top = top
                el._dragState.initialRect = rect
                el._dragState.initialParentRect = el.parentElement ? el.parentElement.getBoundingClientRect() : null
                el._dragState.translateX = 0
                el._dragState.translateY = 0
                el._dragState.initialTranslateX = 0
                el._dragState.initialTranslateY = 0
                if (config.onStart && typeof config.onStart === 'function') {
                    config.onStart({
                        element: el,
                        x: rect.left,
                        y: rect.top,
                        translateX: 0,
                        translateY: 0,
                    })
                }
                document.addEventListener('touchmove', handleTouchMove, { passive: false })
                document.addEventListener('touchend', handleTouchEnd)
                return
            }

            // 获取当前的 translate 值
            const currentTransform = el.style.transform || ''
            const currentTranslate = parseTransform(currentTransform)
            el._dragState.initialTranslateX = currentTranslate.x
            el._dragState.initialTranslateY = currentTranslate.y
            el._dragState.translateX = currentTranslate.x
            el._dragState.translateY = currentTranslate.y

            // 保存元素的初始位置
            const tempTransform = el.style.transform
            el.style.transform = originalTransform.replace(/translate\([^)]+\)/g, '').trim()
            const initialRect = el.getBoundingClientRect()
            const parentRect = el.parentElement ? el.parentElement.getBoundingClientRect() : null
            el.style.transform = tempTransform

            el._dragState.initialRect = initialRect
            el._dragState.initialParentRect = parentRect

            // 触发拖拽开始回调
            if (config.onStart && typeof config.onStart === 'function') {
                const rect = el.getBoundingClientRect()
                config.onStart({
                    element: el,
                    x: rect.left,
                    y: rect.top,
                    translateX: currentTranslate.x,
                    translateY: currentTranslate.y,
                })
            }

            // 添加全局事件监听
            document.addEventListener('touchmove', handleTouchMove, { passive: false })
            document.addEventListener('touchend', handleTouchEnd)
        }

        // 移动的通用函数
        const handleMove = (e) => {
            if (!el._dragState.isDragging) return
            if (el._dragState.isResizing) return

            const coords = getEventCoordinates(e)
            // 计算移动距离
            const deltaX = coords.x - el._dragState.startX
            const deltaY = coords.y - el._dragState.startY

            // 检测是否发生了实际拖拽（超过阈值）
            if (!el._dragState.hasDragged) {
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
                if (distance > el._dragState.dragThreshold) {
                    el._dragState.hasDragged = true
                }
            }

            // 计算新的 translate 值
            let newTranslateX = el._dragState.initialTranslateX + deltaX
            let newTranslateY = el._dragState.initialTranslateY + deltaY

            if (el._dragState.mode === 'position') {
                const axis = config.axis || 'both'
                let newLeft = el._dragState.initialLeft + (axis === 'y' ? 0 : deltaX)
                let newTop = el._dragState.initialTop + (axis === 'x' ? 0 : deltaY)

                if (config.boundary && el.parentElement && el._dragState.initialRect && el._dragState.initialParentRect) {
                    const initialRect = el._dragState.initialRect
                    const parentRect = el._dragState.initialParentRect
                    const minLeft = parentRect.left
                    const minTop = parentRect.top
                    const maxLeft = parentRect.right - initialRect.width
                    const maxTop = parentRect.bottom - initialRect.height
                    newLeft = clamp(newLeft, minLeft, maxLeft)
                    newTop = clamp(newTop, minTop, maxTop)
                }

                el._dragState.left = newLeft
                el._dragState.top = newTop
                el.style.left = toPx(newLeft)
                el.style.top = toPx(newTop)

                if (config.onMove && typeof config.onMove === 'function') {
                    const rect = el.getBoundingClientRect()
                    config.onMove({
                        element: el,
                        x: rect.left,
                        y: rect.top,
                        translateX: 0,
                        translateY: 0,
                        deltaX: deltaX,
                        deltaY: deltaY,
                    })
                }
                return
            }

            // 限制在父元素内
            if (
                config.boundary &&
                el.parentElement &&
                el._dragState.initialRect &&
                el._dragState.initialParentRect
            ) {
                const initialRect = el._dragState.initialRect
                const parentRect = el._dragState.initialParentRect

                // 计算元素相对于父元素的初始位置
                const parentStyle = window.getComputedStyle(el.parentElement)
                const parentPaddingLeft = parseFloat(parentStyle.paddingLeft) || 0
                const parentPaddingTop = parseFloat(parentStyle.paddingTop) || 0

                // 计算元素相对于父元素的初始偏移
                const offsetX = initialRect.left - parentRect.left - parentPaddingLeft
                const offsetY = initialRect.top - parentRect.top - parentPaddingTop

                // 计算边界（基于初始位置）
                const minX = -offsetX
                const minY = -offsetY
                const maxX = parentRect.width - initialRect.width - offsetX
                const maxY = parentRect.height - initialRect.height - offsetY

                newTranslateX = Math.max(minX, Math.min(maxX, newTranslateX))
                newTranslateY = Math.max(minY, Math.min(maxY, newTranslateY))
            }

            // 更新 translate 值
            el._dragState.translateX = newTranslateX
            el._dragState.translateY = newTranslateY

            // 构建 transform 字符串，保留原有的其他 transform 属性
            let transformStr = originalTransform
            if (transformStr && !transformStr.includes('translate')) {
                // 如果原有 transform 不包含 translate，则添加
                transformStr = `translate(${newTranslateX}px, ${newTranslateY}px) ${transformStr}`
            } else if (transformStr && transformStr.includes('translate')) {
                // 如果原有 transform 包含 translate，则替换
                transformStr = transformStr.replace(
                    /translate\([^)]+\)/g,
                    `translate(${newTranslateX}px, ${newTranslateY}px)`,
                )
            } else {
                // 如果没有原有 transform，直接设置
                transformStr = `translate(${newTranslateX}px, ${newTranslateY}px)`
            }

            el.style.transform = transformStr

            // 触发拖拽中回调
            if (config.onMove && typeof config.onMove === 'function') {
                const rect = el.getBoundingClientRect()
                config.onMove({
                    element: el,
                    x: rect.left,
                    y: rect.top,
                    translateX: newTranslateX,
                    translateY: newTranslateY,
                    deltaX: deltaX,
                    deltaY: deltaY,
                })
            }
        }

        // 鼠标移动事件
        const handleMouseMove = (e) => {
            handleMove(e)
        }

        // 触摸移动事件
        const handleTouchMove = (e) => {
            // 只有在真正拖拽时才阻止默认行为
            if (!el._dragState.isDragging) return

            const coords = getEventCoordinates(e)
            const deltaX = coords.x - el._dragState.startX
            const deltaY = coords.y - el._dragState.startY

            // 检测是否发生了实际拖拽（超过阈值）
            if (!el._dragState.hasDragged) {
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
                if (distance > el._dragState.dragThreshold) {
                    el._dragState.hasDragged = true
                }
            }

            // 只有在真正拖拽时才阻止默认行为和移动元素
            if (el._dragState.hasDragged) {
                e.preventDefault() // 阻止默认滚动行为
                handleMove(e)
            }
        }

        // 结束拖拽的通用函数
        const endDrag = (e) => {
            if (!el._dragState.isDragging) return

            const hasDragged = el._dragState.hasDragged
            el._dragState.isDragging = false

            // 恢复 transition 动画
            el.style.transition = el._dragState.originalTransition || ''

            // 获取最终位置
            const rect = el.getBoundingClientRect()
            const finalX = rect.left
            const finalY = rect.top

            // 触发拖拽结束回调
            if (config.onEnd && typeof config.onEnd === 'function') {
                config.onEnd({
                    element: el,
                    x: finalX,
                    y: finalY,
                    translateX: el._dragState.mode === 'position' ? 0 : el._dragState.translateX,
                    translateY: el._dragState.mode === 'position' ? 0 : el._dragState.translateY,
                })
            }

            // 如果发生了拖拽，阻止后续的 click 事件
            if (hasDragged) {
                // 清除之前的定时器（如果存在）
                if (el._dragState.preventClickTimer) {
                    clearTimeout(el._dragState.preventClickTimer)
                }

                // 阻止当前事件的传播
                if (e) {
                    e.preventDefault()
                    e.stopPropagation()
                }

                // 记录拖拽结束时间
                el._dragState.dragEndTime = Date.now()

                // 使用 capture 阶段捕获 click 事件，但只在短时间内阻止（100ms内）
                const clickHandler = (clickEvent) => {
                    const timeSinceDragEnd = Date.now() - el._dragState.dragEndTime
                    if (timeSinceDragEnd < 100) {
                        clickEvent.preventDefault()
                        clickEvent.stopPropagation()
                        clickEvent.stopImmediatePropagation()
                    }
                }
                el.addEventListener('click', clickHandler, { capture: true, once: true })

                // 在 100ms 后清除标记，确保后续点击可以正常工作
                el._dragState.preventClickTimer = setTimeout(() => {
                    el._dragState.hasDragged = false
                    el._dragState.preventClickTimer = null
                }, 100)
            } else {
                // 如果没有拖拽，立即清除标记
                el._dragState.hasDragged = false
            }
        }

        // 鼠标释放事件
        const handleMouseUp = (e) => {
            endDrag(e)
            // 移除全局事件监听
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }

        // 触摸结束事件
        const handleTouchEnd = (e) => {
            if (!el._dragState.isDragging) {
                // 移除全局事件监听
                document.removeEventListener('touchmove', handleTouchMove)
                document.removeEventListener('touchend', handleTouchEnd)
                return
            }

            // 在触摸结束时，再次检查是否真的发生了拖拽
            if (e.changedTouches && e.changedTouches.length > 0) {
                const touch = e.changedTouches[0]
                const endX = touch.clientX
                const endY = touch.clientY
                const startX = el._dragState.startX
                const startY = el._dragState.startY

                // 计算总移动距离
                const totalDistance = Math.sqrt(
                    Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)
                )

                // 如果移动距离很小，认为是点击，重置拖拽标记
                if (totalDistance <= el._dragState.dragThreshold) {
                    el._dragState.hasDragged = false
                    // 如果是点击，不调用 endDrag，直接清理，让点击事件正常触发
                    el._dragState.isDragging = false
                    // 恢复 transition 动画
                    el.style.transition = el._dragState.originalTransition || ''

                    // 移除全局事件监听
                    document.removeEventListener('touchmove', handleTouchMove)
                    document.removeEventListener('touchend', handleTouchEnd)
                    return
                }
            }

            // 只有真正拖拽了才调用 endDrag
            endDrag(e)

            // 移除全局事件监听
            document.removeEventListener('touchmove', handleTouchMove)
            document.removeEventListener('touchend', handleTouchEnd)
        }

        // 绑定事件（同时支持鼠标和触摸）
        handle.addEventListener('mousedown', handleMouseDown)
        handle.addEventListener('touchstart', handleTouchStart, { passive: false })

        // 保存清理函数
        el._dragCleanup = () => {
            handle.removeEventListener('mousedown', handleMouseDown)
            handle.removeEventListener('touchstart', handleTouchStart)
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
            document.removeEventListener('touchmove', handleTouchMove)
            document.removeEventListener('touchend', handleTouchEnd)
            if (el._dragState && el._dragState.stopClickPropagation) {
                el.removeEventListener('click', el._dragState.stopClickPropagation)
            }
            if (el._dragState && el._dragState.handlePointerDownCapture) {
                el.removeEventListener('pointerdown', el._dragState.handlePointerDownCapture, true)
            }
        }
    },

    unmounted(el) {
        // 清理事件监听
        if (el._dragCleanup) {
            el._dragCleanup()
        }
        if (el._dragState && el._dragState.resizeCleanup) {
            el._dragState.resizeCleanup()
        }
        // 清理定时器
        if (el._dragState && el._dragState.preventClickTimer) {
            clearTimeout(el._dragState.preventClickTimer)
        }
        // 恢复原有样式
        if (el._dragState && el._dragState.originalTransform !== undefined) {
            el.style.transform = el._dragState.originalTransform || ''
        }
        if (el._dragState) {
            el.style.left = el._dragState.originalLeft || ''
            el.style.top = el._dragState.originalTop || ''
            el.style.right = el._dragState.originalRight || ''
            el.style.bottom = el._dragState.originalBottom || ''
            el.style.width = el._dragState.originalWidth || ''
            el.style.height = el._dragState.originalHeight || ''
            el.style.position = el._dragState.originalPosition || ''
            el.style.margin = el._dragState.originalMargin || ''
        }
        // 清理状态
        delete el._dragState
        delete el._dragCleanup
    },
}

export default dragDirective
