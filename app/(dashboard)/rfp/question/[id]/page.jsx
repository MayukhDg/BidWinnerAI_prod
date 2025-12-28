'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function QuestionEditorPage({ params }) {
  const { id } = params;
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        const res = await fetch(`/api/rfp/question/${id}`);
        if (res.ok) {
          const data = await res.json();
          setQuestion(data);
          setAnswer(data.answer || '');
          setAssignedTo(data.assignedTo || '');
          setStatus(data.status || 'pending');
          // Initialize chat with a welcome message
          setChatMessages([{
            role: 'assistant',
            content: 'Hi! I can help you refine this answer. Ask me to find specific details or rewrite sections based on your documents.'
          }]);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestion();
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/rfp/question/${id}/generate`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setAnswer(data.answer);
        setStatus('drafted');
      }
    } catch (error) {
      console.error('Failed to generate answer:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/rfp/question/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer, assignedTo, status }),
      });
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch(`/api/rfp/question/${id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatMessages, userMsg],
          currentAnswer: answer
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } catch (error) {
      console.error('Chat failed:', error);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!question) return <div className="p-8">Question not found</div>;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-slate-50">
      <div className="flex w-full max-w-7xl mx-auto gap-6 p-6">
        
        {/* Left Panel: Editor */}
        <div className="flex-1 flex flex-col bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <Link href={`/rfp/${question.rfpId}`} className="text-sm text-slate-500 hover:text-slate-700 mb-4 block">
              ← Back to Project
            </Link>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Question</h2>
            <div className="bg-slate-50 p-4 rounded-lg text-slate-800 text-sm leading-relaxed">
              {question.question}
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            <div className="mb-6 h-full flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-700">Answer Draft</label>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full hover:bg-purple-200 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {generating ? (
                    <>
                      <span className="animate-spin">✨</span> Generating...
                    </>
                  ) : (
                    <>
                      <span>✨</span> Auto-Draft
                    </>
                  )}
                </button>
              </div>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="flex-1 w-full p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none text-sm leading-relaxed"
                placeholder="Draft your answer here..."
              />
            </div>
          </div>

          <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
            <div className="flex gap-4 w-full">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Assigned To</label>
                <input
                  type="text"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="Unassigned"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="pending">Pending</option>
                  <option value="drafted">Drafted</option>
                  <option value="approved">Approved</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:bg-blue-300 h-[38px]"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Chat Assistant */}
        <div className="w-[400px] flex flex-col bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <span>🤖</span> AI Assistant
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg p-3 text-sm ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white border border-slate-200 text-slate-800 shadow-sm'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.role === 'assistant' && (
                    <button 
                      onClick={() => setAnswer(prev => prev + (prev ? '\n\n' : '') + msg.content)}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                    >
                      <span>📋</span> Append to Answer
                    </button>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75" />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150" />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 border-t border-slate-200 bg-white">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask for details or refinements..."
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="bg-slate-900 text-white p-2 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
