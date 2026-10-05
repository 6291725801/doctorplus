import React, { Suspense } from "react";
import { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign In | Clinic Portal",
  description: "Sign in to your doctor, clinic staff, or patient portal account.",
};

export default function LoginPage() {
  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Welcome Back
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Enter your credentials to access your portal
        </p>
      </div>

      <Suspense fallback={<div className="text-center py-6 text-sm text-slate-400">Loading sign in form...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
