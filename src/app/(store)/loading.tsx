export default function Loading() {
  return (
    <div className="container-x py-12" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-14 w-72 mb-10" />
      <div className="grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => <div key={i}><div className="skeleton aspect-[3/4]" /><div className="skeleton mt-3 h-5 w-3/4" /><div className="skeleton mt-2 h-4 w-1/3" /></div>)}
      </div>
    </div>
  );
}
