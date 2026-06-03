import { z } from "zod";

const roleSchema = z.enum(["DEVELOPER", "MENTOR", "ADMIN"]);
const publicRegistrationRoleSchema = z.enum(["DEVELOPER", "MENTOR"]);
const emailSchema = z.string().trim().toLowerCase().email();
const passwordSchema = z.string().min(8, "Password must contain at least 8 characters");

export const registerSchema = z.object({
  name: z.string().trim().min(2),
  email: emailSchema,
  password: passwordSchema,
  role: publicRegistrationRoleSchema.default("DEVELOPER")
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1)
});

export const googleAuthSchema = z.object({
  idToken: z.string().trim().min(1),
  role: publicRegistrationRoleSchema.optional()
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(1)
});

export const logoutSchema = z.object({
  refreshToken: z.string().trim().min(1).optional()
});

export const listRegistrationRequestsSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional()
});

export const rejectRegistrationRequestSchema = z.object({
  reason: z.string().trim().min(3).optional()
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2),
  email: emailSchema,
  password: passwordSchema.optional(),
  googleId: z.string().trim().min(1).optional(),
  avatarUrl: z.string().trim().url().optional(),
  role: roleSchema.default("DEVELOPER")
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    email: emailSchema.optional(),
    password: passwordSchema.optional(),
    googleId: z.string().trim().min(1).nullable().optional(),
    avatarUrl: z.string().trim().url().nullable().optional(),
    role: roleSchema.optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required"
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type ListRegistrationRequestsInput = z.infer<typeof listRegistrationRequestsSchema>;
export type RejectRegistrationRequestInput = z.infer<typeof rejectRegistrationRequestSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
