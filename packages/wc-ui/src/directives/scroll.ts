// @ts-nocheck
import type { Directive } from 'vue'

/**
 * 混合模式自动滚动指令
 * 使用方式: v-scroll="{ speed: 20, direction: 'vertical', pause: true }"
 * 参数:
 * - speed: 滚动速度(秒), 默认 20秒一个周期
 * - direction: 滚动方向 'vertical' | 'horizontal', 默认 'vertical'
 * - pause: 鼠标悬停时是否暂停, 默认 true
 * - resetDelay: 重置延迟时间(秒), 默认 1秒
 */

const scrollDirective: Directive = {
    mounted(el, binding) {
        // 获取参数配置
        const config = {
            speed: 20, // 滚动速度(秒)
            direction: 'vertical', // 滚动方向
            pause: true, // 悬停暂停
            resetDelay: 1, // 重置延迟时间(秒)
            ...binding.value,
        }

        // 设置容器样式
        el.style.overflow = 'auto'
        el.style.overflowX = 'hidden'

        // 隐藏滚动条
        el.style.scrollbarWidth = 'none' // Firefox
        el.style.msOverflowStyle = 'none' // IE/Edge

        // Webkit 浏览器 (Chrome, Safari)
        const styleSheet = document.createElement('style')
        const uniqueClass = 'v-scroll-' + Date.now() + Math.random().toString(36).substr(2, 9)
        el.classList.add(uniqueClass)

        styleSheet.textContent = `
            .${uniqueClass}::-webkit-scrollbar {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
            }
            .${uniqueClass}::-webkit-scrollbar-track {
                display: none !important;
            }
            .${uniqueClass}::-webkit-scrollbar-thumb {
                display: none !important;
            }
        `

        document.head.appendChild(styleSheet)

        // 存储状态
        el._scrollState = {
            config,
            isPaused: false,
            isResetting: false,
            resetTimer: null,
            animationFrame: null,
            lastScrollTop: 0,
            lastScrollTime: Date.now(),
            scrollDirection: 'down', // 'up', 'down', 'idle'
            hasManualScroll: false, // 是否有手动滚动
            manualScrollPosition: 0, // 手动滚动位置
            styleSheet,
            uniqueClass,
        }

        // 克隆内容以实现无缝循环
        if (el.children.length > 0) {
            const clone = el.children[0].cloneNode(true)
            el.appendChild(clone)
        } else {
            const clone = el.innerHTML
            el.innerHTML += clone
        }

        // 启动平滑滚动
        startSmoothScroll(el)

        // 添加鼠标事件监听
        if (config.pause) {
            el._scrollState.mouseEnterHandler = () => {
                el._scrollState.isPaused = true
            }
            el._scrollState.mouseLeaveHandler = () => {
                // 先停止当前滚动
                stopSmoothScroll(el)
                // 记录当前滚动位置
                el._scrollState.manualScrollPosition = el.scrollTop
                el._scrollState.hasManualScroll = true
                // 恢复滚动
                el._scrollState.isPaused = false
                startSmoothScroll(el)
            }
            el.addEventListener('mouseenter', el._scrollState.mouseEnterHandler)
            el.addEventListener('mouseleave', el._scrollState.mouseLeaveHandler)
        }

        // 监听鼠标滚轮，允许用户手动滚动
        el.addEventListener(
            'wheel',
            (e) => {
                const state = el._scrollState
                if (e.deltaY !== 0 && !state.isResetting) {
                    const newScrollTop = el.scrollTop + e.deltaY
                    const boundedScrollTop = Math.max(
                        0,
                        Math.min(newScrollTop, el.scrollHeight - el.clientHeight),
                    )
                    el.scrollTop = boundedScrollTop
                    
                    // 无论是否暂停，都记录手动滚动位置
                    state.manualScrollPosition = boundedScrollTop
                    state.hasManualScroll = true
                }
            },
            { passive: true },
        )
    },

    updated(el, binding) {
        // 更新配置
        if (binding.value && el._scrollState) {
            el._scrollState.config = {
                ...el._scrollState.config,
                ...binding.value,
            }
        }
    },

    unmounted(el) {
        // 清理资源
        stopSmoothScroll(el)

        if (el._scrollState?.config.pause) {
            el.removeEventListener('mouseenter', el._scrollState.mouseEnterHandler)
            el.removeEventListener('mouseleave', el._scrollState.mouseLeaveHandler)
        }

        // 清理动态添加的样式表和类名
        if (el._scrollState?.styleSheet) {
            document.head.removeChild(el._scrollState.styleSheet)
        }
        if (el._scrollState?.uniqueClass) {
            el.classList.remove(el._scrollState.uniqueClass)
        }

        delete el._scrollState
    },
}

