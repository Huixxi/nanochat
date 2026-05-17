import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, func
from .database import Base


class Invitation(Base):
    __tablename__ = "invitations"

    code = Column(String(8), primary_key=True, default=lambda: uuid.uuid4().hex[:8].upper())
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    used_by = Column(String, ForeignKey("users.id"), nullable=True)
    used_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
