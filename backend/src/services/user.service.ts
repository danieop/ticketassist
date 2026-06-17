import bcrypt from "bcryptjs";
import { createHash, randomUUID } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import type { Prisma, User } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../middlewares/error-handler.js";
import { notificationService } from "./notification.service.js";
import type {
  CreateUserInput,
  GoogleAuthInput,
  LoginInput,
  ListRegistrationRequestsInput,
  LogoutInput,
  RefreshTokenInput,
  RejectRegistrationRequestInput,
  RegisterInput,
  UpdateUserInput
} from "../validators/user.validators.js";

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  googleId: true,
  avatarUrl: true,
  role: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.UserSelect;

const registrationRequestSelect = {
  id: true,
  name: true,
  email: true,
  googleId: true,
  avatarUrl: true,
  role: true,
  status: true,
  reviewedById: true,
  reviewedAt: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.RegistrationRequestSelect;

function toPublicUser(user: Pick<User, keyof typeof publicUserSelect>) {
  return user;
}

function registrationPendingResponse(
  request: Prisma.RegistrationRequestGetPayload<{ select: typeof registrationRequestSelect }>
) {
  return {
    status: "PENDING_APPROVAL",
    message: "Registration request is waiting for admin approval.",
    registrationRequest: request
  };
}

function signAccessToken(user: Pick<User, "id" | "email" | "role">) {
  return jwt.sign(
    {
      email: user.email,
      role: user.role,
      tokenType: "access"
    },
    env.JWT_SECRET,
    {
      subject: user.id,
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"]
    }
  );
}

function signRefreshToken(user: Pick<User, "id" | "email" | "role">, tokenId: string) {
  return jwt.sign(
    {
      email: user.email,
      role: user.role,
      tokenType: "refresh"
    },
    env.JWT_SECRET,
    {
      jwtid: tokenId,
      subject: user.id,
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"]
    }
  );
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function durationToMs(value: string) {
  const match = /^(\d+)([smhd])?$/.exec(value.trim());

  if (!match) {
    throw new AppError(500, "Invalid JWT refresh expiration format");
  }

  const amount = Number(match[1]);
  const unit = match[2] ?? "s";
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  } as const;

  return amount * multipliers[unit as keyof typeof multipliers];
}

async function issueTokenPair(user: Pick<User, keyof typeof publicUserSelect>) {
  const refreshTokenId = randomUUID();
  const refreshToken = signRefreshToken(user, refreshTokenId);
  const accessToken = signAccessToken(user);

  await prisma.refreshToken.create({
    data: {
      id: refreshTokenId,
      tokenHash: hashToken(refreshToken),
      userId: user.id,
      expiresAt: new Date(Date.now() + durationToMs(env.JWT_REFRESH_EXPIRES_IN))
    }
  });

  return {
    tokenType: "Bearer",
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    accessToken,
    refreshToken,
    token: accessToken
  };
}

async function authResponse(user: Pick<User, keyof typeof publicUserSelect>) {
  const tokens = await issueTokenPair(user);

  return {
    user: toPublicUser(user),
    ...tokens
  };
}

async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

async function ensureEmailAvailable(email: string, excludeUserId?: string) {
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing && existing.id !== excludeUserId) {
    throw new AppError(409, "Email is already in use");
  }
}

async function ensureGoogleIdAvailable(googleId: string, excludeUserId?: string) {
  const existing = await prisma.user.findUnique({ where: { googleId } });

  if (existing && existing.id !== excludeUserId) {
    throw new AppError(409, "Google account is already linked to another user");
  }
}

async function findUserOrThrow(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: publicUserSelect
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  return user;
}

function readRefreshPayload(refreshToken: string) {
  const payload = jwt.verify(refreshToken, env.JWT_SECRET);

  if (
    typeof payload !== "object" ||
    typeof payload.sub !== "string" ||
    typeof payload.jti !== "string" ||
    payload.tokenType !== "refresh"
  ) {
    throw new AppError(401, "Invalid refresh token");
  }

  return {
    tokenId: payload.jti,
    userId: payload.sub
  };
}

