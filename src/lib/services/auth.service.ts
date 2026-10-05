import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { generateRandomToken, hashToken } from "@/lib/auth/tokens";
import { createSessionToken, setSessionCookie, clearSessionCookie } from "@/lib/auth/session";
import { recordAuditLog } from "@/lib/services/audit.service";
import { AppError } from "@/lib/utils/api-response";
import {
  SignupInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from "@/lib/validators/auth";
import { UserRole } from "@prisma/client";

export interface SafeUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  clinicId: string | null;
  patientProfile?: {
    id: string;
    gender: string | null;
    dateOfBirth: Date | null;
    bloodGroup: string | null;
  } | null;
  doctor?: {
    id: string;
    specialization: string;
    qualification: string;
    consultationFee: number;
    advanceBookingFee: number;
  } | null;
}

export interface ClientContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Registers a new patient with an attached PatientProfile and logs audit.
 */
export async function registerPatient(
  input: SignupInput,
  ctx?: ClientContext
): Promise<{ user: SafeUser; token: string }> {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  if (existingUser) {
    throw new AppError("An account with this email already exists.", 409, "EMAIL_EXISTS");
  }

  const hashedPassword = await hashPassword(input.password);

  // Look up default clinic if one exists
  const defaultClinic = await prisma.clinic.findFirst({
    where: { isActive: true },
    select: { id: true },
  });

  const parsedDob = input.dateOfBirth ? new Date(input.dateOfBirth) : null;

  const newUser = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      fullName: input.fullName.trim(),
      phone: input.phone || null,
      passwordHash: hashedPassword,
      role: "PATIENT",
      clinicId: defaultClinic?.id || null,
      patientProfile: {
        create: {
          gender: input.gender || null,
          dateOfBirth: parsedDob,
        },
      },
    },
    include: {
      patientProfile: true,
    },
  });

  // Record audit log
  await recordAuditLog({
    userId: newUser.id,
    clinicId: newUser.clinicId,
    action: "PATIENT_SIGNUP",
    entity: "User",
    entityId: newUser.id,
    metadata: { email: newUser.email },
    ipAddress: ctx?.ipAddress,
    userAgent: ctx?.userAgent,
  });

  // Generate session token
  const token = await createSessionToken({
    userId: newUser.id,
    email: newUser.email,
    fullName: newUser.fullName,
    role: newUser.role,
    clinicId: newUser.clinicId,
  });

  // Set HTTP-only cookie
  await setSessionCookie(token);

  const safeUser: SafeUser = {
    id: newUser.id,
    email: newUser.email,
    fullName: newUser.fullName,
    phone: newUser.phone,
    role: newUser.role,
    isActive: newUser.isActive,
    clinicId: newUser.clinicId,
    patientProfile: newUser.patientProfile
      ? {
          id: newUser.patientProfile.id,
          gender: newUser.patientProfile.gender,
          dateOfBirth: newUser.patientProfile.dateOfBirth,
          bloodGroup: newUser.patientProfile.bloodGroup,
        }
      : null,
  };

  return { user: safeUser, token };
}

/**
 * Authenticates user credentials (all roles), updates last login, and sets session cookie.
 */
