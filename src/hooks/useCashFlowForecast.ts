
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, getDate } from 'date-fns';
import type { FixedExpenseTemplate } from './useFixedExpenses';

export interface DailyProjection {
    date: Date;
    income_projected: number;
    fixed_expenses: FixedExpenseTemplate[];
    fixed_expenses_total: number;
    net_flow: number;
    running_balance: number; // This would need a starting balance, defaulting to 0 or cumulative flow
    is_projected?: boolean;
    status: 'surplus' | 'warning' | 'deficit';
}

export interface ForecastRecommendation {
    type: 'warning' | 'info';
    message: string;
    dateRange?: { start: Date; end: Date };
}

export function useCashFlowForecast() {
    const [loading, setLoading] = useState(true);
    const [avgDailyIncome, setAvgDailyIncome] = useState(0);
    const [projection, setProjection] = useState<DailyProjection[]>([]);
    const [recommendations, setRecommendations] = useState<ForecastRecommendation[]>([]);

    const { user } = useAuth(); // Use context

    const fetchForecast = useCallback(async () => {
        setLoading(true);
        try {
            if (!user) {
                setProjection([]);
                setRecommendations([]);
                setAvgDailyIncome(0);
                return;
            }

            // 1. Setup Dates
            const today = new Date();
            const monthStart = startOfMonth(today);
            const monthEnd = endOfMonth(today);
            const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
            const todayStr = format(today, 'yyyy-MM-dd');

            // Calculate range for fetching: We need the wider range of (Last 15 days) U (Current Month)
            const statsStartDate = subDays(today, 15);
            const fetchStartDate = statsStartDate < monthStart ? statsStartDate : monthStart;

            const [templatesPromise, journalPromise] = await Promise.allSettled([
                // A: Fixed Expenses
                supabase
                    .from('fixed_expense_templates')
                    .select('*')
                    .eq('user_id', user.id),

                // B: Daily Incomes (Unified Query for Calendar + Stats)
                supabase
                    .from('daily_incomes')
                    .select('date, total_facturas, total_boletas, total_notas_venta')
                    .eq('user_id', user.id)
                    .gte('date', format(fetchStartDate, 'yyyy-MM-dd'))
            ]);

            // Process A: Templates
            let templates: FixedExpenseTemplate[] = [];
            if (templatesPromise.status === 'fulfilled' && templatesPromise.value.data) {
                templates = templatesPromise.value.data as FixedExpenseTemplate[];
            }

            // Process B: Daily Incomes
            const incomeMap = new Map<string, number>();
            let recentIncomeSum = 0;
            const statsStartDateStr = format(statsStartDate, 'yyyy-MM-dd');
            const monthStartStr = format(monthStart, 'yyyy-MM-dd');
            const monthEndStr = format(monthEnd, 'yyyy-MM-dd');

            if (journalPromise.status === 'rejected') {
                console.warn('Failed to fetch daily incomes', journalPromise.reason);
            } else if (journalPromise.value.data) {
                journalPromise.value.data.forEach((entry: any) => {
                    const dateKey = entry.date;
                    const totalVenta = Number(entry.total_facturas || 0) + Number(entry.total_boletas || 0) + Number(entry.total_notas_venta || 0);

                    // 1. Populate Calendar Map (Current Month only)
                    if (dateKey >= monthStartStr && dateKey <= monthEndStr) {
                        incomeMap.set(dateKey, totalVenta);
                    }

                    // 2. Sum for Average (Last 15 days)
                    if (dateKey >= statsStartDateStr && dateKey <= todayStr) {
                        recentIncomeSum += totalVenta;
                    }
                });
            }

            // Calculate Average
            const calculatedAvg = recentIncomeSum / 15;
            setAvgDailyIncome(calculatedAvg);

            // 3. Build Projection
            let cumulativeBalance = 0;

            const dailyProjections = days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayNum = getDate(day);
                const isPastOrToday = dateStr <= todayStr;

                // Find expenses for this day
                const dayExpenses = templates.filter(t => t.day_of_month === dayNum);
                const expensesTotal = dayExpenses.reduce((sum, t) => {
                    const amount = Number(t.amount);
                    return sum + (t.currency === 'USD' ? amount * 3.75 : amount);
                }, 0);

                // Income Logic
                let income = 0;
                let isProjected = false;

                if (isPastOrToday) {
                    income = incomeMap.get(dateStr) || 0;
                } else {
                    income = calculatedAvg;
                    isProjected = true;
                }

                const netFlow = income - expensesTotal;
                cumulativeBalance += netFlow;

                let status: 'surplus' | 'warning' | 'deficit' = 'surplus';
                if (cumulativeBalance < 0) status = 'deficit';
                else if (netFlow < 0) status = 'warning';

                return {
                    date: day,
                    income_projected: income,
                    is_projected: isProjected,
                    fixed_expenses: dayExpenses,
                    fixed_expenses_total: expensesTotal,
                    net_flow: netFlow,
                    running_balance: cumulativeBalance,
                    status
                } as DailyProjection;
            });

            setProjection(dailyProjections);

            // 4. Generate Recommendations (Same logic)
            const recs: ForecastRecommendation[] = [];
            let deficitSequenceStart: Date | null = null;

            dailyProjections.forEach((day, idx) => {
                if (day.running_balance < 0) {
                    if (!deficitSequenceStart) deficitSequenceStart = day.date;
                } else {
                    if (deficitSequenceStart) {
                        const endDate = dailyProjections[idx - 1]?.date;
                        if (endDate) {
                            recs.push({
                                type: 'warning',
                                message: `Evita gastos extra entre el ${format(deficitSequenceStart, 'dd/MM')} y el ${format(endDate, 'dd/MM')} por bajo flujo.`,
                                dateRange: { start: deficitSequenceStart, end: endDate }
                            });
                        }
                        deficitSequenceStart = null;
                    }
                }
            });

            if (deficitSequenceStart) {
                recs.push({
                    type: 'warning',
                    message: `Precaución: Proyección negativa desde el ${format(deficitSequenceStart, 'dd/MM')} hasta fin de mes.`,
                    dateRange: { start: deficitSequenceStart, end: monthEnd }
                });
            }

            setRecommendations(recs);

        } catch (err) {
            console.error('Forecast error:', err);
            setProjection([]);
            setRecommendations([]);
            setAvgDailyIncome(0);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchForecast();
    }, [fetchForecast]);

    return { loading, avgDailyIncome, projection, recommendations, refresh: fetchForecast };
}
