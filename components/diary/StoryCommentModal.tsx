'use client';

import { useState, useRef, useEffect } from 'react';
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
import { formatTimeAgo } from '@/lib/utils/date';
import { getServerURL } from '@/lib/utils/url';
import useAuthStore from '@/components/store/authStore';
import CommentItem from './CommentItem';
import CommentInput from './CommentInput';

interface StoryCommentModalProps {
  diaryId: number;
  initialCommentCount: number;
  onClose: () => void;
  onUpdateCommentCount: (count: number) => void;
  diaryContent?: {
    nickname: string;
    avatar: string | null;
    content: string;
    createdAt: string;
    userId: string;
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
  diaryContent,
}: StoryCommentModalProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentReplies, setCommentReplies] = useState<
    Record<number, CommentRepliesState>
  >({});
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [totalComments, setTotalComments] = useState(initialCommentCount);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [scrollToCommentId, setScrollToCommentId] = useState<number | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const { isLoggedIn, user } = useAuthStore();
  const serverUrl = getServerURL();

  const fetchComments = async (isNewFetch: boolean = false) => {
    if (isLoadingComments || (!hasMore && !isNewFetch)) return;
    setIsLoadingComments(true);
    const pageToFetch = isNewFetch ? 0 : page;
    try {
      const data = await getRootComments(diaryId, pageToFetch, 10);
      setComments(prev =>
        isNewFetch ? data.content : [...prev, ...data.content],
      );
      setPage(pageToFetch + 1);
      setHasMore(!data.last);
      if (isNewFetch) {
        setTotalComments(data.totalElements);
        onUpdateCommentCount(data.totalElements);
      }
    } catch (error) {
      console.error('댓글을 불러오는데 실패했습니다:', error);
    } finally {
      setIsLoadingComments(false);
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
        [comment.id]: { ...currentState, isShown: false },
      }));
    } else {
      setCommentReplies(prev => ({
        ...prev,
        [comment.id]: { ...currentState, isShown: true },
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
    if (currentState.isLoading || !currentState.hasMore) return;

    setCommentReplies(prev => ({
      ...prev,
      [commentId]: { ...currentState, isLoading: true },
    }));

    try {
      const data = await getReplies(commentId, currentState.page, 5);
      setCommentReplies(prev => {
        const currentReplies = prev[commentId]?.list || [];
        const existingReplyIds = new Set(currentReplies.map(c => c.id));
        const newUniqueReplies = data.content.filter(
          c => !existingReplyIds.has(c.id),
        );

        return {
          ...prev,
          [commentId]: {
            ...prev[commentId],
            list: [...currentReplies, ...newUniqueReplies],
            page: prev[commentId].page + 1,
            hasMore: !data.last,
            isLoading: false,
          },
        };
      });
    } catch (error) {
      console.error('답글을 불러오는데 실패했습니다:', error);
      setCommentReplies(prev => ({
        ...prev,
        [commentId]: { ...prev[commentId], isLoading: false },
      }));
    }
  };

  useEffect(() => {
    if (diaryId) {
      fetchComments(true);
    }
  }, [diaryId]);

  useEffect(() => {
    // 모달이 열리면 입력창에 포커스
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 300); // 애니메이션 완료 후 포커스

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // 모바일 키보드 감지를 위한 뷰포트 높이 변화 감지
    const handleResize = () => {
      const viewport = window.visualViewport;
      if (viewport) {
        const keyboardHeight = window.innerHeight - viewport.height;
        setKeyboardHeight(keyboardHeight);
        setIsKeyboardVisible(keyboardHeight > 100); // 100px 이상 차이나면 키보드로 간주
      } else {
        // visualViewport가 지원되지 않는 경우 fallback
        const currentHeight = window.innerHeight;
        const keyboardHeight = Math.max(0, (window.screen.height - currentHeight) - 100);
        setKeyboardHeight(keyboardHeight);
        setIsKeyboardVisible(keyboardHeight > 100);
      }
    };

    // 초기 설정
    handleResize();

    // 이벤트 리스너 등록
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    } else {
      window.addEventListener('resize', handleResize);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      } else {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

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
    setNewComment(`@${comment.nickname} `);
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
    if (editingComment) {
      await handleUpdateComment(editingComment.id, newComment);
      setEditingComment(null);
      setNewComment('');
    } else {
      await handleCreateComment();
    }
  };

  const handleCreateComment = async () => {
    if (!isLoggedIn || !user || !newComment.trim()) return;

    setIsSubmitting(true);
    const tempId = Date.now();
    const isReply = replyTo !== null;
    const parentId = isReply && replyTo ? replyTo.id : undefined;

    const contentToSend =
      isReply && replyTo
        ? newComment.replace(`@${replyTo.nickname} `, '')
        : newComment;

    const optimisticComment: Comment = {
      id: tempId,
      diaryId: diaryId,
      userId: String(user.id),
      nickname: user.nickname || '사용자',
      avatar: user.avatar || null,
      content: contentToSend.trim(),
      parentId: parentId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      replyCount: 0,
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

      const finalComment = { ...optimisticComment, ...newCommentData };

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
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (
    commentId: number,
    parentId: number | null,
  ) => {
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
      console.error('댓글 삭제 실패:', error);
      alert('댓글 삭제에 실패했습니다.');
    }
  };

  const handleUpdateComment = async (commentId: number, content: string) => {
    if (!content.trim()) return;

    const originalComments = comments;
    const originalReplies = commentReplies;

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
      console.error('댓글 수정 실패:', error);
      alert('댓글 수정에 실패했습니다.');
      setComments(originalComments);
      setCommentReplies(originalReplies);
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

  // 키보드 높이에 따른 모달 높이 계산
  const modalHeight = isKeyboardVisible 
    ? `calc(100vh - ${keyboardHeight}px)` 
    : '85vh';

  const modalBottomStyle = isKeyboardVisible 
    ? { bottom: `${keyboardHeight}px` } 
    : { bottom: '0px' };

  return (
    <motion.div
      className="absolute left-0 right-0 z-30 flex cursor-grab flex-col rounded-t-2xl bg-white shadow-lg dark:bg-gray-800"
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
      <div
        className="flex-shrink-0 cursor-pointer border-b border-gray-200 p-4 text-center dark:border-gray-700"
        onClick={onClose}
      >
        <span className="inline-block h-1.5 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
      </div>

      <div className="flex-grow space-y-4 overflow-y-auto p-4 no-scrollbar">
        {/* Diary Content */}
        {diaryContent && (
          <div className="flex items-start">
            <img
              src={diaryContent.avatar || DEFAULT_AVATAR}
              alt={diaryContent.nickname}
              width={32}
              height={32}
              className="mr-3 mt-1 cursor-pointer rounded-full"
              onError={handleAvatarError}
            />
            <div>
              <p className="whitespace-pre-wrap text-sm dark:text-white">
                <span className="cursor-pointer font-bold">{diaryContent.nickname}</span>{' '}
                {diaryContent.content}
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                {formatTimeAgo(diaryContent.createdAt)}
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
      <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <CommentInput
          inputRef={inputRef as React.RefObject<HTMLInputElement>}
          onSubmit={handleSubmitComment}
          placeholder={
            editingComment
              ? '댓글 수정...'
              : replyTo
                ? `@${replyTo.nickname}님에게 답글 남기기`
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
