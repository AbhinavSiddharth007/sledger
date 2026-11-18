"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(6, "Use at least 6 characters."),
});

const emailSchema = z.object({
  email: z.email("Enter a valid email address."),
});

function loginUrl(params: Record<string, string>) {
  return `/login?${new URLSearchParams(params)}`;
}

export async function signInWithPassword(formData: FormData) {
  const parsed = credentialsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(loginUrl({ error: parsed.error.issues[0].message }));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect(loginUrl({ error: error.message }));

  redirect("/projects");
}

export async function signUpWithPassword(formData: FormData) {
  const parsed = credentialsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(loginUrl({ error: parsed.error.issues[0].message }));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(parsed.data);
  if (error) redirect(loginUrl({ error: error.message }));

  // With email confirmation on, there is no session yet, so the user has to check their inbox.
  if (!data.session) redirect(loginUrl({ sent: "1" }));
  redirect("/projects");
}

export async function sendMagicLink(formData: FormData) {
  const parsed = emailSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(loginUrl({ error: parsed.error.issues[0].message }));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
  });
  if (error) redirect(loginUrl({ error: error.message }));

  redirect(loginUrl({ sent: "1" }));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
