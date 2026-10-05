'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { BlogPost } from '@/types';

interface Props {
  posts: BlogPost[];
}

export default function BlogPostsTable({ posts }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleDelete = async (post: BlogPost) => {
    if (!confirm(`Supprimer "${post.title}" ? Cette action est irréversible.`)) return;
    setBusyId(post.id);
    try {
      const res = await fetch(`/api/blog/${post.id}`, { method: 'DELETE' });
      if (res.ok) router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  const handlePublish = async (post: BlogPost) => {
    setBusyId(post.id);
    try {
      const res = await fetch(`/api/blog/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish: true }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Article</th>
              <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Marché</th>
              <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Tags</th>
              <th className="text-center px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
              <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {posts.map((post) => (
              <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-semibold text-gray-900">
                    {post.title}
                    {post.generated_by_ai && <span className="ml-2 text-xs text-primary-600">🤖 IA</span>}
                  </div>
                  <div className="text-xs text-gray-400">/blog/{post.slug}</div>
                </td>
                <td className="px-4 py-4 hidden md:table-cell text-sm text-gray-600 uppercase">{post.market}</td>
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
  );
}
