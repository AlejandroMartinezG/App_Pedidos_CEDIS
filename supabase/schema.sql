-- ═══════════════════════════════════════════════════════════════
-- CEDIS Pedidos — Database Schema & Seed
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- 1. ENUMS
-- ─────────────────────────────────────────────
CREATE TYPE categoria_enum AS ENUM (
  'materia_prima', 'esencia', 'varios', 'envase_vacio', 'color'
);
CREATE TYPE rol_enum AS ENUM ('admin', 'sucursal');
CREATE TYPE estado_pedido AS ENUM ('borrador', 'enviado', 'aprobado', 'impreso');

-- ─────────────────────────────────────────────
-- 2. TABLES
-- ─────────────────────────────────────────────

CREATE TABLE sucursales (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text NOT NULL,
  abreviacion text UNIQUE NOT NULL,
  ciudad      text NOT NULL,
  activa      boolean NOT NULL DEFAULT true
);

CREATE TABLE users (
  id          uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  nombre      text NOT NULL,
  email       text UNIQUE NOT NULL,
  rol         rol_enum NOT NULL,
  sucursal_id uuid REFERENCES sucursales(id) ON DELETE SET NULL
);

CREATE TABLE materiales (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo           text UNIQUE,
  nombre           text NOT NULL,
  categoria        categoria_enum NOT NULL,
  unidad_base      text NOT NULL DEFAULT 'kgs',
  peso_aproximado  numeric,
  envase           text,
  orden            integer NOT NULL
);

CREATE TABLE pedidos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_pedido  text UNIQUE NOT NULL,
  sucursal_id    uuid NOT NULL REFERENCES sucursales(id),
  fecha_entrega  date NOT NULL,
  total_kilos    numeric NOT NULL DEFAULT 0,
  estado         estado_pedido NOT NULL DEFAULT 'borrador',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  enviado_at     timestamptz,
  enviado_por    uuid REFERENCES users(id)
);

CREATE TABLE pedido_detalle (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id           uuid NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  material_id         uuid NOT NULL REFERENCES materiales(id),
  cantidad_kilos      numeric,
  cantidad_solicitada numeric,
  peso_total          numeric,
  lote                text,
  peso                numeric,
  UNIQUE (pedido_id, material_id)
);

-- ─────────────────────────────────────────────
-- 3. INDEXES
-- ─────────────────────────────────────────────
CREATE INDEX idx_pedidos_sucursal  ON pedidos(sucursal_id);
CREATE INDEX idx_pedidos_estado    ON pedidos(estado);
CREATE INDEX idx_pedidos_fecha     ON pedidos(fecha_entrega);
CREATE INDEX idx_detalle_pedido    ON pedido_detalle(pedido_id);
CREATE INDEX idx_detalle_material  ON pedido_detalle(material_id);

-- ─────────────────────────────────────────────
-- 4. updated_at trigger
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pedidos_updated_at
  BEFORE UPDATE ON pedidos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────
-- 5. RPC: validate 13,000 kg limit
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION validate_pedido_limit(p_pedido_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COALESCE(total_kilos, 0) < 13000
  FROM pedidos WHERE id = p_pedido_id;
$$;

-- ─────────────────────────────────────────────
-- 6. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
ALTER TABLE sucursales    ENABLE ROW LEVEL SECURITY;
ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiales    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_detalle ENABLE ROW LEVEL SECURITY;

-- sucursales: all authenticated users can read
CREATE POLICY "sucursales_select" ON sucursales FOR SELECT USING (auth.role() = 'authenticated');

-- users: can read own row; admin reads all
CREATE POLICY "users_select" ON users FOR SELECT
  USING (id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND rol = 'admin'));
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "users_update" ON users FOR UPDATE USING (id = auth.uid());

-- materiales: authenticated read
CREATE POLICY "materiales_select" ON materiales FOR SELECT USING (auth.role() = 'authenticated');

