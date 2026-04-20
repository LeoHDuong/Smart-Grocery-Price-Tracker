export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-gray-100 dark:bg-slate-800 rounded-xl ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/60 dark:via-white/10 to-transparent" />
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900/80 rounded-3xl shadow-md border border-gray-100 dark:border-slate-800/60 p-6 flex items-start gap-4">
      <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  )
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-gray-100 dark:border-slate-800">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  )
}
