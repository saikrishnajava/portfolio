import React from 'react';
import { Badge } from './ui/Badge';
import personalData from '../data/personal.json';

/**
 * React 18 does not recognise the camelCase prop, so the DOM attribute is
 * declared lowercase and spread in (it must reach the browser as
 * fetchpriority="high").
 */
type ProfileImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  fetchpriority?: 'high' | 'low' | 'auto';
};

const profileImage: ProfileImageProps = {
  src: 'profile-640.jpg',
  srcSet: 'profile-320.jpg 320w, profile-640.jpg 640w',
  sizes: '(min-width: 1024px) 360px, (min-width: 640px) 300px, 260px',
  width: 640,
  height: 800,
  fetchpriority: 'high',
  loading: 'eager',
  decoding: 'async',
  alt: personalData.name,
};

export const AvatarCard = () => {
  return (
    <figure className="w-full max-w-[360px]">
      <div className="border border-line bg-surface p-2">
        <img {...profileImage} className="block h-auto w-full" />
      </div>

      <figcaption className="mt-5">
        <p className="text-sm font-medium text-ink">{personalData.role}</p>
        <p className="mt-1 text-sm text-muted">{personalData.company}</p>
        <p className="mt-1 text-sm text-muted">{personalData.location}</p>

        <ul className="mt-4 flex flex-wrap gap-2">
          {personalData.focus.map((item) => (
            <li key={item}>
              <Badge variant="default" data-avatar-badge>
                {item}
              </Badge>
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
};
