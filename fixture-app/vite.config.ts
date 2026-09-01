import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  generateEmbeddedFont,
  generateInlineAvatars,
  generateDuplicateSeedDataset,
  generateIconBarrel,
  generateLocaleTable,
  generateGeneratedPalette,
  generateDebugDevtools,
} from '../scripts/bloatContent.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

type Variant = {
  id: string;
  category: string;
  route: 'friends' | 'party';
  friendCount: number;
  theme: string;
  bundleBloat: string;
  virtualizationMode: string;
  focusBug: string;
  contrastBug: string;
};

function loadVariant(): Variant {
  const { variants } = JSON.parse(readFileSync(path.join(REPO_ROOT, 'variants.json'), 'utf8'));
  const id = process.env.VARIANT_ID ?? 'clean-01';
  const variant = variants.find((v: Variant) => v.id === id);
  if (!variant) throw new Error(`Unknown VARIANT_ID: ${id}. See variants.json for valid ids.`);
  return variant;
}

// Maps a bundleBloat id to which route it belongs on and the real payload to embed as a JS
// literal in that route's virtual bloat module. Deciding this here, at config-resolution
// time (not via a runtime conditional relying on dead-code elimination of an unselected
// branch), means Rollup only ever sees ONE real payload, on ONE route, for a given build:
// inclusion is a resolver decision, not a minifier optimism.
const BLOAT_GENERATORS: Record<string, { route: 'friends' | 'party'; kind: 'string' | 'array'; generate: () => unknown }> = {
  'embedded-font': { route: 'friends', kind: 'string', generate: generateEmbeddedFont },
  'inline-avatars': { route: 'friends', kind: 'array', generate: generateInlineAvatars },
  'duplicate-seed-dataset': { route: 'friends', kind: 'array', generate: generateDuplicateSeedDataset },
  'icon-barrel': { route: 'party', kind: 'array', generate: () => Object.values(generateIconBarrel()) },
  'locale-table': { route: 'party', kind: 'array', generate: generateLocaleTable },
  'generated-palette': { route: 'party', kind: 'array', generate: generateGeneratedPalette },
  'debug-devtools': { route: 'party', kind: 'array', generate: generateDebugDevtools },
};

const STUB_SOURCE = "export const bloatPayload = '';\nexport const bloatMarker = '';\n";

function momentSource(): string {
  return [
    "import moment from 'moment';",
    "import 'moment/locale/fr';",
    "import 'moment/locale/es';",
    "import 'moment/locale/de';",
    "import 'moment/locale/ja';",
    'export const bloatPayload = moment().format(\'YYYY\');',
    'export const bloatMarker = bloatPayload;',
    '',
  ].join('\n');
}

function literalSource(kind: 'string' | 'array', payload: unknown): string {
  const literal = JSON.stringify(payload);
  const markerExpr = kind === 'string' ? 'bloatPayload.slice(0, 8)' : 'JSON.stringify(bloatPayload[0])';
  return `export const bloatPayload = ${literal};\nexport const bloatMarker = ${markerExpr};\n`;
}

function bloatModulePlugin(variant: Variant): Plugin {
  const virtualFriends = 'virtual:friends-bloat';
  const virtualParty = 'virtual:party-bloat';
  const resolvedFriends = '\0' + virtualFriends;
  const resolvedParty = '\0' + virtualParty;

  function sourceFor(route: 'friends' | 'party'): string {
    if (variant.bundleBloat === 'none') return STUB_SOURCE;
    if (variant.bundleBloat === 'moment-full') {
      return route === 'friends' ? momentSource() : STUB_SOURCE;
    }
    const entry = BLOAT_GENERATORS[variant.bundleBloat];
    if (!entry || entry.route !== route) return STUB_SOURCE;
    return literalSource(entry.kind, entry.generate());
  }

  return {
    name: 'bloat-module-resolver',
    resolveId(id) {
      if (id === virtualFriends) return resolvedFriends;
      if (id === virtualParty) return resolvedParty;
      return null;
    },
    load(id) {
      if (id === resolvedFriends) return sourceFor('friends');
      if (id === resolvedParty) return sourceFor('party');
      return null;
    },
  };
}

export default defineConfig(() => {
  const variant = loadVariant();

  return {
    plugins: [react(), bloatModulePlugin(variant)],
    define: {
      __VARIANT_ID__: JSON.stringify(variant.id),
      __FRIEND_COUNT__: JSON.stringify(variant.friendCount),
      __THEME__: JSON.stringify(variant.theme),
      __BUNDLE_BLOAT__: JSON.stringify(variant.bundleBloat),
      __VIRTUALIZATION_MODE__: JSON.stringify(variant.virtualizationMode),
      __FOCUS_BUG__: JSON.stringify(variant.focusBug),
      __CONTRAST_BUG__: JSON.stringify(variant.contrastBug),
      __ROUTE_DEFAULT__: JSON.stringify(variant.route),
    },
    build: {
      // manifest.json maps each route's source file to its built chunk (dist/.vite/manifest.json),
      // which is what gate/checkBundle.mjs uses to find "this route's JS" precisely. No
      // manualChunks needed: Rollup's default dynamic-import splitting already gives each
      // route (FriendsRoute.tsx / PartyRoute.tsx) its own facade chunk and automatically
      // factors genuinely shared code (Modal.tsx, used by both routes) into a separate
      // shared chunk, so a bundle-bloat regression on one route's exclusive code (or a
      // dependency only that route imports, like moment) inflates only that route's chunk.
      manifest: true,
    },
  };
});
