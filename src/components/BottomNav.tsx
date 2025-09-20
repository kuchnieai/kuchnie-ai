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
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="absolute bottom-16 left-0 right-0 bg-white shadow"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4 p-4">
              <Link
                href="/moja-kuchnia"
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl bg-[#f2f2f2] px-4 py-3 text-base font-medium text-gray-800 transition hover:bg-[#e5e5e5]"
              >
                Moja kuchnia
              </Link>
              <div className="border-t border-gray-100 pt-4">
                <AuthButtons />
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

