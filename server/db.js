// server/db.js
import dotenv from "dotenv";
dotenv.config();

import { Sequelize } from "sequelize";
import mongoose from "mongoose";

const sequelize = new Sequelize(
  process.env.DB_NAME, // database name
  process.env.DB_USER, // username
  process.env.DB_PASSWORD, // password
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "postgres",
    logging: false,
  }
);

// PostgreSQL connection function
export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    console.log("✅ PostgreSQL connected & synced");
  } catch (error) {
    console.error("❌ PostgreSQL connection failed:", error);
    throw error;
  }
};

// MongoDB connection function
export const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    throw error;
  }
};

export default sequelize;
