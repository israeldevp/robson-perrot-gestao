
import React from 'react';
import { Appointment, AppointmentStatus } from '../types';
import { DatePicker } from './DatePicker';

interface AppointmentListProps {
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
  onQuickTogglePay: (id: string, currentStatus: boolean) => void;
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
}

export const AppointmentList: React.FC<AppointmentListProps> = ({
  appointments,
  onAppointmentClick,
  onQuickTogglePay,
  selectedDate,
  onDateChange
}) => {

  // Use provided date or default to today
  const activeDate = selectedDate || new Date();

  // Filter appointments for the specific day
  const dailyAppointments = appointments.filter(apt => {
    return (
      apt.timestamp.getDate() === activeDate.getDate() &&
      apt.timestamp.getMonth() === activeDate.getMonth() &&
      apt.timestamp.getFullYear() === activeDate.getFullYear()
    );
  });

  const getStatusLabel = (status: AppointmentStatus) => {
    switch (status) {
      case AppointmentStatus.COMPLETED:
        return 'FEITO';
      case AppointmentStatus.SCHEDULED:
        return 'AGENDA';
      case AppointmentStatus.CANCELED:
        return 'CANCELADO';
      case AppointmentStatus.NO_SHOW:
        return 'FALTOU';
      default:
        return status;
    }
  };

  return (
    <div className="px-6 pb-28 pt-4">
      {/* Header with Date Navigation */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-display text-2xl font-black text-white uppercase tracking-tight font-stretch-expanded">Timeline</h2>

        {/* Custom Date Picker Component */}
        <DatePicker
          selectedDate={activeDate}
          onChange={onDateChange}
          variant="header"
        />
      </div>

      {/* List */}
      <div className="space-y-6">
        {dailyAppointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 opacity-50">
            <div className="w-12 h-1 bg-white/10 mb-4 rounded-full"></div>
            <p className="text-brand-muted font-bold uppercase text-xs tracking-widest">Sem agendamentos</p>
          </div>
        ) : (
          dailyAppointments.map((apt) => (
            <div
              key={apt.id}
              className="relative pl-8 before:absolute before:left-[11px] before:top-2 before:bottom-[-24px] before:w-[1px] before:bg-white/10 last:before:hidden"
            >
              {/* Timeline Geometric Marker */}
              <div className={`absolute left-0 top-1 w-6 h-6 flex items-center justify-center bg-brand-onyx border border-brand-concrete z-10 rotate-45`}>
                <div className={`w-2 h-2 ${apt.isPaid ? 'bg-brand-gold shadow-[0_0_10px_rgba(212,175,55,0.5)]' : 'bg-brand-concrete'}`} />
              </div>

              {/* Card - Blocky Concrete Style */}
              <div
                onClick={() => onAppointmentClick(apt)}
                className={`
                  relative p-5 rounded-lg border transition-all cursor-pointer group
                  ${apt.isPaid
                    ? 'bg-brand-concrete/40 border-brand-gold/20'
                    : 'bg-brand-concreteDark border-white/5 hover:border-white/10'
                  }
                `}
              >
                {/* Time & Price Row */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-brand-muted bg-brand-onyx px-2 py-1 rounded border border-white/5">
                      {apt.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-display font-bold text-lg ${apt.isPaid ? 'text-brand-gold' : 'text-white'}`}>
                      R$ {apt.price.toFixed(0)}
                    </span>
                  </div>
                </div>

                {/* Client, Service & Employee */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-sans font-bold text-brand-text text-lg leading-tight">{apt.clientName}</h3>
                    {apt.status !== AppointmentStatus.NO_SHOW && (
                      <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest">{apt.serviceName}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 opacity-60">
                    <div className="w-1 h-1 rounded-full bg-brand-gold"></div>
                    <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Atendido por: <span className="text-white">{apt.employeeName}</span></p>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="mt-5 flex justify-between items-center pt-4 border-t border-dashed border-white/5">
                  <span className={`text-[10px] font-mono uppercase tracking-[0.1em] ${apt.status === AppointmentStatus.NO_SHOW ? 'text-red-500 font-bold' : 'text-brand-muted'}`}>
                    {getStatusLabel(apt.status)}
                  </span>

                  {/* Quick Toggle - Geometric Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickTogglePay(apt.id, apt.isPaid);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-all border ${apt.isPaid
                      ? 'bg-brand-gold text-brand-onyx border-brand-gold'
                      : 'bg-transparent text-brand-muted border-white/10 hover:border-brand-gold hover:text-brand-gold'
                      }`}
                  >
                    {apt.isPaid ? 'Pago' : 'Receber'}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
