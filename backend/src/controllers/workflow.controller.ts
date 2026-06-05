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

export const listWorkflows: RequestHandler = async (request, response, next) => {
  try {
    const status = typeof request.query.status === "string" ? request.query.status : undefined;
    const limit = typeof request.query.limit === "string" ? Number(request.query.limit) : undefined;
    const workflows = await workflowService.list({
      status,
      limit: Number.isFinite(limit) && limit ? limit : undefined
    });

    response.json(workflows);
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

export const acceptWorkflowAgent: RequestHandler = async (request, response, next) => {
  try {
    const workflow = await workflowService.acceptAgent(getParamId(request.params.id));
    response.json(workflow);
  } catch (error) {
    next(error);
  }
};

export const rerunWorkflowAgent: RequestHandler = async (request, response, next) => {
  try {
    const workflow = await workflowService.rerunAgent(getParamId(request.params.id));
    response.json(workflow);
  } catch (error) {
    next(error);
  }
};

export const submitWorkflowForReview: RequestHandler = async (request, response, next) => {
  try {
    const workflow = await workflowService.submitForReview(getParamId(request.params.id));
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
