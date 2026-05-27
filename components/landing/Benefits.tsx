import type { Benefit } from '@/types';

interface BenefitsProps {
  benefits: Benefit[];
  productName: string;
}

export default function Benefits({ benefits, productName }: BenefitsProps) {
  if (!benefits || benefits.length === 0) return null;

  return (
    <section className="py-20 bg-gradient-to-b from-gray-900 to-gray-950">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-primary-400 font-semibold uppercase tracking-widest text-sm mb-3">
            Pourquoi choisir {productName}
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            Pourquoi vous allez{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-400">
              adorer
            </span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Des résultats concrets, dès les premières utilisations.
          </p>
        </div>

        {/* Benefits grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="relative bg-gradient-to-br from-primary-950/60 to-gray-900 border border-primary-800/30 rounded-2xl p-6 hover:border-primary-600/50 hover:shadow-lg hover:shadow-primary-900/30 transition-all duration-300 group"
            >
              {/* Icon */}
              <div className="text-3xl mb-4 w-12 h-12 bg-primary-900/50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                {benefit.icon}
              </div>

              {/* Green checkmark */}
              <div className="absolute top-4 right-4 text-green-400 opacity-60 group-hover:opacity-100 transition-opacity">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              {/* Content */}
              <h3 className="text-lg font-bold text-white mb-2">{benefit.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{benefit.description}</p>

              {/* Bottom accent */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-600/0 via-primary-600/40 to-primary-600/0 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>

        {/* Stats bar */}
        <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto text-center">
          {[
            { value: '97%', label: 'Clients satisfaits' },
            { value: '24h', label: 'Résultats visibles' },
            { value: '5★', label: 'Note moyenne' },
          ].map((stat, i) => (
            <div key={i}>
              <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-400">
                {stat.value}
              </div>
              <div className="text-gray-500 text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
