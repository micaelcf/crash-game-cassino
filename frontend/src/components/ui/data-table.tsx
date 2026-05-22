import {
	CaretDoubleLeftIcon,
	CaretDoubleRightIcon,
	CaretLeftIcon,
	CaretRightIcon,
} from "@phosphor-icons/react";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import type { ReactNode } from "react";
import { Button } from "./button";

export interface DataTablePagination {
	page: number;
	pageSize: number;
	onPageChange: (next: number) => void;
	/** Total row count across all pages. When set, drives Page X of Y + Next disabled. */
	totalItems?: number;
	/** Fallback when totalItems unknown: caller asserts more pages exist. */
	hasMore?: boolean;
}

export interface DataTableProps<TData> {
	columns: ColumnDef<TData, unknown>[];
	data: TData[];
	isLoading?: boolean;
	emptyMessage?: ReactNode;
	pagination?: DataTablePagination;
	mobileCard?: (row: TData) => ReactNode;
	getRowId?: (row: TData) => string;
}

export function DataTable<TData>({
	columns,
	data,
	isLoading,
	emptyMessage,
	pagination,
	mobileCard,
	getRowId,
}: DataTableProps<TData>) {
	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		manualPagination: true,
		getRowId,
	});

	if (isLoading) {
		return <DataTableSkeleton rows={6} columns={columns.length} />;
	}

	if (data.length === 0) {
		return (
			<div className="rounded-(--radius-card) bg-bg-1 p-12 text-center text-sm text-fg-muted ring-1 ring-inset ring-border/60">
				{emptyMessage ?? "Nothing here yet."}
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="hidden overflow-hidden rounded-(--radius-card) bg-bg-1 ring-1 ring-inset ring-border/60 shadow-(--shadow-card) md:block">
				<table className="w-full text-sm">
					<thead className="text-[10px] font-bold uppercase tracking-[0.25em] text-fg-dim">
						{table.getHeaderGroups().map((headerGroup) => (
							<tr key={headerGroup.id} className="border-b border-border/60">
								{headerGroup.headers.map((header) => {
									const align = (
										header.column.columnDef.meta as
											| { align?: "left" | "right" | "center" }
											| undefined
									)?.align;
									return (
										<th
											key={header.id}
											className={
												align === "right"
													? "px-5 py-3 text-right"
													: align === "center"
														? "px-5 py-3 text-center"
														: "px-5 py-3 text-left"
											}>
											{header.isPlaceholder
												? null
												: flexRender(
														header.column.columnDef.header,
														header.getContext(),
													)}
										</th>
									);
								})}
							</tr>
						))}
					</thead>
					<tbody>
						{table.getRowModel().rows.map((row) => (
							<tr
								key={row.id}
								className="border-b border-border/40 transition-colors last:border-0 hover:bg-bg-2/50">
								{row.getVisibleCells().map((cell) => {
									const align = (
										cell.column.columnDef.meta as
											| { align?: "left" | "right" | "center" }
											| undefined
									)?.align;
									return (
										<td
											key={cell.id}
											className={
												align === "right"
													? "px-5 py-3 text-right"
													: align === "center"
														? "px-5 py-3 text-center"
														: "px-5 py-3 text-left"
											}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{mobileCard && (
				<ul className="flex flex-col gap-2 md:hidden">
					{table.getRowModel().rows.map((row) => (
						<li key={row.id}>{mobileCard(row.original)}</li>
					))}
				</ul>
			)}

			{pagination && (
				<DataTablePager pagination={pagination} dataLength={data.length} />
			)}
		</div>
	);
}

function DataTablePager({
	pagination,
	dataLength,
}: {
	pagination: DataTablePagination;
	dataLength: number;
}) {
	const { page, pageSize, onPageChange, totalItems, hasMore } = pagination;
	const totalPages =
		totalItems != null && totalItems > 0
			? Math.max(1, Math.ceil(totalItems / pageSize))
			: null;
	const canPrev = page > 1;
	const canNext =
		totalPages != null
			? page < totalPages
			: (hasMore ?? dataLength === pageSize);

	const rangeStart =
		totalItems != null && totalItems > 0
			? Math.min(totalItems, (page - 1) * pageSize + 1)
			: null;
	const rangeEnd =
		totalItems != null && totalItems > 0
			? Math.min(totalItems, (page - 1) * pageSize + dataLength)
			: null;

	const tokens = totalPages != null ? buildPageTokens(page, totalPages) : null;

	return (
		<nav
			aria-label="Pagination"
			className="flex flex-col items-stretch justify-between gap-4 border-t border-border/60 pt-4 sm:flex-row sm:items-center">
			<p className="text-sm text-fg-muted">
				{totalItems != null && rangeStart != null && rangeEnd != null ? (
					<>
						Showing{" "}
						<span className="font-semibold text-fg">{rangeStart}</span>
						<span className="text-fg-dim">–</span>
						<span className="font-semibold text-fg">{rangeEnd}</span>{" "}
						<span className="text-fg-dim">of</span>{" "}
						<span className="font-semibold text-fg">{totalItems}</span>
					</>
				) : (
					<>
						<span className="text-fg-dim">Page</span>{" "}
						<span className="font-semibold text-fg">{page}</span>
					</>
				)}
			</p>

			<div className="flex items-center gap-1.5 sm:justify-end">
				<Button
					variant="ghost"
					size="sm"
					onClick={() => onPageChange(1)}
					disabled={!canPrev}
					aria-label="First page">
					<CaretDoubleLeftIcon size={16} weight="bold" />
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => onPageChange(Math.max(1, page - 1))}
					disabled={!canPrev}
					aria-label="Previous page">
					<CaretLeftIcon size={16} weight="bold" />
					<span className="hidden sm:inline">Previous</span>
				</Button>

				{tokens && (
					<ul className="hidden items-center gap-1 sm:flex">
						{tokens.map((tok, idx) =>
							tok === "…" ? (
								<li
									// biome-ignore lint/suspicious/noArrayIndexKey: ellipsis tokens have no stable id; window is small and re-renders cheaply.
									key={`ellipsis-${idx}`}
									aria-hidden="true"
									className="px-2 text-sm text-fg-dim">
									…
								</li>
							) : (
								<li key={tok}>
									<Button
										variant={tok === page ? "primary" : "ghost"}
										size="sm"
										aria-current={tok === page ? "page" : undefined}
										aria-label={`Page ${tok}`}
										onClick={() => onPageChange(tok)}
										className="min-w-9 font-mono tabular-nums">
										{tok}
									</Button>
								</li>
							),
						)}
					</ul>
				)}

				<Button
					variant="ghost"
					size="sm"
					onClick={() => onPageChange(page + 1)}
					disabled={!canNext}
					aria-label="Next page">
					<span className="hidden sm:inline">Next</span>
					<CaretRightIcon size={16} weight="bold" />
				</Button>
				{totalPages != null && (
					<Button
						variant="ghost"
						size="sm"
						onClick={() => onPageChange(totalPages)}
						disabled={!canNext}
						aria-label="Last page">
						<CaretDoubleRightIcon size={16} weight="bold" />
					</Button>
				)}
			</div>
		</nav>
	);
}

/**
 * Compute the visible page tokens around the current page.
 *
 * Returns a list mixing page numbers and `"…"` ellipsis markers. Keeps a
 * fixed-width window so the pager doesn't reflow as the user paginates.
 * Examples (page = 1, total = 1):  [1]
 *           (page = 4, total = 10): [1, "…", 3, 4, 5, "…", 10]
 *           (page = 1, total = 5):  [1, 2, 3, 4, 5]
 */
function buildPageTokens(
	page: number,
	totalPages: number,
): Array<number | "…"> {
	if (totalPages <= 7) {
		return Array.from({ length: totalPages }, (_, i) => i + 1);
	}
	const tokens: Array<number | "…"> = [1];
	const start = Math.max(2, page - 1);
	const end = Math.min(totalPages - 1, page + 1);
	if (start > 2) tokens.push("…");
	for (let i = start; i <= end; i++) tokens.push(i);
	if (end < totalPages - 1) tokens.push("…");
	tokens.push(totalPages);
	return tokens;
}

function DataTableSkeleton({
	rows,
	columns,
}: {
	rows: number;
	columns: number;
}) {
	return (
		<div className="overflow-hidden rounded-(--radius-card) bg-bg-1 ring-1 ring-inset ring-border/60">
			<div className="divide-y divide-border/40">
				{Array.from({ length: rows }, (_, i) => `skel-${i}`).map((id) => (
					<div
						key={id}
						className="grid gap-3 px-5 py-3"
						style={{
							gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
						}}>
						{Array.from({ length: columns }, (_, j) => `cell-${j}`).map(
							(cellId) => (
								<div
									key={cellId}
									className="h-4 animate-pulse rounded bg-bg-2/60"
								/>
							),
						)}
					</div>
				))}
			</div>
		</div>
	);
}
