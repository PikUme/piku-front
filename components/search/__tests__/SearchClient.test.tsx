import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { searchUsers } from '@/lib/api/search';
import type { Page } from '@/types/api';
import type { Friend } from '@/types/friend';
import SearchClient from '../SearchClient';

vi.mock('@/lib/api/search', () => ({ searchUsers: vi.fn() }));
const mockSearchUsers = vi.mocked(searchUsers);
let intersectionCallback: IntersectionObserverCallback;
class MockIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) { intersectionCallback = callback; }
  observe = vi.fn();
  disconnect = vi.fn();
}

const friend = (userId: string): Friend => ({ userId, nickname: userId, avatar: '/default-avatar.png' });
const page = (content: Friend[], last = true, number = 0): Page<Friend> => ({
  content, last, number, totalPages: last ? number + 1 : number + 2,
  totalElements: 25, size: 20, first: number === 0, numberOfElements: content.length, empty: content.length === 0,
  sort: { empty: true, sorted: false, unsorted: true },
  pageable: { pageNumber: number, pageSize: 20, offset: number * 20, paged: true, unpaged: false, sort: { empty: true, sorted: false, unsorted: true } },
});
const deferred = () => {
  let resolve!: (value: Page<Friend>) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<Page<Friend>>((resolvePromise, rejectPromise) => { resolve = resolvePromise; reject = rejectPromise; });
  return { promise, resolve, reject };
};
const enterQuery = async (query: string) => {
  fireEvent.change(screen.getByRole('textbox'), { target: { value: query } });
  await act(async () => vi.advanceTimersByTimeAsync(500));
};
const intersect = () => intersectionCallback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);

describe('SearchClient pagination', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => { vi.useRealTimers(); });

  it('검색어를 지운 뒤 도착하는 이전 결과를 표시하지 않는다', async () => {
    const previous = deferred();
    mockSearchUsers.mockReturnValueOnce(previous.promise);
    render(<SearchClient />);
    await enterQuery('old');
    await enterQuery('');
    await act(async () => previous.resolve(page([friend('이전 결과')])));
    expect(screen.queryByText('이전 결과')).not.toBeInTheDocument();
    expect(screen.getByText('검색어를 입력해주세요.')).toBeInTheDocument();
    expect(mockSearchUsers.mock.calls).toEqual([['old', 0]]);
  });

  it('검색어 변경 뒤 이전 추가 페이지가 늦게 완료되어도 새 결과에 섞이지 않는다', async () => {
    const previousMore = deferred();
    mockSearchUsers.mockResolvedValueOnce(page([friend('이전 첫 결과')], false)).mockReturnValueOnce(previousMore.promise)
      .mockResolvedValueOnce(page([friend('새 결과')]));
    render(<SearchClient />);
    await enterQuery('old');
    await act(async () => intersect());
    await enterQuery('new');
    await act(async () => previousMore.resolve(page([friend('이전 추가 결과')], true, 1)));
    expect(screen.getByText('새 결과')).toBeInTheDocument();
    expect(screen.queryByText('이전 추가 결과')).not.toBeInTheDocument();
    expect(screen.queryByText('이전 첫 결과')).not.toBeInTheDocument();
  });

  it('이전 검색 실패가 현재 검색의 로딩과 오류 상태를 바꾸지 않는다', async () => {
    const previous = deferred();
    const current = deferred();
    mockSearchUsers.mockReturnValueOnce(previous.promise).mockReturnValueOnce(current.promise);
    render(<SearchClient />);
    await enterQuery('old');
    await enterQuery('new');
    await act(async () => previous.reject(new Error('old error')));
    expect(screen.queryByText('검색 중 오류가 발생했습니다.')).not.toBeInTheDocument();
    expect(screen.queryByText('검색 결과가 없습니다.')).not.toBeInTheDocument();
    await act(async () => current.resolve(page([friend('새 결과')])));
    expect(screen.getByText('새 결과')).toBeInTheDocument();
  });

  it('연속 교차 이벤트에 페이지를 건너뛰지 않고 중복 결과를 제거하며 last에서 종료한다', async () => {
    const next = deferred();
    mockSearchUsers.mockResolvedValueOnce(page([friend('첫 결과')], false)).mockReturnValueOnce(next.promise);
    render(<SearchClient />);
    await enterQuery('query');
    await act(async () => { intersect(); intersect(); });
    expect(mockSearchUsers.mock.calls).toEqual([['query', 0], ['query', 1]]);
    await act(async () => next.resolve(page([friend('첫 결과'), friend('둘째 결과')], true, 1)));
    expect(screen.getAllByText('첫 결과')).toHaveLength(1);
    expect(screen.getByText('둘째 결과')).toBeInTheDocument();
    await act(async () => intersect());
    expect(mockSearchUsers).toHaveBeenCalledTimes(2);
  });

  it('추가 페이지 실패 후 같은 페이지를 재시도하고 기존 결과를 유지한다', async () => {
    mockSearchUsers.mockResolvedValueOnce(page([friend('첫 결과')], false)).mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(page([friend('다음 결과')], true, 1));
    render(<SearchClient />);
    await enterQuery('query');
    await act(async () => intersect());
    expect(screen.getByText('첫 결과')).toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '다시 시도' })));
    expect(screen.getByText('다음 결과')).toBeInTheDocument();
    expect(mockSearchUsers.mock.calls).toEqual([['query', 0], ['query', 1], ['query', 1]]);
  });

  it('빈 마지막 페이지는 검색 결과 없음으로 표시하고 추가 요청하지 않는다', async () => {
    mockSearchUsers.mockResolvedValueOnce(page([]));
    render(<SearchClient />);
    await enterQuery('nobody');
    expect(screen.getByText('검색 결과가 없습니다.')).toBeInTheDocument();
    expect(mockSearchUsers.mock.calls).toEqual([['nobody', 0]]);
  });

  it('첫 검색 실패는 결과 없음으로 표시하지 않고 0번 페이지를 재시도한다', async () => {
    mockSearchUsers.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(page([friend('성공 결과')]));
    render(<SearchClient />);
    await enterQuery('query');
    expect(screen.queryByText('검색 결과가 없습니다.')).not.toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '다시 시도' })));
    expect(screen.getByText('성공 결과')).toBeInTheDocument();
    expect(mockSearchUsers.mock.calls).toEqual([['query', 0], ['query', 0]]);
  });

  it('검색어 입력이 바뀌면 새 debounce가 끝나기 전에도 이전 응답을 무시한다', async () => {
    const previous = deferred();
    mockSearchUsers.mockReturnValueOnce(previous.promise);
    render(<SearchClient />);
    await enterQuery('old');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new' } });
    await act(async () => previous.resolve(page([friend('이전 결과')])));
    expect(screen.queryByText('이전 결과')).not.toBeInTheDocument();
    expect(mockSearchUsers.mock.calls).toEqual([['old', 0]]);
  });

  it('화면을 닫으면 진행 중인 검색의 오류와 후속 조회를 무시한다', async () => {
    const next = deferred();
    mockSearchUsers.mockResolvedValueOnce(page([friend('첫 결과')], false)).mockReturnValueOnce(next.promise);
    const { unmount } = render(<SearchClient />);
    await enterQuery('query');
    await act(async () => intersect());
    unmount();
    await act(async () => next.reject(new Error('late error')));
    await act(async () => intersect());
    expect(console.error).not.toHaveBeenCalled();
    expect(mockSearchUsers.mock.calls).toEqual([['query', 0], ['query', 1]]);
  });
});
