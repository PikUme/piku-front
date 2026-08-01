import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProfileDiaryPhotoGridSkeleton from '../ProfileDiaryPhotoGridSkeleton';

describe('ProfileDiaryPhotoGridSkeleton', () => {
  it('요청한 개수의 사진 타일과 접근 가능한 로딩 상태를 표시한다', () => {
    render(<ProfileDiaryPhotoGridSkeleton count={3} />);

    const loadingStatus = screen.getByRole('status');
    const content = within(loadingStatus).getByTestId(
      'profile-diary-photo-skeleton-content',
    );
    const tiles = within(loadingStatus).getAllByTestId(
      'profile-diary-photo-skeleton-tile',
    );

    expect(
      within(loadingStatus).getByText('사진을 불러오는 중'),
    ).toHaveClass('sr-only');
    expect(content).toHaveAttribute('aria-hidden', 'true');
    expect(content).toHaveClass(
      'grid',
      'grid-cols-3',
      'motion-safe:animate-pulse',
    );
    expect(tiles).toHaveLength(3);
    expect(tiles[0]).toHaveClass(
      'aspect-[4/5]',
      'bg-gray-200',
      'dark:bg-gray-700',
    );
  });
});
