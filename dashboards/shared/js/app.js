import { buildTreemapMosaic } from './mosaic.js';
import { buildBubbleLandscape } from './bubbles.js';
import { buildBubblePack } from './bubbles_pack.js';
import { buildBubblePackDME } from './bubbles_pack_dme.js';
import { buildBubblePackTikTok } from './bubbles_pack_tiktok.js';
import { buildBubblePackInstagram } from './bubbles_pack_instagram.js';
import { deriveInsights } from './insights.js';
import { shortenSubLabel } from './labels.js';

const DATA_PATH_MANUFACTURER = '../../../Data/Pathmathics_Brand_Manufacturer_Classified.csv';
const DATA_PATH_DME = '../../../Data/Pathmatics_DME_classified.csv';
const DATA_PATH_TIKTOK = '../../../Data/SM_TikTok_rows_1_20000.csv';
const DATA_PATH_INSTAGRAM = '../../../Data/SM_IG_rows_all.csv';

const state = {
  raw: [],
  filtered: [],
  rawDME: [],
  filteredDME: [],
  rawTikTok: [],
  filteredTikTok: [],
  rawInstagram: [],
  filteredInstagram: [],
  filters: {
    productFocus: 'Breastfeeding Pump',
    channel: 'all',
    advertiser: 'all',
  },
  filtersDME: {
    productFocus: 'Breastfeeding Pump',
    channel: 'all',
    advertiser: 'all',
  },
  filtersTikTok: {
    productFocus: 'Breastfeeding Pump',
    channel: 'all',
    advertiser: 'all',
  },
  filtersInstagram: {
    productFocus: 'Breastfeeding Pump',
    channel: 'all',
    advertiser: 'all',
  },
};

async function loadData() {
  // Load all four datasets
  const [rawManufacturer, rawDME, rawTikTok, rawInstagram] = await Promise.all([
    d3.csv(`${DATA_PATH_MANUFACTURER}?v=${Date.now()}`, d3.autoType),
    d3.csv(`${DATA_PATH_DME}?v=${Date.now()}`, d3.autoType),
    d3.csv(`${DATA_PATH_TIKTOK}?v=${Date.now()}`, d3.autoType),
    d3.csv(`${DATA_PATH_INSTAGRAM}?v=${Date.now()}`, d3.autoType)
  ]);
  
  const raw = rawManufacturer;
  // Normalize key columns
  raw.forEach((d) => {
    d.Main_Category = (d.Main_Category || 'Uncategorized').trim();
    d.Sub_Category = (d.Sub_Category || 'Unspecified').trim();
    d.Product_Focus = (d.Product_Focus || 'Unspecified').trim();
    d.Channel = (d.Channel || 'Unspecified').trim();
    d.Advertiser = (d.Advertiser || 'Unknown').trim();
    // Numeric fallbacks
    d['Impressions'] = Number(d['Impressions']) || 0;
    d['Spend (USD)'] = Number(d['Spend (USD)']) || 0;
  });
  state.raw = raw;
  
  // Normalize DME data
  rawDME.forEach((d) => {
    d.Main_Category = (d.Main_Category || 'Uncategorized').trim();
    d.Sub_Category = (d.Sub_Category || 'Unspecified').trim();
    d.Product_Focus = (d.Product_Focus || 'Unspecified').trim();
    d.Channel = (d.Channel || 'Unspecified').trim();
    d.Advertiser = (d.Advertiser || 'Unknown').trim();
    // Numeric fallbacks
    d['Impressions'] = Number(d['Impressions']) || 0;
    d['Spend (USD)'] = Number(d['Spend (USD)']) || 0;
  });
  state.rawDME = rawDME;
  
  // Normalize TikTok data
  rawTikTok.forEach((d) => {
    d.Main_Category = (d.Main_Category || 'Uncategorized').trim();
    d.Sub_Category = (d.Sub_Category || 'Unspecified').trim();
    d.Product_Focus = (d.Product_Focus || 'Unspecified').trim();
    d.company = (d.company || 'Unknown').trim();
    // Numeric fallbacks for TikTok metrics
    d['engagement_total'] = Number(d['engagement_total']) || 0;
    d['likes'] = Number(d['likes']) || 0;
    d['views'] = Number(d['views']) || 0;
    d['comments'] = Number(d['comments']) || 0;
    d['shares'] = Number(d['shares']) || 0;
    d['engagement_rate_by_view'] = Number(d['engagement_rate_by_view']) || 0;
  });
  state.rawTikTok = rawTikTok;

  // Normalize Instagram data
  rawInstagram.forEach((d) => {
    d.Main_Category = (d.Main_Category || 'Uncategorized').trim();
    d.Sub_Category = (d.Sub_Category || 'Unspecified').trim();
    d.Product_Focus = (d.Product_Focus || 'Unspecified').trim();
    d.company = (d.company || 'Unknown').trim();
    // Numeric fallbacks for Instagram-specific metrics
    d['engagement_total'] = Number(d['engagement_total']) || 0;
    d['estimated_impressions'] = Number(d['estimated_impressions']) || 0;
    d['likes'] = Number(d['likes']) || 0;
    d['comments'] = Number(d['comments']) || 0;
    d['followers'] = Number(d['followers']) || 0;
  });
  state.rawInstagram = rawInstagram;
}

