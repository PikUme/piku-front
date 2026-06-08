'use client';

import { User } from 'lucide-react';

interface AnonymousProfileIconProps {
  className?: string;
  iconClassName?: string;
  iconSize?: number;
  variant?: 'default' | 'overlay';
}

const AnonymousProfileIcon = ({
  className = '',
  iconClassName = '',
  iconSize = 18,
  variant = 'default',
}: AnonymousProfileIconProps) => {
  const variantClassName =
    variant === 'overlay'
      ? 'bg-white/30 text-white'
      : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-300';

  return (
    <span
      role="img"
      aria-label="익명 프로필 아이콘"
      className={`inline-flex flex-shrink-0 items-center justify-center rounded-full ${variantClassName} ${className}`}
    >
      <User
        aria-hidden="true"
        size={iconSize}
        className={iconClassName}
      />
    </span>
  );
};

export default AnonymousProfileIcon;
