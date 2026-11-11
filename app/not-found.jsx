import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#09090B] text-[#F4F1EA] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-[#111115] border border-[#222228] rounded-lg p-8 text-center space-y-4">
        <p className="text-xs font-semibold tracking-[0.2em] text-[#C8A464]">ERROR 404</p>
        <h1 className="text-3xl font-bold text-[#F4F1EA]">Archive Record Not Found</h1>
        <p className="text-sm text-[#9A9AA2] leading-relaxed">
          The requested page, composition, or release does not exist or is not currently published in the Masud Hauqe archive.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="px-5 py-2.5 rounded bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] text-xs font-semibold transition-colors"
          >
            Return to Homepage
          </Link>
          <Link
            href="/music"
            className="px-5 py-2.5 rounded border border-[#2A2A32] text-[#F4F1EA] hover:border-[#C8A464] text-xs font-semibold transition-colors"
          >
            Music Library
          </Link>
        </div>
      </div>
    </main>
  );
}
