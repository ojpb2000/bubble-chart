// Deterministic circle packing for Instagram SM tab
// Layout: root → Main Category → Company
// Based on bubbles_pack_tiktok.js but adapted for Instagram data source

export function buildBubblePackInstagram({ container, rows }) {
  // Apply main category allow-list from global state if present (Instagram specific)
  const allow = (window.__MAIN_ALLOW_INSTAGRAM__ instanceof Set) ? window.__MAIN_ALLOW_INSTAGRAM__ : null;
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
      impressions: d3.sum(items, (d) => d['estimated_impressions'] || 0),
      likes: d3.sum(items, (d) => d['likes'] || 0),
      byCompany: d3.rollup(
        items,
        (it) => ({
          engagement: d3.sum(it, (d) => d['engagement_total'] || 0),
          impressions: d3.sum(it, (d) => d['estimated_impressions'] || 0),
          likes: d3.sum(it, (d) => d['likes'] || 0),
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
      impressions: a.impressions || 0,
      likes: a.likes || 0
    }));
    children.push({
      name: mainName,
      value: Math.max(agg.engagement, 0),
      impressions: agg.impressions || 0,
      likes: agg.likes || 0,
      children: companyChildren,
    });
  }

  const hierarchy = d3.hierarchy({ name: 'root', children });
  const pack = d3.pack().size([width - 40, height - 40]).padding(3);
  pack(hierarchy.sum(d => Math.max(d.value, 1) + 1000));

  // SVG setup
  const svg = d3.select(rootEl).append('svg').attr('width', width).attr('height', height);
  const g = svg.append('g').attr('transform', 'translate(20, 20)');

  // Zoom behavior
  const zoomBehavior = d3.zoom().scaleExtent([0.1, 10]).on('zoom', (event) => {
    g.attr('transform', event.transform);
  });
  svg.call(zoomBehavior);

  // Shared state for expand/collapse
  const mainState = new Map();
  hierarchy.children?.forEach(main => {
    mainState.set(main.data.name, { expanded: false, baseR: main.r });
  });

  // Color scale based on hash
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

  function getMainColor(mainName) {
    const h = hash01(mainName) * 360;
    return d3.hsl(h, 0.7, 0.75);
  }

  // Main category circles
  const mainCircles = g.selectAll('.main-circle')
    .data(hierarchy.children || [])
    .join('circle')
    .attr('class', 'main-circle')
    .attr('cx', d => d.x)
    .attr('cy', d => d.y)
    .attr('r', d => d.r)
    .attr('fill', d => getMainColor(d.data.name))
    .attr('stroke', '#fff')
    .attr('stroke-width', 2)
    .attr('opacity', 0.8)
    .style('cursor', 'pointer');

  // Main category labels
  const mainLabels = g.selectAll('.main-label')
    .data(hierarchy.children || [])
    .join('text')
    .attr('class', 'main-label')
    .attr('x', d => d.x)
    .attr('y', d => d.y)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .style('font-family', 'Inter, sans-serif')
    .style('font-weight', '600')
    .style('fill', '#2d3748')
    .style('pointer-events', 'none')
    .each(function(d) {
      const node = d3.select(this);
      const baseR = mainState.get(d.data.name)?.baseR || d.r;
      const fontSize = Math.max(10, Math.min(18, baseR / 4));
      const maxWidth = baseR * 1.4;
      
      node.style('font-size', `${fontSize}px`);
      
      const words = (d.data.name || '').split(/\s+/);
      const lineHeight = fontSize * 1.1;
      
      if (words.length > 2 && maxWidth < 80) {
        const mid = Math.ceil(words.length / 2);
        const line1 = words.slice(0, mid).join(' ');
        const line2 = words.slice(mid).join(' ');
        
        node.selectAll('tspan').remove();
        node.append('tspan').attr('x', d.x).attr('dy', -lineHeight/2).text(line1);
        node.append('tspan').attr('x', d.x).attr('dy', lineHeight).text(line2);
      } else {
        node.text(d.data.name);
      }
    });

  // Company circles (initially hidden)
  const companyCircles = g.selectAll('.company-circle')
    .data(hierarchy.descendants().filter(d => d.depth === 2))
    .join('circle')
    .attr('class', 'company-circle')
    .attr('cx', d => d.x)
    .attr('cy', d => d.y)
    .attr('r', 0)
    .attr('fill', d => {
      const mainColor = getMainColor(d.parent.data.name);
      const intensity = Math.min(1, (d.data.impressions || 0) / 1000000);
      return d3.hsl(mainColor.h, mainColor.s, Math.max(0.3, mainColor.l - intensity * 0.4));
    })
    .attr('stroke', d => getMainColor(d.parent.data.name).darker(0.5))
    .attr('stroke-width', 1.5)
    .attr('opacity', 0)
    .style('cursor', 'pointer');

  // Company labels (initially hidden)
  const companyLabels = g.selectAll('.company-label')
    .data(hierarchy.descendants().filter(d => d.depth === 2))
    .join('text')
    .attr('class', 'company-label')
    .attr('x', d => d.x)
    .attr('y', d => {
      const SMALL_R = 12;
      return d.r < SMALL_R ? d.y - (d.r + 6) : d.y;
    })
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .style('font-family', 'Inter, sans-serif')
    .style('font-weight', '500')
    .style('font-size', '10px')
    .style('fill', '#2d3748')
    .style('opacity', 0)
    .style('pointer-events', 'none')
    .text(d => d.data.name);

  // Interaction handlers
  mainCircles.on('click', function(event, d) {
    event.stopPropagation();
    const mainName = d.data.name;
    const state = mainState.get(mainName);
    
    if (!state) return;
    
    state.expanded = !state.expanded;
    
    // Update analysis panels
    updateInstagramAnalysis(rows, null, mainName);
    
    // Animation logic
    if (state.expanded) {
      expandCategory(d);
    } else {
      collapseCategory(d);
    }
  });

  companyCircles.on('click', function(event, d) {
    event.stopPropagation();
    const companyName = d.data.name;
    const mainName = d.parent.data.name;
    
    updateInstagramAnalysis(rows, companyName, mainName);
  });

  function expandCategory(mainNode) {
    const companies = hierarchy.descendants().filter(d => 
      d.depth === 2 && d.parent.data.name === mainNode.data.name
    );
    
    companies.forEach(company => {
      const displayR = Math.max(8, Math.min(company.r, 25));
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.min(mainNode.r * 0.6, 30);
      const newX = mainNode.x + Math.cos(angle) * distance;
      const newY = mainNode.y + Math.sin(angle) * distance;
      
      company.x = newX;
      company.y = newY;
      company.displayR = displayR;
    });

    companyCircles
      .filter(d => d.parent.data.name === mainNode.data.name)
      .transition()
      .duration(600)
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', d => d.displayR)
      .attr('opacity', 0.9);

    companyLabels
      .filter(d => d.parent.data.name === mainNode.data.name)
      .transition()
      .duration(600)
      .attr('x', d => d.x)
      .attr('y', d => {
        const SMALL_R = 12;
        return d.displayR < SMALL_R ? d.y - (d.displayR + 6) : d.y;
      })
      .style('opacity', 0.85);
  }

  function collapseCategory(mainNode) {
    companyCircles
      .filter(d => d.parent.data.name === mainNode.data.name)
      .transition()
      .duration(400)
      .attr('r', 0)
      .attr('opacity', 0);

    companyLabels
      .filter(d => d.parent.data.name === mainNode.data.name)
      .transition()
      .duration(400)
      .style('opacity', 0);
  }

  // Improved initial view positioning
  function fitInitialView(factor = 1.4, biasX = 0, biasY = 0) {
    const box = g.node().getBBox();
    const padding = 80;
    const bx = box.x - padding;
    const by = box.y - padding;
    const bw = Math.max(1, box.width + padding * 2);
    const bh = Math.max(1, box.height + padding * 2);
    const scaleX = (width - padding * 2) / bw;
    const scaleY = (height - padding * 2) / bh;
    const baseScale = Math.min(scaleX, scaleY);
    const scale = Math.min(baseScale / factor, 8);
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

  setTimeout(() => fitInitialView(), 100);

  // Add tooltips
  const tooltip = d3.select('body').append('div')
    .attr('class', 'tooltip')
    .style('opacity', 0)
    .style('position', 'absolute')
    .style('background', 'rgba(255, 255, 255, 0.95)')
    .style('padding', '8px 12px')
    .style('border-radius', '4px')
    .style('font-size', '12px')
    .style('box-shadow', '0 2px 8px rgba(0,0,0,0.15)')
    .style('pointer-events', 'none')
    .style('z-index', 1000);

  mainCircles.on('mouseenter', function(event, d) {
    tooltip.transition().duration(200).style('opacity', 1);
    tooltip.html(`
      <strong>${d.data.name}</strong><br/>
      Total Engagement: ${(d.data.engagement || 0).toLocaleString()}<br/>
      Estimated Impressions: ${(d.data.impressions || 0).toLocaleString()}<br/>
      Companies: ${d.children?.length || 0}
    `);
  }).on('mousemove', function(event) {
    tooltip.style('left', (event.pageX + 10) + 'px').style('top', (event.pageY - 10) + 'px');
  }).on('mouseleave', function() {
    tooltip.transition().duration(200).style('opacity', 0);
  });

  companyCircles.on('mouseenter', function(event, d) {
    if (d3.select(this).attr('opacity') > 0) {
      tooltip.transition().duration(200).style('opacity', 1);
      tooltip.html(`
        <strong>${d.data.name}</strong><br/>
        Category: ${d.parent.data.name}<br/>
        Engagement: ${(d.data.engagement || 0).toLocaleString()}<br/>
        Estimated Impressions: ${(d.data.impressions || 0).toLocaleString()}
      `);
    }
  }).on('mousemove', function(event) {
    tooltip.style('left', (event.pageX + 10) + 'px').style('top', (event.pageY - 10) + 'px');
  }).on('mouseleave', function() {
    tooltip.transition().duration(200).style('opacity', 0);
  });
}

