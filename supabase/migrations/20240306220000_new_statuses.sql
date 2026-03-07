-- Migration: Add new order statuses
-- Statuses: colocado_piso, expedido, recibido

ALTER TYPE estado_pedido ADD VALUE IF NOT EXISTS 'colocado_piso';
ALTER TYPE estado_pedido ADD VALUE IF NOT EXISTS 'expedido';
ALTER TYPE estado_pedido ADD VALUE IF NOT EXISTS 'recibido';

-- Allow sucursales to update orders in 'expedido' status (to move to 'recibido')
DROP POLICY IF EXISTS "pedidos_update_sucursal" ON pedidos;
CREATE POLICY "pedidos_update_sucursal" ON pedidos FOR UPDATE USING (
  (estado IN ('borrador', 'pendiente_fecha', 'expedido'))
  AND sucursal_id = (SELECT sucursal_id FROM users WHERE id = auth.uid())
) WITH CHECK (
  sucursal_id = (SELECT sucursal_id FROM users WHERE id = auth.uid())
);
