// Minimal next.js ambient declarations
// These cover the only two "next" imports used in this project.
// Replace with the full @types/next or next's own types once npm install completes.

declare module "next" {
  export interface NextConfig {
    transpilePackages?: string[];
    experimental?: Record<string, unknown>;
    images?: {
      domains?: string[];
      remotePatterns?: Array<{ protocol: string; hostname: string; pathname?: string }>;
    };
    [key: string]: unknown;
  }

  export interface Metadata {
    title?: string | { default?: string; template?: string; absolute?: string };
    description?: string;
    keywords?: string | string[];
    authors?: Array<{ name?: string; url?: string }>;
    openGraph?: Record<string, unknown>;
    twitter?: Record<string, unknown>;
    [key: string]: unknown;
  }
}
