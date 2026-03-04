# Sistema Web de Gestión de Pedidos CEDIS — Plan Técnico Mejorado

## 1. Objetivo

Desarrollar una aplicación web que sustituya el formato Excel **FT-DOP-SUC-PED-04-00**, digitalizando la captura (Hoja 1) y la generación del formato imprimible (Hoja 2), manteniendo exactamente la misma estructura de materiales, categorías y columnas del archivo original.

---

## 2. Stack Tecnológico

- **Frontend:** React + TypeScript + Tailwind CSS + shadcn/ui + lucide-react
- **Backend / BaaS:** Supabase (Auth + PostgreSQL + Row Level Security + Storage)
- **PDF:** Librería de generación en cliente (ej. react-pdf, jsPDF o html2pdf)
- **Hosting:** Vercel / Netlify (estáticos) — o Supabase Edge Functions si se requiere lógica servidor

---

## 3. Roles del Sistema

### 3.1 Administradora

- Visualiza todos los pedidos de todas las sucursales.
- Filtra por sucursal, rango de fechas y estado.
- Genera vista imprimible (Hoja 2) con layout de 3 columnas.
- Cambia estatus del pedido (enviado → aprobado → impreso).
- Exporta a PDF.
- Gestión de catálogo de materiales (alta, baja, edición — opcional fase 2).
- Gestión de sucursales y usuarios.

### 3.2 Sucursal

- Crea un pedido nuevo (precargado con el catálogo completo).
- Captura campos editables según categoría (ver sección 7).
- Selecciona fecha de entrega (obligatoria).
- Visualiza subtotales por categoría y total general en tiempo real.
- Guarda como borrador o envía.
- Consulta histórico de pedidos propios.

---

## 4. Reglas de Negocio

| Regla | Detalle |
|---|---|
| Límite por pedido | **13,000 kg** máximo. Bloquear envío si se excede. |
| Fecha de entrega | Obligatoria. No permitir enviar sin ella. Solo fechas futuras. |
| Código automático | `[ABREVIACION_SUCURSAL]-[YYYYMMDD]` → ej. `GDL-20260415` |
| Unicidad de código | Un solo pedido por sucursal por fecha de entrega (o agregar sufijo incremental si se permite más de uno). |
| Estado inicial | Todo pedido inicia como `borrador`. |
| Transiciones de estado | `borrador` → `enviado` → `aprobado` → `impreso`. Solo avance, no retroceso (excepto admin que puede regresar a `enviado`). |
| Edición post-envío | Un pedido `enviado` no puede ser editado por la sucursal. Solo la admin puede cambiar estado. |
| Materiales con cantidad 0 | Se mantienen en Hoja 1 (captura) pero se **excluyen** de Hoja 2 (impresión). |

---

## 5. Modelo de Base de Datos

### 5.1 Tabla: `sucursales`

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid (PK) | |
| nombre | text | Ej. "Pachuca I" |
| abreviacion | text (unique) | Ej. "PAC1" — usado en código de pedido |
| ciudad | text | |
| activa | boolean | Default true. Permite desactivar sin borrar. |

### 5.2 Tabla: `users`

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid (PK) | Vinculado a `auth.users` de Supabase |
| nombre | text | |
| email | text (unique) | |
| rol | enum('admin','sucursal') | |
| sucursal_id | uuid (FK → sucursales) | NULL si rol = admin |

### 5.3 Tabla: `materiales`

> **⚠ CAMBIO CRÍTICO vs. plan original:** el Excel contiene columnas de referencia por material (`codigo`, `unidad_base`, `peso_aproximado`, `envase`) que son datos fijos de catálogo y **no deben ser capturados por la sucursal** sino precargados. Además, la categoría `envase_vacio` tiene una estructura de columnas diferente.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid (PK) | |
| codigo | text (unique, nullable) | Código interno (col A del Excel): ACDEPI, ACDESI, etc. No todos los materiales lo tienen. |
| nombre | text | Nombre exacto del Excel. No modificar. |
| categoria | enum | `materia_prima`, `esencia`, `varios`, `envase_vacio`, `color` |
| unidad_base | text | "kgs", "Lt", "Pzas", "Paquete" — viene del Excel col D/K |
| peso_aproximado | numeric (nullable) | Peso por unidad de envase (col F/M del Excel). Referencia, no editable. |
| envase | text (nullable) | Tipo de presentación: "200lts", "20lts", "Bulto", "Paquete 150 Pzas", etc. (col G/N del Excel) |
| orden | integer | Orden de despliegue dentro de su categoría. Preserva el orden del Excel. |