export const userService = {
  async register(input: RegisterInput) {
    await ensureEmailAvailable(input.email);

    const request = await prisma.registrationRequest.upsert({
      where: { email: input.email },
      update: {
        name: input.name,
        passwordHash: await hashPassword(input.password),
        role: input.role,
        status: "PENDING",
        rejectionReason: null,
        reviewedAt: null,
        reviewedById: null
      },
      create: {
        name: input.name,
        email: input.email,
        passwordHash: await hashPassword(input.password),
        role: input.role
      },
      select: registrationRequestSelect
    });

    return registrationPendingResponse(request);
  },

  async approveRegistrationRequest(id: string, adminId: string) {
    const request = await prisma.registrationRequest.findUnique({
      where: { id }
    });

    if (!request) {
      throw new AppError(404, "Registration request not found");
    }

    if (request.status !== "PENDING") {
      throw new AppError(400, "Registration request has already been reviewed");
    }

    await ensureEmailAvailable(request.email);

    if (request.googleId) {
      await ensureGoogleIdAvailable(request.googleId);
    }

    const [user, approvedRequest] = await prisma.$transaction([
      prisma.user.create({
        data: {
          name: request.name,
          email: request.email,
          passwordHash: request.passwordHash,
          googleId: request.googleId,
          avatarUrl: request.avatarUrl,
          role: request.role,
          lastLoginAt: null
        },
        select: publicUserSelect
      }),
      prisma.registrationRequest.update({
        where: { id },
        data: {
          status: "APPROVED",
          reviewedById: adminId,
          reviewedAt: new Date(),
          rejectionReason: null
        },
        select: registrationRequestSelect
      })
    ]);

    // Notify the newly created user
    try {
      await notificationService.create({
        userId: user.id,
        type: 'REGISTRATION_APPROVED',
        title: 'Registration approved',
        message: 'Your account has been approved. Welcome to TicketAssist!',
        metadata: { email: request.email, role: request.role }
      });
    } catch (err) {
      console.error('Failed to send registration notification:', err);
    }

    return {
      user: toPublicUser(user),
      registrationRequest: approvedRequest
    };
  },

  async rejectRegistrationRequest(id: string, adminId: string, input: RejectRegistrationRequestInput) {
    const request = await prisma.registrationRequest.findUnique({
      where: { id }
    });

    if (!request) {
      throw new AppError(404, "Registration request not found");
    }

    if (request.status !== "PENDING") {
      throw new AppError(400, "Registration request has already been reviewed");
    }

    return prisma.registrationRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        reviewedById: adminId,
        reviewedAt: new Date(),
        rejectionReason: input.reason ?? "Rejected by admin"
      },
      select: registrationRequestSelect
    });
  },

  async listPendingRegistrations(input: ListRegistrationRequestsInput) {
    return prisma.registrationRequest.findMany({
      where: input.status ? { status: input.status } : undefined,
      select: registrationRequestSelect,
      orderBy: { createdAt: "desc" }
    });
  },

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email }
    });

    if (!user?.passwordHash) {
      const pendingRequest = await prisma.registrationRequest.findUnique({
        where: { email: input.email },
        select: { status: true }
      });

      if (pendingRequest?.status === "PENDING") {
        throw new AppError(403, "Account is waiting for admin approval");
      }

      if (pendingRequest?.status === "REJECTED") {
        throw new AppError(403, "Registration request was rejected");
      }

      throw new AppError(401, "Invalid email or password");
    }

    const validPassword = await bcrypt.compare(input.password, user.passwordHash);

    if (!validPassword) {
      throw new AppError(401, "Invalid email or password");
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
      select: publicUserSelect
    });

    return authResponse(updatedUser);
  },

  async googleAuth(input: GoogleAuthInput) {
    if (!env.GOOGLE_CLIENT_ID) {
      throw new AppError(500, "GOOGLE_CLIENT_ID is not configured");
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: input.idToken,
      audience: env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email || payload.email_verified === false) {
      throw new AppError(401, "Invalid Google account token");
    }

    const normalizedEmail = payload.email.toLowerCase();
    const existingByGoogleId = await prisma.user.findUnique({
      where: { googleId: payload.sub }
    });
    const existingByEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingByGoogleId && existingByEmail && existingByGoogleId.id !== existingByEmail.id) {
      throw new AppError(409, "Google account is already linked to another user");
    }

    const existingUser = existingByGoogleId ?? existingByEmail;

    if (existingUser) {
      const user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          googleId: existingUser.googleId ?? payload.sub,
          email: normalizedEmail,
          name: payload.name ?? existingUser.name,
          avatarUrl: payload.picture ?? existingUser.avatarUrl,
          lastLoginAt: new Date()
        },
        select: publicUserSelect
      });

      return authResponse(user);
    }

    if (!input.role) {
      throw new AppError(400, "Role is required for a new Google registration");
    }

    const request = await prisma.registrationRequest.upsert({
      where: { email: normalizedEmail },
      update: {
        name: payload.name ?? normalizedEmail,
        googleId: payload.sub,
        avatarUrl: payload.picture,
        role: input.role,
        status: "PENDING",
        rejectionReason: null,
        reviewedAt: null,
        reviewedById: null
      },
      create: {
        name: payload.name ?? normalizedEmail,
        email: normalizedEmail,
        googleId: payload.sub,
        avatarUrl: payload.picture,
        role: input.role
      },
      select: registrationRequestSelect
    });

    return registrationPendingResponse(request);
  },

  async refresh(input: RefreshTokenInput) {
    let refreshPayload: ReturnType<typeof readRefreshPayload>;

    try {
      refreshPayload = readRefreshPayload(input.refreshToken);
    } catch {
      throw new AppError(401, "Invalid refresh token");
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { id: refreshPayload.tokenId },
      include: { user: true }
    });

    if (
      !storedToken ||
      storedToken.userId !== refreshPayload.userId ||
      storedToken.revokedAt ||
      storedToken.expiresAt <= new Date() ||
      storedToken.tokenHash !== hashToken(input.refreshToken)
    ) {
      throw new AppError(401, "Invalid refresh token");
    }

    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() }
    });

    const user = await prisma.user.update({
      where: { id: storedToken.userId },
      data: { lastLoginAt: new Date() },
      select: publicUserSelect
    });

    return authResponse(user);
  },

  async logout(input: LogoutInput) {
    if (!input.refreshToken) {
      return { success: true };
    }

    try {
      const refreshPayload = readRefreshPayload(input.refreshToken);
      await prisma.refreshToken.updateMany({
        where: {
          id: refreshPayload.tokenId,
          tokenHash: hashToken(input.refreshToken),
          revokedAt: null
        },
        data: { revokedAt: new Date() }
      });
    } catch {
      return { success: true };
    }

    return { success: true };
  },

  async list() {
    return prisma.user.findMany({
      select: publicUserSelect,
      orderBy: { createdAt: "desc" }
    });
  },

  async getById(id: string) {
    return findUserOrThrow(id);
  },

  async create(input: CreateUserInput) {
    await ensureEmailAvailable(input.email);

    if (input.googleId) {
      await ensureGoogleIdAvailable(input.googleId);
    }

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        role: input.role,
        passwordHash: input.password ? await hashPassword(input.password) : undefined,
        googleId: input.googleId,
        avatarUrl: input.avatarUrl
      },
      select: publicUserSelect
    });

    return toPublicUser(user);
  },

  async update(id: string, input: UpdateUserInput) {
    await findUserOrThrow(id);

    if (input.email) {
      await ensureEmailAvailable(input.email, id);
    }

    if (input.googleId) {
      await ensureGoogleIdAvailable(input.googleId, id);
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        name: input.name,
        email: input.email,
        role: input.role,
        passwordHash: input.password ? await hashPassword(input.password) : undefined,
        googleId: input.googleId,
        avatarUrl: input.avatarUrl
      },
      select: publicUserSelect
    });

    return toPublicUser(user);
  },

  async delete(id: string) {
    await findUserOrThrow(id);
    await prisma.user.delete({ where: { id } });

    return { id };
  }
};
