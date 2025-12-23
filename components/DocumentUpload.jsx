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
            fileType: 'docx', // Only DOCX supported
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
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="card p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 float">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Upload Your Winning Proposals</h2>
            <p className="text-slate-500">
              Upload Word documents (.docx) up to 10MB. Documents will be processed in the background 
              and ready for AI-powered retrieval within a few minutes.
            </p>
          </div>
        </div>
        
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-indigo-300 hover:bg-indigo-50/30 transition-all duration-300">
          <UploadButton
            endpoint="documentUploader"
            onClientUploadComplete={handleUploadComplete}
            onUploadError={(error) => {
              console.error('Upload error:', error);
              alert(`Upload failed: ${error.message}`);
            }}
            appearance={{
              button: "bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium py-3 px-6 rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all duration-200 ut-uploading:opacity-70",
              allowedContent: "text-slate-400 text-sm mt-2",
            }}
          />
        </div>
        
        {isUploading && (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500 fade-in">
            <svg className="animate-spin h-4 w-4 text-indigo-500" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Creating document record...
          </div>
        )}
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="card p-6 fade-in">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Recently Uploaded
          </h3>
          <ul className="space-y-3">
            {uploadedFiles.map((file, index) => (
              <li 
                key={file._id} 
                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-all duration-200 slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-slate-700 truncate block">{file.fileName}</span>
                    {(file.status === 'processing' || file.status === 'pending') && file.processingProgress > 0 && (
                      <div className="mt-2">
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full transition-all duration-500 shimmer" 
                            style={{ width: `${file.processingProgress}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 mt-1 block">
                          {file.processingProgress}% processed
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0">
                  {file.status === 'processing' || file.status === 'pending' ? (
                    <span className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-amber-50 text-amber-600 border border-amber-100">
                      <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing
                    </span>
                  ) : file.status === 'completed' ? (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-emerald-50 text-emerald-600 border border-emerald-100">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Ready · {file.chunkCount} chunks
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-red-50 text-red-600 border border-red-100">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
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
