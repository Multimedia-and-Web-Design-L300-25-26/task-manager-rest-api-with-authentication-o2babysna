import mongoose from "mongoose";
import { cleanupDB } from "../src/config/db.js";
import app from "../src/app.js";

afterAll(async () => {
  await cleanupDB();
});

export default app;