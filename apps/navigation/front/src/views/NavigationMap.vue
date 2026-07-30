<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { message } from 'antdv-next'
import Map from 'map'
import {
    fetchRoadStatus,
    fetchRoute,
    importGpkg,
    type RoadStatus,
    type RouteResult,
} from '@/api/navigation'

type PickMode = 'start' | 'end' | null
type MapMode = 2 | 3
type MeasureType = 'LineString' | 'Polygon' | 'Circle' | 'Rect' | null

const DEFAULT_CENTER: [number, number] = [117.0, 36.65]
const DEFAULT_ZOOM = 11
const LAYER_ID = 'navigation-layer'

const mapContainerRef = ref<HTMLElement | null>(null)
const mapInstance = ref<any>(null)
const mapMode = ref<MapMode>(2)
const pickMode = ref<PickMode>(null)
const measureType = ref<MeasureType>(null)
const loading = ref(false)
const roadStatus = ref<RoadStatus | null>(null)
const routeResult = ref<RouteResult | null>(null)

const importingGpkg = ref(false)
const importProgress = ref<string>('')
const selectedGpkgFileName = ref<string | null>(null)
const gpkgFileInputRef = ref<HTMLInputElement | null>(null)

const startPoint = reactive<{ longitude: number | null; latitude: number | null }>({
    longitude: null,
    latitude: null,
})

const endPoint = reactive<{ longitude: number | null; latitude: number | null }>({
    longitude: null,
    latitude: null,
})

const hasStart = computed(() => startPoint.longitude != null && startPoint.latitude != null)
const hasEnd = computed(() => endPoint.longitude != null && endPoint.latitude != null)

const formatDistance = (distanceKm: number) => {
    if (distanceKm < 1) {
        return `${Math.round(distanceKm * 1000)} m`
    }
    return `${distanceKm.toFixed(2)} km`
}

const formatDuration = (durationMin: number) => {
    if (durationMin < 60) {
        return `${Math.round(durationMin)} 分钟`
    }
    const hours = Math.floor(durationMin / 60)
    const minutes = Math.round(durationMin % 60)
    return `${hours} 小时 ${minutes} 分钟`
}

const redrawMarkersAndRoute = () => {
    const map = mapInstance.value
    if (!map) {
        return
    }

    map.clearLayer(LAYER_ID)

    if (hasStart.value) {
        map.createPoint({
            longitude: startPoint.longitude as number,
            latitude: startPoint.latitude as number,
            fill: '#52c41a',
            strokeColor: '#ffffff',
            strokeWidth: 2,
            radius: 8,
            text: '起',
        }, LAYER_ID)
    }

    if (hasEnd.value) {
        map.createPoint({
            longitude: endPoint.longitude as number,
            latitude: endPoint.latitude as number,
            fill: '#ff4d4f',
            strokeColor: '#ffffff',
            strokeWidth: 2,
            radius: 8,
            text: '终',
        }, LAYER_ID)
    }

    if (routeResult.value?.coords?.length) {
        map.createLine({
            layerId: LAYER_ID,
            data: routeResult.value.coords,
            style: {
                width: 5,
                color: '#1677ff',
                unit: 'px',
            },
            goView: true,
        })
    }
}

const assignPoint = (
    target: { longitude: number | null; latitude: number | null },
    longitude: number,
    latitude: number,
) => {
    target.longitude = Number(longitude.toFixed(6))
    target.latitude = Number(latitude.toFixed(6))
    routeResult.value = null
    redrawMarkersAndRoute()
}

const onPointInputChange = () => {
    routeResult.value = null
    redrawMarkersAndRoute()
}

const handleMapClick = (payload: { coordinate: [number, number] }) => {
    const [longitude, latitude] = payload.coordinate
    if (!pickMode.value) {
        return
    }

    if (pickMode.value === 'start') {
        assignPoint(startPoint, longitude, latitude)
        message.success('已设置起点')
    } else {
        assignPoint(endPoint, longitude, latitude)
        message.success('已设置终点')
    }
    pickMode.value = null
}

