const placeholderClassName = 'rounded bg-gray-200';

const ProfileMonthSkeletonCard = () => (
  <div
    data-testid="profile-skeleton-month-card"
    className="flex items-center"
  >
    <div className="z-10 mr-4 h-6 w-6 shrink-0">
      <div className="mx-auto my-1.5 h-5 w-5 rounded-full bg-gray-300" />
    </div>
    <div className="w-full rounded-lg border bg-white p-4 shadow-sm">
      <div className={`mb-3 h-5 w-20 ${placeholderClassName}`} />
      <div className={`h-2 w-full rounded-full ${placeholderClassName}`} />
    </div>
  </div>
);

const ProfileSkeleton = () => (
  <div
    role="status"
    className="w-full bg-white"
  >
    <span className="sr-only">프로필을 불러오는 중</span>
    <div
      aria-hidden="true"
      data-testid="profile-skeleton-content"
      className="motion-safe:animate-pulse"
    >
      <div className="sticky top-0 z-10 flex h-14 items-center justify-between bg-gray-100 p-4 xl:hidden">
        <div className="h-6 w-6 rounded-full bg-gray-200" />
        <div className={`h-5 w-24 ${placeholderClassName}`} />
        <div className="h-6 w-6" />
      </div>

      <div className="h-32 bg-gray-200" />
      <div className="-mt-16 px-6 pb-6">
        <div
          data-testid="profile-skeleton-avatar"
          className="mx-auto h-32 w-32 rounded-full border-4 border-white bg-gray-300"
        />
        <div className={`mx-auto mt-4 h-7 w-32 ${placeholderClassName}`} />
        <div className="mx-auto mt-4 h-9 w-28 rounded-full bg-gray-200" />

        <div className="my-6 flex items-center justify-center text-center">
          <div data-testid="profile-skeleton-count" className="w-1/2 py-2">
            <div className={`mx-auto h-7 w-10 ${placeholderClassName}`} />
            <div className={`mx-auto mt-2 h-4 w-14 ${placeholderClassName}`} />
          </div>
          <div className="h-8 border-l" />
          <div data-testid="profile-skeleton-count" className="w-1/2 py-2">
            <div className={`mx-auto h-7 w-10 ${placeholderClassName}`} />
            <div className={`mx-auto mt-2 h-4 w-14 ${placeholderClassName}`} />
          </div>
        </div>
      </div>

      <div className="border-t px-6 py-4 text-left">
        <div className={`mb-4 h-6 w-16 ${placeholderClassName}`} />
        <div className="mb-5 grid w-full grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1">
          {Array.from({ length: 2 }, (_, index) => (
            <div
              key={index}
              data-testid="profile-skeleton-view-option"
              className="h-10 rounded-md bg-gray-200"
            />
          ))}
        </div>
        <div className={`mb-3 h-5 w-16 ${placeholderClassName}`} />
        <div className="relative">
          <div className="absolute bottom-2.5 left-2.5 top-2.5 w-1 bg-gray-200" />
          <div className="space-y-4">
            {Array.from({ length: 3 }, (_, index) => (
              <ProfileMonthSkeletonCard key={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default ProfileSkeleton;
