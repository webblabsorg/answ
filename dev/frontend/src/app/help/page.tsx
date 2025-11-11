export default function HelpPage() {
  const faqs = [
    { q: 'How do I start a practice test?', a: 'Go to Exams, pick an exam, then click Start Full Test.' },
    { q: 'How do I upgrade my plan?', a: 'Open the sidebar user menu and click Upgrade Plan (or Options).' },
    { q: 'How do I change my language or currency?', a: 'Language: Settings page. Currency: in the Upgrade modal footer.' },
    { q: 'Why can’t I access some features?', a: 'You may have reached your plan limits. See Usage & Limits or upgrade your plan.' },
  ]
  return (
    <div className="min-h-screen bg-black text-white">
      <main className="container mx-auto px-6 py-12 max-w-3xl space-y-8">
        <header>
          <h1 className="text-3xl font-semibold">Help & Support</h1>
          <p className="text-gray-400 mt-2">Find FAQs, contact support, and troubleshoot issues.</p>
        </header>

        <section aria-labelledby="faq-heading" className="space-y-4">
          <h2 id="faq-heading" className="text-xl font-semibold">Frequently Asked Questions</h2>
          <div className="divide-y divide-gray-800 rounded-lg border border-gray-800">
            {faqs.map((item, idx) => (
              <details key={idx} className="p-4 group">
                <summary className="cursor-pointer list-none flex items-center justify-between text-sm text-gray-200">
                  <span>{item.q}</span>
                  <span className="text-gray-500 group-open:rotate-180 transition-transform" aria-hidden>▾</span>
                </summary>
                <p className="mt-2 text-sm text-gray-400">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section aria-labelledby="contact-heading" className="space-y-2">
          <h2 id="contact-heading" className="text-xl font-semibold">Contact</h2>
          <p className="text-gray-400 text-sm">Email us at <a className="underline" href="mailto:support@answ.ly">support@answ.ly</a>.</p>
        </section>
      </main>
    </div>
  );
}
