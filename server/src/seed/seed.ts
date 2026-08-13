/**
 * Fills an empty database with demo content so the site looks alive on first run.
 * Safe to re-run: it wipes the collections it owns before inserting.
 *
 *   npm run seed
 */
import { connectDatabase, disconnectDatabase } from '../config/db';
import { env } from '../config/env';
import { User } from '../models/User';
import { Post } from '../models/Post';
import { Category } from '../models/Category';
import { Tag } from '../models/Tag';
import { Comment } from '../models/Comment';
import { Ad } from '../models/Ad';
import { RefreshToken } from '../models/RefreshToken';
import { toSlug } from '../utils/slug';
import { makeExcerpt, readingMinutes } from '../utils/sanitize';

const CATEGORIES = [
  { name: 'Data & Analytics', description: 'Working with numbers that decide things.', colour: '#F0A92E' },
  { name: 'Engineering', description: 'How the systems behind the screen are put together.', colour: '#2F8F7F' },
  { name: 'Careers', description: 'Switching tracks, interviewing, and getting paid.', colour: '#C2225B' },
  { name: 'Learning', description: 'Study notes and reading paths worth your evening.', colour: '#4A5AC8' }
];

const ARTICLES = [
  {
    title: 'Reading a dataset before you touch a single formula',
    category: 'Data & Analytics',
    tags: ['pandas', 'eda', 'fundamentals'],
    content: `<p>Most bad analysis starts with a spreadsheet that was opened and immediately pivoted. Before any of that, spend twenty minutes finding out what you are actually holding.</p>
<h2>Count the rows twice</h2>
<p>Ask the person who sent the file how many rows they expect. If your count differs, something upstream is filtering or duplicating, and every number you produce afterwards inherits that error.</p>
<h2>Look for the nulls that mean something</h2>
<p>A blank cell in a "date of cancellation" column is not missing data — it means the customer did not cancel. Filling it with a median would be nonsense. Separate genuinely absent values from meaningful blanks before cleaning anything.</p>
<h2>Check the granularity</h2>
<p>One row per order, or one row per line item? Every aggregate you write depends on the answer, and the column names rarely tell you. Group by the candidate key and see whether the counts come back as ones.</p>
<h2>Write the profile down</h2>
<p>Row count, date range, unique keys, null rates, and a sentence on what one row represents. Ten lines of notes at the start saves a rewrite at the end.</p>`
  },
  {
    title: 'Why your JWT setup is probably leaking sessions',
    category: 'Engineering',
    tags: ['security', 'jwt', 'node'],
    content: `<p>Token auth looks simple until you ask the awkward question: what happens when a token is stolen?</p>
<h2>Access tokens should be short</h2>
<p>Fifteen minutes is a sensible ceiling. A long-lived access token cannot be withdrawn, because verifying it needs no database call — that is the whole point of it, and also the whole problem.</p>
<h2>Refresh tokens belong in a cookie</h2>
<p>Store the refresh token in an httpOnly cookie so page scripts cannot read it. Anything kept in localStorage is one cross-site scripting bug away from being copied.</p>
<h2>Rotate on every use</h2>
<p>Issue a new refresh token each time one is redeemed and retire the old one. A stolen token then works at most once, and the moment the real user refreshes, the attacker's copy stops working.</p>
<h2>Keep only hashes</h2>
<p>Save the SHA-256 of each refresh token rather than the token itself. If the database ever leaks, nobody walks away with a set of live sessions.</p>`
  },
  {
    title: 'Switching into analytics without pretending you have experience',
    category: 'Careers',
    tags: ['career-change', 'portfolio', 'interviews'],
    content: `<p>Hiring managers can tell when a resume is stretching. What they respond to is evidence, and evidence is easier to manufacture honestly than most career-changers assume.</p>
<h2>Your old job is not a gap</h2>
<p>Years in retail or administration mean you have handled messy operational data, unhappy stakeholders, and deadlines that did not move. Say that in those words instead of hiding the years.</p>
<h2>Three projects beat nine certificates</h2>
<p>Pick problems with a real question attached: which stores lose money on returns, which cohort of students drops out, which month the inventory forecast breaks. Publish the notebook and the conclusion.</p>
<h2>Learn the tool the job asks for</h2>
<p>Read ten postings for the exact role you want. If eight of them say SQL and Excel and two say Python, spend your hours accordingly.</p>
<h2>Interviewing is a separate skill</h2>
<p>Practise saying what a JOIN does out loud. Knowing something and explaining it under mild pressure are different abilities, and only one of them gets tested.</p>`
  },
  {
    title: 'A reading path for statistics that does not start with a textbook',
    category: 'Learning',
    tags: ['statistics', 'study-plan'],
    content: `<p>Statistics taught formula-first tends to bounce off. Taught question-first, it sticks.</p>
<h2>Start with variation</h2>
<p>Before distributions or tests, sit with the plain idea that measurements differ and some of that difference is noise. Everything else in the subject is machinery for telling signal from noise.</p>
<h2>Then sampling</h2>
<p>Almost every mistake in applied statistics is a sampling mistake wearing a formula as a disguise. Learn what a sample can and cannot tell you about the thing it came from.</p>
<h2>Only then, tests</h2>
<p>A p-value stops being mysterious once you know exactly which sampling story it assumes. Approached in that order, hypothesis testing takes an afternoon rather than a semester.</p>
<h2>Practise on data you care about</h2>
<p>Household electricity bills, cricket scores, your own commute times. Interest carries you past the point where a generic dataset would have lost you.</p>`
  },
  {
    title: 'MongoDB indexes: the four you almost always need',
    category: 'Engineering',
    tags: ['mongodb', 'performance', 'database'],
    content: `<p>An unindexed collection is fine at a thousand documents and painful at a million. These four cover most of what a content site does.</p>
<h2>The unique lookup</h2>
<p>Anything you fetch by a human-readable identifier — a slug, an email — wants a unique index. It enforces correctness and speeds up the read at the same time.</p>
<h2>The compound filter and sort</h2>
<p>A feed that filters on status and sorts by date needs both fields in one index, in that order. Two separate single-field indexes will not do the same job.</p>
<h2>The text index</h2>
<p>One text index per collection, covering the fields a search box should reach. It is not a search engine, but it postpones needing one by a long while.</p>
<h2>The TTL index</h2>
<p>Sessions, one-time codes, and expiring tokens can clean themselves up. Set expireAfterSeconds and stop writing cron jobs to delete old rows.</p>`
  },
  {
    title: 'The dashboard nobody opens, and how to avoid building it',
    category: 'Data & Analytics',
    tags: ['dashboards', 'stakeholders', 'bi'],
    content: `<p>Every analytics team has one: twenty charts, built over three weeks, opened twice. The failure is almost never technical.</p>
<h2>Ask what decision it serves</h2>
<p>If nobody can name a decision that changes based on the number, the chart is decoration. Cut it before you build it.</p>
<h2>One screen, one audience</h2>
<p>A dashboard serving both the warehouse manager and the finance director serves neither. Two small focused views get used; one big shared view gets ignored.</p>
<h2>Put the comparison in the chart</h2>
<p>A number alone is unreadable. Against last month, against target, against the same week last year — the comparison is what makes it information.</p>
<h2>Agree on the refresh</h2>
<p>Half of all lost trust in a dashboard comes from someone assuming it was live when it was a day old. Print the timestamp where it cannot be missed.</p>`
  }
];

