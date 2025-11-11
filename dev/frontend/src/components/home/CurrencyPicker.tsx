"use client";

import { useEffect, useState } from "react";
import { useCurrencyStore } from "@/store/currency-store";
import { ChevronDownIcon } from "lucide-react";

const PRESETS = [
  { code: "USD", symbol: "$", rate: 1 },
  { code: "EUR", symbol: "€", rate: 0.92 },
  { code: "GBP", symbol: "£", rate: 0.79 },
  { code: "INR", symbol: "₹", rate: 83 },
  { code: "BRL", symbol: "R$", rate: 5.6 },
];

export function CurrencyPicker() {
  const { code, symbol, rate, setCurrency } = useCurrencyStore();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Try detect from locale (very rough)
    const locale = typeof window !== 'undefined' ? navigator.language.toLowerCase() : 'en-us';
    if (locale.includes('gb')) setCurrency({ code: 'GBP', symbol: '£', rate: 0.79 });
    if (locale.includes('de') || locale.includes('fr') || locale.includes('es')) setCurrency({ code: 'EUR', symbol: '€', rate: 0.92 });
    if (locale.includes('in')) setCurrency({ code: 'INR', symbol: '₹', rate: 83 });
  }, [setCurrency]);

  return (
    <div className="relative">
      <button
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-900"
        onClick={() => setOpen((o) => !o)}
      >
        <span>{symbol}</span>
        <span>{code}</span>
        <ChevronDownIcon className="h-3 w-3" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-36 bg-black border border-gray-800 rounded-lg shadow-lg z-50">
          {PRESETS.map((c) => (
            <button
              key={c.code}
              className="w-full text-left px-3 py-2 text-xs hover:bg-gray-900"
              onClick={() => {
                setCurrency(c as any);
                setOpen(false);
              }}
            >
              {c.symbol} {c.code}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
