import { connectToDatabase } from "../config/database";

export const getPlayerByIGN = async (ignUsed: string) => {
    const db = await connectToDatabase();
    console.log("Querying for IGN:", ignUsed);
    const result = await db.collection("Player").findOne({ latestIGN: ignUsed });
    console.log("Query result:", JSON.stringify(result, null, 2));
    return result;
};

