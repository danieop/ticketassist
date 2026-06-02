import express from "express";
import swaggerUi from "swagger-ui-express";
import { errorHandler } from "./middlewares/error-handler.js";
import { notFoundHandler } from "./middlewares/not-found.js";
import { swaggerSpec } from "./swagger/swagger.js";
import { apiRouter } from "./routes/index.js";

export function createApp() {
  const app = express();

  app.use(express.json({ limit: "1mb" }));

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use(apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
