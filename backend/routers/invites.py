from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models.database import get_db
from models.invitation import Invitation
from models.user import User
from services.auth import get_current_user
import uuid

router = APIRouter()


@router.get("/my-codes")
async def my_invite_codes(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    codes = db.query(Invitation).filter(
        Invitation.created_by == user.id,
    ).all()
    return [
        {"code": c.code, "used": c.used_by is not None}
        for c in codes
    ]


@router.post("/generate")
async def generate_invite(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    code = uuid.uuid4().hex[:8].upper()
    invitation = Invitation(code=code, created_by=user.id)
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