function applyFilters() {
  // Apply manufacturer filters
  const { productFocus, channel, advertiser } = state.filters;
  let data = state.raw;
  // Apply main category filter if present
  if (state.filters.mainAllow && state.filters.mainAllow.size) {
    data = data.filter(d => state.filters.mainAllow.has(d.Main_Category));
  }
  if (productFocus !== 'all') {
    data = data.filter((d) => (d.Product_Focus || '').toLowerCase().includes(productFocus.toLowerCase()));
  }
  if (channel !== 'all') {
    data = data.filter((d) => d.Channel === channel);
  }
  if (advertiser !== 'all') {
    data = data.filter((d) => (d['Brand Root'] || d.Advertiser) === advertiser);
  }
  state.filtered = data;
  
  // Apply DME filters
  const { productFocus: productFocusDME, channel: channelDME, advertiser: advertiserDME } = state.filtersDME;
  let dataDME = state.rawDME;
  // Apply main category filter for DME if present
  if (state.filtersDME.mainAllow && state.filtersDME.mainAllow.size) {
    dataDME = dataDME.filter(d => state.filtersDME.mainAllow.has(d.Main_Category));
  }
  if (productFocusDME !== 'all') {
    dataDME = dataDME.filter((d) => (d.Product_Focus || '').toLowerCase().includes(productFocusDME.toLowerCase()));
  }
  if (channelDME !== 'all') {
    dataDME = dataDME.filter((d) => d.Channel === channelDME);
  }
  if (advertiserDME !== 'all') {
    dataDME = dataDME.filter((d) => (d['Brand Root'] || d.Advertiser) === advertiserDME);
  }
  state.filteredDME = dataDME;
  
  // Apply TikTok filters
  const { productFocus: productFocusTikTok, channel: channelTikTok, advertiser: advertiserTikTok } = state.filtersTikTok;
  let dataTikTok = state.rawTikTok;
  // Apply main category filter for TikTok if present
  if (state.filtersTikTok.mainAllow && state.filtersTikTok.mainAllow.size) {
    dataTikTok = dataTikTok.filter(d => state.filtersTikTok.mainAllow.has(d.Main_Category));
  }
  if (productFocusTikTok !== 'all') {
    dataTikTok = dataTikTok.filter((d) => (d.Product_Focus || '').toLowerCase().includes(productFocusTikTok.toLowerCase()));
  }
  if (channelTikTok !== 'all') {
    dataTikTok = dataTikTok.filter((d) => (d.posted_domain || 'TikTok') === channelTikTok);
  }
  if (advertiserTikTok !== 'all') {
    dataTikTok = dataTikTok.filter((d) => d.company === advertiserTikTok);
  }
  state.filteredTikTok = dataTikTok;
  
  // Apply Instagram filters
  const { productFocus: productFocusInstagram, channel: channelInstagram, advertiser: advertiserInstagram } = state.filtersInstagram;
  let dataInstagram = state.rawInstagram;
  // Apply main category filter for Instagram if present
  if (state.filtersInstagram.mainAllow && state.filtersInstagram.mainAllow.size) {
    dataInstagram = dataInstagram.filter(d => state.filtersInstagram.mainAllow.has(d.Main_Category));
  }
  if (productFocusInstagram !== 'all') {
    dataInstagram = dataInstagram.filter((d) => (d.Product_Focus || '').toLowerCase().includes(productFocusInstagram.toLowerCase()));
  }
  if (channelInstagram !== 'all') {
    dataInstagram = dataInstagram.filter((d) => (d.posted_domain || 'Instagram') === channelInstagram);
  }
  if (advertiserInstagram !== 'all') {
    dataInstagram = dataInstagram.filter((d) => d.company === advertiserInstagram);
  }
  state.filteredInstagram = dataInstagram;
}

