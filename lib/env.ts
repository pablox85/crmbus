import { z } from "zod";

const publicEnvSchema = z
  .object({
    NEXT_PUBLIC_USE_DEMO_DATA: z
      .enum(["true", "false"])
      .transform((value) => value === "true"),
    NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional()
  })
  .superRefine((value, context) => {
    if (value.NEXT_PUBLIC_USE_DEMO_DATA) return;

    const parsedUrl = z.string().url().safeParse(value.NEXT_PUBLIC_SUPABASE_URL);
    if (!parsedUrl.success) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["NEXT_PUBLIC_SUPABASE_URL"],
        message: "NEXT_PUBLIC_SUPABASE_URL es requerida y debe ser una URL valida cuando demo=false."
      });
    }

    if (!value.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["NEXT_PUBLIC_SUPABASE_ANON_KEY"],
        message: "NEXT_PUBLIC_SUPABASE_ANON_KEY es requerida cuando demo=false."
      });
    }
  });

const parsedPublicEnv = publicEnvSchema.safeParse({
  NEXT_PUBLIC_USE_DEMO_DATA: process.env.NEXT_PUBLIC_USE_DEMO_DATA,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
});

if (!parsedPublicEnv.success) {
  throw new Error(
    `Variables de entorno invalidas:\n${parsedPublicEnv.error.errors
      .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
      .join("\n")}`
  );
}

export const publicEnv = {
  useDemoData: parsedPublicEnv.data.NEXT_PUBLIC_USE_DEMO_DATA,
  supabaseUrl: parsedPublicEnv.data.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: parsedPublicEnv.data.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
};

export function getRequiredSupabasePublicEnv(): { supabaseUrl: string; supabaseAnonKey: string } {
  if (publicEnv.useDemoData) {
    throw new Error("Supabase no debe inicializarse cuando NEXT_PUBLIC_USE_DEMO_DATA=true.");
  }

  return {
    supabaseUrl: publicEnv.supabaseUrl,
    supabaseAnonKey: publicEnv.supabaseAnonKey
  };
}
