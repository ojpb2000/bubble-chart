// Utilities to shorten and standardize labels for sub-categories

const DIRECT_MAPPINGS = new Map([
  ['Portability & Discreet Design', 'Portability'],
  ['Convenience Features', 'Convenience'],
  ['Ease of Cleaning', 'Easy Clean'],
  ['Comfort & Pain-Free Use', 'Comfort'],
  ['Support for Working Moms', 'Working Moms'],
  ['Hospital Grade or Doctor Recommended', 'Doctor-Backed'],
  ['Price vs. Value', 'Value'],
  ['Real Mom Testimonials', 'Testimonials'],
  ['Emotional Connection', 'Emotional'],
  ['Efficiency', 'Efficiency'],
  ['Not Recognizable', 'Unspecified'],
]);

const KEYWORD_MAPPINGS = [
  { key: 'wearable', label: 'Wearable' },
  { key: 'app', label: 'App/Connect' },
  { key: 'connect', label: 'App/Connect' },
  { key: 'quiet', label: 'Quietness' },
  { key: 'silence', label: 'Quietness' },
  { key: 'format: video', label: 'Video' },
  { key: 'format: static image', label: 'Static' },
  { key: 'carousel', label: 'Carousel' },
  { key: 'audio', label: 'Audio' },
  { key: 'lanolin', label: 'Lanolin' },
  { key: 'bottle', label: 'Bottles' },
  { key: 'milk storage', label: 'Storage' },
  { key: 'doctor', label: 'Doctor-Backed' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'bundle', label: 'Bundle' },
];

function cleanTokens(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[\*\|#_\[\]\(\)]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function shortenSubLabel(main, subRaw) {
  if (!subRaw && DIRECT_MAPPINGS.has(main)) return DIRECT_MAPPINGS.get(main);
  const sub = (subRaw || '').trim();
  if (DIRECT_MAPPINGS.has(sub)) return DIRECT_MAPPINGS.get(sub);

  const clean = cleanTokens(sub);
  for (const { key, label } of KEYWORD_MAPPINGS) {
    if (clean.includes(key)) return label;
  }

  // Default: keep first two meaningful words
  const words = sub.replace(/[^a-zA-Z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'Other';
  const short = words.slice(0, 2).join(' ');
  return short.length > 20 ? short.slice(0, 18) + '…' : short;
}


