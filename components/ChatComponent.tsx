import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Message, Chat } from '../types';
import { callGeminiApi } from '../services/geminiService';
import Sidebar from './Sidebar';
import ChatMessage from './ChatMessage';
import { SendIcon } from './Icons';

const ChatComponent: React.FC = () => {
    const { user } = useAuth();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [chats, setChats] = useState<Chat[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [currentMessage, setCurrentMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    
    const activeChat = chats.find(c => c.id === activeChatId);

    const createNewChat = useCallback(() => {
        const newChat: Chat = {
            id: `chat_${Date.now()}`,
            name: 'New Chat',
            messages: [{
                id: `msg_${Date.now()}`,
                text: `Hey ${user?.fullName?.split(' ')[0]}, how can I help you?`,
                sender: 'ai',
                timestamp: new Date().toISOString(),
            }],
        };
        setChats(prev => [newChat, ...prev]);
        setActiveChatId(newChat.id);
    }, [user]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const activeEl = document.activeElement;
            if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
                return;
            }

            if (event.altKey) {
                switch (event.key.toLowerCase()) {
                    case 'c':
                        event.preventDefault();
                        setIsSidebarCollapsed(prev => !prev);
                        break;
                    case 'n':
                        event.preventDefault();
                        createNewChat();
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [createNewChat]);

    useEffect(() => {
        // Initialize with a new chat if no chats exist
        if (chats.length === 0 && user) {
            createNewChat();
        }
        if (!activeChatId && chats.length > 0) {
            setActiveChatId(chats[0].id);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, chats.length]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeChat?.messages]);

    const handleDeleteChat = (chatIdToDelete: string) => {
        if (window.confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
            const updatedChats = chats.filter(chat => chat.id !== chatIdToDelete);
            
            if (activeChatId === chatIdToDelete) {
                // If the active chat is deleted, switch to the first available chat or create a new one.
                const newActiveId = updatedChats[0]?.id || null;
                setActiveChatId(newActiveId);
            }
            setChats(updatedChats);

        }
    };

    const handleRenameChat = (chatId: string, newName: string) => {
        setChats(prevChats => prevChats.map(chat => 
            chat.id === chatId ? { ...chat, name: newName } : chat
        ));
    };

    const handleSendMessage = async () => {
        const trimmedMessage = currentMessage.trim();
        if (!trimmedMessage || isLoading || !activeChatId || !user) return;

        // --- Client-side command handling ---
        const renameRegex = /^\/rename\s+(?:"([^"]+)"|'([^']+)'|(.+))$/;
        const renameMatch = trimmedMessage.match(renameRegex);

        if (renameMatch) {
            const newName = (renameMatch[1] || renameMatch[2] || renameMatch[3] || '').trim();
            if (newName) {
                handleRenameChat(activeChatId, newName);
                const systemMessage: Message = {
                    id: `msg_sys_${Date.now()}`,
                    text: `Chat renamed to "${newName}".`,
                    sender: 'ai',
                    timestamp: new Date().toISOString(),
                };
                setChats(prevChats => prevChats.map(chat => 
                    chat.id === activeChatId ? { ...chat, messages: [...chat.messages, systemMessage] } : chat
                ));
                setCurrentMessage('');
                return; // Command handled, do not send to AI
            }
        }

        // --- Regular message sending ---
        const userMessage: Message = {
            id: `msg_user_${Date.now()}`,
            text: trimmedMessage,
            sender: 'user',
            timestamp: new Date().toISOString(),
        };

        setChats(prevChats => prevChats.map(chat => 
            chat.id === activeChatId 
                ? { ...chat, messages: [...chat.messages, userMessage] }
                : chat
        ));
        
        setCurrentMessage('');
        setIsLoading(true);

        try {
            const history = activeChat?.messages.slice(1) || []; // Exclude initial greeting
            const aiResponseText = await callGeminiApi(trimmedMessage, history, user);
            
            const aiMessage: Message = {
                id: `msg_ai_${Date.now()}`,
                text: aiResponseText,
                sender: 'ai',
                timestamp: new Date().toISOString(),
            };

            setChats(prevChats => prevChats.map(chat => {
                if (chat.id === activeChatId) {
                    const updatedChat = { ...chat, messages: [...chat.messages, aiMessage] };
                    // A 'New Chat' is renamed only after the first user message is sent.
                    // At this point, the chat from prevChats has 2 messages: the initial AI greeting and the first user message.
                    if (chat.name === 'New Chat' && chat.messages.length === 2) {
                        const firstUserMessage = chat.messages.find(m => m.sender === 'user');
                        if (firstUserMessage) {
                           updatedChat.name = firstUserMessage.text.substring(0, 25) + (firstUserMessage.text.length > 25 ? '...' : '');
                        }
                    }
                    return updatedChat;
                }
                return chat;
            }));

        } catch (error) {
            console.error('Error calling Gemini API:', error);
            const errorMessage: Message = {
                id: `msg_err_${Date.now()}`,
                text: "Sorry, I'm having trouble connecting right now. Please try again later.",
                sender: 'ai',
                timestamp: new Date().toISOString(),
            };
            setChats(prevChats => prevChats.map(chat => 
                chat.id === activeChatId 
                    ? { ...chat, messages: [...chat.messages, errorMessage] }
                    : chat
            ));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen">
            <Sidebar 
                isCollapsed={isSidebarCollapsed}
                toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                onNewChat={createNewChat}
                chatHistory={chats.map(({id, name}) => ({id, name}))}
                onSelectChat={setActiveChatId}
                onDeleteChat={handleDeleteChat}
                onRenameChat={handleRenameChat}
                activeChatId={activeChatId || ''}
            />
            <main className="flex-1 flex flex-col h-screen">
                <header className="p-5 border-b border-light-border dark:border-dark-border">
                    <h1 className="text-xl font-bold">Service.AI 🎧</h1>
                </header>
                <div className="flex-1 overflow-y-auto">
                    {activeChat?.messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
                    {isLoading && (
                        <div className="flex items-center justify-center p-4">
                           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-light-accent dark:border-dark-accent"></div>
                           <p className="ml-3">Service.AI is thinking...</p>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
                <div className="p-4 border-t border-light-border dark:border-dark-border">
                    <div className="max-w-4xl mx-auto">
                        <div className="relative">
                            <textarea
                                value={currentMessage}
                                onChange={(e) => setCurrentMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                placeholder="Type your message..."
                                className="w-full p-4 pr-16 rounded-xl border-2 border-light-border dark:border-dark-border bg-transparent focus:outline-none focus:ring-2 focus:ring-light-accent/50 dark:focus:ring-dark-accent/50 resize-none"
                                rows={1}
                                disabled={isLoading}
                            />
                            <button 
                                onClick={handleSendMessage} 
                                disabled={isLoading || !currentMessage.trim()}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-light-accent text-white disabled:bg-gray-400 hover:bg-light-accent-hover transition-colors"
                            >
                                <SendIcon className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ChatComponent;