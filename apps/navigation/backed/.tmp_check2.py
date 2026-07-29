import sqlite3

conn = sqlite3.connect(r"D:\code\company\monoRepo\apps\navigation\backed\data\shandong.gpkg")
conn.row_factory = sqlite3.Row

rows = conn.execute("SELECT table_name, identifier, data_type FROM gpkg_contents ORDER BY table_name").fetchall()
for row in rows:
    table_name = row["table_name"]
    count = conn.execute(f'SELECT COUNT(1) FROM "{table_name}"').fetchone()[0]
    print(f"{table_name:40s} type={row['data_type']:10s} count={count}")

conn.close()
