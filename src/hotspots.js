// Curated Financial-Geographic Index: places where physical disruption moves specific stocks.
// side: "long" = tends to benefit if this hotspot is disrupted, "short" = tends to be hurt.
// Theses are illustrative starting points for research, not recommendations.

export const CATEGORIES = {
  choke: { label: 'Supply chain choke point', short: 'Choke point', color: '#ff5d5d' },
  infra: { label: 'Critical infrastructure', short: 'Infrastructure', color: '#3fd0ff' },
  commodity: { label: 'Commodity production', short: 'Commodity', color: '#f5b83d' },
  live: { label: 'Live crisis', short: 'Live crisis', color: '#ff8a3d' },
};

export const HOTSPOTS = [
  {
    id: 'hormuz', name: 'Strait of Hormuz', cat: 'choke', lat: 26.57, lon: 56.25, risk: 5,
    metric: '~20% of global oil and LNG transits daily',
    summary: 'The narrowest oil artery on earth. Any harassment of tankers or closure threat spikes crude and tanker day-rates within hours, and jet fuel follows.',
    ideas: [
      { t: 'XOM', side: 'long', why: 'Upstream barrels outside the Gulf reprice higher with Brent.' },
      { t: 'FRO', side: 'long', why: 'VLCC rates jump when insurers price war risk and routes lengthen.' },
      { t: 'LMT', side: 'long', why: 'Gulf states accelerate missile-defense orders after incidents.' },
      { t: 'DAL', side: 'short', why: 'Jet fuel is roughly a quarter of airline operating cost.' },
    ],
  },
  {
    id: 'bab', name: 'Bab-el-Mandeb & Red Sea', cat: 'choke', lat: 12.6, lon: 43.3, risk: 5,
    metric: '~12% of seaborne trade; 15+ subsea cables',
    summary: 'Houthi attacks pushed container lines around the Cape of Good Hope, adding 10-14 days to Asia-Europe voyages and soaking up fleet capacity.',
    ideas: [
      { t: 'ZIM', side: 'long', why: 'Spot-heavy carrier; rerouting tightens capacity and lifts spot rates.' },
      { t: 'MATX', side: 'long', why: 'Premium expedited transpacific service gains share when ocean schedules slip.' },
      { t: 'RTX', side: 'long', why: 'Standard Missile interceptor usage drives replenishment orders.' },
      { t: 'TGT', side: 'short', why: 'Import-heavy retailer; longer transit raises freight and inventory costs.' },
    ],
  },
  {
    id: 'suez', name: 'Suez Canal', cat: 'choke', lat: 30.6, lon: 32.33, risk: 4,
    metric: '~50 ships/day in normal conditions',
    summary: 'The 2021 Ever Given grounding held up ~$9.6B of trade per day. Blockages ripple into box rates and European inventory for months.',
    ideas: [
      { t: 'DAC', side: 'long', why: 'Containership lessor; tight capacity lifts charter renewals.' },
      { t: 'ZIM', side: 'long', why: 'Spot container rates spike on any canal disruption.' },
      { t: 'NKE', side: 'short', why: 'Asia-sourced footwear and apparel inventory arrives late into Europe.' },
    ],
  },
  {
    id: 'panama', name: 'Panama Canal', cat: 'choke', lat: 9.08, lon: -79.68, risk: 3,
    metric: 'Gatun Lake level caps daily transits',
    summary: 'The canal runs on rainwater. Drought years cut transits by a third, pushing Asia-bound grain and LNG onto longer routes and US cargo onto rail.',
    ideas: [
      { t: 'UNP', side: 'long', why: 'West-coast intermodal rail is the land bridge when the canal throttles.' },
      { t: 'KEX', side: 'long', why: 'Inland barge operator; tight waterborne capacity supports day-rates.' },
      { t: 'BG', side: 'short', why: 'Gulf grain exports to Asia face higher freight and slot auctions.' },
    ],
  },
  {
    id: 'malacca', name: 'Strait of Malacca', cat: 'choke', lat: 2.5, lon: 101.2, risk: 3,
    metric: '~25% of world trade, ~23M bpd oil',
    summary: 'The main lane between the Indian Ocean and East Asia. A closure forces tankers through Lombok or Sunda, lengthening voyages for China, Japan and Korea.',
    ideas: [
      { t: 'FRO', side: 'long', why: 'Longer tanker voyages absorb fleet supply and raise rates.' },
      { t: 'INSW', side: 'long', why: 'Product and crude tanker owner levered to tonne-miles.' },
      { t: 'STNG', side: 'long', why: 'Product tankers benefit when Asian refinery flows reroute.' },
    ],
  },
  {
    id: 'taiwan', name: 'Taiwan Strait & Hsinchu', cat: 'infra', lat: 24.4, lon: 120.6, risk: 5,
    metric: '~90% of leading-edge chip output',
    summary: 'TSMC fabs in Hsinchu, Taichung and Tainan make nearly all advanced logic. A quake, blockade or drill disrupts the entire AI and phone supply chain.',
    ideas: [
      { t: 'INTC', side: 'long', why: 'US-based foundry capacity gains strategic value.' },
      { t: 'GFS', side: 'long', why: 'Mature-node fabs in the US and Europe are the fallback.' },
      { t: 'TSM', side: 'short', why: 'Direct exposure to fab downtime and geopolitical discount.' },
      { t: 'NVDA', side: 'short', why: 'Sole-sourced on TSMC for leading GPUs and CoWoS packaging.' },
      { t: 'AAPL', side: 'short', why: 'A-series and M-series chips are all made in Taiwan.' },
    ],
  },
  {
    id: 'shanghai', name: 'Port of Shanghai-Ningbo', cat: 'choke', lat: 30.6, lon: 122.1, risk: 3,
    metric: '#1 and #3 busiest container ports',
    summary: 'Typhoons, lockdowns or export controls here immediately back up transpacific supply. Watch vessel queues at Yangshan anchorage.',
    ideas: [
      { t: 'MATX', side: 'long', why: 'Expedited China-US service commands premiums during congestion.' },
      { t: 'ZIM', side: 'long', why: 'Transpacific spot rates rise with Chinese port queues.' },
      { t: 'HAS', side: 'short', why: 'Toy supply is heavily China-sourced ahead of holiday season.' },
    ],
  },
  {
    id: 'rotterdam', name: 'Rotterdam & the Rhine', cat: 'choke', lat: 51.95, lon: 4.1, risk: 2,
    metric: "Europe's largest port; Rhine barge gateway",
    summary: "Low Rhine water at Kaub strands barges feeding Germany's chemical heartland. BASF and steel mills cut runs and Europe imports more chemicals.",
    ideas: [
      { t: 'DOW', side: 'long', why: 'US Gulf chemical capacity fills European shortfalls.' },
      { t: 'LYB', side: 'long', why: 'Olefins exporter benefits from higher EU prices.' },
      { t: 'EWG', side: 'short', why: 'German industrials are exposed to Rhine logistics.' },
    ],
  },
  {
    id: 'lalb', name: 'Ports of LA & Long Beach', cat: 'choke', lat: 33.74, lon: -118.26, risk: 2,
    metric: '~40% of US containerized imports',
    summary: "America's front door for Asian goods. Labor disputes, quakes or cyberattacks back up retail inventory nationwide.",
    ideas: [
      { t: 'UNP', side: 'long', why: 'Diverted cargo moves inland by rail from alternate ports.' },
      { t: 'CSX', side: 'long', why: 'East and Gulf coast port volumes rise when West Coast jams.' },
      { t: 'NKE', side: 'short', why: 'Heavily reliant on West Coast import flows.' },
    ],
  },
  {
    id: 'bosporus', name: 'Turkish Straits & Black Sea', cat: 'commodity', lat: 41.1, lon: 29.05, risk: 4,
    metric: '~25% of global wheat exports',
    summary: 'Ukrainian and Russian grain, plus Kazakh crude, all exit through the Bosporus. Shipping attacks or insurance pullbacks spike wheat and fertilizer.',
    ideas: [
      { t: 'ADM', side: 'long', why: 'Global origination network profits from dislocated grain flows.' },
      { t: 'MOS', side: 'long', why: 'Potash and phosphate tighten when Black Sea fertilizer stalls.' },
      { t: 'WEAT', side: 'long', why: 'Direct wheat futures exposure.' },
      { t: 'GIS', side: 'short', why: 'Flour is a key input cost for packaged foods.' },
    ],
  },
  {
    id: 'permian', name: 'Permian Basin', cat: 'commodity', lat: 31.8, lon: -102.4, risk: 3,
    metric: '~6.5M bpd, nearly half of US crude',
    summary: 'The engine of US shale. Winter freezes, induced quakes from wastewater disposal, and pipeline outages all hit output directly.',
    ideas: [
      { t: 'FANG', side: 'long', why: 'Pure-play Permian producer; leveraged to WTI.' },
      { t: 'OXY', side: 'long', why: 'Largest Permian acreage holder with carbon-capture upside.' },
      { t: 'KMI', side: 'long', why: 'Gas takeaway pipelines run full when basin output grows.' },
    ],
  },
  {
    id: 'gulfcoast', name: 'Gulf Coast Refining & LNG', cat: 'infra', lat: 29.7, lon: -93.9, risk: 4,
    metric: '~50% of US refining; ~60% of US LNG export',
    summary: 'Houston to Lake Charles is a hurricane alley lined with refineries and LNG trains. Storms here move gasoline cracks and global gas prices.',
    ideas: [
      { t: 'LNG', side: 'long', why: 'Cheniere: Sabine Pass is the anchor of US LNG exports.' },
      { t: 'VLO', side: 'long', why: 'Refiners outside the storm track earn wider cracks.' },
      { t: 'MPC', side: 'long', why: 'Largest US refiner; benefits from regional tightness.' },
    ],
  },
  {
    id: 'nova', name: 'Northern Virginia Data Center Alley', cat: 'infra', lat: 39.0, lon: -77.48, risk: 3,
    metric: '~70% of global internet traffic routes here',
    summary: 'Loudoun County is the densest data-center cluster on earth, and grid capacity is the binding constraint for AI build-outs.',
    ideas: [
      { t: 'EQIX', side: 'long', why: 'Interconnection hub with pricing power on scarce capacity.' },
      { t: 'VRT', side: 'long', why: 'Power and liquid cooling gear for AI racks.' },
      { t: 'CEG', side: 'long', why: 'Nuclear baseload power sold to hyperscalers.' },
      { t: 'D', side: 'long', why: 'Dominion Energy is the utility serving Data Center Alley.' },
    ],
  },
  {
    id: 'veldhoven', name: 'ASML Veldhoven', cat: 'infra', lat: 51.41, lon: 5.4, risk: 2,
    metric: 'Only maker of EUV lithography tools',
    summary: 'Every leading-edge fab depends on EUV machines built here. Export rules and supply hiccups ripple straight into fab roadmaps.',
    ideas: [
      { t: 'ASML', side: 'long', why: 'Monopoly position; pricing power on every new fab.' },
      { t: 'KLAC', side: 'long', why: 'Process control demand rises with every EUV layer.' },
    ],
  },
  {
    id: 'atacama', name: 'Lithium Triangle (Atacama)', cat: 'commodity', lat: -23.5, lon: -68.2, risk: 3,
    metric: '~50% of world lithium reserves',
    summary: 'Brine operations in Chile, Argentina and Bolivia. Water rights, nationalization moves and quakes shape lithium prices.',
    ideas: [
      { t: 'ALB', side: 'long', why: 'Diversified lithium producer re-rates on supply shocks.' },
      { t: 'SQM', side: 'long', why: 'Atacama brine leader; direct price leverage.' },
      { t: 'TSLA', side: 'short', why: 'Battery cell costs rise with lithium carbonate.' },
    ],
  },
  {
    id: 'escondida', name: 'Chilean Copper Belt', cat: 'commodity', lat: -24.27, lon: -69.07, risk: 3,
    metric: 'Escondida: ~5% of world copper',
    summary: "The world's largest copper mines sit on one of the most active subduction zones. Strikes and quakes tighten a market already short of supply.",
    ideas: [
      { t: 'FCX', side: 'long', why: 'Largest US-listed copper miner, mostly outside Chile.' },
      { t: 'SCCO', side: 'long', why: 'Peru and Mexico copper with the deepest reserves.' },
      { t: 'COPX', side: 'long', why: 'Basket of copper miners.' },
    ],
  },
  {
    id: 'bayanobo', name: 'Bayan Obo Rare Earths', cat: 'commodity', lat: 41.78, lon: 109.97, risk: 4,
    metric: '~45% of global rare-earth mining',
    summary: 'China controls mining and ~90% of processing. Export licensing is a geopolitical lever over magnets for EVs, wind and missiles.',
    ideas: [
      { t: 'MP', side: 'long', why: 'Only scaled US rare-earth mine and magnet maker.' },
      { t: 'REMX', side: 'long', why: 'Rare earth and strategic metals basket.' },
    ],
  },
  {
    id: 'kazakh', name: 'Kazakh Uranium Belt', cat: 'commodity', lat: 44.5, lon: 67.5, risk: 3,
    metric: '~40% of global uranium mining',
    summary: "Kazatomprom's in-situ mines feed reactors worldwide, but exports route through Russia. Sulfuric acid shortages have already cut guidance.",
    ideas: [
      { t: 'CCJ', side: 'long', why: 'Tier-one Western supply in Canada.' },
      { t: 'UEC', side: 'long', why: 'Unhedged US producer with spot leverage.' },
      { t: 'URA', side: 'long', why: 'Uranium miners and fuel-cycle basket.' },
    ],
  },
  {
    id: 'ercot', name: 'Texas Grid (ERCOT)', cat: 'infra', lat: 30.6, lon: -97.4, risk: 3,
    metric: 'Islanded grid, ~85 GW peak',
    summary: 'Texas runs its own grid with little import capacity. Heat domes and winter storms send power prices to the $5,000/MWh cap.',
    ideas: [
      { t: 'VST', side: 'long', why: 'Largest Texas generator; scarcity pricing is pure upside.' },
      { t: 'NRG', side: 'long', why: 'Integrated generator and retailer in ERCOT.' },
      { t: 'GNRC', side: 'long', why: 'Home standby generator sales jump after outages.' },
    ],
  },
  {
    id: 'calfire', name: 'California Wildfire Zone', cat: 'infra', lat: 38.6, lon: -121.5, risk: 3,
    metric: 'Utility liability under inverse condemnation',
    summary: 'California utilities can be liable for fires their equipment ignites, even without negligence. Big fire seasons hit utility equity hard.',
    ideas: [
      { t: 'GNRC', side: 'long', why: 'Public safety power shutoffs drive backup power demand.' },
      { t: 'PCG', side: 'short', why: 'Largest fire-liability exposure in the US.' },
      { t: 'EIX', side: 'short', why: 'Southern California Edison faces ignition liability.' },
    ],
  },
  {
    id: 'luzon', name: 'Luzon Strait Subsea Cables', cat: 'infra', lat: 20.6, lon: 121.0, risk: 3,
    metric: '20+ cables linking China, Taiwan, Japan, SE Asia',
    summary: 'The 2006 Hengchun earthquake cut nine cables here at once. Cable cuts push traffic to satellite and drive demand for repair ships.',
    ideas: [
      { t: 'IRDM', side: 'long', why: 'Satellite connectivity is the backup when cables fail.' },
      { t: 'VSAT', side: 'long', why: 'Maritime and enterprise satellite broadband.' },
      { t: 'CIEN', side: 'long', why: 'Optical networking gear for rerouting and cable rebuilds.' },
    ],
  },
  {
    id: 'cornbelt', name: 'US Corn Belt', cat: 'commodity', lat: 41.9, lon: -93.6, risk: 2,
    metric: '~30% of world corn production',
    summary: 'Iowa, Illinois and Nebraska set global feed prices. Flash drought in July pollination can move corn 20% in weeks.',
    ideas: [
      { t: 'CORN', side: 'long', why: 'Direct corn futures exposure.' },
      { t: 'CTVA', side: 'long', why: 'Seed and crop protection demand stays firm.' },
      { t: 'TSN', side: 'short', why: 'Feed is the largest input cost for chicken and beef.' },
    ],
  },
];