// 启动平滑滚动
function startSmoothScroll(el) {
    const state = el._scrollState
    if (!state || state.animationFrame) {
        return
    }

    const { config } = state
    const totalDistance = el.scrollHeight / 2 // 滚动一半的距离
    const resetDelay = config.resetDelay * 1000

    // 始终从当前实际的滚动位置开始，优先使用手动滚动位置
    let currentScrollPosition
    if (state.hasManualScroll) {
        currentScrollPosition = state.manualScrollPosition
        state.hasManualScroll = false // 重置标记
    } else {
        // 如果没有手动滚动标记，使用当前实际的滚动位置
        currentScrollPosition = el.scrollTop
    }
    const scrollStep = 0.5 // 更小的步长，更平滑

    function scroll() {
        if (state.isPaused) {
            el._scrollState.scrollDirection = 'idle'
            state.animationFrame = requestAnimationFrame(scroll)
            return
        }

        // 如果正在重置，什么都不做，等待重置完成
        if (state.isResetting) {
            el._scrollState.scrollDirection = 'idle'
            state.animationFrame = requestAnimationFrame(scroll)
            return
        }

        // 检查是否到底部
        if (currentScrollPosition >= totalDistance) {
                // 平滑过渡到开头
            if (!state.resetTimer) {
                state.isResetting = true
                state.resetTimer = setTimeout(() => {
                    // 第一阶段：快速向上回退
                    const quickBackDistance = 100
                    const targetScrollTop = Math.max(0, currentScrollPosition - quickBackDistance)
                    
                    // 第二阶段：滑到顶部的目标
                    let currentPhase = 'back' // 'back' 或 'toTop'
                    
                    // 计算向上滚动的步长，确保在60帧内完成（1秒）
                    const totalFrames = 60 // 60帧，1秒时间
                    const totalUpDistance = currentScrollPosition // 从当前位置回到顶部的总距离
                    const upScrollStep = totalUpDistance / totalFrames // 每帧需要滚动的距离

                    function smoothReset() {
                        if (currentPhase === 'back') {
                            const phaseDistance = currentScrollPosition - targetScrollTop
                            const phaseFrames = Math.round((phaseDistance / totalUpDistance) * totalFrames)
                            const phaseStep = phaseDistance / phaseFrames
                            
                            if (currentScrollPosition > targetScrollTop) {
                                currentScrollPosition -= phaseStep
                                el.scrollTop = Math.max(currentScrollPosition, targetScrollTop)
                                el._scrollState.scrollDirection = 'up'
                                requestAnimationFrame(smoothReset)
                            } else {
                                // 回退完成，开始滑到顶部
                                currentPhase = 'toTop'
                                requestAnimationFrame(smoothReset)
                            }
                        } else if (currentPhase === 'toTop') {
                            if (currentScrollPosition > 0) {
                                currentScrollPosition -= upScrollStep
                                el.scrollTop = Math.max(currentScrollPosition, 0)
                                el._scrollState.scrollDirection = 'up'
                                requestAnimationFrame(smoothReset)
                            } else {
                                // 重置完成
                                currentScrollPosition = 0
                                el.scrollTop = 0
                                el._scrollState.scrollDirection = 'idle'
                                state.isResetting = false
                                state.resetTimer = null
                            }
                        }
                    }
                    
                    smoothReset()
                }, resetDelay)
            }
        } else {
            // 向下滑动
            currentScrollPosition += scrollStep
            el.scrollTop = Math.min(currentScrollPosition, totalDistance)
            el._scrollState.scrollDirection = 'down'
        }

        state.animationFrame = requestAnimationFrame(scroll)
    }

    state.animationFrame = requestAnimationFrame(scroll)
}

// 停止平滑滚动
function stopSmoothScroll(el) {
    const state = el._scrollState
    if (state?.animationFrame) {
        cancelAnimationFrame(state.animationFrame)
        state.animationFrame = null
    }
    if (state?.resetTimer) {
        clearTimeout(state.resetTimer)
        state.resetTimer = null
    }
}

export default scrollDirective
