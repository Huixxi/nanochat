import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import relationship
from .database import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    type = Column(String(10), default="direct")  # direct | group | ai
    ai_persona = Column(String(50), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    members = relationship("ConversationMember", back_populates="conversation")
    messages = relationship("Message", back_populates="conversation", order_by="Message.created_at")


class ConversationMember(Base):
    __tablename__ = "conversation_members"

    conversation_id = Column(String, ForeignKey("conversations.id"), primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    joined_at = Column(DateTime, server_default=func.now())
    last_read_count = Column(Integer, default=0)

    conversation = relationship("Conversation", back_populates="members")
