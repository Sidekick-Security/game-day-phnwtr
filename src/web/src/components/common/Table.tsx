import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Table as MuiTable,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Checkbox,
  Box,
  useTheme,
} from '@mui/material'; // ^5.0.0
import { styled } from '@mui/material/styles'; // ^5.0.0
import { defaultTheme } from '../../assets/styles/theme';
import Loading from './Loading';

// Constants
const DEFAULT_ROWS_PER_PAGE = 10;
const DEFAULT_ROWS_PER_PAGE_OPTIONS = [5, 10, 25, 50];
const VIRTUAL_SCROLL_BUFFER_SIZE = 5;
const MIN_COLUMN_WIDTH = 50;
const DEFAULT_ROW_HEIGHT = 48;

// Interfaces
interface Column {
  id: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  format?: (value: any) => React.ReactNode;
  width?: string | number;
  resizable?: boolean;
  minWidth?: number;
  maxWidth?: number;
  headerClassName?: string;
  cellClassName?: string;
  renderCell?: (row: any) => React.ReactNode;
}

interface TableProps {
  columns: Array<Column>;
  data: Array<any>;
  loading?: boolean;
  pagination?: boolean;
  defaultSort?: string;
  defaultOrder?: 'asc' | 'desc';
  onSort?: (column: string, order: string) => void;
  onPageChange?: (page: number, rowsPerPage: number) => void;
  rowsPerPageOptions?: Array<number>;
  totalCount?: number;
  emptyMessage?: string;
  stickyHeader?: boolean;
  maxHeight?: string | number;
  onRowClick?: (row: any) => void;
  selectable?: boolean;
  onSelectionChange?: (selectedRows: Array<any>) => void;
  getRowId?: (row: any) => string | number;
  virtualScroll?: boolean;
  rowHeight?: number;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

// Styled Components
const StyledTableContainer = styled(TableContainer)(({ theme, maxHeight }) => ({
  position: 'relative',
  maxHeight,
  overflow: 'auto',
  '&:focus': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },
  // Scrollbar styling for better visibility
  '&::-webkit-scrollbar': {
    width: 8,
    height: 8,
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: theme.palette.background.default,
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: theme.palette.grey[400],
    borderRadius: 4,
  },
}));

const StyledTableCell = styled(TableCell)(({ theme, align, width }) => ({
  padding: theme.spacing(1, 2),
  textAlign: align || 'left',
  width,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  '&:focus-within': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: -2,
  },
}));

