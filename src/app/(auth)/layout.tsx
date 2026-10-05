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
        <Link href="/" className="inline-flex items-center space-x-3 group">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 ring-4 ring-emerald-50 dark:ring-emerald-950/40">
            <span className="font-black text-xl leading-none">+</span>
          </div>
          <div className="text-left">
            <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white block leading-tight">
              Doctor Plus
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide">
              Doctor & Specialized Medical Clinic
            </p>
          </div>
        </Link>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200/80 sm:px-10 dark:bg-slate-900 dark:border-slate-800 dark:shadow-none">
          {children}
        </div>
      </div>
    </div>
  );
}
