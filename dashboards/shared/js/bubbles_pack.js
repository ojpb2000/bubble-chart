// Deterministic circle packing alternative for Bubble Images tab
// Layout: root → Main Category → Advertiser

export function buildBubblePack({ container, rows }) {
  // Apply main category allow-list from global state if present
  const allow = (window.__MAIN_ALLOW__ instanceof Set) ? window.__MAIN_ALLOW__ : null;
  if (allow) rows = rows.filter(r => allow.has(r.Main_Category));
  const rootEl = document.querySelector(container);
  if (!rootEl) return;
  rootEl.innerHTML = '';

  const width = Math.max(360, (rootEl.clientWidth || (rootEl.parentElement ? rootEl.parentElement.clientWidth : 960)) - 24);
  const height = Math.max(420, (rootEl.clientHeight || 600) - 24);

  // Build hierarchy
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
        }),
        (d) => d['Brand Root'] || d.Advertiser || 'Unknown'
      ),
    }),
    (d) => d.Main_Category || 'Uncategorized'
  );

  const children = [];
  for (const [main, agg] of rollup) {
    const advChildren = Array.from(agg.byAdvertiser, ([name, a]) => ({ name, value: Math.max(a.impressions, 0), spend: a.spend }));
    children.push({ name: main, children: advChildren, spend: agg.spend, value: agg.impressions });
  }
  const hierarchy = { name: 'root', children };

  const root = d3
    .hierarchy(hierarchy)
    .sum((d) => d.value || 0)
    .sort((a, b) => (b.value || 0) - (a.value || 0));

  // Compute pack on a compact canvas, then scale up aggressively
  const layoutW = Math.max(120, Math.floor(width / 4));
  const layoutH = Math.max(140, Math.floor(height / 4));
  // Bring main categories closer by removing inner padding
  const pack = d3.pack().size([layoutW, layoutH]).padding(0);
  pack(root);

  // Increase "gravity" toward each main category center by pulling
  // advertiser nodes slightly closer to their parent centroid
  const tightness = 0.75; // lower = tighter clustering (e.g., 0.7–0.9)
  root
    .descendants()
    .filter((n) => n.depth === 2)
    .forEach((n) => {
      const cx = n.parent.x;
      const cy = n.parent.y;
      n.x = cx + (n.x - cx) * tightness;
      n.y = cy + (n.y - cy) * tightness;
    });

  // Strong scale factor so bubbles render much larger
  const k = 10; // increase this for bigger bubbles
  // Compute bounds after scaling to center the layout inside the SVG
  const advNodesForBounds = root.descendants().filter((n) => n.depth === 2);
  const minX = d3.min(advNodesForBounds, (d) => d.x * k - d.r * k) || 0;
  const maxX = d3.max(advNodesForBounds, (d) => d.x * k + d.r * k) || width;
  const minY = d3.min(advNodesForBounds, (d) => d.y * k - d.r * k) || 0;
  const maxY = d3.max(advNodesForBounds, (d) => d.y * k + d.r * k) || height;
  const contentW = Math.max(1, maxX - minX);
  const contentH = Math.max(1, maxY - minY);
  const tx = (width - contentW) / 2 - minX;
  const ty = (height - contentH) / 2 - minY;

  const hueScale = d3
    .scaleOrdinal()
    .range(['#e3f2fd', '#e8f5e9', '#fff8e1', '#f3e5f5', '#e0f7fa', '#fce4ec', '#ede7f6', '#f1f8e9']);

  const spendExtent = d3.extent(root.descendants(), (n) => n.data.spend || 0);
  const spendOpacity = d3.scaleSqrt().domain([spendExtent[0] || 0, spendExtent[1] || 1]).range([0.35, 0.95]);
  const spendWidth = d3.scaleSqrt().domain([spendExtent[0] || 0, spendExtent[1] || 1]).range([1, 2.6]);

  const svg = d3
    .select(rootEl)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`);

  // Zoom/pan layer and base translation (centering)
  const zoomLayer = svg.append('g').attr('class', 'zoom-layer');
  const g = zoomLayer.append('g').attr('transform', `translate(${tx},${ty})`);

  // Zoom/pan behavior (defined early so it can be used by fitInitialView/toggles)
  const zoomBehavior = d3
    .zoom()
    .scaleExtent([0.5, 8])
    .on('zoom', (event) => {
      zoomLayer.attr('transform', event.transform);
    });
  svg.call(zoomBehavior);

  // Collapse/expand state per main category
  const mainState = new Map(); // name -> {expanded:boolean}

  // Draw visible main-category bubbles (background)
  const mainNodes = (root.children || []).map((n) => {
    const raw = n.r * k;
    const cap = Math.min(width, height) / 4; // keep within viewport
    const r0 = Math.max(60, Math.min(cap, raw * 0.75));
    return {
      name: n.data.name,
      cx: n.x * k,
      cy: n.y * k,
      baseR: r0, // stable radius for label sizing/wrapping
      // current radius (can animate slightly when expanded)
      r: r0,
    };
  });

  // (snapshot moved below after layout ordering to preserve the "first scene" positions)

  // Pull main nodes closer to their centroid for stronger "gravity"
  (function tightenMainCluster() {
    if (mainNodes.length === 0) return;
    const cxMean = d3.mean(mainNodes, (d) => d.cx);
    const cyMean = d3.mean(mainNodes, (d) => d.cy);
    const factor = 0.82; // stronger cluster
    mainNodes.forEach((d) => {
      d.cx = cxMean + (d.cx - cxMean) * factor;
      d.cy = cyMean + (d.cy - cyMean) * factor;
    });
  })();

  // Additional gravity toward largest main category (acts as center of gravity)
  (function pullTowardLargest() {
    if (!root.children || root.children.length === 0) return;
    const largest = root.children.reduce((acc, n) => (!acc || n.r > acc.r ? n : acc), null);
    if (!largest) return;
    const cx = largest.x * k;
    const cy = largest.y * k;
    const maxR = d3.max(mainNodes, (d) => d.r) || 1;
    mainNodes.forEach((d) => {
      if (d.name === largest.data.name) return; // keep largest anchored
      const w = d.r / maxR; // 0..1
      const pull = 0.68 + 0.28 * w; // small nodes get stronger pull (~0.68), big nodes ~0.96
      d.cx = cx + (d.cx - cx) * pull;
      d.cy = cy + (d.cy - cy) * pull;
    });
  })();

  // Reorder: large bubbles to the left, small to the right, with controlled jitter
  (function leftToRightBySize() {
    function hash01(str) {
      let h = 2166136261 >>> 0; // FNV-like
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
      }
      return (h >>> 0) / 4294967295; // 0..1
    }
    const padX = Math.min(220, width * 0.16); // more lateral room
    const minX = padX;
    const maxX = width - padX;
    const span = Math.max(1, maxX - minX);
    const midY = height * 0.5;

  // Heuristic bias tuned to updated taxonomy labels
  const EMO = /(comfort|emotional|testimonial|bond|peace|mom|community|connection|wellness)/i;
  const RAT = /(efficien|convenien|clean|hospital|doctor|price|value|support|working|portabil|discreet|performance|medical|endorsement)/i;

    const sorted = [...mainNodes].sort((a, b) => b.r - a.r);
    sorted.forEach((node, i) => {
      const t = (sorted.length > 1) ? i / (sorted.length - 1) : 0.5;
      const jitterX = (hash01(node.name) - 0.5) * Math.min(24, width * 0.02); // cleaner
      const jitterY = (hash01(node.name + 'y') - 0.5) * Math.min(120, height * 0.16);
      const sep = (hash01(node.name + 'sep') - 0.5) * (node.r * 0.12);
      const bias = EMO.test(node.name) ? -height * 0.06 : RAT.test(node.name) ? height * 0.06 : 0;
      node.cx = minX + t * span + jitterX + sep;
      node.cy = midY + jitterY + bias;
    });
  })();

  // Simple relaxation to enforce a minimum gap between bubbles
  (function separate() {
    const gap = 36; // more breathing space between circles
    for (let it = 0; it < 40; it++) {
      let moved = false;
      for (let i = 0; i < mainNodes.length; i++) {
        for (let j = i + 1; j < mainNodes.length; j++) {
          const a = mainNodes[i];
          const b = mainNodes[j];
          const dx = b.cx - a.cx;
          const dy = b.cy - a.cy;
          const dist = Math.hypot(dx, dy) || 1;
          const min = a.r + b.r + gap;
          if (dist < min) {
            const overlap = (min - dist) / 2;
            const ux = dx / dist;
            const uy = dy / dist;
            a.cx -= ux * overlap * 1.15;
            b.cx += ux * overlap * 1.15;
            // smaller vertical push to preserve rows
            a.cy -= uy * overlap * 0.18;
            b.cy += uy * overlap * 0.18;
            moved = true;
          }
        }
      }
      if (!moved) break;
    }
  })();

  // Snapshot initial positions AFTER all ordering/relaxation so we can restore them later
  const mainInit = new Map(mainNodes.map((m) => [m.name, { cx: m.cx, cy: m.cy, r: m.r }]));

  const mainCircles = g
    .selectAll('circle.main-cat')
    .data(mainNodes)
    .join('circle')
    .attr('class', 'main-cat')
    .attr('cx', (d) => d.cx)
    .attr('cy', (d) => d.cy)
    .attr('r', (d) => d.r)
    .attr('fill', (d) => {
      const c = d3.color(hueScale(d.name));
      return `rgba(${c.r},${c.g},${c.b},0.15)`;
    })
    .attr('stroke', (d) => {
      const c = d3.color(hueScale(d.name)).darker(0.4);
      return `rgba(${c.r},${c.g},${c.b},0.6)`;
    })
    .attr('stroke-width', 2)
    .style('cursor', 'pointer');

  // Draw circles for advertiser nodes only (depth 2)
  const SMALL_R = 16;
  const advNodes = root.descendants().filter((n) => n.depth === 2).map((n, i) => ({
    idx: i,
    main: n.parent.data.name,
    name: n.data.name,
    spend: n.data.spend,
    impressions: n.data.value,
    // store base offset relative to parent center from packed layout
    dx0: n.x * k - n.parent.x * k,
    dy0: n.y * k - n.parent.y * k,
    cx: n.x * k,
    cy: n.y * k,
    baseR: Math.max(2, n.r * k),
    dispR: Math.max(2, n.r * k),
  }));

  function repositionAds() {
    const m = new Map(mainNodes.map((d) => [d.name, d]));
    advNodes.forEach((a) => {
      const parent = m.get(a.main);
      if (parent) {
        // position relative to current main center
        let x = parent.cx + a.dx0;
        let y = parent.cy + a.dy0;
        let r = a.baseR;
        // For very small brand bubbles, improve legibility: enlarge & push outward
        if (r < 16) {
          const scaleUp = 1.6; // enlarge small brands
          a.dispR = r * scaleUp;
          const vx = x - parent.cx;
          const vy = y - parent.cy;
          const len = Math.hypot(vx, vy) || 1;
          const push = 1.18; // allow a bit outside the main circle
          x = parent.cx + (vx / len) * len * push;
          y = parent.cy + (vy / len) * len * push;
        } else {
          a.dispR = r;
        }
        a.cx = x;
        a.cy = y;
      }
    });
  }

  const nodes = g
    .selectAll('circle.adv')
    .data(advNodes)
    .join('circle')
    .attr('class', 'adv')
    .attr('cx', (d) => d.cx)
    .attr('cy', (d) => d.cy)
    .attr('r', (d) => 0) // start collapsed
    .attr('fill', (d) => {
      const base = d3.color(hueScale(d.main));
      return `rgba(${base.r},${base.g},${base.b},${spendOpacity(d.spend || 0)})`;
    })
    .attr('stroke', (d) => {
      const c = d3.color(hueScale(d.main)).darker(0.6);
      return `rgba(${c.r},${c.g},${c.b},${spendOpacity(d.spend || 0)})`;
    })
    .attr('stroke-width', (d) => spendWidth(d.spend || 0))
    .style('cursor', 'pointer')
    .on('click', (event, d) => {
      renderSelection({ type: 'advertiser', main: d.main, advertiser: d.name });
    });

  // Add advertiser labels above bubbles
  g
    .selectAll('text.adv')
    .data(advNodes)
    .join('text')
    .attr('class', 'bubble-adv-label')
    .attr('x', (d) => d.cx)
    .attr('y', (d) => (d.baseR < SMALL_R ? d.cy - (d.baseR + 6) : d.cy + Math.min(10, 0.22 * d.baseR)))
    .attr('text-anchor', 'middle')
    .style('font-size', '11px')
    .attr('dy', '0.35em')
    .text((d) => d.name)
    .each(function (d) {
      // Hide label if bubble is too small for text clutter
      const self = d3.select(this);
      self.style('display', 'none').style('opacity', 0);
    });

  // Avoid label overlaps: hide advertiser labels colliding with main labels or other advertisers
  function adjustLabelCollisions() {
    const pad = 4;
    const mainBoxes = g
      .selectAll('text.bubble-main-label')
      .nodes()
      .map((n) => {
        const b = n.getBBox();
        return { x: b.x - pad, y: b.y - pad, w: b.width + pad * 2, h: b.height + pad * 2 };
      });

    const advSel = g.selectAll('text.bubble-adv-label');
    // Sort advertiser labels by impressions desc (keep strongest)
    const advNodesSorted = advNodes
      .map((d, i) => ({ d, i }))
      .sort((a, b) => (b.d.impressions || 0) - (a.d.impressions || 0));

    const keptBoxes = [];
    advNodesSorted.forEach(({ d, i }) => {
      const node = advSel.nodes()[i];
      if (!node) return;
      const b = node.getBBox();
      const box = { x: b.x - pad, y: b.y - pad, w: b.width + pad * 2, h: b.height + pad * 2 };
      const intersects = (A, B) => !(A.x + A.w < B.x || B.x + B.w < A.x || A.y + A.h < B.y || B.y + B.h < A.y);
      if (d.baseR < SMALL_R) {
        // For tiny bubbles, prefer showing label outside even if overlaps slightly
        d3.select(node).style('display', null);
        keptBoxes.push(box);
        return;
      }
      const collideMain = mainBoxes.some((mb) => intersects(box, mb));
      const collideAdv = keptBoxes.some((kb) => intersects(box, kb));
      if (collideMain || collideAdv) d3.select(node).style('display', 'none');
      else { d3.select(node).style('display', null); keptBoxes.push(box); }
    });
  }

  adjustLabelCollisions();

  // Tooltips
  let tip = d3.select('.tooltip');
  if (tip.empty()) tip = d3.select('body').append('div').attr('class', 'tooltip');
  nodes
    .on('mousemove', (event, d) => {
      tip
        .style('opacity', 1)
        .style('left', `${event.pageX + 12}px`)
        .style('top', `${event.pageY - 12}px`)
        .html(
          `<div><strong>${d.name}</strong></div>` +
            `<div class=\"k\">Main:</div> ${d.main}` +
            `<div class=\"k\">Impressions:</div> ${d3.format(',')(Math.round(d.impressions || 0))}` +
            `<div class=\"k\">Spend:</div> $${d3.format(',')(Math.round(d.spend || 0))}`
        );
    })
    .on('mouseleave', () => tip.style('opacity', 0));

  // Main labels
  const mainMap = new Map(mainNodes.map((m) => [m.name, m]));

  // Scaled font size by main bubble radius
  const minR = d3.min(mainNodes, (d) => d.r) || 1;
  const maxR = d3.max(mainNodes, (d) => d.r) || 1;
  const fontScale = d3.scaleLinear().domain([minR, maxR]).range([16, 28]);

  g
    .selectAll('text.main')
    .data(root.descendants().filter((n) => n.depth === 1))
    .join('text')
    .attr('class', 'bubble-main-label')
    .attr('x', (d) => (mainMap.get(d.data.name)?.cx ?? d.x * k))
    .attr('y', (d) => (mainMap.get(d.data.name)?.cy ?? d.y * k))
    .style('font-size', (d) => `${fontScale(mainMap.get(d.data.name)?.baseR || minR)}px`)
    .attr('text-anchor', 'middle')
    .text((d) => d.data.name)
    .style('cursor', 'pointer')
    .on('click', (event, d) => toggleCategory(d.data.name));

  // Wrap long main-category labels to multiple lines within their bubble width
  wrapMainLabels();

  function wrapMainLabels() {
    const texts = g.selectAll('text.bubble-main-label');
    texts.each(function (d) {
      const node = d3.select(this);
      const full = node.text();
      node.text('');
      const circle = mainMap.get(d.data.name);
      const cx = circle ? circle.cx : d.x * k;
      const cy = circle ? circle.cy : d.y * k;
      const fz = fontScale(circle?.baseR || minR);
      const lineHeight = Math.round(fz * 0.9);
      const maxWidth = Math.max(100, (circle ? circle.baseR * 2.0 : 160));
      const words = full.split(/\s+/).filter(Boolean);
      let line = [];
      let lineNumber = 0;
      let tspan = node.append('tspan').attr('x', cx).attr('dy', '0');
      for (let i = 0; i < words.length; i++) {
        line.push(words[i]);
        tspan.text(line.join(' '));
        if (tspan.node().getComputedTextLength() > maxWidth && line.length > 1) {
          line.pop();
          tspan.text(line.join(' '));
          line = [words[i]];
          tspan = node
            .append('tspan')
            .attr('x', cx)
            .attr('dy', lineHeight)
            .text(words[i]);
          lineNumber++;
        }
      }
      // Re-center vertically on the circle center
      node.attr('y', cy - (lineNumber * lineHeight) / 2);
      node.attr('x', cx);
    });
  }

  // Clicking the main circle performs the same toggle
  mainCircles.on('click', (event, d) => toggleCategory(d.name));

  function toggleCategory(key) {
    const current = mainState.get(key) || { expanded: false };
    const willExpand = !current.expanded;
    mainState.set(key, { expanded: willExpand });

    const t = svg.transition().duration(650).ease(d3.easeCubicInOut);
    // Advertiser bubbles: animate radius and label opacity
    g.selectAll('circle.adv')
      .filter((n) => n.main === key)
      .transition(t)
      .attr('r', (n) => (willExpand ? n.dispR : 0));
    g.selectAll('text.bubble-adv-label')
      .filter((n) => n.main === key)
      .style('display', null)
      .transition(t)
      .attr('x', d=> d.cx)
      .attr('y', d=> (d.baseR < SMALL_R ? d.cy - (d.baseR + 6) : d.cy + Math.min(10, 0.22 * d.baseR)))
      .style('opacity', willExpand ? 1 : 0)
      .on('end', function() { if (!willExpand) d3.select(this).style('display','none'); });

    // Main bubble slight grow/shrink
    g.selectAll('circle.main-cat')
      .filter((n) => n.name === key)
      .transition(t)
      .attr('r', (n) => (willExpand ? n.r * 1.12 : n.r));

    // Short force simulation for natural flow
    const center = mainNodes.find((m) => m.name === key);
    if (!center) return;
    mainNodes.forEach((m) => { m.x = m.cx; m.y = m.cy; });
    center.fx = center.cx; center.fy = center.cy;
    const gap = 32;
    const targetR = center.r * (willExpand ? 1.12 : 1);
    const sim = d3.forceSimulation(mainNodes)
      .alpha(1)
      .alphaDecay(1 - Math.pow(0.001, 1 / 50))
      .force('collide', d3.forceCollide((d) => (d.name === key ? targetR : d.r) + gap).iterations(2))
      .force('restore', d3.forceManyBody().strength(0))
      .force('x', d3.forceX((d) => (mainInit.get(d.name)?.cx ?? d.cx)).strength(0.08))
      .force('y', d3.forceY((d) => (mainInit.get(d.name)?.cy ?? d.cy)).strength(0.08))
      .on('tick', () => {
        mainNodes.forEach((m) => { m.cx = m.x; m.cy = m.y; });
        g.selectAll('circle.main-cat')
          .data(mainNodes, (d) => d.name)
          .attr('cx', (d) => d.cx)
          .attr('cy', (d) => d.cy);
        repositionAds();
        g.selectAll('circle.adv')
          .data(advNodes, (d) => d.idx)
          .attr('cx', (d) => d.cx)
          .attr('cy', (d) => d.cy);
        g.selectAll('text.bubble-adv-label')
          .data(advNodes, (d) => d.idx)
          .attr('x', (d) => d.cx)
          .attr('y', (d) => (d.baseR < SMALL_R ? d.cy - (d.baseR + 6) : d.cy + Math.min(10, 0.22 * d.baseR)));
        const tempMap = new Map(mainNodes.map((m) => [m.name, m]));
        g.selectAll('text.bubble-main-label')
          .attr('x', (d) => (tempMap.get(d.data.name)?.cx || center.cx))
          .attr('y', (d) => (tempMap.get(d.data.name)?.cy || center.cy));
      })
      .on('end', () => {
        center.fx = null; center.fy = null;
        wrapMainLabels();
        renderSelection({ type: 'main', main: key });
      });
  }

  // Checkbox to hide/show Not Recognizable
  const hideNR = document.getElementById('hideNR');
  if (hideNR) {
    const applyNR = () => {
      const show = !hideNR.checked;
      g.selectAll('circle.main-cat')
        .style('display', (d) => (d.name.toLowerCase().includes('not recogniz') ? (show ? null : 'none') : null));
      g.selectAll('text.bubble-main-label')
        .style('display', (d) => (d.data.name.toLowerCase().includes('not recogniz') ? (show ? null : 'none') : null));
      g.selectAll('circle.adv')
        .style('display', (d) => (d.main.toLowerCase().includes('not recogniz') ? (show ? null : 'none') : null));
      g.selectAll('text.bubble-adv-label')
        .style('display', (d) => (d.main.toLowerCase().includes('not recogniz') ? (show ? null : 'none') : null));
    };
    hideNR.addEventListener('change', applyNR);
    applyNR();
  }

  function fitInitialView(factor = 1.4, biasX = 0, biasY = 0) {
    const box = g.node().getBBox();
    const padding = 80; // More padding around the bubbles
    const bx = box.x + tx - padding;
    const by = box.y + ty - padding;
    const bw = Math.max(1, box.width + padding * 2);
    const bh = Math.max(1, box.height + padding * 2);
    
    // Better centering and zoom level
    const scaleX = (width - padding * 2) / bw;
    const scaleY = (height - padding * 2) / bh;
    const baseScale = Math.min(scaleX, scaleY);
    const scale = Math.min(baseScale / factor, 8); // align with zoomBehavior.scaleExtent
    
    // Center the bubbles perfectly in the viewport
    const cx0 = bx + bw / 2;
    const cy0 = by + bh / 2;
    const targetCx = width / 2;
    const targetCy = height / 2;
    
    const transform = d3.zoomIdentity
      .scale(scale)
      .translate(-cx0, -cy0)
      .translate(targetCx / scale, targetCy / scale);
      
    svg.transition().duration(800).ease(d3.easeCubicOut).call(zoomBehavior.transform, transform);
  }

  // Start with all collapsed; expand Wearable using the snapshot as gravity targets (preserve first-scene order)
  (function expandWearablesOnLoad(){
    const target = (mainNodes.find(m=> /wearable.*discreet/i.test(m.name)) || null);
    if (target) {
      // Temporarily swap centers to the snapshot target to avoid re-ordering
      mainNodes.forEach(m=>{ m.x = m.cx; m.y = m.cy; });
      const snap = mainInit.get(target.name);
      // Pin target at its initial snapshot center
      target.cx = snap.cx; target.cy = snap.cy;
      // Run a tiny sim that uses the snapshot as desired anchors
      const gap = 32;
      const sim = d3.forceSimulation(mainNodes)
        .alpha(1)
        .alphaDecay(1 - Math.pow(0.001, 1 / 30))
        .force('collide', d3.forceCollide(d=> d.r + gap).iterations(2))
        .force('x', d3.forceX(d=> (mainInit.get(d.name)?.cx || d.cx)).strength(0.12))
        .force('y', d3.forceY(d=> (mainInit.get(d.name)?.cy || d.cy)).strength(0.12))
        .on('tick', ()=>{
          mainNodes.forEach(m=>{ m.cx = m.x; m.cy = m.y; });
          g.selectAll('circle.main-cat').data(mainNodes, d=>d.name)
            .attr('cx', d=>d.cx).attr('cy', d=>d.cy);
        })
        .on('end', ()=>{
          // Now toggle only the target category; others remain exactly where the snapshot defined
          toggleCategory(target.name);
          setTimeout(()=>fitInitialView(), 350);
        });
    } else {
      fitInitialView();
    }
  })();

  // (removed duplicate zoomBehavior definition below; using the one defined earlier)
  // Double-click to reset
  svg.on('dblclick.zoom', null);
  svg.on('dblclick', () => {
    const reset = d3.zoomIdentity;
    svg.transition().duration(500).call(zoomBehavior.transform, reset);
  });

  function buildCategoryInsightMD(main, catRows) {
    const impressions = d3.sum(catRows, (d) => Number(d['Impressions']) || 0);
    const spend = d3.sum(catRows, (d) => Number(d['Spend (USD)']) || 0);
    const channels = d3.rollup(catRows, (v) => d3.sum(v, (d) => Number(d['Impressions']) || 0), (d) => (d.Channel || 'Unspecified'));
    const formats = d3.rollup(catRows, (v) => d3.sum(v, (d) => Number(d['Impressions']) || 0), (d) => (d['Creative Type_y'] || d['Creative Type_x'] || 'Format'));
    const list = (map, n = 4, fmt = (x) => x.k) => Array.from(map, ([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v).slice(0, n).map(fmt).join(', ');
    const topChannels = list(channels, 4, (x) => `${x.k} ${d3.format('.0%')(x.v / (impressions || 1))}`);
    const topFormats = list(formats, 4, (x) => `${x.k}`);

    // Cultural cues reused from selection logic
    function mergedText(r){
      return [r.Text_y, r.Text_x, r.value_proposition, r.focus_tag_reason, r.overall_description, r.Sub_Category, r.Main_Category]
        .filter(Boolean).join(' ').toLowerCase();
    }
    const cueDefs = [
      { key: 'promotion', re: /(\b\d{1,2}%\b|limited time|deal|save|offer|discount|sale)/ },
      { key: 'expertise', re: /(doctor|hospital[- ]?grade|recommended|lactation|insurance)/ },
      { key: 'empowerment', re: /(working mom|return[- ]?to[- ]?work|confidence|independent|professional)/ },
      { key: 'bonding', re: /(bond|night feed|skin[- ]?to[- ]?skin|cuddle|close)/ },
      { key: 'convenience', re: /(hands[- ]?free|wearable|compact|on[- ]?the[- ]?go|quiet|discreet|easy|clean|app|connect)/ },
      { key: 'community', re: /(real mom|testimonial|review|community|recommend)/ },
      { key: 'performance', re: /(output|efficient|fast|milk|suction|strength)/ },
      { key: 'comfort', re: /(comfort|pain[- ]?free|soft|cushion|gentle)/ },
    ];
    function cueStats(rowsArr){ const total = rowsArr.length || 1; const m = new Map(cueDefs.map(d=>[d.key,0]));
      for(const r of rowsArr){ const t = mergedText(r); for(const d of cueDefs){ if(d.re.test(t)) m.set(d.key, m.get(d.key)+1); } }
      return Array.from(m, ([k,v])=>({key:k,pct:v/total})).sort((a,b)=>b.pct-a.pct);
    }
    const cues = cueStats(catRows).slice(0,3).map(d=>d.key).join(', ');
    const phrases = (()=>{
      const counts = new Map();
      for(const r of catRows){
        const w = (Number(r['Impressions'])||0)||1;
        const toks = mergedText(r).replace(/[^a-z\s]/g,' ').split(/\s+/).filter(wd=>wd.length>2);
        for(let i=0;i<toks.length-1;i++){ const bg=toks[i]+" "+toks[i+1]; counts.set(bg,(counts.get(bg)||0)+w); }
      }
      return Array.from(counts,([k,v])=>({k,v})).sort((a,b)=>b.v-a.v).slice(0,5).map(x=>x.k).join(', ');
    })();

    return [
      `## ${main}`,
      `- **Scale & flight**: ${d3.format(',')(impressions)} impressions, $${d3.format(',')(spend)} spend`,
      `- **Where it runs**: channels → ${topChannels || 'n/a'}; formats → ${topFormats || 'n/a'}`,
      `- **Cultural cues**: ${cues || 'n/a'}`,
      `- **Lexical motifs**: ${phrases || 'n/a'}`,
    ].join('\n');
  }

  // Build a static TXT file at load time (so user can download from repo without button)
  try {
    const mains = Array.from(new Set(rows.map((r) => r.Main_Category).filter(Boolean)));
    const lines = [];
    lines.push(`Breastfeeding Pumps — Key Takeaways by Main Category`);
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');
    for (const main of mains) {
      const rcat = rows.filter((r) => (r.Main_Category || '') === main);
      const md = buildCategoryInsightMD(main, rcat);
      lines.push(md);
      lines.push('');
    }
    // Expose text in a global so user can copy or save manually
    window.__KEY_TAKEAWAYS_TXT__ = lines.join('\n');
    const btn = document.getElementById('exportTxtBtn');
    if (btn) {
      btn.onclick = () => {
        const blob = new Blob([window.__KEY_TAKEAWAYS_TXT__], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'key_takeaways.txt';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      };
    }
  } catch(e) { /* no-op */ }
  // Render insight + gallery for current selection
  function renderSelection(sel) {
    const titleEl = document.getElementById('insight-title');
    const analysisEl = document.getElementById('selection-analysis');
    const takeawayEl = document.getElementById('selection-takeaway');
    const galleryEl = document.getElementById('selection-gallery');
    if (!titleEl || !analysisEl || !galleryEl || !takeawayEl) return;

    let filtered = rows;
    if (sel.type === 'advertiser') {
      titleEl.textContent = `${sel.advertiser} — ${sel.main}`;
      filtered = rows.filter((r) => (r.Main_Category || '') === sel.main && (r.Advertiser || '') === sel.advertiser);
    } else if (sel.type === 'main') {
      titleEl.textContent = `${sel.main} — Category Overview`;
      filtered = rows.filter((r) => (r.Main_Category || '') === sel.main);
    }

    // Build a richer, selection-specific analysis (for strategists)
    const impressions = d3.sum(filtered, (d) => Number(d['Impressions']) || 0);
    const spend = d3.sum(filtered, (d) => Number(d['Spend (USD)']) || 0);
    const channels = d3.rollup(filtered, (v) => d3.sum(v, (d) => Number(d['Impressions']) || 0), (d) => d.Channel || 'Unspecified');
    const formats = d3.rollup(filtered, (v) => d3.sum(v, (d) => Number(d['Impressions']) || 0), (d) => (d['Creative Type_y'] || d['Creative Type_x'] || 'Format'));
    const subcats = d3.rollup(filtered, (v) => d3.sum(v, (d) => Number(d['Impressions']) || 0), (d) => d.Sub_Category || 'Unspecified');
    const ctAs = d3.rollup(filtered, (v) => v.length, (d) => (d.primary_cta || 'n/a').toLowerCase());
    const valueProps = d3.rollup(filtered, (v) => v.length, (d) => (d.value_proposition || 'n/a').toLowerCase());
    const audience = d3.rollup(filtered, (v) => v.length, (d) => (d.target_audience || 'n/a').toLowerCase());
    const visuals = d3.rollup(filtered, (v) => v.length, (d) => ((d.people_detected || '').toString().toLowerCase().includes('yes') ? 'people on‑screen' : 'no people'));
    function parseDateAny(s){
      if(!s) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) { return new Date(s); }
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) { const [dd,mm,yyyy] = s.split('/'); return new Date(`${yyyy}-${mm}-${dd}`); }
      const d = new Date(s); return isFinite(d) ? d : null;
    }
    const periodStart = d3.min(filtered.map((d)=> parseDateAny(d['First Seen']) || parseDateAny(d['Last Seen'])));
    const periodEnd = d3.max(filtered.map((d)=> parseDateAny(d['Last Seen']) || parseDateAny(d['First Seen'])));
    const activeDays = Math.max(1, Math.round((periodEnd - periodStart) / (1000 * 60 * 60 * 24)));

    const textBlob = (filtered
      .map((d) => [d.Text_y, d.Text_x, d.value_proposition, d.focus_tag_reason, d.overall_description].join(' '))
      .join(' ') || '')
      .toLowerCase();

    const discounting = /(\b\d{1,2}%\b|limited time|offer|deal|save|discount|sale)/.test(textBlob);
    const socialProof = /(testimonial|review|mom|moms|real|community|recommend)/.test(textBlob);
    const performance = /(efficien|output|fast|milk|suction|hospital|grade|doctor|insurance)/.test(textBlob);
    const convenience = /(app|connect|hands[- ]?free|wearable|quiet|discreet|easy|clean)/.test(textBlob);
    const comfort = /(comfort|pain[- ]?free|soft|cushion|gentle)/.test(textBlob);

    const tone = (() => {
      const rational = performance || convenience;
      const emotional = comfort || socialProof;
      if (rational && emotional) return 'Hybrid (performance + human reassurance)';
      if (rational) return 'Rational/performance-led';
      if (emotional) return 'Human/comfort-led';
      return 'Mixed/unspecified';
    })();

    const toPct = (v) => d3.format('.0%')(v / (impressions || 1));
    const list = (map, n = 3, fmt = (x) => x.k) => Array.from(map, ([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v).slice(0, n).map(fmt).join(', ');
    const topChannels = list(channels, 3, (x) => `${x.k} ${toPct(x.v)}`);
    const topFormats = list(formats, 3, (x) => `${x.k}`);
    const topSubcats = list(subcats, 3, (x) => `${x.k} ${toPct(x.v)}`);
    const topCtas = list(ctAs, 3, (x) => `${x.k}`);
    const topValues = list(valueProps, 3, (x) => `${x.k}`);
    const topAudience = list(audience, 2, (x) => `${x.k}`);
    const visualsMix = (() => {
      const arr = Array.from(visuals, ([k, v]) => ({ k, v }));
      const totalV = d3.sum(arr, (d) => d.v) || 1;
      return arr
        .sort((a, b) => b.v - a.v)
        .slice(0, 2)
        .map((x) => `${x.k} ${d3.format('.0%')(x.v / totalV)}`)
        .join(', ');
    })();

    const analysis = [
      `Scale & flight window: ${d3.format(',')(impressions)} impressions and $${d3.format(',')(spend)} invested over ~${activeDays} days.`,
      `Where it runs: top channels → ${topChannels || 'n/a'}; creative mix → ${topFormats || 'n/a'}.`,
    ].join('\n');
    analysisEl.textContent = analysis;

    const subject = sel.type === 'advertiser' ? sel.advertiser : sel.main;
    // Cultural lens: compare cue distribution against baseline to surface what defines the voice
    function mergedText(r){
      return [r.Text_y, r.Text_x, r.value_proposition, r.focus_tag_reason, r.overall_description, r.Sub_Category, r.Main_Category]
        .filter(Boolean).join(' ').toLowerCase();
    }
    const cueDefs = [
      { key: 'promotion', re: /(\b\d{1,2}%\b|limited time|deal|save|offer|discount|sale)/ },
      { key: 'expertise', re: /(doctor|hospital[- ]?grade|recommended|lactation|insurance)/ },
      { key: 'empowerment', re: /(working mom|return[- ]?to[- ]?work|confidence|independent|professional)/ },
      { key: 'bonding', re: /(bond|night feed|skin[- ]?to[- ]?skin|cuddle|close)/ },
      { key: 'convenience', re: /(hands[- ]?free|wearable|compact|on[- ]?the[- ]?go|quiet|discreet|easy|clean|app|connect)/ },
      { key: 'community', re: /(real mom|testimonial|review|community|recommend)/ },
      { key: 'performance', re: /(output|efficient|fast|milk|suction|strength)/ },
      { key: 'comfort', re: /(comfort|pain[- ]?free|soft|cushion|gentle)/ },
    ];
    function cueStats(rowsArr){
      const total = rowsArr.length || 1; const m = new Map(cueDefs.map(d=>[d.key,0]));
      for(const r of rowsArr){ const t = mergedText(r); for(const d of cueDefs){ if(d.re.test(t)) m.set(d.key, m.get(d.key)+1); } }
      return Array.from(m, ([k,v])=>({key:k,pct:v/total})).sort((a,b)=>b.pct-a.pct);
    }
    const selStats = cueStats(filtered);
    let baselineRows = rows;
    if (sel.type === 'advertiser') baselineRows = rows.filter((r)=> (r.Main_Category||'')===sel.main);
    else if (sel.type === 'main') baselineRows = rows.filter((r)=> (r.Main_Category||'')!==sel.main);
    const baseMap = new Map(cueStats(baselineRows).map(d=>[d.key,d.pct]));
    const deltas = selStats.map(d=>({key:d.key,pct:d.pct,delta:d.pct-(baseMap.get(d.key)||0)})).sort((a,b)=>b.delta-a.delta);
    const topCues = selStats.slice(0,3).map(d=>d.key);
    const overIndexed = deltas.filter(d=>d.delta>0.03).slice(0,3).map(d=>d.key);
    const underIndexed = deltas.filter(d=>d.delta<-0.03).slice(0,2).map(d=>d.key);

    const phrCounts = new Map();
    for(const r of filtered){
      const toks = mergedText(r).replace(/[^a-z\s]/g,' ').split(/\s+/).filter(w=>w.length>2);
      for(let i=0;i<toks.length-1;i++){ const bg=toks[i]+" "+toks[i+1]; phrCounts.set(bg,(phrCounts.get(bg)||0)+1); }
    }
    const phrases = Array.from(phrCounts,([k,v])=>({k,v})).sort((a,b)=>b.v-a.v).slice(0,5).map(x=>x.k);

    function describe(keys){
      const map={
        promotion:'transactional urgency & affordability',
        expertise:'medical/authority frame (doctor‑recommended, hospital‑grade, insurance)',
        empowerment:'working‑mom identity & return‑to‑work narrative',
        bonding:'intimacy & closeness (night feed, cuddle, skin‑to‑skin)',
        convenience:'hands‑free, wearable, discreet and app‑connected ease',
        community:'real‑mom voice and testimonial proof',
        performance:'output/efficiency proof cues',
        comfort:'softness and pain‑free comfort',
      }; return keys.map(k=>map[k]||k).join('; ');
    }
    // Narrative labelling
    const cuePct = Object.fromEntries(selStats.map(d=>[d.key,d.pct]));
    function labelNarrative(){
      if ((cuePct.expertise||0) > 0.25) return 'clinical trust';
      if ((cuePct.promotion||0) > 0.28 && ((cuePct.performance||0) > 0.18 || (cuePct.convenience||0) > 0.18)) return 'price‑led performance';
      if ((cuePct.empowerment||0) > 0.22 && (cuePct.convenience||0) > 0.18) return 'working‑mom pragmatism';
      if ((cuePct.bonding||0) > 0.22 && (cuePct.comfort||0) > 0.18) return 'reassuring comfort';
      if ((cuePct.performance||0) > 0.24 && (cuePct.convenience||0) > 0.2 && (cuePct.comfort||0) < 0.12) return 'efficiency & everyday speed';
      if ((cuePct.community||0) > 0.22) return 'peer validation';
      return 'mixed cues';
    }
    const narrative = labelNarrative();

    const peopleShare = (() => {
      const has = filtered.filter(r => ((r.people_detected||'').toString().toLowerCase().includes('yes')));
      const imp = d3.sum(has, d=> Number(d['Impressions'])||0);
      return imp/(impressions||1);
    })();
    const productText = (function(){
      const t = textBlob;
      if (/wearable|hands[- ]?free/.test(t)) return 'wearable, hands‑free devices';
      if (/app|connect|bluetooth/.test(t)) return 'app‑connected features';
      if (/bottle|storage|lanolin/.test(t)) return 'adjacent feeding accessories';
      return 'core pump performance';
    })();

    // Build a more narrative, less templated paragraph
    const leadCue = describe([topCues[0]]);
    const supportCue = topCues[1] ? describe([topCues[1]]) : '';
    const distinct = overIndexed.length ? describe(overIndexed) : '';
    const avoided = underIndexed.length ? describe(underIndexed) : '';
    const phraseBit = phrases.length ? ` Phrases recur like “${phrases.slice(0,2).join('” and “')}”.` : '';
    const peopleClause = peopleShare > 0.02
      ? `Visually around ${d3.format('.0%')(peopleShare)} of the work shows people (often caregivers/infants), while product portrayal centres on ${productText}.`
      : `Visuals lean toward ${productText}.`;

    const narrativeText = `${subject} in ${sel.type==='advertiser'? sel.main : 'this category'} speaks primarily in a ${narrative} register, leaning on ${leadCue}${supportCue?` and reinforcing with ${supportCue}`:''}. ${distinct?`Versus its baseline it over‑indexes on ${distinct}. `:''}${avoided?`Signals such as ${avoided} appear less often. `:''}${peopleClause}${phraseBit}`;

    takeawayEl.textContent = narrativeText;

    // Gallery with top creatives by impressions
    const images = filtered
      .map((r) => r['Link To Creative'] || r['URL_to_use'] || r['File Path'])
      .filter(Boolean);
    galleryEl.innerHTML = '';
    // Aggregate images by URL with summed impressions, sort desc
    const imgAgg = d3
      .rollups(
        filtered,
        (v) => d3.sum(v, (d) => Number(d['Impressions']) || 0),
        (d) => (d['Link To Creative'] || d['URL_to_use'] || d['File Path'] || '')
      )
      .filter(([u]) => !!u)
      .sort((a, b) => b[1] - a[1]);

    if (imgAgg.length === 0) {
      // No images; fallback: show a simple reference card with Text_x
      const sample = filtered.slice(0, 6);
      if (sample.length === 0) {
        const div = document.createElement('div');
        div.className = 'empty';
        div.textContent = 'No creatives available for this selection.';
        galleryEl.appendChild(div);
      } else {
        sample.forEach((row) => {
          const card = document.createElement('div');
          card.className = 'empty';
          card.style.padding = '10px 12px';
          card.style.border = '1px solid #e2e8f0';
          card.style.borderRadius = '8px';
          card.style.background = 'rgba(255,255,255,0.6)';
          card.style.margin = '6px';
          card.style.maxWidth = '260px';
          card.style.fontSize = '12px';
          card.innerHTML = `<div style="font-weight:600;margin-bottom:4px;">Reference copy</div><div>${(row.Text_x||'').toString().trim()||'—'}</div>`;
          galleryEl.appendChild(card);
        });
      }
    } else {
      imgAgg.slice(0, 24).forEach(([url, imp]) => {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.title = `${d3.format(',')(imp)} impressions`;
        const img = document.createElement('img');
        img.src = url;
        img.alt = 'creative';
        a.appendChild(img);
        galleryEl.appendChild(a);
      });
    }
  }
}


