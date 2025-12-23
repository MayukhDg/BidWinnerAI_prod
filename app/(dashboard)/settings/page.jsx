import { auth } from '@clerk/nextjs/server';
import { getCollection } from '@/lib/mongodb';

export default async function SettingsPage() {
  const { userId } = await auth();
  
  if (!userId) {
    return <div>Unauthorized</div>;
  }

  const usersCollection = await getCollection('users');
  const user = await usersCollection.findOne({ clerkId: userId });

  if (!user) {
    return <div>User not found</div>;
  }

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Get started with basic features',
      features: ['5 documents', '50 AI queries/month', 'Basic support'],
      current: user.subscriptionTier === 'free',
      gradient: 'from-slate-500 to-slate-600',
      shadow: 'shadow-slate-500/20',
    },
    {
      name: 'Pro',
      price: '$49',
      period: '/month',
      description: 'Perfect for growing businesses',
      features: ['50 documents', 'Unlimited queries', 'Priority support', 'Advanced analytics'],
      current: user.subscriptionTier === 'pro',
      gradient: 'from-indigo-500 to-purple-600',
      shadow: 'shadow-indigo-500/30',
      popular: true,
    },
    {
      name: 'Enterprise',
      price: '$99',
      period: '/month',
      description: 'For teams with advanced needs',
      features: ['Unlimited documents', 'Unlimited queries', 'Dedicated support', 'Custom integrations', 'Team collaboration'],
      current: user.subscriptionTier === 'enterprise',
      gradient: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-500/30',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8 fade-in">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Settings</h1>
        <p className="text-slate-500">
          Manage your account and subscription.
        </p>
      </div>

      {/* Account Information */}
      <div className="card p-6 mb-8 slide-up">
        <h2 className="text-xl font-semibold text-slate-800 mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Account Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
            <p className="text-slate-800 font-medium">{user.email}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <label className="block text-sm font-medium text-slate-400 mb-1">Name</label>
            <p className="text-slate-800 font-medium">{user.name || 'Not set'}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <label className="block text-sm font-medium text-slate-400 mb-1">Current Plan</label>
            <p className="text-slate-800 font-medium capitalize flex items-center gap-2">
              {user.subscriptionTier}
              {user.subscriptionTier !== 'free' && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white">Active</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Subscription Plans */}
      { /* <div className="slide-up" style={{ animationDelay: '100ms' }}>
        <h2 className="text-xl font-semibold text-slate-800 mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          Subscription Plans
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`relative card p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                plan.current ? 'ring-2 ring-indigo-500' : ''
              } ${plan.popular ? 'border-indigo-200' : ''}`}
              style={{ animationDelay: `${(index + 2) * 100}ms` }}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30">
                    Most Popular
                  </span>
                </div>
              )}
              {plan.current && (
                <div className="absolute -top-3 right-4">
                  <span className="px-3 py-1 text-xs font-medium rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                    Current Plan
                  </span>
                </div>
              )}
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center shadow-lg ${plan.shadow} mb-4`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-3xl font-bold text-slate-800">{plan.price}</span>
                <span className="text-slate-400 text-sm">{plan.period}</span>
              </div>
              <p className="text-slate-500 text-sm mb-4">{plan.description}</p>
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-slate-600">
                    <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                className={`w-full py-2.5 rounded-xl font-medium transition-all duration-200 ${
                  plan.current
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : plan.popular
                    ? 'btn-primary'
                    : 'btn-secondary'
                }`}
                disabled={plan.current}
              >
                {plan.current ? 'Current Plan' : 'Upgrade'}
              </button>
            </div>
          ))}
        </div>
      </div> */}

      {/* Danger Zone */}
      <div className="mt-8 card p-6 border-red-100 slide-up" style={{ animationDelay: '400ms' }}>
        <h2 className="text-xl font-semibold text-red-600 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Danger Zone
        </h2>
        <p className="text-slate-500 text-sm mb-4">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <button className="px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-all duration-200">
          Delete Account
        </button>
      </div>
    </div>
  );
}
