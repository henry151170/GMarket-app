
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface DashboardStats {
    cashHand: number;
    cashBank: number;
    cashBankUSD: number;
    totalBalance: number;
    incomeMonth: number;
    netProfitMonth: number;
    incomeToday: number;
    dailyIncome: { date: string; amount: number }[];
    loading: boolean;
}

import { useAuth } from '../contexts/AuthContext';

export function useDashboard(dateRange?: { start: string; end: string }) {
    const { user } = useAuth();
    const [stats, setStats] = useState<DashboardStats>({
        cashHand: 0,
        cashBank: 0,
        cashBankUSD: 0,
        totalBalance: 0,
        incomeMonth: 0,
        netProfitMonth: 0,
        incomeToday: 0,
        dailyIncome: [],
        loading: true
    });

    useEffect(() => {
        if (user) fetchDashboardData();
    }, [user, dateRange?.start, dateRange?.end]); // Re-fetch when user or range changes

    const fetchDashboardData = async () => {
        try {
            if (!user) return;
            setStats(prev => ({ ...prev, loading: true }));
            const today = new Date();

            // Define metrics window
            const metricsStart = dateRange?.start
                ? dateRange.start
                : new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

            const metricsEnd = dateRange?.end
                ? dateRange.end + 'T23:59:59'
                : new Date().toISOString();

            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

            // 1. Fetch CASH JOURNAL (For Balances - Real money)
            const { data: journal, error: journalError } = await supabase
                .from('cash_journal')
                .select('amount, type, location, currency, date');

            if (journalError) throw journalError;

            // 2. Fetch DAILY INCOMES (For Sales Stats - Gross value)
            const { data: incomes, error: incomesError } = await supabase
                .from('daily_incomes')
                .select('date, total_calculated, total_facturas, total_boletas, total_notas_venta')
                .gte('date', metricsStart)
                .lte('date', metricsEnd);

            if (incomesError) throw incomesError;

            // 2.1 Fetch TODAY'S Incomes specifically (if not in range, though usually is)
            const { data: todayIncomes, error: todayError } = await supabase
                .from('daily_incomes')
                .select('total_calculated, total_facturas, total_boletas, total_notas_venta')
                .eq('date', startOfDay.split('T')[0]);

            if (todayError) throw todayError;

            // --- CALCULATE BALANCES (From Journal) ---
            let hand = 0;
            let bank = 0;
            let bankUSD = 0;

            journal?.forEach(entry => {
                const amount = Number(entry.amount);
                const currency = entry.currency || 'PEN';

                if (entry.location === 'hand') {
                    // Hand Balance: Income + Other + Structural - Purchase (Expenses usually separate but let's follow prev logic)
                    // Previous logic: Income, Other, Purchase, Structural. 
                    if (['income', 'other_income', 'purchase', 'structural_expense'].includes(entry.type)) {
                        hand += amount;
                    }
                    if (entry.type === 'expense') {
                        hand += amount; // Expenses are negative in journal
                    }
                }

                if (entry.location === 'bank') {
                    if (currency === 'USD') bankUSD += amount;
                    else bank += amount;
                }
            });

            // --- CALCULATE SALES STATS (From Daily Incomes) ---
            let periodIncome = 0;
            const dailyMap = new Map<string, number>();

            incomes?.forEach(i => {
                // Determine total for this record
                let amt = Number(i.total_calculated);
                if (!amt) amt = Number(i.total_facturas || 0) + Number(i.total_boletas || 0) + Number(i.total_notas_venta || 0);

                periodIncome += amt;
                const d = i.date;
                dailyMap.set(d, (dailyMap.get(d) || 0) + amt);
            });

            // Calculate Net Profit (Utilidad) for Period
            // This requires Expenses too.
            // Simplified: Use Journal for Net Profit? Or Incomes - Expenses?
            // "Net Profit Month" usually means P&L. 
            // Let's use Journal for P&L flow (Income - Expenses) within the period.
            let periodNet = 0;
            // Re-scan journal for period flow
            journal?.forEach(entry => {
                const d = entry.date.split('T')[0];
                if (d >= metricsStart.split('T')[0] && d <= metricsEnd.split('T')[0] && (entry.currency || 'PEN') === 'PEN') {
                    if (['income', 'expense', 'other_income', 'purchase', 'structural_expense'].includes(entry.type)) {
                        periodNet += Number(entry.amount);
                    }
                }
            });


            // Today's Income (Gross)
            let incToday = 0;
            todayIncomes?.forEach(i => {
                let amt = Number(i.total_calculated);
                if (!amt) amt = Number(i.total_facturas || 0) + Number(i.total_boletas || 0) + Number(i.total_notas_venta || 0);
                incToday += amt;
            });

            const dailyIncomeArray = Array.from(dailyMap.entries())
                .map(([date, amount]) => ({ date, amount }))
                .sort((a, b) => a.date.localeCompare(b.date));

            setStats({
                cashHand: hand,
                cashBank: bank,
                cashBankUSD: bankUSD,
                totalBalance: hand + bank,
                incomeMonth: periodIncome,
                netProfitMonth: periodNet,
                incomeToday: incToday,
                dailyIncome: dailyIncomeArray,
                loading: false
            });

        } catch (error) {
            console.error('Error fetching dashboard:', error);
            setStats(prev => ({ ...prev, loading: false }));
        }
    };

    return stats;
}
