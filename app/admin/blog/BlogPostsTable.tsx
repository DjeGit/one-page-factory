'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { BlogPost } from '@/types';
import { MARKET_ORIGIN } from '@/lib/site-url';

// Miniature légère : si l'image est sur Cloudinary, on demande une version
// réduite 160x100 plutôt que l'image 1600x900 complète.
function thumbUrl(url: string): string {
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', '/upload/c_fill,w_160,h_100,q_auto,f_auto/');
  }
  return url;
}

type Notice = { kind: 'success' | 'error'; text: string; href?: string };

interface Props {
  posts: BlogPost[];
}

export default function BlogPostsTable({ posts }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const readError = async (res: Response): Promise<string> => {
    const data = await res.json().catch(() => ({}));
    return data?.error || `Erreur ${res.status}`;
  };

  const handleDelete = async (post: BlogPost) => {
    if (!confirm(`Supprimer "${post.title}" ? Cette action est irréversible.`)) return;
    setBusyId(post.id);
    setNotice(null);
    try {
      const res = await fetch(`/api/blog/${post.id}`, { method: 'DELETE' });
      if (res.ok) {
        setNotice({ kind: 'success', text: `Article « ${post.title} » supprimé.` });
        router.refresh();
      } else {
        setNotice({ kind: 'error', text: `Suppression impossible : ${await readError(res)}` });
      }
    } catch {
      setNotice({ kind: 'error', text: 'Suppression impossible : problème de connexion.' });
    } finally {
      setBusyId(null);
    }
  };

  const handlePublish = async (post: BlogPost) => {
    setBusyId(post.id);
    setNotice(null);
    try {
      const res = await fetch(`/api/blog/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish: true }),
      });
      if (res.ok) {
        setNotice({
          kind: 'success',
          text: `Article « ${post.title} » publié.`,
          href: `${MARKET_ORIGIN[post.market]}/blog/${post.slug}`,
        });
        router.refresh();
      } else {
        setNotice({ kind: 'error', text: `Publication impossible : ${await readError(res)}` });
      }
    } catch {
      setNotice({ kind: 'error', text: 'Publication impossible : problème de connexion.' });
    } finally {
      setBusyId(null);
    }
  };

  const handleUnpublish = async (post: BlogPost) => {
    if (!confirm(`Repasser « ${post.title} » en brouillon ? L'article ne sera plus visible sur le site.`)) return;
    setBusyId(post.id);
    setNotice(null);
    try {
      const res = await fetch(`/api/blog/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unpublish: true }),
      });
      if (res.ok) {
        setNotice({ kind: 'success', text: `Article « ${post.title} » repassé en brouillon : il n'est plus visible sur le site.` });
        router.refresh();
      } else {
        setNotice({ kind: 'error', text: `Impossible de dépublier : ${await readError(res)}` });
      }
    } catch {
      setNotice({ kind: 'error', text: 'Impossible de dépublier : problème de connexion.' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
    {notice && (
      <div
        role="status"
        className={`mb-4 flex items-center justify-between gap-4 rounded-xl border px-4 py-3 text-sm font-medium ${
          notice.kind === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}
      >
        <span>
          {notice.kind === 'success' ? '✓ ' : '⚠ '}
          {notice.text}
          {notice.href && (
            <>
              {' '}
              <a href={notice.href} target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                Voir l&apos;article en ligne
              </a>
            </>
          )}
        </span>
        <button type="button" onClick={() => setNotice(null)} className="text-xs opacity-70 hover:opacity-100">
          Fermer
        </button>
      </div>
    )}
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Article</th>
              <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Marché</th>
              <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Catégorie</th>
              <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Tags</th>
              <th className="text-center px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
              <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {posts.map((post) => (
              <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    {post.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbUrl(post.cover_image_url)}
                        alt=""
                        loading="lazy"
                        className="w-20 h-[50px] object-cover rounded-lg border border-gray-200 flex-shrink-0"
                      />
                    ) : (
                      <div
                        title="Pas encore d'image de couverture"
                        className="w-20 h-[50px] rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-300 text-lg flex-shrink-0"
                      >
                        🖼
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-gray-900">
                        {post.title}
                        {post.generated_by_ai && <span className="ml-2 text-xs text-primary-600">🤖 IA</span>}
                      </div>
                      <div className="text-xs text-gray-400">/blog/{post.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 hidden md:table-cell text-sm text-gray-600 uppercase">{post.market}</td>
                <td className="px-4 py-4 hidden md:table-cell text-sm text-gray-600">
                  {post.category ? (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: post.category.color ? `${post.category.color}1A` : '#F3F4F6',
                        color: post.category.color || '#4B5563',
                      }}
                    >
                      {post.category.icon && <span>{post.category.icon}</span>}
                      {post.category.name_fr}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-4 hidden md:table-cell text-sm text-gray-600">{post.tags.join(', ') || '—'}</td>
                <td className="px-4 py-4 text-center">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                      post.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${post.status === 'published' ? 'bg-green-500' : 'bg-gray-400'}`} />
                    {post.status === 'published' ? 'Publié' : 'Brouillon'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {post.status === 'draft' && (
                      <button
                        onClick={() => handlePublish(post)}
                        disabled={busyId === post.id}
                        className="text-xs font-semibold text-green-700 hover:text-green-900 disabled:opacity-50"
                      >
                        Publier
                      </button>
                    )}
                    {post.status === 'published' && (
                      <button
                        onClick={() => handleUnpublish(post)}
                        disabled={busyId === post.id}
                        className="text-xs font-semibold text-amber-700 hover:text-amber-900 disabled:opacity-50"
                      >
                        Dépublier
                      </button>
                    )}
                    <Link href={`/admin/blog/${post.id}`} className="text-xs font-semibold text-primary-600 hover:text-primary-800">
                      Modifier
                    </Link>
                    <button
                      onClick={() => handleDelete(post)}
                      disabled={busyId === post.id}
                      className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
}
