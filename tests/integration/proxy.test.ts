import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { proxy } from "@/proxy";
import { cleanUpUsers, createSignedInUser } from "../support/users";

afterEach(cleanUpUsers);

const SITE = "http://127.0.0.1:3000";

describe("proxy", () => {
  it("redirects a signed-out visitor from /projects to /login", async () => {
    const response = await proxy(new NextRequest(`${SITE}/projects`));

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/login");
  });

  it("lets a signed-out visitor reach /login and the magic-link callback", async () => {
    expect((await proxy(new NextRequest(`${SITE}/login`))).headers.get("location")).toBeNull();
    expect((await proxy(new NextRequest(`${SITE}/auth/callback?code=x`))).headers.get("location")).toBeNull();
  });

  it("answers an API call from a signed-out visitor with 401, not a redirect", async () => {
    const response = await proxy(new NextRequest(`${SITE}/api/projects`));

    expect(response.status).toBe(401);
  });

  it("lets a signed-in visitor through, using the session cookies Auth issues", async () => {
    const user = await createSignedInUser();
    const { data } = await user.client.auth.getSession();
    const email = data.session!.user.email!;

    // Sign in through the SSR client, which records the cookies a browser would receive.
    const cookies = new Map<string, string>();
    const browser = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
          setAll: (set) => set.forEach(({ name, value }) => cookies.set(name, value)),
        },
      },
    );
    const { error } = await browser.auth.signInWithPassword({ email, password: "test-password-123" });
    expect(error).toBeNull();

    const header = [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");
    const response = await proxy(new NextRequest(`${SITE}/projects`, { headers: { cookie: header } }));

    expect(response.headers.get("location")).toBeNull();
    expect(response.status).toBe(200);
  });
});
