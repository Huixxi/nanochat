from __future__ import annotations
import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from models.user import User
from services.auth import get_current_user

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
VOICE_EXTS = {".webm", ".mp3", ".ogg", ".m4a", ".wav"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
MAX_VOICE_SIZE = 2 * 1024 * 1024  # 2MB


@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename")

    ext = os.path.splitext(file.filename)[1].lower()

    if ext in IMAGE_EXTS:
        file_type = "image"
        max_size = MAX_IMAGE_SIZE
    elif ext in VOICE_EXTS:
        file_type = "voice"
        max_size = MAX_VOICE_SIZE
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"File too large (max {max_size // 1024 // 1024}MB)",
        )

    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(content)

    return {"url": f"/api/uploads/{filename}", "type": file_type}
