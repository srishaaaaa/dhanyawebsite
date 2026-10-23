/**
 * Re-mounts on every navigation: a silk veil lifts off the new page and the content settles in.
 * CSS only, pointer-events none, removed for reduced motion — it never delays or blocks content.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div aria-hidden className="page-veil" />
      <div className="page-enter">{children}</div>
    </>
  );
}
