import { useMemo } from 'react';
import { resolveTenantPack } from '../tenants/_registry';

/**
 * @param {{ slug?: string, settings?: object }} opts
 */
export function useTenantPack({ slug, settings } = {}) {
  return useMemo(
    () => resolveTenantPack(slug, settings || {}),
    [slug, settings],
  );
}

export default useTenantPack;
