import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MiniCalendarProps {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
}

export default function MiniCalendar({ selectedDate, onSelectDate }: MiniCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const renderHeader = () => {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <button type="button" onClick={prevMonth} className="btn-icon">
          <ChevronLeft size={20} />
        </button>
        <div style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </div>
        <button type="button" onClick={nextMonth} className="btn-icon">
          <ChevronRight size={20} />
        </button>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const startDate = startOfWeek(currentMonth, { weekStartsOn: 0 }); // Sunday

    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--text-tertiary)', padding: 'var(--space-2) 0' }}>
          {format(addDays(startDate, i), 'EEEEEE', { locale: ptBR })}
        </div>
      );
    }
    return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = '';

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, 'd');
        const cloneDay = day;
        const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
        const isCurrentMonth = isSameMonth(day, monthStart);

        days.push(
          <div
            key={day.toString()}
            onClick={() => onSelectDate(cloneDay)}
            style={{
              padding: '10px 5px',
              textAlign: 'center',
              cursor: 'pointer',
              borderRadius: 'var(--radius-md)',
              backgroundColor: isSelected ? 'var(--primary)' : 'transparent',
              color: isSelected 
                ? 'white' 
                : !isCurrentMonth 
                  ? 'var(--text-tertiary)' 
                  : 'var(--text-primary)',
              fontWeight: isSelected ? 'bold' : 'normal',
            }}
            onMouseOver={(e) => {
              if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--background-secondary)';
            }}
            onMouseOut={(e) => {
              if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span>{formattedDate}</span>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'var(--space-1)', marginBottom: 'var(--space-1)' }}>
          {days}
        </div>
      );
      days = [];
    }
    return <div>{rows}</div>;
  };

  return (
    <div style={{ backgroundColor: 'var(--background-primary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  );
}
