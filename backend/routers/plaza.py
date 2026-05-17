from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session
from pydantic import BaseModel
from models.database import get_db
from models.plaza import PlazaSnippet, PlazaSnippetLike, WeeklyTopic
from models.user import User
from services.auth import get_current_user, get_optional_user

router = APIRouter()


class CreateSnippet(BaseModel):
    topic: Optional[str] = None
    messages: list = []


@router.get("/snippets")
async def list_snippets(
    page: int = 1,
    limit: int = 10,
    user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    offset = (max(1, page) - 1) * limit
    snippets = (
        db.query(PlazaSnippet)
        .order_by(desc(PlazaSnippet.likes_count), desc(PlazaSnippet.created_at))
        .offset(offset)
        .limit(min(limit, 50))
        .all()
    )

    liked_ids = set()
    if user:
        ids = [s.id for s in snippets]
        if ids:
            likes = db.query(PlazaSnippetLike.snippet_id).filter(
                PlazaSnippetLike.snippet_id.in_(ids),
                PlazaSnippetLike.user_id == user.id,
            ).all()
            liked_ids = {l.snippet_id for l in likes}

    result = []
    for s in snippets:
        author_a = db.query(User).filter(User.id == s.author_a_id).first() if s.author_a_id else None
        author_b = db.query(User).filter(User.id == s.author_b_id).first() if s.author_b_id else None
        result.append({
            "id": s.id,
            "topic": s.topic,
            "messages": s.messages or [],
            "likes_count": s.likes_count,
            "liked": s.id in liked_ids,
            "featured": s.featured,
            "author_a": {
                "nickname": author_a.nickname if author_a else "匿名A",
                "avatar_config": author_a.avatar_config if author_a else {},
            },
            "author_b": {
                "nickname": author_b.nickname if author_b else "匿名B",
                "avatar_config": author_b.avatar_config if author_b else {},
            },
            "created_at": s.created_at.isoformat() if s.created_at else None,
        })
    return result


@router.post("/snippets/{snippet_id}/like")
async def like_snippet(
    snippet_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    snippet = db.query(PlazaSnippet).filter(PlazaSnippet.id == snippet_id).first()
    if not snippet:
        raise HTTPException(status_code=404, detail="Snippet not found")

    existing = db.query(PlazaSnippetLike).filter(
        PlazaSnippetLike.snippet_id == snippet_id,
        PlazaSnippetLike.user_id == user.id,
    ).first()

    if existing:
        db.delete(existing)
        snippet.likes_count = max(0, (snippet.likes_count or 0) - 1)
        db.commit()
        return {"liked": False, "likes_count": snippet.likes_count}
    else:
        db.add(PlazaSnippetLike(snippet_id=snippet_id, user_id=user.id))
        snippet.likes_count = (snippet.likes_count or 0) + 1
        db.commit()
        return {"liked": True, "likes_count": snippet.likes_count}


@router.get("/topics")
async def list_topics(db: Session = Depends(get_db)):
    topics = (
        db.query(WeeklyTopic)
        .filter(WeeklyTopic.active == True)
        .order_by(desc(WeeklyTopic.participants_count))
        .limit(10)
        .all()
    )
    return [
        {
            "id": t.id,
            "question": t.question,
            "participants_count": t.participants_count,
            "active": t.active,
        }
        for t in topics
    ]


@router.post("/topics/{topic_id}/join")
async def join_topic(
    topic_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    topic = db.query(WeeklyTopic).filter(WeeklyTopic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    topic.participants_count = (topic.participants_count or 0) + 1
    db.commit()
    return {"participants_count": topic.participants_count}
