// Bubble Chart Dashboard Application
// Marketing themes analysis with bubble chart visualization

// Global state
let state = {
    data: {
        manufacturer: [],
        dme: [],
        instagram: [],
        tiktok: []
    },
    filters: {
        marketingTheme: 'all',
        brandType: 'all',
        channel: 'all',
        advertiser: 'all',
        productFocus: 'all',
        dataSource: 'all',
        excludeNone: true, // New filter to exclude NONE categories
        showDMEBorders: true // New filter to show DME borders
    },
    // Expansion state management
    expansionState: {
        themes: new Map(), // Map of theme ID -> { expanded: boolean }
        brands: new Map()  // Map of brand ID -> { expanded: boolean }
    }
};

// Marketing themes configuration
const MARKETING_THEMES = {
    'SUPPORT FOR WORKING MOMS': 'Support for Working Moms',
    'EMOTIONAL SUPPORT & WELLNESS': 'Emotional Support & Wellness',
    'AUTHENTIC COMMUNITY & PEER VALIDATION': 'Authentic Community & Peer Validation',
    'MEDICAL ENDORSEMENT & CLINICAL TRUST': 'Medical Endorsement & Clinical Trust',
    'EVERYDAY PRACTICALITY': 'Everyday Practicality',
    'PORTABILITY & DISCREET DESIGN': 'Portability & Discreet Design',
    'PRICE VS VALUE': 'Price vs Value',
    'NONE': 'None'
};

// Brand unification mapping
const BRAND_MAPPING = {
    // Pathmatics Brand Manufacturer variations
    'Eufy': 'Eufy',
    'Momcozy': 'Momcozy',
    'Elvie (Chiaro Technology Ltd)': 'Elvie',
    'Avent': 'Avent',
    'Lansinoh Laboratories, Inc.': 'Lansinoh',
    'WillowPump (Exploramed NC7, Inc.)': 'Willow',
    'Evenflo': 'Evenflo',
    'Motif Medical': 'Motif Medical',
    "Dr. Brown's (Handi-Craft Company)": "Dr. Brown's",
    'TOMMEE TIPPEE (Mayborn USA Inc.)': 'Tommee Tippee',
    'Medela Inc.': 'Medela',
    'Baby Buddha Products': 'Baby Buddha',
    'Freemie': 'Freemie',
    'Pumpables': 'Pumpables',
    'Spectra Baby': 'Spectra',
    
    // Pathmatics DME variations
    'Babylist, Inc': 'Babylist',
    'Aeroflow, Inc.': 'Aeroflow',
    'RGH ENTERPRISES, INC. (Edgepark Medical Supplies)': 'Edgepark',
    'Byram Healthcare Centers, Inc.': 'Byram Healthcare',
    
    // Social Media variations
    'Babylist Baby Registry': 'Babylist',
    'BabyBuddha® Breast Pump & Accessories': 'Baby Buddha',
    'Hygeia Health': 'Hygeia',
    'willowpump': 'Willow',
    'Elvie': 'Elvie',
    "Dr. Brown's": "Dr. Brown's",
    'Medela': 'Medela',
    'Pippeta | Feeding Real Easy': 'Pippeta',
    'Hegen | Cherish Nature\'s Gift': 'Hegen',
    'Aeroflow Breastpumps': 'Aeroflow',
    'Ameda': 'Ameda',
    'Ardo USA': 'Ardo',
    'Byram Healthcare': 'Byram Healthcare',
    'Haakaa USA': 'Haakaa',
    'LansinohUSA': 'Lansinoh',
    'Momcozy Official': 'Momcozy',
    'Willow Pump': 'Willow',
    'Elvie | Women\'s Health': 'Elvie',
    'Evenflo Feeding': 'Evenflo',
    'Freemiebreastpumps': 'Freemie',
    'Zomee': 'Zomee',
    'Motif Medical': 'Motif Medical',
    'BabyBuddha': 'Baby Buddha',
    'Babylist': 'Babylist',
    'Hegen': 'Hegen',
    'Pippeta': 'Pippeta',
    'Mamava': 'Mamava',
    'Loulou Lollipop': 'Loulou Lollipop',
    'Boppy': 'Boppy',
    'Frida': 'Frida',
    'Nanit': 'Nanit',
    'Newton Baby': 'Newton Baby',
    'Wildbird': 'Wildbird',
    'Woolino': 'Woolino',
    'Baby Cottons': 'Baby Cottons',
    'Inglesina': 'Inglesina',
    'Bugaboo': 'Bugaboo',
    'Anna Bella': 'Anna Bella',
    'Nurture&': 'Nurture&',
    'The Feeding Company': 'The Feeding Company',
    'Loulou and Company': 'Loulou and Company',
    'The Honest Company': 'The Honest Company',
    'Owlet': 'Owlet',
    'Safety 1st': 'Safety 1st',
    'Stokke': 'Stokke',
    'Tiny Love': 'Tiny Love',
    'UBBI': 'UBBI',
    'Zoestrollers': 'Zoe Strollers',
    'Bobbie': 'Bobbie',
    'The Baby\'s Brew': 'The Baby\'s Brew',
    'State Bags': 'State Bags',
    'Wildbird': 'Wildbird',
    'Woolino': 'Woolino',
    'Baby Cottons': 'Baby Cottons',
    'Inglesina': 'Inglesina',
    'Bugaboo': 'Bugaboo',
    'Anna Bella': 'Anna Bella',
    'Nurture&': 'Nurture&',
    'The Feeding Company': 'The Feeding Company',
    'Loulou and Company': 'Loulou and Company',
    'The Honest Company': 'The Honest Company',
    'Owlet': 'Owlet',
    'Safety 1st': 'Safety 1st',
    'Stokke': 'Stokke',
    'Tiny Love': 'Tiny Love',
    'UBBI': 'UBBI',
    'Zoestrollers': 'Zoe Strollers',
    'Bobbie': 'Bobbie',
    'The Baby\'s Brew': 'The Baby\'s Brew',
    'State Bags': 'State Bags'
};

// Function to normalize brand names
function normalizeBrandName(brandName) {
    if (!brandName || brandName === '' || brandName === 'Unknown') {
        return 'Unknown Brand';
    }
    
    // Check if we have a direct mapping
    if (BRAND_MAPPING[brandName]) {
        return BRAND_MAPPING[brandName];
    }
    
    // If no mapping found, return the original name
    return brandName;
}

