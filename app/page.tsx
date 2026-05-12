import { SearchForm } from './components/SearchForm';

export default function HomePage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">New Search</h1>
        <p className="mt-1 text-sm text-gray-500">
          Enter a Boolean query to find LinkedIn profiles via X-ray search.
          Then run the bookmarklet on Google to scrape emails — no paid tools needed.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <SearchForm />
      </div>

      {/* How it works */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { step: '1', title: 'Search', desc: 'Boolean query finds LinkedIn profiles via Discovery Engine.' },
          { step: '2', title: 'Scrape', desc: 'Bookmarklet runs on Google SERPs, sends emails here.' },
          { step: '3', title: 'Enrich', desc: 'Pattern matching + SMTP verification confirms real emails.' },
        ].map(({ step, title, desc }) => (
          <div key={step} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
              {step}
            </div>
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            <p className="mt-0.5 text-xs text-gray-500">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
