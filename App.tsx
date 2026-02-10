import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from './services/supabase';
import { Auth } from './components/Auth';
import { Session } from '@supabase/supabase-js';
import { Plus, X, UserPlus, Trash2, Check, TrendingUp, Calendar, Users, Briefcase, BarChart3, PieChart, Landmark, UserCheck, Scissors, Clock, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Lock, LogIn } from 'lucide-react';
import { Header } from './components/Header';
import { SummaryCards } from './components/SummaryCard';
import { AppointmentList } from './components/AppointmentList';
import { ClientList } from './components/ClientList';
import { NewClientModal } from './components/NewClientModal';
import { CheckpointModal } from './components/CheckpointModal';
import { NewAppointmentModal } from './components/NewAppointmentModal';
import { Appointment, DashboardStats, AppointmentStatus, PaymentMethod, Client, Employee, DeletionLog } from './types';

type ViewState = 'dashboard' | 'agenda' | 'clientes' | 'financeiro' | 'configuracoes';

const App: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard' as ViewState);

  const [agendaDate, setAgendaDate] = useState(new Date());
  const [dashboardDate, setDashboardDate] = useState(new Date());

  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [selectedEmployeeReport, setSelectedEmployeeReport] = useState<string | null>(null);
  const [showAllMonths, setShowAllMonths] = useState(false);

  // Security state for Settings
  const [isConfigAuthenticated, setIsConfigAuthenticated] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState(false);

  // Year navigation for financial closure
  const [financialYear, setFinancialYear] = useState(new Date().getFullYear());

  const [deletionLogs, setDeletionLogs] = useState<DeletionLog[]>([]);

  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchInitialData = async () => {
    if (!session) return;

    // Fetch Employees
    const { data: empData } = await supabase.from('employees').select('*').order('name');
    if (empData) setEmployees(empData);

    // Fetch Clients
    const { data: clientData } = await supabase.from('clients').select('*').order('name');
    if (clientData) setClients(clientData);

    // Fetch Appointments
    const { data: aptData } = await supabase.from('appointments').select('*').order('timestamp', { ascending: false });
    if (aptData) {
      setAppointments(aptData.map(apt => ({
        ...apt,
        timestamp: new Date(apt.timestamp)
      })) as Appointment[]);
    }

    // Fetch Deletion Logs
    const { data: logData } = await supabase.from('deletion_logs').select('*').order('deleted_at', { ascending: false });
    if (logData) setDeletionLogs(logData);
  };

  useEffect(() => {
    fetchInitialData();
  }, [session]);

  const stats: DashboardStats = useMemo(() => {
    const today = dashboardDate;
    const todayAppointments = appointments.filter(apt =>
      apt.timestamp.getDate() === today.getDate() &&
      apt.timestamp.getMonth() === today.getMonth() &&
      apt.timestamp.getFullYear() === today.getFullYear()
    );

    return todayAppointments.reduce(
      (acc, curr) => {
        if (curr.status !== AppointmentStatus.CANCELED) {
          acc.totalAppointments += 1;

          if (curr.status === AppointmentStatus.COMPLETED) {
            acc.completedAppointments += 1;
          }

          if (curr.isPaid) {
            acc.totalRevenue += curr.price;
            const empName = curr.employeeName || 'Não Atribuído';
            acc.revenueByEmployee[empName] = (acc.revenueByEmployee[empName] || 0) + curr.price;
          } else if (curr.status !== AppointmentStatus.NO_SHOW) {
            acc.pendingPayment += curr.price;
          }
        }

        return acc;
      },
      { totalRevenue: 0, totalAppointments: 0, completedAppointments: 0, pendingPayment: 0, revenueByEmployee: {} as Record<string, number> }
    );
  }, [appointments, dashboardDate]);

  const financialReports = useMemo(() => {
    const annualRevenue = appointments
      .filter(apt => apt.isPaid && apt.timestamp.getFullYear() === financialYear)
      .reduce((sum, apt) => sum + apt.price, 0);

    const annualServices = appointments
      .filter(apt => apt.status === AppointmentStatus.COMPLETED && apt.timestamp.getFullYear() === financialYear).length;

    const monthlyHistory = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = targetDate.getMonth();
      const year = targetDate.getFullYear();

      const monthApts = appointments.filter(apt =>
        apt.timestamp.getMonth() === month &&
        apt.timestamp.getFullYear() === year
      );

      const revenue = monthApts.filter(a => a.isPaid).reduce((sum, a) => sum + a.price, 0);
      const completed = monthApts.filter(a => a.status === AppointmentStatus.COMPLETED).length;

      const revenueByEmployee: Record<string, number> = {};
      monthApts.filter(a => a.isPaid).forEach(apt => {
        revenueByEmployee[apt.employeeName] = (revenueByEmployee[apt.employeeName] || 0) + apt.price;
      });

      monthlyHistory.push({
        label: targetDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
        revenue,
        completed,
        month,
        year,
        revenueByEmployee
      });
    }

    return {
      annualRevenue,
      annualServices,
      monthlyHistory
    };
  }, [appointments, financialYear]);

  const handleAppointmentClick = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setIsModalOpen(true);
  };

  const handleUpdateAppointment = async (id: string, finalPrice: number, isPaid: boolean, status?: AppointmentStatus, paymentMethod?: PaymentMethod, serviceName?: string) => {
    const updates = {
      price: finalPrice,
      isPaid,
      status: status || AppointmentStatus.SCHEDULED,
      payment_method: paymentMethod,
      service_name: serviceName
    };

    const { error } = await supabase.from('appointments').update(updates).eq('id', id);

    if (error) {
      alert('Erro ao atualizar agendamento');
      return;
    }

    setAppointments(prev => prev.map(apt => {
      if (apt.id === id) {
        return {
          ...apt,
          price: finalPrice,
          isPaid,
          status: status || apt.status,
          paymentMethod: paymentMethod,
          serviceName: serviceName || apt.serviceName
        };
      }
      return apt;
    }));
  };

  const handleUpdateClientPhone = async (clientId: string, newPhone: string) => {
    const { error } = await supabase.from('clients').update({ phone: newPhone }).eq('id', clientId);
    if (error) {
      alert('Erro ao atualizar telefone do cliente');
      return;
    }
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, phone: newPhone } : c));
  };

  const handleQuickToggle = async (id: string, currentStatus: boolean) => {
    const newPaidStatus = !currentStatus;
    const apt = appointments.find(a => a.id === id);
    if (!apt) return;

    const updates = {
      is_paid: newPaidStatus,
      status: newPaidStatus ? AppointmentStatus.COMPLETED : apt.status,
      payment_method: newPaidStatus ? (apt.paymentMethod || PaymentMethod.PIX) : null
    };

    const { error } = await supabase.from('appointments').update(updates).eq('id', id);

    if (error) {
      alert('Erro ao atualizar pagamento');
      return;
    }

    setAppointments(prev => prev.map(apt => {
      if (apt.id === id) {
        return {
          ...apt,
          isPaid: newPaidStatus,
          status: newPaidStatus ? AppointmentStatus.COMPLETED : apt.status,
          paymentMethod: newPaidStatus ? (apt.paymentMethod || PaymentMethod.PIX) : undefined
        };
      }
      return apt;
    }));
  };

  const handleCreateAppointment = async (clientName: string, timestamp: Date, serviceName: string, employeeName: string, phone?: string) => {
    // Enforce booking limit
    const appointmentsAtSameTime = appointments.filter(apt =>
      apt.timestamp.getTime() === timestamp.getTime() &&
      apt.status !== AppointmentStatus.CANCELED
    );

    if (appointmentsAtSameTime.length >= 2) {
      alert(`Ops! Já existem 2 agendamentos para ${timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Por favor, escolha outro horário.`);
      return;
    }

    let existingClient = clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
    let clientId: string;

    if (existingClient) {
      clientId = existingClient.id;
      if (phone && (!existingClient.phone || existingClient.phone === '')) {
        await handleUpdateClientPhone(clientId, phone);
      }
    } else {
      const { data: newClientData, error: clientError } = await supabase
        .from('clients')
        .insert({ name: clientName, phone: phone || '', total_spent: 0 })
        .select()
        .single();

      if (clientError || !newClientData) {
        alert('Erro ao cadastrar cliente');
        return;
      }
      clientId = newClientData.id;
      setClients(prev => [...prev, newClientData]);
    }

    const newAptData = {
      client_id: clientId,
      client_name: clientName,
      employee_name: employeeName,
      service_name: serviceName,
      timestamp: timestamp.toISOString(),
      duration_minutes: 30,
      price: 0,
      is_paid: false,
      status: AppointmentStatus.SCHEDULED
    };

    const { data: finalApt, error: aptError } = await supabase
      .from('appointments')
      .insert(newAptData)
      .select()
      .single();

    if (aptError || !finalApt) {
      alert('Erro ao criar agendamento');
      return;
    }

    const completeApt: Appointment = {
      ...finalApt,
      timestamp: new Date(finalApt.timestamp)
    };

    setAppointments(prev => [...prev, completeApt].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()));

    if (currentView === 'agenda') setAgendaDate(timestamp);
    if (currentView === 'dashboard') setDashboardDate(timestamp);
  };

  const handleCreateClient = async (name: string, phone: string) => {
    const { data: newClient, error } = await supabase
      .from('clients')
      .insert({ name, phone, total_spent: 0 })
      .select()
      .single();

    if (error || !newClient) {
      alert('Erro ao cadastrar cliente');
      return;
    }

    setClients(prev => [...prev, newClient]);
  };

  const handleAddEmployee = async () => {
    if (newEmployeeName.trim()) {
      const { data: newEmployee, error } = await supabase
        .from('employees')
        .insert({ name: newEmployeeName.trim() })
        .select()
        .single();

      if (error || !newEmployee) {
        alert('Erro ao adicionar funcionário');
        return;
      }

      setEmployees(prev => [...prev, newEmployee]);
      setNewEmployeeName('');
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    const password = prompt('Para excluir este funcionário, digite sua senha de acesso:');
    if (!password) return;

    // Verify password via Supabase Auth re-login simulation or similar logic
    // Since we don't have a direct "verify password" without re-logging in, 
    // we can use the current session's email and the provided password.
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: session?.user.email || '',
      password: password
    });

    if (authError) {
      alert('Senha incorreta! Não foi possível excluir o funcionário.');
      return;
    }

    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) {
      alert('Erro ao excluir funcionário');
      return;
    }

    setEmployees(prev => prev.filter(emp => emp.id !== id));
    alert('Funcionário excluído com sucesso.');
  };



  const handleDeleteAppointment = async (appointment: Appointment) => {
    // 1. If it's a paid/completed appointment, require password
    if (appointment.status === AppointmentStatus.COMPLETED) {
      const password = prompt('Para excluir um agendamento já realizado, digite sua senha:');
      if (!password) return;

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: session?.user.email || '',
        password: password
      });

      if (authError) {
        alert('Senha incorreta! Não foi possível excluir o agendamento.');
        return;
      }

      // Log the deletion
      const logEntry = {
        user_email: session?.user.email,
        appointment_details: appointment,
        reason: 'Exclusão manual de agendamento realizado'
      };

      const { error: logError } = await supabase.from('deletion_logs').insert(logEntry);

      if (logError) {
        console.error('Erro ao registrar log:', logError);
      } else {
        // Refresh logs locally
        const { data: newLogs } = await supabase.from('deletion_logs').select('*').order('deleted_at', { ascending: false });
        if (newLogs) setDeletionLogs(newLogs);
      }
    } else {
      // Simple confirmation for scheduled/canceled
      if (!confirm('Tem certeza que deseja excluir este agendamento?')) return;
    }

    // 2. Perform deletion
    const { error } = await supabase.from('appointments').delete().eq('id', appointment.id);

    if (error) {
      alert('Erro ao excluir agendamento.');
      return;
    }

    setAppointments(prev => prev.filter(a => a.id !== appointment.id));
    setIsModalOpen(false);
  };

  const handleMenuNavigation = (view: ViewState) => {
    setCurrentView(view);
    setIsMenuOpen(false);
  };

  const handleConfigLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginUser === 'admin' && loginPass === 'admin') {
      setIsConfigAuthenticated(true);
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="animate-slide-in">
            <section>
              <SummaryCards stats={stats} employees={employees} showEmployeeStats={false} />
            </section>
            <section className="bg-brand-onyx min-h-[500px]">
              <AppointmentList
                appointments={appointments}
                onAppointmentClick={handleAppointmentClick}
                onQuickTogglePay={handleQuickToggle}
                selectedDate={dashboardDate}
                onDateChange={setDashboardDate}
              />
            </section>
          </div>
        );
      case 'agenda':
        return (
          <section className="bg-brand-onyx min-h-[500px] animate-slide-in">
            <AppointmentList
              appointments={appointments}
              onAppointmentClick={handleAppointmentClick}
              onQuickTogglePay={handleQuickToggle}
              selectedDate={agendaDate}
              onDateChange={setAgendaDate}
            />
          </section>
        );
      case 'clientes':
        return <div className="animate-slide-in"><ClientList clients={clients} appointments={appointments} onUpdatePhone={handleUpdateClientPhone} onNewClientClick={() => setIsNewClientModalOpen(true)} /></div>;
      case 'financeiro':
        const displayedMonths = showAllMonths
          ? financialReports.monthlyHistory
          : financialReports.monthlyHistory.slice(0, 3);
        const averageDivisor = financialYear === new Date().getFullYear() ? Math.max(1, new Date().getMonth() + 1) : 12;

        return (
          <div className="pt-6 space-y-12 pb-28 animate-slide-in">
            <div className="px-6 flex items-end justify-between">
              <h2 className="font-display text-2xl font-black text-white uppercase tracking-tight font-stretch-expanded leading-none">Gestão Financeira</h2>
              <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Fluxo</p>
            </div>

            <SummaryCards stats={stats} employees={employees} showEmployeeStats={true} onEmployeeClick={(name) => setSelectedEmployeeReport(name)} />

            <div className="px-6 space-y-12">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <h3 className="font-display font-black text-xs text-brand-muted uppercase tracking-[0.2em]">Relatórios Mensais</h3>
                  <div className="flex-1 h-[1px] bg-white/5"></div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {displayedMonths.map((report, idx) => (
                    <div key={idx} className={`p-5 rounded-xl border transition-all flex items-center justify-between ${idx === 0 ? 'bg-brand-concrete border-brand-gold/20' : 'bg-brand-concreteDark border-white/5'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center border ${idx === 0 ? 'bg-brand-gold/10 border-brand-gold/20' : 'bg-brand-onyx border-white/5'}`}>
                          <BarChart3 className={`w-5 h-5 ${idx === 0 ? 'text-brand-gold' : 'text-brand-muted'}`} />
                        </div>
                        <div>
                          <h5 className="font-display font-bold text-white uppercase tracking-wide text-sm leading-tight">{report.label}</h5>
                          <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mt-1">{report.completed} Atendimentos</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-display font-black text-lg ${idx === 0 ? 'text-brand-gold' : 'text-white'}`}>R$ {report.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {financialReports.monthlyHistory.length > 3 && (
                  <button onClick={() => setShowAllMonths(!showAllMonths)} className="w-full py-4 border border-white/5 bg-brand-concreteDark/50 rounded-xl flex items-center justify-center gap-3 text-brand-muted text-[10px] font-black uppercase tracking-[0.2em]">
                    {showAllMonths ? 'Recolher' : 'Ver Todos os Meses'} {showAllMonths ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display font-black text-xs text-brand-muted uppercase tracking-[0.2em]">Fechamento Anual {financialYear}</h3>
                  <div className="flex items-center gap-1 bg-brand-onyx border border-white/5 rounded-lg p-1">
                    <button onClick={() => setFinancialYear(financialYear - 1)} className="p-1.5 text-brand-muted"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="text-[10px] font-black text-white px-1">{financialYear}</span>
                    <button onClick={() => setFinancialYear(financialYear + 1)} disabled={financialYear >= new Date().getFullYear()} className="p-1.5 text-brand-muted disabled:opacity-20"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="bg-gold-gradient p-[1px] rounded-2xl">
                  <div className="bg-brand-concreteDark rounded-[15px] p-6 sm:p-8 relative overflow-hidden">
                    <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-brand-gold uppercase tracking-[0.3em]">Faturamento Bruto</p>
                        <h4 className="font-display font-black text-4xl sm:text-5xl text-white tracking-tighter">R$ {financialReports.annualRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
                      </div>
                      <div className="bg-brand-onyx/50 border border-white/5 rounded-xl p-4 min-w-[180px] text-center">
                        <p className="text-[10px] font-black text-brand-muted uppercase mb-1">Média Mensal</p>
                        <p className="font-display font-bold text-2xl text-white">R$ {(financialReports.annualRevenue / averageDivisor).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'configuracoes':
        if (!isConfigAuthenticated) {
          return (
            <div className="px-6 pt-20 max-w-sm mx-auto flex flex-col items-center animate-slide-in">
              <div className="w-20 h-20 rounded-3xl bg-brand-gold/10 flex items-center justify-center border border-brand-gold/20 mb-8">
                <Lock className="w-10 h-10 text-brand-gold" />
              </div>
              <div className="text-center space-y-2 mb-10">
                <h2 className="font-display text-2xl font-black text-white uppercase tracking-tight">Área Restrita</h2>
                <p className="text-brand-muted text-[10px] font-bold uppercase tracking-widest">Acesso Administrativo</p>
              </div>
              {/* Legacy config login removed in favor of Supabase Auth, but keeping internal state for now if needed, 
                     though the entire app is now protected. We can simplify this later. 
                     For now, since we are already authenticated via Supabase to get here, 
                     we might want to just show the config or require a second checks.
                     Global Auth is implemented, so we can probably skip this internal check or auto-set it.
                  */}
              <div className="text-center text-white">
                <p>Você está logado como {session?.user.email}</p>
                <button onClick={() => setIsConfigAuthenticated(true)} className="mt-4 bg-brand-gold text-brand-onyx px-4 py-2 rounded-lg font-bold">
                  Acessar Configurações
                </button>
              </div>
            </div>
          );
        }
        return (
          <div className="px-6 pt-10 max-w-lg mx-auto space-y-12 animate-slide-in">
            <div className="text-center space-y-3">
              <h2 className="font-display text-3xl font-black text-white uppercase tracking-tight">Configurações</h2>
              <p className="text-brand-muted text-[10px] font-bold uppercase tracking-[0.3em]">Equipe e Sistema</p>
            </div>
            <div className="space-y-8">
              <div className="flex items-center justify-between border-l-4 border-brand-gold pl-4">
                <h3 className="font-display font-black text-sm text-white uppercase tracking-widest">Gestão de Equipe</h3>
                <button onClick={() => { setIsConfigAuthenticated(false); setLoginPass(''); }} className="p-2 bg-brand-onyx border border-white/5 rounded-lg text-[9px] font-black text-brand-muted uppercase flex items-center gap-2"><Lock className="w-3 h-3" /> Logout</button>
              </div>
              <div className="flex gap-3">
                <input type="text" placeholder="Nome do Funcionário" value={newEmployeeName} onChange={(e) => setNewEmployeeName(e.target.value)} className="flex-1 bg-brand-onyx border border-white/10 rounded-xl px-5 py-4 text-white text-sm" />
                <button onClick={handleAddEmployee} className="bg-brand-gold text-brand-onyx w-14 rounded-xl flex items-center justify-center shadow-lg shadow-brand-gold/10"><UserPlus className="w-6 h-6" /></button>
              </div>
              <div className="space-y-4">
                {employees.map(emp => (
                  <div key={emp.id} className="bg-brand-concreteDark border border-white/5 p-5 rounded-2xl flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-brand-onyx flex items-center justify-center border border-white/10"><Check className="w-5 h-5 text-brand-gold" /></div>
                      <span className="font-display font-black text-brand-text uppercase tracking-[0.1em] text-sm">{emp.name}</span>
                    </div>
                    <button onClick={() => handleDeleteEmployee(emp.id)} className="w-10 h-10 flex items-center justify-center text-brand-muted hover:text-red-500 transition-all"><Trash2 className="w-5 h-5" /></button>
                  </div>
                ))}

              </div>
            </div>

            {/* Deletion History Section */}
            {deletionLogs.length > 0 && (
              <div className="space-y-6 pt-8 border-t border-white/5">
                <h3 className="font-display font-black text-sm text-white uppercase tracking-widest border-l-4 border-red-500/50 pl-4">Histórico de Exclusões</h3>
                <div className="space-y-3">
                  {deletionLogs.map(log => {
                    const apt = log.appointment_details;
                    const date = new Date(log.deleted_at);
                    return (
                      <div key={log.id} className="bg-brand-onyx border border-white/5 p-4 rounded-xl flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-white font-bold text-sm">Agendamento de {apt.clientName}</p>
                            <p className="text-brand-muted text-xs">Excluído por: {log.user_email}</p>
                          </div>
                          <span className="text-[10px] text-brand-muted font-mono">{date.toLocaleDateString()} {date.toLocaleTimeString()}</span>
                        </div>
                        <div className="text-[10px] text-brand-muted/70 uppercase tracking-wider bg-black/20 p-2 rounded">
                          Serviço: {apt.serviceName || '-'} | Valor: R$ {apt.price} | Status Original: {apt.status}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-20 border-t border-white/5 opacity-50 text-center"><p className="text-[10px] text-brand-muted uppercase tracking-[0.5em] font-black">Barbearia Robson Perrot v1.2</p></div>
          </div>
        );
      default:
        return null;
    }
  };



  if (!session) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-brand-onyx pb-10 font-sans relative overflow-x-hidden">
      <Header onMenuClick={() => setIsMenuOpen(true)} />
      <main className="space-y-8 pt-4">{renderContent()}</main>
      {(currentView === 'dashboard' || currentView === 'agenda') && (
        <div className="fixed bottom-10 right-6 z-30">
          <button onClick={() => setIsNewAppointmentModalOpen(true)} className="w-16 h-16 bg-gold-gradient text-brand-onyx rounded-2xl flex items-center justify-center shadow-[0_10px_30px_rgba(212,175,55,0.3)] border border-brand-gold/50"><Plus className="w-9 h-9" strokeWidth={3} /></button>
        </div>
      )}
      <CheckpointModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} appointment={selectedAppointment} onConfirm={handleUpdateAppointment} onDelete={handleDeleteAppointment} />
      <NewAppointmentModal isOpen={isNewAppointmentModalOpen} onClose={() => setIsNewAppointmentModalOpen(false)} onConfirm={handleCreateAppointment} clients={clients} employees={employees} />
      <NewClientModal isOpen={isNewClientModalOpen} onClose={() => setIsNewClientModalOpen(false)} onConfirm={handleCreateClient} />
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-brand-onyx/98 backdrop-blur-sm flex flex-col p-6 animate-in fade-in duration-200">
          <div className="flex justify-end mb-8"><button onClick={() => setIsMenuOpen(false)} className="w-12 h-12 rounded-xl bg-brand-concrete flex items-center justify-center border border-white/5"><X className="w-6 h-6 text-brand-text" /></button></div>
          <nav className="flex flex-col gap-6 items-center justify-center h-full pb-20">
            {['dashboard', 'agenda', 'clientes', 'financeiro', 'configuracoes'].map((id) => (
              <button key={id} onClick={() => handleMenuNavigation(id as ViewState)} className={`font-display font-black text-4xl uppercase tracking-tighter transition-colors ${currentView === id ? 'text-brand-gold' : 'text-white'}`}>{id}</button>
            ))}
            <button onClick={() => supabase.auth.signOut()} className="font-display font-black text-xl text-red-500 uppercase tracking-tighter mt-8">
              Sair
            </button>
          </nav>
        </div>
      )}
    </div>
  );
};
export default App;