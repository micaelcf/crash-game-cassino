import { ArrowLeftIcon, ArrowRightIcon } from "@phosphor-icons/react";
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

	return (
		<div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
			<div className="flex flex-col gap-0.5">
				<span className="font-mono text-[10px] uppercase tracking-[0.25em] text-fg-dim">
					{totalPages != null
						? `Page ${page} of ${totalPages}`
						: `Page ${page}`}
				</span>
				{totalItems != null && rangeStart != null && rangeEnd != null && (
					<span className="font-mono text-[10px] text-fg-dim">
						{rangeStart}–{rangeEnd} of {totalItems}
					</span>
				)}
			</div>
			<div className="flex gap-2 sm:justify-end">
				<Button
					variant="secondary"
					size="sm"
					onClick={() => onPageChange(1)}
					disabled={!canPrev}
					aria-label="First page">
					«
				</Button>
				<Button
					variant="secondary"
					size="sm"
					onClick={() => onPageChange(Math.max(1, page - 1))}
					disabled={!canPrev}>
					<ArrowLeftIcon size={12} weight="bold" />
					Prev
				</Button>
				<Button
					variant="secondary"
					size="sm"
					onClick={() => onPageChange(page + 1)}
					disabled={!canNext}>
					Next
					<ArrowRightIcon size={12} weight="bold" />
				</Button>
				{totalPages != null && (
					<Button
						variant="secondary"
						size="sm"
						onClick={() => onPageChange(totalPages)}
						disabled={!canNext}
						aria-label="Last page">
						»
					</Button>
				)}
			</div>
		</div>
	);
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
