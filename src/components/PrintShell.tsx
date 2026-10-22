"use client";
export function PrintButton() {
  return <button onClick={() => window.print()} className="print:hidden fixed right-6 top-6 bg-aubergine px-4 py-2 text-sm text-ivory">Print / save as PDF</button>;
}
