-- RPC para que las sucursales puedan ver la ocupación por fechas sin romper RLS
CREATE OR REPLACE FUNCTION get_fechas_ocupadas(p_start_date date, p_end_date date)
RETURNS TABLE (fecha_entrega date, total_kilos numeric, count_pedidos bigint)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    fecha_entrega,
    SUM(total_kilos) as total_kilos,
    COUNT(*) as count_pedidos
  FROM pedidos
  WHERE fecha_entrega >= p_start_date AND fecha_entrega <= p_end_date
  GROUP BY fecha_entrega;
$$;
