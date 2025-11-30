import { Request, Response, NextFunction } from "express";
import Ajv, { JSONSchemaType } from "ajv";

const ajv = new Ajv();

interface CustomQueryPayload {
  collection: string;
  query?: Record<string, unknown>;
  pipeline?: Record<string, unknown>[];
  projection?: Record<string, unknown> | null;
}

const querySchema: JSONSchemaType<CustomQueryPayload> = {
  type: "object",
  properties: {
    collection: { type: "string" },
    query: { type: "object", nullable: true },
    pipeline: { type: "array", items: { type: "object" }, nullable: true },
    projection: { type: "object", nullable: true }
  },
  required: ["collection"],
  additionalProperties: false,
  anyOf: [
    { required: ["query"] },
    { required: ["pipeline"] }
  ]
};

const validateQuery = ajv.compile(querySchema);
const allowedOperators = ["$eq", "$gt", "$lt", "$in", "$exists"];

const validateMongoOperators = (query: Record<string, unknown>): boolean => {
  for (const key in query) {
    const val = query[key];
    if (key.startsWith("$") && !allowedOperators.includes(key)) {
      return false;
    }
    if (val && typeof val === "object" && !Array.isArray(val)) {
      if (!validateMongoOperators(val as Record<string, unknown>)) {
        return false;
      }
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
  if (!isValid) {
    res.status(400).json({
      message: "Invalid query payload or unsupported MongoDB operators",
      errors: validateQuery.errors?.map(err => ({
        field: err.instancePath || "root",
        message: err.message
      }))
    });
    return;
  }

  if (req.body.query && !validateMongoOperators(req.body.query)) {
    res.status(400).json({
      message: "Invalid query payload or unsupported MongoDB operators",
      errors: [{ field: "/query", message: "contains forbidden operator" }]
    });
    return;
  }

  next();
};
