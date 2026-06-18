#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

API_BASE="${API_URL:-http://localhost:4000}"
API="${API_BASE%/}/api/v1"
WEB="${APP_URL:-http://localhost:3000}"
ADMIN_EMAIL="${STAGING_ADMIN_EMAIL:-admin@demo-desa.id}"
ADMIN_PASSWORD="${STAGING_ADMIN_PASSWORD:-}"

if [ -z "$ADMIN_PASSWORD" ]; then
  echo "[smoke-test] ERROR: Set STAGING_ADMIN_PASSWORD (non-default staging admin password)."
  exit 1
fi

PASS=0
FAIL=0

check() {
  local name="$1"
  local ok="$2"
  if [ "$ok" = "1" ]; then
    echo "[PASS] $name"
    PASS=$((PASS + 1))
  else
    echo "[FAIL] $name"
    FAIL=$((FAIL + 1))
  fi
}

# 1. Health
HEALTH=$(curl -sf "$API/health" | grep -c healthy || true)
check "GET /api/v1/health" "$([ "$HEALTH" -ge 1 ] && echo 1 || echo 0)"

# 2. Admin redirect without auth
REDIRECT=$(curl -s -o /dev/null -w "%{http_code}:%{redirect_url}" "$WEB/admin/dashboard")
check "/admin/* redirect without login" "$(echo "$REDIRECT" | grep -q '307\|302' && echo 1 || echo 0)"

# 3. Login
LOGIN_RESP=$(curl -sf -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
ACCESS=$(echo "$LOGIN_RESP" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).data.accessToken||'')}catch{console.log('')}})")
REFRESH=$(echo "$LOGIN_RESP" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).data.refreshToken||'')}catch{console.log('')}})")
check "Login admin" "$([ -n "$ACCESS" ] && echo 1 || echo 0)"

AUTH="Authorization: Bearer $ACCESS"

# 4. Dashboard
DASH=$(curl -sf -H "$AUTH" "$API/reports/dashboard" | grep -c success || true)
check "Dashboard fetch API" "$([ "$DASH" -ge 1 ] && echo 1 || echo 0)"

# 5. CRUD Resident
NIK="320101010618$(date +%H%M%S | tail -c 5)0001"
CREATE_RES=$(curl -sf -X POST "$API/residents" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"nik\":\"$NIK\",\"fullName\":\"Warga Staging Test\",\"gender\":\"male\",\"birthPlace\":\"Jakarta\",\"birthDate\":\"1990-01-01\",\"maritalStatus\":\"single\",\"residentStatus\":\"active\"}")
RES_ID=$(echo "$CREATE_RES" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).data.id||'')}catch{console.log('')}})")
UPDATE_RES=$(curl -sf -X PATCH "$API/residents/$RES_ID" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"fullName":"Warga Staging Updated"}' | grep -c success || true)
GET_RES=$(curl -sf -H "$AUTH" "$API/residents/$RES_ID" | grep -c "Warga Staging Updated" || true)
check "CRUD penduduk (create/update/read)" "$([ -n "$RES_ID" ] && [ "$UPDATE_RES" -ge 1 ] && [ "$GET_RES" -ge 1 ] && echo 1 || echo 0)"

# 6. CRUD Family
KK="320101$(date +%H%M%S | tail -c 6)0001"
CREATE_FAM=$(curl -sf -X POST "$API/families" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"kkNumber\":\"$KK\",\"economicStatus\":\"middle\"}")
FAM_ID=$(echo "$CREATE_FAM" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).data.id||'')}catch{console.log('')}})")
PATCH_FAM=$(curl -sf -X PATCH "$API/families/$FAM_ID" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"houseStatus":"owned"}' | grep -c success || true)
GET_FAM=$(curl -sf -H "$AUTH" "$API/families/$FAM_ID" | grep -c owned || true)
check "CRUD KK (create/update/read)" "$([ -n "$FAM_ID" ] && [ "$PATCH_FAM" -ge 1 ] && [ "$GET_FAM" -ge 1 ] && echo 1 || echo 0)"

