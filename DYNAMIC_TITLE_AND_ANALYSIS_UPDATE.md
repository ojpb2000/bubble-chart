# Dynamic Title and Analysis Update Implementation

## Overview
Enhanced the Bubble Chart Dashboard to provide dynamic titles and real-time analysis updates based on user selections.

## Changes Made

### 1. Dynamic Title Generation
**File:** `dashboards/bubble-chart/js/bubble-chart-app.js`

**Function:** `handleBlendedNodeClick()`

**Enhancement:** Modified the title logic to be more dynamic and contextual:

#### Before:
```javascript
if (type === 'overview') {
    titleEl.textContent = 'All Data Overview';
}
```

#### After:
```javascript
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
}
```

### 2. Hierarchical Title Structure
The title now dynamically reflects the user's current selection:

- **Overview State:** Shows "All Data Overview" or "Filtered Data: [active filters]"
- **Theme Selection:** Shows theme name (e.g., "Support for Working Moms")
- **Brand Selection:** Shows "Theme — Brand" (e.g., "Support for Working Moms — Medela")
- **Channel Selection:** Shows "Theme — Brand — Channel" (e.g., "Support for Working Moms — Medela — Facebook")

### 3. Real-Time Analysis Updates
All analysis components automatically update when users interact with the bubble chart:

#### Components That Update:
1. **Key Takeaways** - Contextual insights based on selection
2. **Supporting Quotes** - Relevant quotes from selected data
3. **Metrics Cards** - Spend, impressions, engagement for selection
4. **Top Ads Gallery** - Best-performing ads for selection
5. **Top Social Posts** - Best-performing social posts for selection
6. **Ads Analysis** - Detailed analysis of paid advertising
7. **Social Analysis** - Detailed analysis of social media content
8. **Ads Mix** - Channel distribution for ads
9. **Social Mix** - Content type distribution for social posts

#### Update Triggers:
- **Initial Load:** Components initialize with all data
- **Theme Click:** Components update to show data for that theme
- **Brand Click:** Components update to show data for that brand within the theme
- **Channel Click:** Components update to show data for that specific channel
- **Filter Changes:** Components update based on applied filters

### 4. Data Context Awareness
The analysis components are now context-aware:

- **Overview Context:** Shows aggregated insights across all data
- **Theme Context:** Shows insights specific to the selected marketing theme
- **Brand Context:** Shows insights specific to the selected brand within the theme
- **Channel Context:** Shows insights specific to the selected channel

### 5. Technical Implementation

#### Click Handler Integration:
```javascript
.on("click", (event, d) => {
    // Handle expansion/collapse logic
    if (d.data.type === 'theme') {
        toggleThemeExpansion(d.data.id);
    } else if (d.data.type === 'brand') {
        toggleBrandExpansion(d.data.id);
    }
    
    // Update blended analysis components
    handleBlendedNodeClick(d.data);
    
    // Re-render after any click
    render();
})
```

#### Data Filtering:
Each analysis component receives filtered data based on the current selection:
- **Ads Data:** Filtered by `sourceType === 'manufacturer' || sourceType === 'dme'`
- **Social Data:** Filtered by `sourceType === 'instagram' || sourceType === 'tiktok'`
- **Context Data:** All data for benchmark calculations

## User Experience Improvements

### 1. Immediate Feedback
- Users see instant updates to all analysis components when clicking
- Title changes immediately reflect the current selection
- No need to switch between tabs or refresh

### 2. Contextual Information
- Analysis is always relevant to the current selection
- Benchmarks are calculated against appropriate data sets
- Insights are tailored to the specific context

### 3. Hierarchical Navigation
- Clear visual hierarchy in titles (Theme → Brand → Channel)
- Easy to understand current selection level
- Intuitive navigation through data layers

## Testing

The dashboard is currently running on `http://localhost:8000` for testing.

### Test Scenarios:
1. **Initial Load:** Verify "All Data Overview" title and comprehensive analysis
2. **Theme Selection:** Click on any marketing theme bubble
3. **Brand Selection:** Click on any brand bubble within a theme
4. **Channel Selection:** Click on any channel bubble within a brand
5. **Filter Application:** Apply various filters and verify title updates
6. **Return Navigation:** Click parent elements to return to previous levels

## Future Enhancements

1. **Breadcrumb Navigation:** Add visual breadcrumbs for easier navigation
2. **Selection History:** Track and display selection history
3. **Export Functionality:** Allow export of analysis for specific selections
4. **Comparison Mode:** Enable side-by-side comparison of different selections

## Files Modified

- `dashboards/bubble-chart/js/bubble-chart-app.js` - Main logic updates
- `dashboards/bubble-chart/index.html` - Already integrated (from previous work)
- `dashboards/bubble-chart/css/packed-circle.css` - Already cleaned up (from previous work)

## Status

✅ **Complete** - Dynamic title and analysis update functionality is fully implemented and integrated into the Bubble Chart Dashboard.
