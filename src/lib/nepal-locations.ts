export interface ProvinceInfo {
  id: number;
  name: string;
  nameNe: string;
  capital: string;
  districts: DistrictInfo[];
}

export interface DistrictInfo {
  name: string;
  nameNe: string;
  municipalities: string[];
}

export const NEPAL_PROVINCES: ProvinceInfo[] = [
  {
    id: 1,
    name: 'Koshi Province',
    nameNe: 'कोशी प्रदेश',
    capital: 'Biratnagar',
    districts: [
      { name: 'Bhojpur', nameNe: 'भोजपुर', municipalities: ['Bhojpur Municipality', 'Shadananda Municipality', 'Tyamke Maiyunm'] },
      { name: 'Dhankuta', nameNe: 'धनकुटा', municipalities: ['Dhankuta Municipality', 'Pakhribas Municipality', 'Mahalaxmi Municipality'] },
      { name: 'Ilam', nameNe: 'इलाम', municipalities: ['Ilam Municipality', 'Suryodaya Municipality', 'Deumai Municipality', 'Mai Municipality'] },
      { name: 'Jhapa', nameNe: 'झापा', municipalities: ['Birtamod Municipality', 'Damak Municipality', 'Mechinagar Municipality', 'Bhadrapur Municipality', 'Kankai Municipality'] },
      { name: 'Khotang', nameNe: 'खोटाङ', municipalities: ['Diktel Rupakot Majhuwagadhi', 'Halesi Tuwachung Municipality'] },
      { name: 'Morang', nameNe: 'मोरङ', municipalities: ['Biratnagar Metropolitan City', 'Sundarharaicha Municipality', 'Urlabari Municipality', 'Belbari Municipality', 'Pathari Shanishchare'] },
      { name: 'Okhaldhunga', nameNe: 'ओखलढुङ्गा', municipalities: ['Siddhicharan Municipality', 'Molung Rural Municipality'] },
      { name: 'Panchthar', nameNe: 'पाँचथर', municipalities: ['Phidim Municipality', 'Hilihang Rural Municipality'] },
      { name: 'Sankhuwasabha', nameNe: 'संखुवासभा', municipalities: ['Khandbari Municipality', 'Chainpur Municipality'] },
      { name: 'Solukhumbu', nameNe: 'सोलुखुम्बु', municipalities: ['Solududhkunda Municipality', 'Khumbu Pasanglhamu'] },
      { name: 'Sunsari', nameNe: 'सुनसरी', municipalities: ['Dharan Sub-Metropolitan City', 'Itahari Sub-Metropolitan City', 'Inaruwa Municipality', 'Duhabi Municipality'] },
      { name: 'Taplejung', nameNe: 'ताप्लेजुङ', municipalities: ['Phungling Municipality', 'Sirijangha Rural Municipality'] },
      { name: 'Terhathum', nameNe: 'तेह्रथुम', municipalities: ['Myanglung Municipality', 'Laligurans Municipality'] },
      { name: 'Udayapur', nameNe: 'उदयपुर', municipalities: ['Triyuga Municipality', 'Katari Municipality', 'Chaudandigadhi Municipality'] },
    ],
  },
  {
    id: 2,
    name: 'Madhesh Province',
    nameNe: 'मधेश प्रदेश',
    capital: 'Janakpur',
    districts: [
      { name: 'Bara', nameNe: 'बारा', municipalities: ['Kalaiya Sub-Metropolitan City', 'Jeetpur Simara Sub-Metropolitan City', 'Nijgadh Municipality'] },
      { name: 'Dhanusha', nameNe: 'धनुषा', municipalities: ['Janakpurdham Sub-Metropolitan City', 'Chhireshwornath Municipality', 'Dhanushadham Municipality'] },
      { name: 'Mahottari', nameNe: 'महोत्तरी', municipalities: ['Jaleshwar Municipality', 'Bardibas Municipality', 'Gaushala Municipality'] },
      { name: 'Parsa', nameNe: 'पर्सा', municipalities: ['Birgunj Metropolitan City', 'Pokhariya Municipality', 'Bahudarmai Municipality'] },
      { name: 'Rautahat', nameNe: 'रौतहट', municipalities: ['Gaur Municipality', 'Chandrapur Municipality', 'Garuda Municipality'] },
      { name: 'Saptari', nameNe: 'सप्तरी', municipalities: ['Rajbiraj Municipality', 'Kanchanrup Municipality', 'Shambhunath Municipality'] },
      { name: 'Sarlahi', nameNe: 'सर्लाही', municipalities: ['Malangwa Municipality', 'Lalbandi Municipality', 'Hariwan Municipality'] },
      { name: 'Siraha', nameNe: 'सिराहा', municipalities: ['Siraha Municipality', 'Lahan Municipality', 'Mirchaiya Municipality', 'Golbazar Municipality'] },
    ],
  },
  {
    id: 3,
    name: 'Bagmati Province',
    nameNe: 'बागमती प्रदेश',
    capital: 'Hetauda',
    districts: [
      { name: 'Bhaktapur', nameNe: 'भक्तपुर', municipalities: ['Bhaktapur Municipality', 'Madhyapur Thimi Municipality', 'Suryabinayak Municipality', 'Changunarayan Municipality'] },
      { name: 'Chitwan', nameNe: 'चितवन', municipalities: ['Bharatpur Metropolitan City', 'Ratnanagar Municipality', 'Khairahani Municipality', 'Kalika Municipality'] },
      { name: 'Dhading', nameNe: 'धादिङ', municipalities: ['Nilkantha Municipality', 'Dhunibeshi Municipality', 'Gajuri Rural Municipality'] },
      { name: 'Dolakha', nameNe: 'दोलखा', municipalities: ['Bhimeshwar Municipality', 'Jiri Municipality'] },
      { name: 'Kathmandu', nameNe: 'काठमाडौँ', municipalities: ['Kathmandu Metropolitan City', 'Kirtipur Municipality', 'Budhanilkantha Municipality', 'Tokha Municipality', 'Gokarneshwor Municipality', 'Chandragiri Municipality', 'Nagarjun Municipality'] },
      { name: 'Kavrepalanchok', nameNe: 'काभ्रेपलाञ्चोक', municipalities: ['Dhulikhel Municipality', 'Banepa Municipality', 'Panauti Municipality', 'Panchkhal Municipality'] },
      { name: 'Lalitpur', nameNe: 'ललितपुर', municipalities: ['Lalitpur Metropolitan City', 'Godawari Municipality', 'Mahalaxmi Municipality'] },
      { name: 'Makwanpur', nameNe: 'मकवानपुर', municipalities: ['Hetauda Sub-Metropolitan City', 'Thaha Municipality'] },
      { name: 'Nuwakot', nameNe: 'नुवाकोट', municipalities: ['Bidur Municipality', 'Belkotgadhi Municipality'] },
      { name: 'Ramechhap', nameNe: 'रामेछाप', municipalities: ['Manthali Municipality', 'Ramechhap Municipality'] },
      { name: 'Rasuwa', nameNe: 'रसुवा', municipalities: ['Gosaikunda Rural Municipality', 'Kalika Rural Municipality'] },
      { name: 'Sindhuli', nameNe: 'सिन्धुली', municipalities: ['Kamalamai Municipality', 'Dudhauli Municipality'] },
      { name: 'Sindhupalchok', nameNe: 'सिन्धुपाल्चोक', municipalities: ['Chautara Sangachokgadhi', 'Melamchi Municipality', 'Barhabise Municipality'] },
    ],
  },
  {
    id: 4,
    name: 'Gandaki Province',
    nameNe: 'गण्डकी प्रदेश',
    capital: 'Pokhara',
    districts: [
      { name: 'Baglung', nameNe: 'बागलुङ', municipalities: ['Baglung Municipality', 'Galkot Municipality', 'Dhorpatan Municipality'] },
      { name: 'Gorkha', nameNe: 'गोरखा', municipalities: ['Gorkha Municipality', 'Palungtar Municipality', 'Barpak Sulikot'] },
      { name: 'Kaski', nameNe: 'कास्की', municipalities: ['Pokhara Metropolitan City', 'Annapurna Rural Municipality', 'Machhapuchchhre Rural Municipality'] },
      { name: 'Lamjung', nameNe: 'लमजुङ', municipalities: ['Besisahar Municipality', 'Sundarbazar Municipality'] },
      { name: 'Manang', nameNe: 'मनाङ', municipalities: ['Chame Rural Municipality', 'Manang Ngisyang'] },
      { name: 'Mustang', nameNe: 'मुस्ताङ', municipalities: ['Gharapjhong Rural Municipality', 'Thasang Rural Municipality'] },
      { name: 'Myagdi', nameNe: 'म्याग्दी', municipalities: ['Beni Municipality', 'Annapurna Rural Municipality'] },
      { name: 'Nawalpur', nameNe: 'नवलपुर', municipalities: ['Kawasoti Municipality', 'Gaindakot Municipality', 'Devchuli Municipality'] },
      { name: 'Parbat', nameNe: 'पर्वत', municipalities: ['Kushma Municipality', 'Phalebas Municipality'] },
      { name: 'Syangja', nameNe: 'स्याङ्जा', municipalities: ['Putalibazar Municipality', 'Waling Municipality', 'Galyang Municipality'] },
      { name: 'Tanahun', nameNe: 'तनहुँ', municipalities: ['Byas Municipality', 'Shuklagandaki Municipality', 'Bhanu Municipality'] },
    ],
  },
  {
    id: 5,
    name: 'Lumbini Province',
    nameNe: 'लुम्बिनी प्रदेश',
    capital: 'Deukhuri',
    districts: [
      { name: 'Arghakhanchi', nameNe: 'अर्घाखाँची', municipalities: ['Sandhikharka Municipality', 'Sitganga Municipality'] },
      { name: 'Banke', nameNe: 'बाँके', municipalities: ['Nepalgunj Sub-Metropolitan City', 'Kohalpur Municipality'] },
      { name: 'Bardiya', nameNe: 'बर्दिया', municipalities: ['Gulariya Municipality', 'Bansgadhi Municipality', 'Thakurbaba Municipality'] },
      { name: 'Dang', nameNe: 'दाङ', municipalities: ['Ghorahi Sub-Metropolitan City', 'Tulsipur Sub-Metropolitan City', 'Lamahi Municipality'] },
      { name: 'Eastern Rukum', nameNe: 'पूर्वी रुकुम', municipalities: ['Sisne Rural Municipality', 'Putha Uttarganga'] },
      { name: 'Gulmi', nameNe: 'गुल्मी', municipalities: ['Resunga Municipality', 'Musikot Municipality'] },
      { name: 'Kapilvastu', nameNe: 'कपिलवस्तु', municipalities: ['Kapilvastu Municipality', 'Banganga Municipality', 'Shivaraj Municipality'] },
      { name: 'Parasi', nameNe: 'परासी', municipalities: ['Ramgram Municipality', 'Sunwal Municipality', 'Bardaghat Municipality'] },
      { name: 'Palpa', nameNe: 'पाल्पा', municipalities: ['Tansen Municipality', 'Rampur Municipality'] },
      { name: 'Pyuthan', nameNe: 'प्यूठान', municipalities: ['Pyuthan Municipality', 'Swargadwari Municipality'] },
      { name: 'Rolpa', nameNe: 'रोल्पा', municipalities: ['Rolpa Municipality', 'Sunil Smriti Rural Municipality'] },
      { name: 'Rupandehi', nameNe: 'रुपन्देही', municipalities: ['Butwal Sub-Metropolitan City', 'Siddharthanagar Municipality', 'Tilottama Municipality', 'Sainamaina Municipality'] },
    ],
  },
  {
    id: 6,
    name: 'Karnali Province',
    nameNe: 'कर्णाली प्रदेश',
    capital: 'Birendranagar',
    districts: [
      { name: 'Dailekh', nameNe: 'दैलेख', municipalities: ['Narayan Municipality', 'Dullu Municipality'] },
      { name: 'Dolpa', nameNe: 'डोल्पा', municipalities: ['Thuli Bheri Municipality', 'Tripurasundari Municipality'] },
      { name: 'Humla', nameNe: 'हुम्ला', municipalities: ['Simkot Rural Municipality', 'Namkha Rural Municipality'] },
      { name: 'Jajarkot', nameNe: 'जाजरकोट', municipalities: ['Bheri Municipality', 'Chhedagad Municipality'] },
      { name: 'Jumla', nameNe: 'जुम्ला', municipalities: ['Chandannath Municipality', 'Tatopani Rural Municipality'] },
      { name: 'Kalikot', nameNe: 'कालिकोट', municipalities: ['Khandachakra Municipality', 'Raskot Municipality'] },
      { name: 'Mugu', nameNe: 'मुगु', municipalities: ['Chhayanath Rara Municipality', 'Khatyad Rural Municipality'] },
      { name: 'Salyan', nameNe: 'सल्यान', municipalities: ['Sharada Municipality', 'Bagchaur Municipality'] },
      { name: 'Surkhet', nameNe: 'सुर्खेत', municipalities: ['Birendranagar Municipality', 'Bheriganga Municipality', 'Gurbhakot Municipality'] },
      { name: 'Western Rukum', nameNe: 'पश्चिम रुकुम', municipalities: ['Musikot Municipality', 'Chaurjahari Municipality'] },
    ],
  },
  {
    id: 7,
    name: 'Sudurpashchim Province',
    nameNe: 'सुदूरपश्चिम प्रदेश',
    capital: 'Godawari',
    districts: [
      { name: 'Achham', nameNe: 'अछाम', municipalities: ['Mangalsen Municipality', 'Sanphebagar Municipality'] },
      { name: 'Baitadi', nameNe: 'बैतडी', municipalities: ['Dasharathchand Municipality', 'Patan Municipality'] },
      { name: 'Bajhang', nameNe: 'बझाङ', municipalities: ['Jaya Prithvi Municipality', 'Bungal Municipality'] },
      { name: 'Bajura', nameNe: 'बाजुरा', municipalities: ['Badimalika Municipality', 'Budhiganga Municipality'] },
      { name: 'Dadeldhura', nameNe: 'डडेल्धुरा', municipalities: ['Amargadhi Municipality', 'Parashuram Municipality'] },
      { name: 'Darchula', nameNe: 'दार्चुला', municipalities: ['Mahakali Municipality', 'Shailyashikhar Municipality'] },
      { name: 'Doti', nameNe: 'डोटी', municipalities: ['Dipayal Silgadhi Municipality', 'Shikhar Municipality'] },
      { name: 'Kailali', nameNe: 'कैलाली', municipalities: ['Dhangadhi Sub-Metropolitan City', 'Tikapur Municipality', 'Godawari Municipality', 'Lamkichuha Municipality'] },
      { name: 'Kanchanpur', nameNe: 'कञ्चनपुर', municipalities: ['Bhimdatta Municipality', 'Bedkot Municipality', 'Krishnapur Municipality'] },
    ],
  },
];

