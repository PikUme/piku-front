'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { motion, PanInfo } from 'framer-motion';
import { MessageCircle, ChevronUp } from 'lucide-react';
import type { Comment } from '@/types/comment';
import {
  createComment,
  getRootComments,
  getReplies,
  deleteComment,
  updateComment,
} from '@/lib/api/comment';
import { getServerURL } from '@/lib/utils/url';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import useAuthStore from '@/components/store/authStore';
import CommentItem from './CommentItem';
import CommentInput from './CommentInput';
import AnonymousProfileIcon from '@/components/common/AnonymousProfileIcon';

interface StoryCommentModalProps {
  diaryId: number;
  initialCommentCount: number;
  onClose: () => void;
  onUpdateCommentCount: (count: number) => void;
  isAnonymousDiary?: boolean;
  diaryContent?: {
    nickname: string;
    avatar: string | null;
    content: string;
    userId: string | null;
  };
}

interface CommentRepliesState {
  list: Comment[];
  page: number;
  hasMore: boolean;
  isLoading: boolean;
  isShown: boolean;
}

const formatCount = (count: number): string => {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return String(count);
};

const StoryCommentModal = ({
  diaryId,
  initialCommentCount,
  onClose,
  onUpdateCommentCount,
  isAnonymousDiary = false,
  diaryContent,
}: StoryCommentModalProps) => {
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
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [totalComments, setTotalComments] = useState(initialCommentCount);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [scrollToCommentId, setScrollToCommentId] = useState<number | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const { isLoggedIn, user } = useAuthStore();
  const serverUrl = getServerURL();

  const fetchComments = async () => {
    const pagination = rootPaginationRef.current;
    if (pagination.isLoading || !pagination.hasMore) return;

    pagination.isLoading = true;
    setIsLoadingComments(true);
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
        setIsLoadingComments(false);
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
    setIsLoadingComments(true);
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

  useEffect(() => {
    // 모달이 열리면 입력창에 포커스
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 300); // 애니메이션 완료 후 포커스

    return () => clearTimeout(timer);
  }, []);

  // 키보드 감지 로직 제거 - 모달을 고정 위치로 유지

  useEffect(() => {
    if (scrollToCommentId) {
      const element = document.getElementById(`comment-${scrollToCommentId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setScrollToCommentId(null);
    }
  }, [scrollToCommentId, comments, commentReplies]);

  const handleSetReplyTo = (comment: Comment) => {
    setReplyTo(comment);
    setNewComment(`@${comment.userId === null ? '익명' : comment.nickname || '사용자'} `);
    inputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyTo(null);
    setNewComment('');
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
          list: [...parentState.list, optimisticComment],
          isShown: true,
        },
      }));
    } else {
      setComments(prev => [...prev, optimisticComment]);
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
          return { ...prev, [parentId]: { ...prev[parentId], list: newReplies } };
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
      
      // Revert optimistic update
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
      alert('댓글 작성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      if (generation === requestGenerationRef.current) setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (
    commentId: number,
    parentId: number | null,
  ) => {
    const generation = requestGenerationRef.current;
    const originalList = parentId ? commentReplies[parentId]?.list || [] : comments;
    const deletedIndex = originalList.findIndex(comment => comment.id === commentId);
    const deletedComment = originalList[deletedIndex];
    const originalTotalComments = totalComments;

    // Optimistic update
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
      const restoreDeletedComment = (list: Comment[]) => {
        if (!deletedComment || list.some(comment => comment.id === commentId)) return list;
        const restored = [...list];
        restored.splice(Math.min(deletedIndex, restored.length), 0, deletedComment);
        return restored;
      };
      if (parentId) {
        setCommentReplies(prev => ({
          ...prev,
          [parentId]: {
            ...prev[parentId],
            list: restoreDeletedComment(prev[parentId].list),
          },
        }));
        setComments(prev => prev.map(comment => comment.id === parentId
          ? { ...comment, replyCount: comment.replyCount + 1 }
          : comment,
        ));
      } else {
        setComments(restoreDeletedComment);
      }
      setTotalComments(originalTotalComments);
      onUpdateCommentCount(originalTotalComments);
    }
  };

  const handleUpdateComment = async (commentId: number, content: string) => {
    if (!content.trim()) return;
    const generation = requestGenerationRef.current;

    const originalContent = comments.find(comment => comment.id === commentId)?.content
      ?? Object.values(commentReplies).flatMap(state => state.list)
        .find(comment => comment.id === commentId)?.content;

    const updateInComments = (list: Comment[]): Comment[] =>
      list.map(c => (c.id === commentId ? { ...c, content } : c));

    setComments(prev => updateInComments(prev));

    setCommentReplies(prev => {
      const newReplies = { ...prev };
      for (const parentId in newReplies) {
        newReplies[parentId] = {
          ...newReplies[parentId],
          list: updateInComments(newReplies[parentId].list),
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

  const handleCommentViewDragEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    if (info.offset.y > 50 && info.velocity.y > 200) {
      onClose();
    }
  };

  const DEFAULT_AVATAR = `${serverUrl}/globe.svg`;
  const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = DEFAULT_AVATAR;
  };

  // 모달을 적절한 높이로 설정 (상단에 여유 공간 확보)
  const modalHeight = '90vh';
  const modalBottomStyle = { bottom: '0px' };

  return (
    <motion.div
      className="fixed left-0 right-0 z-30 flex cursor-grab flex-col rounded-t-2xl bg-white shadow-lg dark:bg-gray-800"
      style={{
        height: modalHeight,
        ...modalBottomStyle,
      }}
      initial={{ y: '100%' }}
      animate={{ y: '0%' }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.5 }}
      onDragEnd={handleCommentViewDragEnd}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-center">
          <div
            className="absolute left-1/2 top-2 h-1.5 w-10 -translate-x-1/2 cursor-pointer rounded-full bg-gray-300 dark:bg-gray-600"
            onClick={onClose}
          />
          <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
            댓글
          </h2>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-24 no-scrollbar">
        {/* Diary Content */}
        {diaryContent && (
          <div className="flex items-start">
            {isAnonymousDiary ? (
              <AnonymousProfileIcon className="mr-3 mt-1 h-8 w-8" />
            ) : (
              <Image
                src={diaryContent.avatar || DEFAULT_AVATAR}
                alt={diaryContent.nickname}
                width={32}
                height={32}
                className="mr-3 mt-1 h-8 w-8 flex-shrink-0 cursor-pointer rounded-full"
                onError={handleAvatarError}
              />
            )}
            <div className="min-w-0">
              <p className="whitespace-pre-wrap break-words text-sm dark:text-white">
                <span className={`font-bold ${isAnonymousDiary ? '' : 'cursor-pointer'}`}>
                  {isAnonymousDiary ? '익명' : diaryContent.nickname}
                </span>{' '}
                {diaryContent.content}
              </p>
            </div>
          </div>
        )}
        
        {/* Comments */}
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
        {comments.length === 0 && !isLoadingComments && (
          <div className="py-4 text-center text-gray-500">
            아직 댓글이 없습니다.
          </div>
        )}
        {isLoadingComments && <div className="py-2 text-center text-gray-500">댓글을 불러오는 중...</div>}
        {!isLoadingComments && hasMore && (
          <div className="py-2 text-center">
            <button onClick={() => fetchComments()} className="text-sm font-semibold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
              다음 댓글 더 보기
            </button>
          </div>
        )}
      </div>

      {/* Comment Input - 항상 하단에 고정 */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <CommentInput
          inputRef={inputRef as React.RefObject<HTMLInputElement>}
          onSubmit={handleSubmitComment}
          placeholder={
            editingComment
              ? '댓글 수정...'
              : replyTo
                ? `@${replyTo.userId === null ? '익명' : replyTo.nickname || '사용자'}님에게 답글 남기기`
                : '댓글 달기...'
          }
          value={newComment}
          onChange={setNewComment}
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
  );
};

export default StoryCommentModal;