-- pedidos: sucursal sees own; admin sees all
CREATE POLICY "pedidos_select" ON pedidos FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND rol = 'admin')
  OR sucursal_id = (SELECT sucursal_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "pedidos_insert" ON pedidos FOR INSERT WITH CHECK (
  sucursal_id = (SELECT sucursal_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "pedidos_update_sucursal" ON pedidos FOR UPDATE USING (
  estado = 'borrador'
  AND sucursal_id = (SELECT sucursal_id FROM users WHERE id = auth.uid())
) WITH CHECK (
  sucursal_id = (SELECT sucursal_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "pedidos_update_admin" ON pedidos FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND rol = 'admin')
);
CREATE POLICY "pedidos_delete_sucursal" ON pedidos FOR DELETE USING (
  estado = 'borrador'
  AND sucursal_id = (SELECT sucursal_id FROM users WHERE id = auth.uid())
);

-- pedido_detalle: follow parent pedido rules
CREATE POLICY "detalle_select" ON pedido_detalle FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pedidos p
    WHERE p.id = pedido_id AND (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND rol = 'admin')
      OR p.sucursal_id = (SELECT sucursal_id FROM users WHERE id = auth.uid())
    )
  )
);
CREATE POLICY "detalle_insert" ON pedido_detalle FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM pedidos p
    WHERE p.id = pedido_id
      AND p.estado = 'borrador'
      AND p.sucursal_id = (SELECT sucursal_id FROM users WHERE id = auth.uid())
  )
);
CREATE POLICY "detalle_update" ON pedido_detalle FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM pedidos p
    WHERE p.id = pedido_id
      AND p.estado = 'borrador'
      AND p.sucursal_id = (SELECT sucursal_id FROM users WHERE id = auth.uid())
  )
);
CREATE POLICY "detalle_delete" ON pedido_detalle FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM pedidos p
    WHERE p.id = pedido_id
      AND p.estado = 'borrador'
      AND p.sucursal_id = (SELECT sucursal_id FROM users WHERE id = auth.uid())
  )
);
CREATE POLICY "detalle_insert_admin" ON pedido_detalle FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND rol = 'admin')
);
CREATE POLICY "detalle_update_admin" ON pedido_detalle FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND rol = 'admin')
);
CREATE POLICY "detalle_delete_admin" ON pedido_detalle FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND rol = 'admin')
);

-- ─────────────────────────────────────────────
-- 7. SEED: Sucursales
-- ─────────────────────────────────────────────
INSERT INTO sucursales (nombre, abreviacion, ciudad) VALUES
  ('Pachuca I',   'PAC1', 'Pachuca'),
  ('Guadalajara', 'GDL',  'Guadalajara'),
  ('CDMX Norte',  'CDMX', 'Ciudad de México');

-- ─────────────────────────────────────────────
-- 8. SEED: Materials (168 total)
-- ─────────────────────────────────────────────

