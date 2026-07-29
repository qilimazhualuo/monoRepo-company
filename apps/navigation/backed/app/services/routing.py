"""
路径规划: 从 PostGIS 拉路网 → 建图 → Dijkstra 最短路径
"""
import heapq
import logging
import math
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import text

from app.database import get_engine
from app.global_config import settings

logger = logging.getLogger(__name__)

ROAD_TABLE = "roads"


def get_road_status() -> Dict[str, Any]:
    """检查路网表是否存在及记录数"""
    try:
        with get_engine().connect() as conn:
            result = conn.execute(text(f"""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = '{ROAD_TABLE}'
                )
            """))
            exists = result.scalar()
            if not exists:
                return {"ready": False, "count": 0, "msg": "roads 表不存在"}

            count = conn.execute(text(f'SELECT COUNT(1) FROM "{ROAD_TABLE}"')).scalar()
            return {"ready": count > 0, "count": count, "msg": "ok" if count > 0 else "表为空"}
    except Exception as exc:
        logger.warning(f"road_status 检查失败: {exc}")
        return {"ready": False, "count": 0, "msg": str(exc)}


def find_route(
    start_lon: float, start_lat: float,
    end_lon: float, end_lat: float,
) -> Dict[str, Any]:
    """在路网中搜索最短路径"""
    buffer_deg = settings.BUFFER_DEG
    max_buffer = settings.MAX_BUFFER_DEG
    step = settings.BUFFER_STEP_DEG

    while buffer_deg <= max_buffer:
        roads = _fetch_roads_in_buffer(start_lon, start_lat, end_lon, end_lat, buffer_deg)
        if roads:
            graph, node_coords = _build_graph(roads)
            if graph:
                start_node = _snap_to_nearest_node(start_lon, start_lat, node_coords)
                end_node = _snap_to_nearest_node(end_lon, end_lat, node_coords)
                if start_node and end_node and start_node != end_node:
                    path = _dijkstra(graph, start_node, end_node)
                    if path:
                        coords = [node_coords[nid] for nid in path]
                        distance = _calc_path_distance(coords)
                        return {
                            "found": True,
                            "coords": coords,
                            "distance_km": round(distance, 2),
                            "duration_min": round(distance / settings.AVG_SPEED_KMH * 60, 1),
                            "buffer_used_deg": buffer_deg,
                        }
        buffer_deg += step

    return {"found": False, "msg": f"缓冲区 {max_buffer}° 内未找到连通路径"}


def _fetch_roads_in_buffer(
    start_lon: float, start_lat: float,
    end_lon: float, end_lat: float,
    buffer_deg: float,
) -> List[Dict[str, Any]]:
    min_lon = min(start_lon, end_lon) - buffer_deg
    max_lon = max(start_lon, end_lon) + buffer_deg
    min_lat = min(start_lat, end_lat) - buffer_deg
    max_lat = max(start_lat, end_lat) + buffer_deg

    sql = text(f"""
        SELECT gid, road_id, fclass,
               ST_AsText(geom) AS geom_wkt
        FROM "{ROAD_TABLE}"
        WHERE geom && ST_MakeEnvelope(:min_lon, :min_lat, :max_lon, :max_lat, 4326)
    """)

    try:
        with get_engine().connect() as conn:
            result = conn.execute(sql, {
                "min_lon": min_lon, "min_lat": min_lat,
                "max_lon": max_lon, "max_lat": max_lat,
            })
            return [dict(row._mapping) for row in result]
    except Exception as exc:
        logger.warning(f"拉取路网失败: {exc}")
        return []


