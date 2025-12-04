# Mapa de módulos Presta Pro

## Estructura objetivo (según `estructure`)

```text
src/
  main.jsx
  App.jsx                  # Orquestador principal (layout + router interno)
  core/                    # Lógica de dominio (negocio)
    loans.js               # createLoan, registerPayment, cálculos
    clients.js             # helpers de clientes
    expenses.js            # helpers de gastos
    requests.js            # helpers de solicitudes
  state/
    usePrestaProState.js   # Hook con todos los useState, useEffect, acciones
  views/                   # Vistas por pestaña
    DashboardView.jsx
    ClientsView.jsx
    LoansView.jsx
    ExpensesView.jsx
    RequestsView.jsx
    RoutesView.jsx
    NotesView.jsx
    ReportsView.jsx
    HRView.jsx
    AccountingView.jsx
    SettingsView.jsx
    CalculatorView.jsx
    AIView.jsx             # Usa AIHelper + datos
  components/              # Componentes compartidos
    layout/
      Sidebar.jsx
      Header.jsx
      MobileMenu.jsx
      BottomNav.jsx
    ui/
      Card.jsx
      Badge.jsx
      PaymentTicket.jsx
      MenuSection.jsx
      MenuItem.jsx
    modals/
      ClientModal.jsx
      EmployeeModal.jsx
  ai/
    AIHelper.jsx           # Tu componente de asistente IA
  utils/
    formatters.js          # formatCurrency, formatDate, formatDateTime
    ids.js                 # generateId, generateSecurityToken
    storage.js             # safeLoad
    amortization.js        # calculateSchedule (puede ir aquí o en core/loans).
```

## Estado actual en `src/`

### Raíz `src/`
- [x] `main.jsx`
- [x] `App.jsx`
- [ ] `core/` (no existe aún)

### `src/state`
- [x] `usePrestaProState.js`

### `src/utils`
- [x] `formatters.js`
- [x] `ids.js`
- [x] `storage.js`
- [x] `amortization.js`

### `src/components`
- [x] `Card.jsx` (actualmente en raíz de components)
- [ ] `layout/Sidebar.jsx`
- [ ] `layout/Header.jsx`
- [ ] `layout/MobileMenu.jsx`
- [ ] `layout/BottomNav.jsx`
- [ ] `ui/Badge.jsx`
- [ ] `ui/PaymentTicket.jsx`
- [ ] `ui/MenuSection.jsx`
- [ ] `ui/MenuItem.jsx`
- [ ] `modals/ClientModal.jsx`
- [ ] `modals/EmployeeModal.jsx`

### `src/views`
- [x] `DashboardView.jsx`
- [ ] `ClientsView.jsx`
- [ ] `LoansView.jsx`
- [ ] `ExpensesView.jsx`
- [ ] `RequestsView.jsx`
- [ ] `RoutesView.jsx`
- [ ] `NotesView.jsx`
- [ ] `ReportsView.jsx`
- [ ] `HRView.jsx`
- [ ] `AccountingView.jsx`
- [ ] `SettingsView.jsx`
- [ ] `CalculatorView.jsx`
- [ ] `AIView.jsx`

### `src/ai`
- [ ] `AIHelper.jsx` (hoy está embebido dentro de `App.jsx`)

## Plan de creación de archivos (alto nivel)

1. **Normalizar components/ui**
   - Mover `Card` actual a `components/ui/Card.jsx` (ya existe archivo, confirmar uso) y extraer `Badge`, `PaymentTicket`, `MenuSection`, `MenuItem` desde `App.jsx`.
2. **Crear layout**
   - Extraer Sidebar, Header, MobileMenu, BottomNav desde `App.jsx` a `components/layout/*`.
3. **Mover vistas a `views/`**
   - Para cada vista que hoy vive en `App.jsx` (`ClientsView`, `LoansView`, etc.), copiar código a `views/*.jsx` y dejar en `App.jsx` solo imports + dispatch por `activeTab`.
4. **Extraer AIHelper**
   - Mover el componente `AIHelper` a `ai/AIHelper.jsx` + vista `AIView.jsx` que lo use.
5. **Crear `core/`**
   - Separar lógica pura de negocio de préstamos, clientes, gastos, solicitudes hacia `core/*.js`, usando los helpers de `utils/`.

A partir de este mapa, el siguiente paso será elegir un bloque (por ejemplo, `components/ui`) y crearlo completo, verificando siempre que `npm run build` siga pasando.
