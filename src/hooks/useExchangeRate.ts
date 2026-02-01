
import { useState, useEffect } from 'react';
import { getExchangeRate, type ExchangeRate } from '../services/exchangeRate';

export function useExchangeRate() {
    const [rate, setRate] = useState<ExchangeRate | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getExchangeRate().then(data => {
            setRate(data);
            setLoading(false);
        });
    }, []);

    return { rate, loading };
}
