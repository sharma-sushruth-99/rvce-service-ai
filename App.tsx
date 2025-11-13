import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import ChatComponent from './components/ChatComponent';
import { User } from './types';

const UserSelectionScreen = () => {
    const { login, availableUsers } = useAuth();

    return (
        <div className="flex flex-col items-center justify-center h-screen text-center p-4">
            <h1 className="text-5xl font-bold">Service.ai 🎧</h1>
            <p className="mt-4 text-lg">Choose a user to start the simulation.</p>
            <div className="mt-8 space-y-4 w-full max-w-xs">
                {availableUsers.map((user: User) => (
                    <button
                        key={user.id}
                        onClick={() => login(user.email)}
                        className="w-full px-6 py-3 border border-transparent text-lg font-medium rounded-md text-white bg-light-accent hover:bg-light-accent-hover dark:bg-dark-accent dark:hover:bg-dark-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-light-accent/50 dark:focus:ring-dark-accent/50 transition-colors"
                    >
                        Log in as {user.fullName}
                    </button>
                ))}
            </div>
            <p className="mt-8 text-sm text-light-text/70 dark:text-dark-text/70">
                This is a simulation. Selecting a user will start a chat session with their context.
            </p>
        </div>
    );
};


const LoadingScreen = () => (
     <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-light-accent dark:border-dark-accent"></div>
    </div>
);


const AppContent: React.FC = () => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <LoadingScreen />;
    }

    return user ? <ChatComponent /> : <UserSelectionScreen />;
};

const App: React.FC = () => {
    return (
        <ThemeProvider>
            <AuthProvider>
                <div className="font-sans bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text h-screen overflow-hidden">
                    <AppContent />
                </div>
            </AuthProvider>
        </ThemeProvider>
    );
};

export default App;