### 5.4 Tabla: `pedidos`

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid (PK) | |
| codigo_pedido | text (unique) | Generado: `[ABREV]-[YYYYMMDD]` |
| sucursal_id | uuid (FK → sucursales) | |
| fecha_entrega | date | |
| total_kilos | numeric | Calculado al guardar/enviar |
| estado | enum | `borrador`, `enviado`, `aprobado`, `impreso` |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| enviado_at | timestamptz (nullable) | Momento en que se envió |
| enviado_por | uuid (FK → users, nullable) | |

### 5.5 Tabla: `pedido_detalle`

> **⚠ CAMBIO CRÍTICO:** Para `envase_vacio` las columnas editables son distintas. El campo `cantidad_kilos` en envases NO aplica igual. En su lugar el Excel usa `Peso Uni` (dato fijo del catálogo) × `Cantidad Solicitada` = `Peso Total`. Esto se resuelve calculando `peso_total` como campo derivado.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid (PK) | |
| pedido_id | uuid (FK → pedidos) | |
| material_id | uuid (FK → materiales) | |
| cantidad_kilos | numeric | Editable por sucursal en todas las categorías excepto `envase_vacio` donde es NULL |
| cantidad_solicitada | numeric (nullable) | Editable por sucursal |
| peso_total | numeric (nullable) | Solo para `envase_vacio`: se calcula como `material.peso_aproximado × cantidad_solicitada`. Se puede almacenar o calcular en frontend. |
| lote | text (nullable) | Lo llena la administradora en Hoja 2 |
| peso | numeric (nullable) | Lo llena la administradora en Hoja 2 |

### 5.6 Índices recomendados

```sql
CREATE INDEX idx_pedidos_sucursal ON pedidos(sucursal_id);
CREATE INDEX idx_pedidos_estado ON pedidos(estado);
CREATE INDEX idx_pedidos_fecha ON pedidos(fecha_entrega);
CREATE INDEX idx_detalle_pedido ON pedido_detalle(pedido_id);
CREATE INDEX idx_detalle_material ON pedido_detalle(material_id);
```

### 5.7 Row Level Security (Supabase)

```sql
-- Sucursales solo ven sus pedidos
CREATE POLICY "sucursal_select" ON pedidos
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM users WHERE rol = 'admin')
    OR sucursal_id = (SELECT sucursal_id FROM users WHERE id = auth.uid())
  );

-- Sucursales solo insertan pedidos de su sucursal
CREATE POLICY "sucursal_insert" ON pedidos
  FOR INSERT WITH CHECK (
    sucursal_id = (SELECT sucursal_id FROM users WHERE id = auth.uid())
  );

-- Solo admin cambia estado
CREATE POLICY "admin_update_estado" ON pedidos
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM users WHERE rol = 'admin')
  );
```

---

## 6. Catálogo Base — Seed de Materiales

> ⚠ Se debe insertar **exactamente** con los nombres, orden y datos de referencia del Excel. A continuación el catálogo completo con los campos adicionales detectados.

### 6.1 Materias Primas

