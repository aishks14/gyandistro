import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import RichEditor from '../components/RichEditor';
import { exportAsJson, exportAsMarkdown, parseImportFile } from '../lib/exportImport';
import type { Category, Post, PostStatus } from '../types';

interface AiStatus {
  enabled: boolean;
  provider: string;
  model: string | null;
}

/**
 * The write screen. Content is plain HTML — headings, paragraphs, lists —
 * and the server strips anything executable before it is stored.
 */
export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();

  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [coverImageUrl, setCover] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState<PostStatus>('draft');
  const [isFeatured, setFeatured] = useState(false);
  const [isSponsored, setSponsored] = useState(false);
  const [sponsorName, setSponsorName] = useState('');
  const [hasAffiliateLinks, setAffiliate] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [keywords, setKeywords] = useState('');

  const [categories, setCategories] = useState<Category[]>([]);
  const [ai, setAi] = useState<AiStatus | null>(null);
  const [aiBusy, setAiBusy] = useState('');
  const [titleIdeas, setTitleIdeas] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<Category[]>('/categories').then((r) => setCategories(r.data ?? []));
    api.get<AiStatus>('/ai/status').then((r) => setAi(r.data ?? null));
  }, []);

  // Editing an existing article: the API is keyed by slug, so find it by id.
  useEffect(() => {
    if (!id) return;
    api
      .get<Post>(`/posts/${id}`)
      .then((r) => {
        const post = r.data;
        if (!post) return;
        hydrate(post);
      })
      .catch(() => setError('Could not load that article for editing.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function hydrate(post: Post) {
    setTitle(post.title);
    setExcerpt(post.excerpt);
    setContent(post.content ?? '');
    setCover(post.coverImageUrl ?? '');
    setCategory(post.category?.name ?? '');
    setTags((post.tags ?? []).map((t) => t.name).join(', '));
    setStatus(post.status);
    setFeatured(post.isFeatured);
    setSponsored(post.isSponsored);
    setSponsorName(post.sponsorName ?? '');
    setAffiliate(post.hasAffiliateLinks);
    setAllowComments(post.allowComments);
    setMetaTitle(post.seo?.metaTitle ?? '');
    setMetaDescription(post.seo?.metaDescription ?? '');
    setKeywords((post.seo?.keywords ?? []).join(', '));
  }

  const payload = () => ({
    title,
    content,
    excerpt: excerpt || undefined,
    coverImageUrl: coverImageUrl || undefined,
    category: category || undefined,
    tags: tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    status,
    isFeatured,
    isSponsored,
    sponsorName: sponsorName || undefined,
    hasAffiliateLinks,
    allowComments,
    seo: {
      metaTitle: metaTitle || undefined,
      metaDescription: metaDescription || undefined,
      keywords: keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean)
    }
  });

  const save = async (event: FormEvent) => {
    event.preventDefault();

    // The textarea this replaced had a native `required` attribute; a
    // content-editable div doesn't participate in HTML5 form validation the
    // same way, so this replaces that check rather than relying solely on
    // the server's round trip to catch an empty article.
    const textOnly = content.replace(/<[^>]*>/g, '').trim();
    if (textOnly.length < 20) {
      setError('Write a little more before saving — the article body looks empty.');
      return;
    }

    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = id
        ? await api.put<Post>(`/posts/${id}`, payload())
        : await api.post<Post>('/posts', payload());
      navigate(`/article/${res.data!.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the article');
    } finally {
      setBusy(false);
    }
  };

  /** Every AI button runs through here so failures read the same way. */
  const runAi = async (task: string, apply: (data: any) => void) => {
    if (content.trim().length < 20) {
      setError('Write a paragraph or two first — the assistant needs something to work with.');
      return;
    }
    setAiBusy(task);
    setError('');
    setNotice('');
    try {
      const res = await api.post<any>(`/ai/${task}`, { content, title });
      apply(res.data);
      setNotice('Assistant finished. Check the result before you keep it.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The assistant is unavailable');
    } finally {
      setAiBusy('');
    }
  };

  const importInput = useRef<HTMLInputElement>(null);

  const currentArticlePackage = () => ({
    title,
    excerpt,
    content,
    category,
    tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
    seo: {
      metaTitle,
      metaDescription,
      keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean)
    }
  });

  const handleImportFile = async (file: File) => {
    if (
      content.trim().length > 20 &&
      !window.confirm('This replaces everything currently in the form. Continue?')
    ) {
      return;
    }
    try {
      const text = await file.text();
      const imported = parseImportFile(text);
      setTitle(imported.title);
      setExcerpt(imported.excerpt);
      setContent(imported.content);
      setCategory(imported.category);
      setTags(imported.tags.join(', '));
      setMetaTitle(imported.seo.metaTitle);
      setMetaDescription(imported.seo.metaDescription);
      setKeywords(imported.seo.keywords.join(', '));
      setNotice('Imported. Review before saving.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that file');
    }
  };

  const coverInput = useRef<HTMLInputElement>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverUploadError, setCoverUploadError] = useState('');

  const handleCoverFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setCoverUploadError('That file is not an image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setCoverUploadError('Images must be under 5MB');
      return;
    }
    setCoverUploading(true);
    setCoverUploadError('');
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await api.upload<{ url: string }>('/uploads/image', form);
      setCover(res.data!.url);
    } catch (err) {
      setCoverUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setCoverUploading(false);
    }
  };

  return (
    <div className="shell page rail">
      <p className="eyebrow rail-node">{id ? 'Edit' : 'Write'}</p>
      <h1 style={{ fontSize: '2.4rem' }}>{id ? 'Edit article' : 'New article'}</h1>

      {error && <div className="notice notice-error">{error}</div>}
      {notice && <div className="notice notice-ok">{notice}</div>}

      <div className="split" style={{ gridTemplateColumns: 'minmax(0,1fr) 300px' }}>
        <form onSubmit={save}>
          <label className="field">
            <span className="field-label">Headline</span>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={4}
              maxLength={180}
            />
          </label>

          {titleIdeas.length > 0 && (
            <div className="panel" style={{ marginBottom: 18 }}>
              <div className="sidebar-title">Headline options</div>
              {titleIdeas.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  className="link-btn"
                  style={{
                    display: 'block',
                    textAlign: 'left',
                    marginBottom: 8,
                    textTransform: 'none',
                    fontSize: 14
                  }}
                  onClick={() => setTitle(idea)}
                >
                  {idea}
                </button>
              ))}
            </div>
          )}

          <label className="field">
            <span className="field-label">Excerpt</span>
            <textarea
              className="textarea"
              style={{ minHeight: 80 }}
              maxLength={400}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Leave blank and we will take the opening lines."
            />
          </label>

          <label className="field">
            <span className="field-label">Body</span>
            <RichEditor value={content} onChange={setContent} />
            <span className="field-hint">
              Use the toolbar to format — no HTML needed. Click "Image" to drop a picture in
              anywhere in the article, not just as the cover.
            </span>
          </label>

          <div className="grid-2">
            <label className="field">
              <span className="field-label">Section</span>
              <input
                className="input"
                list="category-options"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Data & Analytics"
              />
              <datalist id="category-options">
                {categories.map((c) => (
                  <option key={c._id} value={c.name} />
                ))}
              </datalist>
              <span className="field-hint">A new name creates a new section.</span>
            </label>

            <label className="field">
              <span className="field-label">Tags</span>
              <input
                className="input"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="sql, indexes, performance"
              />
              <span className="field-hint">Comma separated, up to twelve.</span>
            </label>
          </div>

          <label className="field">
            <span className="field-label">Cover image</span>
            {coverUploadError && (
              <div className="notice notice-error" style={{ marginBottom: 8 }}>
                {coverUploadError}
              </div>
            )}
            {coverImageUrl && (
              <img
                src={coverImageUrl}
                alt=""
                style={{
                  width: '100%',
                  maxHeight: 160,
                  objectFit: 'cover',
                  border: '1px solid var(--line)',
                  marginBottom: 10
                }}
              />
            )}
            <input
              className="input"
              type="url"
              value={coverImageUrl}
              onChange={(e) => setCover(e.target.value)}
              placeholder="https://… or upload below"
            />
            <input
              ref={coverInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleCoverFile(file);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 8 }}
              onClick={() => coverInput.current?.click()}
              disabled={coverUploading}
            >
              {coverUploading ? 'Uploading…' : 'Upload from your computer'}
            </button>
            <span className="field-hint">Paste a URL, or upload a file — either fills this field.</span>
          </label>

          <div className="sidebar-title" style={{ marginTop: 26 }}>
            Search listing
          </div>
          <label className="field">
            <span className="field-label">Meta title</span>
            <input
              className="input"
              maxLength={70}
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">Meta description</span>
            <textarea
              className="textarea"
              style={{ minHeight: 70 }}
              maxLength={180}
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">Keywords</span>
            <input
              className="input"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="comma separated"
            />
          </label>

          <button className="btn" disabled={busy} style={{ marginTop: 12 }}>
            {busy ? 'Saving' : id ? 'Save changes' : 'Create article'}
          </button>
        </form>

        <aside>
          <div className="sidebar-block">
            <div className="sidebar-title">Publishing</div>
            <label className="field">
              <span className="field-label">Status</span>
              <select
                className="select"
                value={status}
                onChange={(e) => setStatus(e.target.value as PostStatus)}
              >
                <option value="draft">Draft — only you can see it</option>
                <option value="pending">Submit for review</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
              {!can('editor') && (
                <span className="field-hint">
                  Authors cannot publish directly. Choosing "Published" sends it to an editor.
                </span>
              )}
            </label>

            {can('editor') && (
              <label className="checkline">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setFeatured(e.target.checked)}
                />
                Feature on the home page
              </label>
            )}

            <label className="checkline">
              <input
                type="checkbox"
                checked={allowComments}
                onChange={(e) => setAllowComments(e.target.checked)}
              />
              Allow comments
            </label>
          </div>

          <div className="sidebar-block">
            <div className="sidebar-title">Money and disclosure</div>
            <label className="checkline">
              <input
                type="checkbox"
                checked={isSponsored}
                onChange={(e) => setSponsored(e.target.checked)}
              />
              Sponsored article
            </label>
            {isSponsored && (
              <label className="field">
                <span className="field-label">Sponsor name</span>
                <input
                  className="input"
                  value={sponsorName}
                  onChange={(e) => setSponsorName(e.target.value)}
                />
              </label>
            )}
            <label className="checkline">
              <input
                type="checkbox"
                checked={hasAffiliateLinks}
                onChange={(e) => setAffiliate(e.target.checked)}
              />
              Contains affiliate links
            </label>
            <p className="field-hint">
              Both add a visible label for readers. That is the deal we make on the About page.
            </p>
          </div>

          <div className="sidebar-block">
            <div className="sidebar-title">Export &amp; import</div>
            <div className="stack" style={{ gap: 8 }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => exportAsJson(currentArticlePackage())}
              >
                Export as JSON
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => exportAsMarkdown(currentArticlePackage())}
              >
                Export as Markdown
              </button>
              <input
                ref={importInput}
                type="file"
                accept="application/json"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImportFile(file);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => importInput.current?.click()}
              >
                Import from JSON
              </button>
            </div>
            <p className="field-hint">Export works on whatever's in the form now, saved or not.</p>
          </div>

          <div className="sidebar-block">
            <div className="sidebar-title">Assistant</div>
            {!ai?.enabled ? (
              <p className="field-hint">
                Switched off. Set AI_PROVIDER in server/.env to ollama, openai or anthropic to turn
                these on.
              </p>
            ) : (
              <>
                <p className="field-hint" style={{ marginBottom: 12 }}>
                  {ai.provider} · {ai.model}
                </p>
                <div className="stack" style={{ gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={Boolean(aiBusy)}
                    onClick={() => runAi('titles', (d) => setTitleIdeas(d.titles ?? []))}
                  >
                    {aiBusy === 'titles' ? 'Thinking' : 'Suggest headlines'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={Boolean(aiBusy)}
                    onClick={() => runAi('excerpt', (d) => setExcerpt(d.excerpt ?? ''))}
                  >
                    {aiBusy === 'excerpt' ? 'Thinking' : 'Write the excerpt'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={Boolean(aiBusy)}
                    onClick={() => runAi('tags', (d) => setTags((d.tags ?? []).join(', ')))}
                  >
                    {aiBusy === 'tags' ? 'Thinking' : 'Suggest tags'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={Boolean(aiBusy)}
                    onClick={() =>
                      runAi('seo', (d) => {
                        setMetaTitle(d.metaTitle ?? '');
                        setMetaDescription(d.metaDescription ?? '');
                        setKeywords((d.keywords ?? []).join(', '));
                      })
                    }
                  >
                    {aiBusy === 'seo' ? 'Thinking' : 'Fill the search listing'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={Boolean(aiBusy)}
                    onClick={() =>
                      runAi('improve', (d) => {
                        if (d.content)
                          setContent(`<p>${String(d.content).split('\n\n').join('</p>\n<p>')}</p>`);
                      })
                    }
                  >
                    {aiBusy === 'improve' ? 'Thinking' : 'Tighten the draft'}
                  </button>
                </div>
                <p className="field-hint" style={{ marginTop: 12 }}>
                  Suggestions only. Nothing is saved until you press save.
                </p>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}