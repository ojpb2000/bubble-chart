// Shared utility functions for the dashboard

export function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

export function loadData(path) {
  return d3.csv(path, d3.autoType);
}

export function buildHierarchy(data, config) {
  // Build hierarchy for visualization
  return {
    name: 'root',
    children: data
  };
}