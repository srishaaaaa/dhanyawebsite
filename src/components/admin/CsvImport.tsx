"use client";
import { useActionState } from "react";
import { Upload } from "lucide-react";
import { Card, btn } from "./ui";

export type ImportResult = { ok: boolean; message: string; errors?: string[] } | null;

export default function CsvImport({ action, title, help, template }: {
  action: (prev: ImportResult, fd: FormData) => Promise<ImportResult>; title: string; help: string; template?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <Card title={title}>
      <p className="text-xs text-charcoal/60 mb-3 max-w-3xl">{help}</p>
      <form action={formAction} className="flex flex-wrap items-center gap-3">
        <input type="file" name="file" accept=".csv,text/csv" required className="text-sm" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="dryRun" defaultChecked />Check only (don't save)</label>
        <button disabled={pending} className={btn.secondary}><Upload size={15} />{pending ? "Processing…" : "Run import"}</button>
        {template && <a href={template} className={btn.ghost}>Download template</a>}
      </form>
      {state && (
        <div role="status" className={`mt-4 border px-4 py-3 text-sm ${state.ok ? "border-emerald-200 bg-emerald-50" : "border-burgundy/30 bg-rose text-burgundy"}`}>
          <p>{state.message}</p>
          {state.errors?.length ? <ul className="mt-2 list-disc pl-5 text-xs max-h-48 overflow-y-auto">{state.errors.map((e, i) => <li key={i}>{e}</li>)}</ul> : null}
        </div>
      )}
    </Card>
  );
}
