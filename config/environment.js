// Environment Configuration for Dashboard Suite
export const ENV_CONFIG = {
  // Development environment settings
  development: {
    debug: true,
    dataRefreshInterval: 30000, // 30 seconds
    enableAnalytics: false,
    enablePerformanceMonitoring: true,
    cacheTimeout: 5000, // 5 seconds
    apiEndpoint: null, // Use local CSV files
    enableHotReload: true
  },
  
  // Production environment settings
  production: {
    debug: false,
    dataRefreshInterval: 300000, // 5 minutes
    enableAnalytics: true,
    enablePerformanceMonitoring: false,
    cacheTimeout: 60000, // 1 minute
    apiEndpoint: null, // Use local CSV files
    enableHotReload: false
  },
  
  // Testing environment settings
  testing: {
    debug: true,
    dataRefreshInterval: 10000, // 10 seconds
    enableAnalytics: false,
    enablePerformanceMonitoring: true,
    cacheTimeout: 1000, // 1 second
    apiEndpoint: null,
    enableHotReload: false,
    useMockData: true
  }
};

// Detect current environment
function detectEnvironment() {
  // Check for development indicators
  if (window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '') {
    return 'development';
  }
  
  // Check for testing indicators
  if (window.location.search.includes('test=true') ||
      window.location.hostname.includes('test')) {
    return 'testing';
  }
  
  // Default to production
  return 'production';
}

// Get current environment configuration
export function getCurrentConfig() {
  const env = detectEnvironment();
  return {
    environment: env,
    ...ENV_CONFIG[env]
  };
}

// Feature flags
export const FEATURE_FLAGS = {
  // Dashboard features
  enableComparativeView: true,
  enableAdvancedFiltering: true,
  enableDataExport: true,
  enableUserPreferences: false, // Future feature
  
  // Visualization features
  enableAnimations: true,
  enableInteractiveTooltips: true,
  enableZoomControls: true,
  enableKeyboardNavigation: true,
  
  // Performance features
  enableVirtualScrolling: false, // For large datasets
  enableWorkerThreads: false, // For heavy computations
  enableProgressiveLoading: true,
  
  // Experimental features
  enableRealtimeUpdates: false,
  enableCollaboration: false,
  enableAIInsights: false
};

// Browser compatibility check
export function checkBrowserCompatibility() {
  const requirements = {
    es6: typeof Symbol !== 'undefined',
    fetch: typeof fetch !== 'undefined',
    promises: typeof Promise !== 'undefined',
    svg: document.createElementNS && document.createElementNS('http://www.w3.org/2000/svg', 'svg').createSVGRect,
    d3: typeof d3 !== 'undefined'
  };
  
  const missing = Object.entries(requirements)
    .filter(([feature, supported]) => !supported)
    .map(([feature]) => feature);
  
  return {
    compatible: missing.length === 0,
    missing: missing,
    score: (Object.keys(requirements).length - missing.length) / Object.keys(requirements).length
  };
}

// Performance monitoring utilities
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.config = getCurrentConfig();
  }
  
  startTimer(label) {
    if (!this.config.enablePerformanceMonitoring) return;
    
    this.metrics.set(label, {
      start: performance.now(),
      end: null,
      duration: null
    });
  }
  
  endTimer(label) {
    if (!this.config.enablePerformanceMonitoring) return;
    
    const metric = this.metrics.get(label);
    if (metric) {
      metric.end = performance.now();
      metric.duration = metric.end - metric.start;
      
      if (this.config.debug) {
        console.log(`⏱️ ${label}: ${metric.duration.toFixed(2)}ms`);
      }
    }
  }
  
  getMetric(label) {
    return this.metrics.get(label);
  }
  
  getAllMetrics() {
    return Object.fromEntries(this.metrics);
  }
  
  clearMetrics() {
    this.metrics.clear();
  }
}

// Debug utilities
export class DebugUtils {
  constructor() {
    this.config = getCurrentConfig();
    this.logs = [];
  }
  
  log(message, data = null, level = 'info') {
    if (!this.config.debug) return;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };
    
    this.logs.push(logEntry);
    
    // Console output with styling
    const styles = {
      info: 'color: #3b82f6',
      warn: 'color: #f59e0b',
      error: 'color: #ef4444',
      success: 'color: #10b981'
    };
    
    console.log(
      `%c[${level.toUpperCase()}] ${message}`,
      styles[level] || styles.info,
      data || ''
    );
    
    // Keep only last 100 logs
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100);
    }
  }
  
  info(message, data) {
    this.log(message, data, 'info');
  }
  
  warn(message, data) {
    this.log(message, data, 'warn');
  }
  
  error(message, data) {
    this.log(message, data, 'error');
  }
  
  success(message, data) {
    this.log(message, data, 'success');
  }
  
  getLogs() {
    return this.logs;
  }
  
  exportLogs() {
    const logsJson = JSON.stringify(this.logs, null, 2);
    const blob = new Blob([logsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Error handling utilities
export class ErrorHandler {
  constructor() {
    this.errors = [];
    this.config = getCurrentConfig();
    this.setupGlobalErrorHandling();
  }
  
  setupGlobalErrorHandling() {
    // Catch JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError({
        type: 'javascript',
        message: event.error?.message || event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack
      });
    });
    
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        type: 'promise',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack
      });
    });
  }
  
  handleError(error) {
    const errorEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...error,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    this.errors.push(errorEntry);
    
    if (this.config.debug) {
      console.error('🚨 Error captured:', errorEntry);
    }
    
    // Keep only last 50 errors
    if (this.errors.length > 50) {
      this.errors = this.errors.slice(-50);
    }
    
    // In production, you might want to send errors to a logging service
    if (this.config.environment === 'production') {
      this.sendErrorToService(errorEntry);
    }
  }
  
  sendErrorToService(error) {
    // Placeholder for error reporting service
    // In a real implementation, you would send this to your error tracking service
    console.log('Would send error to service:', error);
  }
  
  getErrors() {
    return this.errors;
  }
  
  clearErrors() {
    this.errors = [];
  }
}

// Cache management
export class CacheManager {
  constructor() {
    this.cache = new Map();
    this.config = getCurrentConfig();
  }
  
  set(key, value, customTimeout = null) {
    const timeout = customTimeout || this.config.cacheTimeout;
    const expiry = Date.now() + timeout;
    
    this.cache.set(key, {
      value,
      expiry
    });
  }
  
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  has(key) {
    return this.get(key) !== null;
  }
  
  delete(key) {
    return this.cache.delete(key);
  }
  
  clear() {
    this.cache.clear();
  }
  
  size() {
    return this.cache.size;
  }
  
  // Clean expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

// Initialize global utilities
export const perf = new PerformanceMonitor();
export const debug = new DebugUtils();
export const errorHandler = new ErrorHandler();
export const cache = new CacheManager();

// Auto-cleanup cache every minute
setInterval(() => {
  cache.cleanup();
}, 60000);

// Expose utilities globally for debugging
if (getCurrentConfig().debug) {
  window.DashboardEnv = {
    config: getCurrentConfig(),
    featureFlags: FEATURE_FLAGS,
    perf,
    debug,
    errorHandler,
    cache,
    checkCompatibility: checkBrowserCompatibility
  };
  
  debug.info('Dashboard environment loaded', {
    environment: getCurrentConfig().environment,
    compatibility: checkBrowserCompatibility()
  });
}
