export type UserRole = 'admin' | 'worker';

export interface Profile {
    id: string;
    email: string;
    full_name: string | null;
    role: UserRole;
    created_at: string;
}

export type PaymentMethod = 'cash' | 'yape' | 'card' | 'transfer';
export type CashLocation = 'hand' | 'bank';

export interface DailyIncome {
    id: string;
    date: string;
    total_facturas: number;
    total_boletas: number;
    total_notas_venta: number;
    total_cost: number;
    total_calculated: number;
    user_id: string;
}

export interface Expense {
    id: string;
    category: string;
    description: string | null;
    amount: number;
    date: string;
    payment_method: PaymentMethod;
    cash_location?: CashLocation;
    user_id: string;
    is_fixed: boolean;
}