// Thematic ideas attached to a live event by type, used when it isn't near a curated hotspot.
export const EVENT_THEMES = {
  EQ: { label: 'Earthquake', ideas: [
    { t: 'VMC', side: 'long', why: 'Aggregates and cement demand for reconstruction.' },
    { t: 'CAT', side: 'long', why: 'Heavy equipment for clearance and rebuilding.' },
    { t: 'RNR', side: 'short', why: 'Property catastrophe reinsurer bears large quake losses.' },
  ] },
  TC: { label: 'Tropical cyclone', ideas: [
    { t: 'GNRC', side: 'long', why: 'Generator demand spikes before and after landfall.' },
    { t: 'HD', side: 'long', why: 'Storm prep and rebuild spending.' },
    { t: 'ALL', side: 'short', why: 'Homeowners insurer catastrophe losses.' },
  ] },
  FL: { label: 'Flood', ideas: [
    { t: 'XYL', side: 'long', why: 'Pumps and dewatering equipment.' },
    { t: 'HD', side: 'long', why: 'Restoration and rebuilding materials.' },
  ] },
  VO: { label: 'Volcano', ideas: [
    { t: 'RYAAY', side: 'short', why: 'Ash clouds ground short-haul flights.' },
    { t: 'DAL', side: 'short', why: 'Airspace closures disrupt routes.' },
  ] },
  WF: { label: 'Wildfire', ideas: [
    { t: 'GNRC', side: 'long', why: 'Power shutoffs push backup generation.' },
    { t: 'PCG', side: 'short', why: 'Utility ignition liability.' },
  ] },
  DR: { label: 'Drought', ideas: [
    { t: 'CORN', side: 'long', why: 'Crop yields fall, grain prices rise.' },
    { t: 'TSN', side: 'short', why: 'Feed costs climb.' },
  ] },
  ST: { label: 'Severe storm', ideas: [
    { t: 'GNRC', side: 'long', why: 'Outage-driven generator demand.' },
    { t: 'ALL', side: 'short', why: 'Insured property losses.' },
  ] },
};

