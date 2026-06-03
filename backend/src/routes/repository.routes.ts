import { Router } from "express";
import multer from "multer";
import { env } from "../config/env.js";
import {
  getRepositoryFileContent,
  getRepository,
  listRepositories,
  uploadRepository
} from "../controllers/repository.controller.js";

export const repositoryRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  preservePath: true,
  limits: {
    files: env.REPOSITORY_UPLOAD_MAX_FILES,
    fileSize: env.REPOSITORY_UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024
  }
});

/**
 * @openapi
 * /api/repositories:
 *   get:
 *     tags:
 *       - Repositories
 *     summary: List uploaded code repositories
 *     responses:
 *       200:
 *         description: Uploaded repositories
 */
repositoryRouter.get("/", listRepositories);

/**
 * @openapi
 * /api/repositories/{id}/files/content:
 *   get:
 *     tags:
 *       - Repositories
 *     summary: Read an uploaded repository file
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File content
 *       404:
 *         description: Repository file not found
 */
repositoryRouter.get("/:id/files/content", getRepositoryFileContent);

/**
 * @openapi
 * /api/repositories/{id}:
 *   get:
 *     tags:
 *       - Repositories
 *     summary: Get an uploaded repository and file manifest
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Repository details
 *       404:
 *         description: Repository not found
 */
repositoryRouter.get("/:id", getRepository);

/**
 * @openapi
 * /api/repositories/upload:
 *   post:
 *     tags:
 *       - Repositories
 *     summary: Upload a code repository folder to network file storage
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/UploadRepositoryRequest'
 *     responses:
 *       201:
 *         description: Repository uploaded and indexed
 *       400:
 *         description: Invalid upload
 */
repositoryRouter.post("/upload", upload.array("files"), uploadRepository);
