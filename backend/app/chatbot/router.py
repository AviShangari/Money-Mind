"""
Chatbot router — POST /chatbot/ask, GET /chatbot/history.

Two-step GPT pipeline:
  1. Classify intent (gpt-4o-mini, temperature=0, max_tokens=20)
  2. Format natural-language answer (gpt-4o-mini, temperature=0.7, max_tokens=350)
"""
import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.config import OPENAI_API_KEY
from app.core.dependencies import get_db
from app.chatbot.models import ChatHistory
from app.chatbot.schemas import ChatRequest, ChatResponse, ChatHistoryItem
from app.chatbot.service import get_financial_context, build_context_text
from app.chatbot.engine import run_calculation, INTENTS

router = APIRouter(prefix="/chatbot", tags=["chatbot"])

# ── Prompts ───────────────────────────────────────────────────────────────────

_INTENT_SYSTEM = (
    "You are a financial assistant. Classify the user's question into exactly one of these intents:\n"
    "- savings_projection: how much they can save, time to reach a savings goal\n"
    "- spending_analysis: spending patterns, categories, or amounts\n"
    "- budget_check: budget limits, whether they are on track or over budget\n"
    "- comparison: comparing this month to previous months\n"
    "- what_if: hypothetical scenarios like 'what if I reduce dining by 20%'\n"
    "- debt_question: questions about loans, credit card debt, or payoff timelines\n"
    "- general_tips: requests for advice or tips to save money\n\n"
    "Return ONLY the intent keyword. No punctuation. No explanation."
)

_RESPONSE_SYSTEM = (
    "You are a friendly and knowledgeable personal finance advisor for a Canadian user. "
    "Based on the user's question and their real financial data, provide a helpful, clear, "
    "and actionable response. Be specific with numbers when available. "
    "Keep responses concise (2–4 sentences) but complete. "
    "Format currency in CAD (e.g. $1,234.56). "
    "If data is unavailable or estimated, acknowledge that clearly."
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _openai_client():
    """Return an initialised OpenAI client or raise 503."""
    if not OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="OpenAI API key is not configured. Add OPENAI_API_KEY to .env.",
        )
    try:
        from openai import OpenAI
        return OpenAI(api_key=OPENAI_API_KEY)
    except ImportError:
        raise HTTPException(status_code=503, detail="openai package not installed.")


def _classify_intent(client, user_message: str, context_text: str) -> str:
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": _INTENT_SYSTEM},
            {
                "role": "user",
                "content": (
                    f"Financial context:\n{context_text}\n\n"
                    f"User question: {user_message}"
                ),
            },
        ],
        max_tokens=20,
        temperature=0,
    )
    raw = resp.choices[0].message.content.strip().lower()
    return raw if raw in INTENTS else "general_tips"


def _format_response(
    client,
    user_message: str,
    intent: str,
    context_text: str,
    calc_result: dict,
) -> str:
    user_content = (
        f"User question: {user_message}\n\n"
        f"Financial context:\n{context_text}\n\n"
        f"Calculated analysis (intent: {intent}):\n"
        f"{json.dumps(calc_result, indent=2, default=str)}\n\n"
        "Please provide a clear, helpful response to the user's question."
    )
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": _RESPONSE_SYSTEM},
            {"role": "user",   "content": user_content},
        ],
        max_tokens=350,
        temperature=0.7,
    )
    return resp.choices[0].message.content.strip()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/ask", response_model=ChatResponse)
def ask_chatbot(
    payload: ChatRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    client = _openai_client()

    # 1. Build financial context
    context      = get_financial_context(db, current_user.id)
    context_text = build_context_text(context)

    # 2. Classify intent
    intent = _classify_intent(client, payload.message, context_text)

    # 3. Run calculation
    calc_result = run_calculation(intent, context, payload.message)

    # 4. Format natural-language response
    response_text = _format_response(
        client, payload.message, intent, context_text, calc_result
    )

    # 5. Persist
    entry = ChatHistory(
        user_id=current_user.id,
        message=payload.message,
        intent=intent,
        response=response_text,
        created_at=datetime.utcnow(),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    return ChatResponse(
        intent=intent,
        response=response_text,
        created_at=entry.created_at,
    )


@router.get("/history", response_model=list[ChatHistoryItem])
def get_history(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    return (
        db.query(ChatHistory)
        .filter(ChatHistory.user_id == current_user.id)
        .order_by(ChatHistory.created_at.desc())
        .limit(20)
        .all()
    )
