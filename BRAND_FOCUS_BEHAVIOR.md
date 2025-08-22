# Bubble Chart: Brand Focus Behavior Implementation

## 🎯 **Problem Identified**

**User Request:** "Aplica este mismo comportamiento pero cuando hago click en una brand, entonces lo que quiero ver son los channels de esa brand únicamente, ocultando el resto de marcas y canales y enfocándonos solo en los canales de esa marca en esa categoría" (Apply this same behavior but when I click on a brand, then what I want to see are the channels of that brand only, hiding the rest of brands and channels and focusing only on the channels of that brand in that category).

**Current Behavior:** When clicking on a brand, it would expand to show its channels while keeping other brands visible, creating visual clutter.

**Desired Behavior:** When clicking on a brand, hide all other brands and channels, showing only the selected brand and its channels in a focused view.

## ✅ **Solution Implemented**

### **1. Enhanced Brand Expansion Logic**

**Problem Root Cause:** The brand expansion was only toggling the individual brand's state without affecting other brands, similar to the previous theme focus issue.

**Solution:** Implemented a brand focus mode that collapses all other brands when one brand is expanded, creating a clean, focused view.

**Implementation:**
```javascript
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
```

### **2. Updated Visibility Logic**

**Enhanced `getVisibleNodes` Function:**
```javascript
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
            (expandedBrand && brand.id === expandedBrand[0])) {
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
```

### **3. Updated Tooltip Content**

**Enhanced Tooltip Messages:**
```javascript
// Set tooltip content based on element type
let tooltipContent = '';
if (d.data.type === 'theme') {
    const isExpanded = isThemeExpanded(d.data.id);
    tooltipContent = `${d.data.name}<br><strong>${formatImpressions(d.data.value)} impressions</strong><br><em>Click to ${isExpanded ? 'show all themes' : 'focus on this theme'}</em>`;
} else if (d.data.type === 'brand') {
    const isExpanded = isBrandExpanded(d.data.id);
    tooltipContent = `${d.data.name}<br><strong>${formatImpressions(d.data.value)} impressions</strong><br><em>Click to ${isExpanded ? 'show all brands' : 'focus on this brand'}</em>`;
} else {
    // For channels, include brand name
    tooltipContent = `${d.data.name}<br><em>${d.data.brand}</em><br><strong>${formatImpressions(d.data.value)} impressions</strong>`;
}
```

## 🎨 **User Experience Improvements**

### **1. Hierarchical Focus System**

**Three-Level Focus Behavior:**
- **Theme Focus:** Click theme → Hide other themes, show only selected theme and its brands
- **Brand Focus:** Click brand → Hide other brands, show only selected brand and its channels
- **Channel View:** Channels are always shown when their parent brand is focused

### **2. Clean Visual Hierarchy**

**Progressive Disclosure:**
- **Overview Mode:** All themes visible
- **Theme Focus Mode:** One theme + its brands visible
- **Brand Focus Mode:** One brand + its channels visible
- **Consistent Layout:** D3.js pack layout automatically reorganizes to fill available space

### **3. Intuitive Navigation**

**Clear Interaction Patterns:**
- **Click theme:** Focus on theme and its brands
- **Click brand:** Focus on brand and its channels
- **Click again:** Return to previous level (theme focus or overview)
- **Visual feedback:** Tooltips indicate current state and next action

## 🔧 **Technical Implementation Details**

### **1. State Management**

**Expansion State Tracking:**
- **Theme expansion:** `state.expansionState.themes` - Map of theme ID → expansion state
- **Brand expansion:** `state.expansionState.brands` - Map of brand ID → expansion state
- **Mutual exclusivity:** Only one theme OR one brand can be expanded at a time

### **2. Visibility Logic**

**Conditional Node Display:**
- **Theme nodes:** Show based on filter, theme expansion, or brand expansion (parent theme)
- **Brand nodes:** Show based on theme expansion, filter selection, or brand expansion (selected brand only)
- **Channel nodes:** Show only when parent brand is explicitly expanded

### **3. Layout Reorganization**

**Dynamic Space Utilization:**
- **D3.js pack layout:** Automatically reorganizes visible nodes to fill available space
- **No visual gaps:** Hidden nodes don't occupy space, allowing remaining nodes to expand
- **Smooth transitions:** Animated appearance/disappearance of nodes

## 📈 **Benefits**

### **For User Experience:**
- **Reduced visual clutter** when focusing on specific data
- **Clear data hierarchy** with progressive disclosure
- **Intuitive navigation** with consistent interaction patterns
- **Professional appearance** with clean, focused views

### **For Data Analysis:**
- **Focused analysis** on specific themes or brands
- **Clear channel relationships** within brand context
- **Efficient data exploration** with minimal distractions
- **Consistent color inheritance** throughout focus levels

### **For Business Intelligence:**
- **Strategic insights** through focused data views
- **Clear competitive analysis** at theme and brand levels
- **Channel performance evaluation** within brand context
- **Professional presentation** for stakeholders

## 🔍 **Usage Examples**

### **Scenario 1: Brand Focus Analysis**
1. **User sees all themes** in overview mode
2. **User clicks on "Support for Working Moms"** → Theme focus mode
3. **User sees all brands** within that theme
4. **User clicks on "Elvie"** → Brand focus mode
5. **User sees only Elvie and its channels** (Facebook, Google, IG Feed, etc.)
6. **User clicks on Elvie again** → Returns to theme focus mode

### **Scenario 2: Channel Performance Review**
1. **User focuses on "Medical Endorsement"** theme
2. **User sees all brands** in medical endorsement category
3. **User clicks on "Medela"** → Brand focus mode
4. **User analyzes Medela's channel performance** (Facebook, Google, TT Feed, etc.)
5. **User identifies best-performing channels** for Medela

### **Scenario 3: Competitive Analysis**
1. **User focuses on "Price vs Value"** theme
2. **User compares different brands** in the price-focused category
3. **User clicks on "Avent"** → Brand focus mode
4. **User analyzes Avent's channel strategy** and performance
5. **User returns to theme view** to compare with other brands

## 🔮 **Future Enhancements**

### **Potential Improvements:**
1. **Multi-level navigation breadcrumbs** showing current focus path
2. **Keyboard navigation** for accessibility
3. **Focus history** with back/forward navigation
4. **Custom focus levels** (e.g., focus on multiple brands simultaneously)

### **Advanced Features:**
- **Focus-based filtering** and analysis components
- **Focus state persistence** across sessions
- **Focus-based export** capabilities
- **Focus sharing** via URL parameters

The brand focus behavior creates a clean, hierarchical data exploration experience that allows users to drill down from themes to brands to channels while maintaining visual clarity and professional presentation throughout all interaction levels.
