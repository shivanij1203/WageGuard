import { useCallback, useState } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";
import { uploadDocument } from "../api";

interface Props {
  onUploaded: () => void;
}

export default function UploadZone({ onUploaded }: Props) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setUploading(true);
      try {
        for (const file of Array.from(files)) {
          await uploadDocument(file);
        }
        onUploaded();
      } catch (err) {
        console.error("Upload error:", err);
      } finally {
        setUploading(false);
      }
    },
    [onUploaded]
  );

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
        dragging
          ? "border-blue-500 bg-blue-50"
          : "border-gray-300 hover:border-gray-400"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg";
        input.multiple = true;
        input.onchange = () => handleFiles(input.files);
        input.click();
      }}
    >
      {uploading ? (
        <div className="flex flex-col items-center gap-2 text-blue-600">
          <Loader2 className="w-10 h-10 animate-spin" />
          <p className="font-medium">Processing document...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-gray-500">
          <Upload className="w-10 h-10" />
          <p className="font-medium">Drop pay stubs here or click to upload</p>
          <p className="text-sm text-gray-400">
            PDF, DOC, DOCX, TXT, PNG, JPG — up to 50MB
          </p>
        </div>
      )}
    </div>
  );
}
