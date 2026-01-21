import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type DatePeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
  period: DatePeriod;
}

interface DateSyncContextType {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  updateDates: (start: Date, end: Date) => void;
  updatePeriod: (period: DatePeriod) => void;
}

const DateSyncContext = createContext<DateSyncContextType | undefined>(undefined);

export function DateSyncProvider({ children }: { children: ReactNode }) {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().getFullYear() - 5, 0, 1), // 5 years ago
    endDate: new Date(),
    period: 'monthly',
  });

  const updateDates = useCallback((start: Date, end: Date) => {
    setDateRange(prev => ({ ...prev, startDate: start, endDate: end }));
  }, []);

  const updatePeriod = useCallback((period: DatePeriod) => {
    setDateRange(prev => ({ ...prev, period }));
  }, []);

  return (
    <DateSyncContext.Provider value={{ dateRange, setDateRange, updateDates, updatePeriod }}>
      {children}
    </DateSyncContext.Provider>
  );
}

export function useDateSync() {
  const context = useContext(DateSyncContext);
  if (!context) {
    throw new Error('useDateSync must be used within DateSyncProvider');
  }
  return context;
}
