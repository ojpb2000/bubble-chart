// Map sub-categories into broader messaging modes
const RATIONAL_KEYWORDS = [
  'Efficiency', 'Convenience', 'Ease of Cleaning', 'Hospital Grade', 'Doctor', 'Price', 'Value', 'Support for Working Moms', 'Portability', 'Discreet', 'Hands-free', 'App', 'Connectivity', 'Materials', 'Quiet'
];
const EMOTIONAL_KEYWORDS = [
  'Comfort', 'Pain-Free', 'Real Mom Testimonials', 'Emotional', 'Bond', 'Confidence', 'Reassurance', 'Care', 'Nurturing'
];

function classifyTheme(mainCategory, subCategory, valueProposition = '') {
  const hay = `${mainCategory} ${subCategory} ${valueProposition}`.toLowerCase();
  const hasAny = (arr) => arr.some((k) => hay.includes(k.toLowerCase()));
  if (hasAny(RATIONAL_KEYWORDS) && hasAny(EMOTIONAL_KEYWORDS)) return 'Hybrid';
  if (hasAny(RATIONAL_KEYWORDS)) return 'Rational';
  if (hasAny(EMOTIONAL_KEYWORDS)) return 'Emotional';
  return 'Other';
}

export function deriveInsights(rows) {
  if (!rows || rows.length === 0) {
    return '<div class="insight-card"><p>No data available for the current filters.</p></div>';
  }

  // Aggregate by Main and Sub for totals
  const groups = d3.rollup(
    rows,
    (items) => ({
      impressions: d3.sum(items, (d) => d['Impressions'] || 0),
      spend: d3.sum(items, (d) => d['Spend (USD)'] || 0),
      sample: items[0] || {},
    }),
    (d) => d.Main_Category,
    (d) => d.Sub_Category
  );

  // Rank subs within mains
  const highlights = [];
  for (const [main, subMap] of groups) {
    const entries = Array.from(subMap, ([sub, agg]) => ({ main, sub, ...agg }));
    entries.sort((a, b) => b.impressions - a.impressions);
    const top = entries[0];
    if (top) {
      highlights.push(top);
    }
  }
  highlights.sort((a, b) => b.impressions - a.impressions);

  // Messaging balance
  const themeAgg = d3.rollup(
    rows,
    (items) => ({
      impressions: d3.sum(items, (d) => d['Impressions'] || 0),
      spend: d3.sum(items, (d) => d['Spend (USD)'] || 0),
    }),
    (d) => classifyTheme(d.Main_Category, d.Sub_Category, d.value_proposition || d.Text_y || d.Text_x || '')
  );

  const themeOrder = ['Rational', 'Emotional', 'Hybrid', 'Other'];
  const themeCards = themeOrder
    .map((label) => {
      const t = themeAgg.get(label) || { impressions: 0, spend: 0 };
      return `<div class="insight-card"><h4>${label} messaging</h4><p>Impressions: ${d3.format(',')(Math.round(t.impressions))}<br/>Spend: $${d3.format(',')(Math.round(t.spend))}</p></div>`;
    })
    .join('');

  // Top movers
  const topCards = highlights
    .slice(0, 6)
    .map((h) => `<div class="insight-card"><h4>${h.main} → ${h.sub}</h4><p>Impressions: ${d3.format(',')(Math.round(h.impressions))}<br/>Spend: $${d3.format(',')(Math.round(h.spend))}</p></div>`)
    .join('');

  return `
    <div class="insight-grid">
      ${themeCards}
      ${topCards}
    </div>
  `;
}


