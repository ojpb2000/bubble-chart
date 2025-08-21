// Packed Circle Dashboard Main Application
import { DASHBOARD_CONFIG } from '../config.js';

// Import shared utilities (will be created)
// import { loadData, buildHierarchy, formatNumber } from '../../shared/js/utils.js';
// import { createPackedCircles } from './packed-circles.js';
// import { renderAmChartsPacked } from './vendor/amcharts-packed.js';
// import { createTooltip, showTooltip, hideTooltip } from './tooltip.js';

// Application state
const state = {
  data: {
    manufacturer: [],
    dme: [],
    tiktok: [],
    instagram: []
  },
  filtered: {
    manufacturer: [],
    dme: [],
    social: [],
    blended: []
  },
  filters: {
    manufacturer: { ...DASHBOARD_CONFIG.defaultFilters },
    dme: { ...DASHBOARD_CONFIG.defaultFilters },
    social: { ...DASHBOARD_CONFIG.defaultFilters },
    blended: { ...DASHBOARD_CONFIG.defaultFilters, group: 'all' }
  },
  currentTab: DASHBOARD_CONFIG.defaultTab,
  vizMode: 'amcharts',
  selectedNode: null,
  breadcrumb: []
};

// Initialize the application
async function init() {
  try {
    // Load all data sources
    await loadAllData();
    
    // Setup UI components
    setupTabs();
    setupFilters();
    setupControls();
    
    // Ensure default tab is active
    const defaultTab = DASHBOARD_CONFIG.defaultTab;
    
    // Update tab appearance
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${defaultTab}"]`).classList.add('active');
    
    // Update panel visibility
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(defaultTab).classList.add('active');
    
    // Update state
    state.currentTab = defaultTab;
    
    // Create initial visualization
    applyFilters();
    render();
    
    console.log('Packed Circle Dashboard initialized successfully');
  } catch (error) {
    console.error('Error initializing dashboard:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', error.message);
    showError('Failed to load dashboard. Please refresh the page.');
  }
}

// Load data from all sources
async function loadAllData() {
  console.log('Starting data load with paths:', DASHBOARD_CONFIG.dataPaths);
  
  try {
  const [manufacturer, dme, tiktok, instagram] = await Promise.all([
    d3.csv(DASHBOARD_CONFIG.dataPaths.manufacturer, d3.autoType),
    d3.csv(DASHBOARD_CONFIG.dataPaths.dme, d3.autoType),
    d3.csv(DASHBOARD_CONFIG.dataPaths.tiktok, d3.autoType),
    d3.csv(DASHBOARD_CONFIG.dataPaths.instagram, d3.autoType)
  ]);
    
    console.log('Data loaded successfully:', {
      manufacturer: manufacturer.length,
      dme: dme.length,
      tiktok: tiktok.length,
      instagram: instagram.length
    });
  
  // Normalize and store data
  state.data.manufacturer = normalizeData(manufacturer, 'manufacturer');
  state.data.dme = normalizeData(dme, 'dme');
  // Tag social sources by platform so we can distinguish TikTok vs Instagram downstream
  state.data.tiktok = normalizeData(tiktok, 'tiktok');
  state.data.instagram = normalizeData(instagram, 'instagram');
  
    console.log('Data normalized and stored successfully');
    
  } catch (loadError) {
    console.error('Error loading data:', loadError);
    throw loadError;
  }
  

  

}

// Normalize data based on source type
function normalizeData(data, sourceType) {
  if (!data || !Array.isArray(data)) {
    console.error('Invalid data passed to normalizeData:', data, 'sourceType:', sourceType);
    return [];
  }
  
  return data.map(d => {
    const normalized = {
      ...d,
      Main_Category: (d.Main_Category || 'Uncategorized').trim(),
      Sub_Category: (d.Sub_Category || 'Unspecified').trim(),
      Product_Focus: (d.Product_Focus || 'Unspecified').trim(),
      sourceType
    };
    
    if (sourceType === 'social') {
      normalized.company = (d.company || 'Unknown').trim();
      normalized.engagement_total = Number(d.engagement_total) || 0;
      normalized.engagement_rate_by_view = Number(d.engagement_rate_by_view) || 0;
      normalized.likes = Number(d.likes) || 0;
      normalized.views = Number(d.views) || 0;
      normalized.comments = Number(d.comments) || 0;
      normalized.shares = Number(d.shares) || 0;
    } else {
      normalized.Channel = (d.Channel || 'Unspecified').trim();
      normalized.Advertiser = (d.Advertiser || 'Unknown').trim();
      normalized.Impressions = Number(d.Impressions) || 0;
      normalized['Spend (USD)'] = Number(d['Spend (USD)']) || 0;
    }
    
    return normalized;
  });
}

// Setup tab navigation
function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;
      switchTab(tabId);
    });
  });
}

// Switch between tabs
function switchTab(tabId) {
  // Update tab appearance
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
  
  // Update panel visibility
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  
  // Update state
  state.currentTab = tabId;
  
  // Re-render for new tab
    applyFilters();
    render();
}

// Setup filter controls
function setupFilters() {
  // Setup filters for each tab
  setupTabFilters('manufacturer');
  setupTabFilters('dme');
  setupSocialFilters();
  setupBlendedFilters();
}

// Setup filters for manufacturer/dme tabs
function setupTabFilters(type) {
  const data = state.data[type];
  const filterSuffix = type === 'manufacturer' ? 'Manufacturer' : 'DME';
  
  // Product Focus
  const focuses = [...new Set(data.map(d => d.Product_Focus))].filter(Boolean).sort();
  populateSelect(`focusFilter${filterSuffix}`, focuses, (value) => {
    state.filters[type].productFocus = value;
    applyFilters();
    render();
  });
  
  // Channel
  const channels = [...new Set(data.map(d => d.Channel))].filter(Boolean).sort();
  populateSelect(`channelFilter${filterSuffix}`, channels, (value) => {
    state.filters[type].channel = value;
    applyFilters();
    render();
  });
  
  // Advertiser
  const advertisers = [...new Set(data.map(d => d.Advertiser))].filter(Boolean).sort();
  populateSelect(`advertiserFilter${filterSuffix}`, advertisers, (value) => {
    state.filters[type].advertiser = value;
    applyFilters();
    render();
  });
  
  // Visualization Mode
  const vizModes = [
    { value: 'amcharts', label: 'amCharts Force-Directed' },
    { value: 'nested', label: 'Nested Circles' },
    { value: 'force', label: 'Force Layout' },
    { value: 'grid', label: 'Grid Layout' }
  ];
  populateSelect(`vizMode${filterSuffix}`, vizModes, (value) => {
    state.vizMode = value;
    render();
  }, true);
  
  // Main Category filters
  setupMainCategoryFilter(type, filterSuffix);
}

// Setup social media specific filters
function setupSocialFilters() {
  const socialData = [...(state.data.tiktok || []), ...(state.data.instagram || [])];
  
  // Platform filter
  const platforms = [
    { value: 'all', label: 'All Platforms' },
    { value: 'tiktok', label: 'TikTok Only' },
    { value: 'instagram', label: 'Instagram Only' }
  ];
  populateSelect('platformFilter', platforms, (value) => {
    state.filters.social.platform = value;
    applyFilters();
    render();
  }, true);
  
  // Company filter
  const companies = [...new Set(socialData.map(d => d.company))].filter(Boolean).sort();
  populateSelect('companyFilterSocial', companies, (value) => {
    state.filters.social.company = value;
    applyFilters();
    render();
  });
}

// Setup filters for Blended Analysis
function setupBlendedFilters() {
  const data = state.filtered.blended.length ? state.filtered.blended : [...state.data.manufacturer, ...state.data.dme];

  // Product Focus
  const focuses = [...new Set(data.map(d => d.Product_Focus))].filter(Boolean).sort();
  populateSelect('focusFilterBlended', focuses, (value) => {
    state.filters.blended.productFocus = value;
    applyFilters();
    render();
  });

  // Channel
  const channels = [...new Set(data.map(d => d.Channel))].filter(Boolean).sort();
  populateSelect('channelFilterBlended', channels, (value) => {
    state.filters.blended.channel = value;
    applyFilters();
    render();
  });

  // Advertiser (Brand Root or Advertiser unified)
  const advertisers = [...new Set(data.map(d => d['Brand Root'] || d.Advertiser))].filter(Boolean).sort();
  populateSelect('advertiserFilterBlended', advertisers, (value) => {
    state.filters.blended.advertiser = value;
    applyFilters();
    render();
  });

  // Group filter (Manufacturer vs DME)
  const groupSelect = document.getElementById('groupFilterBlended');
  if (groupSelect) {
    groupSelect.addEventListener('change', () => {
      state.filters.blended.group = groupSelect.value;
      applyFilters();
      render();
    });
  }

  // Main Category checkbox filter
  const mainFilter = document.getElementById('mainFilterBlended');
  if (mainFilter) {
    const mains = [...new Set(data.map(d => d.Main_Category))].filter(Boolean).sort();
    state.filters.blended.mainCategories = new Set(mains);
    mainFilter.innerHTML = '';
    mains.forEach(m => {
      const label = document.createElement('label');
      label.style.cssText = 'display:flex;align-items:center;gap:6px;cursor:pointer;';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = true;
      cb.addEventListener('change', () => {
        if (cb.checked) state.filters.blended.mainCategories.add(m);
        else state.filters.blended.mainCategories.delete(m);
        applyFilters();
        render();
      });
      const span = document.createElement('span');
      span.textContent = m;
      label.appendChild(cb);
      label.appendChild(span);
      mainFilter.appendChild(label);
    });
  }
}

