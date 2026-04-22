# Prompt para crear la API del sistema de pago y gestion de buses publicos

Actua como senior backend engineer. Crea una API REST en Spring Boot con Kotlin para soportar un panel administrativo web en React y una app movil futura en React Native para pasajeros.

El objetivo es construir una base real de MVP: arquitectura limpia, tipado fuerte, entidades claras, validaciones, DTOs, servicios, repositorios, controladores, manejo de errores, paginacion y seguridad preparada para JWT.

## Stack esperado

- Kotlin
- Spring Boot
- Spring Web
- Spring Security
- Spring Data JPA
- PostgreSQL
- Flyway o Liquibase para migraciones
- Bean Validation
- OpenAPI/Swagger
- Gradle Kotlin DSL

## Dominio

El sistema administra transporte publico con pago digital.

Entidades principales:

- Usuario: administradores, operadores, inspectores y pasajeros.
- Bus: unidad fisica con placa, codigo, capacidad, estado y ruta asignada opcional.
- Parada: punto maestro independiente con codigo, nombre, direccion, latitud, longitud y estado.
- Ruta: se crea seleccionando paradas existentes en orden. El trazado debe calcularse siguiendo vias/calles entre paradas.
- Tarifa: monto, vigencia y estado.
- Pago: transaccion de un pasajero asociada a bus, metodo, monto, fecha y estado.
- Reporte: endpoints agregados para metricas y exportaciones futuras.

Importante: las paradas no pertenecen a una ruta. Una ruta referencia una lista ordenada de paradas. Una misma parada puede participar en varias rutas.

## Estados y enums

Usa enums:

- OperationalStatus: ACTIVE, INACTIVE, MAINTENANCE, SUSPENDED
- PaymentStatus: COMPLETED, PENDING, FAILED, REVERSED
- PaymentMethod: CARD, QR, CASH, WALLET
- UserRole: ADMIN, OPERATOR, INSPECTOR, PASSENGER

## Reglas clave

- Una ruta debe tener minimo 2 paradas.
- El origen de una ruta es la primera parada seleccionada.
- El destino de una ruta es la ultima parada seleccionada.
- El orden de paradas debe guardarse explicitamente.
- El trazado de ruta debe guardarse como lista de coordenadas o GeoJSON LineString.
- Para el MVP, el trazado puede calcularse inicialmente como linea entre paradas, pero deja la interfaz de servicio preparada para integrar OSRM, GraphHopper, OpenRouteService o un servicio GIS propio.
- Un bus puede estar sin ruta asignada.
- No permitir asignar buses a rutas suspendidas.
- Pagos deben ser inmutables en monto/metodo una vez completados; permitir reversa con endpoint especifico.

## Modelo sugerido

### User

- id: UUID
- name: String
- email: String unique
- passwordHash: String nullable para pasajeros externos si aplica
- role: UserRole
- status: OperationalStatus
- createdAt: Instant
- updatedAt: Instant

### Bus

- id: UUID
- plate: String unique
- code: String unique
- capacity: Int
- routeId: UUID nullable
- status: OperationalStatus
- createdAt: Instant
- updatedAt: Instant

### Stop

- id: UUID
- code: String unique
- name: String
- address: String
- latitude: BigDecimal
- longitude: BigDecimal
- status: OperationalStatus
- createdAt: Instant
- updatedAt: Instant

### Route

- id: UUID
- name: String unique
- status: OperationalStatus
- originStopId: UUID
- destinationStopId: UUID
- geometry: JSONB o text con GeoJSON LineString
- createdAt: Instant
- updatedAt: Instant

### RouteStop

Tabla pivote ordenada:

- id: UUID
- routeId: UUID
- stopId: UUID
- stopOrder: Int

Restricciones:

- unique(routeId, stopOrder)
- unique(routeId, stopId) opcional si no se permite repetir parada en una misma ruta

### Fare

- id: UUID
- name: String
- amount: BigDecimal
- validFrom: LocalDate
- validTo: LocalDate
- status: OperationalStatus
- createdAt: Instant
- updatedAt: Instant

### Payment

- id: UUID
- userId: UUID
- busId: UUID
- amount: BigDecimal
- date: Instant
- status: PaymentStatus
- method: PaymentMethod
- externalReference: String nullable
- createdAt: Instant
- updatedAt: Instant

## Contratos REST necesarios para el frontend admin

Usa prefijo `/api/v1`.

### Auth

#### POST `/auth/login`

Request:

```json
{
  "email": "admin@buses.gt",
  "password": "admin123"
}
```

Response:

```json
{
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "name": "Administrador",
    "email": "admin@buses.gt",
    "role": "ADMIN"
  }
}
```

#### GET `/auth/me`

Response: usuario autenticado.

#### POST `/auth/logout`

Puede ser no-op si JWT es stateless.

### Dashboard

#### GET `/dashboard`

Response:

