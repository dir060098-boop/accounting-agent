from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    document_type = Column(String(100))
    contractor = Column(String(255))
    inn = Column(String(20))
    amount = Column(Float)
    currency = Column(String(10), default="RUB")
    document_date = Column(String(50))
    document_number = Column(String(100))
    category = Column(String(100))
    errors = Column(JSON, default=[])
    raw_text = Column(Text)
    analysis_result = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    session_id = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
