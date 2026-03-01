
import React from 'react';
import { Document, Client, CompanyInfo } from '../types';

interface PdfDocumentProps {
    document: Document;
    client: Client;
    companyInfo: CompanyInfo;
}

const PdfDocument: React.FC<PdfDocumentProps> = ({ document, client, companyInfo }) => {
    const fallbackTaxPercent = Number(companyInfo.defaultTaxPercent ?? companyInfo.vatPercent ?? 0);
    const subtotal = document.items.reduce((acc, item) => acc + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
    const taxTotal = document.items.reduce((acc, item) => {
        const rowSubtotal = Number(item.quantity || 0) * Number(item.unitPrice || 0);
        const rowTaxPercent = Number.isFinite(Number(item.taxPercent)) ? Number(item.taxPercent) : fallbackTaxPercent;
        return acc + rowSubtotal * (rowTaxPercent / 100);
    }, 0);
    const total = subtotal + taxTotal;
    const currency = document.currency || companyInfo.currency || 'AED';

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'Paid':
            case 'Accepted':
                return { color: '#16a34a', borderColor: '#86efac', backgroundColor: '#f0fdf4' };
            case 'Sent':
                return { color: '#2563eb', borderColor: '#93c5fd', backgroundColor: '#eff6ff' };
            case 'Overdue':
            case 'Rejected':
                return { color: '#dc2626', borderColor: '#fca5a5', backgroundColor: '#fef2f2' };
            case 'Draft':
            default:
                return { color: '#6b7280', borderColor: '#d1d5db', backgroundColor: '#f9fafb' };
        }
    };

    const statusStyles = getStatusStyles(document.status);

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
                    <div
                        style={{
                            marginTop: '10px',
                            display: 'inline-block',
                            padding: '7px 14px',
                            minWidth: '92px',
                            border: `1.5px solid ${statusStyles.borderColor}`,
                            backgroundColor: statusStyles.backgroundColor,
                            color: statusStyles.color,
                            borderRadius: '9999px',
                            fontWeight: 700,
                            fontSize: '12px',
                            fontFamily: 'Arial, Helvetica, sans-serif',
                            letterSpacing: '0.05em',
                            lineHeight: 1.2,
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                        }}
                    >
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
                                <td style={{ padding: '12px', textAlign: 'right' }}>
                                    {(
                                        (Number(item.quantity || 0) * Number(item.unitPrice || 0))
                                        + (Number(item.quantity || 0) * Number(item.unitPrice || 0) * ((Number.isFinite(Number(item.taxPercent)) ? Number(item.taxPercent) : fallbackTaxPercent) / 100))
                                    ).toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            <section style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
                <div/>
                <div style={{ minWidth: '250px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span>Subtotal:</span>
                        <span>{subtotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span>Tax Total:</span>
                        <span>{taxTotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px', borderTop: '2px solid #e5e7eb', paddingTop: '8px', marginTop: '8px' }}>
                        <span>Total ({currency}):</span>
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
