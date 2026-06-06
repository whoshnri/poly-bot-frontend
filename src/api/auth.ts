import { apiRequest } from "./client";

export type AuthUser = {
  userId: string;
  createdAt: string;
};

export async function loginRequest(input: { userId: string; password: string }) {
  return apiRequest<{ userId: string; createdAt: string }>("/api/auth/login", {
    method: "POST",
    body: input,
  });
}

export async function registerRequest(input: { userId: string; password: string }) {
  return apiRequest<{ userId: string; createdAt: string }>("/api/auth/register", {
    method: "POST",
    body: input,
  });
}

export async function logoutRequest() {
  return apiRequest<Record<string, never>>("/api/auth/logout", { method: "POST" });
}

export async function getCurrentUserRequest() {
  return apiRequest<AuthUser>("/api/auth/me");
}
