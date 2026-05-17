"""Seed the database with initial data: circles, weekly topics, system invite codes."""
from models.database import Base, engine, SessionLocal
from models.circle import Circle
from models.plaza import WeeklyTopic
from models.invitation import Invitation

Base.metadata.create_all(bind=engine)

SEED_CIRCLES = [
    {
        "id": "teacher",
        "name": "教师圈",
        "code_name": "人类灵魂工程师联盟",
        "icon": "\U0001F4DA",
        "description": "分享教学日常，吐槽批改作业",
        "member_count": 0,
        "category": "profession",
        "color": "#a1a1aa",
    },
    {
        "id": "mom",
        "name": "宝妈圈",
        "code_name": "带娃修仙团",
        "icon": "\U0001F37C",
        "description": "育儿经验交流，一起渡劫",
        "member_count": 0,
        "category": "profession",
        "color": "#d4d4d8",
    },
    {
        "id": "finance",
        "name": "金融圈",
        "code_name": "韭菜互助会",
        "icon": "\U0001F4B0",
        "description": "市场分析，投资心得，亏损互慰",
        "member_count": 0,
        "category": "profession",
        "color": "#71717a",
    },
    {
        "id": "reading",
        "name": "读书会",
        "code_name": None,
        "icon": "\U0001F4D6",
        "description": "一起读，一起聊",
        "member_count": 0,
        "category": "interest",
        "color": "#a1a1aa",
    },
    {
        "id": "night-owl",
        "name": "夜猫子俱乐部",
        "code_name": None,
        "icon": "\U0001F989",
        "description": "深夜不打烊的对话站",
        "member_count": 0,
        "category": "interest",
        "color": "#52525b",
    },
    {
        "id": "foodie",
        "name": "吃货联盟",
        "code_name": None,
        "icon": "\U0001F35C",
        "description": "分享美食，拒绝减肥",
        "member_count": 0,
        "category": "interest",
        "color": "#d4d4d8",
    },
]

SEED_TOPICS = [
    {"id": "t1", "question": "如果可以瞬间掌握一项技能，你会选什么？", "participants_count": 0},
    {"id": "t2", "question": "你做过最好的决定是什么？", "participants_count": 0},
    {"id": "t3", "question": "有没有一本书彻底改变了你的想法？", "participants_count": 0},
]


def seed():
    db = SessionLocal()
    try:
        # Circles
        for c in SEED_CIRCLES:
            existing = db.query(Circle).filter(Circle.id == c["id"]).first()
            if not existing:
                db.add(Circle(**c))
                print(f"  + Circle: {c['name']}")

        # Weekly topics
        for t in SEED_TOPICS:
            existing = db.query(WeeklyTopic).filter(WeeklyTopic.id == t["id"]).first()
            if not existing:
                db.add(WeeklyTopic(**t))
                print(f"  + Topic: {t['question'][:30]}...")

        # System invite codes (for first users)
        for code in ["UCHAT001", "UCHAT002", "UCHAT003", "UCHATDEV"]:
            existing = db.query(Invitation).filter(Invitation.code == code).first()
            if not existing:
                db.add(Invitation(code=code, created_by="system"))
                print(f"  + Invite: {code}")

        db.commit()
        print("\nSeed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    print("Seeding database...")
    seed()
