import DocumentUpload from '@/components/DocumentUpload';
import DocumentList from '@/components/DocumentList';

export default function DocumentsPage() {
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
        <p className="mt-2 text-gray-600">
          Upload and manage your winning proposals.
        </p>
      </div>

      <div className="space-y-8">
        <DocumentUpload />
        <DocumentList />
      </div>
    </div>
  );
}
