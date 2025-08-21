// Deterministic circle packing for DME Brands tab
// Layout: root → Main Category → Advertiser
// Based on bubbles_pack.js but adapted for DME data source

export function buildBubblePackDME({ container, rows }) {
  // Apply main category allow-list from global state if present (DME specific)
  const allow = (window.__MAIN_ALLOW_DME__ instanceof Set) ? window.__MAIN_ALLOW_DME__ : null;
  if (allow) {
    rows = rows.filter(r => allow.has(r.Main_Category));
  }
  const rootEl = document.querySelector(container);
  if (!rootEl) {
    return;
  }
  rootEl.innerHTML = '';
  
  if (rows.length === 0) {
    rootEl.innerHTML = '<div style="padding: 40px; text-align: center; color: #64748b;">No data available for the selected filters</div>';
    return;
  }

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
    const mainName = main || 'Uncategorized';
    const advChildren = Array.from(agg.byAdvertiser, ([name, a]) => ({ 
      name: name || 'Unknown', 
      value: Math.max(a.impressions, 0), 
      spend: a.spend 
    }));
    children.push({ name: mainName, children: advChildren, spend: agg.spend, value: agg.impressions });
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

  // Scale factor to make bubbles bigger
  const k = 10;
  const nodes = root.descendants();
  nodes.forEach((d) => {
    d.x *= k;
    d.y *= k;
    d.r *= k;
  });

  const mainNodes = nodes.filter((d) => d.depth === 1);
  const advNodes = nodes.filter((d) => d.depth === 2);

  // Base radius for tracking consistent text size
  mainNodes.forEach((d) => { d.baseR = d.r; });

  // Color scheme (same as original)
  const color = d3.scaleOrdinal(d3.schemeSet3);

  // Spread out main bubbles more
  const padX = 120;
  const padY = 60;
  const centerX = width * 0.5;
  const centerY = height * 0.5;

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
      const nodeName = node.data?.name || 'unnamed';
      const jitterX = (hash01(nodeName) - 0.5) * Math.min(24, width * 0.02); // cleaner
      const jitterY = (hash01(nodeName + '_y') - 0.5) * Math.min(16, height * 0.015);

      let baseX = minX + t * span + jitterX;

      // Clamp to range
      const minRadius = Math.min(60, node.r);
      baseX = Math.max(minX + minRadius, Math.min(maxX - minRadius, baseX));

      let baseY = midY + jitterY;
      if (EMO.test(nodeName)) baseY -= 40;
      if (RAT.test(nodeName)) baseY += 40;

      baseY = Math.max(padY + minRadius, Math.min(height - padY - minRadius, baseY));

      node.x = baseX;
      node.y = baseY;
    });

  // Start with spacing relaxation
  for (let iter = 0; iter < 12; iter++) {
    mainNodes.forEach((a, i) => {
      mainNodes.forEach((b, j) => {
        if (i >= j) return;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const targetDist = a.r + b.r + 36;
        if (dist > 0 && dist < targetDist) {
          const pushStrength = (targetDist - dist) * 0.15;
          const pushX = (dx / dist) * pushStrength;
          const pushY = (dy / dist) * pushStrength;
          a.x -= pushX;
          a.y -= pushY;
          b.x += pushX;
          b.y += pushY;
        }
      });
    });
  }

  // Set up main category centers for their children
  mainNodes.forEach((main) => {
    main.cx = main.x;
    main.cy = main.y;
    // Position advertiser bubbles around center
    const children = main.children || [];
    children.forEach((child, i) => {
      const angle = (i / children.length) * 2 * Math.PI;
      const radius = Math.max(10, main.r * 0.3);
      child.x = main.x + radius * Math.cos(angle);
      child.y = main.y + radius * Math.sin(angle);
      child.main = main.data.name;
      child.baseR = child.r; // Store base radius for consistent sizing
    });
  });

  // SVG setup
  const svg = d3.select(rootEl).append('svg').attr('width', width).attr('height', height);
  const g = svg.append('g');

  // State management for expand/collapse (DME specific)
  const mainState = new Map();
  mainNodes.forEach((main) => {
    mainState.set(main.data.name, { expanded: false });
  });

  // Snapshot initial positions
  const mainInit = new Map();
  mainNodes.forEach((m) => {
    mainInit.set(m.data.name, { x: m.x, y: m.y });
  });

  // Render main category bubbles
  const mainGroup = g.append('g').attr('class', 'main-bubbles');
  const mainCircles = mainGroup.selectAll('circle.bubble-main')
    .data(mainNodes)
    .enter().append('circle')
    .attr('class', 'bubble-main')
    .attr('fill', (d) => color(d.data.name))
    .attr('fill-opacity', 0.15)
    .attr('stroke', (d) => color(d.data.name))
    .attr('stroke-width', 2)
    .attr('stroke-opacity', 0.4)
    .style('cursor', 'pointer')
    .on('click', function (event, d) {
      event.stopPropagation();
      toggleExpansion(d.data.name);
    });

  // Render advertiser bubbles
  const advGroup = g.append('g').attr('class', 'adv-bubbles');
  const advCircles = advGroup.selectAll('circle.bubble-adv')
    .data(advNodes)
    .enter().append('circle')
    .attr('class', 'bubble-adv')
    .attr('fill', (d) => color(d.parent.data.name))
    .attr('fill-opacity', 0.6)
    .attr('stroke', (d) => color(d.parent.data.name))
    .attr('stroke-width', 1.5)
    .attr('stroke-opacity', 0.8)
    .style('cursor', 'pointer')
    .on('click', function (event, d) {
      event.stopPropagation();
      renderSelectionDME(d.data.name, d.parent.data.name, rows);
    });

  // Main category labels
  const mainLabelGroup = g.append('g').attr('class', 'main-labels');
  const mainLabels = mainLabelGroup.selectAll('text.bubble-main-label')
    .data(mainNodes)
    .enter().append('text')
    .attr('class', 'bubble-main-label')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .style('pointer-events', 'auto')
    .style('cursor', 'pointer')
    .style('fill', '#334155')
    .style('font-weight', '600')
    .style('opacity', 0.9)
    .on('click', function (event, d) {
      event.stopPropagation();
      toggleExpansion(d.data.name);
    });

  // Advertiser labels (Brand Root)
  const advLabelGroup = g.append('g').attr('class', 'adv-labels');
  const advLabels = advLabelGroup.selectAll('text.bubble-adv-label')
    .data(advNodes)
    .enter().append('text')
    .attr('class', 'bubble-adv-label')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .style('pointer-events', 'auto')
    .style('cursor', 'pointer')
    .style('fill', '#1e293b')
    .style('font-weight', '500')
    .style('font-size', '11px')
    .style('opacity', 0.85)
    .on('click', function (event, d) {
      event.stopPropagation();
      renderSelectionDME(d.data.name, d.parent.data.name, rows);
    });

  // Tooltip setup
  let tooltip = d3.select('body').select('.tooltip-pack');
  if (tooltip.empty()) {
    tooltip = d3.select('body').append('div').attr('class', 'tooltip-pack')
      .style('position', 'absolute').style('visibility', 'hidden')
      .style('background', 'rgba(255,255,255,0.95)').style('backdrop-filter', 'blur(8px)')
      .style('padding', '8px 12px').style('border-radius', '6px')
      .style('box-shadow', '0 4px 12px rgba(0,0,0,0.15)')
      .style('font-size', '12px').style('line-height', '1.4')
      .style('max-width', '280px').style('z-index', '1000');
  }

  // Add tooltip interactions
  [mainCircles, advCircles, mainLabels, advLabels].forEach((selection) => {
    selection
      .on('mouseover', function (event, d) {
        const isMain = d.depth === 1;
        const content = isMain 
          ? `<strong>${d.data.name}</strong><br/>Impressions: ${(d.value || 0).toLocaleString()}<br/>Spend: $${(d.data.spend || 0).toLocaleString()}`
          : `<strong>${d.data.name}</strong><br/>Main: ${d.parent.data.name}<br/>Impressions: ${(d.value || 0).toLocaleString()}<br/>Spend: $${(d.data.spend || 0).toLocaleString()}`;
        tooltip.html(content).style('visibility', 'visible');
      })
      .on('mousemove', function (event) {
        tooltip.style('top', (event.pageY + 10) + 'px').style('left', (event.pageX + 10) + 'px');
      })
      .on('mouseout', function () {
        tooltip.style('visibility', 'hidden');
      });
  });

  // Zoom behavior
  const zoomBehavior = d3.zoom()
    .scaleExtent([0.5, 4])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });
  svg.call(zoomBehavior);

  function updatePositions() {
    mainCircles
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('r', (d) => Math.max(60, d.r));

    advCircles
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('r', (d) => {
        const state = mainState.get(d.main);
        return state?.expanded ? Math.max(8, d.r) : 0;
      })
      .style('opacity', (d) => {
        const state = mainState.get(d.main);
        return state?.expanded ? 1 : 0;
      });

    // Update main labels
    updateMainLabels();

    // Update advertiser labels
    advLabels
      .attr('x', (d) => d.x)
      .attr('y', (d) => {
        const SMALL_R = 12;
        return d.r < SMALL_R ? d.y - (d.r + 6) : d.y;
      })
      .style('opacity', (d) => {
        const state = mainState.get(d.main);
        return state?.expanded ? 0.85 : 0;
      })
      .text((d) => {
        const maxW = Math.max(60, d.r * 1.6);
        return truncateText(d.data.name, maxW, '11px');
      });
  }

  function updateMainLabels() {
    mainLabels
      .attr('x', (d) => d.x)
      .attr('y', (d) => d.y)
      .each(function (d) {
        const el = d3.select(this);
        el.selectAll('tspan').remove();
        
        const maxW = Math.max(80, d.baseR * 1.4);
        const fontSize = Math.max(10, Math.min(16, d.baseR / 6));
        el.style('font-size', fontSize + 'px');
        
        const words = d.data.name.split(/\s+/);
        const lineHeight = fontSize * 1.2;
        let line = [];
        let lineNumber = 0;
        
        words.forEach((word) => {
          const testLine = [...line, word].join(' ');
          const testWidth = getTextWidth(testLine, fontSize + 'px', '600');
          if (testWidth > maxW && line.length > 0) {
            const tspan = el.append('tspan')
              .attr('x', d.x)
              .attr('dy', lineNumber === 0 ? `-${lineHeight * 0.5}px` : `${lineHeight}px`)
              .text(line.join(' '));
            line = [word];
            lineNumber++;
          } else {
            line.push(word);
          }
        });
        
        if (line.length > 0) {
          el.append('tspan')
            .attr('x', d.x)
            .attr('dy', lineNumber === 0 ? '0' : `${lineHeight}px`)
            .text(line.join(' '));
        }
      });
  }

  function toggleExpansion(mainName) {
    const state = mainState.get(mainName);
    if (!state) return;
    
    state.expanded = !state.expanded;
    
    // Restore initial positions for stability
    mainNodes.forEach((m) => {
      const init = mainInit.get(m.data.name);
      if (init) {
        m.x = init.x;
        m.y = init.y;
      }
    });
    
    // Apply relaxation but keep clicked category fixed
    const clickedMain = mainNodes.find(m => m.data.name === mainName);
    if (clickedMain) {
      const fixedX = clickedMain.x;
      const fixedY = clickedMain.y;
      
      for (let iter = 0; iter < 8; iter++) {
        mainNodes.forEach((a, i) => {
          if (a.data.name === mainName) return; // Keep clicked fixed
          
          mainNodes.forEach((b, j) => {
            if (i >= j || b.data.name === mainName) return;
            
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const targetDist = a.r + b.r + 36;
            
            if (dist > 0 && dist < targetDist) {
              const pushStrength = (targetDist - dist) * 0.12;
              const pushX = (dx / dist) * pushStrength;
              const pushY = (dy / dist) * pushStrength;
              a.x -= pushX;
              a.y -= pushY;
              b.x += pushX;
              b.y += pushY;
            }
          });
        });
        
        // Restore clicked position
        clickedMain.x = fixedX;
        clickedMain.y = fixedY;
      }
    }
    
    updatePositions();
    
    if (state.expanded) {
      renderSelectionDME(null, mainName, rows);
    }
  }

  // Initial state: all collapsed
  updatePositions();

  // Initial view adjustment - center and zoom appropriately
  setTimeout(() => {
    if (mainNodes.length === 0) return;
    
    const bbox = {
      x: d3.min(mainNodes, d => d.x - d.r),
      y: d3.min(mainNodes, d => d.y - d.r),
      width: d3.max(mainNodes, d => d.x + d.r) - d3.min(mainNodes, d => d.x - d.r),
      height: d3.max(mainNodes, d => d.y + d.r) - d3.min(mainNodes, d => d.y - d.r)
    };
    
    // Better centering and zoom level
    const padding = 80; // More padding around the bubbles
    const factor = 1.4; // Less aggressive zoom for better fit
    const scaleX = (width - padding * 2) / bbox.width;
    const scaleY = (height - padding * 2) / bbox.height;
    const scale = Math.min(scaleX, scaleY) / factor;
    
    // Center the bubbles perfectly in the viewport
    const cx0 = bbox.x + bbox.width / 2;
    const cy0 = bbox.y + bbox.height / 2;
    const targetCx = width / 2;
    const targetCy = height / 2;
    
    const transform = d3.zoomIdentity
      .scale(scale)
      .translate(-cx0, -cy0)
      .translate(targetCx / scale, targetCy / scale);
      
    svg.transition().duration(800).ease(d3.easeCubicOut).call(zoomBehavior.transform, transform);
  }, 150);

  // Start with all collapsed; expand Wearable using the snapshot as gravity targets (preserve first-scene order)
  (function expandWearablesOnLoad(){
    const target = (mainNodes.find(m=> /wearable.*discreet/i.test(m.data?.name || '')) || null);
    if (target) {
      // Temporarily swap centers to the snapshot target to avoid re-ordering
      mainNodes.forEach(m=>{ m.x = m.cx; m.y = m.cy; });
      const snap = mainInit.get(target.data.name);
      // Pin target at its initial snapshot center
      if (snap) { target.x = snap.x; target.y = snap.y; }
      setTimeout(() => { toggleExpansion(target.data.name); }, 750);
    }
  })();
}

