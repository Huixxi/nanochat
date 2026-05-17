import uuid
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from .database import Base


class Circle(Base):
    __tablename__ = "circles"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    code_name = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    category = Column(String(20), default="interest")  # profession | interest | alumni
    color = Column(String(10), default="#a1a1aa")
    icon = Column(String(10), nullable=True)
    member_count = Column(Integer, default=0)
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    members = relationship("CircleMember", back_populates="circle")
    posts = relationship("CirclePost", back_populates="circle", order_by="CirclePost.created_at.desc()")


class CircleMember(Base):
    __tablename__ = "circle_members"

    circle_id = Column(String, ForeignKey("circles.id"), primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    role = Column(String(10), default="member")  # admin | member
    joined_at = Column(DateTime, server_default=func.now())

    circle = relationship("Circle", back_populates="members")


class CirclePost(Base):
    __tablename__ = "circle_posts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    circle_id = Column(String, ForeignKey("circles.id"), nullable=False)
    author_id = Column(String, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    likes_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())

    circle = relationship("Circle", back_populates="posts")
    likes = relationship("CirclePostLike", back_populates="post")


class CirclePostLike(Base):
    __tablename__ = "circle_post_likes"

    post_id = Column(String, ForeignKey("circle_posts.id"), primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    created_at = Column(DateTime, server_default=func.now())

    post = relationship("CirclePost", back_populates="likes")
