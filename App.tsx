import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import ChatComponent from './components/ChatComponent';

const LoggedOutScreen = () => (
    <div className="flex flex-col items-center justify-center h-screen text-center p-4">
        <h1 className="text-5xl font-bold">Service.ai 🎧</h1>
        <p className="mt-4 text-lg">You have been logged out.</p>
        <p className="mt-2 text-sm text-light-text/70 dark:text-dark-text/70">
            Please refresh the page to start a new simulation as Rahul Singh.
        </p>
    </div>
);

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

    return user ? <ChatComponent /> : <LoggedOutScreen />;
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