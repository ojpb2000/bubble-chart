// Blended Dashboard Application
// Enhanced version with v2 data support and marketing themes explosion

// Global state
let state = {
    data: {
        manufacturer: [],
        dme: [],
        instagram: [],
        tiktok: []
    },
    filters: {
        mainCategory: 'all',
        productFocus: 'all',
        channel: 'all',
        advertiser: 'all'
    },
    currentTab: 'blended-circles'
};

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
            if (config.DATA_VERSION === 'v2') {
                // Handle v2 data structure with MARKETING_THEMES explosion
                const themes = config.marketingThemes.explode(row.MARKETING_THEMES);
                
                themes.forEach(theme => {
                    const normalizedRow = dataNormalizer.normalizeRowV2(row, sourceType, theme);
                    if (normalizedRow) {
                        normalized.push(normalizedRow);
                    }
                });
            } else {
                // Handle v1 data structure
                const normalizedRow = dataNormalizer.normalizeRowV1(row, sourceType);
                if (normalizedRow) {
                    normalized.push(normalizedRow);
                }
            }
        });
        
        console.log(`Normalized ${normalized.length} rows for ${sourceType} (${config.DATA_VERSION})`);
        return normalized;
    },
    
    // Normalize individual row for v2 data
    normalizeRowV2: (row, sourceType, theme) => {
        try {
            const normalized = {
                sourceType: sourceType,
                sourceTheme: theme, // Original theme for this row instance
                Main_Category: theme, // Alias for compatibility
                Product_Focus: row.focus_vs_other || 'other',
                Channel: row.Channel || 'Unspecified',
                Advertiser: row['Brand Root'] || row.Advertiser || 'Unknown',
                'Brand Root': row['Brand Root'] || row.Advertiser || 'Unknown',
                company: row.company || row['Brand Root'] || row.Advertiser || 'Unknown',
                Impressions: parseFloat(row.Impressions) || 0,
                'Spend (USD)': parseFloat(row['Spend (USD)']) || 0,
                engagement_total: parseFloat(row.engagement_total) || 0,
                estimated_impressions: parseFloat(row.estimated_impressions) || 0,
                engagement_rate_by_view: parseFloat(row.engagement_rate_by_view) || 0,
                post_type: row.post_type || 'unknown',
                message: row.message || row.Text_x || row.Text_y || '',
                link: row.link || row['Link To Creative'] || row.post_link || '',
                image: row.image || row['Link to Post'] || '',
                // Preserve original data for debugging
                _original: { ...row }
            };
            
            // Calculate derived metrics
            normalized.CPM = normalized['Spend (USD)'] > 0 && normalized.Impressions > 0 
                ? (normalized['Spend (USD)'] / normalized.Impressions) * 1000 
                : 0;
            
            normalized.Performance_Score = normalized.Impressions > 0 
                ? normalized.Impressions * (normalized.CPM > 0 ? 1 / normalized.CPM : 1)
                : 0;
            
            return normalized;
        } catch (error) {
            console.error(`Error normalizing v2 row for ${sourceType}:`, error, row);
            return null;
        }
    },
    
    // Normalize individual row for v1 data (backward compatibility)
    normalizeRowV1: (row, sourceType) => {
        try {
            const normalized = {
                sourceType: sourceType,
                sourceTheme: row.Main_Category || 'Uncategorized',
                Main_Category: row.Main_Category || 'Uncategorized',
                Product_Focus: row.Product_Focus || 'other',
                Channel: row.Channel || 'Unspecified',
                Advertiser: row.Advertiser || 'Unknown',
                'Brand Root': row['Brand Root'] || row.Advertiser || 'Unknown',
                company: row.company || row.Advertiser || 'Unknown',
                Impressions: parseFloat(row.Impressions) || 0,
                'Spend (USD)': parseFloat(row['Spend (USD)']) || 0,
                engagement_total: parseFloat(row.engagement_total) || 0,
                estimated_impressions: parseFloat(row.estimated_impressions) || 0,
                engagement_rate_by_view: parseFloat(row.engagement_rate_by_view) || 0,
                post_type: row.post_type || 'unknown',
                message: row.message || row.Text_x || row.Text_y || '',
                link: row.link || row['Link To Creative'] || row.post_link || '',
                image: row.image || row['Link to Post'] || '',
                // Preserve original data for debugging
                _original: { ...row }
            };
            
            // Calculate derived metrics
            normalized.CPM = normalized['Spend (USD)'] > 0 && normalized.Impressions > 0 
                ? (normalized['Spend (USD)'] / normalized.Impressions) * 1000 
                : 0;
            
            normalized.Performance_Score = normalized.Impressions > 0 
                ? normalized.Impressions * (normalized.CPM > 0 ? 1 / normalized.CPM : 1)
                : 0;
            
            return normalized;
        } catch (error) {
            console.error(`Error normalizing v1 row for ${sourceType}:`, error, row);
            return null;
        }
    },
    
    // Get unique categories from normalized data
    getUniqueCategories: (data) => {
        const categories = new Set();
        data.forEach(row => {
            if (row.Main_Category) {
                categories.add(row.Main_Category);
            }
        });
        return Array.from(categories).sort();
    },
    
    // Get unique brands from normalized data
    getUniqueBrands: (data) => {
        const brands = new Set();
        data.forEach(row => {
            const brand = row['Brand Root'] || row.Advertiser || row.company;
            if (brand) {
                brands.add(brand);
            }
        });
        return Array.from(brands).sort();
    }
};