// Helper function to populate select elements
function populateSelect(elementId, options, onChange, useObjects = false) {
  const select = document.getElementById(elementId);
  if (!select) return;
  
  // Clear existing options (except the first "All" option if it exists)
  const firstOption = select.firstElementChild;
  select.innerHTML = '';
  if (firstOption && firstOption.value === 'all') {
    select.appendChild(firstOption);
  }
  
  // Add new options
  options.forEach(option => {
    const opt = document.createElement('option');
    if (useObjects) {
      opt.value = option.value;
      opt.textContent = option.label;
    } else {
      opt.value = option;
      opt.textContent = option;
    }
    select.appendChild(opt);
  });
  
  // Add change event listener
  select.addEventListener('change', () => onChange(select.value));
}

// Setup main category checkbox filters
function setupMainCategoryFilter(type, suffix) {
  const container = document.getElementById(`mainFilter${suffix}`);
  if (!container) return;
  
  const categories = [...new Set(state.data[type].map(d => d.Main_Category))].filter(Boolean).sort();
  
  container.innerHTML = '';
  categories.forEach(category => {
    const label = document.createElement('label');
    label.style.cssText = 'display:flex; align-items:center; gap:6px; cursor:pointer;';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    checkbox.addEventListener('change', () => {
      if (!state.filters[type].mainCategories) {
        state.filters[type].mainCategories = new Set(categories);
      }
      
      if (checkbox.checked) {
        state.filters[type].mainCategories.add(category);
      } else {
        state.filters[type].mainCategories.delete(category);
      }
      
      applyFilters();
      render();
    });
    
    const span = document.createElement('span');
    span.textContent = category;
    
    label.appendChild(checkbox);
    label.appendChild(span);
    container.appendChild(label);
  });
  
  // Initialize the filter set
  state.filters[type].mainCategories = new Set(categories);
}

// Setup additional controls
function setupControls() {
  // Add any additional control setup here
  console.log('Controls setup completed');
}

// Apply filters to data
function applyFilters() {
  // Filter manufacturer data
  state.filtered.manufacturer = filterData(state.data.manufacturer || [], state.filters.manufacturer, 'manufacturer');
  
  // Filter DME data
  state.filtered.dme = filterData(state.data.dme || [], state.filters.dme, 'dme');
  
  // Filter social data
  let socialData = [...(state.data.tiktok || []), ...(state.data.instagram || [])];
  if (state.filters.social.platform !== 'all') {
    socialData = socialData.filter(d => d.sourceType === state.filters.social.platform);
  }
  state.filtered.social = filterData(socialData, state.filters.social, 'social');

  // Blended: combine manufacturer + dme with proper source tagging
  const blendedData = [
    ...state.data.manufacturer.map(d => ({...d, sourceType: 'manufacturer'})),
    ...state.data.dme.map(d => ({...d, sourceType: 'dme'}))
  ];
  // Apply blended-specific filters
  let dataBlended = blendedData;
  const f = state.filters.blended;
  if (f.group && f.group !== 'all') {
    dataBlended = dataBlended.filter(d => d.sourceType === f.group);
  }
  if (f.productFocus && f.productFocus !== 'all') {
    dataBlended = dataBlended.filter(d => (d.Product_Focus || '').toLowerCase().includes(f.productFocus.toLowerCase()));
  }
  if (f.channel && f.channel !== 'all') {
    dataBlended = dataBlended.filter(d => d.Channel === f.channel);
  }
  if (f.advertiser && f.advertiser !== 'all') {
    dataBlended = dataBlended.filter(d => (d['Brand Root'] || d.Advertiser) === f.advertiser);
  }
  if (f.mainCategories && f.mainCategories.size) {
    dataBlended = dataBlended.filter(d => f.mainCategories.has(d.Main_Category));
  }
  state.filtered.blended = dataBlended;
  

}

// Filter data based on current filters
function filterData(data, filters, type) {
  if (!data || !Array.isArray(data)) {
    console.warn('Invalid data passed to filterData:', data, 'type:', type);
    return [];
  }
  
  return data.filter(d => {
    // Product Focus filter
    if (filters.productFocus !== 'all' && 
        !d.Product_Focus.toLowerCase().includes(filters.productFocus.toLowerCase())) {
      return false;
    }
    
    // Channel filter (for non-social data)
    if (type !== 'social' && filters.channel !== 'all' && d.Channel !== filters.channel) {
      return false;
    }
    
    // Advertiser filter (for non-social data)
    if (type !== 'social' && filters.advertiser !== 'all' && d.Advertiser !== filters.advertiser) {
      return false;
    }
    
    // Company filter (for social data)
    if (type === 'social' && filters.company !== 'all' && d.company !== filters.company) {
      return false;
    }
    
    // Main Category filter
    if (filters.mainCategories && !filters.mainCategories.has(d.Main_Category)) {
      return false;
    }
    
    return true;
  });
}

// Main render function
function render() {
  const currentTab = state.currentTab;
  
  console.log('Rendering tab:', currentTab);
  console.log('Filtered data counts:', {
    manufacturer: state.filtered.manufacturer?.length || 0,
    dme: state.filtered.dme?.length || 0,
    social: state.filtered.social?.length || 0,
    blended: state.filtered.blended?.length || 0
  });
  

  

  
  if (currentTab === 'manufacturer-circles') {
    renderPacked('manufacturer', '#packedCirclesManufacturer');
  } else if (currentTab === 'dme-circles') {
    renderPacked('dme', '#packedCirclesDME');
  } else if (currentTab === 'social-circles') {
    renderPacked('social', '#packedCirclesSocial');
  } else if (currentTab === 'blended-circles') {
    renderPackedBlended('#packedCirclesBlended');
  } else if (currentTab === 'comparative-circles') {
    renderComparative();
  }
}

// Render packed circles for a specific data type
function renderPacked(dataType, containerId) {
  const data = state.filtered[dataType];
  const container = document.querySelector(containerId);
  

  
  if (!container || !data.length) {
    if (container) {
      container.innerHTML = '<div style="display:flex; align-items:center; justify-content:center; height:100%; color:#64748b;">No data available for current filters</div>';
    }
    return;
  }
  
  // Build hierarchy for packed circles
  let hierarchy;
  if (state.vizMode === 'amcharts') {
    // Special hierarchy: Main_Category → Brand Root/Advertiser (fewer circles)
    hierarchy = buildMainBrandHierarchy(data, dataType);

    renderAmChartsPacked({ container: containerId, data: hierarchy });
    return;
  }

  hierarchy = buildPackedHierarchy(data, dataType);

  // Default D3 modes
  createPackedCircles({
    container: containerId,
    data: hierarchy,
    mode: state.vizMode,
    config: DASHBOARD_CONFIG,
    onNodeClick: (node) => handleNodeClick(node, dataType),
    onNodeHover: (node, event) => handleNodeHover(node, event),
    onNodeLeave: () => hideTooltip()
  });
}

// Build hierarchy specifically for packed circles
function buildPackedHierarchy(data, dataType) {
  const config = DASHBOARD_CONFIG.metrics[dataType === 'social' ? 'social' : dataType];
  
  // Group by Main_Category → Sub_Category → Advertiser/Company
  const grouped = d3.group(data, 
    d => d.Main_Category,
    d => d.Sub_Category,
    d => dataType === 'social' ? d.company : d.Advertiser
  );
  
  const children = [];
  
  grouped.forEach((subMap, mainCategory) => {
    const subChildren = [];
    let mainValue = 0;
    let mainSecondary = 0;
    
    subMap.forEach((advMap, subCategory) => {
      const advChildren = [];
      let subValue = 0;
      let subSecondary = 0;
      
      advMap.forEach((items, advertiser) => {
        const value = d3.sum(items, d => d[config.primary] || 0);
        const secondary = d3.sum(items, d => d[config.secondary] || 0);
        
        advChildren.push({
          name: advertiser,
          value: value,
          secondary: secondary,
          type: 'advertiser',
          data: items
        });
        
        subValue += value;
        subSecondary += secondary;
      });
      
      subChildren.push({
        name: subCategory,
        value: subValue,
        secondary: subSecondary,
        type: 'subcategory',
        children: advChildren
      });
      
      mainValue += subValue;
      mainSecondary += subSecondary;
    });
    
    children.push({
      name: mainCategory,
      value: mainValue,
      secondary: mainSecondary,
      type: 'category',
      children: subChildren
    });
  });
  
  return {
    name: 'root',
    children: children
  };
}

// Build hierarchy for amCharts mode: Main_Category -> Brand Root (or Advertiser)
function buildMainBrandHierarchy(data, dataType) {
  // Choose label field for brand
  const brandField = (row) => (row['Brand Root'] || row.Advertiser || row.company || 'Unknown');
  // Primary metric by type
  const metric = dataType === 'social' ? 'engagement_total' : 'Impressions';
  const secondary = dataType === 'social' ? 'engagement_rate_by_view' : 'Spend (USD)';

  // Group by Main_Category then Brand
  const byMain = d3.group(data, d => d.Main_Category || 'Uncategorized');
  const children = [];

  for (const [main, rowsOfMain] of byMain) {
    const byBrand = d3.group(rowsOfMain, r => brandField(r));
    const brandChildren = [];
    let mainValue = 0; let mainSecondary = 0;

    for (const [brand, items] of byBrand) {
      const value = d3.sum(items, d => Number(d[metric]) || 0);
      const sec = d3.sum(items, d => Number(d[secondary]) || 0);
      mainValue += value; mainSecondary += sec;
      brandChildren.push({ name: brand, value: Math.max(value, 1), secondary: sec, type: 'brand', items });
    }

    // Sort brands by value desc
    brandChildren.sort((a,b) => b.value - a.value);

    children.push({ name: main, value: Math.max(mainValue, 1), secondary: mainSecondary, type: 'category', children: brandChildren });
  }

  // Sort categories by total value desc
  children.sort((a,b) => b.value - a.value);
  return { name: 'root', children };
}

