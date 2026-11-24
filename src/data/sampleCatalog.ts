import {
  SAMPLE_BUSINESS_UUIDS,
  SAMPLE_GROUP_UUIDS,
  SAMPLE_OWNER_UUIDS,
  SAMPLE_POST_UUIDS,
  SAMPLE_PRODUCT_UUIDS,
  SAMPLE_REVIEW_UUIDS,
  SAMPLE_STORY_UUIDS,
} from '../lib/ids';
import {
  Business,
  BusinessGroup,
  BusinessReview,
  BusinessStory,
  FeedPost,
  PlanDefinition,
  Product,
} from '../types';

export const SUBSCRIPTION_PLANS: PlanDefinition[] = [
  {
    id: 'free',
    name: 'FREE',
    price: 0,
    cadence: 'Forever',
    audience: 'For new businesses joining the global network',
    productLimitLabel: '2 products / week',
    groupLimitLabel: 'Up to 3 groups',
    boostsLabel: 'Organic feed reach',
    features: [
      'Create free business profile',
      'Real-time 1-to-1 & group chat',
      'View & connect with business friends',
      'Join up to 3 industry groups',
      'Post 2 products per week',
    ],
  },
  {
    id: 'basic',
    name: 'BASIC',
    price: 5,
    cadence: 'Month',
    audience: 'For growing merchants expanding visibility',
    productLimitLabel: '15 active products',
    groupLimitLabel: 'Unlimited groups',
    boostsLabel: '1 advert boost / month',
    features: [
      'Post up to 15 products',
      'Appear in global search results',
      '1 advert boost per month',
      'Verified merchant checkmark',
      'Join unlimited business groups',
    ],
  },
  {
    id: 'pro',
    name: 'PRO',
    price: 15,
    cadence: 'Month',
    audience: 'For active sellers & direct-to-buyer brands',
    badgeText: 'Most Popular',
    productLimitLabel: 'Unlimited products',
    groupLimitLabel: 'Unlimited groups',
    boostsLabel: '5 advert boosts / month',
    features: [
      'Unlimited products',
      'Sell directly on Marketplace',
      'Homepage featured placement',
      '5 advert boosts per month',
      'Receive & manage customer orders',
    ],
  },
  {
    id: 'premium',
    name: 'PREMIUM',
    price: 30,
    cadence: 'Month',
    audience: 'For export leaders & global hospitality brands',
    badgeText: 'Gold Verified',
    productLimitLabel: 'Unlimited + priority',
    groupLimitLabel: 'Unlimited + host',
    boostsLabel: 'Unlimited boosts',
    features: [
      'Top of search worldwide',
      'Homepage banner advert placement',
      'Verified Gold Badge',
      'Priority business support',
      'Unlimited advert boosts',
    ],
  },
];

const NOW_ISO = '2026-11-19T12:00:00.000Z';

