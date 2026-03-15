import { supabaseClient } from "@/lib/supabase";

export async function signIn(email: string, password: string) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function signOut() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

export async function getCurrentSession() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error || !data.session) {
    return null;
  }

  return data.session;
}

export async function getCurrentUser() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export async function refreshSession() {
  const { data, error } = await supabaseClient.auth.refreshSession();

  if (error || !data.session) {
    return null;
  }

  return data.session;
}
