import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, func
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    nickname = Column(String(50), nullable=False, unique=True)
    phone = Column(String(20), unique=True, nullable=True)
    avatar_config = Column(JSON, default=dict)
    invite_code = Column(String(8), unique=True)
    invited_by = Column(String, ForeignKey("users.id"), nullable=True)
    hashed_password = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    persona = relationship("Persona", back_populates="user", uselist=False)
    inviter = relationship("User", remote_side=[id])
