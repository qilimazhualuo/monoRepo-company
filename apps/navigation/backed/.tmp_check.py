from app.database import init_db, get_engine
from sqlalchemy import text

init_db()
eng = get_engine()
with eng.connect() as conn:
    r = conn.execute(text("SELECT COUNT(1) FROM roads"))
    print("total roads:", r.scalar())

    r2 = conn.execute(text("""
        SELECT gid, road_id, fclass, ST_AsText(ST_PointN(geom, 1)) as first_pt
        FROM roads
        WHERE geom && ST_MakeEnvelope(116.5, 36.5, 117.5, 37.0, 4326)
        LIMIT 5
    """))
    rows = [dict(row._mapping) for row in r2]
    print(f"roads in bbox: {len(rows)}")
    for row in rows:
        print(row)

    # check geom srid
    r3 = conn.execute(text("SELECT ST_SRID(geom) FROM roads LIMIT 1"))
    print("srid:", r3.scalar())