// Data normalization layer for v2 compatibility
const dataNormalizer = {
    // Normalize data based on version
    normalizeData: (rawData, sourceType) => {
        if (!rawData || !Array.isArray(rawData)) {
            console.warn(`No data or invalid data for ${sourceType}`);
            return [];
        }
        
        console.log(`Normalizing ${rawData.length} rows for ${sourceType}`);
        
        const normalized = [];
        
        rawData.forEach(row => {
            const normalizedRow = dataNormalizer.normalizeRow(row, sourceType);
            if (normalizedRow) {
                normalized.push(normalizedRow);
            }
        });
        
        console.log(`Normalized ${normalized.length} rows for ${sourceType}`);
        return normalized;
    },
    
    // Normalize individual row
    normalizeRow: (row, sourceType) => {
        try {
            // Determine marketing themes from boolean columns or MARKETING_THEMES column
            let themes = [];
            
            // Check boolean columns first
            const booleanThemes = [
                'SUPPORT FOR WORKING MOMS',
                'EMOTIONAL SUPPORT & WELLNESS',
                'AUTHENTIC COMMUNITY & PEER VALIDATION',
                'MEDICAL ENDORSEMENT & CLINICAL TRUST',
                'EVERYDAY PRACTICALITY',
                'PORTABILITY & DISCREET DESIGN',
                'PRICE VS VALUE'
            ];
            
            booleanThemes.forEach(theme => {
                if (row[theme] === true || row[theme] === 'true' || row[theme] === 1) {
                    themes.push(theme);
                }
            });
            
            // If no themes found from boolean columns, try MARKETING_THEMES column
            if (themes.length === 0 && row.MARKETING_THEMES) {
                themes = row.MARKETING_THEMES.split(';').map(t => t.trim()).filter(t => t);
            }
            
            // If still no themes, mark as NONE
            if (themes.length === 0) {
                themes = ['NONE'];
            }
            
            // Normalize brand names using the mapping system
            const rawBrandRoot = row['Brand Root'] || row.Advertiser || '';
            const rawCompany = row.company || '';
            const normalizedBrandRoot = normalizeBrandName(rawBrandRoot);
            const normalizedCompany = normalizeBrandName(rawCompany);
            
            // Use the best available brand name
            const finalBrandName = normalizedBrandRoot !== 'Unknown Brand' ? normalizedBrandRoot : 
                                  normalizedCompany !== 'Unknown Brand' ? normalizedCompany : 'Unknown Brand';
            
            const normalized = {
                sourceType: sourceType,
                themes: themes,
                Product_Focus: row.focus_vs_other || row.Product_Focus || 'other',
                Channel: sourceType === 'instagram' ? 'IG Feed' : 
                        sourceType === 'tiktok' ? 'TT Feed' : 
                        row.Channel || 'Unspecified',
                Advertiser: finalBrandName,
                'Brand Root': finalBrandName,
                company: finalBrandName,
                // Enhanced impression handling - capture all possible impression columns
                Impressions: parseFloat(row.Impressions) || 0,
                'Spend (USD)': parseFloat(row['Spend (USD)']) || 0,
                engagement_total: parseFloat(row.engagement_total) || 0,
                estimated_impressions: parseFloat(row.estimated_impressions) || 0,
                views: parseFloat(row.views) || 0, // TikTok/Instagram views
                engagement_rate_by_view: parseFloat(row.engagement_rate_by_view) || 0,
                post_type: row.post_type || 'unknown',
                message: row.message || row.Text_x || row.Text_y || '',
                link: row.link || row['Link To Creative'] || row.post_link || '',
                image: row.image || row['Link to Post'] || '',
                // Preserve original data for debugging
                _original: { ...row }
            };
            
            // Debug logging for data normalization
            if (sourceType === 'instagram' || sourceType === 'tiktok') {
                console.log(`Normalized ${sourceType} row:`, {
                    brand: finalBrandName,
                    themes: themes,
                    impressions: normalized.Impressions,
                    estimated_impressions: normalized.estimated_impressions,
                    views: normalized.views,
                    engagement_total: normalized.engagement_total
                });
            }
            
            // Calculate derived metrics
            normalized.CPM = normalized['Spend (USD)'] > 0 && normalized.Impressions > 0 
                ? (normalized['Spend (USD)'] / normalized.Impressions) * 1000 
                : 0;
            
            normalized.Performance_Score = normalized.Impressions > 0 
                ? normalized.Impressions * (normalized.CPM > 0 ? 1 / normalized.CPM : 1)
                : 0;
            
            return normalized;
        } catch (error) {
            console.error(`Error normalizing row for ${sourceType}:`, error, row);
            return null;
        }
    },
    
    // Get unique marketing themes from normalized data
    getUniqueThemes: (data) => {
        const themes = new Set();
        data.forEach(row => {
            if (row.themes) {
                row.themes.forEach(theme => themes.add(theme));
            }
        });
        return Array.from(themes).sort();
    },
    
    // Get unique brands from normalized data
    getUniqueBrands: (data) => {
        const brands = new Set();
        data.forEach(row => {
            const brand = row['Brand Root'] || row.Advertiser || row.company;
            if (brand && brand !== 'Unknown Brand') {
                brands.add(brand);
            }
        });
        return Array.from(brands).sort();
    }
};

// Load and normalize data
async function loadData() {
    console.log('Loading data for Bubble Chart Dashboard');
    
    try {
        // Load all data sources
        const [manufacturer, dme, instagram, tiktok] = await Promise.all([
            d3.csv(config.dataPaths.manufacturer),
            d3.csv(config.dataPaths.dme),
            d3.csv(config.dataPaths.instagram),
            d3.csv(config.dataPaths.tiktok)
        ]);
        
        // Normalize data using the new normalizer
        state.data.manufacturer = dataNormalizer.normalizeData(manufacturer, 'manufacturer');
        state.data.dme = dataNormalizer.normalizeData(dme, 'dme');
        state.data.instagram = dataNormalizer.normalizeData(instagram, 'instagram');
        state.data.tiktok = dataNormalizer.normalizeData(tiktok, 'tiktok');
        
        console.log('Data loaded and normalized:', {
            manufacturer: state.data.manufacturer.length,
            dme: state.data.dme.length,
            instagram: state.data.instagram.length,
            tiktok: state.data.tiktok.length
        });
        
        // Setup filters with normalized data
        setupFilters();
        
        // Initial render
        render();
        
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('bubble-visualization').innerHTML = '<p>Error loading data. Please check the console for details.</p>';
    }
}

