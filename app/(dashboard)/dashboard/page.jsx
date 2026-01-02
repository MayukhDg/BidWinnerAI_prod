import { auth } from '@clerk/nextjs/server';
import { getCollection } from '@/lib/mongodb';
import Link from 'next/link';

export default async function DashboardPage() {
  const { userId } = await auth();
  
  if (!userId) {
    return <div>Unauthorized</div>;
  }

  const usersCollection = await getCollection('users');
  const user = await usersCollection.findOne({ clerkId: userId });

  if (!user) {
    return <div>User not found</div>;
  }

  const documentsCollection = await getCollection('documents');
  const rfpsCollection = await getCollection('rfps');

  // Get RFP document IDs to exclude them
  const rfps = await rfpsCollection
    .find({ userId: user._id }, { projection: { documentId: 1 } })
    .toArray();
  const rfpDocumentIds = rfps.map(r => r.documentId);

  const documentCount = await documentsCollection.countDocuments({ 
    userId: user._id,
    purpose: { $ne: 'rfp_source' },
    _id: { $nin: rfpDocumentIds }
  });
  const rfpCount = await rfpsCollection.countDocuments({ userId: user._id });
  const completedDocuments = await documentsCollection.countDocuments({
    userId: user._id,
    status: 'completed',
    purpose: { $ne: 'rfp_source' },
    _id: { $nin: rfpDocumentIds }
  });

  const stats = [
    { 
      label: 'Documents', 
      value: documentCount, 
      icon: (
        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      bg: 'bg-primary/10',
    },
    { 
      label: 'RFP Projects', 
      value: rfpCount,
      icon: (
        <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      bg: 'bg-orange-100',
    },
    { 
      label: 'Ready to Use', 
      value: completedDocuments,
      icon: (
        <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bg: 'bg-emerald-100',
    },
  ];

  const quickActions = [
    {
      title: 'Upload Documents',
      description: 'Add your winning proposals to get started',
      href: '/documents',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Start RFP Project',
      description: 'Upload an RFP to get automated answers',
      href: '/rfp/new',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Manage Settings',
      description: 'Configure your account and preferences',
      href: '/settings',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: 'text-slate-600',
      bgColor: 'bg-slate-100',
    },
  ];

  return (
    <div className="space-y-8 fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Welcome back!</h1>
        <p className="text-muted-foreground mt-2">Here's what's happening with your proposals.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-card p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-lg ${stat.bg} flex items-center justify-center`}>
                {stat.icon}
              </div>
              <span className="text-3xl font-bold text-foreground">{stat.value}</span>
            </div>
            <h3 className="text-muted-foreground font-medium">{stat.label}</h3>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action, index) => (
            <Link 
              key={index} 
              href={action.href}
              className="bg-card p-6 rounded-xl border shadow-sm hover:shadow-md hover:border-primary/50 transition-all group"
            >
              <div className={`w-12 h-12 rounded-lg ${action.bgColor} ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                {action.icon}
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                {action.title}
              </h3>
              <p className="text-muted-foreground text-sm">
                {action.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
