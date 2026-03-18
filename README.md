# 📦 Sistema de Gestión Comercial y Pedidos CEDIS - Cloro de Hidalgo

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

Ecosistema digital de alto rendimiento diseñado para centralizar, automatizar y optimizar la logística entre las sucursales de **Cloro de Hidalgo** y su Centro de Distribución (CEDIS). Esta plataforma cubre desde la planificación de demanda hasta la liquidación de nómina de transporte pesado.

---

## 🚀 1. Acceso y Seguridad (Branding Corporativo)
El sistema implementa una interfaz de vanguardia con **Glassmorphism**, garantizando una experiencia visual premium desde el primer contacto.

| Vista de Acceso | Descripción |
| :--- | :--- |
| ![Login Page](./public/readme_img/loggin_pagina.png) | **Seguridad Robusta**: Autenticación gestionada por Supabase Auth con niveles de acceso diferenciados por roles (`Admin`, `Branch`, `SuperAdmin`). |

---

## 📊 2. Panel de Control (Dashboards)
Interfaces personalizadas según el perfil del usuario, proporcionando KPIs relevantes y acceso rápido a las funciones críticas.

![Dashboard Sucursal](./public/readme_img/dashnoard_sucursal.png)
*Resumen de actividad, estatus de pedidos recientes y accesos directos operativos.*

---

## 📅 3. Gestión de Fechas y Suministro
Para una logística eficiente, el sistema coordina las entregas mediante un flujo de solicitud y aprobación de fechas tentativas.

| Paso 1: Solicitud | Paso 2: Calendario Admin | Paso 3: Aprobación |
| :---: | :---: | :---: |
| ![Solicitud Fecha](./public/readme_img/solicitar_fecha.png) | ![Calendario](./public/readme_img/calendario.png) | ![Aprobación](./public/readme_img/fecha_aprobacion_cedis.png) |
| La sucursal propone una fecha de recepción. | El CEDIS visualiza la carga diaria en un calendario interactivo. | El Admin valida o reprograma la cita logística. |

---

## 🛒 4. Ciclo de Vida del Pedido (Sucursal)
Un flujo intuitivo diseñado para minimizar errores operativos y optimizar la carga de las unidades.

### A. Configuración y Selección
Las sucursales seleccionan productos con visualización en tiempo real de pesos y unidades.
![Ingreso Pedido](./public/readme_img/ingreso_pedido_sucursal.png)

### B. Inteligencia Logística
- **Control de Peso**: Alerta visual cuando se excede la capacidad de la unidad (Tonelaje limitado).
- **Tipo de Entrega**: Configuración del transporte (Envío CEDIS, Recolección en Sucursal, Externo).

| Alerta de Peso | Tipo de Entrega | Ventana de Revisión |
| :---: | :---: | :---: |
| ![Peso](./public/readme_img/alerta_exceso_peso.png) | ![Entrega](./public/readme_img/selec_tipo_entrega.png) | ![Pedido](./public/readme_img/ventana_pedido.png) |

---

## 🏭 5. Operatividad y Despacho (CEDIS)
Gestión completa del almacén central para el surtido y expedición física de los materiales.

### Flujo de Surtido:
1.  **Recepción**: El CEDIS recibe la notificación del pedido enviado.
2.  **Puesta en Piso**: Preparación física de la mercancía en el área de carga.
3.  **Expedición**: Salida de la unidad y actualización automática de inventarios.

![Operativa CEDIS](./public/readme_img/recepcion_y_aprobacion_cedis.png)
*Gestión integral del flujo de aprobación y despacho.*

---

## 🚚 6. Logística y Confirmación
Trazabilidad total del producto hasta que llega a las manos de la sucursal solicitante.

![Logística](./public/readme_img/puesta_en_piso.png) | ![Confirmación](./public/readme_img/confirmar_recepcion_sucursal.png)
--- | ---
**Puesta en Piso**: Indicador visual de producto listo para carga. | **Recepción**: La sucursal confirma la llegada conforme del pedido.

---

## 💰 7. Módulo de Nómina e Imprimibles
Generación de documentación legal y operativa necesaria para la gestión administrativa.

### Módulo Hino (Transporte Pesado)
Generador de archivos especializados para la liquidación de nómina de operadores de flota pesada.
![Generador Nómina](./public/readme_img/generador_reportes_nomina.png)

### Formatos de Surtido
Visualización y descarga de PDFs dinámicos divididos por categorías (Materias Primas, Envases, etc.) para facilitar el trabajo del personal de almacén.
![Visualizar PDF](./public/readme_img/visualizar_archivo_imprimible.png)

---

## 📚 8. Recursos Adicionales
- **Catálogo de Materiales**: Gestión centralizada de insumos y unidades.
- **Historial**: Auditoría detallada de todos los movimientos por sucursal.

![Catálogo](./public/readme_img/catalogo_mp.png) | ![Historial](./public/readme_img/historial_sucursal.png)
--- | ---

---

## 🛠️ Stack Tecnológico
- **Frontend**: React 18, React Router 6, Vite, Tailwind CSS.
- **Backend & DB**: Supabase, PostgreSQL.
- **Seguridad**: Row Level Security (RLS) policies.
- **UI/UX**: Lucide Icons, Framer Motion, Glassmorphism CSS Tech.

---

## ⚙️ Instalación Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/AlejandroMartinezG/App_Pedidos_CEDIS.git

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno (.env)
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_llave_anon_de_supabase

# 4. Iniciar desarrollo
npm run dev
```

---
*Este proyecto es propiedad de Cloro de Hidalgo y está destinado exclusivamente a la gestión operativa interna de la red CEDIS.*
