"""导航相关 API 路由"""
import logging

from fastapi import APIRouter, UploadFile, File, Query
from fastapi.responses import StreamingResponse

from app.services.gpkg_import import import_gpkg_to_postgis
from app.services.routing import get_road_status, find_route
from app.utils.response import success, error

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


@router.get("/road-status")
async def road_status():
    result = get_road_status()
    return success(result)


@router.post("/import-gpkg")
async def import_gpkg(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".gpkg"):
        return error("请上传 .gpkg 文件")

    gpkg_bytes = await file.read()
    if not gpkg_bytes:
        return error("文件为空")

    return StreamingResponse(
        import_gpkg_to_postgis(gpkg_bytes, file.filename),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/route")
async def route(
    start_lon: float = Query(...),
    start_lat: float = Query(...),
    end_lon: float = Query(...),
    end_lat: float = Query(...),
):
    result = find_route(start_lon, start_lat, end_lon, end_lat)
    if result.get("found"):
        return success(result)
    return error(result.get("msg", "未找到路径"))