// Helper functions (same as original)
function hash01(str) {
  if (!str || typeof str !== 'string') {
    console.warn('hash01 received invalid input:', str);
    return 0.5; // Default fallback
  }
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) / 2147483647;
}

function getTextWidth(text, font, weight = 'normal') {
  const canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement('canvas'));
  const context = canvas.getContext('2d');
  context.font = `${weight} ${font} Inter, sans-serif`;
  return context.measureText(text).width;
}

function truncateText(text, maxWidth, fontSize) {
  let truncated = text;
  while (getTextWidth(truncated + '...', fontSize) > maxWidth && truncated.length > 0) {
    truncated = truncated.slice(0, -1);
  }
  return truncated.length < text.length ? truncated + '...' : text;
}

// DME-specific analysis function
function renderSelectionDME(brandName, mainCategory, rows) {
  // Filter data for DME analysis
  let filtered = rows;
  if (brandName && mainCategory) {
    filtered = rows.filter(r => 
      (r['Brand Root'] === brandName || r.Advertiser === brandName) && 
      r.Main_Category === mainCategory
    );
  } else if (mainCategory) {
    filtered = rows.filter(r => r.Main_Category === mainCategory);
  }

  // Update UI elements for DME
  const titleEl = document.getElementById('takeaway-title-dme');
  const takeawayEl = document.getElementById('selection-takeaway-dme');
  const insightTitleEl = document.getElementById('insight-title-dme');
  const analysisEl = document.getElementById('selection-analysis-dme');
  const galleryEl = document.getElementById('selection-gallery-dme');

  if (!titleEl || !takeawayEl || !analysisEl || !galleryEl) return;

  if (brandName && mainCategory) {
    titleEl.textContent = `Key takeaways: ${brandName} in ${mainCategory}`;
    insightTitleEl.textContent = `Analysis: ${brandName} in ${mainCategory}`;
  } else if (mainCategory) {
    titleEl.textContent = `Key takeaways: ${mainCategory}`;
    insightTitleEl.textContent = `Analysis: ${mainCategory}`;
  } else {
    titleEl.textContent = 'Key takeaways';
    insightTitleEl.textContent = 'Click a bubble or a main label above to generate a brief creative analysis';
    takeawayEl.innerHTML = '';
    analysisEl.innerHTML = '';
    galleryEl.innerHTML = '';
    return;
  }

  // Generate analysis (simplified version for DME)
  const analysis = generateDMEAnalysis(filtered, brandName, mainCategory);
  takeawayEl.innerHTML = analysis.takeaway;
  
  // Generate metrics
  const metrics = generateMetrics(filtered);
  analysisEl.innerHTML = metrics;
  
  // Generate gallery
  const gallery = generateGallery(filtered);
  galleryEl.innerHTML = gallery;
}

