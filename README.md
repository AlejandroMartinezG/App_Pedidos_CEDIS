# 📦 Sistema de Gestión Comercial y Pedidos CEDIS

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

Un sistema web centralizado diseñado para la optimización logística entre sucursales y el Centro de Distribución (CEDIS). Esta aplicación permite a las diferentes sucursales solicitar inventario (Materias Primas, Envases, Colores, etc.) mediante un carrito de pedidos interactivo con cálculos de peso automáticos y un sistema integral de control de estados dirigido por un administrador.

## ✨ Características Principales

* 🔒 **Autenticación Basada en Roles:** 
  * Acceso seguro manejado por **Supabase Auth**.
  * Diferentes flujos de trabajo según el rol: `Admin` (Supervisores del CEDIS) y `Sucursal` (Operadores de almacén).
* 🛒 **Calculadora Dinámica de Pedidos:** Suma dinámica del peso (en Kilos y Toneladas) en tiempo real, ayudando a controlar la capacidad de carga de los envíos.
* 📝 **Gestión de Borradores y Flujo de Estados:** Las sucursales pueden iniciar pedidos, guardarlos localmente en la nube de forma segura y retomarlos más tarde antes de hacer un envío definitivo al almacén central. Los administradores pueden visualizar, editar, aprobar e imprimir los estados.
* 🛠️ **Panel de Administración (Dashboard):** Panel enriquecido con KPIs globales de logística, revisión de pedidos entrantes, gestión completa de sucursales subyacentes y control para agregar/deshabilitar nuevos usuarios.
* 📄 **Motor de Formatos Imprimibles (PDF):** Generación automática del "Formato de Surtido", dividiendo la solicitud en un formato especializado donde cada categoría (Materias Primas, Varios, Envases) se imprime por separado en hojas distintas, ideal para coordinar la captura y despacho físico entre los operativos del almacén.

## 🚀 Tecnologías y Arquitectura

* **Frontend:** React 18, React Router DOM, Tailwind CSS para estilos modernos y responsivos, y Lucide React para la iconografía de interfaz.
* **Build Tool:** Vite para compilación y un entorno de desarrollo HMR ultrarrápido.
* **Backend y Base de Datos:** Supabase y PostgreSQL. Implementación de **Row Level Security (RLS)** estricto en la base de datos para restringir acciones y prevenir que una sucursal vea pedidos ajenos o intercepte tráfico indeseado.
* **Despliegue:** Optimizado como una SPA lista para hospedarse en Vercel, Netlify, u otro host estático.

## ⚙️ Estructura de Base de Datos (Supabase RLS)
La plataforma utiliza modelos relacionales para el resguardo de información:
- `users`: Extensión a `auth.users` ligada a permisos de sucursal.
- `sucursales`: Catálogo de ubicaciones administradas del lado del cliente.
- `materiales`: Catálogo de insumos categorizados por tipo y unidad de medida.
- `pedidos`: Cabeceras de control general (`borrador`, `enviado`, `aprobado`, `impreso`).
- `pedido_detalle`: Partidas individuales de cada insumo calculado algorítmicamente.

## 📦 Instalación y Uso Local

Asegúrate de tener [Node.js](https://nodejs.org/) instalado para poder clonar el proyecto en tu entorno.

```bash
# 1. Clonar el repositorio
git clone https://github.com/AlejandroMartinezG/App_Pedidos_CEDIS.git

# 2. Acceder al directorio e instalar todas las dependencias
cd App_Pedidos_CEDIS
npm install

# 3. Configurar variables de entorno (crear un archivo .env en la raíz)
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_llave_anon_de_supabase

# 4. Iniciar el servidor Vite en modo desarrollo local
npm run dev
```

---
*Este proyecto fue desarrollado y refinado para la red CEDIS para uso propio y privado de la gestión de flotillas e inventario logístico corporativo.*
