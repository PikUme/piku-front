import { expect, test, type Page } from '@playwright/test';

const sent = {
  message: '인증코드가 발송되었습니다.',
  expiresAt: '2099-10-01T09:05:00',
};
const verified = {
  message: '이메일 인증이 완료되었습니다.',
  emailVerificationToken: 'mock-signup-verification-token',
  expiresAt: '2099-10-01T09:10:00',
};

const mockAuthApi = async (page: Page, reservationUnavailable = false) => {
  const calls: { path: string; body: string | null; headers: Record<string, string> }[] = [];
  await page.route('**/api/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === 'POST') {
      calls.push({ path, body: request.postData(), headers: await request.allHeaders() });
    }
    const body = path === '/api/auth/signup/nickname-reservations' && reservationUnavailable
      ? {
          type: 'about:blank', title: 'Service Unavailable', status: 503,
          detail: '예약 상태를 확인하지 못했습니다. 다시 확인해 주세요.',
          instance: path, code: 'NICKNAME_RESERVATION_UNAVAILABLE',
        }
      : path === '/api/auth/signup/nickname-reservations'
        ? { nickname: '브라우저테스터', expiresAt: '2099-10-01T09:20:00' }
        : path === '/api/auth/email-domains'
      ? ['example.test']
      : path === '/api/characters/fixed'
        ? [{ id: 1, type: 'CAT', displayImageUrl: '/cat.png' }]
        : path === '/api/auth/send-verification/sign-up'
          ? sent
          : path === '/api/auth/verify-code'
            ? verified
            : { message: '회원가입이 완료되었습니다.' };
    await route.fulfill({
      status: path === '/api/auth/signup' ? 201 : path === '/api/auth/signup/nickname-reservations' && reservationUnavailable ? 503 : 200,
      contentType: 'application/json', body: JSON.stringify(body),
    });
  });
  return calls;
};

const sendAndVerify = async (page: Page) => {
  await page.getByPlaceholder('이메일을 입력해주세요').fill('signup@example.test');
  await page.getByRole('button', { name: '전송' }).click();
  await expect(page.getByPlaceholder('인증코드를 입력하세요')).toBeVisible();
  await expect(page.getByRole('button', { name: '재전송' })).toBeEnabled();
  await page.getByPlaceholder('인증코드를 입력하세요').fill('123456');
  await page.getByRole('button', { name: '인증' }).click();
  await expect(page.getByRole('button', { name: '인증완료' })).toBeVisible();
};

test('mock API로 이메일 인증 후 가입하고 토큰을 가입 요청에만 전달한다', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const calls = await mockAuthApi(page);
  await page.goto('/signup');
  await sendAndVerify(page);
  await page.getByPlaceholder('비밀번호를 입력해주세요').fill('password1!');
  await page.getByPlaceholder('비밀번호를 다시 입력해주세요').fill('password1!');
  await page.getByPlaceholder('닉네임을 입력해주세요').fill('브라우저테스터');
  await page.getByLabel('모두 동의').check();
  await page.getByAltText('캐릭터 CAT').click();
  await page.getByRole('button', { name: '예약' }).click();
  await expect(page.getByText(/브라우저테스터 예약 중/)).toBeVisible();
  await page.getByRole('button', { name: '회원 가입' }).click();
  await expect(page.getByText('회원가입이 완료되었습니다.')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);

  const sendCall = calls.find(call => call.path === '/api/auth/send-verification/sign-up');
  const verifyCall = calls.find(call => call.path === '/api/auth/verify-code');
  const signupCall = calls.find(call => call.path === '/api/auth/signup');
  const reservationCall = calls.find(call => call.path === '/api/auth/signup/nickname-reservations');
  expect(JSON.parse(sendCall!.body!)).toEqual({ email: 'signup@example.test' });
  expect(JSON.parse(verifyCall!.body!)).toEqual({ email: 'signup@example.test', code: '123456', type: 'SIGN_UP' });
  expect(JSON.parse(signupCall!.body!)).toEqual({
    email: 'signup@example.test', password: 'password1!', nickname: '브라우저테스터',
    fixedCharacterId: 1, emailVerificationToken: verified.emailVerificationToken,
  });
  expect(JSON.parse(reservationCall!.body!)).toEqual({
    email: 'signup@example.test',
    emailVerificationToken: verified.emailVerificationToken,
    nickname: '브라우저테스터',
  });
  expect(reservationCall!.headers['cache-control']).toBe('no-store');
  expect(sendCall!.headers['cache-control']).toBe('no-store');
  expect(verifyCall!.headers['cache-control']).toBe('no-store');
  expect(signupCall!.headers['cache-control']).toBe('no-store');
  expect(await page.evaluate(() => Object.values(localStorage).join('\n'))).not.toContain(verified.emailVerificationToken);
});

