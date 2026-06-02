import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DiaryEditModal from '../DiaryEditModal';
import { updateDiary } from '@/lib/api/diary';

vi.mock('@/lib/api/diary', () => ({
  updateDiary: vi.fn(),
}));

const mockUpdateDiary = vi.mocked(updateDiary);

describe('DiaryEditModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('공개범위와 일기 내용만 수정 필드로 보여준다', () => {
    render(
      <DiaryEditModal
        diaryId={1}
        initialStatus="PUBLIC"
        initialContent="원래 일기"
        onCancel={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('공개 범위')).toBeInTheDocument();
    expect(screen.getByLabelText('일기 내용')).toBeInTheDocument();
    expect(screen.queryByLabelText('날짜')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('이미지')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('작성자')).not.toBeInTheDocument();
  });

  it('저장 시 공개범위와 내용만 updateDiary에 전달하고 성공 패치를 알린다', async () => {
    mockUpdateDiary.mockResolvedValue({
      diaryId: 1,
      status: 'PRIVATE',
      content: '수정한 일기',
      updatedAt: '2026-06-02T06:20:00',
    });
    const onSaved = vi.fn();

    render(
      <DiaryEditModal
        diaryId={1}
        initialStatus="PUBLIC"
        initialContent="원래 일기"
        onCancel={vi.fn()}
        onSaved={onSaved}
      />,
    );

    fireEvent.change(screen.getByLabelText('공개 범위'), {
      target: { value: 'PRIVATE' },
    });
    fireEvent.change(screen.getByLabelText('일기 내용'), {
      target: { value: '수정한 일기' },
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(mockUpdateDiary).toHaveBeenCalledWith(1, {
        status: 'PRIVATE',
        content: '수정한 일기',
      });
      expect(onSaved).toHaveBeenCalledWith({
        status: 'PRIVATE',
        content: '수정한 일기',
        updatedAt: '2026-06-02T06:20:00',
      });
    });
  });

  it('저장 실패 시 저장 완료를 알리지 않고 에러를 인라인으로 보여준다', async () => {
    mockUpdateDiary.mockRejectedValue({
      response: {
        data: {
          type: 'https://api.pikume.com/problems/diary/forbidden',
          title: 'Forbidden',
          status: 403,
          detail: '본인 일기만 수정할 수 있습니다.',
          instance: '/api/diary/1',
        },
      },
    });
    const onSaved = vi.fn();

    render(
      <DiaryEditModal
        diaryId={1}
        initialStatus="PUBLIC"
        initialContent="원래 일기"
        onCancel={vi.fn()}
        onSaved={onSaved}
      />,
    );

    fireEvent.change(screen.getByLabelText('일기 내용'), {
      target: { value: '실패할 수정본' },
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(
      await screen.findByText('본인 일기만 수정할 수 있습니다.'),
    ).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('취소하면 저장 API를 호출하지 않고 닫는다', () => {
    const onCancel = vi.fn();

    render(
      <DiaryEditModal
        diaryId={1}
        initialStatus="PUBLIC"
        initialContent="원래 일기"
        onCancel={onCancel}
        onSaved={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('일기 내용'), {
      target: { value: '취소할 수정본' },
    });
    fireEvent.click(screen.getByRole('button', { name: '취소' }));

    expect(mockUpdateDiary).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
