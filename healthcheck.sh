#!/bin/bash
set -Eeuo pipefail
curl -fsS "http://localhost:39093/healthz" >/dev/null && echo "✅ Health OK" || (echo "❌ Healthcheck fehlgeschlagen" && exit 1)
