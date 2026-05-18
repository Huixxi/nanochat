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

    # edges use "from" = inviter, "to" = invitee (direction of trust flow)

    # === Degree 1: my inviter + people I invited ===

    # Inviter (upward)
    inviter = None
    if user.invited_by:
        inviter = db.query(User).filter(User.id == user.invited_by).first()
        if inviter:
            add_node(inviter, 1)
            edges.append({"from": inviter.id, "to": user.id, "relation": "invited"})

    # People I invited (downward)
    my_invitees = db.query(User).filter(User.invited_by == user.id).limit(30).all()
    for inv in my_invitees:
        add_node(inv, 1)
        edges.append({"from": user.id, "to": inv.id, "relation": "invited"})

    # === Degree 2: siblings (other people invited by my inviter) + invitees of my invitees ===

    # Siblings: other people my inviter also invited
    if inviter:
        siblings = db.query(User).filter(
            User.invited_by == inviter.id,
            User.id != user.id,
        ).limit(20).all()
        for sib in siblings:
            add_node(sib, 2)
            edges.append({"from": inviter.id, "to": sib.id, "relation": "invited"})

    # Invitees of my invitees
    for inv in my_invitees:
        sub_invitees = db.query(User).filter(User.invited_by == inv.id).limit(10).all()
        for sub in sub_invitees:
            add_node(sub, 2)
            edges.append({"from": inv.id, "to": sub.id, "relation": "invited"})

    # === Degree 3: inviter's inviter + invitees of siblings ===

    # Inviter's inviter (grandparent invited my inviter)
    if inviter and inviter.invited_by:
        grandparent = db.query(User).filter(User.id == inviter.invited_by).first()
        if grandparent:
            add_node(grandparent, 3)
            edges.append({"from": grandparent.id, "to": inviter.id, "relation": "invited"})

    # Invitees of degree-2 nodes (limited)
    degree2_ids = [n["id"] for n in nodes if n["degree"] == 2]
    for d2_id in degree2_ids[:10]:
        d3_invitees = db.query(User).filter(User.invited_by == d2_id).limit(5).all()
        for d3 in d3_invitees:
            add_node(d3, 3)
            edges.append({"from": d2_id, "to": d3.id, "relation": "invited"})

    return {"nodes": nodes, "edges": edges}
