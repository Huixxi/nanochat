import re
import base64
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

SEXUAL_PATTERNS = [
    b'g+e/gA==', b'5aaT5aWz', b'5LiK5bqK', b'57qm54iu', b'5byA5oi/',
    b'6KOk5L2T', b'6Imy5oOF', b'6buE54mH', b'5YGa54ix', b'6IOW5LiL',
    b'6Imy5q+N', b'c2V4', b'bnVkZQ==', b'cG9ybg==',
]

POLITICAL_PATTERNS = [
    b'5YWt5Zub', b'5q+b5rO95Lic', b'5paH6Z2p', b'5rOV6L2u5Yqf',
    b'5YWx5Lqn5YWa', b'5rSq56eR', b'5Y+N5YWx',
]

VIOLENT_PATTERNS = [
    b'5p2A5Lq6', b'5pq06Kqo', b'54K45by5', b'c3VpY2lkZQ==',
    b'6Ieq5p2A',
]

SPAM_PATTERNS = [
    b'5Yqg5b6u5L+h', b'V2VDaGF0', b'5LqM57u0', b'5YWN6LS5',
    b'6LWa6ZKx',
]


def _decode_patterns(encoded: list[bytes]) -> list[str]:
    result = []
    for b in encoded:
        try:
            result.append(base64.b64decode(b).decode("utf-8"))
        except Exception:
            pass
    return result


DECODED = {
    "sexual": _decode_patterns(SEXUAL_PATTERNS),
    "political": _decode_patterns(POLITICAL_PATTERNS),
    "violent": _decode_patterns(VIOLENT_PATTERNS),
    "spam": _decode_patterns(SPAM_PATTERNS),
}

REASON_MESSAGES = {
    "sexual": "消息包含不当内容，请注意文明用语",
    "political": "消息包含敏感内容，请修改后重试",
    "violent": "消息包含暴力相关内容，请修改",
    "spam": "消息疑似广告或诈骗信息，请确认",
}


def _normalize(text: str) -> str:
    return re.sub(r"[\s​‌‍﻿，。！？、；：""''【】（）《》…—·\-_.!?,;:'\"()\[\]{}]", "", text.lower())


def check_content(text: str) -> dict:
    if not text or not text.strip():
        return {"safe": True}

    norm = _normalize(text)
    for reason, patterns in DECODED.items():
        for p in patterns:
            np = _normalize(p)
            if np and np in norm:
                return {"safe": False, "reason": reason, "message": REASON_MESSAGES[reason]}

    return {"safe": True}


class ModerationRequest(BaseModel):
    content: str


@router.post("/check")
async def check(req: ModerationRequest):
    return check_content(req.content)
