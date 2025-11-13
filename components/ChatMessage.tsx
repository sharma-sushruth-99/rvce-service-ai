
import React from 'react';
import { Message } from '../types';

const formatTimestamp = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    // Format: HH:MM:SS
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch (error) {
    console.error("Error formatting timestamp:", error);
    return '';
  }
};

const SimpleMarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
    // Regex to find **bold** and _underline_ parts, capturing them to preserve order.
    const parts = text.split(/(\*\*.*?\*\*|_.*?_)/g);

    return (
        <>
            {parts.map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={index}>{part.slice(2, -2)}</strong>;
                }
                if (part.startsWith('_') && part.endsWith('_')) {
                    return <u key={index}>{part.slice(1, -1)}</u>;
                }
                // Return the plain text part
                return part;
            })}
        </>
    );
};


const ChatMessage: React.FC<{ message: Message }> = ({ message }) => {
    const isUser = message.sender === 'user';
    const contactSupportToken = '[CONTACT_SUPPORT]';
    const showContactInfo = !isUser && message.text.includes(contactSupportToken);
    const displayText = message.text.replace(contactSupportToken, '').trim();

    return (
        <div className={`flex items-start gap-4 p-4 md:p-6 ${isUser ? '' : 'bg-black/5 dark:bg-white/5'}`}>
            <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xl ${isUser ? 'bg-light-accent text-white font-bold text-sm' : 'bg-gray-300 dark:bg-gray-600'}`}>
                {isUser ? 'You' : '🎧'}
            </div>
            <div className="flex-grow">
                <div className="flex items-baseline gap-2">
                    <span className="font-bold">{isUser ? 'You' : 'Service.AI'}</span>
                    <span className="text-xs text-light-text/60 dark:text-dark-text/60">
                        {formatTimestamp(message.timestamp)}
                    </span>
                </div>
                <p className="text-base whitespace-pre-wrap mt-1">
                    <SimpleMarkdownRenderer text={displayText} />
                </p>
                {showContactInfo && (
                    <div className="mt-2 text-sm text-light-text/70 dark:text-dark-text/70">
                        Contacting customer service (+91 0101010101)
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatMessage;