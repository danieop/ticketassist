import type { RequestHandler } from "express";
import { AppError } from "../middlewares/error-handler.js";
import { repositoryService } from "../services/repository.service.js";
import { uploadRepositorySchema } from "../validators/repository.validators.js";

function getParamId(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    throw new AppError(400, "Invalid repository id");
  }

  return value;
}

function getUploadedFiles(files: Express.Request["files"]) {
  if (!files) {
    return [];
  }

  if (Array.isArray(files)) {
    return files;
  }

  return Object.values(files).flat();
}

export const uploadRepository: RequestHandler = async (request, response, next) => {
  try {
    const payload = uploadRepositorySchema.parse(request.body);
    const repository = await repositoryService.upload(payload, getUploadedFiles(request.files));
    response.status(201).json(repository);
  } catch (error) {
    next(error);
  }
};

export const listRepositories: RequestHandler = async (_request, response, next) => {
  try {
    response.json(await repositoryService.list());
  } catch (error) {
    next(error);
  }
};

export const getRepository: RequestHandler = async (request, response, next) => {
  try {
    response.json(await repositoryService.getById(getParamId(request.params.id)));
  } catch (error) {
    next(error);
  }
};

export const getRepositoryFileContent: RequestHandler = async (request, response, next) => {
  try {
    if (typeof request.query.path !== "string") {
      throw new AppError(400, "File path is required");
    }

    response.json(
      await repositoryService.getFileContent(getParamId(request.params.id), request.query.path)
    );
  } catch (error) {
    next(error);
  }
};
