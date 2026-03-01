import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { Document, DocumentType, DocumentStatus } from '../types';

const boardStatusMeta: Record<DocumentStatus, { dot: string; label: string }> = {
    Draft: { dot: 'bg-(--primary-75)', label: 'Draft' },
    Sent: { dot: 'bg-(--primary-200)', label: 'Sent' },
    Viewed: { dot: 'bg-(--primary-300)', label: 'Viewed' },
    'Partially Paid': { dot: 'bg-amber-500', label: 'Partially Paid' },
    Paid: { dot: 'bg-emerald-500', label: 'Paid' },
    Overdue: { dot: 'bg-rose-500', label: 'Overdue' },
    Cancelled: { dot: 'bg-(--primary-400)', label: 'Cancelled' },
    'Approval Pending': { dot: 'bg-amber-500', label: 'Approval Pending' },
    Approved: { dot: 'bg-emerald-500', label: 'Approved' },
    Accepted: { dot: 'bg-emerald-600', label: 'Accepted' },
    Rejected: { dot: 'bg-rose-500', label: 'Rejected' },
    Expired: { dot: 'bg-(--primary-500)', label: 'Expired' },
};

const formatCurrency = (value: number, currency = 'AED') =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);

const formatDate = (value: string) => new Date(value).toLocaleDateString();

const getDocAmount = (doc: Document, fallbackTaxPercent: number) => {
    return doc.items.reduce((acc, item) => {
        const subtotal = Number(item.quantity || 0) * Number(item.unitPrice || 0);
        const taxPercent = Number.isFinite(Number(item.taxPercent)) ? Number(item.taxPercent) : fallbackTaxPercent;
        const taxAmount = subtotal * (taxPercent / 100);
        return acc + subtotal + taxAmount;
    }, 0);
};

const statusTagTone = (status: DocumentStatus) => {
    if (status === 'Paid' || status === 'Approved' || status === 'Accepted') {
        return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
    }
    if (status === 'Overdue' || status === 'Rejected') {
        return 'bg-rose-50 text-rose-700 border border-rose-100';
    }
    if (status === 'Partially Paid' || status === 'Approval Pending') {
        return 'bg-amber-50 text-amber-700 border border-amber-100';
    }
    return 'bg-(--primary-50) text-(--primary-500) border border-(--border-soft)';
};

const DocumentCard: React.FC<{
    doc: Document;
    isSelected: boolean;
    onSelect: (doc: Document) => void;
    onDragStart: (e: React.DragEvent<HTMLDivElement>, docId: string) => void;
    onEdit: (doc: Document) => void;
    onConvertToInvoice?: (doc: Document) => void;
}> = React.memo(({ doc, isSelected, onSelect, onDragStart, onEdit, onConvertToInvoice }) => {
    const { getClientById, companyInfo } = useAppContext();
    const client = getClientById(doc.clientId);
    const currency = doc.currency || companyInfo?.currency || 'AED';
    const amount = getDocAmount(doc, Number(companyInfo?.defaultTaxPercent ?? companyInfo?.vatPercent ?? 0));

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(doc);
        }
    };

    return (
        <article
            draggable
            role="button"
            tabIndex={0}
            onDragStart={(e) => onDragStart(e, doc.id)}
            onClick={() => onSelect(doc)}
            onDoubleClick={() => onEdit(doc)}
            onKeyDown={handleKeyDown}
            className={`ui-focus-ring rounded-2xl border bg-(--bg-surface) p-4 transition-all duration-200 ${
                isSelected
                    ? 'border-(--primary-300) ring-1 ring-(--primary-100)'
                    : 'border-(--border-soft) hover:border-(--primary-100)'
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-(--text-strong)">{doc.docNumber}</p>
                    <p className="truncate text-xs text-(--text-muted)">{client?.name || 'Unknown client'}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusTagTone(doc.status)}`}>
                    {doc.status}
                </span>
            </div>

            <p className="mt-3 text-lg font-semibold text-(--text-strong)">{formatCurrency(amount, currency)}</p>

            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-(--text-muted)">
                <span>Issue: {formatDate(doc.issueDate)}</span>
                <span className="text-right">Due: {formatDate(doc.dueDate)}</span>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-(--text-muted)">
                <span>{doc.items.length} item{doc.items.length === 1 ? '' : 's'}</span>
                <button
                    type="button"
                    className="ui-btn-ghost ui-focus-ring px-3 py-1.5 text-xs"
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit(doc);
                    }}
                >
                    Open
                </button>
            </div>

            {doc.type === 'quotation' && doc.status === 'Approved' && onConvertToInvoice && (
                <button
                    type="button"
                    className="ui-btn-secondary ui-focus-ring mt-3 px-3 py-1.5 text-xs"
                    onClick={(e) => {
                        e.stopPropagation();
                        onConvertToInvoice(doc);
                    }}
                >
                    Create Invoice
                </button>
            )}
        </article>
    );
});

