interface ProfileDiaryPhotoGridSkeletonProps {
  count: number;
  className?: string;
  tilesOnly?: boolean;
}

const ProfileDiaryPhotoGridSkeleton = ({
  count,
  className = '',
  tilesOnly = false,
}: ProfileDiaryPhotoGridSkeletonProps) => {
  const tiles = Array.from({ length: count }, (_, index) => (
    <div
      key={index}
      aria-hidden="true"
      data-testid="profile-diary-photo-skeleton-tile"
      className="aspect-[4/5] bg-gray-200 motion-safe:animate-pulse dark:bg-gray-700"
    />
  ));

  if (tilesOnly) {
    return (
      <>
        <span role="status" className="sr-only">
          사진을 불러오는 중
        </span>
        {tiles}
      </>
    );
  }

  return (
    <div role="status" className={className}>
      <span className="sr-only">사진을 불러오는 중</span>
      <div
        aria-hidden="true"
        data-testid="profile-diary-photo-skeleton-content"
        className="grid grid-cols-3 gap-0.5 motion-safe:animate-pulse md:gap-1"
      >
        {tiles}
      </div>
    </div>
  );
};

export default ProfileDiaryPhotoGridSkeleton;
