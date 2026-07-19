import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProfileSkeleton from '../ProfileSkeleton';

describe('ProfileSkeleton', () => {
  it('프로필 전체 구조를 장식용 로딩 상태로 표시한다', () => {
    render(<ProfileSkeleton />);

    const loadingStatus = screen.getByRole('status', {
      name: '프로필을 불러오는 중',
    });
    const decorativeContent = within(loadingStatus).getByTestId(
      'profile-skeleton-content',
    );

    expect(
      within(loadingStatus).getByText('프로필을 불러오는 중'),
    ).toHaveClass('sr-only');
    expect(decorativeContent).toHaveAttribute('aria-hidden', 'true');
    expect(decorativeContent).toHaveClass('motion-safe:animate-pulse');
    expect(
      within(loadingStatus).getByTestId('profile-skeleton-avatar'),
    ).toBeInTheDocument();
    expect(
      within(loadingStatus).getAllByTestId('profile-skeleton-count'),
    ).toHaveLength(2);
    expect(
      within(loadingStatus).getAllByTestId('profile-skeleton-view-option'),
    ).toHaveLength(2);
    expect(
      within(loadingStatus).getAllByTestId('profile-skeleton-month-card'),
    ).toHaveLength(3);
    expect(
      within(loadingStatus).queryByRole('button', { hidden: true }),
    ).not.toBeInTheDocument();
    expect(
      within(loadingStatus).queryByRole('link', { hidden: true }),
    ).not.toBeInTheDocument();
    expect(loadingStatus).not.toHaveAttribute('aria-busy');
  });
});