function generateDMEAnalysis(data, brandName, mainCategory) {
  if (data.length === 0) {
    return { takeaway: 'No data available for this selection.' };
  }

  const totalImpressions = d3.sum(data, d => d.Impressions || 0);
  const totalSpend = d3.sum(data, d => d['Spend (USD)'] || 0);
  
  // Cultural cue analysis
  const cueDefs = {
    'promotion': /promoci[oó]n|discount|oferta|sale|free|gratis|offer|deal/gi,
    'expertise': /doctor|medical|expert|professional|hospital|clinic|physician|nurse/gi,
    'empowerment': /empower|confidence|control|choice|independence|freedom|strength/gi,
    'bonding': /bond|connection|love|together|family|baby|mom|mother|maternal/gi,
    'convenience': /easy|convenient|simple|quick|fast|effortless|portable|hands.?free/gi,
    'community': /community|support|group|together|share|connect|network|peer/gi,
    'performance': /performance|efficiency|effective|optimal|better|improved|superior/gi,
    'comfort': /comfort|gentle|soft|pain.?free|soothing|relaxing|peaceful/gi
  };

  const baseline = { promotion: 0.12, expertise: 0.18, empowerment: 0.08, bonding: 0.25, convenience: 0.22, community: 0.15, performance: 0.20, comfort: 0.18 };
  
  let narrative = '';
  if (brandName && mainCategory) {
    narrative = `${brandName} in the ${mainCategory} category demonstrates `;
  } else {
    narrative = `The ${mainCategory} category in DME brands demonstrates `;
  }

  // Analyze cultural cues
  const allText = data.map(d => [d.Text_x, d.Text_y, d.value_proposition, d.overall_description, d.focus_tag_reason].filter(Boolean).join(' ')).join(' ');
  const cueScores = {};
  
  Object.entries(cueDefs).forEach(([cue, regex]) => {
    const matches = (allText.match(regex) || []).length;
    const total = allText.split(/\s+/).length;
    cueScores[cue] = total > 0 ? matches / total : 0;
  });

  // Find over/under-indexed cues
  const overIndexed = Object.entries(cueScores)
    .filter(([cue, score]) => score > baseline[cue] * 1.3)
    .sort((a, b) => (b[1] / baseline[b[0]]) - (a[1] / baseline[a[0]]))
    .slice(0, 2);

  const underIndexed = Object.entries(cueScores)
    .filter(([cue, score]) => score < baseline[cue] * 0.7)
    .sort((a, b) => (a[1] / baseline[a[0]]) - (b[1] / baseline[b[0]]))
    .slice(0, 2);

  // Cultural insights
  if (overIndexed.length > 0) {
    const cues = overIndexed.map(([cue]) => cue).join(' and ');
    narrative += `strong emphasis on ${cues}, `;
  } else {
    narrative += `balanced messaging approach, `;
  }

  // Channel and spend insights
  const channels = d3.rollup(data, v => d3.sum(v, d => d.Impressions || 0), d => d.Channel);
  const topChannel = Array.from(channels.entries()).sort((a, b) => b[1] - a[1])[0];
  if (topChannel) {
    const channelShare = (topChannel[1] / totalImpressions * 100).toFixed(0);
    narrative += `with ${channelShare}% of impressions via ${topChannel[0]}. `;
  }

  // Temporal analysis
  const dates = data.map(d => {
    const firstSeen = d['First Seen'];
    if (!firstSeen) return null;
    if (firstSeen.includes('/')) {
      const [day, month, year] = firstSeen.split('/');
      return new Date(year, month - 1, day);
    } else if (firstSeen.includes('-')) {
      return new Date(firstSeen);
    }
    return null;
  }).filter(Boolean);

  if (dates.length > 0) {
    const span = Math.max(...dates) - Math.min(...dates);
    const days = Math.floor(span / (1000 * 60 * 60 * 24));
    if (days > 30) {
      narrative += `Campaign spans ${Math.round(days / 30)} months, suggesting sustained investment. `;
    }
  }

  // Visual content analysis
  const peopleCount = data.filter(d => d.people_detected && d.people_detected.toLowerCase().includes('person')).length;
  const peopleShare = data.length > 0 ? (peopleCount / data.length * 100).toFixed(0) : 0;
  
  if (peopleShare > 30) {
    narrative += `Visual strategy heavily features people (${peopleShare}% of work), emphasizing human connection and relatability.`;
  } else if (peopleShare > 10) {
    narrative += `Moderate use of people in visuals (${peopleShare}% of work), balancing product focus with human elements.`;
  } else {
    narrative += `Product-focused visual approach with minimal people representation, emphasizing features over emotional appeal.`;
  }

  // Add strategic context for DME specifically
  if (underIndexed.length > 0) {
    const missedCues = underIndexed.map(([cue]) => cue).join(' and ');
    narrative += ` Notable opportunity in ${missedCues} messaging compared to category norms.`;
  }

  return { takeaway: narrative };
}

