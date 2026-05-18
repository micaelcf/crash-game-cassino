import type { MikroORM } from '@mikro-orm/core'

interface PgTableRow {
	tablename: string
}

export const truncateAllTables = async (orm: MikroORM): Promise<void> => {
	const conn = orm.em.getConnection()
	const rows = (await conn.execute(
		`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE 'mikro_orm_%'`,
	)) as PgTableRow[]
	const tableNames = rows.map((r: PgTableRow) => r.tablename)
	if (tableNames.length === 0) return

	const quoted = tableNames.map((t: string) => `"${t}"`).join(', ')
	await conn.execute(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`)
}
