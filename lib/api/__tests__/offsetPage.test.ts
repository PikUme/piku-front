import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OffsetPageResponse } from '@/types/api';
import type { Comment } from '@/types/comment';
import type { Friend } from '@/types/friend';
import api from '../api';
import { getRootComments, getReplies } from '../comment';
import { getFriends, getFriendRequests } from '../friend';
import { searchUsers } from '../search';

vi.mock('../api', () => ({ default: { get: vi.fn() } }));

const anonymousComment: Comment = {
  id: 10,
  diaryId: 1,
  userId: null,
  nickname: null,
  avatar: null,
  content: '익명 댓글',
  parentId: null,
  createdAt: '2026-09-13T10:00:00',
  replyCount: 1,
  canReply: true,
  canEdit: false,
  canDelete: false,
};
const friend: Friend = { userId: 'user-1', nickname: '친구', avatar: null };
const sort = { empty: true, sorted: false, unsorted: true };

const scenarios = [
  { name: '첫 페이지', number: 0, total: 5, totalPages: 3, count: 2, first: true, last: false, offset: 0 },
  { name: '중간 페이지', number: 1, total: 5, totalPages: 3, count: 2, first: false, last: false, offset: 2 },
  { name: '마지막 페이지', number: 2, total: 5, totalPages: 3, count: 1, first: false, last: true, offset: 4 },
  { name: '빈 첫 페이지', number: 0, total: 0, totalPages: 0, count: 0, first: true, last: true, offset: 0 },
  { name: '범위를 벗어난 빈 페이지', number: 8, total: 5, totalPages: 3, count: 0, first: false, last: true, offset: 16 },
] as const;

function pageOf<T>(items: T[], scenario: typeof scenarios[number]): OffsetPageResponse<T> {
  return {
    content: items.slice(0, scenario.count),
    pageable: {
      pageNumber: scenario.number,
      pageSize: 2,
      sort,
      offset: scenario.offset,
      paged: true,
      unpaged: false,
    },
    last: scenario.last,
    totalPages: scenario.totalPages,
    totalElements: scenario.total,
    size: 2,
    number: scenario.number,
    sort,
    first: scenario.first,
    numberOfElements: scenario.count,
    empty: scenario.count === 0,
  };
}

describe('5개 조회 API의 페이지 응답 계약', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it.each(scenarios)('친구 목록: $name의 목록·종료·전체 개수를 변환한다', async scenario => {
    const data = pageOf([friend, { ...friend, userId: 'user-2' }], scenario);
    vi.mocked(api.get).mockResolvedValueOnce({ data });

    const result = await getFriends(scenario.number, 2);

    expect(api.get).toHaveBeenCalledWith('/relation', { params: { page: scenario.number, size: 2 } });
    expect(result.friends).toHaveLength(scenario.count);
    expect(result.hasNext).toBe(!scenario.last);
    expect(result.totalElements).toBe(scenario.total);
    if (scenario.count > 0) expect(result.friends[0].avatar).toBeNull();
  });

  it.each(scenarios)('받은 요청: $name의 목록·종료·전체 개수를 변환한다', async scenario => {
    const data = pageOf([friend, { ...friend, userId: 'user-2' }], scenario);
    vi.mocked(api.get).mockResolvedValueOnce({ data });

    const result = await getFriendRequests(scenario.number, 2);

    expect(api.get).toHaveBeenCalledWith('/relation/requests', { params: { page: scenario.number, size: 2 } });
    expect(result.requests).toHaveLength(scenario.count);
    expect(result.hasNext).toBe(!scenario.last);
    expect(result.totalElements).toBe(scenario.total);
    if (scenario.count > 0) expect(result.requests[0].avatar).toBeNull();
  });

  for (const endpoint of [
    { name: '원댓글', path: '/comments', load: getRootComments, extraParams: { diaryId: 1 } },
    { name: '답글', path: '/comments/1/replies', load: getReplies, extraParams: {} },
  ]) {
    it.each(scenarios)(`${endpoint.name}: $name의 메타데이터와 익명성·권한을 보존한다`, async scenario => {
      const data = pageOf([anonymousComment, { ...anonymousComment, id: 11 }], scenario);
      vi.mocked(api.get).mockResolvedValueOnce({ data });

      const result = await endpoint.load(1, scenario.number, 2);

      expect(api.get).toHaveBeenCalledWith(endpoint.path, {
        params: { ...endpoint.extraParams, page: scenario.number, size: 2, sort: 'createdAt,asc' },
      });
      expect(result).toEqual(data);
      if (scenario.count > 0) {
        expect(result.content[0]).toMatchObject({ userId: null, nickname: null, avatar: null, canReply: true, canEdit: false, canDelete: false });
      }
    });
  }

  it.each(scenarios)('검색: $name의 최상위 페이지 메타데이터를 유지한다', async scenario => {
    const data = pageOf([friend, { ...friend, userId: 'user-2' }], scenario);
    vi.mocked(api.get).mockResolvedValueOnce({ data });

    const result = await searchUsers('친구', scenario.number, 2);

    expect(api.get).toHaveBeenCalledWith('/search', { params: { keyword: '친구', page: scenario.number, size: 2 } });
    expect(result).toEqual(data);
  });

  it('빈 검색어는 네트워크 요청 없이 종료된 빈 페이지를 반환한다', async () => {
    const result = await searchUsers('  ', 3, 2);

    expect(api.get).not.toHaveBeenCalled();
    expect(result).toMatchObject({ content: [], last: true, totalElements: 0, totalPages: 0, number: 3, size: 2, first: false, empty: true, numberOfElements: 0 });
    expect(result.pageable).toMatchObject({ pageNumber: 3, pageSize: 2, offset: 6, paged: true, unpaged: false });
  });

  it.each([
    ['원댓글', () => getRootComments(1, 0, 2)],
    ['답글', () => getReplies(1, 0, 2)],
    ['친구', () => getFriends(0, 2)],
    ['받은 요청', () => getFriendRequests(0, 2)],
    ['검색', () => searchUsers('친구', 0, 2)],
  ] as const)('%s 실패를 빈 성공 페이지로 바꾸지 않는다', async (_name, load) => {
    const failure = { response: { status: 500, data: { type: 'about:blank', title: 'Internal Server Error', status: 500, detail: '조회 실패' } } };
    vi.mocked(api.get).mockRejectedValueOnce(failure);

    await expect(load()).rejects.toBe(failure);
  });
});
