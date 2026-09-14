"use client";

import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
import { pageItems } from "./paginate";

type HistoryPaginationProps = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
};

/**
 * Page buttons for the history.
 *
 * Built from the shadcn Pagination layout parts, but not its PaginationLink:
 * that one renders an <a>, and these pages are client state rather than URLs,
 * so an anchor without an href would be unreachable by keyboard.
 */
export function HistoryPagination({
  page,
  pageCount,
  onPageChange,
}: HistoryPaginationProps) {
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <Button
            aria-label="Vorherige Seite"
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
            size="icon"
            variant="ghost"
          >
            <span aria-hidden="true">‹</span>
          </Button>
        </PaginationItem>

        {pageItems(page, pageCount).map((item, index) =>
          item === null ? (
            <PaginationItem key={`gap-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={item}>
              <Button
                aria-current={item === page ? "page" : undefined}
                aria-label={`Seite ${item}`}
                className="tabular-nums"
                onClick={() => onPageChange(item)}
                size="icon"
                variant={item === page ? "outline" : "ghost"}
              >
                {item}
              </Button>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <Button
            aria-label="Nächste Seite"
            disabled={page === pageCount}
            onClick={() => onPageChange(page + 1)}
            size="icon"
            variant="ghost"
          >
            <span aria-hidden="true">›</span>
          </Button>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
