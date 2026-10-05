import React, { Suspense } from "react";
import { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Set New Password | Doctor Plus",
  description: "Set a new secure password for your clinic account.",
};

export default function ResetPasswordPage() {
  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Create New Password
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Please enter and confirm your new secure password
        </p>
      </div>

      <Suspense fallback={<div className="text-center py-6 text-sm text-slate-400">Loading form...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
