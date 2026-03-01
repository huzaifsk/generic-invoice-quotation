import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../hooks/useAppContext';

const Signup: React.FC = () => {
    const { signup } = useAppContext();
    const [name, setName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const normalizedName = name.trim();
        const normalizedCompanyName = companyName.trim();
        const normalizedEmail = email.trim().toLowerCase();

        if (normalizedName.length < 2) {
            setError('Full name must be at least 2 characters.');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            setError('Please enter a valid email address.');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        setSubmitting(true);
        const success = await signup({
            name: normalizedName,
            email: normalizedEmail,
            password,
            companyName: normalizedCompanyName || undefined,
        });
        setSubmitting(false);
        if (!success) {
            setError('Signup failed. Email may already be in use.');
        }
    };

    const inputClass = 'mt-1 block w-full border border-slate-200 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-900 focus:outline-none';
    const primaryButton = 'w-full ui-btn-primary ui-focus-ring py-3 px-4';

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8">
                <h2 className="text-3xl font-semibold text-slate-900 text-center mb-2">Create Account</h2>
                <p className="text-center text-sm text-slate-500 mb-8">Set up your workspace</p>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="name" className="block text-xs uppercase tracking-[0.3em] text-slate-500">Full Name</label>
                        <input id="name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
                    </div>
                    <div>
                        <label htmlFor="companyName" className="block text-xs uppercase tracking-[0.3em] text-slate-500">Company Name</label>
                        <input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-xs uppercase tracking-[0.3em] text-slate-500">Email</label>
                        <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-xs uppercase tracking-[0.3em] text-slate-500">Password</label>
                        <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} required minLength={6} />
                    </div>
                    {error && <p className="text-xs text-slate-600 text-center">{error}</p>}
                    <button type="submit" className={primaryButton}>
                        {submitting ? 'Creating...' : 'Sign up'}
                    </button>
                    <p className="text-center text-xs text-slate-500">
                        Already have an account? <Link to="/login" className="font-semibold text-slate-700 hover:underline">Login</Link>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Signup;
