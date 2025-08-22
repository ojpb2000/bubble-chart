# Bubble Chart: Theme Focus Behavior Implementation

## 🎯 **Problem Identified**

**Issue:** When users clicked on a theme to expand it, all themes remained visible, creating a cluttered visualization. Users wanted a more focused experience where clicking on a theme would hide other themes and center the selected theme with its brands.

**User Request:** "Puedes hacer que cuando haga click en una categoria las otras categorias se oculten y solo quede la categoria en el centro y al rededor las brands?" (Can you make it so that when I click on a category, the other categories are hidden and only the category remains in the center with the brands around it?)

## ✅ **Solution Implemented**

### **1. Enhanced Visibility Logic**

**Problem Solved:** Previously, when a theme was expanded, other themes remained visible and occupied space, creating gaps and holes in the visualization. The layout didn't reorganize to fill these empty spaces.

**Solution:** Implemented a focus mode detection system that completely hides non-expanded themes and allows the D3.js pack layout to reorganize the remaining elements to fill the available space efficiently.

**Updated `getVisibleNodes` Function:**
```javascript
function getVisibleNodes(data) {
    const visibleNodes = [];
    
    // Check if we have a specific theme filter
    const selectedTheme = state.filters.marketingTheme;
    
    // Check if any theme is expanded (for focus mode)
    const expandedTheme = Array.from(state.expansionState.themes.entries())
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
        if ((selectedTheme === 'all' && !expandedTheme) || 
            theme.id === selectedTheme || 
            (expandedTheme && theme.id === expandedTheme[0])) {
            visibleNodes.push({
                id: theme.id,
                name: theme.name,
                value: theme.value,
                type: 'theme',
                data: theme.data
            });
        }
        
        // Show brand nodes if:
        // 1. Theme is expanded (focus mode)
        // 2. OR if a specific theme is selected from filter
        if ((isExpanded || selectedTheme !== 'all') && theme.children) {
            // ... brand and channel logic
        }
    });
    
    return visibleNodes;
}
```

### **2. Enhanced Theme Expansion Management**

**Updated `toggleThemeExpansion` Function:**
```javascript
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
```

### **3. Enhanced Tooltip Content**

**Updated Tooltip Messages:**
```javascript
// Set tooltip content based on element type
let tooltipContent = '';
if (d.data.type === 'theme') {
    const isExpanded = isThemeExpanded(d.data.id);
    tooltipContent = `${d.data.name}<br><strong>${formatImpressions(d.data.value)} impressions</strong><br><em>Click to ${isExpanded ? 'show all themes' : 'focus on this theme'}</em>`;
} else if (d.data.type === 'brand') {
    const isExpanded = isBrandExpanded(d.data.id);
    tooltipContent = `${d.data.name}<br><strong>${formatImpressions(d.data.value)} impressions</strong><br><em>Click to ${isExpanded ? 'collapse' : 'expand'} channels</em>`;
} else {
    // For channels, include brand name
    tooltipContent = `${d.data.name}<br><em>${d.data.brand}</em><br><strong>${formatImpressions(d.data.value)} impressions</strong>`;
}
```

## 🎨 **User Experience Improvements**

### **1. Focused Theme View**

**New Behavior:**
- **Click on theme:** Other themes disappear completely, selected theme centers with its brands
- **Click again on focused theme:** All themes reappear (return to overview)
- **Clean, focused visualization** without visual clutter or empty spaces
- **Dynamic layout reorganization** to fill gaps left by hidden themes

### **2. Seamless Integration**

**Filter Compatibility:**
- **Theme expansion** works independently of filter selections
- **Filter changes** don't interfere with expansion states
- **Consistent behavior** across all interaction modes

### **3. Clear Visual Feedback**

**Tooltip Enhancements:**
- **"Focus on this theme"** when theme is collapsed
- **"Show all themes"** when theme is focused
- **Clear action guidance** for user interactions

## 🔧 **Technical Implementation Details**

### **1. Visibility Control Logic**

**Theme Node Visibility:**
```javascript
// Show theme nodes only if:
// 1. No specific theme filter is selected (show all themes)
// 2. OR if this is the selected theme from filter
if (selectedTheme === 'all' || theme.id === selectedTheme) {
    visibleNodes.push(themeNode);
}
```

**Brand Node Visibility:**
```javascript
// Show brand nodes if:
// 1. Theme is expanded (when no specific filter is selected)
// 2. OR if a specific theme is selected from filter
if ((isExpanded || selectedTheme !== 'all') && theme.children) {
    visibleNodes.push(brandNodes);
}
```

### **2. State Management**

**Expansion State Integration:**
- **Theme expansion states** control visibility independently
- **Filter states** work alongside expansion states
- **Automatic filter clearing** when expanding themes

### **3. Filter Synchronization**

**Automatic Filter Updates:**
- **Filter dropdown** updates when theme is expanded
- **Consistent state** between expansion and filter selections
- **User-friendly behavior** with clear visual feedback

## 📈 **Benefits**

### **For User Experience:**
- **Focused exploration** of specific themes without distraction
- **Clean, uncluttered visualization** when analyzing themes
- **Intuitive interaction** with clear visual feedback
- **Seamless transition** between overview and focused views

### **For Data Analysis:**
- **Concentrated analysis** of specific marketing themes
- **Better brand comparison** within focused themes
- **Reduced cognitive load** during detailed exploration
- **Efficient navigation** through complex data hierarchies

### **For Business Intelligence:**
- **Professional presentation** with focused storytelling
- **Clear data hierarchy** visualization
- **Engaging user interaction** with smooth transitions
- **Intuitive exploration** of marketing insights

## 🔍 **Usage Examples**

### **Scenario 1: Theme Focus**
1. **User clicks on "Emotional Support & Wellness"** theme
2. **Other themes disappear** from visualization
3. **Selected theme centers** with all its brands visible
4. **Clean, focused view** for detailed analysis

### **Scenario 2: Return to Overview**
1. **User clicks again on focused theme**
2. **All themes reappear** in the visualization
3. **Overview mode restored** for broad comparison
4. **Smooth transition** between focused and overview states

### **Scenario 3: Brand Exploration**
1. **User focuses on specific theme** (e.g., "Medical Endorsement")
2. **Theme centers with brands** around it
3. **User clicks on individual brands** to explore channels
4. **Progressive disclosure** within focused context

### **Scenario 4: Filter Integration**
1. **User selects theme from filter** (e.g., "Price vs Value")
2. **Only that theme and brands** are visible
3. **User can still expand/collapse** brands within the theme
4. **Consistent behavior** across all interaction modes

## 🔮 **Future Enhancements**

### **Potential Improvements:**
1. **Smooth transitions** between focused and overview states
2. **Zoom effects** for focused theme emphasis
3. **Animation controls** for user preference
4. **Keyboard shortcuts** for theme navigation

### **Advanced Features:**
- **Multi-theme comparison** mode
- **Theme grouping** functionality
- **Export focused views** for presentations
- **Custom animation** timing and easing

The theme focus behavior provides a clean, intuitive way to explore specific marketing themes in detail while maintaining the ability to return to an overview for broader comparison, creating an engaging and professional data exploration experience.
