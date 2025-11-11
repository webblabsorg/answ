'use client'

import Link from 'next/link'

import { useEffect, useState } from 'react'
import { useLocaleStore } from '@/store/locale-store'
import { LANGUAGES as LANG_OPTIONS } from '@/components/home/LanguagePicker'

export default function SettingsPage() {
  const items = [
    { name: 'My Performance', href: '/insights' },
    { name: 'Users', href: '/admin/users' },
    { name: 'Usage & Limits', href: '/usage' },
    { name: 'Billing & Invoices', href: '/billing/invoices' },
    { name: 'Organizations', href: '/organization' },
    { name: 'LMS Integrations', href: '/settings/lms' },
    { name: 'Recommendations', href: '/recommendations' },
  ]

  const locale = useLocaleStore((s) => s.locale)
  const setLocale = useLocaleStore((s) => s.setLocale)
  const [selected, setSelected] = useState(locale)

  useEffect(() => {
    setSelected(locale)
  }, [locale])

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value
    setSelected(code)
    setLocale(code)
    try { localStorage.setItem('preferred_locale', code) } catch {}
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Settings</h1>
        {/* Inline language override */}
        <label className="text-xs text-gray-400 flex items-center gap-2">
          <span>Language</span>
          <select
            value={selected}
            onChange={handleChange}
            className="bg-gray-900 border border-gray-800 rounded-md px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
            aria-label="Language"
          >
            {LANG_OPTIONS.map((opt: any) => (
              <option key={opt.code} value={opt.code}>{opt.nativeName || opt.name}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((it) => (
          <Link key={it.name} href={it.href} className="rounded-lg border border-gray-800 bg-gray-900/40 p-4 hover:bg-gray-900 transition-colors">
            <div className="text-sm font-medium text-white">{it.name}</div>
            <div className="text-xs text-gray-400">Open {it.name}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