export function getAllDistricts(): Array<DistrictInfo & { province: string }> {
  return NEPAL_PROVINCES.flatMap((p) =>
    p.districts.map((d) => ({ ...d, province: p.name })),
  );
}

export function getDistrictsByProvince(provinceName: string): DistrictInfo[] {
  const province = NEPAL_PROVINCES.find((p) => p.name === provinceName);
  return province ? province.districts : [];
}

export function getMunicipalitiesByDistrict(provinceName: string, districtName: string): string[] {
  const districts = getDistrictsByProvince(provinceName);
  const district = districts.find((d) => d.name === districtName);
  return district ? district.municipalities : [];
}

export function formatNPR(amount: number): string {
  if (!Number.isFinite(amount)) return 'रु 0';
  return `रु ${Math.round(amount).toLocaleString('en-IN')}`;
}

export function normalizeNepalPhone(phone: string): { valid: boolean; normalized: string } {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  const digits = cleaned.startsWith('+977')
    ? cleaned.slice(4)
    : cleaned.startsWith('977')
      ? cleaned.slice(3)
      : cleaned;
  const isMobile = /^(97|98|96)\d{8}$/.test(digits);
  return {
    valid: isMobile,
    normalized: isMobile ? `+977-${digits}` : phone.trim(),
  };
}