function generateMetrics(data) {
  const channels = d3.rollup(data, v => v.length, d => d.Channel);
  const channelList = Array.from(channels, ([k, v]) => `${k}: ${v}`).slice(0, 5);
  
  const dateRange = getDateRange(data);
  
  return `
    <div style="display: flex; gap: 24px; margin-bottom: 16px;">
      <div><strong>Scale & flight window</strong><br/>${data.length} creatives${dateRange}</div>
      <div><strong>Where it runs</strong><br/>${channelList.join(', ')}</div>
    </div>
  `;
}

function generateGallery(data) {
  const creatives = data
    .filter(d => d['Link To Creative'] && d['Link To Creative'].trim())
    .sort((a, b) => (b.Impressions || 0) - (a.Impressions || 0))
    .slice(0, 12);

  if (creatives.length === 0) {
    // Fallback to text cards
    const textCards = data
      .filter(d => d.Text_x && d.Text_x.trim())
      .slice(0, 6)
      .map(d => `
        <div class="creative-card" style="padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
          <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">${d.Channel || 'Unknown'} • ${(d.Impressions || 0).toLocaleString()} impressions</div>
          <div style="font-size: 12px; line-height: 1.4;">${(d.Text_x || '').substring(0, 150)}${d.Text_x && d.Text_x.length > 150 ? '...' : ''}</div>
        </div>
      `).join('');
    
    return textCards || '<div style="color: #64748b; font-style: italic;">No creatives or text content available for this selection.</div>';
  }

  return creatives.map(d => `
    <img src="${d['Link To Creative']}" 
         alt="Creative" 
         class="creative-thumb" 
         style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px; cursor: pointer; border: 1px solid #e2e8f0;"
         onclick="window.open('${d['Link To Creative']}', '_blank')"
         title="${(d.Impressions || 0).toLocaleString()} impressions • $${(d['Spend (USD)'] || 0).toLocaleString()} spend" />
  `).join('');
}

function getDateRange(data) {
  const dates = data.map(d => {
    const firstSeen = d['First Seen'];
    if (!firstSeen) return null;
    if (firstSeen.includes('/')) {
      const [day, month, year] = firstSeen.split('/');
      return new Date(year, month - 1, day);
    } else if (firstSeen.includes('-')) {
      return new Date(firstSeen);
    }
    return null;
  }).filter(Boolean);

  if (dates.length === 0) return '';
  
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));
  
  const formatDate = (date) => {
    const month = date.toLocaleString('en', { month: 'short' });
    const year = date.getFullYear();
    return `${month} ${year}`;
  };
  
  return ` • ${formatDate(minDate)} - ${formatDate(maxDate)}`;
}
