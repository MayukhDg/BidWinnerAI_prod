'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ChatInterface from '@/components/ChatInterface';

export default function ChatPage() {
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const router = useRouter();

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    if (selectedChatId) {
      fetchMessages(selectedChatId);
    }
  }, [selectedChatId]);

  const fetchChats = async () => {
    try {
      const response = await fetch('/api/chat');
      if (response.ok) {
        const data = await response.json();
        setChats(data);
        if (data.length > 0 && !selectedChatId) {
          setSelectedChatId(data[0]._id);
        }
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };

  const fetchMessages = async (chatId) => {
    try {
      const response = await fetch(`/api/chat/${chatId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const createNewChat = async () => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' }),
      });

      if (response.ok) {
        const newChat = await response.json();
        setChats([newChat, ...chats]);
        setSelectedChatId(newChat._id);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  return (
    <div className="px-4 py-6 sm:px-0 h-[calc(100vh-8rem)]">
      <div className="flex h-full gap-4">
        <div className="w-64 bg-white shadow rounded-lg p-4 overflow-y-auto">
          <div className="mb-4">
            <button
              onClick={createNewChat}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              New Chat
            </button>
          </div>
          <div className="space-y-2">
            {chats.map((chat) => (
              <button
                key={chat._id}
                onClick={() => setSelectedChatId(chat._id)}
                className={`w-full text-left p-2 rounded ${
                  selectedChatId === chat._id
                    ? 'bg-blue-100 text-blue-900'
                    : 'hover:bg-gray-100'
                }`}
              >
                <div className="font-medium truncate">{chat.title}</div>
                <div className="text-xs text-gray-500">
                  {chat.messageCount} messages
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 bg-white shadow rounded-lg p-4">
          {selectedChatId ? (
            <ChatInterface chatId={selectedChatId} initialMessages={messages} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select a chat or create a new one
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
