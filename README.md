# Feature Flags Control Plane

TypeScript service for managing feature flags and evaluating rollout rules against request context. It models a real control-plane problem without needing an external database.

## What It Shows

- backend domain modeling
- deterministic percentage rollouts
- environment and segment targeting
- API-level tests without framework dependencies

## Scripts

```bash
npm test
npm run build
npm start
```

## Endpoints

- `GET /health`
- `POST /flags`
- `POST /flags/:key/rules`
- `POST /evaluate`
