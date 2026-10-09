"use client";

import { useMemo, useState } from "react";
import { DEFAULT_SETTINGS, type FieldError, type ValidationSettings } from "@/lib/validation";

type FormEye = { sph: string; cyl: string; axis: string };
type FormValues = { rightEye: FormEye; leftEye: FormEye };
const emptyEye = (): FormEye => ({ sph: "", cyl: "", axis: "" });

function numericValue(value: string): number | "" {
  if (value.trim() === "") return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : "";
}

function parseEye(eye: FormEye) {
  return { sph: numericValue(eye.sph), cyl: numericValue(eye.cyl), axis: numericValue(eye.axis) };
}

function Field({
  label, value, onChange, placeholder, error, suffix, step = "any"
}: {
  label: string; value: string; onChange: (value: string) => void; placeholder: string;
  error?: string; suffix?: string; step?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="input-wrap">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          step={step}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${label.replaceAll(" ", "-")}-error` : undefined}
        />
        {suffix && <span className="suffix">{suffix}</span>}
      </span>
      {error && <span className="field-error" id={`${label.replaceAll(" ", "-")}-error`}>{error}</span>}
    </label>
  );
}

function EyeCard({
  title, subtitle, value, onChange, errors
}: {
  title: string; subtitle: string; value: FormEye; onChange: (next: FormEye) => void; errors: FieldError[];
}) {
  const eyeKey = title === "Right eye" ? "rightEye" : "leftEye";
  const errorFor = (field: string) => errors.find((error) => error.field === `${eyeKey}.${field}`)?.message;
  return (
    <section className="eye-card">
      <div className="eye-heading">
        <div className="eye-icon">{title === "Right eye" ? "R" : "L"}</div>
        <div><h2>{title}</h2><p>{subtitle}</p></div>
      </div>
      <div className="fields-grid">
        <Field label="SPH" value={value.sph} onChange={(v) => onChange({ ...value, sph: v })} placeholder="-2.50" suffix="D" error={errorFor("sph")} />
        <Field label="CYL" value={value.cyl} onChange={(v) => onChange({ ...value, cyl: v })} placeholder="-0.75" suffix="D" error={errorFor("cyl")} />
        <Field label="Axis" value={value.axis} onChange={(v) => onChange({ ...value, axis: v })} placeholder="90" suffix="°" step="1" error={errorFor("axis")} />
      </div>
      <p className="hint">Axis is needed when CYL is non-zero.</p>
    </section>
  );
}

export default function Home() {
  const [form, setForm] = useState<FormValues>({ rightEye: emptyEye(), leftEye: emptyEye() });
  const [settings, setSettings] = useState<ValidationSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [status, setStatus] = useState<"idle" | "valid" | "invalid">("idle");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");

  const parsed = useMemo(() => ({
    rightEye: parseEye(form.rightEye),
    leftEye: parseEye(form.leftEye)
  }), [form]);

  function updateSetting(section: "sph" | "cyl" | "axis", key: "min" | "max" | "step", value: string) {
    const n = Number(value);
    setSettings((previous) => ({
      ...previous,
      [section]: { ...previous[section], [key]: value.trim() === "" || !Number.isFinite(n) ? 0 : n }
    }));
  }

  async function validate() {
    setLoading(true);
    setErrors([]);
    setStatus("idle");
    setSummary("");
    try {
      const response = await fetch("/api/validate-prescription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prescription: parsed, settings })
      });
      const result = await response.json();
      setErrors(result.errors ?? []);
      if (result.valid) {
        setStatus("valid");
        setSummary("All six prescription fields passed the configured validation rules.");
      } else {
        setStatus("invalid");
        setSummary(`Found ${(result.errors ?? []).length} issue${(result.errors ?? []).length === 1 ? "" : "s"}. Review the highlighted fields below.`);
      }
    } catch {
      setStatus("invalid");
      setErrors([{ field: "service", code: "NETWORK_ERROR", message: "Could not reach the validation service. Check that the app is running and try again." }]);
      setSummary("Validation service unavailable.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setForm({ rightEye: emptyEye(), leftEye: emptyEye() });
    setErrors([]);
    setStatus("idle");
    setSummary("");
  }

  function fillExample() {
    setForm({
      rightEye: { sph: "-2.50", cyl: "-0.75", axis: "90" },
      leftEye: { sph: "-1.25", cyl: "0", axis: "" }
    });
    setErrors([]);
    setStatus("idle");
    setSummary("");
  }

  const globalErrors = errors.filter((error) => !error.field.startsWith("rightEye.") && !error.field.startsWith("leftEye."));

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="OptiCheck home"><span className="brand-mark">O</span><span>OptiCheck</span></a>
        <span className="top-tag"><span className="status-dot" /> Prescription input validator</span>
      </header>

      <div className="content">
        <section className="intro">
          <div className="eyebrow"><span className="eyebrow-line" /> INPUT QUALITY CHECK</div>
          <h1>Check your prescription.<br /><span>Catch issues early.</span></h1>
          <p className="intro-copy">Validate SPH, CYL, and Axis values for both eyes against configurable ranges and increments before accepting a prescription.</p>
          <div className="trust-row"><span><span className="mini-check">✓</span> Field-specific feedback</span><span><span className="mini-check">✓</span> Server-side validation</span><span><span className="mini-check">✓</span> Configurable rules</span></div>
        </section>

        <section className="validator-panel">
          <div className="panel-heading">
            <div><div className="section-kicker">PRESCRIPTION DETAILS</div><h2>Enter eye measurements</h2><p>Fill in the values exactly as shown on the prescription.</p></div>
            <button className="text-button" onClick={fillExample} type="button">Load example ↗</button>
          </div>

          <div className="eye-grid">
            <EyeCard title="Right eye" subtitle="OD · Oculus Dexter" value={form.rightEye} onChange={(rightEye) => setForm((old) => ({ ...old, rightEye }))} errors={errors} />
            <EyeCard title="Left eye" subtitle="OS · Oculus Sinister" value={form.leftEye} onChange={(leftEye) => setForm((old) => ({ ...old, leftEye }))} errors={errors} />
          </div>

          <button className="settings-toggle" type="button" onClick={() => setShowSettings((shown) => !shown)} aria-expanded={showSettings}>
            <span className="settings-icon">⚙</span><span><strong>Validation settings</strong><small>Set acceptable ranges and increments</small></span><span className="toggle-chevron">{showSettings ? "−" : "+"}</span>
          </button>

          {showSettings && <div className="settings-panel">
            <p className="settings-note">These are broad demo defaults, not a universal optical standard. Set them to match your product or lab requirements.</p>
            <div className="settings-table">
              <div className="settings-row settings-header"><span>Field</span><span>Minimum</span><span>Maximum</span><span>Step</span></div>
              {(["sph", "cyl"] as const).map((field) => <div className="settings-row" key={field}>
                <strong>{field.toUpperCase()} (D)</strong>
                <input aria-label={`${field} minimum`} type="number" step="any" value={settings[field].min} onChange={(e) => updateSetting(field, "min", e.target.value)} />
                <input aria-label={`${field} maximum`} type="number" step="any" value={settings[field].max} onChange={(e) => updateSetting(field, "max", e.target.value)} />
                <input aria-label={`${field} step`} type="number" min="0.01" step="any" value={settings[field].step} onChange={(e) => updateSetting(field, "step", e.target.value)} />
              </div>)}
              <div className="settings-row axis-row"><strong>Axis (°)</strong><input aria-label="Axis minimum" type="number" min="1" max="180" step="1" value={settings.axis.min} onChange={(e) => updateSetting("axis", "min", e.target.value)} /><input aria-label="Axis maximum" type="number" min="1" max="180" step="1" value={settings.axis.max} onChange={(e) => updateSetting("axis", "max", e.target.value)} /><span className="fixed-step">Whole degrees</span></div>
            </div>
          </div>}

          <div className="actions">
            <button type="button" className="secondary-button" onClick={reset}>Clear form</button>
            <button type="button" className="primary-button" onClick={validate} disabled={loading}>{loading ? <><span className="spinner" /> Checking…</> : <>Validate prescription <span>→</span></>}</button>
          </div>

          {status !== "idle" && <div className={`result-banner ${status}`} role="status" aria-live="polite">
            <div className="result-symbol">{status === "valid" ? "✓" : "!"}</div>
            <div><strong>{status === "valid" ? "Prescription inputs look valid" : "Please review the inputs"}</strong><p>{summary}</p></div>
            <span className="result-label">{status === "valid" ? "PASSED" : "NEEDS ATTENTION"}</span>
          </div>}
          {globalErrors.length > 0 && <div className="global-errors">{globalErrors.map((error, i) => <p key={`${error.field}-${i}`}>{error.message}</p>)}</div>}
        </section>

        <section className="info-strip">
          <div className="info-icon">i</div><p><strong>What this checks</strong><br />Format, configured numeric limits, allowed increments, and whether Axis is supplied when CYL is non-zero. It does not confirm clinical suitability or replace review by a qualified eye-care professional.</p>
        </section>
        <footer><span>OptiCheck · Input validation demo</span><span>Values are processed by this app’s validation API; no database is used.</span></footer>
      </div>
    </main>
  );
}