// Render blended hierarchy: Main_Category -> Brand Root (combined Manufacturer + DME)
function renderPackedBlended(containerId) {
  const rows = state.filtered.blended;
  const container = document.querySelector(containerId);
  

  
  if (!container || !rows.length) {
    if (container) container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;">No data available</div>';
    return;
  }

  // Helper mappers
  const norm = (s) => (s || 'Unknown').toString().trim().toLowerCase();
  const brandKey = (r) => norm(r['Brand Root'] || r.Advertiser || r.company);
  const brandLabel = (r) => (r['Brand Root'] || r.Advertiser || r.company || 'Unknown');

  // Build quick social index by brand/company and also by platform
  const socialAll = [...state.data.tiktok, ...state.data.instagram];
  const socialByBrand = d3.group(socialAll, s => norm(s.company));

  // Metric helpers
  const impressions = (arr) => d3.sum(arr, d => Number(d['Impressions']) || 0);
  const spend = (arr) => d3.sum(arr, d => Number(d['Spend (USD)']) || 0);
  const engagement = (arr) => d3.sum(arr, d => Number(d.engagement_total) || 0);

  // Group by Main Category
  const byMain = d3.group(rows, d => d.Main_Category || 'Uncategorized');
  const categories = [];

  for (const [main, rowsOfMain] of byMain) {
    let mainValue = 0; let mainSecondary = 0;

    // Split current main rows into manufacturer/dme
    const manufRows = rowsOfMain.filter(r => (r.sourceType || 'manufacturer') === 'manufacturer');
    const dmeRows = rowsOfMain.filter(r => (r.sourceType || 'manufacturer') === 'dme');

    // Build brand maps per group
    const manufByBrand = d3.group(manufRows, r => brandKey(r));
    const dmeByBrand = d3.group(dmeRows, r => brandKey(r));
    // Universe of brands in this main
    const allBrandKeys = new Set([...manufByBrand.keys(), ...dmeByBrand.keys()]);

    // Build group nodes
    const groups = [
      { key: 'manufacturer', label: 'Manufacturer Brands', map: manufByBrand },
      { key: 'dme', label: 'DME Brands', map: dmeByBrand }
    ];

    const groupChildren = [];
    for (const g of groups) {
      const brands = [];
      let groupValue = 0; let groupSecondary = 0;
      for (const bk of allBrandKeys) {
        const items = g.map.get(bk);
        if (!items || !items.length) continue;
        const label = brandLabel(items[0]);

        // Channel breakdown for this brand within the group
        const byChannel = d3.group(items, r => r.Channel || 'Unspecified');
        const channelChildren = [];
        byChannel.forEach((chanItems, channel) => {
          const v = impressions(chanItems);
          const s = spend(chanItems);
          channelChildren.push({ name: channel, value: Math.max(v,1), secondary: s, type: 'channel', items: chanItems });
        });

        // Add social channels mapped by brand/company
        const socialItems = socialByBrand.get(bk) || [];
        if (socialItems.length) {
          const tik = socialItems.filter(x => (x.sourceType || '').toLowerCase() === 'tiktok');
          const ig = socialItems.filter(x => (x.sourceType || '').toLowerCase() === 'instagram');
          if (tik.length) {
            const v = engagement(tik);
            channelChildren.push({ name: 'TikTok', value: Math.max(v,1), secondary: 0, type: 'channel', items: tik });
          }
          if (ig.length) {
            const v = engagement(ig);
            channelChildren.push({ name: 'Instagram', value: Math.max(v,1), secondary: 0, type: 'channel', items: ig });
          }
        }

        // Aggregate brand totals for this group
        const vBrand = d3.sum(channelChildren, c => c.value || 0);
        const sBrand = d3.sum(channelChildren, c => c.secondary || 0);
        groupValue += vBrand; groupSecondary += sBrand;

        brands.push({
          name: label,
          value: Math.max(vBrand, 1),
          secondary: sBrand,
          type: 'brand',
          children: channelChildren,
          // Provide breakdown so vendor coloring can differentiate
          sourceBreakdown: { manufacturer: g.key === 'manufacturer' ? vBrand : 0, dme: g.key === 'dme' ? vBrand : 0 }
        });
      }

      // Sort brands by value desc
      brands.sort((a,b) => b.value - a.value);
      mainValue += groupValue; mainSecondary += groupSecondary;
      groupChildren.push({ name: g.label, value: Math.max(groupValue,1), secondary: groupSecondary, type: 'group', group: g.key, children: brands });
    }

    categories.push({ name: main, value: Math.max(mainValue,1), secondary: mainSecondary, type: 'category', children: groupChildren });
  }

  // Sort categories by value desc
  categories.sort((a,b) => b.value - a.value);
  const hierarchy = { name: 'root', children: categories };

  // Render with amCharts and wire blended detail click handler
  console.log('About to render amCharts with hierarchy:', hierarchy);
  console.log('Container:', containerId, document.querySelector(containerId));
  renderAmChartsPacked({ container: containerId, data: hierarchy, blended: true, onNodeClick: handleBlendedNodeClick });
}

