const placeholderClassName = 'bg-gray-200 dark:bg-gray-700';

const DiaryDetailModalSkeleton = () => (
  <div
    data-testid="diary-detail-modal-skeleton"
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
  >
    <div
      aria-hidden="true"
      className="flex h-[90vh] w-full max-w-9/10 overflow-hidden rounded-lg bg-white shadow-xl motion-safe:animate-pulse dark:bg-gray-800"
    >
      {/* Left side: Image placeholder */}
      <div className={`relative h-full w-3/5 ${placeholderClassName}`} />

      {/* Right side: Content and Comments placeholder */}
      <div className="flex h-full w-2/5 flex-col bg-white dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`h-8 w-8 shrink-0 rounded-full ${placeholderClassName}`} />
            <div className={`h-4 w-20 rounded ${placeholderClassName}`} />
            <div className={`h-3 w-24 rounded ${placeholderClassName}`} />
          </div>
          <div className={`h-6 w-6 rounded ${placeholderClassName}`} />
        </div>

        {/* Content & Comments */}
        <div className="flex-grow space-y-6 overflow-y-auto p-4">
          <div className="flex items-start gap-3">
            <div className={`mt-1 h-8 w-8 shrink-0 rounded-full ${placeholderClassName}`} />
            <div className="flex-1 space-y-2">
              <div className={`h-4 w-3/4 rounded ${placeholderClassName}`} />
              <div className={`h-4 w-full rounded ${placeholderClassName}`} />
              <div className={`h-4 w-2/3 rounded ${placeholderClassName}`} />
            </div>
          </div>

          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className={`h-8 w-8 shrink-0 rounded-full ${placeholderClassName}`} />
              <div className="flex-1 space-y-2">
                <div className={`h-3.5 w-24 rounded ${placeholderClassName}`} />
                <div className={`h-3.5 w-4/5 rounded ${placeholderClassName}`} />
              </div>
            </div>
          ))}
        </div>

        {/* Action Bar */}
        <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <div className={`h-6 w-6 rounded ${placeholderClassName}`} />
            <div className={`h-6 w-6 rounded ${placeholderClassName}`} />
          </div>
          <div className={`mt-2 h-4 w-16 rounded ${placeholderClassName}`} />
        </div>

        {/* Comment Input */}
        <div className="border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className={`h-9 flex-1 rounded-full ${placeholderClassName}`} />
            <div className={`h-8 w-12 rounded ${placeholderClassName}`} />
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default DiaryDetailModalSkeleton;
