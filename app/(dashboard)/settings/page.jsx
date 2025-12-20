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

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-600">
          Manage your account and subscription.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Account Information</h2>
          <div className="space-y-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <p className="mt-1 text-sm text-gray-900">{user.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <p className="mt-1 text-sm text-gray-900">{user.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Subscription Tier</label>
              <p className="mt-1 text-sm text-gray-900 capitalize">{user.subscriptionTier}</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Subscription</h2>
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold">Free Plan</h3>
              <p className="text-sm text-gray-600 mt-1">
                Basic features with limited document processing
              </p>
              {user.subscriptionTier === 'free' && (
                <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                  Current Plan
                </span>
              )}
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold">Pro Plan</h3>
              <p className="text-sm text-gray-600 mt-1">
                $49/month - Enhanced features and priority processing
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold">Enterprise Plan</h3>
              <p className="text-sm text-gray-600 mt-1">
                $99/month - Unlimited documents and advanced features
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
