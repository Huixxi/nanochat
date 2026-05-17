from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session
from pydantic import BaseModel
from models.database import get_db
from models.circle import Circle, CircleMember, CirclePost, CirclePostLike
from models.user import User
from services.auth import get_current_user, get_optional_user

router = APIRouter()


class CreateCircle(BaseModel):
    name: str
    code_name: Optional[str] = None
    description: Optional[str] = None
    category: str = "interest"
    color: str = "#a1a1aa"
    icon: Optional[str] = None


class CreatePost(BaseModel):
    content: str


@router.post("")
async def create_circle(
    req: CreateCircle,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    circle = Circle(
        name=req.name,
        code_name=req.code_name,
        description=req.description,
        category=req.category,
        color=req.color,
        icon=req.icon,
        created_by=user.id,
        member_count=1,
    )
    db.add(circle)
    db.flush()
    db.add(CircleMember(circle_id=circle.id, user_id=user.id, role="admin"))
    db.commit()
    db.refresh(circle)
    return {"id": circle.id, "name": circle.name, "member_count": 1}


@router.get("")
async def list_circles(
    category: Optional[str] = None,
    user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    query = db.query(Circle)
    if category:
        query = query.filter(Circle.category == category)
    circles = query.order_by(desc(Circle.member_count)).limit(50).all()

    user_circle_ids = set()
    if user:
        memberships = db.query(CircleMember.circle_id).filter(CircleMember.user_id == user.id).all()
        user_circle_ids = {m.circle_id for m in memberships}

    return [
        {
            "id": c.id,
            "name": c.name,
            "code_name": c.code_name,
            "description": c.description,
            "category": c.category,
            "color": c.color,
            "icon": c.icon,
            "member_count": c.member_count,
            "joined": c.id in user_circle_ids,
        }
        for c in circles
    ]


@router.get("/{circle_id}")
async def get_circle(
    circle_id: str,
    user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    circle = db.query(Circle).filter(Circle.id == circle_id).first()
    if not circle:
        raise HTTPException(status_code=404, detail="Circle not found")

    members = (
        db.query(User)
        .join(CircleMember, CircleMember.user_id == User.id)
        .filter(CircleMember.circle_id == circle_id)
        .limit(20)
        .all()
    )

    is_member = False
    if user:
        is_member = db.query(CircleMember).filter(
            CircleMember.circle_id == circle_id,
            CircleMember.user_id == user.id,
        ).first() is not None

    return {
        "id": circle.id,
        "name": circle.name,
        "code_name": circle.code_name,
        "description": circle.description,
        "category": circle.category,
        "color": circle.color,
        "icon": circle.icon,
        "member_count": circle.member_count,
        "joined": is_member,
        "members": [
            {"user_id": m.id, "nickname": m.nickname, "avatar_config": m.avatar_config}
            for m in members
        ],
    }


@router.post("/{circle_id}/join")
async def join_circle(
    circle_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    circle = db.query(Circle).filter(Circle.id == circle_id).first()
    if not circle:
        raise HTTPException(status_code=404, detail="Circle not found")

    existing = db.query(CircleMember).filter(
        CircleMember.circle_id == circle_id,
        CircleMember.user_id == user.id,
    ).first()
    if existing:
        return {"message": "Already a member"}

    db.add(CircleMember(circle_id=circle_id, user_id=user.id))
    circle.member_count = (circle.member_count or 0) + 1
    db.commit()
    return {"message": "Joined", "member_count": circle.member_count}


@router.post("/{circle_id}/leave")
async def leave_circle(
    circle_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = db.query(CircleMember).filter(
        CircleMember.circle_id == circle_id,
        CircleMember.user_id == user.id,
    ).first()
    if not membership:
        raise HTTPException(status_code=400, detail="Not a member")

    circle = db.query(Circle).filter(Circle.id == circle_id).first()
    db.delete(membership)
    if circle:
        circle.member_count = max(0, (circle.member_count or 0) - 1)
    db.commit()
    return {"message": "Left"}


@router.get("/{circle_id}/posts")
async def get_posts(
    circle_id: str,
    before: Optional[str] = None,
    limit: int = 20,
    user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    query = db.query(CirclePost).filter(CirclePost.circle_id == circle_id)

    if before:
        ref = db.query(CirclePost).filter(CirclePost.id == before).first()
        if ref:
            query = query.filter(CirclePost.created_at < ref.created_at)

    posts = query.order_by(desc(CirclePost.created_at)).limit(min(limit, 50)).all()

    liked_ids = set()
    if user:
        post_ids = [p.id for p in posts]
        if post_ids:
            likes = db.query(CirclePostLike.post_id).filter(
                CirclePostLike.post_id.in_(post_ids),
                CirclePostLike.user_id == user.id,
            ).all()
            liked_ids = {l.post_id for l in likes}

    result = []
    for p in posts:
        author = db.query(User).filter(User.id == p.author_id).first()
        result.append({
            "id": p.id,
            "content": p.content,
            "likes_count": p.likes_count,
            "liked": p.id in liked_ids,
            "author": {
                "user_id": author.id if author else None,
                "nickname": author.nickname if author else "匿名",
                "avatar_config": author.avatar_config if author else {},
            },
            "created_at": p.created_at.isoformat() if p.created_at else None,
        })
    return result


@router.post("/{circle_id}/posts")
async def create_post(
    circle_id: str,
    req: CreatePost,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = db.query(CircleMember).filter(
        CircleMember.circle_id == circle_id,
        CircleMember.user_id == user.id,
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Must join the circle first")

    post = CirclePost(circle_id=circle_id, author_id=user.id, content=req.content)
    db.add(post)
    db.commit()
    db.refresh(post)
    return {
        "id": post.id,
        "content": post.content,
        "created_at": post.created_at.isoformat() if post.created_at else None,
    }


@router.post("/posts/{post_id}/like")
async def like_post(
    post_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.query(CirclePost).filter(CirclePost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    existing = db.query(CirclePostLike).filter(
        CirclePostLike.post_id == post_id,
        CirclePostLike.user_id == user.id,
    ).first()

    if existing:
        db.delete(existing)
        post.likes_count = max(0, (post.likes_count or 0) - 1)
        db.commit()
        return {"liked": False, "likes_count": post.likes_count}
    else:
        db.add(CirclePostLike(post_id=post_id, user_id=user.id))
        post.likes_count = (post.likes_count or 0) + 1
        db.commit()
        return {"liked": True, "likes_count": post.likes_count}
