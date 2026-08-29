const DEFAULT_CHARACTER_IMAGE = '/bottom-nav/fox.webp';

const CHARACTER_IMAGE_BY_AVATAR_FILENAME: Record<string, string> = {
  'base_image_1.webp': DEFAULT_CHARACTER_IMAGE,
  'base_image_2.webp': '/bottom-nav/pencil.webp',
  'base_image_3.webp': '/bottom-nav/bread.webp',
  'base_image_4.webp': '/bottom-nav/cat.webp',
};

export const getBottomNavCharacterImage = (avatarUrl?: string | null) => {
  const pathname = avatarUrl?.split(/[?#]/, 1)[0];
  const filename = pathname?.split('/').pop();

  return filename
    ? CHARACTER_IMAGE_BY_AVATAR_FILENAME[filename] ?? DEFAULT_CHARACTER_IMAGE
    : DEFAULT_CHARACTER_IMAGE;
};
