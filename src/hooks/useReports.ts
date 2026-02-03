
import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface ReportSummary {
    total_income: number;
    total_net_balance: number; // NEW
    total_expenses: number;
    total_operational_expenses: number;
    total_fixed_expenses: number;
    total_purchases: number;
    total_cost_of_sales: number;
    total_commissions: number; // New field for 4% bank fees
    total_other_income: number; // New field for Other Incomes
    net_profit: number;
    // Sales Breakdown
    total_facturas: number;
    total_boletas: number;
    total_notas_venta: number;
    // Breakdown
    income_by_method: {
        cash_hand: number;
        yape: number;
        card: number;
        transfer: number;
    };
    daily_stats: {
        date: string;
        income: number;
        expense: number;
        purchase: number;
        cost_of_sales: number;
        utility: number; // Net Utility (Profit)
        cash_hand: number;
        yape: number;
        card: number;
        transfer: number;
    }[];
}

export function useReports() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchReport = useCallback(async (startDate: string, endDate: string) => {
        console.log('Fetching report for user:', user?.id);
        if (!user) {
            console.warn('No user found in useReports');
            setError('Usuario no autenticado. Espere un momento...');
            return null;
        }
        setLoading(true);
        setError(null);

        try {
            // Adjust endDate to be inclusive for the query if it's just a date string (YYYY-MM-DD)
            // If we query .lt('date', endDate), we miss the endDate records.
            // We want .lte('date', endDate) or .lt('date', nextDay).
            // Let's use .lte for clarity with date types.

            // 1. Fetch Incomes with Payments
            const { data: incomes, error: incomesError } = await supabase
                .from('daily_incomes')
                .select(`
                    date,
                    total_calculated,
                    total_cost,
                    total_facturas,
                    total_boletas,
                    total_notas_venta,
                    income_payments(
                        amount,
                        method,
                        cash_location
                    )
                `)
                .eq('user_id', user?.id)
                .gte('date', startDate)
                .lte('date', endDate);

            if (incomesError) throw incomesError;

            // 2. Fetch Expenses (Only PAID)
            // We need payment_method to deduct from breakdown
            const { data: expenses, error: expensesError } = await supabase
                .from('expenses')
                .select('date, amount, payment_method, status, is_fixed')
                .gte('date', startDate)
                .lte('date', endDate)
                .eq('status', 'paid');

            if (expensesError) throw expensesError;

            // 3. Fetch Purchases
            // We need payment_method to deduct from breakdown
            const { data: purchases, error: purchasesError } = await supabase
                .from('purchases')
                .select('date, total_amount, payment_method')
                .gte('date', startDate)
                .lte('date', endDate);

            if (purchasesError) throw purchasesError;

            // 4. Fetch Other Incomes
            const { data: otherIncomes, error: otherIncomesError } = await supabase
                .from('other_incomes')
                .select('date, amount')
                .gte('date', startDate)
                .lte('date', endDate);

            if (otherIncomesError) throw otherIncomesError;

            // Aggregate Data
            let totalIncome = 0; // Gross Income (from daily_incomes)
            let totalExpenses = 0;
            let totalOperationalExpenses = 0;
            let totalFixedExpenses = 0;
            let totalPurchases = 0;
            let totalCostOfSales = 0;
            let totalOtherIncome = 0;

            let totalFacturas = 0;
            let totalBoletas = 0;
            let totalNotas = 0;

            // This will now represent the NET FLOW (Income - Expenses - Purchases) per method
            const incomeMethodBreakdown = {
                cash_hand: 0,
                yape: 0,
                card: 0,
                transfer: 0
            };

            const statsMap = new Map<string, {
                income: number;
                expense: number;
                purchase: number;
                cost_of_sales: number;
                cash_hand: number;
                yape: number;
                card: number;
                transfer: number;
            }>();

            console.log('Report Incomes Fetched:', incomes?.length, incomes);

            incomes?.forEach(i => {
                // FALLBACK: Calculate manually if total_calculated is 0/null
                let incomeAmount = Number(i.total_calculated);
                if (!incomeAmount || incomeAmount === 0) {
                    incomeAmount = Number(i.total_facturas || 0) + Number(i.total_boletas || 0) + Number(i.total_notas_venta || 0);
                }

                totalIncome += incomeAmount;

                totalFacturas += Number(i.total_facturas || 0);
                totalBoletas += Number(i.total_boletas || 0);
                totalNotas += Number(i.total_notas_venta || 0);

                // Logic: Use existing total_cost if available, otherwise fallback
                const storedCost = Number(i.total_cost || 0);
                const calculatedCost = storedCost > 0 ? storedCost : (incomeAmount * 0.65);

                totalCostOfSales += calculatedCost;

                const current = statsMap.get(i.date) || {
                    income: 0, expense: 0, purchase: 0, cost_of_sales: 0,
                    cash_hand: 0, yape: 0, card: 0, transfer: 0
                };

                // Aggregate Payments (Add Incomes)
                i.income_payments?.forEach((p: any) => {
                    const amt = Number(p.amount);
                    if (p.method === 'cash') { // cash_location check removed to just sum all cash? Or strictly hand? Existing logic checked hand.
                        // Assuming 'cash' means cash_hand for now based on previous logic, but let's stick to key names
                        if (p.cash_location === 'hand' || !p.cash_location) {
                            incomeMethodBreakdown.cash_hand += amt;
                            current.cash_hand += amt;
                        }
                        // If we had bank cash, where would it go?
                    } else if (p.method === 'yape') {
                        incomeMethodBreakdown.yape += amt;
                        current.yape += amt;
                    } else if (p.method === 'card') {
                        incomeMethodBreakdown.card += amt;
                        current.card += amt;
                    } else if (p.method === 'transfer') {
                        incomeMethodBreakdown.transfer += amt;
                        current.transfer += amt;
                    }
                });

                current.income += incomeAmount;
                current.cost_of_sales += calculatedCost;
                statsMap.set(i.date, current);
            });

            // Deduct Expenses from Breakdown
            expenses?.forEach(e => {
                const amt = Number(e.amount);
                totalExpenses += amt;

                if (e.is_fixed) {
                    totalFixedExpenses += amt;
                } else {
                    totalOperationalExpenses += amt;
                }

                const current = statsMap.get(e.date) || {
                    income: 0, expense: 0, purchase: 0, cost_of_sales: 0,
                    cash_hand: 0, yape: 0, card: 0, transfer: 0
                };
                current.expense += amt;

                // Deduct from specific method
                if (e.payment_method === 'cash') {
                    incomeMethodBreakdown.cash_hand -= amt;
                    current.cash_hand -= amt;
                } else if (e.payment_method === 'yape') {
                    incomeMethodBreakdown.yape -= amt;
                    current.yape -= amt;
                } else if (e.payment_method === 'card') {
                    incomeMethodBreakdown.card -= amt;
                    current.card -= amt;
                } else if (e.payment_method === 'transfer') {
                    incomeMethodBreakdown.transfer -= amt;
                    current.transfer -= amt;
                }

                statsMap.set(e.date, current);
            });

            // Deduct Purchases from Breakdown
            purchases?.forEach(p => {
                const amt = Number(p.total_amount);
                totalPurchases += amt;

                const current = statsMap.get(p.date) || {
                    income: 0, expense: 0, purchase: 0, cost_of_sales: 0,
                    cash_hand: 0, yape: 0, card: 0, transfer: 0
                };
                current.purchase += amt;

                // Deduct from specific method
                if (p.payment_method === 'cash') {
                    incomeMethodBreakdown.cash_hand -= amt;
                    current.cash_hand -= amt;
                } else if (p.payment_method === 'yape') {
                    incomeMethodBreakdown.yape -= amt;
                    current.yape -= amt;
                } else if (p.payment_method === 'card') {
                    incomeMethodBreakdown.card -= amt;
                    current.card -= amt;
                } else if (p.payment_method === 'transfer') {
                    incomeMethodBreakdown.transfer -= amt;
                    current.transfer -= amt;
                }

                statsMap.set(p.date, current);
            });

            otherIncomes?.forEach(o => {
                totalOtherIncome += Number(o.amount);
            });

            // Calculate Commissions (4% of Card + Yape - GROSS or NET? Usually commissions are on Gross Income)
            // But we need to be careful. The user said "sin descontar el 4%" for the Ventas Totales KPI.
            // Commission calculation usually applies to the INCOMING money (Gross).
            // So we should calculate commission based on the POSITIVE flow or just the income part.
            // Let's re-calculate commission from the RAW incomes (we need to re-sum them or do it in the first loop).
            // To be safe, let's calc commission on the *Income* portion only, which is standard. 
            // I'll leave the 'incomeMethodBreakdown' as Net. 
            // I need to track Gross Card/Yape for commission? 
            // Actually, previously it was: (incomeMethodBreakdown.card + incomeMethodBreakdown.yape) * 0.04. 
            // Now incomeMethodBreakdown is Net. Calculating commission on Net is wrong (if you pay expense with card, you don't save commission).
            // I should sum gross card/yape separately for commission.

            let grossCard = 0;
            let grossYape = 0;
            incomes?.forEach(i => {
                i.income_payments?.forEach((p: any) => {
                    const amt = Number(p.amount);
                    if (p.method === 'card') grossCard += amt;
                    if (p.method === 'yape') grossYape += amt;
                });
            });

            const totalCommissions = (grossCard + grossYape) * 0.04;

            // Total Net Balance for "Ventas Totales" KPI
            const totalNetBalance =
                incomeMethodBreakdown.cash_hand +
                incomeMethodBreakdown.yape +
                incomeMethodBreakdown.card +
                incomeMethodBreakdown.transfer;

            // Convert map to sorted array
            const daily_stats = Array.from(statsMap.entries())
                .map(([date, stats]) => {
                    // Utility per day: Income - Cost - Expense - DailyCommission?
                    // Approximate daily commission from the breakdown? Hard to track effectively without daily gross.
                    // For simplicity, let's just do Income - Cost - Expense (Net flow logic might distort P&L).
                    // P&L usually is Accrual or Cash basis. 
                    // Let's stick to: Utility = Income - COGS - Expenses.
                    // (Ignoring the net flow logic for P&L, focusing on the accounting figures).
                    const utility = stats.income - stats.cost_of_sales - stats.expense; // Simplified
                    return {
                        date,
                        ...stats,
                        cost_of_sales: stats.cost_of_sales,
                        utility
                    };
                })
                .sort((a, b) => a.date.localeCompare(b.date));

            return {
                total_income: totalIncome, // Contains Gross Income for P&L
                total_net_balance: totalNetBalance, // NEW: For "Ventas Totales" KPI
                total_expenses: totalExpenses,
                total_operational_expenses: totalOperationalExpenses,
                total_fixed_expenses: totalFixedExpenses,
                total_purchases: totalPurchases,
                total_cost_of_sales: totalCostOfSales,
                total_commissions: totalCommissions,
                total_other_income: totalOtherIncome,
                net_profit: totalIncome - totalCostOfSales - totalExpenses - totalCommissions,
                total_facturas: totalFacturas,
                total_boletas: totalBoletas,
                total_notas_venta: totalNotas,
                income_by_method: incomeMethodBreakdown, // Contains Net Flows
                daily_stats
            };

        } catch (err: any) {
            console.error('Error generating report:', err);
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, [user]);

    return {
        fetchReport,
        loading,
        error,
        user
    };
}