const startPick = (mode: Exclude<PickMode, null>) => {
    stopMeasure()
    pickMode.value = mode
    message.info(mode === 'start' ? '请在地图上点击选择起点' : '请在地图上点击选择终点')
}

const clearRoute = () => {
    startPoint.longitude = null
    startPoint.latitude = null
    endPoint.longitude = null
    endPoint.latitude = null
    routeResult.value = null
    pickMode.value = null
    redrawMarkersAndRoute()
}

const measureTypeLabel: Record<Exclude<MeasureType, null>, string> = {
    LineString: '测距',
    Polygon: '测面',
    Circle: '测圆',
    Rect: '矩形',
}

const startMeasure = (type: Exclude<MeasureType, null>) => {
    const map = mapInstance.value
    if (!map) {
        return
    }

    pickMode.value = null
    measureType.value = type
    map.draw(type, {}, false)
    message.info(`开始${measureTypeLabel[type]}，在地图上点击绘制`)
}

const stopMeasure = () => {
    const map = mapInstance.value
    if (!map) {
        measureType.value = null
        return
    }
    map.stopMeasure()
    measureType.value = null
}

const clearMeasure = () => {
    const map = mapInstance.value
    if (!map) {
        return
    }
    map.stopMeasure()
    map.clearMeasure()
    measureType.value = null
    message.success('已清除测量')
}

const bindMeasureCallback = (map: any) => {
    map.setMeasureCallBack(() => {
        measureType.value = null
        message.success('测量完成')
    })
}

const loadRoadStatus = async () => {
    try {
        roadStatus.value = await fetchRoadStatus()
    } catch (error) {
        roadStatus.value = null
        message.warning(error instanceof Error ? error.message : '路网状态查询失败')
    }
}

const onGpkgFileSelected = () => {
    const input = gpkgFileInputRef.value
    const file = input?.files?.[0]
    selectedGpkgFileName.value = file?.name ?? null
}

const handleImportGpkg = () => {
    const input = gpkgFileInputRef.value
    const file = input?.files?.[0]
    if (!file) {
        message.warning('先选择 gpkg 文件')
        return
    }

    importingGpkg.value = true
    importProgress.value = '准备上传…'

    importGpkg(file, {
        onProgress: (data) => {
            importProgress.value = `${data.percent}% - ${data.msg}`
        },
        onDone: async (data) => {
            importProgress.value = `导入完成，共 ${data.total} 条`
            message.success('导入完成')
            await loadRoadStatus()
            importingGpkg.value = false
        },
        onError: (msg) => {
            importProgress.value = ''
            message.error(msg || '导入失败')
            importingGpkg.value = false
        },
    })
}

const handleSearchRoute = async () => {
    if (!hasStart.value || !hasEnd.value) {
        message.warning('先把起点终点填全，别瞎点')
        return
    }

    loading.value = true
    try {
        const result = await fetchRoute(
            {
                longitude: startPoint.longitude as number,
                latitude: startPoint.latitude as number,
            },
            {
                longitude: endPoint.longitude as number,
                latitude: endPoint.latitude as number,
            },
        )
        routeResult.value = result
        redrawMarkersAndRoute()
        message.success('路径已生成')
    } catch (error) {
        message.error(error instanceof Error ? error.message : '算路失败')
    } finally {
        loading.value = false
    }
}

const bindMapReady = () => {
    const map = mapInstance.value
    if (!map) {
        return
    }
    map.createLayer({
        id: LAYER_ID,
        zIndex: 20,
    })
    map.addEvent('click', handleMapClick)
    bindMeasureCallback(map)
    redrawMarkersAndRoute()
}

