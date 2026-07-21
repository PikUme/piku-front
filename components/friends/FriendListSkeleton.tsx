interface FriendListSkeletonProps {
  count: number;
}

const placeholderClassName = 'bg-gray-200 dark:bg-gray-700';

const FriendListSkeleton = ({ count }: FriendListSkeletonProps) => (
  <div role="status">
    <span className="sr-only">친구 목록을 불러오는 중</span>
    <ul
      aria-hidden="true"
      data-testid="friend-list-skeleton-content"
      className="motion-safe:animate-pulse"
    >
      {Array.from({ length: count }, (_, index) => (
        <li
          key={index}
          data-testid="friend-list-skeleton-row"
          className="flex items-center justify-between border-b py-3"
        >
          <div className="flex items-center gap-2">
            <div
              className={`h-10 w-10 shrink-0 rounded-full ${placeholderClassName}`}
            />
            <div className={`h-4 w-24 rounded ${placeholderClassName}`} />
          </div>
          <div className={`h-8 w-20 rounded-md ${placeholderClassName}`} />
        </li>
      ))}
    </ul>
  </div>
);

export default FriendListSkeleton;
