import { Request, Response, NextFunction } from "express";
import Ajv, { JSONSchemaType } from "ajv";

const ajv = new Ajv();

const querySchema: JSONSchemaType<{
  collection: string;
  query: Record<string, unknown>;
  projection?: Record<string, unknown>;
}> = {
  type: "object",
  properties: {
    collection: { type: "string" },
    query: { type: "object" },
    projection: { type: "object", nullable: true },
  },
  required: ["collection", "query"],
  additionalProperties: false,
};

const validateQuery = ajv.compile(querySchema);

const allowedOperators = ["$eq", "$gt", "$lt", "$in", "$exists"];

const validateMongoOperators = (query: Record<string, unknown>): boolean => {
  for (const key in query) {
    if (typeof query[key] === "object" && !Array.isArray(query[key])) {
      if (!validateMongoOperators(query[key] as Record<string, unknown>)) {
        return false;
      }
    } else if (key.startsWith("$") && !allowedOperators.includes(key)) {
      return false;
    }
  }
  return true;
};

export const validateQueryMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const isValid = validateQuery(req.body);

  if (!isValid || !validateMongoOperators(req.body.query)) {
    res.status(400).json({
      message: "Invalid query payload or unsupported MongoDB operators",
      errors: validateQuery.errors?.map((err) => ({
        field: err.instancePath || "root",
        message: err.message,
      })),
    });
    return;
  }
  next();
};
