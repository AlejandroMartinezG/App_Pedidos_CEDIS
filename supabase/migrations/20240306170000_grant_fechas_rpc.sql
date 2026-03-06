-- ══════════════════════════════════════════════════════════════════════
-- PASO 1 — Agregar 'pendiente_fecha' al enum (EJECUTA ESTO SOLO, PRIMERO)
-- ══════════════════════════════════════════════════════════════════════
-- ⚠️  En PostgreSQL, ALTER TYPE ... ADD VALUE no puede ejecutarse dentro
--    de una transacción. Ejecútalo solo en el SQL Editor de Supabase,
--    espera que termine, y luego ejecuta el PASO 2 por separado.

ALTER TYPE estado_pedido ADD VALUE IF NOT EXISTS 'pendiente_fecha' BEFORE 'borrador';


-- ══════════════════════════════════════════════════════════════════════
-- PASO 2 — Políticas RLS, función y permisos (ejecuta esto después del PASO 1)
-- ══════════════════════════════════════════════════════════════════════

-- 2a. Columna tipo_entrega en pedidos (si no existe)
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS tipo_entrega text;

-- 2b. Actualizar política de borrado de sucursal (ahora incluye pendiente_fecha)
DROP POLICY IF EXISTS "pedidos_delete_sucursal" ON pedidos;
CREATE POLICY "pedidos_delete_sucursal" ON pedidos FOR DELETE USING (
  estado IN ('borrador', 'pendiente_fecha')
  AND sucursal_id = (SELECT sucursal_id FROM users WHERE id = auth.uid())
);

-- 2c. Actualizar política de actualización de sucursal
DROP POLICY IF EXISTS "pedidos_update_sucursal" ON pedidos;
CREATE POLICY "pedidos_update_sucursal" ON pedidos FOR UPDATE USING (
  estado IN ('borrador', 'pendiente_fecha')
  AND sucursal_id = (SELECT sucursal_id FROM users WHERE id = auth.uid())
) WITH CHECK (
  sucursal_id = (SELECT sucursal_id FROM users WHERE id = auth.uid())
);

-- 2d. Política de inserción de detalles solo cuando el pedido está en borrador
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

-- 2e. Función RPC para ocupación de fechas (accesible por sucursales via SECURITY DEFINER)
--     Nota: usa IN ('borrador','enviado','aprobado','impreso') en lugar de != 'pendiente_fecha'
--     para evitar problemas si se ejecuta antes de que el enum esté actualizado.
CREATE OR REPLACE FUNCTION get_fechas_ocupadas(p_start_date date, p_end_date date)
RETURNS TABLE (fecha_entrega date, total_kilos numeric, count_pedidos bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.fecha_entrega,
    COALESCE(SUM(p.total_kilos), 0) AS total_kilos,
    COUNT(*) AS count_pedidos
  FROM pedidos p
  WHERE p.fecha_entrega >= p_start_date
    AND p.fecha_entrega <= p_end_date
    AND p.estado IN ('borrador', 'enviado', 'aprobado', 'impreso')
  GROUP BY p.fecha_entrega;
$$;

-- 2f. Otorgar permiso de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION get_fechas_ocupadas(date, date) TO authenticated;