DocumentCard.displayName = 'DocumentCard';

const StatusColumn: React.FC<{
    status: DocumentStatus;
    documents: Document[];
    selectedDocId: string | null;
    onSelect: (doc: Document) => void;
    onDragStart: (e: React.DragEvent<HTMLDivElement>, docId: string) => void;
    onDrop: (e: React.DragEvent<HTMLDivElement>, status: DocumentStatus) => void;
    onEdit: (doc: Document) => void;
    onConvertToInvoice?: (doc: Document) => void;
}> = React.memo(({ status, documents, selectedDocId, onSelect, onDragStart, onDrop, onEdit, onConvertToInvoice }) => {
    const [isOver, setIsOver] = useState(false);
    const statusMeta = boardStatusMeta[status];

    return (
        <section
            onDragOver={(e) => {
                e.preventDefault();
                setIsOver(true);
            }}
            onDragLeave={() => setIsOver(false)}
            onDrop={(e) => {
                onDrop(e, status);
                setIsOver(false);
            }}
            className={`w-full min-w-full sm:min-w-0 sm:w-77.5 h-auto lg:h-full shrink-0 snap-start rounded-2xl border bg-(--bg-subtle) p-3 transition-all duration-200 ${
                isOver ? 'border-(--primary-200)' : 'border-(--border-soft)'
            }`}
        >
            <header className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${statusMeta.dot}`} aria-hidden />
                    <h3 className="text-sm font-semibold text-(--primary-500)">{statusMeta.label}</h3>
                    <span className="rounded-full bg-(--bg-surface) px-2 py-0.5 text-[11px] font-semibold text-(--text-muted) border border-(--border-soft)">
                        {documents.length}
                    </span>
                </div>
            </header>

            <div className="space-y-3 h-auto max-h-[65vh] overflow-y-auto pr-1 lg:h-[calc(100%-2.25rem)] lg:max-h-none">
                {documents.length > 0 ? (
                    documents.map((doc) => (
                        <DocumentCard
                            key={doc.id}
                            doc={doc}
                            isSelected={selectedDocId === doc.id}
                            onSelect={onSelect}
                            onDragStart={onDragStart}
                            onEdit={onEdit}
                            onConvertToInvoice={onConvertToInvoice}
                        />
                    ))
                ) : (
                    <div className="rounded-2xl border border-dashed border-(--border-soft) bg-(--bg-surface)/70 px-4 py-8 text-center text-xs text-(--text-muted)">
                        No documents in this stage
                    </div>
                )}
            </div>
        </section>
    );
});

StatusColumn.displayName = 'StatusColumn';

const DetailPanel: React.FC<{
    doc: Document | null;
    onEdit: (doc: Document) => void;
    onConvertToInvoice?: (doc: Document) => void;
}> = ({ doc, onEdit, onConvertToInvoice }) => {
    const { getClientById, companyInfo } = useAppContext();

    if (!doc) {
        return (
            <aside className="w-full rounded-2xl border border-(--border-soft) bg-(--bg-surface) p-5 lg:w-85 h-auto lg:h-full overflow-y-auto">
                <p className="text-sm text-(--text-muted)">Select a card to view details.</p>
            </aside>
        );
    }

    const client = getClientById(doc.clientId);
    const fallbackTaxPercent = Number(companyInfo?.defaultTaxPercent ?? companyInfo?.vatPercent ?? 0);
    const subtotal = doc.items.reduce((acc, item) => acc + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
    const taxTotal = doc.items.reduce((acc, item) => {
        const rowSubtotal = Number(item.quantity || 0) * Number(item.unitPrice || 0);
        const rowTaxPercent = Number.isFinite(Number(item.taxPercent)) ? Number(item.taxPercent) : fallbackTaxPercent;
        return acc + rowSubtotal * (rowTaxPercent / 100);
    }, 0);
    const total = subtotal + taxTotal;
    const currency = doc.currency || companyInfo?.currency || 'AED';

    return (
        <aside className="w-full rounded-2xl border border-(--border-soft) bg-(--bg-surface) p-5 lg:w-85 h-auto lg:h-full overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-[11px] uppercase tracking-[0.25em] text-(--text-muted)">Detailed view</p>
                    <h3 className="mt-1 text-xl font-semibold text-(--text-strong)">{doc.docNumber}</h3>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusTagTone(doc.status)}`}>
                    {doc.status}
                </span>
            </div>

            <div className="mt-4 space-y-2 text-sm text-(--text-strong)">
                <p><span className="text-(--text-muted)">Client:</span> {client?.name || 'Unknown client'}</p>
                <p><span className="text-(--text-muted)">Issue:</span> {formatDate(doc.issueDate)}</p>
                <p><span className="text-(--text-muted)">Due:</span> {formatDate(doc.dueDate)}</p>
                <p><span className="text-(--text-muted)">Items:</span> {doc.items.length}</p>
            </div>

            <div className="mt-5 rounded-xl border border-(--border-soft) bg-(--bg-subtle) p-3">
                <div className="flex items-center justify-between text-sm text-(--text-strong)">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal, currency)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm text-(--text-strong)">
                    <span>Tax Total</span>
                    <span>{formatCurrency(taxTotal, currency)}</span>
                </div>
                <div className="mt-2 border-t border-(--border-soft) pt-2 text-base font-semibold text-(--text-strong) flex items-center justify-between">
                    <span>Total</span>
                    <span>{formatCurrency(total, currency)}</span>
                </div>
            </div>

            <div className="mt-5 max-h-44 overflow-y-auto rounded-xl border border-(--border-soft)">
                <table className="w-full text-left text-xs text-(--text-strong)">
                    <thead className="bg-(--bg-subtle) text-[10px] uppercase tracking-[0.2em] text-(--text-muted)">
                        <tr>
                            <th className="px-3 py-2 font-semibold">Description</th>
                            <th className="px-3 py-2 font-semibold text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {doc.items.map((item) => (
                            <tr key={item.id} className="border-t border-(--border-soft)">
                                <td className="px-3 py-2">{item.description || 'Untitled item'}</td>
                                <td className="px-3 py-2 text-right">
                                    {formatCurrency(item.quantity * item.unitPrice, currency)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {doc.terms && (
                <div className="mt-4 rounded-xl border border-(--border-soft) bg-(--bg-surface) p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-(--text-muted)">Terms</p>
                    <p className="mt-1 line-clamp-3 text-sm text-(--text-strong)">{doc.terms}</p>
                </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => onEdit(doc)}
                    className="ui-btn-primary ui-focus-ring px-4 py-2 text-sm"
                >
                    Open Document
                </button>
                {doc.type === 'quotation' && doc.status === 'Approved' && onConvertToInvoice && (
                    <button
                        type="button"
                        onClick={() => onConvertToInvoice(doc)}
                        className="ui-btn-secondary ui-focus-ring px-4 py-2 text-sm"
                    >
                        Create Invoice
                    </button>
                )}
            </div>
        </aside>
    );
};

const DocumentList: React.FC<{
    type: DocumentType;
    onEditDocument: (doc: Document) => void;
    onNewDocument: (type: DocumentType) => void;
}> = React.memo(({ type, onEditDocument, onNewDocument }) => {
    const { documents, updateDocumentStatus, convertQuoteToInvoice } = useAppContext();
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

    const relevantDocs = useMemo(
        () => documents.filter((doc) => doc.type === type),
        [documents, type]
    );

    const statuses: DocumentStatus[] = type === 'invoice'
        ? ['Draft', 'Sent', 'Viewed', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled']
        : ['Draft', 'Sent', 'Viewed', 'Approval Pending', 'Approved', 'Accepted', 'Rejected', 'Expired'];

    useEffect(() => {
        if (!relevantDocs.length) {
            setSelectedDocId(null);
            return;
        }

        const selectedStillExists = selectedDocId && relevantDocs.some((doc) => doc.id === selectedDocId);
        if (!selectedStillExists) {
            setSelectedDocId(relevantDocs[0].id);
        }
    }, [relevantDocs, selectedDocId]);

    const selectedDoc = useMemo(
        () => relevantDocs.find((doc) => doc.id === selectedDocId) || null,
        [relevantDocs, selectedDocId]
    );

    const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, docId: string) => {
        e.dataTransfer.setData('docId', docId);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>, newStatus: DocumentStatus) => {
        const docId = e.dataTransfer.getData('docId');
        updateDocumentStatus(docId, newStatus, true).catch((error: any) => {
            alert(error?.message || 'Failed to update document status.');
        });
    }, [updateDocumentStatus]);

    const handleConvertToInvoice = useCallback(async (doc: Document) => {
        try {
            const invoice = await convertQuoteToInvoice(doc.id, { callbackPath: '/editor' });
            if (!invoice) {
                alert('Failed to create invoice from quotation.');
                return;
            }
            onEditDocument(invoice);
        } catch (error: any) {
            alert(error?.message || 'Failed to create invoice from quotation.');
        }
    }, [convertQuoteToInvoice, onEditDocument]);

    const totalInBoard = relevantDocs.length;

    return (
        <div className="h-auto min-h-0 lg:h-[calc(100vh-9rem)] lg:min-h-170 flex flex-col gap-6 text-(--text-strong)">
            <header className="shrink-0 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="text-[11px] uppercase tracking-[0.35em] text-(--text-muted)">
                        {type === 'invoice' ? 'Invoices' : 'Quotations'} Board
                    </p>
                    <h1 className="text-3xl font-semibold text-(--text-strong) capitalize">{type}s</h1>
                    <p className="mt-1 text-sm text-(--text-muted)">{totalInBoard} document{totalInBoard === 1 ? '' : 's'}</p>
                </div>
                <button
                    onClick={() => onNewDocument(type)}
                    className="ui-btn-primary ui-focus-ring w-full sm:w-auto px-5 py-2.5 text-sm"
                >
                    + New {type === 'invoice' ? 'Invoice' : 'Quotation'}
                </button>
            </header>

            <div className="flex-1 min-h-0 flex flex-col gap-4 xl:flex-row">
                <div className="overflow-x-auto overflow-y-hidden pb-2 xl:flex-1 min-h-0 snap-x snap-mandatory">
                    <div className="flex gap-4 h-full sm:min-w-max">
                        {statuses.map((status) => (
                            <StatusColumn
                                key={status}
                                status={status}
                                documents={relevantDocs.filter((doc) => doc.status === status)}
                                selectedDocId={selectedDocId}
                                onSelect={(doc) => setSelectedDocId(doc.id)}
                                onDragStart={handleDragStart}
                                onDrop={handleDrop}
                                onEdit={onEditDocument}
                                onConvertToInvoice={type === 'quotation' ? handleConvertToInvoice : undefined}
                            />
                        ))}
                    </div>
                </div>

                <DetailPanel
                    doc={selectedDoc}
                    onEdit={onEditDocument}
                    onConvertToInvoice={type === 'quotation' ? handleConvertToInvoice : undefined}
                />
            </div>
        </div>
    );
});

DocumentList.displayName = 'DocumentList';

export default DocumentList;
