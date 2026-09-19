import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CommentModal from '../CommentModal';
import StoryCommentModal from '../StoryCommentModal';
import DiaryDetailModal from '../DiaryDetailModal';
import type { Comment, CommentPage } from '@/types/comment';
import type { DiaryDetail } from '@/types/diary';
import { createComment, deleteComment, getReplies, getRootComments, updateComment } from '@/lib/api/comment';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next/image', () => ({
  default: ({ fill: _fill, priority: _priority, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean }) => <img {...props} />,
}));
vi.mock('@/components/store/authStore', () => ({
  default: () => ({ isLoggedIn: true, user: { id: 'viewer', nickname: 'viewer', avatar: null } }),
}));
vi.mock('@/lib/api/comment', () => ({
  createComment: vi.fn(), getRootComments: vi.fn(), getReplies: vi.fn(), deleteComment: vi.fn(), updateComment: vi.fn(),
}));

const comment = (id: number, overrides: Partial<Comment> = {}): Comment => ({
  id, diaryId: 1, userId: `user-${id}`, nickname: `작성자 ${id}`, avatar: null,
  content: `댓글 내용 ${id}`, parentId: null, createdAt: '2026-09-13T10:00:00',
  updatedAt: '2026-09-13T10:00:00', replyCount: 0, canReply: true, canEdit: false, canDelete: false,
  ...overrides,
});

const page = (content: Comment[], number = 0, last = true): CommentPage => ({
  content, number, last, size: 10, totalPages: 4, totalElements: 35,
  first: number === 0, numberOfElements: content.length, empty: content.length === 0,
  sort: { empty: false, sorted: true, unsorted: false },
  pageable: {
    pageNumber: number, pageSize: 10, offset: number * 10, paged: true, unpaged: false,
    sort: { empty: false, sorted: true, unsorted: false },
  },
});

