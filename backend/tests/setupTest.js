// backend/tests/setupTest.js
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { beforeAll, afterAll, afterEach } from "vitest";

let mongoServer;

// Start an in-memory MongoDB before any tests run
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

// Clear DB after each test to keep isolation
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    // If collection exists, delete all documents
    if (Object.prototype.hasOwnProperty.call(collections, key)) {
      // eslint-disable-next-line no-await-in-loop
      await collections[key].deleteMany({});
    }
  }
});

// Disconnect and stop the in-memory server after all tests complete
afterAll(async () => {
  try {
    await mongoose.disconnect();
  } catch (e) {
    // ignore disconnect errors
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});
