'use client';

import { useHeaderVisibility } from '@/hooks/useHeaderVisibility';
import { type FeedSortMode } from '@/lib/api/feed';

interface FeedSortSubHeaderProps {
  selectedSort: FeedSortMode;
  onSortChange: (sort: FeedSortMode) => void;
}

const SORT_OPTIONS: Array<{ value: FeedSortMode; label: string }> = [
  { value: 'latest', label: '최신순' },
  { value: 'recommended', label: '추천순' },
];

const FeedSortSubHeader = ({
  selectedSort,
  onSortChange,
}: FeedSortSubHeaderProps) => {
  const isHeaderVisible = useHeaderVisibility();

  return (
    <div
      data-testid="feed-sort-subheader"
      className={`max-xl:fixed max-xl:left-0 max-xl:right-0 max-xl:top-14 z-20 border-b border-gray-200 bg-white/95 px-2 py-1 backdrop-blur transition-transform duration-200 ease-out dark:border-gray-800 dark:bg-black/95 xl:sticky xl:top-0 xl:mb-4 xl:px-0 xl:py-2 ${
        isHeaderVisible ? 'max-xl:translate-y-0' : 'max-xl:-translate-y-[calc(100%+3.5rem)]'
      }`}
    >
      <div className="mx-auto flex h-8 max-w-[600px] items-center gap-4 xl:h-10">
        {SORT_OPTIONS.map(option => {
          const isSelected = selectedSort === option.value;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSortChange(option.value)}
              className={`relative pb-1 text-[13px] font-medium transition-colors cursor-pointer xl:text-sm ${
                isSelected
                  ? 'text-black dark:text-white'
                  : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
              }`}
            >
              {option.label}
              {isSelected && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-black dark:bg-white" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FeedSortSubHeader;
