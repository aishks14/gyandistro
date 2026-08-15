import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import { api } from '../lib/api';

const MAX_IMAGE_MB = 5;

/**
 * A toolbar-driven article editor — no HTML knowledge required.
 *
 * `value`/`onChange` carry sanitized HTML, exactly like the plain textarea
 * this replaces: the server still runs everything through cleanPostHtml on
 * save, so this component is a friendlier way to produce the same shape of
 * content, not a change to what's trusted.
 *
 * The set of marks and nodes enabled here is deliberately kept in step with
 * the server's sanitizer allowlist (server/src/utils/sanitize.ts). Turning on
 * a formatting option here that the server doesn't allow through would show
 * up in the editor and then silently vanish the moment the article is saved
 * — so anything added to this toolbar needs a matching addition there too.
 * Tables are the one exception worth noting: `table`/`tr`/`th`/`td` were
 * already allowlisted server-side before the editor could create one, so
 * this addition needed no server change at all.
 */

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function RichEditor({ value, onChange, placeholder }: RichEditorProps) {
  const [imagePanelOpen, setImagePanelOpen] = useState(false);
  const [linkPanelOpen, setLinkPanelOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        // <u> isn't in the server's sanitizer allowlist — leaving this on
        // would let someone underline text that then loses the underline
        // the moment the article saves. Off until both sides support it.
        underline: false,
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' }
        }
      }),
      Image.configure({
        inline: false,
        HTMLAttributes: { loading: 'lazy' }
      }),
      Placeholder.configure({
        placeholder: placeholder ?? 'Open with the point, not the preamble…'
      }),
      // Resizable stays off deliberately — column-resize handles add real
      // complexity for zero benefit in an article editor at blog width.
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell
    ],
    content: value,
    editorProps: {
      attributes: { class: 'prose rich-editor-surface' }
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML())
  });

  // Keeps the editor in step when `value` changes from OUTSIDE it — loading
  // an existing draft, or an AI-assist button rewriting the body. Comparing
  // against the editor's own current HTML first means a normal keystroke
  // (which already produced this exact HTML via onUpdate) never re-triggers
  // setContent and never fights the cursor mid-type.
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="rich-editor">
      <Toolbar
        editor={editor}
        imagePanelOpen={imagePanelOpen}
        setImagePanelOpen={setImagePanelOpen}
        linkPanelOpen={linkPanelOpen}
        setLinkPanelOpen={setLinkPanelOpen}
      />
      <EditorContent editor={editor} />
    </div>
  );
}

interface ToolbarProps {
  editor: Editor;
  imagePanelOpen: boolean;
  setImagePanelOpen: (v: boolean) => void;
  linkPanelOpen: boolean;
  setLinkPanelOpen: (v: boolean) => void;
}

