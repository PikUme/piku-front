import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Sidebar from '../Sidebar';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/lib/api/auth', () => ({
  logout: vi.fn(),
}));

vi.mock('../../store/notificationStore', () => ({
  default: () => ({
    unreadCount: 0,
  }),
}));

vi.mock('../InquiryModal', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="inquiry-modal">
      <button onClick={onClose}>피드백 닫기</button>
    </div>
  ),
}));

describe('Sidebar history navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('데스크톱 피드백 모달에서 뒤로가기를 하면 모달만 닫고 페이지를 유지한다', async () => {
    const pushStateSpy = vi.spyOn(window.history, 'pushState');

    render(<Sidebar />);

    fireEvent.click(screen.getByRole('button', { name: '더 보기' }));
    fireEvent.click(screen.getByRole('button', { name: '피드백' }));

    expect(screen.getByTestId('inquiry-modal')).toBeInTheDocument();
    await waitFor(() => {
      expect(pushStateSpy).toHaveBeenCalledWith({ modal: 'sidebar-inquiry' }, '');
    });

    fireEvent.popState(window);

    await waitFor(() => {
      expect(screen.queryByTestId('inquiry-modal')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: '더 보기' })).toBeInTheDocument();
  });
});
