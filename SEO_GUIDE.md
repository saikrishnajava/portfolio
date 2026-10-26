# SEO Guide — Saikrishna Garikipati Portfolio

Live URL: https://saikrishnajava.github.io/portfolio/

## 1. Why the page was not showing

Diagnosis on 2026-10-25:

- **The HTML shell had no body content.** The site is a React SPA, so a crawler
  that did not execute JavaScript saw only `<div id="root"></div>`. The name
  appeared in the title/meta, but not in an `<h1>` or the page copy.
- **No external links pointed at the page.** Searching the full name returned
  LinkedIn, Instagram, Facebook and unrelated profiles — not the portfolio.
  LinkedIn is the strongest entity result and did not clearly link here.
- **The GitHub Pages root is a 404.** `https://saikrishnajava.github.io/` has no
  user site, and `robots.txt` only exists at `/portfolio/robots.txt`. Crawlers
  read `robots.txt` at the host root, so that file is ignored. The sitemap can
  still be submitted manually.
- **Search Console submission was unconfirmed.** The verification meta tag is
  present, but a property created for the root URL cannot verify a project page;
  the property must be the `/portfolio/` URL prefix.

## 2. Technical fixes now shipped

- **Static prerender.** `npm run prerender` loads the built page in headless
  Chrome and writes the rendered DOM back to `dist/index.html`. Crawlers and
  no-JS visitors now receive the full page: H1, experience, skills, projects,
  education and contact. `src/main.tsx` hydrates that markup on load.
- **Title and description** target the name plus “portfolio” and the current
  role: `Saikrishna Garikipati | Systems Engineer Portfolio`.
- **Structured data** is a `WebSite` + `ProfilePage` + `Person` graph with
  `worksFor` (Charles Schwab), `alumniOf`, `address`, `knowsAbout`, and
  `sameAs` for LinkedIn and both GitHub accounts.
- **Crawl directives:** `robots` meta allows indexing and large image previews;
  a `rel="sitemap"` link is in the document; the sitemap and canonical URL are
  the `/portfolio/` URL.
- **Open Graph / Twitter:** absolute image URLs, dimensions, alt text and site
  name.
- **Guardrail:** `npm run seo` fails the build if the prerendered HTML, title,
  description, canonical, schema, sitemap or robots directives regress.

`npm run verify` runs build → prerender → lint → browser checks → SEO checks.
`npm run deploy` rebuilds and prerenders before publishing.

## 3. Required manual actions

### A. Google Search Console — highest priority

1. Open [Search Console](https://search.google.com/search-console).
2. Add a **URL-prefix** property: `https://saikrishnajava.github.io/portfolio/`
   (not the root domain).
3. Verify with the existing HTML meta tag. If the current token belongs to a
   different property, copy the new token and replace the
   `google-site-verification` value in `index.html`.
4. Submit the sitemap:
   `https://saikrishnajava.github.io/portfolio/sitemap.xml`.
5. Use **URL Inspection** on the homepage and click **Request indexing**.
6. Check **Pages** after 48–72 hours to confirm “Page is indexed”.

### B. Bing Webmaster Tools

1. Add `https://saikrishnajava.github.io/portfolio/`.
2. Verify (import from Google Search Console is fastest).
3. Submit the same sitemap and request indexing.

### C. Links that make the page discoverable

1. **LinkedIn (biggest signal):** add the portfolio URL under Contact info →
   Website, add it to Featured, and publish a short post linking to it.
2. **GitHub:** set the repository Website field to the live URL, set the profile
   website to the same URL, and pin the portfolio repository.
3. **README:** the repository now links the live site at the top.
4. **Resume:** the PDF already lists the portfolio URL; keep it.
5. **Root page or custom domain:** create a `saikrishnajava.github.io` user-site
   repository that redirects to `/portfolio/` (this also gives you a real
   host-root `robots.txt`), or move to a custom domain such as
   `saikrishnagarikipati.com` with a `CNAME` file and DNS.

### D. Monitoring

- Weekly: Search Console → Performance, query `Saikrishna Garikipati` and
  `Saikrishna Garikipati portfolio`.
- Weekly: `site:saikrishnajava.github.io/portfolio/` in Google and Bing.
- Monthly: incognito search for the full name; check the Knowledge Panel and
  LinkedIn links.

Indexing is not instant: expect days to a few weeks after the first crawl.
Technical fixes make the page eligible; links and time build authority.

## 4. Success metrics

- Page 1 for `Saikrishna Garikipati portfolio` and
  `Saikrishna Garikipati Systems Engineer`.
- Top 10 for the bare name. LinkedIn is likely to stay #1 for the name query;
  aim to appear alongside it, not replace it immediately.
- Search Console shows the page as indexed, not “Discovered – currently not
  indexed”.
- Rich-result eligibility from the `Person`/`ProfilePage` schema; eligibility is
  not a guarantee of display.
