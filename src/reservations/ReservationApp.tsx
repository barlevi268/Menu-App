import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type StepProps = {
  n: number;
  label: string;
  active: boolean;
  done: boolean;
};

type CardProps = {
  children: React.ReactNode;
};

type ReservationArea = {
  id: string;
  name: string;
  slots?: number | null;
  timeAvailable?: string | null;
  photoUrl?: string | null;
};

type ReservationSlot = {
  id: string;
  date: string;
  time: string;
  area?: ReservationArea | null;
  areaId?: string;
  area_id?: string;
};

const Step = ({ n, label, active, done }: StepProps) => (
  <div className="flex items-center gap-3">
    <div
      className={[
        "w-8 h-8 rounded-full grid place-items-center text-sm font-bold",
        done
          ? "bg-green-600 text-white"
          : active
          ? "bg-black text-white"
          : "bg-gray-200 text-gray-600",
      ].join(" ")}
    >
      {done ? "OK" : n}
    </div>
    <div className={"text-sm " + (active ? "font-semibold" : "text-gray-500")}>{label}</div>
  </div>
);

const Card = ({ children }: CardProps) => (
  <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-5 md:p-6 border border-gray-100">
    {children}
  </div>
);

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const addDays = (isoDate: string, days: number) => {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const getCompanyIdFromPath = () => {
  const params = new URLSearchParams(window.location.search);
  const paramId =
    params.get("companyId") ||
    params.get("companyID") ||
    params.get("id") ||
    params.get("cid");

  const segments = window.location.pathname.split("/").filter(Boolean);
  if (paramId) return paramId;
  if (segments[0] === "reservations") {
    return segments[1];
  }
  return segments[0];
};

const normalizeArea = (slot: ReservationSlot): ReservationArea | null => {
  const area = slot.area ?? null;
  const id = area?.id ?? slot.areaId ?? slot.area_id;
  if (!id) return null;
  return {
    id,
    name: area?.name ?? "Area",
    slots: area?.slots ?? null,
    timeAvailable: area?.timeAvailable ?? (area as any)?.time_available ?? null,
    photoUrl: area?.photoUrl ?? (area as any)?.photo_url ?? null,
  };
};

export default function ReservationApp() {
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const baseUrl = useMemo(
    () => import.meta.env.VITE_API_BASE_URL || "https://api.orda.co",
    []
  );
  const companyId = useMemo(() => getCompanyIdFromPath(), []);

  const [step, setStep] = useState(1);
  const [date, setDate] = useState(todayISO);
  const [areaId, setAreaId] = useState<string>("");
  const [pax, setPax] = useState(2);
  const [time, setTime] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  const [areas, setAreas] = useState<ReservationArea[]>([]);
  const [slots, setSlots] = useState<ReservationSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!companyId) {
      setError("Missing company id.");
      return;
    }

    let ignore = false;
    async function loadAreas() {
      setError("");
      try {
        const from = todayISO;
        const to = addDays(todayISO, 7);
        const url = new URL(`${baseUrl}/reservations/slots/vacant`);
        url.searchParams.set("companyId", companyId);
        url.searchParams.set("from", from);
        url.searchParams.set("to", to);

        const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
        if (!res.ok) {
          throw new Error(`Failed to load areas: ${res.status}`);
        }
        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.data ?? data?.documents ?? [];
        const areaMap = new Map<string, ReservationArea>();
        list.forEach((slot: ReservationSlot) => {
          const area = normalizeArea(slot);
          if (area) areaMap.set(area.id, area);
        });
        const nextAreas = Array.from(areaMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        if (!ignore) {
          setAreas(nextAreas);
          if (nextAreas.length > 0 && !nextAreas.find((a) => a.id === areaId)) {
            setAreaId(nextAreas[0].id);
          }
        }
      } catch (e) {
        if (!ignore) {
          setAreas([]);
          setError(e instanceof Error ? e.message : "Failed to load areas.");
        }
      }
    }

    loadAreas();
    return () => {
      ignore = true;
    };
  }, [baseUrl, companyId, todayISO]);

  useEffect(() => {
    if (!companyId || !date || !areaId) return;

    let ignore = false;
    async function loadSlots() {
      setLoading(true);
      setError("");
      try {
        const url = new URL(`${baseUrl}/reservations/slots/vacant`);
        url.searchParams.set("companyId", companyId);
        url.searchParams.set("from", date);
        url.searchParams.set("to", date);
        url.searchParams.set("areaId", areaId);
        const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
        if (!res.ok) {
          throw new Error(`Failed to load slots: ${res.status}`);
        }
        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.data ?? data?.documents ?? [];
        if (!ignore) setSlots(list);
      } catch (e) {
        if (!ignore) {
          setSlots([]);
          setError(e instanceof Error ? e.message : "Failed to load slots.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadSlots();
    return () => {
      ignore = true;
    };
  }, [areaId, baseUrl, companyId, date]);

  useEffect(() => {
    setTime("");
    setSelectedSlotId("");
  }, [areaId, date]);

  const availableSlots = useMemo(() => {
    const sorted = [...slots].sort((a, b) => toMin(a.time) - toMin(b.time));
    return sorted;
  }, [slots]);

  const selectedArea = areas.find((area) => area.id === areaId);
  const canContinueStep1 = Boolean(date && areaId && pax > 0 && selectedSlotId);
  const canConfirm = Boolean(name.trim() && phone.trim());

  function resetAll() {
    setStep(1);
    setDate(todayISO);
    setAreaId(areas[0]?.id ?? "");
    setPax(2);
    setTime("");
    setSelectedSlotId("");
    setName("");
    setPhone("");
    setEmail("");
    setNotes("");
  }

  async function handleConfirm() {
    setError("");
    if (!selectedSlotId) {
      setError("Please select a time slot.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        slotId: selectedSlotId,
        pax,
        reservationNotes: notes.trim() || undefined,
        customerName: name.trim(),
        customerMobileNumber: phone.trim(),
        customerEmail: email.trim() || undefined,
      };
      const res = await fetch(`${baseUrl}/reservations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || `Failed to submit reservation: ${res.status}`);
      }
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit reservation.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-amber-50 to-emerald-50 text-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <header className="mb-8 md:mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Table Reservation</h1>
          <p className="text-gray-600 mt-2">
            Choose your date, area, and time, then leave your details. Easy.
          </p>
        </header>

        <Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <Step n={1} label="Choose Date / Area / Time" active={step === 1} done={step > 1} />
            <Step n={2} label="Your Details" active={step === 2} done={step > 2} />
            <Step n={3} label="Confirmed" active={step === 3} done={false} />
          </div>
        </Card>

        <div className="mt-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <Card>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Date</label>
                        <input
                          type="date"
                          className="w-full rounded-xl border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
                          value={date}
                          min={todayISO}
                          onChange={(e) => setDate(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Guests</label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={pax}
                          onChange={(e) => setPax(Number(e.target.value))}
                          className="w-full rounded-xl border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          For larger groups, please contact us.
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Area</label>
                        {areas.length === 0 && !loading ? (
                          <div className="text-sm text-gray-500">No areas with vacant slots.</div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {areas.map((area) => (
                              <button
                                key={area.id}
                                onClick={() => setAreaId(area.id)}
                                className={
                                  "rounded-xl px-3 py-2 border text-left " +
                                  (areaId === area.id
                                    ? "border-black bg-black text-white"
                                    : "border-gray-300 hover:border-black")
                                }
                              >
                                <div className="text-sm font-semibold">{area.name}</div>
                                <div className="text-xs opacity-70">
                                  {area.slots ? `Up to ${area.slots} seats` : "See availability"}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Available time slots</label>
                      {loading ? (
                        <div className="text-sm text-gray-600">Loading...</div>
                      ) : error ? (
                        <div className="text-sm text-red-600">{error}</div>
                      ) : availableSlots.length === 0 ? (
                        <div className="text-sm text-gray-600">
                          No vacant slots for this area on the selected date.
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-auto pr-1">
                          {availableSlots.map((slot) => (
                            <button
                              key={slot.id}
                              className={
                                "rounded-xl border px-3 py-2 text-sm " +
                                (selectedSlotId === slot.id
                                  ? "bg-emerald-600 text-white border-emerald-700"
                                  : "border-gray-300 hover:border-emerald-600")
                              }
                              onClick={() => {
                                setTime(slot.time);
                                setSelectedSlotId(slot.id);
                              }}
                            >
                              {slot.time}
                            </button>
                          ))}
                        </div>
                      )}
                      {selectedArea?.timeAvailable ? (
                        <p className="text-xs text-gray-500 mt-2">{selectedArea.timeAvailable}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-gray-600">
                      Selected: {date} / {selectedArea?.name ?? "-"} / {time || "-"} / {pax} guest{
                        pax > 1 ? "s" : ""
                      }
                    </div>
                    <button
                      disabled={!canContinueStep1}
                      onClick={() => setStep(2)}
                      className={
                        "rounded-xl px-4 py-2 font-semibold " +
                        (canContinueStep1
                          ? "bg-black text-white hover:opacity-90"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed")
                      }
                    >
                      Continue
                    </button>
                  </div>
                </Card>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <Card>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Full Name*</label>
                        <input
                          type="text"
                          className="w-full rounded-xl border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
                          placeholder="Juan Dela Cruz"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Mobile Number*</label>
                        <input
                          type="tel"
                          className="w-full rounded-xl border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
                          placeholder="09xx xxx xxxx"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input
                          type="email"
                          className="w-full rounded-xl border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                      <textarea
                        rows={8}
                        className="w-full rounded-xl border-gray-300 focus:ring-2 focus:ring-black focus:border-black"
                        placeholder="Allergies, occasions, special requests..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                      <div className="mt-4 text-sm bg-amber-50 border border-amber-200 rounded-xl p-3">
                        <strong>Summary:</strong> {date} / {selectedArea?.name ?? "-"} / {time} / {pax} guest{
                          pax > 1 ? "s" : ""
                        }
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-6">
                    <button
                      onClick={() => setStep(1)}
                      className="rounded-xl px-4 py-2 border border-gray-300 hover:border-black"
                    >
                      Back
                    </button>
                    <button
                      disabled={!canConfirm || submitting}
                      onClick={handleConfirm}
                      className={
                        "rounded-xl px-4 py-2 font-semibold " +
                        (canConfirm && !submitting
                          ? "bg-black text-white hover:opacity-90"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed")
                      }
                    >
                      {submitting ? "Submitting..." : "Confirm Reservation"}
                    </button>
                  </div>

                  {error && <div className="text-sm text-red-600 mt-3">{error}</div>}
                </Card>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <Card>
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-600 text-white grid place-items-center text-2xl font-bold">
                      OK
                    </div>
                    <h2 className="text-2xl font-extrabold">Reservation Confirmed</h2>
                    <p className="text-gray-600 max-w-xl mx-auto">
                      Thanks, {name || "Guest"}! We have saved your table. A confirmation has been
                      prepared below; in a real app this would also be sent via SMS / email.
                    </p>

                    <div className="text-left max-w-xl mx-auto bg-gray-50 border border-gray-200 rounded-2xl p-4">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-gray-500">Name</div>
                        <div className="font-semibold">{name || "-"}</div>
                        <div className="text-gray-500">Mobile</div>
                        <div className="font-semibold">{phone || "-"}</div>
                        <div className="text-gray-500">Email</div>
                        <div className="font-semibold">{email || "-"}</div>
                        <div className="text-gray-500">Date</div>
                        <div className="font-semibold">{date}</div>
                        <div className="text-gray-500">Time</div>
                        <div className="font-semibold">{time}</div>
                        <div className="text-gray-500">Area</div>
                        <div className="font-semibold">{selectedArea?.name ?? "-"}</div>
                        <div className="text-gray-500">Guests</div>
                        <div className="font-semibold">{pax}</div>
                        <div className="text-gray-500">Notes</div>
                        <div className="font-semibold whitespace-pre-wrap">{notes || "-"}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button
                        onClick={() => setStep(1)}
                        className="rounded-xl px-4 py-2 border border-gray-300 hover:border-black"
                      >
                        Make Another Booking
                      </button>
                      <button
                        onClick={resetAll}
                        className="rounded-xl px-4 py-2 bg-black text-white hover:opacity-90"
                      >
                        Start Over
                      </button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-6 text-xs text-gray-500 space-y-1">
          <p>Powered by the reservations public API.</p>
        </div>
      </div>
    </div>
  );
}
