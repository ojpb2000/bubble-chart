// Deterministic circle packing for TikTok SM tab
// Layout: root → Main Category → Company
// Based on bubbles_pack.js but adapted for TikTok data source

export function buildBubblePackTikTok({ container, rows }) {
  // Apply main category allow-list from global state if present (TikTok specific)
  const allow = (window.__MAIN_ALLOW_TIKTOK__ instanceof Set) ? window.__MAIN_ALLOW_TIKTOK__ : null;
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

  // Build hierarchy using engagement_total as metric
  const rollup = d3.rollup(
    rows,
    (items) => ({
      engagement: d3.sum(items, (d) => d['engagement_total'] || 0),
      likes: d3.sum(items, (d) => d['likes'] || 0),
      views: d3.sum(items, (d) => d['views'] || 0),
      byCompany: d3.rollup(
        items,
        (it) => ({
          engagement: d3.sum(it, (d) => d['engagement_total'] || 0),
          likes: d3.sum(it, (d) => d['likes'] || 0),
          views: d3.sum(it, (d) => d['views'] || 0),
        }),
        (d) => d['company'] || 'Unknown'
      ),
    }),
    (d) => d.Main_Category || 'Uncategorized'
  );

  const children = [];
  for (const [main, agg] of rollup) {
    const mainName = main || 'Uncategorized';
    const companyChildren = Array.from(agg.byCompany, ([name, a]) => ({ 
      name: name || 'Unknown', 
      value: Math.max(a.engagement, 0), 
      likes: a.likes,
      views: a.views
    }));
    children.push({ name: mainName, children: companyChildren, likes: agg.likes, views: agg.views, value: agg.engagement });
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
  const companyNodes = nodes.filter((d) => d.depth === 2);

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
    // Position company bubbles around center
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

  // State management for expand/collapse (TikTok specific)
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

  // Render company bubbles
  const companyGroup = g.append('g').attr('class', 'company-bubbles');
  const companyCircles = companyGroup.selectAll('circle.bubble-company')
    .data(companyNodes)
    .enter().append('circle')
    .attr('class', 'bubble-company')
    .attr('fill', (d) => color(d.parent.data.name))
    .attr('fill-opacity', 0.6)
    .attr('stroke', (d) => color(d.parent.data.name))
    .attr('stroke-width', 1.5)
    .attr('stroke-opacity', 0.8)
    .style('cursor', 'pointer')
    .on('click', function (event, d) {
      event.stopPropagation();
      renderSelectionTikTok(d.data.name, d.parent.data.name, rows);
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

  // Company labels
  const companyLabelGroup = g.append('g').attr('class', 'company-labels');
  const companyLabels = companyLabelGroup.selectAll('text.bubble-company-label')
    .data(companyNodes)
    .enter().append('text')
    .attr('class', 'bubble-company-label')
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
      renderSelectionTikTok(d.data.name, d.parent.data.name, rows);
    });

  // Tooltip setup
  let tooltip = d3.select('body').select('.tooltip-pack-tiktok');
  if (tooltip.empty()) {
    tooltip = d3.select('body').append('div').attr('class', 'tooltip-pack-tiktok')
      .style('position', 'absolute').style('visibility', 'hidden')
      .style('background', 'rgba(255,255,255,0.95)').style('backdrop-filter', 'blur(8px)')
      .style('padding', '8px 12px').style('border-radius', '6px')
      .style('box-shadow', '0 4px 12px rgba(0,0,0,0.15)')
      .style('font-size', '12px').style('line-height', '1.4')
      .style('max-width', '280px').style('z-index', '1000');
  }

  // Add tooltip interactions
  [mainCircles, companyCircles, mainLabels, companyLabels].forEach((selection) => {
    selection
      .on('mouseover', function (event, d) {
        const isMain = d.depth === 1;
        const content = isMain 
          ? `<strong>${d.data.name}</strong><br/>Engagement: ${(d.value || 0).toLocaleString()}<br/>Views: ${(d.data.views || 0).toLocaleString()}<br/>Likes: ${(d.data.likes || 0).toLocaleString()}`
          : `<strong>${d.data.name}</strong><br/>Main: ${d.parent.data.name}<br/>Engagement: ${(d.value || 0).toLocaleString()}<br/>Views: ${(d.data.views || 0).toLocaleString()}<br/>Likes: ${(d.data.likes || 0).toLocaleString()}`;
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

    companyCircles
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

    // Update company labels
    companyLabels
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
      renderSelectionTikTok(null, mainName, rows);
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

  // Start with all collapsed; expand Performance if available
  (function expandPerformanceOnLoad(){
    const target = (mainNodes.find(m=> /performance.*convenience/i.test(m.data?.name || '')) || null);
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

// TikTok-specific analysis function
function renderSelectionTikTok(companyName, mainCategory, rows) {
  // Filter data for TikTok analysis
  let filtered = rows;
  if (companyName && mainCategory) {
    filtered = rows.filter(r => 
      r.company === companyName && 
      r.Main_Category === mainCategory
    );
  } else if (mainCategory) {
    filtered = rows.filter(r => r.Main_Category === mainCategory);
  }

  // Update UI elements for TikTok
  const titleEl = document.getElementById('takeaway-title-tiktok');
  const takeawayEl = document.getElementById('selection-takeaway-tiktok');
  const insightTitleEl = document.getElementById('insight-title-tiktok');
  const analysisEl = document.getElementById('selection-analysis-tiktok');
  const galleryEl = document.getElementById('selection-gallery-tiktok');

  if (!titleEl || !takeawayEl || !analysisEl || !galleryEl) return;

  if (companyName && mainCategory) {
    titleEl.textContent = `Key takeaways: ${companyName} in ${mainCategory}`;
    insightTitleEl.textContent = `Analysis: ${companyName} in ${mainCategory}`;
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

  // Generate analysis
  const analysis = generateTikTokAnalysis(filtered, companyName, mainCategory);
  takeawayEl.innerHTML = analysis.takeaway;
  
  // Generate metrics
  const metrics = generateTikTokMetrics(filtered);
  analysisEl.innerHTML = metrics;
  
  // Generate gallery
  const gallery = generateTikTokGallery(filtered);
  galleryEl.innerHTML = gallery;
}

function generateTikTokAnalysis(data, companyName, mainCategory) {
  if (data.length === 0) {
    return { takeaway: 'No data available for this selection.' };
  }

  const totalEngagement = d3.sum(data, d => d.engagement_total || 0);
  const totalViews = d3.sum(data, d => d.views || 0);
  const totalLikes = d3.sum(data, d => d.likes || 0);
  const totalComments = d3.sum(data, d => d.comments || 0);
  const totalShares = d3.sum(data, d => d.shares || 0);
  const avgEngagementRate = d3.mean(data, d => d.engagement_rate_by_view || 0) * 100;
  
  // Enhanced cultural cue analysis specific to TikTok and breastfeeding content
  const cueDefs = {
    'authenticity': /real|authentic|honest|genuine|unfiltered|raw|truth|behind.?scenes|no.?filter|real.?talk/gi,
    'trending': /trend|viral|challenge|duet|stitch|fyp|foryou|trending|popular|viral.?moment/gi,
    'community': /community|together|support|share|connect|sisterhood|moms|mama|mothers|tribe|squad/gi,
    'education': /tip|hack|learn|how.?to|tutorial|advice|guide|facts|did.?you.?know|educational|inform/gi,
    'humor': /funny|lol|laugh|joke|hilarious|comedy|fun|humor|silly|giggle|haha/gi,
    'empowerment': /strong|power|confidence|boss|queen|fierce|independent|capable|strength|warrior/gi,
    'lifestyle': /life|daily|routine|vibe|aesthetic|mood|style|day.?in.?life|morning|evening/gi,
    'product_demo': /demo|review|unbox|test|try|show|features|works|using|demonstration|product/gi,
    'emotional_support': /feel|emotion|struggle|journey|support|understand|relate|empathy|comfort/gi,
    'medical_trust': /doctor|medical|health|safe|approved|recommend|clinical|professional|expert/gi,
    'convenience': /easy|quick|simple|convenient|portable|hands.?free|efficient|time.?saving/gi,
    'pumping_reality': /pump|pumping|milk|supply|schedule|session|exclusive|combo|feeding|output/gi
  };

  const baseline = { 
    authenticity: 0.18, trending: 0.08, community: 0.22, education: 0.14, 
    humor: 0.12, empowerment: 0.10, lifestyle: 0.20, product_demo: 0.16,
    emotional_support: 0.25, medical_trust: 0.12, convenience: 0.18, pumping_reality: 0.30
  };
  
  let narrative = '';
  if (companyName && mainCategory) {
    narrative = `${companyName}'s TikTok presence in ${mainCategory} reveals `;
  } else {
    narrative = `TikTok content in ${mainCategory} reveals `;
  }

  // Comprehensive text analysis using all available rich content
  const allText = data.map(d => [
    d.message, 
    d.overall_description, 
    d.focus_tag_reason,
    d.value_proposition,
    d.text_detected,
    d.link_title,
    d.link_description,
    d.primary_cta,
    d.target_audience
  ].filter(Boolean).join(' ')).join(' ');
  
  const cueScores = {};
  Object.entries(cueDefs).forEach(([cue, regex]) => {
    const matches = (allText.match(regex) || []).length;
    const total = allText.split(/\s+/).length;
    cueScores[cue] = total > 0 ? matches / total : 0;
  });

  // Sophisticated over/under-indexing analysis
  const overIndexed = Object.entries(cueScores)
    .filter(([cue, score]) => score > baseline[cue] * 1.4)
    .sort((a, b) => (b[1] / baseline[b[0]]) - (a[1] / baseline[a[0]]))
    .slice(0, 3);

  const underIndexed = Object.entries(cueScores)
    .filter(([cue, score]) => score < baseline[cue] * 0.6)
    .sort((a, b) => (a[1] / baseline[a[0]]) - (b[1] / baseline[b[0]]))
    .slice(0, 2);

  // Content strategy and messaging analysis
  if (overIndexed.length > 0) {
    const primaryCue = overIndexed[0][0].replace('_', ' ');
    const indexScore = ((overIndexed[0][1] / baseline[overIndexed[0][0]]) * 100).toFixed(0);
    narrative += `a ${indexScore}% over-index on ${primaryCue}, `;
    
    if (overIndexed.length > 1) {
      const secondaryCues = overIndexed.slice(1).map(([cue]) => cue.replace('_', ' ')).join(' and ');
      narrative += `complemented by strong ${secondaryCues} messaging. `;
    }
  } else {
    narrative += `a balanced messaging approach across key cultural touchpoints. `;
  }

  // Visual content insights
  const visualAnalysis = analyzeVisualContent(data);
  if (visualAnalysis.peopleShare > 60) {
    narrative += `Strong personal presence builds authentic connections and relatability. `;
  } else if (visualAnalysis.peopleShare > 30) {
    narrative += `Balanced approach combines human elements with product focus. `;
  } else {
    narrative += `Product-focused content emphasizes functionality and features. `;
  }

  // Strategic insights based on category context
  if (underIndexed.length > 0) {
    const missedOpportunities = underIndexed.map(([cue]) => cue.replace('_', ' ')).join(' and ');
    narrative += `Notable under-representation in ${missedOpportunities} creates opportunity for differentiated messaging within the category.`;
  }

  // Deep messaging pillars analysis
  const messagingPillars = analyzeMessagingPillars(data, allText);
  if (messagingPillars.primary) {
    narrative += ` Content architecture centers on ${messagingPillars.primary} messaging pillar`;
    if (messagingPillars.secondary.length > 0) {
      narrative += `, supported by ${messagingPillars.secondary.join(' and ')} themes. `;
    } else {
      narrative += ` with focused execution. `;
    }
  }

  // Cultural touchpoints analysis
  const culturalTouchpoints = analyzeCulturalTouchpoints(data);
  if (culturalTouchpoints.dominant.length > 0) {
    narrative += `Cultural resonance through ${culturalTouchpoints.dominant.join(', ')}, `;
    if (culturalTouchpoints.emerging.length > 0) {
      narrative += `with emerging signals in ${culturalTouchpoints.emerging.join(' and ')}. `;
    }
  }

  // Advanced content strategy insights
  const contentStrategy = analyzeContentStrategy(data);
  narrative += contentStrategy.narrative;

  // Category-specific strategic context
  if (companyName && mainCategory) {
    narrative += ` This positions ${companyName} as `;
    if (overIndexed.some(([cue]) => ['authenticity', 'community', 'emotional_support'].includes(cue))) {
      narrative += `a relationship-first brand prioritizing emotional connection over product features.`;
    } else if (overIndexed.some(([cue]) => ['education', 'medical_trust', 'product_demo'].includes(cue))) {
      narrative += `an expertise-driven brand focusing on education and clinical credibility.`;
    } else if (overIndexed.some(([cue]) => ['humor', 'lifestyle', 'trending'].includes(cue))) {
      narrative += `a culturally-aware brand leveraging entertainment and lifestyle integration.`;
    } else {
      narrative += `pursuing a multifaceted approach that balances various messaging pillars.`;
    }
  }

  return { takeaway: narrative };
}

// Helper function for visual content analysis
function analyzeVisualContent(data) {
  const peopleCount = data.filter(d => 
    d.people_detected && 
    (d.people_detected.toLowerCase().includes('person') || 
     d.people_detected.toLowerCase().includes('face') ||
     d.people_detected.toLowerCase().includes('woman') ||
     d.people_detected.toLowerCase().includes('mother'))
  ).length;
  
  const peopleShare = data.length > 0 ? Math.round((peopleCount / data.length) * 100) : 0;
  
  return { peopleShare, peopleCount };
}

// Helper function for posting pattern analysis
function analyzePostingPatterns(data) {
  const dates = data.map(d => {
    const pubDate = d.published_date;
    if (!pubDate) return null;
    if (pubDate.includes('/')) {
      const [month, day, year] = pubDate.split('/');
      return new Date(year, month - 1, day);
    }
    return null;
  }).filter(Boolean).sort();
  
  if (dates.length < 3) return { consistency: 0 };
  
  // Calculate average gap between posts
  const gaps = [];
  for (let i = 1; i < dates.length; i++) {
    gaps.push(dates[i] - dates[i-1]);
  }
  
  const avgGap = d3.mean(gaps);
  const gapVariance = d3.variance(gaps);
  const consistency = avgGap > 0 ? Math.max(0, 1 - (Math.sqrt(gapVariance) / avgGap)) : 0;
  
  return { consistency, avgGap, dates };
}

// Advanced messaging pillars analysis
function analyzeMessagingPillars(data, allText) {
  const pillars = {
    'Care & Empathy': /caring|care|empathy|understand|support|feel|compassionate|gentle|tender|nurturing/gi,
    'Expertise & Trust': /expert|trust|proven|reliable|professional|medical|doctor|clinical|science|research/gi,
    'Convenience & Efficiency': /easy|quick|convenient|efficient|simple|time.?saving|effortless|streamlined/gi,
    'Community & Belonging': /community|together|belong|sisterhood|tribe|family|connect|share|unite/gi,
    'Innovation & Technology': /innovative|technology|smart|advanced|cutting.?edge|digital|modern|breakthrough/gi,
    'Authenticity & Transparency': /authentic|real|honest|transparent|genuine|truth|open|sincere|raw/gi,
    'Empowerment & Confidence': /empower|confident|strong|capable|independent|control|choice|freedom/gi,
    'Lifestyle & Aspiration': /lifestyle|aspire|dream|goal|achieve|success|balance|wellness|thrive/gi
  };

  const pillarScores = {};
  Object.entries(pillars).forEach(([pillar, regex]) => {
    const matches = (allText.match(regex) || []).length;
    const textLength = allText.split(/\s+/).length;
    pillarScores[pillar] = textLength > 0 ? matches / textLength : 0;
  });

  const sortedPillars = Object.entries(pillarScores)
    .sort(([,a], [,b]) => b - a)
    .filter(([,score]) => score > 0.001); // Minimum threshold

  const primary = sortedPillars.length > 0 ? sortedPillars[0][0] : null;
  const secondary = sortedPillars.slice(1, 3).map(([pillar]) => pillar);

  return { primary, secondary, scores: pillarScores };
}

// Cultural touchpoints analysis specific to mom/breastfeeding content
function analyzeCulturalTouchpoints(data) {
  const touchpoints = {
    'Sleep Deprivation Reality': /tired|exhausted|sleep|awake|night|3am|zombie|coffee|energy/gi,
    'Body Image & Recovery': /body|recover|healing|postpartum|weight|image|confidence|beautiful|strong/gi,
    'Work-Life Integration': /work|job|career|balance|pumping.?at.?work|office|meeting|professional/gi,
    'Partner Dynamics': /partner|husband|dad|father|support|help|share|together|teamwork/gi,
    'Comparison & Judgment': /comparison|judge|guilt|shame|perfect|enough|struggle|pressure|standards/gi,
    'Time Scarcity': /time|busy|rush|quick|multitask|juggle|overwhelm|schedule|calendar/gi,
    'Social Media Influence': /instagram|facebook|social|influence|perfect|curated|reality|behind.?scenes/gi,
    'Generational Wisdom': /mom|mother|grandmother|advice|tradition|old.?school|new.?way|generation/gi,
    'Financial Stress': /money|cost|expensive|budget|afford|worth|investment|price|financial/gi,
    'Identity Shift': /identity|who.?am.?i|changed|different|new.?me|role|mother|woman|person/gi
  };

  const allContent = data.map(d => [
    d.message,
    d.overall_description,
    d.text_detected,
    d.objects_detected
  ].filter(Boolean).join(' ')).join(' ');

  const touchpointScores = {};
  Object.entries(touchpoints).forEach(([touchpoint, regex]) => {
    const matches = (allContent.match(regex) || []).length;
    touchpointScores[touchpoint] = matches;
  });

  const sorted = Object.entries(touchpointScores)
    .sort(([,a], [,b]) => b - a)
    .filter(([,score]) => score > 0);

  const dominant = sorted.slice(0, 2).map(([touchpoint]) => touchpoint);
  const emerging = sorted.slice(2, 4).map(([touchpoint]) => touchpoint);

  return { dominant, emerging, scores: touchpointScores };
}

// Advanced content strategy analysis
function analyzeContentStrategy(data) {
  let narrative = '';

  // Video format and engagement correlation
  const videoTypes = analyzeVideoFormats(data);
  if (videoTypes.insights.length > 0) {
    narrative += `Video strategy emphasizes ${videoTypes.insights.join(' and ')}, `;
  }

  // Hashtag and text overlay analysis
  const textStrategy = analyzeTextStrategy(data);
  if (textStrategy.dominant) {
    narrative += `with ${textStrategy.dominant} text overlay approach. `;
  }

  // Call-to-action patterns
  const ctaPatterns = analyzeCTAPatterns(data);
  if (ctaPatterns.primary) {
    narrative += `Primary engagement driver is ${ctaPatterns.primary}`;
    if (ctaPatterns.effectiveness > 0.3) {
      narrative += ` showing strong conversion signals. `;
    } else {
      narrative += ` with room for optimization. `;
    }
  }

  // Objects and visual elements analysis
  const visualElements = analyzeVisualElements(data);
  if (visualElements.signature.length > 0) {
    narrative += `Visual signature includes ${visualElements.signature.slice(0, 3).join(', ')}, creating consistent brand recognition. `;
  }

  return { narrative, videoTypes, textStrategy, ctaPatterns, visualElements };
}

// Video format analysis
function analyzeVideoFormats(data) {
  const insights = [];
  
  // Analyze video descriptions for format clues
  const descriptions = data.map(d => d.overall_description || '').join(' ').toLowerCase();
  
  if (descriptions.includes('talking') || descriptions.includes('speaking')) {
    insights.push('direct-to-camera testimonials');
  }
  if (descriptions.includes('demonstration') || descriptions.includes('showing')) {
    insights.push('product demonstrations');
  }
  if (descriptions.includes('behind') || descriptions.includes('scenes')) {
    insights.push('behind-the-scenes content');
  }
  if (descriptions.includes('animation') || descriptions.includes('text')) {
    insights.push('text-heavy educational formats');
  }

  return { insights };
}

// Text strategy analysis
function analyzeTextStrategy(data) {
  const textData = data.map(d => d.text_detected || '').join(' ').toLowerCase();
  
  if (textData.includes('when') && textData.includes('mom')) {
    return { dominant: 'relatable situation-based' };
  } else if (textData.includes('tip') || textData.includes('hack')) {
    return { dominant: 'educational tip-driven' };
  } else if (textData.includes('real') || textData.includes('honest')) {
    return { dominant: 'authenticity-focused' };
  } else {
    return { dominant: 'minimal text overlay' };
  }
}

// CTA patterns analysis
function analyzeCTAPatterns(data) {
  const ctas = data.map(d => d.primary_cta || '').filter(Boolean);
  const messages = data.map(d => d.message || '').join(' ').toLowerCase();
  
  let primary = null;
  let effectiveness = 0;
  
  if (messages.includes('share') || messages.includes('tag')) {
    primary = 'community sharing and tagging';
    effectiveness = 0.4;
  } else if (messages.includes('comment') || messages.includes('tell')) {
    primary = 'comment engagement';
    effectiveness = 0.3;
  } else if (messages.includes('follow') || messages.includes('more')) {
    primary = 'follower acquisition';
    effectiveness = 0.2;
  } else {
    primary = 'organic engagement';
    effectiveness = 0.1;
  }

  return { primary, effectiveness };
}

// Visual elements analysis
function analyzeVisualElements(data) {
  const objectsDetected = data.map(d => d.objects_detected || '').join(' ').toLowerCase();
  
  const signature = [];
  
  if (objectsDetected.includes('breast pump') || objectsDetected.includes('pump')) {
    signature.push('breast pumps');
  }
  if (objectsDetected.includes('baby') || objectsDetected.includes('infant')) {
    signature.push('babies/infants');
  }
  if (objectsDetected.includes('bottle') || objectsDetected.includes('milk')) {
    signature.push('feeding equipment');
  }
  if (objectsDetected.includes('text') || objectsDetected.includes('overlay')) {
    signature.push('text overlays');
  }
  if (objectsDetected.includes('home') || objectsDetected.includes('kitchen')) {
    signature.push('domestic settings');
  }

  return { signature };
}

function generateTikTokMetrics(data) {
  const totalViews = d3.sum(data, d => d.views || 0);
  const totalLikes = d3.sum(data, d => d.likes || 0);
  const totalComments = d3.sum(data, d => d.comments || 0);
  const totalShares = d3.sum(data, d => d.shares || 0);
  const avgEngagementRate = d3.mean(data, d => d.engagement_rate_by_view || 0) * 100;
  
  const dateRange = getTikTokDateRange(data);
  
  return `
    <div style="display: flex; gap: 24px; margin-bottom: 16px; flex-wrap: wrap;">
      <div><strong>Performance</strong><br/>${totalViews.toLocaleString()} views, ${totalLikes.toLocaleString()} likes<br/>${avgEngagementRate.toFixed(1)}% avg engagement rate</div>
      <div><strong>Engagement</strong><br/>${totalComments.toLocaleString()} comments, ${totalShares.toLocaleString()} shares<br/>${data.length} posts${dateRange}</div>
    </div>
  `;
}

function generateTikTokGallery(data) {
  const posts = data
    .filter(d => d.image && d.image.trim())
    .sort((a, b) => (b.engagement_total || 0) - (a.engagement_total || 0))
    .slice(0, 12);

  if (posts.length === 0) {
    // Fallback to text cards
    const textCards = data
      .filter(d => d.message && d.message.trim())
      .slice(0, 6)
      .map(d => `
        <div class="creative-card" style="padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
          <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">${d.company || 'Unknown'} • ${(d.engagement_total || 0).toLocaleString()} engagement</div>
          <div style="font-size: 12px; line-height: 1.4;">${(d.message || '').substring(0, 150)}${d.message && d.message.length > 150 ? '...' : ''}</div>
        </div>
      `).join('');
    
    return textCards || '<div style="color: #64748b; font-style: italic;">No content available for this selection.</div>';
  }

  return posts.map(d => `
    <img src="${d.image}" 
         alt="TikTok Post" 
         class="creative-thumb" 
         style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px; cursor: pointer; border: 1px solid #e2e8f0;"
         onclick="window.open('${d.post_link}', '_blank')"
         title="${(d.engagement_total || 0).toLocaleString()} engagement • ${(d.views || 0).toLocaleString()} views" />
  `).join('');
}

function getTikTokDateRange(data) {
  const dates = data.map(d => {
    const pubDate = d.published_date;
    if (!pubDate) return null;
    if (pubDate.includes('/')) {
      const [month, day, year] = pubDate.split('/');
      return new Date(year, month - 1, day);
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
