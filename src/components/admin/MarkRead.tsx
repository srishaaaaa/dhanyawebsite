"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markMessageRead } from "@/app/admin/(panel)/customers/actions";

export default function MarkRead({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return <button disabled={pending} onClick={() => start(async () => { await markMessageRead(id); router.refresh(); })} className="mt-3 text-xs underline">Mark as handled</button>;
}