function populateFilters() {
  const channelSelect = document.getElementById('channelFilter');
  const advertiserSelect = document.getElementById('advertiserFilter');
  const focusSelect = document.getElementById('focusFilter');
  const channelSelect2 = document.getElementById('channelFilter2');
  const advertiserSelect2 = document.getElementById('advertiserFilter2');
  const focusSelect2 = document.getElementById('focusFilter2');
  const channelSelect3 = document.getElementById('channelFilter3');
  const advertiserSelect3 = document.getElementById('advertiserFilter3');
  const focusSelect3 = document.getElementById('focusFilter3');
  const mainFilter = document.getElementById('mainFilter');

  // Channels
  const channels = Array.from(new Set(state.raw.map((d) => d.Channel))).filter(Boolean).sort();
  channels.forEach((ch) => {
    const opt = document.createElement('option');
    opt.value = ch; opt.textContent = ch; channelSelect.appendChild(opt);
    const opt2 = opt.cloneNode(true); channelSelect2.appendChild(opt2);
    const opt3 = opt.cloneNode(true); channelSelect3.appendChild(opt3);
  });

  // Advertisers (use Brand Root when available)
  const advertisers = Array.from(new Set(state.raw.map((d) => d['Brand Root'] || d.Advertiser))).sort();
  advertisers.forEach((adv) => {
    const opt = document.createElement('option');
    opt.value = adv; opt.textContent = adv; advertiserSelect.appendChild(opt);
    const opt2 = opt.cloneNode(true); advertiserSelect2.appendChild(opt2);
    const opt3 = opt.cloneNode(true); advertiserSelect3.appendChild(opt3);
  });

  // Product focus options (top)
  const focuses = Array.from(new Set(state.raw.map((d) => d.Product_Focus))).filter(Boolean).sort();
  focuses.forEach((f) => {
    const opt = document.createElement('option');
    opt.value = f; opt.textContent = f; focusSelect.appendChild(opt);
    const opt2 = opt.cloneNode(true); focusSelect2.appendChild(opt2);
    const opt3 = opt.cloneNode(true); focusSelect3.appendChild(opt3);
  });

  // Build Main Category checkbox filter (Bubble Images tab)
  if (mainFilter) {
    const mains = Array.from(new Set(state.raw.map(d=>d.Main_Category))).sort();
    state.filters.mainAllow = new Set(mains);
    mains.forEach((m)=>{
      const id = `m_${m.replace(/[^a-z0-9]+/gi,'_')}`;
      const label = document.createElement('label');
      label.style.display = 'flex'; label.style.alignItems = 'center'; label.style.gap = '6px'; label.style.cursor = 'pointer';
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = id; cb.checked = true;
      cb.addEventListener('change', ()=>{
        if (cb.checked) state.filters.mainAllow.add(m); else state.filters.mainAllow.delete(m);
        refresh();
      });
      const span = document.createElement('span'); span.textContent = m;
      label.appendChild(cb); label.appendChild(span);
      mainFilter.appendChild(label);
    });
  }

  // Handlers
  focusSelect.addEventListener('change', () => {
    state.filters.productFocus = focusSelect.value;
    refresh();
  });
  channelSelect.addEventListener('change', () => {
    state.filters.channel = channelSelect.value;
    refresh();
  });
  advertiserSelect.addEventListener('change', () => {
    state.filters.advertiser = advertiserSelect.value;
    refresh();
  });
  // Mirror controls on the bubble tab
  focusSelect2.addEventListener('change', () => { state.filters.productFocus = focusSelect2.value; refresh(); });
  channelSelect2.addEventListener('change', () => { state.filters.channel = channelSelect2.value; refresh(); });
  advertiserSelect2.addEventListener('change', () => { state.filters.advertiser = advertiserSelect2.value; refresh(); });
  // Mirror for cloned tab
  focusSelect3.addEventListener('change', () => { state.filters.productFocus = focusSelect3.value; refresh(); });
  channelSelect3.addEventListener('change', () => { state.filters.channel = channelSelect3.value; refresh(); });
  advertiserSelect3.addEventListener('change', () => { state.filters.advertiser = advertiserSelect3.value; refresh(); });

  // DME Filters (Tab 4)
  const channelSelect4 = document.getElementById('channelFilter4');
  const advertiserSelect4 = document.getElementById('advertiserFilter4');
  const focusSelect4 = document.getElementById('focusFilter4');
  const mainFilterDME = document.getElementById('mainFilterDME');

  if (channelSelect4 && advertiserSelect4 && focusSelect4) {
    // Populate DME channels
    const channelsDME = Array.from(new Set(state.rawDME.map((d) => d.Channel))).filter(Boolean).sort();
    channelsDME.forEach((ch) => {
      const opt = document.createElement('option');
      opt.value = ch; opt.textContent = ch; channelSelect4.appendChild(opt);
    });

    // Populate DME advertisers (use Brand Root when available)
    const advertisersDME = Array.from(new Set(state.rawDME.map((d) => d['Brand Root'] || d.Advertiser))).sort();
    advertisersDME.forEach((adv) => {
      const opt = document.createElement('option');
      opt.value = adv; opt.textContent = adv; advertiserSelect4.appendChild(opt);
    });

    // Populate DME product focus options
    const focusesDME = Array.from(new Set(state.rawDME.map((d) => d.Product_Focus))).filter(Boolean).sort();
    focusesDME.forEach((f) => {
      const opt = document.createElement('option');
      opt.value = f; opt.textContent = f; focusSelect4.appendChild(opt);
    });

    // DME event handlers
    focusSelect4.addEventListener('change', () => { state.filtersDME.productFocus = focusSelect4.value; refresh(); });
    channelSelect4.addEventListener('change', () => { state.filtersDME.channel = channelSelect4.value; refresh(); });
    advertiserSelect4.addEventListener('change', () => { state.filtersDME.advertiser = advertiserSelect4.value; refresh(); });
  }

  // Build Main Category checkbox filter for DME tab
  if (mainFilterDME) {
    const mainsDME = Array.from(new Set(state.rawDME.map(d=>d.Main_Category))).sort();
    state.filtersDME.mainAllow = new Set(mainsDME);
    mainsDME.forEach((m)=>{
      const id = `m_dme_${m.replace(/[^a-z0-9]+/gi,'_')}`;
      const label = document.createElement('label');
      label.style.display = 'flex'; label.style.alignItems = 'center'; label.style.gap = '6px'; label.style.cursor = 'pointer';
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = id; cb.checked = true;
      cb.addEventListener('change', ()=>{
        if (cb.checked) state.filtersDME.mainAllow.add(m); else state.filtersDME.mainAllow.delete(m);
        refresh();
      });
      const span = document.createElement('span'); span.textContent = m;
      label.appendChild(cb); label.appendChild(span);
      mainFilterDME.appendChild(label);
    });
  }

  // TikTok Filters (Tab 5)
  const channelSelect5 = document.getElementById('channelFilter5');
  const advertiserSelect5 = document.getElementById('advertiserFilter5');
  const focusSelect5 = document.getElementById('focusFilter5');
  const mainFilterTikTok = document.getElementById('mainFilterTikTok');

  if (channelSelect5 && advertiserSelect5 && focusSelect5) {
    // For TikTok, we'll use posted_domain as "channel" but mostly it's TikTok
    const channelsTikTok = Array.from(new Set(state.rawTikTok.map((d) => d.posted_domain || 'TikTok'))).filter(Boolean).sort();
    channelsTikTok.forEach((ch) => {
      const opt = document.createElement('option');
      opt.value = ch; opt.textContent = ch; channelSelect5.appendChild(opt);
    });

    // TikTok companies
    const companiesTikTok = Array.from(new Set(state.rawTikTok.map((d) => d.company))).filter(Boolean).sort();
    companiesTikTok.forEach((comp) => {
      const opt = document.createElement('option');
      opt.value = comp; opt.textContent = comp; advertiserSelect5.appendChild(opt);
    });

    // TikTok product focus options
    const focusesTikTok = Array.from(new Set(state.rawTikTok.map((d) => d.Product_Focus))).filter(Boolean).sort();
    focusesTikTok.forEach((f) => {
      const opt = document.createElement('option');
      opt.value = f; opt.textContent = f; focusSelect5.appendChild(opt);
    });

    // TikTok event handlers
    focusSelect5.addEventListener('change', () => { state.filtersTikTok.productFocus = focusSelect5.value; refresh(); });
    channelSelect5.addEventListener('change', () => { state.filtersTikTok.channel = channelSelect5.value; refresh(); });
    advertiserSelect5.addEventListener('change', () => { state.filtersTikTok.advertiser = advertiserSelect5.value; refresh(); });
  }

  // Instagram Filters (Tab 6)
  const channelSelect6 = document.getElementById('channelFilter6');
  const advertiserSelect6 = document.getElementById('advertiserFilter6');
  const focusSelect6 = document.getElementById('focusFilter6');
  const mainFilterInstagram = document.getElementById('mainFilterInstagram');

  if (channelSelect6 && advertiserSelect6 && focusSelect6) {
    // For Instagram, we'll use posted_domain as "channel" but mostly it's Instagram
    const channelsInstagram = Array.from(new Set(state.rawInstagram.map((d) => d.posted_domain || 'Instagram'))).filter(Boolean).sort();
    channelsInstagram.forEach((ch) => {
      const opt = document.createElement('option');
      opt.value = ch; opt.textContent = ch; channelSelect6.appendChild(opt);
    });

    // Instagram companies
    const companiesInstagram = Array.from(new Set(state.rawInstagram.map((d) => d.company))).filter(Boolean).sort();
    companiesInstagram.forEach((comp) => {
      const opt = document.createElement('option');
      opt.value = comp; opt.textContent = comp; advertiserSelect6.appendChild(opt);
    });

    // Instagram product focus options
    const focusesInstagram = Array.from(new Set(state.rawInstagram.map((d) => d.Product_Focus))).filter(Boolean).sort();
    focusesInstagram.forEach((f) => {
      const opt = document.createElement('option');
      opt.value = f; opt.textContent = f; focusSelect6.appendChild(opt);
    });

    // Instagram event handlers
    focusSelect6.addEventListener('change', () => { state.filtersInstagram.productFocus = focusSelect6.value; refresh(); });
    channelSelect6.addEventListener('change', () => { state.filtersInstagram.channel = channelSelect6.value; refresh(); });
    advertiserSelect6.addEventListener('change', () => { state.filtersInstagram.advertiser = advertiserSelect6.value; refresh(); });
  }

  // Build Main Category checkbox filter for TikTok tab
  if (mainFilterTikTok) {
    const mainsTikTok = Array.from(new Set(state.rawTikTok.map(d=>d.Main_Category))).filter(Boolean).sort();
    state.filtersTikTok.mainAllow = new Set(mainsTikTok);
    mainsTikTok.forEach((m)=>{
      const id = `m_tiktok_${m.replace(/[^a-z0-9]+/gi,'_')}`;
      const label = document.createElement('label');
      label.style.display = 'flex'; label.style.alignItems = 'center'; label.style.gap = '6px'; label.style.cursor = 'pointer';
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = id; cb.checked = true;
      cb.addEventListener('change', ()=>{
        if (cb.checked) state.filtersTikTok.mainAllow.add(m); else state.filtersTikTok.mainAllow.delete(m);
        refresh();
      });
      const span = document.createElement('span'); span.textContent = m;
      label.appendChild(cb); label.appendChild(span);
      mainFilterTikTok.appendChild(label);
    });
  }

  // Build Main Category checkbox filter for Instagram tab
  if (mainFilterInstagram) {
    const mainsInstagram = Array.from(new Set(state.rawInstagram.map(d=>d.Main_Category))).filter(Boolean).sort();
    state.filtersInstagram.mainAllow = new Set(mainsInstagram);
    mainsInstagram.forEach((m)=>{
      const id = `m_instagram_${m.replace(/[^a-z0-9]+/gi,'_')}`;
      const label = document.createElement('label');
      label.style.display = 'flex'; label.style.alignItems = 'center'; label.style.gap = '6px'; label.style.cursor = 'pointer';
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = id; cb.checked = true;
      cb.addEventListener('change', ()=>{
        if (cb.checked) state.filtersInstagram.mainAllow.add(m); else state.filtersInstagram.mainAllow.delete(m);
        refresh();
      });
      const span = document.createElement('span'); span.textContent = m;
      label.appendChild(cb); label.appendChild(span);
      mainFilterInstagram.appendChild(label);
    });
  }
}

