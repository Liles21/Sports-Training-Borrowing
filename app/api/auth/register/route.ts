import { normalizeRole, signToken } from "@/lib/server/auth";
import { jsonError } from "@/lib/server/responses";
import { getSupabaseServiceClient } from "@/lib/server/supabase";

type RegisterBody = {
  name?: string;
  email?: string;
  password?: string;
};

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as RegisterBody;
  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const role = "borrower";
  if (!name || !email || !password) {
    return jsonError("Name, email, and password are required.");
  }

  if (!email.includes("@")) {
    return jsonError("Please enter a valid email address.");
  }

  if (password.length < 6) {
    return jsonError("Password must be at least 6 characters.");
  }

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      fullname: name,
      role,
    },
  });

  if (error || !data.user) {
    if (error?.code === "email_exists") {
      return jsonError("Email is already in use.", 409);
    }

    return jsonError(error?.message ?? "Unable to create account.", 500);
  }

  const authUser = data.user;
  const profileInsert = await supabase.from("profiles").upsert({
    id: authUser.id,
    email,
    full_name: name,
    role,
  });

  if (profileInsert.error) {
    await supabase.auth.admin.deleteUser(authUser.id);
    return jsonError(profileInsert.error.message ?? "Unable to create profile.", 500);
  }

  const publicUser = {
    id: authUser.id,
    email,
    name,
    role: normalizeRole(role),
    createdAt: authUser.created_at ?? new Date().toISOString(),
  };

  const token = await signToken(publicUser);

  return Response.json(
    { success: true, data: { user: publicUser, token } },
    {
      status: 201,
      headers: {
        "Set-Cookie": `gym_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200`,
      },
    },
  );
}
