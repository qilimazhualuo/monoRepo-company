# 将 GeoPackage 导入 PostgreSQL

Docker 已使用 `postgis/postgis`，宿主机装好 GDAL（含 `ogr2ogr`）后执行：

```bash
# 创建库（若服务尚未自动创建）
psql -h 127.0.0.1 -U postgres -c "CREATE DATABASE navigation;"

# 导入 gpkg（表名建议 roads，几何列默认 wkb_geometry，导入后可改名）
ogr2ogr -f PostgreSQL ^
  PG:"host=127.0.0.1 port=5432 user=postgres password=123zhangbei dbname=navigation" ^
  shandong.gpkg ^
  -nln roads ^
  -nlt PROMOTE_TO_MULTI ^
  -lco GEOMETRY_NAME=geom ^
  -lco FID=id ^
  -t_srs EPSG:4326 ^
  -overwrite
```

导入后检查：

```sql
SELECT COUNT(*) FROM roads;
SELECT GeometryType(geom), COUNT(*) FROM roads GROUP BY 1;
CREATE INDEX IF NOT EXISTS roads_geom_idx ON roads USING GIST (geom);
```

若导入表名/几何列不同，改 `server/navigation/.env`：

```env
ROAD_TABLE=你的表名
ROAD_GEOM_COLUMN=geom
ROAD_ID_COLUMN=id
```

然后重启 `yarn dev:nav-server`。
