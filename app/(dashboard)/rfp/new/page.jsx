'use client';

import { useState } from 'react';
import { UploadButton } from '@/utils/uploadthing';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewRFPPage() {
  const router = useRouter();
  const [step, setStep] = useState('upload'); // upload, details, processing
  const [documentId, setDocumentId] = useState(null);
  const [title, setTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleUploadComplete = async (res) => {
    if (res && res.length > 0) {
      const file = res[0];
      
      try {
        // Create document record
        const response = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileUrl: file.url,
            fileKey: file.key,
            fileType: 'docx',
            purpose: 'rfp_source',
          }),
        });

        if (response.ok) {
          const document = await response.json();
          setDocumentId(document._id);
          setTitle(file.name.replace('.docx', ''));
          setStep('details');
        } else {
          const data = await response.json();
          if (data.requiresUpgrade) {
            setError(
              <span>
                {data.error} <Link href="/pricing" className="underline font-bold">Upgrade now</Link>
              </span>
            );
          } else {
            setError(data.error || 'Failed to save document record.');
          }
        }
      } catch (err) {
        console.error(err);
        setError('An error occurred while saving the document.');
      }
    }
  };

  const handleCreateProject = async () => {
    if (!title.trim()) return;
    setIsCreating(true);
    setError('');

    try {
      const response = await fetch('/api/rfp/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          title,
        }),
      });

      if (response.ok) {
        const { rfpId } = await response.json();
        router.push(`/rfp/${rfpId}`);
      } else {
        setError('Failed to create RFP project.');
        setIsCreating(false);
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while creating the project.');
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="mb-8">
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 mt-2">Start New RFP Project</h1>
        <p className="text-slate-600 mt-2">Upload an RFP document to automatically extract questions and generate answers.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {step === 'upload' && (
          <div className="text-center py-8">
            <div className="mb-6">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-slate-900">Upload RFP Document</h3>
              <p className="text-sm text-slate-500 mt-1">Support for .docx files only</p>
            </div>
            
            <UploadButton
              endpoint="documentUploader"
              onClientUploadComplete={handleUploadComplete}
              onUploadError={(error) => {
                setError(`Upload failed: ${error.message}`);
              }}
              appearance={{
                button: "bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors",
                allowedContent: "hidden"
              }}
            />
          </div>
        )}

        {step === 'details' && (
          <div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Project Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="e.g. Q1 2024 Marketing RFP"
              />
            </div>

            <button
              onClick={handleCreateProject}
              disabled={isCreating || !title.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
            >
              {isCreating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Project...
                </>
              ) : (
                'Create Project & Extract Questions'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
