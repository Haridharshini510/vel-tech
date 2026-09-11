function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-7 w-20" />
    </div>
  )
}

export function StatCardsSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

export function ChartSkeleton({ height = 220 }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-5 w-36" />
      </div>
      <div className="space-y-3" style={{ height }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-3 w-16 shrink-0" />
            <Skeleton className="h-3 flex-1" style={{ width: `${80 - i * 12}%` }} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ListSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
          <Skeleton className="h-4 w-4 rounded shrink-0" />
        </div>
      ))}
    </div>
  )
}

export function JobCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-4">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex gap-2 pt-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-16 rounded-full" />
          ))}
        </div>
      </div>
      <Skeleton className="h-5 w-14 rounded-full shrink-0" />
    </div>
  )
}

export function CourseCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-5">
      <Skeleton className="h-16 w-16 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-3/5" />
        <Skeleton className="h-3 w-2/5" />
        <div className="flex gap-3 pt-1">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-5 w-5 rounded shrink-0" />
    </div>
  )
}

export function CompanyCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
      <Skeleton className="h-11 w-11 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-12 rounded" />
          <Skeleton className="h-4 w-12 rounded" />
        </div>
      </div>
      <Skeleton className="h-4 w-4 rounded shrink-0" />
    </div>
  )
}

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2 mb-6">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="h-4 w-96" />
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
      {Icon && <Icon className="w-12 h-12 text-gray-300 mx-auto mb-3" />}
      <p className="text-gray-500 font-medium">{title}</p>
      {description && <p className="text-gray-400 text-sm mt-1">{description}</p>}
    </div>
  )
}

export default Skeleton
