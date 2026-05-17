from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models.database import get_db
from models.invitation import Invitation
import uuid

router = APIRouter()


@router.post("/generate")
async def generate_invite(db: Session = Depends(get_db)):
    # TODO: get user from auth, limit invite count
    code = uuid.uuid4().hex[:8].upper()
    invitation = Invitation(code=code, created_by="system")
    db.add(invitation)
    db.commit()
    return {"code": code}


@router.get("/validate/{code}")
async def validate_invite(code: str, db: Session = Depends(get_db)):
    invitation = db.query(Invitation).filter(
        Invitation.code == code.upper(),
        Invitation.used_by.is_(None),
    ).first()
    return {"valid": invitation is not None}