const diary = (diaryId: number): DiaryDetail => ({
  diaryId, content: `일기 ${diaryId}`, date: '2026-09-13', status: 'PUBLIC',
  createdAt: '2026-09-13T10:00:00', updatedAt: '2026-09-13T10:00:00',
  isLiked: false, likeCount: 0, commentCount: 50, imgUrls: [],
  nickname: '일기 작성자', avatar: null, userId: 'writer', isOwner: false, comments: [],
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const variants = [
  { name: '댓글 모달', component: (id: number, onCount = vi.fn()) => <CommentModal diaryId={id} initialCommentCount={50} onClose={vi.fn()} onUpdateCommentCount={onCount} /> },
  { name: '스토리 댓글 모달', component: (id: number, onCount = vi.fn()) => <StoryCommentModal diaryId={id} initialCommentCount={50} onClose={vi.fn()} onUpdateCommentCount={onCount} /> },
  { name: '일기 상세 모달', component: (id: number, onCount = vi.fn()) => <DiaryDetailModal diary={diary(id)} onClose={vi.fn()} onCommentCountChange={(_diaryId, count) => onCount(count)} /> },
];

describe.each(variants)('$name 페이지 조회', ({ name, component }) => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('StrictMode effect 재실행에서도 첫 페이지를 한 번만 요청한다', async () => {
    vi.mocked(getRootComments).mockResolvedValue(page([comment(10)]));
    render(<StrictMode>{component(1)}</StrictMode>);
    await screen.findByText('댓글 내용 10');
    expect(getRootComments).toHaveBeenCalledTimes(1);
    expect(getRootComments).toHaveBeenCalledWith(1, 0, 10);
  });

  it('인접 원댓글 페이지의 같은 ID를 한 번만 표시하고 last에서 멈춘다', async () => {
    vi.mocked(getRootComments)
      .mockResolvedValueOnce(page([comment(10)], 0, false))
      .mockResolvedValueOnce(page([comment(10), comment(11)], 1, true));
    render(component(1));
    await screen.findByText('댓글 내용 10');
    fireEvent.click(screen.getByRole('button', { name: /댓글 더 보기/ }));
    await screen.findByText('댓글 내용 11');
    expect(screen.getAllByText('댓글 내용 10')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /댓글 더 보기/ })).not.toBeInTheDocument();
    expect(getRootComments).toHaveBeenLastCalledWith(1, 1, 10);
  });

  it('원댓글 연속 클릭은 한 요청만 보내고 성공 후 바로 다음 페이지를 요청한다', async () => {
    const pending = deferred<CommentPage>();
    vi.mocked(getRootComments)
      .mockResolvedValueOnce(page([comment(10)], 0, false))
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(page([comment(12)], 2, true));
    render(component(1));
    await screen.findByText('댓글 내용 10');
    const more = screen.getByRole('button', { name: /댓글 더 보기/ });
    act(() => { more.click(); more.click(); });
    expect(getRootComments).toHaveBeenCalledTimes(2);
    await act(async () => pending.resolve(page([comment(11)], 1, false)));
    fireEvent.click(screen.getByRole('button', { name: /댓글 더 보기/ }));
    await screen.findByText('댓글 내용 12');
    expect(getRootComments).toHaveBeenLastCalledWith(1, 2, 10);
  });

  it('첫 원댓글 조회 실패 후 0페이지를 다시 요청할 수 있다', async () => {
    vi.mocked(getRootComments)
      .mockRejectedValueOnce(new Error('첫 조회 실패'))
      .mockResolvedValueOnce(page([comment(10)]));
    render(component(1));
    fireEvent.click(await screen.findByRole('button', { name: /댓글 더 보기/ }));
    await screen.findByText('댓글 내용 10');
    expect(getRootComments).toHaveBeenLastCalledWith(1, 0, 10);
  });

  it('후속 원댓글 실패는 페이지를 전진시키지 않는다', async () => {
    vi.mocked(getRootComments)
      .mockResolvedValueOnce(page([comment(10)], 0, false))
      .mockRejectedValueOnce(new Error('후속 조회 실패'))
      .mockResolvedValueOnce(page([comment(11)], 1, true));
    render(component(1));
    await screen.findByText('댓글 내용 10');
    fireEvent.click(screen.getByRole('button', { name: /댓글 더 보기/ }));
    fireEvent.click(await screen.findByRole('button', { name: /댓글 더 보기/ }));
    await screen.findByText('댓글 내용 11');
    expect(getRootComments).toHaveBeenNthCalledWith(2, 1, 1, 10);
    expect(getRootComments).toHaveBeenNthCalledWith(3, 1, 1, 10);
  });

  it('일기를 바꾸면 진행 중인 원댓글 조회와 무관하게 새 0페이지를 불러온다', async () => {
    const previous = deferred<CommentPage>();
    vi.mocked(getRootComments)
      .mockReturnValueOnce(previous.promise)
      .mockResolvedValueOnce(page([comment(20, { diaryId: 2 })]));
    const view = render(component(1));
    await waitFor(() => expect(getRootComments).toHaveBeenCalledTimes(1));
    view.rerender(component(2));
    await screen.findByText('댓글 내용 20');
    await act(async () => previous.resolve(page([comment(10)], 0, false)));
    expect(screen.queryByText('댓글 내용 10')).not.toBeInTheDocument();
    expect(screen.getByText('댓글 내용 20')).toBeInTheDocument();
    expect(getRootComments).toHaveBeenLastCalledWith(2, 0, 10);
    expect(screen.queryByRole('button', { name: /댓글 더 보기/ })).not.toBeInTheDocument();
  });

  it('이전 일기의 실패와 finally가 새 일기의 진행 요청을 해제하지 않는다', async () => {
    const previous = deferred<CommentPage>();
    const current = deferred<CommentPage>();
    vi.mocked(getRootComments)
      .mockReturnValueOnce(previous.promise)
      .mockReturnValueOnce(current.promise);
    const view = render(component(1));
    await waitFor(() => expect(getRootComments).toHaveBeenCalledTimes(1));
    view.rerender(component(2));
    await act(async () => previous.reject(new Error('이전 일기 조회 실패')));
    expect(screen.queryByRole('button', { name: /댓글 더 보기/ })).not.toBeInTheDocument();
    expect(console.error).not.toHaveBeenCalled();
    await act(async () => current.resolve(page([comment(20, { diaryId: 2 })])));
    expect(screen.getByText('댓글 내용 20')).toBeInTheDocument();
  });

  it.each([0, 4])('빈 페이지(number=%s)는 last=true이면 추가 조회를 종료한다', async number => {
    vi.mocked(getRootComments).mockResolvedValueOnce(page([], number, true));
    render(component(1));
    await screen.findByText(/아직 댓글이 없습니다/);
    expect(screen.queryByRole('button', { name: /댓글 더 보기/ })).not.toBeInTheDocument();
    expect(getRootComments).toHaveBeenCalledTimes(1);
  });

  it('답글 연속 열기는 부모별 요청을 한 번만 보내고 페이지를 건너뛰지 않는다', async () => {
    const pending = deferred<CommentPage>();
    vi.mocked(getRootComments).mockResolvedValueOnce(page([comment(10, { replyCount: 3 })]));
    vi.mocked(getReplies)
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(page([comment(12, { parentId: 10 })], 1, true));
    render(component(1));
    const show = await screen.findByRole('button', { name: /답글 보기/ });
    act(() => { show.click(); show.click(); });
    expect(getReplies).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve(page([comment(11, { parentId: 10 })], 0, false)));
    fireEvent.click(screen.getByRole('button', { name: '답글 더 보기' }));
    await screen.findByText('댓글 내용 12');
    expect(getReplies).toHaveBeenLastCalledWith(10, 1, 5);
  });

  it('답글 중복을 제거하고 실패한 페이지를 재시도한 뒤 last에서 멈춘다', async () => {
    vi.mocked(getRootComments).mockResolvedValueOnce(page([comment(10, { replyCount: 3 })]));
    vi.mocked(getReplies)
      .mockResolvedValueOnce(page([comment(11, { parentId: 10 })], 0, false))
      .mockRejectedValueOnce(new Error('답글 조회 실패'))
      .mockResolvedValueOnce(page([comment(11, { parentId: 10 }), comment(12, { parentId: 10 })], 1, true));
    render(component(1));
    fireEvent.click(await screen.findByRole('button', { name: /답글 보기/ }));
    await screen.findByText('댓글 내용 11');
    fireEvent.click(screen.getByRole('button', { name: '답글 더 보기' }));
    fireEvent.click(await screen.findByRole('button', { name: '답글 더 보기' }));
    await screen.findByText('댓글 내용 12');
    expect(screen.getAllByText('댓글 내용 11')).toHaveLength(1);
    expect(getReplies).toHaveBeenNthCalledWith(2, 10, 1, 5);
    expect(getReplies).toHaveBeenNthCalledWith(3, 10, 1, 5);
    expect(screen.queryByRole('button', { name: '답글 더 보기' })).not.toBeInTheDocument();
  });

  it('일기 전환 후 이전 답글 응답을 버리고 돌아오면 답글을 새로 조회한다', async () => {
    const previous = deferred<CommentPage>();
    const parent = comment(10, { replyCount: 2 });
    vi.mocked(getRootComments)
      .mockResolvedValueOnce(page([parent]))
      .mockResolvedValueOnce(page([comment(20, { diaryId: 2 })]))
      .mockResolvedValueOnce(page([parent]));
    vi.mocked(getReplies)
      .mockReturnValueOnce(previous.promise)
      .mockResolvedValueOnce(page([comment(12, { parentId: 10 })]));
    const view = render(component(1));
    fireEvent.click(await screen.findByRole('button', { name: /답글 보기/ }));
    view.rerender(component(2));
    await screen.findByText('댓글 내용 20');
    await act(async () => previous.resolve(page([comment(11, { parentId: 10 })])));
    view.rerender(component(1));
    await screen.findByText('댓글 내용 10');
    expect(screen.queryByText('댓글 내용 11')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /답글 보기/ }));
    await screen.findByText('댓글 내용 12');
    expect(getReplies).toHaveBeenLastCalledWith(10, 0, 5);
  });

  it('루트 totalElements 대신 답글을 포함한 기존 전체 개수에서 작성 수를 증가시킨다', async () => {
    vi.mocked(getRootComments).mockResolvedValueOnce(page([comment(10)]));
    vi.mocked(createComment).mockResolvedValueOnce(comment(11));
    const onCount = vi.fn();
    render(component(1, onCount));
    await screen.findByText('댓글 내용 10');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '새 댓글' } });
    fireEvent.click(screen.getByRole('button', { name: '게시' }));
    await waitFor(() => expect(onCount).toHaveBeenLastCalledWith(51));
  });

  it('nullable 익명 작성자의 답글 입력과 전송에 null 이름을 넣지 않는다', async () => {
    vi.mocked(getRootComments).mockResolvedValueOnce(page([comment(10, { userId: null, nickname: null })]));
    vi.mocked(createComment).mockResolvedValueOnce(comment(11, { parentId: 10 }));
    render(component(1));
    fireEvent.click(await screen.findByRole('button', { name: '답글 달기' }));
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('@익명 ');
    expect(input).toHaveAttribute('placeholder', '@익명님에게 답글 남기기');
    fireEvent.change(input, { target: { value: '@익명 답글 내용' } });
    fireEvent.click(screen.getByRole('button', { name: '게시' }));
    await waitFor(() => expect(createComment).toHaveBeenCalledWith({ diaryId: 1, parentId: 10, content: '답글 내용' }));
  });

  it.each(['성공', '실패'])('이전 일기의 답글 작성 결과(%s)는 새 일기의 목록과 개수를 바꾸지 않는다', async outcome => {
    const previous = deferred<Comment>();
    vi.mocked(getRootComments)
      .mockResolvedValueOnce(page([comment(10)]))
      .mockResolvedValueOnce(page([comment(20, { diaryId: 2 })]));
    vi.mocked(createComment).mockReturnValueOnce(previous.promise);
    const onCount = vi.fn();
    const view = render(component(1, onCount));
    fireEvent.click(await screen.findByRole('button', { name: '답글 달기' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '@작성자 10 이전 답글' } });
    fireEvent.click(screen.getByRole('button', { name: '게시' }));
    await screen.findByText('이전 답글');
    view.rerender(component(2, onCount));
    await screen.findByText('댓글 내용 20');
    onCount.mockClear();
    await act(async () => {
      if (outcome === '성공') previous.resolve(comment(11, { parentId: 10 }));
      else previous.reject(new Error('이전 답글 실패'));
    });
    expect(screen.getByText('댓글 내용 20')).toBeInTheDocument();
    expect(screen.queryByText('이전 답글')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('');
    expect(onCount).not.toHaveBeenCalled();
    expect(window.alert).not.toHaveBeenCalled();
  });

  it('일기 전환은 새 댓글 작성을 허용하고 이전 작성 finally는 새 제출을 해제하지 않는다', async () => {
    const previous = deferred<Comment>();
    const current = deferred<Comment>();
    vi.mocked(getRootComments)
      .mockResolvedValueOnce(page([comment(10)]))
      .mockResolvedValueOnce(page([comment(20, { diaryId: 2 })]));
    vi.mocked(createComment).mockReturnValueOnce(previous.promise).mockReturnValueOnce(current.promise);
    const view = render(component(1));
    await screen.findByText('댓글 내용 10');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '이전 작성' } });
    fireEvent.click(screen.getByRole('button', { name: '게시' }));
    view.rerender(component(2));
    await screen.findByText('댓글 내용 20');
    expect(screen.getByRole('textbox')).toBeEnabled();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '현재 작성' } });
    fireEvent.click(screen.getByRole('button', { name: '게시' }));
    await act(async () => previous.resolve(comment(11)));
    expect(screen.getByRole('textbox')).toBeDisabled();
    await act(async () => current.resolve(comment(21, { diaryId: 2, content: '현재 작성' })));
    expect(screen.getByText('현재 작성')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeEnabled();
  });

  it.each(['성공', '실패'])('이전 일기 댓글 수정 결과(%s)와 제출 후 정리가 새 입력을 덮어쓰지 않는다', async outcome => {
    const previous = deferred<Comment>();
    vi.mocked(getRootComments)
      .mockResolvedValueOnce(page([comment(10, { canEdit: true })]))
      .mockResolvedValueOnce(page([comment(20, { diaryId: 2 })]));
    vi.mocked(updateComment).mockReturnValueOnce(previous.promise);
    const view = render(component(1));
    await screen.findByText('댓글 내용 10');
    const item = document.getElementById('comment-10')!;
    fireEvent.mouseEnter(item);
    fireEvent.click(within(item).getAllByRole('button').at(-1)!);
    fireEvent.click(screen.getByRole('button', { name: '수정' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '이전 수정' } });
    fireEvent.click(screen.getByRole('button', { name: '게시' }));
    view.rerender(component(2));
    await screen.findByText('댓글 내용 20');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '새 일기 입력' } });
    await act(async () => {
      if (outcome === '성공') previous.resolve(comment(10, { content: '이전 수정' }));
      else previous.reject(new Error('이전 수정 실패'));
    });
    expect(screen.getByText('댓글 내용 20')).toBeInTheDocument();
    expect(screen.queryByText('댓글 내용 10')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('새 일기 입력');
    expect(window.alert).not.toHaveBeenCalled();
  });

  it('이전 일기 댓글 삭제 실패가 새 일기의 목록과 개수를 되돌리지 않는다', async () => {
    const previous = deferred<void>();
    vi.mocked(getRootComments)
      .mockResolvedValueOnce(page([comment(10, { canDelete: true })]))
      .mockResolvedValueOnce(page([comment(20, { diaryId: 2 })]));
    vi.mocked(deleteComment).mockReturnValueOnce(previous.promise);
    const onCount = vi.fn();
    const view = render(component(1, onCount));
    await screen.findByText('댓글 내용 10');
    const item = document.getElementById('comment-10')!;
    fireEvent.mouseEnter(item);
    fireEvent.click(within(item).getAllByRole('button').at(-1)!);
    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    view.rerender(component(2, onCount));
    await screen.findByText('댓글 내용 20');
    onCount.mockClear();
    await act(async () => previous.reject(new Error('이전 삭제 실패')));
    expect(screen.getByText('댓글 내용 20')).toBeInTheDocument();
    expect(screen.queryByText('댓글 내용 10')).not.toBeInTheDocument();
    expect(onCount).not.toHaveBeenCalled();
    expect(window.alert).not.toHaveBeenCalled();
  });

  it.each(['원댓글', '답글'])('%s 수정 실패는 대기 중 추가 조회한 답글과 페이지 종료 상태를 보존한다', async target => {
    const pending = deferred<Comment>();
    vi.mocked(getRootComments).mockResolvedValueOnce(page([comment(10, { replyCount: 6, canEdit: true })]));
    vi.mocked(getReplies)
      .mockResolvedValueOnce(page([comment(11, { parentId: 10, canEdit: true })], 0, false))
      .mockResolvedValueOnce(page([comment(12, { parentId: 10 })], 1, true));
    vi.mocked(updateComment).mockReturnValueOnce(pending.promise);
    render(component(1));
    fireEvent.click(await screen.findByRole('button', { name: /답글 보기/ }));
    await screen.findByText('댓글 내용 11');
    const targetId = target === '원댓글' ? 10 : 11;
    const item = document.getElementById(`comment-${targetId}`)!;
    fireEvent.mouseEnter(item);
    fireEvent.click(within(item).getByRole('button', { name: '' }));
    fireEvent.click(screen.getByRole('button', { name: '수정' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '실패할 수정' } });
    fireEvent.click(screen.getByRole('button', { name: '게시' }));
    fireEvent.click(screen.getByRole('button', { name: '답글 더 보기' }));
    await screen.findByText('댓글 내용 12');
    await act(async () => pending.reject(new Error('수정 실패')));
    expect(screen.getByText(`댓글 내용 ${targetId}`)).toBeInTheDocument();
    expect(screen.getByText('댓글 내용 12')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '답글 더 보기' })).not.toBeInTheDocument();
    expect(getReplies).toHaveBeenCalledTimes(2);
  });

  // 기존에 삭제 롤백을 제공하는 스토리·상세 모달의 페이지 보존 계약이다.
  if (name === '댓글 모달') return;

  it('답글 삭제 롤백은 대기 중 추가 조회한 답글과 페이지 종료 상태를 보존한다', async () => {
    const pending = deferred<void>();
    vi.mocked(getRootComments).mockResolvedValueOnce(page([comment(10, { replyCount: 6 })]));
    vi.mocked(getReplies)
      .mockResolvedValueOnce(page([comment(11, { parentId: 10, canDelete: true })], 0, false))
      .mockResolvedValueOnce(page([comment(12, { parentId: 10 })], 1, true));
    vi.mocked(deleteComment).mockReturnValueOnce(pending.promise);
    render(component(1));
    fireEvent.click(await screen.findByRole('button', { name: /답글 보기/ }));
    await screen.findByText('댓글 내용 11');
    const item = document.getElementById('comment-11')!;
    fireEvent.mouseEnter(item);
    fireEvent.click(within(item).getByRole('button', { name: '' }));
    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    fireEvent.click(screen.getByRole('button', { name: '답글 더 보기' }));
    await screen.findByText('댓글 내용 12');
    await act(async () => pending.reject(new Error('삭제 실패')));
    expect(screen.getByText('댓글 내용 11')).toBeInTheDocument();
    expect(screen.getByText('댓글 내용 12')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '답글 더 보기' })).not.toBeInTheDocument();
    expect(getReplies).toHaveBeenCalledTimes(2);
  });

  it('원댓글 삭제 롤백은 대기 중 추가 조회한 원댓글을 보존한다', async () => {
    const pending = deferred<void>();
    vi.mocked(getRootComments)
      .mockResolvedValueOnce(page([comment(10, { canDelete: true })], 0, false))
      .mockResolvedValueOnce(page([comment(20)], 1, true));
    vi.mocked(deleteComment).mockReturnValueOnce(pending.promise);
    render(component(1));
    await screen.findByText('댓글 내용 10');
    const item = document.getElementById('comment-10')!;
    fireEvent.mouseEnter(item);
    fireEvent.click(within(item).getByRole('button', { name: '' }));
    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    fireEvent.click(screen.getByRole('button', { name: /댓글 더 보기/ }));
    await screen.findByText('댓글 내용 20');
    await act(async () => pending.reject(new Error('삭제 실패')));
    expect(screen.getByText('댓글 내용 10')).toBeInTheDocument();
    expect(screen.getByText('댓글 내용 20')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /댓글 더 보기/ })).not.toBeInTheDocument();
  });
});
