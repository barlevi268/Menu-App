import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button, cn } from "@heroui/react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  ImagePlus,
  MapPinned,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { Input, Textarea } from "../ui/heroui";
import type { GridRect } from "./gridLayout";

const AREAS_KEY = "reservation-by-table:areas";
const FLOORPLAN_KEY = "reservation-floorplan:layout";

const TABLE_COLS = 96;
const TABLE_ROWS = 64;
const LONG_AXIS = 96;
const SHORT_AXIS = 64;
const OBJECT_STRIPE = 3;

const PALETTE = [
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#f43f5e",
  "#14b8a6",
  "#6366f1",
  "#f97316",
];

const TIME_SLOTS = [
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
];

const STEPS = [
  "date",
  "time",
  "area",
  "table",
  "tableDetails",
  "guest",
  "payment",
  "success",
] as const;

const SHOW_PROGRESS = false;

type Step = (typeof STEPS)[number];
type Kind = "table" | "object";
type Shape =
  | "square"
  | "circle"
  | "l-shape"
  | "c-shape"
  | "image"
  | "label"
  | "separator";

type DayRate = { price: number; downpayment: number };

type TableItem = GridRect & {
  id: string;
  kind: Kind;
  shape: Shape;
  rotation: number;
  name: string;
  capacity: number;
  rates: DayRate[];
  picture: string | null;
  pictureUrl?: string | null;
  imageAspectRatio?: number;
  description: string;
};

type Area = {
  id: string;
  name: string;
  items: TableItem[];
};

type FloorplanItem = GridRect & {
  id: string;
  areaId: string;
};

type FloorplanLayout = {
  background: string | null;
  orientation: "horizontal" | "vertical";
  items: FloorplanItem[];
};

type CustomerDetails = {
  name: string;
  phone: string;
  email: string;
  notes: string;
};

type ReservationPreferences = {
  slotDurationMinutes?: number | null;
  openingHour?: number | null;
  closingHour?: number | null;
  maxPartySize?: number | null;
};

type ReservationCompany = {
  id?: string | null;
  name?: string | null;
  address?: string | null;
};

type PreferencesResponse = {
  company?: ReservationCompany | null;
  preferences?: ReservationPreferences | null;
};

type LayoutResponse = {
  schemaVersion: 1;
  companyId: string;
  floorplan: {
    orientation: "horizontal" | "vertical";
    backgroundImageUrl?: string | null;
    background?: string | null;
    items: FloorplanItem[];
  };
  areas: Array<{
    id: string;
    name: string;
    items: TableItem[];
  }>;
};

type ReservationSlot = {
  id: string;
  date: string;
  time: string;
  areaId?: string;
  area_id?: string;
  tableId?: string | null;
};

type ReservationPayment = {
  amount?: number | null;
  status?: "unpaid" | "paid" | "failed" | string | null;
  paymentLink?: string | null;
  currency?: string | null;
};

type ConfirmationResponse = {
  date?: string | null;
  time?: string | null;
  area?: { id?: string | null; name?: string | null; picture?: string | null } | null;
  customerName?: string | null;
};

type RouteContext = {
  companyIdOrSlug: string;
  confirmationSlotId: string | null;
};

const slide = {
  initial: { opacity: 0, x: 28, scale: 0.98 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: -28, scale: 0.98 },
  transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const },
};

const normalizeRotation = (rotation = 0) => ((rotation % 360) + 360) % 360;

