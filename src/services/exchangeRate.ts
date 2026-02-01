
export interface ExchangeRate {
    compra: number;
    venta: number;
    origen: string;
    moneda: string;
    fecha: string;
}

export const getExchangeRate = async (): Promise<ExchangeRate | null> => {
    try {
        // 1. Try Primary SUNAT API
        const response = await fetch('https://api.apis.net.pe/v1/tipo-cambio-sunat');
        if (!response.ok) throw new Error('Primary API failed');
        const data = await response.json();
        return data;
    } catch (error) {
        console.warn('Primary Exchange Rate API failed, trying fallback...', error);

        try {
            // 2. Try Fallback Open API
            const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
            if (!response.ok) throw new Error('Fallback API failed');

            const data = await response.json();
            const rate = data.rates.PEN; // Mid-market rate, e.g. 3.75

            // Estimate Spread (approx 0.5% - 1%)
            // Compra: Bank buys USD cheaper.
            // Venta: Bank sells USD more expensive.
            return {
                compra: parseFloat((rate * 0.995).toFixed(3)),
                venta: parseFloat((rate * 1.005).toFixed(3)),
                origen: 'MERCADO (ESTIMADO)',
                moneda: 'USD',
                fecha: data.date
            };
        } catch (fallbackError) {
            console.error('All exchange rate APIs failed:', fallbackError);
            return null;
        }
    }
};
