import aiosqlite
import json
import os
from datetime import datetime
from pathlib import Path


async def create_report(db, description, latitude, longitude, filename, file_path=None, file_type=None, file_size=None):
    now = datetime.utcnow().isoformat()
    cursor = await db.execute(
        """INSERT INTO reports
           (created_at, description, latitude, longitude, filename, file_path, file_type, file_size, status)
           VALUES (?,?,?,?,?,?,?,?,?)""",
        (now, description, latitude, longitude, filename, file_path, file_type, file_size, "pending")
    )
    await db.commit()
    row = await db.execute("SELECT * FROM reports WHERE id=?", (cursor.lastrowid,))
    return await row.fetchone()


async def update_report_status(db, report_id, status):
    await db.execute("UPDATE reports SET status=? WHERE id=?", (status, report_id))
    await db.commit()


async def create_detection(db, report_id, defect_type, confidence, latitude, longitude, bbox=None):
    now = datetime.utcnow().isoformat()
    bbox_str = json.dumps(bbox) if bbox else None
    cursor = await db.execute(
        """INSERT INTO detections
           (report_id, defect_type, confidence, latitude, longitude, bbox, created_at)
           VALUES (?,?,?,?,?,?,?)""",
        (report_id, defect_type, confidence, latitude, longitude, bbox_str, now)
    )
    await db.commit()
    row = await db.execute("SELECT * FROM detections WHERE id=?", (cursor.lastrowid,))
    return await row.fetchone()


async def get_reports(db):
    cursor = await db.execute("SELECT * FROM reports ORDER BY created_at DESC")
    reports = await cursor.fetchall()
    result = []
    for r in reports:
        r_dict = dict(r)
        det_cursor = await db.execute("SELECT * FROM detections WHERE report_id=?", (r_dict["id"],))
        r_dict["detections"] = [dict(d) for d in await det_cursor.fetchall()]
        result.append(r_dict)
    return result


async def get_detections(db):
    cursor = await db.execute("SELECT * FROM detections ORDER BY created_at DESC")
    return [dict(r) for r in await cursor.fetchall()]
