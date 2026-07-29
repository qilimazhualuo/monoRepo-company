from app.database import init_db, get_engine
from sqlalchemy import text

init_db()
eng = get_engine()
with eng.connect() as conn:
    r = conn.execute(text("""
        SELECT GeometryType(geom) as gtype, fclass, COUNT(1) as cnt
        FROM roads
        GROUP BY gtype, fclass
        ORDER BY cnt DESC
        LIMIT 20
    """))
    for row in r:
        print(dict(row._mapping))
