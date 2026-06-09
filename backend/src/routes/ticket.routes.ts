import { Router } from "express";
import {
  createTicket,
  deleteTicket,
  getTicket,
  listTickets,
  updateTicket
} from "../controllers/ticket.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";

export const ticketRouter = Router();

ticketRouter.use(requireAuth);

/**
 * @openapi
 * /api/tickets:
 *   get:
 *     tags:
 *       - Tickets
 *     summary: List tickets
 *     parameters:
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [EMAIL, SLACK, ZENDESK, JIRA, MANUAL]
 *       - in: query
 *         name: reporterId
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tickets
 */
ticketRouter.get("/", listTickets);

/**
 * @openapi
 * /api/tickets:
 *   post:
 *     tags:
 *       - Tickets
 *     summary: Create a ticket
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTicketRequest'
 *     responses:
 *       201:
 *         description: Created ticket
 *       400:
 *         description: Invalid ticket
 */
ticketRouter.post("/", requireRole("DEVELOPER", "ADMIN"), createTicket);

/**
 * @openapi
 * /api/tickets/{id}:
 *   get:
 *     tags:
 *       - Tickets
 *     summary: Get a ticket
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ticket details
 *       404:
 *         description: Ticket not found
 */
ticketRouter.get("/:id", getTicket);

/**
 * @openapi
 * /api/tickets/{id}:
 *   patch:
 *     tags:
 *       - Tickets
 *     summary: Update a ticket
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
 *             $ref: '#/components/schemas/UpdateTicketRequest'
 *     responses:
 *       200:
 *         description: Updated ticket
 *       404:
 *         description: Ticket not found
 */
ticketRouter.patch("/:id", requireRole("DEVELOPER", "ADMIN"), updateTicket);

/**
 * @openapi
 * /api/tickets/{id}:
 *   delete:
 *     tags:
 *       - Tickets
 *     summary: Delete a ticket and its workflow runs
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted ticket id
 *       404:
 *         description: Ticket not found
 */
ticketRouter.delete("/:id", requireRole("DEVELOPER", "ADMIN"), deleteTicket);
