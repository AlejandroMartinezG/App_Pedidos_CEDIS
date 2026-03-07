-- ═══════════════════════════════════════════════════
-- CEDIS Pedidos — Migration: update get_fechas_ocupadas with sucursales
-- ═══════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_fechas_ocupadas(date, date);

CREATE OR REPLACE FUNCTION get_fechas_ocupadas(p_start_date date, p_end_date date)
RETURNS TABLE (fecha_entrega date, total_kilos numeric, count_pedidos bigint, sucursales text[])
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    p.fecha_entrega,
    SUM(p.total_kilos) as total_kilos,
    COUNT(p.id) as count_pedidos,
    ARRAY_AGG(DISTINCT s.nombre) as sucursales
  FROM pedidos p
  LEFT JOIN sucursales s ON p.sucursal_id = s.id
  WHERE p.fecha_entrega >= p_start_date AND p.fecha_entrega <= p_end_date
  GROUP BY p.fecha_entrega;
$$;
