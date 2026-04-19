import json
import anthropic
from config import settings
from agent.prompts import get_system_prompt, DOCUMENT_ANALYSIS_PROMPT


class AccountingAgent:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self.model = settings.claude_model
        self.max_tokens = settings.max_tokens

    def chat(self, user_message: str, history: list[dict]) -> str:
        messages = history + [{"role": "user", "content": user_message}]

        response = self.client.messages.create(
            model=self.model,
            max_tokens=self.max_tokens,
            system=get_system_prompt(),
            messages=messages,
        )
        return response.content[0].text

    def analyze_document(self, text: str, filename: str) -> dict:
        prompt = DOCUMENT_ANALYSIS_PROMPT.format(filename=filename, text=text[:8000])

        response = self.client.messages.create(
            model=self.model,
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}],
        )

        raw = response.content[0].text.strip()

        try:
            if "```json" in raw:
                raw = raw.split("```json")[1].split("```")[0].strip()
            elif "```" in raw:
                raw = raw.split("```")[1].split("```")[0].strip()
            return json.loads(raw)
        except json.JSONDecodeError:
            return {
                "document_type": "неизвестно",
                "contractor": None,
                "inn": None,
                "kpp": None,
                "amount": None,
                "amount_with_vat": None,
                "vat_amount": None,
                "vat_rate": None,
                "currency": "RUB",
                "document_date": None,
                "document_number": None,
                "description": None,
                "category": "Прочее",
                "errors": ["Не удалось автоматически разобрать документ"],
                "confidence": "low",
                "summary": raw,
            }

    def analyze_multiple(self, documents: list[dict]) -> str:
        docs_text = "\n\n".join(
            f"Документ {i+1}: {d['filename']}\n{d['summary']}"
            for i, d in enumerate(documents)
        )
        prompt = f"""
        Проведи сводный анализ следующих документов:

        {docs_text}

        Дай:
        1. Общую сумму расходов по категориям
        2. Список контрагентов
        3. Выявленные проблемы и ошибки
        4. Рекомендации
        """
        response = self.client.messages.create(
            model=self.model,
            max_tokens=2000,
            system=get_system_prompt(),
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text
