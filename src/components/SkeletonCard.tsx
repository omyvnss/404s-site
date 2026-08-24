export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {/* Image skeleton */}
      <div className="aspect-[16/10] w-full bg-surface" />
      {/* Footer skeleton */}
      <div className="flex items-center gap-3 px-4 py-3 bg-surface border-t border-border">
        <div className="w-4 h-4 rounded-sm bg-border flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-24 rounded bg-border" />
          <div className="h-2.5 w-16 rounded bg-border" />
        </div>
        <div className="w-6 h-6 rounded bg-border flex-shrink-0" />
      </div>
    </div>
  )
}
