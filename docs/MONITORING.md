# Monitoring SIDPRO

## Health Endpoints

| Service | Endpoint | Expected |
|---------|----------|----------|
| API | `GET /api/v1/health` | 200 OK |
| Web | `GET /` | 200 OK |
| PostgreSQL | `pg_isready` | accepting connections |
| Redis | `redis-cli ping` | PONG |

## Healthcheck Script

```bash
./scripts/healthcheck.sh
```

## Metrics (Future)

- Prometheus metrics endpoint di API
- Grafana dashboard untuk request rate, latency, error rate
- Loki untuk centralized logging

## Alerting (Future)

- API down > 1 menit
- Database connection failure
- Disk usage > 80%
- Backup failure
