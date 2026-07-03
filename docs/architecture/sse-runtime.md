# SSE 동작 원리

## 이 문서가 설명하는 것
이 문서는 piku-front가 브라우저에서 알림 SSE를 어떻게 연결하고 유지하는지 설명한다.
특히 PC 브라우저와 모바일 브라우저에서 연결 방식이 달라지는 이유를 다룬다.

여기서 말하는 SSE는 알림 배지에 쓰는 읽지 않은 알림 수를 받기 위한 연결이다.
백엔드 SSE 이벤트 형식, FCM, PWA service worker, 알림 목록 화면 정책은 이 문서에서 다루지 않는다.

## 한눈에 보기
- SSE는 로그인한 사용자에게만 열린다.
- 시작 위치는 `components/common/SSEInitializer.tsx`다.
- PC 브라우저에서는 SharedWorker를 써서 같은 사이트를 연 여러 탭이 SSE 연결 하나를 함께 쓴다.
- 모바일 브라우저에서는 SharedWorker를 쓰지 않고, 각 탭이 직접 SSE에 연결한다.
- 알림 배지 숫자는 각 탭의 `notificationStore`에 저장된다.
- PC 브라우저 방식에서는 SharedWorker가 여러 탭에 같은 알림 숫자를 알려준다.
- 토큰 조회와 재발급은 SharedWorker가 직접 하지 않고, 탭의 기존 로그인 로직이 처리한다.

## 각 파일이 하는 일

### `components/common/SSEInitializer.tsx`
로그인 상태가 되면 SSE 연결을 시작하는 컴포넌트다.
먼저 SharedWorker를 쓸 수 있는지 확인하고, 가능하면 worker에 연결 정보를 보낸다.
모바일이거나 SharedWorker를 만들 수 없는 상황이면 worker를 쓰지 않고 그 탭에서 직접 SSE를 연다.

worker가 알림 숫자를 보내면 `notificationStore`에 반영한다.
worker가 토큰 재발급을 요청하면 기존 `refreshAccessToken()` 흐름을 실행하고 결과를 worker에 알려준다.

### `lib/sse/sseSharedWorkerClient.ts`
탭과 SharedWorker를 이어주는 코드다.
현재 브라우저가 SharedWorker를 쓸 수 있는지, 모바일 브라우저인지 판단한다.
worker를 사용할 수 있으면 탭마다 worker와 대화할 통로를 열고, 연결 시작, 화면 복귀, 토큰 재발급 결과, 알림 숫자 변경 같은 일을 worker에 전달한다.

알림을 읽거나 삭제해서 숫자가 바뀌면 이 파일을 통해 worker에 최신 숫자를 알려준다.
그래야 다른 탭도 같은 숫자를 볼 수 있다.

### `lib/sse/sharedWorkerController.ts`
SharedWorker 안에서 실제 SSE 연결을 관리한다.
worker에 붙은 탭 목록, 현재 access token, 서버 URL, SSE 연결, 재연결 타이머, 마지막 알림 숫자를 기억한다.

탭이 하나라도 연결되어 있고 token이 있으면 `/sse/subscribe`를 연다.
마지막 탭이 사라지면 SSE 연결과 타이머를 닫고, worker 메모리에 있던 token과 알림 숫자도 지운다.

### `components/notifications/NotificationsClient.tsx`
알림 화면에서 읽음, 모두 읽음, 삭제가 성공했을 때 알림 숫자를 줄인다.
PC 브라우저 방식에서는 바뀐 숫자를 SharedWorker에도 알려서 다른 탭의 배지도 같이 맞춘다.

## PC 브라우저에서는 이렇게 동작한다
PC 브라우저처럼 SharedWorker를 안정적으로 사용할 수 있는 환경에서는 여러 탭이 SSE 연결 하나를 함께 쓰도록 한다.

