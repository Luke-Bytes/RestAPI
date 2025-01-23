import { MongoClient } from "mongodb";

let client: MongoClient;

export const connectToDatabase = async () => {
  try {
    if (!client) {
      console.log("Connecting to database...");
      client = new MongoClient(process.env.DATABASE_URL as string);
      await client.connect();
      console.log("Connected to database successfully.");

      const db = client.db();
      console.log("Connected database name:", db.databaseName);
      const collections = await db.listCollections().toArray();
      console.log(
        "Collections in the database:",
        collections.map((col) => col.name)
      );
    }
    return client.db();
  } catch (err) {
    console.error("Failed to connect to the database:", err);
    throw err;
  }
};
