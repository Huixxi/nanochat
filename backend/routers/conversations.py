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

    # Broadcast via socket for real-time delivery to other participants
    try:
        from main import sio
        msg_data = {
            "conversation_id": conversation_id,
            "sender_id": user.id,
            "sender_name": user.nickname,
            "content": msg.content,
            "type": msg.msg_type,
            "id": msg.id,
            "created_at": msg.created_at.isoformat() if msg.created_at else None,
        }
        await sio.emit("new_message", msg_data, room=conversation_id)
    except Exception:
        pass

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
