from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models.database import get_db
from models.user import User
from models.circle import CircleMember
from services.auth import get_current_user

router = APIRouter()


@router.get("/recommendations")
async def get_recommendations(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    my_circles = {
        m.circle_id
        for m in db.query(CircleMember.circle_id).filter(CircleMember.user_id == user.id).all()
    }

    all_peers = db.query(User).filter(User.id != user.id).limit(30).all()

    results = []
    for peer in all_peers:
        peer_circles = {
            m.circle_id
            for m in db.query(CircleMember.circle_id).filter(CircleMember.user_id == peer.id).all()
        }
        shared = len(my_circles & peer_circles) if my_circles else 0
        is_trust_linked = peer.invited_by == user.id or user.invited_by == peer.id
        score = 50 + shared * 15 + (10 if is_trust_linked else 0)
        results.append({
            "user_id": peer.id,
            "nickname": peer.nickname,
            "avatar_config": peer.avatar_config,
            "shared_circles": shared,
            "trust_linked": is_trust_linked,
            "score": min(score, 99),
        })

    results.sort(key=lambda r: r["score"], reverse=True)
    return results


@router.get("/compatibility/{user_id}")
async def get_compatibility(
    user_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    peer = db.query(User).filter(User.id == user_id).first()
    if not peer:
        return {"user_id": user_id, "score": 0, "shared_circles": 0}

    my_circles = {
        m.circle_id
        for m in db.query(CircleMember.circle_id).filter(CircleMember.user_id == user.id).all()
    }
    peer_circles = {
        m.circle_id
        for m in db.query(CircleMember.circle_id).filter(CircleMember.user_id == user_id).all()
    }
    shared = len(my_circles & peer_circles)

    return {
        "user_id": user_id,
        "nickname": peer.nickname,
        "score": min(50 + shared * 15, 95),
        "shared_circles": shared,
    }
