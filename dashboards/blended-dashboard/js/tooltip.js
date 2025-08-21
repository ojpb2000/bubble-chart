// Tooltip functionality

export function createTooltip() {
  // Create tooltip element if it doesn't exist
  let tooltip = document.getElementById('dashboard-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'dashboard-tooltip';
    tooltip.style.cssText = `
      position: absolute;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 8px;
      border-radius: 4px;
      font-size: 12px;
      pointer-events: none;
      z-index: 1000;
      display: none;
    `;
    document.body.appendChild(tooltip);
  }
  return tooltip;
}

export function showTooltip(node, event, tab) {
  const tooltip = createTooltip();
  tooltip.innerHTML = `
    <strong>${node.name || node.data?.name || 'Unknown'}</strong><br>
    Value: ${node.value || node.data?.value || 0}<br>
    Type: ${node.type || node.data?.type || 'Unknown'}
  `;
  tooltip.style.display = 'block';
  tooltip.style.left = (event.pageX + 10) + 'px';
  tooltip.style.top = (event.pageY - 10) + 'px';
}

export function hideTooltip() {
  const tooltip = document.getElementById('dashboard-tooltip');
  if (tooltip) {
    tooltip.style.display = 'none';
  }
}