export const SAMPLE_BUSINESSES: Business[] = [
  {
    business_id: SAMPLE_BUSINESS_UUIDS[0],
    user_id: SAMPLE_OWNER_UUIDS[0],
    auth_uid: 'sample_auth_01',
    ownerName: 'Wanjiku Kamau',
    name: 'Nairobi Crown Hair Studio',
    category: 'Beauty',
    country: 'Kenya',
    city: 'Nairobi',
    tagline: 'Wholesale & retail 100% raw virgin hair bundles, lace frontals & salon supply across East Africa.',
    about: 'Based in Westlands, Nairobi, we supply salons and beauty boutiques across Kenya, Uganda, and Rwanda with ethically sourced virgin human hair extensions, HD lace wigs, and salon care kits.',
    whatsapp: '+254712345001',
    rating: 4.9,
    reviewCount: 42,
    plan: 'premium',
    verified: true,
    logoInitials: 'NC',
    logoColor: '#0A4D2E',
    coverTheme: 'hair_luxury',
    followersCount: 1840,
    viewsCount: 9420,
    isOnline: true,
    lastSeenAt: new Date(Date.now() - 30 * 1000).toISOString(),
    showOnlineStatus: true,
    status: 'active',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    isSample: true,
  },
  {
    business_id: SAMPLE_BUSINESS_UUIDS[1],
    user_id: SAMPLE_OWNER_UUIDS[1],
    auth_uid: 'sample_auth_02',
    ownerName: 'Hassan Mwangi',
    name: 'Diani Coral Sands Resort',
    category: 'Tourism',
    country: 'Kenya',
    city: 'Diani',
    tagline: 'Oceanfront boutique suites, corporate retreats & coastal hospitality packages in Kwale County.',
    about: 'Award-winning coastal boutique hotel along Diani Beach offering luxury ocean-view villas, conference halls for executive retreats, and curated water sports packages for international travelers.',
    whatsapp: '+254722889002',
    rating: 4.8,
    reviewCount: 67,
    plan: 'pro',
    verified: true,
    logoInitials: 'DC',
    logoColor: '#0F6C5D',
    coverTheme: 'diani_resort',
    followersCount: 2410,
    viewsCount: 14300,
    isOnline: true,
    lastSeenAt: new Date(Date.now() - 45 * 1000).toISOString(),
    showOnlineStatus: true,
    status: 'active',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    isSample: true,
  },
  {
    business_id: SAMPLE_BUSINESS_UUIDS[2],
    user_id: SAMPLE_OWNER_UUIDS[2],
    auth_uid: 'sample_auth_03',
    ownerName: 'Neema Mollel',
    name: 'Serengeti Horizon Tours',
    category: 'Tourism',
    country: 'Tanzania',
    city: 'Arusha',
    tagline: 'Bespoke safari expeditions across Serengeti, Ngorongoro & Zanzibar for global travel agencies.',
    about: 'Licensed Tanzanian tour operator partnering with European, American, and Asian travel agencies to deliver private 4x4 safaris, Kilimanjaro treks, and Zanzibar beach extensions.',
    whatsapp: '+255754110003',
    rating: 4.9,
    reviewCount: 53,
    plan: 'pro',
    verified: true,
    logoInitials: 'SH',
    logoColor: '#3B4D27',
    coverTheme: 'tours_safari',
    followersCount: 1590,
    viewsCount: 8120,
    isOnline: false,
    lastSeenAt: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
    showOnlineStatus: true,
    status: 'active',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    isSample: true,
  },
  {
    business_id: SAMPLE_BUSINESS_UUIDS[3],
    user_id: SAMPLE_OWNER_UUIDS[3],
    auth_uid: 'sample_auth_04',
    ownerName: 'Juma Bakari',
    name: 'Dar Spice & Coffee Co.',
    category: 'Agriculture',
    country: 'Tanzania',
    city: 'Dar es Salaam',
    tagline: 'Single-origin Kilimanjaro AA coffee beans & Zanzibar organic spices exported worldwide.',
    about: 'Direct-trade agricultural exporter connecting smallholder farmers in Moshi and Zanzibar with specialty roasters and gourmet supermarkets across the Middle East, UK, and North America.',
    whatsapp: '+255713445004',
    rating: 4.7,
    reviewCount: 31,
    plan: 'basic',
    verified: true,
    logoInitials: 'DS',
    logoColor: '#294B33',
    coverTheme: 'coffee_export',
    followersCount: 980,
    viewsCount: 4720,
    isOnline: false,
    lastSeenAt: new Date(Date.now() - 24 * 60 * 1000).toISOString(),
    showOnlineStatus: true,
    status: 'active',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    isSample: true,
  },
  {
    business_id: SAMPLE_BUSINESS_UUIDS[4],
    user_id: SAMPLE_OWNER_UUIDS[4],
    auth_uid: 'sample_auth_05',
    ownerName: 'David Miller',
    name: 'Hudson Bay Electronics',
    category: 'Electronics',
    country: 'USA',
    city: 'New York',
    tagline: 'Enterprise laptops, USB-C docking stations & B2B office hardware shipped globally.',
    about: 'New York-based wholesale distributor of commercial workstations, enterprise networking gear, and certified refurbished corporate electronics with DHL Express international fulfillment.',
    whatsapp: '+12125550105',
    rating: 4.8,
    reviewCount: 88,
    plan: 'premium',
    verified: true,
    logoInitials: 'HB',
    logoColor: '#1E2A38',
    coverTheme: 'electronics_hub',
    followersCount: 3120,
    viewsCount: 18400,
    isOnline: true,
    lastSeenAt: new Date(Date.now() - 20 * 1000).toISOString(),
    showOnlineStatus: true,
    status: 'active',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    isSample: true,
  },
  {
    business_id: SAMPLE_BUSINESS_UUIDS[5],
    user_id: SAMPLE_OWNER_UUIDS[5],
    auth_uid: 'sample_auth_06',
    ownerName: 'Maya Carter',
    name: 'Peachtree Apparel Group',
    category: 'Fashion',
    country: 'USA',
    city: 'Atlanta',
    tagline: 'Private-label corporate apparel, luxury streetwear blanks & custom brand embroidery.',
    about: 'Full-service garment sourcing and wholesale apparel studio in Atlanta supplying boutique fashion labels and corporate teams with heavyweight organic cotton and tailored outerwear.',
    whatsapp: '+14045550106',
    rating: 4.6,
    reviewCount: 24,
    plan: 'free',
    verified: false,
    logoInitials: 'PA',
    logoColor: '#27382F',
    coverTheme: 'fashion_atelier',
    followersCount: 640,
    viewsCount: 2910,
    isOnline: false,
    lastSeenAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    showOnlineStatus: true,
    status: 'active',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    isSample: true,
  },
  {
    business_id: SAMPLE_BUSINESS_UUIDS[6],
    user_id: SAMPLE_OWNER_UUIDS[6],
    auth_uid: 'sample_auth_07',
    ownerName: 'Tariq Al Mansoor',
    name: 'Al Noor Luxury Textiles',
    category: 'Fashion',
    country: 'Dubai',
    city: 'Dubai',
    tagline: 'Wholesale Italian silk, Emirati modest couture fabrics & hospitality linens in Deira.',
    about: 'Operating out of Dubai Textile Souk & Jebel Ali Free Zone, we ship bulk luxury fabrics, embroidered abayas, and 5-star hotel linens to retailers across Africa, Europe, and South Asia.',
    whatsapp: '+971504410007',
    rating: 4.9,
    reviewCount: 74,
    plan: 'premium',
    verified: true,
    logoInitials: 'AN',
    logoColor: '#0A4D2E',
    coverTheme: 'fashion_atelier',
    followersCount: 2890,
    viewsCount: 15600,
    isOnline: true,
    lastSeenAt: new Date(Date.now() - 15 * 1000).toISOString(),
    showOnlineStatus: true,
    status: 'active',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    isSample: true,
  },
  {
    business_id: SAMPLE_BUSINESS_UUIDS[7],
    user_id: SAMPLE_OWNER_UUIDS[7],
    auth_uid: 'sample_auth_08',
    ownerName: 'Faisal Al Qasimi',
    name: 'Emirates Gulf Freight',
    category: 'Services',
    country: 'Dubai',
    city: 'Dubai',
    tagline: 'Air & sea cargo consolidation from Dubai to Mombasa, Dar es Salaam & London.',
    about: 'End-to-end customs clearance, container consolidation, and door-to-door express freight forwarding bridging UAE suppliers with East African and European importers.',
    whatsapp: '+971529920008',
    rating: 4.8,
    reviewCount: 49,
    plan: 'pro',
    verified: true,
    logoInitials: 'EG',
    logoColor: '#135636',
    coverTheme: 'services_logistics',
    followersCount: 1730,
    viewsCount: 9150,
    isOnline: true,
    lastSeenAt: new Date(Date.now() - 50 * 1000).toISOString(),
    showOnlineStatus: true,
    status: 'active',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    isSample: true,
  },
  {
    business_id: SAMPLE_BUSINESS_UUIDS[8],
    user_id: SAMPLE_OWNER_UUIDS[8],
    auth_uid: 'sample_auth_09',
    ownerName: 'Oliver Bennett',
    name: 'Mayfair Commercial Realty',
    category: 'Real Estate',
    country: 'UK',
    city: 'London',
    tagline: 'Cross-border commercial property advisory, serviced offices & retail spaces in London.',
    about: 'Helping international founders and expanding enterprises secure flagship retail storefronts, warehouse hubs, and registered corporate offices across Greater London.',
    whatsapp: '+442079460009',
    rating: 4.7,
    reviewCount: 19,
    plan: 'basic',
    verified: true,
    logoInitials: 'MC',
    logoColor: '#2C3B36',
    coverTheme: 'real_estate',
    followersCount: 820,
    viewsCount: 4120,
    isOnline: false,
    lastSeenAt: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
    showOnlineStatus: true,
    status: 'active',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    isSample: true,
  },
  {
    business_id: SAMPLE_BUSINESS_UUIDS[9],
    user_id: SAMPLE_OWNER_UUIDS[9],
    auth_uid: 'sample_auth_10',
    ownerName: 'claire Hughes',
    name: 'Thames Botanical Health',
    category: 'Health',
    country: 'UK',
    city: 'Manchester',
    tagline: 'GMP-certified natural supplements, cold-pressed oils & pharmacy distribution.',
    about: 'UK manufacturer of clinical-grade herbal formulations, vegan omega supplements, and organic skincare serums available for wholesale private labeling worldwide.',
    whatsapp: '+441614960010',
    rating: 4.8,
    reviewCount: 36,
    plan: 'pro',
    verified: true,
    logoInitials: 'TB',
    logoColor: '#17584A',
    coverTheme: 'health_wellness',
    followersCount: 1340,
    viewsCount: 6890,
    isOnline: false,
    lastSeenAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    showOnlineStatus: true,
    status: 'active',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    isSample: true,
  },
  {
    business_id: SAMPLE_BUSINESS_UUIDS[10],
    user_id: SAMPLE_OWNER_UUIDS[10],
    auth_uid: 'sample_auth_11',
    ownerName: 'Priya Kapoor',
    name: 'Mumbai Silk & Gems Export',
    category: 'Fashion',
    country: 'India',
    city: 'Mumbai',
    tagline: 'Handwoven Banarasi silks, bespoke bridal couture & certified jewelry exports.',
    about: 'Third-generation Mumbai export house supplying luxury boutiques in London, Dubai, Nairobi, and New York with hand-loomed silk textiles and ethically crafted jewelry.',
    whatsapp: '+912240010011',
    rating: 4.9,
    reviewCount: 61,
    plan: 'premium',
    verified: true,
    logoInitials: 'MS',
    logoColor: '#453126',
    coverTheme: 'fashion_atelier',
    followersCount: 2260,
    viewsCount: 11700,
    isOnline: false,
    lastSeenAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    showOnlineStatus: true,
    status: 'active',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    isSample: true,
  },
  {
    business_id: SAMPLE_BUSINESS_UUIDS[11],
    user_id: SAMPLE_OWNER_UUIDS[11],
    auth_uid: 'sample_auth_12',
    ownerName: 'Arjun Nair',
    name: 'Bengaluru SmartTech Solutions',
    category: 'Electronics',
    country: 'India',
    city: 'Bengaluru',
    tagline: 'POS billing terminals, solar smart inverters & IoT retail hardware at factory pricing.',
    about: 'Designing and exporting rugged Android POS terminals, barcode scanners, and smart solar power kits tailored for retail shops, hotels, and pharmacies across emerging markets.',
    whatsapp: '+918040020012',
    rating: 4.7,
    reviewCount: 44,
    plan: 'free',
    verified: false,
    logoInitials: 'BS',
    logoColor: '#212E3C',
    coverTheme: 'electronics_hub',
    followersCount: 1120,
    viewsCount: 5340,
    isOnline: false,
    lastSeenAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    showOnlineStatus: true,
    status: 'active',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    isSample: true,
  },
];

