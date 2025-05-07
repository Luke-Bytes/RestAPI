import { connectToDatabase } from "../config/database";

export const runCustomQuery = async (
  collectionName: string,
  queryOrPipeline: object | object[],
  projection: object = {}
) => {
  const db = await connectToDatabase();
  const coll = db.collection(collectionName);

  if (Array.isArray(queryOrPipeline)) {
    return coll.aggregate(queryOrPipeline, { maxTimeMS: 5000 }).toArray();
  } else {
    return coll
      .find(queryOrPipeline, { projection })
      .limit(100)
      .maxTimeMS(5000)
      .toArray();
  }
};
