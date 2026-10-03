# Saraswati Notes

A what-you-see-is-what-you-get notes app built with React, TypeScript, Vite, and Tailwind CSS. It ships as a single HTML file and runs as a web app.

## Features

- Rich-text editor (bold, italic, underline, strikethrough, headings, lists, checkboxes, quotes, code blocks, colors, highlights, links, images, dividers, alignment)
- Folder & subfolder organization (unlimited nesting) with rename/delete/move
- Search across all notes
- Pin important notes
- HTML source view and copy/export of note HTML
- ~100 theme presets with a random switcher and a theme gallery
- Word & character counts
- Everything is stored locally in your browser via IndexedDB (notes, folders, and theme persist across sessions)

## Getting started

```bash
npm install
npm run dev
```

Then open the local URL Vite prints (usually `http://localhost:5173`).

## Build

```bash
npm run build
```

Outputs a single self-contained `dist/index.html` thanks to `vite-plugin-singlefile`. Open it in any modern browser or host it statically.

## Tech

- React 19 + TypeScript
- Vite 7 (`@vitejs/plugin-react`, `@tailwindcss/vite`, `vite-plugin-singlefile`)
- Tailwind CSS 4
- lucide-react icons
- IndexedDB for persistence (localStorage auto-migrates on first load)

## Project structure

```
src/
  App.tsx         # Layout, sidebar/folder tree, modals, theme state
  Editor.tsx      # Rich-text editor, toolbar, HTML source view
  notes.ts        # Note/Folder types, IndexedDB storage, migrations
  ThemeGallery.tsx# Theme picker overlay
  themes.ts       # Theme definitions
  themes.css      # Theme variables + app styles
  utils/          # Small helpers
```
