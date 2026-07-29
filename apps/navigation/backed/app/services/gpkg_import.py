"""
gpkg 导入路网到 PostGIS
利用 sqlite3 读取 gpkg（sqlite 变体），直接写入 PostgreSQL
"""
import logging
import sqlite3
import struct
import tempfile
from pathlib import Path
from typing import AsyncGenerator, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_engine

logger = logging.getLogger(__name__)

ROAD_TABLE = "roads"


def _gpkg_geom_to_wkb(blob: bytes) -> Optional[bytes]:
    """从 gpkg 的 GeoPackageBinary 信封中提取标准 WKB"""
    if not blob or len(blob) < 8:
        return None
    # 前两个字节: GP (0x47 0x50)
    if blob[0:2] != b"GP":
        # 可能本身就是 WKB
        return blob
    # byte 3: version, byte 4: flags
    flags = blob[3]
    envelope_indicator = (flags >> 1) & 0x07
    envelope_sizes = {0: 0, 1: 32, 2: 48, 3: 48, 4: 64}
    envelope_size = envelope_sizes.get(envelope_indicator, 0)
    # header = 8 bytes + srs_id (4 bytes) = 8 总固定部分 actually:
    # magic(2) + version(1) + flags(1) + srs_id(4) + envelope
    header_size = 8 + envelope_size
    return blob[header_size:]


def _wkb_to_ewkb_4326(wkb: bytes) -> str:
    """把 WKB hex 前面插入 SRID 4326 (EWKB)，返回 hex 字符串"""
    # 直接用 ST_GeomFromWKB + 设置 SRID，不手动拼 EWKB
    return wkb.hex()


async def import_gpkg_to_postgis(
    gpkg_bytes: bytes,
    filename: str,
) -> AsyncGenerator[str, None]:
    """
    把上传的 gpkg 文件导入 PostGIS roads 表
    yield SSE 格式进度消息
    """
    yield _sse("progress", {"percent": 0, "msg": "开始解析 gpkg 文件"})

    temp_dir = tempfile.mkdtemp()
    try:
        gpkg_path = Path(temp_dir) / (filename or "upload.gpkg")
        gpkg_path.write_bytes(gpkg_bytes)

        conn = sqlite3.connect(str(gpkg_path))
        conn.row_factory = sqlite3.Row
        try:
            all_layers = conn.execute(
                "SELECT table_name FROM gpkg_contents WHERE data_type='features' ORDER BY table_name"
            ).fetchall()
            if not all_layers:
                yield _sse("error", {"msg": "gpkg 中未找到要素图层"})
                return

            layer_names = [row["table_name"] for row in all_layers]
            yield _sse("progress", {"percent": 2, "msg": f"发现图层: {', '.join(layer_names)}"})

            # 优先选名字包含 road 的图层
            layer_name = layer_names[0]
            for name in layer_names:
                if "road" in name.lower():
                    layer_name = name
                    break

            total_count = conn.execute(
                f'SELECT COUNT(1) FROM "{layer_name}"'
            ).fetchone()[0]
            if total_count == 0:
                yield _sse("error", {"msg": "gpkg 文件中没有记录"})
                return

            yield _sse("progress", {"percent": 5, "msg": f"图层 {layer_name}, 共 {total_count} 条记录"})

            field_info = conn.execute(f'PRAGMA table_info("{layer_name}")').fetchall()
            field_names = [item["name"] for item in field_info]

            # 找几何列 (gpkg_geometry_columns 表里查)
            geom_col_row = conn.execute(
                "SELECT column_name FROM gpkg_geometry_columns WHERE table_name = ?",
                (layer_name,),
            ).fetchone()
            geom_col = geom_col_row["column_name"] if geom_col_row else "geom"

            # 找 id 列 (优先 osm_id, 否则 fid/ogc_fid)
            id_col = None
            for candidate in ("osm_id", "fid", "ogc_fid", "id"):
                if candidate in field_names:
                    id_col = candidate
                    break

            # 在 PostGIS 中重建 roads 表
            with get_engine().begin() as pg_conn:
                pg_conn.execute(text(f'DROP TABLE IF EXISTS "{ROAD_TABLE}" CASCADE'))
                pg_conn.execute(text(f"""
                    CREATE TABLE "{ROAD_TABLE}" (
                        gid SERIAL PRIMARY KEY,
                        road_id TEXT,
                        name TEXT,
                        fclass TEXT,
                        geom geometry(Geometry, 4326)
                    )
                """))

            yield _sse("progress", {"percent": 10, "msg": "roads 表已创建，开始写入"})

            # 找 name / fclass 列
            name_col = None
            for candidate in ("name", "road_name", "NAME"):
                if candidate in field_names:
                    name_col = candidate
                    break
            fclass_col = None
            for candidate in ("fclass", "highway", "road_type", "type"):
                if candidate in field_names:
                    fclass_col = candidate
                    break

            batch_size = 2000
            inserted = 0
            cursor = conn.execute(f'SELECT * FROM "{layer_name}"')

            while True:
                rows = cursor.fetchmany(batch_size)
                if not rows:
                    break

                values_parts = []
                params = {}
                for idx, row in enumerate(rows):
                    row_dict = dict(row)
                    geom_blob = row_dict.get(geom_col)
                    if not geom_blob:
                        continue

                    wkb = _gpkg_geom_to_wkb(geom_blob)
                    if not wkb:
                        continue

                    key_prefix = f"b{inserted + idx}"
                    params[f"{key_prefix}_id"] = str(row_dict.get(id_col, "")) if id_col else str(inserted + idx)
                    params[f"{key_prefix}_name"] = str(row_dict.get(name_col, "") or "") if name_col else ""
                    params[f"{key_prefix}_fclass"] = str(row_dict.get(fclass_col, "") or "") if fclass_col else ""
                    params[f"{key_prefix}_geom"] = wkb.hex()

                    values_parts.append(
                        f"(:{key_prefix}_id, :{key_prefix}_name, :{key_prefix}_fclass, "
                        f"ST_SetSRID(ST_GeomFromWKB(decode(:{key_prefix}_geom, 'hex')), 4326))"
                    )

                if values_parts:
                    sql = f"""
                        INSERT INTO "{ROAD_TABLE}" (road_id, name, fclass, geom)
                        VALUES {', '.join(values_parts)}
                    """
                    with get_engine().begin() as pg_conn:
                        pg_conn.execute(text(sql), params)

                inserted += len(rows)
                percent = min(10 + int(85 * inserted / total_count), 95)
                yield _sse("progress", {"percent": percent, "msg": f"已写入 {inserted}/{total_count}"})

            # 创建空间索引
            with get_engine().begin() as pg_conn:
                pg_conn.execute(text(
                    f'CREATE INDEX IF NOT EXISTS idx_{ROAD_TABLE}_geom ON "{ROAD_TABLE}" USING GIST (geom)'
                ))

            yield _sse("progress", {"percent": 100, "msg": f"导入完成，共 {inserted} 条路网记录"})
            yield _sse("done", {"total": inserted})

        finally:
            conn.close()
    except Exception as exc:
        logger.exception("gpkg 导入失败")
        yield _sse("error", {"msg": str(exc)})
    finally:
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)


def _sse(event: str, data: dict) -> str:
    import json
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