| # | Código | Material | Unidad | Peso Aprox. | Envase |
|---|---|---|---|---|---|
| 1 | ACDEPI | Aceite De Pino | kgs | 175 | 200lts |
| 2 | ACDESI | Aceite De Silicon | kgs | 18.4 | 20lts |
| 3 | ACEMIN | Aceite Mineral | kgs | 170 | 200lts |
| 4 | ACIEST | Adbs | kgs | 220 | 200lts |
| 5 | ACDBSL | Alcohol Etilico | Lt | 200 | 200lts |
| 6 | ALCCET | Alcohol Laurico 3M | kgs | 46 | 50 lts |
| 7 | ALCETI | Alfagin | kgs | 200 | 200lts |
| 8 | — | Amgin | kgs | 19.2 | 20 lts |
| 9 | — | Amida De Coco | kgs | 200 | 200lts |
| 10 | ALCLAU | Antiespumante | kgs | 200 | 200lts |
| 11 | ALFAGI | Blend CHJO-22 | kgs | 20.5 | 20 lts |
| 12 | AMMMO0 | Blue Silicón | kgs | 16.56 | 20 lts |
| 13 | AMDECO | Butil Cellosolve | Lt | 200 | 200lts |
| 14 | AMONIA | Chbx-4000 | kgs | 5.63 | 5 lts |
| 15 | ANTIES | Chctr-360 | kgs | 6.2 | 4 lts |
| 16 | POLB30 | Chkzr-50 | kgs | 9.2 | 10 lts |
| 17 | BASINS | Conservador Acticide Spx | kgs | 30 | 30lts |
| 18 | BIDESO | Conservador Db20 Recuperador (LA) | Lt | 1 | Botella |
| 19 | — | Creolina | Lt | 200 | 200lts |
| 20 | — | Edgin | kgs | 51.84 | 50 lts |
| 21 | — | Emulsificante | kgs | 50 | 50 lts |
| 22 | — | Formol | kgs | 50 | 50lts |
| 23 | BLECPF | Gas Nafta | Lt | 200 | 200lts |
| 24 | BLUSIL | Glicerina | kgs | 250 | 200lts |
| 25 | BUTCEL | Hexano | Lt | 200 | 200lts |
| 26 | CARBOP | Lasgin | kgs | 200 | 200lts |
| 27 | CHBX-4 | Less | kgs | 220 | 200lts |
| 28 | CHCTR- | Nacarante | kgs | 160 | 200lts |
| 29 | CHKZR-50 | Nagin | kgs | 160 | 200lts |
| 30 | CHADPL | Nonil | kgs | 220 | 200lts |
| 31 | LIFC20 | Oxagin | kgs | 160 | 200lts |
| 32 | CITRIC | Pasta Suavizante | kgs | 150 | Olla |
| 33 | CONSPX | Peroxido | kgs | 60 | 65kgs |
| 34 | RECDB2 | Q60 | kgs | 200 | 200lts |
| 35 | CREOLI | Silicon | kgs | 200 | 200lts |
| 36 | EDPASA | Sosa Liquida | kgs | 250 | 200lts |
| 37 | — | Syngin | kgs | 20.56 | 20 lts |
| 38 | EMUL | T-20 | kgs | 22 | 20 lts |
| 39 | FORMOL | Trieta | kgs | 22.4 | 20 lts |
| 40 | GASNAF | Vaselina Solida | kgs | 140 | 200lts |

### 6.2 Esencias

(Se conserva la lista completa de 82 esencias del plan original — sin cambios de nombres.)

Datos adicionales por esencia detectados en el Excel: cada esencia tiene `unidad_base = "kgs"`, `peso_aproximado` (variable: 1.95–50 kgs) y `envase` (variable: "4 Lts", "5 lts", "10 lts", "20lts", "50lts"). Estos datos deben incluirse en el seed.

### 6.3 Varios

(Se conserva la lista de 21 ítems del plan original.)

> **Nota:** Algunos ítems de "Varios" tienen `unidad_base = "Pzas"` (Optgin, Tiras pH, Jarras, Probetas, Pesalejías, Rollos de Ticket). El sistema debe respetar la unidad original de cada material.

### 6.4 Envases Vacíos

> **⚠ DIFERENCIA ESTRUCTURAL:** Esta categoría NO usa "Cantidad Kilos". Sus columnas son:
> - Material (solo lectura)
> - Peso Uni (dato fijo del catálogo, solo lectura)
> - Unidad (solo lectura)
> - Cantidad Solicitada (editable)
> - Presentación (dato fijo, solo lectura)
> - Peso Total (calculado = Peso Uni × Cantidad Solicitada)

Lista de 14 envases (sin cambios vs plan original).

### 6.5 Colores

(Se conserva la lista de 11 colores del plan original.)

