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
ADMIN_EMAIL="${STAGING_ADMIN_EMAIL:-${SEED_ADMIN_EMAIL:-admin@demo-desa.id}}"
ADMIN_PASSWORD="${STAGING_ADMIN_PASSWORD:-}"
SMOKE_RUN_SEED="${SMOKE_RUN_SEED:-1}"
SMOKE_SKIP_WEB="${SMOKE_SKIP_WEB:-0}"

if [ -z "$ADMIN_PASSWORD" ] && [ -n "${SEED_ADMIN_PASSWORD:-}" ]; then
  if [ "${NODE_ENV:-development}" != "production" ]; then
    echo "[smoke-test] WARN: STAGING_ADMIN_PASSWORD unset — using SEED_ADMIN_PASSWORD (development only)."
    ADMIN_PASSWORD="$SEED_ADMIN_PASSWORD"
  fi
fi

if [ -z "$ADMIN_PASSWORD" ]; then
  echo "[smoke-test] ERROR: Set STAGING_ADMIN_PASSWORD (non-default staging admin password)."
  echo "[smoke-test]        For local dev after seed, you may set SEED_ADMIN_PASSWORD in .env instead."
  exit 1
fi

echo "[smoke-test] Admin login: $ADMIN_EMAIL"

if [ "$SMOKE_RUN_SEED" = "1" ]; then
  echo "[smoke-test] Running prisma seed (permissions sync). Re-login required after permission changes."
  pnpm prisma:seed
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

json_field() {
  local expr="$1"
  node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);${expr}}catch{console.log('')}})"
}

# 1. Health
HEALTH=$(curl -sf "$API/health" | grep -c healthy || true)
check "GET /api/v1/health" "$([ "$HEALTH" -ge 1 ] && echo 1 || echo 0)"

# 1b. Detect stale API build (missing complaints workflow routes)
STALE_API=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$API/complaints/00000000-0000-0000-0000-000000000000/status" \
  -H 'Content-Type: application/json' -d '{"status":"verified"}' 2>/dev/null || echo "000")
if [ "$STALE_API" = "404" ]; then
  echo "[smoke-test] ERROR: API build appears stale (PATCH /complaints/:id/status → 404)."
  echo "[smoke-test]        Rebuild and restart: pnpm --filter @sidpro/api build && node apps/api/dist/main.js"
  exit 1
fi

# 2. Admin redirect without auth
if [ "$SMOKE_SKIP_WEB" = "1" ]; then
  echo "[SKIP] /admin/* redirect (SMOKE_SKIP_WEB=1)"
  check "/admin/* redirect without login (skipped)" "1"
else
  REDIRECT=$(curl -s -o /dev/null -w "%{http_code}:%{redirect_url}" "$WEB/admin/dashboard" 2>/dev/null || echo "000")
  if [ "$REDIRECT" = "000" ]; then
    echo "[smoke-test] ERROR: Web not reachable at $WEB — start web or set SMOKE_SKIP_WEB=1"
    check "/admin/* redirect without login" "0"
  else
    check "/admin/* redirect without login" "$(echo "$REDIRECT" | grep -q '307\|302' && echo 1 || echo 0)"
  fi
fi

