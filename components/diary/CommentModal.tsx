'use client';

import { useState, useRef, useEffect } from 'react';
import { X, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

import type { Comment } from '@/types/comment';
import {
  createComment,
  getRootComments,
  getReplies,
  deleteComment,
  updateComment,
} from '@/lib/api/comment';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import useAuthStore from '@/components/store/authStore';
import CommentItem from './CommentItem';
import CommentInput from './CommentInput';

interface CommentRepliesState {
  list: Comment[];
  page: number;
  hasMore: boolean;
  isLoading: boolean;
  isShown: boolean;
}

interface CommentModalProps {
  diaryId: number;
  initialCommentCount: number;
  onClose: () => void;
  onUpdateCommentCount: (count: number) => void;
  isAnonymousDiary?: boolean;
}

const CommentModal = ({
  diaryId,
  initialCommentCount,
  onClose,
  onUpdateCommentCount,
  isAnonymousDiary = false,
}: CommentModalProps) => {
  useBodyScrollLock(true);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentReplies, setCommentReplies] = useState<
    Record<number, CommentRepliesState>
  >({});
  // 요청 잠금과 페이지는 다음 렌더 전에도 즉시 갱신한다.
  const requestGenerationRef = useRef(0);
  const rootPaginationRef = useRef({ page: 0, hasMore: true, isLoading: false });
  const replyPaginationRef = useRef(
    new Map<number, { page: number; hasMore: boolean; isLoading: boolean }>(),
  );
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [totalComments, setTotalComments] = useState(initialCommentCount);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [scrollToCommentId, setScrollToCommentId] = useState<number | null>(
    null,
  );
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { isLoggedIn, user } = useAuthStore();

  useEffect(() => {
    if (scrollToCommentId) {
      const element = document.getElementById(`comment-${scrollToCommentId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setScrollToCommentId(null);
    }
  }, [scrollToCommentId, comments, commentReplies]);

  const fetchComments = async () => {
    const pagination = rootPaginationRef.current;
    if (pagination.isLoading || !pagination.hasMore) return;

    pagination.isLoading = true;
    setIsLoading(true);
    const generation = requestGenerationRef.current;
    const pageToFetch = pagination.page;

    try {
      const data = await getRootComments(diaryId, pageToFetch, 10);
      if (generation !== requestGenerationRef.current) return;
      setComments(prev => {
        const existing = pageToFetch === 0 ? [] : prev;
        const ids = new Set(existing.map(comment => comment.id));
        const newComments = data.content.filter(comment => {
          if (ids.has(comment.id)) return false;
          ids.add(comment.id);
          return true;
        });
        return [...existing, ...newComments];
      });
      pagination.page = pageToFetch + 1;
      pagination.hasMore = !data.last;
      setHasMore(!data.last);
    } catch (error) {
      if (generation !== requestGenerationRef.current) return;
      console.error('댓글을 불러오는데 실패했습니다:', error);
    } finally {
      if (generation === requestGenerationRef.current) {
        pagination.isLoading = false;
        setIsLoading(false);
      }
    }
  };

  const handleToggleReplies = async (comment: Comment) => {
    const currentState = commentReplies[comment.id] || {
      isShown: false,
      list: [],
      page: 0,
      hasMore: comment.replyCount > 0,
      isLoading: false,
    };

    if (currentState.isShown) {
      setCommentReplies(prev => ({
        ...prev,
        [comment.id]: { ...(prev[comment.id] || currentState), isShown: false },
      }));
    } else {
      setCommentReplies(prev => ({
        ...prev,
        [comment.id]: { ...(prev[comment.id] || currentState), isShown: true },
      }));
      if (currentState.list.length === 0 && currentState.hasMore) {
        await handleFetchReplies(comment.id);
      }
    }
  };

  const handleFetchReplies = async (commentId: number) => {
    const currentState = commentReplies[commentId] || {
      list: [],
      page: 0,
      hasMore: true,
      isLoading: false,
      isShown: true,
    };
    const pagination = replyPaginationRef.current.get(commentId) || {
      page: currentState.page,
      hasMore: currentState.hasMore,
      isLoading: false,
    };
    if (pagination.isLoading || !pagination.hasMore) return;

    pagination.isLoading = true;
    replyPaginationRef.current.set(commentId, pagination);
    const generation = requestGenerationRef.current;
    const pageToFetch = pagination.page;
    setCommentReplies(prev => ({
      ...prev,
      [commentId]: { ...(prev[commentId] || currentState), isLoading: true },
    }));

    try {
      const data = await getReplies(commentId, pageToFetch, 5);
      if (generation !== requestGenerationRef.current) return;
      pagination.page = pageToFetch + 1;
      pagination.hasMore = !data.last;
      setCommentReplies(prev => {
        const current = prev[commentId] || currentState;
        const ids = new Set(current.list.map(comment => comment.id));
        const newReplies = data.content.filter(comment => {
          if (ids.has(comment.id)) return false;
          ids.add(comment.id);
          return true;
        });
        return {
          ...prev,
          [commentId]: {
            ...current,
            list: [...current.list, ...newReplies],
            page: pageToFetch + 1,
            hasMore: !data.last,
            isLoading: false,
          },
        };
      });
    } catch (error) {
      if (generation !== requestGenerationRef.current) return;
      console.error('답글을 불러오는데 실패했습니다:', error);
      setCommentReplies(prev => ({
        ...prev,
        [commentId]: { ...prev[commentId], isLoading: false },
      }));
    } finally {
      if (generation === requestGenerationRef.current) {
        pagination.isLoading = false;
      }
    }
  };

  useEffect(() => {
    requestGenerationRef.current += 1;
    rootPaginationRef.current = { page: 0, hasMore: true, isLoading: false };
    replyPaginationRef.current = new Map();
    setComments([]);
    setCommentReplies({});
    setHasMore(true);
    setTotalComments(initialCommentCount);
    setReplyTo(null);
    setEditingComment(null);
    setNewComment('');
    setIsSubmitting(false);
    setScrollToCommentId(null);
    setIsLoading(true);
    const generation = requestGenerationRef.current;
    queueMicrotask(() => {
      // StrictMode에서 정리된 첫 setup은 요청을 시작하지 않는다.
      if (generation === requestGenerationRef.current) void fetchComments();
    });

    return () => {
      // 이전 일기와 해제된 모달의 응답·오류·finally를 무효화한다.
      requestGenerationRef.current += 1;
    };
  }, [diaryId]);

  const handleSetReplyTo = (comment: Comment) => {
    setReplyTo(comment);
    setNewComment(`@${comment.userId === null ? '익명' : comment.nickname || '사용자'} `);
    inputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyTo(null);
    setNewComment('');
  };

  const handleCreateComment = async () => {
    if (!isLoggedIn || !user || !newComment.trim()) return;

    const generation = requestGenerationRef.current;
    setIsSubmitting(true);
    const tempId = Date.now();
    const isReply = replyTo !== null;
    const parentId = isReply && replyTo ? replyTo.id : undefined;

    const contentToSend =
      isReply && replyTo
        ? newComment.replace(`@${replyTo.userId === null ? '익명' : replyTo.nickname || '사용자'} `, '')
        : newComment;

    const optimisticComment: Comment = {
      id: tempId,
      diaryId: diaryId,
      userId: isAnonymousDiary ? null : String(user.id),
      nickname: isAnonymousDiary ? '익명' : user.nickname || '사용자',
      avatar: isAnonymousDiary ? null : user.avatar || null,
      content: contentToSend.trim(),
      parentId: parentId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      replyCount: 0,
      canReply: !isReply && !isAnonymousDiary,
      canEdit: true,
      canDelete: true,
      isPending: true,
    };

    const originalNewComment = newComment;
    const originalReplyTo = replyTo;

    // 낙관적 업데이트
    const newTotal = totalComments + 1;
    setTotalComments(newTotal);
    onUpdateCommentCount(newTotal);

    if (isReply && parentId) {
      setComments(prev =>
        prev.map(c =>
          c.id === parentId ? { ...c, replyCount: c.replyCount + 1 } : c,
        ),
      );
      const parentState = commentReplies[parentId] || {
        list: [],
        page: 0,
        hasMore: true,
        isLoading: false,
        isShown: true,
      };
      setCommentReplies(prev => ({
        ...prev,
        [parentId]: {
          ...parentState,
          list: [optimisticComment, ...parentState.list],
          isShown: true,
        },
      }));
    } else {
      setComments(prev => [optimisticComment, ...prev]);
    }

    setScrollToCommentId(tempId);

    cancelReply();

    try {
      const newCommentData = await createComment({
        diaryId,
        content: contentToSend.trim(),
        parentId,
      });
      if (generation !== requestGenerationRef.current) return;

      const finalComment = {
        ...optimisticComment,
        ...newCommentData,
        isPending: false,
      };

      if (isReply && parentId) {
        setCommentReplies(prev => {
          const newReplies = prev[parentId].list.map(c =>
            c.id === tempId ? finalComment : c,
          );
          return {
            ...prev,
            [parentId]: { ...prev[parentId], list: newReplies },
          };
        });
      } else {
        setComments(prev =>
          prev.map(c => (c.id === tempId ? finalComment : c)),
        );
      }
    } catch (error) {
      if (generation !== requestGenerationRef.current) return;
      console.error('댓글 작성 실패:', error);
      const revertedTotal = totalComments;
      setTotalComments(revertedTotal);
      onUpdateCommentCount(revertedTotal);

      if (isReply && parentId) {
        setComments(prev =>
          prev.map(c =>
            c.id === parentId ? { ...c, replyCount: c.replyCount - 1 } : c,
          ),
        );
        setCommentReplies(prev => {
          const newReplies = prev[parentId].list.filter(c => c.id !== tempId);
          return {
            ...prev,
            [parentId]: { ...prev[parentId], list: newReplies },
          };
        });
      } else {
        setComments(prev => prev.filter(c => c.id !== tempId));
      }

      setNewComment(originalNewComment);
      setReplyTo(originalReplyTo);
      alert('댓글 작성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      if (generation === requestGenerationRef.current) setIsSubmitting(false);
    }
  };

  const handleStartEdit = (comment: Comment) => {
    setEditingComment(comment);
    setReplyTo(null);
    setNewComment(comment.content);
    inputRef.current?.focus();
  };

  const handleCancelEdit = () => {
    setEditingComment(null);
    setNewComment('');
  };

  const handleSubmitComment = async () => {
    const generation = requestGenerationRef.current;
    if (editingComment) {
      await handleUpdateComment(editingComment.id, newComment);
      if (generation !== requestGenerationRef.current) return;
      setEditingComment(null);
      setNewComment('');
    } else {
      await handleCreateComment();
    }
  };

  const handleUpdateComment = async (commentId: number, content: string) => {
    if (!content.trim()) return;
    const generation = requestGenerationRef.current;

    const originalContent = comments.find(comment => comment.id === commentId)?.content
      ?? Object.values(commentReplies).flatMap(state => state.list)
        .find(comment => comment.id === commentId)?.content;

    const updateInList = (list: Comment[]) =>
      list.map(c => (c.id === commentId ? { ...c, content } : c));

    setComments(updateInList);
    setCommentReplies(prev => {
      const newReplies = { ...prev };
      for (const parentId in newReplies) {
        newReplies[parentId] = {
          ...newReplies[parentId],
          list: updateInList(newReplies[parentId].list),
        };
      }
      return newReplies;
    });

    try {
      await updateComment(commentId, content);
    } catch (error) {
      if (generation !== requestGenerationRef.current) return;
      console.error('댓글 수정 실패:', error);
      alert('댓글 수정에 실패했습니다.');
      const restoreContent = (list: Comment[]) => list.map(comment =>
        comment.id === commentId && comment.content === content && originalContent !== undefined
          ? { ...comment, content: originalContent }
          : comment,
      );
      setComments(restoreContent);
      setCommentReplies(prev => Object.fromEntries(
        Object.entries(prev).map(([parentId, state]) => [
          parentId, { ...state, list: restoreContent(state.list) },
        ]),
      ));
    }
  };

  const handleDeleteComment = async (
    commentId: number,
    parentId: number | null,
  ) => {
    const generation = requestGenerationRef.current;
    if (parentId) {
      setCommentReplies(prev => ({
        ...prev,
        [parentId]: {
          ...prev[parentId],
          list: prev[parentId].list.filter(c => c.id !== commentId),
        },
      }));
      setComments(prev =>
        prev.map(c =>
          c.id === parentId ? { ...c, replyCount: c.replyCount - 1 } : c,
        ),
      );
    } else {
      setComments(prev => prev.filter(c => c.id !== commentId));
    }
    const newTotal = totalComments - 1;
    setTotalComments(newTotal);
    onUpdateCommentCount(newTotal);

    try {
      await deleteComment(commentId);
    } catch (error) {
      if (generation !== requestGenerationRef.current) return;
      console.error('댓글 삭제 실패:', error);
      alert('댓글 삭제에 실패했습니다.');
      // Revert logic can be complex, for now, we just show an alert
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/60"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        className="relative flex h-auto max-h-[80vh] w-full flex-col rounded-t-2xl bg-white shadow-xl dark:bg-gray-900"
        onClick={e => e.stopPropagation()}
      >
        <div className="mx-auto my-3 h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-600" />
        <div className="flex items-center justify-center border-b p-4 dark:border-gray-700">
          <h2 className="text-lg font-bold dark:text-white">댓글</h2>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-grow space-y-4 overflow-y-auto p-4">
          {comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              diaryId={diaryId}
              onSetReplyTo={handleSetReplyTo}
              replies={commentReplies[comment.id]?.list || []}
              replyState={commentReplies[comment.id]}
              onToggleReplies={() => handleToggleReplies(comment)}
              onFetchMoreReplies={() => handleFetchReplies(comment.id)}
              onDeleteComment={handleDeleteComment}
              onStartEdit={handleStartEdit}
            />
          ))}
          {isLoading && <p className="text-center">댓글 로딩 중...</p>}
          {!isLoading && hasMore && (
            <button
              onClick={() => fetchComments()}
              className="w-full text-center text-sm text-gray-500 hover:underline"
            >
              이전 댓글 더 보기
            </button>
          )}
          {!isLoading && comments.length === 0 && (
            <p className="text-center text-gray-500">
              아직 댓글이 없습니다.
            </p>
          )}
        </div>

        <div className="border-t bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <CommentInput
            inputRef={inputRef as React.RefObject<HTMLInputElement>}
            value={newComment}
            onChange={setNewComment}
            onSubmit={handleSubmitComment}
            placeholder={
              editingComment
                ? '댓글 수정...'
                : replyTo
                  ? `@${replyTo.userId === null ? '익명' : replyTo.nickname || '사용자'}님에게 답글 남기기`
                  : '댓글 달기...'
            }
            isSubmitting={isSubmitting}
            onCancel={
              editingComment
                ? handleCancelEdit
                : replyTo
                  ? cancelReply
                  : undefined
            }
          />
        </div>
      </motion.div>
    </div>
  );
};

export default CommentModal;
