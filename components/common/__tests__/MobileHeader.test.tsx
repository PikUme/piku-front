import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MobileHeader from '../MobileHeader';

describe('MobileHeader', () => {
  it('로고에 serif 폰트 유틸리티를 적용한다', () => {
    render(<MobileHeader />);

    expect(screen.getByRole('link', { name: 'PikUme' })).toHaveClass('font-serif');
  });
});
