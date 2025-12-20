import { auth } from '@clerk/nextjs/server';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import ChatInterface from '@/components/ChatInterface';
import { redirect } from 'next/navigation';

export default async function ChatDetailPage({ params }) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  const usersCollection = await getCollection('users');
  const user = await usersCollection.findOne({ clerkId: userId });

  if (!user) {
    redirect('/sign-in');
  }

  const chatId = params.chatId;
  const chatsCollection = await getCollection('chats');
  const chat = await chatsCollection.findOne({
    _id: new ObjectId(chatId),
    userId: user._id,
  });

  if (!chat) {
    redirect('/chat');
  }

  const messagesCollection = await getCollection('messages');
  const messages = await messagesCollection
    .find({ chatId: new ObjectId(chatId) })
    .sort({ createdAt: 1 })
    .toArray();

  return (
    <div className="px-4 py-6 sm:px-0 h-[calc(100vh-8rem)]">
      <div className="bg-white shadow rounded-lg p-4 h-full">
        <h1 className="text-2xl font-bold mb-4">{chat.title}</h1>
        <ChatInterface chatId={chatId} initialMessages={messages} />
      </div>
    </div>
  );
}