// Instagram-specific analysis function
function updateInstagramAnalysis(data, companyName, mainCategory) {
  const takeawayDiv = document.getElementById('selection-takeaway-instagram');
  const analysisDiv = document.getElementById('selection-analysis-instagram');
  const galleryDiv = document.getElementById('selection-gallery-instagram');
  const takeawayTitle = document.getElementById('takeaway-title-instagram');
  const insightTitle = document.getElementById('insight-title-instagram');
  
  if (!takeawayDiv || !analysisDiv || !galleryDiv) return;

  // Filter data based on selection
  let filteredData = data;
  if (companyName && mainCategory) {
    filteredData = data.filter(d => d.company === companyName && d.Main_Category === mainCategory);
  } else if (mainCategory) {
    filteredData = data.filter(d => d.Main_Category === mainCategory);
  }

  if (filteredData.length === 0) {
    takeawayDiv.innerHTML = '<p>No data available for this selection.</p>';
    analysisDiv.innerHTML = '';
    galleryDiv.innerHTML = '';
    takeawayTitle.textContent = 'Key takeaways';
    insightTitle.textContent = 'Click a bubble or a main label above to generate a brief creative analysis';
    return;
  }

  // Update titles
  if (companyName && mainCategory) {
    takeawayTitle.textContent = `Key takeaways: ${companyName} in ${mainCategory}`;
    insightTitle.textContent = `Creative analysis: ${companyName} in ${mainCategory}`;
  } else if (mainCategory) {
    takeawayTitle.textContent = `Key takeaways: ${mainCategory}`;
    insightTitle.textContent = `Creative analysis: ${mainCategory}`;
  }

  // Generate analysis
  const analysis = generateInstagramAnalysis(filteredData, companyName, mainCategory);
  takeawayDiv.innerHTML = `<p>${analysis.takeaway}</p>`;

  // Generate metrics and gallery
  const totalEngagement = d3.sum(filteredData, d => d.engagement_total || 0);
  const totalImpressions = d3.sum(filteredData, d => d.estimated_impressions || 0);
  const dates = filteredData.map(d => d.published_date).filter(Boolean);
  const dateRange = dates.length > 0 ? `${d3.min(dates)} to ${d3.max(dates)}` : 'N/A';
  
  const metrics = `
    <div style="margin-bottom: 16px; padding: 12px; background: #f8fafc; border-radius: 6px; font-size: 14px;">
      <div><strong>Scale & Flight Window:</strong> ${totalEngagement.toLocaleString()} engagement, ${totalImpressions.toLocaleString()} est. impressions</div>
      <div><strong>Where it runs:</strong> Instagram</div>
      <div><strong>Date Range:</strong> ${dateRange}</div>
    </div>
  `;

  // Generate gallery
  const gallery = generateInstagramGallery(filteredData);
  analysisDiv.innerHTML = metrics;
  galleryDiv.innerHTML = gallery;
}

