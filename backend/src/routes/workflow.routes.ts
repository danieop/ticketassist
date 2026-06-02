import { Router } from "express";
import {
  createWorkflow,
  getWorkflow,
  reviewWorkflow
} from "../controllers/workflow.controller.js";

export const workflowRouter = Router();

/**
 * @openapi
 * /api/workflows:
 *   post:
 *     tags:
 *       - Workflows
 *     summary: Create a workflow run from a bug ticket
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateWorkflowRequest'
 *     responses:
 *       201:
 *         description: Workflow state created
 */
workflowRouter.post("/", createWorkflow);

/**
 * @openapi
 * /api/workflows/{id}:
 *   get:
 *     tags:
 *       - Workflows
 *     summary: Get workflow state, trace, search results, and review
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workflow details
 *       404:
 *         description: Workflow not found
 */
workflowRouter.get("/:id", getWorkflow);

/**
 * @openapi
 * /api/workflows/{id}/review:
 *   post:
 *     tags:
 *       - Reviews
 *     summary: Submit mentor review decision for a workflow
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReviewWorkflowRequest'
 *     responses:
 *       200:
 *         description: Updated workflow with review
 */
workflowRouter.post("/:id/review", reviewWorkflow);
