import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  DatePicker,
  Divider,
  Input,
  Radio,
  RadioGroup,
  Select,
  SelectItem,
  Spinner,
  Textarea,
} from "@heroui/react";
import { parseDate } from "@internationalized/date";

type FormField = {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  section?: string | null;
  position?: number | null;
  isMandatory?: boolean | null;
  validation?: Record<string, unknown> | null;
};

type FormResponse = {
  id: string;
  name: string;
  slug: string;
  status: string;
  fields?: FormField[] | null;
};

type SubmissionValue = {
  formFieldId: string;
  value: unknown;
};

const isEmptyValue = (value: unknown) => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  return false;
};

export default function FormFillApp() {
  const baseUrl = useMemo(
    () => import.meta.env.VITE_API_BASE_URL || "https://api.orda.co",
    []
  );
  const params = useParams();
  const [searchParams] = useSearchParams();
  const routeId = params.id;
  const routeSlug = params.slug;
  const idParam = routeId || searchParams.get("id") || searchParams.get("formId");
  const slugParam = routeSlug || searchParams.get("slug") || searchParams.get("formSlug");
  const identifier = slugParam || idParam;
  const identifierType = slugParam ? "slug" : "id";

  const [form, setForm] = useState<FormResponse | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  useEffect(() => {
    const title = form?.name ? `${form.name} Form` : "Form";
    document.title = title;
  }, [form?.name]);

  useEffect(() => {
    if (!identifier) {
      setLoading(false);
      setError("Missing form slug or ID.");
      return;
    }

    const controller = new AbortController();
    let ignore = false;

    async function loadForm() {
      setLoading(true);
      setError("");
      try {
        const url =
          identifierType === "slug"
            ? `${baseUrl}/forms/slug/${identifier}`
            : `${baseUrl}/forms/${identifier}`;
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`Failed to load form: ${res.status}`);
        }
        const data = (await res.json()) as FormResponse;
        if (ignore) return;
        setForm(data);
      } catch (loadError) {
        if (controller.signal.aborted || ignore) return;
        setForm(null);
        setError(loadError instanceof Error ? loadError.message : "Failed to load form.");
      } finally {
        if (!controller.signal.aborted && !ignore) setLoading(false);
      }
    }

    loadForm();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [baseUrl, identifier, identifierType]);

  useEffect(() => {
    if (!form?.fields) return;
    const nextValues: Record<string, unknown> = {};
    form.fields.forEach((field) => {
      if (field.type === "input-checkbox") {
        nextValues[field.id] = false;
      }
    });
    setValues(nextValues);
    setSubmitError("");
    setSubmitSuccess("");
  }, [form]);

  const fields = useMemo(() => {
    const list = Array.isArray(form?.fields) ? [...form!.fields] : [];
    return list.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }, [form]);

  const groupedFields = useMemo(() => {
    const groups = new Map<string, FormField[]>();
    fields.forEach((field) => {
      const label = field.section?.trim() || "General";
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(field);
    });
    return groups;
  }, [fields]);

  const hasSections = fields.some((field) => Boolean(field.section));

  const handleValueChange = (fieldId: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const renderField = (field: FormField) => {
    const required = Boolean(field.isMandatory);
    const value = values[field.id];
    const description = field.description || undefined;

    switch (field.type) {
      case "input-text":
        return (
          <Input
            key={field.id}
            label={field.title}
            description={description}
            isRequired={required}
            value={typeof value === "string" ? value : ""}
            onValueChange={(next) => handleValueChange(field.id, next)}
          />
        );
      case "input-date":
        return (
          <DatePicker
            key={field.id}
            label={field.title}
            description={description}
            isRequired={required}
            value={typeof value === "string" && value ? parseDate(value) : null}
            onChange={(next) =>
              handleValueChange(field.id, next ? next.toString() : "")
            }
          />
        );
      case "input-options": {
        const options = Array.isArray(field.validation?.options)
          ? (field.validation?.options as string[])
          : [];
        const selected = value ? new Set([String(value)]) : new Set<string>();
        return (
          <Select
            key={field.id}
            label={field.title}
            description={description}
            isRequired={required}
            isDisabled={options.length === 0}
            selectedKeys={selected}
            onSelectionChange={(keys) => {
              const next =
                keys === "all" ? options[0] || "" : Array.from(keys)[0] || "";
              handleValueChange(field.id, next);
            }}
          >
            {options.map((option) => (
              <SelectItem key={option}>{option}</SelectItem>
            ))}
          </Select>
        );
      }
      case "input-radio": {
        const options = Array.isArray(field.validation?.options)
          ? (field.validation?.options as string[])
          : [];
        return (
          <RadioGroup
            key={field.id}
            label={field.title}
            description={description}
            isRequired={required}
            value={typeof value === "string" ? value : ""}
            onValueChange={(next) => handleValueChange(field.id, next)}
          >
            {options.map((option) => (
              <Radio key={option} value={option}>
                {option}
              </Radio>
            ))}
          </RadioGroup>
        );
      }
      case "input-checkbox":
        return (
          <Checkbox
            key={field.id}
            isSelected={Boolean(value)}
            onValueChange={(next) => handleValueChange(field.id, next)}
          >
            {field.title}
          </Checkbox>
        );
      case "input-signature":
        return (
          <Input
            key={field.id}
            label={field.title}
            description={description}
            isRequired={required}
            placeholder="Type your full name"
            value={typeof value === "string" ? value : ""}
            onValueChange={(next) => handleValueChange(field.id, next)}
          />
        );
      default:
        return (
          <Textarea
            key={field.id}
            label={field.title}
            description={description}
            isRequired={required}
            value={typeof value === "string" ? value : ""}
            onValueChange={(next) => handleValueChange(field.id, next)}
          />
        );
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    setSubmitError("");
    setSubmitSuccess("");

    const missingRequired = fields.filter((field) => {
      if (!field.isMandatory) return false;
      const value = values[field.id];
      if (field.type === "input-checkbox") return !value;
      return isEmptyValue(value);
    });

    if (missingRequired.length > 0) {
      setSubmitError("Please fill in all required fields.");
      return;
    }

    const payloadValues: SubmissionValue[] = [];
    fields.forEach((field) => {
      const value = values[field.id];
      if (field.type === "input-checkbox") {
        payloadValues.push({ formFieldId: field.id, value: Boolean(value) });
        return;
      }
      if (isEmptyValue(value)) return;
      payloadValues.push({ formFieldId: field.id, value });
    });

    const submitUrl =
      identifierType === "slug"
        ? `${baseUrl}/forms/slug/${form.slug}/submissions`
        : `${baseUrl}/forms/${form.id}/submissions`;

    try {
      setSubmitting(true);
      const res = await fetch(submitUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ values: payloadValues }),
      });
      if (!res.ok) {
        let message = `Failed to submit form: ${res.status}`;
        try {
          const data = await res.json();
          if (data?.message) message = data.message;
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(message);
      }
      setSubmitSuccess("Thanks! Your response has been recorded.");
    } catch (submitError) {
      setSubmitError(submitError instanceof Error ? submitError.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 text-slate-900">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-12 sm:px-6">
        <Card className="border border-slate-100 bg-white/80 shadow-xl backdrop-blur">
          <CardHeader className="flex flex-col items-start gap-2">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Form Fill</p>
            <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
              {form?.name || "Form"}
            </h1>
          </CardHeader>
          <Divider />
          <CardBody className="gap-6">
            {loading && (
              <div className="flex items-center gap-3 text-slate-500">
                <Spinner size="sm" />
                Loading form fields...
              </div>
            )}
            {!loading && error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {error}
              </div>
            )}
            {!loading && !error && fields.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                This form does not have any active fields yet.
              </div>
            )}
            {!loading && !error && fields.length > 0 && (
              <form onSubmit={handleSubmit} className="flex flex-col gap-8">
                {Array.from(groupedFields.entries()).map(([section, items]) => (
                  <div key={section} className="flex flex-col gap-5">
                    {hasSections && (
                      <h2 className="text-lg font-semibold text-slate-800">{section}</h2>
                    )}
                    <div className="grid gap-5 sm:grid-cols-2">
                      {items.map((field) => (
                        <div
                          key={field.id}
                          className={field.type === "input-checkbox" ? "sm:col-span-2" : ""}
                        >
                          {renderField(field)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {(submitError || submitSuccess) && (
                  <div
                    className={[
                      "rounded-xl border p-4 text-sm",
                      submitError
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700",
                    ].join(" ")}
                  >
                    {submitError || submitSuccess}
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <Button
                    color="primary"
                    type="submit"
                    isLoading={submitting}
                    className="min-w-[160px]"
                    size="lg"
                  >
                    Submit Form
                  </Button>
                </div>
              </form>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