// Instagram-specific analysis function with deep cultural insights
function generateInstagramAnalysis(data, companyName, mainCategory) {
  let narrative = '';
  
  // Calculate key metrics
  const totalEngagement = d3.sum(data, d => d.engagement_total || 0);
  const totalImpressions = d3.sum(data, d => d.estimated_impressions || 0);
  const totalLikes = d3.sum(data, d => d.likes || 0);
  const totalComments = d3.sum(data, d => d.comments || 0);
  const avgEngagementRate = data.length > 0 ? d3.mean(data, d => d.engagement_rate_by_follower || 0) : 0;

  // Analysis introduction
  if (companyName && mainCategory) {
    narrative = `${companyName}'s Instagram presence in ${mainCategory} reveals `;
  } else {
    narrative = `Instagram content in ${mainCategory} reveals `;
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
  const cueDefs = {
    authenticity: /authentic|real|honest|genuine|truth|unfiltered|behind.?scenes|raw|transparent/gi,
    aesthetic: /beautiful|gorgeous|aesthetic|pretty|stylish|chic|elegant|curated|visual|photography/gi,
    community: /community|together|sisterhood|tribe|family|connect|share|support|mom.?friends/gi,
    education: /learn|tip|advice|guide|how.?to|tutorial|education|inform|teach|expert/gi,
    lifestyle: /lifestyle|daily|routine|life|living|balance|wellness|self.?care|mindful/gi,
    aspirational: /dream|goal|inspire|motivate|achieve|success|empower|confidence|strength/gi,
    product_demo: /demo|demonstration|show|product|feature|benefit|review|unboxing|try/gi,
    emotional_support: /love|heart|feel|emotion|support|comfort|understanding|empathy|care/gi,
    medical_trust: /doctor|medical|clinical|safe|health|professional|recommend|approved|tested/gi,
    convenience: /easy|simple|quick|convenient|effortless|hassle.?free|streamlined|efficient/gi,
    mommy_moments: /motherhood|mom.?life|parenting|baby|maternal|nurturing|bonding|precious/gi,
    body_positivity: /body|confidence|beautiful|strong|recovery|postpartum|self.?love|acceptance/gi
  };

  Object.entries(cueDefs).forEach(([cue, regex]) => {
    const matches = (allText.match(regex) || []).length;
    const total = allText.split(/\s+/).length;
    cueScores[cue] = total > 0 ? matches / total : 0;
  });

  // Baseline comparison for Instagram
  const baseline = {
    authenticity: 0.08, aesthetic: 0.15, community: 0.06, education: 0.04,
    lifestyle: 0.12, aspirational: 0.07, product_demo: 0.05, emotional_support: 0.09,
    medical_trust: 0.03, convenience: 0.06, mommy_moments: 0.10, body_positivity: 0.04
  };

  const overIndexed = Object.entries(cueScores)
    .map(([cue, score]) => [cue, score / (baseline[cue] || 0.01)])
    .filter(([, ratio]) => ratio > 1.5)
    .sort(([, a], [, b]) => b - a);

  const underIndexed = Object.entries(cueScores)
    .map(([cue, score]) => [cue, score / (baseline[cue] || 0.01)])
    .filter(([, ratio]) => ratio < 0.7)
    .sort(([, a], [, b]) => a - b);

  // Content positioning analysis
  if (overIndexed.length > 0) {
    const topCues = overIndexed.slice(0, 3).map(([cue, ratio]) => 
      `${cue.replace('_', ' ')} (${Math.round((ratio - 1) * 100)}% over-index)`
    );
    narrative += `strong positioning through ${topCues.join(', ')}, `;
  } else {
    narrative += `a balanced content approach across multiple themes, `;
  }

  // Deep messaging pillars analysis
  const messagingPillars = analyzeInstagramMessagingPillars(data, allText);
  if (messagingPillars.primary) {
    narrative += `Content strategy centers on ${messagingPillars.primary} messaging pillar`;
    if (messagingPillars.secondary.length > 0) {
      narrative += `, supported by ${messagingPillars.secondary.join(' and ')} themes. `;
    } else {
      narrative += ` with focused execution. `;
    }
  }

  // Cultural touchpoints analysis
  const culturalTouchpoints = analyzeInstagramCulturalTouchpoints(data);
  if (culturalTouchpoints.dominant.length > 0) {
    narrative += `Cultural resonance through ${culturalTouchpoints.dominant.join(', ')}, `;
    if (culturalTouchpoints.emerging.length > 0) {
      narrative += `with emerging signals in ${culturalTouchpoints.emerging.join(' and ')}. `;
    }
  }

  // Instagram-specific content strategy insights
  const contentStrategy = analyzeInstagramContentStrategy(data);
  narrative += contentStrategy.narrative;

  // Visual content insights
  const visualAnalysis = analyzeInstagramVisualContent(data);
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
    narrative += `Notable under-representation in ${missedOpportunities} creates opportunity for differentiated messaging within the category. `;
  }

  // Category-specific strategic context
  if (companyName && mainCategory) {
    narrative += ` This positions ${companyName} as `;
    if (overIndexed.some(([cue]) => ['authenticity', 'community', 'emotional_support'].includes(cue))) {
      narrative += `a relationship-first brand prioritizing emotional connection over product features.`;
    } else if (overIndexed.some(([cue]) => ['education', 'medical_trust', 'product_demo'].includes(cue))) {
      narrative += `an expertise-driven brand focusing on education and clinical credibility.`;
    } else if (overIndexed.some(([cue]) => ['aesthetic', 'lifestyle', 'aspirational'].includes(cue))) {
      narrative += `a lifestyle-focused brand leveraging visual appeal and aspirational messaging.`;
    } else {
      narrative += `pursuing a multifaceted approach that balances various messaging pillars.`;
    }
  }

  return { takeaway: narrative };
}

