# TicketAssist Backend

Node.js + TypeScript API for the TicketAssist sequential workflow prototype.

## Stack

- Express 5 for REST routing
- Prisma 7 for PostgreSQL persistence
- Swagger UI at `/docs`
- Zod for request validation

## Structure

```text
backend/
  prisma/
    schema.prisma      ERD implementation for PostgreSQL
    seed.ts            Default agents and mentor user
  src/
    config/            Environment and Prisma client
    controllers/       HTTP controllers
    middlewares/       Error and not-found handlers
    routes/            Express routes with OpenAPI comments
    services/          Business logic and Prisma operations
    swagger/           Swagger spec setup
    validators/        Zod request schemas
```

## Commands

```bash
npm run prisma:generate -w backend
npm run prisma:migrate -w backend
npm run db:seed -w backend
npm run dev -w backend
```

## Endpoints

- `GET /health`
- `GET /docs`
- `GET /api/agents`
- `POST /api/workflows`
- `GET /api/workflows/:id`
- `POST /api/workflows/:id/review`

The workflow service currently creates deterministic dummy analysis artifacts and persists them through Prisma. It does not run AI agents yet.