function buildHierarchy(rows) {
  // Group by Main_Category → Sub_Category → Advertiser; aggregate impressions and spend
  const mainMap = new Map();
  for (const row of rows) {
    const main = row.Main_Category || 'Uncategorized';
    const sub = row.Sub_Category || 'Unspecified';
    const adv = row.Advertiser || 'Unknown';
    const impressions = row['Impressions'] || 0;
    const spend = row['Spend (USD)'] || 0;
    if (!mainMap.has(main)) mainMap.set(main, new Map());
    const subMap = mainMap.get(main);
    if (!subMap.has(sub)) subMap.set(sub, new Map());
    const advMap = subMap.get(sub);
    if (!advMap.has(adv)) advMap.set(adv, { impressions: 0, spend: 0 });
    const bucket = advMap.get(adv);
    bucket.impressions += impressions;
    bucket.spend += spend;
  }

  const children = [];
  for (const [main, subMap] of mainMap) {
    const subChildren = [];
    let mainImpr = 0; let mainSpend = 0;
    for (const [sub, advMap] of subMap) {
      const advChildren = [];
      let subImpr = 0; let subSpend = 0;
      for (const [adv, agg] of advMap) {
        advChildren.push({ name: adv, value: Math.max(agg.impressions, 0), spend: agg.spend });
        subImpr += agg.impressions; subSpend += agg.spend;
      }
      subChildren.push({ name: shortenSubLabel(main, sub), rawName: sub, value: Math.max(subImpr, 0), spend: subSpend, children: advChildren });
      mainImpr += subImpr; mainSpend += subSpend;
    }
    children.push({ name: main, value: Math.max(mainImpr, 0), spend: mainSpend, children: subChildren });
  }
  return { name: 'root', children };
}

