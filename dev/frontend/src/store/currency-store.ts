import { create } from 'zustand'

export type CurrencyCode = string

type CurrencyState = {
  code: CurrencyCode
  symbol: string
  rate: number // vs USD (fallback only; server returns authoritative prices per currency)
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
