# Web Admin Buses

Panel web administrativo y operativo para gestión de transporte urbano.

## Configuración

1. Instala dependencias:

```bash
npm install
```

2. Crea tu archivo `.env` a partir de `.env.example`.

```bash
cp .env.example .env
```

3. Ajusta las variables de entorno necesarias para tu instalación.

## Ejecución

```bash
npm run dev
```

## Build y validación

```bash
npm run build
npm run lint
```

## Qué incluye

- acceso administrativo con control por perfil
- dashboard operativo con mapa y métricas
- gestión de buses, paradas, rutas, tarifas, usuarios, pagos y reportes
- acciones administrativas para operación diaria

## Notas

- `INSPECTOR` entra en modo solo lectura.
