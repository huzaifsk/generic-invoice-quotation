
import React, { useState } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { CompanyInfo } from '../types';

const CompanySetup: React.FC = () => {
    const { updateCompanyInfo, companyInfo } = useAppContext();
    const [info, setInfo] = useState<Omit<CompanyInfo, 'logo'>>({ name: '', trn: '', vatPercent: 5 });
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<string>('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

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

    React.useEffect(() => {
        if (companyInfo) {
            setInfo({
                name: companyInfo.name || '',
                trn: companyInfo.trn || '',
                vatPercent: Number(companyInfo.vatPercent || 5),
            });
            setLogoPreview(companyInfo.logo || null);
            setLogoFile(companyInfo.logo || '');
        }
    }, [companyInfo]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const normalizedName = info.name.trim();
        const normalizedTrn = info.trn.trim();
        const vatPercent = Number(info.vatPercent);

        if (normalizedName.length < 2) {
            setError('Company name must be at least 2 characters.');
            return;
        }
        if (!/^[A-Za-z0-9-]{8,20}$/.test(normalizedTrn)) {
            setError('TRN must be 8-20 characters (letters, numbers, hyphen).');
            return;
        }
        if (!Number.isFinite(vatPercent) || vatPercent < 0 || vatPercent > 100) {
            setError('VAT must be between 0 and 100.');
            return;
        }

        try {
            setSubmitting(true);
            await updateCompanyInfo({ ...info, name: normalizedName, trn: normalizedTrn, vatPercent, logo: logoFile });
        } catch {
            setError('Failed to save company profile.');
        } finally {
            setSubmitting(false);
        }
    };

    const inputClass = 'mt-1 block w-full border border-slate-200 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-900 focus:outline-none';
    const primaryButton = 'w-full ui-btn-primary ui-focus-ring py-3 px-4';

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-10">
                <h2 className="text-3xl font-semibold text-slate-900 text-center mb-2">Company Setup</h2>
                <p className="text-center text-sm text-slate-500 mb-8">Let's configure your business profile.</p>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="name" className="block text-[11px] uppercase tracking-[0.3em] text-slate-500">Company Name</label>
                        <input type="text" name="name" id="name" value={info.name} onChange={handleInputChange} required minLength={2} className={inputClass} />
                    </div>
                    <div>
                        <label htmlFor="trn" className="block text-[11px] uppercase tracking-[0.3em] text-slate-500">Tax Registration Number (TRN)</label>
                        <input type="text" name="trn" id="trn" value={info.trn} onChange={handleInputChange} required minLength={8} maxLength={20} className={inputClass} />
                    </div>
                    <div>
                        <label htmlFor="vatPercent" className="block text-[11px] uppercase tracking-[0.3em] text-slate-500">Default VAT (%)</label>
                        <input type="number" name="vatPercent" id="vatPercent" value={info.vatPercent} onChange={handleInputChange} required min={0} max={100} step="0.01" className={inputClass} />
                    </div>
                    <div>
                        <label htmlFor="logo" className="block text-[11px] uppercase tracking-[0.3em] text-slate-500">Company Logo</label>
                        <div className="mt-1 flex items-center gap-4">
                            {logoPreview && <img src={logoPreview} alt="Logo Preview" className="h-16 w-16 rounded-lg object-cover border border-slate-200" />}
                            <input
                                type="file"
                                name="logo"
                                id="logo"
                                onChange={handleLogoChange}
                                accept="image/*"
                                className="border border-dashed border-slate-300 rounded-2xl px-4 py-2 text-sm text-slate-500"
                            />
                        </div>
                    </div>
                    <button type="submit" className={primaryButton} disabled={submitting}>
                        {submitting ? 'Saving...' : 'Save & Continue'}
                    </button>
                    {error && <p className="text-xs text-center text-slate-600">{error}</p>}
                </form>
            </div>
        </div>
    );
};

export default CompanySetup;