// Main Component
const Table: React.FC<TableProps> = React.memo(({
  columns,
  data,
  loading = false,
  pagination = true,
  defaultSort,
  defaultOrder = 'asc',
  onSort,
  onPageChange,
  rowsPerPageOptions = DEFAULT_ROWS_PER_PAGE_OPTIONS,
  totalCount,
  emptyMessage = 'No data available',
  stickyHeader = true,
  maxHeight,
  onRowClick,
  selectable = false,
  onSelectionChange,
  getRowId = (row: any) => row.id,
  virtualScroll = false,
  rowHeight = DEFAULT_ROW_HEIGHT,
  ariaLabel = 'Data table',
  ariaDescribedBy,
}) => {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State management
  const [orderBy, setOrderBy] = useState<string>(defaultSort || '');
  const [order, setOrder] = useState<'asc' | 'desc'>(defaultOrder);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
  const [selected, setSelected] = useState<Array<string | number>>([]);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });

  // Memoized sorted data
  const sortedData = useMemo(() => {
    if (!orderBy) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[orderBy];
      const bValue = b[orderBy];
      
      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      const comparison = aValue < bValue ? -1 : 1;
      return order === 'asc' ? comparison : -comparison;
    });
  }, [data, orderBy, order]);

  // Virtual scrolling calculations
  useEffect(() => {
    if (!virtualScroll || !containerRef.current) return;

    const calculateVisibleRange = () => {
      const container = containerRef.current;
      if (!container) return;

      const scrollTop = container.scrollTop;
      const start = Math.floor(scrollTop / rowHeight);
      const visibleRows = Math.ceil(container.clientHeight / rowHeight);
      const bufferedStart = Math.max(0, start - VIRTUAL_SCROLL_BUFFER_SIZE);
      const bufferedEnd = Math.min(
        data.length,
        start + visibleRows + VIRTUAL_SCROLL_BUFFER_SIZE
      );

      setVisibleRange({ start: bufferedStart, end: bufferedEnd });
    };

    const handleScroll = () => {
      window.requestAnimationFrame(calculateVisibleRange);
    };

    calculateVisibleRange();
    containerRef.current.addEventListener('scroll', handleScroll);

    return () => {
      containerRef.current?.removeEventListener('scroll', handleScroll);
    };
  }, [virtualScroll, data.length, rowHeight]);

  // Event handlers
  const handleSort = useCallback((column: string) => {
    const isAsc = orderBy === column && order === 'asc';
    const newOrder = isAsc ? 'desc' : 'asc';
    setOrderBy(column);
    setOrder(newOrder);
    onSort?.(column, newOrder);
  }, [orderBy, order, onSort]);

  const handlePageChange = useCallback((event: unknown, newPage: number) => {
    setPage(newPage);
    onPageChange?.(newPage, rowsPerPage);
  }, [rowsPerPage, onPageChange]);

  const handleRowsPerPageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    onPageChange?.(0, newRowsPerPage);
  }, [onPageChange]);

  const handleSelectAllClick = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = data.map(row => getRowId(row));
      setSelected(newSelected);
      onSelectionChange?.(data);
    } else {
      setSelected([]);
      onSelectionChange?.([]);
    }
  }, [data, getRowId, onSelectionChange]);

  const handleRowSelect = useCallback((row: any) => {
    const id = getRowId(row);
    const selectedIndex = selected.indexOf(id);
    let newSelected: Array<string | number> = [];

    if (selectedIndex === -1) {
      newSelected = [...selected, id];
    } else {
      newSelected = selected.filter(item => item !== id);
    }

    setSelected(newSelected);
    onSelectionChange?.(data.filter(item => newSelected.includes(getRowId(item))));
  }, [selected, data, getRowId, onSelectionChange]);

  // Render functions
  const renderTableHeader = () => (
    <TableHead>
      <TableRow>
        {selectable && (
          <StyledTableCell padding="checkbox">
            <Checkbox
              indeterminate={selected.length > 0 && selected.length < data.length}
              checked={data.length > 0 && selected.length === data.length}
              onChange={handleSelectAllClick}
              inputProps={{
                'aria-label': 'select all rows',
              }}
            />
          </StyledTableCell>
        )}
        {columns.map(column => (
          <StyledTableCell
            key={column.id}
            align={column.align}
            width={column.width}
            className={column.headerClassName}
            style={{
              minWidth: column.minWidth,
              maxWidth: column.maxWidth,
            }}
          >
            {column.sortable ? (
              <TableSortLabel
                active={orderBy === column.id}
                direction={orderBy === column.id ? order : 'asc'}
                onClick={() => handleSort(column.id)}
              >
                {column.label}
              </TableSortLabel>
            ) : (
              column.label
            )}
          </StyledTableCell>
        ))}
      </TableRow>
    </TableHead>
  );

  const renderTableBody = () => {
    const displayData = virtualScroll
      ? sortedData.slice(visibleRange.start, visibleRange.end)
      : pagination
      ? sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
      : sortedData;

    return (
      <TableBody>
        {displayData.length === 0 ? (
          <TableRow>
            <StyledTableCell
              colSpan={columns.length + (selectable ? 1 : 0)}
              align="center"
            >
              {loading ? <Loading size="small" /> : emptyMessage}
            </StyledTableCell>
          </TableRow>
        ) : (
          displayData.map((row, index) => {
            const id = getRowId(row);
            const isSelected = selected.includes(id);

            return (
              <TableRow
                hover
                key={id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                selected={isSelected}
                style={virtualScroll ? { height: rowHeight } : undefined}
                role="row"
                aria-selected={isSelected}
              >
                {selectable && (
                  <StyledTableCell padding="checkbox">
                    <Checkbox
                      checked={isSelected}
                      onChange={() => handleRowSelect(row)}
                      inputProps={{
                        'aria-label': `select row ${index + 1}`,
                      }}
                    />
                  </StyledTableCell>
                )}
                {columns.map(column => (
                  <StyledTableCell
                    key={`${id}-${column.id}`}
                    align={column.align}
                    className={column.cellClassName}
                  >
                    {column.renderCell
                      ? column.renderCell(row)
                      : column.format
                      ? column.format(row[column.id])
                      : row[column.id]}
                  </StyledTableCell>
                ))}
              </TableRow>
            );
          })
        )}
      </TableBody>
    );
  };

  return (
    <Box>
      <StyledTableContainer
        ref={containerRef}
        maxHeight={maxHeight}
        role="grid"
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        tabIndex={0}
      >
        <MuiTable stickyHeader={stickyHeader} aria-label={ariaLabel}>
          {renderTableHeader()}
          {renderTableBody()}
        </MuiTable>
      </StyledTableContainer>
      
      {pagination && (
        <TablePagination
          rowsPerPageOptions={rowsPerPageOptions}
          component="div"
          count={totalCount || data.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`
          }
        />
      )}
    </Box>
  );
});

Table.displayName = 'Table';

export default Table;