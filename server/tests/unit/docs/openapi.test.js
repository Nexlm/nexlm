import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import apiRoutes from '../../../src/routes/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(here, '../../../../docs/api');

/**
 * Parses just enough YAML to check the spec against the router: this keeps a
 * dependency-free test that still fails when an endpoint is added without docs.
 */
function documentedPaths() {
  const spec = fs.readFileSync(path.join(apiDir, 'openapi.yaml'), 'utf8');
  const body = spec.slice(spec.indexOf('\npaths:'), spec.indexOf('\ncomponents:'));
  return new Set(
    body
      .split('\n')
      .map((line) => line.match(/^ {2}(\/\S*):\s*$/))
      .filter(Boolean)
      .map((m) => m[1]),
  );
}

/** Every route Express actually serves, as an OpenAPI-style path. */
function routerPaths(router, prefix = '/api') {
  const paths = new Set();
  for (const layer of router.stack) {
    if (layer.route) {
      paths.add(prefix + layer.route.path.replace(/:(\w+)/g, '{$1}'));
    } else if (layer.name === 'router' && layer.handle?.stack) {
      const mount = layer.regexp.source
        .replace('^\\/', '/')
        .replace('\\/?(?=\\/|$)', '')
        .replace(/\\\//g, '/')
        .replace(/\$$/, '');
      for (const nested of routerPaths(layer.handle, prefix + mount)) paths.add(nested);
    }
  }
  return paths;
}

const documented = documentedPaths();
const served = [...routerPaths(apiRoutes)].map((p) => p.replace(/\/$/, ''));

describe('OpenAPI spec', () => {
  it('documents the health and cron endpoints', () => {
    expect(documented.has('/health')).toBe(true);
    expect(documented.has('/api/cron/tick')).toBe(true);
  });

  it('documents every route the API serves', () => {
    const missing = served.filter((route) => !documented.has(route));
    expect(missing).toEqual([]);
  });

  it('documents no route that does not exist', () => {
    const extra = [...documented].filter(
      (route) => route.startsWith('/api/') && route !== '/api/cron/tick' && !served.includes(route),
    );
    expect(extra).toEqual([]);
  });

  it('keeps every referenced path file present', () => {
    const spec = fs.readFileSync(path.join(apiDir, 'openapi.yaml'), 'utf8');
    const files = new Set([...spec.matchAll(/\.\/paths\/([\w.-]+\.yaml)#/g)].map((m) => m[1]));

    expect(files.size).toBeGreaterThan(0);
    for (const file of files) expect(fs.existsSync(path.join(apiDir, 'paths', file))).toBe(true);
  });
});
