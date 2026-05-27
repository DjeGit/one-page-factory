import type { PainPoint } from '@/types';

interface PainPointsProps {
  painPoints: PainPoint[];
}

export default function PainPoints({ painPoints }: PainPointsProps) {
  if (!painPoints || painPoints.length === 0) return null;

  return (
    <section className="py-20 bg-gray-950">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-accent-500 font-semibold uppercase tracking-widest text-sm mb-3">
            Vous reconnaissez-vous ?
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            Vous en avez assez de...
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Ces problèmes du quotidien qui gâchent votre vie — il est temps d&apos;y mettre fin.
          </p>
        </div>

        {/* Pain points grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {painPoints.map((point, index) => (
            <div
              key={index}
              className="relative bg-gradient-to-br from-red-950/50 to-gray-900 border border-red-900/30 rounded-2xl p-6 hover:border-red-700/50 transition-all duration-300 group"
            >
              {/* Corner decoration */}
              <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/5 rounded-bl-2xl rounded-tr-2xl" />

              {/* Emoji */}
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-200">
                {point.emoji}
              </div>

              {/* Content */}
              <h3 className="text-lg font-bold text-red-300 mb-2">{point.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{point.description}</p>

              {/* Bottom border accent */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-600/0 via-red-600/50 to-red-600/0 rounded-b-2xl" />
            </div>
          ))}
        </div>

        {/* CTA hint */}
        <div className="text-center mt-12">
          <p className="text-gray-500 text-lg">
            ↓ Il existe une solution simple et efficace ↓
          </p>
        </div>
      </div>
    </section>
  );
}
