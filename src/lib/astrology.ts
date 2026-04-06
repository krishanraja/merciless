// Astrology utility functions for frontend display

export const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
] as const

export type ZodiacSign = typeof ZODIAC_SIGNS[number]

export const ZODIAC_GLYPHS: Record<ZodiacSign, string> = {
  'Aries': '♈',
  'Taurus': '♉',
  'Gemini': '♊',
  'Cancer': '♋',
  'Leo': '♌',
  'Virgo': '♍',
  'Libra': '♎',
  'Scorpio': '♏',
  'Sagittarius': '♐',
  'Capricorn': '♑',
  'Aquarius': '♒',
  'Pisces': '♓',
}

export const PLANET_GLYPHS: Record<string, string> = {
  'Sun': '☉',
  'Moon': '☽',
  'Mercury': '☿',
  'Venus': '♀',
  'Mars': '♂',
  'Jupiter': '♃',
  'Saturn': '♄',
  'Uranus': '♅',
  'Neptune': '♆',
  'Pluto': '♇',
  'Chiron': '⚷',
  'North Node': '☊',
}

export const PLANET_COLORS: Record<string, string> = {
  'Sun': '#F5A623',
  'Moon': '#C0C0C0',
  'Mercury': '#9D4EDD',
  'Venus': '#E91E8C',
  'Mars': '#E53E3E',
  'Jupiter': '#3B82F6',
  'Saturn': '#6B6B7A',
  'Uranus': '#00BCD4',
  'Neptune': '#4FC3F7',
  'Pluto': '#7B2FBE',
  'Chiron': '#FF7043',
  'North Node': '#F5A623',
}

export const ASPECT_GLYPHS: Record<string, string> = {
  'conjunction': '☌',
  'sextile': '⚹',
  'square': '□',
  'trine': '△',
  'opposition': '☍',
  'quincunx': '⚻',
}

export const ASPECT_COLORS: Record<string, string> = {
  'conjunction': '#F5A623',
  'sextile': '#3B82F6',
  'square': '#E53E3E',
  'trine': '#22C55E',
  'opposition': '#FF4444',
  'quincunx': '#9D4EDD',
}

export const SIGN_ELEMENTS: Record<ZodiacSign, string> = {
  'Aries': 'Fire', 'Taurus': 'Earth', 'Gemini': 'Air', 'Cancer': 'Water',
  'Leo': 'Fire', 'Virgo': 'Earth', 'Libra': 'Air', 'Scorpio': 'Water',
  'Sagittarius': 'Fire', 'Capricorn': 'Earth', 'Aquarius': 'Air', 'Pisces': 'Water',
}

export const SIGN_MODALITIES: Record<ZodiacSign, string> = {
  'Aries': 'Cardinal', 'Taurus': 'Fixed', 'Gemini': 'Mutable', 'Cancer': 'Cardinal',
  'Leo': 'Fixed', 'Virgo': 'Mutable', 'Libra': 'Cardinal', 'Scorpio': 'Fixed',
  'Sagittarius': 'Mutable', 'Capricorn': 'Cardinal', 'Aquarius': 'Fixed', 'Pisces': 'Mutable',
}

export const ELEMENT_COLORS: Record<string, string> = {
  'Fire': '#E53E3E',
  'Earth': '#68D391',
  'Air': '#63B3ED',
  'Water': '#76E4F7',
}

export function getLongitudeDegree(longitude: number): number {
  return longitude % 30
}

export function getZodiacSignFromLongitude(longitude: number): ZodiacSign {
  const index = Math.floor(longitude / 30) % 12
  return ZODIAC_SIGNS[index]
}

export function formatDegree(degree: number): string {
  const d = Math.floor(degree)
  const mFull = (degree - d) * 60
  const m = Math.floor(mFull)
  return `${d}°${m.toString().padStart(2, '0')}'`
}

export function getMoonPhaseEmoji(phase: string): string {
  const phases: Record<string, string> = {
    'new': '🌑',
    'waxing crescent': '🌒',
    'first quarter': '🌓',
    'waxing gibbous': '🌔',
    'full': '🌕',
    'waning gibbous': '🌖',
    'last quarter': '🌗',
    'waning crescent': '🌘',
  }
  return phases[phase.toLowerCase()] || '🌙'
}

export function getIntensityLabel(score: number): { label: string; color: string } {
  if (score <= 3) return { label: 'Quiet', color: '#22C55E' }
  if (score <= 5) return { label: 'Active', color: '#F5A623' }
  if (score <= 7) return { label: 'Intense', color: '#FF6B35' }
  return { label: 'Merciless', color: '#E53E3E' }
}

export function getSunSignDescription(sign: ZodiacSign): string {
  const descriptions: Record<ZodiacSign, string> = {
    'Aries': 'The Ram. First sign, pure drive. You start fires and rarely wait to see if they spread.',
    'Taurus': 'The Bull. Unmovable until you decide to charge. Your patience is a weapon.',
    'Gemini': 'The Twins. Two minds, one body. The chaos is the feature, not the bug.',
    'Cancer': 'The Crab. Hard shell, soft core. You remember everything and forgive nothing.',
    'Leo': 'The Lion. The stage was built for you, whether you asked for it or not.',
    'Virgo': 'The Analyst. You see the flaw in everything, including yourself. Especially yourself.',
    'Libra': 'The Scales. You weigh every option until the moment passes. That is your struggle.',
    'Scorpio': 'The Scorpion. You see through everyone. That is your gift and your curse.',
    'Sagittarius': 'The Archer. You aim far and move fast. Staying is the thing you fear most.',
    'Capricorn': 'The Goat. You climb. Through everything. Over everyone if necessary.',
    'Aquarius': 'The Water Bearer. You are ahead of the time you are forced to inhabit.',
    'Pisces': 'The Fish. You absorb everyone around you. The question is whether you chose them.',
  }
  return descriptions[sign]
}

export function formatBirthLocation(location: string): string {
  return location.split(',').slice(0, 2).join(',').trim()
}

export const HOUSE_MEANINGS: Record<number, string> = {
  1: 'Self & Identity',
  2: 'Values & Money',
  3: 'Communication',
  4: 'Home & Roots',
  5: 'Creativity & Pleasure',
  6: 'Health & Service',
  7: 'Partnerships',
  8: 'Transformation',
  9: 'Philosophy & Travel',
  10: 'Career & Legacy',
  11: 'Community & Ideals',
  12: 'Secrets & Dissolution',
}
