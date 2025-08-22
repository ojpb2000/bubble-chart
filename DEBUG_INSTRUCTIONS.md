# Debug Instructions for Dynamic Updates

## Problem
The dynamic title and analysis updates are not being reflected in the UI despite the code being implemented correctly.

## Changes Made

### 1. Fixed Render Function Issue
- **Problem**: `render()` was being called after `handleBlendedNodeClick()`, which was overwriting the analysis updates
- **Solution**: Created `renderVisualizationOnly()` function that only updates the bubble chart without touching analysis components
- **File**: `dashboards/bubble-chart/js/bubble-chart-app.js`

### 2. Added Debug Logging
- Added console logs to track function execution
- Added element existence checks
- Added data flow tracking

### 3. Enhanced Initialization
- Added backup initialization on window load
- Added more detailed logging for initialization process

## Testing Steps

### Step 1: Access the Dashboard
1. Open your browser and go to: `http://localhost:8000`
2. Open the browser's Developer Tools (F12)
3. Go to the Console tab

### Step 2: Check Initialization
1. Refresh the page
2. Look for these console messages:
   - "DOM Content Loaded - Initializing dashboard..."
   - "Loading data for Bubble Chart Dashboard"
   - "Data loaded and normalized: {...}"
   - "updateAnalysisComponents called with X rows"
   - "Title element found, updating to: overview All Data"

### Step 3: Test Dynamic Updates
1. Click on any bubble in the chart
2. Look for these console messages:
   - "Clicked node: {...}"
   - "handleBlendedNodeClick called with: {...}"
   - "Title element found, updating to: theme [Theme Name]"
   - "Title updated to: [New Title]"

### Step 4: Debug Test Page
1. Go to: `http://localhost:8000/test-debug.html`
2. Use the debug buttons to test individual components:
   - "Test Title Update" - Tests if the title element can be updated
   - "Test Analysis Update" - Tests if the analysis function works
   - "Check DOM Elements" - Verifies all required elements exist
   - "Clear Console" - Clears console for clean testing

## Expected Behavior

### Title Updates
- **Initial Load**: Should show "All Data Overview"
- **Theme Click**: Should show theme name (e.g., "Support for Working Moms")
- **Brand Click**: Should show "Theme — Brand" (e.g., "Support for Working Moms — Medela")
- **Channel Click**: Should show "Theme — Brand — Channel" (e.g., "Support for Working Moms — Medela — Facebook")

### Analysis Updates
- All analysis components should update when clicking bubbles:
  - Key Takeaways
  - Supporting Quotes
  - Metrics Cards (Spend, Impressions, Engagement)
  - Top Ads Gallery
  - Top Social Posts Gallery
  - Ads Analysis
  - Social Analysis
  - Ads Mix
  - Social Mix

## Troubleshooting

### If Title Doesn't Update
1. Check console for "Title element not found!" error
2. Verify element with ID `bp-title` exists in HTML
3. Check if `handleBlendedNodeClick` is being called

### If Analysis Doesn't Update
1. Check console for "updateAnalysisComponents called with X rows"
2. Verify data is being loaded correctly
3. Check if `renderVisualizationOnly()` is being called instead of `render()`

### If Nothing Updates
1. Check if JavaScript errors are preventing execution
2. Verify all required files are loading (config.js, d3.js, bubble-chart-app.js)
3. Check if data files are accessible

## Files Modified
- `dashboards/bubble-chart/js/bubble-chart-app.js` - Main logic updates
- `dashboards/bubble-chart/test-debug.html` - Debug test page

## Next Steps
1. Test the dashboard with the debug instructions above
2. Check console logs for any errors or missing elements
3. Report specific error messages or unexpected behavior
4. If issues persist, we can add more detailed debugging