> **Nota:** Algunos colores tienen `unidad_base = "lts"` en lugar de "kgs" (Color Morado, Pigmento Rojo). El seed debe respetar esto.

---

## 7. Estructura de Columnas por Categoría (Hoja 1 — Captura Sucursal)

> **⚠ MEJORA CRÍTICA:** El plan original trataba todas las categorías con las mismas columnas. El Excel muestra que **Envases Vacíos** tiene una estructura diferente. Además, hay columnas de referencia (no editables) que ayudan al usuario.

### 7.1 Materias Primas / Esencias / Colores

| Columna | Editable | Tipo |
|---|---|---|
| Material | No | Texto |
| Cantidad Kilos | **Sí** | Numérico |
| Unidad | No | Texto (del catálogo) |
| Cantidad Solicitada | **Sí** | Numérico entero |
| Peso Aproximado | No | Numérico (del catálogo, referencia) |
| Envase | No | Texto (del catálogo, referencia) |

### 7.2 Varios

Misma estructura que 7.1 (pero ojo con unidades "Pzas" en algunos ítems).

### 7.3 Envases Vacíos (estructura diferente)

| Columna | Editable | Tipo |
|---|---|---|
| Material | No | Texto |
| Peso Uni | No | Numérico (del catálogo) |
| Unidad | No | Texto (del catálogo) |
| Cantidad Solicitada | **Sí** | Numérico entero |
| Presentación | No | Texto (del catálogo) |
| Peso Total | No | Calculado (Peso Uni × Cant. Solicitada) |

### 7.4 Comportamiento general

- Mostrar una tabla por categoría con encabezado visual (Materias Primas, Esencias, Varios, Envases Vacíos, Colores).
- Cada tabla precargada con TODOS los materiales de esa categoría.
- Subtotal de kilos por categoría (visible al pie de cada tabla).
- **Total general fijo en pantalla** (sticky/floating) con barra de progreso visual hacia el límite de 13,000 kg.
- Indicador de color: verde (< 10,000), amarillo (10,000–12,999), rojo (≥ 13,000 — bloquear envío).
- **Resumen por categoría** al final (como el Excel filas 101–107):

```
Materias Primas:  10,820.60 kg
Varios:              404.00 kg
Esencias:          1,287.72 kg
Colores:             160.00 kg
Envases:               0.00 kg
─────────────────────────────
TOTAL:            12,672.32 kg
```

---

## 8. Vista Imprimible — Hoja 2 (Administradora)

### 8.1 Layout

> **⚠ MEJORA:** El plan original no especifica el layout. El Excel muestra un diseño de **3 columnas** para aprovechar el ancho de una hoja apaisada (landscape).

- Orientación: **Horizontal (landscape)**.
- 3 bloques lado a lado, cada uno con su encabezado de categoría.
- Solo mostrar materiales con `cantidad_kilos > 0` (o `cantidad_solicitada > 0` para envases).

### 8.2 Encabezado (repetido en cada bloque)

```
Formato Pedido Sucursal    [NOMBRE_SUCURSAL]    TONELADAS [TOTAL_TONELADAS]
FOLIO: [CODIGO_PEDIDO]
Fecha de entrega: [FECHA]
```

### 8.3 Columnas por bloque

**Materias Primas / Esencias / Varios / Colores:**

| Material | Cantidad Kilos | Cantidad Solicitada | LOTE | PESO |

**Envases Vacíos:**

| Material | Peso Uni | Cantidad Solicitada | Presentación | Peso Total |

### 8.4 Distribución sugerida en las 3 columnas

- **Columna 1:** Materias Primas
- **Columna 2:** Varios + Envases Vacíos
- **Columna 3:** Esencias + Colores

(Ajustar según cantidad de materiales con datos > 0.)

### 8.5 Campos LOTE y PESO

- Inicialmente vacíos.
- La administradora puede capturarlos en pantalla antes de imprimir (opcional: fase 2).
- Se incluyen en el PDF como celdas vacías para llenado manual.

---

## 9. Seguridad

