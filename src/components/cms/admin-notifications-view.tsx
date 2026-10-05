"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Send,
  Save,
  RotateCcw,
  Search,
  Filter,
  ShieldCheck,
  Info,
} from "lucide-react";

interface NotificationTemplate {
  id: string;
  clinicId: string | null;
  event: string;
  channel: "EMAIL" | "SMS" | "WHATSAPP" | "IN_APP";
  name: string;
  subject: string | null;
  body: string;
  isActive: boolean;
  variables?: string[] | null;
  description: string | null;
  updatedAt: string;
}

interface NotificationLog {
  id: string;
  event: string;
  channel: "EMAIL" | "SMS" | "WHATSAPP" | "IN_APP";
  recipient: string;
  subject: string | null;
  content: string;
  status: "PENDING" | "SENT" | "DELIVERED" | "FAILED";
  provider: string;
  providerMessageId: string | null;
  errorMessage: string | null;
  createdAt: string;
  template?: { name: string } | null;
}

interface ProviderStatus {
  name: string;
  isConfigured: boolean;
}

export function AdminNotificationsView() {
  const [subTab, setSubTab] = useState<"templates" | "logs" | "test">("templates");
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [providers, setProviders] = useState<{
    email?: ProviderStatus;
    sms?: ProviderStatus;
    whatsapp?: ProviderStatus;
  }>({});
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Template Filters
  const [channelFilter, setChannelFilter] = useState<string>("ALL");
  const [eventFilter, setEventFilter] = useState<string>("ALL");
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);

  // Log Filters
  const [logChannel, setLogChannel] = useState<string>("ALL");
  const [logStatus, setLogStatus] = useState<string>("ALL");
  const [logSearch, setLogSearch] = useState<string>("");

  // Test form
  const [testEvent, setTestEvent] = useState<string>("APPOINTMENT_BOOKED");
  const [testChannel, setTestChannel] = useState<"EMAIL" | "SMS" | "WHATSAPP">("EMAIL");
  const [testEmail, setTestEmail] = useState<string>("");
  const [testPhone, setTestPhone] = useState<string>("+919876543210");
  const [testPatientName, setTestPatientName] = useState<string>("Rahul Sharma");
  const [simulateFailure, setSimulateFailure] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState<boolean>(false);

  useEffect(() => {
    fetchTemplates();
    fetchLogs();
  }, []);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications/templates");
      const json = await res.json();
      if (json.success) {
        setTemplates(json.data.templates || []);
        setProviders(json.data.providers || {});
        if (json.data.templates?.length > 0 && !editingTemplate) {
          setEditingTemplate(json.data.templates[0]);
        }
      }
    } catch (err: any) {
      console.error("Failed to load templates:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLogs() {
    try {
      const params = new URLSearchParams();
      if (logChannel !== "ALL") params.set("channel", logChannel);
      if (logStatus !== "ALL") params.set("status", logStatus);
      if (logSearch.trim()) params.set("search", logSearch.trim());
      params.set("limit", "50");

      const res = await fetch(`/api/notifications/logs?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data.logs || []);
        setLogsTotal(json.data.total || 0);
      }
    } catch (err: any) {
      console.error("Failed to load logs:", err);
    }
  }

  async function handleSaveTemplate(tpl: NotificationTemplate) {
    setSavingId(tpl.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/notifications/templates/${tpl.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: tpl.subject,
          body: tpl.body,
          isActive: tpl.isActive,
          name: tpl.name,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: `Template "${tpl.name}" updated successfully!` });
        setTemplates((prev) => prev.map((t) => (t.id === tpl.id ? json.data : t)));
      } else {
        setMessage({ type: "error", text: json.error?.message || "Failed to update template" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Network error updating template" });
    } finally {
      setSavingId(null);
    }
  }

  async function handleResetTemplate(id: string) {
    if (!confirm("Are you sure you want to reset this template to system defaults?")) return;
    setSavingId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/notifications/templates/${id}`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: "Template reset to system defaults." });
        setTemplates((prev) => prev.map((t) => (t.id === id ? json.data : t)));
        if (editingTemplate?.id === id) {
          setEditingTemplate(json.data);
        }
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSavingId(null);
    }
  }

  async function handleRunTest() {
    setTesting(true);
    setTestResult(null);
    setMessage(null);
    try {
      const res = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: testEvent,
          channel: testChannel,
          recipientEmail: testEmail || undefined,
          recipientPhone: testPhone || undefined,
          patientName: testPatientName,
          simulateFailure,
        }),
      });
      const json = await res.json();
      setTestResult(json);
      if (json.success) {
        setMessage({
          type: "success",
          text: `Test triggered! Result: ${json.data.results?.[0]?.success ? "Dispatched" : "Failed as simulated"}`,
        });
        fetchLogs(); // refresh logs table
      } else {
        setMessage({ type: "error", text: json.error?.message || "Test dispatch failed" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Test execution error" });
    } finally {
      setTesting(false);
    }
  }

  const filteredTemplates = templates.filter((t) => {
    if (channelFilter !== "ALL" && t.channel !== channelFilter) return false;
    if (eventFilter !== "ALL" && t.event !== eventFilter) return false;
    return true;
  });

  const channelIcons: Record<string, any> = {
    EMAIL: Mail,
    SMS: Smartphone,
    WHATSAPP: MessageSquare,
    IN_APP: Bell,
  };

  return (
    <div className="space-y-6">
      {/* Header & Provider Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <span className="p-2 bg-teal-50 dark:bg-teal-950/50 text-teal-600 rounded-xl">
              <Bell className="w-5 h-5" />
            </span>
            Notification Engine & Templates
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure multi-channel templates (Email, SMS, WhatsApp), inspect delivery logs, and test failure resilience.
          </p>
        </div>

        {/* Security & Provider Badges (Zero Secret Exposure) */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <Mail className="w-3.5 h-3.5" />
            <span>Email: {providers.email?.name || "Active"}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            <Smartphone className="w-3.5 h-3.5" />
            <span>SMS: {providers.sms?.name || "Twilio/Stub"}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 border border-green-200 dark:border-green-800">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp: {providers.whatsapp?.name || "Meta/Stub"}</span>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold flex items-center justify-between ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-200"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs underline font-bold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        {[
          { key: "templates", label: "📝 Templates & CMS", count: templates.length },
          { key: "logs", label: "📜 Delivery Logs", count: logsTotal },
          { key: "test", label: "🧪 Test & Diagnostics" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setSubTab(tab.key as any);
              setMessage(null);
            }}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition cursor-pointer flex items-center gap-2 ${
              subTab === tab.key
                ? "bg-teal-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${subTab === tab.key ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ==================================================== */}
      {/* TAB 1: TEMPLATES & CMS */}
      {/* ==================================================== */}
      {subTab === "templates" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Filter and Template List */}
          <div className="lg:col-span-4 space-y-4">
            {/* Filters */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Filter Channel
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {["ALL", "EMAIL", "SMS", "WHATSAPP"].map((ch) => (
                    <button
                      key={ch}
                      onClick={() => setChannelFilter(ch)}
                      className={`px-2 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                        channelFilter === ch
                          ? "bg-teal-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Filter Event (7 Events)
                </label>
                <select
                  value={eventFilter}
                  onChange={(e) => setEventFilter(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                >
                  <option value="ALL">All 7 Events</option>
                  <option value="APPOINTMENT_BOOKED">Appointment Booked</option>
                  <option value="PAYMENT_SUCCESSFUL">Payment Successful</option>
                  <option value="APPOINTMENT_CANCELLED">Appointment Cancelled</option>
                  <option value="APPOINTMENT_RESCHEDULED">Appointment Rescheduled</option>
                  <option value="APPOINTMENT_REMINDER">Appointment Reminder</option>
                  <option value="DOCTOR_SCHEDULE_CHANGED">Doctor Schedule Changed</option>
                  <option value="APPOINTMENT_COMPLETED">Appointment Completed</option>
                </select>
              </div>
            </div>

            {/* Template List */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredTemplates.map((t) => {
                const IconComponent = channelIcons[t.channel] || Bell;
                const isSelected = editingTemplate?.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setEditingTemplate(t);
                      setMessage(null);
                    }}
                    className={`w-full text-left p-3.5 rounded-xl border transition cursor-pointer flex flex-col gap-1.5 ${
                      isSelected
                        ? "bg-teal-50 dark:bg-teal-950/40 border-teal-500 dark:border-teal-500 shadow-xs"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-4 h-4 text-teal-600" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
                          {t.name}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          t.isActive
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {t.isActive ? "ACTIVE" : "OFF"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{t.event.replace(/_/g, " ")}</span>
                      <span className="font-mono">{t.channel}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Template Editor */}
          <div className="lg:col-span-8">
            {editingTemplate ? (
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-xs">
                {/* Editor Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{editingTemplate.name}</span>
                      <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                        {editingTemplate.channel}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">{editingTemplate.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={editingTemplate.isActive}
                        onChange={(e) =>
                          setEditingTemplate({ ...editingTemplate, isActive: e.target.checked })
                        }
                        className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                      />
                      <span>Active</span>
                    </label>

                    <button
                      onClick={() => handleResetTemplate(editingTemplate.id)}
                      disabled={savingId === editingTemplate.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>

                {/* Template Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Template Display Name
                  </label>
                  <input
                    type="text"
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    className="w-full text-sm font-medium px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Subject (Only for Email) */}
                {editingTemplate.channel === "EMAIL" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Email Subject Line (Supports {"{{placeholders}}"})
                    </label>
                    <input
                      type="text"
                      value={editingTemplate.subject || ""}
                      onChange={(e) =>
                        setEditingTemplate({ ...editingTemplate, subject: e.target.value })
                      }
                      placeholder="e.g. Appointment Confirmed #{{appointmentNumber}} - {{clinicName}}"
                      className="w-full text-sm font-medium px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                )}

                {/* Variable Tags Helpers */}
                {editingTemplate.variables && (
                  <div>
                    <span className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5" />
                      Click tag to insert into template body:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(editingTemplate.variables as string[]).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => {
                            const snippet = `{{${v}}}`;
                            setEditingTemplate({
                              ...editingTemplate,
                              body: editingTemplate.body + " " + snippet,
                            });
                          }}
                          className="px-2.5 py-1 text-xs font-mono font-semibold rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-950/60 dark:text-teal-300 dark:hover:bg-teal-900 border border-teal-200 dark:border-teal-800 transition cursor-pointer"
                        >
                          +{`{{${v}}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Template Body */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {editingTemplate.channel === "EMAIL" ? "Email HTML / Text Body" : "Message Body Content"}
                  </label>
                  <textarea
                    rows={editingTemplate.channel === "EMAIL" ? 12 : 5}
                    value={editingTemplate.body}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                    className="w-full font-mono text-xs sm:text-sm p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Save Button */}
                <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => handleSaveTemplate(editingTemplate)}
                    disabled={savingId === editingTemplate.id}
                    className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-xs transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingId === editingTemplate.id ? "Saving..." : "Save Template"}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                Select a template from the left to view and edit its content.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: DELIVERY LOGS */}
      {/* ==================================================== */}
      {subTab === "logs" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search recipient or content..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
                  className="pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-56 text-slate-800 dark:text-slate-200"
                />
              </div>

              <select
                value={logChannel}
                onChange={(e) => setLogChannel(e.target.value)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                <option value="ALL">All Channels</option>
                <option value="EMAIL">Email</option>
                <option value="SMS">SMS</option>
                <option value="WHATSAPP">WhatsApp</option>
              </select>

              <select
                value={logStatus}
                onChange={(e) => setLogStatus(e.target.value)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                <option value="ALL">All Statuses</option>
                <option value="SENT">Sent</option>
                <option value="DELIVERED">Delivered</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>

            <button
              onClick={fetchLogs}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 hover:bg-teal-100 transition cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Logs</span>
            </button>
          </div>

          {/* Logs Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Event</th>
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Provider</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Message / Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No notification logs found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => {
                      const Icon = channelIcons[log.channel] || Bell;
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            {log.event.replace(/_/g, " ")}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                              <Icon className="w-3.5 h-3.5 text-teal-600" />
                              {log.channel}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                            {log.recipient}
                          </td>
                          <td className="py-3 px-4 text-slate-500">{log.provider}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                log.status === "SENT" || log.status === "DELIVERED"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate text-slate-600 dark:text-slate-400">
                            {log.errorMessage ? (
                              <span className="text-rose-600 dark:text-rose-400 font-semibold" title={log.errorMessage}>
                                ⚠️ {log.errorMessage}
                              </span>
                            ) : (
                              log.subject || log.content.slice(0, 45) + "..."
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: TEST & DIAGNOSTICS */}
      {/* ==================================================== */}
      {subTab === "test" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-teal-600" />
              Dispatch Test Notification
            </h3>
            <p className="text-xs text-slate-500">
              Trigger any event to test variable interpolation, multi-channel routing, and error isolation without placing real appointments.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Event Type
              </label>
              <select
                value={testEvent}
                onChange={(e) => setTestEvent(e.target.value)}
                className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                <option value="APPOINTMENT_BOOKED">Appointment Booked</option>
                <option value="PAYMENT_SUCCESSFUL">Payment Successful</option>
                <option value="APPOINTMENT_CANCELLED">Appointment Cancelled</option>
                <option value="APPOINTMENT_RESCHEDULED">Appointment Rescheduled</option>
                <option value="APPOINTMENT_REMINDER">Appointment Reminder</option>
                <option value="DOCTOR_SCHEDULE_CHANGED">Doctor Schedule Changed</option>
                <option value="APPOINTMENT_COMPLETED">Appointment Completed</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Channel
                </label>
                <select
                  value={testChannel}
                  onChange={(e) => setTestChannel(e.target.value as any)}
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="EMAIL">Email</option>
                  <option value="SMS">SMS</option>
                  <option value="WHATSAPP">WhatsApp</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Patient Name
                </label>
                <input
                  type="text"
                  value={testPatientName}
                  onChange={(e) => setTestPatientName(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {testChannel === "EMAIL" ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Recipient Email
                </label>
                <input
                  type="email"
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Recipient Phone
                </label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            )}

            {/* Test Failure Handling Checkbox */}
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={simulateFailure}
                  onChange={(e) => setSimulateFailure(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4 mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                    Simulate Provider Failure (Test Failure Resilience)
                  </span>
                  <span className="text-[11px] text-amber-700 dark:text-amber-400 block mt-0.5">
                    Forces the email provider to simulate a connection timeout (ETIMEDOUT). Verifies that the system logs a FAILED status with error details without crashing the platform.
                  </span>
                </div>
              </label>
            </div>

            <button
              onClick={handleRunTest}
              disabled={testing}
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-xs transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{testing ? "Dispatching..." : "Send Test Notification"}</span>
            </button>
          </div>

          {/* Test Results Display */}
          <div className="lg:col-span-6 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              Diagnostic Output
            </h3>
            <p className="text-xs text-slate-500">
              Live response inspection from the notification dispatcher service.
            </p>

            {testResult ? (
              <div className="space-y-3">
                <div
                  className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    testResult.data?.results?.[0]?.success
                      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                      : "bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200"
                  }`}
                >
                  {testResult.data?.results?.[0]?.success ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  )}
                  <span>
                    {testResult.data?.results?.[0]?.success
                      ? "Dispatch Succeeded: Notification sent and logged."
                      : `Dispatch Failed: Logged with error "${testResult.data?.results?.[0]?.errorMessage}"`}
                  </span>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl overflow-x-auto text-[11px] font-mono text-emerald-400 max-h-72">
                  <pre>{JSON.stringify(testResult, null, 2)}</pre>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                Trigger a test from the left panel to inspect dispatch details.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
