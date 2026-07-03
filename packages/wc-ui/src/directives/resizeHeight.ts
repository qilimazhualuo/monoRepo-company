// @ts-nocheck
import type { Directive } from 'vue'

/**
 * 高度调整指令 - 在元素上添加可拖拽条，用于调整该元素高度
 * 使用方式: v-resize-height 或 v-resize-height="{ minHeight: '10vh', maxHeight: '70vh' }"
 * 参数:
 * - minHeight: 最小高度，默认 '10vh'，支持 vh/px
 * - maxHeight: 最大高度，默认 '70vh'，支持 vh/px
 * - defaultHeight: 初始高度，不传则取当前元素高度
 */

const parseValue = (str) => {
    if (typeof str !== 'string') return 0
    const num = parseFloat(str)
    if (str.includes('vh')) return (window.innerHeight * num) / 100
    return num
}

const toVh = (px) => (px / window.innerHeight) * 100

const resizeHeightDirective: Directive = {
    mounted(el, binding) {
        const config = {
            minHeight: '10vh',
            maxHeight: '70vh',
            defaultHeight: null,
            ...(typeof binding.value === 'object' ? binding.value : {}),
        }

        const minPx = parseValue(config.minHeight)
        const maxPx = parseValue(config.maxHeight)
        let defaultPx
        if (config.defaultHeight != null) {
            defaultPx = parseValue(config.defaultHeight)
        } else {
            defaultPx = el.getBoundingClientRect().height
        }

        let currentPx = Math.min(maxPx, Math.max(minPx, defaultPx))

        el.style.height = `${toVh(currentPx)}vh`
        el.style.minHeight = config.minHeight
        el.style.maxHeight = config.maxHeight
        el.style.overflow = 'hidden'
        el.style.boxSizing = 'border-box'
        // 不改写 position，保留面板原有的 fixed，否则会相对父级定位跑到工具条旁边

        const bar = document.createElement('div')
        bar.className = 'v-resize-height-bar'
        bar.setAttribute('data-resize-handle', 'true')
        Object.assign(bar.style, {
            // position: 'absolute',
            // left: 0,
            // right: 0,
            top: '8px',
            height: '8px',
            cursor: 'ns-resize',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            // background: 'rgba(0,0,0,0.08)',
            zIndex: 10,
            flexShrink: 0,
            touchAction: 'none',
        })
        bar.innerHTML = `<span style="display:block;width:40px;height:6px;border-radius:4px;background:rgba(0,0,0,0.2)"></span>`

        el.insertBefore(bar, el.firstChild)

        let startY = 0
        let startHeight = 0
        let activePointerId = null
        let activeTouchId = null
        let savedTouchAction = ''
        let savedBoxShadow = ''
        let savedTransition = ''
        let savedBarBoxShadow = ''
        let savedBarTransition = ''
        let savedBarBackground = ''
        let savedBarBorderRadius = ''
        let savedGripBackground = ''

        const setDragging = (dragging) => {
            if (dragging) {
                savedBoxShadow = el.style.boxShadow
                savedTransition = el.style.transition
                savedBarBoxShadow = bar.style.boxShadow
                savedBarTransition = bar.style.transition
                savedBarBackground = bar.style.background
                savedBarBorderRadius = bar.style.borderRadius
                const grip = bar.querySelector('span')
                savedGripBackground = grip?.style?.background || ''
                el.style.transition = savedTransition
                    ? `${savedTransition}, box-shadow 160ms ease-out, background-color 160ms ease-out`
                    : 'box-shadow 160ms ease-out, background-color 160ms ease-out'
                bar.style.transition = savedBarTransition
                    ? `${savedBarTransition}, box-shadow 160ms ease-out, background 160ms ease-out`
                    : 'box-shadow 160ms ease-out, background 160ms ease-out'
                el.style.boxShadow =
                    '0 0 0 3px rgba(24,144,255,0.55), 0 10px 28px rgba(24,144,255,0.26)'
                bar.style.boxShadow =
                    '0 0 0 3px rgba(24,144,255,0.55), 0 10px 26px rgba(24,144,255,0.26)'
                bar.style.background =
                    'linear-gradient(180deg, rgba(24,144,255,0.38), rgba(24,144,255,0.18))'
                bar.style.borderRadius = '6px'
                if (grip) grip.style.background = 'rgba(255,255,255,0.75)'
            } else {
                el.style.boxShadow = savedBoxShadow
                bar.style.boxShadow = savedBarBoxShadow
                bar.style.transition = savedBarTransition
                el.style.transition = savedTransition
                bar.style.background = savedBarBackground
                bar.style.borderRadius = savedBarBorderRadius
                const grip = bar.querySelector('span')
                if (grip) grip.style.background = savedGripBackground
            }
        }

        const onPointerDown = (e) => {
            if (!e.target.closest('[data-resize-handle="true"]')) return
            if (activePointerId != null) return
            activePointerId = e.pointerId
            if (e.cancelable) e.preventDefault()
            savedTouchAction = el.style.touchAction
            el.style.touchAction = 'none'
            setDragging(true)
            try {
                bar.setPointerCapture?.(e.pointerId)
            } catch (err) {
                console.error(err)
            }
            startY = e.clientY ?? e.touches?.[0]?.clientY
            startHeight = currentPx
            document.addEventListener('pointermove', onPointerMove)
            document.addEventListener('pointerup', onPointerUp, { once: true })
            document.addEventListener('pointercancel', onPointerUp, { once: true })
        }

        const onPointerMove = (e) => {
            if (activePointerId != null && e.pointerId !== activePointerId) return
            if (e.cancelable) e.preventDefault()
            const y = e.clientY ?? e.touches?.[0]?.clientY
            const delta = startY - y
            currentPx = Math.min(maxPx, Math.max(minPx, startHeight + delta))
            el.style.height = `${toVh(currentPx)}vh`
        }

        const onPointerUp = () => {
            document.removeEventListener('pointermove', onPointerMove)
            activePointerId = null
            el.style.touchAction = savedTouchAction
            setDragging(false)
        }

        const onTouchStart = (e) => {
            if (!e.target.closest('[data-resize-handle="true"]')) return
            if (activeTouchId != null) return
            const t = e.touches?.[0]
            if (!t) return
            activeTouchId = t.identifier
            e.preventDefault()
            savedTouchAction = el.style.touchAction
            el.style.touchAction = 'none'
            setDragging(true)
            startY = e.touches?.[0]?.clientY
            startHeight = currentPx
            document.addEventListener('touchmove', onTouchMove, { passive: false })
            document.addEventListener('touchend', onTouchEnd, { once: true })
            document.addEventListener('touchcancel', onTouchEnd, { once: true })
        }

        const onTouchMove = (e) => {
            e.preventDefault()
            const t = Array.from(e.touches || []).find((it) => it.identifier === activeTouchId)
            if (!t) return
            const y = t.clientY
            const delta = startY - y
            currentPx = Math.min(maxPx, Math.max(minPx, startHeight + delta))
            el.style.height = `${toVh(currentPx)}vh`
        }

        const onTouchEnd = () => {
            document.removeEventListener('touchmove', onTouchMove)
            activeTouchId = null
            el.style.touchAction = savedTouchAction
            setDragging(false)
        }

        const onMouseDown = (e) => {
            if (!e.target.closest('[data-resize-handle="true"]')) return
            e.preventDefault()
            startY = e.clientY
            startHeight = currentPx
            setDragging(true)
            document.addEventListener('mousemove', onMouseMove)
            document.addEventListener('mouseup', onMouseUp, { once: true })
        }

        const onMouseMove = (e) => {
            const y = e.clientY
            const delta = startY - y
            currentPx = Math.min(maxPx, Math.max(minPx, startHeight + delta))
            el.style.height = `${toVh(currentPx)}vh`
        }

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove)
            setDragging(false)
        }

        if (window.PointerEvent) {
            bar.addEventListener('pointerdown', onPointerDown)
        } else {
            bar.addEventListener('touchstart', onTouchStart, { passive: false })
            bar.addEventListener('mousedown', onMouseDown)
        }
        el._resizeHeightCleanup = () => {
            setDragging(false)
            bar.removeEventListener('pointerdown', onPointerDown)
            bar.removeEventListener('touchstart', onTouchStart)
            bar.removeEventListener('mousedown', onMouseDown)
            document.removeEventListener('pointermove', onPointerMove)
            document.removeEventListener('pointerup', onPointerUp)
            document.removeEventListener('pointercancel', onPointerUp)
            document.removeEventListener('touchmove', onTouchMove)
            document.removeEventListener('touchend', onTouchEnd)
            document.removeEventListener('touchcancel', onTouchEnd)
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)
        }
    },
    unmounted(el) {
        const bar = el.querySelector('.v-resize-height-bar')
        if (bar) bar.remove()
        if (el._resizeHeightCleanup) el._resizeHeightCleanup()
    },
}

export default resizeHeightDirective
