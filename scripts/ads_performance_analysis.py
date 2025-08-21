#!/usr/bin/env python3
import pandas as pd
import numpy as np
from collections import Counter
import re
import json

def load_and_analyze_ads_data():
    """Load and analyze ads performance data"""
    print("Loading ads data...")
    
    # Load the main dataset with encoding handling
    try:
        df = pd.read_csv('Data/Pathmathics_Brand_Manufacturer_Classified.csv', encoding='utf-8')
    except UnicodeDecodeError:
        try:
            df = pd.read_csv('Data/Pathmathics_Brand_Manufacturer_Classified.csv', encoding='latin-1')
        except UnicodeDecodeError:
            df = pd.read_csv('Data/Pathmathics_Brand_Manufacturer_Classified.csv', encoding='cp1252')
    
    # Define breastfeeding brands
    breastfeeding_brands = [
        'Medela Inc.',
        'Elvie (Chiaro Technology Ltd)',
        'Momcozy',
        'Avent',
        'Evenflo',
        'Motif Medical',
        "Dr. Brown's (Handi-Craft Company)",
        'TOMMEE TIPPEE (Mayborn USA Inc.)',
        'Pumpables',
        'Freemie',
        'Spectra Baby',
        'Baby Buddha Products'
    ]
    
    # Filter for breastfeeding brands and ads data
    ads_data = df[df['Brand Root'].isin(breastfeeding_brands)].copy()
    
    # Clean and prepare data
    ads_data['Impressions'] = pd.to_numeric(ads_data['Impressions'], errors='coerce').fillna(0)
    ads_data['Spend (USD)'] = pd.to_numeric(ads_data['Spend (USD)'], errors='coerce').fillna(0)
    ads_data['Duration'] = pd.to_numeric(ads_data['Duration'], errors='coerce').fillna(0)
    
    # Calculate performance metrics
    ads_data['CPM'] = np.where(ads_data['Impressions'] > 0, 
                               (ads_data['Spend (USD)'] / ads_data['Impressions']) * 1000, 0)
    ads_data['Performance_Score'] = ads_data['Impressions'] * (1 / (1 + ads_data['CPM']))
    
    return ads_data, breastfeeding_brands

def analyze_top_performing_ads(ads_data, top_n=20):
    """Analyze the top performing ads by impressions and efficiency"""
    
    print(f"\n=== TOP {top_n} PERFORMING ADS ANALYSIS ===")
    
    # Top by impressions
    top_by_impressions = ads_data.nlargest(top_n, 'Impressions')
    
    # Top by efficiency (high impressions, low CPM)
    top_by_efficiency = ads_data.nlargest(top_n, 'Performance_Score')
    
    # Top by spend efficiency (low CPM)
    efficient_ads = ads_data[ads_data['Impressions'] > 1000].nlargest(top_n, 'Impressions')
    
    return {
        'top_by_impressions': top_by_impressions,
        'top_by_efficiency': top_by_efficiency,
        'efficient_ads': efficient_ads
    }

