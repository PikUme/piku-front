export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  fieldErrors?: Record<string, string>;
}

export interface MessageResponse {
  message: string;
}

export interface PageSort {
  empty: boolean;
  sorted: boolean;
  unsorted: boolean;
}

/** 번호 기반 조회 API의 명시적 응답 계약. 다음 페이지 여부는 최상위 last로 판단한다. */
export interface OffsetPageResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: PageSort;
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  last: boolean;
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  sort: PageSort;
  first: boolean;
  numberOfElements: number;
  empty: boolean;
}

/** 기존 페이지 응답 소비 코드의 호환 타입. */
export type Page<T> = OffsetPageResponse<T>;
