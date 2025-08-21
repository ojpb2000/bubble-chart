// Enhanced Ads Analysis Component
// Provides comprehensive analysis of top performing ads and their content
// English version - Comprehensive ads performance analysis

export class EnhancedAdsAnalysis {
    constructor() {
        this.performanceData = null;
        this.themeAnalysis = null;
        this.brandAnalysis = null;
    }

    // Load performance data from analysis results
    async loadPerformanceData() {
        try {
            const response = await fetch('ads_performance_results.json');
            const data = await response.json();
            this.performanceData = data;
            return data;
        } catch (error) {
            console.warn('Could not load performance data, using fallback analysis');
            return null;
        }
    }

    // Generate comprehensive ads analysis
    generateComprehensiveAnalysis(adsData, contextLabel = 'Selection', mainCategoryName = '') {
        if (!adsData || adsData.length === 0) {
            return this.generateNoDataMessage();
        }

        const analysis = {
            performance: this.analyzePerformance(adsData),
            themes: this.analyzeThemes(adsData),
            formats: this.analyzeFormats(adsData),
            brands: this.analyzeBrands(adsData),
            topAds: this.identifyTopAds(adsData),
            recommendations: this.generateRecommendations(adsData)
        };

        return this.formatAnalysisOutput(analysis, contextLabel, mainCategoryName);
    }

    // Analyze performance metrics
    analyzePerformance(adsData) {
        const totalImpressions = d3.sum(adsData, d => Number(d.Impressions || 0));
        const totalSpend = d3.sum(adsData, d => Number(d['Spend (USD)'] || 0));
        const avgCPM = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
        const avgImpressions = totalImpressions / adsData.length;

        return {
            totalImpressions,
            totalSpend,
            avgCPM,
            avgImpressions,
            adCount: adsData.length
        };
    }

