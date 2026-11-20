# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versionado [SemVer](https://semver.org/lang/es/).

## [1.0.0] — 2026-11-20

Primera versión pública de la demo.

### Tienda

- Inicio con banners, categorías, combos y productos destacados, y zonas de entrega.
- Catálogo con búsqueda en español, filtros por categoría, tipo y precio, orden y paginación, sin depender de JavaScript.
- Ficha de producto y combo: productos incluidos, ahorro frente a comprar por separado, JSON-LD e imagen Open Graph propia.
- Precios en USD con selector USD/EUR y equivalente en CUP según la tasa del día.
- Carrito persistente en `localStorage`, sincronizado entre pestañas y revalidado con el servidor.
- Checkout en 2 pasos (comprador y destinatario), envío por municipio y dos métodos de pago.
- Pedido con código CY-1234, resumen por WhatsApp y página pública de seguimiento.
- PWA instalable con página sin conexión.

### Panel de administración

- Acceso protegido por middleware, `requireAdmin()` y RLS.
- Resumen con ventas por día, ticket medio, top de productos y pedidos por municipio.
- Gestión de pedidos: filtros, transiciones de estado validadas, pagos, notas, WhatsApp al destinatario y al comprador, hoja de entrega imprimible.
- CRUD de productos, combos, categorías y zonas, con subida de imágenes comprimidas a WebP.
- Tasas USD→CUP/EUR con historial, datos del negocio y «Restablecer demo».

### Plataforma

- Esquema Postgres con RLS en todas las tablas, `crear_pedido()` con precios calculados en el servidor, `obtener_seguimiento()` sin datos sensibles y triggers que validan las transiciones de estado.
- Capa de dominio pura con 64 tests y cobertura del 100 % de líneas.
- CI con formato, lint, tipos, tests con umbral de cobertura y build.
