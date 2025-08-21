# Breastfeeding Pumps Dashboard

A comprehensive marketing analytics dashboard for the breastfeeding pumps industry, providing insights from Pathmatics advertising data and social media analytics.

## 🚀 Features

### **Interactive Dashboard**
- **Blended Analysis**: Combined view of paid media and social media performance
- **Dynamic Filtering**: Filter by category, brand, channel, and time period
- **Real-time Insights**: Adaptive analysis that updates based on user selections

### **Enhanced Analytics Components**
- **Ads Analysis**: Best performing creativities with content themes and benchmark comparisons
- **Social Analysis**: Top Instagram/TikTok posts with engagement metrics and performance insights
- **Key Takeaways**: Strategic insights combining Pathmatics and Social Media data with category benchmarks

### **Data Sources**
- **Pathmatics**: Paid advertising data (manufacturer + DME)
- **Social Media**: Instagram and TikTok organic content
- **Cross-platform Analysis**: Integrated paid-organic performance insights

## 📁 Project Structure

```
Breastfeeding_Pumps_Dashboard/
├── 📊 dashboards/                    # Main dashboard applications
│   ├── packed-circle/               # Primary interactive dashboard
│   │   ├── index.html              # Main dashboard interface
│   │   ├── js/
│   │   │   └── packed-circle-app.js # Enhanced dashboard logic
│   │   └── css/
│   └── bubbles/                     # Alternative bubble visualization
├── 📈 reports/                      # Analysis reports and documentation
│   ├── executive-summaries/         # Executive summaries
│   │   ├── ADS_ANALYSIS_EXECUTIVE_SUMMARY.md
│   │   └── ADS_ANALYSIS_EXECUTIVE_SUMMARY_EN.md
│   ├── demos/                       # Demo applications
│   │   ├── ads_analysis_demo.html
│   │   └── ads_analysis_demo_en.html
│   └── analysis/                    # Detailed analysis reports
│       ├── Main_Categories_Guide_Introduction.txt
│       └── Brand_Communication_Insights_Analysis.txt
├── 🔧 scripts/                      # Data analysis scripts
│   ├── ads_performance_analysis.py
│   ├── analyze_data.py
│   └── detailed_analysis.py
├── 📁 src/                          # Core JavaScript components
│   ├── ads_analysis_enhanced.js     # Enhanced ads analysis component
│   ├── app.js                       # Main application logic
│   ├── bubbles_pack.js              # Bubble visualization
│   └── [other visualization files]
├── 🎨 styles/                       # CSS styling
│   ├── ads_analysis_enhanced.css
│   └── main.css
├── 📊 Data/                         # Data sources
│   └── Pathmathics_Brand_Manufacturer_Classified.csv
├── ⚙️ config/                       # Configuration files
└── 📚 docs/                         # Documentation
    ├── README.md
    └── MIGRATION.md
```

## 🎯 Key Components

### **Enhanced Ads Analysis**
- **Performance Metrics**: CPM, impressions, spend analysis
- **Content Themes**: Automated theme detection and categorization
- **Benchmark Comparisons**: Performance vs category averages
- **Top Creativities**: Best performing ads with detailed insights

### **Enhanced Social Analysis**
- **Engagement Metrics**: Likes, comments, shares analysis
- **Content Strategy**: UGC, influencer, and collaboration insights
- **Performance Benchmarks**: Engagement rate comparisons
- **Top Posts**: Best performing social content with themes

### **Dynamic Key Takeaways**
- **Cross-platform Insights**: Combined paid-organic analysis
- **Category Benchmarks**: Real performance comparisons
- **Strategic Recommendations**: Data-driven insights
- **Adaptive Content**: Updates based on user selections

## 🚀 Getting Started

### **Prerequisites**
- Python 3.7+
- Modern web browser
- Local web server (for development)

### **Installation**
1. Clone the repository
2. Navigate to the dashboard directory
3. Start a local server:
   ```bash
   cd dashboards/packed-circle
   python -m http.server 8000
   ```
4. Open `http://localhost:8000` in your browser

### **Data Requirements**
- Pathmatics CSV file in `Data/` directory
- Social media data (Instagram/TikTok)
- Proper data formatting as specified in configuration

## 📊 Dashboard Features

### **Blended Analysis View**
- **Interactive Filtering**: Select by category, brand, or channel
- **Dynamic Insights**: Real-time analysis updates
- **Performance Metrics**: Spend, impressions, engagement tracking
- **Content Analysis**: Theme detection and messaging insights

### **Comparative Analysis**
- **Benchmark Comparisons**: Performance vs category averages
- **Cross-platform Metrics**: Paid vs organic performance
- **Strategic Insights**: Actionable recommendations

## 🔧 Technical Implementation

### **Frontend Technologies**
- **JavaScript**: ES6+ with D3.js for data visualization
- **CSS**: Modern styling with responsive design
- **HTML5**: Semantic markup for accessibility

### **Data Processing**
- **Python Scripts**: Data analysis and preprocessing
- **D3.js**: Client-side data manipulation and visualization
- **Real-time Filtering**: Dynamic data subsetting

### **Performance Optimizations**
- **Efficient Data Loading**: Optimized CSV parsing
- **Responsive Design**: Mobile-friendly interface
- **Caching**: Client-side data caching for performance

## 📈 Recent Improvements

### **Enhanced Analytics Components**
- ✅ **Dynamic Key Takeaways**: Real-time insights with category benchmarks
- ✅ **Improved Ads Analysis**: Best performing creativities with content themes
- ✅ **Enhanced Social Analysis**: Top posts with engagement metrics
- ✅ **Benchmark Comparisons**: Performance vs category averages

### **Project Organization**
- ✅ **Structured Directory**: Clear separation of concerns
- ✅ **Documentation**: Comprehensive README and guides
- ✅ **Demo Applications**: Standalone examples for testing
- ✅ **Executive Summaries**: High-level insights in multiple languages

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is proprietary and confidential.

## 📞 Support

For questions or support, please contact the development team.

---

**Last Updated**: August 2025
**Version**: 2.0.0