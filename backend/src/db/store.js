const fs = require('fs/promises');
const { dbFile } = require('../config');
const { connectToMongo } = require('./mongoose');
const {
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
} = require('../models');

const defaultDb = {
  version: 2,
  users: [],
  companies: [],
  clients: [],
  catalogItems: [],
  documents: [],
  payments: [],
  creditNotes: [],
  quoteVersions: [],
  activities: [],
  notifications: [],
  sequences: {},
};

function normalizeDb(input) {
  const db = { ...defaultDb, ...(input || {}) };

  // Keep backward compatibility if old DB exists.
  db.version = Number(db.version || 2);
  db.users = Array.isArray(db.users) ? db.users : [];
  db.companies = Array.isArray(db.companies) ? db.companies : [];
  db.clients = Array.isArray(db.clients) ? db.clients : [];
  db.catalogItems = Array.isArray(db.catalogItems) ? db.catalogItems : [];
  db.documents = Array.isArray(db.documents) ? db.documents : [];
  db.payments = Array.isArray(db.payments) ? db.payments : [];
  db.creditNotes = Array.isArray(db.creditNotes) ? db.creditNotes : [];
  db.quoteVersions = Array.isArray(db.quoteVersions) ? db.quoteVersions : [];
  db.activities = Array.isArray(db.activities) ? db.activities : [];
  db.notifications = Array.isArray(db.notifications) ? db.notifications : [];
  db.sequences = typeof db.sequences === 'object' && db.sequences !== null ? db.sequences : {};

  return db;
}

let client;
let writeQueue = Promise.resolve();

async function readLegacyJsonDb() {
  try {
    const raw = await fs.readFile(dbFile, 'utf8');
    return normalizeDb(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function ensureMongo() {
  if (client) return;
  client = await connectToMongo();
}

function stripMongoFields(doc) {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return rest;
}

async function upsertEntities(Model, entities) {
  const safeEntities = Array.isArray(entities) ? entities.filter((entry) => entry && entry.id) : [];
  const ids = safeEntities.map((entry) => entry.id);

  if (ids.length === 0) {
    await Model.deleteMany({});
    return;
  }

  await Model.deleteMany({ id: { $nin: ids } });

  const operations = safeEntities.map((entry) => ({
    updateOne: {
      filter: { id: entry.id },
      update: { $set: entry },
      upsert: true,
    },
  }));

  if (operations.length > 0) {
    await Model.bulkWrite(operations, { ordered: false });
  }
}

async function upsertSequences(sequences) {
  const source = typeof sequences === 'object' && sequences !== null ? sequences : {};
  const entries = Object.entries(source).map(([key, value]) => ({ key, value: Number(value || 0) }));
  const keys = entries.map((entry) => entry.key);

  if (keys.length === 0) {
    await SequenceModel.deleteMany({});
    return;
  }

  await SequenceModel.deleteMany({ key: { $nin: keys } });

  const operations = entries.map((entry) => ({
    updateOne: {
      filter: { key: entry.key },
      update: { $set: entry },
      upsert: true,
    },
  }));

  await SequenceModel.bulkWrite(operations, { ordered: false });
}

async function persistDb(db) {
  const normalized = normalizeDb(db);

  await Promise.all([
    upsertEntities(UserModel, normalized.users),
    upsertEntities(CompanyModel, normalized.companies),
    upsertEntities(ClientModel, normalized.clients),
    upsertEntities(CatalogItemModel, normalized.catalogItems),
    upsertEntities(DocumentModel, normalized.documents),
    upsertEntities(PaymentModel, normalized.payments),
    upsertEntities(CreditNoteModel, normalized.creditNotes),
    upsertEntities(QuoteVersionModel, normalized.quoteVersions),
    upsertEntities(ActivityModel, normalized.activities),
    upsertEntities(NotificationModel, normalized.notifications),
    upsertSequences(normalized.sequences),
  ]);
}

async function initDb() {
  await ensureMongo();

  const companyCount = await CompanyModel.countDocuments();
  if (companyCount > 0) return;

  const legacy = await readLegacyJsonDb();
  const initialDb = normalizeDb(legacy || defaultDb);
  await persistDb(initialDb);
}

async function readDb() {
  await ensureMongo();

  const [
    users,
    companies,
    clients,
    catalogItems,
    documents,
    payments,
    creditNotes,
    quoteVersions,
    activities,
    notifications,
    sequences,
  ] = await Promise.all([
    UserModel.find({}).lean(),
    CompanyModel.find({}).lean(),
    ClientModel.find({}).lean(),
    CatalogItemModel.find({}).lean(),
    DocumentModel.find({}).lean(),
    PaymentModel.find({}).lean(),
    CreditNoteModel.find({}).lean(),
    QuoteVersionModel.find({}).lean(),
    ActivityModel.find({}).lean(),
    NotificationModel.find({}).lean(),
    SequenceModel.find({}).lean(),
  ]);

  const db = {
    version: 2,
    users: users.map(stripMongoFields),
    companies: companies.map(stripMongoFields),
    clients: clients.map(stripMongoFields),
    catalogItems: catalogItems.map(stripMongoFields),
    documents: documents.map(stripMongoFields),
    payments: payments.map(stripMongoFields),
    creditNotes: creditNotes.map(stripMongoFields),
    quoteVersions: quoteVersions.map(stripMongoFields),
    activities: activities.map(stripMongoFields),
    notifications: notifications.map(stripMongoFields),
    sequences: Object.fromEntries(sequences.map((entry) => [entry.key, Number(entry.value || 0)])),
  };

  return normalizeDb(db);
}

async function mutateDb(mutator) {
  writeQueue = writeQueue.then(async () => {
    await ensureMongo();
    const db = await readDb();
    const result = await mutator(db);
    await persistDb(db);
    return result;
  });
  return writeQueue;
}

module.exports = {
  initDb,
  readDb,
  mutateDb,
};
