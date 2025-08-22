# Bubble Chart: Expansion/Collapse Animations

## 🎯 **Problem Identified**

**Issue:** The bubble chart visualization needed interactive functionality to allow users to explore the three-level hierarchy (Themes → Brands → Channels) in a more engaging and intuitive way. Users needed:

1. **Interactive exploration** of the data hierarchy
2. **Smooth animations** for expanding and collapsing nodes
3. **Visual feedback** for clickable elements
4. **State management** for expansion/collapse states
5. **Intuitive user experience** similar to other dashboard visualizations

## ✅ **Solution Implemented**

### **1. State Management System**

**Enhanced State Structure:**
```javascript
state = {
    // ... existing filters ...
    expansionState: {
        themes: new Map(), // Map of theme ID -> { expanded: boolean }
        brands: new Map()  // Map of brand ID -> { expanded: boolean }
    }
}
```

**Key Features:**
- **Persistent state** across filter changes
- **Independent control** for themes and brands
- **Memory efficient** using Map data structure
- **Easy state queries** with helper functions

### **2. Expansion/Collapse Functions**

#### **Theme Expansion Management:**
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
    }
    
    // Re-render the visualization
    render();
}
```

#### **Brand Expansion Management:**
```javascript
function toggleBrandExpansion(brandId) {
    const currentState = state.expansionState.brands.get(brandId) || { expanded: false };
    const willExpand = !currentState.expanded;
    state.expansionState.brands.set(brandId, { expanded: willExpand });
    
    // Re-render the visualization
    render();
}
```

### **3. Visibility Control System**

#### **Dynamic Node Visibility:**
```javascript
function getVisibleNodes(data) {
    const visibleNodes = [];
    
    // Check if we have a specific theme filter
    const selectedTheme = state.filters.marketingTheme;
    
    data.forEach(theme => {
        // Skip themes that don't match the filter
        if (selectedTheme !== 'all' && theme.id !== selectedTheme) {
            return;
        }
        
        // Always show theme nodes
        visibleNodes.push({
            id: theme.id,
            name: theme.name,
            value: theme.value,
            type: 'theme',
            data: theme.data
        });
        
        // Show brand nodes if theme is expanded OR if a specific theme is selected
        if ((isThemeExpanded(theme.id) || selectedTheme !== 'all') && theme.children) {
            theme.children.forEach(brand => {
                visibleNodes.push({
                    id: brand.id,
                    name: brand.name,
                    value: brand.value,
                    type: 'brand',
                    theme: theme.id,
                    data: brand.data
                });
                
                // Show channel nodes if brand is expanded
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

### **4. Interactive Click Handlers**

#### **Node Click Management:**
```javascript
.on("click", (event, d) => {
    event.stopPropagation();
    console.log('Clicked node:', d.data);
    
    // Handle click based on node type
    if (d.data.type === 'theme') {
        toggleThemeExpansion(d.data.id);
    } else if (d.data.type === 'brand') {
        toggleBrandExpansion(d.data.id);
    } else if (d.data.type === 'channel') {
        // For channels, you could add additional functionality
        console.log('Channel clicked:', d.data.name);
    }
})
```

### **5. Enhanced Tooltips**

#### **Dynamic Tooltip Content:**
```javascript
// Set tooltip content based on element type
let tooltipContent = '';
if (d.data.type === 'theme') {
    const isExpanded = isThemeExpanded(d.data.id);
    tooltipContent = `${d.data.name}<br><strong>${formatImpressions(d.data.value)} impressions</strong><br><em>Click to ${isExpanded ? 'collapse' : 'expand'}</em>`;
} else if (d.data.type === 'brand') {
    const isExpanded = isBrandExpanded(d.data.id);
    tooltipContent = `${d.data.name}<br><strong>${formatImpressions(d.data.value)} impressions</strong><br><em>Click to ${isExpanded ? 'collapse' : 'expand'}</em>`;
} else {
    // For channels, include brand name
    tooltipContent = `${d.data.name}<br><em>${d.data.brand}</em><br><strong>${formatImpressions(d.data.value)} impressions</strong>`;
}
```

### **6. Smooth Animations**

#### **Circle Animation:**
```javascript
// Add animation for new nodes appearing
circles
    .attr("r", 0)
    .transition()
    .duration(600)
    .ease(d3.easeCubicOut)
    .attr("r", d => d.r);
```

#### **Text Animation:**
```javascript
// Animate text appearance
text
    .style("opacity", 0)
    .transition()
    .duration(800)
    .delay(300)
    .style("opacity", 1);
```

## 🎨 **User Experience Features**

### **1. Intuitive Interaction**

**Click Behavior:**
- **Theme nodes:** Toggle expansion/collapse of all brands within that theme
- **Brand nodes:** Toggle expansion/collapse of all channels within that brand
- **Channel nodes:** Currently informational (could be extended for additional functionality)

### **2. Visual Feedback**

**Tooltip Enhancements:**
- **Dynamic instructions** based on current state
- **Clear action guidance** ("Click to expand" vs "Click to collapse")
- **Contextual information** for each node type

### **3. State Persistence**

**Filter Integration:**
- **Expansion states persist** across filter changes
- **Smart visibility** based on filter selections
- **Consistent behavior** with existing filter system
- **Brands always start collapsed** even when a specific theme is selected

## 🔧 **Technical Implementation**

### **1. State Management**

**Initialization Function:**
```javascript
function initializeExpansionState() {
    // Clear any existing expansion states
    state.expansionState.themes.clear();
    state.expansionState.brands.clear();
    
    console.log('Initialized expansion state - all themes and brands start collapsed');
}
```

**Helper Functions:**
```javascript
function isThemeExpanded(themeId) {
    return state.expansionState.themes.get(themeId)?.expanded || false;
}

function isBrandExpanded(brandId) {
    return state.expansionState.brands.get(brandId)?.expanded || false;
}
```

### **2. Animation System**

**D3.js Transitions:**
- **Smooth circle scaling** from 0 to target radius
- **Fade-in text effects** with staggered timing
- **Easing functions** for natural motion
- **Duration control** for optimal user experience

### **3. Event Handling**

**Click Management:**
- **Event propagation control** to prevent conflicts
- **Type-specific actions** for different node types
- **State updates** with immediate visual feedback
- **Re-rendering** for smooth transitions

## 📈 **Benefits**

### **For User Experience:**
- **Interactive exploration** of complex data hierarchies
- **Intuitive navigation** through three-level structure
- **Visual feedback** for all interactive elements
- **Smooth animations** for professional feel

### **For Data Analysis:**
- **Focused exploration** of specific themes or brands
- **Progressive disclosure** of detailed information
- **Contextual understanding** of data relationships
- **Efficient navigation** through large datasets

### **For Business Intelligence:**
- **Engaging presentation** of marketing insights
- **Clear data hierarchy** visualization
- **Interactive storytelling** capabilities
- **Professional dashboard** experience

## 🔍 **Usage Examples**

### **Scenario 1: Theme Exploration**
1. **Click on a theme bubble** (e.g., "Emotional Support & Wellness")
2. **All brands within that theme expand** around the main bubble
3. **Other themes collapse** to focus attention
4. **Smooth animation** shows the expansion process

### **Scenario 2: Brand Analysis**
1. **Click on a brand bubble** (e.g., "Medela")
2. **All channels for that brand expand** around the brand bubble
3. **Channel details become visible** with impressions data
4. **Tooltip shows** current expansion state

### **Scenario 3: Filter Integration**
1. **Select a specific marketing theme** from filters
2. **Only that theme and its brands are visible**
3. **Brands start collapsed** by default, even when a specific theme is selected
4. **Click on brands** to expand their channels
5. **Expansion states persist** when changing other filters

## 🔮 **Future Enhancements**

### **Potential Improvements:**
1. **Multi-level expansion** (expand multiple themes simultaneously)
2. **Keyboard navigation** for accessibility
3. **Animation speed controls** for user preference
4. **Expansion history** for navigation breadcrumbs

### **Advanced Features:**
- **Drag and drop** for manual positioning
- **Zoom integration** with expansion states
- **Export capabilities** for expanded views
- **Custom animation** timing and easing

The expansion/collapse animations provide an engaging and intuitive way to explore the complex three-level hierarchy of marketing themes, brands, and channels, with smooth animations and clear visual feedback for optimal user experience.
