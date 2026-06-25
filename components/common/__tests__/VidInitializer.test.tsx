import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VidInitializer from '../VidInitializer';

const { getOrCreateVidMock } = vi.hoisted(() => ({
  getOrCreateVidMock: vi.fn(),
}));

vi.mock('@/lib/utils/vid', () => ({
  getOrCreateVid: getOrCreateVidMock,
}));

describe('VidInitializer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('사이트 진입 시 vid를 준비한다', () => {
    render(<VidInitializer />);

    expect(getOrCreateVidMock).toHaveBeenCalledTimes(1);
  });
});
