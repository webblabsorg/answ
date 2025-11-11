import { create } from 'zustand'

export type LocaleCode = string // e.g., 'en', 'fr', 'es'

type LocaleState = {
  locale: LocaleCode
  setLocale: (l: LocaleCode) => void
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: 'en',
  setLocale: (l) => set({ locale: l }),
}))
