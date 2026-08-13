import type { PageMeta } from '../types';

export default function Pagination({
  meta,
  onChange
}: {
  meta: PageMeta;
  onChange: (page: number) => void;
}) {
  if (meta.totalPages <= 1) return null;

  return (
    <nav className="pager" aria-label="Pagination">
      <button
        className="btn btn-ghost btn-sm"
        disabled={!meta.hasPrev}
        onClick={() => onChange(meta.page - 1)}
      >
        Previous
      </button>
      <span className="meta">
        Page {meta.page} of {meta.totalPages}
      </span>
      <button
        className="btn btn-ghost btn-sm"
        disabled={!meta.hasNext}
        onClick={() => onChange(meta.page + 1)}
      >
        Next
      </button>
    </nav>
  );
}
