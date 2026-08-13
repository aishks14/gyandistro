import type { SocialLinks as Links } from '../types';

const LABELS: Array<[keyof Links, string]> = [
  ['website', 'Website'],
  ['twitter', 'X'],
  ['linkedin', 'LinkedIn'],
  ['github', 'GitHub'],
  ['instagram', 'Instagram'],
  ['youtube', 'YouTube']
];

export default function SocialLinks({
  links,
  className = 'social-row'
}: {
  links?: Links;
  className?: string;
}) {
  if (!links) return null;
  const entries = LABELS.filter(([key]) => Boolean(links[key]));
  if (!entries.length) return null;

  return (
    <div className={className}>
      {entries.map(([key, label]) => (
        <a
          key={key}
          className="social-link"
          href={links[key]}
          target="_blank"
          rel="noopener noreferrer me"
        >
          {label}
        </a>
      ))}
    </div>
  );
}
