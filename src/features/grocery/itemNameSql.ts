import { sql, type SQLWrapper } from "drizzle-orm";

// Match the whitespace trimmed and collapsed by JavaScript's \s.
const whitespace =
  "\t\n\v\f\r\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff";

export function normalizeItemNameSql(name: SQLWrapper) {
  return sql<string>`lower(trim(regexp_replace(
    translate(${name}, ${whitespace}, ${" ".repeat(whitespace.length)}), ' +', ' ', 'g'
  )))`;
}
