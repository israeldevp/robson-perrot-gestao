
import React, { useState } from 'react';
import { User, Phone, ChevronRight, X, Calendar, Clock, Scissors, CreditCard, AlertTriangle, TrendingUp, Edit2, Save } from 'lucide-react';
import { Client, Appointment, AppointmentStatus } from '../types';

interface ClientListProps {
  clients: Client[];
  appointments: Appointment[];
  onUpdatePhone: (clientId: string, newPhone: string) => void;
}

export const ClientList: React.FC<ClientListProps> = ({ clients, appointments, onUpdatePhone }) => {
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
        <h2 className="font-display text-2xl font-black text-white uppercase tracking-tight font-stretch-expanded">Clientes</h2>
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-brand-onyx/95 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
          <div className="w-full sm:w-96 bg-brand-concrete border-t sm:border border-white/10 rounded-t-2xl sm:rounded-xl shadow-2xl transform transition-transform animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 overflow-visible max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-start">
              <div className="flex gap-4">
                 <div className="w-16 h-16 bg-brand-onyx border-2 border-brand-gold/50 rounded-2xl flex items-center justify-center shadow-lg">
                    <User className="w-8 h-8 text-brand-gold" />
                 </div>
                 <div className="flex-1">
                    <h3 className="font-display font-black text-2xl text-white uppercase tracking-tight leading-none">{selectedClient.name}</h3>
                    
                    {/* Editable Phone Section */}
                    <div className="flex items-center gap-2 mt-2 group">
                      {isEditingPhone ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editPhoneValue}
                            onChange={(e) => setEditPhoneValue(e.target.value)}
                            className="bg-brand-onyx border border-brand-gold rounded px-2 py-1 text-brand-gold font-mono text-xs focus:ring-0 focus:outline-none"
                            autoFocus
                          />
                          <button onClick={savePhone} className="text-green-500 hover:text-green-400 p-1">
                            <Save className="w-4 h-4" />
                          </button>
                          <button onClick={() => setIsEditingPhone(false)} className="text-brand-muted hover:text-white p-1">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-brand-gold font-mono text-sm">{selectedClient.phone || 'Sem telefone'}</p>
                          <button 
                            onClick={startEditingPhone} 
                            className="p-1.5 bg-brand-onyx rounded-md border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity hover:border-brand-gold/50"
                          >
                            <Edit2 className="w-3 h-3 text-brand-muted hover:text-brand-gold" />
                          </button>
                        </>
                      )}
                    </div>
                 </div>
              </div>
              <button onClick={() => { setSelectedClient(null); setIsEditingPhone(false); }} className="p-2 hover:bg-white/5 rounded-lg text-brand-muted transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
              
              {/* Financial Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-brand-onyx p-4 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 mb-2 text-brand-muted">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Gasto Mensal</span>
                  </div>
                  <div className="font-display font-black text-xl text-white">R$ {getClientStats(selectedClient.id).spentMonth.toFixed(2)}</div>
                </div>
                <div className="bg-brand-onyx p-4 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 mb-2 text-brand-muted">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Gasto Anual</span>
                  </div>
                  <div className="font-display font-black text-xl text-brand-gold">R$ {getClientStats(selectedClient.id).spentYear.toFixed(2)}</div>
                </div>
              </div>

              {/* Attendance Stats */}
              <div className="flex gap-4">
                 <div className="flex-1 bg-brand-onyx/50 border border-white/5 p-4 rounded-xl flex items-center justify-between">
                    <div>
                       <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Compareceu</p>
                       <p className="text-2xl font-display font-black text-green-500">{getClientStats(selectedClient.id).completedCount}</p>
                    </div>
                    <Calendar className="w-8 h-8 text-brand-muted/20" />
                 </div>
                 <div className="flex-1 bg-brand-onyx/50 border border-white/5 p-4 rounded-xl flex items-center justify-between">
                    <div>
                       <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Faltas</p>
                       <p className="text-2xl font-display font-black text-red-500">{getClientStats(selectedClient.id).noShowCount}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-brand-muted/20" />
                 </div>
              </div>

              {/* History Timeline */}
              <div className="space-y-4">
                <h4 className="font-display font-bold text-xs text-brand-muted uppercase tracking-[0.2em] flex items-center gap-2">
                   Histórico de Atendimentos
                   <div className="flex-1 h-[1px] bg-white/5"></div>
                </h4>
                
                <div className="space-y-3">
                  {getClientStats(selectedClient.id).history.map((apt) => (
                    <div key={apt.id} className="bg-brand-onyx/30 border border-white/5 p-4 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${apt.status === AppointmentStatus.NO_SHOW ? 'bg-red-500/10 text-red-500' : 'bg-brand-gold/10 text-brand-gold'}`}>
                          {apt.status === AppointmentStatus.NO_SHOW ? <AlertTriangle className="w-4 h-4" /> : <Scissors className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className={`font-bold text-sm ${apt.status === AppointmentStatus.NO_SHOW ? 'text-brand-muted line-through' : 'text-white'}`}>
                            {apt.status === AppointmentStatus.NO_SHOW ? 'Não Compareceu' : apt.serviceName}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-brand-muted font-mono uppercase">
                             <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {apt.timestamp.toLocaleDateString('pt-BR')}</span>
                             <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {apt.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-display font-bold ${apt.status === AppointmentStatus.NO_SHOW ? 'text-brand-muted' : 'text-white'}`}>
                          R$ {apt.price}
                        </p>
                        <p className="text-[9px] font-black text-brand-muted uppercase tracking-tighter mt-1">
                          {apt.isPaid ? 'PAGO' : 'PENDENTE'}
                        </p>
                      </div>
                    </div>
                  ))}
                  {getClientStats(selectedClient.id).history.length === 0 && (
                    <p className="text-center py-6 text-brand-muted text-xs uppercase tracking-widest opacity-50">Nenhum registro encontrado</p>
                  )}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-6 bg-brand-onyx/50 border-t border-white/5">
              <button 
                onClick={() => { setSelectedClient(null); setIsEditingPhone(false); }}
                className="w-full py-4 bg-brand-concrete border border-white/10 rounded-xl font-display font-bold text-xs text-white uppercase tracking-widest hover:border-brand-gold/50 transition-all"
              >
                Fechar Registro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
