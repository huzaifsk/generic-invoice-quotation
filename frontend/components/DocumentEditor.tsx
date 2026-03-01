import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useAppContext } from '../hooks/useAppContext';
import { Document, DocumentStatus, DocumentType, LineItem } from '../types';
import PdfDocument from './PdfDocument';

interface DocumentEditorProps {
    document: Document | null;
    newType: DocumentType | null;
    onBack: () => void;
    onInvoiceCreated?: (invoice: Document) => void;
}

const primaryButton = 'ui-btn-primary ui-focus-ring px-5 py-2.5';
const secondaryButton = 'ui-btn-secondary ui-focus-ring px-5 py-2.5';
const fieldClass = 'w-full border border-slate-200 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-900 focus:outline-none';

const invoiceStatuses: DocumentStatus[] = ['Draft', 'Sent', 'Viewed', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled'];
const quotationStatuses: DocumentStatus[] = ['Draft', 'Sent', 'Viewed', 'Approval Pending', 'Approved', 'Accepted', 'Rejected', 'Expired'];

const getLineSubtotal = (item: LineItem) => Number(item.quantity || 0) * Number(item.unitPrice || 0);
const getResolvedTaxPercent = (item: LineItem, fallbackTaxPercent: number) => (
    Number.isFinite(Number(item.taxPercent)) ? Number(item.taxPercent) : fallbackTaxPercent
);
const getLineTax = (item: LineItem, fallbackTaxPercent: number) => getLineSubtotal(item) * (getResolvedTaxPercent(item, fallbackTaxPercent) / 100);

const DocumentEditor: React.FC<DocumentEditorProps> = ({ document, newType, onBack, onInvoiceCreated }) => {
    const { clients, addDocument, updateDocument, updateDocumentStatus, deleteDocument, companyInfo, getClientById, convertQuoteToInvoice } = useAppContext();
    const [docData, setDocData] = useState<Omit<Document, 'id' | 'docNumber' | 'status'> & { status: Document['status'] } | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
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
                items: [{ id: `item_${Date.now()}`, description: '', quantity: 1, unitPrice: 0, taxPercent: Number(companyInfo?.defaultTaxPercent || companyInfo?.vatPercent || 0) }],
                terms: 'Thank you for your business.',
                currency: companyInfo?.currency || 'AED',
                status: 'Draft',
            });
        }
    }, [document, newType, companyInfo]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (docData) {
            setError('');
            setDocData({ ...docData, [name]: value });
        }
    };

    const handleItemChange = (index: number, field: keyof Omit<LineItem, 'id'>, value: string | number) => {
        if (docData) {
            setError('');
            const newItems = [...docData.items];
            newItems[index] = { ...newItems[index], [field]: value };
            setDocData({ ...docData, items: newItems });
        }
    };

    const getValidationError = () => {
        if (!docData) return 'Document data is missing.';
        if (!docData.clientId) return 'Please select a client.';
        if (!docData.issueDate || !docData.dueDate) return 'Issue date and due date are required.';
        if (new Date(docData.dueDate).getTime() < new Date(docData.issueDate).getTime()) {
            return 'Due date cannot be earlier than issue date.';
        }
        if (!docData.items.length) return 'At least one line item is required.';

        for (let index = 0; index < docData.items.length; index += 1) {
            const item = docData.items[index];
            if (!item.description.trim()) {
                return `Line ${index + 1}: description is required.`;
            }
            if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
                return `Line ${index + 1}: quantity must be greater than 0.`;
            }
            if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
                return `Line ${index + 1}: unit price must be 0 or more.`;
            }
            const taxPercent = Number(item.taxPercent ?? companyInfo?.vatPercent ?? 0);
            if (!Number.isFinite(taxPercent) || taxPercent < 0 || taxPercent > 100) {
                return `Line ${index + 1}: tax % must be between 0 and 100.`;
            }
        }

        return '';
    };

    const addItem = () => {
        if (docData) {
            setDocData({
                ...docData,
                items: [
                    ...docData.items,
                    {
                        id: `item_${Date.now()}`,
                        description: '',
                        quantity: 1,
                        unitPrice: 0,
                        taxPercent: Number(companyInfo?.defaultTaxPercent || companyInfo?.vatPercent || 0),
                    },
                ],
            });
        }
    };

    const removeItem = (index: number) => {
        if (docData) {
            if (docData.items.length === 1) {
                setError('At least one line item is required.');
                return;
            }
            const newItems = docData.items.filter((_, i) => i !== index);
            setDocData({ ...docData, items: newItems });
        }
    };

    const handleSave = async () => {
        const validationError = getValidationError();
        if (validationError) {
            setError(validationError);
            return;
        }
        setError('');
        setSubmitting(true);
        try {
            if (document) {
                await updateDocument({ ...document, ...docData });
                if (document.status !== docData.status) {
                    await updateDocumentStatus(document.id, docData.status, true);
                }
            } else {
                await addDocument(docData);
            }
            onBack();
        } catch {
            alert('Failed to save document.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (document && window.confirm(`Delete ${document.docNumber}? This cannot be undone.`)) {
            try {
                await deleteDocument(document.id);
                onBack();
            } catch {
                alert('Failed to delete document.');
            }
        }
    };

    const handleConvertToInvoice = async () => {
        if (document && document.type === 'quotation' && convertQuoteToInvoice) {
            try {
                const createdInvoice = await convertQuoteToInvoice(document.id, { callbackPath: '/editor' });
                if (!createdInvoice) {
                    alert('Failed to convert quotation.');
                    return;
                }
                alert('Quotation converted to a draft invoice.');
                if (onInvoiceCreated) {
                    onInvoiceCreated(createdInvoice);
                } else {
                    onBack();
                }
            } catch {
                alert('Failed to convert quotation.');
            }
        }
    };

    const handleDownloadPdf = async () => {
        const validationError = getValidationError();
        if (validationError) {
            setError(validationError);
            return;
        }

        setError('');
        const pdfNode = pdfRef.current;
        if (pdfNode && docData && companyInfo) {
            const docClient = getClientById(docData.clientId);
            if (!docClient) {
                setError('Please select a valid client before downloading PDF.');
                return;
            }

            const docToRender: Document = { ...docData, id: document?.id || '', docNumber: document?.docNumber || 'DRAFT' };

            try {
                const canvas = await html2canvas(pdfNode, {
                    scale: 2,
                    useCORS: true,
                    allowTaint: false,
                    backgroundColor: '#ffffff',
                    logging: false,
                });
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                const safeClientName = docClient.name.replace(/[^a-zA-Z0-9-_ ]/g, '').trim().replace(/\s+/g, '-');
                pdf.save(`${docToRender.docNumber}-${safeClientName || 'client'}.pdf`);
            } catch {
                setError('Failed to generate PDF. Please try again.');
            }
        }
    };

    if (!docData || !companyInfo) {
        return (
            <div className="text-center p-8 text-slate-500 space-y-4">
                <p>Document data not found. Start from invoices or quotations.</p>
                <button onClick={onBack} className={secondaryButton} type="button">Back to Dashboard</button>
            </div>
        );
    }

    const fallbackTaxPercent = Number(companyInfo.defaultTaxPercent ?? companyInfo.vatPercent ?? 0);
    const subtotal = docData.items.reduce((acc, item) => acc + getLineSubtotal(item), 0);
    const taxTotal = docData.items.reduce((acc, item) => acc + getLineTax(item, fallbackTaxPercent), 0);
    const total = subtotal + taxTotal;
    const allowedStatuses = docData.type === 'invoice' ? invoiceStatuses : quotationStatuses;
    const docClient = getClientById(docData.clientId);
    const fullDocForPdf: Document | undefined = docClient ? { ...docData, id: document?.id || '', docNumber: document?.docNumber || 'DRAFT' } : undefined;

    return (
        <div className="space-y-8 bg-white border border-slate-200 rounded-3xl p-6 text-slate-900">
            <header className="space-y-4 border-b border-slate-200 pb-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                            {document ? 'Editing Document' : 'New Draft'}
                        </p>
                        <h1 className="text-3xl font-semibold text-slate-900 capitalize">
                            {document ? `Edit ${docData.type}` : `New ${docData.type}`}
                        </h1>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-slate-500">
                        <span>{docData.type}</span>
                        <span className="text-slate-400">|</span>
                        <span className="inline-flex items-center gap-2">
                            Status
                            <select
                                name="status"
                                value={docData.status}
                                onChange={handleInputChange}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold tracking-normal text-slate-700"
                            >
                                {allowedStatuses.map((status) => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                        </span>
                    </div>
                </div>
                <div className="flex flex-wrap gap-6 text-sm text-slate-500">
                    <span>Owner: {docClient?.name || '—'}</span>
                    <span>Issue: {docData.issueDate}</span>
                    <span>Due: {docData.dueDate}</span>
                </div>
                <div className="flex flex-wrap gap-3 justify-end">
                    <button onClick={onBack} className={secondaryButton} type="button">
                        Back
                    </button>
                    {document && (
                        <button onClick={handleDelete} className={secondaryButton} type="button">
                            Delete
                        </button>
                    )}
                    {document && document.type === 'quotation' && ['Approved', 'Accepted'].includes(docData.status) && (
                        <button onClick={handleConvertToInvoice} className={secondaryButton} type="button">
                            Convert to Invoice
                        </button>
                    )}
                    <button onClick={handleDownloadPdf} className={`${secondaryButton} ${!docData.clientId ? 'opacity-50 cursor-not-allowed' : ''}`} type="button" disabled={!docData.clientId}>
                        Download PDF
                    </button>
                    <button onClick={handleSave} className={primaryButton} type="button" disabled={submitting}>
                        {submitting ? 'Saving...' : 'Save'}
                    </button>
                </div>
                {error && <p className="text-sm text-slate-600 text-right">{error}</p>}
            </header>

            <section className="grid gap-5 md:grid-cols-2 border-b border-slate-200 pb-6">
                <div>
                    <label htmlFor="clientId" className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                        Client
                    </label>
                    <select
                        id="clientId"
                        name="clientId"
                        value={docData.clientId}
                        onChange={handleInputChange}
                        className={fieldClass}
                    >
                        <option value="">Select a client</option>
                        {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                    <div>
                        <label htmlFor="issueDate" className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                            Issue Date
                        </label>
                        <input type="date" id="issueDate" name="issueDate" value={docData.issueDate} onChange={handleInputChange} className={fieldClass} />
                    </div>
                    <div>
                        <label htmlFor="dueDate" className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                            Due Date
                        </label>
                        <input type="date" id="dueDate" name="dueDate" value={docData.dueDate} onChange={handleInputChange} className={fieldClass} />
                    </div>
                </div>
            </section>

            <section className="space-y-4 border-b border-slate-200 pb-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">Line Items</h2>
                    <button type="button" onClick={addItem} className="ui-btn-secondary ui-focus-ring px-3 py-1.5 text-xs">
                        + Add Line Item
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left">
                        <thead>
                            <tr className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                                <th className="px-3 py-3">Description</th>
                                <th className="px-3 py-3 text-right">Qty</th>
                                <th className="px-3 py-3 text-right">Unit Price</th>
                                <th className="px-3 py-3 text-right">Tax %</th>
                                <th className="px-3 py-3 text-right">Total</th>
                                <th className="px-3 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {docData.items.map((item, index) => (
                                <tr key={item.id} className="border-t border-slate-200 text-sm text-slate-700">
                                    <td className="px-3 py-2">
                                        <input
                                            type="text"
                                            value={item.description}
                                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                                        />
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            min={0.01}
                                            step="0.01"
                                            onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                                            className="w-20 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                                        />
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <input
                                            type="number"
                                            value={item.unitPrice}
                                            min={0}
                                            step="0.01"
                                            onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                                            className="w-28 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                                        />
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <input
                                            type="number"
                                            value={item.taxPercent ?? fallbackTaxPercent}
                                            min={0}
                                            max={100}
                                            step="0.01"
                                            onChange={(e) => handleItemChange(index, 'taxPercent', Number(e.target.value))}
                                            className="w-20 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                                        />
                                    </td>
                                    <td className="px-3 py-2 text-right font-semibold text-slate-900">
                                        {(getLineSubtotal(item) + getLineTax(item, fallbackTaxPercent)).toFixed(2)}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <button type="button" onClick={() => removeItem(index)} className="ui-btn-ghost ui-focus-ring h-8 w-8 p-0 text-base">
                                            <span className="sr-only">Remove item</span>
                                            &times;
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="space-y-6">
                <div className="grid gap-5 md:grid-cols-2">
                    <div>
                        <label htmlFor="paymentTerms" className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                            Payment Terms
                        </label>
                        <input
                            id="paymentTerms"
                            name="paymentTerms"
                            value={docData.paymentTerms || ''}
                            onChange={handleInputChange}
                            className={fieldClass}
                            placeholder="e.g. Net 30"
                        />
                    </div>
                    <div>
                        <label htmlFor="notes" className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                            Notes
                        </label>
                        <input
                            id="notes"
                            name="notes"
                            value={docData.notes || ''}
                            onChange={handleInputChange}
                            className={fieldClass}
                            placeholder="Internal note"
                        />
                    </div>
                </div>
                <div>
                    <label htmlFor="terms" className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                        Terms &amp; Conditions
                    </label>
                    <textarea
                        id="terms"
                        name="terms"
                        value={docData.terms}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full border border-slate-200 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-900 focus:outline-none resize-none"
                    />
                </div>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border border-slate-200 rounded-2xl p-5">
                    <div className="text-sm text-slate-500">
                        <p className="font-semibold text-slate-900">Totals</p>
                        <p className="text-slate-400">Tax is calculated from line-item tax %</p>
                    </div>
                    <div className="space-y-2 text-slate-900 text-sm">
                        <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Tax Total</span>
                            <span>{taxTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between pt-2 text-base font-semibold border-t border-slate-200">
                            <span>Total ({docData.currency || companyInfo.currency || 'AED'})</span>
                            <span>{total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </section>

            <div className="fixed top-0 z-[-1] pointer-events-none opacity-0" style={{ left: '-9999px' }} aria-hidden>
                {fullDocForPdf && docClient && (
                    <div ref={pdfRef}>
                        <PdfDocument document={fullDocForPdf} client={docClient} companyInfo={companyInfo} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocumentEditor;