// Instagram-specific messaging pillars analysis
function analyzeInstagramMessagingPillars(data, allText) {
  const pillars = {
    'Visual Storytelling': /story|visual|photo|picture|image|capture|moment|memory|aesthetic|beautiful/gi,
    'Authentic Motherhood': /real|authentic|honest|motherhood|mom.?life|genuine|truth|unfiltered|behind.?scenes/gi,
    'Community & Connection': /community|together|connect|share|support|sisterhood|tribe|family|friends/gi,
    'Lifestyle & Wellness': /lifestyle|wellness|self.?care|balance|living|daily|routine|mindful|healthy/gi,
    'Educational Content': /learn|tip|advice|guide|how.?to|tutorial|education|inform|teach|expert|knowledge/gi,
    'Product Excellence': /quality|best|premium|effective|works|results|performance|reliable|trusted/gi,
    'Empowerment & Confidence': /empower|confident|strong|capable|independent|choice|freedom|believe|achieve/gi,
    'Emotional Support': /love|care|support|understand|feel|emotion|comfort|empathy|heart|nurturing/gi
  };

  const pillarScores = {};
  Object.entries(pillars).forEach(([pillar, regex]) => {
    const matches = (allText.match(regex) || []).length;
    const textLength = allText.split(/\s+/).length;
    pillarScores[pillar] = textLength > 0 ? matches / textLength : 0;
  });

  const sortedPillars = Object.entries(pillarScores)
    .sort(([,a], [,b]) => b - a)
    .filter(([,score]) => score > 0.001);

  const primary = sortedPillars.length > 0 ? sortedPillars[0][0] : null;
  const secondary = sortedPillars.slice(1, 3).map(([pillar]) => pillar);

  return { primary, secondary, scores: pillarScores };
}

