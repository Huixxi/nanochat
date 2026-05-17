from sqlalchemy import Column, String, DateTime, Text, ForeignKey, func
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import relationship
from .database import Base


class Persona(Base):
    __tablename__ = "personas"

    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    answers = Column(JSON, default=dict)
    summary = Column(Text, nullable=True)
    tags = Column(JSON, default=list)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="persona")
