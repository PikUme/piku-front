'use client';

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from 'react';
import { Check, X } from 'lucide-react';
import {
  FixedCharacter,
  getFixedCharacters,
} from '@/lib/api/character';

interface AiCharacterSelectionModalProps {
  isOpen: boolean;
  isGenerating: boolean;
  returnFocusRef?: RefObject<HTMLElement | null>;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
  onGenerate: (characterId: number) => void;
}

type CharacterLoadStatus = 'idle' | 'loading' | 'success' | 'error';

const FOCUSABLE_ELEMENT_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const canReceiveFocus = (element: HTMLElement | null) =>
  element?.isConnected === true && !element.matches(':disabled');

const AiCharacterSelectionModal = ({
  isOpen,
  isGenerating,
  returnFocusRef,
  fallbackFocusRef,
  onClose,
  onGenerate,
}: AiCharacterSelectionModalProps) => {
  const [characters, setCharacters] = useState<FixedCharacter[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(
    null,
  );
  const [loadStatus, setLoadStatus] =
    useState<CharacterLoadStatus>('idle');
  const [reloadKey, setReloadKey] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setCharacters([]);
      setSelectedCharacterId(null);
      setLoadStatus('idle');
      return;
    }

    let isActive = true;

    setCharacters([]);
    setSelectedCharacterId(null);
    setLoadStatus('loading');

    const loadCharacters = async () => {
      try {
        const nextCharacters = await getFixedCharacters();

        if (!isActive) {
          return;
        }

        setCharacters(nextCharacters);
        setLoadStatus('success');
      } catch (error) {
        if (!isActive) {
          return;
        }

        console.error('Failed to fetch characters:', error);
        setLoadStatus('error');
      }
    };

    void loadCharacters();

    return () => {
      isActive = false;
    };
  }, [isOpen, reloadKey]);

  useEffect(() => {
    if (!isOpen || isGenerating) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isGenerating, isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    previouslyFocusedElementRef.current =
      returnFocusRef?.current ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null);
    dialog.focus();

    const keepFocusInsideDialog = (event: FocusEvent) => {
      const currentDialog = dialogRef.current;

      if (
        currentDialog &&
        event.target instanceof Node &&
        !currentDialog.contains(event.target)
      ) {
        currentDialog.focus();
      }
    };

    document.addEventListener('focusin', keepFocusInsideDialog);

    return () => {
      document.removeEventListener('focusin', keepFocusInsideDialog);
      const previouslyFocusedElement = previouslyFocusedElementRef.current;
      const fallbackFocusElement = fallbackFocusRef?.current ?? null;
      const focusTarget = canReceiveFocus(previouslyFocusedElement)
        ? previouslyFocusedElement
        : canReceiveFocus(fallbackFocusElement)
          ? fallbackFocusElement
          : null;

      focusTarget?.focus();
      previouslyFocusedElementRef.current = null;
    };
  }, [fallbackFocusRef, isOpen, returnFocusRef]);

  useEffect(() => {
    if (isOpen && isGenerating) {
      dialogRef.current?.focus();
    }
  }, [isGenerating, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleClose = () => {
    if (!isGenerating) {
      onClose();
    }
  };

  const handleDialogKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>,
  ) => {
    if (event.key !== 'Tab') {
      return;
    }

    const dialog = dialogRef.current;
    const focusableElements = Array.from(
      dialog?.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENT_SELECTOR) ?? [],
    );

    if (!dialog || focusableElements.length === 0) {
      event.preventDefault();
      dialog?.focus();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (
      event.shiftKey &&
      (activeElement === firstElement || activeElement === dialog)
    ) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    if (
      !event.shiftKey &&
      (activeElement === lastElement || activeElement === dialog)
    ) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  return (
    <div
      data-testid="ai-character-modal-overlay"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onClick={event => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-character-modal-title"
        aria-busy={isGenerating}
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        className="flex max-h-[85dvh] w-full flex-col rounded-t-2xl bg-white text-black shadow-xl dark:bg-gray-800 dark:text-white sm:max-w-xl sm:rounded-2xl"
      >
        {isGenerating && (
          <p role="status" className="sr-only">
            AI 사진을 생성하는 중입니다.
          </p>
        )}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4 dark:border-gray-700">
          <div>
            <h2 id="ai-character-modal-title" className="text-lg font-bold">
              캐릭터 선택
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              AI 사진에 등장할 캐릭터를 선택하세요.
            </p>
          </div>
          <button
            type="button"
            aria-label="캐릭터 선택 닫기"
            disabled={isGenerating}
            onClick={handleClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        <div
          aria-live="polite"
          className="min-h-40 flex-1 overflow-y-auto px-4 py-5"
        >
          {loadStatus === 'loading' && (
            <div className="flex min-h-32 flex-col items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
              <p>캐릭터를 불러오는 중...</p>
            </div>
          )}

          {loadStatus === 'error' && (
            <div className="flex min-h-32 flex-col items-center justify-center gap-3 text-center">
              <p className="text-gray-700 dark:text-gray-200">
                캐릭터를 불러오지 못했어요.
              </p>
              <button
                type="button"
                onClick={() => setReloadKey(previous => previous + 1)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                다시 불러오기
              </button>
            </div>
          )}

          {loadStatus === 'success' && characters.length === 0 && (
            <div className="flex min-h-32 flex-col items-center justify-center gap-3 text-center">
              <p className="text-gray-700 dark:text-gray-200">
                선택할 수 있는 캐릭터가 없어요.
              </p>
              <button
                type="button"
                onClick={() => setReloadKey(previous => previous + 1)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                다시 불러오기
              </button>
            </div>
          )}

          {loadStatus === 'success' && characters.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {characters.map(character => {
                const isSelected = selectedCharacterId === character.id;

                return (
                  <button
                    key={character.id}
                    type="button"
                    aria-label={`${character.type} 캐릭터 선택`}
                    aria-pressed={isSelected}
                    disabled={isGenerating}
                    onClick={() => setSelectedCharacterId(character.id)}
                    className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border-2 p-3 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                        : 'border-gray-200 bg-gray-50 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:hover:border-gray-400'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white">
                        <Check size={16} strokeWidth={3} />
                      </span>
                    )}
                    <img
                      src={character.displayImageUrl}
                      alt={`${character.type} 캐릭터`}
                      className="h-full w-full object-contain"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex shrink-0 gap-3 border-t border-gray-200 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-gray-700">
          <button
            type="button"
            disabled={isGenerating}
            onClick={handleClose}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-3 font-semibold hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            취소
          </button>
          <button
            type="button"
            disabled={selectedCharacterId === null || isGenerating}
            onClick={() => {
              if (selectedCharacterId !== null) {
                onGenerate(selectedCharacterId);
              }
            }}
            className="flex-1 rounded-lg bg-blue-500 px-4 py-3 font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-600"
          >
            {isGenerating ? 'AI 사진 생성 중...' : 'AI 사진 생성'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiCharacterSelectionModal;
