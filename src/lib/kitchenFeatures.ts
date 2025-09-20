export type FeatureOption = {
  label: string;
  promptText: string;
};

export type FeatureCategory = {
  name: string;
  options: FeatureOption[];
};

export const PROMPT_STORAGE_KEY = 'promptDraft';
export const ASPECT_RATIO_STORAGE_KEY = 'aspectRatio';

export const STYLE_FEATURE_OPTIONS: FeatureOption[] = [
  { label: 'Nowoczesna', promptText: 'Kuchnia nowoczesna' },
  { label: 'Klasyczna', promptText: 'Kuchnia klasyczna' },
  { label: 'Skandynawska', promptText: 'Kuchnia w stylu skandynawskim' },
  { label: 'Loft / Industrial', promptText: 'Kuchnia w stylu loft / industrialnym' },
  { label: 'Rustykalna', promptText: 'Kuchnia rustykalna' },
  { label: 'Minimalistyczna', promptText: 'Kuchnia minimalistyczna' },
  { label: 'Glamour', promptText: 'Kuchnia w stylu glamour' },
  { label: 'Retro', promptText: 'Kuchnia retro' },
  { label: 'Boho', promptText: 'Kuchnia boho' },
  { label: 'Japandi', promptText: 'Kuchnia w stylu japandi' },
];

export const LAYOUT_FEATURE_OPTIONS: FeatureOption[] = [
  { label: 'I', promptText: 'Kuchnia na jednej ścianie' },
  { label: 'L', promptText: 'Kuchnia w literę L' },
  { label: 'U', promptText: 'Kuchnia w literę U' },
  {
    label: 'I I',
    promptText:
      'Kuchnia na dwóch równoległych ścianach nie połączonych ze sobą meblami',
  },
  { label: 'Wyspa', promptText: 'Kuchnia z wyspą' },
  {
    label: 'Barek',
    promptText:
      'Kuchnia z podwyższonym wąski blatem jako barkiem pod hokery dostawiona do blatu roboczego',
  },
];

export const APPLIANCE_FEATURE_OPTIONS: FeatureOption[] = [
  {
    label: 'Lod zab.',
    promptText:
      'Kuchnia z jedną lodówką w zabudowie dwoje drzwi na dole front do wysokości blatu drugi front jak pasuje',
  },
  { label: 'Lod. woln.', promptText: 'Kuchnia z lodówką pojedynczą szerokości 60cm wysoką' },
  { label: 'Lod. side', promptText: 'Kuchnia z lodówką side by side dwoje drzwi szeroka' },
  {
    label: 'Piek pod pł.',
    promptText:
      'Kuchnia z piekarnikiem pod płytą grzewczą 60cm nad okap wolnowiszący lub w zabudowie',
  },
  {
    label: 'Piek w słup.',
    promptText:
      'Kuchnia z piekarnikiem w słupku zazwyczaj razem z mikrofalą też w zabudowie',
  },
  {
    label: 'Zlew okno',
    promptText:
      'Kuchnia ze zlewozmywakiem pod oknem najczęściej półtorakomory z małym ociekaczem w kuchni tylko jeden zlew',
  },
];

export const SIZE_FEATURE_OPTIONS: FeatureOption[] = [
  { label: 'XS', promptText: 'Mała kuchnia ciasna w bloku' },
  { label: 'S', promptText: 'Niezaduża kuchnia w mieszkaniu' },
  { label: 'Medium', promptText: 'Średnia kuchnia do mieszkania' },
  { label: 'Large', promptText: 'Kuchnia duża do domu' },
  { label: 'XL', promptText: 'Bardzo duża kuchnia najczęściej z wyspą do domu' },
];

export const FEATURE_CATEGORIES: FeatureCategory[] = [
  { name: 'Styl kuchni', options: STYLE_FEATURE_OPTIONS },
  { name: 'Układ kuchni', options: LAYOUT_FEATURE_OPTIONS },
  { name: 'AGD', options: APPLIANCE_FEATURE_OPTIONS },
  { name: 'Rozmiar', options: SIZE_FEATURE_OPTIONS },
];

export const FEATURE_OPTIONS: FeatureOption[] = [
  ...STYLE_FEATURE_OPTIONS,
  ...LAYOUT_FEATURE_OPTIONS,
  ...APPLIANCE_FEATURE_OPTIONS,
  ...SIZE_FEATURE_OPTIONS,
];

export const optionPromptByLabel = (label: string) =>
  FEATURE_OPTIONS.find((opt) => opt.label === label)?.promptText;

export const isOptionPromptText = (text: string) =>
  FEATURE_OPTIONS.some((opt) => opt.promptText === text);

export const extractOptionLabelsFromPrompt = (value: string) => {
  const parts = value
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  return FEATURE_OPTIONS.filter((opt) => parts.includes(opt.promptText)).map((opt) => opt.label);
};

export const mergePromptWithSelectedOptions = (
  currentPrompt: string,
  selectedLabels: string[],
) => {
  const parts = currentPrompt
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const baseParts = parts.filter((part) => !isOptionPromptText(part));
  const optionParts = selectedLabels
    .map((label) => optionPromptByLabel(label))
    .filter((part): part is string => Boolean(part));
  return [...baseParts, ...optionParts].join(', ');
};
