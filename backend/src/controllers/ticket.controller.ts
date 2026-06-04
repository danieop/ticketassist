import type { RequestHandler } from "express";
import { AppError } from "../middlewares/error-handler.js";
import { ticketService } from "../services/ticket.service.js";
import {
  createTicketSchema,
  listTicketsSchema,
  updateTicketSchema
} from "../validators/ticket.validators.js";

function getParamId(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    throw new AppError(400, "Invalid ticket id");
  }

  return value;
}

export const listTickets: RequestHandler = async (request, response, next) => {
  try {
    const payload = listTicketsSchema.parse(request.query);
    response.json(await ticketService.list(payload));
  } catch (error) {
    next(error);
  }
};

export const getTicket: RequestHandler = async (request, response, next) => {
  try {
    response.json(await ticketService.getById(getParamId(request.params.id)));
  } catch (error) {
    next(error);
  }
};

export const createTicket: RequestHandler = async (request, response, next) => {
  try {
    const payload = createTicketSchema.parse(request.body);
    response.status(201).json(await ticketService.create(payload));
  } catch (error) {
    next(error);
  }
};

export const updateTicket: RequestHandler = async (request, response, next) => {
  try {
    const payload = updateTicketSchema.parse(request.body);
    response.json(await ticketService.update(getParamId(request.params.id), payload));
  } catch (error) {
    next(error);
  }
};

export const deleteTicket: RequestHandler = async (request, response, next) => {
  try {
    response.json(await ticketService.delete(getParamId(request.params.id)));
  } catch (error) {
    next(error);
  }
};