```json
{
  "metrics": {
    "activeBuses": 4,
    "registeredRoutes": 5,
    "paymentsToday": 128,
    "revenueToday": 512.00
  },
  "mapMarkers": [
    {
      "id": "uuid",
      "label": "BUS-102",
      "position": [14.9722, -89.5306],
      "status": "ACTIVE"
    }
  ]
}
```

### Buses

#### GET `/buses`

Query params:

- `page`
- `size`
- `search`
- `status`
- `routeId`

Response:

```json
{
  "content": [
    {
      "id": "uuid",
      "plate": "C 102 BAA",
      "code": "BUS-102",
      "capacity": 55,
      "route": {
        "id": "uuid",
        "name": "Ruta 12 Centro"
      },
      "status": "ACTIVE"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1
}
```

#### GET `/buses/{id}`

Response: detalle de bus.

#### POST `/buses`

Request:

```json
{
  "plate": "C 150 BFA",
  "code": "BUS-150",
  "capacity": 55,
  "routeId": "uuid-or-null",
  "status": "ACTIVE"
}
```

#### PUT `/buses/{id}`

Actualiza datos principales.

#### PATCH `/buses/{id}/status`

Request:

```json
{
  "status": "MAINTENANCE"
}
```

#### PATCH `/buses/{id}/route`

Request:

```json
{
  "routeId": "uuid-or-null"
}
```

### Paradas

#### GET `/stops`

Query params:

- `page`
- `size`
- `search`
- `status`

Response:

```json
{
  "content": [
    {
      "id": "uuid",
      "code": "P-001",
      "name": "Terminal Oriente",
      "address": "Ingreso Terminal Oriente",
      "position": [14.982, -89.543],
      "status": "ACTIVE"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1
}
```

#### GET `/stops/{id}`

Response: detalle de parada.

#### POST `/stops`

Request:

```json
{
  "code": "P-009",
  "name": "Plaza Comercial",
  "address": "Avenida principal",
  "latitude": 14.9700,
  "longitude": -89.5300,
  "status": "ACTIVE"
}
```

#### PUT `/stops/{id}`

Actualiza datos principales.

#### PATCH `/stops/{id}/status`

Request:

```json
{
  "status": "SUSPENDED"
}
```

### Rutas

#### GET `/routes`

Query params:

- `page`
- `size`
- `search`
- `status`

Response:

```json
{
  "content": [
    {
      "id": "uuid",
      "name": "Ruta 12 Centro",
      "origin": "Terminal Oriente",
      "destination": "Parque Central",
      "stops": [
        {
          "id": "uuid",
          "code": "P-001",
          "name": "Terminal Oriente",
          "order": 1
        }
      ],
      "status": "ACTIVE"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1
}
```

#### GET `/routes/{id}`

Debe incluir paradas ordenadas y geometria.

Response:

```json
{
  "id": "uuid",
  "name": "Ruta 12 Centro",
  "origin": "Terminal Oriente",
  "destination": "Parque Central",
  "stops": [
    {
      "id": "uuid",
      "code": "P-001",
      "name": "Terminal Oriente",
      "order": 1,
      "position": [14.982, -89.543]
    }
  ],
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [-89.543, 14.982],
      [-89.5306, 14.9722]
    ]
  },
  "status": "ACTIVE"
}
```

#### POST `/routes`

Crea ruta seleccionando paradas existentes en orden.

Request:

```json
{
  "name": "Ruta 30 Aeropuerto",
  "stopIds": [
    "uuid-stop-1",
    "uuid-stop-2",
    "uuid-stop-3"
  ],
  "status": "ACTIVE"
}
```

Comportamiento:

- Validar minimo 2 paradas.
- Calcular origin/destination usando primera y ultima parada.
- Calcular `geometry` siguiendo vias/calles entre las paradas.
- Persistir orden en `route_stops`.

#### PUT `/routes/{id}`

Actualiza nombre, estado y lista ordenada de paradas.

Request:

```json
{
  "name": "Ruta 30 Aeropuerto",
  "stopIds": [
    "uuid-stop-1",
    "uuid-stop-4",
    "uuid-stop-3"
  ],
  "status": "ACTIVE"
}
```

#### PATCH `/routes/{id}/status`

Request:

```json
{
  "status": "SUSPENDED"
}
```

#### POST `/routes/{id}/recalculate-geometry`

Recalcula el trazado siguiendo vias/calles segun las paradas actuales.

Response: ruta actualizada con geometria.

### Mapa operativo

#### GET `/operations-map`

Response:

```json
{
  "busMarkers": [
    {
      "id": "uuid",
      "label": "BUS-102",
      "position": [14.9722, -89.5306],
      "status": "ACTIVE"
    }
  ],
  "stopMarkers": [
    {
      "id": "uuid",
      "label": "P-001 - Terminal Oriente",
      "position": [14.982, -89.543],
      "status": "ACTIVE"
    }
  ],
  "routePaths": [
    {
      "id": "uuid",
      "name": "Ruta 12 Centro",
      "color": "#0b7285",
      "points": [
        [14.982, -89.543],
        [14.9722, -89.5306]
      ]
    }
  ]
}
```

