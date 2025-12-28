'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RFPProjectPage({ params }) {
  const { id } = params;
  const [rfp, setRfp] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');

  useEffect(() => {
    const fetchRFP = async () => {
      try {
        const res = await fetch(`/api/rfp/${id}`);
        if (res.ok) {
          const data = await res.json();
          setRfp(data.rfp);
          setNewTitle(data.rfp.title);
          setQuestions(data.questions);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchRFP();
    
    // Poll if processing
    const interval = setInterval(() => {
      if (rfp && rfp.status === 'processing') {
        fetchRFP();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [id, rfp?.status]);

  const handleUpdateTitle = async () => {
    try {
      const res = await fetch(`/api/rfp/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) {
        setRfp(prev => ({ ...prev, title: newTitle }));
        setIsEditingTitle(false);
      }
    } catch (error) {
      console.error('Failed to update title:', error);
    }
  };

  const handleAddQuestion = async () => {
    if (!newQuestionText.trim()) return;
    try {
      const res = await fetch('/api/rfp/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfpId: id, question: newQuestionText }),
      });
      if (res.ok) {
        const newQ = await res.json();
        setQuestions(prev => [...prev, newQ]);
        setNewQuestionText('');
        setIsAddingQuestion(false);
      }
    } catch (error) {
      console.error('Failed to add question:', error);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      const res = await fetch(`/api/rfp/question/${questionId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setQuestions(prev => prev.filter(q => q._id !== questionId));
      }
    } catch (error) {
      console.error('Failed to delete question:', error);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!rfp) return <div className="p-8">RFP not found</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div className="flex-1">
          <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">← Back to Dashboard</Link>
          
          <div className="flex items-center gap-3 mt-2">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="text-3xl font-bold text-slate-900 border-b-2 border-blue-500 outline-none bg-transparent"
                  autoFocus
                />
                <button onClick={handleUpdateTitle} className="text-green-600 hover:text-green-700">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </button>
                <button onClick={() => setIsEditingTitle(false)} className="text-red-600 hover:text-red-700">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="text-3xl font-bold text-slate-900">{rfp.title}</h1>
                <button 
                  onClick={() => setIsEditingTitle(true)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 transition-opacity"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              rfp.status === 'completed' ? 'bg-green-100 text-green-700' :
              rfp.status === 'processing' ? 'bg-blue-100 text-blue-700' :
              'bg-slate-100 text-slate-700'
            }`}>
              {rfp.status.toUpperCase()}
            </span>
            <span className="text-slate-500 text-sm">• {questions.length} Questions</span>
          </div>
        </div>
        
        <button
          onClick={() => setIsAddingQuestion(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Question
        </button>
      </div>

      {isAddingQuestion && (
        <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-2">New Question</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Type your question here..."
            />
            <button
              onClick={handleAddQuestion}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              Add
            </button>
            <button
              onClick={() => setIsAddingQuestion(false)}
              className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider w-1/2">Question</th>
              <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Assignee</th>
              <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {questions.map((q) => (
              <tr key={q._id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <p className="text-sm text-slate-900 font-medium line-clamp-2">{q.question}</p>
                  {q.answer && <p className="text-xs text-slate-500 mt-1 line-clamp-1">{q.answer}</p>}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    q.status === 'done' ? 'bg-green-100 text-green-700' :
                    q.status === 'drafted' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {q.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {q.assignedTo || '-'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Link 
                      href={`/rfp/question/${q._id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Open
                    </Link>
                    <button
                      onClick={() => handleDeleteQuestion(q._id)}
                      className="text-red-400 hover:text-red-600 text-sm"
                      title="Delete Question"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {questions.length === 0 && (
              <tr>
                <td colSpan="4" className="px-6 py-8 text-center text-slate-500">
                  {rfp.status === 'processing' ? 'Extracting questions...' : 'No questions found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
