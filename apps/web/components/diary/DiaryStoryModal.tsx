'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { X, MessageCircle, ChevronLeft, ChevronRight, ChevronUp, DotIcon } from 'lucide-react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import type { DiaryDetail } from '@/types/diary';
import { formatTimeAgo, formatYearMonthDayDots } from '@/lib/utils/date';
import { getServerURL } from '@/lib/utils/url';
import StoryCommentModal from './StoryCommentModal';

interface DiaryStoryModalProps {
  diary: DiaryDetail;
  onClose: () => void;
  onCommentViewToggle?: (isOpen: boolean) => void;
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

const DiaryStoryModal = ({ diary, onClose, onCommentViewToggle }: DiaryStoryModalProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [totalComments, setTotalComments] = useState(diary.commentCount);
  const [isCommentViewOpen, setIsCommentViewOpen] = useState(false);

  const serverUrl = getServerURL();
  const router = useRouter();

  const handleProfileClick = () => {
    router.push(`/profile/${diary.userId}`);
    onClose();
  };

  const handleUpdateCommentCount = (count: number) => {
    setTotalComments(count);
  };

  const handleCloseCommentModal = () => {
    setIsCommentViewOpen(false);
  };

  useEffect(() => {
    onCommentViewToggle?.(isCommentViewOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCommentViewOpen]);

  const handlePrevImage = () => {
    if (diary.imgUrls && diary.imgUrls.length > 0 && currentImageIndex > 0) {
      setCurrentImageIndex((prev) => prev - 1);
    }
  };

  const handleNextImage = () => {
    if (diary.imgUrls && diary.imgUrls.length > 0 && currentImageIndex < diary.imgUrls.length - 1) {
      setCurrentImageIndex((prev) => prev + 1);
    }
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y < -50 && info.velocity.y < -200) {
      setIsCommentViewOpen(true);
    }
  };

  const swipeHandlers = useSwipeable({
    onSwipedUp: () => setIsCommentViewOpen(true),
    onSwipedLeft: () => handleNextImage(),
    onSwipedRight: () => handlePrevImage(),
    trackMouse: true,
  });

  const DEFAULT_AVATAR = `${serverUrl}/globe.svg`;
  const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = DEFAULT_AVATAR;
  };

  const displayImage = diary.imgUrls?.[currentImageIndex] || '/vercel.svg';

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center" onClick={handleProfileClick}>
          <Image
            src={diary.avatar || DEFAULT_AVATAR}
            alt={diary.nickname}
            width={32}
            height={32}
            className="cursor-pointer rounded-full"
            onError={handleAvatarError}
          />
          <p className="ml-3 cursor-pointer text-sm font-bold text-white">{diary.nickname}</p>
          <DotIcon className="text-gray-300" />
          <p className="text-xs uppercase text-gray-300">{formatYearMonthDayDots(diary.date)}</p>
        </div>
        <button onClick={onClose} className="text-white hover:text-gray-300">
          <X size={28} />
        </button>
      </div>

      {/* Image Viewer */}
      <div {...swipeHandlers} className="relative h-full w-full">
        <AnimatePresence initial={false}>
          <motion.div
            key={currentImageIndex}
            className="absolute inset-x-0 top-20 bottom-24"
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <Image src={displayImage} alt="Diary image" fill style={{ objectFit: 'contain' }} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Image Navigation */}
      {diary.imgUrls && diary.imgUrls.length > 1 && (
        <>
          {currentImageIndex > 0 && (
            <button
              onClick={handlePrevImage}
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 cursor-pointer rounded-full bg-black/30 p-2 text-white transition-opacity hover:bg-black/60"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          {currentImageIndex < diary.imgUrls.length - 1 && (
            <button
              onClick={handleNextImage}
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 cursor-pointer rounded-full bg-black/30 p-2 text-white transition-opacity hover:bg-black/60"
            >
              <ChevronRight size={24} />
            </button>
          )}
        </>
      )}

      {/* Comment section handle */}
      {!isCommentViewOpen && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 z-20 flex cursor-pointer flex-col items-center p-4"
          onClick={() => setIsCommentViewOpen(true)}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.5 }}
          onDragEnd={handleDragEnd}
        >
          <div className="flex items-center text-white/80">
            <ChevronUp size={20} className="mr-1" />
            <span className="text-sm">댓글 보기</span>
          </div>
          <div className="mt-1 flex items-center text-white">
            <MessageCircle size={20} className="mr-2" />
            <span>{formatCount(totalComments)}</span>
          </div>
        </motion.div>
      )}

      {/* Comments View using StoryCommentModal */}
      <AnimatePresence>
        {isCommentViewOpen && (
          <StoryCommentModal
            diaryId={diary.diaryId}
            initialCommentCount={totalComments}
            onClose={handleCloseCommentModal}
            onUpdateCommentCount={handleUpdateCommentCount}
            diaryContent={{
              nickname: diary.nickname,
              avatar: diary.avatar,
              content: diary.content,
              createdAt: diary.createdAt,
              userId: diary.userId,
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DiaryStoryModal;
