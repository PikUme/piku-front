import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FriendListSkeleton from '../FriendListSkeleton';

describe('FriendListSkeleton', () => {
  it('요청한 개수의 장식용 친구 행과 접근 가능한 로딩 상태를 표시한다', () => {
    render(<FriendListSkeleton count={3} />);

    const loadingStatus = screen.getByRole('status');

    expect(
      within(loadingStatus).getByText('친구 목록을 불러오는 중'),
    ).toHaveClass('sr-only');
    expect(screen.getAllByTestId('friend-list-skeleton-row')).toHaveLength(3);
    expect(screen.getByTestId('friend-list-skeleton-content')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });
});
