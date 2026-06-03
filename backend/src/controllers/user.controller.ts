import type { RequestHandler } from "express";
import { AppError } from "../middlewares/error-handler.js";
import { userService } from "../services/user.service.js";
import {
  createUserSchema,
  googleAuthSchema,
  listRegistrationRequestsSchema,
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  rejectRegistrationRequestSchema,
  registerSchema,
  updateUserSchema
} from "../validators/user.validators.js";

function getParamId(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    throw new AppError(400, "Invalid user id");
  }

  return value;
}

export const registerUser: RequestHandler = async (request, response, next) => {
  try {
    const payload = registerSchema.parse(request.body);
    response.status(201).json(await userService.register(payload));
  } catch (error) {
    next(error);
  }
};

export const loginUser: RequestHandler = async (request, response, next) => {
  try {
    const payload = loginSchema.parse(request.body);
    response.json(await userService.login(payload));
  } catch (error) {
    next(error);
  }
};

export const loginWithGoogle: RequestHandler = async (request, response, next) => {
  try {
    const payload = googleAuthSchema.parse(request.body);
    response.json(await userService.googleAuth(payload));
  } catch (error) {
    next(error);
  }
};

export const refreshUserToken: RequestHandler = async (request, response, next) => {
  try {
    const payload = refreshTokenSchema.parse(request.body);
    response.json(await userService.refresh(payload));
  } catch (error) {
    next(error);
  }
};

export const logoutUser: RequestHandler = async (request, response, next) => {
  try {
    const payload = logoutSchema.parse(request.body ?? {});
    response.json(await userService.logout(payload));
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser: RequestHandler = async (request, response, next) => {
  try {
    if (!request.user) {
      throw new AppError(401, "Missing authorization token");
    }

    response.json(await userService.getById(request.user.id));
  } catch (error) {
    next(error);
  }
};

export const listRegistrationRequests: RequestHandler = async (request, response, next) => {
  try {
    const payload = listRegistrationRequestsSchema.parse(request.query);
    response.json(await userService.listPendingRegistrations(payload));
  } catch (error) {
    next(error);
  }
};

export const approveRegistrationRequest: RequestHandler = async (request, response, next) => {
  try {
    if (!request.user) {
      throw new AppError(401, "Missing authorization token");
    }

    response.json(
      await userService.approveRegistrationRequest(getParamId(request.params.id), request.user.id)
    );
  } catch (error) {
    next(error);
  }
};

export const rejectRegistrationRequest: RequestHandler = async (request, response, next) => {
  try {
    if (!request.user) {
      throw new AppError(401, "Missing authorization token");
    }

    const payload = rejectRegistrationRequestSchema.parse(request.body);
    response.json(
      await userService.rejectRegistrationRequest(
        getParamId(request.params.id),
        request.user.id,
        payload
      )
    );
  } catch (error) {
    next(error);
  }
};

export const listUsers: RequestHandler = async (_request, response, next) => {
  try {
    response.json(await userService.list());
  } catch (error) {
    next(error);
  }
};

export const getUser: RequestHandler = async (request, response, next) => {
  try {
    response.json(await userService.getById(getParamId(request.params.id)));
  } catch (error) {
    next(error);
  }
};

export const createUser: RequestHandler = async (request, response, next) => {
  try {
    const payload = createUserSchema.parse(request.body);
    response.status(201).json(await userService.create(payload));
  } catch (error) {
    next(error);
  }
};

export const updateUser: RequestHandler = async (request, response, next) => {
  try {
    const payload = updateUserSchema.parse(request.body);
    response.json(await userService.update(getParamId(request.params.id), payload));
  } catch (error) {
    next(error);
  }
};

export const deleteUser: RequestHandler = async (request, response, next) => {
  try {
    response.json(await userService.delete(getParamId(request.params.id)));
  } catch (error) {
    next(error);
  }
};
