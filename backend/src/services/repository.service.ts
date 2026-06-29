import { createHash } from "node:crypto";
import { readFile, mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CodeRepository, CodeRepositoryFile } from "@prisma/client";
import SftpClient from "ssh2-sftp-client";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../middlewares/error-handler.js";
import type { UploadRepositoryInput } from "../validators/repository.validators.js";

type UploadedFile = Express.Multer.File;

const skippedLocalCodebaseDirectories = new Set([
  ".git",
  ".gradle",
  ".idea",
  ".next",
  "build",
  "dist",
  "node_modules",
  "target"
]);

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

  const ipShareWithColon = /^((?:\d{1,3}\.){3}\d{1,3}):[\\/](.+)$/.exec(configured);

  if (ipShareWithColon) {
    return `\\\\${ipShareWithColon[1]}\\${ipShareWithColon[2].replace(/[\\/]+/g, "\\")}`;
  }

  if (/^(?:\d{1,3}\.){3}\d{1,3}[\\/]/.test(configured)) {
    return `\\\\${configured.replace(/[\\/]+/g, "\\")}`;
  }

  return path.resolve(configured);
}

function getSftpConfig() {
  if (!env.SFTP_HOST || !env.SFTP_USERNAME || !env.SFTP_PASSWORD) {
    throw new AppError(500, "SFTP storage is not configured");
  }

  return {
    host: env.SFTP_HOST,
    port: env.SFTP_PORT,
    username: env.SFTP_USERNAME,
    password: env.SFTP_PASSWORD,
    readyTimeout: 100000
  };
}

function getRemoteStorageRoot() {
  const configured = stripQuotes(env.NETWORK_FILE_STORAGE).replace(/\\/g, "/");
  const normalized = path.posix.normalize(configured);

  if (!normalized.startsWith("/") || normalized.includes("\0")) {
    throw new AppError(500, "NETWORK_FILE_STORAGE must be an absolute remote path for SFTP storage");
  }

  return normalized;
}

function getRepositoryRoot(repositoryId: string) {
  if (env.STORAGE_DRIVER === "sftp") {
    return path.posix.join(getRemoteStorageRoot(), "repositories", repositoryId);
  }

  return path.join(getStorageRoot(), "repositories", repositoryId);
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

async function collectLocalCodebaseFiles(root: string) {
  const rootPath = path.resolve(root);
  const rootStats = await stat(rootPath).catch(() => null);

  if (!rootStats?.isDirectory()) {
    throw new AppError(500, `Default codebase path is not a directory: ${rootPath}`);
  }

  const files: {
    relativePath: string;
    storagePath: string;
    sizeBytes: bigint;
    checksumSha256: string;
    mimeType: string | null;
  }[] = [];

  async function walk(directory: string) {
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && skippedLocalCodebaseDirectories.has(entry.name)) {
        continue;
      }

      const absolutePath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const buffer = await readFile(absolutePath);
      const relativePath = path.relative(rootPath, absolutePath).replace(/\\/g, "/");

      files.push({
        relativePath,
        storagePath: absolutePath,
        sizeBytes: BigInt(buffer.length),
        checksumSha256: checksumSha256(buffer),
        mimeType: null
      });
    }
  }

  await walk(rootPath);

  return {
    rootPath,
    files
  };
}

