import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getUserProfile } from "@/lib/services/auth.service";
import { Badge } from "@/components/ui/badge";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const user = await getUserProfile(session.userId);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs dark:bg-slate-900 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-emerald-500/20 ring-2 ring-emerald-50 dark:ring-emerald-950/40">
                +
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white block leading-tight">
                  Doctor Plus
                </span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">
                  Doctor & Specialized Medical Clinic
                </p>
              </div>
            </Link>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <Badge variant="teal">{session.role.replace("_", " ")}</Badge>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {user?.fullName || session.fullName || "User"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {session.email}
              </p>
            </div>

            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900">
        Doctor Plus — Doctor & Specialized Medical Clinic
      </footer>
    </div>
  );
}
