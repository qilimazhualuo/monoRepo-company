-- 在 PostgreSQL 中执行（库：navigation）
-- 1) 创建库（也可由服务启动时自动创建）
-- CREATE DATABASE navigation;

\c navigation

CREATE EXTENSION IF NOT EXISTS postgis;

-- 路网表：把 gpkg 导入后，字段名按实际改，或把导入表 rename / 建 view 对齐到本结构
CREATE TABLE IF NOT EXISTS roads (
    id BIGSERIAL PRIMARY KEY,
    name TEXT,
    geom geometry(Geometry, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS roads_geom_idx ON roads USING GIST (geom);

COMMENT ON TABLE roads IS '路网线要素（LineString / MultiLineString，EPSG:4326）';
COMMENT ON COLUMN roads.geom IS '道路几何，支持 MultiLineString，服务端会 ST_Dump';
