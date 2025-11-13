import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Chat as GeminiChat } from '@google/genai';
import { useAuth } from '../context/AuthContext';
import { Message, Chat } from '../types';
import { createChatSession, sendMessage, generateChatTitle } from '../services/geminiService';
import Sidebar from './Sidebar';
import ChatMessage from './ChatMessage';
import { SendIcon, MicrophoneIcon } from './Icons';

// Define window interface for TypeScript to recognize SpeechRecognition APIs
interface IWindow extends Window {
  SpeechRecognition: any;
  webkitSpeechRecognition: any;
}
declare const window: IWindow;

const ChatComponent: React.FC = () => {
    const { user } = useAuth();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [chats, setChats] = useState<Chat[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [currentMessage, setCurrentMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const chatSessionsRef = useRef<Map<string, GeminiChat>>(new Map());
    const recognitionRef = useRef<any>(null);
    
    const activeChat = chats.find(c => c.id === activeChatId);

    // Set up Speech Recognition
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("Speech recognition is not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            if (finalTranscript) {
                setCurrentMessage(prev => (prev ? prev.trim() + ' ' : '') + finalTranscript.trim());
            }
        };
        
        recognition.onend = () => {
            setIsRecording(false);
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
             if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                alert("Microphone access was denied. Please allow microphone access in your browser settings to use this feature.");
            }
            setIsRecording(false);
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const handleToggleRecording = () => {
        if (!recognitionRef.current) {
            alert("Sorry, speech recognition is not supported on your browser.");
            return;
        }
        if (isRecording) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
        }
        setIsRecording(!isRecording);
    };

    const createNewChat = useCallback(() => {
        const newChat: Chat = {
            id: `chat_${Date.now()}`,
            name: 'New Chat',
            messages: [{
                id: `msg_${Date.now()}`,
                text: `Hey ${user?.fullName?.split(' ')[0]}, how can I help you? 😊`,
                sender: 'ai',
                timestamp: new Date().toISOString(),
            }],
            isPinned: false,
            isUnread: false,
        };
        setChats(prev => [newChat, ...prev]);
        setActiveChatId(newChat.id);
    }, [user]);

    const handleStartFeedback = useCallback(() => {
        if (!activeChatId) {
            console.warn("No active chat to start feedback in.");
            return;
        }

        const feedbackInitiationMessage: Message = {
            id: `msg_ai_feedback_${Date.now()}`,
            text: "I'd be happy to help with your feedback. On a scale of 1 to 5, how would you rate your overall experience?",
            sender: 'ai',
            timestamp: new Date().toISOString(),
        };

        setChats(prevChats => prevChats.map(chat => 
            chat.id === activeChatId 
                ? { ...chat, messages: [...chat.messages, feedbackInitiationMessage] }
                : chat
        ));
    }, [activeChatId]);

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
                    case 'f':
                        event.preventDefault();
                        handleStartFeedback();
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [createNewChat, handleStartFeedback]);

    useEffect(() => {
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
    
    const handleSelectChat = useCallback((chatId: string) => {
        setActiveChatId(chatId);
        setChats(prevChats =>
            prevChats.map(chat =>
                chat.id === chatId ? { ...chat, isUnread: false } : chat
            )
        );
    }, []);

    const handleDeleteChat = useCallback((chatIdToDelete: string) => {
        if (!window.confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
            return;
        }

        chatSessionsRef.current.delete(chatIdToDelete);
        
        setChats(prevChats => {
            const updatedChats = prevChats.filter(chat => chat.id !== chatIdToDelete);
            if (activeChatId === chatIdToDelete) {
                setActiveChatId(updatedChats[0]?.id || null);
            }
            return updatedChats;
        });
    }, [activeChatId]);

    const handleRenameChat = useCallback((chatId: string, newName: string) => {
        setChats(prevChats => prevChats.map(chat => 
            chat.id === chatId ? { ...chat, name: newName } : chat
        ));
    }, []);

    const handlePinChat = useCallback((chatIdToPin: string) => {
        setChats(prevChats => {
            return prevChats.map(c => c.id === chatIdToPin ? { ...c, isPinned: !c.isPinned } : c);
        });
    }, []);

    const handleSendMessage = async () => {
        const trimmedMessage = currentMessage.trim();
        if (!trimmedMessage || isLoading || !activeChatId || !user || !activeChat) return;

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
                return;
            }
        }
        
        const userMessage: Message = {
            id: `msg_user_${Date.now()}`,
            text: trimmedMessage,
            sender: 'user',
            timestamp: new Date().toISOString(),
        };

        setChats(prevChats => prevChats.map(chat => 
            chat.id === activeChatId 
                ? { ...chat, messages: [...chat.messages, userMessage], isUnread: false }
                : chat
        ));
        setCurrentMessage('');
        setIsLoading(true);
        
        const isNewChatConversation = activeChat.name === 'New Chat';
        const lastMessage = activeChat.messages[activeChat.messages.length - 1];
        const isFeedbackFollowUp = lastMessage?.sender === 'ai' && lastMessage.text.includes("how would you rate your overall experience?");
        const greetingRegex = /^(hi|hello|hey|how are you|what's up|good (morning|afternoon|evening))\s*[.?!]?$/i;
        let titlePromise: Promise<string | null> = Promise.resolve(null);

        if (isNewChatConversation && !greetingRegex.test(trimmedMessage) && !isFeedbackFollowUp) {
            titlePromise = generateChatTitle(trimmedMessage);
        }
        
        try {
            let session = chatSessionsRef.current.get(activeChatId);
            if (!session) {
                const history = activeChat.messages.slice(1);
                session = createChatSession(history);
                chatSessionsRef.current.set(activeChatId, session);
            }
            
            const aiResponseText = await sendMessage(session, trimmedMessage, user);
            const newTitle = await titlePromise;
            
            const aiMessage: Message = {
                id: `msg_ai_${Date.now()}`,
                text: aiResponseText,
                sender: 'ai',
                timestamp: new Date().toISOString(),
            };

            setChats(prevChats => prevChats.map(chat => {
                if (chat.id === activeChatId) {
                    const updatedChat = { 
                        ...chat, 
                        messages: [...chat.messages, aiMessage],
                        isUnread: false,
                    };
                    if (newTitle && newTitle.toLowerCase() !== 'new chat') {
                        updatedChat.name = newTitle.replace(/^"|"$/g, '');
                    }
                    return updatedChat;
                }
                return chat;
            }));

        } catch (error) {
            console.error('Error in ChatComponent while handling send message:', error);
            const errorMessage: Message = {
                id: `msg_err_${Date.now()}`,
                text: "Sorry, I'm having trouble connecting right now. Please try again later. 😅",
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
                onStartFeedback={handleStartFeedback}
                chatHistory={chats}
                onSelectChat={handleSelectChat}
                onDeleteChat={handleDeleteChat}
                onRenameChat={handleRenameChat}
                onPinChat={handlePinChat}
                activeChatId={activeChatId || ''}
            />
            <main className="flex-1 flex flex-col h-screen">
                <header className="p-5 border-b border-light-border dark:border-dark-border">
                    <h1 className="text-3xl font-bold">Service.AI 🎧</h1>
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
                    <div className="flex items-center gap-2 max-w-4xl mx-auto">
                        <div className="relative flex-grow">
                            <textarea
                                value={currentMessage}
                                onChange={(e) => setCurrentMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                placeholder="Type your message or use the microphone..."
                                className="w-full p-4 pr-14 rounded-xl border-2 border-light-border dark:border-dark-border bg-transparent focus:outline-none focus:ring-2 focus:ring-light-accent/50 dark:focus:ring-dark-accent/50 resize-none"
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
                        <button
                            type="button"
                            onClick={handleToggleRecording}
                            title={isRecording ? 'Stop recording' : 'Start voice input'}
                            className={`p-3 rounded-full transition-all duration-200 ease-in-out
                                ${isRecording 
                                    ? 'bg-red-500 text-white animate-pulse' 
                                    : 'text-light-text/70 dark:text-dark-text/70 hover:bg-black/10 dark:hover:bg-white/10'
                                }`}
                        >
                            <MicrophoneIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ChatComponent;