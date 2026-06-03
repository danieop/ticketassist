import { Router } from "express";
import {
  approveRegistrationRequest,
  createUser,
  deleteUser,
  getUser,
  listRegistrationRequests,
  listUsers,
  rejectRegistrationRequest,
  updateUser
} from "../controllers/user.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";

export const userRouter = Router();

userRouter.use(requireAuth, requireRole("ADMIN"));

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags:
 *       - Users
 *     summary: List users
 *     responses:
 *       200:
 *         description: Users
 */
userRouter.get("/", listUsers);

/**
 * @openapi
 * /api/users:
 *   post:
 *     tags:
 *       - Users
 *     summary: Create a user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserRequest'
 *     responses:
 *       201:
 *         description: Created user
 */
userRouter.post("/", createUser);

userRouter.get("/registration-requests", listRegistrationRequests);
userRouter.post("/registration-requests/:id/approve", approveRegistrationRequest);
userRouter.post("/registration-requests/:id/reject", rejectRegistrationRequest);

userRouter.get("/:id", getUser);
userRouter.patch("/:id", updateUser);
userRouter.delete("/:id", deleteUser);
