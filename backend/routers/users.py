from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from pydantic import BaseModel
from models.database import get_db
from models.user import User
from models.conversation import ConversationMember
from models.circle import CircleMember
from services.auth import get_current_user

router = APIRouter()


class AvatarUpdate(BaseModel):
    avatar_config: dict


class ProfileUpdate(BaseModel):
    nickname: Optional[str] = None
    avatar_config: Optional[dict] = None


@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    return {
        "user_id": user.id,
        "nickname": user.nickname,
        "avatar_config": user.avatar_config,
        "invite_code": user.invite_code,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


@router.put("/me")
async def update_profile(
    req: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if req.nickname is not None:
        user.nickname = req.nickname
    if req.avatar_config is not None:
        user.avatar_config = req.avatar_config
    db.commit()
    db.refresh(user)
    return {
        "user_id": user.id,
        "nickname": user.nickname,
        "avatar_config": user.avatar_config,
    }


@router.put("/me/avatar")
async def update_avatar(
    req: AvatarUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user.avatar_config = req.avatar_config
    db.commit()
    return {"message": "Avatar updated"}


@router.get("/me/stats")
async def get_stats(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversation_count = db.query(func.count(ConversationMember.conversation_id)).filter(
        ConversationMember.user_id == user.id
    ).scalar() or 0

    circle_count = db.query(func.count(CircleMember.circle_id)).filter(
        CircleMember.user_id == user.id
    ).scalar() or 0

    invited_count = db.query(func.count(User.id)).filter(
        User.invited_by == user.id
    ).scalar() or 0

    return {
        "conversations": conversation_count,
        "circles": circle_count,
        "invited": invited_count,
    }


@router.get("/me/graph")
async def get_graph(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    nodes = []
    edges = []
    visited = set()

    def add_node(u: User, degree: int):
        if u.id in visited:
            return
        visited.add(u.id)
        nodes.append({
            "id": u.id,
            "name": u.nickname,
            "avatar_config": u.avatar_config,
            "degree": degree,
        })

    add_node(user, 0)

    # Inviter chain (upward)
    current = user
    deg = 1
    while current.invited_by and deg <= 3:
        inviter = db.query(User).filter(User.id == current.invited_by).first()
        if not inviter or inviter.id in visited:
            break
        add_node(inviter, deg)
        edges.append({"from": current.id, "to": inviter.id})
        current = inviter
        deg += 1

    # People invited by this user (downward)
    invitees = db.query(User).filter(User.invited_by == user.id).limit(20).all()
    for inv in invitees:
        add_node(inv, 1)
        edges.append({"from": user.id, "to": inv.id})

    return {"nodes": nodes, "edges": edges}
