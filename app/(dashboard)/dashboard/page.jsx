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
  const chatsCollection = await getCollection('chats');

  const documentCount = await documentsCollection.countDocuments({ userId: user._id });
  const chatCount = await chatsCollection.countDocuments({ userId: user._id });
  const completedDocuments = await documentsCollection.countDocuments({
    userId: user._id,
    status: 'completed',
  });

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome back! Here's an overview of your account.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Documents</dt>
                  <dd className="text-lg font-medium text-gray-900">{documentCount}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Chats</dt>
                  <dd className="text-lg font-medium text-gray-900">{chatCount}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Processed</dt>
                  <dd className="text-lg font-medium text-gray-900">{completedDocuments}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/documents"
            className="p-4 border rounded-lg hover:bg-gray-50 transition"
          >
            <h3 className="font-semibold">Upload Documents</h3>
            <p className="text-sm text-gray-600 mt-1">
              Add your winning proposals to get started
            </p>
          </Link>
          <Link
            href="/chat"
            className="p-4 border rounded-lg hover:bg-gray-50 transition"
          >
            <h3 className="font-semibold">Start New Chat</h3>
            <p className="text-sm text-gray-600 mt-1">
              Ask questions about your proposals
            </p>
          </Link>
          <Link
            href="/settings"
            className="p-4 border rounded-lg hover:bg-gray-50 transition"
          >
            <h3 className="font-semibold">Settings</h3>
            <p className="text-sm text-gray-600 mt-1">
              Manage your account and subscription
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
