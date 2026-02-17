
import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useAppContext } from '../hooks/useAppContext';
import { Document } from '../types';

const ReportCard: React.FC<{ title: string; value: string; }> = ({ title, value }) => (
    <div className="bg-slate-800/60 backdrop-blur-lg border border-slate-100/10 rounded-xl p-6">
        <p className="text-gray-300 text-sm">{title}</p>
        <p className="text-3xl font-bold text-white mt-1">{value}</p>
    </div>
);

const Reports: React.FC = () => {
    const { documents, companyInfo } = useAppContext();

    const reportData = useMemo(() => {
        const getSubtotal = (doc: Document) => doc.items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);

        const getGrandTotal = (doc: Document) => {
            const subtotal = getSubtotal(doc);
            const vat = subtotal * ((companyInfo?.vatPercent || 0) / 100);
            return subtotal + vat;
        };

        const invoices = documents.filter(d => d.type === 'invoice');
        const paidInvoices = invoices.filter(inv => inv.status === 'Paid');

        const totalRevenue = paidInvoices.reduce((sum, inv) => sum + getSubtotal(inv), 0);
        
        const totalUnpaid = invoices
            .filter(inv => inv.status === 'Sent' || inv.status === 'Overdue')
            .reduce((sum, inv) => sum + getGrandTotal(inv), 0);

        const totalVatCollected = paidInvoices.reduce((sum, inv) => sum + (getGrandTotal(inv) - getSubtotal(inv)), 0);

        // Correctly calculate revenue for the last 12 months
        const monthlyData: { name: string; revenue: number }[] = [];
        const today = new Date();
        for (let i = 11; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            monthlyData.push({
                name: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
                revenue: 0,
            });
        }

        paidInvoices.forEach(inv => {
            const invDate = new Date(inv.issueDate);
            const bucketKey = new Date(invDate.getFullYear(), invDate.getMonth(), 1).toLocaleString('default', { month: 'short', year: '2-digit' });
            
            const targetBucket = monthlyData.find(m => m.name === bucketKey);
            if (targetBucket) {
                targetBucket.revenue += getSubtotal(inv);
            }
        });
        
        return { totalRevenue, totalUnpaid, totalVatCollected, monthlyRevenue: monthlyData };
    }, [documents, companyInfo]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(amount);
    };

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-white">Reports</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ReportCard title="Total Revenue (pre-VAT)" value={formatCurrency(reportData.totalRevenue)} />
                <ReportCard title="Total Unpaid" value={formatCurrency(reportData.totalUnpaid)} />
                <ReportCard title="Total VAT Collected" value={formatCurrency(reportData.totalVatCollected)} />
            </div>

            <div>
                <h2 className="text-2xl font-bold text-white mb-4">Monthly Revenue (Last 12 Months)</h2>
                <div className="bg-slate-800/60 backdrop-blur-lg border border-slate-100/10 rounded-xl p-6 h-96">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={reportData.monthlyRevenue}
                            margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                            <XAxis dataKey="name" tick={{ fill: '#d1d5db' }} />
                            <YAxis tickFormatter={(value) => formatCurrency(Number(value))} tick={{ fill: '#d1d5db' }} />
                            <Tooltip
                                contentStyle={{ 
                                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
                                    borderColor: 'rgba(241, 245, 249, 0.1)',
                                    borderRadius: '0.75rem'
                                }}
                                labelStyle={{ color: '#ffffff' }}
                                itemStyle={{ color: '#60A5FA' }}
                                formatter={(value) => [formatCurrency(Number(value)), "Revenue"]}
                            />
                            <Legend wrapperStyle={{ color: '#d1d5db' }} />
                            <Bar dataKey="revenue" fill="#3B82F6" name="Pre-VAT Revenue" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default Reports;
