# Local Observability

## Services

Start the application services on the host:

```powershell
pnpm --filter @careerhub/iam-service start
pnpm --filter @careerhub/candidate-service start
pnpm --filter @careerhub/employer-service start
pnpm --filter @careerhub/gateway start
```

Each service now writes JSON logs into `tmp/logs/*.jsonl` and exposes:

- `/health`
- `/health/live`
- `/health/ready`
- `/metrics`

## Observability Stack

Stack config lives under `infrastructure/observability/stack/`.

Start the local stack:

```powershell
pnpm observability:up
```

Stop it:

```powershell
pnpm observability:down
```

Endpoints:

- Grafana: `http://127.0.0.1:3300`
- Prometheus: `http://127.0.0.1:9090`
- Loki: `http://127.0.0.1:3100`
- Tempo: `http://127.0.0.1:3200`

Grafana is preconfigured with:

- `Prometheus` datasource
- `Loki` datasource
- `Tempo` datasource
- `CareerHub Observability` dashboard

## What To Verify

1. Hit any gateway HTTP endpoint such as `/auth/login` or `/candidate-profiles/me`.
2. Confirm gateway `/metrics` increments HTTP request counters.
3. Confirm downstream service `/metrics` increments gRPC request counters.
4. Open Grafana and verify:
   - metrics show up in the dashboard
   - logs appear in Loki with `service`, `level`, `context`
   - traces appear in Tempo for the same request
5. Use `requestId` and `traceId` in logs to correlate gateway and downstream spans.
