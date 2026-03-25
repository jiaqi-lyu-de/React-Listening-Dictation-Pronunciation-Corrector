/**
 * Phoneme to IPA symbol mapping
 * Used by Word Reading module for displaying phoneme results
 */
const ipaMap = {
  "aa": "ɑ", "ae": "æ", "ah": "ʌ", "aw": "aʊ", "ay": "aɪ",
  "eh": "ɛ", "er": "ɝ", "ey": "eɪ", "ih": "ɪ", "iy": "i",
  "ow": "oʊ", "oy": "ɔɪ", "uh": "ʊ", "uw": "u",
  "b": "b", "ch": "tʃ", "d": "d", "dh": "ð", "f": "f",
  "g": "ɡ", "hh": "h", "jh": "dʒ", "k": "k", "l": "l",
  "m": "m", "n": "n", "ng": "ŋ", "p": "p", "r": "r",
  "s": "s", "sh": "ʃ", "t": "t", "th": "θ", "v": "v",
  "w": "w", "y": "j", "z": "z", "zh": "ʒ"
};

export function getIPA(phoneme) {
  if (!phoneme) return "";
  const cleaned = phoneme.toLowerCase().trim();
  return ipaMap[cleaned] || cleaned;
}

export default ipaMap;
