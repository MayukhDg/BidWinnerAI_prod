'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ChatInterface from '@/components/ChatInterface';

export default function ChatPage() {
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [chatLimitMessage, setChatLimitMessage] = useState('');
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const menuRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    if (selectedChatId) {
      fetchMessages(selectedChatId);
    }
  }, [selectedChatId]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchChats = async () => {
    setIsLoadingChats(true);
    try {
      const response = await fetch('/api/chat');
      if (response.ok) {
        const data = await response.json();
        setChats(data);
        setChatLimitMessage(data.length > 0 ? 'Chat limit reached. Delete the existing chat to start fresh.' : '');
        if (data.length > 0 && !selectedChatId) {
          setSelectedChatId(data[0]._id);
        }
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setIsLoadingChats(false);
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
        setChats(prevChats => [newChat, ...prevChats]);
        setSelectedChatId(newChat._id);
        setMessages([]);
        setChatLimitMessage('Chat limit reached. Delete the existing chat to start fresh.');
      } else {
        const errorData = await response.json().catch(() => null);
        setChatLimitMessage(errorData?.error || 'Unable to create another chat right now.');
        return;
      }
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  const renameChat = async (chatId, newTitle) => {
    if (!newTitle.trim()) {
      setEditingChatId(null);
      return;
    }

    try {
      const response = await fetch(`/api/chat/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() }),
      });

      if (response.ok) {
        setChats(chats.map(chat => 
          chat._id === chatId ? { ...chat, title: newTitle.trim() } : chat
        ));
      }
    } catch (error) {
      console.error('Error renaming chat:', error);
    } finally {
      setEditingChatId(null);
    }
  };

  const deleteChat = async (chatId) => {
    if (!confirm('Are you sure you want to delete this chat? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/chat/${chatId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setChats(prevChats => {
          const remainingChats = prevChats.filter(chat => chat._id !== chatId);
          setChatLimitMessage(remainingChats.length > 0 ? 'Chat limit reached. Delete the existing chat to start fresh.' : '');

          if (selectedChatId === chatId) {
            if (remainingChats.length > 0) {
              setSelectedChatId(remainingChats[0]._id);
            } else {
              setSelectedChatId(null);
              setMessages([]);
            }
          }

          return remainingChats;
        });
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
    setMenuOpenId(null);
  };

  const startEditing = (chat) => {
    setEditingChatId(chat._id);
    setEditTitle(chat.title);
    setMenuOpenId(null);
  };

  const handleEditKeyDown = (e, chatId) => {
    if (e.key === 'Enter') {
      renameChat(chatId, editTitle);
    } else if (e.key === 'Escape') {
      setEditingChatId(null);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] fade-in">
      <div className="flex h-full gap-6">
        {/* Sidebar */}
        <div className="w-72 flex flex-col">
          <div className="mb-4">
            <button
              onClick={createNewChat}
              disabled={isLoadingChats || chats.length > 0}
              className={`w-full btn-primary flex items-center justify-center gap-2 py-3 ${
                isLoadingChats || chats.length > 0 ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Chat
            </button>
            {chatLimitMessage && (
              <p className="mt-2 text-xs text-indigo-500 text-center">{chatLimitMessage}</p>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {isLoadingChats ? (
              <div className="space-y-2 animate-pulse">
                {[...Array(3)].map((_, idx) => (
                  <div key={idx} className="h-16 rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : chats.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm">No chats yet</p>
              </div>
            ) : (
              chats.map((chat, index) => (
                <div
                  key={chat._id}
                  className={`relative w-full text-left p-3 rounded-xl transition-all duration-200 group slide-up ${
                    selectedChatId === chat._id
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25'
                      : 'bg-white/70 hover:bg-white hover:shadow-md border border-slate-100 hover:border-slate-200'
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div 
                    className="flex items-start gap-3 cursor-pointer"
                    onClick={() => !editingChatId && setSelectedChatId(chat._id)}
                  >
                    <div className={`mt-0.5 p-1.5 rounded-lg ${
                      selectedChatId === chat._id 
                        ? 'bg-white/20' 
                        : 'bg-indigo-50 group-hover:bg-indigo-100'
                    }`}>
                      <svg className={`w-4 h-4 ${
                        selectedChatId === chat._id ? 'text-white' : 'text-indigo-500'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      {editingChatId === chat._id ? (
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => handleEditKeyDown(e, chat._id)}
                          onBlur={() => renameChat(chat._id, editTitle)}
                          className="w-full bg-white/90 text-slate-800 px-2 py-1 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/50"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <>
                          <div className={`font-medium truncate ${
                            selectedChatId === chat._id ? 'text-white' : 'text-slate-700'
                          }`}>
                            {chat.title}
                          </div>
                          <div className={`text-xs mt-0.5 ${
                            selectedChatId === chat._id ? 'text-indigo-100' : 'text-slate-400'
                          }`}>
                          </div>
                        </>
                      )}
                    </div>
                    
                    {/* Menu button */}
                    {!editingChatId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(menuOpenId === chat._id ? null : chat._id);
                        }}
                        className={`p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${
                          selectedChatId === chat._id 
                            ? 'hover:bg-white/20 text-white' 
                            : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Dropdown menu */}
                  {menuOpenId === chat._id && (
                    <div 
                      ref={menuRef}
                      className="absolute right-2 top-12 z-50 bg-white rounded-xl shadow-xl border border-slate-100 py-1 min-w-[140px] fade-in"
                    >
                      <button
                        onClick={() => startEditing(chat)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Rename
                      </button>
                      <button
                        onClick={() => deleteChat(chat._id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main chat area */}
        <div className="flex-1 card overflow-hidden">
          {isLoadingChats ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <svg className="animate-spin h-10 w-10 text-indigo-500 mb-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-sm">Loading chats...</p>
            </div>
          ) : selectedChatId ? (
            <ChatInterface key={selectedChatId} chatId={selectedChatId} initialMessages={messages} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-slate-600">Select a chat or create a new one</p>
              <p className="text-sm mt-1">Your AI-powered proposal assistant awaits</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
