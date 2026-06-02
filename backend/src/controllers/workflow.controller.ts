import type { RequestHandler } from "express";
import {
  createWorkflowSchema,
  reviewWorkflowSchema
} from "../validators/workflow.validators.js";
import { workflowService } from "../services/workflow.service.js";
import { AppError } from "../middlewares/error-handler.js";

function getParamId(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    throw new AppError(400, "Invalid workflow id");
  }

  return value;
}

export const createWorkflow: RequestHandler = async (request, response, next) => {
  try {
    const payload = createWorkflowSchema.parse(request.body);
    const workflow = await workflowService.create(payload);
    response.status(201).json(workflow);
  } catch (error) {
    next(error);
  }
};

export const getWorkflow: RequestHandler = async (request, response, next) => {
  try {
    const workflow = await workflowService.getById(getParamId(request.params.id));
    response.json(workflow);
  } catch (error) {
    next(error);
  }
};

export const reviewWorkflow: RequestHandler = async (request, response, next) => {
  try {
    const payload = reviewWorkflowSchema.parse(request.body);
    const workflow = await workflowService.review(getParamId(request.params.id), payload);
    response.json(workflow);
  } catch (error) {
    next(error);
  }
};
