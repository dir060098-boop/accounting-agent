import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from agent.claude_client import AccountingAgent
from agent.document_processor import extract_text
from database.connection import get_db
from database.models import Document, ChatMessage

router = APIRouter()
agent = AccountingAgent()


class ChatRequest(BaseModel):
    message: str
    session_id: str = None


class ChatResponse(BaseModel):
    response: str
    session_id: str


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    session_id = request.session_id or str(uuid.uuid4())

    history = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.id)
        .all()
    )
    messages = [{"role": m.role, "content": m.content} for m in history]

    response_text = agent.chat(request.message, messages)

    db.add(ChatMessage(role="user", content=request.message, session_id=session_id))
    db.add(ChatMessage(role="assistant", content=response_text, session_id=session_id))
    db.commit()

    return ChatResponse(response=response_text, session_id=session_id)


@router.post("/documents/upload")
async def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    allowed = {".pdf", ".xlsx", ".xls", ".txt"}
    suffix = "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if suffix not in allowed:
        raise HTTPException(status_code=400, detail=f"Формат {suffix} не поддерживается. Разрешены: PDF, Excel, TXT")

    try:
        text = await extract_text(file)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Ошибка чтения файла: {str(e)}")

    result = agent.analyze_document(text, file.filename)

    doc = Document(
        filename=file.filename,
        document_type=result.get("document_type"),
        contractor=result.get("contractor"),
        inn=result.get("inn"),
        amount=result.get("amount"),
        currency=result.get("currency", "RUB"),
        document_date=result.get("document_date"),
        document_number=result.get("document_number"),
        category=result.get("category"),
        errors=result.get("errors", []),
        raw_text=text[:5000],
        analysis_result=result,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    return {"id": doc.id, "filename": file.filename, "analysis": result}


@router.get("/documents")
def list_documents(
    skip: int = 0,
    limit: int = 50,
    category: str = None,
    db: Session = Depends(get_db),
):
    query = db.query(Document)
    if category:
        query = query.filter(Document.category == category)
    docs = query.order_by(Document.created_at.desc()).offset(skip).limit(limit).all()

    return [
        {
            "id": d.id,
            "filename": d.filename,
            "document_type": d.document_type,
            "contractor": d.contractor,
            "inn": d.inn,
            "amount": d.amount,
            "currency": d.currency,
            "document_date": d.document_date,
            "category": d.category,
            "errors": d.errors,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in docs
    ]


@router.get("/documents/{doc_id}")
def get_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Документ не найден")
    return {
        "id": doc.id,
        "filename": doc.filename,
        "analysis": doc.analysis_result,
        "raw_text": doc.raw_text,
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
    }


@router.get("/documents/stats/summary")
def documents_summary(db: Session = Depends(get_db)):
    docs = db.query(Document).all()
    categories = {}
    total_amount = 0.0
    errors_count = 0

    for d in docs:
        cat = d.category or "Прочее"
        if cat not in categories:
            categories[cat] = {"count": 0, "amount": 0.0}
        categories[cat]["count"] += 1
        if d.amount:
            categories[cat]["amount"] += d.amount
            total_amount += d.amount
        if d.errors:
            errors_count += len(d.errors)

    return {
        "total_documents": len(docs),
        "total_amount": round(total_amount, 2),
        "categories": categories,
        "documents_with_errors": errors_count,
    }


@router.post("/documents/analyze-batch")
def analyze_batch(db: Session = Depends(get_db)):
    docs = db.query(Document).order_by(Document.created_at.desc()).limit(20).all()
    if not docs:
        raise HTTPException(status_code=404, detail="Документов не найдено")

    summaries = [
        {
            "filename": d.filename,
            "summary": d.analysis_result.get("summary", "") if d.analysis_result else "",
        }
        for d in docs
    ]
    analysis = agent.analyze_multiple(summaries)
    return {"analysis": analysis, "documents_count": len(docs)}


@router.get("/health")
def health():
    return {"status": "ok", "service": "Accounting AI Agent"}
