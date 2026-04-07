export type ZodiacSign = 
  | 'Aries' | 'Taurus' | 'Gemini' | 'Cancer' 
  | 'Leo' | 'Virgo' | 'Libra' | 'Scorpio' 
  | 'Sagittarius' | 'Capricorn' | 'Aquarius' | 'Pisces'

export interface SignAsset {
  name: ZodiacSign
  emoji: string
  glyph: string
  image: string
  element: 'Fire' | 'Earth' | 'Air' | 'Water'
  modality: 'Cardinal' | 'Fixed' | 'Mutable'
  ruler: string
  dates: string
  color: string
}

export const SIGN_ASSETS: Record<ZodiacSign, SignAsset> = {
  Aries: {
    name: 'Aries',
    emoji: '♈',
    glyph: '♈︎',
    image: '/signs/aries.png',
    element: 'Fire',
    modality: 'Cardinal',
    ruler: 'Mars',
    dates: 'Mar 21 - Apr 19',
    color: '#FF4136',
  },
  Taurus: {
    name: 'Taurus',
    emoji: '♉',
    glyph: '♉︎',
    image: '/signs/taurus.png',
    element: 'Earth',
    modality: 'Fixed',
    ruler: 'Venus',
    dates: 'Apr 20 - May 20',
    color: '#2ECC40',
  },
  Gemini: {
    name: 'Gemini',
    emoji: '♊',
    glyph: '♊︎',
    image: '/signs/gemini.png',
    element: 'Air',
    modality: 'Mutable',
    ruler: 'Mercury',
    dates: 'May 21 - Jun 20',
    color: '#FFDC00',
  },
  Cancer: {
    name: 'Cancer',
    emoji: '♋',
    glyph: '♋︎',
    image: '/signs/cancer.png',
    element: 'Water',
    modality: 'Cardinal',
    ruler: 'Moon',
    dates: 'Jun 21 - Jul 22',
    color: '#B10DC9',
  },
  Leo: {
    name: 'Leo',
    emoji: '♌',
    glyph: '♌︎',
    image: '/signs/leo.png',
    element: 'Fire',
    modality: 'Fixed',
    ruler: 'Sun',
    dates: 'Jul 23 - Aug 22',
    color: '#FF851B',
  },
  Virgo: {
    name: 'Virgo',
    emoji: '♍',
    glyph: '♍︎',
    image: '/signs/virgo.png',
    element: 'Earth',
    modality: 'Mutable',
    ruler: 'Mercury',
    dates: 'Aug 23 - Sep 22',
    color: '#85144b',
  },
  Libra: {
    name: 'Libra',
    emoji: '♎',
    glyph: '♎︎',
    image: '/signs/libra.png',
    element: 'Air',
    modality: 'Cardinal',
    ruler: 'Venus',
    dates: 'Sep 23 - Oct 22',
    color: '#39CCCC',
  },
  Scorpio: {
    name: 'Scorpio',
    emoji: '♏',
    glyph: '♏︎',
    image: '/signs/scorpio.png',
    element: 'Water',
    modality: 'Fixed',
    ruler: 'Pluto',
    dates: 'Oct 23 - Nov 21',
    color: '#85144b',
  },
  Sagittarius: {
    name: 'Sagittarius',
    emoji: '♐',
    glyph: '♐︎',
    image: '/signs/sagittarius.png',
    element: 'Fire',
    modality: 'Mutable',
    ruler: 'Jupiter',
    dates: 'Nov 22 - Dec 21',
    color: '#7FDBFF',
  },
  Capricorn: {
    name: 'Capricorn',
    emoji: '♑',
    glyph: '♑︎',
    image: '/signs/capricorn.png',
    element: 'Earth',
    modality: 'Cardinal',
    ruler: 'Saturn',
    dates: 'Dec 22 - Jan 19',
    color: '#001f3f',
  },
  Aquarius: {
    name: 'Aquarius',
    emoji: '♒',
    glyph: '♒︎',
    image: '/signs/aquarius.png',
    element: 'Air',
    modality: 'Fixed',
    ruler: 'Uranus',
    dates: 'Jan 20 - Feb 18',
    color: '#0074D9',
  },
  Pisces: {
    name: 'Pisces',
    emoji: '♓',
    glyph: '♓︎',
    image: '/signs/pisces.png',
    element: 'Water',
    modality: 'Mutable',
    ruler: 'Neptune',
    dates: 'Feb 19 - Mar 20',
    color: '#3D9970',
  },
}

export const ZODIAC_SIGNS: ZodiacSign[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
]

export function getSignAsset(sign: string): SignAsset | null {
  const normalized = sign.charAt(0).toUpperCase() + sign.slice(1).toLowerCase()
  return SIGN_ASSETS[normalized as ZodiacSign] || null
}

export function getSignEmoji(sign: string): string {
  return getSignAsset(sign)?.emoji || '☉'
}

export function getSignImage(sign: string): string {
  return getSignAsset(sign)?.image || '/signs/aries.png'
}

export const LOGO_PATHS = {
  orange: '/merciless orange logo.png',
  white: '/merciless white logo.png',
  black: '/merciless black logo.png',
  orangeIcon: '/merciless orange icon.png',
  whiteIcon: '/merciless white icon.png',
  blackIcon: '/merciless black icon.png',
}
