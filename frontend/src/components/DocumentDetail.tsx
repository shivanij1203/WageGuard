import { DocumentInfo } from "../api";
import {
  FileText,
  Loader2,
  AlertTriangle,
  Tag,
  CheckCircle2,
  DollarSign,
} from "lucide-react";

interface Props {
  document: DocumentInfo | null;
}

function severityColor(severity: string) {
  switch (severity) {
    case "high":
      return "bg-red-100 text-red-700 border-red-200";
    case "medium":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "low":
      return "bg-gray-100 text-gray-600 border-gray-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

function formatMoney(val: number | undefined | null): string {
  if (val == null) return "$0.00";
  return `$${Number(val).toFixed(2)}`;
}

export default function DocumentDetail({ document }: Props) {
  if (!document) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <div className="text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">Select a pay stub to view analysis</p>
          <p className="text-sm mt-1">Upload a pay stub to get started</p>
        </div>
      </div>
    );
  }

  if (document.status === "processing" || document.status === "uploading") {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-amber-500" />
          <p className="text-lg font-medium">Analyzing pay stub...</p>
          <p className="text-gray-400 mt-1">
            Extracting text, checking for wage theft, generating insights
          </p>
        </div>
      </div>
    );
  }

  const hasViolations =
    document.violations && document.violations.length > 0;
  const totalOwed = document.total_owed || 0;

  return (
    <div className="p-6 overflow-y-auto h-full">
      {/* header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold mb-1">{document.title}</h2>
          <p className="text-sm text-gray-400">
            {document.file_name}
            {document.employer && ` — ${document.employer}`}
            {document.pay_period && ` — ${document.pay_period}`}
          </p>
        </div>
        {document.stub_type && (
          <span className="flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">
            <Tag className="w-3 h-3" />
            {document.stub_type}
          </span>
        )}
      </div>

      {/* total owed banner */}
      {hasViolations && totalOwed > 0 && (
        <div className="mb-6 bg-red-600 text-white rounded-xl p-5 flex items-center gap-4">
          <DollarSign className="w-10 h-10 shrink-0" />
          <div>
            <p className="text-2xl font-bold">
              {formatMoney(totalOwed)} owed
            </p>
            <p className="text-red-100 text-sm">
              Estimated back-pay based on detected violations
            </p>
          </div>
        </div>
      )}

      {/* violations warning banner (no $ amount) */}
      {hasViolations && totalOwed === 0 && (
        <div className="mb-6 bg-amber-500 text-white rounded-xl p-5 flex items-center gap-4">
          <AlertTriangle className="w-10 h-10 shrink-0" />
          <div>
            <p className="text-xl font-bold">
              {document.violations.length} violation
              {document.violations.length > 1 ? "s" : ""} detected
            </p>
            <p className="text-amber-100 text-sm">
              Review the issues found in your pay stub below
            </p>
          </div>
        </div>
      )}

      {/* all clear banner */}
      {!hasViolations && document.status === "ready" && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-5 flex items-center gap-4">
          <CheckCircle2 className="w-10 h-10 text-green-500 shrink-0" />
          <div>
            <p className="text-lg font-bold text-green-700">All Clear</p>
            <p className="text-green-600 text-sm">
              No wage theft violations detected in this pay stub
            </p>
          </div>
        </div>
      )}

      {/* violations detail */}
      {hasViolations && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-red-700 uppercase tracking-wide mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Violations ({document.violations.length})
          </h3>
          <ul className="space-y-2">
            {document.violations.map((v, i) => (
              <li key={i} className="flex items-start gap-2">
                <span
                  className={`px-2 py-0.5 text-xs font-semibold rounded border shrink-0 mt-0.5 ${severityColor(
                    v.severity
                  )}`}
                >
                  {v.severity.toUpperCase()}
                </span>
                <span className="text-red-800 text-sm">{v.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* summary */}
      {document.summary && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Summary
          </h3>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {document.summary}
          </p>
        </div>
      )}

      {document.error_message && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
          <p className="text-red-700 text-sm">{document.error_message}</p>
        </div>
      )}
    </div>
  );
}
