'use client';

import { MARKETS } from '@/lib/market';
import type { Contact } from '@/types';

interface ContactDetailPanelProps {
  contact: Contact;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  lead: '📧 Lead capturé',
  client: '🧑‍💼 Client',
  fournisseur: '📦 Fournisseur',
};

export default function ContactDetailPanel({ contact, onClose, onEdit, onDelete }: ContactDetailPanelProps) {
  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ').trim();
  const displayName = fullName || contact.company || contact.email || 'Contact sans nom';
  const isManual = contact.contact_type !== 'lead';

  const markets = contact.markets?.length ? contact.markets : contact.market ? [contact.market] : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-gray-200 flex items-start justify-between sticky top-0 bg-white">
          <div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 mb-2">
              {TYPE_LABELS[contact.contact_type] ?? contact.contact_type}
            </span>
            <h2 className="text-xl font-black text-gray-900">{displayName}</h2>
            {contact.company && fullName && (
              <p className="text-sm text-gray-500">{contact.company}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500 flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Marchés */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Marché(s)</h3>
            <div className="flex gap-2 flex-wrap">
              {markets.length === 0 ? (
                <span className="text-gray-400 text-sm">—</span>
              ) : (
                markets.map((m) => {
                  const info = MARKETS.find((x) => x.code === m);
                  return (
                    <span
                      key={m}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-gray-100 text-gray-700"
                    >
                      <span>{info?.flag}</span>
                      {info?.label ?? m}
                    </span>
                  );
                })
              )}
            </div>
          </div>

          {/* Coordonnées */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Email</h3>
              <p className="text-gray-900 break-all">{contact.email || '—'}</p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Téléphone</h3>
              <p className="text-gray-900">{contact.phone || '—'}</p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Société</h3>
              <p className="text-gray-900">{contact.company || '—'}</p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Site web</h3>
              {contact.website ? (
                <a
                  href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 font-medium break-all"
                >
                  {contact.website}
                </a>
              ) : (
                <p className="text-gray-900">—</p>
              )}
            </div>
          </div>

          {!isManual && contact.products && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Produit source</h3>
              <p className="text-gray-900">{contact.products.name} <span className="text-gray-400">/{contact.products.slug}</span></p>
            </div>
          )}

          {contact.notes && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Commentaire</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{contact.notes}</p>
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Ajouté le</h3>
            <p className="text-gray-500 text-sm">
              {new Date(contact.created_at).toLocaleDateString('fr-FR', {
                day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
            {contact.email ? (
              <a
                href={`mailto:${contact.email}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Envoyer un mail
              </a>
            ) : (
              <span
                title="Aucun email renseigné pour ce contact"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-400 font-semibold rounded-xl cursor-not-allowed"
              >
                Envoyer un mail
              </span>
            )}
            {isManual && (
              <button
                onClick={onEdit}
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Modifier
              </button>
            )}
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-red-500 hover:text-red-700 hover:bg-red-50 font-semibold rounded-xl transition-colors ml-auto"
            >
              Supprimer
            </button>
          </div>
          {contact.email && (
            <p className="text-xs text-gray-400">
              Ouvre votre client mail par défaut — l&apos;envoi depuis une boîte mail dédiée sera configuré plus tard.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
