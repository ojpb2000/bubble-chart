# Project Organization Guide

## 📁 Directory Structure Overview

This document outlines the organized structure of the Breastfeeding Pumps Dashboard project.

### **Root Directory**
```
Breastfeeding_Pumps_Dashboard/
├── 📊 dashboards/          # Main dashboard applications
├── 📈 reports/            # Analysis reports and documentation
├── 🔧 scripts/            # Data analysis scripts
├── 📁 src/                # Core JavaScript components
├── 🎨 styles/             # CSS styling
├── 📊 Data/               # Data sources
├── ⚙️ config/             # Configuration files
├── 📚 docs/               # Documentation
├── README.md              # Main project documentation
├── .gitignore             # Git ignore rules
└── PROJECT_ORGANIZATION.md # This file
```

## 📊 Dashboards Directory

### **packed-circle/** - Primary Interactive Dashboard
- **index.html**: Main dashboard interface
- **js/packed-circle-app.js**: Enhanced dashboard logic with:
  - Dynamic Key Takeaways
  - Enhanced Ads Analysis
  - Enhanced Social Analysis
  - Benchmark comparisons
- **css/**: Dashboard-specific styles

### **bubbles/** - Alternative Bubble Visualization
- Alternative visualization approach
- Different interaction patterns

## 📈 Reports Directory

### **executive-summaries/**
- **ADS_ANALYSIS_EXECUTIVE_SUMMARY.md**: Spanish version
- **ADS_ANALYSIS_EXECUTIVE_SUMMARY_EN.md**: English version

### **demos/**
- **ads_analysis_demo.html**: Spanish demo
- **ads_analysis_demo_en.html**: English demo

### **analysis/**
- **Main_Categories_Guide_Introduction.txt**: Category analysis
- **Brand_Communication_Insights_Analysis.txt**: Brand insights

## 🔧 Scripts Directory

### **Data Analysis Scripts**
- **ads_performance_analysis.py**: Core ads performance analysis
- **analyze_data.py**: General data analysis utilities
- **detailed_analysis.py**: Detailed market analysis
- **messaging_analysis.py**: Messaging theme analysis

## 📁 Source Directory

### **Core JavaScript Components**
- **ads_analysis_enhanced.js**: Enhanced ads analysis component
- **app.js**: Main application logic
- **bubbles_pack.js**: Bubble visualization
- **bubbles_pack_instagram.js**: Instagram-specific analysis
- **bubbles_pack_tiktok.js**: TikTok-specific analysis
- **bubbles_pack_dme.js**: DME brands analysis
- **bubbles.js**: Core bubble functionality
- **mosaic.js**: Mosaic visualization
- **labels.js**: Label management
- **insights.js**: Insights generation

## 🎨 Styles Directory

### **CSS Files**
- **ads_analysis_enhanced.css**: Enhanced analysis styling
- **main.css**: Main application styles

## 📊 Data Directory

### **Data Sources**
- **Pathmathics_Brand_Manufacturer_Classified.csv**: Main dataset

## ⚙️ Configuration Directory

### **Configuration Files**
- **dashboards.js**: Dashboard registry and management

## 🚀 Key Features by Directory

### **Enhanced Analytics (packed-circle/)**
- ✅ Dynamic Key Takeaways with category benchmarks
- ✅ Enhanced Ads Analysis with performance metrics
- ✅ Enhanced Social Analysis with engagement insights
- ✅ Real-time filtering and analysis updates

### **Reporting (reports/)**
- ✅ Executive summaries in multiple languages
- ✅ Demo applications for testing
- ✅ Detailed analysis documentation

### **Data Processing (scripts/)**
- ✅ Python scripts for data analysis
- ✅ Performance metrics calculation
- ✅ Content theme detection

## 📋 File Naming Conventions

### **Reports**
- Executive summaries: `*_EXECUTIVE_SUMMARY.md`
- Demos: `*_demo.html`
- Analysis: Descriptive names with `.txt` or `.md`

### **Scripts**
- Python scripts: `*_analysis.py`
- JavaScript: `*_pack.js` for visualizations, `*_enhanced.js` for enhanced components

### **Styles**
- Component-specific: `*_enhanced.css`
- General: `main.css`

## 🔄 Migration Notes

### **Moved Files**
- HTML demos → `reports/demos/`
- Executive summaries → `reports/executive-summaries/`
- Analysis reports → `reports/analysis/`
- Python scripts → `scripts/`

### **Preserved Structure**
- Dashboard applications remain in `dashboards/`
- Core JavaScript components remain in `src/`
- Styles remain in `styles/`
- Data remains in `Data/`

## 🎯 Benefits of Organization

### **Clarity**
- Clear separation of concerns
- Easy to find specific components
- Logical file grouping

### **Maintainability**
- Related files grouped together
- Easy to update specific features
- Clear dependencies

### **Scalability**
- Easy to add new reports
- Simple to extend functionality
- Clear structure for new developers

### **Documentation**
- Comprehensive README
- Clear project structure
- Easy onboarding

## 📝 Next Steps

### **For GitHub**
1. ✅ Project structure organized
2. ✅ README updated
3. ✅ .gitignore created
4. ✅ Documentation complete

### **Future Enhancements**
- Add unit tests directory
- Create deployment scripts
- Add API documentation
- Create contribution guidelines

---

**Last Updated**: August 2025
**Organization Version**: 1.0.0
