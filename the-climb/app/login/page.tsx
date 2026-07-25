"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"identify" | "code">("identify");
  const [sandboxCode, setSandboxCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/auth/request-code", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier }),
    });
    const j = await res.json();
    setBusy(false);
    if (!j.ok) return setError(j.error);
    setSandboxCode(j.sandboxCode ?? null);
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/auth/verify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, code }),
    });
    const j = await res.json();
    setBusy(false);
    if (!j.ok) return setError(j.error);
    router.push(j.redirect);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-midnight flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center rounded-full border-2 border-gold px-5 py-1.5 mb-4">
            <span className="text-cream font-bold tracking-[0.3em] text-sm">THE CLIMB</span>
          </div>
          <p className="text-cream/60 text-sm">The summit is the dream. The climb is the plan.</p>
        </div>
        <div className="bg-cream rounded-2xl p-6">
          {step === "identify" ? (
            <form onSubmit={requestCode} className="space-y-4">
              <div>
                <label className="label">Email or phone</label>
                <input className="input" value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="you@example.com or +1 407 555 0100" autoFocus required />
              </div>
              {error && <p className="text-sm text-red-700">{error}</p>}
              <button className="btn w-full" disabled={busy}>{busy ? "Sending..." : "Send login code"}</button>
            </form>
          ) : (
            <form onSubmit={verify} className="space-y-4">
              <div>
                <label className="label">Enter the 6-digit code</label>
                <input className="input text-center text-2xl tracking-[0.4em] font-bold" value={code}
                  onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} autoFocus required />
              </div>
              {sandboxCode && (
                <div className="rounded-lg bg-gold/20 border border-gold px-3 py-2 text-sm">
                  <span className="font-semibold">Sandbox mode:</span> your code is <span className="font-mono font-bold">{sandboxCode}</span>.
                  Real email/SMS delivery turns on when a sender key is configured.
                </div>
              )}
              {error && <p className="text-sm text-red-700">{error}</p>}
              <button className="btn w-full" disabled={busy}>{busy ? "Checking..." : "Sign in"}</button>
              <button type="button" className="btn-ghost w-full" onClick={() => { setStep("identify"); setCode(""); setError(null); }}>
                Use a different email or phone
              </button>
            </form>
          )}
        </div>
        <p className="text-cream/40 text-xs text-center mt-6">
          Accounts are created by a guardian. There is no open signup.
        </p>
      </div>
    </main>
  );
}