function Toolbar({
  editor,
  imagePanelOpen,
  setImagePanelOpen,
  linkPanelOpen,
  setLinkPanelOpen
}: ToolbarProps) {
  const btn = (
    active: boolean,
    onClick: () => void,
    label: string,
    title: string,
    disabled = false
  ) => (
    <button
      type="button"
      className={`editor-btn${active ? ' is-active' : ''}`}
      onClick={onClick}
      title={title}
      disabled={disabled}
    >
      {label}
    </button>
  );

  const inTable = editor.isActive('table');

  return (
    <div className="editor-toolbar">
      {btn(editor.isActive('heading', { level: 2 }), () =>
        editor.chain().focus().toggleHeading({ level: 2 }).run(), 'H2', 'Heading')}
      {btn(editor.isActive('heading', { level: 3 }), () =>
        editor.chain().focus().toggleHeading({ level: 3 }).run(), 'H3', 'Subheading')}
      {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), 'B', 'Bold')}
      {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), 'I', 'Italic')}
      {btn(editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run(), 'S', 'Strikethrough')}
      {btn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), '•', 'Bullet list')}
      {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), '1.', 'Numbered list')}
      {btn(editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run(), '"', 'Quote')}
      {btn(editor.isActive('codeBlock'), () => editor.chain().focus().toggleCodeBlock().run(), '</>', 'Code block')}

      <span className="editor-toolbar-divider" />

      {btn(editor.isActive('link'), () => setLinkPanelOpen(!linkPanelOpen), 'Link', 'Insert link')}
      {btn(false, () => setImagePanelOpen(!imagePanelOpen), 'Image', 'Insert image')}
      {btn(
        inTable,
        () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
        'Table',
        'Insert a 3×3 table',
        inTable // once inside a table, use the row/column controls below instead of inserting a new one
      )}

      <span className="editor-toolbar-divider" />

      {btn(false, () => editor.chain().focus().undo().run(), '↺', 'Undo', !editor.can().undo())}
      {btn(false, () => editor.chain().focus().redo().run(), '↻', 'Redo', !editor.can().redo())}

      {linkPanelOpen && (
        <LinkPanel editor={editor} onClose={() => setLinkPanelOpen(false)} />
      )}
      {imagePanelOpen && (
        <ImagePanel editor={editor} onClose={() => setImagePanelOpen(false)} />
      )}

      {inTable && (
        <div className="editor-toolbar table-toolbar">
          {btn(false, () => editor.chain().focus().addRowAfter().run(), '+Row', 'Add row below')}
          {btn(false, () => editor.chain().focus().addColumnAfter().run(), '+Col', 'Add column right')}
          {btn(false, () => editor.chain().focus().deleteRow().run(), '−Row', 'Delete this row')}
          {btn(false, () => editor.chain().focus().deleteColumn().run(), '−Col', 'Delete this column')}
          {btn(false, () => editor.chain().focus().toggleHeaderRow().run(), 'Hdr', 'Toggle header row')}
          {btn(false, () => editor.chain().focus().deleteTable().run(), 'Delete table', 'Remove the whole table')}
        </div>
      )}
    </div>
  );
}

function LinkPanel({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [url, setUrl] = useState(editor.getAttributes('link').href ?? '');

  const apply = () => {
    if (url.trim()) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    onClose();
  };

  const remove = () => {
    editor.chain().focus().unsetLink().run();
    onClose();
  };

  return (
    <div className="editor-popover">
      <input
        className="input"
        autoFocus
        placeholder="https://…"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); apply(); }
          if (e.key === 'Escape') onClose();
        }}
      />
      <div className="row" style={{ marginTop: 8 }}>
        <button type="button" className="btn btn-sm" onClick={apply}>Apply</button>
        {editor.isActive('link') && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={remove}>Remove link</button>
        )}
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

function ImagePanel({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [url, setUrl] = useState('');
  const [altText, setAltText] = useState(''); 
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const insertAndClose = useCallback((src: string) => {
     editor.chain().focus().setImage({ src, alt: altText.trim() || undefined }).run();
    onClose();
  }, [editor, onClose]);

  const insertByUrl = () => {
    if (!url.trim()) return;
    insertAndClose(url.trim());
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('That file is not an image');
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setError(`Images must be under ${MAX_IMAGE_MB}MB`);
      return;
    }

    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await api.upload<{ url: string }>('/uploads/image', form);
      insertAndClose(res.data!.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="editor-popover">
      {error && <div className="notice notice-error" style={{ marginBottom: 8 }}>{error}</div>}

      <span className="field-label">Upload from your computer</span>
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <button
        type="button"
        className="btn btn-sm"
        style={{ width: '100%', marginTop: 6 }}
        onClick={() => fileInput.current?.click()}
        disabled={busy}
      >
        {busy ? 'Uploading…' : 'Choose an image'}
      </button>

      <div className="row" style={{ margin: '14px 0', alignItems: 'center' }}>
        <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        <span className="meta">or</span>
        <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
      </div>

      <span className="field-label">Paste an image URL</span>
      <span className="field-label" style={{ marginTop: 10 }}>Describe the image (for accessibility & search)</span>
      <input
        className="input"
        placeholder="e.g. Bar chart comparing 2023 vs 2024 revenue"
        value={altText}
        onChange={(e) => setAltText(e.target.value)}
        style={{ marginTop: 6 }}
      />
      <input
        className="input"
        placeholder="https://…"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); insertByUrl(); }
          if (e.key === 'Escape') onClose();
        }}
        style={{ marginTop: 6 }}
      />
      <div className="row" style={{ marginTop: 8 }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={insertByUrl} disabled={!url.trim()}>
          Insert from URL
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}