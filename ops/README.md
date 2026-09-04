# Operations

Everything here is free and self-hosted. Gemini is the only external service
the application talks to.

## TLS

```bash
echo "PUBLIC_DOMAIN=example.org" >> .env
echo "ACME_EMAIL=you@example.org" >> .env
echo "COOKIE_SECURE=true"        >> .env
docker compose --profile tls up -d
```

Caddy obtains and renews Let's Encrypt certificates automatically. With
`PUBLIC_DOMAIN` unset it serves `https://localhost` with a locally-trusted
certificate, which is enough to exercise the secure-cookie path locally.

## Metrics

```bash
docker compose --profile observability up -d
# Prometheus  http://localhost:9090
# Grafana     http://localhost:3000  (admin / admin on first run)
```

The backend exposes `/metrics` in Prometheus text format with no extra
dependency. The series worth watching:

| Series | Why |
|---|---|
| `vaadvivaad_citations_total{status="stripped"}` | Fabricated authorities caught. The health of the whole product in one number — it should be low and it should never be unmeasured. |
| `vaadvivaad_llm_tokens_total` | Spend, by pipeline step. |
| `vaadvivaad_llm_circuit_trips_total` | How often the free-tier quota is being hit. |
| `vaadvivaad_debates_total{stage="failed"}` | Hearings that did not finish. |
| `vaadvivaad_guard_decisions_total` | Scope mix, including welfare referrals. |
| `vaadvivaad_corpus_size` | Grounding. A corpus of zero means every debate argues from statute alone. |

Caddy refuses `/metrics` from outside, so it stays on the internal network.

## Secrets

`.env` with `chmod 600`, or Docker secrets for a swarm. No cloud key
management is required. Rotate `JWT_SECRET_KEY` by generating a new one — in
flight sessions are invalidated, which is the intended effect.

## Backups

```bash
# Mongo
docker exec vaadvivaad-mongo mongodump --archive --gzip \
  -u "$MONGO_ROOT_USERNAME" -p "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin > backup-$(date +%F).archive.gz

# Qdrant snapshot (the corpus is rebuildable from ingest, but a snapshot is
# faster than re-embedding)
curl -X POST -H "api-key: $QDRANT_API_KEY" \
  http://localhost:6333/collections/case_laws/snapshots
```

Rehearse the restore. A backup nobody has restored is a hypothesis.
