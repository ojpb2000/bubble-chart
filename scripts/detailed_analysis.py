#!/usr/bin/env python3
import pandas as pd
import numpy as np
from collections import Counter
import re

# Read the CSV file
df = pd.read_csv('/mnt/d/TBWA/Philips/Breastfeeding_Pumps_Dashboard/Data/Brand_Manufacturer_with_downloads_analyzed_with_focus_tag_rows_321_end_classified_media.csv')

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

# Filter for breastfeeding brands
bf_data = df[df['Brand Root'].isin(breastfeeding_brands)].copy()

print("=== COMPREHENSIVE BREASTFEEDING PUMP MARKET ANALYSIS ===")
print(f"Total dataset: {len(df):,} entries")
print(f"Breastfeeding brand entries: {len(bf_data):,} entries")
print(f"Analysis period: {df['First Seen'].min()} to {df['Last Seen'].max()}")

print("\n=== 1. BRAND LANDSCAPE ===")
brand_summary = bf_data.groupby('Brand Root').agg({
    'Creative Id': 'count',
    'Spend (USD)': 'sum',
    'Impressions': 'sum'
}).round(2)
brand_summary.columns = ['Total_Ads', 'Total_Spend_USD', 'Total_Impressions']
brand_summary = brand_summary.sort_values('Total_Ads', ascending=False)
print(brand_summary)

print("\n=== 2. CATEGORY POSITIONING BY BRAND ===")
# Focus on meaningful categories
meaningful_cats = [
    'Comfort & Pain-Free Use',
    'Price vs. Value', 
    'Portability & Discreet Design',
    'Convenience Features',
    'Bottle Feeding & Transition Support',
    'Efficiency',
    'Emotional Connection',
    'Real Mom Testimonials',
    'Hospital Grade or Doctor Recommended'
]

cat_by_brand = pd.crosstab(bf_data['Brand Root'], bf_data['Main_Category'])
if len([col for col in meaningful_cats if col in cat_by_brand.columns]) > 0:
    meaningful_subset = cat_by_brand[[col for col in meaningful_cats if col in cat_by_brand.columns]]
    print(meaningful_subset)

print("\n=== 3. PRODUCT FOCUS ANALYSIS ===")
product_focus_clean = bf_data[bf_data['Product_Focus'].notna() & 
                             (bf_data['Product_Focus'] != '') & 
                             (~bf_data['Product_Focus'].str.contains('Other: Unclear|Not Recognizable', na=False))]

print("Product Focus Distribution (excluding unclear):")
print(product_focus_clean['Product_Focus'].value_counts().head(10))

print("\n=== 4. COMMUNICATION THEMES ===")

# Analyze text content for themes
text_data = bf_data[bf_data['Text_x'].notna() & (bf_data['Text_x'] != '')]
all_text = ' '.join(text_data['Text_x'].astype(str).tolist())

# Key themes to search for
themes = {
    'Freedom/Liberation': ['free', 'freedom', 'hands-free', 'wireless', 'untethered'],
    'Comfort': ['comfort', 'soft', 'gentle', 'pain-free', 'soothe'],
    'Convenience': ['easy', 'simple', 'convenient', 'quick', 'effortless'],
    'Efficiency': ['efficient', 'powerful', 'fast', 'boost', 'maximize'],
    'Support': ['support', 'help', 'assist', 'guidance', 'care'],
    'Emotion/Connection': ['love', 'bond', 'journey', 'beautiful', 'special', 'precious'],
    'Medical/Professional': ['doctor', 'pediatrician', 'clinical', 'medical', 'professional', 'hospital'],
    'Working Moms': ['work', 'office', 'career', 'busy', 'on-the-go', 'travel'],
    'Technology': ['smart', 'app', 'connected', 'track', 'monitor', 'digital']
}

print("Communication Themes Found:")
for theme, keywords in themes.items():
    count = sum(all_text.lower().count(keyword) for keyword in keywords)
    print(f"{theme}: {count} mentions")

print("\n=== 5. BRAND POSITIONING INSIGHTS ===")

# Analyze by top brands
top_brands = ['Momcozy', 'Elvie (Chiaro Technology Ltd)', 'Avent', 'Evenflo']

for brand in top_brands:
    brand_data = bf_data[bf_data['Brand Root'] == brand]
    print(f"\n--- {brand} ({len(brand_data)} ads) ---")
    
    # Top categories for this brand
    top_cats = brand_data['Main_Category'].value_counts().head(3)
    print(f"Top Categories: {list(top_cats.index)}")
    
    # Product focus
    product_focus = brand_data['Product_Focus'].value_counts().head(3)
    print(f"Product Focus: {list(product_focus.index)}")
    
    # Sample messaging
    sample_text = brand_data[brand_data['Text_x'].notna() & (brand_data['Text_x'] != '')]
    if len(sample_text) > 0:
        sample = sample_text['Text_x'].iloc[0]
        print(f"Sample Message: {sample[:100]}...")

print("\n=== 6. MARKET GAPS AND OPPORTUNITIES ===")

# Analyze focus vs other distribution
focus_breakdown = bf_data.groupby(['Brand Root', 'focus_vs_other']).size().unstack(fill_value=0)
if 'focus' in focus_breakdown.columns and 'other' in focus_breakdown.columns:
    focus_breakdown['focus_ratio'] = focus_breakdown['focus'] / (focus_breakdown['focus'] + focus_breakdown['other'])
    print("Focus on Breastfeeding vs Other Products by Brand:")
    print(focus_breakdown.sort_values('focus_ratio', ascending=False))

# Category gaps
print("\nUnderrepresented Categories:")
low_categories = bf_data['Main_Category'].value_counts().tail(5)
print(low_categories)

print("\n=== 7. PREMIUM VS VALUE POSITIONING ===")
price_value_brands = bf_data[bf_data['Main_Category'] == 'Price vs. Value']['Brand Root'].value_counts()
if len(price_value_brands) > 0:
    print("Brands emphasizing Price/Value:")
    print(price_value_brands)

print("\n=== ANALYSIS COMPLETE ===")