function refresh() {
  applyFilters();
  
  // Expose main filters to bubble packs
  if (state.filters.mainAllow) window.__MAIN_ALLOW__ = state.filters.mainAllow; else delete window.__MAIN_ALLOW__;
  if (state.filtersDME.mainAllow) window.__MAIN_ALLOW_DME__ = state.filtersDME.mainAllow; else delete window.__MAIN_ALLOW_DME__;
  if (state.filtersTikTok.mainAllow) window.__MAIN_ALLOW_TIKTOK__ = state.filtersTikTok.mainAllow; else delete window.__MAIN_ALLOW_TIKTOK__;
  if (state.filtersInstagram.mainAllow) window.__MAIN_ALLOW_INSTAGRAM__ = state.filtersInstagram.mainAllow; else delete window.__MAIN_ALLOW_INSTAGRAM__;
  
  const hierarchy = buildHierarchy(state.filtered);
  
  // Render treemap only when Content Analysis is visible
  const contentPanel = document.querySelector('#content-analysis');
  if (contentPanel && contentPanel.classList.contains('active')) {
    buildTreemapMosaic({ container: '#mosaic', hierarchy });
  }

  // Render bubbles only when their panels are visible to avoid zero-size containers
  const renderIfVisible = (selector) => {
    const el = document.querySelector(selector);
    if (!el) return;
    const panel = el.closest('.tab-panel');
    const isVisible = panel && panel.classList.contains('active');
    if (isVisible) {
      // Defer to next frame to ensure layout has applied
      requestAnimationFrame(() => buildBubbleLandscape({ container: selector, rows: state.filtered }));
    }
  };
  renderIfVisible('#bubble');
  
  // Use deterministic circle packing in Manufacturer Brands tab
  const elImages = document.querySelector('#bubbleImages');
  if (elImages && elImages.closest('.tab-panel')?.classList.contains('active')) {
    requestAnimationFrame(() => buildBubblePack({ container: '#bubbleImages', rows: state.filtered }));
  }
  
  // Use deterministic circle packing in DME Brands tab
  const elImagesDME = document.querySelector('#bubbleImagesDME');
  if (elImagesDME && elImagesDME.closest('.tab-panel')?.classList.contains('active')) {
    requestAnimationFrame(() => buildBubblePackDME({ container: '#bubbleImagesDME', rows: state.filteredDME }));
  }
  
  // Use deterministic circle packing in TikTok SM tab
  const elImagesTikTok = document.querySelector('#bubbleImagesTikTok');
  if (elImagesTikTok && elImagesTikTok.closest('.tab-panel')?.classList.contains('active')) {
    requestAnimationFrame(() => buildBubblePackTikTok({ container: '#bubbleImagesTikTok', rows: state.filteredTikTok }));
  }
  
  // Use deterministic circle packing in Instagram SM tab
  const elImagesInstagram = document.querySelector('#bubbleImagesInstagram');
  if (elImagesInstagram && elImagesInstagram.closest('.tab-panel')?.classList.contains('active')) {
    requestAnimationFrame(() => buildBubblePackInstagram({ container: '#bubbleImagesInstagram', rows: state.filteredInstagram }));
  }

  // Media Mix removed
  const insights = deriveInsights(state.filtered);
  document.getElementById('insights').innerHTML = insights;
}

