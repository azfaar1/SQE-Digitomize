// backend/tests/setupTest.js
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer;

/**
 * This file will be referenced from vitest.config.js as setupFiles.
 * It will run before tests. We export an async default that vitest will
 * run before loading tests (works with setupFiles).
 */
export default async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // Expose the mongo server globally so tests can stop it in afterAll if needed
  global.__MONGO_SERVER__ = mongoServer;

  // Optionally, provide a helper to clear DB between tests (each test file can call it)
  global.clearTestDatabase = async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      // eslint-disable-next-line no-await-in-loop
      await collections[key].deleteMany({});
    }
  };
};