// Drive blended detail panels from chart selection
function handleBlendedNodeClick(payload) {
  const titleEl = document.getElementById('bp-title');
  const spendEl = document.querySelector('#bp-spend .value');
  const spendHint = document.querySelector('#bp-spend .hint');
  const imprEl = document.querySelector('#bp-impr .value');
  const engEl = document.querySelector('#bp-eng .value');
  const qList = document.getElementById('bp-quotes-list');
  const takeawaysEl = document.getElementById('bp-takeaways-body');
  const adsGal = document.getElementById('bp-top-ads-gallery');
  const socialGal = document.getElementById('bp-top-social-gallery');
  const adsMoreBtn = document.getElementById('bp-ads-more');
  const socialMoreBtn = document.getElementById('bp-social-more');
  const adsAn = document.getElementById('bp-ads-analysis-body');
  const socialAn = document.getElementById('bp-social-analysis-body');
  const adsMix = document.getElementById('bp-ads-mix-body');
  const socialMix = document.getElementById('bp-social-mix-body');
  const adsCountEl = document.querySelector('#bp-ads-count .value');
  const postsCountEl = document.querySelector('#bp-posts-count .value');

  // payload is an amCharts dataItem
  const dataItem = payload;
  const dc = dataItem && dataItem.dataContext ? dataItem.dataContext : {};
  const sel = dc || {};
  const type = (sel && sel.type) || 'category';
  const name = (sel && sel.name) || 'Selection';
  // If node has no direct items, aggregate from all descendant leaves
  let items = Array.isArray(sel && sel.items) ? sel.items : [];
  if ((!items || items.length === 0) && dataItem) {
    const collected = [];
    const visit = (di) => {
      const cdc = di && di.dataContext;
      if (cdc && Array.isArray(cdc.items) && cdc.items.length) collected.push(...cdc.items);
      if (di && di.children) di.children.each(child => visit(child));
    };
    visit(dataItem);
    items = collected;
  }

  // Build hierarchical title: Category, Category + Brand, or Category + Brand + Channel
  let categoryName = '';
  // Resolve current main category from ancestry (used by analyses)
  const resolveAncestorName = (di, wanted) => {
    let cur = di;
    while (cur) {
      const cdc = cur.dataContext || {};
      if (cdc.type === wanted) return cdc.name || '';
      cur = cur.parent;
    }
    return '';
  };
  const mainCategoryName = resolveAncestorName(dataItem, 'category');

  if (titleEl) {
    let brandName = '';
    let channelName = '';
    if (dataItem) {
      // Walk up to find names by type
      let di = dataItem;
      while (di) {
        const cdc = di.dataContext || {};
        if (cdc.type === 'category') categoryName = cdc.name || categoryName;
        if (cdc.type === 'brand') brandName = cdc.name || brandName;
        if (cdc.type === 'channel' && !channelName) channelName = cdc.name || '';
        di = di.parent;
      }
    }
    const parts = [];
    if (mainCategoryName) parts.push(mainCategoryName);
    if (brandName) parts.push(brandName);
    if (channelName) parts.push(channelName);
    titleEl.textContent = parts.length ? parts.join(' — ') : name;
  }

  const spend = d3.sum(items, d => Number(d['Spend (USD)'] || 0));
  const impr = d3.sum(items, d => Number(d['Impressions'] || 0) + Number(d['estimated_impressions'] || 0));
  const eng = d3.sum(items, d => Number(d['engagement_total'] || 0));
  if (spendEl) spendEl.textContent = `$${(spend||0).toLocaleString()}`;
  if (spendHint) spendHint.textContent = `${name}`;
  if (imprEl) imprEl.textContent = (impr||0).toLocaleString();
  if (engEl) engEl.textContent = (eng||0).toLocaleString();
  if (adsCountEl) {
    const adsOnly = items.filter(d => (d.sourceType === 'manufacturer' || d.sourceType === 'dme'));
    adsCountEl.textContent = adsOnly.length.toLocaleString();
  }
  if (postsCountEl) {
    const smOnly = items.filter(d => (String(d.sourceType||'').toLowerCase()==='instagram' || String(d.sourceType||'').toLowerCase()==='tiktok'));
    postsCountEl.textContent = smOnly.length.toLocaleString();
  }

  if (qList) {
    qList.innerHTML = '';
    const candidates = items.map(d => ({
      text: d.Text_x || d.Text_y || d.message || d.overall_description || d.text_detected || d.link_title || '',
      url: d.post_link || d.posted_url || d.link || d['URL_to_use'] || d['Link To Creative'] || ''
    })).filter(x => x.text && x.text.trim() && !/no media file specified/i.test(x.text));
    candidates.slice(0,5).forEach(q => { const li=document.createElement('li'); const a=document.createElement('a'); a.textContent = `“${q.text.slice(0,140)}${q.text.length>140?'…':''}”`; a.href=q.url||'#'; a.target='_blank'; li.appendChild(a); qList.appendChild(li); });
  }

  if (adsGal) {
    adsGal.innerHTML = '';
    const ads = items.filter(d => (d.sourceType === 'manufacturer' || d.sourceType === 'dme'));
    const getUrl = (d) => d['Link To Creative'] || d['Link to Creative'] || d['URL_to_use'] || d.Landing_Page || d.image || '';
    const withMedia = ads.map(d => ({ url: getUrl(d), impressions: Number(d.Impressions||0) })).filter(x => x.url);
    withMedia.sort((a,b)=>b.impressions-a.impressions);
    const render = (limit=6) => {
      adsGal.innerHTML = '';
      withMedia.slice(0,limit).forEach(m => { const img=document.createElement('img'); img.src=m.url; img.onclick=()=>window.open(m.url,'_blank'); adsGal.appendChild(img); });
    };
    const top = withMedia.slice(0,6);
    if (top.length === 0) {
      adsGal.innerHTML = '<div style="color:#94a3b8; font-size:12px;">No creatives found</div>';
    } else {
      render(6);
      if (adsMoreBtn) {
        adsMoreBtn.onclick = () => {
          const expanded = adsMoreBtn.dataset.expanded === '1';
          if (!expanded) { render(50); adsMoreBtn.textContent = 'Show top 6'; adsMoreBtn.dataset.expanded = '1'; }
          else { render(6); adsMoreBtn.textContent = 'Show top 50'; adsMoreBtn.dataset.expanded = '0'; }
        };
        adsMoreBtn.dataset.expanded = '0';
      }
    }
  }

  if (socialGal) {
    socialGal.innerHTML = '';
    // Only IG/TikTok sources
    const social = items.filter(d => {
      const st = (d.sourceType || '').toLowerCase();
      return st === 'instagram' || st === 'tiktok';
    });
    const withImg = social.map(d => ({ url: d.image || d.media_file || '', engagement: Number(d.engagement_total||0), link: d.post_link || d.link || d.posted_url || '' })).filter(x => x.url);
    withImg.sort((a,b)=>b.engagement-a.engagement);
    const renderS = (limit=6) => {
      socialGal.innerHTML = '';
      withImg.slice(0,limit).forEach(m => { const img=document.createElement('img'); img.src=m.url; img.onclick=()=>window.open(m.link||m.url,'_blank'); socialGal.appendChild(img); });
    };
    const topS = withImg.slice(0,6);
    if (topS.length === 0) {
      socialGal.innerHTML = '<div style="color:#94a3b8; font-size:12px;">No social posts found</div>';
    } else {
      renderS(6);
      if (socialMoreBtn) {
        socialMoreBtn.onclick = () => {
          const expanded = socialMoreBtn.dataset.expanded === '1';
          if (!expanded) { renderS(50); socialMoreBtn.textContent = 'Show top 6'; socialMoreBtn.dataset.expanded = '1'; }
          else { renderS(6); socialMoreBtn.textContent = 'Show top 50'; socialMoreBtn.dataset.expanded = '0'; }
        };
        socialMoreBtn.dataset.expanded = '0';
      }
    }
  }

  if (takeawaysEl) {
    try {
      const adsOnly = items.filter(d => (d.sourceType === 'manufacturer' || d.sourceType === 'dme'));
      const socialRows = items.filter(d => {
        const st = (d.sourceType || '').toLowerCase();
        return st === 'instagram' || st === 'tiktok';
      });
      
      // Get all data for category benchmark calculation - with fallback
      let allAdsData = [];
      let allSocialData = [];
      
      if (state && state.raw) {
        allAdsData = state.raw.filter(d => (d.sourceType === 'manufacturer' || d.sourceType === 'dme'));
        allSocialData = state.raw.filter(d => {
          const st = (d.sourceType || '').toLowerCase();
          return st === 'instagram' || st === 'tiktok';
        });
      } else {
        // Fallback: use current items if state.raw is not available
        allAdsData = adsOnly;
        allSocialData = socialRows;
      }
      
      console.log('Key takeaways debug:', {
        adsOnly: adsOnly.length,
        socialRows: socialRows.length,
        allAdsData: allAdsData.length,
        allSocialData: allSocialData.length,
        mainCategoryName,
        contextLabel: titleEl ? titleEl.textContent : 'Selection'
      });
      
      takeawaysEl.innerHTML = generateKeyTakeaways(adsOnly, socialRows, allAdsData, allSocialData, titleEl ? titleEl.textContent : 'Selection', mainCategoryName);
    } catch (e) {
      console.warn('Key takeaways error:', e);
      takeawaysEl.innerHTML = '<ul><li>Communication style and narrative focus summarized here.</li><li>Product vs. emotional balance; collaborations/influencers highlights.</li><li>Cultural gaps or needs addressed.</li></ul>';
    }
  }
  if (adsAn) {
    adsAn.textContent = 'Preparing analysis…';
    try {
      const adsOnly = items.filter(d => (d.sourceType === 'manufacturer' || d.sourceType === 'dme'));
      adsAn.innerHTML = generateAdsAnalysis(adsOnly, titleEl ? titleEl.textContent : 'Selection', mainCategoryName);
    } catch (e) {
      console.warn('Ads analysis error:', e);
      adsAn.textContent = 'No paid ads in this selection or data format not recognized.';
    }
  }
  if (socialAn) {
    socialAn.textContent = 'Preparing analysis…';
    try {
      const socialRows = items.filter(d => {
        const st = (d.sourceType || '').toLowerCase();
        return st === 'instagram' || st === 'tiktok';
      });
      socialAn.innerHTML = generateSocialAnalysis(socialRows, titleEl ? titleEl.textContent : 'Selection', mainCategoryName);
    } catch (e) {
      console.warn('Social analysis error:', e);
      socialAn.textContent = 'No social posts in this selection or data format not recognized.';
    }
  }

  // Ads mix: compute ONLY on Pathmatics ads (manufacturer + dme)
  const adsOnly = items.filter(d => (d.sourceType === 'manufacturer' || d.sourceType === 'dme'));
  const socialChanRe = /(facebook|instagram|tiktok|snapchat|pinterest|reddit|twitter|linkedin)/i;
  let countDisplay = 0, countVideo = 0, countSocial = 0;
  adsOnly.forEach(d => {
    const ch = String(d.Channel || '').toLowerCase();
    const ctype = String(d['Creative Type_x'] || d['Creative Type_y'] || '').toLowerCase();
    if (socialChanRe.test(ch)) {
      countSocial += 1;
    } else if (ch.includes('youtube') || ctype.includes('video')) {
      countVideo += 1;
    } else {
      countDisplay += 1;
    }
  });
  const denom = adsOnly.length;
  if (adsMix) {
    try {
      if (!denom) {
        adsMix.textContent = 'No paid ads in selection';
      } else {
        adsMix.textContent = `Display ${Math.round(countDisplay/denom*100)}%, Video ${Math.round(countVideo/denom*100)}%, Social ${Math.round(countSocial/denom*100)}%`;
      }
    } catch (e) {
      console.warn('Ads mix error', e);
      adsMix.textContent = '';
    }
  }

  // Social mix: compute ONLY on IG/TikTok rows
  const socialRows = items.filter(d => {
    const st = (d.sourceType || '').toLowerCase();
    return st === 'instagram' || st === 'tiktok';
  });
  const totalSm = socialRows.length || 1;
  const ugc = socialRows.filter(d => String(d.post_tag_ugc||'').toLowerCase() === '1');
  const influencers = socialRows.filter(d => {
    const txt = `${d.message||''} ${d.overall_description||''} ${d.link_title||''}`;
    return /(influencer|creator|ambassador|affiliate)/i.test(txt);
  });
  const collabs = socialRows.filter(d => {
    const txt = `${d.message||''} ${d.overall_description||''} ${d.link_title||''}`;
    return /(collab|collaboration|partner|partnership|\bx\b)/i.test(txt);
  });
  // Owned = total - (ugc + influencers + collabs) [clamped >= 0].
  // Note: categories may overlap; if so, owned is conservative (but never negative).
  const ownedCount = Math.max(0, totalSm - (ugc.length + influencers.length + collabs.length));
  const ownedPct = Math.round((ownedCount/totalSm)*100);
  const ugcPct = Math.round((ugc.length/totalSm)*100);
  const inflPct = Math.round((influencers.length/totalSm)*100);
  const collabPct = Math.round((collabs.length/totalSm)*100);
  if (socialMix) {
    try {
      if (socialRows.length === 0) socialMix.textContent = 'No social posts in selection';
      else socialMix.textContent = `Owned ${ownedPct}%, UGC ${ugcPct}%, Influencers ${inflPct}%, Collabs ${collabPct}%`;
    } catch (e) {
      console.warn('Social mix error', e);
      socialMix.textContent = '';
    }
  }
}

