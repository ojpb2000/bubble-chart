#!/usr/bin/env python3
import pandas as pd
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

print("=== MESSAGING AND POSITIONING ANALYSIS ===")

print("\n=== KEY MESSAGING THEMES BY CATEGORY ===")

categories_to_analyze = [
    'Comfort & Pain-Free Use',
    'Portability & Discreet Design', 
    'Convenience Features',
    'Efficiency',
    'Emotional Connection',
    'Real Mom Testimonials'
]

for category in categories_to_analyze:
    cat_data = bf_data[bf_data['Main_Category'] == category]
    if len(cat_data) > 0:
        print(f"\n--- {category} ({len(cat_data)} ads) ---")
        
        # Get sample messages
        text_samples = cat_data[cat_data['Text_x'].notna() & (cat_data['Text_x'] != '')]
        if len(text_samples) > 0:
            print("Sample Messages:")
            for i, (brand, text) in enumerate(zip(text_samples['Brand Root'].head(3), text_samples['Text_x'].head(3)), 1):
                clean_text = str(text).replace('\n', ' ').strip()
                print(f"{i}. {brand}: {clean_text[:120]}...")

print("\n=== BRAND-SPECIFIC MESSAGING PATTERNS ===")

top_brands = ['Momcozy', 'Elvie (Chiaro Technology Ltd)', 'Medela Inc.', 'Avent']

for brand in top_brands:
    brand_data = bf_data[bf_data['Brand Root'] == brand]
    text_data = brand_data[brand_data['Text_x'].notna() & (brand_data['Text_x'] != '')]
    
    if len(text_data) > 0:
        print(f"\n--- {brand} Messaging Analysis ---")
        
        # Sample messages
        print("Sample Messages:")
        for i, text in enumerate(text_data['Text_x'].head(3), 1):
            clean_text = str(text).replace('\n', ' ').strip()
            print(f"{i}. {clean_text[:150]}...")
        
        # Key phrases analysis
        all_text = ' '.join(text_data['Text_x'].astype(str))
        
        # Look for common breastfeeding terms
        key_terms = {
            'pump': all_text.lower().count('pump'),
            'breast': all_text.lower().count('breast'),
            'milk': all_text.lower().count('milk'),
            'comfort': all_text.lower().count('comfort'),
            'easy': all_text.lower().count('easy'),
            'free': all_text.lower().count('free'),
            'mom': all_text.lower().count('mom'),
            'baby': all_text.lower().count('baby'),
            'wireless': all_text.lower().count('wireless'),
            'portable': all_text.lower().count('portable')
        }
        
        top_terms = sorted([(k, v) for k, v in key_terms.items() if v > 0], key=lambda x: x[1], reverse=True)
        if top_terms:
            print(f"Key Terms: {dict(top_terms[:5])}")

print("\n=== VALUE PROPOSITIONS BY PRODUCT FOCUS ===")

focus_areas = ['Breastfeeding Pump', 'Other: Baby Bottles/Feeding', 'Other: Smart Accessory/App']

for focus in focus_areas:
    focus_data = bf_data[bf_data['Product_Focus'] == focus]
    if len(focus_data) > 0:
        print(f"\n--- {focus} ({len(focus_data)} ads) ---")
        
        # Brand distribution
        brand_dist = focus_data['Brand Root'].value_counts().head(3)
        print(f"Top Brands: {dict(brand_dist)}")
        
        # Sample messages
        text_samples = focus_data[focus_data['Text_x'].notna() & (focus_data['Text_x'] != '')]
        if len(text_samples) > 0:
            print("Sample Messages:")
            for i, text in enumerate(text_samples['Text_x'].head(2), 1):
                clean_text = str(text).replace('\n', ' ').strip()
                print(f"{i}. {clean_text[:120]}...")

print("\n=== EMOTIONAL VS FUNCTIONAL MESSAGING ===")

emotional_data = bf_data[bf_data['Main_Category'] == 'Emotional Connection']
functional_cats = ['Efficiency', 'Convenience Features', 'Comfort & Pain-Free Use']
functional_data = bf_data[bf_data['Main_Category'].isin(functional_cats)]

print(f"Emotional Messaging ({len(emotional_data)} ads):")
if len(emotional_data) > 0:
    emotional_brands = emotional_data['Brand Root'].value_counts().head(3)
    print(f"Leading Brands: {dict(emotional_brands)}")

print(f"\nFunctional Messaging ({len(functional_data)} ads):")
if len(functional_data) > 0:
    functional_brands = functional_data['Brand Root'].value_counts().head(3)
    print(f"Leading Brands: {dict(functional_brands)}")

print("\n=== COMMUNICATION GAPS ANALYSIS ===")

# Analyze underrepresented themes
underrep_categories = [
    'Support for Working Moms',
    'Baby Monitoring & Peace of Mind', 
    'Real Mom Testimonials',
    'Hospital Grade or Doctor Recommended'
]

print("Underrepresented Communication Areas:")
for category in underrep_categories:
    cat_count = len(bf_data[bf_data['Main_Category'] == category])
    if cat_count > 0:
        cat_brands = bf_data[bf_data['Main_Category'] == category]['Brand Root'].value_counts()
        print(f"{category}: {cat_count} ads - Leading: {cat_brands.index[0] if len(cat_brands) > 0 else 'None'}")
    else:
        print(f"{category}: {cat_count} ads - No significant presence")

print("\n=== ANALYSIS COMPLETE ===")