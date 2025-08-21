// amCharts implementation for packed circles

export function renderAmChartsPacked(options) {
  const { container, data, blended, onNodeClick } = options;
  const containerElement = typeof container === 'string' ? document.querySelector(container) : container;
  
  if (!containerElement || !data) {
    if (containerElement) {
      containerElement.innerHTML = '<div style="display:flex; align-items:center; justify-content:center; height:100%; color:#64748b;">No data available</div>';
    }
    return;
  }

  // Clear container
  containerElement.innerHTML = '';
  
  // Create amCharts ForceDirected chart
  const chart = am4core.create(containerElement, am4plugins_forceDirected.ForceDirectedTree);
  
  // Set data
  chart.data = data;
  
  // Configure series
  const series = chart.series.push(new am4plugins_forceDirected.ForceDirectedSeries());
  series.dataFields.value = "value";
  series.dataFields.name = "name";
  series.dataFields.children = "children";
  series.dataFields.id = "name";
  series.dataFields.linkWith = "linkWith";
  
  // Configure nodes
  series.nodes.template.label.text = "{name}";
  series.nodes.template.label.fontSize = 12;
  series.nodes.template.label.fill = am4core.color("#fff");
  series.nodes.template.tooltipText = "{name}: {value}";
  series.nodes.template.circle.fill = am4core.color("#ff6b9d");
  series.nodes.template.circle.stroke = am4core.color("#fff");
  series.nodes.template.circle.strokeWidth = 2;
  
  // Configure links
  series.links.template.stroke = am4core.color("#999");
  series.links.template.strokeWidth = 1;
  series.links.template.strokeOpacity = 0.6;
  
  // Add click handler
  if (onNodeClick) {
    series.nodes.template.events.on("hit", function(ev) {
      const dataItem = ev.target.dataItem;
      onNodeClick(dataItem);
    });
  }
  
  // Configure layout
  series.centerStrength = 0.5;
  series.manyBodyStrength = -30;
  series.linkWithStrength = 0.5;
  
  // Set colors based on node type
  series.nodes.template.circle.fill = am4core.color("#ff6b9d");
  series.nodes.template.circle.adapter.add("fill", function(fill, target) {
    const dataItem = target.dataItem;
    if (dataItem && dataItem.dataContext) {
      const type = dataItem.dataContext.type;
      if (type === 'category') return am4core.color("#ff6b9d");
      if (type === 'brand') return am4core.color("#45b7d1");
      if (type === 'advertiser') return am4core.color("#96ceb4");
    }
    return fill;
  });
  
  // Set node size based on value
  series.nodes.template.circle.radius = 10;
  series.nodes.template.circle.adapter.add("radius", function(radius, target) {
    const dataItem = target.dataItem;
    if (dataItem && dataItem.value) {
      return Math.max(5, Math.min(50, Math.sqrt(dataItem.value) * 2));
    }
    return radius;
  });
}