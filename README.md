# Professional React Portfolio

A modern, production-ready portfolio website built with React 18, TypeScript, Vite, and Tailwind CSS.

## 🚀 Tech Stack

- **Frontend Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS + clsx + tailwind-merge
- **Animations:** Framer Motion + React CountUp
- **Icons:** React Icons
- **Deployment:** GitHub Pages / Vercel compatible

## 🛠️ Setup & Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/saikrishnagarikipati/my-portfolio.git
   cd my-portfolio
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run local development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

## 📂 Project Structure

```
src/
├── components/     # Reusable UI components
│   ├── ui/         # Generic UI elements (Button, Card, etc.)
│   └── ...         # Feature-specific components
├── sections/       # Page sections (Hero, Skills, Projects, etc.)
├── data/           # JSON content files
├── hooks/          # Custom React hooks
└── utils/          # Utility functions
```

## 🌍 Deployment

### Vercel (Recommended)
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project root
3. Follow the prompts

### GitHub Pages
1. Update `vite.config.ts` base path if needed (e.g. `base: '/my-portfolio/'`)
2. Run `npm run build`
3. Deploy the `dist` folder to `gh-pages` branch

## 🎨 Customization

- Update personal info in `src/data/personal.json`
- Add projects in `src/data/projects.json`
- Modify theme colors in `tailwind.config.js`

## 📄 License

MIT
