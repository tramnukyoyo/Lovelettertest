import React from 'react';

const DEFAULT_AVATAR_URL = 'https://dwrhhrhtsklskquipcci.supabase.co/storage/v1/object/public/game-thumbnails/Gabu.webp';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ src, alt = '', className }) => (
  <img
    src={src || DEFAULT_AVATAR_URL}
    alt={alt}
    width={96}
    height={96}
    decoding="async"
    className={className}
    onError={(e) => {
      if (e.currentTarget.src !== DEFAULT_AVATAR_URL) e.currentTarget.src = DEFAULT_AVATAR_URL;
    }}
  />
);
