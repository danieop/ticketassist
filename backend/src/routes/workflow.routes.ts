import { Router } from "express";
import {
  createWorkflow,
  getWorkflowDashboard,
  getWorkflow,
  listWorkflowSummaries,
  listWorkflows,
  acceptWorkflowAgent,
  rerunWorkflowAgent,
  updateWorkflowOutput,
  submitWorkflowForReview,
  reviewWorkflow
} from "../controllers/workflow.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";

export const workflowRouter = Router();

workflowRouter.use(requireAuth);

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
workflowRouter.post("/", requireRole("DEVELOPER", "ADMIN"), createWorkflow);
workflowRouter.get("/", listWorkflows);
workflowRouter.get("/dashboard", getWorkflowDashboard);
workflowRouter.get("/summaries", listWorkflowSummaries);

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
workflowRouter.post("/:id/accept", requireRole("DEVELOPER", "ADMIN"), acceptWorkflowAgent);
workflowRouter.post("/:id/rerun", requireRole("DEVELOPER", "ADMIN"), rerunWorkflowAgent);
workflowRouter.patch("/:id/output", requireRole("DEVELOPER", "ADMIN"), updateWorkflowOutput);
workflowRouter.post("/:id/submit", requireRole("DEVELOPER", "ADMIN"), submitWorkflowForReview);

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
workflowRouter.post("/:id/review", requireRole("MENTOR", "ADMIN"), reviewWorkflow);
