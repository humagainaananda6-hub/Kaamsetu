export type Language = 'en' | 'ne';

const DICT = {
  en: {
    brand: 'KAAMSETU',
    tagline: 'Connecting Skills to Opportunities.',
    navJobs: 'Find Jobs',
    navGigs: 'Find Gigs',
    navEmployers: 'For Employers',
    navHowItWorks: 'How It Works',
    navAbout: 'About Us',
    login: 'Login',
    getStarted: 'Get Started',
    heroHeadline: 'Your Skills Deserve the Right Opportunity.',
    heroSubtext:
      'Discover verified jobs, connect with trusted employers, and turn your qualifications into real opportunities. No bidding wars. Just meaningful connections.',
    ctaPrimary: 'Find Opportunities',
    ctaSecondary: 'Hire Talent',
    discoveryTitle: 'Find Opportunities That Match Your Potential.',
    gigsTitle: 'Small Tasks. Real Earnings.',
    verified: 'Verified',
    pendingReview: 'Pending Review',
    rejected: 'Rejected',
    unverified: 'Unverified',
    applyNow: 'Apply Now',
    saveJob: 'Save',
    savedJob: 'Saved',
    expressInterest: 'Express Interest',
    dashboardOverview: 'Overview',
    messages: 'Messages',
    notifications: 'Notifications',
    settings: 'Settings',
    logout: 'Sign Out',
  },
  ne: {
    brand: 'कामसेतु',
    tagline: 'सीपलाई अवसरसँग जोड्दै।',
    navJobs: 'रोजगारी खोज्नुहोस्',
    navGigs: 'साना काम (गिग)',
    navEmployers: 'रोजगारदाताका लागि',
    navHowItWorks: 'कसरी काम गर्छ',
    navAbout: 'हाम्रो बारेमा',
    login: 'लगइन',
    getStarted: 'सुरु गर्नुहोस्',
    heroHeadline: 'तपाईंको सीपले सही अवसर पाउनुपर्छ।',
    heroSubtext:
      'प्रमाणित रोजगारीहरू पत्ता लगाउनुहोस्, विश्वसनीय रोजगारदाताहरूसँग जोडिनुहोस्, र आफ्नो शैक्षिक योग्यतालाई वास्तविक अवसरमा बदल्नुहोस्। बिडिङ युद्ध बिना, सिधा सम्पर्क।',
    ctaPrimary: 'अवसर खोज्नुहोस्',
    ctaSecondary: 'प्रतिभा छान्नुहोस्',
    discoveryTitle: 'तपाईंको क्षमतासँग मिल्ने अवसरहरू खोज्नुहोस्।',
    gigsTitle: 'साना काम। वास्तविक कमाइ।',
    verified: 'प्रमाणित',
    pendingReview: 'समीक्षाधीन',
    rejected: 'अस्वीकृत',
    unverified: 'अप्रमाणित',
    applyNow: 'आवेदन दिनुहोस्',
    saveJob: 'सुरक्षित गर्नुहोस्',
    savedJob: 'सुरक्षित',
    expressInterest: 'रुचि देखाउनुहोस्',
    dashboardOverview: 'सारांश',
    messages: 'सन्देशहरू',
    notifications: 'सूचनाहरू',
    settings: 'सेटिङ्स',
    logout: 'बाहिर निस्कनुहोस्',
  },
} as const;

export type TranslationKey = keyof typeof DICT.en;

export function t(lang: Language, key: TranslationKey): string {
  return DICT[lang][key] ?? DICT.en[key];
}
