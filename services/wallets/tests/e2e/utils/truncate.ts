import type { MikroORM } from '@mikro-orm/core';

export const truncateAllTables = async (orm: MikroORM): Promise<void> => {
  const conn = orm.em.getConnection();
  const rows = await conn.execute<{ tablename: string }[]>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE 'mikro_orm_%'`,
  );
  const tableNames = rows.map((r) => r.tablename);
  if (tableNames.length === 0) return;

  const quoted = tableNames.map((t) => `"${t}"`).join(', ');
  await conn.execute(
    `TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`,
  );
};
