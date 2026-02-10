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
                "content": f"""Analyze this pay stub titled "{title}" and extract:

1. A concise summary (2-3 paragraphs) of what this pay stub shows
2. The stub type (e.g., "Weekly Pay Stub", "Biweekly Pay Stub", "Monthly Pay Stub", "Other")
3. Employer name
4. Pay period (start and end dates if visible)
5. Earnings breakdown: gross pay, net pay, hourly rate, hours worked, overtime hours
6. List of deductions with name, type (tax/benefit/employer/other), and amount
7. Any wage theft violations found — with description, severity (high/medium/low), and amount owed
8. 5 key insights as bullet points
9. Total amount owed to the worker (0 if no violations)

Document text:
{text[:15000]}

Respond in this exact JSON format:
{{
  "summary": "...",
  "stub_type": "...",
  "employer": "...",
  "pay_period": "...",
  "earnings": {{
    "gross_pay": 0,
    "net_pay": 0,
    "hourly_rate": 0,
    "hours_worked": 0,
    "overtime_hours": 0
  }},
  "deductions": [
    {{"name": "...", "type": "tax|benefit|employer|other", "amount": 0}}
  ],
  "violations": [
    {{"description": "...", "severity": "high|medium|low", "amount_owed": 0}}
  ],
  "key_insights": ["insight 1", "insight 2", ...],
  "total_owed": 0
}}""",
            },
        ],
    )
    try:
        return json.loads(response.choices[0].message.content)
    except (json.JSONDecodeError, IndexError, TypeError):
        return {
            "summary": response.choices[0].message.content or "",
            "stub_type": "unknown",
            "employer": "",
            "pay_period": "",
            "earnings": {},
            "deductions": [],
            "violations": [],
            "key_insights": [],
            "total_owed": 0,
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