def analyze_ad_themes_and_content(top_ads_data):
    """Analyze themes and content of top performing ads"""
    
    print("\n=== AD THEMES AND CONTENT ANALYSIS ===")
    
    # Define theme detection rules
    theme_rules = {
        'Wearable/Portability': [
            r'wearable', r'hands.?free', r'portable', r'on the go', r'discreet', 
            r'quiet', r'wireless', r'compact', r'stealth', r'under clothes'
        ],
        'Comfort/Soothing': [
            r'comfort', r'gentle', r'soft', r'fit', r'soothe', r'sore', 
            r'lanolin', r'leak', r'pain.?free', r'gentle', r'cushion'
        ],
        'Performance/Suction': [
            r'power', r'performance', r'strong', r'suction', r'hospital.?grade', 
            r'efficiency', r'output', r'milk.?production', r'flow'
        ],
        'Education/How-to': [
            r'how to', r'guide', r'tips?', r'tutorial', r'learn', r'explainer',
            r'step.?by.?step', r'instructions', r'help'
        ],
        'Lifestyle/Motherhood': [
            r'mom', r'mother', r'family', r'postpartum', r'journey', 
            r'return to work', r'night', r'sleep', r'breastfeeding.?journey'
        ],
        'Value/Promotion': [
            r'deal', r'discount', r'save', r'off\b', r'coupon', r'promo', 
            r'bundle', r'free', r'gift', r'sale', r'offer'
        ],
        'Emotional Connection': [
            r'love', r'care', r'support', r'confidence', r'empower', 
            r'beautiful', r'special', r'moment', r'connection'
        ],
        'Convenience': [
            r'easy', r'simple', r'quick', r'fast', r'convenient', 
            r'time.?saving', r'effortless', r'one.?touch'
        ]
    }
    
    def detect_themes(text):
        if pd.isna(text) or text == '':
            return []
        
        text_lower = str(text).lower()
        detected_themes = []
        
        for theme, patterns in theme_rules.items():
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    detected_themes.append(theme)
                    break
        
        return detected_themes
    
    # Analyze themes in top ads
    theme_analysis = {}
    
    for category, ads_df in top_ads_data.items():
        print(f"\n--- {category.replace('_', ' ').title()} ---")
        
        themes_count = Counter()
        brand_themes = {}
        
        for _, ad in ads_df.iterrows():
            # Combine all text fields
            combined_text = f"{ad.get('Text_x', '')} {ad.get('Text_y', '')} {ad.get('overall_description', '')} {ad.get('value_proposition', '')}"
            
            themes = detect_themes(combined_text)
            themes_count.update(themes)
            
            brand = ad['Brand Root']
            if brand not in brand_themes:
                brand_themes[brand] = Counter()
            brand_themes[brand].update(themes)
        
        theme_analysis[category] = {
            'overall_themes': themes_count,
            'brand_themes': brand_themes
        }
        
        print(f"Top themes: {dict(themes_count.most_common(5))}")
    
    return theme_analysis

def analyze_ad_formats_and_channels(top_ads_data):
    """Analyze formats and channels of top performing ads"""
    
    print("\n=== AD FORMATS AND CHANNELS ANALYSIS ===")
    
    format_channel_analysis = {}
    
    for category, ads_df in top_ads_data.items():
        print(f"\n--- {category.replace('_', ' ').title()} ---")
        
        # Channel analysis
        channel_performance = ads_df.groupby('Channel').agg({
            'Impressions': 'sum',
            'Spend (USD)': 'sum',
            'Creative Id': 'count'
        }).round(2)
        channel_performance.columns = ['Total_Impressions', 'Total_Spend', 'Ad_Count']
        channel_performance['CPM'] = (channel_performance['Total_Spend'] / channel_performance['Total_Impressions']) * 1000
        channel_performance = channel_performance.sort_values('Total_Impressions', ascending=False)
        
        # Format analysis
        format_performance = ads_df.groupby('Creative Type_x').agg({
            'Impressions': 'sum',
            'Spend (USD)': 'sum',
            'Creative Id': 'count'
        }).round(2)
        format_performance.columns = ['Total_Impressions', 'Total_Spend', 'Ad_Count']
        format_performance['CPM'] = (format_performance['Total_Spend'] / format_performance['Total_Impressions']) * 1000
        format_performance = format_performance.sort_values('Total_Impressions', ascending=False)
        
        format_channel_analysis[category] = {
            'channels': channel_performance,
            'formats': format_performance
        }
        
        print(f"Top channels: {channel_performance.head(3).to_dict()}")
        print(f"Top formats: {format_performance.head(3).to_dict()}")
    
    return format_channel_analysis

