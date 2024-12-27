export interface Payment {
  id: number;
  patient: string;
  service: string;
  value: number;
  dueDate: string;
  status: 'pending' | 'completed' | 'reconciled';
  linkedPayments: number[];
}