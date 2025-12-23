import DocumentUpload from '@/components/DocumentUpload';
import DocumentList from '@/components/DocumentList';

export default function DocumentsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8 fade-in">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Documents</h1>
        <p className="text-slate-500">
          Upload and manage your winning proposals. The AI learns from your documents to craft better responses.
        </p>
      </div>

      <div className="space-y-8">
        <div className="slide-up">
          <DocumentUpload />
        </div>
        <div className="slide-up" style={{ animationDelay: '100ms' }}>
          <DocumentList />
        </div>
      </div>
    </div>
  );
}
