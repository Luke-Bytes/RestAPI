import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(`${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
  });

  const status = (err as any).status || 500;

  res.status(status).json({
    error: {
      message: err.message,
      ...(status === 500 ? { detail: "Internal Server Error" } : {}),
    },
  });
};
