import { sql, type SQLWrapper } from "drizzle-orm";

export function normalizeItemNameSql(name: SQLWrapper) {
  return sql<string>`lower(trim(regexp_replace(${name}, '\\s+', ' ', 'g')))`;
}
