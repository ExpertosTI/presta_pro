-- ============================================================
-- PrestaPro — Esquema Local SQLite / IndexedDB
-- Write-Ahead Log (WAL) Offline-First
-- ============================================================

-- Cola de operaciones pendientes de sincronizar al servidor
CREATE TABLE IF NOT EXISTS sync_queue (
  id          TEXT PRIMARY KEY,          -- UUID v4 idempotency key
  entity      TEXT NOT NULL,             -- 'receipt' | 'loan' | 'client' | 'expense' | 'route_closing'
  operation   TEXT NOT NULL,             -- 'CREATE' | 'UPDATE' | 'DELETE'
  payload     TEXT NOT NULL,             -- JSON.stringify del objeto completo
  status      TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING' | 'SYNCING' | 'DONE' | 'ERROR'
  retries     INTEGER NOT NULL DEFAULT 0,
  last_error  TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_created ON sync_queue(created_at);

-- Usuarios Locales (Cobradores / Administradores)
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  name          TEXT NOT NULL,
  email         TEXT,
  role          TEXT NOT NULL DEFAULT 'COBRADOR', -- 'ADMIN' | 'COBRADOR'
  permissions   TEXT,                    -- JSON ['view_routes', 'assign_loans']
  data          TEXT NOT NULL,           -- JSON completo
  synced        INTEGER NOT NULL DEFAULT 0,
  server_id     TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Clientes locales (espejo del servidor + creados offline)
CREATE TABLE IF NOT EXISTS clients (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  name          TEXT NOT NULL,
  phone         TEXT,
  address       TEXT,
  cedula        TEXT,
  score         INTEGER DEFAULT 70,
  collector_id  TEXT,                    -- Cobrador asignado a este cliente/ruta
  data          TEXT NOT NULL,           -- JSON completo del cliente
  synced        INTEGER NOT NULL DEFAULT 0, -- 0=local, 1=confirmado servidor
  server_id     TEXT,                    -- ID en el servidor (puede diferir si fue creado offline)
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clients_tenant ON clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_collector ON clients(collector_id);
CREATE INDEX IF NOT EXISTS idx_clients_synced ON clients(synced);

-- Préstamos locales
CREATE TABLE IF NOT EXISTS loans (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  client_id     TEXT NOT NULL,
  collector_id  TEXT,                    -- Cobrador asignado a este préstamo específico
  status        TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE' | 'PAID' | 'DEFAULTED'
  amount        REAL NOT NULL,
  data          TEXT NOT NULL,           -- JSON completo del préstamo + schedule
  synced        INTEGER NOT NULL DEFAULT 0,
  server_id     TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_loans_tenant ON loans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_loans_client ON loans(client_id);
CREATE INDEX IF NOT EXISTS idx_loans_collector ON loans(collector_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);

-- Cobros / recibos (el dato más crítico)
CREATE TABLE IF NOT EXISTS receipts (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  loan_id       TEXT NOT NULL,
  client_id     TEXT NOT NULL,
  installment_id TEXT NOT NULL,
  amount        REAL NOT NULL,
  paid_at       TEXT NOT NULL,
  collector_id  TEXT,
  data          TEXT NOT NULL,           -- JSON completo del recibo
  synced        INTEGER NOT NULL DEFAULT 0,
  server_id     TEXT,
  created_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_receipts_tenant ON receipts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_receipts_loan ON receipts(loan_id);
CREATE INDEX IF NOT EXISTS idx_receipts_synced ON receipts(synced);

-- Gastos
CREATE TABLE IF NOT EXISTS expenses (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  description   TEXT NOT NULL,
  amount        REAL NOT NULL,
  category      TEXT,
  data          TEXT NOT NULL,
  synced        INTEGER NOT NULL DEFAULT 0,
  server_id     TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_expenses_tenant ON expenses(tenant_id);

-- Cierres de ruta
CREATE TABLE IF NOT EXISTS route_closings (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  collector_id  TEXT NOT NULL,
  closed_at     TEXT NOT NULL,
  total_collected REAL NOT NULL DEFAULT 0,
  data          TEXT NOT NULL,
  synced        INTEGER NOT NULL DEFAULT 0,
  server_id     TEXT,
  created_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_route_closings_tenant ON route_closings(tenant_id);

-- Metadatos de sync (timestamps del último pull por entidad)
CREATE TABLE IF NOT EXISTS sync_meta (
  entity        TEXT PRIMARY KEY,
  last_pull_at  TEXT,                    -- ISO timestamp del último pull exitoso
  last_push_at  TEXT
);

INSERT OR IGNORE INTO sync_meta(entity) VALUES
  ('users'), ('clients'), ('loans'), ('receipts'), ('expenses'), ('route_closings');
