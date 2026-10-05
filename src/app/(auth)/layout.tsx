import React from "react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/20 flex flex-col justify-center py-12 sm:px-6 lg:px-8 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center space-x-2">
          <div className="h-10 w-10 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
            +
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Doctor <span className="text-teal-600">Plus</span>
          </span>
        </Link>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Doctor & Specialized Medical Clinic
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200/80 sm:px-10 dark:bg-slate-900 dark:border-slate-800 dark:shadow-none">
          {children}
        </div>
      </div>
    </div>
  );
}
