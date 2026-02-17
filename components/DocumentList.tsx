
import React, { useState } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { Document, DocumentType, DocumentStatus, InvoiceStatus, QuotationStatus } from '../types';

const getStatusColor = (status: string) => {
    switch (status) {
        case 'Paid': case 'Accepted': return 'border-l-green-400';
        case 'Sent': return 'border-l-blue-400';
        case 'Overdue': case 'Rejected': return 'border-l-red-400';
        case 'Draft': default: return 'border-l-gray-400';
    }
};

const DocumentCard: React.FC<{ doc: Document; onDragStart: (e: React.DragEvent<HTMLDivElement>, docId: string) => void; onEdit: (doc: Document) => void; }> = ({ doc, onDragStart, onEdit }) => {
    const { getClientById, companyInfo } = useAppContext();
    const client = getClientById(doc.clientId);
    const subtotal = doc.items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
    const vat = subtotal * ((companyInfo?.vatPercent || 0) / 100);
    const grandTotal = subtotal + vat;

    return (
        <div 
            draggable 
            onDragStart={(e) => onDragStart(e, doc.id)}
            onClick={() => onEdit(doc)}
            className={`bg-slate-900/70 p-4 rounded-lg shadow-md mb-3 cursor-pointer border-l-4 ${getStatusColor(doc.status)} hover:bg-slate-700/80 transition-transform hover:scale-[1.02]`}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-bold text-white">{doc.docNumber}</p>
                    <p className="text-sm text-gray-300">{client?.name}</p>
                </div>
                <p className="font-semibold text-white">{new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(grandTotal)}</p>
            </div>
            <p className="text-xs text-gray-400 mt-2">Due: {new Date(doc.dueDate).toLocaleDateString()}</p>
        </div>
    );
};

const StatusColumn: React.FC<{
    status: DocumentStatus;
    documents: Document[];
    onDragStart: (e: React.DragEvent<HTMLDivElement>, docId: string) => void;
    onDrop: (e: React.DragEvent<HTMLDivElement>, status: DocumentStatus) => void;
    onEdit: (doc: Document) => void;
}> = ({ status, documents, onDragStart, onDrop, onEdit }) => {
    const [isOver, setIsOver] = useState(false);
    return (
        <div
            onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
            onDragLeave={() => setIsOver(false)}
            onDrop={(e) => { onDrop(e, status); setIsOver(false); }}
            className={`flex-1 min-w-[280px] bg-slate-800/60 backdrop-blur-lg border border-slate-100/10 rounded-xl p-4 transition-colors ${isOver ? 'bg-slate-700/60' : ''}`}>
            <h3 className="font-bold text-white mb-4 uppercase text-sm tracking-wider">{status} ({documents.length})</h3>
            <div className="space-y-3 h-[calc(100vh-250px)] overflow-y-auto pr-2">
                {documents.length > 0 ? (
                    documents.map(doc => <DocumentCard key={doc.id} doc={doc} onDragStart={onDragStart} onEdit={onEdit} />)
                ) : (
                    <div className="text-center pt-10">
                        <p className="text-gray-500 text-sm">No documents in this stage.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const DocumentList: React.FC<{ type: DocumentType, onEditDocument: (doc: Document) => void, onNewDocument: (type: DocumentType) => void }> = ({ type, onEditDocument, onNewDocument }) => {
    const { documents, updateDocumentStatus } = useAppContext();
    
    const relevantDocs = documents.filter(d => d.type === type);
    const statuses: DocumentStatus[] = type === 'invoice'
        ? ['Draft', 'Sent', 'Paid', 'Overdue']
        : ['Draft', 'Sent', 'Accepted', 'Rejected'];

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, docId: string) => {
        e.dataTransfer.setData('docId', docId);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, newStatus: DocumentStatus) => {
        const docId = e.dataTransfer.getData('docId');
        updateDocumentStatus(docId, newStatus);
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white capitalize">{type}s</h1>
                <button onClick={() => onNewDocument(type)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition">
                    + New {type === 'invoice' ? 'Invoice' : 'Quotation'}
                </button>
            </div>
            <div className="flex space-x-4 overflow-x-auto pb-4">
                {statuses.map(status => (
                    <StatusColumn
                        key={status}
                        status={status}
                        documents={relevantDocs.filter(d => d.status === status)}
                        onDragStart={handleDragStart}
                        onDrop={handleDrop}
                        onEdit={onEditDocument}
                    />
                ))}
            </div>
        </div>
    );
};

export default DocumentList;
