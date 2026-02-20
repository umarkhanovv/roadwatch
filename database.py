import aiosqlite
from pathlib import Path

DB_PATH = Path(__file__).parent / "roaddefects.db"


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS reports (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at  TEXT    NOT NULL,
                description TEXT,
                latitude    REAL    NOT NULL,
                longitude   REAL    NOT NULL,
                filename    TEXT    NOT NULL,
                file_path   TEXT,
                file_type   TEXT,
                file_size   INTEGER,
                status      TEXT    DEFAULT 'pending'
            )
        """)
        # Add new columns if upgrading existing DB
        for col, definition in [
            ("file_path", "TEXT"),
            ("file_type", "TEXT"),
            ("file_size", "INTEGER"),
        ]:
            try:
                await db.execute(f"ALTER TABLE reports ADD COLUMN {col} {definition}")
            except Exception:
                pass  # column already exists

        await db.execute("""
            CREATE TABLE IF NOT EXISTS detections (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                report_id   INTEGER NOT NULL,
                defect_type TEXT    NOT NULL,
                confidence  REAL    NOT NULL,
                latitude    REAL    NOT NULL,
                longitude   REAL    NOT NULL,
                bbox        TEXT,
                created_at  TEXT    NOT NULL,
                FOREIGN KEY (report_id) REFERENCES reports(id)
            )
        """)
        await db.commit()


async def get_db():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        yield db