-- 8.1 Materias Primas (40)
INSERT INTO materiales (nombre, codigo, categoria, unidad_base, peso_aproximado, envase, orden) VALUES
  ('Aceite De Pino',                    'ACDEPI',   'materia_prima', 'kgs', 175,    '200lts',   1),
  ('Aceite De Silicon',                 'ACDESI',   'materia_prima', 'kgs', 18.4,   '20lts',    2),
  ('Aceite Mineral',                    'ACEMIN',   'materia_prima', 'kgs', 170,    '200lts',   3),
  ('Adbs',                              'ACIEST',   'materia_prima', 'kgs', 220,    '200lts',   4),
  ('Alcohol Etilico',                   'ACDBSL',   'materia_prima', 'Lt',  200,    '200lts',   5),
  ('Alcohol Laurico 3M',                'ALCCET',   'materia_prima', 'kgs', 46,     '50 lts',   6),
  ('Alfagin',                           'ALCETI',   'materia_prima', 'kgs', 200,    '200lts',   7),
  ('Amgin',                             NULL,       'materia_prima', 'kgs', 19.2,   '20 lts',   8),
  ('Amida De Coco',                     NULL,       'materia_prima', 'kgs', 200,    '200lts',   9),
  ('Antiespumante',                     'ALCLAU',   'materia_prima', 'kgs', 200,    '200lts',   10),
  ('Blend CHJO-22',                     'ALFAGI',   'materia_prima', 'kgs', 20.5,   '20 lts',   11),
  ('Blue Silicón',                      'AMMMO0',   'materia_prima', 'kgs', 16.56,  '20 lts',   12),
  ('Butil Cellosolve',                  'AMDECO',   'materia_prima', 'Lt',  200,    '200lts',   13),
  ('Chbx-4000',                         'AMONIA',   'materia_prima', 'kgs', 5.63,   '5 lts',    14),
  ('Chctr-360',                         'ANTIES',   'materia_prima', 'kgs', 6.2,    '4 lts',    15),
  ('Chkzr-50',                          'POLB30',   'materia_prima', 'kgs', 9.2,    '10 lts',   16),
  ('Conservador Acticide Spx',          'BASINS',   'materia_prima', 'kgs', 30,     '30lts',    17),
  ('Conservador Db20 Recuperador (LA)', 'BIDESO',   'materia_prima', 'Lt',  1,      'Botella',  18),
  ('Creolina',                          NULL,       'materia_prima', 'Lt',  200,    '200lts',   19),
  ('Edgin',                             NULL,       'materia_prima', 'kgs', 51.84,  '50 lts',   20),
  ('Emulsificante',                     NULL,       'materia_prima', 'kgs', 50,     '50 lts',   21),
  ('Formol',                            NULL,       'materia_prima', 'kgs', 50,     '50lts',    22),
  ('Gas Nafta',                         'BLECPF',   'materia_prima', 'Lt',  200,    '200lts',   23),
  ('Glicerina',                         'BLUSIL',   'materia_prima', 'kgs', 250,    '200lts',   24),
  ('Hexano',                            'BUTCEL',   'materia_prima', 'Lt',  200,    '200lts',   25),
  ('Lasgin',                            'CARBOP',   'materia_prima', 'kgs', 200,    '200lts',   26),
  ('Less',                              'CHBX-4',   'materia_prima', 'kgs', 220,    '200lts',   27),
  ('Nacarante',                         'CHCTR-',   'materia_prima', 'kgs', 160,    '200lts',   28),
  ('Nagin',                             'CHKZR-50', 'materia_prima', 'kgs', 160,    '200lts',   29),
  ('Nonil',                             'CHADPL',   'materia_prima', 'kgs', 220,    '200lts',   30),
  ('Oxagin',                            'LIFC20',   'materia_prima', 'kgs', 160,    '200lts',   31),
  ('Pasta Suavizante',                  'CITRIC',   'materia_prima', 'kgs', 150,    'Olla',     32),
  ('Peroxido',                          'CONSPX',   'materia_prima', 'kgs', 60,     '65kgs',    33),
  ('Q60',                               'RECDB2',   'materia_prima', 'kgs', 200,    '200lts',   34),
  ('Silicon',                           'CREOLI',   'materia_prima', 'kgs', 200,    '200lts',   35),
  ('Sosa Liquida',                      'EDPASA',   'materia_prima', 'kgs', 250,    '200lts',   36),
  ('Syngin',                            NULL,       'materia_prima', 'kgs', 20.56,  '20 lts',   37),
  ('T-20',                              'EMUL',     'materia_prima', 'kgs', 22,     '20 lts',   38),
  ('Trieta',                            'FORMOL',   'materia_prima', 'kgs', 22.4,   '20 lts',   39),
  ('Vaselina Solida',                   'GASNAF',   'materia_prima', 'kgs', 140,    '200lts',   40);

