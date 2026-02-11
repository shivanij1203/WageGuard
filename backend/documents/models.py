# mongodb document schema — no django ORM, just pymongo


def default_document():
    return {
        "_id": "",
        "title": "",
        "file_name": "",
        "file_size": 0,
        "uploaded_at": "",
        "status": "uploading",
        "extracted_text": None,
        "summary": None,
        "key_insights": [],
        "violations": [],
        "stub_type": None,
        "employer": None,
        "pay_period": None,
        "earnings": None,
        "deductions": [],
        "total_owed": 0,
        "page_count": None,
        "foxit_document_id": None,
        "error_message": None,
    }
