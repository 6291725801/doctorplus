"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error?.message || "Failed to log in. Please check your credentials.");
        setLoading(false);
        return;
      }

      // Successful login -> navigate to role destination or redirect query
      const destination = redirectParam || data.data?.redirectTo || "/dashboard";
      router.push(destination);
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please check your network connection.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 dark:bg-red-950 dark:border-red-900 dark:text-red-300">
          {error}
        </div>
      )}

      <Input
        label="Email Address"
        type="email"
        name="email"
        required
        autoComplete="email"
        placeholder="doctor@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Password <span className="text-red-500">*</span>
          </label>
          <Link
            href="/forgot-password"
            className="text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <Button type="submit" className="w-full" isLoading={loading}>
        Sign in to Account
      </Button>

      <div className="text-center pt-2">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Don&apos;t have a patient account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 underline underline-offset-4"
          >
            Register as Patient
          </Link>
        </p>
      </div>
    </form>
  );
}
