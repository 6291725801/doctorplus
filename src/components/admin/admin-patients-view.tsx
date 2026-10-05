"use client";

import React, { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface AdminPatientItem {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  isActive: boolean;
  createdAt: string;
  gender?: string | null;
  dateOfBirth?: string | null;
  bloodGroup?: string | null;
  city?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  medicalNotes?: string | null;
  totalAppointments: number;
  lastAppointmentDate?: string | null;
}

interface AdminPatientsViewProps {
  initialPatients?: AdminPatientItem[];
}

export function AdminPatientsView({ initialPatients = [] }: AdminPatientsViewProps) {
  const [patients, setPatients] = useState<AdminPatientItem[]>(initialPatients);
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<AdminPatientItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filter patients by search query
  const filteredPatients = useMemo(() => {
    if (!search.trim()) return patients;
    const q = search.toLowerCase();
    return patients.filter((p) => {
      const name = p.fullName.toLowerCase();
      const email = p.email.toLowerCase();
      const phone = (p.phone || "").toLowerCase();
      const city = (p.city || "").toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q) || city.includes(q);
    });
  }, [patients, search]);

  const refreshPatients = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/patients?limit=100");
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to fetch patients.");
      }
      setPatients(data.data.patients || []);
      setMessage({ type: "success", text: "Patient directory refreshed." });
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ type: "error", text: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-red-50 text-red-800 border border-red-200 dark:bg-red-950 dark:text-red-300"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="underline ml-2 cursor-pointer font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* HEADER & METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Total Registered Patients
          </span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {patients.length}
          </div>
          <span className="text-[11px] text-teal-600 font-medium">Unique clinical patient accounts</span>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Active Patients With Visits
          </span>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {patients.filter((p) => p.totalAppointments > 0).length}
          </div>
          <span className="text-[11px] text-slate-500">Have booked 1+ appointments</span>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Repeat / Regular Patients
          </span>
          <div className="text-2xl font-bold text-teal-600 dark:text-teal-400 mt-1">
            {patients.filter((p) => p.totalAppointments > 1).length}
          </div>
          <span className="text-[11px] text-slate-500">2 or more consultation visits</span>
        </Card>
      </div>

      {/* DIRECTORY CARD */}
      <Card>
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">Clinic Patient Directory</CardTitle>
            <CardDescription className="text-xs">
              Search and view registered patients, contact details, emergency information, and visit summaries.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refreshPatients} disabled={loading} className="text-xs">
              🔄 Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* SEARCH */}
          <div className="relative max-w-md">
            <Input
              placeholder="Search by patient name, email, phone, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs pr-8"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="p-3">Patient Name</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3">Demographics</th>
                  <th className="p-3">Appointments</th>
                  <th className="p-3">Last Visit</th>
                  <th className="p-3">Registered</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No patients matching search query.
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => (
                    <tr
                      key={patient.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-900/60 transition"
                    >
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200 font-bold flex items-center justify-center text-xs shrink-0">
                            {patient.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div>{patient.fullName}</div>
                            {patient.city && (
                              <div className="text-[10px] text-slate-400 font-normal">{patient.city}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        <div>{patient.phone || "No phone"}</div>
                        <div className="text-[11px] text-slate-400">{patient.email}</div>
                      </td>

                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {patient.gender && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-medium">
                              {patient.gender}
                            </span>
                          )}
                          {patient.bloodGroup && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-[10px] border border-rose-200 dark:border-rose-900">
                              {patient.bloodGroup}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                          {patient.totalAppointments} visits
                        </span>
                      </td>

                      <td className="p-3 text-slate-500 font-mono text-[11px]">
                        {patient.lastAppointmentDate || "None"}
                      </td>

                      <td className="p-3 text-slate-400 text-[11px]">{patient.createdAt}</td>

                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedPatient(patient)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          👁️ View Profile
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* PATIENT DETAILS MODAL */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-start justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedPatient.fullName}
                </h3>
                <p className="text-xs text-slate-500">
                  Patient ID: {selectedPatient.id} • Registered {selectedPatient.createdAt}
                </p>
              </div>
              <button
                onClick={() => setSelectedPatient(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Contact Details</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedPatient.phone || "No phone provided"}
                </div>
                <div className="text-slate-500">{selectedPatient.email}</div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Demographics</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedPatient.gender || "Gender not specified"}
                </div>
                <div className="text-slate-500">
                  Blood Group: <strong>{selectedPatient.bloodGroup || "Not recorded"}</strong>
                </div>
                {selectedPatient.dateOfBirth && (
                  <div className="text-slate-500">DOB: {selectedPatient.dateOfBirth}</div>
                )}
              </div>
            </div>

            {selectedPatient.emergencyContactPhone && (
              <div className="p-3 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-xl text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 block">
                  🚨 Emergency Contact
                </span>
                <div className="font-semibold text-slate-900 dark:text-white">
                  {selectedPatient.emergencyContactName || "Family Contact"}
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  Phone: {selectedPatient.emergencyContactPhone}
                </div>
              </div>
            )}

            {selectedPatient.medicalNotes && (
              <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block">
                  Medical Notes & History
                </span>
                <p className="text-slate-700 dark:text-slate-300">{selectedPatient.medicalNotes}</p>
              </div>
            )}

            <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl text-xs flex justify-between items-center">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Visit History</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedPatient.totalAppointments} Lifetime Appointments
                </span>
              </div>
              <div className="text-right text-slate-500 text-[11px]">
                Last Visit: <strong>{selectedPatient.lastAppointmentDate || "Never"}</strong>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setSelectedPatient(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
