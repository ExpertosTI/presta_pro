# Tenant packs (custom por empresa)

Carpetas en `src/tenants/<slug>/` con un `index.js` que exporta:

```js
export default {
  id: 'mi-slug', // debe coincidir con Tenant.slug
  branding: {
    productName: 'Mi Marca',
    hidePoweredBy: true,
  },
  features: {
    // flags booleanas opcionales
  },
  slots: {
    // overrides de componentes (lazy) solo si hace falta código
  },
};
```

Prioridad de merge: `default` → pack del slug → `Tenant.settings` (`productName`, `hidePoweredBy`, `productLogoUrl`, `features`).

No pongas lógica de negocio compartida aquí; promoćionala al core cuando varios tenants la necesiten.
