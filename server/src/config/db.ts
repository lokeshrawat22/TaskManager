import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  try {
    const mongoUri: string | undefined = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error("MONGODB_URI is not defined");
    }

    await mongoose.connect(mongoUri);

    console.log("MongoDB Atlas connected");
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("MongoDB connection error:", error.message);
    }

    process.exit(1);
  }
};

export default connectDB;