
import { Appointment, AppointmentStatus, Client, Employee, PaymentMethod } from '../types';

export const MOCK_EMPLOYEES: Employee[] = [
  { id: 'e1', name: 'Robson' },
  { id: 'e2', name: 'Gabriel' },
];

const coreNames = [
  { name: 'Carlos Silva', phone: '(11) 99999-0001' },
  { name: 'Marcos Oliveira', phone: '(11) 99999-0002' },
  { name: 'João Souza', phone: '(11) 99999-0003' },
  { name: 'Felipe Santos', phone: '(11) 99999-0004' },
  { name: 'Roberto Dias', phone: '(11) 99999-0005' }
];

const newNames = [
  "Ricardo Almeida", "Lucas Ferreira", "André Costa", "Bruno Schmidt", "Tiago Mendes",
  "Vinícius Rocha", "Diego Lima", "Samuel Pires", "Gustavo Henrique", "Fernando Vaz",
  "Alexandre Frota", "Sérgio Murilo", "Paulo Roberto", "Leandro Souza", "Fábio Júnior",
  "Eduardo Paes", "Marcelo D2", "Rodrigo Faro", "Otávio Mesquita", "Danilo Gentili"
];

// Gerar lista expandida de clientes
export const MOCK_CLIENTS: Client[] = [
  ...coreNames.map((c, i) => ({ id: `c${i}`, name: c.name, phone: c.phone, totalSpent: 0 })),
  ...newNames.map((name, i) => ({ id: `new${i}`, name, phone: `(11) 98888-${1000 + i}`, totalSpent: 0 }))
];

const services = [
  { name: 'Corte Degradê', price: 50 },
  { name: 'Corte + Barba', price: 85 },
  { name: 'Corte Máquina', price: 35 },
  { name: 'Corte Máquina + Tesoura', price: 55 },
  { name: 'Corte Tesoura', price: 60 },
  { name: 'Acabamento', price: 25 }
];

const generateHistory = (): Appointment[] => {
  const appointments: Appointment[] = [];
  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setDate(now.getDate() - 180);

  // Loop dia a dia (passado e futuro)
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + 20);

  for (let d = new Date(sixMonthsAgo); d <= futureDate; d.setDate(d.getDate() + 1)) {
    // Pular Domingos
    if (d.getDay() === 0) continue;

    const dailyLimit = 4 + Math.floor(Math.random() * 4); // 4 a 8 atendimentos/dia
    const usedTimes = new Set();

    for (let i = 0; i < dailyLimit; i++) {
      const hour = 9 + Math.floor(Math.random() * 10); // 09:00 às 19:00
      const minute = Math.random() > 0.5 ? 0 : 30;
      const timeKey = `${hour}:${minute}`;

      if (usedTimes.has(timeKey)) continue;
      usedTimes.add(timeKey);

      const timestamp = new Date(d);
      timestamp.setHours(hour, minute, 0, 0);

      // Lógica de recorrência para clientes core (a cada 15 dias)
      const dayOfYear = Math.floor((d.getTime() - sixMonthsAgo.getTime()) / (1000 * 60 * 60 * 24));
      let client: Client;

      if (dayOfYear % 15 === 0 && i < coreNames.length) {
        client = MOCK_CLIENTS[i];
      } else {
        client = MOCK_CLIENTS[Math.floor(Math.random() * MOCK_CLIENTS.length)];
      }

      const service = services[Math.floor(Math.random() * services.length)];
      const employee = MOCK_EMPLOYEES[i % 2]; // Alterna Robson e Gabriel

      // Definir status baseado se é passado ou futuro
      const isPast = timestamp < now;
      let status: AppointmentStatus;
      let isPaid = false;
      let paymentMethod: PaymentMethod | undefined = undefined;

      if (isPast) {
        // Lógica para passado (95% concluído)
        status = Math.random() > 0.05 ? AppointmentStatus.COMPLETED : AppointmentStatus.NO_SHOW;
        isPaid = status === AppointmentStatus.COMPLETED;
        paymentMethod = isPaid ? PaymentMethod.PIX : undefined;
      } else {
        // Lógica para futuro (Agendado)
        status = AppointmentStatus.SCHEDULED;
        isPaid = false;
        paymentMethod = undefined;
      }

      appointments.push({
        id: `apt-${timestamp.getTime()}-${i}`,
        clientId: client.id,
        clientName: client.name,
        employeeName: employee.name,
        serviceName: service.name,
        timestamp: new Date(timestamp),
        durationMinutes: 30,
        price: service.price,
        isPaid: isPaid,
        paymentMethod: paymentMethod,
        status: status
      });
    }
  }

  return appointments.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
};

export const MOCK_APPOINTMENTS: Appointment[] = generateHistory();
