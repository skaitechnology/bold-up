export default function Loading() {
  return (
    <div className="mx-auto max-w-[1320px] px-4 py-10 md:px-8">
      <div className="skeleton h-10 w-64" />
      <div className="skeleton mt-4 h-5 w-96 max-w-full" />
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton aspect-[4/5] !rounded-[24px]" />
        ))}
      </div>
    </div>
  );
}
