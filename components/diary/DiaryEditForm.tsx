'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TextareaAutosize from 'react-textarea-autosize';
import { AnimatePresence, motion } from 'framer-motion';
import { EyeOff, Globe, Lock, Users, X } from 'lucide-react';
import Image from 'next/image';
import type { DiaryDetail, PrivacyStatus } from '@/types/diary';
import { getDiaryById, updateDiary } from '@/lib/api/diary';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import { getPrivacyLabel, PRIVACY_OPTIONS } from '@/lib/utils/privacy';
import useAuthStore from '@/components/store/authStore';
import ImagePreviewModal from '@/components/common/ImagePreviewModal';
import AnonymousProfileIcon from '@/components/common/AnonymousProfileIcon';

interface DiaryEditFormProps {
  diaryId: number;
}

const MAX_CONTENT_LENGTH = 500;

const isNotFoundResponse = (error: unknown) =>
  (error as { response?: { status?: number } }).response?.status === 404;

const getPrivacyIcon = (value: PrivacyStatus, size = 16) => {
  switch (value) {
    case 'PUBLIC':
      return <Globe size={size} />;
    case 'FRIENDS':
      return <Users size={size} />;
    case 'PRIVATE':
      return <Lock size={size} />;
    case 'ANONYMOUS':
      return <EyeOff size={size} />;
  }
};