// Enhanced social media analysis focused on best performing Instagram and TikTok posts
function generateSocialAnalysis(rows, contextLabel, mainCategoryName) {
  if (!rows || rows.length === 0) {
    return '<p>No social posts matched the current selection.</p>';
  }

  // Get top performing posts by engagement
  const topPosts = rows
    .map(post => ({
      ...post,
      engagement: Number(post.engagement_total || 0),
      likes: Number(post.likes || 0),
      comments: Number(post.comments || 0),
      shares: Number(post.shares || 0),
      estimated_impressions: Number(post.estimated_impressions || 0)
    }))
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 5);

  // Analyze content themes
  const THEME_RULES = [
    { key: 'Product Features', re: /(wearable|hands[- ]?free|portable|discreet|quiet|battery|app|track|suction|flange|parts|lanolin|milk|bottle|pump)/i },
    { key: 'Benefits & Comfort', re: /(comfort|easy|ease|gentle|quiet|discreet|wireless|value|affordable|deal|save|offer|sale)/i },
    { key: 'Motherhood & Lifestyle', re: /(mom|mother|parents?|family|baby|newborn|postpartum|nursing|maternity|sleep|night|work|return to work|on the go|travel)/i },
    { key: 'Education & Tips', re: /(tip|how to|guide|learn|tutorial|faq|q&a|advice|step|instruction)/i },
    { key: 'Promotions', re: /(sale|discount|offer|off\b|code|gift|free|bundle|promo)/i },
    { key: 'Emotional Connection', re: /(love|care|support|confidence|empower|beautiful|special|moment|connection|journey)/i },
    { key: 'Real Stories', re: /(real|story|experience|testimonial|review|honest|truth)/i },
    { key: 'Community', re: /(community|together|moms|parents|group|support)/i }
  ];

  const detectThemes = (text) => {
    if (!text) return [];
    const textLower = String(text).toLowerCase();
    const detected = [];
    THEME_RULES.forEach(theme => {
      if (theme.re.test(textLower)) {
        detected.push(theme.key);
      }
    });
    return detected;
  };

  // Analyze themes in top posts
  const themeCounts = {};
  topPosts.forEach(post => {
    const combinedText = `${post.message || ''} ${post.overall_description || ''} ${post.link_title || ''} ${post.text_detected || ''}`;
    const themes = detectThemes(combinedText);
    themes.forEach(theme => {
      themeCounts[theme] = (themeCounts[theme] || 0) + 1;
    });
  });

  const topThemes = Object.entries(themeCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([theme]) => theme);

  // Get top performing post details
  const bestPost = topPosts[0];
  const bestPostText = bestPost ? `${bestPost.message || bestPost.overall_description || bestPost.link_title || 'No text available'}`.substring(0, 120) + '...' : 'No post data available';
  const bestPostPlatform = bestPost ? (bestPost.sourceType || 'Unknown').toUpperCase() : 'Unknown';
  const bestPostEngagement = bestPost ? bestPost.engagement.toLocaleString() : '0';
  const bestPostImpressions = bestPost ? bestPost.estimated_impressions.toLocaleString() : '0';
  const bestPostType = bestPost ? (bestPost.post_type || 'Unknown') : 'Unknown';

  // Calculate overall metrics
  const totalEngagement = d3.sum(rows, d => Number(d.engagement_total || 0));
  const totalImpressions = d3.sum(rows, d => Number(d.estimated_impressions || 0));
  const avgEngagementRate = totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0;

  // Analyze content mix
  const isUGC = (d) => String(d.post_tag_ugc || '').toLowerCase() === '1' || /ugc|customer|testimonial|real mom/i.test(`${d.message || ''} ${d.overall_description || ''}`);
  const isInfluencer = (d) => /(influencer|creator|ambassador|affiliate)/i.test(`${d.message || ''} ${d.overall_description || ''}`);
  const isCollab = (d) => /(collab|collaboration|partner|partnership|\bx\b)/i.test(`${d.message || ''} ${d.overall_description || ''}`);
  
  const total = rows.length;
  const pct = (n) => Math.round((n / Math.max(total, 1)) * 100);
  const pUGC = pct(rows.filter(isUGC).length);
  const pINF = pct(rows.filter(isInfluencer).length);
  const pCOL = pct(rows.filter(isCollab).length);

  // Format analysis
  const videos = rows.filter(d => (String(d.post_type || '').toLowerCase() === 'video') || String(d.sourceType || '').toLowerCase() === 'tiktok').length;
  const photos = rows.filter(d => String(d.post_type || '').toLowerCase() === 'photo').length;

  // Generate analysis paragraphs
  const catContext = mainCategoryName ? ` in the "${mainCategoryName}" category` : '';
  const p1 = `The best performing social post in ${contextLabel}${catContext} is a ${bestPostType} from ${bestPostPlatform} with ${bestPostEngagement} total engagements and ${bestPostImpressions} estimated impressions. This post focuses on "${bestPostText.substring(0, 80)}..." and demonstrates strong audience connection with an engagement rate of ${bestPost ? ((bestPost.engagement / bestPost.estimated_impressions) * 100).toFixed(2) : '0.00'}%.`;

  const p2 = topThemes.length > 0 
    ? `Content analysis reveals that the most engaging themes are "${topThemes.join('", "')}", appearing in ${Math.round((topThemes.length / THEME_RULES.length) * 100)}% of top posts. The content mix shows ${pUGC}% UGC, ${pINF}% influencer content, and ${pCOL}% collaborations, with formats ${videos > photos ? 'skewing toward video content' : 'favoring photo/graphic posts'}. The average engagement rate across all ${rows.length} posts is ${avgEngagementRate.toFixed(2)}%, indicating ${avgEngagementRate > 3 ? 'strong' : 'moderate'} audience interaction for this selection.`
    : `Content themes are diverse across the top performers, with no single theme dominating. The content mix shows ${pUGC}% UGC, ${pINF}% influencer content, and ${pCOL}% collaborations, with formats ${videos > photos ? 'skewing toward video content' : 'favoring photo/graphic posts'}. The average engagement rate across all ${rows.length} posts is ${avgEngagementRate.toFixed(2)}%, suggesting ${avgEngagementRate > 3 ? 'strong' : 'moderate'} audience interaction for this category.`;

  return `<p>${p1}</p><p>${p2}</p>`;
}

// Enhanced ads analysis focused on best performing creativities and their content themes
function generateAdsAnalysis(rows, contextLabel, mainCategoryName) {
  if (!rows || rows.length === 0) {
    return '<p>No Pathmatics ads matched the current selection.</p>';
  }

  // Get top performing ads by impressions
  const topAds = rows
    .map(ad => ({
      ...ad,
      impressions: Number(ad.Impressions || 0),
      spend: Number(ad['Spend (USD)'] || 0),
      cpm: Number(ad.Impressions || 0) > 0 ? (Number(ad['Spend (USD)'] || 0) / Number(ad.Impressions || 0)) * 1000 : 0
    }))
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 5);

  // Analyze content themes
  const THEME_RULES = [
    { key: 'Wearable/Portability', re: /(wearable|hands ?free|portable|on the go|discreet|quiet|wireless|compact|stealth)/i },
    { key: 'Comfort/Soothing', re: /(comfort|gentle|soft|fit|soothe|sore|lanolin|leak|pain ?free|cushion)/i },
    { key: 'Performance/Suction', re: /(power|performance|strong|suction|hospital[- ]?grade|efficiency|output|milk ?production|flow)/i },
    { key: 'Education/How-to', re: /(how to|guide|tips?|tutorial|learn|explainer|step ?by ?step|instructions|help)/i },
    { key: 'Lifestyle/Motherhood', re: /(mom|mother|family|postpartum|journey|return to work|night|sleep|breastfeeding ?journey)/i },
    { key: 'Value/Promotion', re: /(deal|discount|save|off\b|coupon|promo|bundle|free|gift|sale|offer)/i },
    { key: 'Emotional Connection', re: /(love|care|support|confidence|empower|beautiful|special|moment|connection)/i },
    { key: 'Convenience', re: /(easy|simple|quick|fast|convenient|time ?saving|effortless|one ?touch)/i }
  ];

  const detectThemes = (text) => {
    if (!text) return [];
    const textLower = String(text).toLowerCase();
    const detected = [];
    THEME_RULES.forEach(theme => {
      if (theme.re.test(textLower)) {
        detected.push(theme.key);
      }
    });
    return detected;
  };

  // Analyze themes in top ads
  const themeCounts = {};
  topAds.forEach(ad => {
    const combinedText = `${ad.Text_x || ''} ${ad.Text_y || ''} ${ad.overall_description || ''} ${ad.value_proposition || ''}`;
    const themes = detectThemes(combinedText);
    themes.forEach(theme => {
      themeCounts[theme] = (themeCounts[theme] || 0) + 1;
    });
  });

  const topThemes = Object.entries(themeCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([theme]) => theme);

  // Get top performing ad details
  const bestAd = topAds[0];
  const bestAdText = bestAd ? `${bestAd.Text_x || bestAd.Text_y || bestAd.overall_description || 'No text available'}`.substring(0, 120) + '...' : 'No ad data available';
  const bestAdBrand = bestAd ? bestAd['Brand Root'] : 'Unknown';
  const bestAdImpressions = bestAd ? bestAd.impressions.toLocaleString() : '0';
  const bestAdChannel = bestAd ? bestAd.Channel : 'Unknown';
  const bestAdFormat = bestAd ? (bestAd['Creative Type_x'] || bestAd['Creative Type_y']) : 'Unknown';

  // Calculate overall metrics
  const totalImpressions = d3.sum(rows, d => Number(d.Impressions || 0));
  const totalSpend = d3.sum(rows, d => Number(d['Spend (USD)'] || 0));
  const avgCPM = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;

  // Generate analysis paragraphs
  const catContext = mainCategoryName ? ` in the "${mainCategoryName}" category` : '';
  const p1 = `The best performing creativity in ${contextLabel}${catContext} is from ${bestAdBrand} with ${bestAdImpressions} impressions. This ${bestAdFormat} ad on ${bestAdChannel} focuses on "${bestAdText.substring(0, 80)}..." and demonstrates strong reach efficiency with a CPM of $${bestAd ? bestAd.cpm.toFixed(2) : '0.00'}.`;

  const p2 = topThemes.length > 0 
    ? `Content analysis reveals that the most effective themes are "${topThemes.join('", "')}", appearing in ${Math.round((topThemes.length / THEME_RULES.length) * 100)}% of top ads. The average CPM across all ${rows.length} ads is $${avgCPM.toFixed(2)}, indicating ${avgCPM < 10 ? 'competitive' : 'premium'} cost efficiency for this selection.`
    : `Content themes are diverse across the top performers, with no single theme dominating. The average CPM across all ${rows.length} ads is $${avgCPM.toFixed(2)}, suggesting ${avgCPM < 10 ? 'efficient' : 'premium'} performance in this category.`;

  return `<p>${p1}</p><p>${p2}</p>`;
}

