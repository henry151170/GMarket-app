
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
            // If range provided -> Use it. Else -> Current Month.
            const metricsStart = dateRange?.start
                ? dateRange.start
                : new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

            const metricsEnd = dateRange?.end
                ? dateRange.end + 'T23:59:59' // Include end date fully
                : new Date().toISOString();

            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

            // 1. Fetch entire Journal (optimize later with group by RPC if needed)
            // NOTE: Using explicit column list instead of * to avoid schema cache issues
            const { data: journal, error } = await supabase
                .from('cash_journal')
                .select('id, date, amount, type, location, description, user_id, currency, created_at');

            if (error) throw error;

            console.log('🔍 DEBUG: Raw journal data from DB:', journal);
            console.log('🔍 DEBUG: metricsStart:', metricsStart, 'metricsEnd:', metricsEnd);

            let hand = 0;
            let bank = 0;
            let bankUSD = 0;
            let periodIncome = 0;
            let periodNet = 0;
            let incToday = 0;

            const dailyMap = new Map<string, number>();

            // For chart: If specific range, fill those days. If month, fill month.
            // Simplified: Just map existing data in range, don't zero-fill everything (chart handles gaps)
            // Or better: auto-fill range for clean chart.
            // Let's stick to mapping actual data for now to avoid date math complexity in hook.

            journal?.forEach(entry => {
                let amount = Number(entry.amount);
                const currency = entry.currency || 'PEN';

                // Apply 4% commission for Yape, Card, and Transfer
                // Condition: Type is income, Location is bank (implied by method logic, but explicit check is safer),
                // and description contains keywords.
                if (currency === 'PEN' && entry.type === 'income' && entry.location === 'bank') {
                    const desc = entry.description?.toLowerCase() || '';
                    if (desc.includes('yape') || desc.includes('card') || desc.includes('transfer')) {
                        amount = amount * 0.96;
                    }
                }

                // Total Balances (ALWAYS Accumulated All-Time)
                if (entry.location === 'hand') {
                    // Assume Hand is PEN unless explicitly USD? 
                    // For simplicity, let's keep Hand as single currency or PEN.
                    hand += amount;
                }

                if (entry.location === 'bank') {
                    if (currency === 'USD') {
                        bankUSD += amount;
                    } else {
                        bank += amount; // PEN
                    }
                }

                // Period Stats (Filtered by Date Range)
                // Extract date-only string for comparison
                const entryDateOnly = entry.date.split('T')[0];
                const metricsStartDate = metricsStart.split('T')[0];
                const metricsEndDate = metricsEnd.split('T')[0];

                if (entryDateOnly >= metricsStartDate && entryDateOnly <= metricsEndDate) {
                    if (entry.type === 'income') {
                        // Income aggregation (usually PEN)
                        if (currency === 'PEN') {
                            periodIncome += amount;
                            // Daily Aggregation
                            const current = dailyMap.get(entryDateOnly) || 0;
                            dailyMap.set(entryDateOnly, current + amount);
                        }
                    }
                    if (entry.type === 'income' || entry.type === 'expense') {
                        if (currency === 'PEN') periodNet += amount;
                    }
                }

                // Today Stats (Always Today)
                if (entry.date >= startOfDay && entry.type === 'income' && currency === 'PEN') {
                    incToday += amount;
                }
            });

            // Convert map to array sorted by date
            const dailyIncome = Array.from(dailyMap.entries())
                .map(([date, amount]) => ({ date, amount }))
                .sort((a, b) => a.date.localeCompare(b.date));

            console.log('🔍 DEBUG: Final stats calculated:');
            console.log('  - periodIncome:', periodIncome);
            console.log('  - hand:', hand);
            console.log('  - bank:', bank);
            console.log('  - dailyIncome array:', dailyIncome);

            setStats({
                cashHand: hand,
                cashBank: bank,
                cashBankUSD: bankUSD,
                totalBalance: hand + bank,
                incomeMonth: periodIncome, // Renamed in UI to "Ingresos del Periodo"
                netProfitMonth: periodNet, // Renamed in UI to "Utilidad (Periodo)"
                incomeToday: incToday,
                dailyIncome,
                loading: false
            });

        } catch (error) {
            console.error('Error fetching dashboard:', error);
            setStats(prev => ({ ...prev, loading: false }));
        }
    };

    return stats;
}
