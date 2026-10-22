"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Field, TextInput } from "@/components/fields";
import { Alert, Button } from "@/components/ui";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { type LoginInput, loginSchema, safeStaffPath } from "@/lib/validation/staff";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeStaffPath(searchParams.get("next"));
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });

  const onSubmit = async (values: LoginInput) => {
    setFormError(null);
    let supabase: ReturnType<typeof getBrowserSupabase>;
    try {
      supabase = getBrowserSupabase();
    } catch {
      setFormError("The site is not set up yet. Check the Supabase settings in .env.local.");
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({ email: values.email, password: values.password });
      if (error) {
        setFormError(
          error.status === 429
            ? "Too many login attempts. Wait a few minutes and try again."
            : "That email and password do not match a staff account.",
        );
        return;
      }

      const { data: isStaff, error: staffError } = await supabase.rpc("is_staff");
      if (staffError || !isStaff) {
        await supabase.auth.signOut();
        setFormError("This account does not have staff access. Ask an administrator to add you.");
        return;
      }

      router.replace(next);
      router.refresh();
    } catch {
      setFormError("Could not reach the server. Check your connection and try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {formError && (
        <Alert tone="error" live="assertive">
          {formError}
        </Alert>
      )}
      <Field id="login-email" label="Email address" error={errors.email?.message} required>
        {(a11y) => (
          <TextInput {...a11y} {...register("email")} type="email" autoComplete="username" spellCheck={false} />
        )}
      </Field>
      <Field id="login-password" label="Password" error={errors.password?.message} required>
        {(a11y) => <TextInput {...a11y} {...register("password")} type="password" autoComplete="current-password" />}
      </Field>
      <Button type="submit" loading={isSubmitting} loadingText="Logging in" className="w-full">
        Log in
      </Button>
    </form>
  );
}
