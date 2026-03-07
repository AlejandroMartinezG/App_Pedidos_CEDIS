-- ═══════════════════════════════════════════════════
-- CEDIS Pedidos — Migration: Add Admin Delete Policy
-- ═══════════════════════════════════════════════════

CREATE POLICY "pedidos_delete_admin" ON pedidos FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND rol = 'admin')
);
