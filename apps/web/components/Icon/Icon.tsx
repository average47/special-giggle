import type { JSX } from 'react';
// The sprite URL import differs by bundler: Next.js yields a static-asset
// object ({ src }), while Vite (Storybook) yields the URL string directly.
// Normalize to a plain string so the component renders under either.
//@ts-expect-error –- no ambient type for the `?url` query import ---
import spriteAsset from './sprite.svg?url';

interface IconProps {
  name: string;
  className?: string;
  size: 'sm' | 'md' | 'lg' | 'xl';
}

const spriteUrl: string =
  typeof spriteAsset === 'string' ? spriteAsset : spriteAsset.src;

export function Icon({ ...props }: IconProps): JSX.Element {
  const sizes = () => {
    switch (props.size) {
      case 'sm':
        return '12px';
      case 'md':
        return '16px';
      case 'lg':
        return '24px';
      case 'xl':
        return '36px';
      default:
        return '24px';
    }
  };
  return (
    <svg
      width={sizes()}
      height={sizes()}
      viewBox="0 0 24 24"
      className={props.className}
      fill="currentColor"
    >
      <use href={`${spriteUrl}#${props.name}`} />
    </svg>
  );
}
