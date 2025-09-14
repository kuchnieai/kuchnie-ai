'use client';

import { useEffect, useState } from 'react';

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      onClick={scrollTop}
      aria-label="Scroll to top"
      className={`fixed left-1/2 -translate-x-1/2 top-4 z-50 flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 bg-white text-gray-800 shadow transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}
    >
      <span className="text-lg">↑</span>
      <span className="text-sm font-medium">To Top</span>
    </button>
  );
}

