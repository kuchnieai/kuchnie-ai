'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FEATURE_CATEGORIES,
  ASPECT_RATIO_STORAGE_KEY,
  PROMPT_STORAGE_KEY,
  extractOptionLabelsFromPrompt,
  mergePromptWithSelectedOptions,
} from '@/lib/kitchenFeatures';

export default function MojaKuchniaPage() {
  const [aspectRatio, setAspectRatio] = useState('4:3');
  const [options, setOptions] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedPrompt = sessionStorage.getItem(PROMPT_STORAGE_KEY);
    if (savedPrompt) {
      setPrompt(savedPrompt);
      setOptions(extractOptionLabelsFromPrompt(savedPrompt));
    }

    const savedAspect = localStorage.getItem(ASPECT_RATIO_STORAGE_KEY);
    if (savedAspect) {
      setAspectRatio(savedAspect);
    }
  }, []);

  const selectAspect = (ratio: string) => {
    setAspectRatio(ratio);
    if (typeof window !== 'undefined') {
      localStorage.setItem(ASPECT_RATIO_STORAGE_KEY, ratio);
    }
  };

  const toggleOption = (label: string) => {
    setOptions((prev) => {
      const next = prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label];
      setPrompt((prevPrompt) => {
        const merged = mergePromptWithSelectedOptions(prevPrompt, next);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(PROMPT_STORAGE_KEY, merged);
        }
        return merged;
      });
      return next;
    });
  };

  const clearSelections = () => {
    setOptions([]);
    setPrompt((prevPrompt) => {
      const base = mergePromptWithSelectedOptions(prevPrompt, []);
      if (typeof window !== 'undefined') {
        if (base) {
          sessionStorage.setItem(PROMPT_STORAGE_KEY, base);
        } else {
          sessionStorage.removeItem(PROMPT_STORAGE_KEY);
        }
      }
      return base;
    });
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-20">
      <header className="mb-8">
        <h1 className="text-4xl font-semibold text-slate-900">Moja kuchnia</h1>
        <p className="mt-3 text-base text-slate-600">
          Ustaw swoje ulubione parametry, a zapisane wartości będą czekać w kreatorze generowania kuchni.
        </p>
      </header>

      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <p className="font-medium">Proporcje zdjęcia</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => selectAspect('3:4')}
              className={`px-3 py-1 rounded-full text-sm ${
                aspectRatio === '3:4' ? 'bg-blue-200' : 'bg-[#f2f2f2]'
              }`}
            >
              Pion 4:3
            </button>
            <button
              onClick={() => selectAspect('1:1')}
              className={`px-3 py-1 rounded-full text-sm ${
                aspectRatio === '1:1' ? 'bg-blue-200' : 'bg-[#f2f2f2]'
              }`}
            >
              Kwadrat
            </button>
            <button
              onClick={() => selectAspect('4:3')}
              className={`px-3 py-1 rounded-full text-sm ${
                aspectRatio === '4:3' ? 'bg-blue-200' : 'bg-[#f2f2f2]'
              }`}
            >
              Poziom 4:3
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {FEATURE_CATEGORIES.map((category) => (
            <div key={category.name}>
              <p className="font-medium mb-2">{category.name}</p>
              <div className="flex flex-wrap gap-2">
                {category.options.map((option) => (
                  <button
                    key={option.label}
                    onClick={() => toggleOption(option.label)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      options.includes(option.label) ? 'bg-blue-200' : 'bg-[#f2f2f2]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#f2f2f2] px-4 py-3 text-sm text-slate-600">
          <span>Ustawienia zapisują się automatycznie</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={clearSelections}
              className="rounded-full border border-transparent bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-200 hover:bg-slate-50"
            >
              Wyczyść wybory
            </button>
            <Link
              href="/"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              Otwórz generator
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Mój zapisany opis kuchni</h2>
        {prompt ? (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{prompt}</p>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            Dodaj opis na stronie głównej, aby zobaczyć go tutaj wraz z wybranymi ustawieniami.
          </p>
        )}
      </section>
    </main>
  );
}
