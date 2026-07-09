<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
    visible: {
        type: Boolean,
        required: true,
    },
    title: {
        type: String,
    },
    width: {
        type: String,
        default: '37vw',
    },
    style: {
        type: Object,
    },
    mask: {
        type: Boolean,
        default: true,
    },
    dom: {
        default: document.body,
    },
    afterVisibleChangeFun: {
        type: Function,
    },
    footer: {
        type: Boolean,
        default: true,
    },
    okFun: {
        type: Function,
    },
    placement: {
        type: String,
        default: 'right',
    },
    cancleFun: {
        type: Function,
    },
    className: {
        type: String,
    },
    isOkBtn: {
        type: Boolean,
        default: true,
    },
    autoSetLoading: {
        type: Boolean,
        default: true,
    },
    closeFun: {
        type: Function,
        default: () => Promise.resolve(),
    },
})

const emit = defineEmits(['update:visible'])
const loading = ref(false)
const showContent = ref(false)

const close = () => {
    props.closeFun().then(() => {
        emit('update:visible', false)
    })
}

watch(
    () => props.visible,
    (visibleValue) => {
        if (!visibleValue) {
            showContent.value = false
            return
        }
        nextTick(() => {
            nextTick(() => {
                showContent.value = true
            })
        })
    },
)

const afterVisibleChange = (visibleValue: boolean) => {
    if (props.afterVisibleChangeFun) {
        props.afterVisibleChangeFun(visibleValue)
    }
}

const ok = async (eventValue?: unknown) => {
    if (!props.okFun) {
        return
    }
    loading.value = true
    props
        .okFun(eventValue)
        .then(() => {
            loading.value = false
        })
        .catch(() => {
            loading.value = false
        })
    if (props.autoSetLoading) {
        setTimeout(() => {
            loading.value = false
        }, 5000)
    }
}

const cancle = () => {
    if (props.cancleFun) {
        props.cancleFun()
        loading.value = false
    }
}
</script>

<template>
    <a-drawer
        :open="visible"
        :size="width"
        :style="style"
        :get-container="dom"
        :mask="mask"
        :styles="{ footer: { textAlign: 'right' } }"
        :destroy-on-close="true"
        :mask-closable="false"
        :placement="placement"
        :class="'wc-page-drawer ' + className"
        @close="close"
        @after-open-change="afterVisibleChange"
    >
        <template #title>
            <slot name="title">{{ title }}</slot>
        </template>

        <div v-if="showContent" class="wc-page-drawer-content">
            <slot></slot>
        </div>

        <template #extra>
            <slot v-if="footer" name="footer" :loading="loading" :ok="ok" :cancle="cancle">
                <a-space v-if="footer">
                    <a-button @click="cancle">重置</a-button>
                    <a-button v-if="isOkBtn" type="primary" :loading="loading" @click="ok">
                        保存
                    </a-button>
                </a-space>
            </slot>

            <div :style="{ display: 'inline-block', 'margin-left': '8px' }">
                <slot name="extraBtn"></slot>
            </div>
        </template>
    </a-drawer>
</template>

<style lang="less">
@import '../styles/variables.less';

.ant-drawer {
    position: absolute;
}

.wc-page-drawer {
    .ant-drawer-header {
        box-shadow: 0 @uni @uni4 rgba(0, 21, 41, 0.08);
    }

    .wc-page-drawer-content {
        width: 100%;
        height: 100%;
        overflow-y: auto;
        padding-right: 8px;
        margin-right: -8px;
    }
}
</style>
