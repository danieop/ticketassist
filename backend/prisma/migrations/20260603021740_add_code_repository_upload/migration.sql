-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('DEVELOPER', 'MENTOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "TicketSource" AS ENUM ('EMAIL', 'SLACK', 'ZENDESK', 'JIRA', 'MANUAL');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('CREATED', 'TICKET_ANALYZED', 'PRIORITY_CLASSIFIED', 'REPO_SEARCHED', 'CODE_CONTEXT_READY', 'FIX_PROPOSED', 'MENTOR_DRAFT_READY', 'WAITING_FOR_REVIEW', 'REVIEWED', 'FAILED');

-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('TICKET_ANALYZER', 'PRIORITY_CLASSIFIER', 'REPO_SEARCH', 'CODE_CONTEXT', 'FIX_PROPOSAL', 'MENTOR_DRAFT');

-- CreateEnum
CREATE TYPE "AgentRunStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "TraceLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('APPROVED', 'REJECTED', 'NEED_MORE_INFORMATION');

-- CreateEnum
CREATE TYPE "RepositoryUploadStatus" AS ENUM ('READY', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'DEVELOPER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reporterName" TEXT NOT NULL,
    "source" "TicketSource" NOT NULL DEFAULT 'MANUAL',
    "reporterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowRun" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "repositoryId" TEXT,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'CREATED',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "currentAgent" TEXT,

    CONSTRAINT "WorkflowRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeRepository" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rootPath" TEXT NOT NULL,
    "status" "RepositoryUploadStatus" NOT NULL DEFAULT 'READY',
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "totalBytes" BIGINT NOT NULL DEFAULT 0,
    "uploadedById" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodeRepository_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeRepositoryFile" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "relativePath" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodeRepositoryFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowState" (
    "id" TEXT NOT NULL,
    "workflowRunId" TEXT NOT NULL,
    "inputTicket" JSONB NOT NULL,
    "ticketAnalysis" JSONB,
    "priorityClassification" JSONB,
    "repoSearchResults" JSONB,
    "codeContext" JSONB,
    "fixProposal" JSONB,
    "mentorDraft" JSONB,
    "reviewDecision" JSONB,
    "error" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AgentType" NOT NULL,
    "description" TEXT NOT NULL,
    "executionOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "workflowRunId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "status" "AgentRunStatus" NOT NULL DEFAULT 'PENDING',
    "inputSnapshot" JSONB,
    "outputSnapshot" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TraceLog" (
    "id" TEXT NOT NULL,
    "workflowRunId" TEXT NOT NULL,
    "agentRunId" TEXT,
    "level" "TraceLevel" NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TraceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepoSearchResult" (
    "id" TEXT NOT NULL,
    "workflowRunId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "chunkId" TEXT NOT NULL,
    "startLine" INTEGER NOT NULL,
    "endLine" INTEGER NOT NULL,
    "relevanceScore" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "RepoSearchResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorReview" (
    "id" TEXT NOT NULL,
    "workflowRunId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "comment" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Ticket_reporterId_idx" ON "Ticket"("reporterId");

-- CreateIndex
CREATE INDEX "WorkflowRun_ticketId_idx" ON "WorkflowRun"("ticketId");

-- CreateIndex
CREATE INDEX "WorkflowRun_repositoryId_idx" ON "WorkflowRun"("repositoryId");

-- CreateIndex
CREATE INDEX "WorkflowRun_status_idx" ON "WorkflowRun"("status");

-- CreateIndex
CREATE INDEX "CodeRepository_uploadedById_idx" ON "CodeRepository"("uploadedById");

-- CreateIndex
CREATE INDEX "CodeRepository_status_idx" ON "CodeRepository"("status");

-- CreateIndex
CREATE INDEX "CodeRepository_createdAt_idx" ON "CodeRepository"("createdAt");

-- CreateIndex
CREATE INDEX "CodeRepositoryFile_repositoryId_idx" ON "CodeRepositoryFile"("repositoryId");

-- CreateIndex
CREATE INDEX "CodeRepositoryFile_relativePath_idx" ON "CodeRepositoryFile"("relativePath");

-- CreateIndex
CREATE UNIQUE INDEX "CodeRepositoryFile_repositoryId_relativePath_key" ON "CodeRepositoryFile"("repositoryId", "relativePath");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowState_workflowRunId_key" ON "WorkflowState"("workflowRunId");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_type_key" ON "Agent"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_executionOrder_key" ON "Agent"("executionOrder");

-- CreateIndex
CREATE INDEX "AgentRun_workflowRunId_idx" ON "AgentRun"("workflowRunId");

-- CreateIndex
CREATE INDEX "AgentRun_agentId_idx" ON "AgentRun"("agentId");

-- CreateIndex
CREATE INDEX "AgentRun_status_idx" ON "AgentRun"("status");

-- CreateIndex
CREATE INDEX "TraceLog_workflowRunId_idx" ON "TraceLog"("workflowRunId");

-- CreateIndex
CREATE INDEX "TraceLog_agentRunId_idx" ON "TraceLog"("agentRunId");

-- CreateIndex
CREATE INDEX "TraceLog_level_idx" ON "TraceLog"("level");

-- CreateIndex
CREATE INDEX "RepoSearchResult_workflowRunId_idx" ON "RepoSearchResult"("workflowRunId");

-- CreateIndex
CREATE INDEX "RepoSearchResult_filePath_idx" ON "RepoSearchResult"("filePath");

-- CreateIndex
CREATE UNIQUE INDEX "MentorReview_workflowRunId_key" ON "MentorReview"("workflowRunId");

-- CreateIndex
CREATE INDEX "MentorReview_mentorId_idx" ON "MentorReview"("mentorId");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "CodeRepository"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeRepository" ADD CONSTRAINT "CodeRepository_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeRepositoryFile" ADD CONSTRAINT "CodeRepositoryFile_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "CodeRepository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowState" ADD CONSTRAINT "WorkflowState_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "WorkflowRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "WorkflowRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraceLog" ADD CONSTRAINT "TraceLog_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "WorkflowRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraceLog" ADD CONSTRAINT "TraceLog_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepoSearchResult" ADD CONSTRAINT "RepoSearchResult_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "WorkflowRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorReview" ADD CONSTRAINT "MentorReview_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "WorkflowRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorReview" ADD CONSTRAINT "MentorReview_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
