"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function ClipUpload({ athleteId }: { athleteId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function upload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return setError("Pick a clip first.");
    if (file.size > 300 * 1024 * 1024) return setError("Clips only — keep it under 300 MB. Full games belong somewhere cheaper.");
    setBusy(true); setError(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("athlete_id", athleteId);
    fd.append("title", title || file.name.replace(/\.[^.]+$/, ""));
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/media/upload");
    xhr.upload.onprogress = (ev) => ev.lengthComputable && setPct(Math.round((ev.loaded / ev.total) * 100));
    xhr.onload = () => {
      setBusy(false); setPct(0);
      if (xhr.status === 200) { setTitle(""); if (fileRef.current) fileRef.current.value = ""; router.refresh(); }
      else setError(JSON.parse(xhr.responseText || "{}").error || "Upload failed. Try again on better wifi.");
    };
    xhr.onerror = () => { setBusy(false); setError("Upload failed. Try again on better wifi."); };
    xhr.send(fd);
  }

  return (
    <form onSubmit={upload} className="flex flex-wrap items-center gap-2">
      <input ref={fileRef} type="file" accept="video/*" className="text-xs" />
      <input className="input !w-44" placeholder="Clip title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <button className="btn-gold" disabled={busy}>{busy ? `Uploading ${pct}%` : "Upload clip"}</button>
      {error && <p className="text-xs text-red-700 w-full">{error}</p>}
    </form>
  );
}
