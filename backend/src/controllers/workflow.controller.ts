import type { RequestHandler } from "express";
import {
  acceptWorkflowAgentSchema,
  createWorkflowSchema,
  rerunWorkflowAgentSchema,
  reviewWorkflowSchema,
  updateWorkflowOutputSchema
} from "../validators/workflow.validators.js";
import { workflowService } from "../services/workflow.service.js";
import { ticketMemoryService } from "../services/ticket-memory.service.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../middlewares/error-handler.js";

function getParamId(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    throw new AppError(400, "Invalid workflow id");
  }

  return value;
}

export const createWorkflow: RequestHandler = async (request, response, next) => {
  try {
    if (!request.user) {
      throw new AppError(401, "Missing authorization token");
    }

    const payload = createWorkflowSchema.parse(request.body);
    const workflow = await workflowService.create(payload, request.user);
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

export const listWorkflowSummaries: RequestHandler = async (request, response, next) => {
  try {
    const status = typeof request.query.status === "string" ? request.query.status : undefined;
    const search = typeof request.query.search === "string" ? request.query.search : undefined;
    const limit = typeof request.query.limit === "string" ? Number(request.query.limit) : undefined;
    const page = typeof request.query.page === "string" ? Number(request.query.page) : undefined;
    const workflows = await workflowService.listSummaries({
      status,
      search,
      limit: Number.isFinite(limit) && limit ? limit : undefined,
      page: Number.isFinite(page) && page ? page : undefined
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
    const payload = acceptWorkflowAgentSchema.parse(request.body ?? {});
    const workflow = await workflowService.acceptAgent(getParamId(request.params.id), payload);
    response.json(workflow);
  } catch (error) {
    next(error);
  }
};

export const getWorkflowDashboard: RequestHandler = async (_request, response, next) => {
  try {
    response.json(await workflowService.dashboard());
  } catch (error) {
    next(error);
  }
};

export const rerunWorkflowAgent: RequestHandler = async (request, response, next) => {
  try {
    const payload = rerunWorkflowAgentSchema.parse(request.body ?? {});
    const workflow = await workflowService.rerunAgent(getParamId(request.params.id), payload);
    response.json(workflow);
  } catch (error) {
    next(error);
  }
};

export const updateWorkflowOutput: RequestHandler = async (request, response, next) => {
  try {
    const payload = updateWorkflowOutputSchema.parse(request.body);
    const workflow = await workflowService.updateAgentOutput(getParamId(request.params.id), payload);
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
    if (!request.user) {
      throw new AppError(401, "Missing authorization token");
    }

    const payload = reviewWorkflowSchema.parse(request.body);
    const workflow = await workflowService.review(getParamId(request.params.id), payload, request.user.id);
    response.json(workflow);
  } catch (error) {
    next(error);
  }
};

export const getQualityDashboard: RequestHandler = async (_request, response, next) => {
  try {

    response.json(await workflowService.quality());
  } catch (error) {
    next(error);
  }
};

export const getAgentQualityDetail: RequestHandler = async (request, response, next) => {
  try {
    const agentType = getParamId(request.params.agentType);
    const page = typeof request.query.page === "string" ? parseInt(request.query.page) : undefined;
    const limit = typeof request.query.limit === "string" ? parseInt(request.query.limit) : undefined;
    response.json(await workflowService.agentQualityDetail(agentType, page, limit));
  } catch (error) {
    next(error);
  }
};

export const getSimilarTickets: RequestHandler = async (request, response, next) => {
  try {
    const id = getParamId(request.params.id);
    const workflow = await prisma.workflowRun.findUnique({
        where: { id },
        include: { ticket: true }
    });
    
    if (!workflow) {
        throw new AppError(404, "Workflow not found");
    }
    
    const state = await prisma.workflowState.findUnique({ where: { workflowRunId: id } });
    const repoSearch = state?.repoSearchResults as any;
    
    if (repoSearch?.memoryMatches && repoSearch.memoryMatches.length > 0) {
        response.json({ matches: repoSearch.memoryMatches });
        return;
    }

    const matches = await ticketMemoryService.findSimilarTickets(
        workflow.ticket.title + " " + workflow.ticket.description,
        workflow.repositoryId
    );
    
    response.json({ matches });
  } catch (error) {
    next(error);
  }
};
