# sanity cms sync — pushes pay stub data for mcp server integration

import httpx
from django.conf import settings


def _configured():
    return bool(settings.SANITY_PROJECT_ID and settings.SANITY_API_TOKEN)


def _headers():
    return {
        "Authorization": f"Bearer {settings.SANITY_API_TOKEN}",
        "Content-Type": "application/json",
    }


def _base_url():
    return f"https://{settings.SANITY_PROJECT_ID}.api.sanity.io/v2024-01-01"


def sync_document(doc: dict):
    if not _configured():
        return

    sanity_doc = {
        "_type": "paystub",
        "_id": f"paystub-{doc['_id']}",
        "title": doc.get("title", ""),
        "fileName": doc.get("file_name", ""),
        "stubType": doc.get("stub_type", ""),
        "employer": doc.get("employer", ""),
        "payPeriod": doc.get("pay_period", ""),
        "status": doc.get("status", ""),
        "summary": doc.get("summary", ""),
        "keyInsights": doc.get("key_insights", []),
        "violations": doc.get("violations", []),
        "earnings": doc.get("earnings", {}),
        "deductions": doc.get("deductions", []),
        "totalOwed": doc.get("total_owed", 0),
        "uploadedAt": doc.get("uploaded_at", ""),
    }

    mutations = [{"createOrReplace": sanity_doc}]
    try:
        resp = httpx.post(
            f"{_base_url()}/data/mutate/{settings.SANITY_DATASET}",
            headers=_headers(),
            json={"mutations": mutations},
            timeout=15,
        )
        resp.raise_for_status()
    except Exception:
        pass  # don't block main flow
