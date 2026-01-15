# Mallki Sapan - Backend API

API REST para el sistema de jardín inteligente Mallki Sapan.

## Stack Tecnológico

- **Runtime:** Node.js
- **Framework:** Express
- **Lenguaje:** TypeScript
- **ORM:** Prisma
- **Base de Datos:** PostgreSQL
- **Validación:** Zod

## Requisitos

- Node.js 18+
- PostgreSQL 14+

## Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env con tus credenciales de PostgreSQL
```

3. Crear la base de datos y generar el cliente Prisma:
```bash
npm run db:push
npm run db:generate
```

4. Poblar la base de datos con datos iniciales:
```bash
npm run db:seed
```

## Desarrollo

```bash
npm run dev
```

El servidor estará disponible en `http://localhost:3001`

## API Endpoints

### Dashboard
- `GET /api/dashboard/stats` - Estadísticas generales
- `GET /api/dashboard/sensor-history` - Historial de sensores
- `GET /api/dashboard/recent-activity` - Actividad reciente

### Sensores
- `GET /api/sensors` - Listar sensores
- `GET /api/sensors/:id` - Obtener sensor
- `POST /api/sensors` - Crear sensor
- `PUT /api/sensors/:id` - Actualizar sensor
- `DELETE /api/sensors/:id` - Eliminar sensor
- `GET /api/sensors/:id/readings` - Historial de lecturas
- `POST /api/sensors/:id/readings` - Agregar lectura

### Cultivos
- `GET /api/crops` - Listar cultivos
- `GET /api/crops/:id` - Obtener cultivo con sensores y alertas
- `POST /api/crops` - Crear cultivo
- `PUT /api/crops/:id` - Actualizar cultivo
- `DELETE /api/crops/:id` - Eliminar cultivo

### Alertas
- `GET /api/alerts` - Listar alertas (filtros: severity, type, unreadOnly)
- `GET /api/alerts/:id` - Obtener alerta
- `POST /api/alerts` - Crear alerta
- `PATCH /api/alerts/:id/read` - Marcar como leída
- `PATCH /api/alerts/read-all` - Marcar todas como leídas
- `DELETE /api/alerts/:id` - Eliminar alerta

### Fotos
- `GET /api/photos` - Listar fotos (filtro: cropId)
- `GET /api/photos/:id` - Obtener foto con análisis
- `POST /api/photos` - Crear foto
- `POST /api/photos/:id/analysis` - Agregar análisis IA
- `DELETE /api/photos/:id` - Eliminar foto

### Riego
- `GET /api/irrigation/zones` - Listar zonas
- `POST /api/irrigation/zones` - Crear zona
- `PUT /api/irrigation/zones/:id` - Actualizar zona
- `DELETE /api/irrigation/zones/:id` - Eliminar zona
- `GET /api/irrigation/events` - Historial de riego
- `POST /api/irrigation/events` - Crear evento
- `POST /api/irrigation/start` - Iniciar riego manual
- `POST /api/irrigation/stop` - Detener riego
- `GET /api/irrigation/stats` - Estadísticas de riego

## Scripts

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo con hot-reload |
| `npm run build` | Compilar TypeScript |
| `npm start` | Iniciar servidor de producción |
| `npm run db:generate` | Generar cliente Prisma |
| `npm run db:push` | Sincronizar esquema con BD |
| `npm run db:migrate` | Crear migración |
| `npm run db:seed` | Poblar BD con datos iniciales |
| `npm run db:studio` | Abrir Prisma Studio |

## Estructura del Proyecto

```
backend/
├── prisma/
│   ├── schema.prisma    # Esquema de la base de datos
│   └── seed.ts          # Script de datos iniciales
├── src/
│   ├── routes/          # Rutas de la API
│   │   ├── sensors.ts
│   │   ├── crops.ts
│   │   ├── alerts.ts
│   │   ├── photos.ts
│   │   ├── irrigation.ts
│   │   └── dashboard.ts
│   ├── middleware/
│   │   └── error-handler.ts
│   ├── services/
│   │   └── database.ts
│   ├── app.ts           # Configuración de Express
│   └── server.ts        # Punto de entrada
├── package.json
├── tsconfig.json
└── .env
```
