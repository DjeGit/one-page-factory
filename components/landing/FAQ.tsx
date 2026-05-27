'use client';

import { useState } from 'react';
import type { FAQItem } from '@/types';

interface FAQProps {
  items: FAQItem[];
}

function FAQItemComponent({ item, index }: { item: FAQItem; index: number }) {
  const [open, setOpen] = useState(index === 0);

  return (
    <div className="border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left bg-gray-900 hover:bg-gray-800/80 transition-colors duration-200 group"
        aria-expanded={open}
      >
        <span className="font-semibold text-white pr-4 group-hover:text-primary-300 transition-colors">
          {item.question}
        </span>
        <span
          className={`flex-shrink-0 w-8 h-8 rounded-full bg-primary-900/50 flex items-center justify-center text-primary-400 transition-transform duration-300 ${
            open ? 'rotate-180' : ''
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-5 bg-gray-950 border-t border-gray-800">
          <p className="text-gray-400 leading-relaxed">{item.answer}</p>
        </div>
      </div>
    </div>
  );
}

export default function FAQ({ items }: FAQProps) {
  if (!items || items.length === 0) return null;

  return (
    <section className="py-20 bg-gray-900">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-primary-400 font-semibold uppercase tracking-widest text-sm mb-3">
            Questions fréquentes
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            Vos questions, nos réponses
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Tout ce que vous devez savoir avant de commander.
          </p>
        </div>

        {/* FAQ items */}
        <div className="max-w-2xl mx-auto space-y-3">
          {items.map((item, index) => (
            <FAQItemComponent key={index} item={item} index={index} />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-gray-500 mb-2">Vous avez d&apos;autres questions ?</p>
          <a
            href="mailto:support@example.com"
            className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
          >
            Contactez notre support →
          </a>
        </div>
      </div>
    </section>
  );
}