// Region overrides: a live event inside one of these boxes gets region-specific ideas first.
export const REGIONS = [
  { name: 'Japan', box: [30, 129, 46, 146], ideas: [
    { t: 'TM', side: 'short', why: 'Just-in-time supplier plants halt after major quakes.' },
    { t: 'SONY', side: 'short', why: 'Image sensor fabs in Kyushu are quake-exposed.' },
  ] },
  { name: 'Taiwan', box: [21, 119, 26, 123], ideas: [
    { t: 'TSM', side: 'short', why: 'Fabs pause and wafers in process are scrapped after strong shaking.' },
    { t: 'INTC', side: 'long', why: 'Non-Taiwan foundry capacity gains value.' },
  ] },
  { name: 'Chile & Peru', box: [-56, -82, -5, -66], ideas: [
    { t: 'FCX', side: 'long', why: 'Andean mine outages tighten copper supply.' },
    { t: 'SQM', side: 'short', why: 'Chilean operations face disruption risk.' },
  ] },
  { name: 'Indonesia & Philippines', box: [-11, 95, 21, 141], ideas: [
    { t: 'VALE', side: 'long', why: 'Non-Indonesian nickel supply gains if Sulawesi output stalls.' },
  ] },
  { name: 'US Gulf Coast', box: [24, -98, 31, -82], ideas: [
    { t: 'LNG', side: 'short', why: 'Export terminals shut ahead of landfall.' },
    { t: 'VLO', side: 'long', why: 'Refiners outside the cone capture wider margins.' },
  ] },
  { name: 'US East Coast & Florida', box: [24, -82, 41, -70], ideas: [
    { t: 'HCI', side: 'short', why: 'Florida-concentrated homeowners insurer.' },
  ] },
  { name: 'California', box: [32, -125, 42, -114], ideas: [
    { t: 'PCG', side: 'short', why: 'Fire and quake liability for the state utility.' },
    { t: 'EIX', side: 'short', why: 'Southern California Edison exposure.' },
  ] },
  { name: 'Iceland & North Atlantic', box: [62, -26, 68, -12], ideas: [
    { t: 'RYAAY', side: 'short', why: 'European airspace closures from ash, as in 2010.' },
  ] },
  { name: 'Middle East', box: [12, 34, 38, 62], ideas: [
    { t: 'XOM', side: 'long', why: 'Gulf supply risk lifts crude.' },
  ] },
];