// Setup filter options based on normalized data
function setupFilters() {
    // Get all unique categories from all data sources
    const allData = [
        ...state.data.manufacturer,
        ...state.data.dme,
        ...state.data.instagram,
        ...state.data.tiktok
    ];
    
    const themes = dataNormalizer.getUniqueThemes(allData);
    const brands = dataNormalizer.getUniqueBrands(allData);
    
    // Setup marketing theme filter
    updateMarketingThemeFilter(themes);
    
    // Setup brand type filter
    const brandTypeSelect = document.getElementById('brand-type-filter');
    brandTypeSelect.innerHTML = `
        <option value="all">All Brand Types</option>
        <option value="manufacturer">Manufacturer Brands</option>
        <option value="dme">DME Brands</option>
        <option value="social">Social Media Brands</option>
    `;
    
    // Setup channel filter
    const channelSelect = document.getElementById('channel-filter');
    const channels = [...new Set(allData.map(row => row.Channel).filter(Boolean))].sort();
    channelSelect.innerHTML = '<option value="all">All Channels</option>';
    channels.forEach(channel => {
        const option = document.createElement('option');
        option.value = channel;
        option.textContent = channel;
        channelSelect.appendChild(option);
    });
    
    // Setup advertiser/brand filter
    const advertiserSelect = document.getElementById('advertiser-filter');
    advertiserSelect.innerHTML = '<option value="all">All Brands</option>';
    brands.forEach(brand => {
        const option = document.createElement('option');
        option.value = brand;
        option.textContent = brand;
        advertiserSelect.appendChild(option);
    });
    
    // Setup product focus filter
    const focusSelect = document.getElementById('product-focus-filter');
    focusSelect.innerHTML = `
        <option value="all">All Products</option>
        <option value="focus">Breastfeeding Pump</option>
        <option value="other">Other Products</option>
    `;
    
    // Setup data source filter
    const dataSourceSelect = document.getElementById('data-source-filter');
    dataSourceSelect.innerHTML = `
        <option value="all">All Sources</option>
        <option value="pathmatics">Pathmatics (Ads)</option>
        <option value="social">Social Media</option>
    `;
}

// Update marketing theme filter options based on exclude-none setting
function updateMarketingThemeFilter(themes) {
    const themeSelect = document.getElementById('category-filter');
    const currentValue = themeSelect.value; // Remember current selection
    
    themeSelect.innerHTML = '<option value="all">All Themes</option>';
    
    themes.forEach(theme => {
        // Skip NONE theme if exclude-none is enabled
        if (state.filters.excludeNone && theme === 'NONE') {
            return;
        }
        
        const option = document.createElement('option');
        option.value = theme;
        option.textContent = MARKETING_THEMES[theme] || theme;
        themeSelect.appendChild(option);
    });
    
    // Restore selection if it's still valid, otherwise reset to 'all'
    if (currentValue && Array.from(themeSelect.options).some(opt => opt.value === currentValue)) {
        themeSelect.value = currentValue;
    } else {
        themeSelect.value = 'all';
        state.filters.marketingTheme = 'all';
    }
}

// Apply filters to data
function applyFilters() {
    const { marketingTheme, brandType, channel, advertiser, productFocus, dataSource, excludeNone } = state.filters;
    
    let filteredData = [
        ...state.data.manufacturer,
        ...state.data.dme,
        ...state.data.instagram,
        ...state.data.tiktok
    ];
    
    // Apply excludeNone filter first (if enabled)
    if (excludeNone) {
        filteredData = filteredData.filter(row => {
            // Check if the row has themes and none of them are 'NONE'
            return row.themes && row.themes.length > 0 && !row.themes.includes('NONE');
        });
        console.log(`After excluding NONE: ${filteredData.length} rows`);
    }
    
    // Apply marketing theme filter
    if (marketingTheme !== 'all') {
        filteredData = filteredData.filter(row => 
            row.themes && row.themes.includes(marketingTheme)
        );
    }
    
    // Apply brand type filter
    if (brandType !== 'all') {
        filteredData = filteredData.filter(row => {
            if (brandType === 'manufacturer') {
                return row.sourceType === 'manufacturer';
            } else if (brandType === 'dme') {
                return row.sourceType === 'dme';
            } else if (brandType === 'social') {
                return row.sourceType === 'instagram' || row.sourceType === 'tiktok';
            }
            return true;
        });
    }
    
    // Apply data source filter
    if (dataSource !== 'all') {
        filteredData = filteredData.filter(row => {
            if (dataSource === 'pathmatics') {
                return row.sourceType === 'manufacturer' || row.sourceType === 'dme';
            } else if (dataSource === 'social') {
                return row.sourceType === 'instagram' || row.sourceType === 'tiktok';
            }
            return true;
        });
    }
    
    // Apply product focus filter
    if (productFocus !== 'all') {
        filteredData = filteredData.filter(row => row.Product_Focus === productFocus);
    }
    
    // Apply channel filter
    if (channel !== 'all') {
        filteredData = filteredData.filter(row => row.Channel === channel);
    }
    
    // Apply advertiser/brand filter
    if (advertiser !== 'all') {
        filteredData = filteredData.filter(row => {
            const brand = row['Brand Root'] || row.Advertiser || row.company;
            return brand === advertiser;
        });
    }
    
    console.log(`Filtered data: ${filteredData.length} rows`);
    console.log('Marketing theme filter:', marketingTheme);
    console.log('Brand type filter:', brandType);
    console.log('Data source filter:', dataSource);
    console.log('Exclude NONE filter:', excludeNone);
    return filteredData;
}

