import uuid
from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, ForeignKey, func
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import relationship
from .database import Base


class PlazaSnippet(Base):
    __tablename__ = "plaza_snippets"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    author_a_id = Column(String, ForeignKey("users.id"), nullable=True)
    author_b_id = Column(String, ForeignKey("users.id"), nullable=True)
    topic = Column(String(100), nullable=True)
    messages = Column(JSON, default=list)
    likes_count = Column(Integer, default=0)
    featured = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    likes = relationship("PlazaSnippetLike", back_populates="snippet")


class PlazaSnippetLike(Base):
    __tablename__ = "plaza_snippet_likes"

    snippet_id = Column(String, ForeignKey("plaza_snippets.id"), primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    created_at = Column(DateTime, server_default=func.now())

    snippet = relationship("PlazaSnippet", back_populates="likes")


class WeeklyTopic(Base):
    __tablename__ = "weekly_topics"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    question = Column(Text, nullable=False)
    active = Column(Boolean, default=True)
    participants_count = Column(Integer, default=0)
    week_start = Column(DateTime, server_default=func.now())
    created_at = Column(DateTime, server_default=func.now())
