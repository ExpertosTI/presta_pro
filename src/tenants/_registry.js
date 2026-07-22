/**
 * Tenant packs — overrides de branding/features por empresa (slug).
 * Core en src/modules/*; lo específico de un cliente vive aquí.
 *
 * Merge order: default → pack(slug) → Tenant.settings (branding/features)
 */

import defaultPack from './default/index.js';

const packModules = import.meta.glob('./*/index.js', { eager: true });

function loadPacks() {
  const map = { default: defaultPack };
  for (const [path, mod] of Object.entries(packModules)) {
    const match = path.match(/\.\/([^/]+)\/index\.js$/);
    if (!match) continue;
    const id = match[1];
    if (id === 'default' || id.startsWith('_')) continue;
    const pack = mod.default || mod;
    if (pack?.id) map[pack.id] = pack;
  }
  return map;
}

const PACKS = loadPacks();

export function listTenantPackIds() {
  return Object.keys(PACKS);
}

export function getTenantPack(slug) {
  if (!slug) return PACKS.default;
  const key = String(slug).toLowerCase();
  return PACKS[key] || PACKS.default;
}

/**
 * @param {string} slug
 * @param {object} [settings] Tenant.settings + company fields
 */
export function resolveTenantPack(slug, settings = {}) {
  const pack = getTenantPack(slug);
  const features = {
    ...(PACKS.default.features || {}),
    ...(pack.features || {}),
    ...(settings.features || {}),
  };
  const branding = {
    productName: 'Presta Pro',
    hidePoweredBy: false,
    productLogo: null,
    supportEmail: null,
    ...(PACKS.default.branding || {}),
    ...(pack.branding || {}),
    ...(settings.productName ? { productName: settings.productName } : {}),
    ...(settings.hidePoweredBy != null ? { hidePoweredBy: Boolean(settings.hidePoweredBy) } : {}),
    ...(settings.productLogoUrl ? { productLogo: settings.productLogoUrl } : {}),
    ...(settings.supportEmail ? { supportEmail: settings.supportEmail } : {}),
  };
  return {
    id: pack.id || 'default',
    branding,
    features,
    slots: pack.slots || {},
  };
}

export default resolveTenantPack;
