"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [debugToken, setDebugToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error?.message || "Failed to process request.");
        setLoading(false);
        return;
      }

      setSubmitted(true);
      if (data.data?.debugToken) {
        setDebugToken(data.data.debugToken);
      }
    } catch {
      setError("An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-600">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
          Reset Link Generated
        </h4>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          If an active account exists for <strong>{email}</strong>, password reset instructions have been issued.
        </p>

        {debugToken && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-left text-xs">
            <p className="font-semibold text-amber-800">Development Mode Link:</p>
            <Link
              href={`/reset-password?token=${debugToken}`}
              className="text-teal-700 underline break-all hover:text-teal-800"
            >
              /reset-password?token={debugToken}
            </Link>
          </div>
        )}

        <div className="pt-2">
          <Link
            href="/login"
            className="text-sm font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400"
          >
            ← Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 dark:bg-red-950 dark:border-red-900 dark:text-red-300">
          {error}
        </div>
      )}

      <p className="text-sm text-slate-600 dark:text-slate-300">
        Enter the email address associated with your account and we will generate a secure reset link.
      </p>

      <Input
        label="Account Email"
        type="email"
        name="email"
        required
        placeholder="doctor@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <Button type="submit" className="w-full" isLoading={loading}>
        Send Reset Link
      </Button>

      <div className="text-center pt-2">
        <Link
          href="/login"
          className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400"
        >
          ← Return to Login
        </Link>
      </div>
    </form>
  );
}
