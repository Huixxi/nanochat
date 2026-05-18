from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import hashlib
import secrets
from models.database import get_db
from models.user import User
from models.persona import Persona
from models.invitation import Invitation
from services.auth import create_access_token, get_current_user
import uuid

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    h = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}${h}"

def verify_password(password: str, hashed: str) -> bool:
    salt, h = hashed.split("$", 1)
    return hashlib.sha256((salt + password).encode()).hexdigest() == h

router = APIRouter()


class RegisterRequest(BaseModel):
    nickname: str
    password: str
    invite_code: str
    avatar_config: dict = {}
    answers: dict = {}


class LoginRequest(BaseModel):
    nickname: str
    password: str


class GuestRequest(BaseModel):
    nickname: str
    avatar_config: dict = {}
    answers: dict = {}


@router.post("/register")
async def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.nickname == req.nickname).first()
    if existing:
        raise HTTPException(status_code=400, detail="用户名已被使用")

    invitation = db.query(Invitation).filter(
        Invitation.code == req.invite_code.upper(),
    ).first()

    if not invitation:
        raise HTTPException(status_code=400, detail="邀请码无效")

    user_invite_code = uuid.uuid4().hex[:8].upper()
    user = User(
        nickname=req.nickname,
        hashed_password=hash_password(req.password),
        avatar_config=req.avatar_config,
        invite_code=user_invite_code,
        invited_by=invitation.created_by,
    )
    db.add(user)
    db.flush()

    db.add(Invitation(code=user_invite_code, created_by=user.id))
    for _ in range(2):
        db.add(Invitation(code=uuid.uuid4().hex[:8].upper(), created_by=user.id))

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
    if not user.hashed_password:
        raise HTTPException(status_code=401, detail="该账号未设置密码，请联系管理员")
    if not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="密码错误")

    token = create_access_token(user.id, user.nickname)
    return {
        "user_id": user.id,
        "nickname": user.nickname,
        "avatar_config": user.avatar_config,
        "invite_code": user.invite_code,
        "token": token,
    }


class SetPasswordRequest(BaseModel):
    password: str
    old_password: str = ""


@router.post("/set-password")
async def set_password(
    req: SetPasswordRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.hashed_password:
        if not req.old_password or not verify_password(req.old_password, user.hashed_password):
            raise HTTPException(status_code=400, detail="原密码错误")
    if len(req.password) < 4:
        raise HTTPException(status_code=400, detail="密码至少4位")
    user.hashed_password = hash_password(req.password)
    db.commit()
    return {"message": "密码设置成功"}


@router.post("/guest")
async def guest_login(req: GuestRequest, db: Session = Depends(get_db)):
    """Create a guest user (no invite code required). Supports progressive registration."""
    existing = db.query(User).filter(User.nickname == req.nickname).first()
    if existing:
        raise HTTPException(status_code=400, detail="用户名已被使用")
    user_invite_code = uuid.uuid4().hex[:8].upper()
    user = User(
        nickname=req.nickname,
        avatar_config=req.avatar_config,
        invite_code=user_invite_code,
    )
    db.add(user)
    db.flush()
    db.add(Invitation(code=user_invite_code, created_by=user.id))
    for _ in range(2):
        db.add(Invitation(code=uuid.uuid4().hex[:8].upper(), created_by=user.id))
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.nickname)
    return {
        "user_id": user.id,
        "nickname": user.nickname,
        "invite_code": user.invite_code,
        "token": token,
    }
