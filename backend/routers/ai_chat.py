from __future__ import annotations
from typing import Optional, List
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from models.database import get_db
from services.chat import (
    AI_PERSONAS,
    stream_ai_response,
    save_message,
    create_ai_conversation,
    generate_impression,
)

router = APIRouter()


class ChatRequest(BaseModel):
    persona_id: str
    message: str
    conversation_id: Optional[str] = None
    history: List[dict] = []


class CreateAIChatRequest(BaseModel):
    persona_id: str
    user_id: str


class ImpressionRequest(BaseModel):
    answers: dict = {}


@router.get("/personas")
async def list_ai_personas():
    return [
        {"id": k, "name": v["name"], "greeting": v["greeting"]}
        for k, v in AI_PERSONAS.items()
    ]


@router.post("/conversations")
async def create_ai_chat(req: CreateAIChatRequest, db: Session = Depends(get_db)):
    persona = AI_PERSONAS.get(req.persona_id)
    if not persona:
        return {"error": "Unknown persona"}

    conv = create_ai_conversation(db, req.user_id, req.persona_id)
    save_message(db, conv.id, None, persona["greeting"], "text")

    return {
        "conversation_id": conv.id,
        "persona_id": req.persona_id,
        "persona_name": persona["name"],
        "greeting": persona["greeting"],
    }


@router.post("/chat")
async def chat_with_ai(req: ChatRequest, db: Session = Depends(get_db)):
    if req.conversation_id:
        save_message(db, req.conversation_id, "user", req.message)

    return StreamingResponse(
        stream_ai_response(req.persona_id, req.message, req.history),
        media_type="application/x-ndjson",
        headers={"X-Content-Type-Options": "nosniff"},
    )


@router.post("/impression")
async def get_impression(req: ImpressionRequest):
    text = await generate_impression(req.answers)
    return {"impression": text}


@router.post("/chat/sync")
async def chat_sync(req: ChatRequest, db: Session = Depends(get_db)):
    """Non-streaming version for simple testing."""
    full_response = ""
    async for chunk in stream_ai_response(req.persona_id, req.message, req.history):
        import json
        try:
            data = json.loads(chunk)
            if "token" in data:
                full_response += data["token"]
        except:
            pass

    if req.conversation_id:
        save_message(db, req.conversation_id, "user", req.message)
        save_message(db, req.conversation_id, None, full_response)

    return {"response": full_response, "persona_id": req.persona_id}


class SuggestReplyRequest(BaseModel):
    messages: List[dict] = []


@router.post("/suggest-reply")
async def suggest_reply(req: SuggestReplyRequest):
    """Generate a suggested reply based on conversation context."""
    from services.chat import AI_PROVIDER, AI_API_KEY, AI_MODEL, AI_MODEL_CLOUD, AI_API_BASE, OLLAMA_URL
    import json as _json
    import httpx

    system_prompt = (
        "你正在帮用户在社交对话中回复对方。根据对话上下文，生成一条自然、简短（1-2句）的回复。"
        "匹配对话的语气和深度，像朋友之间聊天一样。只输出回复内容，不要加引号、不要解释。"
    )

    messages = [{"role": "system", "content": system_prompt}]
    for msg in req.messages[-10:]:
        messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})

    if AI_PROVIDER == "openai" and AI_API_KEY:
        headers = {"Authorization": f"Bearer {AI_API_KEY}", "Content-Type": "application/json"}
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    f"{AI_API_BASE}/chat/completions",
                    headers=headers,
                    json={"model": AI_MODEL_CLOUD, "messages": messages, "max_tokens": 100, "temperature": 0.8},
                )
                data = response.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                return {"reply": content.strip()}
            except Exception:
                return {"reply": ""}
    else:
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    f"{OLLAMA_URL}/api/chat",
                    json={"model": AI_MODEL, "messages": messages, "stream": False, "options": {"num_predict": 100, "temperature": 0.8}},
                )
                data = response.json()
                content = data.get("message", {}).get("content", "")
                return {"reply": content.strip()}
            except Exception:
                return {"reply": ""}