// Build bubble chart data
function buildBubbleData(data) {
    // Create a map to store theme data with impressions
    const themeDataMap = new Map();
    
    // Process each row and distribute impressions across themes
    data.forEach(row => {
        // Enhanced impression extraction - check all possible impression columns
        let impressions = 0;
        
        // Check all possible impression column names
        if (row.Impressions && row.Impressions > 0) {
            impressions = row.Impressions;
        } else if (row.estimated_impressions && row.estimated_impressions > 0) {
            impressions = row.estimated_impressions;
        } else if (row.views && row.views > 0) {
            impressions = row.views; // TikTok/Instagram views as impressions
        } else if (row.engagement_total && row.engagement_total > 0) {
            impressions = row.engagement_total; // Fallback to engagement as impressions
        }
        
        // Debug logging for rows with 0 impressions
        if (impressions === 0) {
            console.warn('Row with 0 impressions:', {
                sourceType: row.sourceType,
                brand: row['Brand Root'] || row.Advertiser || row.company,
                themes: row.themes,
                availableMetrics: {
                    Impressions: row.Impressions,
                    estimated_impressions: row.estimated_impressions,
                    views: row.views,
                    engagement_total: row.engagement_total
                }
            });
        }
        
        const brand = row['Brand Root'] || row.Advertiser || row.company;
        const normalizedBrand = brand && brand !== 'Unknown Brand' ? brand : 'Unknown Brand';
        const channel = row.Channel || 'Unspecified';
        
        // Get all themes for this row
        const themes = row.themes || ['NONE'];
        
        // Distribute impressions across all themes this row belongs to
        themes.forEach(theme => {
            if (!themeDataMap.has(theme)) {
                themeDataMap.set(theme, {
                    id: theme,
                    name: MARKETING_THEMES[theme] || theme,
                    totalImpressions: 0,
                    brandData: new Map(),
                    data: []
                });
            }
            
            const themeData = themeDataMap.get(theme);
            themeData.totalImpressions += impressions;
            themeData.data.push(row);
            
            // Aggregate brand data within this theme
            if (!themeData.brandData.has(normalizedBrand)) {
                themeData.brandData.set(normalizedBrand, {
                    id: `${theme}.${normalizedBrand}`,
                    name: normalizedBrand,
                    totalImpressions: 0,
                    channelData: new Map(),
                    data: []
                });
            }
            
            const brandData = themeData.brandData.get(normalizedBrand);
            brandData.totalImpressions += impressions;
            brandData.data.push(row);
            
            // Aggregate channel data within this brand
            if (!brandData.channelData.has(channel)) {
                brandData.channelData.set(channel, {
                    id: `${theme}.${normalizedBrand}.${channel}`,
                    name: channel,
                    totalImpressions: 0,
                    data: []
                });
            }
            
            const channelData = brandData.channelData.get(channel);
            channelData.totalImpressions += impressions;
            channelData.data.push(row);
        });
    });
    
    // Convert map to array structure with three levels
    const themeNodes = Array.from(themeDataMap.values()).map(themeData => {
        const brandNodes = Array.from(themeData.brandData.values()).map(brandData => {
            const channelNodes = Array.from(brandData.channelData.values()).map(channelData => ({
                id: channelData.id,
                name: channelData.name,
                value: channelData.totalImpressions, // Use impressions for size
                type: 'channel',
                theme: themeData.id,
                brand: brandData.name,
                data: channelData.data
            }));
            
            return {
                id: brandData.id,
                name: brandData.name,
                value: brandData.totalImpressions, // Use impressions for size
                type: 'brand',
                theme: themeData.id,
                children: channelNodes,
                data: brandData.data
            };
        });
        
        return {
            id: themeData.id,
            name: themeData.name,
            value: themeData.totalImpressions, // Use impressions for size
            type: 'theme',
            children: brandNodes,
            data: themeData.data
        };
    });
    
    console.log('Built theme nodes with impressions:', themeNodes.map(t => ({ 
        id: t.id, 
        name: t.name, 
        value: t.value, 
        formattedValue: formatImpressions(t.value),
        children: t.children.length 
    })));
    
    // Log brands with 0 impressions for debugging
    const brandsWithZeroImpressions = themeNodes.flatMap(theme => 
        theme.children.filter(brand => brand.value === 0)
    );
    
    if (brandsWithZeroImpressions.length > 0) {
        console.warn('Brands with 0 impressions:', brandsWithZeroImpressions.map(b => ({
            name: b.name,
            theme: b.theme,
            dataCount: b.data.length
        })));
    }
    
    return themeNodes;
}

// Render the visualization
function render() {
    const filteredData = applyFilters();
    
    // Update analysis components
    updateAnalysisComponents(filteredData);
    
    // Clear and render bubble chart
    document.getElementById('bubble-visualization').innerHTML = '';
    const bubbleData = buildBubbleData(filteredData);
    console.log('Rendering bubble data:', bubbleData);
    renderBubbleChart('bubble-visualization', bubbleData);
}

// Render only the visualization without updating analysis components
function renderVisualizationOnly() {
    const filteredData = applyFilters();
    
    // Clear and render bubble chart only
    document.getElementById('bubble-visualization').innerHTML = '';
    const bubbleData = buildBubbleData(filteredData);
    console.log('Rendering bubble data (visualization only):', bubbleData);
    renderBubbleChart('bubble-visualization', bubbleData);
}

// Update analysis components with filtered data
function updateAnalysisComponents(data) {
    console.log('updateAnalysisComponents called with', data.length, 'rows');
    
    // Filter data by source type
    const adsData = data.filter(row => row.sourceType === 'manufacturer' || row.sourceType === 'dme');
    const socialData = data.filter(row => row.sourceType === 'instagram' || row.sourceType === 'tiktok');
    
    // Get all data for category benchmark calculation
    const allData = [
        ...state.data.manufacturer,
        ...state.data.dme,
        ...state.data.instagram,
        ...state.data.tiktok
    ];
    
    const allAdsData = allData.filter(d => (d.sourceType === 'manufacturer' || d.sourceType === 'dme'));
    const allSocialData = allData.filter(d => {
        const st = (d.sourceType || '').toLowerCase();
        return st === 'instagram' || st === 'tiktok';
    });
    
    // Initialize analysis components with default data when dashboard loads
    const defaultNode = {
        type: 'overview',
        name: 'All Data',
        data: data,
        theme: '',
        brand: ''
    };
    
    // Call handleBlendedNodeClick with default data to initialize all components
    handleBlendedNodeClick(defaultNode);
}

// Event handlers
function onFilterChange() {
    state.filters.marketingTheme = document.getElementById('category-filter').value;
    state.filters.brandType = document.getElementById('brand-type-filter').value;
    state.filters.channel = document.getElementById('channel-filter').value;
    state.filters.advertiser = document.getElementById('advertiser-filter').value;
    state.filters.productFocus = document.getElementById('product-focus-filter').value;
    state.filters.dataSource = document.getElementById('data-source-filter').value;
    state.filters.excludeNone = document.getElementById('exclude-none-filter').checked;
    state.filters.showDMEBorders = document.getElementById('show-dme-borders').checked;
    
    // If exclude-none filter changed, update the marketing theme filter options
    const excludeNoneCheckbox = document.getElementById('exclude-none-filter');
    if (excludeNoneCheckbox && excludeNoneCheckbox.dataset.lastValue !== excludeNoneCheckbox.checked.toString()) {
        excludeNoneCheckbox.dataset.lastValue = excludeNoneCheckbox.checked.toString();
        
        // Get all unique themes and update the filter
        const allData = [
            ...state.data.manufacturer,
            ...state.data.dme,
            ...state.data.instagram,
            ...state.data.tiktok
        ];
        const themes = dataNormalizer.getUniqueThemes(allData);
        updateMarketingThemeFilter(themes);
    }
    
    render();
}



// Initialize expansion state to ensure all brands start collapsed
function initializeExpansionState() {
    // Clear any existing expansion states
    state.expansionState.themes.clear();
    state.expansionState.brands.clear();
    
    console.log('Initialized expansion state - all themes and brands start collapsed');
}

