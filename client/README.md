# TaskManager

## Project Purpose

TaskManager is a task management web application built using Next.js, React, and TypeScript.

The project follows a modular folder structure for clean, scalable, and maintainable development.

---

## Tech Stack

- Next.js
- React
- TypeScript
- HTML5 / CSS3
- Node.js & npm
- Git & GitLab
- Eslint

---

## Installation

### Clone the Repository

```bash
git clone <gitlab-repository-url>
cd TaskManager/client
```

### Install Dependencies

```bash
npm install
```

This installs Next.js, React, TypeScript, and all other dependencies defined in `package.json`.

### Creating a Next.js Project from Scratch

If creating the project for the first time:

```bash
npx create-next-app@latest client
```

Recommended options:

```text
TypeScript: Yes
src/ directory: Yes
App Router: Yes
```

Then:

```bash
cd client
npm install
```

---

## How to Run

Start the development server:

```bash
npm run dev
```

Open the application at:

```text
http://localhost:3000
```

Create a production build:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

Run the configured linter:

```bash
npm run lint
```

---

## Folder Structure

```text
TaskManager/
└── client/
    │
    ├── .next/                  # Next.js generated build files
    ├── node_modules/           # Installed dependencies
    ├── public/                 # Static files
    │
    ├── src/
    │   └── app/
    │       ├── components/     # Reusable React components
    │       ├── constants/      # Fixed/shared values
    │       │
    │       ├── features/
    │       │   └── tasks/      # Task-specific features
    │       │
    │       ├── styles/         # Shared styles
    │       ├── types/          # TypeScript types/interfaces
    │       ├── utils/          # Helper functions
    │       │
    │       ├── favicon.ico     # Website favicon
    │       ├── globals.css     # Global CSS
    │       ├── layout.tsx      # Root layout
    │       └── page.tsx        # Home page
    │
    ├── .gitignore
    ├── eslint.config.mjs
    ├── next-env.d.ts
    ├── next.config.ts
    ├── package-lock.json
    ├── package.json
    ├── postcss.config.mjs
    ├── README.md
    └── tsconfig.json
```

> `.next/` and `node_modules/` are automatically generated and should not be committed to GitLab.

---

## Folder Description

| Folder | Purpose |
|---|---|
| `public/` | Static files such as images and icons |
| `src/app/` | Next.js App Router and application code |
| `components/` | Reusable React components |
| `constants/` | Fixed and shared values |
| `features/tasks/` | Task management feature code |
| `styles/` | Shared styles |
| `types/` | TypeScript types and interfaces |
| `utils/` | Reusable helper functions |

---

## Basic Development Rules

1. Use TypeScript (`.ts` / `.tsx`).
2. Use PascalCase for React components, e.g. `TaskCard.tsx`.
3. Keep reusable components inside `components/`.
4. Keep task-specific code inside `features/tasks/`.
5. Keep shared TypeScript types inside `types/`.
6. Keep helper functions inside `utils/`.
7. Keep fixed/shared values inside `constants/`.
8. Use `app/` for Next.js pages, layouts, and routes.
9. Run `npm run lint` before pushing code.
10. Never commit passwords, API keys, tokens, or `.env` secrets.
11. Do not commit `node_modules/` or `.next/`.
12. Use meaningful Git commit messages.
13. Use separate feature/fix branches.
14. Create GitLab Merge Requests before merging changes