// Enhanced key takeaways analysis combining Pathmatics and Social Media insights
function generateKeyTakeaways(adsData, socialData, allAdsData, allSocialData, contextLabel, mainCategoryName) {


  if ((!adsData || adsData.length === 0) && (!socialData || socialData.length === 0)) {
    console.log('No data available for analysis');
    return '<ul><li>No data available for key takeaways analysis.</li></ul>';
  }

  const insights = [];
  
  // Analyze Pathmatics data insights
  if (adsData && adsData.length > 0) {
    const totalAdsSpend = d3.sum(adsData, d => Number(d['Spend (USD)'] || 0));
    const totalAdsImpressions = d3.sum(adsData, d => Number(d.Impressions || 0));
    const avgCPM = totalAdsImpressions > 0 ? (totalAdsSpend / totalAdsImpressions) * 1000 : 0;
    
    // Find top performing ad
    const topAd = adsData
      .map(ad => ({
        ...ad,
        impressions: Number(ad.Impressions || 0),
        spend: Number(ad['Spend (USD)'] || 0),
        cpm: Number(ad.Impressions || 0) > 0 ? (Number(ad['Spend (USD)'] || 0) / Number(ad.Impressions || 0)) * 1000 : 0
      }))
      .sort((a, b) => b.impressions - a.impressions)[0];

    // Analyze channels and formats
    const channelAnalysis = d3.rollup(adsData, v => ({
      impressions: d3.sum(v, d => Number(d.Impressions || 0)),
      count: v.length
    }), d => String(d.Channel || 'Unknown'));
    
    const topChannel = Array.from(channelAnalysis.entries())
      .sort((a, b) => b[1].impressions - a[1].impressions)[0];

    // Content theme analysis
    const THEME_RULES = [
      { key: 'Wearable/Portability', re: /(wearable|hands[- ]?free|portable|discreet|quiet|wireless|compact)/i },
      { key: 'Comfort/Soothing', re: /(comfort|gentle|soft|fit|soothe|sore|lanolin|leak)/i },
      { key: 'Performance/Suction', re: /(power|performance|strong|suction|hospital[- ]?grade|efficiency)/i },
      { key: 'Education/How-to', re: /(how to|guide|tips?|tutorial|learn|explainer)/i },
      { key: 'Lifestyle/Motherhood', re: /(mom|mother|family|postpartum|journey|return to work|night|sleep)/i },
      { key: 'Value/Promotion', re: /(deal|discount|save|off\b|coupon|promo|bundle|free|gift)/i }
    ];

    const detectTheme = (text) => {
      if (!text) return 'Other';
      const textLower = String(text).toLowerCase();
      const hit = THEME_RULES.find(t => t.re.test(textLower));
      return hit ? hit.key : 'Other';
    };

    const themeCounts = {};
    adsData.forEach(ad => {
      const combinedText = `${ad.Text_x || ''} ${ad.Text_y || ''} ${ad.overall_description || ''}`;
      const theme = detectTheme(combinedText);
      themeCounts[theme] = (themeCounts[theme] || 0) + 1;
    });

    const topTheme = Object.entries(themeCounts)
      .sort(([,a], [,b]) => b - a)[0];

    // Calculate category benchmarks
    let categoryBenchmark = null;
    if (allAdsData && allAdsData.length > 0 && mainCategoryName) {
      const categoryAds = allAdsData.filter(ad => ad.Main_Category === mainCategoryName);
      if (categoryAds.length > 0) {
        const categorySpend = d3.sum(categoryAds, d => Number(d['Spend (USD)'] || 0));
        const categoryImpressions = d3.sum(categoryAds, d => Number(d.Impressions || 0));
        const categoryCPM = categoryImpressions > 0 ? (categorySpend / categoryImpressions) * 1000 : 0;
        categoryBenchmark = {
          cpm: categoryCPM,
          impressions: categoryImpressions,
          spend: categorySpend
        };
      }
    }

    // Generate ads insights
    if (topAd) {
      const brandName = topAd['Brand Root'] || topAd.Advertiser || 'Unknown brand';
      let benchmarkText = '';
      
      if (categoryBenchmark) {
        const cpmDiff = topAd.cpm - categoryBenchmark.cpm;
        const cpmComparison = cpmDiff < 0 ? `${Math.abs(cpmDiff).toFixed(2)} lower` : `${cpmDiff.toFixed(2)} higher`;
        const cpmPerformance = cpmDiff < 0 ? 'more efficient' : 'less efficient';
        benchmarkText = ` vs category average of $${categoryBenchmark.cpm.toFixed(2)} CPM (${cpmComparison}, ${cpmPerformance})`;
      }
      
      insights.push(`<strong>Paid Media Excellence:</strong> ${brandName} leads with ${topAd.impressions.toLocaleString()} impressions and $${topAd.cpm.toFixed(2)} CPM${benchmarkText}.`);
    }
    
    if (topChannel) {
      insights.push(`<strong>Channel Strategy:</strong> ${topChannel[0]} dominates with ${Math.round((topChannel[1].impressions / totalAdsImpressions) * 100)}% of impressions, indicating optimal platform focus for this audience.`);
    }
    
    if (topTheme) {
      insights.push(`<strong>Content Focus:</strong> "${topTheme[0]}" theme appears in ${Math.round((topTheme[1] / adsData.length) * 100)}% of ads, showing clear messaging prioritization.`);
    }
  }

  // Analyze Social Media data insights
  if (socialData && socialData.length > 0) {
    const totalEngagement = d3.sum(socialData, d => Number(d.engagement_total || 0));
    const totalImpressions = d3.sum(socialData, d => Number(d.estimated_impressions || 0));
    const avgEngagementRate = totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0;

    // Calculate social category benchmarks
    let socialCategoryBenchmark = null;
    if (allSocialData && allSocialData.length > 0 && mainCategoryName) {
      const categorySocial = allSocialData.filter(post => post.Main_Category === mainCategoryName);
      if (categorySocial.length > 0) {
        const categoryEngagement = d3.sum(categorySocial, d => Number(d.engagement_total || 0));
        const categoryImpressions = d3.sum(categorySocial, d => Number(d.estimated_impressions || 0));
        const categoryEngagementRate = categoryImpressions > 0 ? (categoryEngagement / categoryImpressions) * 100 : 0;
        socialCategoryBenchmark = {
          engagementRate: categoryEngagementRate,
          engagement: categoryEngagement,
          impressions: categoryImpressions
        };
      }
    }

    // Find top performing social post
    const topSocialPost = socialData
      .map(post => ({
        ...post,
        engagement: Number(post.engagement_total || 0),
        impressions: Number(post.estimated_impressions || 0),
        engagementRate: Number(post.estimated_impressions || 0) > 0 ? (Number(post.engagement_total || 0) / Number(post.estimated_impressions || 0)) * 100 : 0
      }))
      .sort((a, b) => b.engagement - a.engagement)[0];

    // Analyze content types
    const ugcCount = socialData.filter(d => String(d.post_tag_ugc || '').toLowerCase() === '1').length;
    const influencerCount = socialData.filter(d => {
      const txt = `${d.message || ''} ${d.overall_description || ''} ${d.link_title || ''}`;
      return /(influencer|creator|ambassador|affiliate)/i.test(txt);
    }).length;

    // Content theme analysis for social
    const SOCIAL_THEME_RULES = [
      { key: 'Product Features', re: /(wearable|hands[- ]?free|portable|discreet|quiet|battery|app|track|suction|flange|parts|lanolin|milk|bottle|pump)/i },
      { key: 'Benefits & Comfort', re: /(comfort|easy|ease|gentle|quiet|discreet|wireless|value|affordable|deal|save|offer|sale)/i },
      { key: 'Motherhood & Lifestyle', re: /(mom|mother|parents?|family|baby|newborn|postpartum|nursing|maternity|sleep|night|work|return to work|on the go|travel)/i },
      { key: 'Education & Tips', re: /(tip|how to|guide|learn|tutorial|faq|q&a|advice|step|instruction)/i },
      { key: 'Promotions', re: /(sale|discount|offer|off\b|code|gift|free|bundle|promo)/i },
      { key: 'Emotional Connection', re: /(love|care|support|confidence|empower|beautiful|special|moment|connection|journey)/i },
      { key: 'Real Stories', re: /(real|story|experience|testimonial|review|honest|truth)/i },
      { key: 'Community', re: /(community|together|moms|parents|group|support)/i }
    ];

    const detectSocialTheme = (text) => {
      if (!text) return 'Other';
      const textLower = String(text).toLowerCase();
      const hit = SOCIAL_THEME_RULES.find(t => t.re.test(textLower));
      return hit ? hit.key : 'Other';
    };

    const socialThemeCounts = {};
    socialData.forEach(post => {
      const combinedText = `${post.message || ''} ${post.overall_description || ''} ${post.link_title || ''} ${post.text_detected || ''}`;
      const theme = detectSocialTheme(combinedText);
      socialThemeCounts[theme] = (socialThemeCounts[theme] || 0) + 1;
    });

    const topSocialTheme = Object.entries(socialThemeCounts)
      .sort(([,a], [,b]) => b - a)[0];

    // Generate social insights
    if (topSocialPost) {
      let benchmarkText = '';
      
      if (socialCategoryBenchmark) {
        const engagementDiff = avgEngagementRate - socialCategoryBenchmark.engagementRate;
        const engagementComparison = engagementDiff > 0 ? `${engagementDiff.toFixed(2)} higher` : `${Math.abs(engagementDiff).toFixed(2)} lower`;
        const engagementPerformance = engagementDiff > 0 ? 'better' : 'lower';
        benchmarkText = ` vs category average of ${socialCategoryBenchmark.engagementRate.toFixed(2)}% (${engagementComparison}, ${engagementPerformance} performance)`;
      }
      
      insights.push(`<strong>Social Engagement Leader:</strong> Top post achieved ${topSocialPost.engagement.toLocaleString()} engagements with ${avgEngagementRate.toFixed(2)}% average engagement rate${benchmarkText}.`);
    }

    if (ugcCount > 0 || influencerCount > 0) {
      const ugcPct = Math.round((ugcCount / socialData.length) * 100);
      const influencerPct = Math.round((influencerCount / socialData.length) * 100);
      insights.push(`<strong>Content Strategy:</strong> ${ugcPct}% UGC and ${influencerPct}% influencer content indicates ${ugcPct > 30 || influencerPct > 20 ? 'strong' : 'moderate'} community-driven approach.`);
    }

    if (topSocialTheme) {
      insights.push(`<strong>Social Narrative:</strong> "${topSocialTheme[0]}" dominates with ${Math.round((topSocialTheme[1] / socialData.length) * 100)}% of posts, aligning with audience interests and platform dynamics.`);
    }
  }

  // Generate cross-platform insights
  if (adsData && adsData.length > 0 && socialData && socialData.length > 0) {
    const adsSpend = d3.sum(adsData, d => Number(d['Spend (USD)'] || 0));
    const socialEngagement = d3.sum(socialData, d => Number(d.engagement_total || 0));
    
    if (adsSpend > 0 && socialEngagement > 0) {
      insights.push(`<strong>Integrated Performance:</strong> Paid media investment of $${adsSpend.toLocaleString()} drives reach while organic social generates ${socialEngagement.toLocaleString()} engagements, showing balanced paid-organic strategy.`);
    }
  }

  // Generate strategic recommendations
  const catContext = mainCategoryName ? ` in ${mainCategoryName}` : '';
  if (insights.length === 0) {
    insights.push(`<strong>Data Analysis:</strong> Limited data available for ${contextLabel}${catContext}. Consider expanding data collection for deeper insights.`);
  }

  // Format as two paragraphs maximum
  const paragraph1 = insights.slice(0, Math.ceil(insights.length / 2)).join(' ');
  const paragraph2 = insights.slice(Math.ceil(insights.length / 2)).join(' ');

  let html = '';
  if (paragraph1) {
    html += `<p>${paragraph1}</p>`;
  }
  if (paragraph2) {
    html += `<p>${paragraph2}</p>`;
  }

  const result = html || '<ul><li>Key insights are being analyzed based on current selection.</li></ul>';
  return result;
}