test('모바일 예약 503은 이전 예약 확보를 단정하지 않고 성공 재확인 전 가입을 막는다', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const calls = await mockAuthApi(page, true);
  await page.goto('/signup');
  await sendAndVerify(page);
  await page.getByPlaceholder('비밀번호를 입력해주세요').fill('password1!');
  await page.getByPlaceholder('비밀번호를 다시 입력해주세요').fill('password1!');
  await page.getByPlaceholder('닉네임을 입력해주세요').fill('브라우저테스터');
  await page.getByLabel('모두 동의').check();
  await page.getByRole('button', { name: '예약' }).click();

  await expect(page.getByText(/예약 상태를 확인하지 못했습니다/)).toBeVisible();
  await page.getByRole('button', { name: '다음' }).click();
  await expect(page.getByRole('heading', { name: '캐릭터 선택' })).toBeVisible();
  await page.getByAltText('캐릭터 CAT').click();
  await expect(page.getByRole('button', { name: '회원 가입' })).toBeDisabled();
  await page.getByRole('button', { name: '<' }).click();
  await expect(page.getByRole('button', { name: '다시 확인' })).toBeEnabled();
  await page.getByRole('button', { name: '다시 확인' }).click();
  await expect(page.getByRole('button', { name: '다시 확인' })).toBeEnabled();
  expect(calls.filter(call => call.path === '/api/auth/signup/nickname-reservations')).toHaveLength(2);
  expect(calls.filter(call => call.path === '/api/auth/signup')).toHaveLength(0);
});

test('모바일 내부 단계 이동은 인증 상태를 유지한다', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mockAuthApi(page);
  await page.goto('/signup');
  await sendAndVerify(page);
  await page.getByLabel('모두 동의').check();
  await page.getByRole('button', { name: '다음' }).click();
  await expect(page.getByRole('heading', { name: '캐릭터 선택' })).toBeVisible();
  await page.getByRole('button', { name: '<' }).click();
  await expect(page.getByRole('button', { name: '인증완료' })).toBeVisible();
  await expect(page.getByRole('button', { name: '다음' })).toBeEnabled();
});

test('가입 경로를 나갔다 브라우저 뒤로가기로 돌아오면 화면 인증을 요구한다', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await mockAuthApi(page);
  await page.goto('/signup');
  await sendAndVerify(page);
  await page.locator('a[href="/"] button').click();
  await expect(page).toHaveURL(/\/$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByPlaceholder('인증코드를 입력하세요')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '인증완료' })).toHaveCount(0);
});

test('mock RATE_LIMITED 응답의 resendAvailableAt만 재전송 카운트다운으로 표시한다', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const body = path === '/api/auth/email-domains'
      ? ['example.test']
      : path === '/api/auth/send-verification/sign-up'
        ? {
            type: 'about:blank', title: '요청 제한', status: 429, detail: '잠시 후 다시 시도해주세요.',
            instance: path, code: 'RATE_LIMITED', resendAvailableAt: '2099-10-01T09:11:00',
          }
        : [{ id: 1, type: 'CAT', displayImageUrl: '/cat.png' }];
    await route.fulfill({
      status: path === '/api/auth/send-verification/sign-up' ? 429 : 200,
      contentType: 'application/json', body: JSON.stringify(body),
    });
  });
  await page.goto('/signup');
  await page.getByPlaceholder('이메일을 입력해주세요').fill('signup@example.test');
  await page.getByRole('button', { name: '전송' }).click();
  await expect(page.getByRole('button', { name: /재전송 \(\d+초\)/ })).toBeDisabled();
  await expect(page.getByText('잠시 후 다시 시도해주세요.')).toBeVisible();
});
