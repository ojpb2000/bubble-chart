// Packed circles visualization implementation

export function createPackedCircles(options) {
  const { container, data, mode, config, onNodeClick, onNodeHover, onNodeLeave } = options;
  const containerElement = typeof container === 'string' ? document.querySelector(container) : container;
  
  if (!containerElement || !data) {
    if (containerElement) {
      containerElement.innerHTML = '<div style="display:flex; align-items:center; justify-content:center; height:100%; color:#64748b;">No data available</div>';
    }
    return;
  }

  // Clear container
  containerElement.innerHTML = '';
  
  // Set up SVG
  const width = containerElement.clientWidth || 800;
  const height = containerElement.clientHeight || 600;
  
  const svg = d3.select(containerElement)
    .append('svg')
    .attr('width', width)
    .attr('height', height);
  
  // Create color scale
  const color = d3.scaleOrdinal(d3.schemeCategory10);
  
  // Create pack layout
  const pack = d3.pack()
    .size([width, height])
    .padding(3);
  
  // Create hierarchy
  const root = d3.hierarchy(data)
    .sum(d => d.value)
    .sort((a, b) => b.value - a.value);
  
  // Apply pack layout
  pack(root);
  
  // Create nodes
  const nodes = svg.selectAll('g')
    .data(root.descendants().slice(1))
    .enter()
    .append('g')
    .attr('transform', d => `translate(${d.x},${d.y})`);
  
  // Add circles
  nodes.append('circle')
    .attr('r', d => d.r)
    .attr('fill', d => color(d.data.name))
    .attr('stroke', '#fff')
    .attr('stroke-width', 2)
    .style('cursor', 'pointer')
    .on('click', (event, d) => {
      if (onNodeClick) onNodeClick(d);
    })
    .on('mouseover', (event, d) => {
      if (onNodeHover) onNodeHover(d, event);
    })
    .on('mouseout', () => {
      if (onNodeLeave) onNodeLeave();
    });
  
  // Add labels
  nodes.append('text')
    .text(d => d.data.name.length > 10 ? d.data.name.substring(0, 10) + '...' : d.data.name)
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .style('font-size', d => Math.max(8, d.r / 3) + 'px')
    .style('fill', '#fff')
    .style('pointer-events', 'none');
}