-- 8.2 Esencias (82)
INSERT INTO materiales (nombre, codigo, categoria, unidad_base, peso_aproximado, envase, orden) VALUES
  ('Alaska',                    NULL, 'esencia', 'kgs', 20,   '20lts',  1),
  ('Almendra',                  NULL, 'esencia', 'kgs', 20,   '20lts',  2),
  ('Aloe Vera',                 NULL, 'esencia', 'kgs', 20,   '20lts',  3),
  ('Amaderado',                 NULL, 'esencia', 'kgs', 20,   '20lts',  4),
  ('Amor',                      NULL, 'esencia', 'kgs', 5,    '5 lts',  5),
  ('Aqua Fresh',                NULL, 'esencia', 'kgs', 20,   '20lts',  6),
  ('Azahar',                    NULL, 'esencia', 'kgs', 20,   '20lts',  7),
  ('Baby',                      NULL, 'esencia', 'kgs', 20,   '20lts',  8),
  ('Bebe Fresh',                NULL, 'esencia', 'kgs', 20,   '20lts',  9),
  ('Blue Softener',             NULL, 'esencia', 'kgs', 20,   '20lts',  10),
  ('Brisas',                    NULL, 'esencia', 'kgs', 20,   '20lts',  11),
  ('Brisa Tropical',            NULL, 'esencia', 'kgs', 20,   '20lts',  12),
  ('Canela',                    NULL, 'esencia', 'kgs', 20,   '20lts',  13),
  ('Cedar Wood',                NULL, 'esencia', 'kgs', 20,   '20lts',  14),
  ('Cereza',                    NULL, 'esencia', 'kgs', 20,   '20lts',  15),
  ('Charm-24',                  NULL, 'esencia', 'kgs', 50,   '50lts',  16),
  ('Citronela',                 NULL, 'esencia', 'kgs', 20,   '20lts',  17),
  ('Citrus',                    NULL, 'esencia', 'kgs', 20,   '20lts',  18),
  ('Clavel',                    NULL, 'esencia', 'kgs', 20,   '20lts',  19),
  ('Coco',                      NULL, 'esencia', 'kgs', 20,   '20lts',  20),
  ('Cocktail',                  NULL, 'esencia', 'kgs', 20,   '20lts',  21),
  ('Cuero',                     NULL, 'esencia', 'kgs', 20,   '20lts',  22),
  ('Durazno',                   NULL, 'esencia', 'kgs', 20,   '20lts',  23),
  ('Eucalipto',                 NULL, 'esencia', 'kgs', 20,   '20lts',  24),
  ('Floral',                    NULL, 'esencia', 'kgs', 20,   '20lts',  25),
  ('Flores Blancas',            NULL, 'esencia', 'kgs', 20,   '20lts',  26),
  ('Flores Frescas',            NULL, 'esencia', 'kgs', 20,   '20lts',  27),
  ('Fresa',                     NULL, 'esencia', 'kgs', 20,   '20lts',  28),
  ('Fresia',                    NULL, 'esencia', 'kgs', 5,    '5 lts',  29),
  ('Fresh Power',               NULL, 'esencia', 'kgs', 20,   '20lts',  30),
  ('Gardenia',                  NULL, 'esencia', 'kgs', 20,   '20lts',  31),
  ('Herbal',                    NULL, 'esencia', 'kgs', 20,   '20lts',  32),
  ('Hierbas Frescas',           NULL, 'esencia', 'kgs', 20,   '20lts',  33),
  ('Jazmin',                    NULL, 'esencia', 'kgs', 20,   '20lts',  34),
  ('Lavanda Francesa',          NULL, 'esencia', 'kgs', 50,   '50lts',  35),
  ('Lavanda Inglesa',           NULL, 'esencia', 'kgs', 20,   '20lts',  36),
  ('Lemon Fresh',               NULL, 'esencia', 'kgs', 20,   '20lts',  37),
  ('Limon',                     NULL, 'esencia', 'kgs', 20,   '20lts',  38),
  ('Limon Fresco',              NULL, 'esencia', 'kgs', 20,   '20lts',  39),
  ('Lila',                      NULL, 'esencia', 'kgs', 20,   '20lts',  40),
  ('Lluvia',                    NULL, 'esencia', 'kgs', 20,   '20lts',  41),
  ('Magnolia',                  NULL, 'esencia', 'kgs', 20,   '20lts',  42),
  ('Mango',                     NULL, 'esencia', 'kgs', 20,   '20lts',  43),
  ('Manzana',                   NULL, 'esencia', 'kgs', 20,   '20lts',  44),
  ('Manzanilla',                NULL, 'esencia', 'kgs', 20,   '20lts',  45),
  ('Mar Azul',                  NULL, 'esencia', 'kgs', 20,   '20lts',  46),
  ('Marine',                    NULL, 'esencia', 'kgs', 20,   '20lts',  47),
  ('Melon',                     NULL, 'esencia', 'kgs', 20,   '20lts',  48),
  ('Menta',                     NULL, 'esencia', 'kgs', 20,   '20lts',  49),
  ('Miel',                      NULL, 'esencia', 'kgs', 20,   '20lts',  50),
  ('Mora',                      NULL, 'esencia', 'kgs', 20,   '20lts',  51),
  ('Morena',                    NULL, 'esencia', 'kgs', 20,   '20lts',  52),
  ('Muguet',                    NULL, 'esencia', 'kgs', 20,   '20lts',  53),
  ('Naranja',                   NULL, 'esencia', 'kgs', 20,   '20lts',  54),
  ('Nardo',                     NULL, 'esencia', 'kgs', 20,   '20lts',  55),
  ('Neroli',                    NULL, 'esencia', 'kgs', 20,   '20lts',  56),
  ('New Car',                   NULL, 'esencia', 'kgs', 5,    '5 lts',  57),
  ('Ocean',                     NULL, 'esencia', 'kgs', 20,   '20lts',  58),
  ('Oliva',                     NULL, 'esencia', 'kgs', 20,   '20lts',  59),
  ('Orquidea',                  NULL, 'esencia', 'kgs', 20,   '20lts',  60),
  ('Pachuli',                   NULL, 'esencia', 'kgs', 20,   '20lts',  61),
  ('Pina',                      NULL, 'esencia', 'kgs', 20,   '20lts',  62),
  ('Pino',                      NULL, 'esencia', 'kgs', 20,   '20lts',  63),
  ('Pino Suave',                NULL, 'esencia', 'kgs', 20,   '20lts',  64),
  ('Primavera',                 NULL, 'esencia', 'kgs', 20,   '20lts',  65),
  ('Rosas',                     NULL, 'esencia', 'kgs', 20,   '20lts',  66),
  ('Sandalo',                   NULL, 'esencia', 'kgs', 20,   '20lts',  67),
  ('Sandía',                    NULL, 'esencia', 'kgs', 20,   '20lts',  68),
  ('Spring',                    NULL, 'esencia', 'kgs', 1.95, '4 Lts',  69),
  ('Suavitel Original',         NULL, 'esencia', 'kgs', 20,   '20lts',  70),
  ('Suavitel Primavera',        NULL, 'esencia', 'kgs', 20,   '20lts',  71),
  ('Talco',                     NULL, 'esencia', 'kgs', 20,   '20lts',  72),
  ('Tp Azul',                   NULL, 'esencia', 'kgs', 20,   '20lts',  73),
  ('Tropical Breeze',           NULL, 'esencia', 'kgs', 20,   '20lts',  74),
  ('Uva',                       NULL, 'esencia', 'kgs', 20,   '20lts',  75),
  ('Vainilla',                  NULL, 'esencia', 'kgs', 20,   '20lts',  76),
  ('Verde',                     NULL, 'esencia', 'kgs', 20,   '20lts',  77),
  ('Violeta',                   NULL, 'esencia', 'kgs', 20,   '20lts',  78),
  ('White Musk',                NULL, 'esencia', 'kgs', 20,   '20lts',  79),
  ('Yuzu',                      NULL, 'esencia', 'kgs', 20,   '20lts',  80),
  ('Zarzamora',                 NULL, 'esencia', 'kgs', 20,   '20lts',  81),
  ('Zucchini',                  NULL, 'esencia', 'kgs', 20,   '20lts',  82);

