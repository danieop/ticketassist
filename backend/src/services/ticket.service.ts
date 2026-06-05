import type { Prisma, Ticket } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../middlewares/error-handler.js";
import { repositoryService } from "./repository.service.js";
import type {
  CreateTicketInput,
  ListTicketsInput,
  UpdateTicketInput
} from "../validators/ticket.validators.js";

const ticketInclude = {
  reporter: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    }
  },
  _count: {
    select: {
      workflowRuns: true
    }
  },
  workflowRuns: {
    select: {
      id: true,
      status: true,
      repository: {
        select: {
          id: true,
          name: true,
          rootPath: true,
          status: true
        }
      },
      startedAt: true,
      finishedAt: true
    },
    orderBy: {
      startedAt: "desc"
    },
    take: 1
  }
} satisfies Prisma.TicketInclude;

function toTicketResponse(
  ticket: Ticket & {
    reporter?: {
      id: string;
      name: string;
      email: string;
      role: string;
    } | null;
    _count?: {
      workflowRuns: number;
    };
    workflowRuns?: {
      id: string;
      status: string;
      repository: {
        id: string;
        name: string;
        rootPath: string;
        status: string;
      } | null;
      startedAt: Date;
      finishedAt: Date | null;
    }[];
  }
) {
  const [latestWorkflowRun] = ticket.workflowRuns ?? [];

  return {
    id: ticket.id,
    title: ticket.title,
    description: ticket.description,
    reporterName: ticket.reporterName,
    source: ticket.source,
    reporterId: ticket.reporterId,
    reporter: ticket.reporter ?? null,
    workflowRunCount: ticket._count?.workflowRuns ?? 0,
    latestWorkflowRun: latestWorkflowRun ?? null,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt
  };
}

async function ensureReporterExists(reporterId?: string | null) {
  if (!reporterId) {
    return;
  }

  const reporter = await prisma.user.findUnique({
    where: { id: reporterId },
    select: { id: true }
  });

  if (!reporter) {
    throw new AppError(404, "Reporter not found");
  }
}

async function findTicketOrThrow(id: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: ticketInclude
  });

  if (!ticket) {
    throw new AppError(404, "Ticket not found");
  }

  return ticket;
}

function buildWhere(input: ListTicketsInput) {
  const where: Prisma.TicketWhereInput = {};

  if (input.source) {
    where.source = input.source;
  }

  if (input.reporterId) {
    where.reporterId = input.reporterId;
  }

  if (input.search) {
    where.OR = [
      {
        title: {
          contains: input.search,
          mode: "insensitive"
        }
      },
      {
        description: {
          contains: input.search,
          mode: "insensitive"
        }
      },
      {
        reporterName: {
          contains: input.search,
          mode: "insensitive"
        }
      }
    ];
  }

  return where;
}

export const ticketService = {
  async list(input: ListTicketsInput) {
    const tickets = await prisma.ticket.findMany({
      where: buildWhere(input),
      include: ticketInclude,
      orderBy: { createdAt: "desc" }
    });

    return tickets.map((ticket) => toTicketResponse(ticket));
  },

  async getById(id: string) {
    return toTicketResponse(await findTicketOrThrow(id));
  },

  async create(input: CreateTicketInput) {
    await ensureReporterExists(input.reporterId);

    const ticket = await prisma.$transaction(async (tx) => {
      const createdTicket = await tx.ticket.create({
        data: {
          title: input.title,
          description: input.description,
          reporterName: input.reporterName,
          source: input.source,
          reporterId: input.reporterId
        }
      });

      return tx.ticket.findUniqueOrThrow({
        where: { id: createdTicket.id },
        include: ticketInclude
      });
    });

    return toTicketResponse(ticket);
  },

  async update(id: string, input: UpdateTicketInput) {
    await findTicketOrThrow(id);

    if ("reporterId" in input) {
      await ensureReporterExists(input.reporterId);
    }

    const ticket = await prisma.ticket.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        reporterName: input.reporterName,
        source: input.source,
        reporterId: input.reporterId
      },
      include: ticketInclude
    });

    return toTicketResponse(ticket);
  },

  async delete(id: string) {
    await findTicketOrThrow(id);
    await prisma.ticket.delete({ where: { id } });

    return { id };
  },

  async routeAllToDefaultCodebase() {
    const repository = await repositoryService.ensureDefaultCodebaseRepository();

    await prisma.workflowRun.updateMany({
      where: {
        OR: [{ repositoryId: null }, { repositoryId: { not: repository.id } }]
      },
      data: {
        repositoryId: repository.id
      }
    });

    const unroutedTickets = await prisma.ticket.findMany({
      where: {
        workflowRuns: {
          none: {}
        }
      },
      select: { id: true }
    });

    for (const ticket of unroutedTickets) {
      await prisma.workflowRun.create({
        data: {
          ticketId: ticket.id,
          repositoryId: repository.id,
          status: "CREATED",
          currentAgent: "CardSeller codebase"
        }
      });
    }

    return {
      repositoryId: repository.id,
      routedTickets: unroutedTickets.length
    };
  }
};
