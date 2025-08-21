// Packed Circle Dashboard Configuration
export const DASHBOARD_CONFIG = {
  name: 'Packed Circle Dashboard',
  description: 'Hierarchical packed circle visualization with advanced interaction modes',
  version: '1.0.0',
  type: 'packed-circle',
  
  // Data paths relative to dashboard location
  dataPaths: {
    manufacturer: '../../../Data/Pathmathics_Brand_Manufacturer_Classified.csv',
    dme: '../../../Data/Pathmatics_DME_classified.csv',
    tiktok: '../../../Data/SM_TikTok_rows_1_20000.csv',
    instagram: '../../../Data/SM_IG_rows_all.csv'
  },
  
  // Default filters
  defaultFilters: {
    productFocus: 'Breastfeeding Pump',
    channel: 'all',
    advertiser: 'all',
    platform: 'all',
    company: 'all'
  },
  
  // Visualization settings
  visualization: {
    minHeight: 600,
    enableZoom: true,
    enablePan: true,
    enableAnimations: true,
    showLabels: true,
    modes: ['nested', 'force', 'grid', 'amcharts'],
    defaultMode: 'amcharts',
    
    // Circle sizing
    minRadius: 8,
    maxRadius: 120,
    padding: 2,
    
    // Colors
    colorSchemes: {
      category: ['#ff6b9d', '#45b7d1', '#96ceb4', '#ffd93d', '#ff9f43', '#a29bfe'],
      platform: {
        tiktok: '#ff0050',
        instagram: '#e1306c'
      },
      spend: {
        low: '#e3f2fd',
        high: '#0d47a1'
      }
    },
    
    // Animation settings
    transitions: {
      duration: 600,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
    }
  },
  
  // Available tabs - Only Blended Analysis
  tabs: [
    'blended-circles'
  ],
  
  // Default active tab
  defaultTab: 'blended-circles',
  
  // Metrics configuration
  metrics: {
    manufacturer: {
      primary: 'Impressions',
      secondary: 'Spend (USD)',
      label: 'Advertiser'
    },
    dme: {
      primary: 'Impressions',
      secondary: 'Spend (USD)',
      label: 'Advertiser'
    },
    social: {
      primary: 'engagement_total',
      secondary: 'engagement_rate_by_view',
      label: 'company'
    }
  }
};
