from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, desc
from sqlalchemy.orm import Session
from pydantic import BaseModel
from models.database import get_db
from models.conversation import Conversation, ConversationMember
from models.message import Message
from models.user import User
from models.insight import Insight
from services.auth import get_current_user

router = APIRouter()


class CreateConversation(BaseModel):
    type: str = "direct"
    participant_id: Optional[str] = None
    peer_id: Optional[str] = None
    ai_persona: Optional[str] = None


class MarkRead(BaseModel):
    pass


@router.get("")
async def list_conversations(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    memberships = (
        db.query(ConversationMember)
        .filter(ConversationMember.user_id == user.id)
        .all()
    )

    results = []
    for membership in memberships:
        conv = db.query(Conversation).filter(Conversation.id == membership.conversation_id).first()
        if not conv:
            continue

        total_msg_count = db.query(func.count(Message.id)).filter(
            Message.conversation_id == conv.id
        ).scalar() or 0

        unread = max(0, total_msg_count - (membership.last_read_count or 0))

        last_msg = (
            db.query(Message)
            .filter(Message.conversation_id == conv.id)
            .order_by(desc(Message.created_at))
            .first()
        )

        peer_info = None
        if conv.type == "direct":
            peer_member = (
                db.query(ConversationMember)
                .filter(
                    ConversationMember.conversation_id == conv.id,
                    ConversationMember.user_id != user.id,
                )
                .first()
            )
            if peer_member:
                peer = db.query(User).filter(User.id == peer_member.user_id).first()
                if peer:
                    peer_info = {
                        "user_id": peer.id,
                        "nickname": peer.nickname,
                        "avatar_config": peer.avatar_config,
                    }

        results.append({
            "id": conv.id,
            "type": conv.type,
            "ai_persona": conv.ai_persona,
            "unread": unread,
            "last_message": {
                "content": last_msg.content,
                "sender_id": last_msg.sender_id,
                "created_at": last_msg.created_at.isoformat() if last_msg.created_at else None,
            } if last_msg else None,
            "peer": peer_info,
            "created_at": conv.created_at.isoformat() if conv.created_at else None,
        })

    results.sort(key=lambda c: c["last_message"]["created_at"] if c.get("last_message") else "", reverse=True)
    return results


@router.post("")
async def create_conversation(
    req: CreateConversation,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_id = req.participant_id or req.peer_id
    if req.type == "direct" and target_id:
        existing = (
            db.query(Conversation)
            .join(ConversationMember, Conversation.id == ConversationMember.conversation_id)
            .filter(
                Conversation.type == "direct",
                ConversationMember.user_id == user.id,
            )
            .all()
        )
        for conv in existing:
            peer = (
                db.query(ConversationMember)
                .filter(
                    ConversationMember.conversation_id == conv.id,
                    ConversationMember.user_id == target_id,
                )
                .first()
            )
            if peer:
                return {"conversation_id": conv.id, "type": conv.type, "existing": True}

    conv = Conversation(type=req.type, ai_persona=req.ai_persona)
    db.add(conv)
    db.flush()

    db.add(ConversationMember(conversation_id=conv.id, user_id=user.id))
    if target_id:
        db.add(ConversationMember(conversation_id=conv.id, user_id=target_id))

    db.commit()
    db.refresh(conv)
    return {"conversation_id": conv.id, "type": conv.type, "existing": False}


@router.get("/{conversation_id}/messages")
async def get_messages(
    conversation_id: str,
    before: Optional[str] = None,
    limit: int = 30,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == user.id,
        )
        .first()
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this conversation")

    query = db.query(Message).filter(Message.conversation_id == conversation_id)

    if before:
        ref_msg = db.query(Message).filter(Message.id == before).first()
        if ref_msg:
            query = query.filter(Message.created_at < ref_msg.created_at)

    messages = query.order_by(desc(Message.created_at)).limit(min(limit, 100)).all()
    messages.reverse()

    return [
        {
            "id": m.id,
            "sender_id": m.sender_id,
            "content": m.content,
            "type": m.msg_type,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in messages
    ]


class SendMessage(BaseModel):
    content: str
    type: str = "text"


@router.post("/{conversation_id}/messages")
async def send_message(
    conversation_id: str,
    req: SendMessage,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == user.id,
        )
        .first()
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this conversation")

    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Empty message")

    msg = Message(
        conversation_id=conversation_id,
        sender_id=user.id,
        content=req.content.strip(),
        msg_type=req.type,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    return {
        "id": msg.id,
        "sender_id": msg.sender_id,
        "content": msg.content,
        "type": msg.msg_type,
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
    }


@router.post("/{conversation_id}/read")
async def mark_read(
    conversation_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == user.id,
        )
        .first()
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member")

    total = db.query(func.count(Message.id)).filter(
        Message.conversation_id == conversation_id
    ).scalar() or 0

    membership.last_read_count = total
    db.commit()
    return {"read_count": total}


@router.post("/{conversation_id}/insight")
async def generate_insight(
    conversation_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == user.id,
        )
        .first()
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member")

    existing = db.query(Insight).filter(Insight.conversation_id == conversation_id).first()
    if existing:
        return {"id": existing.id, "content": existing.content, "created_at": existing.created_at.isoformat() if existing.created_at else None}

    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id, Message.msg_type == "text")
        .order_by(Message.created_at)
        .all()
    )
    if len(messages) < 6:
        raise HTTPException(status_code=400, detail="对话还不够深入，至少需要6条消息")

    members = db.query(ConversationMember).filter(ConversationMember.conversation_id == conversation_id).all()
    user_ids = {m.user_id for m in members}
    names = {}
    for uid in user_ids:
        u = db.query(User).filter(User.id == uid).first()
        if u:
            names[uid] = u.nickname or "用户"

    dialogue = ""
    for m in messages[-20:]:
        name = names.get(m.sender_id, "用户")
        dialogue += f"{name}：{m.content}\n"

    prompt = (
        f"分析以下两人的对话，提炼出一条他们的共识或有趣的思维碰撞点。"
        f"用一句话（20-50字），格式为'你们都认为：...'或'一个有趣的分歧：...'或'你们共同发现：...'。"
        f"只输出这一句话，不要其他内容。\n\n{dialogue}"
    )

    import httpx
    from services.chat import AI_PROVIDER, AI_API_KEY, AI_MODEL, AI_MODEL_CLOUD, AI_API_BASE, OLLAMA_URL

    content = ""
    if AI_PROVIDER == "openai" and AI_API_KEY:
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                resp = await client.post(
                    f"{AI_API_BASE}/chat/completions",
                    headers={"Authorization": f"Bearer {AI_API_KEY}", "Content-Type": "application/json"},
                    json={"model": AI_MODEL_CLOUD, "messages": [{"role": "user", "content": prompt}], "max_tokens": 100, "temperature": 0.8},
                )
                data = resp.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
            except Exception:
                pass
    else:
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                resp = await client.post(
                    f"{OLLAMA_URL}/api/chat",
                    json={"model": AI_MODEL, "messages": [{"role": "user", "content": prompt}], "stream": False, "options": {"num_predict": 100, "temperature": 0.8}},
                )
                data = resp.json()
                content = data.get("message", {}).get("content", "").strip()
            except Exception:
                pass

    if not content:
        content = "一次有深度的思想碰撞。"

    insight = Insight(conversation_id=conversation_id, content=content)
    db.add(insight)
    db.commit()
    db.refresh(insight)

    return {
        "id": insight.id,
        "content": insight.content,
        "created_at": insight.created_at.isoformat() if insight.created_at else None,
    }


@router.get("/{conversation_id}/insight")
async def get_insight(
    conversation_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == user.id,
        )
        .first()
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member")

    existing = db.query(Insight).filter(Insight.conversation_id == conversation_id).first()
    if not existing:
        return None

    return {
        "id": existing.id,
        "content": existing.content,
        "created_at": existing.created_at.isoformat() if existing.created_at else None,
    }
