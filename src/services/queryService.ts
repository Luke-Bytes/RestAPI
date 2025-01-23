import { connectToDatabase } from "../config/database";

export const runCustomQuery = async (
  collectionName: string,
  query: object,
  projection: object = {}
) => {
  const db = await connectToDatabase();
  return db
    .collection(collectionName)
    .find(query, { projection })
    .limit(100)
    .maxTimeMS(5000)
    .toArray();
};
