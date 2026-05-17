import type { MikroORM } from '@mikro-orm/core';

export const truncateAllTables = async (orm: MikroORM): Promise<void> => {
  const metadata = orm.getMetadata();
  const tableNames = Object.values(metadata.getAll())
    .filter((meta: any) => !meta.abstract && meta.tableName)
    .map((meta: any) => meta.tableName as string);

  if (tableNames.length === 0) return;

  const quoted = tableNames.map((t) => `"${t}"`).join(', ');
  await orm.em
    .getConnection()
    .execute(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);
  orm.em.clear();
};