    // Analyze themes in ads content
    analyzeThemes(adsData) {
        const themeRules = {
            'Wearable/Portability': [
                /wearable/i, /hands.?free/i, /portable/i, /on the go/i, /discreet/i,
                /quiet/i, /wireless/i, /compact/i, /stealth/i, /under clothes/i
            ],
            'Comfort/Soothing': [
                /comfort/i, /gentle/i, /soft/i, /fit/i, /soothe/i, /sore/i,
                /lanolin/i, /leak/i, /pain.?free/i, /cushion/i
            ],
            'Performance/Suction': [
                /power/i, /performance/i, /strong/i, /suction/i, /hospital.?grade/i,
                /efficiency/i, /output/i, /milk.?production/i, /flow/i
            ],
            'Education/How-to': [
                /how to/i, /guide/i, /tips?/i, /tutorial/i, /learn/i, /explainer/i,
                /step.?by.?step/i, /instructions/i, /help/i
            ],
            'Lifestyle/Motherhood': [
                /mom/i, /mother/i, /family/i, /postpartum/i, /journey/i,
                /return to work/i, /night/i, /sleep/i, /breastfeeding.?journey/i
            ],
            'Value/Promotion': [
                /deal/i, /discount/i, /save/i, /off\b/i, /coupon/i, /promo/i,
                /bundle/i, /free/i, /gift/i, /sale/i, /offer/i
            ],
            'Emotional Connection': [
                /love/i, /care/i, /support/i, /confidence/i, /empower/i,
                /beautiful/i, /special/i, /moment/i, /connection/i
            ],
            'Convenience': [
                /easy/i, /simple/i, /quick/i, /fast/i, /convenient/i,
                /time.?saving/i, /effortless/i, /one.?touch/i
            ]
        };

        const themeCounts = {};
        const brandThemes = {};

        adsData.forEach(ad => {
            const combinedText = `${ad.Text_x || ''} ${ad.Text_y || ''} ${ad.overall_description || ''} ${ad.value_proposition || ''}`.toLowerCase();
            
            Object.entries(themeRules).forEach(([theme, patterns]) => {
                if (patterns.some(pattern => pattern.test(combinedText))) {
                    themeCounts[theme] = (themeCounts[theme] || 0) + 1;
                    
                    const brand = ad['Brand Root'];
                    if (!brandThemes[brand]) brandThemes[brand] = {};
                    brandThemes[brand][theme] = (brandThemes[brand][theme] || 0) + 1;
                }
            });
        });

        return {
            overall: themeCounts,
            byBrand: brandThemes,
            topThemes: Object.entries(themeCounts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
        };
    }

    // Analyze formats and channels
    analyzeFormats(adsData) {
        const channelAnalysis = d3.rollup(adsData, 
            v => ({
                impressions: d3.sum(v, d => Number(d.Impressions || 0)),
                spend: d3.sum(v, d => Number(d['Spend (USD)'] || 0)),
                count: v.length
            }), 
            d => d.Channel || 'Unknown'
        );

        const formatAnalysis = d3.rollup(adsData,
            v => ({
                impressions: d3.sum(v, d => Number(d.Impressions || 0)),
                spend: d3.sum(v, d => Number(d['Spend (USD)'] || 0)),
                count: v.length
            }),
            d => d['Creative Type_x'] || d['Creative Type_y'] || 'Unknown'
        );

        // Calculate CPM for each channel and format
        const channelsWithCPM = Array.from(channelAnalysis.entries()).map(([channel, data]) => ({
            channel,
            ...data,
            cpm: data.impressions > 0 ? (data.spend / data.impressions) * 1000 : 0
        })).sort((a, b) => b.impressions - a.impressions);

        const formatsWithCPM = Array.from(formatAnalysis.entries()).map(([format, data]) => ({
            format,
            ...data,
            cpm: data.impressions > 0 ? (data.spend / data.impressions) * 1000 : 0
        })).sort((a, b) => b.impressions - a.impressions);

        return {
            channels: channelsWithCPM,
            formats: formatsWithCPM,
            topChannel: channelsWithCPM[0]?.channel || 'Unknown',
            topFormat: formatsWithCPM[0]?.format || 'Unknown'
        };
    }

    // Analyze brand performance
    analyzeBrands(adsData) {
        const brandAnalysis = d3.rollup(adsData,
            v => ({
                impressions: d3.sum(v, d => Number(d.Impressions || 0)),
                spend: d3.sum(v, d => Number(d['Spend (USD)'] || 0)),
                count: v.length,
                avgImpressions: d3.mean(v, d => Number(d.Impressions || 0)),
                avgSpend: d3.mean(v, d => Number(d['Spend (USD)'] || 0))
            }),
            d => d['Brand Root']
        );

        const brandsWithCPM = Array.from(brandAnalysis.entries()).map(([brand, data]) => ({
            brand,
            ...data,
            cpm: data.impressions > 0 ? (data.spend / data.impressions) * 1000 : 0,
            efficiency: data.impressions / (1 + (data.spend / data.impressions) * 1000)
        })).sort((a, b) => b.impressions - a.impressions);

        return {
            brands: brandsWithCPM,
            topBrand: brandsWithCPM[0]?.brand || 'Unknown',
            mostEfficient: brandsWithCPM.sort((a, b) => b.efficiency - a.efficiency)[0]?.brand || 'Unknown'
        };
    }

    // Identify top performing ads
    identifyTopAds(adsData) {
        const adsWithMetrics = adsData.map(ad => ({
            ...ad,
            impressions: Number(ad.Impressions || 0),
            spend: Number(ad['Spend (USD)'] || 0),
            cpm: Number(ad.Impressions || 0) > 0 ? (Number(ad['Spend (USD)'] || 0) / Number(ad.Impressions || 0)) * 1000 : 0
        }));

        const topByImpressions = adsWithMetrics
            .sort((a, b) => b.impressions - a.impressions)
            .slice(0, 5);

        const topByEfficiency = adsWithMetrics
            .filter(ad => ad.impressions > 1000)
            .sort((a, b) => (a.impressions / (1 + a.cpm)) - (b.impressions / (1 + b.cpm)))
            .reverse()
            .slice(0, 5);

        const topByLowCPM = adsWithMetrics
            .filter(ad => ad.impressions > 1000)
            .sort((a, b) => a.cpm - b.cpm)
            .slice(0, 5);

        return {
            byImpressions: topByImpressions,
            byEfficiency: topByEfficiency,
            byLowCPM: topByLowCPM
        };
    }

    // Generate strategic recommendations
    generateRecommendations(adsData) {
        const themes = this.analyzeThemes(adsData);
        const formats = this.analyzeFormats(adsData);
        const brands = this.analyzeBrands(adsData);
        const topAds = this.identifyTopAds(adsData);

        const recommendations = [];

        // Theme-based recommendations
        const topTheme = themes.topThemes[0];
        if (topTheme) {
            recommendations.push({
                type: 'theme',
                priority: 'high',
                message: `Focus on "${topTheme[0]}" messaging as it appears in ${topTheme[1]} ads and shows strong performance.`,
                action: `Scale variations of this theme with clear benefits and proof points.`
            });
        }

        // Format-based recommendations
        if (formats.topFormat && formats.topFormat !== 'Unknown') {
            recommendations.push({
                type: 'format',
                priority: 'medium',
                message: `${formats.topFormat} format delivers the highest reach.`,
                action: `Optimize creative for this format while testing adjacent formats.`
            });
        }

        // Channel-based recommendations
        if (formats.topChannel && formats.topChannel !== 'Unknown') {
            recommendations.push({
                type: 'channel',
                priority: 'medium',
                message: `${formats.topChannel} is the top performing channel.`,
                action: `Increase investment in this channel while maintaining quality.`
            });
        }

        // Efficiency recommendations
        const avgCPM = this.analyzePerformance(adsData).avgCPM;
        if (avgCPM > 10) {
            recommendations.push({
                type: 'efficiency',
                priority: 'high',
                message: `Average CPM of $${avgCPM.toFixed(2)} is above industry benchmarks.`,
                action: `Test different messaging angles and audience targeting to reduce costs.`
            });
        }

        return recommendations;
    }

    // Format the analysis output
    formatAnalysisOutput(analysis, contextLabel, mainCategoryName) {
        const { performance, themes, formats, brands, topAds, recommendations } = analysis;
        
        const catLine = mainCategoryName ? ` in the "${mainCategoryName}" category` : '';
        const friendlyCPM = performance.avgCPM > 0 ? `$${performance.avgCPM.toFixed(2)} per thousand views` : 'not available';

        let output = `<div class="enhanced-ads-analysis">`;

        // Performance Summary
        output += `
            <div class="analysis-section">
                <h4>Performance Overview</h4>
                <p>Within ${contextLabel}${catLine}, the campaign delivered <strong>${d3.format(',')(performance.totalImpressions)} impressions</strong> 
                across <strong>${performance.adCount} ads</strong> with an average CPM of <strong>${friendlyCPM}</strong>. 
                Total investment: <strong>$${d3.format(',')(performance.totalSpend)}</strong>.</p>
            </div>
        `;

        // Top Performing Elements
        output += `
            <div class="analysis-section">
                <h4>Top Performing Elements</h4>
                <p><strong>Channel:</strong> ${formats.topChannel} delivers the highest reach<br>
                <strong>Format:</strong> ${formats.topFormat} shows best performance<br>
                <strong>Brand:</strong> ${brands.topBrand} leads in impressions</p>
            </div>
        `;

        // Theme Analysis
        if (themes.topThemes.length > 0) {
            const topTheme = themes.topThemes[0];
            output += `
                <div class="analysis-section">
                    <h4>Content Themes</h4>
                    <p>The most effective messaging focuses on <strong>"${topTheme[0]}"</strong> 
                    (appears in ${topTheme[1]} ads). This theme resonates well with the target audience 
                    and should be prioritized in future campaigns.</p>
                </div>
            `;
        }

        // Top Ads Examples
        if (topAds.byImpressions.length > 0) {
            const topAd = topAds.byImpressions[0];
            output += `
                <div class="analysis-section">
                    <h4>Top Performing Ad Example</h4>
                    <div class="top-ad-example">
                        <p><strong>${topAd['Brand Root']}</strong> - ${d3.format(',')(topAd.impressions)} impressions</p>
                        <p><em>"${topAd.Text_x ? topAd.Text_x.substring(0, 150) + '...' : 'No text available'}"</em></p>
                        <p><small>Channel: ${topAd.Channel} | Format: ${topAd['Creative Type_x']} | CPM: $${topAd.cpm.toFixed(2)}</small></p>
                    </div>
                </div>
            `;
        }

        // Strategic Recommendations
        if (recommendations.length > 0) {
            output += `
                <div class="analysis-section">
                    <h4>Strategic Recommendations</h4>
                    <ul>
                        ${recommendations.map(rec => `
                            <li class="recommendation-${rec.priority}">
                                <strong>${rec.message}</strong><br>
                                <em>Action:</em> ${rec.action}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }

        output += `</div>`;

        return output;
    }

    // Generate no data message
    generateNoDataMessage() {
        return `
            <div class="enhanced-ads-analysis">
                <div class="analysis-section">
                    <h4>No Ads Data Available</h4>
                    <p>No paid advertising data is available for the current selection. 
                    This could mean the selected category, brand, or time period doesn't include 
                    paid advertising campaigns.</p>
                </div>
            </div>
        `;
    }

    // Generate detailed top ads gallery
    generateTopAdsGallery(adsData, maxAds = 10) {
        if (!adsData || adsData.length === 0) {
            return '<p>No ads data available for this selection.</p>';
        }

        const topAds = adsData
            .map(ad => ({
                ...ad,
                impressions: Number(ad.Impressions || 0),
                spend: Number(ad['Spend (USD)'] || 0),
                cpm: Number(ad.Impressions || 0) > 0 ? (Number(ad['Spend (USD)'] || 0) / Number(ad.Impressions || 0)) * 1000 : 0
            }))
            .sort((a, b) => b.impressions - a.impressions)
            .slice(0, maxAds);

        let gallery = '<div class="top-ads-gallery">';
        
        topAds.forEach((ad, index) => {
            gallery += `
                <div class="ad-card">
                    <div class="ad-header">
                        <span class="ad-rank">#${index + 1}</span>
                        <span class="ad-brand">${ad['Brand Root']}</span>
                        <span class="ad-impressions">${d3.format(',')(ad.impressions)} impressions</span>
                    </div>
                    <div class="ad-content">
                        <p class="ad-text">${ad.Text_x ? ad.Text_x.substring(0, 120) + '...' : 'No text available'}</p>
                        <div class="ad-metrics">
                            <span class="metric">Spend: $${d3.format(',')(ad.spend)}</span>
                            <span class="metric">CPM: $${ad.cpm.toFixed(2)}</span>
                            <span class="metric">Channel: ${ad.Channel}</span>
                            <span class="metric">Format: ${ad['Creative Type_x']}</span>
                        </div>
                        ${ad.Main_Category ? `<div class="ad-category">Category: ${ad.Main_Category}</div>` : ''}
                    </div>
                </div>
            `;
        });

        gallery += '</div>';
        return gallery;
    }
}

// Export for use in other modules
window.EnhancedAdsAnalysis = EnhancedAdsAnalysis;
