'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import AuthButtons from './AuthButtons';

export default function BottomNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="absolute bottom-20 left-4 right-4 mx-auto max-w-lg rounded-3xl bg-white/95 p-6 text-slate-800 shadow-xl ring-1 ring-slate-100"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Menu</p>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-base text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                aria-label="Zamknij menu"
              >
                ×
              </button>
            </div>

            <div className="mt-6 space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Twoje konto</p>
                <div className="mt-3 text-sm">
                  <AuthButtons />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Szybkie skróty</p>
                <ul className="mt-3 space-y-2 text-sm font-medium text-slate-700">
                  <li>
                    <Link
                      href="/moja-kuchnia"
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center justify-between rounded-2xl px-4 py-3 transition ${
                        pathname === '/moja-kuchnia'
                          ? 'bg-orange-100 text-orange-600'
                          : 'hover:bg-orange-50 hover:text-orange-600'
                      }`}
                    >
                      <span>Moja kuchnia</span>
                      <span aria-hidden className="text-lg">→</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/explore"
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center justify-between rounded-2xl px-4 py-3 transition ${
                        pathname === '/explore'
                          ? 'bg-orange-100 text-orange-600'
                          : 'hover:bg-orange-50 hover:text-orange-600'
                      }`}
                    >
                      <span>Galeria inspiracji</span>
                      <span aria-hidden className="text-lg">→</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/firmy"
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center justify-between rounded-2xl px-4 py-3 transition ${
                        pathname === '/firmy'
                          ? 'bg-orange-100 text-orange-600'
                          : 'hover:bg-orange-50 hover:text-orange-600'
                      }`}
                    >
                      <span>Strefa firm</span>
                      <span aria-hidden className="text-lg">→</span>
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
      <nav className="fixed bottom-0 left-0 right-0 bg-white z-50 h-16">
        <ul className="flex justify-around items-center h-full text-xs">
          <li>
            <button
              onClick={() => setMenuOpen(true)}
              className="flex flex-col items-center"
            >
              <span className="text-xl">☰</span>
              Menu
            </button>
          </li>
          <li>
            <Link
              href="/explore"
              className={`flex flex-col items-center ${
                pathname === '/explore' ? 'text-orange-500' : ''
              }`}
            >
              <span className="text-xl">🧭</span>
              Explore
            </Link>
          </li>
          <li>
            <Link
              href="/"
              className={`flex flex-col items-center ${
                pathname === '/' ? 'text-orange-500' : ''
              }`}
            >
              <span className="text-xl">🖌️</span>
              Stwórz
            </Link>
          </li>
          <li>
            <Link
              href="/firmy"
              className={`flex flex-col items-center ${
                pathname === '/firmy' ? 'text-orange-500' : ''
              }`}
            >
              <span className="text-xl">🏢</span>
              Firmy
            </Link>
          </li>
        </ul>
      </nav>
    </>
  );
}

