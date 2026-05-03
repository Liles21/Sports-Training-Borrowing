import { normalizeNameFromMetadata, normalizeRole, signToken } from "@/lib/server/auth";
import { jsonError } from "@/lib/server/responses";
import { getSupabaseAnonClient, getSupabaseServiceClient } from "@/lib/server/supabase";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as LoginBody;
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !password) {
    return jsonError("Email and password are required.");
  }

  const supabase = getSupabaseAnonClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  const authUser = data.user;
  if (error || !authUser) {
    const message =
      error?.message && error.message.trim().length > 0
        ? error.message
        : "Invalid credentials.";

    return jsonError(message, 401);
  }

  const supabaseAdmin = getSupabaseServiceClient();
  const profileResponse = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();

  const profile = profileResponse.error ? null : profileResponse.data;
  const role = normalizeRole(
    profile?.role ?? authUser.user_metadata?.role ?? authUser.app_metadata?.role,
  );
  const name = normalizeNameFromMetadata(profile ?? authUser.user_metadata, email);
  const createdAt = authUser.created_at ?? new Date().toISOString();

  const user = {
    id: authUser.id,
    email,
    name,
    role,
    createdAt,
  };

  const token = await signToken(user);

  return Response.json(
    { success: true, data: { user, token } },
    {
      status: 200,
      headers: {
        "Set-Cookie": `gym_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200`,
      },
    },
  );
}
