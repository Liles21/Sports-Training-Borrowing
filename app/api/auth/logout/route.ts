export async function POST(): Promise<Response> {
  return Response.json(
    { success: true },
    {
      headers: {
        "Set-Cookie": "gym_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
      },
    },
  );
}