// Initialize the dashboard
function init() {
    console.log('Initializing Bubble Chart Dashboard');
    
    // Initialize expansion state to ensure all brands start collapsed
    initializeExpansionState();
    
    // Set up the exclude-none checkbox to be checked by default
    const excludeNoneCheckbox = document.getElementById('exclude-none-filter');
    if (excludeNoneCheckbox) {
        excludeNoneCheckbox.checked = state.filters.excludeNone;
        excludeNoneCheckbox.dataset.lastValue = excludeNoneCheckbox.checked.toString(); // Initialize dataset
    }
    
    // Set up the show DME borders checkbox to be checked by default
    const showDMEBordersCheckbox = document.getElementById('show-dme-borders');
    if (showDMEBordersCheckbox) {
        showDMEBordersCheckbox.checked = state.filters.showDMEBorders;
    }
    
    // Load data
    loadData();
    
    // Setup event listeners for filters
    document.getElementById('category-filter').addEventListener('change', onFilterChange);
    document.getElementById('brand-type-filter').addEventListener('change', onFilterChange);
    document.getElementById('channel-filter').addEventListener('change', onFilterChange);
    document.getElementById('advertiser-filter').addEventListener('change', onFilterChange);
    document.getElementById('product-focus-filter').addEventListener('change', onFilterChange);
    document.getElementById('data-source-filter').addEventListener('change', onFilterChange);
    document.getElementById('exclude-none-filter').addEventListener('change', onFilterChange);
    document.getElementById('show-dme-borders').addEventListener('change', onFilterChange);
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
    const bestPostBrand = bestPost ? bestPost.company : 'Unknown';
    const bestPostEngagement = bestPost ? bestPost.engagement.toLocaleString() : '0';
    const bestPostPlatform = bestPost ? (bestPost.sourceType || 'Unknown').toUpperCase() : 'Unknown';
    const bestPostEngagementRate = bestPost && bestPost.estimated_impressions > 0 ? ((bestPost.engagement / bestPost.estimated_impressions) * 100).toFixed(2) : '0.00';

    // Calculate overall metrics
    const totalEngagement = d3.sum(rows, d => Number(d.engagement_total || 0));
    const totalImpressions = d3.sum(rows, d => Number(d.estimated_impressions || 0));
    const avgEngagementRate = totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0;

    // Generate analysis paragraphs
    const catContext = mainCategoryName ? ` in the "${mainCategoryName}" category` : '';
    const p1 = `The best performing social post in ${contextLabel}${catContext} is from ${bestPostBrand} on ${bestPostPlatform} with ${bestPostEngagement} engagements and ${bestPostEngagementRate}% engagement rate. The post focuses on "${bestPostText.substring(0, 80)}..." and demonstrates strong community connection.`;

    const p2 = topThemes.length > 0 
        ? `Content analysis reveals that the most effective themes are "${topThemes.join('", "')}", appearing in ${Math.round((topThemes.length / THEME_RULES.length) * 100)}% of top posts. The average engagement rate across all ${rows.length} posts is ${avgEngagementRate.toFixed(2)}%, indicating ${avgEngagementRate > 5 ? 'strong' : 'moderate'} community resonance for this selection.`
        : `Content themes are diverse across the top performers, with no single theme dominating. The average engagement rate across all ${rows.length} posts is ${avgEngagementRate.toFixed(2)}%, suggesting ${avgEngagementRate > 5 ? 'good' : 'moderate'} community engagement in this category.`;

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

// Content analysis helpers
function analyzeAdContent(ads) {
    const themes = [];
    const text = ads.map(ad => ad.message || ad.Text_x || ad.Text_y || '').join(' ').toLowerCase();
    
    if (text.includes('breast') || text.includes('pump') || text.includes('feeding')) {
        themes.push('breastfeeding support');
    }
    if (text.includes('comfort') || text.includes('easy') || text.includes('convenient')) {
        themes.push('convenience');
    }
    if (text.includes('quality') || text.includes('premium') || text.includes('best')) {
        themes.push('quality assurance');
    }
    if (text.includes('free') || text.includes('save') || text.includes('discount')) {
        themes.push('value proposition');
    }
    
    return themes.length > 0 ? themes : ['general product messaging'];
}

function analyzeSocialContent(posts) {
    const themes = [];
    const text = posts.map(post => post.message || '').join(' ').toLowerCase();
    
    if (text.includes('community') || text.includes('support') || text.includes('mom')) {
        themes.push('community support');
    }
    if (text.includes('lifestyle') || text.includes('daily') || text.includes('routine')) {
        themes.push('lifestyle integration');
    }
    if (text.includes('education') || text.includes('tips') || text.includes('advice')) {
        themes.push('educational content');
    }
    if (text.includes('testimonial') || text.includes('review') || text.includes('experience')) {
        themes.push('user testimonials');
    }
    
    return themes.length > 0 ? themes : ['general social content'];
}

// Utility functions
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// Enhanced formatting for impressions
function formatImpressions(num) {
    if (num >= 1000000000) {
        return (num / 1000000000).toFixed(1) + 'B';
    } else if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// Expansion/Collapse Management Functions
function toggleThemeExpansion(themeId) {
    const currentState = state.expansionState.themes.get(themeId) || { expanded: false };
    const willExpand = !currentState.expanded;
    
    state.expansionState.themes.set(themeId, { expanded: willExpand });
    
    // When expanding a theme, collapse all other themes
    if (willExpand) {
        state.expansionState.themes.forEach((state, id) => {
            if (id !== themeId) {
                state.expanded = false;
            }
        });
        
        // Clear any specific theme filter to show only the expanded theme
        if (state.filters.marketingTheme !== 'all') {
            state.filters.marketingTheme = 'all';
            // Update the filter dropdown to reflect the change
            const themeSelect = document.getElementById('category-filter');
            if (themeSelect) {
                themeSelect.value = 'all';
            }
        }
    }
    
    // Re-render the visualization
    render();
}

function toggleBrandExpansion(brandId) {
    const currentState = state.expansionState.brands.get(brandId) || { expanded: false };
    const willExpand = !currentState.expanded;
    
    state.expansionState.brands.set(brandId, { expanded: willExpand });
    
    // When expanding a brand, collapse all other brands
    if (willExpand) {
        state.expansionState.brands.forEach((state, id) => {
            if (id !== brandId) {
                state.expanded = false;
            }
        });
    }
    
    // Re-render the visualization
    render();
}

function isThemeExpanded(themeId) {
    return state.expansionState.themes.get(themeId)?.expanded || false;
}

function isBrandExpanded(brandId) {
    return state.expansionState.brands.get(brandId)?.expanded || false;
}

function getVisibleNodes(data) {
    const visibleNodes = [];
    
    // Check if we have a specific theme filter
    const selectedTheme = state.filters.marketingTheme;
    
    // Check if any theme is expanded (for focus mode)
    const expandedTheme = Array.from(state.expansionState.themes.entries())
        .find(([id, state]) => state.expanded);
    
    // Check if any brand is expanded (for brand focus mode)
    const expandedBrand = Array.from(state.expansionState.brands.entries())
        .find(([id, state]) => state.expanded);
    
    data.forEach(theme => {
        // Skip themes that don't match the filter
        if (selectedTheme !== 'all' && theme.id !== selectedTheme) {
            return;
        }
        
        // Check if this theme is expanded (when no specific filter is selected)
        const isExpanded = isThemeExpanded(theme.id);
        
        // Show theme nodes only if:
        // 1. No specific theme filter is selected AND no theme is expanded (show all themes)
        // 2. OR if this is the selected theme from filter
        // 3. OR if this is the expanded theme (focus mode)
        // 4. OR if a brand is expanded (show the parent theme of the expanded brand)
        if ((selectedTheme === 'all' && !expandedTheme && !expandedBrand) || 
            theme.id === selectedTheme || 
            (expandedTheme && theme.id === expandedTheme[0]) ||
            (expandedBrand && theme.children && theme.children.some(brand => brand.id === expandedBrand[0]))) {
            visibleNodes.push({
                id: theme.id,
                name: theme.name,
                value: theme.value,
                type: 'theme',
                data: theme.data
            });
        }
        
        // Show brand nodes if:
        // 1. Theme is expanded (focus mode) AND no brand is expanded
        // 2. OR if a specific theme is selected from filter AND no brand is expanded
        // 3. OR if this is the expanded brand (brand focus mode)
        if (((isExpanded || selectedTheme !== 'all') && !expandedBrand) || 
            expandedBrand) {
            theme.children.forEach(brand => {
                // Only show the expanded brand when in brand focus mode
                if (expandedBrand && brand.id !== expandedBrand[0]) {
                    return;
                }
                
                visibleNodes.push({
                    id: brand.id,
                    name: brand.name,
                    value: brand.value,
                    type: 'brand',
                    theme: theme.id,
                    data: brand.data
                });
                
                // Show channel nodes ONLY if brand is explicitly expanded
                if (isBrandExpanded(brand.id) && brand.children) {
                    brand.children.forEach(channel => {
                        visibleNodes.push({
                            id: channel.id,
                            name: channel.name,
                            value: channel.value,
                            type: 'channel',
                            theme: theme.id,
                            brand: brand.name,
                            data: channel.data
                        });
                    });
                }
            });
        }
    });
    
    return visibleNodes;
}

// Bubble Chart visualization
function renderBubbleChart(containerId, data) {
    const containerElement = document.getElementById(containerId);
    if (!containerElement) {
        console.error('Container not found:', containerId);
        return;
    }
    
    try {
        // Clear container
        containerElement.innerHTML = '';
        containerElement.style.height = '800px'; // Increased height
        
        // Get container dimensions
        const containerWidth = containerElement.clientWidth || 928;
        const containerHeight = 800;
        const margin = 20; // Increased margin
        
        // Helper functions
        const name = d => d.id.split(".").pop(); // "Strings" of "flare.util.Strings"
        const group = d => d.id.split(".")[1]; // "util" of "flare.util.Strings"
        const names = d => name(d).split(/(?=[A-Z][a-z])|\s+/g); // ["Legend", "Item"] of "flare.vis.legend.LegendItems"
        
        // Specify the number format for values
        const format = d3.format(",d");
        
                 // Create a categorical color scale with consistent theme colors
         const color = d3.scaleOrdinal(d3.schemeTableau10);
         
         // Ensure consistent color mapping for themes
         const themeColors = new Map();
         data.forEach(theme => {
             if (!themeColors.has(theme.id)) {
                 themeColors.set(theme.id, color(theme.id));
             }
         });
        
        // Get visible nodes based on expansion state
        const flattenedData = getVisibleNodes(data);
        
        // Calculate value ranges for scaling
        const allValues = flattenedData.map(d => d.value);
        const minValue = Math.min(...allValues);
        const maxValue = Math.max(...allValues);
        
        // Create a better scale for bubble sizes
        // Use square root scale for better visual distribution
        const sizeScale = d3.scaleSqrt()
            .domain([minValue, maxValue])
            .range([8, 60]); // Minimum 8px radius, maximum 60px radius
        
        // Apply the scale to the data
        const scaledData = flattenedData.map(d => ({
            ...d,
            scaledValue: sizeScale(d.value)
        }));
        
        // Create the pack layout with scaled values
        const pack = d3.pack()
            .size([containerWidth - margin * 2, containerHeight - margin * 2])
            .padding(5); // Increased padding
        
        // Compute the hierarchy from the scaled data
        const root = pack(d3.hierarchy({children: scaledData})
            .sum(d => d.scaledValue));
        
        // Create the SVG container
        const svg = d3.select(containerElement)
            .append("svg")
            .attr("width", containerWidth)
            .attr("height", containerHeight)
            .attr("viewBox", [0, 0, containerWidth, containerHeight])
            .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;")
            .attr("text-anchor", "middle");
        
        // Place each (leaf) node according to the layout's x and y values
        const node = svg.append("g")
            .selectAll()
            .data(root.leaves())
            .join("g")
            .attr("transform", d => `translate(${d.x + margin},${d.y + margin})`)
            .style("cursor", "pointer")
                                                    .on("click", (event, d) => {
                   event.stopPropagation();
                   console.log('Clicked node:', d.data);

                   // Handle click based on node type
                   if (d.data.type === 'theme') {
                       // Check if we're in brand focus mode
                       const expandedBrand = Array.from(state.expansionState.brands.entries())
                           .find(([id, state]) => state.expanded);

                       if (expandedBrand) {
                           // If we're in brand focus mode, clicking the theme should collapse the brand
                           // and return to theme focus mode (showing all brands of this theme)
                           state.expansionState.brands.set(expandedBrand[0], { expanded: false });
                           console.log('Returning from brand focus to theme focus');
                       } else {
                           // Normal theme expansion behavior
                           toggleThemeExpansion(d.data.id);
                       }
                   } else if (d.data.type === 'brand') {
                       toggleBrandExpansion(d.data.id);
                   } else if (d.data.type === 'channel') {
                       // For channels, you could add additional functionality
                       console.log('Channel clicked:', d.data.name);
                   }

                   // Update blended analysis components
                   handleBlendedNodeClick(d.data);

                   // Re-render visualization only (not analysis components)
                   renderVisualizationOnly();
               })
            .on("mouseover", function(event, d) {
                                 // Create custom tooltip
                 const tooltip = d3.select("body").append("div")
                     .attr("class", "custom-tooltip")
                     .style("position", "absolute")
                     .style("background-color", d.data.type === 'theme' ? (themeColors.get(d.data.id) || color(d.data.id)) : (themeColors.get(d.data.theme) || color(d.data.theme)))
                     .style("color", "white")
                     .style("padding", "8px 12px")
                     .style("border-radius", "6px")
                     .style("font-size", "12px")
                     .style("font-weight", "500")
                     .style("border", `2px solid ${d.data.type === 'theme' ? (themeColors.get(d.data.id) || color(d.data.id)) : (themeColors.get(d.data.theme) || color(d.data.theme))}`)
                     .style("box-shadow", "0 4px 8px rgba(0,0,0,0.2)")
                     .style("z-index", "1000")
                     .style("pointer-events", "none")
                     .style("white-space", "nowrap");
                
                                 // Set tooltip content based on element type
                 let tooltipContent = '';
                 if (d.data.type === 'theme') {
                     const isExpanded = isThemeExpanded(d.data.id);
                     const expandedBrand = Array.from(state.expansionState.brands.entries())
                         .find(([id, state]) => state.expanded);
                     
                     if (expandedBrand) {
                         // If we're in brand focus mode, show return behavior
                         tooltipContent = `${d.data.name}<br><strong>${formatImpressions(d.data.value)} impressions</strong><br><em>Click to return to all brands</em>`;
                     } else {
                         // Normal theme behavior
                         tooltipContent = `${d.data.name}<br><strong>${formatImpressions(d.data.value)} impressions</strong><br><em>Click to ${isExpanded ? 'show all themes' : 'focus on this theme'}</em>`;
                     }
                 } else if (d.data.type === 'brand') {
                     const isExpanded = isBrandExpanded(d.data.id);
                     tooltipContent = `${d.data.name}<br><strong>${formatImpressions(d.data.value)} impressions</strong><br><em>Click to ${isExpanded ? 'show all brands' : 'focus on this brand'}</em>`;
                 } else {
                     // For channels, include brand name
                     tooltipContent = `${d.data.name}<br><em>${d.data.brand}</em><br><strong>${formatImpressions(d.data.value)} impressions</strong>`;
                 }
                
                tooltip.html(tooltipContent);
                
                // Position tooltip
                const [mouseX, mouseY] = d3.pointer(event);
                const tooltipNode = tooltip.node();
                const tooltipRect = tooltipNode.getBoundingClientRect();
                
                let left = event.pageX + 10;
                let top = event.pageY - tooltipRect.height - 10;
                
                // Adjust if tooltip goes off screen
                if (left + tooltipRect.width > window.innerWidth) {
                    left = event.pageX - tooltipRect.width - 10;
                }
                if (top < 0) {
                    top = event.pageY + 10;
                }
                
                tooltip.style("left", left + "px")
                       .style("top", top + "px");
            })
            .on("mouseout", function() {
                // Remove custom tooltip
                d3.selectAll(".custom-tooltip").remove();
            });
        
        // Add a filled circle with animation
        const circles = node.append("circle")
            .attr("fill-opacity", 0.7)
                         .attr("fill", d => {
                 if (d.data.type === 'theme') {
                     return themeColors.get(d.data.id) || color(d.data.id);
                 } else if (d.data.type === 'brand') {
                     // For brands, use a brighter version of the theme color
                     const themeColor = d3.color(themeColors.get(d.data.theme) || color(d.data.theme));
                     return themeColor ? themeColor.brighter(0.4) : (themeColors.get(d.data.theme) || color(d.data.theme));
                 } else {
                     // For channels, use an even brighter version of the theme color
                     const themeColor = d3.color(themeColors.get(d.data.theme) || color(d.data.theme));
                     return themeColor ? themeColor.brighter(0.8) : (themeColors.get(d.data.theme) || color(d.data.theme));
                 }
             })
            .attr("r", d => d.r)
                         .attr("stroke", d => {
                 if (d.data.type === 'theme') {
                     return themeColors.get(d.data.id) || color(d.data.id);
                 } else if (d.data.type === 'brand') {
                     // For brands, use a darker version of the theme color
                     const themeColor = d3.color(themeColors.get(d.data.theme) || color(d.data.theme));
                     return themeColor ? themeColor.darker(0.3) : (themeColors.get(d.data.theme) || color(d.data.theme));
                 } else {
                     // For channels, use a medium version of the theme color
                     const themeColor = d3.color(themeColors.get(d.data.theme) || color(d.data.theme));
                     return themeColor ? themeColor.darker(0.1) : (themeColors.get(d.data.theme) || color(d.data.theme));
                 }
             })
            .attr("stroke-width", d => {
                if (d.data.type === 'theme') return 3;
                if (d.data.type === 'brand') return 1;
                return 0.5; // Channels have thinner borders
            })
            .attr("stroke-dasharray", d => {
                // Add dotted stroke for DME brands and channels only if filter is enabled
                if (!state.filters.showDMEBorders) {
                    return "none"; // No dotted borders if filter is disabled
                }
                
                if (d.data.type === 'brand') {
                    // Check if this brand has DME data
                    const hasDMEData = d.data.data.some(row => row.sourceType === 'dme');
                    return hasDMEData ? "5,5" : "none"; // Dotted pattern for DME brands
                } else if (d.data.type === 'channel') {
                    // Check if this channel has DME data
                    const hasDMEData = d.data.data.some(row => row.sourceType === 'dme');
                    return hasDMEData ? "3,3" : "none"; // Smaller dotted pattern for DME channels
                }
                return "none"; // Solid stroke for themes
            });
        
        // Add animation for new nodes appearing
        circles
            .attr("r", 0)
            .transition()
            .duration(600)
            .ease(d3.easeCubicOut)
            .attr("r", d => d.r);
        
                 // Add a label
         const text = node.append("text")
             .attr("clip-path", d => `circle(${d.r})`)
             .style("font-size", d => {
                 // Dynamic font sizing based on impression values - adjusted sizes
                 const minFontSize = 10; // Reduced minimum readable size
                 const maxFontSize = 18; // Reduced maximum size for largest bubbles
                 const fontSize = Math.max(minFontSize, Math.min(maxFontSize, 
                     minFontSize + (d.value / maxValue) * (maxFontSize - minFontSize)));
                 return `${fontSize}px`;
             })
             .style("font-weight", d => {
                 // Make theme nodes bold to distinguish them
                 return d.data.type === 'theme' ? 'bold' : 'normal';
             });
        
        // Add a tspan for each CamelCase-separated word
        text.selectAll()
            .data(d => names(d.data))
            .join("tspan")
            .attr("x", 0)
            .attr("y", (d, i, nodes) => `${i - nodes.length / 2 + 0.35}em`)
            .text(d => d);
        
                 // Add a tspan for the node's value
         text.append("tspan")
             .attr("x", 0)
             .attr("y", d => `${names(d.data).length / 2 + 0.8}em`)
             .attr("fill-opacity", 0.7)
             .style("font-size", d => {
                 // Value text slightly smaller than main text - adjusted sizes
                 const minFontSize = 7; // Reduced minimum for values
                 const maxFontSize = 13; // Reduced maximum for values
                 const fontSize = Math.max(minFontSize, Math.min(maxFontSize, 
                     minFontSize + (d.value / maxValue) * (maxFontSize - minFontSize)));
                 return `${fontSize}px`;
             })
             .text(d => formatImpressions(d.data.value));
        
        // Animate text appearance
        text
            .style("opacity", 0)
            .transition()
            .duration(800)
            .delay(300)
            .style("opacity", 1);
        
        console.log('Bubble chart rendered successfully with expansion/collapse functionality');
        console.log('Value range:', { min: minValue, max: maxValue, formatted: { min: formatImpressions(minValue), max: formatImpressions(maxValue) } });
        
    } catch (error) {
        console.error('Error rendering bubble chart:', error);
        containerElement.innerHTML = '<p>Error rendering visualization. Please check the console for details.</p>';
    }
}

// Drive blended detail panels from chart selection
function handleBlendedNodeClick(selectedNode) {
    console.log('handleBlendedNodeClick called with:', selectedNode);
    
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

    // Get the selected node data
    const sel = selectedNode || {};
    const type = (sel && sel.type) || 'category';
    const name = (sel && sel.name) || 'Selection';
    
    // Get items from the selected node
    let items = Array.isArray(sel && sel.data) ? sel.data : [];

    // Build hierarchical title: Category, Category + Brand, or Category + Brand + Channel
    let categoryName = '';
    let brandName = '';
    let channelName = '';
    
    if (type === 'overview') {
        // For overview, show all data
        categoryName = '';
        brandName = '';
        channelName = '';
    } else if (type === 'theme') {
        categoryName = name;
    } else if (type === 'brand') {
        categoryName = sel.theme || '';
        brandName = name;
    } else if (type === 'channel') {
        categoryName = sel.theme || '';
        brandName = sel.brand || '';
        channelName = name;
    }

    if (titleEl) {
        console.log('Title element found, updating to:', type, name);
        if (type === 'overview') {
            // For overview, show a more descriptive title based on current filters
            const activeFilters = [];
            if (state.filters.marketingTheme !== 'all') activeFilters.push(state.filters.marketingTheme);
            if (state.filters.brandType !== 'all') activeFilters.push(state.filters.brandType);
            if (state.filters.channel !== 'all') activeFilters.push(state.filters.channel);
            
            if (activeFilters.length > 0) {
                titleEl.textContent = `Filtered Data: ${activeFilters.join(' + ')}`;
            } else {
                titleEl.textContent = 'All Data Overview';
            }
        } else {
            const parts = [];
            if (categoryName) parts.push(categoryName);
            if (brandName) parts.push(brandName);
            if (channelName) parts.push(channelName);
            titleEl.textContent = parts.length ? parts.join(' — ') : name;
        }
        console.log('Title updated to:', titleEl.textContent);
    } else {
        console.warn('Title element not found!');
    }

    const spend = d3.sum(items, d => Number(d['Spend (USD)'] || 0));
    const impr = d3.sum(items, d => Number(d['Impressions'] || 0) + Number(d['estimated_impressions'] || 0));
    const eng = d3.sum(items, d => Number(d['engagement_total'] || 0));
    if (spendEl) spendEl.textContent = `$${(spend||0).toLocaleString()}`;
    if (spendHint) spendHint.textContent = type === 'overview' ? 'All Data' : `${name}`;
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
        candidates.slice(0,5).forEach(q => { const li=document.createElement('li'); const a=document.createElement('a'); a.textContent = `"${q.text.slice(0,140)}${q.text.length>140?'…':''}"`; a.href=q.url||'#'; a.target='_blank'; li.appendChild(a); qList.appendChild(li); });
    }

    if (adsGal) {
        adsGal.innerHTML = '';
        const ads = items.filter(d => (d.sourceType === 'manufacturer' || d.sourceType === 'dme'));
        const getUrl = (d) => {
            // Prioritize Link To Creative for image URLs
            const url = d['Link To Creative'] || d['Link to Creative'] || d['URL_to_use'] || d.Landing_Page || d.image || d.link || '';
            // Filter out URLs that are likely not image URLs
            if (url && !url.includes('no media file specified') && !url.includes('undefined') && url.trim() !== '') {
                return url;
            }
            return '';
        };
        const withMedia = ads.map(d => ({ 
            url: getUrl(d), 
            impressions: Number(d.Impressions||0),
            brand: d['Brand Root'] || d.Advertiser || 'Unknown'
        })).filter(x => x.url);
        
        // Debug logging for image URLs
        console.log('Ads with media URLs:', withMedia.slice(0, 3).map(m => ({
            brand: m.brand,
            url: m.url,
            impressions: m.impressions
        })));
        withMedia.sort((a,b)=>b.impressions-a.impressions);
        const render = (limit=6) => {
            adsGal.innerHTML = '';
            withMedia.slice(0,limit).forEach(m => { 
                const img=document.createElement('img'); 
                img.src=m.url; 
                img.onclick=()=>window.open(m.url,'_blank'); 
                img.onerror=() => {
                    img.style.display = 'none';
                    const errorDiv = document.createElement('div');
                    errorDiv.style.cssText = 'width:100px;height:100px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;font-size:10px;color:#666;border:1px solid #ddd;';
                    errorDiv.textContent = 'No Image';
                    errorDiv.onclick=()=>window.open(m.url,'_blank');
                    img.parentNode.insertBefore(errorDiv, img);
                };
                adsGal.appendChild(img); 
            });
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
            
            // Get all data for category benchmark calculation
            const allData = [
                ...state.data.manufacturer,
                ...state.data.dme,
                ...state.data.instagram,
                ...state.data.tiktok
            ];
            
            const allAdsData = allData.filter(d => (d.sourceType === 'manufacturer' || d.sourceType === 'dme'));
            const allSocialData = allData.filter(d => {
                const st = (d.sourceType || '').toLowerCase();
                return st === 'instagram' || st === 'tiktok';
            });
            
            takeawaysEl.innerHTML = generateKeyTakeaways(adsOnly, socialRows, allAdsData, allSocialData, titleEl ? titleEl.textContent : 'Selection', type === 'overview' ? '' : categoryName);
        } catch (e) {
            console.warn('Key takeaways error:', e);
            takeawaysEl.innerHTML = '<ul><li>Communication style and narrative focus summarized here.</li><li>Product vs. emotional balance; collaborations/influencers highlights.</li><li>Cultural gaps or needs addressed.</li></ul>';
        }
    }
    
    if (adsAn) {
        adsAn.textContent = 'Preparing analysis…';
        try {
            const adsOnly = items.filter(d => (d.sourceType === 'manufacturer' || d.sourceType === 'dme'));
            adsAn.innerHTML = generateAdsAnalysis(adsOnly, titleEl ? titleEl.textContent : 'Selection', type === 'overview' ? '' : categoryName);
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
            socialAn.innerHTML = generateSocialAnalysis(socialRows, titleEl ? titleEl.textContent : 'Selection', type === 'overview' ? '' : categoryName);
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Initializing dashboard...');
    init();
});

// Also try window load as backup
window.addEventListener('load', function() {
    console.log('Window loaded - Checking if dashboard is ready...');
    if (typeof state === 'undefined') {
        console.log('State not defined, initializing...');
        init();
    } else {
        console.log('Dashboard already initialized');
    }
});
