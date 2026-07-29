# Gaurang Sultania's Portfolio

A modern, dynamic portfolio website showcasing product strategy, technology insights, and professional work. Built with React, Vite, and Tailwind CSS with content powered by Notion.

## 🌐 Live Site

Visit: [gaurangsultania.github.io](https://gaurangsultania.github.io)

## ✨ Features

- **Dynamic Content Management**: Content synced from Notion API for easy updates
- **Responsive Design**: Mobile-first design using Tailwind CSS
- **Smooth Animations**: Powered by Framer Motion
- **Markdown Support**: Rich content rendering with React Markdown
- **Fast Performance**: Optimized build with Vite
- **Modern Stack**: React 18 with ES modules

## 🛠️ Tech Stack

- **Frontend Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM
- **Content Management**: Notion API
- **Animations**: Framer Motion
- **Markdown**: React Markdown with GitHub Flavored Markdown
- **Development**: PostCSS, Autoprefixer

## 📦 Getting Started

### Prerequisites

- Node.js 16+ and npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/gaurangsultania/gaurangsultania.github.io.git
   cd gaurangsultania.github.io
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with your Notion API credentials:
   ```
   VITE_NOTION_API_KEY=your_notion_api_key
   VITE_NOTION_DATABASE_ID=your_database_id
   ```

### Development

Run the development server (fetches Notion content before starting):
```bash
npm run dev
```

The site will be available at `http://localhost:5173`

### Build

Create an optimized production build:
```bash
npm run build
```

### Preview

Preview the production build locally:
```bash
npm run preview
```

## 🔄 Notion Integration

Content is automatically fetched from Notion on build and dev startup:
```bash
npm run fetch-notion
```

This script processes your Notion database and generates content for the site.

## 📁 Project Structure

```
├── public/              # Static assets
├── src/                 # React components and pages
├── scripts/             # Notion fetch script
├── index.html           # Entry point
├── package.json         # Dependencies
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind CSS configuration
└── postcss.config.js    # PostCSS configuration
```

## 🚀 Deployment

This repository is configured for GitHub Pages. The site is automatically deployed on push to the `main` branch.

## 📝 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 💬 Get In Touch

- **Website**: [gaurangsultania.github.io](https://gaurangsultania.github.io)
- **GitHub**: [@gaurangsultania](https://github.com/gaurangsultania)

---

**Last Updated**: May 2026
