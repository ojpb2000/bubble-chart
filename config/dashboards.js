// Dashboard Configuration and Routing
export const DASHBOARD_REGISTRY = {
  bubbles: {
    name: 'Bubbles Dashboard',
    description: 'Interactive bubble visualization with hierarchical clustering and detailed insights',
    path: 'dashboards/bubbles/index.html',
    icon: '🫧',
    type: 'bubbles',
    version: '1.0.0',
    features: [
      'Hierarchical bubble clustering',
      'Interactive zoom and pan',
      'Multiple data sources (Manufacturer, DME, Social Media)',
      'Real-time filtering',
      'Detailed analytics panels'
    ],
    dataSources: ['manufacturer', 'dme', 'tiktok', 'instagram'],
    defaultTab: 'bubble-images',
    status: 'active'
  },
  
  'packed-circle': {
    name: 'Packed Circle Dashboard',
    description: 'Advanced packed circle visualization with multiple layout modes and comparative analysis',
    path: 'dashboards/packed-circle/index.html',
    icon: '🔵',
    type: 'packed-circle',
    version: '1.0.0',
    features: [
      'Nested circle packing',
      'Force-directed layout',
      'Grid layout mode',
      'Comparative analysis view',
      'Advanced tooltips and interactions'
    ],
    dataSources: ['manufacturer', 'dme', 'social'],
    defaultTab: 'manufacturer-circles',
    status: 'active'
  }
};

// Dashboard categories for organization
export const DASHBOARD_CATEGORIES = {
  'visualization-types': {
    name: 'Visualization Types',
    description: 'Different approaches to visualizing breast pump market data',
    dashboards: ['bubbles', 'packed-circle']
  },
  
  'data-sources': {
    name: 'Data Sources',
    description: 'Dashboards organized by primary data source',
    dashboards: {
      manufacturer: ['bubbles', 'packed-circle'],
      social: ['bubbles', 'packed-circle'],
      dme: ['bubbles', 'packed-circle']
    }
  },
  
  'analysis-depth': {
    name: 'Analysis Depth',
    description: 'Dashboards by level of analytical complexity',
    dashboards: {
      overview: ['bubbles'],
      detailed: ['packed-circle'],
      comparative: ['packed-circle']
    }
  }
};

// Shared data configuration
export const DATA_CONFIG = {
  sources: {
    manufacturer: {
      path: 'Data/Pathmathics_Brand_Manufacturer_Classified.csv',
      name: 'Brand Manufacturer',
      description: 'Pathmatics brand manufacturer segment data',
      metrics: ['Impressions', 'Spend (USD)', 'Channel', 'Advertiser'],
      timeframe: 'Jan 2024 – Jul 2025'
    },
    
    dme: {
      path: 'Data/Pathmatics_DME_classified.csv',
      name: 'DME Brands',
      description: 'Durable Medical Equipment brands data',
      metrics: ['Impressions', 'Spend (USD)', 'Channel', 'Advertiser'],
      timeframe: 'Jan 2024 – Jul 2025'
    },
    
    tiktok: {
      path: 'Data/SM_TikTok_rows_1_20000.csv',
      name: 'TikTok Social Media',
      description: 'TikTok social media engagement data',
      metrics: ['engagement_total', 'likes', 'views', 'comments', 'shares'],
      timeframe: 'Jan 2024 – Jul 2025'
    },
    
    instagram: {
      path: 'Data/SM_IG_rows_all.csv',
      name: 'Instagram Social Media', 
      description: 'Instagram social media engagement data',
      metrics: ['engagement_total', 'likes', 'comments', 'followers'],
      timeframe: 'Jan 2024 – Jul 2025'
    }
  },
  
  // Common categories across all data sources
  categories: {
    main: [
      'SUPPORT FOR WORKING MOMS',
      'EMOTIONAL CONNECTION',
      'AUTHENTIC COMMUNITY & PEER VALIDATION',
      'MEDICAL ENDORSEMENT & CLINICAL TRUST',
      'PERFORMANCE & CONVENIENCE'
    ],
    
    productFocus: [
      'Breastfeeding Pump',
      'Breast Milk Storage',
      'Nursing Accessories',
      'Baby Feeding'
    ]
  }
};

// Utility functions for dashboard management
export class DashboardManager {
  constructor() {
    this.currentDashboard = null;
    this.history = [];
  }
  
  // Get dashboard configuration
  getDashboard(id) {
    return DASHBOARD_REGISTRY[id] || null;
  }
  
  // Get all active dashboards
  getActiveDashboards() {
    return Object.entries(DASHBOARD_REGISTRY)
      .filter(([id, config]) => config.status === 'active')
      .map(([id, config]) => ({ id, ...config }));
  }
  
  // Get dashboards by category
  getDashboardsByCategory(category) {
    const categoryConfig = DASHBOARD_CATEGORIES[category];
    if (!categoryConfig) return [];
    
    if (Array.isArray(categoryConfig.dashboards)) {
      return categoryConfig.dashboards.map(id => ({ id, ...this.getDashboard(id) }));
    } else {
      // Handle nested categories
      const result = {};
      Object.entries(categoryConfig.dashboards).forEach(([subCategory, dashboardIds]) => {
        result[subCategory] = dashboardIds.map(id => ({ id, ...this.getDashboard(id) }));
      });
      return result;
    }
  }
  
