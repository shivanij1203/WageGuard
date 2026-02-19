# api views for document upload and processing

import io
import uuid
import threading
from datetime import datetime, timezone

from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings

from .db import get_collection
from .services import ai


def _process_document(doc_id, file_bytes, filename):
    """extract text from uploaded file, then run ai analysis."""
    col = get_collection()
    try:
        col.update_one({"_id": doc_id}, {"$set": {"status": "processing"}})

        is_pdf = filename.lower().endswith(".pdf")
        is_image = filename.lower().endswith((".png", ".jpg", ".jpeg"))

        if is_pdf:
            import pdfplumber
            pdf = pdfplumber.open(io.BytesIO(file_bytes))
            pages = [p.extract_text() or "" for p in pdf.pages]
            extracted_text = "\n\n".join(pages).strip()
            pdf.close()

            # ocr fallback for scanned pdfs
            if not extracted_text or len(extracted_text) < 50:
                try:
                    from pdf2image import convert_from_bytes
                    import pytesseract
                    images = convert_from_bytes(file_bytes, dpi=300)
                    ocr_pages = [pytesseract.image_to_string(img) for img in images]
                    ocr_text = "\n\n".join(ocr_pages).strip()
                    if len(ocr_text) > len(extracted_text):
                        extracted_text = ocr_text
                except Exception:
                    pass

        elif is_image:
            try:
                from PIL import Image
                import pytesseract
                img = Image.open(io.BytesIO(file_bytes))
                extracted_text = pytesseract.image_to_string(img).strip()
            except Exception:
                extracted_text = ""
        else:
            extracted_text = file_bytes.decode("utf-8", errors="ignore")

        col.update_one(
            {"_id": doc_id},
            {"$set": {"extracted_text": extracted_text}}
        )

        # run gpt-4 analysis if we got text
        if settings.OPENAI_API_KEY and extracted_text.strip():
            doc = col.find_one({"_id": doc_id})
            analysis = ai.analyze_paystub(extracted_text, doc.get("title", filename))
            col.update_one(
                {"_id": doc_id},
                {
                    "$set": {
                        "summary": analysis.get("summary", ""),
                        "key_insights": analysis.get("key_insights", []),
                        "violations": analysis.get("violations", []),
                        "stub_type": analysis.get("stub_type", ""),
                        "employer": analysis.get("employer", ""),
                        "pay_period": analysis.get("pay_period", ""),
                        "earnings": analysis.get("earnings", {}),
                        "deductions": analysis.get("deductions", []),
                        "total_owed": analysis.get("total_owed", 0),
                        "status": "ready",
                    }
                },
            )
        else:
            col.update_one({"_id": doc_id}, {"$set": {"status": "ready"}})

    except Exception as e:
        import traceback
        traceback.print_exc()
        col.update_one(
            {"_id": doc_id},
            {"$set": {"status": "error", "error_message": str(e)}},
        )


@api_view(["POST"])
@parser_classes([MultiPartParser])
def upload_document(request):
    file = request.FILES.get("file")
    if not file:
        return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

    file_bytes = file.read()
    doc_id = str(uuid.uuid4())[:8]

    doc = {
        "_id": doc_id,
        "title": file.name or "Untitled",
        "file_name": file.name or "unknown.pdf",
        "file_size": len(file_bytes),
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
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
        "error_message": None,
    }

    col = get_collection()
    col.insert_one(doc)

    filepath = settings.UPLOAD_DIR / f"{doc_id}_{file.name}"
    with open(filepath, "wb") as f:
        f.write(file_bytes)

    thread = threading.Thread(
        target=_process_document, args=(doc_id, file_bytes, file.name)
    )
    thread.start()

    return Response({"id": doc_id, "status": "uploading", "title": doc["title"]})


@api_view(["GET"])
def list_documents(request):
    col = get_collection()
    docs = list(col.find().sort("uploaded_at", -1))
    return Response(
        [
            {
                "id": d["_id"],
                "title": d.get("title", ""),
                "file_name": d.get("file_name", ""),
                "file_size": d.get("file_size", 0),
                "uploaded_at": d.get("uploaded_at", ""),
                "status": d.get("status", ""),
                "summary": d.get("summary"),
                "key_insights": d.get("key_insights", []),
                "violations": d.get("violations", []),
                "stub_type": d.get("stub_type"),
                "employer": d.get("employer"),
                "pay_period": d.get("pay_period"),
                "earnings": d.get("earnings"),
                "deductions": d.get("deductions", []),
                "total_owed": d.get("total_owed", 0),
            }
            for d in docs
        ]
    )


@api_view(["GET", "DELETE"])
def document_detail(request, doc_id):
    col = get_collection()

    if request.method == "DELETE":
        result = col.delete_one({"_id": doc_id})
        if result.deleted_count == 0:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response({"status": "deleted"})

    doc = col.find_one({"_id": doc_id})
    if not doc:
        return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

    return Response(
        {
            "id": doc["_id"],
            "title": doc.get("title", ""),
            "file_name": doc.get("file_name", ""),
            "file_size": doc.get("file_size", 0),
            "uploaded_at": doc.get("uploaded_at", ""),
            "status": doc.get("status", ""),
            "summary": doc.get("summary"),
            "key_insights": doc.get("key_insights", []),
            "violations": doc.get("violations", []),
            "stub_type": doc.get("stub_type"),
            "employer": doc.get("employer"),
            "pay_period": doc.get("pay_period"),
            "earnings": doc.get("earnings"),
            "deductions": doc.get("deductions", []),
            "total_owed": doc.get("total_owed", 0),
            "extracted_text": doc.get("extracted_text"),
            "error_message": doc.get("error_message"),
        }
    )


@api_view(["POST"])
def query_documents(request):
    question = request.data.get("question", "")
    document_ids = request.data.get("document_ids", [])

    if not question:
        return Response({"error": "No question provided"}, status=status.HTTP_400_BAD_REQUEST)
    if not settings.OPENAI_API_KEY:
        return Response({"error": "AI not configured"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    col = get_collection()
    if document_ids:
        docs = list(col.find({"_id": {"$in": document_ids}, "extracted_text": {"$ne": None}}))
    else:
        docs = list(col.find({"extracted_text": {"$ne": None}}))

    if not docs:
        return Response({"error": "No documents available"}, status=status.HTTP_400_BAD_REQUEST)

    answer = ai.answer_question(question, docs)
    return Response(
        {
            "answer": answer,
            "sources": [d.get("title", "") for d in docs],
        }
    )


@api_view(["GET"])
def deepgram_token(request):
    if not settings.DEEPGRAM_API_KEY:
        return Response({"error": "Deepgram not configured"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    return Response({"api_key": settings.DEEPGRAM_API_KEY})


@api_view(["GET"])
def health(request):
    return Response({"status": "ok", "app": "WageShield"})
