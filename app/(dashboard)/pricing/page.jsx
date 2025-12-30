'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function PricingPage() {
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const success = searchParams.get('success');

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const response = await fetch('/api/user/subscription');
      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const handlePurchase = async (packageId) => {
    setLoading(true);
    try {
      const response = await fetch('/api/polar/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId,
        }),
      });

      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      alert('Failed to create checkout session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {success && (
        <div className="mb-8 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-center fade-in">
          <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="font-medium">Payment successful! Credits have been added to your account.</p>
        </div>
      )}

      <div className="text-center mb-12 fade-in">
        <h1 className="text-4xl font-bold text-slate-800 mb-4">
          Purchase <span className="gradient-text">Credits</span>
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          Pay as you go. No monthly subscriptions.
        </p>
        <div className="mt-4 inline-flex items-center px-4 py-2 rounded-full bg-indigo-50 text-indigo-700 font-medium">
          Current Balance: {subscription?.credits || 0} Credits
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 slide-up">
        {/* 1 Credit */}
        <div className="card p-8 border-2 border-slate-200 hover:border-indigo-200 transition-colors">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-700 mb-2">1 Credit</h2>
            <div className="text-4xl font-bold text-slate-800">
              $15
            </div>
            <p className="text-slate-500 mt-2">Perfect for a single RFP</p>
          </div>

          <ul className="space-y-4 mb-8">
            <li className="flex items-center gap-3 text-slate-600">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Generate 1 Full Proposal
            </li>
            <li className="flex items-center gap-3 text-slate-600">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Unlimited Document Uploads
            </li>
          </ul>

          <button
            onClick={() => handlePurchase('ONE_CREDIT')}
            disabled={loading}
            className="w-full py-3 px-6 rounded-xl bg-white border-2 border-indigo-600 text-indigo-600 font-semibold hover:bg-indigo-50 transition-all duration-200 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Buy 1 Credit'}
          </button>
        </div>

        {/* 5 Credits */}
        <div className="card p-8 border-2 border-indigo-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
            BEST VALUE
          </div>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-700 mb-2">5 Credits</h2>
            <div className="text-4xl font-bold text-slate-800">
              $60
            </div>
            <p className="text-slate-500 mt-2">Save $15</p>
          </div>

          <ul className="space-y-4 mb-8">
            <li className="flex items-center gap-3 text-slate-600">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Generate 5 Full Proposals
            </li>
            <li className="flex items-center gap-3 text-slate-600">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Unlimited Document Uploads
            </li>
            <li className="flex items-center gap-3 text-slate-600">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Priority Support
            </li>
          </ul>

          <button
            onClick={() => handlePurchase('FIVE_CREDITS')}
            disabled={loading}
            className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-200 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Buy 5 Credits'}
          </button>
        </div>
      </div>
    </div>
  );
}