// Handle node click events
function handleNodeClick(node, dataType) {
  state.selectedNode = node;
  
  // Update breadcrumb
  updateBreadcrumb(node);
  
  // Generate insights
  generateInsights(node, dataType);
  
  console.log('Node clicked:', node);
}

// Handle node hover events
function handleNodeHover(node, event) {
  showTooltip(node, event, state.currentTab);
}

// Update breadcrumb navigation
function updateBreadcrumb(node) {
  // Implementation for breadcrumb navigation
  // This would show the path from root to current node
}

// Generate insights for selected node
function generateInsights(node, dataType) {
  const panelId = `#insight-panel-${dataType}`;
  const titleId = `#insight-title-${dataType}`;
  const analysisId = `#selection-analysis-${dataType}`;
  
  const titleElement = document.querySelector(titleId);
  const analysisElement = document.querySelector(analysisId);
  
  if (titleElement) {
    titleElement.textContent = `Insights for ${node.name}`;
  }
  
  if (analysisElement) {
    const insights = generateNodeInsights(node, dataType);
    analysisElement.textContent = insights;
  }
}

// Generate text insights for a node
function generateNodeInsights(node, dataType) {
  const config = DASHBOARD_CONFIG.metrics[dataType === 'social' ? 'social' : dataType];
  
  let insights = `Analysis for ${node.name}:\n\n`;
  insights += `Type: ${node.type}\n`;
  insights += `${config.primary}: ${formatNumber(node.value)}\n`;
  insights += `${config.secondary}: ${formatNumber(node.secondary)}\n`;
  
  if (node.children) {
    insights += `\nSubcategories: ${node.children.length}\n`;
  }
  
  return insights;
}

// Render comparative view
function renderComparative() {
  const container = document.querySelector('#packedCirclesComparative');
  if (!container) return;
  
  // Placeholder implementation for comparative view
  container.innerHTML = '<div style="display:flex; align-items:center; justify-content:center; height:100%; color:#64748b;">Comparative view coming soon...</div>';
}

