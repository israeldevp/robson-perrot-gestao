import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { Service, Employee } from '../types';
import { Calendar, Clock, User, Phone, Check, ChevronLeft, ChevronRight, Loader2, Home } from 'lucide-react';

type Step = 'service' | 'employee' | 'date' | 'time' | 'details' | 'success';

export const PublicBooking: React.FC = () => {
    const [step, setStep] = useState<Step>('service');
    const [loading, setLoading] = useState(false);

    // Data
    const [services, setServices] = useState<Service[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);

    // Selection
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');

    // Availability
    const [occupiedSlots, setOccupiedSlots] = useState<{ timestamp: string, duration: number }[]>([]);

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (step === 'time') {
            fetchAvailability();
        }
    }, [selectedDate, step]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [servicesRes, employeesRes] = await Promise.all([
                supabase.from('services').select('*').eq('active', true).order('name'),
                supabase.from('employees').select('*').eq('active', true).order('name')
            ]);

            if (servicesRes.error) console.error('Services error:', servicesRes.error);
            if (employeesRes.error) console.error('Employees error:', employeesRes.error);

            if (servicesRes.data) setServices(servicesRes.data);
            if (employeesRes.data) setEmployees(employeesRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailability = async () => {
        setLoading(true);
        try {
            // Get start and end of selected date
            const startOfDay = new Date(selectedDate);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(selectedDate);
            endOfDay.setHours(23, 59, 59, 999);

            const { data } = await supabase
                .from('public_appointment_slots')
                .select('timestamp, duration_minutes')
                .gte('timestamp', startOfDay.toISOString())
                .lte('timestamp', endOfDay.toISOString())
                .neq('status', 'CANCELED');

            if (data) {
                setOccupiedSlots(data.map((item: any) => ({
                    timestamp: item.timestamp,
                    duration: item.duration_minutes
                })));
            }
        } catch (error) {
            console.error('Error fetching availability:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateTimeSlots = () => {
        const slots: string[] = [];
        const startHour = 9;
        const endHour = 17; // Last slot starts at 17:30

        const now = new Date();
        const isToday = selectedDate.toDateString() === now.toDateString();

        // Iterate hours
        for (let hour = startHour; hour <= endHour; hour++) {
            // 00 and 30 minutes
            const minutes = [0, 30];

            for (let minute of minutes) {
                // Stop if it's past 17:30
                if (hour === 17 && minute > 30) continue;

                // Check if slot is in the past (only if date is Today)
                if (isToday) {
                    const slotTime = new Date(selectedDate);
                    slotTime.setHours(hour, minute, 0, 0);
                    if (slotTime < now) continue;
                }

                const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

                // Check availability
                const slotDate = new Date(selectedDate);
                slotDate.setHours(hour, minute, 0, 0);

                const isOccupied = occupiedSlots.some(slot => {
                    const bookedStart = new Date(slot.timestamp);
                    const bookedEnd = new Date(bookedStart.getTime() + slot.duration * 60000);

                    // Simple overlap check: 
                    // New slot starts at 'slotDate', ends at 'slotDate + 30'
                    // We check if this new slot interacts with any existing booking
                    const newSlotEnd = new Date(slotDate.getTime() + 30 * 60000); // Assuming 30 min slots for simplicity of display, though service might be longer

                    // Check if the NEW slot overlaps with EXISTING booking
                    return (
                        (slotDate >= bookedStart && slotDate < bookedEnd) || // Start is inside
                        (newSlotEnd > bookedStart && newSlotEnd <= bookedEnd) // End is inside
                    );
                });

                if (!isOccupied) {
                    slots.push(timeString);
                }
            }
        }
        return slots;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedService || !selectedTime || !customerName || !customerPhone) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        setLoading(true);

        try {
            // 1. Find or Create Client
            let clientId: string | null = null;
            const cleanPhone = customerPhone.replace(/\D/g, '');

            try {
                // Try to find by phone (formatted or clean) - USE limit(1) to be safe against duplicates
                const { data: existingClients } = await supabase
                    .from('clients')
                    .select('id, name')
                    .or(`phone.eq.${customerPhone},phone.eq.${cleanPhone}`)
                    .limit(1); // Safest way: just take the first one found

                if (existingClients && existingClients.length > 0) {
                    clientId = existingClients[0].id;
                    const existingClient = existingClients[0];

                    // CHECK FOR NAME MISMATCH
                    // Normalize names for comparison
                    const inputName = customerName.trim();
                    const dbName = existingClient.name.trim();

                    if (inputName.toLowerCase() !== dbName.toLowerCase()) {
                        console.log('Name mismatch detected:', inputName, 'vs', dbName);
                        // Create notification for admin
                        // We don't await this to not block the user
                        supabase.from('admin_notifications').insert({
                            type: 'DUPLICATE_CLIENT_NAME',
                            data: {
                                clientId: existingClient.id,
                                oldName: dbName,
                                newName: inputName,
                                phone: customerPhone
                            },
                            read: false
                        }).then(({ error }) => {
                            if (error) console.error('Error creating notification:', error);
                        });
                    }
                } else {
                    // Create new client
                    const { data: newClient, error: createError } = await supabase
                        .from('clients')
                        .insert({
                            name: customerName,
                            phone: customerPhone,
                            total_spent: 0
                        })
                        .select()
                        .single();

                    if (createError) {
                        // Check for unique constraint violation (duplicate key) - error 23505 in Postgres
                        if (createError.code === '23505') {
                            console.warn('Duplicate client detected during creation. Retrying fetch.');
                            // Retry fetch one more time
                            const { data: retryClients } = await supabase
                                .from('clients')
                                .select('id, name')
                                .or(`phone.eq.${customerPhone},phone.eq.${cleanPhone}`)
                                .limit(1);

                            if (retryClients && retryClients.length > 0) {
                                clientId = retryClients[0].id;
                            } else {
                                console.error('CRITICAL: Could not find client even after duplicate error.');
                                // FALLBACK: If we absolutely can't find it (maybe RLS?), 
                                // we might want to throw, BUT user asked for "most fluid possible".
                                // If we can't link a client, the appointment FK constraint will fail anyway.
                                throw new Error('Falha ao registrar cliente. Por favor, contate o estabelecimento.');
                            }
                        } else {
                            throw createError;
                        }
                    } else if (newClient) {
                        clientId = newClient.id;
                    }
                }
            } catch (err: any) {
                console.error('Client resolution error:', err);
                throw new Error(`Erro ao identificar cliente: ${err.message || 'Erro desconhecido'}`);
            }

            if (!clientId) throw new Error('Failed to resolve Client ID');

            // 2. Construct timestamp
            const [hours, minutes] = selectedTime.split(':').map(Number);
            const timestamp = new Date(selectedDate);
            timestamp.setHours(hours, minutes, 0, 0);

            // 3. Employee Assignment
            const finalEmployee = selectedEmployee ? selectedEmployee.name :
                (employees.length > 0 ? employees[Math.floor(Math.random() * employees.length)].name : 'A definir');

            // 4. Create Appointment
            const { error } = await supabase
                .from('appointments')
                .insert({
                    client_id: clientId, // Linked!
                    client_name: customerName,
                    customer_name: customerName,
                    customer_phone: customerPhone,
                    service_name: selectedService.name,
                    price: selectedService.price,
                    duration_minutes: selectedService.duration_minutes,
                    timestamp: timestamp.toISOString(),
                    employee_name: finalEmployee,
                    status: 'SCHEDULED',
                    is_paid: false
                });

            if (error) throw error;

            setStep('success');
        } catch (error) {
            console.error('Error booking:', error);
            alert(`Erro ao realizar agendamento: ${error instanceof Error ? error.message : 'Tente novamente.'}`);
        } finally {
            setLoading(false);
        }
    };

    const isDayAvailable = (date: Date) => {
        const day = date.getDay();
        // 0 = Sunday, 1 = Monday. Block them.
        return day !== 0 && day !== 1;
    };

    const [isInternational, setIsInternational] = useState(false);
    const [isSearchingClient, setIsSearchingClient] = useState(false);

    const formatBrPhone = (value: string) => {
        // Remove non-digits
        const cleaned = value.replace(/\D/g, '');
        // Limit to 11 digits
        const match = cleaned.match(/^(\d{0,2})(\d{0,5})(\d{0,4})$/);
        if (match) {
            let formatted = '';
            if (match[1]) formatted += `(${match[1]}`;
            if (match[2]) formatted += `) ${match[2]}`;
            if (match[3]) formatted += `-${match[3]}`;
            return formatted;
        }
        return value;
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (isInternational) {
            setCustomerPhone(val);
        } else {
            // Enforce BR format but ALLOW extra length (e.g. for copy-paste with country code)
            const cleaned = val.replace(/\D/g, '');
            // Standard BR mobile is 11, Landline is 10. +55 adds 2. Total 13.
            // Let's be generous and allow up to 15 (E.164 standard max) to avoid blocking valid inputs
            if (cleaned.length <= 15) {
                if (cleaned.length > 11) {
                    // If it's very long, treated as raw/international-ish but strictly digits
                    setCustomerPhone(val);
                } else {
                    setCustomerPhone(formatBrPhone(cleaned));
                }
            }
        }
    };

    const handlePhoneBlur = async () => {
        if (!customerPhone || customerPhone.length < 10) return;

        try {
            // Try to find client by phone (search both formatted and clean versions to be safe)
            const cleanPhone = customerPhone.replace(/\D/g, '');

            const { data: clients } = await supabase
                .from('clients')
                .select('id, name')
                .or(`phone.eq.${customerPhone},phone.eq.${cleanPhone}`)
                .limit(1);

            const data = clients?.[0];

            if (data && data.name) {
                // Scenario 1: User hasn't typed a name yet -> Auto-fill
                if (!customerName || customerName.trim() === '') {
                    setCustomerName(data.name);
                    return;
                }
            }
        } catch (err) {
            console.error('Error finding client:', err);
        }
    };



    const renderServiceStep = () => (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-bold text-white mb-6">Escolha um Serviço</h2>
            {loading && services.length === 0 ? (
                <div className="text-center py-20">
                    <Loader2 className="w-10 h-10 text-brand-gold animate-spin mx-auto" />
                    <p className="text-brand-muted mt-4 text-sm animate-pulse">Carregando serviços...</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {services.map(service => (
                        <button
                            key={service.id}
                            onClick={() => { setSelectedService(service); setStep('employee'); }}
                            className="w-full text-left p-4 rounded-xl bg-brand-concreteDark border border-white/5 hover:border-brand-gold/50 hover:bg-white/5 transition-all group"
                        >
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-white group-hover:text-brand-gold transition-colors">{service.name}</span>
                                <span className="font-mono text-brand-gold">R$ {service.price}</span>
                            </div>
                            <p className="text-xs text-brand-muted mt-1">{service.duration_minutes} min</p>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );

    const renderEmployeeStep = () => (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-bold text-white mb-6">Escolha um Profissional</h2>
            <div className="grid gap-3">
                <button
                    onClick={() => { setSelectedEmployee(null); setStep('date'); }}
                    className="w-full text-left p-4 rounded-xl bg-brand-concreteDark border border-white/5 hover:border-brand-gold/50 hover:bg-white/5 transition-all group flex items-center gap-4"
                >
                    <div className="w-10 h-10 rounded-full bg-brand-gold/20 flex items-center justify-center text-brand-gold font-bold">?</div>
                    <span className="font-bold text-white group-hover:text-brand-gold transition-colors">Qualquer Profissional</span>
                </button>
                {employees.map(emp => (
                    <button
                        key={emp.id}
                        onClick={() => { setSelectedEmployee(emp); setStep('date'); }}
                        className="w-full text-left p-4 rounded-xl bg-brand-concreteDark border border-white/5 hover:border-brand-gold/50 hover:bg-white/5 transition-all group flex items-center gap-4"
                    >
                        <div className="w-10 h-10 rounded-full bg-brand-onyx border border-white/10 flex items-center justify-center text-xs font-bold text-brand-muted">{emp.name.substring(0, 2).toUpperCase()}</div>
                        <span className="font-bold text-white group-hover:text-brand-gold transition-colors">{emp.name}</span>
                    </button>
                ))}
            </div>
        </div>
    );

    const renderDateStep = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-bold text-white">Escolha uma Data</h2>
            <div className="bg-brand-concreteDark p-4 rounded-xl border border-white/5">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => {
                            const newDate = new Date(selectedDate);
                            newDate.setDate(newDate.getDate() - 1);
                            if (newDate >= new Date()) setSelectedDate(newDate);
                        }}
                        disabled={selectedDate <= new Date()}
                        className="p-2 text-brand-muted hover:text-white disabled:opacity-30"
                    >
                        <ChevronLeft />
                    </button>
                    <span className="font-bold text-white capitalize">
                        {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                    <button
                        onClick={() => {
                            const newDate = new Date(selectedDate);
                            newDate.setDate(newDate.getDate() + 1);
                            setSelectedDate(newDate);
                        }}
                        className="p-2 text-brand-muted hover:text-white"
                    >
                        <ChevronRight />
                    </button>
                </div>

                {!isDayAvailable(selectedDate) ? (
                    <div className="text-center py-8 text-brand-muted">
                        <p className="mb-2">Estamos fechados neste dia.</p>
                        <p className="text-xs">Atendemos de Terça a Sábado.</p>
                    </div>
                ) : (
                    <div className="text-center py-4">
                        <button
                            onClick={() => setStep('time')}
                            className="bg-brand-gold text-brand-onyx font-bold px-8 py-3 rounded-xl hover:opacity-90 transition-opacity"
                        >
                            Ver Horários
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    const renderTimeStep = () => {
        const slots = generateTimeSlots();

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <h2 className="text-xl font-bold text-white">Escolha um Horário</h2>
                {loading ? (
                    <div className="text-center py-10"><Loader2 className="w-8 h-8 text-brand-gold animate-spin mx-auto" /></div>
                ) : slots.length === 0 ? (
                    <div className="text-center py-10 text-brand-muted">
                        Não há horários disponíveis para esta data.
                    </div>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {slots.map(time => (
                            <button
                                key={time}
                                onClick={() => { setSelectedTime(time); setStep('details'); }}
                                className="p-3 rounded-lg bg-brand-concreteDark border border-white/5 text-white hover:bg-brand-gold hover:text-brand-onyx transition-colors font-mono text-sm"
                            >
                                {time}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderDetailsStep = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-bold text-white">Seus Dados</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs uppercase tracking-wider text-brand-muted mb-2 font-bold">Nome Completo</label>
                    <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted" />
                        <input
                            type="text"
                            required
                            value={customerName}
                            onChange={e => setCustomerName(e.target.value)}
                            className="w-full bg-brand-concreteDark border border-white/10 rounded-xl py-4 pl-12 text-white placeholder:text-white/20 focus:border-brand-gold transition-colors"
                            placeholder="Seu nome"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs uppercase tracking-wider text-brand-muted mb-2 font-bold">WhatsApp</label>
                    <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted" />
                        <input
                            type="tel"
                            required
                            value={customerPhone}
                            onChange={handlePhoneChange}
                            onBlur={handlePhoneBlur}
                            className="w-full bg-brand-concreteDark border border-white/10 rounded-xl py-4 pl-12 text-white placeholder:text-white/20 focus:border-brand-gold transition-colors"
                            placeholder={isInternational ? "+00 123 456 789" : "(00) 00000-0000"}
                        />

                    </div>

                    <div className="mt-2 flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="intl-check"
                            checked={isInternational}
                            onChange={(e) => {
                                setIsInternational(e.target.checked);
                                setCustomerPhone(''); // Clear format mismatch
                            }}
                            className="w-4 h-4 rounded border-brand-muted bg-brand-concreteDark text-brand-gold focus:ring-brand-gold"
                        />
                        <label htmlFor="intl-check" className="text-xs text-brand-muted cursor-pointer hover:text-white transition-colors">
                            Meu número não é do Brasil (Internacional)
                        </label>
                    </div>
                </div>

                <div className="bg-brand-onyx/50 border border-white/5 p-4 rounded-xl space-y-2 mt-4">
                    <div className="flex justify-between text-sm">
                        <span className="text-brand-muted">Serviço</span>
                        <span className="text-white font-bold">{selectedService?.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-brand-muted">Profissional</span>
                        <span className="text-white font-bold">{selectedEmployee?.name || 'Qualquer Profissional'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-brand-muted">Data</span>
                        <span className="text-white font-bold">{selectedDate.toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-brand-muted">Horário</span>
                        <span className="text-white font-bold">{selectedTime}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-white/5">
                        <span className="text-brand-muted">Valor</span>
                        <span className="text-brand-gold font-bold">R$ {selectedService?.price.toFixed(2)}</span>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-brand-gold text-brand-onyx font-bold py-4 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" /> : 'Confirmar Agendamento'}
                </button>
            </form>
        </div>
    );


    const handleGoHome = () => {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-brand-onyx flex flex-col font-sans">
                <header className="p-6 text-center border-b border-white/5 bg-brand-concreteDark">
                    <h1 className="font-display font-black text-xl text-white uppercase tracking-wider">Barbearia App</h1>
                </header>
                <main className="flex-1 flex flex-col items-center justify-center p-6">
                    <Loader2 className="w-16 h-16 text-brand-gold animate-spin mb-6" />
                    <h2 className="text-xl font-bold text-white animate-pulse">Confirmando seu agendamento...</h2>
                    <p className="text-brand-muted text-sm mt-2">Por favor, aguarde.</p>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-onyx flex flex-col font-sans">
            <header className="p-6 text-center border-b border-white/5 bg-brand-concreteDark">
                <h1 className="font-display font-black text-xl text-white uppercase tracking-wider">Barbearia App</h1>
            </header>

            <main className="flex-1 p-6 max-w-lg mx-auto w-full">
                {step !== 'service' && step !== 'success' ? (
                    <button
                        onClick={() => {
                            if (step === 'employee') setStep('service');
                            if (step === 'date') setStep('employee');
                            if (step === 'time') setStep('date');
                            if (step === 'details') setStep('time');
                        }}
                        className="mb-6 text-brand-muted hover:text-white flex items-center gap-2 text-sm font-bold uppercase tracking-wider"
                    >
                        <ChevronLeft className="w-4 h-4" /> Voltar
                    </button>
                ) : step === 'service' ? (
                    <button
                        onClick={handleGoHome}
                        className="mb-6 text-brand-muted hover:text-white flex items-center gap-2 text-sm font-bold uppercase tracking-wider"
                    >
                        <ChevronLeft className="w-4 h-4" /> Voltar ao Início
                    </button>
                ) : null}

                {step === 'service' && renderServiceStep()}
                {step === 'employee' && renderEmployeeStep()}
                {step === 'date' && renderDateStep()}
                {step === 'time' && renderTimeStep()}
                {step === 'details' && renderDetailsStep()}
                {step === 'success' && selectedTime && (
                    <SuccessStep
                        date={selectedDate}
                        time={selectedTime}
                        onGoHome={handleGoHome}
                    />
                )}
            </main>
        </div>
    );
};

// Extracted Component to fix Hooks Rule violation
const SuccessStep = ({ date, time, onGoHome }: { date: Date, time: string, onGoHome: () => void }) => {
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((prev) => prev - 1);
        }, 1000);

        const redirect = setTimeout(() => {
            onGoHome();
        }, 5000);

        return () => {
            clearInterval(timer);
            clearTimeout(redirect);
        };
    }, [onGoHome]);

    return (
        <div className="text-center space-y-6 py-10 animate-in zoom-in duration-300 relative">
            <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto border border-green-500/50">
                <Check className="w-10 h-10" />
            </div>
            <div className="space-y-2">
                <h2 className="text-2xl font-black text-white uppercase">Agendado com Sucesso!</h2>
                <p className="text-brand-muted">Te esperamos no dia {date.toLocaleDateString()} às {time}.</p>
                <p className="text-brand-muted text-xs mt-4">Retornando ao início em {countdown}s...</p>
            </div>

            <div className="flex flex-col gap-3 pt-4">
                <button
                    onClick={onGoHome}
                    className="w-full bg-brand-concreteDark border border-white/10 text-white font-bold py-3 rounded-xl hover:bg-white/5 transition-colors uppercase tracking-wider text-sm flex items-center justify-center gap-2"
                >
                    <Home className="w-4 h-4" />
                    Voltar ao Início Agora
                </button>
            </div>
        </div>
    );
};
