"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { BusFront } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { useAuth } from "@/components/auth/AuthProvider";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState } = useForm<LoginForm>({
    defaultValues: { email: "", password: "" }
  });

  const onSubmit = handleSubmit(async (values) => {
    setError("");
    try {
      await login(values.email, values.password);
    } catch {
      setError("No pudimos iniciar sesión. Revisá email, contraseña y que exista tu perfil de usuario.");
    }
  });

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4 dark:bg-slate-950">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-brand-600 p-3 text-white">
              <BusFront className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-950 dark:text-white">CRMBus</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Ingreso al control de kilometraje</p>
            </div>
          </div>
          <div>
            <ThemeToggle />
          </div>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <Field label="Email" type="email" autoComplete="email" required {...register("email", { required: true })} />
          <Field label="Contraseña" type="password" autoComplete="current-password" required {...register("password", { required: true })} />
          {error ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? "Ingresando..." : "Ingresar"}
          </Button>
        </form>
      </section>
    </main>
  );
}
