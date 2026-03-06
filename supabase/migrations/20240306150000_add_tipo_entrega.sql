-- Agrega columna tipo_entrega a la tabla pedidos si no existe
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS tipo_entrega text;