const BS_MONTHS_EN = [
  'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra',
];

const BS_MONTHS_NE = [
  'वैशाख', 'जेठ', 'असार', 'श्रावण', 'भदौ', 'असोज',
  'कार्तिक', 'मंसिर', 'पुष', 'माघ', 'फाल्गुन', 'चैत्र',
];

export function formatNepalDate(isoDate: string, lang: 'en' | 'ne' = 'en'): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;

  const adFormatted = d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Approximate Bikram Sambat conversion (+56 years, ~8.5 months offset)
  const monthIdx = d.getUTCMonth();
  const day = d.getUTCDate();
  let bsYear = d.getUTCFullYear() + 56;
  let bsMonthIdx = (monthIdx + 8) % 12;
  let bsDay = day + 17;
  if (bsDay > 30) {
    bsDay -= 30;
    bsMonthIdx = (bsMonthIdx + 1) % 12;
  }
  if (monthIdx > 3 || (monthIdx === 3 && day >= 14)) {
    bsYear += 1;
  }

  const bsMonthName = lang === 'ne' ? BS_MONTHS_NE[bsMonthIdx] : BS_MONTHS_EN[bsMonthIdx];
  return `${adFormatted} (${bsYear} ${bsMonthName} ${bsDay} BS)`;
}