  // Navigate to dashboard
  navigateTo(dashboardId, options = {}) {
    const dashboard = this.getDashboard(dashboardId);
    if (!dashboard) {
      console.error(`Dashboard not found: ${dashboardId}`);
      return false;
    }
    
    // Add to history
    if (this.currentDashboard && this.currentDashboard !== dashboardId) {
      this.history.push(this.currentDashboard);
    }
    
    this.currentDashboard = dashboardId;
    
    // Navigate to dashboard
    if (options.newTab) {
      window.open(dashboard.path, '_blank');
    } else {
      window.location.href = dashboard.path;
    }
    
    return true;
  }
  
  // Go back to previous dashboard
  goBack() {
    if (this.history.length > 0) {
      const previousDashboard = this.history.pop();
      this.navigateTo(previousDashboard);
    } else {
      // Go back to main dashboard selector
      window.location.href = 'index.html';
    }
  }
  
  // Get dashboard comparison data
  compareDashboards(dashboardIds) {
    return dashboardIds.map(id => {
      const config = this.getDashboard(id);
      if (!config) return null;
      
      return {
        id,
        name: config.name,
        features: config.features.length,
        dataSources: config.dataSources.length,
        type: config.type,
        version: config.version
      };
    }).filter(Boolean);
  }
  
  // Check if dashboard supports data source
  dashboardSupportsDataSource(dashboardId, dataSource) {
    const dashboard = this.getDashboard(dashboardId);
    return dashboard ? dashboard.dataSources.includes(dataSource) : false;
  }
  
  // Get recommended dashboard based on preferences
  getRecommendedDashboard(preferences = {}) {
    const { 
      preferredVisualization = null,
      primaryDataSource = null,
      analysisDepth = 'overview'
    } = preferences;
    
    const dashboards = this.getActiveDashboards();
    
    // Score dashboards based on preferences
    const scored = dashboards.map(dashboard => {
      let score = 0;
      
      if (preferredVisualization && dashboard.type === preferredVisualization) {
        score += 10;
      }
      
      if (primaryDataSource && dashboard.dataSources.includes(primaryDataSource)) {
        score += 5;
      }
      
      // Simple heuristic for analysis depth
      if (analysisDepth === 'detailed' && dashboard.features.length > 4) {
        score += 3;
      } else if (analysisDepth === 'overview' && dashboard.features.length <= 4) {
        score += 3;
      }
      
      return { ...dashboard, score };
    });
    
    // Return highest scored dashboard
    scored.sort((a, b) => b.score - a.score);
    return scored[0] || null;
  }
  
  // Validate dashboard configuration
  validateDashboard(dashboardId) {
    const dashboard = this.getDashboard(dashboardId);
    if (!dashboard) return { valid: false, errors: ['Dashboard not found'] };
    
    const errors = [];
    
    // Check required fields
    const required = ['name', 'path', 'type', 'dataSources'];
    required.forEach(field => {
      if (!dashboard[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    });
    
    // Check data sources exist
    dashboard.dataSources?.forEach(source => {
      if (!DATA_CONFIG.sources[source]) {
        errors.push(`Invalid data source: ${source}`);
      }
    });
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
}

// Export singleton instance
export const dashboardManager = new DashboardManager();

// Analytics tracking for dashboard usage
export class DashboardAnalytics {
  constructor() {
    this.sessions = [];
    this.currentSession = null;
  }
  
  startSession(dashboardId) {
    this.currentSession = {
      dashboardId,
      startTime: new Date(),
      interactions: [],
      endTime: null
    };
  }
  
  trackInteraction(type, details = {}) {
    if (this.currentSession) {
      this.currentSession.interactions.push({
        type,
        details,
        timestamp: new Date()
      });
    }
  }
  
  endSession() {
    if (this.currentSession) {
      this.currentSession.endTime = new Date();
      this.sessions.push(this.currentSession);
      this.currentSession = null;
    }
  }
  
  getUsageStats() {
    const stats = {
      totalSessions: this.sessions.length,
      byDashboard: {},
      avgSessionDuration: 0,
      topInteractions: {}
    };
    
    let totalDuration = 0;
    
    this.sessions.forEach(session => {
      // Dashboard usage
      if (!stats.byDashboard[session.dashboardId]) {
        stats.byDashboard[session.dashboardId] = 0;
      }
      stats.byDashboard[session.dashboardId]++;
      
      // Session duration
      if (session.endTime) {
        const duration = session.endTime - session.startTime;
        totalDuration += duration;
      }
      
      // Interactions
      session.interactions.forEach(interaction => {
        if (!stats.topInteractions[interaction.type]) {
          stats.topInteractions[interaction.type] = 0;
        }
        stats.topInteractions[interaction.type]++;
      });
    });
    
    stats.avgSessionDuration = this.sessions.length > 0 ? totalDuration / this.sessions.length : 0;
    
    return stats;
  }
}

export const analytics = new DashboardAnalytics();
