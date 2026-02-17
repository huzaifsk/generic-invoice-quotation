
import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAppContext } from '../hooks/useAppContext';
import { Document, DocumentType, LineItem, QuotationStatus, Client } from '../types';
import PdfDocument from './PdfDocument';

interface DocumentEditorProps {
    document: Document | null;
    newType: DocumentType | null;
    onBack: () => void;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({ document, newType, onBack }) => {
    const { clients, addDocument, updateDocument, deleteDocument, companyInfo, getClientById, convertQuoteToInvoice } = useAppContext();
    const [docData, setDocData] = useState<Omit<Document, 'id' | 'docNumber' | 'status'> & { status: Document['status'] } | null>(null);
    const pdfRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (document) {
            setDocData(document);
        } else if (newType) {
            setDocData({
                type: newType,
                clientId: '',
                issueDate: new Date().toISOString().split('T')[0],
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                items: [{ id: `item_${Date.now()}`, description: '', quantity: 1, unitPrice: 0 }],
                terms: 'Thank you for your business.',
                status: 'Draft',
            });
        }
    }, [document, newType]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (docData) {
            setDocData({ ...docData, [name]: value });
        }
    };

    const handleItemChange = (index: number, field: keyof Omit<LineItem, 'id'>, value: string | number) => {
        if (docData) {
            const newItems = [...docData.items];
            newItems[index] = { ...newItems[index], [field]: value };
            setDocData({ ...docData, items: newItems });
        }
    };
    
    const addItem = () => {
        if (docData) {
            setDocData({ ...docData, items: [...docData.items, { id: `item_${Date.now()}`, description: '', quantity: 1, unitPrice: 0 }] });
        }
    };

    const removeItem = (index: number) => {
        if (docData) {
            const newItems = docData.items.filter((_, i) => i !== index);
            setDocData({ ...docData, items: newItems });
        }
    };

    const handleSave = () => {
        if (!docData || !docData.clientId) {
            alert("Please select a client.");
            return;
        };
        if (document) {
            updateDocument({ ...document, ...docData });
        } else {
            addDocument(docData);
        }
        onBack();
    };

    const handleDelete = () => {
        if (document && window.confirm(`Are you sure you want to delete ${document.docNumber}? This action cannot be undone.`)) {
            deleteDocument(document.id);
            onBack();
        }
    };
    
    const handleConvertToInvoice = () => {
        if(document && document.type === 'quotation' && convertQuoteToInvoice) {
            convertQuoteToInvoice(document.id);
            alert("Quotation converted to a draft invoice!");
            onBack();
        }
    };

    const handleDownloadPdf = () => {
        const pdfNode = pdfRef.current;
        if (pdfNode && docData && companyInfo) {
            const docClient = getClientById(docData.clientId);
            if (!docClient) return;

            const docToRender: Document = { ...docData, id: document?.id || '', docNumber: document?.docNumber || 'DRAFT' };

            html2canvas(pdfNode, { scale: 2, backgroundColor: null }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save(`${docToRender.docNumber}-${docClient.name}.pdf`);
            });
        }
    };


    if (!docData || !companyInfo) return <div className="text-center p-8">Loading...</div>;

    const subtotal = docData.items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
    const vat = subtotal * (companyInfo.vatPercent / 100);
    const total = subtotal + vat;

    const docClient = getClientById(docData.clientId);
    const fullDocForPdf: Document | undefined = docClient ? { ...docData, id: document?.id || '', docNumber: document?.docNumber || 'DRAFT' } : undefined;

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-white capitalize">{document ? `Edit ${docData.type}` : `New ${docData.type}`}</h1>
                <div className="flex flex-wrap gap-2">
                     <button onClick={onBack} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition">Back</button>
                    {document && (
                        <button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition">Delete</button>
                    )}
                    {document && document.type === 'quotation' && document.status === 'Accepted' && (
                        <button onClick={handleConvertToInvoice} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition">Convert to Invoice</button>
                    )}
                     <button onClick={handleDownloadPdf} disabled={!docData.clientId} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed">Download PDF</button>
                    <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition">Save</button>
                </div>
            </div>

            <div className="bg-slate-800/60 backdrop-blur-lg border border-slate-100/10 rounded-xl p-8">
                {/* Header */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div>
                        <label htmlFor="clientId" className="block text-sm font-medium text-gray-300">Client</label>
                        <select id="clientId" name="clientId" value={docData.clientId} onChange={handleInputChange} className="mt-1 block w-full bg-slate-900/70 border border-slate-100/10 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                            <option value="">Select a client</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label htmlFor="issueDate" className="block text-sm font-medium text-gray-300">Issue Date</label>
                            <input type="date" id="issueDate" name="issueDate" value={docData.issueDate} onChange={handleInputChange} className="mt-1 block w-full bg-slate-900/70 border border-slate-100/10 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                           <label htmlFor="dueDate" className="block text-sm font-medium text-gray-300">Due Date</label>
                            <input type="date" id="dueDate" name="dueDate" value={docData.dueDate} onChange={handleInputChange} className="mt-1 block w-full bg-slate-900/70 border border-slate-100/10 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                </div>

                {/* Line Items Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100/10">
                                <th className="p-2 text-sm font-semibold text-gray-300 w-1/2">Description</th>
                                <th className="p-2 text-sm font-semibold text-gray-300">Qty</th>
                                <th className="p-2 text-sm font-semibold text-gray-300">Unit Price</th>
                                <th className="p-2 text-sm font-semibold text-gray-300">Total</th>
                                <th className="p-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {docData.items.map((item, index) => (
                                <tr key={item.id} className="border-b border-slate-100/10">
                                    <td className="p-2"><input type="text" value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} className="w-full bg-slate-900/70 border border-slate-100/10 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" /></td>
                                    <td className="p-2"><input type="number" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', parseFloat(e.target.value))} className="w-20 bg-slate-900/70 border border-slate-100/10 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" /></td>
                                    <td className="p-2"><input type="number" value={item.unitPrice} onChange={e => handleItemChange(index, 'unitPrice', parseFloat(e.target.value))} className="w-32 bg-slate-900/70 border border-slate-100/10 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" /></td>
                                    <td className="p-2 font-mono text-white">{(item.quantity * item.unitPrice).toFixed(2)}</td>
                                    <td className="p-2 text-center">
                                        <button onClick={() => removeItem(index)} className="text-red-400 hover:text-red-300 p-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <button onClick={addItem} className="mt-4 bg-green-600/50 hover:bg-green-600 text-white font-semibold py-1 px-3 rounded-md transition">+ Add Line Item</button>

                {/* Footer */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                    <div>
                        <label htmlFor="terms" className="block text-sm font-medium text-gray-300">Terms & Conditions</label>
                        <textarea id="terms" name="terms" value={docData.terms} onChange={handleInputChange} rows={4} className="mt-1 block w-full bg-slate-900/70 border border-slate-100/10 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="w-full max-w-xs space-y-2 text-white">
                            <div className="flex justify-between"><span>Subtotal:</span> <span className="font-mono">{subtotal.toFixed(2)}</span></div>
                            <div className="flex justify-between"><span>VAT ({companyInfo.vatPercent}%):</span> <span className="font-mono">{vat.toFixed(2)}</span></div>
                            <div className="flex justify-between font-bold text-xl border-t border-slate-100/10 pt-2 mt-2"><span>Total (AED):</span> <span className="font-mono">{total.toFixed(2)}</span></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div style={{ position: 'fixed', left: '-2000px', top: 0 }}>
              {fullDocForPdf && docClient && <div ref={pdfRef} style={{ width: '210mm', height: '297mm', background: 'white' }}>
                <PdfDocument document={fullDocForPdf} client={docClient} companyInfo={companyInfo} />
              </div>}
            </div>
        </div>
    );
};

export default DocumentEditor;
