<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { message } from 'antdv-next'
import Map from 'map'
import {
    fetchHealth,
    listTifFiles,
    uploadTifFile,
    fetchHeightmapMeta,
    fetchHeightmapBin,
    type TifFileInfo,
} from '@/api/tif'

type MapMode = 2 | 3

const DEFAULT_CENTER: [number, number] = [113.2, 23.1]
const DEFAULT_ZOOM = 10

const mapContainerRef = ref<HTMLElement | null>(null)
const mapInstance = ref<Map | null>(null)
const mapMode = ref<MapMode>(3)
const files = ref<TifFileInfo[]>([])
const selectedFileId = ref<string | null>(null)
const serverOk = ref(false)
const loading = ref(false)
const statusText = ref('就绪')

const selectedFile = computed(() => files.value.find((item) => item.id === selectedFileId.value) || null)

const refreshFiles = async () => {
    try {
        files.value = await listTifFiles()
        const health = await fetchHealth()
        serverOk.value = health.status === 'ok'
    } catch (error) {
        serverOk.value = false
        message.error(error instanceof Error ? error.message : '后端不可用')
    }
}

const handleUpload = async (event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) {
        return
    }
    if (!/\.tif{1,2}$/i.test(file.name)) {
        message.warning('请上传 .tif / .tiff')
        return
    }
    loading.value = true
    statusText.value = `上传 ${file.name}…`
    try {
        const uploaded = await uploadTifFile(file)
        await refreshFiles()
        selectedFileId.value = uploaded.id
        statusText.value = `已上传 ${uploaded.filename}`
        message.success('上传成功')
    } catch (error) {
        message.error(error instanceof Error ? error.message : '上传失败')
        statusText.value = '上传失败'
    } finally {
        loading.value = false
    }
}

const loadTerrainToMap = async (fileId: string) => {
    const map = mapInstance.value
    if (!map) {
        return
    }
    loading.value = true
    statusText.value = '加载 heightmap…'
    try {
        if (mapMode.value !== 3) {
            await new Promise<void>((resolve) => {
                map.switchMode(3, {
                    keepView: true,
                    callback: () => {
                        mapMode.value = 3
                        resolve()
                    },
                })
            })
        }

        const meta = await fetchHeightmapMeta(fileId)
        const heightmapBuffer = await fetchHeightmapBin(fileId)
        if (typeof map.loadHeightmapTerrain !== 'function') {
            throw new Error('当前 map 引擎未接入 loadHeightmapTerrain（请确认 packages/map3）')
        }
        const result = map.loadHeightmapTerrain({
            meta: {
                ...meta,
                tile_size: meta.tileSize,
                min_height: meta.minHeight,
                max_height: meta.maxHeight,
            },
            heightmapBuffer,
        })
        if (result.code !== 0) {
            throw new Error(result.msg || '地形加载失败')
        }
        map.setCenter(
            [
                [meta.west, meta.south],
                [meta.east, meta.south],
                [meta.east, meta.north],
                [meta.west, meta.north],
            ],
            { maxZoom: 15 },
        )
        statusText.value = `已加载 ${meta.width}×${meta.height}`
        message.success('3D 地形已加载')
    } catch (error) {
        message.error(error instanceof Error ? error.message : '加载失败')
        statusText.value = '加载失败'
    } finally {
        loading.value = false
    }
}

const handleSelectFile = async (fileId: string) => {
    selectedFileId.value = fileId
    await loadTerrainToMap(fileId)
}

const switchMapMode = (nextMode: MapMode) => {
    const map = mapInstance.value
    if (!map || nextMode === mapMode.value) {
        return
    }
    map.switchMode(nextMode, {
        keepView: true,
        callback: () => {
            mapMode.value = nextMode
            if (nextMode === 3 && selectedFileId.value) {
                loadTerrainToMap(selectedFileId.value)
            }
        },
    })
}

const initMap = () => {
    if (!mapContainerRef.value) {
        return
    }
    const map = new Map({
        target: mapContainerRef.value,
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        mode: mapMode.value,
        mapType: 'gaode',
        callback: () => {
            map.loadMap({ mapType: 'gaode' })
            statusText.value = '地图就绪'
        },
    })
    mapInstance.value = map
}

onMounted(async () => {
    initMap()
    await refreshFiles()
})

onBeforeUnmount(() => {
    mapInstance.value?.destroy()
    mapInstance.value = null
})
</script>

