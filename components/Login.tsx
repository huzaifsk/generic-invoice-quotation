
import React, { useState } from 'react';
import { useAppContext } from '../hooks/useAppContext';

const Login: React.FC = () => {
    const [email, setEmail] = useState('admin@uaeinvoice.com');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAppContext();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (email !== 'admin@uaeinvoice.com') {
            setError('Invalid email address.');
            return;
        }
        if (!login(password)) {
            setError('Invalid password. Hint: it\'s "password"');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900/30 to-slate-900 p-4">
            <div className="w-full max-w-md bg-slate-800/60 backdrop-blur-lg border border-slate-100/10 rounded-2xl shadow-lg p-8">
                <h2 className="text-3xl font-bold text-white text-center mb-2">Welcome Back</h2>
                <p className="text-center text-gray-300 mb-8">Sign in to your account</p>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 block w-full bg-slate-900/70 border border-slate-100/10 rounded-md py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-300">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full bg-slate-900/70 border border-slate-100/10 rounded-md py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                    <div>
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md transition duration-300 ease-in-out transform hover:scale-105">
                            Login
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
