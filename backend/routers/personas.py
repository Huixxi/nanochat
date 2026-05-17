from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from models.database import get_db
from models.persona import Persona

router = APIRouter()


class PersonaAnswers(BaseModel):
    answers: dict


@router.post("/answers")
async def submit_answers(req: PersonaAnswers, db: Session = Depends(get_db)):
    # TODO: save answers, generate summary via AI, compute tags
    return {"message": "Persona created", "answers": req.answers}


@router.get("/{user_id}")
async def get_persona(user_id: str, db: Session = Depends(get_db)):
    persona = db.query(Persona).filter(Persona.user_id == user_id).first()
    if not persona:
        return {"user_id": user_id, "summary": None, "tags": []}
    return {
        "user_id": persona.user_id,
        "summary": persona.summary,
        "tags": persona.tags,
        "answers": persona.answers,
    }
