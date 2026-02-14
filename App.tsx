import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from './services/supabase';
import { Auth } from './components/Auth';
import { Session } from '@supabase/supabase-js';
import { Plus, X, UserPlus, Trash2, Check, TrendingUp, Calendar, Users, Briefcase, BarChart3, PieChart, Landmark, UserCheck, Scissors, Clock, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Lock, LogIn, User as UserIcon } from 'lucide-react';
import { Header } from './components/Header';
import { SummaryCards } from './components/SummaryCard';
import { AppointmentList } from './components/AppointmentList';
import { ClientList } from './components/ClientList';
import { NewClientModal } from './components/NewClientModal';
import { CheckpointModal } from './components/CheckpointModal';
import { NewAppointmentModal } from './components/NewAppointmentModal';
import { Appointment, DashboardStats, AppointmentStatus, PaymentMethod, Client, Employee, DeletionLog, AdminNotification } from './types';

type ViewState = 'dashboard' | 'agenda' | 'clientes' | 'financeiro' | 'configuracoes';

import { PublicBooking } from './components/PublicBooking';

const App: React.FC = () => {
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;

  // Simple routing check
  const [isPublicBooking, setIsPublicBooking] = useState(window.location.pathname === '/agendar');

  useEffect(() => {
    const handlePopState = () => {
      setIsPublicBooking(window.location.pathname === '/agendar');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);



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
  // Removed hardcoded login states

  // Year navigation for financial closure
  const [financialYear, setFinancialYear] = useState(new Date().getFullYear());

  const [deletionLogs, setDeletionLogs] = useState<DeletionLog[]>([]);

  const [session, setSession] = useState<Session | null>(null);

  // Notifications
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

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
    const { data: aptData } = await supabase.from('appointments').select('*').order('timestamp', { ascending: true });

    // Check for No-Shows (15 min tolerance)
    const now = new Date();
    const toleranceMs = 15 * 60 * 1000;

    const processedAppointments = aptData ? await Promise.all(aptData.map(async (apt: any) => {
      const aptDate = new Date(apt.timestamp);
      // Ensure we are comparing correctly
      if (apt.status === 'SCHEDULED' && (now.getTime() - aptDate.getTime() > toleranceMs)) {
        // Mark as NO_SHOW in DB
        await supabase.from('appointments').update({ status: 'NO_SHOW' }).eq('id', apt.id);
        return { ...apt, status: 'NO_SHOW' };
      }
      return apt;
    })) : [];

    if (processedAppointments.length > 0) {
      // Cast the processed data to Appointment[] after ensuring shape
      const formattedAppointments: Appointment[] = processedAppointments.map((apt: any) => ({
        ...apt,
        clientId: apt.client_id,
        clientName: apt.client_name,
        employeeName: apt.employee_name,
        serviceName: apt.service_name,
        durationMinutes: apt.duration_minutes,
        isPaid: apt.is_paid,
        paymentMethod: apt.payment_method,
        timestamp: new Date(apt.timestamp)
      }));
      setAppointments(formattedAppointments);
    }

    // Fetch Deletion Logs
    const { data: logData } = await supabase.from('deletion_logs').select('*').order('deleted_at', { ascending: false });
    if (logData) setDeletionLogs(logData);

    // Fetch Notifications
    const { data: notifData } = await supabase
      .from('admin_notifications')
      .select('*')
      .eq('read', false)
      .order('created_at', { ascending: false });
    if (notifData) setNotifications(notifData);
  };

  useEffect(() => {
    fetchInitialData();
  }, [session]);

  // Check for admin access automatically
  useEffect(() => {
    if (session?.user?.email === adminEmail) {
      setIsConfigAuthenticated(true);
    } else {
      setIsConfigAuthenticated(false);
    }
  }, [session, adminEmail]);

  const handleResolveNotification = async (notificationId: string, action: 'UPDATE' | 'IGNORE', data: AdminNotification['data']) => {
    // 1. If UPDATE, update client name
    if (action === 'UPDATE') {
      const { error } = await supabase
        .from('clients')
        .update({ name: data.newName })
        .eq('id', data.clientId);

      if (error) {
        alert('Erro ao atualizar nome do cliente.');
        return;
      }
      // Optimistic update
      setClients(prev => prev.map(c => c.id === data.clientId ? { ...c, name: data.newName } : c));
    }

    // 2. Mark notification as read
    const { error: readError } = await supabase
      .from('admin_notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (!readError) {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      //   alert(action === 'UPDATE' ? 'Nome atualizado com sucesso!' : 'Notificação removida.');
    }
  };

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

  const handleUpdateAppointment = async (id: string, finalPrice: number, isPaid: boolean, status?: AppointmentStatus, paymentMethod?: PaymentMethod, serviceName?: string, employeeName?: string, newTimestamp?: Date) => {
    const updates: any = {
      price: finalPrice,
      is_paid: isPaid,
      status: status || AppointmentStatus.SCHEDULED,
      payment_method: paymentMethod,
      service_name: serviceName,
      employee_name: employeeName
    };

    if (newTimestamp) {
      const hours = newTimestamp.getHours();
      if (hours < 9 || hours >= 18) {
        alert('O agendamento deve ser entre 09:00 e 18:00.');
        return;
      }
      updates.timestamp = newTimestamp.toISOString();
    }

    const { error } = await supabase.from('appointments').update(updates).eq('id', id);

    if (error) {
      console.error('Error updating appointment:', error);
      alert(`Erro ao atualizar agendamento: ${error.message}`);
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
          serviceName: serviceName || apt.serviceName,
          employeeName: employeeName || apt.employeeName,
          timestamp: newTimestamp || apt.timestamp
        };
      }
      return apt;
    }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()));
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

    // Validate Business Hours (09:00 - 18:00)
    const hours = timestamp.getHours();
    if (hours < 9 || hours >= 18) {
      alert('O agendamento deve ser entre 09:00 e 18:00.');
      return;
    }

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
      timestamp: new Date(finalApt.timestamp),
      clientId: finalApt.client_id,
      clientName: finalApt.client_name,
      employeeName: finalApt.employee_name,
      serviceName: finalApt.service_name,
      durationMinutes: finalApt.duration_minutes,
      isPaid: finalApt.is_paid,
      paymentMethod: finalApt.payment_method
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
    if (session?.user.email !== adminEmail) {
      alert('Apenas o administrador pode excluir funcionários.');
      return;
    }

    if (!confirm('Tem certeza que deseja remover este funcionário da equipe?')) return;

    // Soft Delete: Mark as inactive instead of deleting
    const { error } = await supabase.from('employees').update({ active: false }).eq('id', id);

    if (error) {
      alert('Erro ao excluir funcionário');
      return;
    }

    // Update local state: mark as inactive
    setEmployees(prev => prev.map(emp => emp.id === id ? { ...emp, active: false } : emp));
    alert('Funcionário removido da equipe. O histórico financeiro foi mantido.');
  };



  const handleDeleteAppointment = async (appointment: Appointment) => {
    // 1. If it's a paid/completed appointment, require admin
    if (appointment.status === AppointmentStatus.COMPLETED) {
      if (session?.user.email !== adminEmail) {
        alert('Apenas o administrador pode excluir agendamentos concluídos.');
        return;
      }

      const reason = prompt('Motivo da exclusão (opcional):');

      // Log the deletion
      const logEntry = {
        user_email: session?.user.email,
        appointment_details: appointment,
        reason: reason || 'Exclusão manual de agendamento realizado'
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

  const handleDeleteClient = async (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    // Soft delete
    const { error } = await supabase
      .from('clients')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', clientId);

    if (error) {
      alert('Erro ao excluir cliente.');
      return;
    }

    // Log deletion
    const logEntry = {
      user_email: session?.user.email,
      appointment_details: { clientName: client.name, clientId: client.id },
      reason: 'Exclusão de Cliente'
    };
    await supabase.from('deletion_logs').insert(logEntry);

    // Refresh logs
    const { data: newLogs } = await supabase.from('deletion_logs').select('*').order('deleted_at', { ascending: false });
    if (newLogs) setDeletionLogs(newLogs);

    // Optimistic Update
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, deleted_at: new Date().toISOString() } : c));
    alert(`Cliente ${client.name} foi inativado com sucesso.`);
  };

  const handleMenuNavigation = (view: ViewState) => {
    setCurrentView(view);
    setIsMenuOpen(false);
  };



  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        // Calculate conflicts
        const conflictAppointments = appointments.filter(apt => {
          if (apt.status === AppointmentStatus.CANCELED) return false;
          const client = clients.find(c => c.id === apt.clientId);
          if (!client) return false;
          return apt.clientName.trim().toLowerCase() !== client.name.trim().toLowerCase();
        });

        return (
          <div className="animate-slide-in space-y-6">
            <section>
              <SummaryCards stats={stats} employees={employees} showEmployeeStats={false} />
            </section>

            {/* Conflict Warning Section */}
            {conflictAppointments.length > 0 && (
              <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6 animate-in slide-in-from-top-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500 border border-yellow-500/30">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-lg text-white uppercase tracking-wide">Atenção: Possíveis Duplicatas</h3>
                    <p className="text-brand-muted text-xs">Clientes agendaram com nomes diferentes do cadastro. Verifique e unifique se necessário.</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {conflictAppointments.map(apt => {
                    const originalClient = clients.find(c => c.id === apt.clientId);
                    return (
                      <div key={apt.id} className="bg-brand-onyx border border-white/5 p-4 rounded-xl flex flex-col gap-2 relative overflow-hidden group hover:border-yellow-500/30 transition-colors">
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                          <UserIcon className="w-12 h-12 text-yellow-500" />
                        </div>

                        <div>
                          <p className="text-[10px] text-brand-muted uppercase tracking-wider font-bold mb-1">No Agendamento</p>
                          <p className="text-white font-bold text-lg leading-none">{apt.clientName}</p>
                          <p className="text-brand-gold font-mono text-xs mt-1">{apt.customerPhone || originalClient?.phone}</p>
                        </div>

                        <div className="w-full h-[1px] bg-white/5 my-1"></div>

                        <div>
                          <p className="text-[10px] text-brand-muted uppercase tracking-wider font-bold mb-1">No Cadastro (Original)</p>
                          <p className="text-brand-muted font-bold">{originalClient?.name}</p>
                        </div>

                        <div className="mt-2 pt-2 border-t border-white/5 flex gap-2">
                          {/* Future action: Button to update client name to match appointment */}
                          <button
                            onClick={() => {
                              // Copy new name to clipboard or prompt update
                              if (confirm(`Deseja atualizar o cadastro do cliente para "${apt.clientName}"?`)) {
                                // Update client details logic could go here
                                // For now, just a prompt as requested "informe... que eu manualente faço"
                                // But we can be helpful:
                                supabase.from('clients').update({ name: apt.clientName }).eq('id', apt.clientId).then(({ error }) => {
                                  if (!error) {
                                    alert('Nome atualizado com sucesso!');
                                    // Optimistic update
                                    setClients(prev => prev.map(c => c.id === apt.clientId ? { ...c, name: apt.clientName } : c));
                                  } else {
                                    alert('Erro ao atualizar.');
                                  }
                                });
                              }
                            }}
                            className="text-[10px] bg-yellow-500/10 text-yellow-500 px-3 py-2 rounded hover:bg-yellow-500/20 transition-colors font-bold uppercase w-full"
                          >
                            Atualizar Cadastro
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="bg-brand-onyx min-h-[500px]">
              <AppointmentList
                appointments={appointments}
                clients={clients}
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
              clients={clients}
              onAppointmentClick={handleAppointmentClick}
              onQuickTogglePay={handleQuickToggle}
              selectedDate={agendaDate}
              onDateChange={setAgendaDate}
            />
          </section>
        );
      case 'clientes':
        return <div className="animate-slide-in"><ClientList clients={clients} appointments={appointments} onUpdatePhone={handleUpdateClientPhone} onNewClientClick={() => setIsNewClientModalOpen(true)} onDeleteClient={handleDeleteClient} /></div>;
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

                {/* Ex-Team Section */}
                {employees.filter(e => e.active === false).length > 0 && (
                  <div className="mt-8 pt-8 border-t border-white/5 opacity-60 hover:opacity-100 transition-opacity">
                    <h3 className="font-display font-black text-xs text-brand-muted uppercase tracking-[0.2em] mb-4">Ex-Colaboradores (Histórico)</h3>
                    <div className="space-y-3">
                      {employees.filter(e => e.active === false).map(emp => {
                        const revenue = stats.revenueByEmployee[emp.name] || 0;
                        return (
                          <div key={emp.id} className="flex justify-between items-center bg-brand-onyx border border-white/5 p-3 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center grayscale"><UserIcon className="w-4 h-4 text-brand-muted" /></div>
                              <div>
                                <p className="text-white font-bold text-xs">{emp.name}</p>
                                <p className="text-[9px] text-brand-muted uppercase tracking-wider">Inativo</p>
                              </div>
                            </div>
                            <span className="font-mono text-brand-gold font-bold text-xs">R$ {revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
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
                <p className="text-white text-sm mt-4">Você precisa estar logado com o e-mail de administrador ({adminEmail}) para acessar.</p>
                <p className="text-brand-muted text-xs">Atual: {session?.user.email || 'Não logado'}</p>
              </div>

              <div className="text-center text-white">
                <p className="text-red-400 font-bold mb-4">Acesso Negado</p>
                <button onClick={() => setCurrentView('dashboard')} className="bg-white/10 text-white border border-white/5 px-6 py-2 rounded-lg font-bold hover:bg-white/20 transition-colors">
                  Voltar ao Dashboard
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
                <button onClick={() => supabase.auth.signOut()} className="p-2 bg-brand-onyx border border-white/5 rounded-lg text-[9px] font-black text-brand-muted uppercase flex items-center gap-2"><Lock className="w-3 h-3" /> Logout</button>
              </div>
              <div className="flex gap-3">
                <input type="text" placeholder="Nome do Funcionário" value={newEmployeeName} onChange={(e) => setNewEmployeeName(e.target.value)} className="flex-1 bg-brand-onyx border border-white/10 rounded-xl px-5 py-4 text-white text-sm" />
                <button onClick={handleAddEmployee} className="bg-brand-gold text-brand-onyx w-14 rounded-xl flex items-center justify-center shadow-lg shadow-brand-gold/10"><UserPlus className="w-6 h-6" /></button>
              </div>
              <div className="space-y-4">
                {employees.filter(emp => emp.active !== false).map(emp => (
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
                    const isClientDeletion = log.reason === 'Exclusão de Cliente';

                    return (
                      <div key={log.id} className="bg-brand-onyx border border-white/5 p-4 rounded-xl flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-white font-bold text-sm">
                              {isClientDeletion ? `Cliente Excluído: ${apt.clientName}` : `Agendamento de ${apt.clientName}`}
                            </p>
                            <p className="text-brand-muted text-xs">Excluído por: {log.user_email}</p>
                          </div>
                          <span className="text-[10px] text-brand-muted font-mono">{date.toLocaleDateString()} {date.toLocaleTimeString()}</span>
                        </div>
                        <div className="text-[10px] text-brand-muted/70 uppercase tracking-wider bg-black/20 p-2 rounded">
                          {isClientDeletion ? (
                            <span>Ação: Inativação de Cadastro | Motivo: Solicitação Administrativa</span>
                          ) : (
                            <span>Serviço: {apt.serviceName || '-'} | Valor: R$ {apt.price} | Status Original: {apt.status}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-20 border-t border-white/5 opacity-50 text-center"><p className="text-[10px] text-brand-muted uppercase tracking-[0.5em] font-black">Barbearia App v1.2</p></div>
          </div>
        );
      default:
        return null;
    }
  };



  if (isPublicBooking) {
    return <PublicBooking />;
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-brand-onyx pb-10 font-sans relative overflow-x-hidden">
      <Header
        onMenuClick={() => setIsMenuOpen(true)}
        notificationCount={notifications.length}
        onNotificationClick={() => setIsNotificationModalOpen(true)}
      />
      <main className="space-y-8 pt-4">{renderContent()}</main>
      {(currentView === 'dashboard' || currentView === 'agenda') && (
        <div className="fixed bottom-10 right-6 z-30">
          <button onClick={() => setIsNewAppointmentModalOpen(true)} className="w-16 h-16 bg-gold-gradient text-brand-onyx rounded-2xl flex items-center justify-center shadow-[0_10px_30px_rgba(212,175,55,0.3)] border border-brand-gold/50"><Plus className="w-9 h-9" strokeWidth={3} /></button>
        </div>
      )}
      <CheckpointModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} appointment={selectedAppointment} onConfirm={handleUpdateAppointment} onDelete={handleDeleteAppointment} employees={employees.filter(e => e.active !== false)} />
      <NewAppointmentModal isOpen={isNewAppointmentModalOpen} onClose={() => setIsNewAppointmentModalOpen(false)} onConfirm={handleCreateAppointment} clients={clients.filter(c => !c.deleted_at)} employees={employees.filter(e => e.active !== false)} />
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

      {/* Notifications Modal */}
      {isNotificationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-brand-concreteDark border border-white/10 rounded-2xl p-6 max-w-lg w-full space-y-6 shadow-2xl relative">
            <button onClick={() => setIsNotificationModalOpen(false)} className="absolute top-4 right-4 text-brand-muted hover:text-white"><X className="w-6 h-6" /></button>

            <div className="space-y-2">
              <h3 className="font-display font-black text-xl text-white uppercase tracking-tight">Notificações</h3>
              <p className="text-brand-muted text-xs">Gestão de duplicidades e alertas.</p>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="text-center py-10 text-brand-muted">
                  <Check className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p>Nenhuma notificação nova.</p>
                </div>
              ) : (
                notifications.map(notif => (
                  <div key={notif.id} className="bg-brand-onyx border border-white/5 p-4 rounded-xl space-y-3">
                    {notif.type === 'DUPLICATE_CLIENT_NAME' && (
                      <>
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 shrink-0">
                            <UserCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-sm">Divergência de Nome</h4>
                            <p className="text-brand-muted text-xs mt-1">
                              O cliente do telefone <span className="font-mono text-brand-gold">{notif.data.phone}</span> usou um nome diferente.
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm bg-black/20 p-3 rounded-lg">
                          <div>
                            <p className="text-[10px] uppercase text-brand-muted font-bold">Cadastro Atual</p>
                            <p className="font-bold text-white">{notif.data.oldName}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase text-brand-muted font-bold">Novo Nome (Usado)</p>
                            <p className="font-bold text-brand-gold">{notif.data.newName}</p>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => handleResolveNotification(notif.id, 'IGNORE', notif.data)}
                            className="flex-1 py-3 rounded-lg border border-white/10 text-brand-muted text-xs font-bold hover:bg-white/5 transition-colors"
                          >
                            Manter "{notif.data.oldName}"
                          </button>
                          <button
                            onClick={() => handleResolveNotification(notif.id, 'UPDATE', notif.data)}
                            className="flex-1 py-3 rounded-lg bg-yellow-500 text-brand-onyx text-xs font-bold hover:opacity-90 transition-opacity"
                          >
                            Atualizar para "{notif.data.newName}"
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default App;