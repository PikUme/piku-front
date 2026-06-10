'use client';

import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface CommentActionModalProps {
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReport: () => void;
  isOwner?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

const CommentActionModal = ({
  onClose,
  onEdit,
  onDelete,
  onReport,
  isOwner = false,
  canEdit = isOwner,
  canDelete = isOwner,
}: CommentActionModalProps) => {
  useBodyScrollLock(true);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-64 rounded-lg bg-white shadow-lg dark:bg-gray-800"
        onClick={e => e.stopPropagation()}
      >
        <ul className="text-center text-sm">
          {canEdit && (
            <li className="border-b border-gray-200 dark:border-gray-700">
              <button onClick={onEdit} className="w-full p-3 cursor-pointer">
                수정
              </button>
            </li>
          )}
          {canDelete && (
            <li className="border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={onDelete}
                className="w-full p-3 font-bold text-red-500 cursor-pointer"
              >
                삭제
              </button>
            </li>
          )}
          <li className="border-b border-gray-200 dark:border-gray-700">
            <button onClick={onReport} className="w-full p-3 cursor-pointer">
              신고
            </button>
          </li>
          <li>
            <button onClick={onClose} className="w-full p-3 cursor-pointer">
              취소
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default CommentActionModal;
