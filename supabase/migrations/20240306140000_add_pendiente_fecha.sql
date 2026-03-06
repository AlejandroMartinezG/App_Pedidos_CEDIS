-- Migración para el estado pendiente_fecha

-- 1. Deshabilitar transacción para alterar ENUM (requerido por postgres)
-- Dependiendo del cliente, esto puede fallar si está en un bloque BEGIN/COMMIT.
-- Lo enviamos como una única sentencia si podemos
ALTER TYPE estado_pedido ADD VALUE IF NOT EXISTS 'pendiente_fecha' BEFORE 'borrador';

-- 2. Actualizar las políticas que dependen del estado
-- Los pedidos se pueden borrar en borrador o pendiente_fecha
DROP POLICY IF EXISTS "pedidos_delete_sucursal" ON pedidos;
CREATE POLICY "pedidos_delete_sucursal" ON pedidos FOR DELETE USING (
  estado IN ('borrador', 'pendiente_fecha')
  AND sucursal_id = (SELECT sucursal_id FROM users WHERE id = auth.uid())
);

-- Los pedidos se pueden actualizar si son borrador (materiales/fecha) o pendiente_fecha (solo sucursal modificando)
-- En realidad, solo dejamos que lo actualicen si quisieran cambiar de fecha, pero por simplicidad permitimos update si borrador/pendiente_fecha.
DROP POLICY IF EXISTS "pedidos_update_sucursal" ON pedidos;
CREATE POLICY "pedidos_update_sucursal" ON pedidos FOR UPDATE USING (
  estado IN ('borrador', 'pendiente_fecha')
  AND sucursal_id = (SELECT sucursal_id FROM users WHERE id = auth.uid())
) WITH CHECK (
  sucursal_id = (SELECT sucursal_id FROM users WHERE id = auth.uid())
);

-- 3. Inserción de detalles
-- Para restringir llenado de material si no es borrador.
-- Notar que no hace falta impedir INSERTS a detalle_pedido si no es borrador desde RLS explícitamente ya que
-- la app bloquea la UI, pero como seguridad extra limitamos a que el insert de pedido_detalle solo si el pedido está en borrador.
DROP POLICY IF EXISTS "detalle_insert" ON pedido_detalle;
CREATE POLICY "detalle_insert" ON pedido_detalle FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM pedidos p
    WHERE p.id = pedido_id
      AND p.estado = 'borrador'
      AND p.sucursal_id = (SELECT sucursal_id FROM users WHERE id = auth.uid())
  )
);

DROP POLICY IF EXISTS "detalle_update" ON pedido_detalle;
CREATE POLICY "detalle_update" ON pedido_detalle FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM pedidos p
    WHERE p.id = pedido_id
      AND p.estado = 'borrador'
      AND p.sucursal_id = (SELECT sucursal_id FROM users WHERE id = auth.uid())
  )
);

DROP POLICY IF EXISTS "detalle_delete" ON pedido_detalle;
CREATE POLICY "detalle_delete" ON pedido_detalle FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM pedidos p
    WHERE p.id = pedido_id
      AND p.estado = 'borrador'
      AND p.sucursal_id = (SELECT sucursal_id FROM users WHERE id = auth.uid())
  )
);
