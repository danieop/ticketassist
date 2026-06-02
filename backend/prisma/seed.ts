import dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

dotenv.config({ path: "../.env" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const agents = [
  {
    name: "Ticket Intake Agent",
    type: "TICKET_ANALYZER",
    description: "Normalizes ticket input and extracts symptoms, constraints, and missing information.",
    executionOrder: 1
  },
  {
    name: "Priority Agent",
    type: "PRIORITY_CLASSIFIER",
    description: "Classifies severity and explains product or customer impact.",
    executionOrder: 2
  },
  {
    name: "Repo Search Agent",
    type: "REPO_SEARCH",
    description: "Searches focused repository context without sending the entire repository to the model.",
    executionOrder: 3
  },
  {
    name: "Code Context Agent",
    type: "CODE_CONTEXT",
    description: "Summarizes relevant files and likely touchpoints for review.",
    executionOrder: 4
  },
  {
    name: "Fix Proposal Agent",
    type: "FIX_PROPOSAL",
    description: "Drafts a constrained implementation proposal and risk notes.",
    executionOrder: 5
  },
  {
    name: "Mentor Draft Agent",
    type: "MENTOR_DRAFT",
    description: "Builds the final mentor review draft without claiming the issue is fixed.",
    executionOrder: 6
  }
] as const;

async function main() {
  for (const agent of agents) {
    await prisma.agent.upsert({
      where: { type: agent.type },
      update: agent,
      create: agent
    });
  }

  await prisma.user.upsert({
    where: { email: "mentor@ticketassist.local" },
    update: {
      name: "Default Mentor",
      role: "MENTOR"
    },
    create: {
      name: "Default Mentor",
      email: "mentor@ticketassist.local",
      role: "MENTOR"
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
