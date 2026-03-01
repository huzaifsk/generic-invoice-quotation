
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../hooks/useAppContext';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const { login } = useAppContext();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const normalizedEmail = email.trim().toLowerCase();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            setError('Please enter a valid email address.');
            return;
        }
        if (!password) {
            setError('Password is required.');
            return;
        }

        setSubmitting(true);
        const success = await login(normalizedEmail, password);
        setSubmitting(false);
        if (!success) {
            setError('Invalid email or password.');
        }
    };

    const inputClass = 'mt-1 block w-full border border-slate-200 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-900 focus:outline-none';
    const primaryButton = 'w-full ui-btn-primary ui-focus-ring py-3 px-4';

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8">
                <h2 className="text-3xl font-semibold text-slate-900 text-center mb-2">Welcome Back</h2>
                <p className="text-center text-sm text-slate-500 mb-8">Sign in to your account</p>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-xs uppercase tracking-[0.3em] text-slate-500">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={inputClass}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-xs uppercase tracking-[0.3em] text-slate-500">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={inputClass}
                            required
                        />
                    </div>
                    {error && <p className="text-xs text-slate-600 text-center">{error}</p>}
                    <div>
                        <button type="submit" className={primaryButton}>
                            {submitting ? 'Signing in...' : 'Login'}
                        </button>
                    </div>
                    <p className="text-center text-xs text-slate-500">
                        Need an account? <Link to="/signup" className="font-semibold text-slate-700 hover:underline">Create one</Link>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Login;
