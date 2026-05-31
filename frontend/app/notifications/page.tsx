"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "../components/AppShell";
import api from "../../lib/api";

type NotificationChannel = "email" | "sms";
type NotificationAnchor = "booking_created" | "pickup" | "return" | "midpoint" | "precheckout" | "overdue" | "late_return" | "late_fee_charge";
type NotificationTiming = "before" | "after" | "exact";
type OffsetUnit = "minutes" | "hours" | "days";

type NotificationTemplate = {
  id: number;
  name: string;
  channel: NotificationChannel;
  subject: string;
  body: string;
  anchor: NotificationAnchor;
  timing: NotificationTiming;
  offsetMinutes: number;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type TemplateForm = {
  name: string;
  channel: NotificationChannel;
  subject: string;
  body: string;
  anchor: NotificationAnchor;
  timing: NotificationTiming;
  offsetValue: string;
  offsetUnit: OffsetUnit;
  isActive: boolean;
};

const DEFAULT_FORM: TemplateForm = {
  name: "",
  channel: "email",
  subject: "",
  body: "",
  anchor: "pickup",
  timing: "before",
  offsetValue: "1",
  offsetUnit: "hours",
  isActive: true,
};

function toOffsetParts(offsetMinutes: number) {
  const minutes = Number(offsetMinutes || 0);

  if (minutes > 0 && minutes % (60 * 24) === 0) {
    return { offsetValue: String(minutes / (60 * 24)), offsetUnit: "days" as OffsetUnit };
  }

  if (minutes > 0 && minutes % 60 === 0) {
    return { offsetValue: String(minutes / 60), offsetUnit: "hours" as OffsetUnit };
  }

  return { offsetValue: String(minutes), offsetUnit: "minutes" as OffsetUnit };
}

function toOffsetMinutes(offsetValue: string, offsetUnit: OffsetUnit) {
  const parsed = Number(offsetValue || 0);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  if (offsetUnit === "days") {
    return Math.floor(parsed * 60 * 24);
  }

  if (offsetUnit === "hours") {
    return Math.floor(parsed * 60);
  }

  return Math.floor(parsed);
}

function formatAnchorLabel(anchor: NotificationAnchor) {
  if (anchor === "booking_created") return "booking creation";
  if (anchor === "pickup") return "pickup";
  if (anchor === "return") return "drop-off";
  if (anchor === "precheckout") return "precheckout prompt";
  if (anchor === "overdue") return "overdue / late return";
  if (anchor === "late_return") return "late return detected";
  if (anchor === "late_fee_charge") return "late fee charged";
  return "midway during reservation";
}

function formatOffsetLabel(offsetMinutes: number) {
  if (offsetMinutes % (60 * 24) === 0 && offsetMinutes >= 60 * 24) {
    const days = offsetMinutes / (60 * 24);
    return `${days} day${days === 1 ? "" : "s"}`;
  }

  if (offsetMinutes % 60 === 0 && offsetMinutes >= 60) {
    const hours = offsetMinutes / 60;
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }

  return `${offsetMinutes} minute${offsetMinutes === 1 ? "" : "s"}`;
}

function formatScheduleSummary(template: Pick<NotificationTemplate, "anchor" | "timing" | "offsetMinutes">) {
  if (template.anchor === "midpoint") {
    return "Send midway during reservation";
  }

  if (!template.offsetMinutes || template.timing === "exact") {
    return `Send at ${formatAnchorLabel(template.anchor)}`;
  }

  return `Send ${formatOffsetLabel(template.offsetMinutes)} ${template.timing} ${formatAnchorLabel(template.anchor)}`;
}

function createFormFromTemplate(template: NotificationTemplate): TemplateForm {
  const offset = toOffsetParts(template.offsetMinutes);

  return {
    name: template.name,
    channel: template.channel,
    subject: template.subject,
    body: template.body,
    anchor: template.anchor,
    timing: template.anchor === "midpoint" ? "exact" : template.timing,
    offsetValue: offset.offsetValue,
    offsetUnit: offset.offsetUnit,
    isActive: template.isActive,
  };
}

export default function NotificationsPage() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<TemplateForm>(DEFAULT_FORM);

  const fetchTemplates = async () => {
    try {
      setError("");
      const res = await api.get("/notifications");
      setTemplates(res.data?.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load notification templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const currentSummary = useMemo(() => {
    return formatScheduleSummary({
      anchor: form.anchor,
      timing: form.anchor === "midpoint" ? "exact" : form.timing,
      offsetMinutes: form.anchor === "midpoint" ? 0 : toOffsetMinutes(form.offsetValue, form.offsetUnit),
    });
  }, [form.anchor, form.timing, form.offsetUnit, form.offsetValue]);

  const resetForm = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const target = event.target;
    const { name } = target;
    const value = target instanceof HTMLInputElement && target.type === "checkbox"
      ? target.checked
      : target.value;

    setForm((prev) => {
      const next = {
        ...prev,
        [name]: value as never,
      };

      if (name === "anchor" && value === "midpoint") {
        next.timing = "exact";
        next.offsetValue = "0";
        next.offsetUnit = "hours";
      }

      if (name === "channel" && value === "sms") {
        next.subject = "";
      }

      return next;
    });
  };

  const handleEdit = (template: NotificationTemplate) => {
    setEditingId(template.id);
    setForm(createFormFromTemplate(template));
    setSuccess("");
    setError("");
  };

  const handleDelete = async (templateId: number) => {
    try {
      setError("");
      setSuccess("");
      await api.delete(`/notifications/${templateId}`);
      setTemplates((prev) => prev.filter((template) => template.id !== templateId));
      if (editingId === templateId) {
        resetForm();
      }
      setSuccess("Notification template deleted.");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete notification template");
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      name: form.name.trim(),
      channel: form.channel,
      subject: form.channel === "email" ? form.subject.trim() : "",
      body: form.body.trim(),
      anchor: form.anchor,
      timing: form.anchor === "midpoint" ? "exact" : form.timing,
      offsetMinutes: form.anchor === "midpoint" ? 0 : toOffsetMinutes(form.offsetValue, form.offsetUnit),
      isActive: form.isActive,
    };

    try {
      if (editingId) {
        const res = await api.put(`/notifications/${editingId}`, payload);
        const updated = res.data?.data as NotificationTemplate;
        setTemplates((prev) => prev.map((template) => (template.id === editingId ? updated : template)));
        setSuccess("Notification template updated.");
      } else {
        const res = await api.post("/notifications", payload);
        const created = res.data?.data as NotificationTemplate;
        setTemplates((prev) => [created, ...prev]);
        setSuccess("Notification template created.");
      }
      resetForm();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save notification template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold font-[family-name:var(--font-playfair)] text-zinc-900">
              Notifications
            </h1>
            <p className="text-sm text-zinc-500">
              Create templates for messages sent before pickup, midway through a reservation, or after drop-off.
            </p>
          </div>
          <div className="rounded-xl border border-amber-900/10 bg-white/70 px-4 py-3 text-sm text-zinc-600">
            {templates.filter((template) => template.isActive).length} active template(s)
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <section className="rounded-2xl border border-amber-900/10 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">
                  {editingId ? "Edit Template" : "New Template"}
                </h2>
                <p className="text-sm text-zinc-500">Define the message, channel, and relative send time.</p>
              </div>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-amber-900/15 bg-white/70 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-white"
                >
                  Cancel edit
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700">Template Name</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Midway courtesy check-in"
                    className="w-full rounded-xl border border-amber-900/15 bg-white px-3 py-2.5 text-zinc-900"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700">Channel</label>
                  <select
                    name="channel"
                    value={form.channel}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-amber-900/15 bg-white px-3 py-2.5 text-zinc-900"
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>
              </div>

              {form.channel === "email" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700">Subject</label>
                  <input
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    placeholder="Your pickup is in 1 hour"
                    className="w-full rounded-xl border border-amber-900/15 bg-white px-3 py-2.5 text-zinc-900"
                    required={form.channel === "email"}
                  />
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700">Send Relative To</label>
                  <select
                    name="anchor"
                    value={form.anchor}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-amber-900/15 bg-white px-3 py-2.5 text-zinc-900"
                  >
                    <option value="booking_created">Booking Created - Sent immediately after booking</option>
                    <option value="pickup">Pickup - Sent at vehicle pickup time</option>
                    <option value="return">Drop-off - Sent at vehicle return time</option>
                    <option value="midpoint">Midway - Sent halfway through rental period</option>
                    <option value="precheckout">Precheckout - Sent 24hrs before pickup</option>
                    <option value="overdue">Overdue - Sent when return is overdue</option>
                    <option value="late_return">Late Return - Sent when late return detected</option>
                    <option value="late_fee_charge">Late Fee - Sent when late fee is charged</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700">Timing</label>
                  <select
                    name="timing"
                    value={form.anchor === "midpoint" ? "exact" : form.timing}
                    onChange={handleChange}
                    disabled={form.anchor === "midpoint"}
                    className="w-full rounded-xl border border-amber-900/15 bg-white px-3 py-2.5 text-zinc-900 disabled:bg-zinc-100"
                  >
                    <option value="before">Before</option>
                    <option value="after">After</option>
                    <option value="exact">At</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700">Active</label>
                  <label className="flex h-[44px] items-center gap-2 rounded-xl border border-amber-900/15 bg-white px-3 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={form.isActive}
                      onChange={handleChange}
                    />
                    Enabled for scheduling
                  </label>
                </div>
              </div>

              {form.anchor !== "midpoint" && form.timing !== "exact" && (
                <div className="grid gap-4 md:grid-cols-[minmax(0,0.6fr)_minmax(0,0.4fr)]">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-700">Offset Value</label>
                    <input
                      type="number"
                      min="0"
                      name="offsetValue"
                      value={form.offsetValue}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-amber-900/15 bg-white px-3 py-2.5 text-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-700">Unit</label>
                    <select
                      name="offsetUnit"
                      value={form.offsetUnit}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-amber-900/15 bg-white px-3 py-2.5 text-zinc-900"
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">Message Body</label>
                <textarea
                  name="body"
                  value={form.body}
                  onChange={handleChange}
                  placeholder="Hello {{firstName}}, this is a reminder that your pickup is in 1 hour."
                  className="min-h-40 w-full rounded-xl border border-amber-900/15 bg-white px-3 py-2.5 text-zinc-900"
                  required
                />
                <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                  <p className="text-xs font-semibold text-blue-900 mb-2">Available Variables:</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-blue-800">
                    <div><code className="bg-blue-100 px-1 py-0.5 rounded">{"{{firstName}}"}</code> - Customer first name</div>
                    <div><code className="bg-blue-100 px-1 py-0.5 rounded">{"{{lastName}}"}</code> - Customer last name</div>
                    <div><code className="bg-blue-100 px-1 py-0.5 rounded">{"{{bookingId}}"}</code> - Booking ID number</div>
                    <div><code className="bg-blue-100 px-1 py-0.5 rounded">{"{{vehicleLabel}}"}</code> - Vehicle make/model</div>
                    <div><code className="bg-blue-100 px-1 py-0.5 rounded">{"{{plateNumber}}"}</code> - License plate</div>
                    <div><code className="bg-blue-100 px-1 py-0.5 rounded">{"{{pickupDatetime}}"}</code> - Pickup date/time</div>
                    <div><code className="bg-blue-100 px-1 py-0.5 rounded">{"{{returnDatetime}}"}</code> - Return date/time</div>
                    <div><code className="bg-blue-100 px-1 py-0.5 rounded">{"{{pickupLocation}}"}</code> - Pickup location</div>
                    <div><code className="bg-blue-100 px-1 py-0.5 rounded">{"{{totalAmount}}"}</code> - Total booking cost</div>
                    <div><code className="bg-blue-100 px-1 py-0.5 rounded">{"{{manageUrl}}"}</code> - Manage booking link</div>
                    <div><code className="bg-blue-100 px-1 py-0.5 rounded">{"{{modifyUrl}}"}</code> - Modify booking link</div>
                    <div><code className="bg-blue-100 px-1 py-0.5 rounded">{"{{cancelUrl}}"}</code> - Cancel booking link</div>
                    <div><code className="bg-blue-100 px-1 py-0.5 rounded">{"{{supportPhone}}"}</code> - Support phone number</div>
                    <div><code className="bg-blue-100 px-1 py-0.5 rounded">{"{{lateFeeAmount}}"}</code> - Late fee amount (if applicable)</div>
                    <div><code className="bg-blue-100 px-1 py-0.5 rounded">{"{{hoursOverdue}}"}</code> - Hours overdue (if applicable)</div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-amber-900/10 bg-amber-50/70 px-4 py-3 text-sm text-zinc-700">
                <span className="font-semibold text-zinc-900">Schedule preview:</span> {currentSummary}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[var(--color-accent)] px-4 py-2.5 font-semibold text-zinc-900 transition hover:brightness-95 disabled:opacity-60"
                >
                  {saving ? "Saving..." : editingId ? "Save Template" : "Create Template"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-amber-900/15 bg-white/70 px-4 py-2.5 font-medium text-zinc-700 transition hover:bg-white"
                >
                  Reset
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-2xl border border-amber-900/10 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-zinc-900">Saved Templates</h2>
              <p className="text-sm text-zinc-500">Templates are stored and ready for future automated scheduling rules.</p>
            </div>

            {loading ? (
              <p className="text-sm text-zinc-500">Loading templates...</p>
            ) : templates.length === 0 ? (
              <div className="rounded-xl border border-dashed border-amber-900/15 bg-white/60 px-4 py-8 text-center text-sm text-zinc-500">
                No notification templates yet.
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((template) => (
                  <article
                    key={template.id}
                    className="rounded-xl border border-amber-900/10 bg-white/75 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-zinc-900">{template.name}</h3>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                            template.channel === "email"
                              ? "bg-sky-100 text-sky-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}>
                            {template.channel}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            template.isActive
                              ? "bg-amber-100 text-amber-800"
                              : "bg-zinc-100 text-zinc-500"
                          }`}>
                            {template.isActive ? "Active" : "Disabled"}
                          </span>
                        </div>
                        {template.subject ? (
                          <p className="mt-1 text-sm text-zinc-600">Subject: {template.subject}</p>
                        ) : null}
                        <p className="mt-2 text-sm text-zinc-700">{formatScheduleSummary(template)}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(template)}
                          className="rounded-lg border border-amber-900/15 bg-white/70 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-white"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(template.id)}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 rounded-lg bg-amber-50/60 px-3 py-2 text-sm text-zinc-700 whitespace-pre-wrap">
                      {template.body}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Booking Confirmation Email Sample */}
        <section className="rounded-2xl border border-amber-900/10 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-zinc-900">Booking Confirmation Email Sample</h2>
            <p className="text-sm text-zinc-500">This is the hardcoded template sent when a booking is confirmed.</p>
          </div>

          <div className="rounded-xl border border-amber-900/10 bg-white p-4">
            <div className="mb-3">
              <p className="text-sm font-semibold text-zinc-700">Subject:</p>
              <p className="text-sm text-zinc-600">Booking confirmation #[BOOKING_ID]</p>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs font-semibold text-zinc-500 mb-3">HTML Email Preview:</p>
              <div style={{ margin: 0, padding: 24, background: '#f5f7fb', fontFamily: 'Segoe UI, Arial, sans-serif', color: '#1f2937' }}>
                <table role="presentation" cellPadding="0" cellSpacing="0" width="100%" style={{ maxWidth: 640, margin: '0 auto', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '20px 24px', background: 'linear-gradient(120deg, #0f172a, #1e293b)', color: '#ffffff' }}>
                        <p style={{ margin: 0, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', opacity: .9 }}>Carsgidi</p>
                        <h1 style={{ margin: '6px 0 0', fontSize: 24, lineHeight: 1.2 }}>Booking Confirmed</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: 24 }}>
                        <p style={{ margin: '0 0 12px', fontSize: 15 }}>Hello [Guest Name],</p>
                        <p style={{ margin: '0 0 20px', fontSize: 15 }}>Your reservation is confirmed. Here are your booking details:</p>

                        <table role="presentation" cellPadding="0" cellSpacing="0" width="100%" style={{ borderCollapse: 'collapse', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                          <tbody>
                            <tr><td style={{ padding: '10px 12px', background: '#f8fafc', fontWeight: 600, width: '38%' }}>Booking ID</td><td style={{ padding: '10px 12px' }}>#123</td></tr>
                            <tr><td style={{ padding: '10px 12px', background: '#f8fafc', fontWeight: 600 }}>Vehicle</td><td style={{ padding: '10px 12px' }}>Toyota Camry (ABC-1234)</td></tr>
                            <tr><td style={{ padding: '10px 12px', background: '#f8fafc', fontWeight: 600 }}>Pickup</td><td style={{ padding: '10px 12px' }}>6/1/2026, 10:00 AM</td></tr>
                            <tr><td style={{ padding: '10px 12px', background: '#f8fafc', fontWeight: 600 }}>Return</td><td style={{ padding: '10px 12px' }}>6/5/2026, 10:00 AM</td></tr>
                            <tr><td style={{ padding: '10px 12px', background: '#f8fafc', fontWeight: 600 }}>Total</td><td style={{ padding: '10px 12px' }}>$450.00</td></tr>
                          </tbody>
                        </table>

                        <p style={{ margin: '20px 0 12px', fontSize: 15 }}>Need to make changes?</p>
                        <table role="presentation" cellPadding="0" cellSpacing="0" width="100%" style={{ margin: '0 0 10px' }}>
                          <tbody>
                            <tr>
                              <td style={{ paddingRight: 6 }}>
                                <a href="#" style={{ display: 'inline-block', background: '#1d4ed8', color: '#ffffff', textDecoration: 'none', padding: '11px 16px', borderRadius: 8, fontWeight: 600, fontSize: 14 }}>Modify Reservation</a>
                              </td>
                              <td style={{ paddingLeft: 6 }}>
                                <a href="#" style={{ display: 'inline-block', background: '#b91c1c', color: '#ffffff', textDecoration: 'none', padding: '11px 16px', borderRadius: 8, fontWeight: 600, fontSize: 14 }}>Cancel Reservation</a>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        <p style={{ margin: '14px 0 0', fontSize: 12, color: '#6b7280' }}>If the buttons above do not work, copy and paste these links into your browser:</p>
                        <p style={{ margin: '6px 0 0', fontSize: 12, wordBreak: 'break-all' }}>Modify: [Modify URL]</p>
                        <p style={{ margin: '4px 0 0', fontSize: 12, wordBreak: 'break-all' }}>Cancel: [Cancel URL]</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/50 p-4">
              <p className="text-xs font-semibold text-blue-900 mb-2">Template Location:</p>
              <p className="text-xs text-blue-800 font-mono">backend/src/services/bookingService.js</p>
              <p className="text-xs text-blue-800 mt-1">Function: <code className="bg-blue-100 px-1 py-0.5 rounded">sendReservationConfirmationEmail()</code></p>
              <p className="text-xs text-blue-800 mt-2">Lines: 991-1105</p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
