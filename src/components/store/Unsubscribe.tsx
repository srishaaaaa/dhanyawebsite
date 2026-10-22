"use client";
import { useState, useTransition } from "react";
import { unsubscribe } from "@/app/(store)/actions";

export function UnsubscribeButton({ email, sig }: { email: string; sig: string }) {
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (done) return <p role="status" className="mt-8 font-serif text-2xl">{done}</p>;
  return <button disabled={pending} className="btn-primary mt-8" onClick={() => start(async () => setDone((await unsubscribe(email, sig)).message))}>{pending ? "…" : "UNSUBSCRIBE"}</button>;
}
