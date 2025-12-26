'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function PricingPage() {
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);
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
    } finally {
      setIsLoadingSubscription(false);
    }
  };

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/polar/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: process.env.NEXT_PUBLIC_POLAR_PRODUCT_ID,
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

  const isPro = subscription?.isPro;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {success && (
        <div className="mb-8 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-center fade-in">
          <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="font-medium">Payment successful! Welcome to BidWinner AI Pro.</p>
        </div>
      )}

      <div className="text-center mb-12 fade-in">
        <h1 className="text-4xl font-bold text-slate-800 mb-4">
          Upgrade to <span className="gradient-text">Pro</span>
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          Unlock unlimited access to BidWinner AI and supercharge your proposal writing.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 slide-up">
        {/* Free Plan */}
        <div className="card p-8 border-2 border-slate-200">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-700 mb-2">Free</h2>
            <div className="text-4xl font-bold text-slate-800">
              $0
              <span className="text-lg font-normal text-slate-500">/forever</span>
            </div>
          </div>

          <ul className="space-y-4 mb-8">
            <li className="flex items-center gap-3 text-slate-600">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              1 Chat conversation
            </li>
            <li className="flex items-center gap-3 text-slate-600">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              10 Document uploads
            </li>
            <li className="flex items-center gap-3 text-slate-600">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              AI-powered proposals
            </li>
            <li className="flex items-center gap-3 text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="line-through">Unlimited chats</span>
            </li>
            <li className="flex items-center gap-3 text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="line-through">Unlimited documents</span>
            </li>
          </ul>

          <button
            disabled
            className="w-full py-3 px-6 rounded-xl font-medium bg-slate-100 text-slate-400 cursor-not-allowed"
          >
            Current Plan
          </button>
        </div>

        {/* Pro Plan */}
        <div className="card p-8 border-2 border-indigo-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold px-4 py-1 rounded-bl-xl">
            RECOMMENDED
          </div>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-700 mb-2">Pro</h2>
            <div className="text-4xl font-bold text-slate-800">
              $60
              <span className="text-lg font-normal text-slate-500">/month</span>
            </div>
            <p className="text-sm text-indigo-600 mt-1">Cancel anytime</p>
          </div>

          <ul className="space-y-4 mb-8">
            <li className="flex items-center gap-3 text-slate-600">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <strong>Unlimited</strong> Chat conversations
            </li>
            <li className="flex items-center gap-3 text-slate-600">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <strong>Unlimited</strong> Document uploads
            </li>
            <li className="flex items-center gap-3 text-slate-600">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              AI-powered proposals
            </li>
            <li className="flex items-center gap-3 text-slate-600">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Priority support
            </li>
            <li className="flex items-center gap-3 text-slate-600">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Future updates included
            </li>
          </ul>

          {isLoadingSubscription ? (
            <button
              disabled
              className="w-full py-3 px-6 rounded-xl font-medium bg-slate-100 text-slate-400"
            >
              Loading...
            </button>
          ) : isPro ? (
            <button
              disabled
              className="w-full py-3 px-6 rounded-xl font-medium bg-emerald-100 text-emerald-600 cursor-default"
            >
              ✓ You have Pro access
            </button>
          ) : (
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full btn-primary py-3 px-6 font-medium disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                'Upgrade to Pro - $60/mo'
              )}
            </button>
          )}
        </div>
      </div>

      <div className="mt-12 text-center text-slate-500 text-sm fade-in">
        <p>Secure payment powered by Polar. Cancel anytime.</p>
      </div>
    </div>
  );
}
