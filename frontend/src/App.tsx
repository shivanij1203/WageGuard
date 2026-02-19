import { useState, useEffect, useCallback } from "react";
import { DollarSign, FileText, MessageSquare } from "lucide-react";
import UploadZone from "./components/UploadZone";
import DocumentList from "./components/DocumentList";
import DocumentDetail from "./components/DocumentDetail";
import ChatInterface from "./components/ChatInterface";
import { listDocuments, getDocument, DocumentInfo } from "./api";

type Tab = "documents" | "chat";

export default function App() {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DocumentInfo | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("documents");

  const refresh = useCallback(async () => {
    try {
      const docs = await listDocuments();
      setDocuments(docs);
    } catch {
      // api not available yet
    }
  }, []);

  // poll for updates (processing -> ready)
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [refresh]);

  // fetch full document when selected
  useEffect(() => {
    if (!selectedId) {
      setSelectedDoc(null);
      return;
    }
    getDocument(selectedId).then(setSelectedDoc).catch(() => setSelectedDoc(null));
  }, [selectedId, documents]);

  const documentIds = documents
    .filter((d) => d.status === "ready")
    .map((d) => d.id);

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* header */}
      <header className="border-b px-6 py-3 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-600 rounded-xl flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">WageShield</h1>
            <p className="text-xs text-gray-400">AI Wage Theft Detector</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab("documents")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "documents"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <FileText className="w-4 h-4" />
            Pay Stubs
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "chat"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Ask AI
          </button>
        </div>
      </header>

      {/* main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* sidebar */}
        <aside className="w-72 border-r flex flex-col bg-gray-50/50">
          <div className="p-4">
            <UploadZone onUploaded={refresh} />
          </div>
          <div className="px-4 pb-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Pay Stubs ({documents.length})
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            <DocumentList
              documents={documents}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onRefresh={refresh}
            />
          </div>
        </aside>

        {/* main panel */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {activeTab === "documents" ? (
            <DocumentDetail document={selectedDoc} />
          ) : (
            <ChatInterface documentIds={documentIds} />
          )}
        </main>
      </div>

      {/* footer */}
      <footer className="border-t px-6 py-2 text-xs text-gray-400 flex justify-between">
        <span>DeveloperWeek 2026 Hackathon</span>
        <span>Powered by GPT-4 + Deepgram + Sanity MCP</span>
      </footer>
    </div>
  );
}