const toLocalISODate = (date: Date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatDateLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${iso}T00:00:00`));

const formatTimeLabel = (hhmm: string) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(`2026-01-01T${hhmm}:00`));

const getRouteContext = (): RouteContext => {
  const params = new URLSearchParams(window.location.search);
  const segments = window.location.pathname.split("/").filter(Boolean);
  const paramCompanyId =
    params.get("companyId") ||
    params.get("companyID") ||
    params.get("id") ||
    params.get("cid") ||
    "";
  const fallbackCompanyId = import.meta.env.VITE_COMPANY_ID || "";

  if (segments[0] === "reservations" && segments[1] === "confirmation") {
    return {
      confirmationSlotId: segments[2] || params.get("slotId") || null,
      companyIdOrSlug: paramCompanyId || fallbackCompanyId,
    };
  }

  if (segments[0] === "table-reservation" || segments[0] === "reserve-table") {
    return {
      confirmationSlotId: null,
      companyIdOrSlug: paramCompanyId || segments[1] || fallbackCompanyId,
    };
  }

  return {
    confirmationSlotId: params.get("slotId"),
    companyIdOrSlug: paramCompanyId || fallbackCompanyId,
  };
};

const getResponseError = async (res: Response) => {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const data = await res.json();
      return data?.message ? String(data.message) : JSON.stringify(data);
    } catch {
      /* ignore malformed error body */
    }
  }
  const text = await res.text().catch(() => "");
  return text || `Request failed with status ${res.status}`;
};

const parseListResponse = async (res: Response) => {
  const data = await res.json();
  return Array.isArray(data) ? data : data?.data ?? data?.documents ?? [];
};

const buildTimeSlots = (preferences: ReservationPreferences | null) => {
  const openingHour = preferences?.openingHour ?? 11;
  const closingHour = preferences?.closingHour ?? 22;
  const duration = preferences?.slotDurationMinutes ?? 30;
  const start = Math.max(0, openingHour * 60);
  const end = Math.min(24 * 60, closingHour * 60);
  if (duration <= 0 || start >= end) return TIME_SLOTS;

  const slots: string[] = [];
  for (let minutes = start; minutes + duration <= end; minutes += duration) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    slots.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
  }
  return slots.length ? slots : TIME_SLOTS;
};

const emptyRates = (): DayRate[] =>
  Array.from({ length: 7 }, () => ({ price: 0, downpayment: 0 }));

const normalizeItems = (items: Array<Partial<TableItem>> = []) =>
  items.map((item) => ({
    ...item,
    id: item.id ?? `item_${Math.random().toString(36).slice(2)}`,
    kind: item.kind ?? "table",
    shape: item.shape ?? "square",
    col: item.col ?? 0,
    row: item.row ?? 0,
    w: item.w ?? 8,
    h: item.h ?? 8,
    rotation: item.rotation ?? 0,
    capacity: item.capacity ?? 2,
    name: item.name ?? "Table",
    rates:
      Array.isArray(item.rates) && item.rates.length >= 7
        ? item.rates
        : emptyRates(),
    picture: item.picture ?? item.pictureUrl ?? null,
    pictureUrl: item.pictureUrl ?? item.picture ?? null,
    description: item.description ?? "",
  })) as TableItem[];

const normalizeLayout = (layout: LayoutResponse) => ({
  areas:
    Array.isArray(layout.areas) && layout.areas.length
      ? layout.areas.map((area) => ({
          id: area.id,
          name: area.name,
          items: normalizeItems(area.items ?? []),
        }))
      : [{ id: "area-default", name: "Area 1", items: [] }],
  floorplan: {
    background: layout.floorplan?.backgroundImageUrl ?? layout.floorplan?.background ?? null,
    orientation: layout.floorplan?.orientation ?? "horizontal",
    items: Array.isArray(layout.floorplan?.items) ? layout.floorplan.items : [],
  } satisfies FloorplanLayout,
});

const readConfig = () => {
  let areas: Area[] = [{ id: "area-default", name: "Area 1", items: [] }];
  let floorplan: FloorplanLayout = {
    background: null,
    orientation: "horizontal",
    items: [],
  };

  try {
    const rawAreas = window.localStorage.getItem(AREAS_KEY);
    if (rawAreas) {
      const parsed = JSON.parse(rawAreas) as Area[];
      if (Array.isArray(parsed) && parsed.length) {
        areas = parsed.map((area) => ({
          id: area.id,
          name: area.name,
          items: normalizeItems(area.items ?? []),
        }));
      }
    }

    const rawFloorplan = window.localStorage.getItem(FLOORPLAN_KEY);
    if (rawFloorplan) {
      const parsed = JSON.parse(rawFloorplan) as Partial<FloorplanLayout>;
      floorplan = {
        background: parsed.background ?? null,
        orientation: parsed.orientation ?? "horizontal",
        items: Array.isArray(parsed.items) ? parsed.items : [],
      };
    }
  } catch {
    /* ignore malformed local storage */
  }

  return { areas, floorplan };
};

const layerFor = (item: TableItem) =>
  item.kind === "table" ? "table" : item.shape === "label" ? "label" : "shape";

const objectZ = (item: TableItem) =>
  layerFor(item) === "shape" ? 10 : layerFor(item) === "label" ? 20 : 30;

const polygonPath = (pts: number[][]) =>
  pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ") +
  " Z";

function lcPolygon(
  shape: Shape,
  W: number,
  H: number,
  t: number,
  rotation: number
) {
  if (shape === "l-shape") {
    switch (normalizeRotation(rotation)) {
      case 90:
        return [[0, 0], [W, 0], [W, t], [t, t], [t, H], [0, H]];
      case 180:
        return [[0, 0], [W, 0], [W, H], [W - t, H], [W - t, t], [0, t]];
      case 270:
        return [[W, 0], [W, H], [0, H], [0, H - t], [W - t, H - t], [W - t, 0]];
      default:
        return [[0, 0], [t, 0], [t, H - t], [W, H - t], [W, H], [0, H]];
    }
  }

  switch (normalizeRotation(rotation)) {
    case 90:
      return [[0, 0], [W, 0], [W, H], [W - t, H], [W - t, t], [t, t], [t, H], [0, H]];
    case 180:
      return [[0, 0], [W, 0], [W, H], [0, H], [0, H - t], [W - t, H - t], [W - t, t], [0, t]];
    case 270:
      return [[0, 0], [0, H], [W, H], [W, 0], [W - t, 0], [W - t, H - t], [t, H - t], [t, 0]];
    default:
      return [[0, 0], [W, 0], [W, t], [t, t], [t, H - t], [W, H - t], [W, H], [0, H]];
  }
}

export default function TableReservationCustomerApp() {
  const baseUrl = useMemo(
    () => import.meta.env.VITE_API_BASE_URL || "https://api.orda.co",
    []
  );
  const route = useMemo(getRouteContext, []);

  if (route.confirmationSlotId) {
    return (
      <ReservationConfirmationScreen
        baseUrl={baseUrl}
        slotId={route.confirmationSlotId}
      />
    );
  }

  return <ReservationBookingFlow baseUrl={baseUrl} companyIdOrSlug={route.companyIdOrSlug} />;
}

function ReservationBookingFlow({
  baseUrl,
  companyIdOrSlug,
}: {
  baseUrl: string;
  companyIdOrSlug: string;
}) {
  const [config, setConfig] = useState(readConfig);
  const todayISO = useMemo(() => toLocalISODate(new Date()), []);

  const [step, setStep] = useState<Step>("date");
  const [direction, setDirection] = useState(1);
  const [date, setDate] = useState(todayISO);
  const [time, setTime] = useState("");
  const [areaId, setAreaId] = useState("");
  const [tableId, setTableId] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [details, setDetails] = useState<CustomerDetails>({
    name: "",
    phone: "",
    email: "",
    notes: "",
  });
  const [paying, setPaying] = useState(false);
  const [layoutLoading, setLayoutLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [company, setCompany] = useState<ReservationCompany | null>(null);
  const [preferences, setPreferences] = useState<ReservationPreferences | null>(null);
  const [resolvedCompanyId, setResolvedCompanyId] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<ReservationSlot | null>(null);
  const [slotLoadingTableId, setSlotLoadingTableId] = useState<string | null>(null);
  const [slotError, setSlotError] = useState("");
  const [submittedPayment, setSubmittedPayment] = useState<ReservationPayment | null>(null);
  const [submittedSlotId, setSubmittedSlotId] = useState<string | null>(null);

  const { areas, floorplan } = config;

  useEffect(() => {
    if (!companyIdOrSlug) {
      setLayoutLoading(false);
      setApiError("Missing company id.");
      return;
    }

    const controller = new AbortController();
    let ignore = false;

    async function loadReservationConfig() {
      setLayoutLoading(true);
      setApiError("");
      try {
        const [preferencesRes, layoutRes] = await Promise.all([
          fetch(`${baseUrl}/public/reservations/preferences/${companyIdOrSlug}`, {
            headers: { Accept: "application/json" },
            signal: controller.signal,
          }),
          fetch(`${baseUrl}/public/reservations/layout/${companyIdOrSlug}`, {
            headers: { Accept: "application/json" },
            signal: controller.signal,
          }),
        ]);

        if (!preferencesRes.ok) throw new Error(await getResponseError(preferencesRes));
        if (!layoutRes.ok) throw new Error(await getResponseError(layoutRes));

        const preferencesData = (await preferencesRes.json()) as PreferencesResponse;
        const layoutData = (await layoutRes.json()) as LayoutResponse;
        if (ignore) return;

        setCompany(preferencesData.company ?? null);
        setPreferences(preferencesData.preferences ?? null);
        setResolvedCompanyId(layoutData.companyId || preferencesData.company?.id || companyIdOrSlug);
        setConfig(normalizeLayout(layoutData));
      } catch (error) {
        if (controller.signal.aborted || ignore) return;
        setApiError(error instanceof Error ? error.message : "Failed to load reservation layout.");
      } finally {
        if (!controller.signal.aborted && !ignore) setLayoutLoading(false);
      }
    }

    loadReservationConfig();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [baseUrl, companyIdOrSlug]);

  useEffect(() => {
    setTableId("");
    setSelectedSlot(null);
    setSlotError("");
  }, [date, time, areaId]);

  const dateOptions = useMemo(
    () =>
      Array.from({ length: 14 }, (_, index) => {
        const next = new Date();
        next.setDate(next.getDate() + index);
        return toLocalISODate(next);
      }),
    []
  );
  const timeOptions = useMemo(() => buildTimeSlots(preferences), [preferences]);

  const activeStepIndex = STEPS.indexOf(step);
  const selectedArea = areas.find((area) => area.id === areaId) ?? null;
  const selectedTable =
    selectedArea?.items.find((item) => item.id === tableId && item.kind === "table") ??
    null;
  const dayIndex = new Date(`${date}T00:00:00`).getDay();
  const selectedRate = selectedTable?.rates[dayIndex] ?? {
    price: 0,
    downpayment: 0,
  };
  const guestDetailsReady = Boolean(details.name.trim() && details.phone.trim());

  const goTo = (nextStep: Step) => {
    setDirection(STEPS.indexOf(nextStep) > activeStepIndex ? 1 : -1);
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    const previous = STEPS[Math.max(0, activeStepIndex - 1)];
    if (previous && previous !== step) goTo(previous);
  };

  const selectTable = async (nextTableId: string) => {
    if (!selectedArea || !resolvedCompanyId || !time) return;
    setSlotLoadingTableId(nextTableId);
    setSlotError("");
    setTableId("");
    setSelectedSlot(null);

    try {
      const url = new URL(`${baseUrl}/reservations/slots/vacant`);
      url.searchParams.set("companyId", resolvedCompanyId);
      url.searchParams.set("areaId", selectedArea.id);
      url.searchParams.set("tableId", nextTableId);
      url.searchParams.set("from", date);
      url.searchParams.set("to", date);
      const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(await getResponseError(res));

      const slots = (await parseListResponse(res)) as ReservationSlot[];
      const matchingSlot = slots.find((slot) => slot.time === time);
      if (!matchingSlot) {
        const tableName =
          selectedArea.items.find((item) => item.id === nextTableId)?.name ?? "This table";
        setSlotError(`${tableName} is not available at ${formatTimeLabel(time)}.`);
        return;
      }

      setTableId(nextTableId);
      setSelectedSlot(matchingSlot);
    } catch (error) {
      setSlotError(error instanceof Error ? error.message : "Failed to check table availability.");
    } finally {
      setSlotLoadingTableId(null);
    }
  };

  const completePayment = async () => {
    if (!selectedSlot || !selectedArea || !selectedTable) {
      setApiError("Please select an available table before continuing.");
      return;
    }

    setPaying(true);
    setApiError("");

    try {
      const payload = {
        slotId: selectedSlot.id,
        tableId: selectedTable.id,
        pax: partySize,
        reservationNotes: details.notes.trim() || undefined,
        customerName: details.name.trim(),
        customerMobileNumber: details.phone.trim() || undefined,
        customerEmail: details.email.trim() || undefined,
        reservationPrice: selectedRate.price,
        downpaymentAmount: selectedRate.downpayment,
      };

      const res = await fetch(`${baseUrl}/reservations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await getResponseError(res));

      const data = await res.json();
      const payment = data?.payment as ReservationPayment | undefined;
      const slotId = data?.id ?? data?.slotId ?? selectedSlot.id;
      const paymentLink = payment?.paymentLink ?? data?.paymentLink ?? null;

      setSubmittedSlotId(slotId);
      setSubmittedPayment(payment ?? null);

      if (selectedRate.downpayment > 0) {
        if (!paymentLink) {
          throw new Error("Payment link was not returned. Please try again.");
        }
        window.location.assign(paymentLink);
        return;
      }

      goTo("success");
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Failed to submit reservation.");
    } finally {
      setPaying(false);
    }
  };

  const stepTitle = {
    date: "Pick your date",
    time: "Pick a time",
    area: "Choose your zone",
    table: "Tap your table",
    tableDetails: "Table details",
    guest: "Almost there",
    payment: "Secure your spot",
    success: "You are booked",
  }[step];

  const footerCta:
    | { label: string; disabled?: boolean; loading?: boolean; onPress: () => void }
    | null = (() => {
    switch (step) {
      case "date":
        return { label: "Pick a time", onPress: () => goTo("time") };
      case "time":
        return { label: "Choose area", disabled: !time, onPress: () => goTo("area") };
      case "area":
        return { label: "Pick table", disabled: !areaId, onPress: () => goTo("table") };
      case "table":
        return {
          label: "See table details",
          disabled: !tableId || !selectedSlot || Boolean(slotLoadingTableId),
          onPress: () => goTo("tableDetails"),
        };
      case "tableDetails":
        return selectedTable ? { label: "Continue", onPress: () => goTo("guest") } : null;
      case "guest":
        return {
          label: "Go to payment",
          disabled: !guestDetailsReady,
          onPress: () => goTo("payment"),
        };
      case "payment":
        return selectedTable && selectedArea
          ? {
              label:
                selectedRate.downpayment > 0
                  ? `Pay ${formatMoney(selectedRate.downpayment)}`
                  : "Confirm booking",
              loading: paying,
              disabled: paying,
              onPress: completePayment,
            }
          : null;
      default:
        return null;
    }
  })();

  return (
    <div className="min-h-screen bg-[#f6fbfb] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col overflow-hidden">
        <header className="sticky top-0 z-40 border-b border-white/70 bg-[#f6fbfb]/90 px-4 pb-3 pt-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={goBack}
              disabled={step === "date" || step === "success"}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition",
                (step === "date" || step === "success") && "pointer-events-none opacity-0"
              )}
            >
              <ArrowLeft size={18} />
            </button>
            <div className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 shadow-sm">
              Reserve
            </div>
            <div className="h-10 w-10" />
          </div>

          {SHOW_PROGRESS && step !== "success" && (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-400">
                <span>Step {Math.min(activeStepIndex + 1, 7)} of 7</span>
                <span>{Math.round(((activeStepIndex + 1) / 7) * 100)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                <motion.div
                  className="h-full rounded-full bg-emerald-500"
                  animate={{ width: `${Math.min(((activeStepIndex + 1) / 7) * 100, 100)}%` }}
                  transition={{ type: "spring", stiffness: 260, damping: 28 }}
                />
              </div>
            </div>
          )}
        </header>

        <main className="flex-1 px-4 pb-28 pt-5">
          {layoutLoading && (
            <div className="mb-4">
              <EmptyState title="Loading reservation map" copy="Fetching live table availability." />
            </div>
          )}
          {apiError && (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {apiError}
            </div>
          )}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.section
              key={step}
              custom={direction}
              initial={{ opacity: 0, x: direction > 0 ? 36 : -36, scale: 0.98 }}
              animate={slide.animate}
              exit={{ opacity: 0, x: direction > 0 ? -36 : 36, scale: 0.98 }}
              transition={slide.transition}
              className="min-h-[70vh]"
            >
              <HeroHeader title={stepTitle} />

              {step === "date" && (
                <DateStep
                  date={date}
                  dates={dateOptions}
                  partySize={partySize}
                  onDate={setDate}
                  onPartySize={setPartySize}
                />
              )}

              {step === "time" && (
                <TimeStep
                  date={date}
                  time={time}
                  times={timeOptions}
                  onTime={setTime}
                />
              )}

              {step === "area" && (
                <AreaStep
                  areas={areas}
                  floorplan={floorplan}
                  areaId={areaId}
                  onArea={(id) => {
                    setAreaId(id);
                    setTableId("");
                  }}
                />
              )}

              {step === "table" && (
                <TableStep
                  area={selectedArea}
                  tableId={tableId}
                  partySize={partySize}
                  loadingTableId={slotLoadingTableId}
                  slotError={slotError}
                  onTable={selectTable}
                />
              )}

              {step === "tableDetails" && selectedTable && (
                <TableDetailsStep
                  table={selectedTable}
                  date={date}
                  time={time}
                  partySize={partySize}
                  rate={selectedRate}
                />
              )}

              {step === "guest" && (
                <GuestStep
                  details={details}
                  onDetails={setDetails}
                />
              )}

              {step === "payment" && selectedTable && selectedArea && (
                <PaymentStep
                  date={date}
                  time={time}
                  area={selectedArea}
                  table={selectedTable}
                  partySize={partySize}
                  details={details}
                  rate={selectedRate}
                  payment={submittedPayment}
                />
              )}

              {step === "success" && selectedArea && selectedTable && (
                <SuccessStep
                  area={selectedArea}
                  table={selectedTable}
                  date={date}
                  time={time}
                  partySize={partySize}
                  details={details}
                  rate={selectedRate}
                  submittedSlotId={submittedSlotId}
                  onRestart={() => {
                    setDirection(-1);
                    setStep("date");
                    setTime("");
                    setAreaId("");
                    setTableId("");
                    setSelectedSlot(null);
                    setSubmittedSlotId(null);
                    setSubmittedPayment(null);
                    setDetails({ name: "", phone: "", email: "", notes: "" });
                  }}
                />
              )}
            </motion.section>
          </AnimatePresence>
        </main>

        {footerCta && <StickyCta {...footerCta} />}
      </div>
    </div>
  );
}

