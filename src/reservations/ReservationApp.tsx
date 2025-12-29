import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Button,
  Card,
  CardBody,
  Chip,
  RadioGroup,
  SelectItem,
  VisuallyHidden,
  Spinner,
  cn,
  useRadio,
  CardHeader,
  CardFooter,
} from "@heroui/react";
import type { RadioProps } from "@heroui/react";
import { Input, Select, Textarea } from "../ui/heroui";

type CustomRadioProps = RadioProps & { media?: React.ReactNode };

const CustomRadio = ({ media, ...props }: CustomRadioProps) => {
  const {
    Component,
    children,
    description,
    getBaseProps,
    getWrapperProps,
    getInputProps,
    getLabelProps,
    getLabelWrapperProps,
    getControlProps,
  } = useRadio(props);

  return (
    <Component
      {...getBaseProps({
        className: cn(
          "group relative inline-flex w-full cursor-pointer select-none flex-col gap-3",
          "rounded-2xl border-2 border-slate-200 bg-white p-3 text-center",
          "transition-all hover:border-slate-300 hover:shadow-sm",
          "data-[selected=true]:border-sky-500 data-[selected=true]:bg-sky-50 data-[selected=true]:shadow-md"
        ),
      })}
    >
      <VisuallyHidden>
        <input {...getInputProps()} />
      </VisuallyHidden>
      <span {...getWrapperProps()} className="sr-only">
        <span {...getControlProps()} />
      </span>
      <div {...getLabelWrapperProps()} className="ms-0 ml-0">
        <div className="rounded-xl border border-slate-200 p-2 transition-colors group-data-[selected=true]:border-sky-500 group-data-[selected=true]:bg-sky-50">
          {media}
          {children && (
            <span
              {...getLabelProps()}
              className="mt-2 block text-sm font-semibold text-slate-800 group-data-[selected=true]:text-sky-600"
            >
              {children}
            </span>
          )}
          {description && (
            <span className="block text-xs text-slate-500">{description}</span>
          )}
        </div>
      </div>
    </Component>
  );
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

type ReservationPreferences = {
  slotDurationMinutes?: number | null;
  openingHour?: number | null;
  closingHour?: number | null;
  maxPartySize?: number | null;
  confirmationRequired?: boolean | null;
  externalSlug?: string | null;
  preConfirmationNotes?: string | null;
};

type ReservationCompany = {
  id?: string | null;
  name?: string | null;
  address?: string | null;
};

type PreferencesResponse = {
  company?: ReservationCompany | null;
  preferences?: ReservationPreferences | null;
  areas?: ReservationArea[] | null;
};

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
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
  const [areasLoading, setAreasLoading] = useState(true);
  const [preferences, setPreferences] = useState<ReservationPreferences | null>(null);
  const [company, setCompany] = useState<ReservationCompany | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [slotsLoaded, setSlotsLoaded] = useState(false);
  const [error, setError] = useState("");

  const didLoadPreferencesRef = useRef(false);
  const lastSlotQueryRef = useRef<string>("");

  useEffect(() => {
    const title = company?.name ? `${company.name} Reservations` : "Reservations";
    document.title = title;
  }, [company?.name]);

  useEffect(() => {
    if (!companyId) {
      setAreasLoading(false);
      setError("Missing company id.");
      return;
    }
    if (didLoadPreferencesRef.current) return;

    const controller = new AbortController();
    let ignore = false;

    async function loadPreferences() {
      setAreasLoading(true);
      setError("");
      try {
        const res = await fetch(`${baseUrl}/public/reservations/preferences/${companyId}`, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`Failed to load areas: ${res.status}`);
        }
        const data = (await res.json()) as PreferencesResponse;
        if (ignore) return;
        setCompany(data.company ?? null);
        setPreferences(data.preferences ?? null);
        setAreas(Array.isArray(data.areas) ? data.areas : []);
        didLoadPreferencesRef.current = true;
      } catch (e) {
        if (controller.signal.aborted || ignore) return;
        setAreas([]);
        setError(e instanceof Error ? e.message : "Failed to load areas.");
      } finally {
        if (!controller.signal.aborted && !ignore) setAreasLoading(false);
      }
    }

    loadPreferences();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [baseUrl, companyId]);

  useEffect(() => {
    if (!companyId || !date || !areaId) return;

    const queryKey = `${companyId}|${areaId}|${date}`;
    if (lastSlotQueryRef.current === queryKey) return;
    lastSlotQueryRef.current = queryKey;

    let ignore = false;
    async function loadSlots() {
      setLoading(true);
      setSlotsLoaded(false);
      setError("");
      try {
        const url = new URL(`${baseUrl}/reservations/slots/vacant`);
        url.searchParams.set("companyId", company?.id || companyId);
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
        if (!ignore) {
          setSlotsLoaded(true);
          setLoading(false);
        }
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
    setSlots([]);
    setSlotsLoaded(false);
  }, [areaId, date]);

  const availableSlots = useMemo(() => {
    return [...slots].sort((a, b) => toMin(a.time) - toMin(b.time));
  }, [slots]);

  const dateOptions = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "short",
      day: "2-digit",
    });
    return Array.from({ length: 60 }, (_, i) => {
      const next = new Date();
      next.setDate(next.getDate() + i);
      const iso = next.toISOString().slice(0, 10);
      return { value: iso, label: formatter.format(next) };
    });
  }, []);

  const guestOptions = useMemo(
    () => Array.from({ length: 19 }, (_, i) => String(i + 2)),
    []
  );

  const selectedArea = areas.find((area) => area.id === areaId);
  const maxPartySize = preferences?.maxPartySize ?? 20;
  const slotDuration = preferences?.slotDurationMinutes ?? null;

  const canContinueStep1 = Boolean(date && areaId && pax > 0 && selectedSlotId);
  const canConfirm = Boolean(name.trim() && phone.trim());

  function resetAll() {
    setStep(1);
    setDate(todayISO);
    setAreaId("");
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
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit reservation.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-blue-50 to-cyan-50 text-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <header className="mb-4 md:mb-6">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Table Reservation</h1>
          <p className="text-gray-600 mt-2">
            {company?.name ? `Reserve at ${company.name}.` : "Choose your date, area, and time."}
          </p>
        </header>

        <div>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
                  <CardHeader className="pt-5">
                    <Chip color="primary" variant="flat" size="lg" className="mr-3">1</Chip><h2 className="text-xl font-extrabold text-gray-700">Reservation Date</h2>
                  </CardHeader>
                  <CardBody className="grid md:grid-cols-2 gap-6">

                    <div className="space-y-4">
                      <Select
                        label="Date"
                        size="lg"
                        selectedKeys={date ? new Set([date]) : new Set()}
                        onSelectionChange={(keys) => {
                          const next = keys === "all" ? "" : Array.from(keys)[0] || "";
                          if (next) setDate(next);
                        }}
                      >
                        {dateOptions.map((option) => (
                          <SelectItem key={option.value} textValue={option.value}>
                                <div className="flex gap-2 items-center">
                                  
                                    <span className="text-medium">{option.label}</span>
                                  
                                </div>
                          </SelectItem>
                        ))}
                      </Select>

                      <Select
                        label="Guests"
                        size="lg"
                        selectedKeys={new Set([String(pax)])}
                        onSelectionChange={(keys) => {
                          const next = keys === "all" ? "" : Array.from(keys)[0] || "";
                          const parsed = Number(next);
                          if (!Number.isNaN(parsed)) setPax(parsed);
                        }}
                        description={`Max party size: ${maxPartySize}`}
                      >
                        {guestOptions
                          .filter((count) => Number(count) <= maxPartySize)
                          .map((count) => (
                            <SelectItem key={count} textValue={count}>
                                <div className="flex gap-2 items-cente p-1">
                                  <div className="flex flex-col">
                                    <span className="text-medium">{count}</span>
                                  </div>
                                </div>
                            </SelectItem>
                          ))}
                      </Select>

                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">Area</div>
                        {areasLoading ? (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Spinner size="sm" />
                            Loading areas...
                          </div>
                        ) : areas.length === 0 ? (
                          <div className="text-sm text-gray-500">No areas published yet.</div>
                        ) : (
                          <RadioGroup
                            value={areaId}
                            onValueChange={setAreaId}
                            classNames={{ wrapper: "grid grid-cols-2 gap-4" }}
                          >
                            {areas.map((area) => (
                              <CustomRadio
                                key={area.id}
                                value={area.id}
                                media={
                                  area.photoUrl ? (
                                    <img
                                      src={area.photoUrl}
                                      alt={area.name}
                                      className="aspect-[4/3] w-full rounded-xl object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="aspect-[4/3] w-full rounded-xl bg-gradient-to-br from-slate-200 to-slate-100" />
                                  )
                                }
                                description={
                                  (area.slots ? `Up to ${area.slots} seats` : "See availability")
                                }
                              >
                                {area.name}
                              </CustomRadio>
                            ))}
                          </RadioGroup>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        Available time slots
                      </div>
                      {!areaId ? (
                        <div className="text-sm text-gray-600">Select an area to see times.</div>
                      ) : loading ? (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Spinner size="sm" />
                          Loading...
                        </div>
                      ) : error ? (
                        <div className="text-sm text-red-600">{error}</div>
                      ) : slotsLoaded && availableSlots.length === 0 ? (
                        <div className="text-sm text-gray-600">
                          No vacant slots for this area on the selected date.
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 overflow-auto pr-1">
                          {availableSlots.map((slot) => (
                            <Button
                              key={slot.id}
                              size="md"
                              variant={selectedSlotId === slot.id ? "solid" : "bordered"}
                              color={selectedSlotId === slot.id ? "primary" : "default"}
                              onPress={() => {
                                setTime(slot.time);
                                setSelectedSlotId(slot.id);
                              }}
                            >
                              {slot.time}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardBody>
                  <CardFooter>
                    <div className="w-full flex items-center justify-between mt-6">
                      <div></div>
                      {/* <div className="text-sm text-gray-600">
                        Selected: {date} / {selectedArea?.name ?? "-"} / {time || "-"} / {pax} guest{
                          pax > 1 ? "s" : ""
                        }
                      </div> */}
                      <Button
                        color="primary"
                        isDisabled={!canContinueStep1}
                        onPress={() => setStep(2)}
                        size="lg"
                      >
                        Continue
                      </Button>
                    </div>
                  </CardFooter>
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
                <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
                  <CardBody className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <Input
                        label="Full Name"
                        isRequired
                        placeholder="Juan Dela Cruz"
                        value={name}
                        onValueChange={setName}
                      />
                      <Input
                        label="Mobile Number"
                        isRequired
                        type="tel"
                        placeholder="09xx xxx xxxx"
                        value={phone}
                        onValueChange={setPhone}
                      />
                      <Input
                        label="Email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onValueChange={setEmail}
                      />
                    </div>

                    <div>
                      <Textarea
                        label="Notes (optional)"
                        minRows={8}
                        placeholder="Allergies, occasions, special requests..."
                        value={notes}
                        onValueChange={setNotes}
                      />
                      <Card className="mt-4 bg-amber-50 border border-amber-200">
                        <CardBody className="text-sm">
                          <strong>Summary:</strong> {date} / {selectedArea?.name ?? "-"} / {time} / {pax} guest{
                            pax > 1 ? "s" : ""
                          }
                        </CardBody>
                      </Card>
                    </div>
                  </CardBody>

                  <div className="flex items-center justify-between mt-6 p-3">
                    <Button variant="bordered" onPress={() => setStep(1)}>
                      Back
                    </Button>
                    <Button
                      color="primary"
                      isDisabled={!canConfirm}
                      onPress={() => setStep(3)}
                    >
                      Review Reservation
                    </Button>
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
                <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
                  <CardHeader className="pt-5">
                    <Chip color="primary" variant="flat" size="lg" className="mr-3">
                      3
                    </Chip>
                    <h2 className="text-xl font-extrabold text-gray-700">Confirm Reservation</h2>
                  </CardHeader>
                  <CardBody className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <Card className="border border-slate-200 shadow-sm">
                        <CardBody className="space-y-2 text-sm">
                          <div className="text-gray-500">Reservation</div>
                          <div className="text-base font-semibold text-gray-900">
                            {date} • {time || "-"} • {pax} guest{pax > 1 ? "s" : ""}
                          </div>
                        </CardBody>
                      </Card>

                      <Card className="border border-slate-200 shadow-sm">
                        <CardBody className="space-y-3 text-sm">
                          <div className="text-gray-500">Area</div>
                          {selectedArea?.photoUrl ? (
                            <img
                              src={selectedArea.photoUrl}
                              alt={selectedArea.name ?? "Reservation area"}
                              className="aspect-[4/3] w-full rounded-xl object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="aspect-[4/3] w-full rounded-xl bg-gradient-to-br from-slate-200 to-slate-100" />
                          )}
                          <div className="text-base font-semibold text-gray-900">
                            {selectedArea?.name ?? "-"}
                          </div>
                        </CardBody>
                      </Card>
                    </div>

                    <div className="space-y-4">
                      {preferences?.preConfirmationNotes ? (
                        <Card className="border border-sky-200 bg-sky-50/60 shadow-sm">
                          <CardBody className="space-y-2 text-sm">
                            <div className="text-sky-700 font-semibold">Please note</div>
                            <div className="text-sky-800 whitespace-pre-wrap">
                              {preferences.preConfirmationNotes}
                            </div>
                          </CardBody>
                        </Card>
                      ) : null}

                      <Card className="border border-slate-200 shadow-sm">
                        <CardBody className="space-y-2 text-sm">
                          <div className="text-gray-500">Guest Details</div>
                          <div className="font-semibold text-gray-900">{name || "-"}</div>
                          <div className="text-gray-600">{phone || "-"}</div>
                          {email ? <div className="text-gray-600">{email}</div> : null}
                          {notes ? (
                            <div className="text-gray-600 whitespace-pre-wrap">{notes}</div>
                          ) : null}
                        </CardBody>
                      </Card>
                    </div>
                  </CardBody>

                  <div className="flex items-center justify-between mt-6 p-3">
                    <Button variant="bordered" onPress={() => setStep(2)}>
                      Back
                    </Button>
                    <Button color="primary" isLoading={submitting} onPress={handleConfirm}>
                      Confirm Reservation
                    </Button>
                  </div>

                  {error && <div className="text-sm text-red-600 mt-3">{error}</div>}
                </Card>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
                  <CardBody className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-600 text-white grid place-items-center text-2xl font-bold">
                      OK
                    </div>
                    <h2 className="text-2xl font-extrabold">Reservation Confirmed</h2>
                    <p className="text-gray-600 max-w-xl mx-auto">
                      Thanks, {name || "Guest"}! We have saved your table. A confirmation has been
                      prepared below; in a real app this would also be sent via SMS / email.
                    </p>

                    <Card className="text-left max-w-xl mx-auto bg-gray-50 border border-gray-200">
                      <CardBody className="p-4">
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
                      </CardBody>
                    </Card>
                  </CardBody>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
