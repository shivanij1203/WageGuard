const BASE = "/api";

export interface Earnings {
  gross_pay: number;
  net_pay: number;
  hourly_rate: number;
  hours_worked: number;
  overtime_hours: number;
  overtime_pay: number;
}

export interface Deduction {
  name: string;
  type: "tax" | "benefit" | "employer" | "other";
  amount: number;
}

export interface Violation {
  description: string;
  severity: "high" | "medium" | "low";
}

export interface DocumentInfo {
  id: string;
  title: string;
  file_name: string;
  file_size: number;
  uploaded_at: string;
  status: "uploading" | "processing" | "ready" | "error";
  summary: string | null;
  key_insights: string[];
  violations: Violation[];
  stub_type: string | null;
  employer: string | null;
  pay_period: string | null;
  earnings: Earnings | null;
  deductions: Deduction[];
  total_owed: number;
  extracted_text?: string;
  error_message?: string;
}

export interface QueryResult {
  answer: string;
  sources: string[];
}

export async function uploadDocument(file: File): Promise<{ id: string }> {
  const form = new FormData();
  form.append("file", file);
  const resp = await fetch(`${BASE}/upload/`, { method: "POST", body: form });
  if (!resp.ok) throw new Error("Upload failed");
  return resp.json();
}

export async function listDocuments(): Promise<DocumentInfo[]> {
  const resp = await fetch(`${BASE}/documents/`);
  if (!resp.ok) throw new Error("Failed to fetch documents");
  return resp.json();
}

export async function getDocument(id: string): Promise<DocumentInfo> {
  const resp = await fetch(`${BASE}/documents/${id}/`);
  if (!resp.ok) throw new Error("Document not found");
  return resp.json();
}

export async function queryDocuments(
  question: string,
  documentIds?: string[]
): Promise<QueryResult> {
  const resp = await fetch(`${BASE}/query/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, document_ids: documentIds || [] }),
  });
  if (!resp.ok) throw new Error("Query failed - upload documents first");
  return resp.json();
}

export async function getDeepgramToken(): Promise<string> {
  const resp = await fetch(`${BASE}/deepgram-token/`);
  if (!resp.ok) throw new Error("Deepgram not configured");
  const data = await resp.json();
  return data.api_key;
}

export async function deleteDocument(id: string): Promise<void> {
  const resp = await fetch(`${BASE}/documents/${id}/`, { method: "DELETE" });
  if (!resp.ok) throw new Error("Delete failed");
}
