import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FriendsClient from '../FriendsClient';
import { getFriendRequests } from '@/lib/api/friend';

const { searchParamsState } = vi.hoisted(() => ({
  searchParamsState: { value: '' },
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(searchParamsState.value),
}));

vi.mock('../FriendList', () => ({
  default: () => <div data-testid="friend-list">친구 목록</div>,
}));

vi.mock('@/components/common/UserProfile', () => ({
  default: ({ nickname }: { nickname: string }) => <span>{nickname}</span>,
}));

vi.mock('@/lib/api/friend', () => ({
  getFriendRequests: vi.fn(),
  acceptFriendRequest: vi.fn(),
  rejectFriendRequest: vi.fn(),
}));

const mockGetFriendRequests = vi.mocked(getFriendRequests);
let intersectionCallback: IntersectionObserverCallback;
class MockIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) { intersectionCallback = callback; }
  observe = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

const firstPage = { requests: [{ userId: 'user-1', nickname: '첫 요청', avatar: '' }], hasNext: true, totalElements: 12 };

describe('FriendsClient', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    searchParamsState.value = '';
    mockGetFriendRequests.mockResolvedValue({
      requests: [],
      hasNext: false,
      totalElements: 0,
    });
  });

  it('기본 진입 시 친구 목록 탭을 보여준다', async () => {
    render(<FriendsClient />);

    expect(screen.getByTestId('friend-list')).toBeInTheDocument();
    expect(screen.queryByText('받은 친구 요청이 없습니다.')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(mockGetFriendRequests).toHaveBeenCalledWith(0, 10);
    });
  });

  it('tab=requests 쿼리로 진입하면 친구 요청 탭을 보여준다', async () => {
    searchParamsState.value = 'tab=requests';

    render(<FriendsClient />);

    expect(screen.getByText('받은 친구 요청이 없습니다.')).toBeInTheDocument();
    expect(screen.queryByTestId('friend-list')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(mockGetFriendRequests).toHaveBeenCalledWith(0, 10);
    });
  });

  it('최초 페이지 이후에는 교차 이벤트를 기다리고 전체 요청 수를 배지에 표시한다', async () => {
    searchParamsState.value = 'tab=requests';
    mockGetFriendRequests.mockResolvedValueOnce(firstPage).mockResolvedValue({ requests: [], hasNext: false, totalElements: 12 });
    render(<FriendsClient />);
    await screen.findByText('첫 요청');
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(mockGetFriendRequests.mock.calls).toEqual([[0, 10]]);
  });

  it('추가 조회를 중복 실행하지 않고 같은 사용자는 한 번만 표시하며 마지막 페이지에서 멈춘다', async () => {
    searchParamsState.value = 'tab=requests';
    let resolveNext!: (value: typeof firstPage) => void;
    mockGetFriendRequests.mockResolvedValueOnce(firstPage).mockReturnValueOnce(new Promise(resolve => { resolveNext = resolve; }));
    render(<FriendsClient />);
    await screen.findByText('첫 요청');
    await act(async () => {
      const callback = intersectionCallback;
      callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
      callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    });
    expect(mockGetFriendRequests.mock.calls).toEqual([[0, 10], [1, 10]]);
    await act(async () => resolveNext({ requests: [...firstPage.requests, { userId: 'user-2', nickname: '둘째 요청', avatar: '' }], hasNext: false, totalElements: 12 }));
    expect(screen.getAllByText('첫 요청')).toHaveLength(1);
    expect(screen.getByText('둘째 요청')).toBeInTheDocument();
    await act(async () => intersectionCallback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(mockGetFriendRequests).toHaveBeenCalledTimes(2);
  });

  it('첫 조회 실패를 자동 반복하지 않고 사용자가 같은 페이지를 재시도할 수 있다', async () => {
    searchParamsState.value = 'tab=requests';
    mockGetFriendRequests.mockRejectedValueOnce(new Error('network')).mockResolvedValue({ ...firstPage, hasNext: false });
    render(<FriendsClient />);
    const retry = await screen.findByRole('button', { name: '다시 시도' });
    expect(mockGetFriendRequests.mock.calls).toEqual([[0, 10]]);
    fireEvent.click(retry);
    await screen.findByText('첫 요청');
    expect(mockGetFriendRequests.mock.calls).toEqual([[0, 10], [0, 10]]);
  });

  it('추가 요청 조회 실패 후 목록과 총개수를 유지하고 같은 페이지를 재시도한다', async () => {
    searchParamsState.value = 'tab=requests';
    mockGetFriendRequests.mockResolvedValueOnce(firstPage).mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ requests: [{ userId: 'user-2', nickname: '둘째 요청', avatar: '' }], hasNext: false, totalElements: 12 });
    render(<FriendsClient />);
    await screen.findByText('첫 요청');
    await act(async () => intersectionCallback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(screen.getByText('첫 요청')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: '다시 시도' }));
    await screen.findByText('둘째 요청');
    expect(mockGetFriendRequests.mock.calls).toEqual([[0, 10], [1, 10], [1, 10]]);
  });

  it('친구 목록 탭으로 돌아간 뒤 이전 요청 목록 교차 이벤트를 무시한다', async () => {
    searchParamsState.value = 'tab=requests';
    mockGetFriendRequests.mockResolvedValueOnce(firstPage);
    render(<FriendsClient />);
    await screen.findByText('첫 요청');
    const callback = intersectionCallback;
    fireEvent.click(screen.getByRole('button', { name: '친구 목록' }));
    await act(async () => callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(mockGetFriendRequests.mock.calls).toEqual([[0, 10]]);
  });
});
