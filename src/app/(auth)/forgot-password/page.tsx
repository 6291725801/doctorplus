import React from "react";
import { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot Password | Doctor Plus",
  description: "Request a password reset link for your clinic account.",
};

export default function ForgotPasswordPage() {
  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Reset Your Password
        </h2>
      </div>

      <ForgotPasswordForm />
    </div>
  );
}
