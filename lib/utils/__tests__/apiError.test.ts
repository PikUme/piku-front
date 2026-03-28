import { describe, expect, it } from 'vitest';
import { getApiErrorMessage } from '../apiError';

describe('getApiErrorMessage', () => {
  it('공통 에러 응답의 message를 반환한다', () => {
    const message = getApiErrorMessage(
      {
        response: {
          data: {
            status: 401,
            message: '이메일 또는 비밀번호가 올바르지 않습니다.',
          },
        },
      },
      '로그인 중 오류가 발생했습니다.',
    );

    expect(message).toBe('이메일 또는 비밀번호가 올바르지 않습니다.');
  });

  it('문자열 응답도 그대로 반환한다', () => {
    const message = getApiErrorMessage(
      {
        response: {
          data: '로그인에 실패했습니다.',
        },
      },
      '로그인 중 오류가 발생했습니다.',
    );

    expect(message).toBe('로그인에 실패했습니다.');
  });

  it('응답 본문이 없으면 Error.message를 사용한다', () => {
    const message = getApiErrorMessage(
      new Error('network error'),
      '로그인 중 오류가 발생했습니다.',
    );

    expect(message).toBe('network error');
  });

  it('어떤 메시지도 없으면 fallback을 반환한다', () => {
    const message = getApiErrorMessage(
      {
        response: {
          data: {
            status: 500,
          },
        },
      },
      '로그인 중 오류가 발생했습니다.',
    );

    expect(message).toBe('로그인 중 오류가 발생했습니다.');
  });
});
