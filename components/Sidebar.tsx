import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import { MenuIcon, PlusIcon, LogoutIcon, TrashIcon, EditIcon, FeedbackIcon, PinIcon, SearchIcon } from './Icons';
import { Chat } from '../types';

interface SidebarProps {
    isCollapsed: boolean;
    toggleSidebar: () => void;
    onNewChat: () => void;
    onStartFeedback: () => void;
    chatHistory: Chat[];
    onSelectChat: (id: string) => void;
    onDeleteChat: (id: string) => void;
    onRenameChat: (id: string, newName: string) => void;
    onPinChat: (id: string) => void;
    activeChatId: string;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, toggleSidebar, onNewChat, onStartFeedback, chatHistory, onSelectChat, onDeleteChat, onRenameChat, onPinChat, activeChatId }) => {
    const { user, logout } = useAuth();
    const [editingChatId, setEditingChatId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const renameInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingChatId && renameInputRef.current) {
            renameInputRef.current.focus();
            renameInputRef.current.select();
        }
    }, [editingChatId]);

    const handleRename = () => {
        if (editingChatId && editingName.trim()) {
            onRenameChat(editingChatId, editingName.trim());
        }
        setEditingChatId(null);
        setEditingName('');
    };
    
    const displayedChats = chatHistory
        .filter(chat => chat.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return 0;
        });

    const SidebarButton: React.FC<{ icon: React.ReactNode, label: string, shortcut?: string, onClick?: () => void }> = ({ icon, label, shortcut, onClick }) => (
        <div className="button-row flex items-center justify-between mb-3 cursor-pointer w-full" onClick={onClick}>
            <div className="flex items-center">
                <button className="circle-btn w-10 h-10 rounded-full bg-light-accent text-white border-none flex justify-center items-center text-xl transition-all duration-300 hover:bg-light-accent-hover hover:scale-105 flex-shrink-0">
                    {icon}
                </button>
                <span className={`button-label ml-4 text-base whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    {label}
                </span>
            </div>
            <span className={`shortcut-label text-xs text-light-text/70 dark:text-dark-text/70 uppercase tracking-wider transition-opacity duration-300 ${isCollapsed || !shortcut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                {shortcut}
            </span>
        </div>
    );
    
    return (
        <div className={`sidebar flex flex-col justify-between bg-light-sidebar dark:bg-dark-sidebar border-r border-light-border dark:border-dark-border transition-all duration-500 ease-in-out ${isCollapsed ? 'w-20' : 'w-72'}`}>
            <div>
                <div className="sidebar-buttons p-5">
                    <SidebarButton icon={<MenuIcon className="w-5 h-5" />} label="Collapse" onClick={toggleSidebar} shortcut="Alt+C" />
                    <SidebarButton icon={<PlusIcon className="w-5 h-5" />} label="New Chat" onClick={onNewChat} shortcut="Alt+N" />
                    <SidebarButton icon={<FeedbackIcon className="w-5 h-5" />} label="Give Feedback" onClick={onStartFeedback} shortcut="Alt+F" />
                </div>
                <div className={`px-5 text-sm text-light-text/70 dark:text-dark-text/70 uppercase tracking-wider font-bold ${isCollapsed ? 'hidden' : ''}`}>
                    All Chats
                </div>
                 <div className={`px-3 pt-2 ${isCollapsed ? 'hidden' : ''}`}>
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-light-text/60 dark:text-dark-text/60" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-md pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-light-accent dark:focus:ring-dark-accent"
                        />
                    </div>
                </div>
                <div className={`chat-history mt-2 overflow-y-auto px-2 ${isCollapsed ? 'hidden' : ''}`}>
                    {displayedChats.map(chat => (
                        <div 
                          key={chat.id} 
                          onClick={() => !editingChatId && onSelectChat(chat.id)}
                          className={`group relative flex items-center justify-between text-sm p-3 rounded-lg mb-1 cursor-pointer transition-colors ${activeChatId === chat.id ? 'bg-light-accent/20 dark:bg-dark-accent/40' : 'hover:bg-light-accent/10 dark:hover:bg-dark-accent/20'}`}
                          title={chat.name}
                        >
                            <div className="flex-grow truncate flex items-center gap-2">
                                {chat.isPinned && <PinIcon className="w-4 h-4 text-light-accent dark:text-yellow-500 flex-shrink-0" />}
                                {chat.isUnread && !editingChatId && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>}
                                <div className="truncate">
                                {editingChatId === chat.id ? (
                                    <input
                                        ref={renameInputRef}
                                        type="text"
                                        value={editingName}
                                        onChange={(e) => setEditingName(e.target.value)}
                                        onBlur={handleRename}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleRename();
                                            if (e.key === 'Escape') setEditingChatId(null);
                                        }}
                                        className="w-full bg-transparent border-b border-light-accent dark:border-dark-accent focus:outline-none"
                                    />
                                ) : (
                                    <span className="truncate">
                                    {chat.name}
                                    </span>
                                )}
                                </div>
                            </div>
                          {!isCollapsed && editingChatId !== chat.id && (
                            <div className="absolute right-2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onPinChat(chat.id);
                                    }}
                                    className="p-1 rounded-md text-light-text/60 dark:text-dark-text/60 hover:bg-black/10 dark:hover:bg-white/10"
                                    title={chat.isPinned ? "Unpin chat" : "Pin chat"}
                                >
                                    <PinIcon className={`w-4 h-4 ${chat.isPinned ? 'text-light-accent dark:text-yellow-500' : ''}`} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingChatId(chat.id);
                                        setEditingName(chat.name);
                                    }}
                                    className="p-1 rounded-md text-light-text/60 dark:text-dark-text/60 hover:bg-black/10 dark:hover:bg-white/10"
                                    title="Rename chat"
                                >
                                    <EditIcon className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteChat(chat.id);
                                    }}
                                    className="p-1 rounded-md text-light-text/60 dark:text-dark-text/60 hover:bg-black/10 dark:hover:bg-white/10"
                                    title="Delete chat"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                          )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="pb-5">
                {!isCollapsed && <ThemeToggle />}
                <div className="user-profile border-t border-light-border dark:border-dark-border pt-4 mt-2 mx-5 flex items-center">
                   <div className="w-10 h-10 rounded-full bg-light-accent text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                       {user?.fullName.charAt(0)}
                   </div>
                   <div className={`user-details ml-3 overflow-hidden transition-opacity duration-300 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>
                       <div className="font-bold text-sm truncate">{user?.fullName}</div>
                       <div className="text-xs text-light-text/70 dark:text-dark-text/70 truncate">{user?.email}</div>
                   </div>
                   <button 
                        onClick={logout} 
                        className={`ml-auto text-light-text/80 dark:text-dark-text/80 hover:text-red-500 dark:hover:text-red-400 transition-opacity duration-300 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`} title="Logout">
                       <LogoutIcon className="w-6 h-6"/>
                   </button>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;