// Instagram-specific cultural touchpoints analysis
function analyzeInstagramCulturalTouchpoints(data) {
  const touchpoints = {
    'Curated vs Reality': /perfect|curated|real|behind.?scenes|honest|unfiltered|actual|truth/gi,
    'Mom Guilt & Pressure': /guilt|pressure|should|perfect|enough|judge|criticism|expectations/gi,
    'Visual Perfectionism': /perfect|flawless|goals|aesthetic|beautiful|gorgeous|stunning|amazing/gi,
    'Time Management': /time|busy|rush|schedule|manage|balance|juggle|overwhelm|multitask/gi,
    'Self-Care & Identity': /self.?care|identity|me.?time|who.?am.?i|personal|individual|woman/gi,
    'Body & Recovery': /body|postpartum|recovery|healing|strength|confidence|beautiful|strong/gi,
    'Comparison Culture': /comparison|compare|other.?moms|everyone.?else|perfect|standard|measure/gi,
    'Support Networks': /support|help|community|friends|family|village|together|sisterhood/gi,
    'Work-Life Balance': /work|career|balance|professional|office|job|working.?mom|pumping.?at.?work/gi,
    'Product Discovery': /discover|found|try|new|recommend|love|obsessed|game.?changer|must.?have/gi
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

// Instagram content strategy analysis
function analyzeInstagramContentStrategy(data) {
  let narrative = '';

  // Post format analysis
  const postTypes = analyzeInstagramPostTypes(data);
  if (postTypes.insights.length > 0) {
    narrative += `Content mix emphasizes ${postTypes.insights.join(' and ')}, `;
  }

  // Visual strategy analysis
  const visualStrategy = analyzeInstagramVisualStrategy(data);
  if (visualStrategy.dominant) {
    narrative += `with ${visualStrategy.dominant} visual approach. `;
  }

  // Engagement strategy analysis
  const engagementStrategy = analyzeInstagramEngagementStrategy(data);
  if (engagementStrategy.primary) {
    narrative += `Primary engagement driver is ${engagementStrategy.primary}`;
    if (engagementStrategy.effectiveness > 0.05) {
      narrative += ` showing strong community interaction. `;
    } else {
      narrative += ` with moderate community response. `;
    }
  }

  // Hashtag and caption strategy
  const captionStrategy = analyzeInstagramCaptionStrategy(data);
  if (captionStrategy.style) {
    narrative += `Caption style reflects ${captionStrategy.style} approach. `;
  }

  return { narrative, postTypes, visualStrategy, engagementStrategy, captionStrategy };
}

// Instagram post types analysis
function analyzeInstagramPostTypes(data) {
  const insights = [];
  const postTypes = data.map(d => d.post_type || '').join(' ').toLowerCase();
  
  if (postTypes.includes('reel')) {
    insights.push('video-first content (Reels)');
  }
  if (postTypes.includes('photo')) {
    insights.push('static visual storytelling');
  }
  if (postTypes.includes('carousel')) {
    insights.push('multi-slide storytelling');
  }

  return { insights };
}

// Instagram visual strategy analysis
function analyzeInstagramVisualStrategy(data) {
  const visualData = data.map(d => d.overall_description || '').join(' ').toLowerCase();
  
  if (visualData.includes('aesthetic') || visualData.includes('beautiful')) {
    return { dominant: 'aesthetic-focused' };
  } else if (visualData.includes('candid') || visualData.includes('natural')) {
    return { dominant: 'authentic lifestyle' };
  } else if (visualData.includes('product') || visualData.includes('demonstration')) {
    return { dominant: 'product-centric' };
  } else {
    return { dominant: 'mixed visual' };
  }
}

// Instagram engagement strategy analysis
function analyzeInstagramEngagementStrategy(data) {
  const messages = data.map(d => d.message || '').join(' ').toLowerCase();
  
  let primary = null;
  let effectiveness = 0;
  
  if (messages.includes('tag') || messages.includes('share')) {
    primary = 'user-generated sharing and tagging';
    effectiveness = 0.06;
  } else if (messages.includes('comment') || messages.includes('tell')) {
    primary = 'comment-driven conversation';
    effectiveness = 0.04;
  } else if (messages.includes('like') || messages.includes('save')) {
    primary = 'content appreciation and saving';
    effectiveness = 0.03;
  } else {
    primary = 'organic discovery';
    effectiveness = 0.02;
  }

  return { primary, effectiveness };
}

// Instagram caption strategy analysis
function analyzeInstagramCaptionStrategy(data) {
  const captions = data.map(d => d.message || '').join(' ').toLowerCase();
  
  if (captions.includes('question') || captions.includes('?')) {
    return { style: 'conversational and engaging' };
  } else if (captions.includes('tip') || captions.includes('how')) {
    return { style: 'educational and informative' };
  } else if (captions.includes('love') || captions.includes('heart')) {
    return { style: 'emotional and heartfelt' };
  } else {
    return { style: 'straightforward and direct' };
  }
}

// Instagram visual content analysis
function analyzeInstagramVisualContent(data) {
  const peopleCount = data.filter(d => 
    d.people_detected && (d.people_detected.toLowerCase().includes('yes') || d.people_detected.toLowerCase().includes('person'))
  ).length;
  
  const peopleShare = data.length > 0 ? (peopleCount / data.length) * 100 : 0;
  
  return { peopleShare: Math.round(peopleShare) };
}

// Generate Instagram gallery
function generateInstagramGallery(data) {
  // Sort by engagement_total descending, take top 6
  const topCreatives = data
    .filter(d => d.image && d.image.trim())
    .sort((a, b) => (b.engagement_total || 0) - (a.engagement_total || 0))
    .slice(0, 6);

  if (topCreatives.length === 0) {
    // If no images, show text-based reference cards
    const textCards = data
      .filter(d => d.message && d.message.trim())
      .slice(0, 3)
      .map(d => `
        <div class="ref-card">
          <div class="ref-content">
            <p>"${(d.message || '').substring(0, 120)}${(d.message || '').length > 120 ? '...' : ''}"</p>
            <div class="ref-metrics">
              <span>Engagement: ${(d.engagement_total || 0).toLocaleString()}</span>
              <span>Impressions: ${(d.estimated_impressions || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      `).join('');
    
    return `<div class="gallery-grid">${textCards}</div>` || '<p>No content available for this selection.</p>';
  }

  const galleryHTML = topCreatives.map(d => `
    <img src="${d.image}" alt="Instagram Creative - Engagement: ${(d.engagement_total || 0).toLocaleString()}" 
         onclick="window.open('${d.post_link || d.image}', '_blank')"
         style="cursor: pointer;">
  `).join('');

  return galleryHTML;
}
