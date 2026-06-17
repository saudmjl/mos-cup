// ════════════════════════════════════════════════════════
//  بيانات مشتركة: أسماء الفرق بالعربي، الأعلام، قواعد النقاط
//  (تحديث: التشيك + البوسنة والهرسك)
// ════════════════════════════════════════════════════════

// خريطة أسماء الفرق (إنجليزي من openfootball → عربي + علم)
// تشمل أسماء مسارات الملحق الأوروبي مؤقتًا لحين حسمها
const TEAMS = {
  "Mexico":        { ar: "المكسيك",        flag: "🇲🇽", code: "MEX" },
  "South Africa":  { ar: "جنوب أفريقيا",   flag: "🇿🇦", code: "RSA" },
  "South Korea":   { ar: "كوريا الجنوبية", flag: "🇰🇷", code: "KOR" },
  "Canada":        { ar: "كندا",           flag: "🇨🇦", code: "CAN" },
  "Qatar":         { ar: "قطر",            flag: "🇶🇦", code: "QAT" },
  "Switzerland":   { ar: "سويسرا",         flag: "🇨🇭", code: "SUI" },
  "Brazil":        { ar: "البرازيل",       flag: "🇧🇷", code: "BRA" },
  "Morocco":       { ar: "المغرب",         flag: "🇲🇦", code: "MAR" },
  "Haiti":         { ar: "هايتي",          flag: "🇭🇹", code: "HAI" },
  "Scotland":      { ar: "اسكتلندا",       flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", code: "SCO" },
  "USA":           { ar: "أمريكا",         flag: "🇺🇸", code: "USA" },
  "Paraguay":      { ar: "باراغواي",       flag: "🇵🇾", code: "PAR" },
  "Australia":     { ar: "أستراليا",       flag: "🇦🇺", code: "AUS" },
  "Germany":       { ar: "ألمانيا",        flag: "🇩🇪", code: "GER" },
  "Curaçao":       { ar: "كوراساو",        flag: "🇨🇼", code: "CUW" },
  "Ivory Coast":   { ar: "ساحل العاج",     flag: "🇨🇮", code: "CIV" },
  "Ecuador":       { ar: "الإكوادور",      flag: "🇪🇨", code: "ECU" },
  "Netherlands":   { ar: "هولندا",         flag: "🇳🇱", code: "NED" },
  "Japan":         { ar: "اليابان",        flag: "🇯🇵", code: "JPN" },
  "Tunisia":       { ar: "تونس",           flag: "🇹🇳", code: "TUN" },
  "Spain":         { ar: "إسبانيا",        flag: "🇪🇸", code: "ESP" },
  "Cape Verde":    { ar: "الرأس الأخضر",   flag: "🇨🇻", code: "CPV" },
  "Belgium":       { ar: "بلجيكا",         flag: "🇧🇪", code: "BEL" },
  "Egypt":         { ar: "مصر",            flag: "🇪🇬", code: "EGY" },
  "Saudi Arabia":  { ar: "السعودية",       flag: "🇸🇦", code: "KSA" },
  "Uruguay":       { ar: "أوروغواي",       flag: "🇺🇾", code: "URU" },
  "Iran":          { ar: "إيران",          flag: "🇮🇷", code: "IRN" },
  "New Zealand":   { ar: "نيوزيلندا",      flag: "🇳🇿", code: "NZL" },
  "France":        { ar: "فرنسا",          flag: "🇫🇷", code: "FRA" },
  "Argentina":     { ar: "الأرجنتين",      flag: "🇦🇷", code: "ARG" },
  "Algeria":       { ar: "الجزائر",        flag: "🇩🇿", code: "ALG" },
  "Austria":       { ar: "النمسا",         flag: "🇦🇹", code: "AUT" },
  "Jordan":        { ar: "الأردن",         flag: "🇯🇴", code: "JOR" },
  "Portugal":      { ar: "البرتغال",       flag: "🇵🇹", code: "POR" },
  "Uzbekistan":    { ar: "أوزبكستان",      flag: "🇺🇿", code: "UZB" },
  "England":       { ar: "إنجلترا",        flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", code: "ENG" },
  "Ghana":         { ar: "غانا",           flag: "🇬🇭", code: "GHA" },
  "Panama":        { ar: "بنما",           flag: "🇵🇦", code: "PAN" },
  "Croatia":       { ar: "كرواتيا",        flag: "🇭🇷", code: "CRO" },
  "Colombia":      { ar: "كولومبيا",       flag: "🇨🇴", code: "COL" },
  "DR Congo":      { ar: "الكونغو الديمقراطية", flag: "🇨🇩", code: "COD" },
  "Norway":        { ar: "النرويج",        flag: "🇳🇴", code: "NOR" },
  "Senegal":       { ar: "السنغال",        flag: "🇸🇳", code: "SEN" },
  "Iraq":          { ar: "العراق",         flag: "🇮🇶", code: "IRQ" },
  "Czechia":       { ar: "التشيك",         flag: "🇨🇿", code: "CZE" },
  "Czech Republic":{ ar: "التشيك",         flag: "🇨🇿", code: "CZE" },
  "Bosnia & Herzegovina":   { ar: "البوسنة والهرسك", flag: "🇧🇦", code: "BIH" },
  "Bosnia and Herzegovina": { ar: "البوسنة والهرسك", flag: "🇧🇦", code: "BIH" },
  "Sweden":        { ar: "السويد",         flag: "🇸🇪", code: "SWE" },
  "Turkey":        { ar: "تركيا",          flag: "🇹🇷", code: "TUR" },
  "Türkiye":       { ar: "تركيا",          flag: "🇹🇷", code: "TUR" },
  // أسماء مؤقتة للفرق التي تُحسم عبر الملحق
  "UEFA Path A winner": { ar: "فائز ملحق أوروبا A", flag: "🇪🇺", code: "UEFA" },
  "UEFA Path B winner": { ar: "فائز ملحق أوروبا B", flag: "🇪🇺", code: "UEFA" },
  "UEFA Path C winner": { ar: "فائز ملحق أوروبا C", flag: "🇪🇺", code: "UEFA" },
  "UEFA Path D winner": { ar: "فائز ملحق أوروبا D", flag: "🇪🇺", code: "UEFA" },
  "IC Path 1 winner":   { ar: "فائز الملحق الدولي 1", flag: "🌍", code: "IC" },
  "IC Path 2 winner":   { ar: "فائز الملحق الدولي 2", flag: "🌍", code: "IC" },
};

// أسماء الأدوار الإقصائية (رموز openfootball مثل 2A / W73 / L101)
function knockoutLabel(name) {
  if (/^[12]\w$/.test(name)) {                       // 1A = أول المجموعة A، 2B = ثاني المجموعة B
    return (name[0] === "1" ? "أول المجموعة " : "ثاني المجموعة ") + name.slice(1);
  }
  let m = /^3([A-L/]+)$/.exec(name);
  if (m) return "ثالث (" + m[1] + ")";
  m = /^W(\d+)$/.exec(name);  if (m) return "فائز م" + m[1];
  m = /^L(\d+)$/.exec(name);  if (m) return "خاسر م" + m[1];
  return name;
}

// أي اسم غير معروف يُعرض باسم مقروء مؤقتًا
function teamInfo(name) {
  if (TEAMS[name]) return TEAMS[name];
  return { ar: knockoutLabel(name), flag: "⚽", code: "?" };
}

// ─── قواعد النقاط ───────────────────────────────────────
// نتيجة دقيقة صح = 50 | فائز صح فقط = 20 | غلط = 0 | الدبل ×2
function calcPoints(pred1, pred2, score1, score2, isDouble) {
  if (score1 == null || score2 == null) return 0;       // لم تنتهِ
  let pts = 0;
  if (pred1 === score1 && pred2 === score2) {
    pts = 50;                                            // نتيجة دقيقة
  } else {
    const predOut = Math.sign(pred1 - pred2);            // 1/0/-1
    const realOut = Math.sign(score1 - score2);
    if (predOut === realOut) pts = 20;                   // فائز صح
  }
  return isDouble ? pts * 2 : pts;
}

// ─── الجولات: دور المجموعات 3 جولات، ثم الأدوار الإقصائية ───
const ROUND_ORDER = ["g1","g2","g3","r32","r16","qf","sf","third","final"];
const ROUND_LABELS = {
  g1:"الجولة الأولى", g2:"الجولة الثانية", g3:"الجولة الثالثة",
  r32:"دور الـ٣٢", r16:"ثمن النهائي", qf:"ربع النهائي",
  sf:"نصف النهائي", third:"المركز الثالث", final:"النهائي"
};
function roundKey(md){
  const m = /Matchday\s+(\d+)/i.exec(md || "");
  if (m){ const n = +m[1]; return n <= 7 ? "g1" : n <= 13 ? "g2" : "g3"; }
  if (/Round of 32/i.test(md)) return "r32";
  if (/Round of 16/i.test(md)) return "r16";
  if (/Quarter/i.test(md)) return "qf";
  if (/Semi/i.test(md)) return "sf";
  if (/third/i.test(md)) return "third";
  if (/Final/i.test(md)) return "final";
  return md || "other";
}

if (typeof module !== "undefined") module.exports = { TEAMS, teamInfo, calcPoints, roundKey, ROUND_ORDER, ROUND_LABELS };
