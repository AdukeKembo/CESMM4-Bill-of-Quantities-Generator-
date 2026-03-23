const API_URL = 'https://api.frankfurter.app';

/**
 * Fetches the conversion rate between two currencies.
 * @param from The base currency code (e.g., 'KES').
 * @param to The target currency code (e.g., 'USD').
 * @returns A promise that resolves to the conversion rate.
 */
export async function getConversionRate(from: string, to: string): Promise<number> {
    if (from.toUpperCase() === to.toUpperCase()) {
        return 1;
    }
    try {
        // The API defaults to EUR base, so we must specify `from`.
        const response = await fetch(`${API_URL}/latest?from=${from}&to=${to}`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch exchange rate: ${response.status} ${response.statusText}. ${errorText}`);
        }
        const data = await response.json();
        // The API may return the 'to' key in uppercase
        const toCurrencyKey = Object.keys(data.rates).find(key => key.toUpperCase() === to.toUpperCase());

        if (toCurrencyKey && data.rates[toCurrencyKey]) {
            return data.rates[toCurrencyKey];
        }

        throw new Error(`Conversion rate from ${from} to ${to} not available.`);
    } catch (error) {
        console.error("Forex API Error:", error);
        throw new Error(`Could not retrieve exchange rate for ${to}. Please check your connection or try again.`);
    }
}