-- 8.3 Varios (21)
INSERT INTO materiales (nombre, codigo, categoria, unidad_base, peso_aproximado, envase, orden) VALUES
  ('Amonaco',               NULL, 'varios', 'kgs',  20,   '20lts',        1),
  ('Antiginscal',           NULL, 'varios', 'kgs',  20,   '20lts',        2),
  ('Alcohol Cetilico',      NULL, 'varios', 'kgs',  25,   '25kgs',        3),
  ('Base Insecticida',      NULL, 'varios', 'kgs',  10,   '10lts',        4),
  ('Citrico',               NULL, 'varios', 'kgs',  25,   '25kgs',        5),
  ('Gyrgen',                NULL, 'varios', 'kgs',  24,   '24 lts',       6),
  ('Jarras',                NULL, 'varios', 'Pzas', NULL, NULL,           7),
  ('Optgin',                NULL, 'varios', 'Pzas', NULL, NULL,           8),
  ('Past. Tikilín 1"',      NULL, 'varios', 'kgs',  100,  'Caja',         9),
  ('Pesalejías',            NULL, 'varios', 'Pzas', NULL, NULL,           10),
  ('Probetas',              NULL, 'varios', 'Pzas', NULL, NULL,           11),
  ('Rollos de Ticket',      NULL, 'varios', 'Pzas', NULL, NULL,           12),
  ('Sal Industrial',        NULL, 'varios', 'kgs',  50,   'Costal 50kgs', 13),
  ('Sebo Destilado',        NULL, 'varios', 'kgs',  200,  '200lts',       14),
  ('Silica Gel',            NULL, 'varios', 'kgs',  25,   '25kgs',        15),
  ('Tiras pH',              NULL, 'varios', 'Pzas', NULL, NULL,           16),
  ('Tinopal CBS-X',         NULL, 'varios', 'kgs',  25,   '25kgs',        17),
  ('Tripolifosfato',        NULL, 'varios', 'kgs',  25,   '25kgs',        18),
  ('Urea',                  NULL, 'varios', 'kgs',  50,   'Costal 50kgs', 19),
  ('Zeolita',               NULL, 'varios', 'kgs',  25,   '25kgs',        20),
  ('Zeolita Cargada',       NULL, 'varios', 'kgs',  25,   '25kgs',        21);

