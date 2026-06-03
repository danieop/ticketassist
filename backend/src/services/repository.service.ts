import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CodeRepository, CodeRepositoryFile } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../middlewares/error-handler.js";
import type { UploadRepositoryInput } from "../validators/repository.validators.js";

type UploadedFile = Express.Multer.File;

const repositoryInclude = {
  files: {
    orderBy: {
      relativePath: "asc"
    }
  },
  uploadedBy: true
} as const;

function stripQuotes(value: string) {
  return value.trim().replace(/^["']|["']$/g, "");
}

function getStorageRoot() {
  const configured = stripQuotes(env.NETWORK_FILE_STORAGE);

  if (/^https?:\/\//i.test(configured)) {
    throw new AppError(
      500,
      "NETWORK_FILE_STORAGE must be a writable filesystem path, UNC share, or file:// URL"
    );
  }

  if (/^file:\/\//i.test(configured)) {
    return fileURLToPath(configured);
  }

  if (/^\\\\/.test(configured)) {
    return configured;
  }

  if (/^\/\//.test(configured)) {
    return configured.replace(/\//g, "\\");
  }

  if (/^(?:\d{1,3}\.){3}\d{1,3}[\\/]/.test(configured)) {
    return `\\\\${configured.replace(/[\\/]+/g, "\\")}`;
  }

  return path.resolve(configured);
}

function normalizeRelativePath(originalName: string) {
  const parts = originalName
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .split("/")
    .filter((part) => part.length > 0 && part !== ".");

  if (parts.length === 0) {
    throw new AppError(400, "Uploaded file is missing a filename");
  }

  for (const part of parts) {
    if (part === ".." || part.includes("\0") || /^[A-Za-z]:$/.test(part)) {
      throw new AppError(400, `Unsafe repository path: ${originalName}`);
    }
  }

  return parts.join("/");
}

function checksumSha256(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function toRepositoryResponse(
  repository: CodeRepository & {
    files?: CodeRepositoryFile[];
    uploadedBy?: { id: string; name: string; email: string; role: string } | null;
  }
) {
  return {
    ...repository,
    totalBytes: repository.totalBytes.toString(),
    files: repository.files?.map((file) => ({
      ...file,
      sizeBytes: file.sizeBytes.toString()
    }))
  };
}

async function writeUploadedFiles(repositoryRoot: string, files: UploadedFile[]) {
  const seenPaths = new Set<string>();
  const root = path.resolve(repositoryRoot);

  await mkdir(root, { recursive: true });

  const metadata = [];

  for (const file of files) {
    const relativePath = normalizeRelativePath(file.originalname);

    if (seenPaths.has(relativePath)) {
      throw new AppError(400, `Duplicate repository file path: ${relativePath}`);
    }

    seenPaths.add(relativePath);

    const storagePath = path.resolve(root, ...relativePath.split("/"));

    if (storagePath !== root && !storagePath.startsWith(`${root}${path.sep}`)) {
      throw new AppError(400, `Unsafe repository path: ${relativePath}`);
    }

    await mkdir(path.dirname(storagePath), { recursive: true });
    await writeFile(storagePath, file.buffer);

    metadata.push({
      relativePath,
      storagePath,
      sizeBytes: BigInt(file.size),
      checksumSha256: checksumSha256(file.buffer),
      mimeType: file.mimetype || null
    });
  }

  return metadata;
}

async function findRepositoryOrThrow(id: string) {
  const repository = await prisma.codeRepository.findUnique({
    where: { id },
    include: repositoryInclude
  });

  if (!repository) {
    throw new AppError(404, "Repository not found");
  }

  return repository;
}

export const repositoryService = {
  async upload(input: UploadRepositoryInput, files: UploadedFile[]) {
    if (files.length === 0) {
      throw new AppError(400, "At least one repository file is required");
    }

    if (input.uploadedById) {
      const user = await prisma.user.findUnique({ where: { id: input.uploadedById } });

      if (!user) {
        throw new AppError(404, "Uploader not found");
      }
    }

    const repository = await prisma.codeRepository.create({
      data: {
        name: input.name,
        description: input.description,
        rootPath: "",
        uploadedById: input.uploadedById
      }
    });

    const repositoryRoot = path.join(getStorageRoot(), "repositories", repository.id);

    try {
      const fileMetadata = await writeUploadedFiles(repositoryRoot, files);
      const totalBytes = fileMetadata.reduce((sum, file) => sum + file.sizeBytes, 0n);

      await prisma.$transaction([
        prisma.codeRepositoryFile.createMany({
          data: fileMetadata.map((file) => ({
            repositoryId: repository.id,
            ...file
          }))
        }),
        prisma.codeRepository.update({
          where: { id: repository.id },
          data: {
            rootPath: repositoryRoot,
            status: "READY",
            fileCount: fileMetadata.length,
            totalBytes
          }
        })
      ]);
    } catch (error) {
      await prisma.codeRepository.update({
        where: { id: repository.id },
        data: {
          rootPath: repositoryRoot,
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message : "Repository upload failed"
        }
      });

      throw error;
    }

    return toRepositoryResponse(await findRepositoryOrThrow(repository.id));
  },

  async list() {
    const repositories = await prisma.codeRepository.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        uploadedBy: true
      }
    });

    return repositories.map((repository) => toRepositoryResponse(repository));
  },

  async getById(id: string) {
    return toRepositoryResponse(await findRepositoryOrThrow(id));
  }
};
