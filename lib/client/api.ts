export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiError = {
  success: false;
  message: string;
};

export async function apiFetch<T>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include",
  });

  // Guard against non-JSON or empty responses which would throw on response.json()
  const contentType = response.headers.get("content-type") || "";

  let payload: ApiSuccess<T> | ApiError | null = null;

  if (contentType.includes("application/json")) {
    try {
      payload = (await response.json()) as ApiSuccess<T> | ApiError;
    } catch (err) {
      // invalid JSON body
      throw new Error(`Invalid JSON response: ${String(err)}`);
    }
  } else {
    // Non-JSON response (could be HTML error page or empty). Read text for diagnostics.
    const text = await response.text();
    throw new Error(
      text ? `Unexpected response: ${text}` : `Unexpected response with status ${response.status}`,
    );
  }

  if (!response.ok || !payload?.success) {
    throw new Error(
      payload && "message" in payload ? payload.message : "Something went wrong.",
    );
  }

  return payload.data;
}