export async function authenticateUser(
  input: LoginInput,
  ctx?: ClientContext
): Promise<{ user: SafeUser; token: string }> {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
    include: {
      patientProfile: true,
      doctor: true,
    },
  });

  if (!user) {
    throw new AppError("Invalid email or password.", 401, "INVALID_CREDENTIALS");
  }

  if (!user.isActive) {
    throw new AppError("Your account has been deactivated. Please contact support.", 403, "ACCOUNT_INACTIVE");
  }

  const isValidPassword = await verifyPassword(input.password, user.passwordHash);
  if (!isValidPassword) {
    throw new AppError("Invalid email or password.", 401, "INVALID_CREDENTIALS");
  }

  // Update last login timestamp
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Record audit log
  await recordAuditLog({
    userId: user.id,
    clinicId: user.clinicId,
    action: "USER_LOGIN",
    entity: "User",
    entityId: user.id,
    metadata: { role: user.role },
    ipAddress: ctx?.ipAddress,
    userAgent: ctx?.userAgent,
  });

  // Generate session token
  const token = await createSessionToken({
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    clinicId: user.clinicId,
  });

  await setSessionCookie(token);

  const safeUser: SafeUser = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    clinicId: user.clinicId,
    patientProfile: user.patientProfile
      ? {
          id: user.patientProfile.id,
          gender: user.patientProfile.gender,
          dateOfBirth: user.patientProfile.dateOfBirth,
          bloodGroup: user.patientProfile.bloodGroup,
        }
      : null,
    doctor: user.doctor
      ? {
          id: user.doctor.id,
          specialization: user.doctor.specialization,
          qualification: user.doctor.qualification,
          consultationFee: Number(user.doctor.consultationFee),
          advanceBookingFee: Number(user.doctor.advanceBookingFee),
        }
      : null,
  };

  return { user: safeUser, token };
}

/**
 * Initiates secure password reset by creating a hashed token with 1-hour expiration.
 */
export async function requestPasswordReset(
  input: ForgotPasswordInput,
  ctx?: ClientContext
): Promise<{ message: string; debugToken?: string }> {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  // To prevent user enumeration, always return success even if email not found
  if (!user || !user.isActive) {
    return {
      message: "If an active account exists with this email, password reset instructions have been sent.",
    };
  }

  const rawToken = generateRandomToken();
  const hashed = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetPasswordToken: hashed,
      resetPasswordExpires: expiresAt,
    },
  });

  await recordAuditLog({
    userId: user.id,
    clinicId: user.clinicId,
    action: "PASSWORD_RESET_REQUESTED",
    entity: "User",
    entityId: user.id,
    ipAddress: ctx?.ipAddress,
    userAgent: ctx?.userAgent,
  });

  return {
    message: "If an active account exists with this email, password reset instructions have been sent.",
    // In local development / non-production, return debugToken to allow verification testing without email gateway
    debugToken: process.env.NODE_ENV !== "production" ? rawToken : undefined,
  };
}

/**
 * Resets user password using the provided reset token.
 */
export async function resetPassword(
  input: ResetPasswordInput,
  ctx?: ClientContext
): Promise<{ message: string }> {
  const hashed = hashToken(input.token);

  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: hashed,
      resetPasswordExpires: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    throw new AppError("Invalid or expired password reset link.", 400, "INVALID_TOKEN");
  }

  const newHashedPassword = await hashPassword(input.newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newHashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    },
  });

  await recordAuditLog({
    userId: user.id,
    clinicId: user.clinicId,
    action: "PASSWORD_RESET_COMPLETED",
    entity: "User",
    entityId: user.id,
    ipAddress: ctx?.ipAddress,
    userAgent: ctx?.userAgent,
  });

  return {
    message: "Password has been reset successfully. You can now log in.",
  };
}

/**
 * Logs out the user by clearing the session cookie and recording audit log.
 */
export async function logoutUser(userId?: string, ctx?: ClientContext): Promise<void> {
  if (userId) {
    await recordAuditLog({
      userId,
      action: "USER_LOGOUT",
      entity: "User",
      entityId: userId,
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
    });
  }
  await clearSessionCookie();
}

/**
 * Retrieves the full profile of a user by id.
 */
export async function getUserProfile(userId: string): Promise<SafeUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      patientProfile: true,
      doctor: true,
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    clinicId: user.clinicId,
    patientProfile: user.patientProfile
      ? {
          id: user.patientProfile.id,
          gender: user.patientProfile.gender,
          dateOfBirth: user.patientProfile.dateOfBirth,
          bloodGroup: user.patientProfile.bloodGroup,
        }
      : null,
    doctor: user.doctor
      ? {
          id: user.doctor.id,
          specialization: user.doctor.specialization,
          qualification: user.doctor.qualification,
          consultationFee: Number(user.doctor.consultationFee),
          advanceBookingFee: Number(user.doctor.advanceBookingFee),
        }
      : null,
  };
}
