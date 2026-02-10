"""AI service — OpenAI GPT-4 for pay stub analysis, wage theft detection, Q&A (RAG pattern).

WageGuard — AI Wage Theft Detector for DeveloperWeek 2026 Hackathon.
"""

import json
from openai import OpenAI
from django.conf import settings


def _client():
    return OpenAI(api_key=settings.OPENAI_API_KEY)


def analyze_paystub(text: str, title: str) -> dict:
    """Analyze a pay stub and return summary, risk flags, insights."""
    response = _client().chat.completions.create(
        model="gpt-4o",
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": "You are WageGuard, an AI pay stub analyst and wage theft detector. Always respond in valid JSON.",
            },
            {
                "role": "user",
                "content": f"""Analyze this document titled "{title}" and provide:

1. A concise summary (2-3 paragraphs)
2. The contract/document type (e.g., NDA, service agreement, employment contract, lease, invoice, etc.)
3. 5 key insights as bullet points
4. Risk flags — any clauses or terms that could be problematic for the signing party (unfavorable terms, vague language, missing protections, unusual penalties, etc.)

Document text:
{text[:15000]}

Respond in this exact JSON format:
{{
  "summary": "...",
  "contract_type": "...",
  "key_insights": ["insight 1", "insight 2", ...],
  "risk_flags": ["risk 1", "risk 2", ...]
}}""",
            },
        ],
    )
    try:
        return json.loads(response.choices[0].message.content)
    except (json.JSONDecodeError, IndexError, TypeError):
        return {
            "summary": response.choices[0].message.content or "",
            "contract_type": "unknown",
            "key_insights": [],
            "risk_flags": [],
        }


def answer_question(question: str, documents: list[dict]) -> str:
    """RAG-style Q&A over contract documents."""
    context_parts = []
    for doc in documents:
        text = doc.get("extracted_text", "") or ""
        context_parts.append(
            f"--- Document: {doc['title']} ---\n{text[:8000]}\n"
        )
    context = "\n".join(context_parts)

    response = _client().chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": "You are ContractSafe, an AI contract assistant. Answer questions based on the provided contract documents. Be specific, cite clauses when possible, and flag any risks. If the answer isn't in the documents, say so clearly.",
            },
            {
                "role": "user",
                "content": f"""Documents:
{context}

Question: {question}""",
            },
        ],
    )
    return response.choices[0].message.content