1. 사용자가 로그인한 상태로 화면에 들어온다.
2. `SSEInitializer`가 현재 access token과 서버 URL을 읽는다.
3. `SSEInitializer`가 SharedWorker를 만들고, worker에 SSE 구독 정보를 보낸다.
4. worker는 아직 SSE 연결이 없으면 `/sse/subscribe`를 연다.
5. 같은 사이트를 두 번째 탭에서 열면, 두 번째 탭은 새 SSE를 만들지 않고 같은 worker에 붙는다.
6. worker가 이미 알고 있는 알림 숫자가 있으면 새 탭에도 바로 알려준다.
7. 서버에서 새 알림 SSE가 오면 worker가 알림 숫자를 갱신하고 모든 탭에 알려준다.
8. 각 탭은 받은 숫자를 자기 `notificationStore`에 저장하고 화면 배지를 갱신한다.

이 방식에서는 탭을 여러 개 열어도 백엔드 SSE 연결이 탭 수만큼 늘어나지 않는다.
단, 같은 브라우저 프로필에서 같은 사이트 주소를 연 탭끼리만 같은 worker를 공유한다.

## 모바일에서는 이렇게 동작한다
모바일 브라우저에서는 SharedWorker가 있더라도 장기 연결이 안정적이라고 보기 어렵다.
그래서 iOS Safari, Android Chrome, Google 앱 브라우저처럼 모바일로 판단되는 환경에서는 SharedWorker를 일부러 쓰지 않는다.

모바일에서는 다음처럼 각 탭이 직접 SSE에 연결한다.

1. `SSEInitializer`가 access token을 확인한다.
2. 모바일 브라우저로 판단되면 SharedWorker를 만들지 않는다.
3. 그 탭 안에서 `EventSourcePolyfill`로 `/sse/subscribe`를 연다.
4. 첫 SSE 메시지는 현재 읽지 않은 알림 수로 본다.
5. 그 다음부터 오는 SSE 메시지는 새 알림으로 보고 해당 탭의 알림 숫자를 1씩 올린다.
6. 탭이 닫히거나 컴포넌트가 정리되면 그 탭의 SSE 연결도 닫는다.

모바일에서는 탭마다 SSE 연결이 생길 수 있다.
이 선택은 서버 연결 수를 줄이는 것보다 모바일 브라우저에서 알림 연결을 안정적으로 유지하는 것을 우선한 결과다.
따라서 모바일에서 여러 탭을 열면 PC 브라우저처럼 SharedWorker가 탭 사이 숫자를 맞춰주지는 않는다.

## 알림 숫자는 이렇게 맞춘다
서버가 SSE 연결 직후 처음 보내는 값은 현재 읽지 않은 알림 수로 본다.
그 뒤에 오는 메시지는 새 알림이 도착했다는 뜻으로 처리한다.

PC 브라우저 방식에서는 SharedWorker가 마지막 알림 숫자를 기억한다.
새 알림이 오면 worker가 숫자를 올리고 모든 탭에 알려준다.
한 탭에서 알림을 읽거나 삭제하거나 모두 읽으면, API 성공 후 그 탭이 바뀐 숫자를 worker에 알려준다.
worker는 다시 모든 탭에 그 숫자를 알려준다.

모바일 직접 연결 방식에서는 각 탭이 자기 알림 숫자만 관리한다.
SharedWorker가 없으므로 한 탭에서 바뀐 숫자를 다른 탭에 전달하지 않는다.

## 토큰이 만료되면 이렇게 처리한다
SSE 구독은 access token을 사용한다.
token 저장, 조회, 재발급은 기존 로그인 로직이 담당한다.
SharedWorker는 브라우저 저장소에서 token을 직접 읽지 않는다.

PC 브라우저 방식에서 SSE가 401 또는 403으로 실패하면 worker는 연결된 탭 중 하나에 token 재발급을 요청한다.
요청을 받은 탭은 기존 token 재발급 흐름을 실행한다.
재발급에 성공하면 새 token을 worker에 알려주고, worker는 새 token으로 SSE를 다시 연다.

