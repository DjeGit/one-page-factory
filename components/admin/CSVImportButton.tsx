'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CSVImportModal from './CSVImportModal';

export default function CSVImportButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        Importer CSV
      </button>

      {open && (
        <CSVImportModal
          onClose={() => setOpen(false)}
          onImported={() => {
            router.refresh();
          }}
        />
      )}
    </>
  );
}