<template>
    <div class="tif-load-map">
        <aside class="tif-load-map__panel">
            <div class="tif-load-map__section">
                <div class="tif-load-map__title">TIF 加载</div>
                <div class="tif-load-map__status" :class="{ 'is-ready': serverOk }">
                    {{ serverOk ? '后端已连接' : '后端未连接（server-tif-load :9003）' }}
                </div>
                <a-button size="small" :loading="loading" @click="refreshFiles">刷新</a-button>
            </div>

            <div class="tif-load-map__section">
                <div class="tif-load-map__label">上传 DEM / TIF</div>
                <label class="tif-load-map__upload">
                    <input type="file" accept=".tif,.tiff" @change="handleUpload" />
                    选择文件
                </label>
            </div>

            <div class="tif-load-map__section">
                <div class="tif-load-map__label">地图模式</div>
                <div class="tif-load-map__mode-switch">
                    <a-button :type="mapMode === 2 ? 'primary' : 'default'" @click="switchMapMode(2)">
                        二维
                    </a-button>
                    <a-button :type="mapMode === 3 ? 'primary' : 'default'" @click="switchMapMode(3)">
                        三维
                    </a-button>
                </div>
                <p class="tif-load-map__hint">heightmap 地形在三维模式下加载</p>
            </div>

            <div class="tif-load-map__section">
                <div class="tif-load-map__label">文件列表</div>
                <ul class="tif-load-map__list">
                    <li v-for="file in files" :key="file.id">
                        <button
                            type="button"
                            :class="{ 'is-active': file.id === selectedFileId }"
                            @click="handleSelectFile(file.id)"
                        >
                            <span class="tif-load-map__filename">{{ file.filename }}</span>
                            <span class="tif-load-map__meta">
                                {{ file.width && file.height ? `${file.width}×${file.height}` : '—' }}
                            </span>
                        </button>
                    </li>
                </ul>
                <div v-if="selectedFile" class="tif-load-map__detail">
                    <div>范围：{{ selectedFile.west?.toFixed(4) }}, {{ selectedFile.south?.toFixed(4) }}</div>
                    <div>→ {{ selectedFile.east?.toFixed(4) }}, {{ selectedFile.north?.toFixed(4) }}</div>
                    <div>CRS：{{ selectedFile.crs || '未知' }}</div>
                </div>
            </div>

            <footer class="tif-load-map__footer">{{ statusText }}</footer>
        </aside>
        <main class="tif-load-map__map">
            <div ref="mapContainerRef" class="tif-load-map__canvas" />
        </main>
    </div>
</template>

<style scoped lang="less">
.tif-load-map {
    display: flex;
    width: 100%;
    height: 100%;

    &__panel {
        width: 320px;
        flex-shrink: 0;
        height: 100%;
        overflow: auto;
        padding: 16px;
        box-sizing: border-box;
        background: var(--colorBgContainer, #141414);
        border-right: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        flex-direction: column;
        gap: 14px;
    }

    &__title {
        font-size: 18px;
        font-weight: 700;
        margin-bottom: 8px;
    }

    &__section {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    &__label {
        font-size: 12px;
        opacity: 0.72;
    }

    &__status {
        font-size: 13px;
        color: #ff7875;

        &.is-ready {
            color: #73d13d;
        }
    }

    &__upload {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: 32px;
        padding: 0 12px;
        border-radius: 6px;
        background: #1677ff;
        color: #fff;
        cursor: pointer;
        font-size: 13px;

        input {
            display: none;
        }
    }

    &__mode-switch {
        display: flex;
        gap: 8px;
    }

    &__hint {
        margin: 0;
        font-size: 12px;
        opacity: 0.6;
    }

    &__list {
        list-style: none;
        margin: 0;
        padding: 0;
        max-height: 280px;
        overflow: auto;

        li + li {
            margin-top: 4px;
        }

        button {
            width: 100%;
            text-align: left;
            border: 0;
            border-radius: 6px;
            background: transparent;
            color: inherit;
            padding: 8px 10px;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            gap: 2px;

            &:hover,
            &.is-active {
                background: rgba(22, 119, 255, 0.22);
            }
        }
    }

    &__filename {
        font-size: 13px;
        word-break: break-all;
    }

    &__meta {
        font-size: 11px;
        opacity: 0.65;
    }

    &__detail {
        font-size: 12px;
        opacity: 0.75;
        line-height: 1.5;
    }

    &__footer {
        margin-top: auto;
        padding-top: 10px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        font-size: 12px;
        opacity: 0.8;
        word-break: break-all;
    }

    &__map {
        flex: 1;
        min-width: 0;
        height: 100%;
    }

    &__canvas {
        width: 100%;
        height: 100%;
    }
}
</style>
