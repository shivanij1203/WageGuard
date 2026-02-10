# openai helpers for pay stub analysis

import json
from openai import OpenAI
from django.conf import settings


def _client():
    return OpenAI(api_key=settings.OPENAI_API_KEY)


def analyze_paystub(text: str, title: str) -> dict:
    response = _client().chat.completions.create(
        model="gpt-4o",
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": """You are WageGuard, an AI pay stub analyst and wage theft detector. Always respond in valid JSON.

You have deep knowledge of US labor law:
- Federal minimum wage: $7.25/hr (states may be higher)
- Overtime: 1.5x regular rate after 40 hours/week (FLSA)
- FICA taxes: 7.65% employee share (6.2% Social Security + 1.45% Medicare)
- Employers cannot deduct for breakage, shortages, or uniforms below minimum wage
- Tips cannot be counted toward minimum wage beyond tip credit ($2.13/hr federal tipped minimum)
- Pay stubs must show hours worked, pay rate, deductions
- Final paycheck laws vary by state
- Meal/rest break deductions must correspond to actual breaks taken

Analyze pay stubs for wage theft indicators: minimum wage violations, overtime miscalculation, illegal deductions, misclassified workers, unreported hours, and tax withholding errors.""",
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
