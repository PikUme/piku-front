'use client';

import { FormEvent, useState } from 'react';
import { X } from 'lucide-react';
import type { DiaryUpdatePatch, PrivacyStatus } from '@/types/diary';
import { updateDiary } from '@/lib/api/diary';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import { PRIVACY_OPTIONS } from '@/lib/utils/privacy';

interface DiaryEditModalProps {
  diaryId: number;
  initialStatus: PrivacyStatus;
  initialContent: string;
  onCancel: () => void;
  onSaved: (patch: DiaryUpdatePatch) => void;
}

const DiaryEditModal = ({
  diaryId,
  initialStatus,
  initialContent,
  onCancel,
  onSaved,
}: DiaryEditModalProps) => {
  const [status, setStatus] = useState<PrivacyStatus>(initialStatus);
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!content.trim()) {
      setErrorMessage('내용을 입력해주세요.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await updateDiary(diaryId, { status, content });
      onSaved({
        status: response.status ?? status,
        content: response.content ?? content,
        updatedAt: response.updatedAt,
      });
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, '일기 수정에 실패했습니다.'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onClick={event => event.stopPropagation()}
    >
      <div
        className="w-full max-w-lg rounded-lg bg-white shadow-xl dark:bg-gray-900"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            일기 수정
          </h2>
          <button
            type="button"
            aria-label="수정 취소"
            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
            onClick={onCancel}
            disabled={isSaving}
          >
            <X size={20} />
          </button>
        </div>

        <form className="space-y-4 p-5" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="diary-edit-status"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              공개 범위
            </label>
            <select
              id="diary-edit-status"
              value={status}
              onChange={event =>
                setStatus(event.target.value as PrivacyStatus)
              }
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-white dark:focus:ring-white"
              disabled={isSaving}
            >
              {PRIVACY_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="diary-edit-content"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              일기 내용
            </label>
            <textarea
              id="diary-edit-content"
              value={content}
              onChange={event => setContent(event.target.value)}
              className="min-h-40 w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm leading-6 text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-white dark:focus:ring-white"
              disabled={isSaving}
            />
          </div>

          {errorMessage && (
            <p role="alert" className="text-sm text-red-500">
              {errorMessage}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              onClick={onCancel}
              disabled={isSaving}
            >
              취소
            </button>
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
              disabled={isSaving}
            >
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DiaryEditModal;