# 3. Login
LOGIN_RESP=$(curl -sf -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
ACCESS=$(echo "$LOGIN_RESP" | json_field "console.log(j.data?.accessToken||'')")
REFRESH=$(echo "$LOGIN_RESP" | json_field "console.log(j.data?.refreshToken||'')")
ADMIN_ACCESS="$ACCESS"
check "Login admin" "$([ -n "$ACCESS" ] && echo 1 || echo 0)"

AUTH="Authorization: Bearer $ACCESS"

# 4. Dashboard
DASH=$(curl -sf -H "$AUTH" "$API/reports/dashboard" | grep -c success || true)
check "Dashboard fetch API" "$([ "$DASH" -ge 1 ] && echo 1 || echo 0)"

# 5. CRUD Resident
NIK="320101010618$(date +%H%M%S | tail -c 5)0001"
CREATE_RES=$(curl -sf -X POST "$API/residents" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"nik\":\"$NIK\",\"fullName\":\"Warga Staging Test\",\"gender\":\"male\",\"birthPlace\":\"Jakarta\",\"birthDate\":\"1990-01-01\",\"maritalStatus\":\"single\",\"residentStatus\":\"permanent\"}")
RES_ID=$(echo "$CREATE_RES" | json_field "console.log(j.data?.id||'')")
UPDATE_RES=$(curl -sf -X PATCH "$API/residents/$RES_ID" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"fullName":"Warga Staging Updated"}' | grep -c success || true)
GET_RES=$(curl -sf -H "$AUTH" "$API/residents/$RES_ID" | grep -c "Warga Staging Updated" || true)
check "CRUD penduduk (create/update/read)" "$([ -n "$RES_ID" ] && [ "$UPDATE_RES" -ge 1 ] && [ "$GET_RES" -ge 1 ] && echo 1 || echo 0)"

# 6. CRUD Family
KK="320101$(date +%H%M%S | tail -c 6)0001"
CREATE_FAM=$(curl -sf -X POST "$API/families" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"kkNumber\":\"$KK\",\"economicStatus\":\"middle\"}")
FAM_ID=$(echo "$CREATE_FAM" | json_field "console.log(j.data?.id||'')")
PATCH_FAM=$(curl -sf -X PATCH "$API/families/$FAM_ID" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"houseStatus":"owned"}' | grep -c success || true)
GET_FAM=$(curl -sf -H "$AUTH" "$API/families/$FAM_ID" | grep -c owned || true)
check "CRUD KK (create/update/read)" "$([ -n "$FAM_ID" ] && [ "$PATCH_FAM" -ge 1 ] && [ "$GET_FAM" -ge 1 ] && echo 1 || echo 0)"

# 7. Letter workflow
LT=$(curl -sf -H "$AUTH" "$API/letter-types?limit=1")
LT_ID=$(echo "$LT" | json_field "const items=j.data?.items||j.data||[];console.log(items[0]?.id||'')")
CREATE_LR=$(curl -sf -X POST "$API/letter-requests" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"letterTypeId\":\"$LT_ID\",\"residentId\":\"$RES_ID\",\"purpose\":\"Staging test\"}")
LR_ID=$(echo "$CREATE_LR" | json_field "console.log(j.data?.id||'')")
VERIFY=$(curl -sf -X PATCH "$API/letter-requests/$LR_ID/verify" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"approved":true}' | grep -c success || true)
APPROVE=$(curl -sf -X PATCH "$API/letter-requests/$LR_ID/approve" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"approved":true}' | grep -c success || true)
GEN=$(curl -sf -X POST "$API/letter-requests/$LR_ID/generate-pdf" -H "$AUTH" -H 'Content-Type: application/json' 2>/dev/null || echo '{}')
GEN_OK=$(echo "$GEN" | grep -c success || true)
QR=$(echo "$GEN" | json_field "console.log(j.data?.qrCode||'')")
DOWNLOAD=$(curl -sf -H "$AUTH" "$API/letter-requests/$LR_ID/download" 2>/dev/null || echo '{}')
DOWNLOAD_OK=$(echo "$DOWNLOAD" | grep -c '"url"' || true)
VERIFY_QR=$(curl -sf "$API/letters/verify/$QR" 2>/dev/null | grep -c '"valid":true' || true)
VERIFY_NO_NIK=$(curl -sf "$API/letters/verify/$QR" 2>/dev/null | grep -c '"nik"' || true)
LETTER_NUM=$(echo "$GEN" | json_field "console.log(j.data?.letterNumber||'')")
LR_TICKET="SRT-$(echo "$LR_ID" | cut -c1-8 | tr '[:lower:]' '[:upper:]')"
NIK_LAST4="${NIK: -4}"
TRACK_LR=$(curl -sf -X POST "$API/letters/public/track?tenantCode=demo-desa" \
  -H 'Content-Type: application/json' \
  -d "{\"ticket\":\"$LR_TICKET\",\"nikLast4\":\"$NIK_LAST4\"}" 2>/dev/null || echo '{}')
TRACK_LR_OK=$(echo "$TRACK_LR" | grep -c success || true)
check "Workflow surat (create/verify/approve/generate/download/verify QR)" "$([ -n "$LR_ID" ] && [ "$VERIFY" -ge 1 ] && [ "$APPROVE" -ge 1 ] && [ "$GEN_OK" -ge 1 ] && [ "$DOWNLOAD_OK" -ge 1 ] && [ "$VERIFY_QR" -ge 1 ] && echo 1 || echo 0)"
check "Letter generate returns letterNumber" "$([ -n "$LETTER_NUM" ] && echo 1 || echo 0)"
check "Letter verify does not expose NIK" "$([ "$VERIFY_NO_NIK" -eq 0 ] && echo 1 || echo 0)"
check "Letter public track" "$([ "$TRACK_LR_OK" -ge 1 ] && echo 1 || echo 0)"

# 7b. Warga citizen letter request (no resident UUID)
WARGA_EMAIL="${SEED_WARGA_EMAIL:-warga@demo-desa.id}"
WARGA_APPLICANT_NIK="7301010101010001"
WARGA_LOGIN=$(curl -sf -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$WARGA_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" 2>/dev/null || echo '{}')
WARGA_ACCESS=$(echo "$WARGA_LOGIN" | json_field "console.log(j.data?.accessToken||'')")
WARGA_LR=$(curl -sf -X POST "$API/letter-requests" -H "Authorization: Bearer $WARGA_ACCESS" \
  -H 'Content-Type: application/json' \
  -d "{\"letterTypeId\":\"$LT_ID\",\"applicantNik\":\"$WARGA_APPLICANT_NIK\",\"purpose\":\"Permohonan surat warga smoke test\"}" 2>/dev/null || echo '{}')
WARGA_LR_OK=$(echo "$WARGA_LR" | grep -c success || true)
check "Warga letter request (applicantNik only)" "$([ -n "$WARGA_ACCESS" ] && [ "$WARGA_LR_OK" -ge 1 ] && echo 1 || echo 0)"

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

# 11. RBAC smoke
SMOKE_TS=$(date +%s)
SMOKE_USER_EMAIL="smoke-rbac-${SMOKE_TS}@smoke.test.local"
SMOKE_USER_PASSWORD="${SMOKE_TEST_USER_PASSWORD:-}"
if [ -z "$SMOKE_USER_PASSWORD" ]; then
  SMOKE_USER_PASSWORD="SmokeTest_${SMOKE_TS}_Aa1"
fi

ROLES_RESP=$(curl -sf -H "$AUTH" "$API/roles?limit=50")
OPERATOR_ROLE_ID=$(echo "$ROLES_RESP" | json_field "const items=j.data||[];const r=items.find(x=>x.code==='operator_desa');console.log(r?.id||'')")

CREATE_USER=$(curl -sf -X POST "$API/users" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$SMOKE_USER_EMAIL\",\"name\":\"Smoke RBAC User\",\"password\":\"$SMOKE_USER_PASSWORD\",\"roleIds\":[\"$OPERATOR_ROLE_ID\"]}")
SMOKE_USER_ID=$(echo "$CREATE_USER" | json_field "console.log(j.data?.id||'')")
check "RBAC create user" "$([ -n "$SMOKE_USER_ID" ] && echo 1 || echo 0)"

ASSIGN_ROLES=$(curl -sf -X PUT "$API/users/$SMOKE_USER_ID/roles" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"roleIds\":[\"$OPERATOR_ROLE_ID\"]}" | grep -c success || true)
check "RBAC assign role" "$([ "$ASSIGN_ROLES" -ge 1 ] && echo 1 || echo 0)"

SMOKE_LOGIN=$(curl -sf -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$SMOKE_USER_EMAIL\",\"password\":\"$SMOKE_USER_PASSWORD\"}")
SMOKE_ACCESS=$(echo "$SMOKE_LOGIN" | json_field "console.log(j.data?.accessToken||'')")
SMOKE_AUTH="Authorization: Bearer $SMOKE_ACCESS"
COMPLAINTS_OK=$(curl -sf -H "$SMOKE_AUTH" "$API/complaints?limit=1" | grep -c success || true)
check "RBAC smoke user permission (complaints.read)" "$([ -n "$SMOKE_ACCESS" ] && [ "$COMPLAINTS_OK" -ge 1 ] && echo 1 || echo 0)"

DISABLE_USER=$(curl -sf -X PATCH "$API/users/$SMOKE_USER_ID/status" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"status":"inactive"}' | grep -c success || true)
check "RBAC disable user" "$([ "$DISABLE_USER" -ge 1 ] && echo 1 || echo 0)"

DISABLED_LOGIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$SMOKE_USER_EMAIL\",\"password\":\"$SMOKE_USER_PASSWORD\"}")
check "RBAC disabled user cannot login" "$([ "$DISABLED_LOGIN_CODE" != "200" ] && echo 1 || echo 0)"

AUTH="Authorization: Bearer $ADMIN_ACCESS"

# 12. Complaints workflow
CREATE_CMP=$(curl -sf -X POST "$API/complaints/public?tenantCode=demo-desa" -H 'Content-Type: application/json' \
  -d '{"title":"Smoke Test Pengaduan","description":"Pengaduan dari smoke test otomatis","category":"Lingkungan","priority":"medium","location":"RT 01","reporterName":"Smoke Tester","reporterPhone":"08123456789"}')
CMP_ID=$(echo "$CREATE_CMP" | json_field "console.log(j.data?.id||'')")
check "Complaints public create" "$([ -n "$CMP_ID" ] && echo 1 || echo 0)"

CMP_PREFIX=$(echo "$CMP_ID" | cut -c1-8 | tr '[:lower:]' '[:upper:]')
TRACK_CMP=$(curl -sf -X POST "$API/complaints/public/track?tenantCode=demo-desa" -H 'Content-Type: application/json' \
  -d "{\"ticket\":\"PGD-$CMP_PREFIX\",\"reporterPhone\":\"08123456789\"}" 2>/dev/null || echo '{}')
TRACK_OK=$(echo "$TRACK_CMP" | grep -c success || true)
TRACK_TICKET=$(echo "$TRACK_CMP" | json_field "console.log(j.data?.ticket||'')")
check "Complaints public track" "$([ "$TRACK_OK" -ge 1 ] && [ -n "$TRACK_TICKET" ] && echo 1 || echo 0)"

VERIFY_CMP=$(curl -sf -X PATCH "$API/complaints/$CMP_ID/status" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"status":"verified"}' | grep -c success || true)
check "Complaints verify status" "$([ "$VERIFY_CMP" -ge 1 ] && echo 1 || echo 0)"

ADMIN_ID=$(echo "$LOGIN_RESP" | json_field "console.log(j.data?.user?.id||'')")
ASSIGN_CMP=$(curl -sf -X PATCH "$API/complaints/$CMP_ID/assign" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"assigneeId\":\"$ADMIN_ID\"}" | grep -c success || true)
check "Complaints assign" "$([ "$ASSIGN_CMP" -ge 1 ] && echo 1 || echo 0)"

RESP_CMP=$(curl -sf -X POST "$API/complaints/$CMP_ID/responses" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"response":"Ditindaklanjuti oleh smoke test","status":"resolved"}' | grep -c success || true)
check "Complaints add response" "$([ "$RESP_CMP" -ge 1 ] && echo 1 || echo 0)"

# 13. Regency admin overview (Wave 10)
REGENCY_LOGIN=$(curl -sf -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"admin.kab@demo-kabupaten.id\",\"password\":\"$ADMIN_PASSWORD\"}" 2>/dev/null || echo '{}')
REGENCY_ACCESS=$(echo "$REGENCY_LOGIN" | json_field "console.log(j.data?.accessToken||'')")
REGENCY_AUTH="Authorization: Bearer $REGENCY_ACCESS"
REGENCY_OVERVIEW=$(curl -sf -H "$REGENCY_AUTH" "$API/tenants/regency/overview" 2>/dev/null | grep -c success || true)
check "Regency admin overview" "$([ -n "$REGENCY_ACCESS" ] && [ "$REGENCY_OVERVIEW" -ge 1 ] && echo 1 || echo 0)"

# 13b. District admin overview (Wave 18)
DISTRICT_LOGIN=$(curl -sf -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"admin.kec@demo-kecamatan.id\",\"password\":\"$ADMIN_PASSWORD\"}" 2>/dev/null || echo '{}')
DISTRICT_ACCESS=$(echo "$DISTRICT_LOGIN" | json_field "console.log(j.data?.accessToken||'')")
DISTRICT_AUTH="Authorization: Bearer $DISTRICT_ACCESS"
DISTRICT_OVERVIEW=$(curl -sf -H "$DISTRICT_AUTH" "$API/tenants/district/overview" 2>/dev/null | grep -c success || true)
check "District admin overview" "$([ -n "$DISTRICT_ACCESS" ] && [ "$DISTRICT_OVERVIEW" -ge 1 ] && echo 1 || echo 0)"

# 13c. Complaints SLA stats (Wave 19)
SLA_STATS=$(curl -sf -H "$AUTH" "$API/complaints/sla-stats" 2>/dev/null | grep -c success || true)
check "Complaints SLA stats" "$([ "$SLA_STATS" -ge 1 ] && echo 1 || echo 0)"

# 14. Logout
LOGOUT=$(curl -sf -X POST "$API/auth/logout" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$REFRESH\"}" | grep -c success || true)
check "Logout" "$([ "$LOGOUT" -ge 1 ] && echo 1 || echo 0)"

# Cleanup
curl -sf -X DELETE -H "$AUTH" "$API/residents/$RES_ID" >/dev/null 2>&1 || true
curl -sf -X DELETE -H "$AUTH" "$API/families/$FAM_ID" >/dev/null 2>&1 || true

echo ""
echo "Smoke test summary: PASS=$PASS FAIL=$FAIL"
echo "Note: after prisma:seed or RBAC changes, admin must re-login to refresh JWT permissions."
exit $([ "$FAIL" -eq 0 ] && echo 0 || echo 1)
