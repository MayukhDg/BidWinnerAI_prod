'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function RFPListPage() {
  const [rfps, setRfps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchRFPs();
  }, []);

  const fetchRFPs = async () => {
    try {
      const res = await fetch('/api/rfp');
      if (res.ok) {
        const data = await res.json();
        setRfps(data);
      }
    } catch (error) {
      console.error('Error fetching RFPs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.preventDefault(); // Prevent navigation
    if (!confirm('Are you sure you want to delete this RFP project? This action cannot be undone.')) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/rfp/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setRfps(rfps.filter(r => r._id !== id));
      } else {
        alert('Failed to delete RFP');
      }
    } catch (error) {
      console.error('Error deleting RFP:', error);
      alert('An error occurred');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">RFP Projects</h1>
          <p className="text-muted-foreground mt-2">Manage your Request for Proposals and automated answers.</p>
        </div>
        <Link href="/rfp/new">
          <Button className="gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </Button>
        </Link>
      </div>

      {rfps.length === 0 ? (
        <div className="bg-card rounded-xl shadow-sm border border-border p-12 text-center">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No RFP Projects Yet</h3>
          <p className="text-muted-foreground mb-6">Upload an RFP document to get started with automated answering.</p>
          <Link href="/rfp/new">
            <Button variant="link" className="text-primary">
              Start your first project →
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {rfps.map((rfp) => (
            <Link
              key={rfp._id}
              href={`/rfp/${rfp._id}`}
              className="block bg-card border border-border rounded-xl p-6 hover:border-primary/50 hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                    {rfp.title || 'Untitled Project'}
                  </h3>
                  <p className="text-muted-foreground mt-1">
                    Created on {new Date(rfp.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    rfp.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    rfp.status === 'processing' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {rfp.status || 'draft'}
                  </span>
                  <button
                    onClick={(e) => handleDelete(e, rfp._id)}
                    disabled={deletingId === rfp._id}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    {deletingId === rfp._id ? (
                      <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
