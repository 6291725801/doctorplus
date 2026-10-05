import React from "react";
import { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Patient Registration | Clinic Portal",
  description: "Create your patient account to book appointments and view medical records.",
};

export default function SignupPage() {
  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Create Patient Account
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Book appointments and manage your health records seamlessly
        </p>
      </div>

      <SignupForm />
    </div>
  );
}
