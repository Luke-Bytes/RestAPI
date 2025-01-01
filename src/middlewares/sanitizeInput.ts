import sanitizeHtml from "sanitize-html";
import { Request, Response, NextFunction } from "express";

const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
    if (req.body) {
        for (const key in req.body) {
            if (typeof req.body[key] === "string") {
                req.body[key] = sanitizeHtml(req.body[key]);
            }
        }
    }

    if (req.query) {
        for (const key in req.query) {
            if (typeof req.query[key] === "string") {
                req.query[key] = sanitizeHtml(req.query[key]);
            }
        }
    }

    if (req.params) {
        for (const key in req.params) {
            if (typeof req.params[key] === "string") {
                req.params[key] = sanitizeHtml(req.params[key]);
            }
        }
    }
    next();
};

export default sanitizeInput;
