import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, func
from .database import Base


class Insight(Base):
    __tablename__ = "insights"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False, unique=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
