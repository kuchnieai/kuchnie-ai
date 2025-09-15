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
            className="absolute bottom-16 left-0 right-0 bg-white shadow safe-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4">
              <AuthButtons />
            </div>
          </div>
        </div>
      )}
      <nav className="sticky-bottom bg-white z-50 h-16">
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

