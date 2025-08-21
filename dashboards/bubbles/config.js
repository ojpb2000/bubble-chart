// Bubbles Dashboard Configuration
export const DASHBOARD_CONFIG = {
  name: 'Bubbles Dashboard',
  description: 'Interactive bubble visualization with hierarchical clustering',
  version: '1.0.0',
  type: 'bubbles',
  
  // Data paths relative to project root
  dataPaths: {
    manufacturer: '../../Data/Pathmathics_Brand_Manufacturer_Classified.csv',
    dme: '../../Data/Pathmatics_DME_classified.csv',
    tiktok: '../../Data/SM_TikTok_rows_1_20000.csv',
    instagram: '../../Data/SM_IG_rows_all.csv'
  },
  
  // Default filters
  defaultFilters: {
    productFocus: 'Breastfeeding Pump',
    channel: 'all',
    advertiser: 'all'
  },
  
  // Visualization settings
  visualization: {
    minHeight: 520,
    enableZoom: true,
    enablePan: true,
    showMainLabels: true,
    hideNotRecognizable: true
  },
  
  // Available tabs
  tabs: [
    'bubble-images',
    'dme-brands', 
    'tiktok-sm',
    'instagram-sm',
    'content-analysis',
    'bubble-landscape'
  ],
  
  // Default active tab
  defaultTab: 'bubble-images'
};
