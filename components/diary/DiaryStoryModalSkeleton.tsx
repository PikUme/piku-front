const placeholderClassName = 'bg-gray-700';

const DiaryStoryModalSkeleton = () => (
  <div
    data-testid="diary-story-modal-skeleton"
    className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black"
  >
    <div
      aria-hidden="true"
      className="relative h-full w-full motion-safe:animate-pulse"
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className={`h-8 w-8 shrink-0 rounded-full ${placeholderClassName}`} />
          <div className={`h-4 w-20 rounded ${placeholderClassName}`} />
          <div className={`h-3 w-20 rounded ${placeholderClassName}`} />
        </div>
        <div className={`h-7 w-7 rounded-full ${placeholderClassName}`} />
      </div>

      {/* Image Viewer placeholder */}
      <div className="absolute inset-x-0 top-20 bottom-24 mx-2 rounded-xl bg-gray-800" />

      {/* Story action rail placeholder */}
      <div className="absolute right-4 bottom-8 z-20 flex flex-col items-center gap-5">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex flex-col items-center gap-1.5">
            <div className={`h-7 w-7 rounded-full ${placeholderClassName}`} />
            <div className={`h-3 w-6 rounded ${placeholderClassName}`} />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default DiaryStoryModalSkeleton;
