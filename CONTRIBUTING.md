# Contributing to ExamEve

We welcome contributions to optimize the student exam preparation and anxiety management experience! Please review the guidelines below.

## Naming Conventions
- Backend files: use `camelCase` or standard Node conventions.
- React components: use `PascalCase` (e.g., `Providers.tsx`, `AuthSync.tsx`).
- Python files: use standard PEP 8 naming style.

## Testing Guidelines
Always verify changes before submitting:
- Run backend query/mutation validation tests:
  ```bash
  cd backend
  npm run test
  ```
- Run Python FastAPI unit/integration tests:
  ```bash
  cd ml-service
  pytest
  ```

## Docker Workflows
- **Development**: Run `docker-compose up --build` from the root directory.
- **Production**: Run `docker-compose -f docker-compose.prod.yml up --build` with secured environment secrets configuration.
