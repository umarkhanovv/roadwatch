from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class DetectionOut(BaseModel):
    id: int
    report_id: int
    defect_type: str
    confidence: float
    latitude: float
    longitude: float
    bbox: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ReportOut(BaseModel):
    id: int
    created_at: datetime
    description: Optional[str] = None
    latitude: float
    longitude: float
    filename: str
    status: str
    detections: List[DetectionOut] = []

    model_config = {"from_attributes": True}


class ReportCreate(BaseModel):
    description: Optional[str] = None
    latitude: float
    longitude: float


class SubmitResponse(BaseModel):
    report_id: int
    status: str
    message: str
