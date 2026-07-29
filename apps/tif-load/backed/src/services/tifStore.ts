import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, extname, join, resolve } from 'node:path'
import { fromArrayBuffer } from 'geotiff'
import { env } from '../config/env'

export type TifRecord = {
    id: string
    filename: string
    size: number
    width: number | null
    height: number | null
    west: number | null
    south: number | null
    east: number | null
    north: number | null
    crs: string | null
    createdAt: string
    filePath: string
}

const META_NAME = 'meta.json'

const ensureUploadDir = () => {
    mkdirSync(env.uploadDir, { recursive: true })
}

const fileDir = (fileId: string) => resolve(env.uploadDir, fileId)

const readMeta = (fileId: string): TifRecord | null => {
    const metaPath = join(fileDir(fileId), META_NAME)
    if (!existsSync(metaPath)) {
        return null
    }
    return JSON.parse(readFileSync(metaPath, 'utf-8')) as TifRecord
}

const writeMeta = (record: TifRecord) => {
    writeFileSync(join(fileDir(record.id), META_NAME), JSON.stringify(record, null, 2), 'utf-8')
}

const parseGeoBounds = async (arrayBuffer: ArrayBuffer) => {
    try {
        const tiff = await fromArrayBuffer(arrayBuffer)
        const image = await tiff.getImage()
        const width = image.getWidth()
        const height = image.getHeight()
        const bbox = image.getBoundingBox()
        const geoKeys = image.getGeoKeys?.() as { ProjectedCSTypeGeoKey?: number; GeographicTypeGeoKey?: number } | undefined
        const epsg = geoKeys?.ProjectedCSTypeGeoKey || geoKeys?.GeographicTypeGeoKey
        return {
            width,
            height,
            west: bbox?.[0] ?? null,
            south: bbox?.[1] ?? null,
            east: bbox?.[2] ?? null,
            north: bbox?.[3] ?? null,
            crs: epsg ? `EPSG:${epsg}` : null,
        }
    } catch {
        return {
            width: null,
            height: null,
            west: null,
            south: null,
            east: null,
            north: null,
            crs: null,
        }
    }
}

export const listFiles = (): TifRecord[] => {
    ensureUploadDir()
    return readdirSync(env.uploadDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => readMeta(entry.name))
        .filter((item): item is TifRecord => Boolean(item))
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
}

export const getFile = (fileId: string) => readMeta(fileId)

export const saveUpload = async (file: File): Promise<TifRecord> => {
    ensureUploadDir()
    const filename = file.name || `upload_${Date.now()}.tif`
    const extension = extname(filename).toLowerCase()
    if (extension !== '.tif' && extension !== '.tiff') {
        throw new Error('仅支持 .tif / .tiff')
    }

    const fileId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const targetDir = fileDir(fileId)
    mkdirSync(targetDir, { recursive: true })
    const safeName = basename(filename)
    const filePath = join(targetDir, safeName)
    const buffer = Buffer.from(await file.arrayBuffer())
    writeFileSync(filePath, buffer)

    const geo = await parseGeoBounds(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength))
    const record: TifRecord = {
        id: fileId,
        filename: safeName,
        size: buffer.byteLength,
        ...geo,
        createdAt: new Date().toISOString(),
        filePath,
    }
    writeMeta(record)
    return record
}

const clampSize = (width: number, height: number, maxSide: number) => {
    const longest = Math.max(width, height)
    if (longest <= maxSide) {
        return { outWidth: width, outHeight: height, scale: 1 }
    }
    const scale = maxSide / longest
    return {
        outWidth: Math.max(1, Math.round(width * scale)),
        outHeight: Math.max(1, Math.round(height * scale)),
        scale,
    }
}

export type HeightmapPayload = {
    meta: {
        width: number
        height: number
        west: number
        south: number
        east: number
        north: number
        minHeight: number
        maxHeight: number
        nodata: number
        tileSize: number
    }
    bin: Buffer
}

export const buildHeightmap = async (fileId: string): Promise<HeightmapPayload> => {
    const record = readMeta(fileId)
    if (!record) {
        throw new Error('文件不存在')
    }
    if (!existsSync(record.filePath)) {
        throw new Error('原始 TIF 丢失')
    }

    const cacheBin = join(fileDir(fileId), 'heightmap.bin')
    const cacheMeta = join(fileDir(fileId), 'heightmap_meta.json')
    if (existsSync(cacheBin) && existsSync(cacheMeta)) {
        return {
            meta: JSON.parse(readFileSync(cacheMeta, 'utf-8')),
            bin: readFileSync(cacheBin),
        }
    }

    const fileBuffer = readFileSync(record.filePath)
    const tiff = await fromArrayBuffer(
        fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength),
    )
    const image = await tiff.getImage()
    const srcWidth = image.getWidth()
    const srcHeight = image.getHeight()
    const bbox = image.getBoundingBox()
    const { outWidth, outHeight } = clampSize(srcWidth, srcHeight, env.maxHeightmapSide)

    const rasters = await image.readRasters({
        width: outWidth,
        height: outHeight,
        resampleMethod: 'bilinear',
    })
    const band = rasters[0] as Float32Array | Int16Array | Uint16Array | Float64Array
    const nodataRaw = image.getGDALNoData?.()
    const nodata = nodataRaw == null || Number.isNaN(Number(nodataRaw)) ? -9999 : Number(nodataRaw)

    const floatBand = new Float32Array(outWidth * outHeight)
    let minHeight = Number.POSITIVE_INFINITY
    let maxHeight = Number.NEGATIVE_INFINITY
    for (let index = 0; index < floatBand.length; index += 1) {
        const value = Number(band[index])
        if (!Number.isFinite(value) || value === nodata) {
            floatBand[index] = nodata
            continue
        }
        floatBand[index] = value
        minHeight = Math.min(minHeight, value)
        maxHeight = Math.max(maxHeight, value)
    }
    if (!Number.isFinite(minHeight)) {
        minHeight = 0
        maxHeight = 0
    }

    const meta = {
        width: outWidth,
        height: outHeight,
        west: Number(bbox[0]),
        south: Number(bbox[1]),
        east: Number(bbox[2]),
        north: Number(bbox[3]),
        minHeight,
        maxHeight,
        nodata,
        tileSize: 65,
    }
    const bin = Buffer.from(floatBand.buffer)
    writeFileSync(cacheBin, bin)
    writeFileSync(cacheMeta, JSON.stringify(meta, null, 2), 'utf-8')
    return { meta, bin }
}
