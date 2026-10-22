"use client";
import { useTransition } from "react";
import { setSubscribed } from "@/app/admin/(panel)/newsletter/actions";

export default function SubscriberToggle({ id, active }: { id: string; active: boolean }) {
  const [pending, start] = useTransition();
  return <button disabled={pending} className="text-xs underline" onClick={() => { if (!active && !confirm("Only resubscribe someone who has asked you to.")) return; start(() => setSubscribed(id, !active)); }}>{active ? "Unsubscribe" : "Resubscribe"}</button>;
}
