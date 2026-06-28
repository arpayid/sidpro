-- Post-migration production verification for the append-only realization ledger.
-- Expected result: zero rows.

SELECT
  'budget_items.realized_cache' AS relation,
  bi.id AS source_id,
  bi.realized::text AS cached_realized,
  COALESCE(
    SUM(
      CASE
        WHEN bre.entry_type = 'reversal' THEN -bre.amount
        ELSE bre.amount
      END
    ),
    0
  )::text AS ledger_realized
FROM budget_items bi
LEFT JOIN budget_realization_entries bre ON bre.budget_item_id = bi.id
GROUP BY bi.id, bi.realized
HAVING bi.realized <> COALESCE(
  SUM(
    CASE
      WHEN bre.entry_type = 'reversal' THEN -bre.amount
      ELSE bre.amount
    END
  ),
  0
)

UNION ALL

SELECT
  'budget_realization_entries.opening_balance_count',
  bre.budget_item_id,
  COUNT(*)::text,
  'expected at most one'
FROM budget_realization_entries bre
WHERE bre.entry_type = 'migration_opening_balance'
GROUP BY bre.budget_item_id
HAVING COUNT(*) > 1

UNION ALL

SELECT
  'budget_realization_entries.opening_balance_author',
  bre.id,
  COALESCE(bre.created_by, 'NULL'),
  'expected NULL'
FROM budget_realization_entries bre
WHERE bre.entry_type = 'migration_opening_balance'
  AND bre.created_by IS NOT NULL

UNION ALL

SELECT
  'budget_items.negative_realized',
  bi.id,
  bi.realized::text,
  'expected >= 0'
FROM budget_items bi
WHERE bi.realized < 0

ORDER BY relation, source_id;
