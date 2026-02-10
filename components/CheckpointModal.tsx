
import React, { useState, useEffect } from 'react';
import { X, Check, Clock, User, AlertTriangle, Banknote, CreditCard, QrCode, Scissors, Briefcase, RefreshCw } from 'lucide-react';
import { Appointment, AppointmentStatus, PaymentMethod, Employee } from '../types';

interface CheckpointModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onConfirm: (appointmentId: string, finalPrice: number, isPaid: boolean, status: AppointmentStatus, paymentMethod?: PaymentMethod, serviceName?: string, employeeName?: string, newTimestamp?: Date) => void;
  onDelete: (appointment: Appointment) => void;
  employees: Employee[];
}

export const CheckpointModal: React.FC<CheckpointModalProps> = ({ isOpen, onClose, appointment, onConfirm, onDelete, employees }) => {
  const [price, setPrice] = useState<string>('');
  const [serviceName, setServiceName] = useState<string>('');
  const [employeeName, setEmployeeName] = useState<string>('');
  const [timeString, setTimeString] = useState<string>('');
  const [markAsPaid, setMarkAsPaid] = useState<boolean>(false);
  const [isNoShow, setIsNoShow] = useState<boolean>(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | undefined>(undefined);

  useEffect(() => {
    if (appointment) {
      setPrice(appointment.price > 0 ? appointment.price.toString() : '');
      setServiceName(appointment.serviceName);
      setEmployeeName(appointment.employeeName);
      setTimeString(appointment.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setMarkAsPaid(appointment.isPaid);
      setIsNoShow(appointment.status === AppointmentStatus.NO_SHOW);
      setSelectedPaymentMethod(appointment.paymentMethod || PaymentMethod.PIX);
    }
  }, [appointment]);

  if (!isOpen || !appointment) return null;

  const handleConfirm = () => {
    let status = AppointmentStatus.COMPLETED;
    if (isNoShow) {
      status = AppointmentStatus.NO_SHOW;
    }

    const finalPaid = isNoShow ? false : markAsPaid;
    const finalPaymentMethod = finalPaid ? (selectedPaymentMethod || PaymentMethod.PIX) : undefined;

    // Construct new date object preserving the original date but updating time
    const [hours, minutes] = timeString.split(':').map(Number);
    const newTimestamp = new Date(appointment.timestamp);
    newTimestamp.setHours(hours);
    newTimestamp.setMinutes(minutes);

    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice)) {
      alert('Por favor, informe o valor do serviço.');
      return;
    }

    onConfirm(appointment.id, numericPrice, finalPaid, status, finalPaymentMethod, serviceName, employeeName, newTimestamp);
    onClose();
  };

  const cycleEmployee = () => {
    const currentIndex = employees.findIndex(e => e.name === employeeName);
    const nextIndex = (currentIndex + 1) % employees.length;
    setEmployeeName(employees[nextIndex].name);
  };

  const toggleNoShow = () => {
    setIsNoShow(!isNoShow);
    if (!isNoShow) {
      setMarkAsPaid(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-brand-onyx/95 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
      <div className="w-full sm:w-96 bg-brand-concrete border-t sm:border border-white/10 rounded-t-2xl sm:rounded-xl shadow-2xl transform transition-transform animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0">

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-brand-gold"></div>
            <h2 className="font-display font-bold text-lg text-white uppercase tracking-wide">Checkout</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-md text-brand-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">

          {/* Client Block */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-brand-onyx border border-white/10 rounded-full flex items-center justify-center shadow-inner shrink-0">
              <User className="w-6 h-6 text-brand-gold" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-bold text-2xl text-white uppercase tracking-tight leading-none truncate">{appointment.clientName}</h3>
              <div className="flex flex-col mt-0.5">
                <div className="flex items-center gap-1.5">
                  <Briefcase className="w-2.5 h-2.5 text-brand-gold" />
                  <p className="text-[10px] font-black text-brand-gold uppercase tracking-[0.1em]">Atendido por: {employeeName}</p>
                  <button onClick={cycleEmployee} className="ml-2 bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold p-1 rounded transition-colors" title="Trocar Profissional">
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Service Input */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest flex items-center gap-2">
              <Scissors className="w-3 h-3" /> Serviço / Procedimento
            </label>
            <input
              type="text"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="Ex: Corte Degradê + Barba"
              className="w-full bg-brand-onyx border border-white/10 rounded-lg py-3 px-4 text-brand-gold font-sans font-bold text-sm uppercase tracking-wider focus:border-brand-gold focus:ring-0 transition-all placeholder-brand-muted/30"
            />
          </div>

          {/* Inputs Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Price Input */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Valor (R$)</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-brand-gold font-display font-bold text-lg">R$</span>
                </div>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={isNoShow}
                  className="w-full bg-brand-onyx border border-white/10 rounded-lg py-3 pl-10 pr-3 text-white font-display font-bold text-xl focus:border-brand-gold focus:ring-0 transition-all placeholder-brand-muted/50 disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            {/* Time Readonly */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Horário</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Clock className="w-4 h-4 text-brand-muted" />
                </div>
                <input
                  type="time"
                  value={timeString}
                  onChange={(e) => setTimeString(e.target.value)}
                  className="w-full bg-brand-onyx border border-white/10 rounded-lg py-3 pl-10 pr-3 text-white font-display font-bold text-xl focus:border-brand-gold focus:ring-0 transition-all [&::-webkit-calendar-picker-indicator]:invert"
                />
              </div>
            </div>
          </div>

          {/* Toggles Section */}
          <div className="space-y-3">

            {/* Payment Toggle */}
            <div
              className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all flex items-center justify-between select-none ${markAsPaid
                ? 'bg-brand-onyx border-brand-gold shadow-[0_4px_14px_0_rgba(212,175,55,0.1)]'
                : 'bg-brand-onyx border-white/5 hover:border-white/10'
                } ${isNoShow ? 'opacity-40 pointer-events-none' : ''}`}
              onClick={() => !isNoShow && setMarkAsPaid(!markAsPaid)}
            >
              <span className={`font-display font-bold text-sm uppercase tracking-wide ${markAsPaid ? 'text-brand-gold' : 'text-brand-muted'}`}>
                {markAsPaid ? 'Pagamento Confirmado' : 'Aguardando Pagamento'}
              </span>

              <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${markAsPaid ? 'bg-brand-gold border-brand-gold' : 'border-white/20 bg-black/20'
                }`}>
                {markAsPaid && <Check className="w-4 h-4 text-brand-onyx" strokeWidth={3} />}
              </div>
            </div>

            {/* Payment Methods */}
            {markAsPaid && !isNoShow && (
              <div className="grid grid-cols-3 gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                {[
                  { id: PaymentMethod.CASH, label: 'Dinheiro', icon: Banknote },
                  { id: PaymentMethod.PIX, label: 'Pix', icon: QrCode },
                  { id: PaymentMethod.CARD, label: 'Cartão', icon: CreditCard },
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedPaymentMethod(method.id)}
                    className={`
                      flex flex-col items-center justify-center gap-2 p-3 rounded-lg border transition-all
                      ${selectedPaymentMethod === method.id
                        ? 'bg-brand-gold text-brand-onyx border-brand-gold font-bold shadow-lg'
                        : 'bg-brand-onyx text-brand-muted border-white/10 hover:border-white/20 hover:text-white'
                      }
                    `}
                  >
                    <method.icon className="w-5 h-5" />
                    <span className="text-[10px] uppercase tracking-wider">{method.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* No Show Toggle */}
            <div
              className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all flex items-center justify-between select-none ${isNoShow
                ? 'bg-brand-onyx border-brand-muted shadow-inner'
                : 'bg-brand-onyx border-white/5 hover:border-white/10'
                }`}
              onClick={toggleNoShow}
            >
              <div className="flex items-center gap-2">
                {isNoShow && <AlertTriangle className="w-4 h-4 text-brand-muted" />}
                <span className={`font-display font-bold text-sm uppercase tracking-wide ${isNoShow ? 'text-brand-muted' : 'text-brand-muted/70'}`}>
                  Não Compareceu
                </span>
              </div>
              <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${isNoShow ? 'bg-brand-muted border-brand-muted' : 'border-white/20 bg-black/20'
                }`}>
                {isNoShow && <X className="w-4 h-4 text-brand-onyx" strokeWidth={3} />}
              </div>
            </div>

          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-6 pt-0 space-y-3">
          <button
            onClick={handleConfirm}
            className="w-full bg-gold-gradient text-brand-onyx font-display font-black text-sm uppercase tracking-widest py-4 rounded-lg hover:brightness-110 transition-all active:scale-[0.98] shadow-lg shadow-brand-gold/10"
          >
            Salvar Checkpoint
          </button>

          <button
            type="button"
            onClick={() => { onDelete(appointment); onClose(); }}
            className="w-full bg-brand-onyx border border-red-500/20 text-red-500 font-bold text-[10px] uppercase tracking-widest py-3 rounded-lg hover:bg-red-500/10 transition-all flex items-center justify-center gap-2"
          >
            <AlertTriangle className="w-3 h-3" /> Excluir Agendamento
          </button>
        </div>

      </div>
    </div>
  );
};