const DiaryEditForm = ({ diaryId }: DiaryEditFormProps) => {
  const router = useRouter();
  const { user } = useAuthStore();

  const [diary, setDiary] = useState<DiaryDetail | null>(null);
  const [status, setStatus] = useState<PrivacyStatus>('PUBLIC');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  useEffect(() => {
    const loadDiary = async () => {
      setIsLoading(true);
      setIsNotFound(false);
      setErrorMessage(null);

      try {
        const diaryDetail = await getDiaryById(diaryId);
        setDiary(diaryDetail);
        setStatus(diaryDetail.status);
        setContent(diaryDetail.content);
      } catch (error) {
        setIsNotFound(isNotFoundResponse(error));
        setErrorMessage(
          getApiErrorMessage(error, '일기를 불러오지 못했습니다.'),
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadDiary();
  }, [diaryId]);

  const handleImageClick = (imageUrl: string) => {
    setSelectedImageUrl(imageUrl);
    setIsPreviewModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!content.trim()) {
      setErrorMessage('내용을 입력해주세요.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await updateDiary(diaryId, { status, content });
      router.replace(`/diary/${diaryId}`);
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, '일기 수정에 실패했습니다.'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const privacyText = getPrivacyLabel(status);
  const isOwner =
    !user || !diary || (diary.isOwner ?? user.id === diary.userId);
  const shouldShowAnonymousAuthor = status === 'ANONYMOUS';

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
        <p className="text-gray-500 dark:text-gray-400">일기를 불러오는 중...</p>
      </div>
    );
  }

  if (!diary) {
    if (!isNotFound) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 dark:bg-black">
          <p role="alert" className="text-sm text-red-500">
            {errorMessage}
          </p>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 dark:bg-black">
        <Image
          src="/404.png"
          alt="일기를 찾을 수 없습니다."
          width={1536}
          height={1024}
          className="h-auto w-full max-w-2xl"
        />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 dark:bg-black">
        <p role="alert" className="text-sm text-red-500">
          본인 일기만 수정할 수 있습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-black">
      <header className="flex items-center justify-between border-b bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <button
          type="button"
          aria-label="수정 취소"
          onClick={handleCancel}
          disabled={isSaving}
          className="cursor-pointer text-gray-900 disabled:cursor-not-allowed disabled:text-gray-400 dark:text-white dark:disabled:text-gray-600"
        >
          <X size={24} />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          일기 수정
        </h1>
        <button
          type="submit"
          form="diary-edit-form"
          disabled={isSaving}
          className="cursor-pointer font-semibold text-blue-500 disabled:cursor-not-allowed disabled:text-gray-400 dark:disabled:text-gray-600"
        >
          {isSaving ? '저장 중...' : '완료'}
        </button>
      </header>

      <main className="flex flex-grow flex-col overflow-y-auto p-4 text-black dark:text-white">
        <section aria-labelledby="diary-edit-photos-title" className="pb-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {diary.imgUrls.length}장
            </span>
          </div>

          {diary.imgUrls.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {diary.imgUrls.map((imageUrl, index) => (
                <button
                  key={`${imageUrl}-${index}`}
                  type="button"
                  className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md sm:h-20 sm:w-20 md:h-24 md:w-24"
                  onClick={() => handleImageClick(imageUrl)}
                >
                  <img
                    src={imageUrl}
                    alt={`기존 일기 사진 ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  {index === 0 && (
                    <span className="absolute bottom-0 left-0 right-0 bg-blue-500 py-0.5 text-center text-xs text-white">
                      대표 사진
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex h-20 items-center justify-center rounded-md border border-dashed border-gray-300 text-sm text-gray-500 dark:border-gray-700">
              등록된 사진이 없습니다.
            </div>
          )}
        </section>

        <div className="my-4 flex items-center">
          {shouldShowAnonymousAuthor ? (
            <AnonymousProfileIcon className="mr-2 h-8 w-8" />
          ) : (
            <img
              src={diary.avatar || user?.avatar || '/vercel.svg'}
              alt="user avatar"
              width={32}
              height={32}
              className="mr-2 h-8 w-8 rounded-full"
            />
          )}
          <span className="font-semibold dark:text-white">
            {diary.nickname || user?.nickname || 'me'}
          </span>
          <div className="flex-grow" />
          <button
            type="button"
            onClick={() => setIsPrivacyModalOpen(true)}
            disabled={isSaving}
            className="flex cursor-pointer items-center gap-1 text-sm text-gray-600 disabled:cursor-not-allowed disabled:text-gray-400 dark:text-gray-400"
          >
            {getPrivacyIcon(status)}
            <span>{privacyText}</span>
          </button>
        </div>

        <form
          id="diary-edit-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          <label htmlFor="diary-edit-content" className="sr-only">
            일기 내용
          </label>
          <TextareaAutosize
            id="diary-edit-content"
            value={content}
            onChange={event => setContent(event.target.value)}
            className="w-full resize-none rounded-md border-2 border-gray-200 bg-transparent p-2 text-black placeholder-gray-400 focus:outline-none focus:ring-0 dark:border-gray-700 dark:text-white dark:placeholder-gray-500"
            placeholder="오늘의 하루를 기록해보세요..."
            minRows={5}
            maxLength={MAX_CONTENT_LENGTH}
            disabled={isSaving}
          />
          <div className="flex min-h-5 items-center justify-between gap-4 text-sm">
            {errorMessage ? (
              <p role="alert" className="min-w-0 flex-1 text-red-500">
                {errorMessage}
              </p>
            ) : (
              <span className="min-w-0 flex-1" aria-hidden="true" />
            )}
            <div className="shrink-0 text-gray-500">
              {content.length}/{MAX_CONTENT_LENGTH}
            </div>
          </div>
        </form>
      </main>

      <AnimatePresence>
        {isPrivacyModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
            onClick={() => setIsPrivacyModalOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="z-50 w-full max-w-lg rounded-t-2xl bg-white p-4 dark:bg-gray-800"
              onClick={event => event.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-200/50 dark:bg-gray-700/50" />
              <h2 className="mb-6 text-center text-lg font-bold text-black dark:text-white">
                공개 범위 설정
              </h2>
              <div className="space-y-3">
                {PRIVACY_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setStatus(option.value);
                      setIsPrivacyModalOpen(false);
                    }}
                    className={`flex w-full cursor-pointer items-center gap-4 rounded-lg p-4 text-left transition-colors ${
                      status === option.value
                        ? 'bg-black text-white dark:bg-white dark:text-black'
                        : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span
                      className={
                        status === option.value
                          ? 'text-white dark:text-black'
                          : 'text-gray-800 dark:text-gray-200'
                      }
                    >
                      {getPrivacyIcon(option.value, 24)}
                    </span>
                    <span>
                      <span className="block font-semibold">
                        {option.label}
                      </span>
                      <span
                        className={`block text-sm ${
                          status === option.value
                            ? 'text-gray-300 dark:text-gray-500'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {option.description}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ImagePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        imageUrl={selectedImageUrl}
      />
    </div>
  );
};

export default DiaryEditForm;
