<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { ReloadOutlined } from '@ant-design/icons-vue'

export interface SliderCaptchaImage {
    guid: string
    aspectRatio: number
    canvasSrc: string
    blockSrc: string
    blockWidthRatio: number
    blockHeightRatio: number
}

export interface SliderVerifyPayload {
    vCodeKey: string
    /** 滑块左上角相对画布宽度的比例 0~1 */
    blockX: number
    /** 滑块左上角相对画布高度的比例 0~1 */
    blockY: number
    /** 滑块宽度相对画布宽度的比例 0~1 */
    blockWidthRatio: number
    /** 滑块高度相对画布高度的比例 0~1 */
    blockHeightRatio: number
}

const props = defineProps<{
    fetchCaptcha: () => Promise<SliderCaptchaImage>
    afterChange: (payload: SliderVerifyPayload) => void
}>()

const stageRef = ref<HTMLElement | null>(null)
const blockRef = ref<HTMLImageElement | null>(null)
const captchaKey = ref('')
const displayBlockXRatio = ref(0)
const displayBlockYRatio = ref(0)
const isDragging = ref(false)
const activePointerId = ref<number | null>(null)

const dragState = reactive({
    startPointerX: 0,
    startPointerY: 0,
    startBlockXRatio: 0,
    startBlockYRatio: 0,
})

const captchaMeta = reactive({
    aspectRatio: 2,
    canvasSrc: '',
    blockSrc: '',
    blockWidthRatio: 0.15625,
    blockHeightRatio: 0.3125,
})

const aspectRatioValue = computed(() => {
    const ratio = Number(captchaMeta.aspectRatio)
    if (!Number.isFinite(ratio) || ratio <= 0) {
        return 2
    }
    return ratio
})

const toPercent = (ratio: number) => `${ratio * 100}%`

const bgStyle = computed(() => ({
    backgroundImage: captchaMeta.canvasSrc ? `url(${captchaMeta.canvasSrc})` : 'none',
    aspectRatio: `${aspectRatioValue.value} / 1`,
}))

const blockStyle = computed(() => ({
    width: toPercent(captchaMeta.blockWidthRatio),
    height: toPercent(captchaMeta.blockHeightRatio),
    left: toPercent(displayBlockXRatio.value),
    top: toPercent(displayBlockYRatio.value),
}))

const getStageRect = () => stageRef.value?.getBoundingClientRect()

const getMaxBlockPositionRatio = () => ({
    maxXRatio: Math.max(1 - captchaMeta.blockWidthRatio, 0),
    maxYRatio: Math.max(1 - captchaMeta.blockHeightRatio, 0),
})

const clampBlockPositionRatio = (nextXRatio: number, nextYRatio: number) => {
    const { maxXRatio, maxYRatio } = getMaxBlockPositionRatio()
    return {
        xRatio: Math.min(Math.max(nextXRatio, 0), maxXRatio),
        yRatio: Math.min(Math.max(nextYRatio, 0), maxYRatio),
    }
}

const stopDragging = (shouldSubmit: boolean) => {
    if (!isDragging.value) {
        return
    }

    isDragging.value = false

    if (activePointerId.value !== null && blockRef.value?.hasPointerCapture(activePointerId.value)) {
        blockRef.value.releasePointerCapture(activePointerId.value)
    }

    activePointerId.value = null
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
    window.removeEventListener('pointercancel', handlePointerCancel)

    if (!shouldSubmit) {
        return
    }

    props.afterChange({
        vCodeKey: captchaKey.value,
        blockX: displayBlockXRatio.value,
        blockY: displayBlockYRatio.value,
        blockWidthRatio: captchaMeta.blockWidthRatio,
        blockHeightRatio: captchaMeta.blockHeightRatio,
    })
}

