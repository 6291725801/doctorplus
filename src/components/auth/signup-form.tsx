"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SignupForm() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    gender: "MALE" as "MALE" | "FEMALE" | "OTHER",
    dateOfBirth: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.error?.details) {
          const firstField = Object.values(data.error.details)[0];
          setError(Array.isArray(firstField) ? firstField[0] : data.error.message);
        } else {
          setError(data.error?.message || "Failed to register. Please try again.");
        }
        setLoading(false);
        return;
      }

      router.push(data.data?.redirectTo || "/dashboard/patient");
      router.refresh();
    } catch {
      setError("An unexpected network error occurred.");
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
        label="Full Name"
        name="fullName"
        required
        placeholder="e.g. Ramesh Kumar"
        value={formData.fullName}
        onChange={handleChange}
      />

      <Input
        label="Email Address"
        type="email"
        name="email"
        required
        autoComplete="email"
        placeholder="ramesh@example.com"
        value={formData.email}
        onChange={handleChange}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Phone Number"
          name="phone"
          placeholder="+91 9876543210"
          value={formData.phone}
          onChange={handleChange}
        />

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Gender
          </label>
          <select
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      <Input
        label="Date of Birth"
        type="date"
        name="dateOfBirth"
        value={formData.dateOfBirth}
        onChange={handleChange}
      />

      <Input
        label="Password"
        type="password"
        name="password"
        required
        placeholder="Min 8 chars, 1 uppercase, 1 number"
        helperText="Must contain at least 8 characters, an uppercase letter, and a number"
        value={formData.password}
        onChange={handleChange}
      />

      <Button type="submit" className="w-full" isLoading={loading}>
        Create Patient Account
      </Button>

      <div className="text-center pt-2">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Already registered?{" "}
          <Link
            href="/login"
            className="font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 underline underline-offset-4"
          >
            Sign In Here
          </Link>
        </p>
      </div>
    </form>
  );
}
