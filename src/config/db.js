import dotenv from "dotenv";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

dotenv.config();

let connectionPromise;
let memoryServer;
let cleanupRegistered = false;

const stopMemoryServer = async () => {
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
};

const registerCleanupHandlers = () => {
  if (cleanupRegistered) {
    return;
  }

  cleanupRegistered = true;

  process.on("SIGINT", async () => {
    await mongoose.disconnect();
    await stopMemoryServer();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await mongoose.disconnect();
    await stopMemoryServer();
    process.exit(0);
  });
};

const resolveMongoUri = async () => {
  if (process.env.MONGO_URI) {
    return process.env.MONGO_URI;
  }

  if (process.env.NODE_ENV === "test") {
    memoryServer = await MongoMemoryServer.create();
    return memoryServer.getUri();
  }

  throw new Error("MONGO_URI is not defined");
};

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    try {
      const mongoUri = await resolveMongoUri();
      await mongoose.connect(mongoUri);
      registerCleanupHandlers();
      console.log("MongoDB connected");
      return mongoose.connection;
    } catch (error) {
      connectionPromise = null;
      console.error("Database connection failed", error.message);

      if (process.env.NODE_ENV === "test") {
        throw error;
      }

      process.exit(1);
    }
  })();

  return connectionPromise;
};

export const cleanupDB = async () => {
  await mongoose.disconnect();
  await stopMemoryServer();
  connectionPromise = null;
};

export default connectDB;