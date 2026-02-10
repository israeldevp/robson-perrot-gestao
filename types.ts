
export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
  NO_SHOW = 'NO_SHOW'
}

export enum PaymentMethod {
  CASH = 'Dinheiro',
  PIX = 'Pix',
  CARD = 'Cartão'
}

export interface Employee {
  id: string;
  name: string;
  active?: boolean;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  lastVisit?: string;
  totalSpent: number;
}

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  employeeName: string;
  serviceName: string;
  timestamp: Date;
  durationMinutes: number;
  price: number;
  isPaid: boolean;
  paymentMethod?: PaymentMethod;
  status: AppointmentStatus;
  notes?: string;
}

export interface DashboardStats {
  totalRevenue: number;
  totalAppointments: number;
  completedAppointments: number;
  pendingPayment: number;
  revenueByEmployee: Record<string, number>;
}

export interface DeletionLog {
  id: string;
  user_email: string;
  appointment_details: any;
  reason?: string;
  deleted_at: string;
}