def _build_graph(roads: List[Dict[str, Any]]) -> Tuple[Dict, Dict]:
    """从 WKT LineString 构建邻接表"""
    graph: Dict[str, List[Tuple[str, float]]] = {}
    node_coords: Dict[str, Tuple[float, float]] = {}

    for road in roads:
        wkt = road.get("geom_wkt", "")
        coords = _parse_linestring_wkt(wkt)
        if len(coords) < 2:
            continue

        for idx in range(len(coords) - 1):
            lon_a, lat_a = coords[idx]
            lon_b, lat_b = coords[idx + 1]
            node_a = f"{lon_a:.6f},{lat_a:.6f}"
            node_b = f"{lon_b:.6f},{lat_b:.6f}"

            node_coords[node_a] = (lon_a, lat_a)
            node_coords[node_b] = (lon_b, lat_b)

            dist = _haversine(lon_a, lat_a, lon_b, lat_b)

            graph.setdefault(node_a, []).append((node_b, dist))
            graph.setdefault(node_b, []).append((node_a, dist))

    return graph, node_coords


def _parse_linestring_wkt(wkt: str) -> List[Tuple[float, float]]:
    """解析 LINESTRING/MULTILINESTRING WKT 为坐标列表"""
    if not wkt:
        return []

    # 处理 MULTILINESTRING
    if wkt.startswith("MULTILINESTRING"):
        wkt = wkt.replace("MULTILINESTRING", "").strip()
        # 去掉最外层括号
        if wkt.startswith("((") and wkt.endswith("))"):
            wkt = wkt[1:-1]
        # 取所有线段合并
        coords = []
        for segment in wkt.split("),("):
            segment = segment.strip("()")
            coords.extend(_parse_coord_string(segment))
        return coords

    if wkt.startswith("LINESTRING"):
        wkt = wkt.replace("LINESTRING", "").strip().strip("()")
        return _parse_coord_string(wkt)

    return []


def _parse_coord_string(coord_str: str) -> List[Tuple[float, float]]:
    coords = []
    for pair in coord_str.split(","):
        parts = pair.strip().split()
        if len(parts) >= 2:
            try:
                coords.append((float(parts[0]), float(parts[1])))
            except ValueError:
                continue
    return coords


def _snap_to_nearest_node(
    lon: float, lat: float,
    node_coords: Dict[str, Tuple[float, float]],
) -> Optional[str]:
    best_node = None
    best_dist = float("inf")
    tolerance_km = settings.SNAP_TOLERANCE_M / 1000.0

    for nid, (nlon, nlat) in node_coords.items():
        dist = _haversine(lon, lat, nlon, nlat)
        if dist < best_dist:
            best_dist = dist
            best_node = nid

    if best_node and best_dist <= tolerance_km:
        return best_node
    return best_node  # 即使超出容忍度也尝试


def _dijkstra(
    graph: Dict[str, List[Tuple[str, float]]],
    start: str,
    end: str,
) -> Optional[List[str]]:
    dist_map: Dict[str, float] = {start: 0}
    prev_map: Dict[str, Optional[str]] = {start: None}
    heap = [(0.0, start)]
    visited = set()

    while heap:
        current_dist, current = heapq.heappop(heap)
        if current in visited:
            continue
        visited.add(current)

        if current == end:
            path = []
            node = end
            while node is not None:
                path.append(node)
                node = prev_map.get(node)
            return list(reversed(path))

        for neighbor, weight in graph.get(current, []):
            if neighbor in visited:
                continue
            new_dist = current_dist + weight
            if new_dist < dist_map.get(neighbor, float("inf")):
                dist_map[neighbor] = new_dist
                prev_map[neighbor] = current
                heapq.heappush(heap, (new_dist, neighbor))

    return None


def _haversine(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """返回两点之间的距离(km)"""
    R = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    lat1_r = math.radians(lat1)
    lat2_r = math.radians(lat2)

    a = math.sin(d_lat / 2) ** 2 + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(d_lon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _calc_path_distance(coords: List[Tuple[float, float]]) -> float:
    total = 0.0
    for idx in range(len(coords) - 1):
        total += _haversine(coords[idx][0], coords[idx][1], coords[idx + 1][0], coords[idx + 1][1])
    return total