# 7. Letter workflow
LT=$(curl -sf -H "$AUTH" "$API/letter-types?limit=1")
LT_ID=$(echo "$LT" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);const items=j.data?.items||j.data||[];console.log(items[0]?.id||'')}catch{console.log('')}})")
CREATE_LR=$(curl -sf -X POST "$API/letter-requests" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"letterTypeId\":\"$LT_ID\",\"residentId\":\"$RES_ID\",\"purpose\":\"Staging test\"}")
LR_ID=$(echo "$CREATE_LR" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).data.id||'')}catch{console.log('')}})")
VERIFY=$(curl -sf -X PATCH "$API/letter-requests/$LR_ID/verify" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"approved":true}' | grep -c success || true)
APPROVE=$(curl -sf -X PATCH "$API/letter-requests/$LR_ID/approve" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"approved":true}' | grep -c success || true)
GEN=$(curl -sf -X POST "$API/letter-requests/$LR_ID/generate-pdf" -H "$AUTH" -H 'Content-Type: application/json' 2>/dev/null || echo '{}')
GEN_OK=$(echo "$GEN" | grep -c success || true)
QR=$(echo "$GEN" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).data.qrCode||'')}catch{console.log('')}})")
DOWNLOAD=$(curl -sf -H "$AUTH" "$API/letter-requests/$LR_ID/download" 2>/dev/null || echo '{}')
DOWNLOAD_OK=$(echo "$DOWNLOAD" | grep -c '"url"' || true)
VERIFY_QR=$(curl -sf "$API/letters/verify/$QR" 2>/dev/null | grep -c '"valid":true' || true)
check "Workflow surat (create/verify/approve/generate/download/verify QR)" "$([ -n "$LR_ID" ] && [ "$VERIFY" -ge 1 ] && [ "$APPROVE" -ge 1 ] && [ "$GEN_OK" -ge 1 ] && [ "$DOWNLOAD_OK" -ge 1 ] && [ "$VERIFY_QR" -ge 1 ] && echo 1 || echo 0)"

printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82' > /tmp/sidpro-smoke-test.png

# 8. File upload
UPLOAD=$(curl -sf -X POST "$API/files/upload" -H "$AUTH" \
  -F "file=@/tmp/sidpro-smoke-test.png;type=image/png" \
  -F "ownerType=resident" -F "ownerId=$RES_ID" 2>/dev/null || echo '{}')
UPLOAD_OK=$(echo "$UPLOAD" | grep -c success || true)
check "Upload file" "$([ "$UPLOAD_OK" -ge 1 ] && echo 1 || echo 0)"

# 9. Export Excel
EXPORT_CODE=$(curl -sf -o /tmp/sidpro-staging-export.xlsx -w "%{http_code}" -H "$AUTH" "$API/residents/export")
check "Export Excel" "$([ "$EXPORT_CODE" = "200" ] && [ -s /tmp/sidpro-staging-export.xlsx ] && echo 1 || echo 0)"

# 10. Import Excel preview
IMPORT=$(curl -sf -X POST "$API/residents/import?preview=true" -H "$AUTH" \
  -F "file=@/tmp/sidpro-staging-export.xlsx;type=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 2>/dev/null || echo '{}')
IMPORT_OK=$(echo "$IMPORT" | grep -c success || true)
check "Import Excel preview" "$([ "$IMPORT_OK" -ge 1 ] && echo 1 || echo 0)"

# 11. Logout
LOGOUT=$(curl -sf -X POST "$API/auth/logout" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$REFRESH\"}" | grep -c success || true)
check "Logout" "$([ "$LOGOUT" -ge 1 ] && echo 1 || echo 0)"

# Cleanup
curl -sf -X DELETE -H "$AUTH" "$API/residents/$RES_ID" >/dev/null 2>&1 || true
curl -sf -X DELETE -H "$AUTH" "$API/families/$FAM_ID" >/dev/null 2>&1 || true

echo ""
echo "Smoke test summary: PASS=$PASS FAIL=$FAIL"
exit $([ "$FAIL" -eq 0 ] && echo 0 || echo 1)