const switchMapMode = (nextMode: MapMode) => {
    const map = mapInstance.value
    if (!map || nextMode === mapMode.value) {
        return
    }

    measureType.value = null
    map.switchMode(nextMode, {
        keepView: true,
        callback: () => {
            mapMode.value = nextMode
            bindMeasureCallback(map)
            redrawMarkersAndRoute()
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
            baseLayerConfig: [
                { mapType: 'tianditu', token: import.meta.env.VITE_TIANDITU_KEY, tileType: 'vec_w' },
                { mapType: 'tianditu', token: import.meta.env.VITE_TIANDITU_KEY, tileType: 'cva_w' },
            ],
            callback: () => {
                bindMapReady()
            },
        })

    mapInstance.value = map
}

onMounted(async () => {
    initMap()
    await loadRoadStatus()
})

onBeforeUnmount(() => {
    mapInstance.value?.removeEvent('click', handleMapClick)
    mapInstance.value?.destroy()
    mapInstance.value = null
})
</script>

<template>
    <div class="navigation-map">
        <aside class="navigation-map__panel">
            <div class="navigation-map__section">
                <div class="navigation-map__label">路网状态</div>
                <div class="navigation-map__status" :class="{ 'is-ready': roadStatus?.ready }">
                    <template v-if="roadStatus">
                        {{ roadStatus.ready ? `已加载 ${roadStatus.count} 条路段` : '路网为空，先导入 gpkg 到 PG' }}
                    </template>
                    <template v-else>
                        未连接到导航服务
                    </template>
                </div>
                <a-button size="small" @click="loadRoadStatus">刷新状态</a-button>
            </div>

            <div class="navigation-map__section">
                <div class="navigation-map__label">导入 gpkg</div>
                <div class="navigation-map__file">
                    <input
                        ref="gpkgFileInputRef"
                        class="navigation-map__file-input"
                        type="file"
                        accept=".gpkg"
                        @change="onGpkgFileSelected"
                    />
                    <div v-if="selectedGpkgFileName" class="navigation-map__file-name">
                        已选择：{{ selectedGpkgFileName }}
                    </div>
                </div>
                <a-button block :loading="importingGpkg" :disabled="importingGpkg" @click="handleImportGpkg">
                    导入并刷新状态
                </a-button>
                <div v-if="importProgress" class="import-progress">{{ importProgress }}</div>
            </div>

            <div class="navigation-map__section">
                <div class="navigation-map__label">起点</div>
                <div class="navigation-map__coords">
                    <a-input-number
                        v-model:value="startPoint.longitude"
                        :precision="6"
                        :step="0.0001"
                        placeholder="经度"
                        style="width: 100%"
                        @change="onPointInputChange"
                    />
                    <a-input-number
                        v-model:value="startPoint.latitude"
                        :precision="6"
                        :step="0.0001"
                        placeholder="纬度"
                        style="width: 100%"
                        @change="onPointInputChange"
                    />
                </div>
                <a-button
                    :type="pickMode === 'start' ? 'primary' : 'default'"
                    block
                    @click="startPick('start')"
                >
                    {{ pickMode === 'start' ? '点击地图选起点中…' : '地图选起点' }}
                </a-button>
            </div>

            <div class="navigation-map__section">
                <div class="navigation-map__label">终点</div>
                <div class="navigation-map__coords">
                    <a-input-number
                        v-model:value="endPoint.longitude"
                        :precision="6"
                        :step="0.0001"
                        placeholder="经度"
                        style="width: 100%"
                        @change="onPointInputChange"
                    />
                    <a-input-number
                        v-model:value="endPoint.latitude"
                        :precision="6"
                        :step="0.0001"
                        placeholder="纬度"
                        style="width: 100%"
                        @change="onPointInputChange"
                    />
                </div>
                <a-button
                    :type="pickMode === 'end' ? 'primary' : 'default'"
                    block
                    @click="startPick('end')"
                >
                    {{ pickMode === 'end' ? '点击地图选终点中…' : '地图选终点' }}
                </a-button>
            </div>

            <div class="navigation-map__section">
                <div class="navigation-map__label">地图模式</div>
                <div class="navigation-map__mode-switch">
                    <a-button
                        :type="mapMode === 2 ? 'primary' : 'default'"
                        block
                        @click="switchMapMode(2)"
                    >
                        二维
                    </a-button>
                    <a-button
                        :type="mapMode === 3 ? 'primary' : 'default'"
                        block
                        @click="switchMapMode(3)"
                    >
                        三维
                    </a-button>
                </div>
            </div>

            <div class="navigation-map__section">
                <div class="navigation-map__label">测量工具</div>
                <div class="navigation-map__measure-grid">
                    <a-button
                        :type="measureType === 'LineString' ? 'primary' : 'default'"
                        @click="startMeasure('LineString')"
                    >
                        测距
                    </a-button>
                    <a-button
                        :type="measureType === 'Polygon' ? 'primary' : 'default'"
                        @click="startMeasure('Polygon')"
                    >
                        测面
                    </a-button>
                    <a-button
                        :type="measureType === 'Circle' ? 'primary' : 'default'"
                        @click="startMeasure('Circle')"
                    >
                        测圆
                    </a-button>
                    <a-button
                        :type="measureType === 'Rect' ? 'primary' : 'default'"
                        @click="startMeasure('Rect')"
                    >
                        矩形
                    </a-button>
                </div>
                <div class="navigation-map__measure-actions">
                    <a-button block :disabled="!measureType" @click="stopMeasure">
                        停止测量
                    </a-button>
                    <a-button block danger @click="clearMeasure">清除测量</a-button>
                </div>
                <div v-if="measureType" class="navigation-map__measure-tip">
                    当前：{{ measureTypeLabel[measureType] }}中，在地图上点击绘制
                </div>
            </div>

            <div class="navigation-map__actions">
                <a-button
                    type="primary"
                    block
                    :loading="loading"
                    :disabled="!hasStart || !hasEnd"
                    @click="handleSearchRoute"
                >
                    生成导航路径
                </a-button>
                <a-button block @click="clearRoute">清空</a-button>
            </div>

            <div v-if="routeResult" class="navigation-map__section navigation-map__result">
                <div class="navigation-map__label">路径结果</div>
                <div>距离：{{ formatDistance(routeResult.distance_km) }}</div>
                <div>预估：{{ formatDuration(routeResult.duration_min) }}</div>
                <div>节点：{{ routeResult.coords.length }}</div>
            </div>
        </aside>

        <div ref="mapContainerRef" class="navigation-map__canvas" />
    </div>
</template>

<style scoped lang="less">
.navigation-map {
    display: flex;
    width: 100%;
    height: 100%;

    &__panel {
        display: flex;
        flex-direction: column;
        gap: 16px;
        width: 320px;
        padding: 16px;
        overflow: auto;
        border-right: 1px solid var(--theme-color-border, #f0f0f0);
        background: var(--theme-color-bg-container, #fff);
    }

    &__section {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    &__label {
        font-size: 13px;
        font-weight: 600;
        color: var(--theme-color-text-secondary, rgba(0, 0, 0, 0.65));
    }

    &__status {
        font-size: 13px;
        color: var(--theme-color-error, #ff4d4f);

        &.is-ready {
            color: var(--theme-color-success, #52c41a);
        }
    }

    &__coords {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    &__file {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    &__file-input {
        width: 100%;
    }

    &__file-name {
        font-size: 12px;
        line-height: 1.5;
        color: var(--theme-color-text-secondary, rgba(0, 0, 0, 0.65));
        word-break: break-all;
    }

    &__mode-switch {
        display: flex;
        gap: 8px;
    }

    &__measure-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
    }

    &__measure-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    &__measure-tip {
        font-size: 12px;
        line-height: 1.5;
        color: var(--theme-color-primary, #1677ff);
    }

    &__actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    &__result {
        padding-top: 8px;
        border-top: 1px dashed var(--theme-color-border, #f0f0f0);
        font-size: 13px;
        line-height: 1.7;
        color: var(--theme-color-text, rgba(0, 0, 0, 0.88));
    }

    &__canvas {
        flex: 1;
        min-width: 0;
        min-height: 0;
    }
}
</style>
