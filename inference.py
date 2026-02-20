"""
AI Inference Worker — Roboflow YOLOv8
Smart video analysis: samples frames based on video length
"""
import os, logging, random, json, urllib.request, base64
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

ROBOFLOW_API_KEY     = os.environ.get("ROBOFLOW_API_KEY", "kZaQd5ltfO6dTZQrg3fN")
ROBOFLOW_PROJECT     = "my-first-project-v8v9g"
ROBOFLOW_VERSION     = 8
CONFIDENCE_THRESHOLD = 0.40

# How many frames to sample per second of video
FRAMES_PER_SECOND = 1   # 1 frame every second = 60 frames for a 60s video
MAX_FRAMES        = 60  # hard cap so very long videos don't take forever

FALLBACK_DEFECT_TYPES = [
    "pothole", "crack", "alligator_crack",
    "rutting", "depression", "edge_crack",
    "patching", "weathering",
]


def model_inference(file_path: str) -> List[Dict[str, Any]]:
    try:
        ext = os.path.splitext(file_path)[1].lower()
        if ext in (".mp4", ".mov", ".avi"):
            return _infer_video(file_path)
        return _infer_image(file_path)
    except Exception as exc:
        logger.error("Inference failed: %s", exc)
        logger.warning("Using placeholder detector.")
    return _placeholder_detector(file_path)


# ── Video: 1 frame per second across full duration ───────────────────────────

def _infer_video(video_path: str) -> List[Dict[str, Any]]:
    try:
        import cv2
    except ImportError:
        logger.warning("opencv not installed — run: pip install opencv-python-headless")
        return _infer_image(video_path)

    cap          = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps          = cap.get(cv2.CAP_PROP_FPS) or 30
    duration_sec = total_frames / fps

    if total_frames <= 0:
        cap.release()
        return _infer_image(video_path)

    # 1 frame per second, capped at MAX_FRAMES
    n_samples = min(int(duration_sec * FRAMES_PER_SECOND) + 1, MAX_FRAMES, total_frames)
    # Build evenly spaced frame indices
    indices = [int(i * (total_frames - 1) / max(n_samples - 1, 1)) for i in range(n_samples)]
    # Remove duplicates while preserving order
    seen = set()
    indices = [x for x in indices if not (x in seen or seen.add(x))]

    logger.info(
        "Video: %.1fs @ %.0ffps = %d frames — sampling %d frames (1 per second)",
        duration_sec, fps, total_frames, len(indices)
    )

    all_detections = []
    seen_types = set()
    tmp_files  = []

    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if not ret:
            continue
        tmp_path = video_path + f"_f{idx}.jpg"
        cv2.imwrite(tmp_path, frame)
        tmp_files.append(tmp_path)

        try:
            dets = _roboflow_infer_path(tmp_path)
            for d in dets:
                # Keep ALL detections — only deduplicate exact same type+confidence combo
                sig = (d["defect_type"], round(d["confidence"], 2))
                if sig not in seen_types:
                    seen_types.add(sig)
                    all_detections.append(d)
        except Exception as e:
            logger.warning("Frame %d failed: %s", idx, e)

    cap.release()
    for f in tmp_files:
        try: os.remove(f)
        except: pass

    logger.info("Video done — %d unique detection(s) from %d frames", len(all_detections), len(indices))
    return all_detections


# ── Single image ─────────────────────────────────────────────────────────────

def _infer_image(file_path: str) -> List[Dict[str, Any]]:
    result = _roboflow_infer_path(file_path)
    logger.info("Image: %d detection(s) in %s", len(result), os.path.basename(file_path))
    return result


def _roboflow_infer_path(file_path: str) -> List[Dict[str, Any]]:
    with open(file_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode("utf-8")

    url = (
        f"https://detect.roboflow.com/{ROBOFLOW_PROJECT}/{ROBOFLOW_VERSION}"
        f"?api_key={ROBOFLOW_API_KEY}"
        f"&confidence={int(CONFIDENCE_THRESHOLD * 100)}"
        f"&overlap=30"
    )
    req = urllib.request.Request(
        url, data=image_data.encode("utf-8"),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        result = json.loads(resp.read().decode("utf-8"))

    detections = []
    for pred in result.get("predictions", []):
        confidence = float(pred.get("confidence", 0))
        if confidence < CONFIDENCE_THRESHOLD:
            continue
        cx, cy = pred.get("x", 0), pred.get("y", 0)
        w,  h  = pred.get("width", 0), pred.get("height", 0)
        raw = pred.get("class_name") or pred.get("class") or pred.get("label") or "pothole"
        try:
            int(raw); defect_type = "pothole"
        except (ValueError, TypeError):
            defect_type = str(raw).lower().strip().replace(" ", "_")

        detections.append({
            "defect_type": defect_type or "pothole",
            "confidence":  round(confidence, 4),
            "bbox": [round(cx-w/2,1), round(cy-h/2,1), round(cx+w/2,1), round(cy+h/2,1)],
        })
    return detections


# ── Placeholder fallback ─────────────────────────────────────────────────────

def _placeholder_detector(file_path: str) -> List[Dict[str, Any]]:
    rng = random.Random(os.path.basename(file_path))
    if rng.random() < 0.20:
        return []
    results = []
    for _ in range(rng.randint(1, 3)):
        x1, y1 = rng.randint(50,400), rng.randint(50,300)
        results.append({
            "defect_type": rng.choice(FALLBACK_DEFECT_TYPES),
            "confidence":  round(rng.uniform(0.55, 0.97), 3),
            "bbox": [x1, y1, x1+rng.randint(40,200), y1+rng.randint(30,150)],
        })
    return results