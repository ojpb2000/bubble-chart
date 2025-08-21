export function buildTreemapMosaic({ container, hierarchy }) {
  const rootEl = document.querySelector(container);
  rootEl.innerHTML = '';

  const width = rootEl.clientWidth - 24;
  const height = rootEl.clientHeight - 24;

  const svg = d3
    .select(rootEl)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`);

  const root = d3
    .hierarchy(hierarchy)
    .sum((d) => d.value || 0)
    .sort((a, b) => (b.value || 0) - (a.value || 0));

  const treemap = d3
    .treemap()
    .size([width, height])
    .paddingInner(8)
    .paddingTop((d) => (d.depth === 1 ? 28 : 4))
    .round(true);
  treemap(root);

  const allSpend = root.leaves().map((d) => d.data.spend || 0);
  const spendScale = d3.scaleSqrt().domain([d3.min(allSpend) || 0, d3.max(allSpend) || 1]).range([0.6, 3.2]);
  const strokeColor = (s) => `rgba(255, 46, 147, ${Math.min(1, 0.25 + spendScale(s) / 4)})`;
  // Pastel category hues to visually link main ↔ sub
  const categoryHues = d3.scaleOrdinal()
    .range(['#e3f2fd', '#e8f5e9', '#fff8e1', '#f3e5f5', '#e0f7fa', '#fce4ec', '#ede7f6', '#f1f8e9']);
  const fillColor = (d) => {
    if (d.depth === 1) return d3.color(categoryHues(d.data.name)).formatRgb().replace('rgb(', 'rgba(').replace(')', ',0.5)');
    if (d.depth >= 2) return d3.color(categoryHues(d.parent.data.name)).formatRgb().replace('rgb(', 'rgba(').replace(')', ',0.35)');
    return 'rgba(15, 23, 42, 0.03)';
  };

  const cornerRadius = 12;

  // Groups per main category
  const main = svg
    .selectAll('g.main')
    .data(root.children || [])
    .join('g')
    .attr('class', 'main')
    .attr('transform', (d) => `translate(${d.x0},${d.y0})`);

  main
    .append('rect')
    .attr('rx', cornerRadius)
    .attr('ry', cornerRadius)
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', (d) => d.x1 - d.x0)
    .attr('height', (d) => d.y1 - d.y0)
    .attr('fill', (d) => fillColor(d))
    .attr('stroke', (d) => strokeColor(d.data.spend || 0))
    .attr('stroke-width', 1.2)
    .attr('opacity', 0.9);

  // Titles
  const mainTitles = main
    .append('text')
    .attr('class', 'main-title')
    .attr('x', 10)
    .attr('y', 18)
    .text((d) => `${d.data.name}`)
    .style('cursor', 'pointer')
    .on('click', function (event, d) {
      const collapsed = d._collapsed = !d._collapsed;
      d3.select(this.parentNode).selectAll('g.sub').attr('display', collapsed ? 'none' : null);
    });
  // Show title only on hover for a cleaner look
  main.on('mouseenter', function(){ d3.select(this).select('.main-title').style('opacity', 1); })
      .on('mouseleave', function(){ d3.select(this).select('.main-title').style('opacity', 0.7); });

  // Tooltip
  let tip = d3.select('.tooltip');
  if (tip.empty()) tip = d3.select('body').append('div').attr('class', 'tooltip');

  // Sub tiles
  const sub = main
    .selectAll('g.sub')
    .data((d) => d.children || [])
    .join('g')
    .attr('class', 'sub')
    .attr('transform', (d) => `translate(${d.x0 - d.parent.x0},${d.y0 - d.parent.y0})`);

  sub
    .append('rect')
    .attr('rx', cornerRadius)
    .attr('ry', cornerRadius)
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', (d) => d.x1 - d.x0)
    .attr('height', (d) => d.y1 - d.y0)
    .attr('fill', (d) => fillColor(d))
    .attr('stroke', (d) => strokeColor(d.data.spend || 0))
    .attr('stroke-width', (d) => Math.max(1, spendScale(d.data.spend || 0)))
    .attr('opacity', 0.85)
    .on('mousemove', function (event, d) {
      const impr = d.value || 0;
      const spend = d.data.spend || 0;
      tip
        .style('opacity', 1)
        .style('left', `${event.pageX + 12}px`)
        .style('top', `${event.pageY - 12}px`)
        .html(
          `<div><strong>${d.data.name}</strong></div>` +
            `<div class="k">Main:</div> ${d.parent.data.name}` +
            `<div class="k">Impressions:</div> ${d3.format(',')(Math.round(impr))}` +
            `<div class="k">Spend:</div> $${d3.format(',')(Math.round(spend))}`
        );
    })
    .on('mouseleave', () => tip.style('opacity', 0));

  // Sub labels
  sub
    .append('text')
    .attr('class', 'sub-label')
    .attr('x', 10)
    .attr('y', 18)
    .text((d) => d.data.name)
    .each(function (d) {
      const widthLocal = d.x1 - d.x0;
      const self = d3.select(this);
      const text = d.data.name;
      let truncated = text;
      for (let i = text.length; i > 3; i--) {
        self.text(truncated);
        if (this.getComputedTextLength() < widthLocal - 16) break;
        truncated = text.slice(0, i) + '…';
      }
    });

  // Advertiser-level rects inside each sub tile
  const adv = sub
    .selectAll('g.adv')
    .data((d) => d.children || [])
    .join('g')
    .attr('class', 'adv')
    .attr('transform', (d) => `translate(${d.x0 - d.parent.x0},${d.y0 - d.parent.y0})`);

  adv
    .append('rect')
    .attr('rx', cornerRadius)
    .attr('ry', cornerRadius)
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', (d) => d.x1 - d.x0)
    .attr('height', (d) => d.y1 - d.y0)
    .attr('fill', 'rgba(15,23,42,0.02)')
    .attr('stroke', (d) => strokeColor(d.data.spend || 0))
    .attr('stroke-width', (d) => Math.max(0.8, spendScale(d.data.spend || 0)))
    .attr('opacity', 0.8)
    .on('mousemove', function (event, d) {
      const impr = d.value || 0;
      const spend = d.data.spend || 0;
      tip
        .style('opacity', 1)
        .style('left', `${event.pageX + 12}px`)
        .style('top', `${event.pageY - 12}px`)
        .html(
          `<div><strong>${d.data.name}</strong></div>` +
            `<div class="k">Sub:</div> ${d.parent.data.name}` +
            `<div class="k">Main:</div> ${d.parent.parent.data.name}` +
            `<div class="k">Impressions:</div> ${d3.format(',')(Math.round(impr))}` +
            `<div class="k">Spend:</div> $${d3.format(',')(Math.round(spend))}`
        );
    })
    .on('mouseleave', () => tip.style('opacity', 0));

  // Only show advertiser labels if the tile is big enough
  adv
    .append('text')
    .attr('class', 'sub-label')
    .attr('x', 8)
    .attr('y', 16)
    .text((d) => d.data.name)
    .each(function (d) {
      const localWidth = d.x1 - d.x0;
      const localHeight = d.y1 - d.y0;
      const self = d3.select(this);
      if (localWidth < 80 || localHeight < 24) {
        self.remove();
        return;
      }
      const text = d.data.name;
      let truncated = text;
      for (let i = text.length; i > 3; i--) {
        self.text(truncated);
        if (this.getComputedTextLength() < localWidth - 12) break;
        truncated = text.slice(0, i) + '…';
      }
    });
}


