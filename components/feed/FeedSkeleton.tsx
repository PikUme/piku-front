interface FeedSkeletonProps {
  count: number;
}

const placeholderClassName = 'bg-gray-200 dark:bg-gray-700';

const FeedSkeletonCard = () => (
  <div
    data-testid="feed-skeleton-card"
    aria-hidden="true"
    className="w-full rounded-xl border border-gray-200 bg-white p-4 shadow-md motion-safe:animate-pulse dark:border-gray-700 dark:bg-gray-800"
  >
    <div className="flex items-center gap-2 p-3">
      <div className={`h-8 w-8 shrink-0 rounded-full ${placeholderClassName}`} />
      <div className={`h-3.5 w-24 rounded ${placeholderClassName}`} />
      <div className={`h-3 w-16 rounded ${placeholderClassName}`} />
    </div>

    <div className={`aspect-square w-full rounded ${placeholderClassName}`} />

    <div className="flex gap-3 p-3">
      <div className={`h-6 w-14 rounded ${placeholderClassName}`} />
      <div className={`h-6 w-14 rounded ${placeholderClassName}`} />
    </div>

    <div className="space-y-2 px-3">
      <div className={`h-4 w-2/3 rounded ${placeholderClassName}`} />
      <div className={`h-4 w-5/6 rounded ${placeholderClassName}`} />
    </div>

    <div className="mt-2 flex items-center gap-3 border-t border-gray-200 p-3 dark:border-gray-700">
      <div className={`h-4 flex-1 rounded ${placeholderClassName}`} />
      <div className={`h-4 w-8 rounded ${placeholderClassName}`} />
    </div>
  </div>
);

const FeedSkeleton = ({ count }: FeedSkeletonProps) => (
  <div
    role="status"
    aria-label="피드를 불러오는 중"
    aria-busy="true"
    className="space-y-8"
  >
    <span className="sr-only">피드를 불러오는 중</span>
    {Array.from({ length: count }, (_, index) => (
      <FeedSkeletonCard key={index} />
    ))}
  </div>
);

export default FeedSkeleton;
