#!/usr/bin/env python3
import pandas as pd
import numpy as np
from collections import Counter

# Read the CSV file
print("Loading CSV file...")
df = pd.read_csv('/mnt/d/TBWA/Philips/Breastfeeding_Pumps_Dashboard/Data/Brand_Manufacturer_with_downloads_analyzed_with_focus_tag_rows_321_end_classified_media.csv')

print(f"Total rows: {len(df)}")
print(f"Total columns: {len(df.columns)}")

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
bf_data = df[df['Brand Root'].isin(breastfeeding_brands)]
print(f"\nBreastfeeding brand entries: {len(bf_data)}")

# 1. Brand Root Distribution
print("\n=== BRAND ROOT DISTRIBUTION ===")
brand_counts = bf_data['Brand Root'].value_counts()
print(brand_counts)

# 2. Main_Category Distribution for breastfeeding brands
print("\n=== MAIN CATEGORY DISTRIBUTION (Breastfeeding Brands) ===")
main_cat_counts = bf_data['Main_Category'].value_counts()
print(main_cat_counts.head(15))

# 3. Product_Focus Distribution for breastfeeding brands
print("\n=== PRODUCT FOCUS DISTRIBUTION (Breastfeeding Brands) ===")
product_focus_counts = bf_data['Product_Focus'].value_counts()
print(product_focus_counts.head(20))

# 4. Focus vs Other Distribution
print("\n=== FOCUS VS OTHER DISTRIBUTION (Breastfeeding Brands) ===")
focus_counts = bf_data['focus_vs_other'].value_counts()
print(focus_counts)

# 5. Brand-Category Analysis
print("\n=== BRAND VS MAIN CATEGORY ANALYSIS ===")
brand_category = pd.crosstab(bf_data['Brand Root'], bf_data['Main_Category'])
print(brand_category.iloc[:, :10])  # Show first 10 categories

# 6. Sample text content analysis
print("\n=== SAMPLE TEXT CONTENT ANALYSIS ===")
# Get non-empty text samples
text_samples = bf_data[bf_data['Text_x'].notna() & (bf_data['Text_x'] != '')]
print(f"Entries with text content: {len(text_samples)}")

# Show sample texts for each major brand
for brand in ['Momcozy', 'Elvie (Chiaro Technology Ltd)', 'Medela Inc.']:
    brand_texts = text_samples[text_samples['Brand Root'] == brand]['Text_x'].head(3)
    print(f"\n--- {brand} Sample Texts ---")
    for i, text in enumerate(brand_texts, 1):
        print(f"{i}. {text[:100]}...")

# 7. Value Proposition Analysis
print("\n=== VALUE PROPOSITION ANALYSIS ===")
value_props = bf_data[bf_data['value_proposition'].notna() & (bf_data['value_proposition'] != '')]
print(f"Entries with value propositions: {len(value_props)}")

# Show sample value propositions
for brand in ['Momcozy', 'Elvie (Chiaro Technology Ltd)', 'Medela Inc.']:
    brand_values = value_props[value_props['Brand Root'] == brand]['value_proposition'].head(2)
    print(f"\n--- {brand} Value Propositions ---")
    for i, prop in enumerate(brand_values, 1):
        print(f"{i}. {prop[:150]}...")

# 8. Communication themes analysis
print("\n=== COMMUNICATION THEMES ANALYSIS ===")

# Extract key themes from descriptions
descriptions = bf_data[bf_data['overall_description'].notna() & (bf_data['overall_description'] != '')]
print(f"Entries with descriptions: {len(descriptions)}")

# Target audience analysis
audiences = bf_data[bf_data['target_audience'].notna() & (bf_data['target_audience'] != '')]
print(f"Entries with target audience data: {len(audiences)}")

print("\n=== ANALYSIS COMPLETE ===")