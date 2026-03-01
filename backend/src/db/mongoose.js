const mongoose = require('mongoose');
const { mongoUri, mongoDbName } = require('../config');

let isConnected = false;

async function connectToMongo() {
  if (isConnected) return mongoose.connection;

  await mongoose.connect(mongoUri, {
    dbName: mongoDbName,
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 10,
  });

  isConnected = true;
  return mongoose.connection;
}

async function disconnectMongo() {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
}

module.exports = {
  connectToMongo,
  disconnectMongo,
};