const refreshCode = async () => {
    stopDragging(false)
    displayBlockXRatio.value = 0
    displayBlockYRatio.value = 0

    const captchaData = await props.fetchCaptcha()
    captchaKey.value = captchaData.guid
    captchaMeta.aspectRatio = captchaData.aspectRatio ?? 2
    captchaMeta.canvasSrc = captchaData.canvasSrc
    captchaMeta.blockSrc = captchaData.blockSrc
    captchaMeta.blockWidthRatio = captchaData.blockWidthRatio ?? 0.15625
    captchaMeta.blockHeightRatio = captchaData.blockHeightRatio ?? 0.3125
    displayBlockXRatio.value = 0
    displayBlockYRatio.value = 0
}

const handlePointerMove = (event: PointerEvent) => {
    if (!isDragging.value || activePointerId.value !== event.pointerId) {
        return
    }

    const stageRect = getStageRect()
    if (!stageRect || stageRect.width <= 0 || stageRect.height <= 0) {
        return
    }

    const deltaXRatio = (event.clientX - dragState.startPointerX) / stageRect.width
    const deltaYRatio = (event.clientY - dragState.startPointerY) / stageRect.height
    const nextPosition = clampBlockPositionRatio(
        dragState.startBlockXRatio + deltaXRatio,
        dragState.startBlockYRatio + deltaYRatio,
    )
    displayBlockXRatio.value = nextPosition.xRatio
    displayBlockYRatio.value = nextPosition.yRatio
}

const handlePointerUp = (event: PointerEvent) => {
    if (activePointerId.value !== event.pointerId) {
        return
    }

    stopDragging(true)
}

const handlePointerCancel = (event: PointerEvent) => {
    if (activePointerId.value !== event.pointerId) {
        return
    }

    stopDragging(false)
}

const handleBlockPointerDown = (event: PointerEvent) => {
    event.preventDefault()
    event.stopPropagation()

    const blockElement = blockRef.value
    if (!blockElement) {
        return
    }

    isDragging.value = true
    activePointerId.value = event.pointerId
    dragState.startPointerX = event.clientX
    dragState.startPointerY = event.clientY
    dragState.startBlockXRatio = displayBlockXRatio.value
    dragState.startBlockYRatio = displayBlockYRatio.value

    blockElement.setPointerCapture(event.pointerId)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerCancel)
}

onMounted(() => {
    refreshCode()
})

onUnmounted(() => {
    stopDragging(false)
})

defineExpose({
    refreshCode,
})
</script>

<template>
    <div class="verify-slider">
        <div ref="stageRef" class="verify-slider__stage">
            <div class="verify-slider__bg" :style="bgStyle">
                <a-button
                    class="verify-slider__refresh"
                    size="small"
                    shape="circle"
                    @click.stop="refreshCode"
                >
                    <template #icon>
                        <ReloadOutlined />
                    </template>
                </a-button>

                <img
                    ref="blockRef"
                    class="verify-slider__block"
                    :class="{ 'verify-slider__block--dragging': isDragging }"
                    :src="captchaMeta.blockSrc"
                    :style="blockStyle"
                    alt="拖动滑块"
                    draggable="false"
                    @pointerdown="handleBlockPointerDown"
                />
            </div>
        </div>

        <div class="verify-slider__hint">拖动滑块拼合缺口</div>
    </div>
</template>

<style lang="less" scoped>
.verify-slider {
    width: 100%;

    &__stage {
        position: relative;
        width: 100%;
        overflow: hidden;
        border-radius: 6px;
        user-select: none;
    }

    &__bg {
        position: relative;
        display: block;
        width: 100%;
        background-size: 100% 100%;
        background-repeat: no-repeat;
        background-position: center;
        pointer-events: none;
    }

    &__refresh {
        position: absolute;
        top: 6px;
        right: 6px;
        z-index: 3;
        pointer-events: auto;
    }

    &__block {
        position: absolute;
        top: 0;
        left: 0;
        z-index: 2;
        cursor: grab;
        touch-action: none;
        pointer-events: auto;

        &--dragging {
            cursor: grabbing;
        }
    }

    &__hint {
        margin-top: 8px;
        color: rgba(0, 0, 0, 0.45);
        font-size: 12px;
        text-align: center;
    }
}
</style>
