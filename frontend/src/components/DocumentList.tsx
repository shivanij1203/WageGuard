import { FileText, Loader2, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { DocumentInfo, deleteDocument } from "../api";

interface Props {
  documents: DocumentInfo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRefresh: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "processing":
    case "uploading":
      return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    case "ready":
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case "error":
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    default:
      return null;
  }
}

export default function DocumentList({
  documents,
  selectedId,
  onSelect,
  onRefresh,
}: Props) {
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteDocument(id);
    onRefresh();
  };

  if (documents.length === 0) {
    return (
      <div className="text-center text-gray-400 py-12">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No documents yet</p>
        <p className="text-sm">Upload a pay stub to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          onClick={() => onSelect(doc.id)}
          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors group ${
            selectedId === doc.id
              ? "bg-blue-50 border border-blue-200"
              : "hover:bg-gray-50 border border-transparent"
          }`}
        >
          <FileText className="w-8 h-8 text-red-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{doc.title}</p>
            <p className="text-xs text-gray-400">
              {formatSize(doc.file_size)}
            </p>
          </div>
          <StatusIcon status={doc.status} />
          <button
            onClick={(e) => handleDelete(e, doc.id)}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded transition-opacity"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      ))}
    </div>
  );
}
