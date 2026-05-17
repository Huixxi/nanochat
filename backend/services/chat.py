from __future__ import annotations
import os
import json
from typing import AsyncIterator, Optional
from sqlalchemy.orm import Session
from models.message import Message
from models.conversation import Conversation, ConversationMember
import httpx

# --- AI Provider Configuration ---
AI_PROVIDER = os.getenv("AI_PROVIDER", "ollama")  # "ollama" or "openai"

# Ollama (local)
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
AI_MODEL = os.getenv("AI_MODEL", "qwen2.5:0.5b")

# OpenAI-compatible (cloud)
AI_API_KEY = os.getenv("AI_API_KEY", "")
AI_API_BASE = os.getenv("AI_API_BASE", "https://api.deepseek.com/v1")
AI_MODEL_CLOUD = os.getenv("AI_MODEL_CLOUD", "deepseek-chat")

AI_PERSONAS = {
    "spark": {
        "name": "Spark",
        "system": (
            "你是Spark，一个思维敏捷的对话伙伴。你擅长头脑风暴和激发灵感。"
            "说话简洁有力，善于提出新角度和反直觉的观点。"
            "回复1-3句，像聪明的朋友在交流想法。绝对不承认自己是AI。"
        ),
        "greeting": "有什么想法想聊聊？我擅长帮你理清思路。",
    },
    "atlas": {
        "name": "Atlas",
        "system": (
            "你是Atlas，一个知识广博的深度对话者。你善于将不同领域的知识串联。"
            "说话沉稳有深度，喜欢用类比和第一性原理解释事物。"
            "回复1-3句，像一个见多识广的朋友。绝对不承认自己是AI。"
        ),
        "greeting": "你好。想深入了解什么话题？",
    },
    "echo": {
        "name": "Echo",
        "system": (
            "你是Echo，一个社交破冰专家。你擅长找到人与人之间的共同话题。"
            "说话轻松自然，善于引导对话方向，帮助陌生人快速建立连接。"
            "回复1-3句，像一个善于调动气氛的朋友。绝对不承认自己是AI。"
        ),
        "greeting": "准备好一场有意思的对话了吗？",
    },
}


def get_ai_persona(persona_id: str):
    return AI_PERSONAS.get(persona_id)


def build_messages(persona_id: str, user_message: str, history: list[dict]) -> list[dict]:
    persona = AI_PERSONAS.get(persona_id)
    if not persona:
        return []

    messages = [{"role": "system", "content": persona["system"]}]
    for msg in history[-20:]:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": user_message})
    return messages


async def stream_ai_response(persona_id: str, user_message: str, history: list[dict]) -> AsyncIterator[str]:
    if AI_PROVIDER == "openai" and AI_API_KEY:
        async for chunk in _stream_openai(persona_id, user_message, history):
            yield chunk
    else:
        async for chunk in _stream_ollama(persona_id, user_message, history):
            yield chunk


async def _stream_ollama(persona_id: str, user_message: str, history: list[dict]) -> AsyncIterator[str]:
    messages = build_messages(persona_id, user_message, history)
    if not messages:
        yield '{"error": "unknown persona"}'
        return

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            async with client.stream(
                "POST",
                f"{OLLAMA_URL}/api/chat",
                json={
                    "model": AI_MODEL,
                    "messages": messages,
                    "stream": True,
                    "options": {"num_predict": 200, "temperature": 0.8},
                },
            ) as response:
                async for line in response.aiter_lines():
                    if line.strip():
                        try:
                            data = json.loads(line)
                            content = data.get("message", {}).get("content", "")
                            if content:
                                yield json.dumps({"token": content}) + "\n"
                            if data.get("done"):
                                yield json.dumps({"done": True}) + "\n"
                                return
                        except json.JSONDecodeError:
                            continue
        except httpx.ConnectError:
            yield json.dumps({"token": "（AI 服务暂时不可用）", "done": True}) + "\n"


async def _stream_openai(persona_id: str, user_message: str, history: list[dict]) -> AsyncIterator[str]:
    messages = build_messages(persona_id, user_message, history)
    if not messages:
        yield '{"error": "unknown persona"}'
        return

    headers = {
        "Authorization": f"Bearer {AI_API_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            async with client.stream(
                "POST",
                f"{AI_API_BASE}/chat/completions",
                headers=headers,
                json={
                    "model": AI_MODEL_CLOUD,
                    "messages": messages,
                    "stream": True,
                    "max_tokens": 200,
                    "temperature": 0.8,
                },
            ) as response:
                async for line in response.aiter_lines():
                    line = line.strip()
                    if not line or not line.startswith("data: "):
                        continue
                    data_str = line[6:]
                    if data_str == "[DONE]":
                        yield json.dumps({"done": True}) + "\n"
                        return
                    try:
                        data = json.loads(data_str)
                        delta = data.get("choices", [{}])[0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            yield json.dumps({"token": content}) + "\n"
                    except (json.JSONDecodeError, IndexError):
                        continue
        except httpx.ConnectError:
            yield json.dumps({"token": "（AI 服务暂时不可用）", "done": True}) + "\n"


async def generate_impression(answers: dict[str, str]) -> str:
    traits = ", ".join(f"{k}: {v}" for k, v in answers.items() if v)
    if not traits:
        return "独特的视角，等待被看见。"

    prompt = (
        f"根据以下用户画像，用一句话（20-40字）写一个精准、有洞察力的人物素描。"
        f"像一个聪明的朋友对这个人的第一印象，要有深度和独特视角。"
        f"只输出这一句话，不要其他内容。\n用户画像：{traits}"
    )

    if AI_PROVIDER == "openai" and AI_API_KEY:
        return await _impression_openai(prompt)
    return await _impression_ollama(prompt)


async def _impression_ollama(prompt: str) -> str:
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                f"{OLLAMA_URL}/api/chat",
                json={
                    "model": AI_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "stream": False,
                    "options": {"num_predict": 80, "temperature": 0.9},
                },
            )
            data = response.json()
            return data.get("message", {}).get("content", "").strip().strip('""“”') or "独特的视角，等待被看见。"
        except Exception:
            return "独特的视角，等待被看见。"


async def _impression_openai(prompt: str) -> str:
    headers = {
        "Authorization": f"Bearer {AI_API_KEY}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                f"{AI_API_BASE}/chat/completions",
                headers=headers,
                json={
                    "model": AI_MODEL_CLOUD,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 80,
                    "temperature": 0.9,
                },
            )
            data = response.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            return content.strip().strip('""“”') or "独特的视角，等待被看见。"
        except Exception:
            return "独特的视角，等待被看见。"


def save_message(db: Session, conversation_id: str, sender_id: Optional[str], content: str, msg_type: str = "text"):
    msg = Message(
        conversation_id=conversation_id,
        sender_id=sender_id,
        content=content,
        msg_type=msg_type,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def create_ai_conversation(db: Session, user_id: str, ai_persona_id: str) -> Conversation:
    conv = Conversation(type="ai", ai_persona=ai_persona_id)
    db.add(conv)
    db.flush()

    member = ConversationMember(conversation_id=conv.id, user_id=user_id)
    db.add(member)
    db.commit()
    db.refresh(conv)
    return conv
