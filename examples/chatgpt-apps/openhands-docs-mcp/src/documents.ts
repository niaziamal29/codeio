import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type SearchResult = {
  id: string;
  title: string;
  url: string;
};

export type FetchResult = {
  id: string;
  title: string;
  text: string;
  url: string;
  metadata: Record<string, string>;
};

type DocSeed = {
  id: string;
  title: string;
  repoPath: string;
  category: string;
};

type LoadedDocument = DocSeed & {
  text: string;
  url: string;
  searchText: string;
};

const DEFAULT_REPO_ROOT = resolve(import.meta.dirname, "../../../../");
const REPO_ROOT = resolve(process.env.OPENHANDS_DOCS_REPO_ROOT ?? DEFAULT_REPO_ROOT);

const DOCUMENTS: DocSeed[] = [
  {
    id: "root-readme",
    title: "OpenHands root README",
    repoPath: "README.md",
    category: "overview",
  },
  {
    id: "development-guide",
    title: "OpenHands development guide",
    repoPath: "Development.md",
    category: "setup",
  },
  {
    id: "contributing-guide",
    title: "OpenHands contributing guide",
    repoPath: "CONTRIBUTING.md",
    category: "contributing",
  },
  {
    id: "community-guide",
    title: "OpenHands community guide",
    repoPath: "COMMUNITY.md",
    category: "community",
  },
  {
    id: "openhands-readme",
    title: "OpenHands backend README",
    repoPath: "openhands/README.md",
    category: "backend",
  },
  {
    id: "frontend-readme",
    title: "OpenHands frontend README",
    repoPath: "frontend/README.md",
    category: "frontend",
  },
  {
    id: "enterprise-readme",
    title: "OpenHands enterprise README",
    repoPath: "enterprise/README.md",
    category: "enterprise",
  },
  {
    id: "server-readme",
    title: "OpenHands server README",
    repoPath: "openhands/server/README.md",
    category: "backend",
  },
  {
    id: "app-server-readme",
    title: "OpenHands app server README",
    repoPath: "openhands/app_server/README.md",
    category: "backend",
  },
  {
    id: "runtime-readme",
    title: "OpenHands runtime README",
    repoPath: "openhands/runtime/README.md",
    category: "runtime",
  },
  {
    id: "mcp-proxy-readme",
    title: "OpenHands MCP proxy README",
    repoPath: "openhands/runtime/mcp/proxy/README.md",
    category: "mcp",
  },
  {
    id: "skills-readme",
    title: "OpenHands skills README",
    repoPath: "skills/README.md",
    category: "skills",
  },
];

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[`*_>#/\\()[\]{}:;,.!?-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (value: string): string[] =>
  normalize(value)
    .split(" ")
    .filter((token) => token.length > 1);

const toGithubUrl = (repoPath: string): string =>
  `https://github.com/OpenHands/OpenHands/blob/main/${repoPath}`;

const loadDocument = (seed: DocSeed): LoadedDocument => {
  const absolutePath = resolve(REPO_ROOT, seed.repoPath);
  const text = readFileSync(absolutePath, "utf8");

  return {
    ...seed,
    text,
    url: toGithubUrl(seed.repoPath),
    searchText: `${seed.title}\n${text}`,
  };
};

const loadedDocuments = DOCUMENTS.map(loadDocument);
const documentMap = new Map(loadedDocuments.map((document) => [document.id, document]));

const scoreDocument = (document: LoadedDocument, terms: string[]): number => {
  const title = normalize(document.title);
  const content = normalize(document.searchText);

  let score = 0;
  for (const term of terms) {
    if (title.includes(term)) {
      score += 8;
    }

    if (document.repoPath.toLowerCase().includes(term)) {
      score += 4;
    }

    if (content.includes(term)) {
      score += 2;
    }
  }

  return score;
};

export function searchDocuments(query: string): SearchResult[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const terms = tokenize(trimmedQuery);
  if (terms.length === 0) {
    return [];
  }

  return loadedDocuments
    .map((document) => ({
      document,
      score: scoreDocument(document, terms),
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 8)
    .map(({ document }) => ({
      id: document.id,
      title: document.title,
      url: document.url,
    }));
}

export function fetchDocument(id: string): FetchResult | null {
  const document = documentMap.get(id);
  if (!document) {
    return null;
  }

  return {
    id: document.id,
    title: document.title,
    text: document.text,
    url: document.url,
    metadata: {
      category: document.category,
      repo_path: document.repoPath,
    },
  };
}

export function describeCorpus(): { repoRoot: string; documents: number } {
  return {
    repoRoot: REPO_ROOT,
    documents: loadedDocuments.length,
  };
}
