const mongoose = require('mongoose');
const { mongoUri, mongoDbName } = require('../config');

async function connectToMongo() {
  const readyState = mongoose.connection.readyState;
  if (readyState === 1) return mongoose.connection;

  try {
    // eslint-disable-next-line no-console
    console.log('MONGO_CONNECTING', { readyState });
    await mongoose.connect(mongoUri, {
      dbName: mongoDbName,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      maxPoolSize: 10,
      minPoolSize: 2,
      retryWrites: true,
      maxIdleTimeMS: 30000,
      socketTimeoutMS: 45000,
    });
    // eslint-disable-next-line no-console
    console.log('MONGO_CONNECTED', { dbName: mongoDbName });
    return mongoose.connection;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('MONGO_CONNECT_FAILED', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    throw error;
  }
}

async function disconnectMongo() {
  if (mongoose.connection.readyState !== 1) return;
  await mongoose.disconnect();
}

module.exports = {
  connectToMongo,
  disconnectMongo,
};
