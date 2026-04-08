# Feature Flags Control Plane

TypeScript service for feature flag management, rule assignment, and deterministic rollout evaluation.

## Why This Exists

Created to look like backend platform infrastructure teams build for progressive delivery in production environments.

## What This Demonstrates

- environment-aware targeting and rollout percentages
- modular evaluation logic with explicit decision reasons
- API-level tests without framework-heavy dependencies

## Architecture

1. flags and rules are modeled in a dedicated store
1. request context is evaluated with stable bucketing logic
1. HTTP endpoints expose both admin and evaluation operations

## Run It

```bash
npm test
npm run build
npm start
```

## Verification

Use `npm test` and `npm run build` to validate behavior and compile state.
