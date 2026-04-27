import { jwtVerify, SignJWT } from "jose";

import type { PublicUser, User, UserRole } from "@/lib/types";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "gym-equipment-jwt-secret",
);

export type AuthPayload = {
  sub: string;
  email: string;
  role: UserRole;
  name: string;
  createdAt: string;
};

export type AuthTokenUser = {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  createdAt: string;
};

export function normalizeRole(value: unknown): UserRole {
  if (typeof value !== "string") {
    return "borrower";
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "admin" ? "admin" : "borrower";
}

export function normalizeNameFromMetadata(metadata: unknown, fallbackEmail: string): string {
  if (!metadata || typeof metadata !== "object") {
    return fallbackEmail;
  }

  const source = metadata as Record<string, unknown>;
  const candidates = [source.full_name, source.fullname, source.name];
  const firstString = candidates.find(
    (candidate) => typeof candidate === "string" && candidate.trim().length > 0,
  );

  return typeof firstString === "string" ? firstString.trim() : fallbackEmail;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export async function signToken(user: AuthTokenUser): Promise<string> {
  return new SignJWT({
    email: user.email,
    role: user.role,
    name: user.name,
    createdAt: user.createdAt,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<AuthPayload> {
  const verified = await jwtVerify(token, secret);

  const payload = verified.payload;
  return {
    sub: payload.sub ?? "",
    email: String(payload.email ?? ""),
    role: normalizeRole(payload.role),
    name: String(payload.name ?? ""),
    createdAt: String(payload.createdAt ?? ""),
  };
}

export function getTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length);
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = cookieHeader.split(";").map((entry) => entry.trim());
  const tokenCookie = cookies.find((entry) => entry.startsWith("gym_token="));

  return tokenCookie ? decodeURIComponent(tokenCookie.split("=")[1]) : null;
}
