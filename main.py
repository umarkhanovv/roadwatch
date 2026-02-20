import os
import uuid
import logging
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, Form, BackgroundTasks, Depends, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import aiosqlite
import aiofiles

from database import init_db, get_db, DB_PATH
from inference import model_inference
from websocket_manager import manager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".mp4", ".mov", ".avi"}

app = FastAPI(title="RoadDefect API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.on_event("startup")
async def startup():
    await init_db()
    logger.info("Database ready")


async def process_report(report_id: int, file_path: str, latitude: float, longitude: float):
    from crud import create_detection, update_report_status
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        try:
            detections_raw = model_inference(file_path)
            created = []
            for det in detections_raw:
                d = await create_detection(
                    db, report_id, det["defect_type"], det["confidence"],
                    latitude, longitude, det.get("bbox")
                )
                created.append(dict(d))

            status = "processed" if detections_raw else "no_defects"
            await update_report_status(db, report_id, status)

            await manager.broadcast({
                "event": "new_report",
                "report": {
                    "id": report_id,
                    "latitude": latitude,
                    "longitude": longitude,
                    "status": status,
                    "created_at": created[0]["created_at"] if created else "",
                    "detections": created,
                }
            })
        except Exception as e:
            logger.error("Processing failed for report %d: %s", report_id, e)
            await update_report_status(db, report_id, "failed")


@app.post("/api/reports")
async def submit_report(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    description: str = Form(""),
    latitude: float = Form(...),
    longitude: float = Form(...),
    db=Depends(get_db),
):
    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type: {suffix}")

    # Save file
    unique_name = f"{uuid.uuid4().hex}{suffix}"
    file_path = UPLOAD_DIR / unique_name

    file_bytes = await file.read()
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(file_bytes)

    file_size = len(file_bytes)
    file_type = "video" if suffix in (".mp4", ".mov", ".avi") else "image"

    from crud import create_report
    report = await create_report(
        db,
        description or None,
        latitude,
        longitude,
        unique_name,
        file_path=str(file_path),
        file_type=file_type,
        file_size=file_size,
    )
    report_id = report["id"]

    logger.info("Report #%d received — %s (%.1f KB, %s)", report_id, unique_name, file_size/1024, file_type)
    background_tasks.add_task(process_report, report_id, str(file_path), latitude, longitude)

    return {"report_id": report_id, "status": "pending", "message": "Queued for analysis"}


@app.get("/api/reports")
async def list_reports(db=Depends(get_db)):
    from crud import get_reports
    return await get_reports(db)


@app.get("/api/detections")
async def list_detections(db=Depends(get_db)):
    from crud import get_detections
    return await get_detections(db)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.get("/health")
async def health():
    return {"status": "ok"}