function isLikelyBinary(buffer: Buffer) {
  const sampleSize = Math.min(buffer.length, 8000);

  for (let index = 0; index < sampleSize; index += 1) {
    if (buffer[index] === 0) {
      return true;
    }
  }

  return false;
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
  if (env.STORAGE_DRIVER === "sftp") {
    return writeUploadedFilesToSftp(repositoryRoot, files);
  }

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

async function writeUploadedFilesToSftp(repositoryRoot: string, files: UploadedFile[]) {
  const seenPaths = new Set<string>();
  const root = path.posix.normalize(repositoryRoot);
  const sftp = new SftpClient("ticketassist-repository-upload");

  await sftp.connect(getSftpConfig());

  try {
    await sftp.mkdir(root, true);

    const metadata = [];

    for (const file of files) {
      const relativePath = normalizeRelativePath(file.originalname);

      if (seenPaths.has(relativePath)) {
        throw new AppError(400, `Duplicate repository file path: ${relativePath}`);
      }

      seenPaths.add(relativePath);

      const storagePath = path.posix.normalize(path.posix.join(root, ...relativePath.split("/")));

      if (storagePath !== root && !storagePath.startsWith(`${root}/`)) {
        throw new AppError(400, `Unsafe repository path: ${relativePath}`);
      }

      await sftp.mkdir(path.posix.dirname(storagePath), true);
      await sftp.put(file.buffer, storagePath);

      metadata.push({
        relativePath,
        storagePath,
        sizeBytes: BigInt(file.size),
        checksumSha256: checksumSha256(file.buffer),
        mimeType: file.mimetype || null
      });
    }

    return metadata;
  } finally {
    await sftp.end();
  }
}

async function readStoredFile(storagePath: string) {
  const isLocalWindowsPath = path.win32.isAbsolute(storagePath) || /^\\\\/.test(storagePath);

  if (env.STORAGE_DRIVER !== "sftp" || isLocalWindowsPath) {
    return readFile(storagePath);
  }

  const sftp = new SftpClient("ticketassist-repository-read");
  await sftp.connect(getSftpConfig());

  try {
    const content = await sftp.get(storagePath);
    return Buffer.isBuffer(content) ? content : Buffer.from(content);
  } finally {
    await sftp.end();
  }
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
  async ensureDefaultCodebaseRepository() {
    const defaultRootPath = path.resolve(env.DEFAULT_CODEBASE_PATH);
    const existingRepository = await prisma.codeRepository.findFirst({
      where: { rootPath: defaultRootPath }
    });

    if (existingRepository?.status === "READY" && existingRepository.fileCount > 0) {
      return toRepositoryResponse(await findRepositoryOrThrow(existingRepository.id));
    }

    const localCodebase = await collectLocalCodebaseFiles(defaultRootPath);
    const repositoryName = path.basename(localCodebase.rootPath) || "Default codebase";
    const totalBytes = localCodebase.files.reduce((sum, file) => sum + file.sizeBytes, 0n);

    const repository =
      existingRepository ??
      (await prisma.codeRepository.create({
        data: {
          name: repositoryName,
          description: "Local default codebase for ticket routing.",
          rootPath: localCodebase.rootPath,
          status: "READY"
        }
      }));

    await prisma.$transaction([
      prisma.codeRepositoryFile.deleteMany({
        where: { repositoryId: repository.id }
      }),
      ...(localCodebase.files.length > 0
        ? [
            prisma.codeRepositoryFile.createMany({
              data: localCodebase.files.map((file) => ({
                repositoryId: repository.id,
                ...file
              }))
            })
          ]
        : []),
      prisma.codeRepository.update({
        where: { id: repository.id },
        data: {
          name: repositoryName,
          description: "Local default codebase for ticket routing.",
          rootPath: localCodebase.rootPath,
          status: "READY",
          fileCount: localCodebase.files.length,
          totalBytes,
          errorMessage: null
        }
      })
    ]);

    return toRepositoryResponse(await findRepositoryOrThrow(repository.id));
  },

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

    const repositoryRoot = getRepositoryRoot(repository.id);

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
      const errorMessage = error instanceof Error ? error.message : "Repository upload failed";

      await prisma.codeRepository.update({
        where: { id: repository.id },
        data: {
          rootPath: repositoryRoot,
          status: "FAILED",
          errorMessage
        }
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(500, "Repository upload failed", {
        storagePath: repositoryRoot,
        error: errorMessage
      });
    }

    return toRepositoryResponse(await findRepositoryOrThrow(repository.id));
  },

  async list() {
    await this.ensureDefaultCodebaseRepository();

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
  },

  async getFileContent(id: string, relativePath: string) {
    const normalizedPath = normalizeRelativePath(relativePath);
    const file = await prisma.codeRepositoryFile.findUnique({
      where: {
        repositoryId_relativePath: {
          repositoryId: id,
          relativePath: normalizedPath
        }
      },
      include: {
        repository: true
      }
    });

    if (!file) {
      throw new AppError(404, "Repository file not found");
    }

    if (file.repository.status !== "READY") {
      throw new AppError(400, "Repository is not ready");
    }

    const buffer = await readStoredFile(file.storagePath);
    const binary = isLikelyBinary(buffer);

    return {
      repositoryId: id,
      relativePath: file.relativePath,
      sizeBytes: file.sizeBytes.toString(),
      checksumSha256: file.checksumSha256,
      mimeType: file.mimeType,
      encoding: binary ? "base64" : "utf8",
      content: binary ? buffer.toString("base64") : buffer.toString("utf8")
    };
  }
};
