'use client';

import { useState, useEffect, useCallback } from 'react';
import { UploadButton } from '@/utils/uploadthing';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DocumentUpload() {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const bootstrapFiles = async () => {
      try {
        const response = await fetch('/api/documents');
        if (response.ok) {
          const documents = await response.json();
          setUploadedFiles(documents);
        }
      } catch (error) {
        console.error('Error loading documents:', error);
      }
    };

    bootstrapFiles();
  }, []);

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
            purpose: 'knowledge_base',
          }),
        });

        if (response.ok) {
          const document = await response.json();
          setUploadedFiles(prev => {
            const next = [...prev, document];
            return next;
          });
          
          // Start polling for status updates
          pollDocumentStatus(document._id);
        } else {
          console.error('Failed to create document record');
        }
      } catch (error) {
        console.error('Error creating document record:', error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Knowledge Base</h2>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="mb-6">
          <UploadButton
            endpoint="documentUploader"
            onClientUploadComplete={handleUploadComplete}
            onUploadError={(error) => {
              alert(`ERROR! ${error.message}`);
            }}
            appearance={{
              button: "bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors",
              allowedContent: "text-slate-500 text-sm"
            }}
          />
          <p className="mt-2 text-sm text-slate-500">
            Upload your past RFPs, company profiles, and case studies (DOCX only).
          </p>
        </div>

        {uploadedFiles.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
            <p className="text-slate-500">No documents uploaded yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {uploadedFiles.map((file) => (
              <div key={file._id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">{file.fileName}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(file.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {file.status === 'processing' && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                      Processing
                    </span>
                  )}
                  {file.status === 'completed' && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                      Ready
                    </span>
                  )}
                  {file.status === 'failed' && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                      Failed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