- **Autenticación:** Supabase Auth (email/password). Opcionalmente magic link.
- **RLS:** Ver sección 5.7.
- **Roles:** Verificar rol en cada ruta del frontend y en las policies de Supabase.
- **Validación servidor:** Verificar límite de 13,000 kg también en una función de Supabase (no confiar solo en frontend).
- **Auditoría:** Registrar `enviado_at`, `enviado_por` para trazabilidad.

---

## 10. UX / Mejoras Funcionales Sugeridas

| Mejora | Descripción |
|---|---|
| Auto-guardado borrador | Guardar automáticamente cada 30s mientras se captura. |
| Búsqueda rápida | Input de búsqueda para filtrar materiales dentro de cada tabla. |
| Favoritos / frecuentes | Marcar materiales usados frecuentemente para mostrarlos primero (fase 2). |
| Duplicar pedido anterior | Permitir crear un pedido nuevo basado en el último enviado (copiar cantidades). |
| Notificaciones | Notificar a la admin cuando una sucursal envía un pedido (email o in-app). |
| Responsive | Diseño mobile-friendly para captura desde tablet en sucursal. |
| Exportar a Excel | Además de PDF, permitir exportar Hoja 2 a Excel para compatibilidad. |
| Validación de campo | Campos numéricos: no negativos, no texto, máximo razonable por material. |
| Confirmación de envío | Modal de confirmación antes de enviar ("¿Estás segura? Una vez enviado no podrás editar."). |

---

## 11. Seed Script (estructura sugerida)

```sql
-- Ejemplo para materias primas (los 40 materiales con datos del Excel)
INSERT INTO materiales (nombre, codigo, categoria, unidad_base, peso_aproximado, envase, orden)
VALUES
  ('Aceite De Pino', 'ACDEPI', 'materia_prima', 'kgs', 175, '200lts', 1),
  ('Aceite De Silicon', 'ACDESI', 'materia_prima', 'kgs', 18.4, '20lts', 2),
  -- ... etc para los 168 materiales totales
;
```

> Se recomienda generar un archivo `seed.sql` completo con TODOS los materiales extraídos directamente del Excel para evitar errores de transcripción.

---

## 12. Resumen de Cambios vs. Plan Original

| # | Aspecto | Plan Original | Plan Mejorado |
|---|---|---|---|
| 1 | Campos en `materiales` | Solo nombre, categoría, unidad_base | + `codigo`, `peso_aproximado`, `envase`, `orden` |
| 2 | Estructura Envases Vacíos | Misma que otras categorías | Columnas diferentes (Peso Uni, Presentación, Peso Total calculado) |
| 3 | Columnas de referencia en Hoja 1 | Solo Material + Cant. Kilos + Cant. Solicitada | + Unidad, Peso Aproximado, Envase (solo lectura) |
| 4 | Layout Hoja 2 | No especificado | 3 columnas landscape como el Excel original |
| 5 | Resumen por categoría | No mencionado | Tabla resumen al pie con subtotales |
| 6 | Validación servidor | Solo frontend | + Función Supabase para validar límite |
| 7 | Unicidad de pedido | No definida | Un pedido por sucursal por fecha (o sufijo incremental) |
| 8 | Campos de auditoría | Solo created_at | + updated_at, enviado_at, enviado_por |
| 9 | Transiciones de estado | No definidas | borrador → enviado → aprobado → impreso (con restricciones) |
| 10 | Unidades variables | Asumía todo en kgs | Respetar unidades del Excel (kgs, Lt, Pzas, Paquete) |
| 11 | Códigos de material | No incluidos | Códigos del Excel (col A) incluidos como campo |
| 12 | Auto-guardado | No mencionado | Auto-save de borrador cada 30s |

---

## 13. Entregables

1. Aplicación web funcional (React + TypeScript + Tailwind + shadcn/ui).
2. Base de datos PostgreSQL en Supabase con RLS configurado.
3. Script de seed completo con los 168 materiales extraídos del Excel.
4. Sistema de autenticación y roles operativo.
5. Vista de captura (Hoja 1) con estructura correcta por categoría.
6. Vista imprimible (Hoja 2) con layout de 3 columnas landscape.
7. Exportación a PDF.
8. Documentación de API y esquema de base de datos.

---

Fin del documento.
