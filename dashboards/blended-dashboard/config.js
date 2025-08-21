// Configuration for the Blended Dashboard
const config = {
    // Data version control
    DATA_VERSION: 'v2', // 'v1' or 'v2'
    
    // Data paths for v1 (original)
    dataPathsV1: {
        manufacturer: '../Data/Pathmathics_Brand_Manufacturer_Classified.csv',
        dme: '../Data/Pathmatics_DME_classified.csv',
        instagram: '../Data/SM_IG_rows_all.csv',
        tiktok: '../Data/SM_TikTok_rows_1_20000.csv'
    },
    
    // Data paths for v2 (new structure)
    dataPathsV2: {
        manufacturer: '../Data/Pathmathics_Brand_Manufacturer_Classified_v2.csv',
        dme: '../Data/Pathmatics_DME_classified_v2.csv',
        instagram: '../Data/SM_IG_Breast_Pump_Brands_analyzed_v2.csv',
        tiktok: '../Data/SM_TikTok_Breast_Pump_Brands_analyzed_v2.csv'
    },
    
    // Get current data paths based on version
    get dataPaths() {
        return this.DATA_VERSION === 'v2' ? this.dataPathsV2 : this.dataPathsV1;
    },
    
    // Default filters
    defaultFilters: {
        mainCategory: 'all',
        productFocus: 'all',
        channel: 'all',
        advertiser: 'all'
    },
    
    // Chart configuration
    chart: {
        height: '600px',
        colors: {
            'EMOTIONAL SUPPORT & WELLNESS': '#FF6B6B',
            'AUTHENTIC COMMUNITY & PEER VALIDATION': '#4ECDC4',
            'MEDICAL ENDORSEMENT & CLINICAL TRUST': '#45B7D1',
            'EVERYDAY PRACTICALITY': '#96CEB4',
            'PORTABILITY & DISCREET DESIGN': '#FFEAA7',
            'PRICE VS VALUE': '#DDA0DD',
            'SUPPORT FOR WORKING MOMS': '#FF8A80',
            'default': '#95A5A6'
        }
    },
    
    // Marketing themes normalization
    marketingThemes: {
        // Normalize theme names for consistency
        normalize: (theme) => {
            if (!theme) return 'Uncategorized';
            return theme.trim().toUpperCase();
        },
        
        // Explode multiple themes separated by semicolon
        explode: (themesString) => {
            if (!themesString) return ['Uncategorized'];
            return themesString.split(';')
                .map(theme => theme.trim())
                .filter(theme => theme.length > 0)
                .map(theme => config.marketingThemes.normalize(theme));
        }
    },
    
    // Brand normalization
    brands: {
        normalize: (brand) => {
            if (!brand) return 'Unknown';
            return brand.trim();
        }
    }
};
