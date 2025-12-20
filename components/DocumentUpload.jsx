'use client';

import { useState, useEffect, useCallback } from 'react';
import { UploadButton } from '@/utils/uploadthing';
import { useRouter } from 'next/navigation';

export default function DocumentUpload() {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  // Poll for document status updates
  const pollDocumentStatus = useCallback(async (documentId) => {
    const maxAttempts = 120; // 10 minutes max (5s intervals)
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch('/api/documents');
        if (response.ok) {
          const documents = await response.json();
          const doc = documents.find(d => d._id === documentId);
          
          if (doc) {
            setUploadedFiles(prev => prev.map(f => 
              f._id === documentId ? doc : f
            ));

            // Stop polling if completed or failed
            if (doc.status === 'completed' || doc.status === 'failed') {
              router.refresh();
              return;
            }
          }
        }
      } catch (error) {
        console.error('Error polling document status:', error);
      }

      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 5000); // Poll every 5 seconds
      }
    };

    // Start polling after a short delay
    setTimeout(poll, 2000);
  }, [router]);

  const handleUploadComplete = async (res) => {
    if (res && res.length > 0) {
      const file = res[0];
      setIsUploading(true);
      
      try {
        // Create document record - this triggers Inngest background processing
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
          setUploadedFiles(prev => [...prev, document]);
          
          // Start polling for status updates
          pollDocumentStatus(document._id);
        } else {
          console.error('Failed to create document record');
          alert('Failed to process document. Please try again.');
        }
      } catch (error) {
        console.error('Error creating document:', error);
        alert('Failed to process document. Please try again.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-4">Upload Your Winning Proposals</h2>
        <p className="text-gray-600 mb-4">
          Upload PDF or Word documents (max 50MB). Documents are processed in the background 
          and will be ready for AI-powered retrieval within a few minutes.
        </p>
        <UploadButton
          endpoint="documentUploader"
          onClientUploadComplete={handleUploadComplete}
          onUploadError={(error) => {
            console.error('Upload error:', error);
            alert(`Upload failed: ${error.message}`);
          }}
        />
        {isUploading && (
          <div className="mt-2 text-sm text-gray-500">
            Creating document record...
          </div>
        )}
      </div>

      {uploadedFiles.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Uploaded Files</h3>
          <ul className="space-y-2">
            {uploadedFiles.map((file) => (
              <li key={file._id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <span className="font-medium">{file.fileName}</span>
                  {file.status === 'processing' && file.processingProgress > 0 && (
                    <div className="mt-1">
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                          style={{ width: `${file.processingProgress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {file.processingProgress}% processed
                      </span>
                    </div>
                  )}
                </div>
                <div className="ml-4">
                  {file.status === 'processing' || file.status === 'pending' ? (
                    <span className="flex items-center gap-2 px-2 py-1 rounded text-sm bg-yellow-100 text-yellow-800">
                      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing
                    </span>
                  ) : file.status === 'completed' ? (
                    <span className="px-2 py-1 rounded text-sm bg-green-100 text-green-800">
                      ✓ Ready ({file.chunkCount} chunks)
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded text-sm bg-red-100 text-red-800">
                      Failed
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
