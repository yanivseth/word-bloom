import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import appCss from "~/styles/app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "WordBloom — Grow your child's vocabulary" },
      {
        name: "description",
        content:
          "WordBloom gives parents daily, personalized phrases to build their baby's vocabulary.",
      },
      { name: "theme-color", content: "#6d7f5f" },
      { property: "og:title", content: "WordBloom — Grow your child's vocabulary" },
      {
        property: "og:description",
        content:
          "WordBloom gives parents daily, personalized phrases to build their baby's vocabulary.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "manifest", href: "/manifest.json" },
    ],
  }),
  notFoundComponent: () => (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-4xl font-bold text-sage-700">Page not found</h1>
      <p className="text-gray-500">This little sprout hasn't bloomed yet.</p>
      <a href="/" className="text-lavender-600 underline hover:text-lavender-800">
        Back home
      </a>
    </div>
  ),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  const currentYear = new Date().getFullYear();

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="flex min-h-dvh flex-col">
        {children}
        <footer className="mt-auto border-t border-cream-200 bg-cream-100 px-6 py-6 text-center text-sm text-gray-500">
          <p>
            🌱 WordBloom &mdash; Helping little voices grow
          </p>
          <p className="mt-1 text-xs text-gray-400">
            &copy; {currentYear} WordBloom. All rights reserved.
          </p>
        </footer>
        <Scripts />
      </body>
    </html>
  );
}
