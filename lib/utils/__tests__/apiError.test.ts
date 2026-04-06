import { describe, expect, it } from 'vitest';
import {
  getApiErrorMessage,
  getFieldError,
  getProblemDetail,
  hasProblemType,
} from '../apiError';

describe('apiError helpers', () => {
  it('ProblemDetail.detail을 우선 반환한다', () => {
    const message = getApiErrorMessage(
      {
        response: {
          data: {
            type: 'https://api.pikume.com/problems/security/invalid-credentials',
            title: 'Unauthorized',
            status: 401,
            detail: '이메일 또는 비밀번호가 올바르지 않습니다.',
            instance: '/api/auth/login',
          },
        },
      },
      '로그인 중 오류가 발생했습니다.',
    );

    expect(message).toBe('이메일 또는 비밀번호가 올바르지 않습니다.');
  });

  it('ProblemDetail 객체를 파싱한다', () => {
    const problem = getProblemDetail({
      response: {
        data: {
          type: 'https://api.pikume.com/problems/security/invalid-credentials',
          title: 'Unauthorized',
          status: 401,
          detail: '이메일 또는 비밀번호가 올바르지 않습니다.',
          instance: '/api/auth/login',
        },
      },
    });

    expect(problem).toEqual({
      type: 'https://api.pikume.com/problems/security/invalid-credentials',
      title: 'Unauthorized',
      status: 401,
      detail: '이메일 또는 비밀번호가 올바르지 않습니다.',
      instance: '/api/auth/login',
    });
  });

  it('validation problem의 fieldErrors를 읽는다', () => {
    const fieldError = getFieldError(
      {
        response: {
          data: {
            type: 'https://api.pikume.com/problems/validation/invalid-request',
            title: 'Bad Request',
            status: 400,
            detail: '요청 값이 올바르지 않습니다.',
            instance: '/api/diary',
            fieldErrors: {
              content: '일기 내용은 비어 있을 수 없습니다.',
            },
          },
        },
      },
      'content',
    );

    expect(fieldError).toBe('일기 내용은 비어 있을 수 없습니다.');
  });

  it('stable problem type 식별자를 비교한다', () => {
    expect(
      hasProblemType(
        {
          response: {
            data: {
              type: 'https://api.pikume.com/problems/security/invalid-credentials',
              title: 'Unauthorized',
              status: 401,
              detail: '이메일 또는 비밀번호가 올바르지 않습니다.',
              instance: '/api/auth/login',
            },
          },
        },
        'https://api.pikume.com/problems/security/invalid-credentials',
      ),
    ).toBe(true);
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