function ReservationConfirmationScreen({
  baseUrl,
  slotId,
}: {
  baseUrl: string;
  slotId: string;
}) {
  const [confirmation, setConfirmation] = useState<ConfirmationResponse | null>(null);
  const [payment, setPayment] = useState<ReservationPayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    let timeoutId: number | undefined;
    let attempts = 0;

    const load = async () => {
      try {
        setError("");
        const [confirmationRes, paymentRes] = await Promise.all([
          fetch(`${baseUrl}/public/reservations/confirmation/${slotId}`, {
            headers: { Accept: "application/json" },
          }),
          fetch(`${baseUrl}/public/reservations/${slotId}/payment`, {
            headers: { Accept: "application/json" },
          }),
        ]);
        if (!confirmationRes.ok) throw new Error(await getResponseError(confirmationRes));
        if (!paymentRes.ok) throw new Error(await getResponseError(paymentRes));

        const confirmationData = (await confirmationRes.json()) as ConfirmationResponse;
        const paymentData = await paymentRes.json();
        if (ignore) return;

        setConfirmation(confirmationData);
        setPayment(paymentData?.payment ?? null);
        setLoading(false);

        const status = paymentData?.payment?.status;
        if (status !== "paid" && status !== "failed" && attempts < 30) {
          attempts += 1;
          timeoutId = window.setTimeout(load, attempts < 10 ? 3000 : 10000);
        }
      } catch (err) {
        if (ignore) return;
        setError(err instanceof Error ? err.message : "Failed to load reservation confirmation.");
        setLoading(false);
      }
    };

    load();
    return () => {
      ignore = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [baseUrl, slotId]);

  const status = payment?.status ?? null;
  const paid = status === "paid" || status === null;
  const failed = status === "failed";
  const pending = Boolean(status && !paid && !failed);

  return (
    <div className="min-h-screen bg-[#f6fbfb] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-8 pt-6">
        <div className="mb-8 flex items-center justify-center">
          <div className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 shadow-sm">
            Reserve
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 240, damping: 16 }}
            className={cn(
              "mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full text-white shadow-2xl",
              failed
                ? "bg-rose-500 shadow-rose-200"
                : pending || loading
                ? "bg-cyan-500 shadow-cyan-200"
                : "bg-emerald-500 shadow-emerald-200"
            )}
          >
            {failed || pending || loading ? <CreditCard size={48} /> : <CheckCircle2 size={52} />}
          </motion.div>

          <div className="text-center">
            <h1 className="text-4xl font-black tracking-tight">
              {loading
                ? "Checking payment"
                : failed
                ? "Payment failed"
                : pending
                ? "Payment pending"
                : "You are booked"}
            </h1>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-slate-500">
              {pending
                ? "We are waiting for PayMongo to confirm your down payment."
                : failed
                ? "Your reservation was received, but the payment did not complete."
                : "Your reservation details are confirmed."}
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {error}
            </div>
          )}

          {confirmation && (
            <div className="mt-8 rounded-[2rem] bg-white p-5 shadow-xl shadow-emerald-900/5">
              <SummaryStrip
                rows={[
                  ["Area", confirmation.area?.name ?? "-"],
                  ["Date", confirmation.date ? formatDateLabel(confirmation.date) : "-"],
                  ["Time", confirmation.time ? formatTimeLabel(confirmation.time) : "-"],
                  ["Guest", confirmation.customerName ?? "-"],
                  [
                    "Payment",
                    payment?.amount ? `${formatMoney(payment.amount)} · ${payment.status ?? "pending"}` : "No down payment",
                  ],
                ]}
              />
            </div>
          )}

          {payment?.paymentLink && status !== "paid" && (
            <Button
              className="mt-6 h-14 rounded-2xl bg-slate-950 text-base font-black text-white"
              onPress={() => window.location.assign(payment.paymentLink!)}
            >
              Resume payment
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function HeroHeader({ title }: { title: string }) {
  return (
    <div className="mb-5">
      <h1 className="text-3xl font-black tracking-tight text-slate-950">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Smooth, visual, and quick. Pick the exact spot you want.
      </p>
    </div>
  );
}

function DateStep({
  date,
  dates,
  partySize,
  onDate,
  onPartySize,
}: {
  date: string;
  dates: string[];
  partySize: number;
  onDate: (date: string) => void;
  onPartySize: (count: number) => void;
}) {
  return (
    <div className="space-y-5">
      <GlassPanel icon={<CalendarDays size={18} />} title="When are you coming?">
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
          {dates.map((option) => {
            const active = option === date;
            const day = new Date(`${option}T00:00:00`).getDate();
            return (
              <button
                key={option}
                type="button"
                onClick={() => onDate(option)}
                className={cn(
                  "min-w-[5.4rem] rounded-3xl border p-3 text-left shadow-sm transition",
                  active
                    ? "border-emerald-400 bg-emerald-500 text-white shadow-emerald-200"
                    : "border-white bg-white text-slate-700"
                )}
              >
                <div className="text-xs font-bold uppercase opacity-75">
                  {formatDateLabel(option).split(",")[0]}
                </div>
                <div className="mt-1 text-2xl font-black">{day}</div>
                <div className="text-xs font-semibold opacity-75">
                  {formatDateLabel(option).split(" ").slice(1).join(" ")}
                </div>
              </button>
            );
          })}
        </div>
      </GlassPanel>

      <GlassPanel icon={<Users size={18} />} title="How many guests?">
        <div className="grid grid-cols-5 gap-2">
          {[2, 3, 4, 5, 6, 7, 8, 9, 10, 12].map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => onPartySize(count)}
              className={cn(
                "rounded-2xl border py-3 text-sm font-black transition",
                count === partySize
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-white text-slate-700"
              )}
            >
              {count}
            </button>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}

function TimeStep({
  date,
  time,
  times,
  onTime,
}: {
  date: string;
  time: string;
  times: string[];
  onTime: (time: string) => void;
}) {
  return (
    <div className="space-y-5">
      <GlassPanel icon={<Clock3 size={18} />} title={formatDateLabel(date)}>
        <div className="grid grid-cols-3 gap-3">
          {times.map((slot) => {
            const active = slot === time;
            return (
              <button
                key={slot}
                type="button"
                onClick={() => onTime(slot)}
                className={cn(
                  "rounded-2xl border px-2 py-4 text-sm font-black shadow-sm transition active:scale-95",
                  active
                    ? "border-cyan-400 bg-cyan-500 text-white shadow-cyan-100"
                    : "border-white bg-white text-slate-700"
                )}
              >
                {formatTimeLabel(slot)}
              </button>
            );
          })}
        </div>
      </GlassPanel>
    </div>
  );
}

function AreaStep({
  areas,
  floorplan,
  areaId,
  onArea,
}: {
  areas: Area[];
  floorplan: FloorplanLayout;
  areaId: string;
  onArea: (id: string) => void;
}) {
  return (
    <div className="space-y-5">
      <GlassPanel icon={<MapPinned size={18} />} title="Tap an area on the floorplan">
        {floorplan.items.length ? (
          <FloorplanPreview
            areas={areas}
            floorplan={floorplan}
            selectedAreaId={areaId}
            onArea={onArea}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {areas.map((area, index) => (
              <AreaCard
                key={area.id}
                area={area}
                color={PALETTE[index % PALETTE.length]}
                active={area.id === areaId}
                onClick={() => onArea(area.id)}
              />
            ))}
          </div>
        )}
      </GlassPanel>

      <SelectedPill>
        {areas.find((area) => area.id === areaId)?.name ?? "No area selected"}
      </SelectedPill>
    </div>
  );
}

function TableStep({
  area,
  tableId,
  partySize,
  loadingTableId,
  slotError,
  onTable,
}: {
  area: Area | null;
  tableId: string;
  partySize: number;
  loadingTableId: string | null;
  slotError: string;
  onTable: (id: string) => void;
}) {
  return (
    <div className="space-y-5">
      <GlassPanel
        icon={<MapPinned size={18} />}
        title={area ? area.name : "Select an area first"}
      >
        {area ? (
          <TableMapPreview
            area={area}
            selectedTableId={tableId}
            partySize={partySize}
            loadingTableId={loadingTableId}
            onTable={onTable}
          />
        ) : (
          <EmptyState title="No area selected" copy="Go back and pick a zone first." />
        )}
      </GlassPanel>

      {slotError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {slotError}
        </div>
      )}
    </div>
  );
}

function TableDetailsStep({
  table,
  date,
  time,
  partySize,
  rate,
}: {
  table: TableItem;
  date: string;
  time: string;
  partySize: number;
  rate: DayRate;
}) {
  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-emerald-900/5">
        {table.picture ? (
          <img src={table.picture} alt={table.name} className="h-56 w-full object-cover" />
        ) : (
          <div className="flex h-56 items-center justify-center bg-gradient-to-br from-emerald-100 to-cyan-100 text-emerald-700">
            <Sparkles size={42} />
          </div>
        )}
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">{table.name}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {formatDateLabel(date)} at {formatTimeLabel(time)} for {partySize}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-950 px-3 py-2 text-center text-white">
              <div className="text-lg font-black">{table.capacity}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide opacity-70">
                Seats
              </div>
            </div>
          </div>

          {table.description ? (
            <p className="mt-4 text-sm leading-6 text-slate-600">{table.description}</p>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-600">
              This table is available for your selected slot. Lock it in with a
              small down payment.
            </p>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <MoneyCard label="Reservation" value={formatMoney(rate.price)} />
            <MoneyCard label="Down payment" value={formatMoney(rate.downpayment)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function GuestStep({
  details,
  onDetails,
}: {
  details: CustomerDetails;
  onDetails: (details: CustomerDetails) => void;
}) {
  return (
    <div className="space-y-4">
      <GlassPanel icon={<User size={18} />} title="Your details">
        <div className="space-y-3">
          <Input
            label="Full name"
            value={details.name}
            onValueChange={(name) => onDetails({ ...details, name })}
            autoFocus
          />
          <Input
            label="Mobile number"
            type="tel"
            value={details.phone}
            onValueChange={(phone) => onDetails({ ...details, phone })}
          />
          <Input
            label="Email"
            type="email"
            value={details.email}
            onValueChange={(email) => onDetails({ ...details, email })}
          />
          <Textarea
            label="Notes"
            minRows={4}
            value={details.notes}
            onValueChange={(notes) => onDetails({ ...details, notes })}
          />
        </div>
      </GlassPanel>
    </div>
  );
}

function PaymentStep({
  date,
  time,
  area,
  table,
  partySize,
  details,
  rate,
  payment,
}: {
  date: string;
  time: string;
  area: Area;
  table: TableItem;
  partySize: number;
  details: CustomerDetails;
  rate: DayRate;
  payment: ReservationPayment | null;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-[2rem] bg-slate-950 p-5 text-white shadow-2xl shadow-slate-900/20">
        <div className="mb-8 flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
            Down payment
          </div>
          <CreditCard size={22} />
        </div>
        <div className="text-4xl font-black">{formatMoney(rate.downpayment)}</div>
        <div className="mt-3 text-sm leading-6 text-white/70">
          {table.name} in {area.name}, {formatDateLabel(date)} at {formatTimeLabel(time)}
        </div>
      </div>

      <GlassPanel icon={<CreditCard size={18} />} title="Payment method">
        <div className="space-y-3">
          <p className="text-xs leading-5 text-slate-500">
            {rate.downpayment > 0
              ? "After confirming, you will be redirected to PayMongo secure checkout."
              : "No down payment is required for this table. Confirm to submit your reservation."}
          </p>
          {payment?.paymentLink && (
            <Button
              className="h-11 rounded-xl bg-emerald-500 font-bold text-white"
              onPress={() => window.location.assign(payment.paymentLink!)}
            >
              Resume PayMongo checkout
            </Button>
          )}
        </div>
      </GlassPanel>

      <SummaryStrip
        rows={[
          ["Guest", details.name],
          ["Guests", String(partySize)],
          ["Reservation", formatMoney(rate.price)],
        ]}
      />
    </div>
  );
}

function SuccessStep({
  area,
  table,
  date,
  time,
  partySize,
  details,
  rate,
  submittedSlotId,
  onRestart,
}: {
  area: Area;
  table: TableItem;
  date: string;
  time: string;
  partySize: number;
  details: CustomerDetails;
  rate: DayRate;
  submittedSlotId: string | null;
  onRestart: () => void;
}) {
  return (
    <div className="flex min-h-[70vh] flex-col justify-center">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 16 }}
        className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xl shadow-emerald-200"
      >
        <CheckCircle2 size={52} />
      </motion.div>
      <div className="text-center">
        <h1 className="text-4xl font-black tracking-tight">Booked.</h1>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-slate-500">
          Thanks {details.name || "there"}. Your table is reserved
          {rate.downpayment > 0
            ? " and your down payment is recorded."
            : "."}
        </p>
      </div>

      <div className="mt-8 rounded-[2rem] bg-white p-5 shadow-xl shadow-emerald-900/5">
        <SummaryStrip
          rows={[
            ["Area", area.name],
            ["Table", table.name],
            ["Date", formatDateLabel(date)],
            ["Time", formatTimeLabel(time)],
            ["Guests", String(partySize)],
            ["Paid", formatMoney(rate.downpayment)],
            ["Reference", submittedSlotId ? submittedSlotId.slice(0, 8) : "-"],
          ]}
        />
      </div>

      <Button
        className="mt-6 h-14 rounded-2xl bg-slate-950 text-base font-black text-white"
        onPress={onRestart}
      >
        Book another table
      </Button>
    </div>
  );
}

function FloorplanPreview({
  areas,
  floorplan,
  selectedAreaId,
  onArea,
}: {
  areas: Area[];
  floorplan: FloorplanLayout;
  selectedAreaId: string;
  onArea: (id: string) => void;
}) {
  const cols = floorplan.orientation === "horizontal" ? LONG_AXIS : SHORT_AXIS;
  const rows = floorplan.orientation === "horizontal" ? SHORT_AXIS : LONG_AXIS;
  const areaMap = new Map(areas.map((area, index) => [area.id, { area, index }]));

  return (
    <div
      className="relative mx-auto w-full overflow-hidden rounded-[1.6rem] bg-slate-100 shadow-inner"
      style={{
        aspectRatio: floorplan.orientation === "horizontal" ? "3 / 2" : "2 / 3",
        maxHeight: floorplan.orientation === "vertical" ? "60vh" : undefined,
      }}
    >
      {floorplan.background && (
        <img
          src={floorplan.background}
          alt="Restaurant floorplan"
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
      )}
      {floorplan.items.map((item) => {
        const meta = areaMap.get(item.areaId);
        if (!meta) return null;
        const active = selectedAreaId === item.areaId;
        const color = PALETTE[meta.index % PALETTE.length];
        return (
          <motion.button
            key={item.id}
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => onArea(item.areaId)}
            className="absolute flex items-center justify-center rounded-2xl text-center text-xs font-black shadow-sm transition"
            style={{
              left: `${(item.col / cols) * 100}%`,
              top: `${(item.row / rows) * 100}%`,
              width: `${(item.w / cols) * 100}%`,
              height: `${(item.h / rows) * 100}%`,
              color: "#0f172a",
              backgroundColor: `${color}${active ? "80" : "33"}`,
              boxShadow: active
                ? `inset 0 0 0 3px ${color}, 0 8px 22px rgba(15, 23, 42, 0.10)`
                : "inset 0 0 0 1px rgba(255, 255, 255, 0.60)",
            }}
          >
            <span className="truncate px-1">{meta.area.name}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

function TableMapPreview({
  area,
  selectedTableId,
  partySize,
  loadingTableId,
  onTable,
}: {
  area: Area;
  selectedTableId: string;
  partySize: number;
  loadingTableId: string | null;
  onTable: (id: string) => void;
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div
        className="relative w-[200%] min-w-[200%] overflow-hidden rounded-[1.6rem] bg-slate-50 shadow-inner"
        style={{ aspectRatio: "3 / 2" }}
      >
        {area.items.map((item) => {
          const active = selectedTableId === item.id;
          const tooSmall = item.kind === "table" && item.capacity < partySize;
          const checking = loadingTableId === item.id;
          return (
            <div
              key={item.id}
              className="absolute"
              style={{
                zIndex: objectZ(item),
                left: `${(item.col / TABLE_COLS) * 100}%`,
                top: `${(item.row / TABLE_ROWS) * 100}%`,
                width: `${(item.w / TABLE_COLS) * 100}%`,
                height: `${(item.h / TABLE_ROWS) * 100}%`,
              }}
            >
              {item.kind === "table" ? (
                <button
                  type="button"
                  disabled={tooSmall || Boolean(loadingTableId)}
                  onClick={() => onTable(item.id)}
                  className={cn(
                    "flex h-full w-full flex-col items-center justify-center border-2 bg-white px-1 text-center shadow-sm transition active:scale-95",
                    item.shape === "circle" ? "rounded-full" : "rounded-xl",
                    active
                      ? "border-emerald-500 text-emerald-700 ring-4 ring-emerald-200"
                      : "border-slate-300 text-slate-700",
                    tooSmall && "opacity-30",
                    checking && "animate-pulse"
                  )}
                >
                  <span className="max-w-full truncate text-[10px] font-black">
                    {checking ? "Checking..." : item.name}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400">
                    {item.capacity}p
                  </span>
                </button>
              ) : (
                <MapObject item={item} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MapObject({ item }: { item: TableItem }) {
  if (item.shape === "label") {
    return (
      <div className="flex h-full w-full items-center justify-center text-center text-xs font-black text-slate-700">
        <span className="truncate">{item.name || "Label"}</span>
      </div>
    );
  }

  if (item.shape === "image") {
    return item.picture ? (
      <img
        src={item.picture}
        alt={item.name}
        className="h-full w-full rounded-lg object-contain"
        style={{ transform: item.rotation ? `rotate(${item.rotation}deg)` : undefined }}
      />
    ) : (
      <div className="flex h-full w-full items-center justify-center text-slate-300">
        <ImagePlus size={18} />
      </div>
    );
  }

  if (item.shape === "separator") {
    const vertical = normalizeRotation(item.rotation) === 90 || normalizeRotation(item.rotation) === 270;
    return (
      <div className="flex h-full w-full items-center justify-center text-slate-300">
        <div
          className={cn("rounded-full", vertical ? "h-full w-1" : "h-1 w-full")}
          style={{
            backgroundImage: `repeating-linear-gradient(${vertical ? "to bottom" : "to right"}, currentColor 0 12px, transparent 12px 18px)`,
          }}
        />
      </div>
    );
  }

  if (item.shape === "l-shape" || item.shape === "c-shape") {
    const t = Math.min(OBJECT_STRIPE, item.w, item.h);
    return (
      <svg viewBox={`0 0 ${item.w} ${item.h}`} className="h-full w-full text-slate-300">
        <path
          d={polygonPath(lcPolygon(item.shape, item.w, item.h, t, item.rotation))}
          fill="currentColor"
          fillOpacity={0.18}
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full text-slate-300">
      {item.shape === "circle" ? (
        <ellipse cx="50" cy="50" rx="48" ry="48" fill="currentColor" fillOpacity={0.18} />
      ) : (
        <rect x="2" y="2" width="96" height="96" rx="4" fill="currentColor" fillOpacity={0.18} />
      )}
    </svg>
  );
}

function AreaCard({
  area,
  color,
  active,
  onClick,
}: {
  area: Area;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-3xl bg-white p-4 text-left shadow-sm transition active:scale-95"
      style={{
        boxShadow: active
          ? `inset 0 0 0 3px ${color}, 0 8px 22px rgba(15, 23, 42, 0.08)`
          : "inset 0 0 0 1px rgba(226, 232, 240, 0.85)",
      }}
    >
      <div
        className="mb-4 h-16 rounded-2xl"
        style={{ backgroundColor: `${color}${active ? "80" : "33"}` }}
      />
      <div className="text-sm font-black text-slate-900">{area.name}</div>
      <div className="mt-1 text-xs text-slate-500">
        {area.items.filter((item) => item.kind === "table").length} tables
      </div>
    </button>
  );
}

function GlassPanel({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[2rem] border border-white bg-white/85 p-4 shadow-xl shadow-emerald-900/5 backdrop-blur">
      <div className="mb-4 flex items-center gap-2 text-sm font-black text-slate-800">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          {icon}
        </span>
        {title}
      </div>
      {children}
    </div>
  );
}

function StickyCta({
  label,
  disabled,
  loading,
  onPress,
}: {
  label: string;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-[#f6fbfb] via-[#f6fbfb] to-transparent px-4 pb-4 pt-8">
      <Button
        className="mx-auto flex h-14 w-full max-w-md rounded-2xl bg-slate-950 text-base font-black text-white shadow-xl shadow-slate-900/15 disabled:opacity-40"
        isDisabled={disabled}
        isLoading={loading}
        onPress={onPress}
        endContent={!loading ? <ChevronRight size={18} /> : null}
      >
        {label}
      </Button>
    </div>
  );
}

function SelectedPill({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800">
      {children}
    </div>
  );
}

function MoneyCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-lg font-black text-slate-950">{value}</div>
    </div>
  );
}

function SummaryStrip({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="space-y-3">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-4 text-sm">
          <span className="text-slate-500">{label}</span>
          <span className="text-right font-black text-slate-900">{value || "-"}</span>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <div className="text-base font-black">{title}</div>
      <p className="mt-2 text-sm text-slate-500">{copy}</p>
    </div>
  );
}
