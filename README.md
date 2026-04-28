# Web Admin Buses

Panel web administrativo y operativo para la API Buses.

## Configuración

1. Instala dependencias:

```bash
npm install
```

2. Crea tu archivo `.env` a partir de `.env.example`.

```bash
cp .env.example .env
```

3. Ajusta la URL base del backend si no corre en local:

```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

## Desarrollo

```bash
npm run dev
```

## Build y validación

```bash
npm run build
npm run lint
```

## Qué incluye

- login real por `POST /auth/login`
- restauración de sesión por `GET /auth/me`
- cierre de sesión por `POST /auth/logout`
- dashboard con `/dashboard` y `/operations-map`
- vistas de consulta para buses, paradas, rutas, tarifas, usuarios, pagos y reportes
- acciones rápidas para `ADMIN` y `OPERATOR`:
  - cambio de estado de buses
  - cambio de rol y estado de usuarios
  - reset de contraseña
  - registro manual de pagos
  - reversa de pagos completados
  - recálculo de geometría de rutas

## Notas

- `INSPECTOR` entra en modo solo lectura.
- Si el backend no está disponible, el frontend muestra errores de conexión contra la base URL configurada.
- El backend esperado usa JWT stateless con encabezado `Authorization: Bearer <token>`.