// Show error message
function showError(message) {
  console.error(message);
  // Could implement a more sophisticated error display
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', init);

// Export for debugging
window.PackedCircleDashboard = {
  state,
  render,
  applyFilters
};

// Utility functions
function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function showTooltip(node, event, tab) {
  // Tooltip implementation
}

function hideTooltip() {
  // Hide tooltip implementation
}

function createTooltip() {
  // Create tooltip implementation
}

// Packed circles visualization
function createPackedCircles(options) {
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

// amCharts visualization using real amCharts library
function renderAmChartsPacked(options) {
  console.log('renderAmChartsPacked called with options:', options);
  
  const { container, data, blended, onNodeClick } = options;
  const containerElement = typeof container === 'string' ? document.querySelector(container) : container;
  
  console.log('Container element found:', !!containerElement);
  console.log('Data available:', !!data);
  console.log('Data structure:', data);
  
  if (!containerElement || !data) {
    console.log('Missing container or data, showing fallback');
    if (containerElement) {
      containerElement.innerHTML = '<div style="display:flex; align-items:center; justify-content:center; height:100%; color:#64748b;">No data available</div>';
    }
    return;
  }

  // Clear container and dispose existing charts
  if (containerElement._amChartsChart) {
    console.log('Disposing existing chart:', containerElement._amChartsChart.uid);
    containerElement._amChartsChart.dispose();
    containerElement._amChartsChart = null;
  }
  
  containerElement.innerHTML = '';
  
  // Ensure container has explicit height for amCharts
  if (!containerElement.style.height) {
    containerElement.style.height = '600px';
  }
  
  // Check if amCharts is available with retry mechanism
  function waitForAmCharts(callback, retries = 5) {
    if (typeof am4core !== 'undefined' && typeof am4plugins_forceDirected !== 'undefined') {
      callback();
    } else if (retries > 0) {
      console.log(`amCharts not ready, retrying... (${retries} attempts left)`);
      setTimeout(() => waitForAmCharts(callback, retries - 1), 500);
    } else {
      console.error('amCharts libraries not loaded after retries, falling back to D3 visualization');
      containerElement.innerHTML = '<div style="padding: 20px; text-align: center; color: #64748b;">Using D3 visualization...</div>';
      
      // Use D3 fallback instead
      createPackedCircles({
        container: containerElement,
        data: data,
        mode: 'force',
        config: DASHBOARD_CONFIG,
        onNodeClick: onNodeClick,
        onNodeHover: () => {},
        onNodeLeave: () => {}
      });
    }
  }
  
  waitForAmCharts(() => {
  
  console.log('amCharts libraries available, creating chart');
  
  // Skip global cleanup to avoid library-side registry issues; per-container cleanup is handled above
  
  // Create amCharts ForceDirected chart
  const chart = am4core.create(containerElement, am4plugins_forceDirected.ForceDirectedTree);
  
  // Store chart reference for disposal
  containerElement._amChartsChart = chart;
  
  console.log('amCharts chart created:', chart);
  console.log('Container dimensions:', {
    width: containerElement.clientWidth,
    height: containerElement.clientHeight,
    style: containerElement.style.height
  });
  
  // Set data: feed categories directly to avoid rendering a visible root node
  const chartData = data && Array.isArray(data.children) ? data.children : (Array.isArray(data) ? data : [data]);
  chart.data = chartData;
  console.log('Chart data set:', chartData);

  // Build consistent color mapping per top-level category
  const categoryColorMap = {};
  const basePalette = [
    am4core.color('#e11d48'), // rose
    am4core.color('#3b82f6'), // blue
    am4core.color('#10b981'), // emerald
    am4core.color('#f59e0b'), // amber
    am4core.color('#8b5cf6'), // violet
    am4core.color('#06b6d4'), // cyan
    am4core.color('#f97316'), // orange
    am4core.color('#22c55e')  // green
  ];
  if (Array.isArray(chartData)) {
    chartData.forEach((cat, idx) => {
      const name = (cat && cat.name) || `cat_${idx}`;
      categoryColorMap[name] = basePalette[idx % basePalette.length];
    });
  }
  
  // Log data structure for debugging
  if (data && data.children) {
    console.log('Root has', data.children.length, 'categories');
    data.children.slice(0, 3).forEach((cat, i) => {
      console.log(`Category ${i}:`, {
        name: cat.name,
        value: cat.value,
        children: cat.children?.length || 0
      });
    });
  }
  
  // Configure series (hide artificial root, improve look & interactions)
  const series = chart.series.push(new am4plugins_forceDirected.ForceDirectedSeries());
  series.dataFields.value = "value";
  series.dataFields.name = "name";
  series.dataFields.children = "children";
  series.dataFields.id = "name";
  // Match prior visual: small min radius, gentle repulsion
  series.minRadius = am4core.percent(2);
  series.maxRadius = 120;
  series.manyBodyStrength = -5;
  // Hide links to mimic packed-circles look
  series.links.template.disabled = true;
  series.links.template.opacity = 0;
  series.links.template.strokeOpacity = 0;
  // Circle stroke aligned with fill color
  series.nodes.template.circle.strokeWidth = 3;
  // Outer circle (outline ring) aligned with node fill as well
  series.nodes.template.outerCircle.strokeWidth = 3;
  series.nodes.template.outerCircle.fillOpacity = 0; // keep as outline only
  series.nodes.template.fillOpacity = 1;
  if (series.nodes && series.nodes.template && series.nodes.template.outerCircle) {
    series.nodes.template.outerCircle.scale = 1;
  }
  
  console.log('Series configured:', series);
  
  // Ensure nodes are visible
  series.nodes.template.circle.fill = am4core.color("#ff6b9d");
  series.nodes.template.circle.strokeWidth = 2;
  
  // Labels centered, clipped
  series.nodes.template.label.fill = am4core.color("#ffffff");
  series.nodes.template.label.fontSize = 13;
  series.nodes.template.label.fontWeight = "600";
  series.nodes.template.label.truncate = true;
  series.nodes.template.label.maxWidth = 110;
  series.nodes.template.label.wrap = true;
  series.nodes.template.label.horizontalCenter = "middle";
  series.nodes.template.label.verticalCenter = "middle";
  series.nodes.template.label.textAlign = "middle";
  series.nodes.template.label.isMeasured = false;
  series.nodes.template.label.zIndex = 1000;
  series.nodes.template.label.adapter.add("text", (text, target) => {
    const di = target.dataItem;
    const dc = di && di.dataContext;
    if (!dc) return text;
    // For collapsed nodes ensure category labels stay visible
    if (di.collapsed && dc.type === 'category') {
      return String(dc.name || text || '').toUpperCase();
    }
    if (dc.type === 'category' && text) return String(text).toUpperCase();
    return text;
  });
  series.fontSize = 8;
  // Mostrar siempre títulos de categorías aun colapsadas
  series.nodes.template.label.hideOversized = false;
  
  // Al inicializar, colapsar todos los nodos con hijos (categorías, grupos, brands)
  // para que el usuario vaya expandiendo por niveles con clic
  series.nodes.template.events.on("hit", function(ev) {
    const di = ev.target && ev.target.dataItem;
    if (di && di.children && di.children.length) {
      const willExpand = di.collapsed === true;
      di.collapsed = !di.collapsed;
      // If node is expanding, ensure its immediate children start collapsed
      if (willExpand && di.children) {
        di.children.each(function(child){
          if (child && child.children && child.children.length) {
            child.collapsed = true;
          }
        });
      }
    }
    // Keep category label visible when toggling
    try {
      const n = ev.target;
      if (n && n.dataItem && n.dataItem.dataContext && n.dataItem.dataContext.type === 'category' && n.label) {
        n.label.visible = true;
        n.label.zIndex = 1000;
        if (n.label.toFront) n.label.toFront();
      }
    } catch (e) {}
    if (onNodeClick) {
      onNodeClick(di);
    }
  });

  // After layout/validation, force category labels to stay on top and visible
  series.nodes.template.events.on("validated", function(ev){
    try {
      const n = ev.target;
      const di = n && n.dataItem;
      const dc = di && di.dataContext;
      if (dc && dc.type === 'category' && n.label) {
        n.label.visible = true;
        n.label.zIndex = 1000;
        if (n.label.toFront) n.label.toFront();
      }
    } catch (e) { /* noop */ }
  });

  chart.events.on("inited", function() {
    try {
      series.nodes.each(function(node){
        const di = node && node.dataItem;
        if (di && di.children && di.children.length) {
          di.collapsed = true;
        }
      });
    } catch (e) { console.warn('Collapse init warning', e); }
  });

  // Asegurar que brands y channels queden contraídos al expandir categoría o grupo
  series.nodes.template.events.on("inited", function(ev){
    try {
      const di = ev.target && ev.target.dataItem;
      const dc = di && di.dataContext;
      if (di && di.children && di.children.length) {
        di.collapsed = true;
      }
      // Si es brand o channel, forzar colapsado
      if (dc && (dc.type === 'brand' || dc.type === 'channel')) {
        di.collapsed = true;
      }
    } catch (e) { /* noop */ }
  });

  // Make sure to validate data
  chart.validateData();
  
  console.log('Chart validation complete, should be visible now');
  
  // Force chart to appear
  setTimeout(() => {
    chart.appear(1000, 500);
    console.log('Forced chart appearance animation');
  }, 100);
  
  // Configure nodes
  series.nodes.template.label.text = "{name}";
  series.nodes.template.label.fontSize = 12;
  series.nodes.template.label.fill = am4core.color("#fff");
  series.nodes.template.tooltipText = "{name}: {value}";
  series.nodes.template.circle.strokeWidth = 2;
  // Tooltip should match node fill color
  chart.tooltip.getFillFromObject = false;
  chart.tooltip.getStrokeFromObject = false;
  chart.tooltip.background.cornerRadius = 6;
  chart.tooltip.background.fillOpacity = 1;
  chart.tooltip.label.fill = am4core.color('#ffffff');
  series.nodes.template.events.on('over', function(ev){
    const f = ev.target && ev.target.fill;
    if (f) {
      chart.tooltip.background.fill = f;
      chart.tooltip.background.stroke = f;
    }
  });
  
  // Add click handler
  if (onNodeClick) {
    series.nodes.template.events.on("hit", function(ev) {
      const dataItem = ev.target.dataItem;
      onNodeClick(dataItem);
    });
  }
  
  // Resolve the top-level category ancestor for any node
  function resolveTopCategoryName(dataItem) {
    let cur = dataItem;
    while (cur) {
      const ctx = cur.dataContext || {};
      if (ctx.type === 'category') return ctx.name || '';
      cur = cur.parent;
    }
    return '';
  }
  // Apply color consistently by main category for all descendants
  series.nodes.template.circle.adapter.add('fill', function(defaultFill, target){
    const di = target && target.dataItem;
    if (!di) return defaultFill;
    const catName = resolveTopCategoryName(di);
    const mapped = catName && categoryColorMap[catName];
    return mapped || defaultFill;
  });
  // Make stroke equal to resolved fill
  series.nodes.template.circle.adapter.add('stroke', function(_stroke, target){
    return target.fill;
  });
  // Make outerCircle stroke equal to node fill too
  series.nodes.template.outerCircle.adapter.add('stroke', function(_s, target){
    try {
      const node = target && target.parent; // amCharts Node
      if (node && node.circle) return node.circle.fill;
    } catch (e) {}
    return _s;
  });

  // Borde más grueso para categorías y grupos
  series.nodes.template.circle.adapter.add("strokeWidth", (w, target) => {
    const dc = target.dataItem && target.dataItem.dataContext;
    if (!dc) return 2;
    if (dc.type === 'category') return 6;
    if (dc.type === 'group') return 4;
    return 3;
  });
  series.nodes.template.circle.adapter.add("stroke", (s, target) => target.fill);
  
  // Node radius will be computed by amCharts from value; no adapter
  
  }); // End of waitForAmCharts callback
}


