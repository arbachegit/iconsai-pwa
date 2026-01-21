import React, { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Download, Filter, X, MessageCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface TableData {
  headers: string[];
  rows: string[][];
}

interface InteractiveTableProps {
  data: TableData;
  className?: string;
}

type SortDirection = 'asc' | 'desc' | null;

export const InteractiveTable = ({ data, className }: InteractiveTableProps) => {
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filters, setFilters] = useState<Record<number, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  // Parse numeric values for proper sorting
  const parseValue = (value: string): number | string => {
    const cleaned = value.replace(/[,%$€R\$]/g, '').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? value.toLowerCase() : num;
  };

  // Filter and sort rows
  const processedRows = useMemo(() => {
    let result = [...data.rows];

    // Apply filters
    Object.entries(filters).forEach(([colIndex, filterValue]) => {
      if (filterValue) {
        result = result.filter(row => 
          row[parseInt(colIndex)]?.toLowerCase().includes(filterValue.toLowerCase())
        );
      }
    });

    // Apply sorting
    if (sortColumn !== null && sortDirection) {
      result.sort((a, b) => {
        const aVal = parseValue(a[sortColumn] || '');
        const bVal = parseValue(b[sortColumn] || '');
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        const comparison = String(aVal).localeCompare(String(bVal));
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data.rows, filters, sortColumn, sortDirection]);

  const handleSort = (colIndex: number) => {
    if (sortColumn === colIndex) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortColumn(colIndex);
      setSortDirection('asc');
    }
  };

  const handleFilterChange = (colIndex: number, value: string) => {
    setFilters(prev => ({
      ...prev,
      [colIndex]: value
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const exportToCSV = () => {
    const csvContent = [
      data.headers.join(','),
      ...processedRows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tabela_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToExcel = () => {
    // Create HTML table for Excel
    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="UTF-8"></head>
      <body>
        <table border="1">
          <thead><tr>${data.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
          <tbody>${processedRows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tabela_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
  };

  const shareViaWhatsApp = () => {
    const text = `📊 Tabela\n\n${data.headers.join(' | ')}\n${processedRows.map(row => row.join(' | ')).join('\n')}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const shareViaEmail = () => {
    const subject = 'Tabela exportada';
    const body = `📊 Tabela\n\n${data.headers.join(' | ')}\n${processedRows.map(row => row.join(' | ')).join('\n')}`;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank');
  };

  const hasActiveFilters = Object.values(filters).some(v => v);

  const getSortIcon = (colIndex: number) => {
    if (sortColumn !== colIndex) return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    if (sortDirection === 'asc') return <ArrowUp className="h-3 w-3 text-primary" />;
    return <ArrowDown className="h-3 w-3 text-primary" />;
  };

  return (
    <div className={cn("my-3 rounded-lg border border-border/50 overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/30 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-7 text-xs"
          >
            <Filter className="h-3 w-3 mr-1" />
            Filtros
            {hasActiveFilters && (
              <span className="ml-1 px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full text-[10px]">
                {Object.values(filters).filter(v => v).length}
              </span>
            )}
          </Button>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-7 text-xs text-muted-foreground"
            >
              <X className="h-3 w-3 mr-1" />
              Limpar
            </Button>
          )}
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              <Download className="h-3 w-3 mr-1" />
              Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" /> CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportToExcel}>
              <Download className="h-4 w-4 mr-2" /> Excel
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={shareViaWhatsApp}>
              <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
            </DropdownMenuItem>
            <DropdownMenuItem onClick={shareViaEmail}>
              <Mail className="h-4 w-4 mr-2" /> Email
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filter Row */}
      {showFilters && (
        <div className="flex gap-1 px-2 py-2 bg-muted/20 border-b border-border/50 overflow-x-auto">
          {data.headers.map((header, idx) => (
            <Input
              key={idx}
              placeholder={`Filtrar ${header}...`}
              value={filters[idx] || ''}
              onChange={(e) => handleFilterChange(idx, e.target.value)}
              className="h-7 text-xs min-w-[100px] flex-1"
            />
          ))}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50">
              {data.headers.map((header, idx) => (
                <th
                  key={idx}
                  onClick={() => handleSort(idx)}
                  className="px-3 py-2 text-left font-semibold cursor-pointer hover:bg-muted/80 transition-colors select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    {header}
                    {getSortIcon(idx)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {processedRows.length === 0 ? (
              <tr>
                <td colSpan={data.headers.length} className="px-3 py-4 text-center text-muted-foreground">
                  Nenhum resultado encontrado
                </td>
              </tr>
            ) : (
              processedRows.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className={cn(
                    "border-t border-border/30 transition-colors",
                    rowIdx % 2 === 0 ? "bg-background" : "bg-muted/10",
                    "hover:bg-muted/30"
                  )}
                >
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="px-3 py-2 whitespace-nowrap">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 text-[10px] text-muted-foreground bg-muted/20 border-t border-border/50">
        {processedRows.length} de {data.rows.length} linhas
        {hasActiveFilters && ' (filtrado)'}
      </div>
    </div>
  );
};

// Utility to parse markdown table to structured data
export const parseMarkdownTable = (tableHtml: string): TableData | null => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(tableHtml, 'text/html');
    
    const headerCells = doc.querySelectorAll('thead th, thead td');
    const headers = Array.from(headerCells).map(cell => cell.textContent?.trim() || '');
    
    if (headers.length === 0) return null;
    
    const bodyRows = doc.querySelectorAll('tbody tr');
    const rows = Array.from(bodyRows).map(row => {
      const cells = row.querySelectorAll('td, th');
      return Array.from(cells).map(cell => cell.textContent?.trim() || '');
    });
    
    return { headers, rows };
  } catch {
    return null;
  }
};
