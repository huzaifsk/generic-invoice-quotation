
import React, { useState } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { CompanyInfo } from '../types';

const CompanySetup: React.FC = () => {
    const { updateCompanyInfo } = useAppContext();
    const [info, setInfo] = useState<Omit<CompanyInfo, 'logo'>>({ name: '', trn: '', vatPercent: 5 });
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<string>('');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setInfo(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) : value }));
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoFile(reader.result as string);
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateCompanyInfo({ ...info, logo: logoFile });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900/30 to-slate-900 p-4">
            <div className="w-full max-w-lg bg-slate-800/60 backdrop-blur-lg border border-slate-100/10 rounded-2xl shadow-lg p-8">
                <h2 className="text-3xl font-bold text-white text-center mb-2">Company Setup</h2>
                <p className="text-center text-gray-300 mb-8">Let's get your business details configured.</p>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-300">Company Name</label>
                        <input type="text" name="name" id="name" value={info.name} onChange={handleInputChange} required className="mt-1 block w-full bg-slate-900/70 border border-slate-100/10 rounded-md py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label htmlFor="trn" className="block text-sm font-medium text-gray-300">Tax Registration Number (TRN)</label>
                        <input type="text" name="trn" id="trn" value={info.trn} onChange={handleInputChange} required className="mt-1 block w-full bg-slate-900/70 border border-slate-100/10 rounded-md py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label htmlFor="vatPercent" className="block text-sm font-medium text-gray-300">Default VAT (%)</label>
                        <input type="number" name="vatPercent" id="vatPercent" value={info.vatPercent} onChange={handleInputChange} required className="mt-1 block w-full bg-slate-900/70 border border-slate-100/10 rounded-md py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                         <label htmlFor="logo" className="block text-sm font-medium text-gray-300">Company Logo</label>
                         <div className="mt-1 flex items-center space-x-4">
                            {logoPreview && <img src={logoPreview} alt="Logo Preview" className="h-16 w-16 rounded-full object-cover" />}
                            <input type="file" name="logo" id="logo" onChange={handleLogoChange} accept="image/*" className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                         </div>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md transition duration-300 ease-in-out transform hover:scale-105">
                        Save & Continue
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CompanySetup;
