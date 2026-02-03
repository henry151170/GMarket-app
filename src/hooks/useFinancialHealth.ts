import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface FinancialHealthMetrics {
    liquidity: {
        cashHand: number;
        cashBank: number;
        total: number;
    };
    obligations: {
        monthlyFixedExpenses: number; // Avg of monthly fixed costs
        pendingPayables: number; // Placeholder for future feature
        totalReserved: number;
    };
    projections: {
        avgDailySales: number;
        avgDailyCost: number; // 65% + Variable Expenses
        avgDailyProfit: number;
        daysRunway: number; // How many days can survive with current cash
        projectedBalance30d: number;
    };
    loading: boolean;
}

export function useFinancialHealth() {
    const { user } = useAuth();
    const [metrics, setMetrics] = useState<FinancialHealthMetrics>({
        liquidity: { cashHand: 0, cashBank: 0, total: 0 },
        obligations: { monthlyFixedExpenses: 0, pendingPayables: 0, totalReserved: 0 },
        projections: { avgDailySales: 0, avgDailyCost: 0, avgDailyProfit: 0, daysRunway: 0, projectedBalance30d: 0 },
        loading: true
    });

    useEffect(() => {
        if (user) calculateMetrics();
    }, [user]);

    const calculateMetrics = async () => {
        try {
            const today = new Date();
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(today.getDate() - 90);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(today.getDate() - 30);

            // 1. Get Liquidity (From Cash Journal)
            const { data: journal } = await supabase.from('cash_journal').select('*').eq('user_id', user?.id);
            let hand = 0, bank = 0;
            journal?.forEach(entry => {
                let amount = Number(entry.amount);

                if (entry.location === 'hand') hand += amount;
                if (entry.location === 'bank') {
                    // Apply Commission Logic same as Dashboard
                    if (entry.type === 'income') {
                        const desc = entry.description?.toLowerCase() || '';
                        if (desc.includes('yape') || desc.includes('card') || desc.includes('transfer')) {
                            amount = amount * 0.96;
                        }
                    }
                    bank += amount;
                }
            });

            // 2. Get Fixed Expenses (Last 90 days avg)
            const { data: fixedExpenses } = await supabase
                .from('expenses')
                .select('amount, date')
                .eq('user_id', user?.id)
                .eq('is_fixed', true)
                .gte('date', ninetyDaysAgo.toISOString());

            const totalFixed90 = fixedExpenses?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
            const avgMonthlyFixed = totalFixed90 / 3; // Simple 3 month average

            // 3. Get Variable Performance (Last 30 days)
            const { data: incomes } = await supabase
                .from('daily_incomes')
                .select('total_calculated, total_facturas, total_boletas, total_notas_venta')
                .eq('user_id', user?.id)
                .gte('date', thirtyDaysAgo.toISOString());

            const totalSales30 = incomes?.reduce((acc, curr) => {
                let amount = Number(curr.total_calculated);
                if (!amount) {
                    amount = Number(curr.total_facturas || 0) + Number(curr.total_boletas || 0) + Number(curr.total_notas_venta || 0);
                }
                return acc + amount;
            }, 0) || 0;
            const totalCost30 = incomes?.reduce((acc, curr) => {
                // Use stored cost or fallback to 65%
                // NOTE: total_cost removed due to schema cache issue
                const cost = 0; // Will use estimation below
                return acc + (cost > 0 ? cost : Number(curr.total_calculated) * 0.65);
            }, 0) || 0;

            const { data: variableExpenses } = await supabase
                .from('expenses')
                .select('amount')
                .eq('user_id', user?.id)
                .eq('is_fixed', false)
                .gte('date', thirtyDaysAgo.toISOString());

            const totalVarExp30 = variableExpenses?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

            // Calculations
            const avgDailySales = totalSales30 / 30;
            const avgDailyCost = (totalCost30 + totalVarExp30) / 30; // Cost of Sales + Variable Expenses
            const avgDailyGrossProfit = avgDailySales - avgDailyCost;

            // Net Daily Profit (subtract daily portion of fixed expenses) 
            // Note: Fixed expenses are monthly, so daily share is / 30
            const dailyFixedShare = avgMonthlyFixed / 30;
            const trueDailyNetParam = avgDailyGrossProfit - dailyFixedShare;

            // Runway
            // If we stop selling today, how long do we last with fixed expenses?
            const dailyBurn = dailyFixedShare > 0 ? dailyFixedShare : 1; // Avoid div by 0
            const runway = (hand + bank) / dailyBurn;

            // Projection 30d
            // Current Balance + (TrueDailyNet * 30)
            const projected = (hand + bank) + (trueDailyNetParam * 30);

            setMetrics({
                liquidity: {
                    cashHand: hand,
                    cashBank: bank,
                    total: hand + bank
                },
                obligations: {
                    monthlyFixedExpenses: avgMonthlyFixed,
                    pendingPayables: 0,
                    totalReserved: avgMonthlyFixed // Reserve 1 month worth of fixed expenses
                },
                projections: {
                    avgDailySales,
                    avgDailyCost,
                    avgDailyProfit: trueDailyNetParam,
                    daysRunway: Math.floor(runway),
                    projectedBalance30d: projected
                },
                loading: false
            });

        } catch (error) {
            console.error(error);
            setMetrics(prev => ({ ...prev, loading: false }));
        }
    };

    return metrics;
}
