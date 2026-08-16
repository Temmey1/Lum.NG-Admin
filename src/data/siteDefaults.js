export const CATEGORIES = [
  { value: 'all',      label: 'All Products' },
  { value: 'lace',     label: 'Lace' },
  { value: 'ankara',   label: 'Ankara' },
  { value: 'senator',  label: 'Senator Materials' },
  { value: 'guinea',   label: 'Guinea Brocade' },
  { value: 'bonnet',   label: 'Bonnets' },
  { value: 'cap',      label: 'Alhaji Caps' },
  { value: 'children', label: "Baby/Children's Wears" },
  { value: 'adire',    label: 'Adire' },
  { value: 'george',   label: 'George' },
];

export const formatPrice = (n) =>
  '₦' + Number(n || 0).toLocaleString('en-NG');

// Fallback copy used the first time the admin panel loads and the backend's
// `settings` table doesn't have a given section saved yet. Once a section is
// saved from the admin panel, the real value from the API takes over.
export const DEFAULT_SITE_CONTENT = {
  hero: {
    eyebrow: 'Unisex Fabric Store · Ilorin, Kwara',
    titleLine1: 'Look Classy',
    titleLine2: 'To Your Taste',
    subtitle: 'Lace · Ankara · Senator · Guinea\nBonnets · Alhaji Caps · Children\'s Wear',
    ctaPrimary: 'Shop Now',
    ctaSecondary: 'Our Fabrics',
    fabricCards: [
      { label: 'Ankara',  pattern: 'linear-gradient(145deg,#8B1A1A,#D4380D,#FA8C16)' },
      { label: 'Senator', pattern: 'linear-gradient(135deg,#0a0a1a,#1a1a2e,#0d1a0d)' },
      { label: 'Lace',    pattern: 'linear-gradient(135deg,#0d0d2e,#1a1a4a,#0d2e4a)' },
    ],
  },
  about: {
    eyebrow: 'About LUM NG',
    title: 'Look Classy',
    titleItalic: 'To Your Taste',
    body1: 'LUM NG is a premium unisex fabric store founded by Oluwapelumi Adeboye, based in Ilorin, Kwara State. We deal in Lace, Ankara, Senator materials, Guinea Brocade, Embroidered Alhaji caps, Bonnets (all types), and Baby/Children\'s wears.',
    body2: "Whether you're dressing for a wedding, traditional ceremony, or everyday elegance — LUM NG has everything you need to look classy to your taste.",
    stat1Label: 'Product Types', stat1Value: '8+',
    stat2Label: 'Happy Customers', stat2Value: '500+',
    stat3Label: 'Orders Welcome', stat3Value: 'Bulk',
    badgeNumber: '8+',
    badgeLabel: 'Product Types',
  },
  marquee: ['Lace','Ankara','Senator Material','Guinea Brocade','Bonnets','Alhaji Caps',"Children's Wear",'Adire'],
  testimonials: [
    { stars: 5, text: "The Ankara I ordered was beyond stunning — rich colors and impeccable quality. LUM NG is my go-to for every owambe!", author: 'Adaeze O., Ilorin' },
    { stars: 5, text: "Ordered Guinea Brocade for my daughter's introduction ceremony. Top quality and prompt delivery. Very satisfied!", author: 'Mrs. Folake B., Kwara' },
    { stars: 5, text: "The Senator material and lace from LUM NG are world class. I've been a tailor for years and this is my most trusted source.", author: 'Emeka T., Abuja' },
    { stars: 5, text: "Got the Alhaji cap and Senator material for my dad — he loved it! Fast delivery, genuine quality. Highly recommended!", author: 'Chioma N., Port Harcourt' },
  ],
  contact: {
    phone: '+2349074112695',
    email: 'lumngfabrics@gmail.com',
    address: 'Ilorin, Kwara State',
    hours: 'Mon–Sat 8am–7pm',
    storeAddress: 'Ilorin, Kwara State.',
  },
  cta: {
    title: 'Ready to Look Classy?',
    subtitle: 'From a single yard to bulk orders — LUM NG has everything to your taste.',
    btnPrimary: 'Shop the Collection',
    btnSecondary: 'Contact Us',
  },
  footer: {
    tagline: 'Premium unisex fabric store — Ilorin, Kwara. Look classy to your taste.',
    copyright: '© 2026 LUM NG. All rights reserved.',
  },
  seo: {
    siteTitle: 'LUM NG — Unisex Fabric Store | Ilorin, Kwara',
    metaDescription: 'LUM NG — premium unisex fabric store in Ilorin, Kwara. Lace, Ankara, Senator, Guinea, Bonnets, Alhaji Caps, Children\'s Wear. Look classy to your taste.',
  },
};
