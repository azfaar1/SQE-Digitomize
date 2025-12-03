// backend/tests/setupTest.js
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

export default async () => {
  // This runs before any test files are loaded
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // Make mongoServer available globally to stop it at afterAll if necessary
  global.__MONGO_SERVER__ = mongoServer;
};
