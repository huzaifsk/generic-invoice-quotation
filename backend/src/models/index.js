const mongoose = require('mongoose');

const { Schema } = mongoose;

const baseOptions = {
  strict: false,
  versionKey: false,
};

function createEntityModel(name, collectionName, indexedFields = {}) {
  const schema = new Schema(
    {
      id: { type: String, required: true, unique: true, index: true },
      companyId: { type: String, index: true },
      ...indexedFields,
    },
    { ...baseOptions, collection: collectionName }
  );
  return mongoose.models[name] || mongoose.model(name, schema);
}

const UserModel = createEntityModel('User', 'users', {
  email: { type: String, index: true },
  role: { type: String, index: true },
});

const CompanyModel = createEntityModel('Company', 'companies', {
  name: { type: String, index: true },
});

const ClientModel = createEntityModel('Client', 'clients', {
  email: { type: String, index: true },
  name: { type: String, index: true },
});

const CatalogItemModel = createEntityModel('CatalogItem', 'catalog_items', {
  sku: { type: String, index: true },
  name: { type: String, index: true },
});

const DocumentModel = createEntityModel('Document', 'documents', {
  type: { type: String, index: true },
  status: { type: String, index: true },
  clientId: { type: String, index: true },
  docNumber: { type: String, index: true },
});

const PaymentModel = createEntityModel('Payment', 'payments', {
  invoiceId: { type: String, index: true },
  receiptNumber: { type: String, index: true },
});

const CreditNoteModel = createEntityModel('CreditNote', 'credit_notes', {
  invoiceId: { type: String, index: true },
  creditNoteNumber: { type: String, index: true },
});

const QuoteVersionModel = createEntityModel('QuoteVersion', 'quote_versions', {
  documentId: { type: String, index: true },
  revision: { type: Number, index: true },
});

const ActivityModel = createEntityModel('Activity', 'activities', {
  action: { type: String, index: true },
  entityType: { type: String, index: true },
  entityId: { type: String, index: true },
  userId: { type: String, index: true },
});

const NotificationModel = createEntityModel('Notification', 'notifications', {
  eventType: { type: String, index: true },
  status: { type: String, index: true },
  recipient: { type: String, index: true },
});

const SequenceModel = mongoose.models.Sequence || mongoose.model(
  'Sequence',
  new Schema(
    {
      key: { type: String, required: true, unique: true, index: true },
      value: { type: Number, required: true, default: 0 },
    },
    { ...baseOptions, collection: 'sequences' }
  )
);

module.exports = {
  UserModel,
  CompanyModel,
  ClientModel,
  CatalogItemModel,
  DocumentModel,
  PaymentModel,
  CreditNoteModel,
  QuoteVersionModel,
  ActivityModel,
  NotificationModel,
  SequenceModel,
};
