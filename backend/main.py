import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import socketio

from routers import auth, users, personas, conversations, ai_chat, invites, match, moderation, circles, plaza, upload
from models.database import Base, engine, SessionLocal
from services.chat import AI_PERSONAS, stream_ai_response, save_message

Base.metadata.create_all(bind=engine)

from seed import seed as run_seed
try:
    run_seed()
except Exception as e:
    print(f"[SEED] {e}")

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")

app = FastAPI(
    title="µChat API",
    version="0.2.0",
    description="µChat — 亚熟人社交",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(personas.router, prefix="/api/persona", tags=["persona"])
app.include_router(conversations.router, prefix="/api/conversations", tags=["conversations"])
app.include_router(ai_chat.router, prefix="/api/ai", tags=["ai"])
app.include_router(invites.router, prefix="/api/invites", tags=["invites"])
app.include_router(match.router, prefix="/api/match", tags=["match"])
app.include_router(moderation.router, prefix="/api/moderation", tags=["moderation"])
app.include_router(circles.router, prefix="/api/circles", tags=["circles"])
app.include_router(plaza.router, prefix="/api/plaza", tags=["plaza"])
app.include_router(upload.router, prefix="/api/upload", tags=["upload"])

import os
_uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(_uploads_dir, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=_uploads_dir), name="uploads")

socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

# --- WebSocket Events ---

connected_users: dict[str, str] = {}  # sid -> user_id
user_sids: dict[str, set[str]] = {}   # user_id -> set of sids


@sio.event
async def connect(sid, environ):
    print(f"[WS] Connected: {sid}")


@sio.event
async def disconnect(sid):
    user_id = connected_users.pop(sid, None)
    if user_id:
        sids = user_sids.get(user_id, set())
        sids.discard(sid)
        if not sids:
            user_sids.pop(user_id, None)
            await sio.emit("user_offline", {"user_id": user_id})
    print(f"[WS] Disconnected: {sid}")


@sio.event
async def authenticate(sid, data):
    user_id = data.get("user_id")
    if user_id:
        connected_users[sid] = user_id
        if user_id not in user_sids:
            user_sids[user_id] = set()
        user_sids[user_id].add(sid)
        await sio.emit("authenticated", {"user_id": user_id}, to=sid)
        await sio.emit("user_online", {"user_id": user_id})


@sio.event
async def join_conversation(sid, data):
    room = data.get("conversation_id")
    if room:
        await sio.enter_room(sid, room)
        user_id = connected_users.get(sid, "?")
        print(f"[WS] {user_id} (sid={sid[:8]}) joined room {room}")
        await sio.emit("joined", {"conversation_id": room}, to=sid)


@sio.event
async def leave_conversation(sid, data):
    room = data.get("conversation_id")
    if room:
        await sio.leave_room(sid, room)


@sio.event
async def send_message(sid, data):
    room = data.get("conversation_id")
    content = data.get("content", "").strip()
    msg_type = data.get("type", "text")
    sender_name = data.get("sender_name", "")
    user_id = connected_users.get(sid)
    already_persisted = data.get("already_persisted", False)

    if not room or not content:
        print(f"[WS] send_message rejected: room={room}, content empty={not content}")
        return

    print(f"[WS] send_message from {sender_name}({user_id}) in room {room}: {content[:30]}")

    msg_data = {
        "conversation_id": room,
        "sender_id": user_id,
        "sender_name": sender_name,
        "content": content,
        "type": msg_type,
    }

    if not already_persisted:
        db = SessionLocal()
        try:
            msg = save_message(db, room, user_id, content, msg_type)
            msg_data["id"] = msg.id
            msg_data["created_at"] = msg.created_at.isoformat() if msg.created_at else None
        except Exception as e:
            print(f"[WS] Failed to persist message: {e}")
        finally:
            db.close()

    room_sids = list(sio.manager.get_participants("/", room))
    print(f"[WS] Broadcasting new_message to room {room} ({len(room_sids)} sockets in room, skip {sid[:8]})")

    await sio.emit("new_message", msg_data, room=room, skip_sid=sid)

    ai_persona_id = data.get("ai_persona")
    if ai_persona_id and ai_persona_id in AI_PERSONAS:
        history = data.get("history", [])
        await generate_ai_reply(sid, room, ai_persona_id, content, history)


async def generate_ai_reply(sid, room, persona_id, user_message, history):
    await sio.emit("ai_typing", {"conversation_id": room, "persona_id": persona_id}, to=sid)

    full_response = ""
    async for chunk in stream_ai_response(persona_id, user_message, history):
        try:
            data = json.loads(chunk)
            if "token" in data:
                full_response += data["token"]
                await sio.emit("ai_token", {
                    "conversation_id": room,
                    "persona_id": persona_id,
                    "token": data["token"],
                }, to=sid)
            if data.get("done"):
                break
        except json.JSONDecodeError:
            continue

    db = SessionLocal()
    try:
        save_message(db, room, None, full_response, "text")
    except Exception as e:
        print(f"[WS] Failed to persist AI message: {e}")
    finally:
        db.close()

    await sio.emit("ai_done", {
        "conversation_id": room,
        "persona_id": persona_id,
        "full_content": full_response,
    }, to=sid)


@sio.event
async def typing(sid, data):
    room = data.get("conversation_id")
    user_id = connected_users.get(sid)
    if room and user_id:
        await sio.emit("typing", {"user_id": user_id}, room=room, skip_sid=sid)


@sio.event
async def read_receipt(sid, data):
    room = data.get("conversation_id")
    user_id = connected_users.get(sid)
    if room and user_id:
        await sio.emit("read_receipt", {"user_id": user_id}, room=room, skip_sid=sid)


# --- Health ---

@app.get("/api/health")
async def health():
    online_count = len(user_sids)
    return {
        "status": "ok",
        "service": "uchat",
        "ai_personas": list(AI_PERSONAS.keys()),
        "online_users": online_count,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:socket_app", host="0.0.0.0", port=8000, reload=True)
