-- ═══════════════════════════════════════════════════
-- CEDIS Pedidos — Migration: Auth Access Control
-- Run this in Supabase Dashboard > SQL Editor
-- https://supabase.com/dashboard/project/fzevuwmatzvdvhaldyrf/sql/new
-- ═══════════════════════════════════════════════════

-- 1. Add columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS estado_cuenta text NOT NULL DEFAULT 'activo'
    CHECK (estado_cuenta IN ('pendiente','activo','inactivo')),
  ADD COLUMN IF NOT EXISTS es_superadmin boolean NOT NULL DEFAULT false;

-- 2. Create solicitudes_acceso table
CREATE TABLE IF NOT EXISTS solicitudes_acceso (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES users(id) ON DELETE CASCADE,
  nombre        text NOT NULL,
  email         text NOT NULL,
  sucursal_id   uuid REFERENCES sucursales(id),
  mensaje       text,
  estado        text NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','aprobado','rechazado')),
  revisado_por  uuid REFERENCES users(id),
  revisado_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 3. RLS for solicitudes_acceso
ALTER TABLE solicitudes_acceso ENABLE ROW LEVEL SECURITY;

-- Admins see all solicitudes
CREATE POLICY "sol_admin_sel" ON solicitudes_acceso FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND rol = 'admin'));

-- Admins can approve/reject
CREATE POLICY "sol_admin_upd" ON solicitudes_acceso FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND rol = 'admin'));

-- Any authenticated user can insert (self-registration)
CREATE POLICY "sol_insert" ON solicitudes_acceso FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Users can see their own solicitud
CREATE POLICY "sol_own_sel_2" ON solicitudes_acceso FOR SELECT
  USING (user_id = auth.uid());

-- 4. Set superadmin flag on the owner accounts
-- This runs SAFELY even if users don't exist yet (UPDATE 0 rows = OK)
UPDATE users 
SET es_superadmin = true, rol = 'admin', estado_cuenta = 'activo'
WHERE email IN ('auxiliaralmacen@clorodehidalgo.com', 'alejandro2310.am@gmail.com');
