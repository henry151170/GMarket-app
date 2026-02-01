import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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
    const [metrics, setMetrics] = useState<FinancialHealthMetrics>({
        liquidity: { cashHand: 0, cashBank: 0, total: 0 },
        obligations: { monthlyFixedExpenses: 0, pendingPayables: 0, totalReserved: 0 },
        projections: { avgDailySales: 0, avgDailyCost: 0, avgDailyProfit: 0, daysRunway: 0, projectedBalance30d: 0 },
        loading: true
    });

    useEffect(() => {
        calculateMetrics();
    }, []);

    const calculateMetrics = async () => {
        try {
            const today = new Date();
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(today.getDate() - 90);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(today.getDate() - 30);

            // 1. Get Liquidity (From Cash Journal)
            const { data: journal } = await supabase.from('cash_journal').select('*');
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
                .eq('is_fixed', true)
                .gte('date', ninetyDaysAgo.toISOString());

            const totalFixed90 = fixedExpenses?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
            const avgMonthlyFixed = totalFixed90 / 3; // Simple 3 month average

            // 3. Get Variable Performance (Last 30 days)
            const { data: incomes } = await supabase
                .from('daily_incomes')
                .select('total_calculated, total_cost')
                .gte('date', thirtyDaysAgo.toISOString());

            const totalSales30 = incomes?.reduce((acc, curr) => acc + Number(curr.total_calculated), 0) || 0;
            const totalCost30 = incomes?.reduce((acc, curr) => {
                // Use stored cost or fallback to 65%
                const cost = Number(curr.total_cost || 0);
                return acc + (cost > 0 ? cost : Number(curr.total_calculated) * 0.65);
            }, 0) || 0;

            const { data: variableExpenses } = await supabase
                .from('expenses')
                .select('amount')
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
