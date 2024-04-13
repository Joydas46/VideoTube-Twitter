import mongoose from "mongoose";
import { DB_Name } from "../constant.js";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGO_DB_URL}${DB_Name}`
    );
    console.log(
      `MongoDB connected !! DB Host: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log("MONGODB CONNECTION ERROR: ", error);
    process.exit(1);
  }
};

export default connectDB;
