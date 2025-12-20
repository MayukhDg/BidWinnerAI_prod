'use client';

import { useState } from 'react';
import { UploadButton } from '@/utils/uploadthing';
import { useRouter } from 'next/navigation';

export default function DocumentUpload() {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const router = useRouter();

  const handleUploadComplete = async (res) => {
    if (res && res.length > 0) {
      const file = res[0];
      
      // Create document record
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileUrl: file.url,
          fileKey: file.key,
          fileType: file.name.endsWith('.pdf') ? 'pdf' : 'docx',
        }),
      });

      if (response.ok) {
        const document = await response.json();
        setUploadedFiles([...uploadedFiles, document]);
        router.refresh();
      }
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-4">Upload Your Winning Proposals</h2>
        <p className="text-gray-600 mb-4">
          Upload up to 10 PDF or Word documents. These will be processed and indexed for AI-powered retrieval.
        </p>
        <UploadButton
          endpoint="documentUploader"
          onClientUploadComplete={handleUploadComplete}
          onUploadError={(error) => {
            console.error('Upload error:', error);
            alert(`Upload failed: ${error.message}`);
          }}
        />
      </div>

      {uploadedFiles.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Uploaded Files</h3>
          <ul className="space-y-2">
            {uploadedFiles.map((file) => (
              <li key={file._id} className="flex items-center justify-between p-2 border rounded">
                <span>{file.fileName}</span>
                <span className={`px-2 py-1 rounded text-sm ${
                  file.status === 'completed' ? 'bg-green-100 text-green-800' :
                  file.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {file.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
