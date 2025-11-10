import { create } from 'zustand'

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'INR' | 'BRL'

type CurrencyState = {
  code: CurrencyCode
  symbol: string
  rate: number // vs USD
  setCurrency: (c: { code: CurrencyCode; symbol: string; rate: number }) => void
}

const defaultCurrency: { code: CurrencyCode; symbol: string; rate: number } = {
  code: 'USD',
  symbol: '$',
  rate: 1,
}

export const useCurrencyStore = create<CurrencyState>((set) => ({
  ...defaultCurrency,
  setCurrency: (c) => set(c),
}))