export const SAMPLE_PRODUCTS: Product[] = [
  {
    product_id: SAMPLE_PRODUCT_UUIDS[0],
    business_id: SAMPLE_BUSINESS_UUIDS[0],
    user_id: SAMPLE_OWNER_UUIDS[0],
    auth_uid: 'sample_auth_01',
    title: 'Raw Burmese Curly Virgin Hair — 3 Bundles + HD Frontal',
    description: '100% unprocessed double-drawn virgin human hair bundles (18", 20", 22") paired with a 13x4 transparent HD lace frontal. Holds curls cleanly and dyes up to #613.',
    price: 245,
    stock: 38,
    category: 'Beauty',
    imageTheme: 'hair_luxury',
    boosted: true,
    status: 'active',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    product_id: SAMPLE_PRODUCT_UUIDS[1],
    business_id: SAMPLE_BUSINESS_UUIDS[1],
    user_id: SAMPLE_OWNER_UUIDS[1],
    auth_uid: 'sample_auth_02',
    title: '3-Night Oceanfront Executive Suite & Retreat Pass',
    description: 'All-inclusive coastal stay for two guests or corporate delegates in Diani Beach, including airport transfers from Ukunda, oceanfront breakfast, and meeting pavilion access.',
    price: 540,
    stock: 12,
    category: 'Tourism',
    imageTheme: 'diani_resort',
    boosted: true,
    status: 'active',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    product_id: SAMPLE_PRODUCT_UUIDS[2],
    business_id: SAMPLE_BUSINESS_UUIDS[2],
    user_id: SAMPLE_OWNER_UUIDS[2],
    auth_uid: 'sample_auth_03',
    title: '5-Day Private Serengeti & Ngorongoro 4x4 Safari Package',
    description: 'Full-board private Land Cruiser expedition departing Arusha with English/French-speaking guide, park conservation fees, and luxury tented lodge accommodation.',
    price: 1680,
    stock: 8,
    category: 'Tourism',
    imageTheme: 'tours_safari',
    boosted: false,
    status: 'active',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    product_id: SAMPLE_PRODUCT_UUIDS[3],
    business_id: SAMPLE_BUSINESS_UUIDS[3],
    user_id: SAMPLE_OWNER_UUIDS[3],
    auth_uid: 'sample_auth_04',
    title: 'Kilimanjaro AA Specialty Arabica Coffee (25kg Export Sack)',
    description: 'Fresh-crop washed Arabica green or medium-roast beans grown at 1,800m on Mount Kilimanjaro slopes. Tasting notes of blackcurrant, dark cocoa, and bright citrus.',
    price: 195,
    stock: 64,
    category: 'Agriculture',
    imageTheme: 'coffee_export',
    boosted: false,
    status: 'active',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    product_id: SAMPLE_PRODUCT_UUIDS[4],
    business_id: SAMPLE_BUSINESS_UUIDS[4],
    user_id: SAMPLE_OWNER_UUIDS[4],
    auth_uid: 'sample_auth_05',
    title: 'ProDock 14-in-1 Thunderbolt 4 Aluminum Workstation Hub',
    description: 'Dual-4K display output, 100W Power Delivery, 2.5Gb Ethernet, and SD UHS-II reader encased in CNC-machined anodized aluminum. Bulk corporate pricing available.',
    price: 189,
    stock: 110,
    category: 'Electronics',
    imageTheme: 'electronics_hub',
    boosted: true,
    status: 'active',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    product_id: SAMPLE_PRODUCT_UUIDS[5],
    business_id: SAMPLE_BUSINESS_UUIDS[5],
    user_id: SAMPLE_OWNER_UUIDS[5],
    auth_uid: 'sample_auth_06',
    title: 'Tailored Emerald Corporate Blazer & Leather Briefcase Set',
    description: 'Breathable Italian-weave wool-silk blazer paired with a vegetable-tanned full-grain briefcase. Ready for private label branding or executive team outfitting.',
    price: 310,
    stock: 25,
    category: 'Fashion',
    imageTheme: 'fashion_atelier',
    boosted: false,
    status: 'active',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    product_id: SAMPLE_PRODUCT_UUIDS[6],
    business_id: SAMPLE_BUSINESS_UUIDS[6],
    user_id: SAMPLE_OWNER_UUIDS[6],
    auth_uid: 'sample_auth_07',
    title: '50-Yard Wholesale Emirati Silk & Satin Fabric Roll',
    description: 'Premium breathable crepe-de-chine and mulberry silk blend curated for boutique designers and bridal houses. Direct air freight from Dubai within 72 hours.',
    price: 460,
    stock: 45,
    category: 'Fashion',
    imageTheme: 'fashion_atelier',
    boosted: true,
    status: 'active',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    product_id: SAMPLE_PRODUCT_UUIDS[7],
    business_id: SAMPLE_BUSINESS_UUIDS[7],
    user_id: SAMPLE_OWNER_UUIDS[7],
    auth_uid: 'sample_auth_08',
    title: '1 CBM Consolidated Air/Sea Cargo Slot (Dubai to East Africa)',
    description: 'Door-to-port consolidated shipping slot from Jebel Ali to Mombasa or Dar es Salaam with full customs brokerage and real-time bill of lading tracking.',
    price: 290,
    stock: 30,
    category: 'Services',
    imageTheme: 'services_logistics',
    boosted: false,
    status: 'active',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    product_id: SAMPLE_PRODUCT_UUIDS[8],
    business_id: SAMPLE_BUSINESS_UUIDS[8],
    user_id: SAMPLE_OWNER_UUIDS[8],
    auth_uid: 'sample_auth_09',
    title: 'London Executive Office & Registered Business Hub (Annual)',
    description: 'Prestigious W1 London business address, dedicated meeting room credits, and mail forwarding service tailored for international trade firms entering the UK market.',
    price: 890,
    stock: 15,
    category: 'Real Estate',
    imageTheme: 'real_estate',
    boosted: false,
    status: 'active',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    product_id: SAMPLE_PRODUCT_UUIDS[9],
    business_id: SAMPLE_BUSINESS_UUIDS[9],
    user_id: SAMPLE_OWNER_UUIDS[9],
    auth_uid: 'sample_auth_10',
    title: 'Organic Moringa & Turmeric Clinical Capsule Box (24 Units)',
    description: 'Retail-ready display carton of 24 sealed bottles manufactured in our MHRA-registered Manchester facility. Complete COA documentation included for pharmacy buyers.',
    price: 215,
    stock: 90,
    category: 'Health',
    imageTheme: 'health_wellness',
    boosted: false,
    status: 'active',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    product_id: SAMPLE_PRODUCT_UUIDS[10],
    business_id: SAMPLE_BUSINESS_UUIDS[10],
    user_id: SAMPLE_OWNER_UUIDS[10],
    auth_uid: 'sample_auth_11',
    title: 'Hand-Loomed Zari Gold Silk Evening Gown Collection (10 Pcs)',
    description: 'Boutique wholesale assortment of 10 artisan-woven silk ensembles with pure zari border detailing. Assorted sizes XS–XL packed for international retail.',
    price: 620,
    stock: 20,
    category: 'Fashion',
    imageTheme: 'fashion_atelier',
    boosted: true,
    status: 'active',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    product_id: SAMPLE_PRODUCT_UUIDS[11],
    business_id: SAMPLE_BUSINESS_UUIDS[11],
    user_id: SAMPLE_OWNER_UUIDS[11],
    auth_uid: 'sample_auth_12',
    title: 'TouchPOS Pro Dual-Screen Android Terminal + Thermal Printer',
    description: '15.6" capacitive retail POS terminal with built-in 80mm receipt printer, Wi-Fi/4G LTE, and offline inventory sync. Ideal for supermarkets, salons, and restaurants.',
    price: 340,
    stock: 52,
    category: 'Electronics',
    imageTheme: 'electronics_hub',
    boosted: false,
    status: 'active',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
];

export const SAMPLE_POSTS: FeedPost[] = [
  {
    post_id: SAMPLE_POST_UUIDS[0],
    user_id: SAMPLE_OWNER_UUIDS[0],
    business_id: SAMPLE_BUSINESS_UUIDS[0],
    auth_uid: 'sample_auth_01',
    postType: 'offer',
    content:
      'Fresh container arrival at our Westlands showroom! Salon owners across Kenya, Tanzania, and Dubai can now book wholesale Raw Burmese Curly Hair bundles with same-day dispatch. Message us directly on SwayPalm for tiered salon pricing.',
    mediaTheme: 'hair_luxury',
    offerPrice: 245,
    offerProductTitle: 'Raw Burmese Curly Virgin Hair — 3 Bundles + HD Frontal',
    likesCount: 124,
    commentsCount: 18,
    sharesCount: 14,
    status: 'active',
    createdAt: '2026-11-20T07:10:00.000Z',
    updatedAt: '2026-11-20T07:10:00.000Z',
  },
  {
    post_id: SAMPLE_POST_UUIDS[1],
    user_id: SAMPLE_OWNER_UUIDS[1],
    business_id: SAMPLE_BUSINESS_UUIDS[1],
    auth_uid: 'sample_auth_02',
    postType: 'photo',
    content:
      'Planning an executive team retreat or looking for trusted coastal accommodation partners for Q1 2027? Our newly renovated Oceanfront Pavilion in Diani accommodates up to 80 delegates with high-speed fiber and private beach access.',
    mediaTheme: 'diani_resort',
    likesCount: 196,
    commentsCount: 27,
    sharesCount: 31,
    status: 'active',
    createdAt: '2026-11-20T05:30:00.000Z',
    updatedAt: '2026-11-20T05:30:00.000Z',
  },
  {
    post_id: SAMPLE_POST_UUIDS[2],
    user_id: SAMPLE_OWNER_UUIDS[4],
    business_id: SAMPLE_BUSINESS_UUIDS[4],
    auth_uid: 'sample_auth_05',
    postType: 'offer',
    content:
      'We are expanding our distributor network in East Africa and the Gulf! Looking to connect with reliable electronics retailers in Nairobi, Dar es Salaam, and Dubai for quarterly wholesale allocations of Thunderbolt 4 docks and enterprise laptops.',
    mediaTheme: 'electronics_hub',
    offerPrice: 189,
    offerProductTitle: 'ProDock 14-in-1 Thunderbolt 4 Aluminum Workstation Hub',
    likesCount: 89,
    commentsCount: 15,
    sharesCount: 9,
    status: 'active',
    createdAt: '2026-11-19T22:15:00.000Z',
    updatedAt: '2026-11-19T22:15:00.000Z',
  },
  {
    post_id: SAMPLE_POST_UUIDS[3],
    user_id: SAMPLE_OWNER_UUIDS[6],
    business_id: SAMPLE_BUSINESS_UUIDS[6],
    auth_uid: 'sample_auth_07',
    postType: 'update',
    content:
      'Thank you to all 14 boutique owners from Mombasa, London, and Mumbai who placed bulk silk fabric orders via SwayPalm Chat this week. Next air cargo consolidation departs Dubai this Thursday at 18:00 GST.',
    mediaTheme: 'fashion_atelier',
    likesCount: 142,
    commentsCount: 21,
    sharesCount: 12,
    status: 'active',
    createdAt: '2026-11-19T16:40:00.000Z',
    updatedAt: '2026-11-19T16:40:00.000Z',
  },
  {
    post_id: SAMPLE_POST_UUIDS[4],
    user_id: SAMPLE_OWNER_UUIDS[3],
    business_id: SAMPLE_BUSINESS_UUIDS[3],
    auth_uid: 'sample_auth_04',
    postType: 'photo',
    content:
      'Harvest grading complete for our Kilimanjaro AA lot! Cupping score 86.75. Roasteries in the UK, USA, and UAE can request 500g sample packs directly through our Marketplace listing.',
    mediaTheme: 'coffee_export',
    likesCount: 73,
    commentsCount: 11,
    sharesCount: 8,
    status: 'active',
    createdAt: '2026-11-19T11:20:00.000Z',
    updatedAt: '2026-11-19T11:20:00.000Z',
  },
];

export const SAMPLE_GROUPS: BusinessGroup[] = [
  {
    group_id: SAMPLE_GROUP_UUIDS[0],
    creator_user_id: SAMPLE_OWNER_UUIDS[0],
    creator_auth_uid: 'sample_auth_01',
    name: 'Women in Business Kenya',
    description:
      'A high-trust network of female founders, retail owners, and exporters across Nairobi, Mombasa, Kisumu, and Nakuru sharing supplier leads, financing insights, and trade partnerships.',
    category: 'Leadership & Trade',
    location: 'Kenya',
    coverTheme: 'hair_luxury',
    membersCount: 1420,
    status: 'active',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    group_id: SAMPLE_GROUP_UUIDS[1],
    creator_user_id: SAMPLE_OWNER_UUIDS[1],
    creator_auth_uid: 'sample_auth_02',
    name: 'Tourism in Diani',
    description:
      'Connecting coastal hoteliers, tour operators, villa hosts, and travel agencies promoting Diani Beach, Kwale, and the Kenyan Coast to global visitors.',
    category: 'Tourism & Hospitality',
    location: 'Diani, Kenya',
    coverTheme: 'diani_resort',
    membersCount: 865,
    status: 'active',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    group_id: SAMPLE_GROUP_UUIDS[2],
    creator_user_id: SAMPLE_OWNER_UUIDS[7],
    creator_auth_uid: 'sample_auth_08',
    name: 'Importers Worldwide',
    description:
      'Direct sourcing, container consolidation, customs clearance, and verified factory introductions linking buyers in Africa, UK, and USA with suppliers in Dubai, India, and Asia.',
    category: 'Import & Export',
    location: 'Global',
    coverTheme: 'services_logistics',
    membersCount: 3190,
    status: 'active',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    group_id: SAMPLE_GROUP_UUIDS[3],
    creator_user_id: SAMPLE_OWNER_UUIDS[11],
    creator_auth_uid: 'sample_auth_12',
    name: 'East Africa Tech & Electronics',
    description:
      'Hardware distributors, POS solution providers, solar energy installers, and retail tech entrepreneurs collaborating across Kenya, Tanzania, Uganda, and Rwanda.',
    category: 'Electronics & Tech',
    location: 'East Africa',
    coverTheme: 'electronics_hub',
    membersCount: 612,
    status: 'active',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
];

export const SAMPLE_REVIEWS: BusinessReview[] = [
  {
    review_id: SAMPLE_REVIEW_UUIDS[0],
    business_id: SAMPLE_BUSINESS_UUIDS[0],
    user_id: SAMPLE_OWNER_UUIDS[6],
    auth_uid: 'sample_auth_07',
    rating: 5,
    comment: 'Consistent wholesale quality and prompt communication. Our Dubai salon clients love the Burmese bundles.',
    createdAt: '2026-11-15T10:00:00.000Z',
  },
  {
    review_id: SAMPLE_REVIEW_UUIDS[1],
    business_id: SAMPLE_BUSINESS_UUIDS[1],
    user_id: SAMPLE_OWNER_UUIDS[8],
    auth_uid: 'sample_auth_09',
    rating: 5,
    comment: 'Hosted our 20-person leadership offsite at Diani Coral Sands Resort. Seamless logistics and unforgettable hospitality.',
    createdAt: '2026-11-12T14:20:00.000Z',
  },
  {
    review_id: SAMPLE_REVIEW_UUIDS[2],
    business_id: SAMPLE_BUSINESS_UUIDS[4],
    user_id: SAMPLE_OWNER_UUIDS[0],
    auth_uid: 'sample_auth_01',
    rating: 5,
    comment: 'Ordered 15 Thunderbolt workstation hubs for our Nairobi office. Arrived via DHL in 4 days with full warranty.',
    createdAt: '2026-11-10T09:15:00.000Z',
  },
];

const STORY_EXPIRES_ISO = new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString();

export const SAMPLE_STORIES: BusinessStory[] = [
  {
    story_id: SAMPLE_STORY_UUIDS[0],
    user_id: SAMPLE_OWNER_UUIDS[0],
    business_id: SAMPLE_BUSINESS_UUIDS[0],
    auth_uid: 'sample_auth_01',
    headline: 'Fresh Raw Burmese Curly Stock',
    caption: 'Same-day East Africa dispatch on 18"–24" double-drawn bundles + HD lace frontals.',
    mediaTheme: 'hair_luxury',
    ctaLabel: 'View Wholesale Offer',
    viewsCount: 342,
    status: 'active',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    expiresAt: STORY_EXPIRES_ISO,
  },
  {
    story_id: SAMPLE_STORY_UUIDS[1],
    user_id: SAMPLE_OWNER_UUIDS[1],
    business_id: SAMPLE_BUSINESS_UUIDS[1],
    auth_uid: 'sample_auth_02',
    headline: '2027 Corporate Retreat Bookings Open',
    caption: 'Oceanfront conference pavilion for up to 80 delegates with Ukunda airport transfers.',
    mediaTheme: 'diani_resort',
    ctaLabel: 'Message Hospitality Desk',
    viewsCount: 518,
    status: 'active',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    expiresAt: STORY_EXPIRES_ISO,
  },
  {
    story_id: SAMPLE_STORY_UUIDS[2],
    user_id: SAMPLE_OWNER_UUIDS[6],
    business_id: SAMPLE_BUSINESS_UUIDS[6],
    auth_uid: 'sample_auth_07',
    headline: 'Deira Showroom Silk Dispatch',
    caption: '50-yard wholesale Italian silk & Emirati couture fabric rolls ready for 72h air cargo.',
    mediaTheme: 'fashion_atelier',
    ctaLabel: 'Explore Textiles',
    viewsCount: 419,
    status: 'active',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    expiresAt: STORY_EXPIRES_ISO,
  },
  {
    story_id: SAMPLE_STORY_UUIDS[3],
    user_id: SAMPLE_OWNER_UUIDS[4],
    business_id: SAMPLE_BUSINESS_UUIDS[4],
    auth_uid: 'sample_auth_05',
    headline: 'ProDock TB4 Batch Ready',
    caption: 'Bulk corporate discounts on 14-in-1 Thunderbolt 4 hubs with global DHL fulfillment.',
    mediaTheme: 'electronics_hub',
    ctaLabel: 'Request Bulk Quote',
    viewsCount: 625,
    status: 'active',
    createdAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
    expiresAt: STORY_EXPIRES_ISO,
  },
  {
    story_id: SAMPLE_STORY_UUIDS[4],
    user_id: SAMPLE_OWNER_UUIDS[3],
    business_id: SAMPLE_BUSINESS_UUIDS[3],
    auth_uid: 'sample_auth_04',
    headline: 'Kilimanjaro AA Harvest Live',
    caption: '25kg specialty green & roasted coffee export sacks cupping at 86.5+ points.',
    mediaTheme: 'coffee_export',
    ctaLabel: 'View Export Profile',
    viewsCount: 287,
    status: 'active',
    createdAt: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
    expiresAt: STORY_EXPIRES_ISO,
  },
];

export function formatTimeAgo(input: any): string {
  if (!input) return 'Just now';
  let date: Date;
  if (typeof input?.toDate === 'function') {
    date = input.toDate();
  } else if (input instanceof Date) {
    date = input;
  } else {
    date = new Date(input);
  }
  if (Number.isNaN(date.getTime())) return 'Recently';
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export interface BusinessPresenceInfo {
  isOnline: boolean;
  hidden: boolean;
  label: string;
  shortLabel: string;
  lastSeenMs: number;
}

export function formatLastSeen(input: any, nowMs = Date.now()): string {
  if (!input) return 'recently';
  let ms = 0;
  if (typeof input?.toMillis === 'function') ms = input.toMillis();
  else if (typeof input?.toDate === 'function') ms = input.toDate().getTime();
  else if (input instanceof Date) ms = input.getTime();
  else ms = new Date(input).getTime();

  if (!ms || Number.isNaN(ms)) return 'recently';
  const diffMs = Math.max(0, nowMs - ms);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getBusinessPresence(
  biz: Business | undefined | null,
  nowMs = Date.now()
): BusinessPresenceInfo {
  if (!biz) {
    return {
      isOnline: false,
      hidden: false,
      label: 'Offline',
      shortLabel: 'Offline',
      lastSeenMs: 0,
    };
  }
  if (biz.showOnlineStatus === false) {
    return {
      isOnline: false,
      hidden: true,
      label: 'Activity status hidden',
      shortLabel: 'Hidden',
      lastSeenMs: 0,
    };
  }

  const rawTs = biz.lastSeenAt || biz.updatedAt;
  let lastSeenMs = 0;
  if (typeof rawTs?.toMillis === 'function') lastSeenMs = rawTs.toMillis();
  else if (typeof rawTs?.toDate === 'function') lastSeenMs = rawTs.toDate().getTime();
  else if (rawTs instanceof Date) lastSeenMs = rawTs.getTime();
  else if (rawTs) {
    const parsed = new Date(rawTs).getTime();
    if (!Number.isNaN(parsed)) lastSeenMs = parsed;
  }

  if (biz.isSample) {
    if (biz.isOnline) {
      return {
        isOnline: true,
        hidden: false,
        label: 'Online now',
        shortLabel: 'Online',
        lastSeenMs: nowMs,
      };
    }
    const rel = formatLastSeen(rawTs, nowMs);
    return {
      isOnline: false,
      hidden: false,
      label: `Last seen ${rel}`,
      shortLabel: rel,
      lastSeenMs,
    };
  }

  const isFresh = lastSeenMs === 0 || nowMs - lastSeenMs < 3 * 60 * 1000;
  if (biz.isOnline === true && isFresh) {
    return {
      isOnline: true,
      hidden: false,
      label: 'Online now',
      shortLabel: 'Online',
      lastSeenMs: lastSeenMs || nowMs,
    };
  }

  const rel = formatLastSeen(rawTs, nowMs);
  return {
    isOnline: false,
    hidden: false,
    label: `Last seen ${rel}`,
    shortLabel: rel,
    lastSeenMs,
  };
}

export function createLogoInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'SP';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function resizeImageFileToDataUrl(file: File, maxDim = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function resizeSquareAvatarToDataUrl(file: File, size = 360): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file'));
      img.onload = () => {
        const minSide = Math.min(img.width, img.height);
        const sx = Math.max(0, Math.floor((img.width - minSide) / 2));
        const sy = Math.max(0, Math.floor((img.height - minSide) / 2));
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