async function init() {
  await loadData();
  populateFilters();
  // Default main category filter preselection (updated names)
  const desired = new Set([
    'SUPPORT FOR WORKING MOMS',
    'EMOTIONAL CONNECTION',
    'AUTHENTIC COMMUNITY & PEER VALIDATION',
    'MEDICAL ENDORSEMENT & CLINICAL TRUST',
    'PERFORMANCE & CONVENIENCE'
  ]);
  if (state.filters.mainAllow) {
    const mains = Array.from(state.filters.mainAllow);
    state.filters.mainAllow.clear();
    mains.forEach(m=>{ if (desired.has((m||'').trim())) state.filters.mainAllow.add(m); });
    // update UI checkboxes
    const mainFilter = document.getElementById('mainFilter');
    if (mainFilter) {
      Array.from(mainFilter.querySelectorAll('input[type="checkbox"]')).forEach(cb=>{
        const label = cb.nextSibling && cb.nextSibling.textContent ? cb.nextSibling.textContent : '';
        cb.checked = desired.has(label.trim());
      });
    }
  }
  
  // Apply same default categories for DME
  if (state.filtersDME.mainAllow) {
    const mainsDME = Array.from(state.filtersDME.mainAllow);
    state.filtersDME.mainAllow.clear();
    mainsDME.forEach(m=>{ if (desired.has((m||'').trim())) state.filtersDME.mainAllow.add(m); });
    // update UI checkboxes for DME
    const mainFilterDME = document.getElementById('mainFilterDME');
    if (mainFilterDME) {
      Array.from(mainFilterDME.querySelectorAll('input[type="checkbox"]')).forEach(cb=>{
        const label = cb.nextSibling && cb.nextSibling.textContent ? cb.nextSibling.textContent : '';
        cb.checked = desired.has(label.trim());
      });
    }
  }
  
  // Apply same default categories for TikTok
  if (state.filtersTikTok.mainAllow) {
    const mainsTikTok = Array.from(state.filtersTikTok.mainAllow);
    state.filtersTikTok.mainAllow.clear();
    mainsTikTok.forEach(m=>{ if (desired.has((m||'').trim())) state.filtersTikTok.mainAllow.add(m); });
    // update UI checkboxes for TikTok
    const mainFilterTikTok = document.getElementById('mainFilterTikTok');
    if (mainFilterTikTok) {
      Array.from(mainFilterTikTok.querySelectorAll('input[type="checkbox"]')).forEach(cb=>{
        const label = cb.nextSibling && cb.nextSibling.textContent ? cb.nextSibling.textContent : '';
        cb.checked = desired.has(label.trim());
      });
    }
  }
  
  // Apply same default categories for Instagram
  if (state.filtersInstagram.mainAllow) {
    const mainsInstagram = Array.from(state.filtersInstagram.mainAllow);
    state.filtersInstagram.mainAllow.clear();
    mainsInstagram.forEach(m=>{ if (desired.has((m||'').trim())) state.filtersInstagram.mainAllow.add(m); });
    // update UI checkboxes for Instagram
    const mainFilterInstagram = document.getElementById('mainFilterInstagram');
    if (mainFilterInstagram) {
      Array.from(mainFilterInstagram.querySelectorAll('input[type="checkbox"]')).forEach(cb=>{
        const label = cb.nextSibling && cb.nextSibling.textContent ? cb.nextSibling.textContent : '';
        cb.checked = desired.has(label.trim());
      });
    }
  }
  
  refresh();
  // Tabs
  document.querySelectorAll('.tab').forEach((el) => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      el.classList.add('active');
      const tabId = el.dataset.tab;
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      document.getElementById(tabId).classList.add('active');
      setTimeout(() => refresh(), 0);
    });
  });

  // Ensure Bubble Images is the default active tab/panel
  document.querySelectorAll('.tab').forEach((t)=>t.classList.remove('active'));
  const biTab = document.querySelector('.tab[data-tab="bubble-images"]');
  if (biTab) biTab.classList.add('active');
  document.querySelectorAll('.tab-panel').forEach((p)=>p.classList.remove('active'));
  const biPanel = document.getElementById('bubble-images');
  if (biPanel) biPanel.classList.add('active');
  setTimeout(()=>refresh(),0);
}

init();