// Load and normalize data
async function loadData() {
    console.log('Loading data with version:', config.DATA_VERSION);
    
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
        document.getElementById('visualization').innerHTML = '<p>Error loading data. Please check the console for details.</p>';
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
    
    const categories = dataNormalizer.getUniqueCategories(allData);
    const brands = dataNormalizer.getUniqueBrands(allData);
    
    // Setup category filter
    const categorySelect = document.getElementById('category-filter');
    categorySelect.innerHTML = '<option value="all">All Categories</option>';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });
    
    // Setup product focus filter
    const focusSelect = document.getElementById('product-focus-filter');
    focusSelect.innerHTML = `
        <option value="all">All Products</option>
        <option value="focus">Breastfeeding Pump</option>
        <option value="other">Other Products</option>
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
    
    // Setup advertiser filter
    const advertiserSelect = document.getElementById('advertiser-filter');
    advertiserSelect.innerHTML = '<option value="all">All Advertisers</option>';
    brands.forEach(brand => {
        const option = document.createElement('option');
        option.value = brand;
        option.textContent = brand;
        advertiserSelect.appendChild(option);
    });
}

// Apply filters to data
function applyFilters() {
    const { mainCategory, productFocus, channel, advertiser } = state.filters;
    
    let filteredData = [
        ...state.data.manufacturer,
        ...state.data.dme,
        ...state.data.instagram,
        ...state.data.tiktok
    ];
    
    // Apply category filter
    if (mainCategory !== 'all') {
        filteredData = filteredData.filter(row => row.Main_Category === mainCategory);
    }
    
    // Apply product focus filter
    if (productFocus !== 'all') {
        filteredData = filteredData.filter(row => row.Product_Focus === productFocus);
    }
    
    // Apply channel filter
    if (channel !== 'all') {
        filteredData = filteredData.filter(row => row.Channel === channel);
    }
    
    // Apply advertiser filter
    if (advertiser !== 'all') {
        filteredData = filteredData.filter(row => {
            const brand = row['Brand Root'] || row.Advertiser || row.company;
            return brand === advertiser;
        });
    }
    
    console.log(`Filtered data: ${filteredData.length} rows`);
    return filteredData;
}

// Build hierarchy for visualization
function buildHierarchy(data) {
    // Group by main category
    const byCategory = d3.group(data, d => d.Main_Category);
    
    const hierarchy = {
        name: 'root',
        children: []
    };
    
    byCategory.forEach((categoryData, category) => {
        const categoryNode = {
            name: category,
            type: 'category',
            children: []
        };
        
        // Group by brand within category
        const byBrand = d3.group(categoryData, d => d['Brand Root'] || d.Advertiser || d.company);
        
        byBrand.forEach((brandData, brand) => {
            const brandNode = {
                name: brand,
                type: 'brand',
                children: []
            };
            
            // Group by channel within brand
            const byChannel = d3.group(brandData, d => d.Channel);
            
            byChannel.forEach((channelData, channel) => {
                const channelNode = {
                    name: channel,
                    type: 'channel',
                    children: [],
                    value: d3.sum(channelData, d => d.Impressions || d.estimated_impressions || 0)
                };
                
                brandNode.children.push(channelNode);
            });
            
            brandNode.value = d3.sum(brandNode.children, d => d.value);
            categoryNode.children.push(brandNode);
        });
        
        categoryNode.value = d3.sum(categoryNode.children, d => d.value);
        hierarchy.children.push(categoryNode);
    });
    
    return hierarchy;
}

// Render the visualization
function render() {
    const filteredData = applyFilters();
    const hierarchy = buildHierarchy(filteredData);
    
    console.log('Rendering hierarchy:', hierarchy);
    
    // Update analysis components
    updateAnalysisComponents(filteredData);
    
    // Render amCharts visualization
    renderAmChartsPacked('visualization', hierarchy);
}

// Update analysis components with filtered data
function updateAnalysisComponents(data) {
    // Update ads analysis
    const adsAnalysis = generateAdsAnalysis(data);
    document.getElementById('ads-analysis').innerHTML = adsAnalysis;
    
    // Update social analysis
    const socialAnalysis = generateSocialAnalysis(data);
    document.getElementById('social-analysis').innerHTML = socialAnalysis;
    
    // Update key takeaways
    const keyTakeaways = generateKeyTakeaways(data);
    document.getElementById('key-takeaways').innerHTML = keyTakeaways;
}

// Event handlers
function onFilterChange() {
    state.filters.mainCategory = document.getElementById('category-filter').value;
    state.filters.productFocus = document.getElementById('product-focus-filter').value;
    state.filters.channel = document.getElementById('channel-filter').value;
    state.filters.advertiser = document.getElementById('advertiser-filter').value;
    
    render();
}

// Initialize the dashboard
function init() {
    console.log('Initializing Blended Dashboard with v2 data support');
    
    // Load data
    loadData();
    
    // Setup event listeners
    document.getElementById('category-filter').addEventListener('change', onFilterChange);
    document.getElementById('product-focus-filter').addEventListener('change', onFilterChange);
    document.getElementById('channel-filter').addEventListener('change', onFilterChange);
    document.getElementById('advertiser-filter').addEventListener('change', onFilterChange);
}

// Analysis Components
function generateAdsAnalysis(data) {
    if (!data || data.length === 0) {
        return '<p>No ads data available for the selected filters.</p>';
    }
    
    // Filter for ads data (Pathmatics)
    const adsData = data.filter(row => row.sourceType === 'manufacturer' || row.sourceType === 'dme');
    
    if (adsData.length === 0) {
        return '<p>No ads data available for the selected filters.</p>';
    }
    
    // Find top performing ads by impressions
    const topAds = adsData
        .sort((a, b) => (b.Impressions || 0) - (a.Impressions || 0))
        .slice(0, 3);
    
    // Calculate category benchmark
    const categoryBenchmark = d3.mean(adsData, d => d.CPM || 0);
    
    let analysis = '<h4>Top Performing Ads Analysis</h4>';
    
    if (topAds.length > 0) {
        const topAd = topAds[0];
        const brandName = topAd['Brand Root'] || topAd.Advertiser || 'Unknown brand';
        const impressions = formatNumber(topAd.Impressions || 0);
        const spend = formatNumber(topAd['Spend (USD)'] || 0);
        const cpm = (topAd.CPM || 0).toFixed(2);
        const benchmarkComparison = topAd.CPM < categoryBenchmark ? 'below' : 'above';
        const benchmarkDiff = Math.abs((topAd.CPM || 0) - categoryBenchmark).toFixed(2);
        
        analysis += `<p><strong>${brandName}</strong> leads with ${impressions} impressions and $${spend} spend, achieving a CPM of $${cpm} (${benchmarkComparison} the category average of $${categoryBenchmark.toFixed(2)} by $${benchmarkDiff}).</p>`;
        
        // Content analysis
        const contentThemes = analyzeAdContent(topAds);
        if (contentThemes.length > 0) {
            analysis += `<p>Top ads focus on: ${contentThemes.join(', ')}.</p>`;
        }
    }
    
    return analysis;
}

function generateSocialAnalysis(data) {
    if (!data || data.length === 0) {
        return '<p>No social media data available for the selected filters.</p>';
    }
    
    // Filter for social data
    const socialData = data.filter(row => row.sourceType === 'instagram' || row.sourceType === 'tiktok');
    
    if (socialData.length === 0) {
        return '<p>No social media data available for the selected filters.</p>';
    }
    
    // Find top performing posts by engagement
    const topPosts = socialData
        .sort((a, b) => (b.engagement_total || 0) - (a.engagement_total || 0))
        .slice(0, 3);
    
    // Calculate category benchmark
    const socialCategoryBenchmark = d3.mean(socialData, d => d.engagement_rate_by_view || 0);
    
    let analysis = '<h4>Top Performing Social Media Posts</h4>';
    
    if (topPosts.length > 0) {
        const topPost = topPosts[0];
        const brandName = topPost.company || 'Unknown brand';
        const engagement = formatNumber(topPost.engagement_total || 0);
        const impressions = formatNumber(topPost.estimated_impressions || 0);
        const engagementRate = ((topPost.engagement_rate_by_view || 0) * 100).toFixed(2);
        const benchmarkComparison = topPost.engagement_rate_by_view < socialCategoryBenchmark ? 'below' : 'above';
        const benchmarkDiff = Math.abs((topPost.engagement_rate_by_view || 0) - socialCategoryBenchmark * 100).toFixed(2);
        
        analysis += `<p><strong>${brandName}</strong> leads with ${engagement} total engagements and ${impressions} estimated impressions, achieving a ${engagementRate}% engagement rate (${benchmarkComparison} the category average of ${(socialCategoryBenchmark * 100).toFixed(2)}% by ${benchmarkDiff}%).</p>`;
        
        // Content analysis
        const contentThemes = analyzeSocialContent(topPosts);
        if (contentThemes.length > 0) {
            analysis += `<p>Top posts focus on: ${contentThemes.join(', ')}.</p>`;
        }
    }
    
    return analysis;
}

function generateKeyTakeaways(data) {
    if (!data || data.length === 0) {
        return '<p>No data available for the selected filters.</p>';
    }
    
    const adsData = data.filter(row => row.sourceType === 'manufacturer' || row.sourceType === 'dme');
    const socialData = data.filter(row => row.sourceType === 'instagram' || row.sourceType === 'tiktok');
    
    let takeaways = '<h4>Key Takeaways</h4>';
    
    if (adsData.length > 0) {
        const topAd = adsData.sort((a, b) => (b.Impressions || 0) - (a.Impressions || 0))[0];
        const brandName = topAd['Brand Root'] || topAd.Advertiser || 'Unknown brand';
        const totalImpressions = formatNumber(d3.sum(adsData, d => d.Impressions || 0));
        const totalSpend = formatNumber(d3.sum(adsData, d => d['Spend (USD)'] || 0));
        const avgCPM = (d3.mean(adsData, d => d.CPM || 0)).toFixed(2);
        
        takeaways += `<p>In advertising, <strong>${brandName}</strong> dominates with ${totalImpressions} total impressions and $${totalSpend} spend across the selected filters, maintaining an average CPM of $${avgCPM}.</p>`;
    }
    
    if (socialData.length > 0) {
        const topSocial = socialData.sort((a, b) => (b.engagement_total || 0) - (a.engagement_total || 0))[0];
        const socialBrandName = topSocial.company || 'Unknown brand';
        const totalEngagement = formatNumber(d3.sum(socialData, d => d.engagement_total || 0));
        const avgEngagementRate = (d3.mean(socialData, d => d.engagement_rate_by_view || 0) * 100).toFixed(2);
        
        takeaways += `<p>On social media, <strong>${socialBrandName}</strong> leads with ${totalEngagement} total engagements and an average engagement rate of ${avgEngagementRate}%, showing strong community connection and content resonance.</p>`;
    }
    
    return takeaways;
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

// amCharts visualization
function renderAmChartsPacked(containerId, data) {
    const containerElement = document.getElementById(containerId);
    if (!containerElement) {
        console.error('Container not found:', containerId);
        return;
    }
    
    // Dispose previous chart
    if (containerElement._amChartsChart) {
        containerElement._amChartsChart.dispose();
    }
    
    // Set container height
    containerElement.style.height = config.chart.height;
    
    // Create chart
    const chart = am4core.create(containerId, am4charts.ForceDirectedTree);
    containerElement._amChartsChart = chart;
    
    // Configure chart
    chart.data = data.children; // Feed categories directly
    chart.series.minRadius = 15;
    chart.series.maxRadius = 100;
    chart.series.manyBodyStrength = -30;
    
    // Disable links
    chart.series.links.template.disabled = true;
    chart.series.links.template.opacity = 0;
    chart.series.links.template.strokeOpacity = 0;
    
    // Configure nodes
    const nodeTemplate = chart.series.nodes.template;
    nodeTemplate.circle.strokeWidth = 3;
    nodeTemplate.circle.fillOpacity = 0.8;
    nodeTemplate.outerCircle.strokeWidth = 3;
    nodeTemplate.outerCircle.fillOpacity = 0.1;
    nodeTemplate.outerCircle.scale = 1.2;
    
    // Configure labels
    nodeTemplate.label.fill = am4core.color("#ffffff");
    nodeTemplate.label.fontSize = 12;
    nodeTemplate.label.fontWeight = "bold";
    nodeTemplate.label.truncate = false;
    nodeTemplate.label.maxWidth = 120;
    nodeTemplate.label.wrap = true;
    nodeTemplate.label.horizontalCenter = "middle";
    nodeTemplate.label.verticalCenter = "middle";
    nodeTemplate.label.textAlign = "center";
    nodeTemplate.label.isMeasured = true;
    nodeTemplate.label.zIndex = 1000;
    nodeTemplate.label.hideOversized = false;
    
    // Ensure category labels are uppercase and visible
    nodeTemplate.label.adapter.add("text", (label, target) => {
        if (target.dataItem && target.dataItem.dataContext) {
            const name = target.dataItem.dataContext.name;
            return name ? name.toUpperCase() : '';
        }
        return '';
    });
    
    // Color management
    const categoryColorMap = {};
    let colorIndex = 0;
    const colors = Object.values(config.chart.colors);
    
    function resolveTopCategoryName(node) {
        if (node.dataContext.type === 'category') {
            return node.dataContext.name;
        }
        if (node.parent && node.parent.dataContext) {
            return resolveTopCategoryName(node.parent);
        }
        return 'default';
    }
    
    function getCategoryColor(categoryName) {
        if (!categoryColorMap[categoryName]) {
            categoryColorMap[categoryName] = config.chart.colors[categoryName] || colors[colorIndex % colors.length];
            colorIndex++;
        }
        return am4core.color(categoryColorMap[categoryName]);
    }
    
    // Apply colors
    nodeTemplate.circle.adapter.add('fill', (fill, target) => {
        const categoryName = resolveTopCategoryName(target);
        return getCategoryColor(categoryName);
    });
    
    nodeTemplate.circle.adapter.add('stroke', (stroke, target) => {
        const categoryName = resolveTopCategoryName(target);
        return getCategoryColor(categoryName);
    });
    
    nodeTemplate.outerCircle.adapter.add('stroke', (stroke, target) => {
        const categoryName = resolveTopCategoryName(target);
        return getCategoryColor(categoryName);
    });
    
    // Adjust stroke width for visual hierarchy
    nodeTemplate.circle.adapter.add('strokeWidth', (strokeWidth, target) => {
        if (target.dataContext.type === 'category') {
            return 6;
        }
        return 4;
    });
    
    // Channel color variation
    nodeTemplate.circle.adapter.add('fill', (fill, target) => {
        if (target.dataContext.type === 'channel') {
            const categoryName = resolveTopCategoryName(target);
            const baseColor = getCategoryColor(categoryName);
            // Create a slightly different color for channels
            return am4core.color(baseColor.rgb.r * 0.8, baseColor.rgb.g * 0.8, baseColor.rgb.b * 0.8);
        }
        return fill;
    });
    
    // Click events for expand/collapse
    nodeTemplate.events.on("hit", (ev) => {
        const node = ev.target;
        if (node.children && node.children.length > 0) {
            node.collapsed = !node.collapsed;
            node.label.visible = true;
            node.label.zIndex = 1000;
            node.label.toFront();
        }
    });
    
    // Initialize all nodes as collapsed
    chart.events.on("inited", () => {
        chart.series.nodes.each((node) => {
            if (node.children && node.children.length > 0) {
                node.collapsed = true;
            }
        });
    });
    
    // Ensure brands and channels are collapsed when parent is expanded
    nodeTemplate.events.on("inited", (ev) => {
        const node = ev.target;
        if (node.dataContext.type === 'brand' || node.dataContext.type === 'channel') {
            node.collapsed = true;
        }
    });
    
    // Configure tooltip
    chart.tooltip.getFillFromObject = false;
    chart.tooltip.getStrokeFromObject = false;
    chart.tooltip.background.cornerRadius = 8;
    chart.tooltip.background.fillOpacity = 0.9;
    chart.tooltip.label.fill = am4core.color("#ffffff");
    
    nodeTemplate.events.on('over', (ev) => {
        const node = ev.target;
        const categoryName = resolveTopCategoryName(node);
        const color = getCategoryColor(categoryName);
        chart.tooltip.background.fill = color;
        chart.tooltip.background.stroke = color;
    });
    
    // Force chart rendering
    chart.validateData();
    chart.appear();
    
    console.log('amCharts visualization rendered');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);


