import 'dotenv/config';
export const env = {
  sarvamKey: process.env.SARVAM_API_KEY!,
  voice: process.env.BULBUL_VOICE || 'shubh',
  sourceLang: process.env.SOURCE_LANG || 'en-IN',
  targetLang: process.env.TARGET_LANG || 'hi-IN',
  port: Number(process.env.PORT || 3000),
};