-- 8.4 Envases Vacíos (14)
INSERT INTO materiales (nombre, codigo, categoria, unidad_base, peso_aproximado, envase, orden) VALUES
  ('Botella nueva de 1 Lt',         NULL, 'envase_vacio', 'Paquete', 3,    'Paquete 150 Pzas', 1),
  ('Contenedor de 1,000 Lts',       NULL, 'envase_vacio', 'Pzas',    70,   NULL,               2),
  ('Tambo De Plastico 200 Lts Abierto', NULL, 'envase_vacio', 'Pzas', 10,  NULL,               3),
  ('Tambo De Plastico 200 Lts Cerrado', NULL, 'envase_vacio', 'Pzas', 10,  NULL,               4),
  ('Tambo De Metal 200 Lts',        NULL, 'envase_vacio', 'Pzas',    20,   NULL,               5),
  ('Garrafon 10 Lts c/Tapa',        NULL, 'envase_vacio', 'Paquete', 2,    'Paquete 24 Pzas',  6),
  ('Garrafon 20 Lts c/Tapa',        NULL, 'envase_vacio', 'Paquete', 3,    'Paquete 12 Pzas',  7),
  ('Cubeta Blanca 19 Lts Tapa',     NULL, 'envase_vacio', 'Paquete', 2.5,  'Paquete 20 Pzas',  8),
  ('Cubeta Blanca 19 Lts Sin Tapa', NULL, 'envase_vacio', 'Paquete', 2,    'Paquete 20 Pzas',  9),
  ('Cubeta Amarilla 19 Lts',        NULL, 'envase_vacio', 'Paquete', 2,    'Paquete 20 Pzas',  10),
  ('Bolsa Polietileno 10kg',        NULL, 'envase_vacio', 'Paquete', 1,    'Paquete 200 Pzas', 11),
  ('Caja Carton Suavizante 1L',     NULL, 'envase_vacio', 'Piezas',  3,    'Caja 12 Pzas',     12),
  ('Caja Carton Detergente 1kg',    NULL, 'envase_vacio', 'Piezas',  3,    'Caja 12 Pzas',     13),
  ('Tapa Garrafon 20 Lts',          NULL, 'envase_vacio', 'Paquete', 0.5,  'Paquete 50 Pzas',  14);

-- 8.5 Colores (11)
INSERT INTO materiales (nombre, codigo, categoria, unidad_base, peso_aproximado, envase, orden) VALUES
  ('Amarillo Fluoresc.',  NULL, 'color', 'kgs',  20,  '20lts',  1),
  ('Amarillo Huevo',      NULL, 'color', 'kgs',  20,  '20lts',  2),
  ('Azul',                NULL, 'color', 'kgs',  20,  '20lts',  3),
  ('Azul Brillante',      NULL, 'color', 'kgs',  20,  '20lts',  4),
  ('Azul Marino',         NULL, 'color', 'kgs',  20,  '20lts',  5),
  ('Color Morado',        NULL, 'color', 'lts',  20,  '20lts',  6),
  ('Naranja',             NULL, 'color', 'kgs',  20,  '20lts',  7),
  ('Pigmento Rojo',       NULL, 'color', 'lts',  20,  '20lts',  8),
  ('Rosa',                NULL, 'color', 'kgs',  20,  '20lts',  9),
  ('Rojo',                NULL, 'color', 'kgs',  20,  '20lts',  10),
  ('Verde',               NULL, 'color', 'kgs',  20,  '20lts',  11);
