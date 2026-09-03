# 모바일 알림 클릭 플로우

- 뷰포트: 390 × 844
- 대상: 미확인 좋아요 알림 1건, 미확인 댓글 알림 1건
- 클릭 직전 화면은 커서 아이콘 없이 대상 행의 호버 배경만 표시

## 공통 진입

`01-notification-list.png` → 알림 목록에서 파란 배경의 미확인 알림 2건 확인

## 좋아요 알림 분기

`05-like-notification-hover.png` → `06-like-linked-diary.png` → `10-all-read-notification-list.png`

좋아요 알림을 클릭하면 연결된 2026-06-02 일기 상세가 열리고, 미확인 알림 숫자는 2에서 1로 감소한다.

## 댓글 알림 분기

`07-unread-comment-notification-hover.png` → `08-unread-comment-linked-diary.png` → `09-unread-comment-detail.png` → `10-all-read-notification-list.png`

댓글 알림을 클릭하면 연결된 2026-06-02 일기 상세가 열리며, 댓글 버튼을 누르면 댓글 5개가 있는 상세 화면으로 이어진다. 미확인 알림 숫자는 1에서 0으로 감소하고 최종 목록에서는 숫자 배지와 파란 배경이 사라진다.

## 보조 확인

`02-comment-notification-hover.png` → `03-comment-linked-diary.png` → `04-comment-detail.png`

이미 읽은 댓글 알림을 다시 클릭해도 같은 일기 상세 및 댓글 화면으로 이동하는지 확인한 보조 흐름이다.
