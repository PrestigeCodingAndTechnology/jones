import { env } from "../config/env.js";

export function notFound(req, res) {
  res.status(404).json({ error: "The requested resource was not found." });
}

export function errorHandler(error, req, res, _next) {
  let status = error.status || 500;
  let message = error.message || "Something went wrong.";

  if (error.name === "ValidationError") {
    status = 400;
    message = Object.values(error.errors)
      .map((entry) => entry.message)
      .join(" ");
  }
  if (error.code === 11000) {
    status = 409;
    message = "A record with those details already exists.";
  }
  if (error.name === "CastError") {
    status = 400;
    message = "The supplied record identifier is invalid.";
  }

  if (status >= 500) {
    console.error(`[${req.id || "no-request-id"}]`, error);
    message = "The server could not complete the request.";
  }

  res.status(status).json({
    error: message,
    ...(error.details ? { details: error.details } : {}),
    ...(env.isProduction ? {} : { requestId: req.id }),
  });
}
