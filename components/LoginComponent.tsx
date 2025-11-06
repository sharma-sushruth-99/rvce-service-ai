
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const LoginComponent: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        // In this demo, we only check the email.
        const user = login(email);

        if (!user) {
            setError('Invalid credentials. Please try again.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-light-bg dark:bg-dark-bg">
            <div className="w-full max-w-md p-8 space-y-8 bg-light-sidebar dark:bg-dark-sidebar rounded-xl shadow-lg">
                <div className="text-center">
                    <h1 className="text-4xl font-bold">Service.AI 🎧</h1>
                    <p className="mt-2 text-sm text-light-text/80 dark:text-dark-text/80">Customer Support Demo</p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email-address" className="sr-only">Email address</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-light-border dark:border-dark-border placeholder-gray-500 bg-transparent rounded-t-md focus:outline-none focus:ring-light-accent dark:focus:ring-dark-accent focus:border-light-accent dark:focus:border-dark-accent focus:z-10 sm:text-sm"
                                placeholder="Email address (e.g. rahul.singh@example.com)"
                            />
                        </div>
                        <div>
                            <label htmlFor="password-for-demo" className="sr-only">Password</label>
                            <input
                                id="password-for-demo"
                                name="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-light-border dark:border-dark-border placeholder-gray-500 bg-transparent rounded-b-md focus:outline-none focus:ring-light-accent dark:focus:ring-dark-accent focus:border-light-accent dark:focus:border-dark-accent focus:z-10 sm:text-sm"
                                placeholder="Password (any password works for demo)"
                            />
                        </div>
                    </div>

                    {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                    <div>
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-light-accent hover:bg-light-accent-hover dark:bg-dark-accent dark:hover:bg-dark-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-light-accent/50 dark:focus:ring-dark-accent/50 transition-colors"
                        >
                            Sign in
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginComponent;
