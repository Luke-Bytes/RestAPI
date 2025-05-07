import { Request, Response } from "express";
import { runCustomQuery } from "../services/queryService";
import { getErrorMessage } from "../utils/Utils";

export const customQuery = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { collection, query, projection, pipeline } = req.body;

  console.log(
    "Received custom query request:",
    JSON.stringify({ collection, query, projection, pipeline }, null, 2)
  );

  try {
    const queryOrPipeline = Array.isArray(pipeline) ? pipeline : query;

    const results = await runCustomQuery(
      collection,
      queryOrPipeline,
      projection
    );

    const resultsString = JSON.stringify(results, null, 2)
      .split('\n')
      .slice(0, 20)
      .join('\n');

    console.log("Custom query results:\n" + resultsString);

    res.json(results);
  } catch (err) {
    console.error(
      "Error processing query:",
      JSON.stringify(
        {
          collection,
          query,
          projection,
          pipeline,
          error: getErrorMessage(err),
        },
        null,
        2
      )
    );
    res.status(500).json({
      message: "An error occurred while processing the query",
      error: getErrorMessage(err),
    });
  }
};
