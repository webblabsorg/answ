"use client";

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'

function formatCurrency(amountCents: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format((amountCents || 0) / 100)
  } catch {
    return `$${((amountCents || 0) / 100).toFixed(2)}`
  }
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await apiClient.get('/subscriptions/invoices')
        setInvoices(res.data.invoices || [])
      } catch (e: any) {
        setError(e.response?.data?.message || 'Failed to load invoices')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-lg font-semibold">Invoices</h1>

      {error && <div className="p-3 border border-red-500 text-red-500 rounded bg-red-500/10">{error}</div>}

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : invoices.length === 0 ? (
        <div className="text-sm text-gray-500">No invoices found.</div>
      ) : (
        <div className="overflow-x-auto border border-gray-800 rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-900">
              <tr>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Amount</th>
                <th className="text-left p-3">Tax</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Links</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-gray-800">
                  <td className="p-3">{new Date(inv.created).toLocaleDateString()}</td>
                  <td className="p-3">{formatCurrency(inv.amount_due, inv.currency)}</td>
                  <td className="p-3">{formatCurrency(inv.tax, inv.currency)}</td>
                  <td className="p-3 capitalize">{inv.status?.replace('_', ' ')}</td>
                  <td className="p-3 space-x-3">
                    {inv.hosted_invoice_url && (
                      <a className="text-blue-400 hover:underline" href={inv.hosted_invoice_url} target="_blank" rel="noreferrer">View</a>
                    )}
                    {inv.invoice_pdf && (
                      <a className="text-blue-400 hover:underline" href={inv.invoice_pdf} target="_blank" rel="noreferrer">PDF</a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