def analyze_brand_performance_patterns(ads_data):
    """Analyze brand-specific performance patterns"""
    
    print("\n=== BRAND PERFORMANCE PATTERNS ===")
    
    brand_analysis = ads_data.groupby('Brand Root').agg({
        'Impressions': ['sum', 'mean', 'max'],
        'Spend (USD)': ['sum', 'mean'],
        'Creative Id': 'count',
        'CPM': 'mean',
        'Performance_Score': 'mean'
    }).round(2)
    
    brand_analysis.columns = [
        'Total_Impressions', 'Avg_Impressions', 'Max_Impressions',
        'Total_Spend', 'Avg_Spend', 'Ad_Count', 'Avg_CPM', 'Avg_Performance_Score'
    ]
    
    brand_analysis = brand_analysis.sort_values('Total_Impressions', ascending=False)
    
    print(brand_analysis)
    
    return brand_analysis

def generate_sample_ad_content(top_ads_data):
    """Generate sample content from top performing ads"""
    
    print("\n=== SAMPLE TOP PERFORMING AD CONTENT ===")
    
    sample_content = {}
    
    for category, ads_df in top_ads_data.items():
        print(f"\n--- {category.replace('_', ' ').title()} ---")
        
        samples = []
        for _, ad in ads_df.head(5).iterrows():
            sample = {
                'brand': ad['Brand Root'],
                'impressions': ad['Impressions'],
                'spend': ad['Spend (USD)'],
                'cpm': ad['CPM'],
                'channel': ad['Channel'],
                'format': ad['Creative Type_x'],
                'text': ad.get('Text_x', '')[:200] + '...' if len(str(ad.get('Text_x', ''))) > 200 else ad.get('Text_x', ''),
                'value_proposition': ad.get('value_proposition', ''),
                'main_category': ad.get('Main_Category', ''),
                'sub_category': ad.get('Sub_Category', '')
            }
            samples.append(sample)
            
            print(f"\nBrand: {sample['brand']}")
            print(f"Impressions: {sample['impressions']:,}")
            print(f"Spend: ${sample['spend']:.2f}")
            print(f"CPM: ${sample['cpm']:.2f}")
            print(f"Channel: {sample['channel']}")
            print(f"Format: {sample['format']}")
            print(f"Text: {sample['text']}")
            print(f"Category: {sample['main_category']}")
            print("-" * 80)
        
        sample_content[category] = samples
    
    return sample_content

def main():
    """Main analysis function"""
    
    # Load and prepare data
    ads_data, breastfeeding_brands = load_and_analyze_ads_data()
    
    print(f"Total ads analyzed: {len(ads_data):,}")
    print(f"Total impressions: {ads_data['Impressions'].sum():,}")
    print(f"Total spend: ${ads_data['Spend (USD)'].sum():,.2f}")
    
    # Analyze top performing ads
    top_ads_data = analyze_top_performing_ads(ads_data)
    
    # Analyze themes and content
    theme_analysis = analyze_ad_themes_and_content(top_ads_data)
    
    # Analyze formats and channels
    format_channel_analysis = analyze_ad_formats_and_channels(top_ads_data)
    
    # Analyze brand performance
    brand_analysis = analyze_brand_performance_patterns(ads_data)
    
    # Generate sample content
    sample_content = generate_sample_ad_content(top_ads_data)
    
    # Save results to JSON for use in the dashboard
    results = {
        'summary': {
            'total_ads': len(ads_data),
            'total_impressions': int(ads_data['Impressions'].sum()),
            'total_spend': float(ads_data['Spend (USD)'].sum()),
            'avg_cpm': float(ads_data['CPM'].mean())
        },
        'top_ads': {
            category: df.to_dict('records') for category, df in top_ads_data.items()
        },
        'theme_analysis': {
            category: {
                'overall_themes': dict(data['overall_themes']),
                'brand_themes': {brand: dict(themes) for brand, themes in data['brand_themes'].items()}
            } for category, data in theme_analysis.items()
        },
        'format_channel_analysis': {
            category: {
                'channels': data['channels'].to_dict('index'),
                'formats': data['formats'].to_dict('index')
            } for category, data in format_channel_analysis.items()
        },
        'brand_analysis': brand_analysis.to_dict('index'),
        'sample_content': sample_content
    }
    
    with open('ads_performance_results.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print("\n=== ANALYSIS COMPLETE ===")
    print("Results saved to ads_performance_results.json")
    
    return results

if __name__ == "__main__":
    main()
