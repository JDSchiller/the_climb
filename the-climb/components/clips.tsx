"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";

export function ClipUpload({ athleteId, blobMode }: { athleteId: string; blobMode: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function reset(ok: boolean) {
    setBusy(false); setPct(0);
    if (ok) { setTitle(""); if (fileRef.current) fileRef.current.value = ""; router.refresh(); }
  }

  async function blobUpload(file: File, clipTitle: string) {
    const result = await upload(`media/${athleteId}/${file.name}`, file, {
      access: "public", // unguessable URL; the app only hands it out after an auth check
      handleUploadUrl: "/api/media/upload",
      clientPayload: JSON.stringify({ athlete_id: athleteId }),
      onUploadProgress: ({ percentage }) => setPct(Math.round(percentage)),
    });
    const reg = await fetch("/api/media/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        athlete_id: athleteId, title: clipTitle, url: result.url, pathname: result.pathname,
        size: file.size, mime: file.type || result.contentType,
      }),
    });
    if (!reg.ok) throw new Error((await reg.json()).error || "Upload saved but could not be registered.");
  }

  function diskUpload(file: File, clipTitle: string) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("athlete_id", athleteId);
    fd.append("title", clipTitle);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/media/upload");
    xhr.upload.onprogress = (ev) => ev.lengthComputable && setPct(Math.round((ev.loaded / ev.total) * 100));
    xhr.onload = () => {
      if (xhr.status === 200) reset(true);
      else { setError(JSON.parse(xhr.responseText || "{}").error || "Upload failed. Try again on better wifi."); reset(false); }
    };
    xhr.onerror = () => { setError("Upload failed. Try again on better wifi."); reset(false); };
    xhr.send(fd);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return setError("Pick a clip first.");
    if (file.size > 300 * 1024 * 1024) return setError("Clips only — keep it under 300 MB. Full games belong somewhere cheaper.");
    if (!file.type.startsWith("video/")) return setError("Video files only.");
    setBusy(true); setError(null);
    const clipTitle = title || file.name.replace(/\.[^.]+$/, "");
    if (blobMode) {
      try { await blobUpload(file, clipTitle); reset(true); }
      catch (err) { setError((err as Error).message || "Upload failed. Try again on better wifi."); reset(false); }
    } else {
      diskUpload(file, clipTitle);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <input ref={fileRef} type="file" accept="video/*" className="text-xs" />
      <input className="input !w-44" placeholder="Clip title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <button className="btn-gold" disabled={busy}>{busy ? `Uploading ${pct}%` : "Upload clip"}</button>
      {error && <p className="text-xs text-red-700 w-full">{error}</p>}
    </form>
  );
}
