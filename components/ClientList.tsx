
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { User, Phone, ChevronRight, X, Calendar, Clock, Scissors, CreditCard, AlertTriangle, TrendingUp, Edit2, Save, UserPlus } from 'lucide-react';
import { Client, Appointment, AppointmentStatus } from '../types';

interface ClientListProps {
  clients: Client[];
  appointments: Appointment[];
  onUpdatePhone: (clientId: string, newPhone: string) => void;
  onNewClientClick?: () => void;
}

export const ClientList: React.FC<ClientListProps> = ({ clients, appointments, onUpdatePhone, onNewClientClick }) => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [editPhoneValue, setEditPhoneValue] = useState('');

  const getClientStats = (clientId: string) => {
    const clientAppointments = appointments.filter(a => a.clientId === clientId);
    const completed = clientAppointments.filter(a => a.status === AppointmentStatus.COMPLETED);
    const noShows = clientAppointments.filter(a => a.status === AppointmentStatus.NO_SHOW);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const spentMonth = clientAppointments
      .filter(a => a.isPaid && a.timestamp.getMonth() === currentMonth && a.timestamp.getFullYear() === currentYear)
      .reduce((sum, a) => sum + a.price, 0);

    const spentYear = clientAppointments
      .filter(a => a.isPaid && a.timestamp.getFullYear() === currentYear)
      .reduce((sum, a) => sum + a.price, 0);

    return {
      completedCount: completed.length,
      noShowCount: noShows.length,
      history: clientAppointments.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
      spentMonth,
      spentYear,
    };
  };

  const startEditingPhone = () => {
    setEditPhoneValue(selectedClient?.phone || '');
    setIsEditingPhone(true);
  };

  const savePhone = () => {
    if (selectedClient) {
      onUpdatePhone(selectedClient.id, editPhoneValue);
      setSelectedClient({ ...selectedClient, phone: editPhoneValue });
      setIsEditingPhone(false);
    }
  };

  return (
    <div className="px-6 pt-4 pb-28">
      <div className="flex items-end justify-between mb-8">
        <div className="flex items-center gap-4">
          <h2 className="font-display text-2xl font-black text-white uppercase tracking-tight font-stretch-expanded">Clientes</h2>
          {onNewClientClick && (
            <button
              onClick={onNewClientClick}
              className="flex items-center gap-2 px-3 py-1.5 bg-brand-concreteDark border border-white/5 rounded-lg text-brand-gold text-[10px] font-black uppercase tracking-widest hover:border-brand-gold/30 transition-all"
            >
              <UserPlus className="w-3 h-3" /> Novo Cliente
            </button>
          )}
        </div>
        <span className="text-xs font-bold text-brand-muted uppercase tracking-widest border-b border-transparent pb-1">{clients.length} cadastrados</span>
      </div>

      <div className="space-y-4">
        {clients.map(client => (
          <div
            key={client.id}
            onClick={() => setSelectedClient(client)}
            className="bg-brand-concreteDark p-5 rounded-lg border border-white/5 flex justify-between items-center group hover:border-brand-gold/40 hover:bg-brand-concrete/40 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-brand-onyx border border-white/10 flex items-center justify-center shadow-inner group-hover:border-brand-gold/50 transition-colors">
                <User className="w-6 h-6 text-brand-gold" />
              </div>
              <div>
                <h3 className="font-display font-bold text-white text-lg tracking-wide">{client.name}</h3>
                <div className="flex items-center gap-2 text-brand-muted text-xs mt-1">
                  <Phone className="w-3 h-3" />
                  <span className="font-mono">{client.phone || 'Sem telefone'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <span className="block text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-1">Visitas</span>
                <span className="font-display font-bold text-white text-lg">{getClientStats(client.id).completedCount}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-brand-muted group-hover:text-brand-gold transition-colors" />
            </div>
          </div>
        ))}
      </div>

      {/* Client Detail Modal */}
      {selectedClient && (
        <React.Fragment>
          {(() => {
            const modalContent = (
              <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-brand-onyx/95 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
                <div className="w-full sm:w-96 bg-brand-concrete border-t sm:border border-white/10 rounded-t-2xl sm:rounded-xl shadow-2xl transform transition-transform animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 overflow-visible max-h-[90vh] flex flex-col">

                  {/* Header - Standardized */}
                  <div className="flex justify-between items-center p-6 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-4 bg-brand-gold"></div>
                      <h2 className="font-display font-bold text-lg text-white uppercase tracking-wide">Detalhes do Cliente</h2>
                    </div>
                    <button onClick={() => { setSelectedClient(null); setIsEditingPhone(false); }} className="p-2 hover:bg-white/5 rounded-md text-brand-muted transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Modal Scrollable Content */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">

                    {/* Client Info Block - Compact */}
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-brand-onyx border border-white/10 rounded-full flex items-center justify-center shadow-inner shrink-0">
                        <User className="w-5 h-5 text-brand-gold" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display font-bold text-lg text-white uppercase tracking-tight leading-none truncate">{selectedClient.name}</h3>

                        {/* Editable Phone */}
                        <div className="flex items-center gap-2 mt-1 group h-6">
                          {isEditingPhone ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editPhoneValue}
                                onChange={(e) => setEditPhoneValue(e.target.value)}
                                className="bg-brand-onyx border border-brand-gold rounded px-1.5 py-0.5 text-brand-gold font-mono text-[10px] w-24 focus:ring-0 focus:outline-none"
                                autoFocus
                              />
                              <button onClick={savePhone} className="text-green-500 hover:text-green-400 p-0.5">
                                <Save className="w-3 h-3" />
                              </button>
                              <button onClick={() => setIsEditingPhone(false)} className="text-brand-muted hover:text-white p-0.5">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <Phone className="w-3 h-3 text-brand-muted" />
                              <p className="text-brand-muted font-mono text-xs">{selectedClient.phone || 'Sem telefone'}</p>
                              <button
                                onClick={startEditingPhone}
                                className="ml-1 p-1 bg-brand-onyx rounded border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity hover:border-brand-gold/50"
                              >
                                <Edit2 className="w-2.5 h-2.5 text-brand-muted hover:text-brand-gold" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stats Grid - Compact 2x2 */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Visits */}
                      <div className="bg-brand-onyx/50 border border-white/5 p-3 rounded-lg">
                        <p className="text-[9px] font-bold text-brand-muted uppercase tracking-widest mb-1">Visitas</p>
                        <p className="font-display font-black text-xl text-white">{getClientStats(selectedClient.id).completedCount}</p>
                      </div>
                      {/* No Shows */}
                      <div className="bg-brand-onyx/50 border border-white/5 p-3 rounded-lg">
                        <p className="text-[9px] font-bold text-brand-muted uppercase tracking-widest mb-1">Faltas</p>
                        <p className={`font-display font-black text-xl ${getClientStats(selectedClient.id).noShowCount > 0 ? 'text-red-500' : 'text-brand-muted'}`}>{getClientStats(selectedClient.id).noShowCount}</p>
                      </div>
                      {/* Month Spend */}
                      <div className="bg-brand-onyx/50 border border-white/5 p-3 rounded-lg">
                        <p className="text-[9px] font-bold text-brand-muted uppercase tracking-widest mb-1">Mês Atual</p>
                        <p className="font-display font-black text-lg text-white">R$ {getClientStats(selectedClient.id).spentMonth.toFixed(0)}</p>
                      </div>
                      {/* Year Spend */}
                      <div className="bg-brand-onyx/50 border border-white/5 p-3 rounded-lg">
                        <p className="text-[9px] font-bold text-brand-muted uppercase tracking-widest mb-1">Total Ano</p>
                        <p className="font-display font-black text-lg text-brand-gold">R$ {getClientStats(selectedClient.id).spentYear.toFixed(0)}</p>
                      </div>
                    </div>

                    {/* Recent History - Limit 3 */}
                    <div className="space-y-3">
                      <h4 className="font-display font-bold text-[10px] text-brand-muted uppercase tracking-widest flex items-center gap-2">
                        Últimos Registros
                        <div className="flex-1 h-[1px] bg-white/5"></div>
                      </h4>

                      <div className="space-y-2">
                        {getClientStats(selectedClient.id).history.slice(0, 3).map((apt) => (
                          <div key={apt.id} className="bg-brand-onyx/30 border border-white/5 p-3 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-1.5 rounded-md ${apt.status === AppointmentStatus.NO_SHOW ? 'bg-red-500/10 text-red-500' : 'bg-brand-gold/10 text-brand-gold'}`}>
                                {apt.status === AppointmentStatus.NO_SHOW ? <AlertTriangle className="w-3 h-3" /> : <Scissors className="w-3 h-3" />}
                              </div>
                              <div>
                                <p className={`font-bold text-xs ${apt.status === AppointmentStatus.NO_SHOW ? 'text-brand-muted line-through' : 'text-white'}`}>
                                  {apt.status === AppointmentStatus.NO_SHOW ? 'Não Compareceu' : apt.serviceName}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5 text-[9px] text-brand-muted font-mono uppercase">
                                  <span>{apt.timestamp.toLocaleDateString('pt-BR')}</span>
                                  <span>•</span>
                                  <span>{apt.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-display font-bold text-sm ${apt.status === AppointmentStatus.NO_SHOW ? 'text-brand-muted' : 'text-white'}`}>
                                R$ {apt.price}
                              </p>
                            </div>
                          </div>
                        ))}
                        {getClientStats(selectedClient.id).history.length === 0 && (
                          <p className="text-center py-4 text-brand-muted text-[10px] uppercase tracking-widest opacity-50">Nenhum registro</p>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Footer - Compact */}
                  <div className="p-4 border-t border-white/5 bg-brand-onyx/30">
                    <button
                      onClick={() => { setSelectedClient(null); setIsEditingPhone(false); }}
                      className="w-full py-3 bg-brand-concrete border border-white/10 rounded-lg font-display font-bold text-xs text-white uppercase tracking-widest hover:border-brand-gold/50 transition-all hover:bg-white/5"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </div>
            );

            // Use portal if available (browser environment), otherwise render normally (though should always be browser)
            if (typeof document !== 'undefined') {
              return createPortal(modalContent, document.body);
            }
            return modalContent;
          })()}
        </React.Fragment>
      )}
    </div>
  );
};
