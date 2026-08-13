export default function Avatar({
  name,
  url,
  small = false
}: {
  name: string;
  url?: string;
  small?: boolean;
}) {
  const className = small ? 'avatar avatar-sm' : 'avatar';
  if (url) return <img className={className} src={url} alt="" loading="lazy" />;
  return (
    <span className={className} aria-hidden="true">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
