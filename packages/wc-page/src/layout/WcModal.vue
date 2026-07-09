<script setup lang="ts">
import { useDraggable } from '@vueuse/core'
import { ref, watch, watchEffect, computed } from 'vue'

if (typeof window !== 'undefined' && window.modalIndex === undefined) {
    window.modalIndex = 1000
}

const props = defineProps({
    visible: {
        type: Boolean,
        required: true,
    },
    title: {
        type: String,
        required: false,
    },
    width: {
        type: String,
        default: '25vw',
    },
    style: {
        type: Object,
        default: () => ({ left: 0, right: 0 }),
    },
    afterCloseFun: {
        type: Function,
    },
    closeFun: {
        type: Function,
    },
    cancleFun: {
        type: Function,
    },
    footer: {
        type: [Boolean, Object],
        default: true,
    },
    destroyOnClose: {
        type: Boolean,
        default: true,
    },
    okFun: {
        type: Function,
    },
    dom: {
        default: document.body,
    },
    className: {
        type: String,
        default: '',
    },
    isFull: {
        type: Boolean,
        default: false,
    },
    zIndex: {
        type: Number,
        required: false,
    },
    mask: {
        type: Boolean,
        default: false,
    },
    maskClosable: {
        type: Boolean,
        default: false,
    },
})

const emit = defineEmits(['update:visible'])

const modalTitleRef = ref<HTMLElement | null>(null)
const confirmLoading = ref(false)

const close = () => {
    const closeHandler = props.closeFun || props.cancleFun
    if (closeHandler) {
        closeHandler().then(() => {
            emit('update:visible', false)
            confirmLoading.value = false
        })
        return
    }
    emit('update:visible', false)
    confirmLoading.value = false
}

const afterClose = () => {
    if (props.afterCloseFun) {
        props.afterCloseFun()
    }
}

const ok = async (eventValue?: unknown) => {
    if (!props.okFun) {
        return
    }
    confirmLoading.value = true
    props
        .okFun(eventValue)
        .then(() => {
            confirmLoading.value = false
        })
        .catch(() => {
            confirmLoading.value = false
        })
}

const { x, y, isDragging } = useDraggable(modalTitleRef)
const startX = ref(0)
const startY = ref(0)
const startedDrag = ref(false)
const transformX = ref(0)
const transformY = ref(0)
const preTransformX = ref(0)
const preTransformY = ref(0)
const dragRect = ref({ left: 0, right: 0, top: 0, bottom: 0 })

watch([x, y], () => {
    if (!startedDrag.value && modalTitleRef.value) {
        startX.value = x.value
        startY.value = y.value
        const bodyRect = document.body.getBoundingClientRect()
        const titleRect = modalTitleRef.value.getBoundingClientRect()
        dragRect.value.right = bodyRect.width - titleRect.width
        dragRect.value.bottom = bodyRect.height - titleRect.height
        preTransformX.value = transformX.value
        preTransformY.value = transformY.value
    }
    startedDrag.value = true
})

watch(isDragging, () => {
    if (!isDragging) {
        startedDrag.value = false
    }
})

watchEffect(() => {
    if (startedDrag.value) {
        transformX.value =
            preTransformX.value +
            Math.min(Math.max(dragRect.value.left, x.value), dragRect.value.right) -
            startX.value
        transformY.value =
            preTransformY.value +
            Math.min(Math.max(dragRect.value.top, y.value), dragRect.value.bottom) -
            startY.value
    }
})

const transformStyle = computed(() => {
    if (props.isFull) {
        return {}
    }
    return {
        transform: `translate(${transformX.value}px, ${transformY.value}px)`,
    }
})

const setTop = () => {
    if (props.zIndex) {
        return
    }
    window.modalIndex += 1
    modalIndex.value = window.modalIndex
}

const modalIndex = ref(props.zIndex || window.modalIndex)

watch(
    () => props.visible,
    () => {
        if (props.zIndex) {
            return
        }
        window.modalIndex += 1
        modalIndex.value = window.modalIndex
    },
)

const isFooterVNode = computed(() => (
    Boolean(
        props.footer
        && typeof props.footer === 'object'
        && '__v_isVNode' in (props.footer as object),
    )
))
</script>

<template>
    <a-modal
        :open="visible"
        :destroy-on-close="destroyOnClose"
        :mask="mask"
        :mask-closable="maskClosable"
        :width="isFull ? '100%' : width"
        :style="Object.assign({ 'z-index': modalIndex + 1 }, style)"
        wrap-class-name="wc-page-modal-wrap"
        :class="'wc-page-modal ' + className + (isFull ? ' full-modal' : '')"
        :get-container="() => dom"
        v-bind="{ ...$attrs }"
        @cancel="close"
        @ok="ok"
        @after-close="afterClose"
    >
        <template #title>
            <div ref="modalTitleRef" @mousedown="setTop">
                <slot name="title">{{ title }}</slot>
            </div>
        </template>

        <div class="wc-page-modal-content" @mousedown="setTop">
            <slot></slot>
        </div>

        <template #modalRender="{ originVNode }">
            <div :style="transformStyle">
                <component :is="originVNode" />
            </div>
        </template>

        <template #footer>
            <a-row v-if="footer" justify="end" @mousedown="setTop">
                <slot name="footer" :close="close" :ok="ok" :loading="confirmLoading">
                    <component
                        v-if="isFooterVNode"
                        :is="footer"
                        :close="close"
                        :ok="ok"
                        :loading="confirmLoading"
                    />

                    <template v-else>
                        <a-button key="back" @click="close">取消</a-button>
                        <a-button key="submit" type="primary" :loading="confirmLoading" @click="ok">
                            保存
                        </a-button>
                    </template>
                </slot>
            </a-row>
        </template>
    </a-modal>
</template>

<style lang="less">
@import '../styles/variables.less';

.ant-modal div[aria-hidden='true'] {
    display: none !important;
}

.wc-page-modal-wrap {
    position: absolute !important;
    pointer-events: none;

    .ant-modal {
        position: absolute;

        .ant-modal-body {
            padding: 0;

            .wc-page-modal-content {
                height: 100%;
                width: 100%;
            }
        }
    }

    .full-modal {
        max-width: 100%;
        width: 100% !important;
        top: 0;
        padding-bottom: 0;
        margin: 0;

        .ant-modal-content {
            display: flex;
            flex-direction: column;
            height: calc(100vh);
            border-radius: 0;
        }

        .ant-modal-body {
            height: 2px;
            flex: 1 1 auto;
            overflow: auto;
            margin-right: @uni * -8;
            padding-right: @uni * 8;
        }
    }
}
</style>
