// Force-powered nested bubble landscape
// Main (outer clusters) → Sub (medium bubbles) → Advertiser (small bubbles inside)

export function buildBubbleLandscape({ container, rows }) {
  const rootEl = document.querySelector(container);
  rootEl.innerHTML = '';
  function resolveSize(el) {
    const parent = el.parentElement;
    let w = el.clientWidth;
    let h = el.clientHeight;
    if (!w || w < 50) w = el.getBoundingClientRect().width;
    if ((!w || w < 50) && parent) w = parent.clientWidth || parent.getBoundingClientRect().width;
    if (!h || h < 50) h = el.getBoundingClientRect().height;
    if ((!h || h < 50) && parent) h = parent.clientHeight || parent.getBoundingClientRect().height;
    if (!w || w < 50) w = 960;
    if (!h || h < 50) h = 720;
    return { width: Math.max(300, Math.floor(w - 24)), height: Math.max(420, Math.floor(h - 24)) };
  }
  const { width, height } = resolveSize(rootEl);
  if (width <= 0 || height <= 0) {
    // As a last resort, use fixed safe defaults
    var fallbackWidth = 1000;
    var fallbackHeight = 600;
    const svg = d3
      .select(rootEl)
      .append('svg')
      .attr('width', fallbackWidth)
      .attr('height', fallbackHeight)
      .attr('viewBox', `0 0 ${fallbackWidth} ${fallbackHeight}`);
    svg.append('text').attr('x', 20).attr('y', 30).text('Rendering...').attr('fill', '#888');
    return;
  }

  // Aggregate: main → advertiser (retain sub breakdown for tooltip)
  const rollup = d3.rollup(
    rows,
    (items) => ({
      impressions: d3.sum(items, (d) => d['Impressions'] || 0),
      spend: d3.sum(items, (d) => d['Spend (USD)'] || 0),
      byAdvertiser: d3.rollup(
        items,
        (it) => ({
          impressions: d3.sum(it, (d) => d['Impressions'] || 0),
          spend: d3.sum(it, (d) => d['Spend (USD)'] || 0),
          bySub: d3.rollup(
            it,
            (ss) => d3.sum(ss, (d) => d['Impressions'] || 0),
            (d) => d.Sub_Category || 'Unspecified'
          ),
        }),
        (d) => d.Advertiser || 'Unknown'
      ),
    }),
    (d) => d.Main_Category || 'Uncategorized'
  );

  // Flatten for nodes
  const mainNodes = [];
  const advNodes = [];

  for (const [main, agg] of rollup) {
    const mainImpr = agg.impressions;
    const mainSpend = agg.spend;
    mainNodes.push({ id: `m:${main}`, type: 'main', name: main, impressions: mainImpr, spend: mainSpend });
    for (const [adv, a] of agg.byAdvertiser) {
      const subs = Array.from(a.bySub, ([sub, impressions]) => ({ sub, impressions }))
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 5);
      advNodes.push({ id: `a:${main}:${adv}`, type: 'adv', name: adv, main, impressions: a.impressions, spend: a.spend, subs });
    }
  }

  // Scales (exaggerate for clarity)
  const imprAll = [...mainNodes, ...advNodes].map((d) => d.impressions);
  const minImpr = d3.min(imprAll) || 0;
  const maxImpr = d3.max(imprAll) || 1;
  const rMain = d3.scaleSqrt().domain([minImpr, maxImpr]).range([40, 150]);
  // Promote advertiser bubbles to previous sub-category visual weight
  const rAdv = d3.scaleSqrt().domain([minImpr, maxImpr]).range([18, 90]);
  const spendAll = [...mainNodes, ...advNodes].map((d) => d.spend || 0);
  const spendScale = d3.scaleSqrt().domain([d3.min(spendAll) || 0, d3.max(spendAll) || 1]).range([0.15, 0.9]);
  const spendOpacity = d3.scaleSqrt().domain([d3.min(spendAll) || 0, d3.max(spendAll) || 1]).range([0.35, 0.95]);
  const spendWidth = d3.scaleSqrt().domain([d3.min(spendAll) || 0, d3.max(spendAll) || 1]).range([1, 2.6]);

  const svg = d3
    .select(rootEl)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`);

  const defs = svg.append('defs');
  // Colored radial gradient (intensity by spend) keyed by category/sub
  function gradientId(k) { return `grad-${k.replace(/[^a-zA-Z0-9]/g, '')}`; }

  const hueScale = d3.scaleOrdinal()
    .range(['#e3f2fd', '#e8f5e9', '#fff8e1', '#f3e5f5', '#e0f7fa', '#fce4ec', '#ede7f6', '#f1f8e9']);

  function ensureGradient(sel, alpha, colorHex = '#ff2e93') {
    // Increase color intensity: boost inner/outer alphas while keeping translucency
    const aInner = Math.max(0.45, Math.min(alpha * 1.15, 0.98));
    const aOuter = Math.max(0.32, Math.min(alpha * 0.75, 0.75));
    const key = `${sel}-${Math.round(aInner * 100)}-${Math.round(aOuter * 100)}`;
    const id = gradientId(key);
    if (!document.getElementById(id)) {
      const g = defs.append('radialGradient').attr('id', id);
      const c = d3.color(colorHex) || d3.color('#ff2e93');
      const c0 = `rgba(${c.r},${c.g},${c.b},${aInner})`;
      const c1 = `rgba(${c.r},${c.g},${c.b},${aOuter})`;
      g.append('stop').attr('offset', '0%').attr('stop-color', c0);
      g.append('stop').attr('offset', '100%').attr('stop-color', c1);
    }
    return `url(#${id})`;
  }

  // Tooltip
  let tip = d3.select('.tooltip');
  if (tip.empty()) tip = d3.select('body').append('div').attr('class', 'tooltip');

  // Helper: synthesize a brief interpretation of advertiser messaging from its top subs
  function interpretSubs(subs = []) {
    if (!subs.length) return 'Mixed messaging';
    const labels = subs.map((s) => (s.sub || '').toLowerCase());
    const pick = (...keys) => keys.some((k) => labels.some((x) => x.includes(k)));
    if (pick('portab', 'wearable', 'discreet', 'quiet')) return 'On-the-go, discreet use';
    if (pick('convenien', 'hands', 'app', 'connect')) return 'Hands-free convenience & app control';
    if (pick('comfort', 'pain')) return 'Comfort-first messaging';
    if (pick('doctor', 'hospital')) return 'Doctor-backed quality';
    if (pick('value', 'price', 'deal')) return 'Value/price emphasis';
    if (pick('efficien', 'output', 'fast')) return 'Efficiency & output speed';
    if (pick('testimon', 'mom')) return 'Real-mom testimonials';
    return 'General benefits overview';
  }

  // Simulation and nodes
  const nodes = [
    ...mainNodes.map((d) => ({ ...d, key: `m:${d.name}`, radius: rMain(d.impressions) })),
    ...advNodes.map((d) => ({ ...d, key: `a:${d.main}:${d.name}`, parentKey: `m:${d.main}`, radius: rAdv(d.impressions) })),
  ];

  // Fast lookup for containment
  const nodeByKey = new Map(nodes.map((n) => [n.key, n]));

  const center = { x: width / 2, y: height / 2 };

  // Gravity proportional to impressions so nodes settle near the center by weight
  const gravityStrength = 0.06;
  const weightScale = d3.scaleSqrt().domain([minImpr, maxImpr]).range([0.5, 3]);

  const sim = d3
    .forceSimulation(nodes)
    .force('charge', d3.forceManyBody().strength((d) => (d.type === 'main' ? -20 : -4)))
    .force('center', d3.forceCenter(center.x, center.y))
    .force('collision', d3.forceCollide().radius((d) => d.radius + 1.5))
    .force('cluster', clusteringForce())
    .force('gravityX', d3.forceX(center.x).strength((d) => gravityStrength * weightScale(d.impressions)))
    .force('gravityY', d3.forceY(center.y).strength((d) => gravityStrength * weightScale(d.impressions)))
    .force('contain', containmentForce())
    .alphaDecay(0.04)
    .on('tick', ticked);

  const g = svg.append('g');

  const circles = g
    .selectAll('circle')
    .data(nodes)
    .join('circle')
    .attr('r', (d) => d.radius)
    .attr('fill', (d) => {
      const base = d.type === 'main' ? hueScale(d.name) : hueScale(d.main);
      return ensureGradient(d.type + '-' + d.name, spendScale(d.spend || 0), base);
    })
    .attr('stroke', (d) => {
      const base = d.type === 'main' ? hueScale(d.name) : hueScale(d.main);
      const c = d3.color(base).darker(0.6);
      const a = d.type === 'main' ? 0.95 : spendOpacity(d.spend || 0);
      return `rgba(${c.r},${c.g},${c.b},${a})`;
    })
    .attr('stroke-width', (d) => (d.type === 'main' ? 2.2 : spendWidth(d.spend || 0)))
    .attr('opacity', 1)
    .on('mousemove', (event, d) => {
      tip
        .style('opacity', 1)
        .style('left', `${event.pageX + 12}px`)
        .style('top', `${event.pageY - 12}px`)
         .html(
          `<div><strong>${d.name}</strong></div>` +
            (d.type !== 'main' ? `<div class=\"k\">Main:</div> ${d.main || ''}` : '') +
            `<div class=\"k\">Impressions:</div> ${d3.format(',')(Math.round(d.impressions))}` +
            `<div class=\"k\">Spend:</div> $${d3.format(',')(Math.round(d.spend || 0))}` +
            (d.type === 'adv' ? `<div class=\"mini\">${interpretSubs(d.subs)}</div>` : '')
        );
    })
    .on('mouseleave', () => tip.style('opacity', 0));

  // On hover, show a temporary label next to the cursor (instead of always visible labels)
  circles.on('mouseenter', function () { d3.select(this).attr('stroke-width', 1.6); })
         .on('mouseleave', function () { d3.select(this).attr('stroke-width', 1); });

  // Always-visible labels for main categories
  const mainLabels = g
    .selectAll('text.bubble-main-label')
    .data(nodes.filter((d) => d.type === 'main'))
    .join('text')
    .attr('class', 'bubble-main-label')
    .attr('text-anchor', 'middle')
    .text((d) => d.name);

  function ticked() {
    circles.attr('cx', (d) => d.x).attr('cy', (d) => d.y);
    mainLabels.attr('x', (d) => d.x).attr('y', (d) => d.y + 4);
  }

  // Clustering force: advertiser nodes pulled to their main
  function clusteringForce() {
    const strength = 0.08;
    function force(alpha) {
      for (const d of nodes) {
        if (d.type === 'adv') {
          const anchor = nodes.find((n) => n.type === 'main' && n.name === d.main);
          if (anchor) {
            d.vx += (anchor.x - d.x) * strength * alpha;
            d.vy += (anchor.y - d.y) * strength * alpha;
          }
        }
      }
    }
    force.initialize = () => {};
    return force;
  }

  // Keep smaller nodes inside their parent circles (soft boundary)
  function containmentForce() {
    const padding = 4;
    function force() {
      for (const d of nodes) {
        if (d.type === 'adv') {
          const parent = nodeByKey.get(d.parentKey);
          if (!parent || !isFinite(parent.x) || !isFinite(parent.y)) continue;
          const dx = d.x - parent.x;
          const dy = d.y - parent.y;
          const dist = Math.max(1e-6, Math.hypot(dx, dy));
          const maxDist = Math.max(0, (parent.radius - d.radius - padding));
          if (dist > maxDist) {
            // Pull back to boundary
            const k = (dist - maxDist) / dist;
            d.x -= dx * k;
            d.y -= dy * k;
          }
        } else if (d.type === 'main') {
          // Keep mains inside the canvas softly
          d.x = Math.max(d.radius + 8, Math.min(width - d.radius - 8, d.x));
          d.y = Math.max(d.radius + 8, Math.min(height - d.radius - 8, d.y));
        }
      }
    }
    force.initialize = () => {};
    return force;
  }
}


