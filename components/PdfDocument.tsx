
import React from 'react';
import { Document, Client, CompanyInfo } from '../types';

interface PdfDocumentProps {
    document: Document;
    client: Client;
    companyInfo: CompanyInfo;
}

const PdfDocument: React.FC<PdfDocumentProps> = ({ document, client, companyInfo }) => {
    const subtotal = document.items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
    const vat = subtotal * (companyInfo.vatPercent / 100);
    const total = subtotal + vat;

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'Paid': case 'Accepted': return { color: '#16a34a', borderColor: '#16a34a'}; // green-600
            case 'Sent': return { color: '#2563eb', borderColor: '#2563eb'}; // blue-600
            case 'Overdue': case 'Rejected': return { color: '#dc2626', borderColor: '#dc2626'}; // red-600
            case 'Draft': default: return { color: '#6b7280', borderColor: '#6b7280'}; // gray-500
        }
    }

    return (
        <div style={{ fontFamily: 'sans-serif', color: '#111827', padding: '40px', boxSizing: 'border-box', width: '210mm', height: '297mm' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e5e7eb', paddingBottom: '20px' }}>
                <div>
                    {companyInfo.logo && <img src={companyInfo.logo} alt="Company Logo" style={{ width: '100px', height: '100px', objectFit: 'contain', marginBottom: '10px' }} />}
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{companyInfo.name}</h1>
                    <p style={{ margin: 0, color: '#4b5563' }}>TRN: {companyInfo.trn}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <h2 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, textTransform: 'uppercase' }}>{document.type}</h2>
                    <p style={{ margin: '5px 0 0 0' }}># {document.docNumber}</p>
                </div>
            </header>

            <section style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
                <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#6b7280', margin: '0 0 5px 0' }}>BILLED TO</h3>
                    <p style={{ fontWeight: 'bold', margin: 0 }}>{client.name}</p>
                    <p style={{ margin: 0 }}>{client.address.split('\n').map((line, i) => <span key={i}>{line}<br/></span>)}</p>
                    <p style={{ margin: 0 }}>{client.email}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: '0 0 5px 0' }}><strong style={{ color: '#6b7280' }}>Issue Date:</strong> {new Date(document.issueDate).toLocaleDateString()}</p>
                    <p style={{ margin: 0 }}><strong style={{ color: '#6b7280' }}>Due Date:</strong> {new Date(document.dueDate).toLocaleDateString()}</p>
                    <div style={{ marginTop: '10px', padding: '5px 10px', border: `2px solid ${getStatusStyles(document.status).borderColor}`, color: getStatusStyles(document.status).color, borderRadius: '9999px', display: 'inline-block', fontWeight: 'bold', fontSize: '14px' }}>
                        {document.status.toUpperCase()}
                    </div>
                </div>
            </section>
            
            <section style={{ marginTop: '40px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f3f4f6' }}>
                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Description</th>
                            <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>Qty</th>
                            <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>Unit Price</th>
                            <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {document.items.map(item => (
                            <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '12px', textAlign: 'left' }}>{item.description}</td>
                                <td style={{ padding: '12px', textAlign: 'right' }}>{item.quantity}</td>
                                <td style={{ padding: '12px', textAlign: 'right' }}>{item.unitPrice.toFixed(2)}</td>
                                <td style={{ padding: '12px', textAlign: 'right' }}>{(item.quantity * item.unitPrice).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            <section style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
                <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 5px 0' }}>Terms & Conditions</h4>
                    <p style={{ fontSize: '12px', color: '#4b5563', margin: 0 }}>{document.terms}</p>
                </div>
                <div style={{ minWidth: '250px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span>Subtotal:</span>
                        <span>{subtotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span>VAT ({companyInfo.vatPercent}%):</span>
                        <span>{vat.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px', borderTop: '2px solid #e5e7eb', paddingTop: '8px', marginTop: '8px' }}>
                        <span>Total (AED):</span>
                        <span>{total.toFixed(2)}</span>
                    </div>
                </div>
            </section>

            <footer style={{ position: 'absolute', bottom: '40px', left: '40px', right: '40px', textAlign: 'center', fontSize: '12px', color: '#6b7280', borderTop: '1px solid #e5e7eb', paddingTop: '15px' }}>
                Thank you for your business!
            </footer>
        </div>
    );
};

export default PdfDocument;