재발급 요청을 받은 탭이 응답하지 않거나 사라지면 worker는 다른 탭에 재발급 요청을 넘긴다.
모바일 직접 연결 방식에서는 해당 탭이 직접 token을 재발급하고 새 token으로 다시 연결한다.

## 연결이 끊기면 이렇게 다시 붙는다
SSE 연결이 살아 있는지 확인하려고 별도 요청을 주기적으로 보내지는 않는다.
연결 문제는 SSE 오류 이벤트, 탭이 다시 보이는 순간, 재연결 타이머를 통해 처리한다.

상태 코드가 없거나 5xx 오류가 나면 인증 실패로 보지 않는다.
기존 token을 유지한 채 3초 뒤 재연결을 시도한다.
계속 실패하면 재시도 간격은 최대 30초까지 늘어난다.
연결이 다시 열리면 재시도 간격과 오류 횟수를 초기화한다.

상태 코드가 없는 오류가 여러 번 반복되면 자동 재연결 타이머를 멈춘다.
이후 탭이 다시 화면에 보이거나 새 token이 들어오는 등 명확한 계기가 있을 때 다시 연결을 시도한다.

SSE polyfill의 heartbeat timeout은 너무 오래 응답이 없는 연결을 끊기 위한 안전장치다.
앱이 서버에 별도 heartbeat API를 계속 보내는 구조는 아니다.

## 탭을 다시 열거나 화면으로 돌아오면
탭이 다시 보이는 상태가 되면 `SSEInitializer`는 현재 access token으로 연결 회복을 시도한다.

PC 브라우저 방식에서는 이 사실을 SharedWorker에 알려준다.
worker는 기억하고 있던 알림 숫자가 있으면 그 탭에 다시 보내고, SSE 연결이 닫혀 있으면 다시 연결을 시도한다.

모바일 직접 연결 방식에서는 해당 탭의 SSE 연결이 없거나 닫혀 있으면 그 탭이 직접 다시 연결한다.

탭이 닫히거나 로그아웃 상태가 되면 해당 탭은 연결을 정리한다.
PC 브라우저 방식에서 마지막 탭이 사라지면 worker도 SSE 연결, token, 재연결 타이머, 알림 숫자를 모두 정리한다.

## 모바일 지원 기준
현재 모바일 직접 연결 방식은 다음 환경을 기준으로 한다.

- iOS Safari
- Android Chrome
- iOS Google 앱 브라우저
- Android Google 앱 브라우저

이 환경에서는 SharedWorker가 있더라도 직접 SSE 연결을 사용해야 한다.
테스트도 모바일 user agent에서 SharedWorker 대신 직접 SSE가 만들어지는지 확인한다.

## 확인해야 할 것
- PC 브라우저에서 여러 탭을 열어도 SSE 서버 연결은 SharedWorker가 하나만 가져야 한다.
- SharedWorker를 만들 수 없는 환경에서는 각 탭의 직접 SSE 연결로 알림 기능이 유지되어야 한다.
- 모바일 브라우저에서는 SharedWorker가 있어도 직접 SSE 연결을 사용해야 한다.
- 401 또는 403 SSE 오류는 token 재발급으로 이어져야 한다.
- 상태 코드 없는 오류와 5xx 오류는 인증 실패로 처리하면 안 된다.
- 알림 읽음, 삭제, 모두 읽음 이후 PC 브라우저의 다른 탭 배지도 같은 숫자로 바뀌어야 한다.
- 관련 변경 후에는 `SSEInitializer` 테스트, SharedWorker controller 테스트, 알림 숫자 전파 테스트, 타입 검사를 확인한다.

## 관련 문서
- `ARCHITECTURE.md`
- `docs/architecture/runtime-boundaries.md`
- `docs/architecture/directory-map.md`
- `docs/frontend/runtime-contracts.md`
- `docs/frontend/testing-and-verification.md`
