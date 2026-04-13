import React, { createContext, useContext, useState } from 'react';

export type Currency = 'usd' | 'eur' | 'gbp' | 'jpy' | 'cad' | 'aud' | 'chf' | 'inr' | 'ngn';

export const CURRENCIES: Record<Currency, { label: string; symbol: string; locale: string }> = {
  usd: { label: 'USD', symbol: '$',  locale: 'en-US' },
  eur: { label: 'EUR', symbol: '€',  locale: 'de-DE' },
  gbp: { label: 'GBP', symbol: '£',  locale: 'en-GB' },
  jpy: { label: 'JPY', symbol: '¥',  locale: 'ja-JP' },
  cad: { label: 'CAD', symbol: 'C$', locale: 'en-CA' },
  aud: { label: 'AUD', symbol: 'A$', locale: 'en-AU' },
  chf: { label: 'CHF', symbol: '₣',  locale: 'de-CH' },
  inr: { label: 'INR', symbol: '₹',  locale: 'en-IN' },
  ngn: { label: 'NGN', symbol: '₦',  locale: 'en-NG' },
};

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  /** Format a number as a currency string, e.g. fmt(1234.5) → "$1,234.50" */
  fmt: (value: number, opts?: { decimals?: number }) => string;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: 'usd',
  setCurrency: () => {},
  fmt: (v) => `$${v.toFixed(2)}`,
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<Currency>('usd');

  const fmt = (value: number, { decimals }: { decimals?: number } = {}) => {
    const { locale, label } = CURRENCIES[currency];
    // JPY has no minor units
    const fractionDigits = decimals ?? (currency === 'jpy' ? 0 : 2);
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: label,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value);
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, fmt }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
