# Saikrishna Garikipati - Portfolio

A professional portfolio website showcasing my experience as a Systems Engineer Expert, built with modern web technologies.

**Live:** https://saikrishnajava.github.io/portfolio/

## 🚀 Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS
- **Deployment:** GitHub Pages
- **Icons:** React Icons

## 🛠️ Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/saikrishnajava/portfolio.git
   cd portfolio
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

## 🧪 Verification

```bash
npm run verify
```

Runs the TypeScript build, the static prerender, ESLint, the zero-dependency
browser contract check in `scripts/ui-check.mjs`, and the static SEO contract
check in `scripts/seo-check.mjs`. Requires Node 22+ and Chrome; set
`CHROME_PATH` if Chrome is not at `/usr/bin/google-chrome`.

`npm run predeploy` (used by `npm run deploy`) always rebuilds and prerenders
before publishing.

## 📂 Structure

- `src/components`: Reusable UI components
- `src/sections`: Landing page sections (Hero, Experience, etc.)
- `src/data`: JSON files for content management
- `scripts`: Browser verification harness
- `public`: Static assets (images, resume)

## 📄 License

MIT
