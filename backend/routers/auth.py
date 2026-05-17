from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from models.database import get_db
from models.user import User
from models.persona import Persona
from models.invitation import Invitation
from services.auth import create_access_token
import uuid

router = APIRouter()


class RegisterRequest(BaseModel):
    nickname: str
    invite_code: str
    avatar_config: dict = {}
    answers: dict = {}


class LoginRequest(BaseModel):
    nickname: str


class GuestRequest(BaseModel):
    nickname: str
    avatar_config: dict = {}
    answers: dict = {}


@router.post("/register")
async def register(req: RegisterRequest, db: Session = Depends(get_db)):
    invitation = db.query(Invitation).filter(
        Invitation.code == req.invite_code.upper(),
        Invitation.used_by.is_(None),
    ).first()

    if not invitation:
        raise HTTPException(status_code=400, detail="Invalid or used invite code")

    user_invite_code = uuid.uuid4().hex[:8].upper()
    user = User(
        nickname=req.nickname,
        avatar_config=req.avatar_config,
        invite_code=user_invite_code,
        invited_by=invitation.created_by,
    )
    db.add(user)
    db.flush()
    invitation.used_by = user.id

    db.add(Invitation(code=user_invite_code, created_by=user.id))

    if req.answers:
        db.add(Persona(user_id=user.id, answers=req.answers))

    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.nickname)
    return {
        "user_id": user.id,
        "nickname": user.nickname,
        "invite_code": user.invite_code,
        "token": token,
    }


@router.post("/login")
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.nickname == req.nickname).first()
    if not user:
        raise HTTPException(status_code=401, detail="用户不存在")

    token = create_access_token(user.id, user.nickname)
    return {
        "user_id": user.id,
        "nickname": user.nickname,
        "avatar_config": user.avatar_config,
        "invite_code": user.invite_code,
        "token": token,
    }


@router.post("/guest")
async def guest_login(req: GuestRequest, db: Session = Depends(get_db)):
    """Create a guest user (no invite code required). Supports progressive registration."""
    user_invite_code = uuid.uuid4().hex[:8].upper()
    user = User(
        nickname=req.nickname,
        avatar_config=req.avatar_config,
        invite_code=user_invite_code,
    )
    db.add(user)
    db.flush()
    db.add(Invitation(code=user_invite_code, created_by=user.id))
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.nickname)
    return {
        "user_id": user.id,
        "nickname": user.nickname,
        "invite_code": user.invite_code,
        "token": token,
    }