### Tarifas

#### GET `/fares`

Query params:

- `page`
- `size`
- `search`
- `status`

#### GET `/fares/{id}`

#### POST `/fares`

Request:

```json
{
  "name": "Tarifa urbana",
  "amount": 4.00,
  "validFrom": "2026-01-01",
  "validTo": "2026-12-31",
  "status": "ACTIVE"
}
```

#### PUT `/fares/{id}`

#### PATCH `/fares/{id}/status`

### Pagos

#### GET `/payments`

Query params:

- `page`
- `size`
- `userId`
- `busId`
- `status`
- `method`
- `dateFrom`
- `dateTo`

Response item:

```json
{
  "id": "uuid",
  "user": "Ana Morales",
  "bus": "BUS-102",
  "amount": 4.00,
  "date": "2026-04-22T07:15:00Z",
  "status": "COMPLETED",
  "method": "QR"
}
```

#### GET `/payments/{id}`

#### POST `/payments`

Para app movil o carga administrativa.

Request:

```json
{
  "userId": "uuid",
  "busId": "uuid",
  "amount": 4.00,
  "method": "QR",
  "externalReference": "optional"
}
```

#### POST `/payments/{id}/reverse`

Request:

```json
{
  "reason": "Cobro duplicado"
}
```

### Usuarios

#### GET `/users`

Query params:

- `page`
- `size`
- `search`
- `role`
- `status`

#### GET `/users/{id}`

#### POST `/users`

Request:

```json
{
  "name": "Mariana Estrada",
  "email": "mariana@transurb.gt",
  "role": "OPERATOR",
  "password": "temporary-password",
  "status": "ACTIVE"
}
```

#### PUT `/users/{id}`

#### PATCH `/users/{id}/status`

#### PATCH `/users/{id}/role`

Request:

```json
{
  "role": "INSPECTOR"
}
```

#### POST `/users/{id}/reset-password`

### Reportes

#### GET `/reports/summary`

Query params:

- `dateFrom`
- `dateTo`

Response:

```json
{
  "activeBuses": 4,
  "registeredRoutes": 5,
  "registeredStops": 8,
  "payments": 128,
  "revenue": 512.00
}
```

#### GET `/reports/payments`

Query params:

- `dateFrom`
- `dateTo`
- `method`
- `status`

#### GET `/reports/routes`

Metricas por ruta:

- ruta
- cantidad de paradas
- buses asignados
- pagos
- ingresos

#### GET `/reports/buses`

Metricas por bus.

#### POST `/reports/schedules`

Programa reporte recurrente.

Request:

```json
{
  "name": "Ingresos diarios",
  "type": "FINANCIAL",
  "frequency": "DAILY",
  "recipientEmail": "admin@buses.gt"
}
```

## Formato de errores

Usa una respuesta consistente:

```json
{
  "timestamp": "2026-04-22T12:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "La ruta debe tener al menos 2 paradas.",
  "path": "/api/v1/routes",
  "details": [
    {
      "field": "stopIds",
      "message": "Debe contener al menos 2 paradas."
    }
  ]
}
```

## Paginacion

Para listados usar:

- `page`
- `size`
- `sort`

Respuesta estandar:

```json
{
  "content": [],
  "page": 0,
  "size": 20,
  "totalElements": 0,
  "totalPages": 0
}
```

## Seguridad

- Proteger todos los endpoints excepto `/auth/login` y Swagger si se permite en dev.
- Usar JWT Bearer.
- Roles:
  - ADMIN: todo
  - OPERATOR: buses, rutas, paradas, tarifas lectura/escritura limitada
  - INSPECTOR: lectura operativa
  - PASSENGER: endpoints moviles futuros y pagos propios

## CORS

Permitir en dev:

- `http://localhost:5173`
- `http://127.0.0.1:5173`

## Seeds iniciales

Crear migracion o data loader con:

- Usuario admin: `admin@buses.gt`
- Buses mock: BUS-102, BUS-118, BUS-124, BUS-131, BUS-140
- Paradas mock: P-001 a P-008
- Rutas mock construidas por paradas
- Tarifas mock
- Pagos mock

## Criterios de aceptacion

- Proyecto compila.
- Swagger documenta todos los endpoints.
- Migraciones crean esquema completo.
- Login devuelve JWT y usuario.
- CRUD de buses, paradas, rutas, tarifas y usuarios funciona.
- Crear ruta con paradas guarda el orden y genera geometria.
- `/operations-map` devuelve buses, paradas y trazados.
- Reportes basicos devuelven datos agregados.
- Validaciones devuelven errores consistentes.
- El frontend React puede reemplazar mocks por estos endpoints sin cambiar su modelo principal.