async function run() {
  await connectDatabase();
  console.log('[seed] clearing existing demo data');

  await Promise.all([
    User.deleteMany({}),
    Post.deleteMany({}),
    Category.deleteMany({}),
    Tag.deleteMany({}),
    Comment.deleteMany({}),
    Ad.deleteMany({}),
    RefreshToken.deleteMany({})
  ]);

  console.log('[seed] creating accounts');
  const admin = await User.create({
    name: 'Site Admin',
    email: env.seed.adminEmail,
    password: env.seed.adminPassword,
    role: 'admin',
    bio: 'Runs GyanDistro and approves what goes live.',
    social: { website: 'https://gyandistro.com', twitter: 'https://twitter.com/gyandistro' }
  });

  const editor = await User.create({
    name: 'Meera Editor',
    email: 'editor@gyandistro.com',
    password: 'Editor@12345',
    role: 'editor',
    bio: 'Copy desk. Reads every draft before it ships.'
  });

  const author = await User.create({
    name: 'Rohan Author',
    email: 'author@gyandistro.com',
    password: 'Author@12345',
    role: 'author',
    bio: 'Writes about data, databases and the gap between them.',
    social: { github: 'https://github.com/gyandistro', linkedin: 'https://linkedin.com/in/gyandistro' }
  });

  const reader = await User.create({
    name: 'Anita Reader',
    email: 'reader@gyandistro.com',
    password: 'Reader@12345',
    role: 'reader'
  });

  console.log('[seed] creating categories');
  const categoryMap = new Map<string, any>();
  for (const c of CATEGORIES) {
    const doc = await Category.create({ ...c, slug: toSlug(c.name) });
    categoryMap.set(c.name, doc);
  }

  console.log('[seed] creating tags and articles');
  const tagMap = new Map<string, any>();
  const authors = [author, editor, admin];
  const posts = [];

  for (let i = 0; i < ARTICLES.length; i++) {
    const article = ARTICLES[i];
    const tagIds = [];
    for (const name of article.tags) {
      if (!tagMap.has(name)) {
        tagMap.set(name, await Tag.create({ name, slug: toSlug(name) }));
      }
      tagIds.push(tagMap.get(name)._id);
    }

    const publishedAt = new Date(Date.now() - i * 3 * 24 * 60 * 60 * 1000);
    const post = await Post.create({
      title: article.title,
      slug: toSlug(article.title),
      content: article.content,
      excerpt: makeExcerpt(article.content),
      author: authors[i % authors.length]._id,
      category: categoryMap.get(article.category)._id,
      tags: tagIds,
      status: 'published',
      readingMinutes: readingMinutes(article.content),
      views: 120 + i * 37,
      isFeatured: i === 0,
      publishedAt,
      seo: {
        metaTitle: article.title.slice(0, 60),
        metaDescription: makeExcerpt(article.content, 150),
        keywords: article.tags
      }
    });
    posts.push(post);
  }

  // Keep the counters on categories and tags in step with what we just inserted.
  for (const category of categoryMap.values()) {
    await Category.findByIdAndUpdate(category._id, {
      postCount: await Post.countDocuments({ category: category._id, status: 'published' })
    });
  }
  for (const tag of tagMap.values()) {
    await Tag.findByIdAndUpdate(tag._id, {
      postCount: await Post.countDocuments({ tags: tag._id, status: 'published' })
    });
  }

  console.log('[seed] creating a comment thread');
  const root = await Comment.create({
    post: posts[0]._id,
    author: reader._id,
    body: 'The point about granularity caught me out last week. Grouping by the candidate key would have saved me a day.',
    depth: 0
  });
  const reply = await Comment.create({
    post: posts[0]._id,
    author: author._id,
    parent: root._id,
    depth: 1,
    body: 'That is exactly the failure mode. I now write the "one row equals" sentence before anything else.'
  });
  await Comment.create({
    post: posts[0]._id,
    author: editor._id,
    parent: reply._id,
    depth: 2,
    body: 'Worth adding to the house style guide.'
  });
  await Post.findByIdAndUpdate(posts[0]._id, { commentCount: 3 });

  console.log('[seed] creating house ad units');
  await Ad.create([
    {
      name: 'Sidebar — house promo',
      placement: 'sidebar',
      kind: 'html',
      weight: 2,
      html: '<div style="padding:20px;border:1px solid #DCDDE3"><strong>Advertise on GyanDistro</strong><p style="margin:8px 0 0">Reach readers who came here to learn something. Write to ads@gyandistro.com.</p></div>'
    },
    {
      name: 'In-article — newsletter push',
      placement: 'in-article',
      kind: 'html',
      weight: 1,
      html: '<div style="padding:20px;border:1px solid #DCDDE3"><strong>One email a week</strong><p style="margin:8px 0 0">New articles, no filler. Subscribe from the footer.</p></div>'
    },
    {
      name: 'Below post — sponsor slot',
      placement: 'below-post',
      kind: 'html',
      weight: 1,
      html: '<div style="padding:20px;border:1px solid #DCDDE3"><strong>Sponsor slot available</strong><p style="margin:8px 0 0">This space is sold by the month.</p></div>'
    }
  ]);

  console.log('\n[seed] done. Sign in with:');
  console.table([
    { role: 'admin', email: env.seed.adminEmail, password: env.seed.adminPassword },
    { role: 'editor', email: 'editor@gyandistro.com', password: 'Editor@12345' },
    { role: 'author', email: 'author@gyandistro.com', password: 'Author@12345' },
    { role: 'reader', email: 'reader@gyandistro.com', password: 'Reader@12345' }
  ]);

  await disconnectDatabase();
  process.exit(0);
}

run().catch(async (error) => {
  console.error('[seed] failed:', error);
  await disconnectDatabase();
  process.exit(1);
});
