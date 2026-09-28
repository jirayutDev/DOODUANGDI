// ไพ่เทพฮินดูเต็มสำรับ 78 ใบ — ชุดใหญ่ 22 ใบ (Major Arcana) เขียนความหมายเองทีละใบ
// ชุดเล็ก 56 ใบ (Minor Arcana) สร้างจากธาตุประจำสำรับ + ความหมายเลขมาตรฐาน เพื่อให้ครบก่อนเปิดตัว
// เนื้อหาทั้งหมดเป็นฉบับร่าง รอทีมผู้รู้ตรวจก่อนใช้จริงตามแผน (ดูหัวข้อ "ความเชื่อและความปลอดภัยของผู้ใช้")
export interface TarotCard {
  slug: string;
  number: number;
  nameTh: string;
  nameEn: string;
  deity: string;
  keywords: string;
  uprightMeaning: string;
  reversedMeaning: string;
  imageUrl: string;
  // ไพ่ชุดใหญ่เป็นภาพองค์เทพโดยตรง ห้ามสุ่มออกกลับหัวด้วยเหตุผลด้านความเชื่อ (ดูหัวข้อ "ความเชื่อและความปลอดภัยของผู้ใช้")
  isMajor: boolean;
}

// ไฟล์ภาพเกือบทั้งหมดเป็น .jpg มีข้อยกเว้นเป็น .png ไม่กี่ใบ
const PNG_SLUGS = new Set(["the-magician", "queen-of-coins", "king-of-coins"]);
function imageUrlFor(slug: string): string {
  return `/tarot/${slug}.${PNG_SLUGS.has(slug) ? "png" : "jpg"}`;
}

interface MajorSeed {
  slug: string;
  number: number;
  nameTh: string;
  nameEn: string;
  deity: string;
  keywords: string;
  uprightMeaning: string;
  reversedMeaning: string;
}

const MAJOR_SEEDS: MajorSeed[] = [
  { slug: "the-fool", number: 0, nameTh: "ผู้เริ่มต้น", nameEn: "The Fool", deity: "พระขันทกุมาร", keywords: "การเริ่มต้น, ความกล้า, อิสระ", uprightMeaning: "จังหวะดีสำหรับการเริ่มต้นสิ่งใหม่ด้วยใจที่เปิดกว้าง เชื่อในสัญชาตญาณของตัวเอง", reversedMeaning: "ระวังการตัดสินใจโดยไม่ยั้งคิด ควรวางแผนก่อนลงมือ" },
  { slug: "the-magician", number: 1, nameTh: "นักปราชญ์", nameEn: "The Magician", deity: "พระพิฆเนศ", keywords: "ปัญญา, ความสำเร็จ, การลงมือทำ", uprightMeaning: "คุณมีทุกอย่างพร้อมแล้วเพื่อทำให้ความตั้งใจเป็นจริง อุปสรรคจะถูกขจัดออกไป", reversedMeaning: "ทรัพยากรพร้อมแต่ยังขาดโฟกัส ทบทวนเป้าหมายให้ชัดก่อนเริ่ม" },
  { slug: "the-high-priestess", number: 2, nameTh: "ผู้รู้แจ้ง", nameEn: "The High Priestess", deity: "พระแม่สรัสวดี", keywords: "สัญชาตญาณ, ความรู้, ความลับ", uprightMeaning: "ฟังเสียงภายในใจ คำตอบที่ต้องการอยู่ใกล้กว่าที่คิด", reversedMeaning: "อาจมีข้อมูลที่ยังไม่เปิดเผย ควรสังเกตให้ถี่ถ้วนก่อนเชื่อ" },
  { slug: "the-empress", number: 3, nameTh: "มารดาแห่งโชค", nameEn: "The Empress", deity: "พระแม่ลักษมี", keywords: "ความอุดมสมบูรณ์, ความรัก, การเติบโต", uprightMeaning: "ช่วงเวลาแห่งความอุดมสมบูรณ์ ทั้งเรื่องเงิน ความรัก และความคิดสร้างสรรค์", reversedMeaning: "อาจรู้สึกไม่มั่นคง ควรดูแลตัวเองและใกล้ชิดคนรักมากขึ้น" },
  { slug: "the-emperor", number: 4, nameTh: "ผู้ปกครอง", nameEn: "The Emperor", deity: "พระอินทร์", keywords: "อำนาจ, โครงสร้าง, ความมั่นคง", uprightMeaning: "ความมั่นคงมาจากระเบียบวินัยและการวางแผนที่ดี เป็นผู้นำที่น่าเชื่อถือ", reversedMeaning: "ระวังการควบคุมมากเกินไป ลองผ่อนปรนและรับฟังผู้อื่นบ้าง" },
  { slug: "the-hierophant", number: 5, nameTh: "ผู้สอนธรรม", nameEn: "The Hierophant", deity: "พระพรหม", keywords: "ประเพณี, การให้คำปรึกษา, ศรัทธา", uprightMeaning: "คำแนะนำจากผู้มีประสบการณ์หรือความเชื่อดั้งเดิมจะพาไปถูกทาง", reversedMeaning: "อย่ายึดติดกฎเกณฑ์เดิมจนเกินไป บางครั้งควรหาทางของตัวเอง" },
  { slug: "the-lovers", number: 6, nameTh: "คู่แท้", nameEn: "The Lovers", deity: "พระราธา-กฤษณะ", keywords: "ความรัก, การเลือก, ความสัมพันธ์", uprightMeaning: "ความสัมพันธ์ที่ลงตัว หรือการตัดสินใจครั้งสำคัญที่มาจากใจ", reversedMeaning: "อาจมีความไม่ลงรอยหรือความลังเลใจ ควรสื่อสารกันตรงๆ" },
  { slug: "the-chariot", number: 7, nameTh: "ราชรถแห่งชัยชนะ", nameEn: "The Chariot", deity: "พระอรชุน", keywords: "ชัยชนะ, มุ่งมั่น, การควบคุม", uprightMeaning: "ความมุ่งมั่นและวินัยจะพาคุณไปถึงเป้าหมายได้ แม้มีแรงต้านสองทาง", reversedMeaning: "ทิศทางยังไม่ชัดเจน ควรจัดลำดับความสำคัญใหม่" },
  { slug: "strength", number: 8, nameTh: "พลังแห่งใจ", nameEn: "Strength", deity: "พระแม่ทุรคา", keywords: "ความกล้าหาญ, ความอดทน, พลังใจ", uprightMeaning: "ใจที่สงบและอ่อนโยนเอาชนะอุปสรรคได้มากกว่าความรุนแรง", reversedMeaning: "อาจรู้สึกอ่อนแรงหรือขาดความมั่นใจ ให้เวลาตัวเองฟื้นพลังก่อน" },
  { slug: "the-hermit", number: 9, nameTh: "ผู้แสวงหา", nameEn: "The Hermit", deity: "พระฤๅษี", keywords: "การใคร่ครวญ, ปัญญา, ความสันโดษ", uprightMeaning: "เวลาที่ควรถอยมาทบทวนตัวเองเพื่อหาคำตอบที่แท้จริง", reversedMeaning: "การแยกตัวมากเกินไปอาจทำให้พลาดโอกาส ลองเปิดใจคุยกับคนรอบข้าง" },
  { slug: "wheel-of-fortune", number: 10, nameTh: "กงล้อชะตา", nameEn: "Wheel of Fortune", deity: "พระวิษณุ", keywords: "โชคชะตา, การเปลี่ยนแปลง, วัฏจักร", uprightMeaning: "ช่วงเวลาแห่งการเปลี่ยนแปลงที่นำโชคดีเข้ามา จับจังหวะให้ทัน", reversedMeaning: "การเปลี่ยนแปลงอาจไม่เป็นอย่างที่หวัง ตั้งสติและปรับตัวให้ไว" },
  { slug: "justice", number: 11, nameTh: "ความยุติธรรม", nameEn: "Justice", deity: "พระแม่ธรณี", keywords: "ความเป็นธรรม, ผลกรรม, ความจริง", uprightMeaning: "สิ่งที่ทำมาจะได้รับผลตอบแทนที่เป็นธรรม ความจริงจะปรากฏ", reversedMeaning: "อาจมีความไม่เป็นธรรมเกิดขึ้น ควรตรวจสอบข้อเท็จจริงให้รอบคอบ" },
  { slug: "the-hanged-man", number: 12, nameTh: "ผู้เสียสละ", nameEn: "The Hanged Man", deity: "พระวิษณุ (ปางบรรทมสินธุ์)", keywords: "การปล่อยวาง, มุมมองใหม่, ความอดทน", uprightMeaning: "การหยุดพักและมองสถานการณ์จากมุมใหม่จะช่วยให้เห็นทางออก", reversedMeaning: "ความลังเลที่ยืดเยื้อเกินไป ถึงเวลาต้องตัดสินใจแล้ว" },
  { slug: "death", number: 13, nameTh: "การเปลี่ยนผ่าน", nameEn: "Death", deity: "พระยม", keywords: "การสิ้นสุด, การเริ่มต้นใหม่, การปล่อยวาง", uprightMeaning: "บางสิ่งกำลังจบลงเพื่อเปิดทางให้สิ่งใหม่ที่ดีกว่าเข้ามา", reversedMeaning: "การยึดติดกับสิ่งเดิมทำให้ก้าวต่อไปได้ยาก ลองปล่อยวางดู" },
  { slug: "temperance", number: 14, nameTh: "ความพอดี", nameEn: "Temperance", deity: "พระแม่คงคา", keywords: "ความสมดุล, ความอดทน, การประสาน", uprightMeaning: "ความใจเย็นและการหาจุดสมดุลจะนำไปสู่ผลลัพธ์ที่ดี", reversedMeaning: "ชีวิตอาจรู้สึกไม่สมดุล ลองจัดลำดับความสำคัญใหม่" },
  { slug: "the-devil", number: 15, nameTh: "บ่วงกิเลส", nameEn: "The Devil", deity: "อสูรมายา", keywords: "สิ่งยึดติด, ความกลัว, กิเลส", uprightMeaning: "อาจกำลังติดอยู่ในสิ่งที่ไม่ดีต่อตัวเอง ทั้งความคิดหรือความสัมพันธ์", reversedMeaning: "เริ่มมองเห็นทางออกจากสิ่งที่ผูกมัดตัวเองอยู่" },
  { slug: "the-tower", number: 16, nameTh: "หอคอยล่มสลาย", nameEn: "The Tower", deity: "พระอินทร์ (สายฟ้า)", keywords: "การเปลี่ยนแปลงฉับพลัน, ความจริงที่เปิดเผย", uprightMeaning: "เหตุการณ์ไม่คาดฝันอาจเกิดขึ้น แต่จะนำไปสู่ความจริงที่ควรรู้", reversedMeaning: "หลีกเลี่ยงวิกฤตได้ด้วยการเตรียมตัวล่วงหน้า" },
  { slug: "the-star", number: 17, nameTh: "ดาวแห่งความหวัง", nameEn: "The Star", deity: "พระแม่คงคา", keywords: "ความหวัง, แรงบันดาลใจ, การเยียวยา", uprightMeaning: "หลังผ่านช่วงยากลำบาก ความหวังและกำลังใจกำลังกลับมา", reversedMeaning: "อาจรู้สึกหมดกำลังใจชั่วคราว ให้เวลาตัวเองเยียวยา" },
  { slug: "the-moon", number: 18, nameTh: "ความคลุมเครือ", nameEn: "The Moon", deity: "พระจันทร์", keywords: "สัญชาตญาณ, ความไม่แน่นอน, ความฝัน", uprightMeaning: "สถานการณ์ยังไม่ชัดเจน ให้เชื่อสัญชาตญาณแต่อย่าด่วนตัดสินใจ", reversedMeaning: "ความสับสนเริ่มคลี่คลาย ความจริงกำลังปรากฏชัดขึ้น" },
  { slug: "the-sun", number: 19, nameTh: "แสงแห่งความสำเร็จ", nameEn: "The Sun", deity: "พระสุริยะ", keywords: "ความสำเร็จ, ความสุข, พลังบวก", uprightMeaning: "ช่วงเวลาแห่งความสุขและความสำเร็จ ทุกอย่างสดใสชัดเจน", reversedMeaning: "ความสำเร็จอาจล่าช้าไปบ้าง แต่ทิศทางยังเป็นบวก" },
  { slug: "judgement", number: 20, nameTh: "การตื่นรู้", nameEn: "Judgement", deity: "พระขันทกุมาร", keywords: "การตัดสินใจครั้งสำคัญ, การให้อภัย, การตื่นรู้", uprightMeaning: "ถึงเวลาทบทวนอดีตและก้าวสู่บทใหม่ของชีวิตด้วยความเข้าใจ", reversedMeaning: "อาจยังลังเลที่จะปล่อยวางอดีต ลองให้อภัยตัวเองดูบ้าง" },
  { slug: "the-world", number: 21, nameTh: "จักรวาลสมบูรณ์", nameEn: "The World", deity: "พระวิษณุ", keywords: "ความสำเร็จสมบูรณ์, การเดินทางครบวงจร", uprightMeaning: "เป้าหมายสำคัญกำลังสำเร็จลง เป็นการปิดจบที่สวยงามของบทหนึ่ง", reversedMeaning: "ใกล้จะสำเร็จแล้วแต่ยังขาดอีกนิด อย่าเพิ่งท้อถอย" },
];

const MAJOR_ARCANA: TarotCard[] = MAJOR_SEEDS.map((seed) => ({
  ...seed,
  imageUrl: imageUrlFor(seed.slug),
  isMajor: true,
}));

// ---------- ชุดเล็ก 56 ใบ (Minor Arcana) ----------
// สำรับ 4 ธาตุตามธีมเทพฮินดู: เหรียญ(ดิน) ตะเกียง(ไฟ) หม้อน้ำ(น้ำ) ดาบ(ลม)
interface SuitSeed {
  key: string;
  nameTh: string;
  nameEn: string;
  element: string;
  theme: string;
}

const SUITS: SuitSeed[] = [
  { key: "coins", nameTh: "เหรียญ", nameEn: "Coins", element: "ธาตุดิน", theme: "เงินทอง การงาน และความมั่นคงทางกาย" },
  { key: "diya", nameTh: "ตะเกียง", nameEn: "Diya", element: "ธาตุไฟ", theme: "พลังงาน แรงบันดาลใจ และการลงมือทำ" },
  { key: "kalasha", nameTh: "หม้อน้ำ", nameEn: "Kalasha", element: "ธาตุน้ำ", theme: "อารมณ์ ความรัก และสัญชาตญาณ" },
  { key: "khadga", nameTh: "ดาบ", nameEn: "Khadga", element: "ธาตุลม", theme: "ความคิด การตัดสินใจ และความขัดแย้ง" },
];

interface RankSeed {
  key: string;
  num: number;
  nameTh: string;
  nameEn: string;
  upright: string; // ใช้ {theme} แทนธีมของสำรับ
  reversed: string;
}

const RANKS: RankSeed[] = [
  { key: "ace", num: 1, nameTh: "เอซ", nameEn: "Ace", upright: "จุดเริ่มต้นใหม่ พลังบริสุทธิ์ของ{theme}กำลังก่อตัวขึ้น", reversed: "โอกาสเริ่มต้นเรื่อง{theme}ยังไม่ชัดเจน หรือเริ่มต้นแบบลังเล" },
  { key: "two", num: 2, nameTh: "สอง", nameEn: "Two", upright: "ต้องเลือกหรือหาจุดสมดุลในเรื่อง{theme}", reversed: "ความไม่สมดุลหรือการตัดสินใจเรื่อง{theme}ที่ยังค้างคาใจ" },
  { key: "three", num: 3, nameTh: "สาม", nameEn: "Three", upright: "การเติบโตและร่วมมือกับผู้อื่นในเรื่อง{theme}", reversed: "ความร่วมมือสะดุด หรือการเติบโตเรื่อง{theme}ที่ล่าช้า" },
  { key: "four", num: 4, nameTh: "สี่", nameEn: "Four", upright: "ความมั่นคงและโครงสร้างของ{theme}เริ่มตั้งตัวได้แล้ว", reversed: "ความมั่นคงเริ่มแข็งทื่อจนขาดความยืดหยุ่น" },
  { key: "five", num: 5, nameTh: "ห้า", nameEn: "Five", upright: "ความขัดแย้งหรือความไม่มั่นคงชั่วคราวในเรื่อง{theme}", reversed: "กำลังผ่านพ้นความขัดแย้งเรื่อง{theme}และเริ่มฟื้นตัว" },
  { key: "six", num: 6, nameTh: "หก", nameEn: "Six", upright: "ความปรองดองกลับคืนมาในเรื่อง{theme}", reversed: "ความสมดุลเรื่อง{theme}ยังไม่กลับมาเต็มที่" },
  { key: "seven", num: 7, nameTh: "เจ็ด", nameEn: "Seven", upright: "ช่วงเวลาทบทวนและประเมินผลเรื่อง{theme}", reversed: "ทบทวนเรื่อง{theme}นานเกินไปจนพลาดจังหวะลงมือทำ" },
  { key: "eight", num: 8, nameTh: "แปด", nameEn: "Eight", upright: "ลงมือทำอย่างมีทักษะ เกิดความก้าวหน้าในเรื่อง{theme}", reversed: "ทุ่มเทเรื่อง{theme}ไปมากแต่ยังไม่เห็นผลตามที่ตั้งใจ" },
  { key: "nine", num: 9, nameTh: "เก้า", nameEn: "Nine", upright: "ใกล้บรรลุเป้าหมายในเรื่อง{theme}แล้ว", reversed: "เหนื่อยล้าใกล้เส้นชัยเรื่อง{theme} แต่ยังไปต่อได้" },
  { key: "ten", num: 10, nameTh: "สิบ", nameEn: "Ten", upright: "ความสมบูรณ์และจุดจบของวัฏจักรเรื่อง{theme}", reversed: "ภาระเรื่อง{theme}หนักเกินไป ควรปิดจบและเริ่มวัฏจักรใหม่" },
  { key: "page", num: 11, nameTh: "มหาดเล็ก", nameEn: "Page", upright: "ผู้เริ่มเรียนรู้เรื่อง{theme}ด้วยความอยากรู้อยากเห็น", reversed: "ข่าวสารหรือการเริ่มต้นเรื่อง{theme}ที่ยังไม่รอบคอบ" },
  { key: "knight", num: 12, nameTh: "นักรบ", nameEn: "Knight", upright: "ลงมือทำเรื่อง{theme}อย่างเต็มที่และมุ่งมั่น", reversed: "หุนหันพลันแล่นหรือทำเรื่อง{theme}เกินตัว" },
  { key: "queen", num: 13, nameTh: "ราชินี", nameEn: "Queen", upright: "เข้าใจเรื่อง{theme}อย่างลึกซึ้งและดูแลได้แบบผู้ใหญ่", reversed: "ใส่ใจเรื่อง{theme}มากเกินไปจนละเลยตัวเอง" },
  { key: "king", num: 14, nameTh: "มหาราชา", nameEn: "King", upright: "ควบคุมและเชี่ยวชาญเรื่อง{theme}ได้อย่างสมบูรณ์", reversed: "ใช้อำนาจในเรื่อง{theme}อย่างไม่สมดุล" },
];

function fillTheme(text: string, theme: string): string {
  return text.replaceAll("{theme}", theme);
}

const MINOR_ARCANA: TarotCard[] = SUITS.flatMap((suit) =>
  RANKS.map((rank) => {
    const slug = `${rank.key}-of-${suit.key}`;
    return {
      slug,
      number: rank.num,
      nameTh: `${rank.nameTh}แห่ง${suit.nameTh}`,
      nameEn: `${rank.nameEn} of ${suit.nameEn}`,
      deity: `สำรับ${suit.nameTh} (${suit.element})`,
      keywords: suit.theme,
      uprightMeaning: fillTheme(rank.upright, suit.theme),
      reversedMeaning: fillTheme(rank.reversed, suit.theme),
      imageUrl: imageUrlFor(slug),
      isMajor: false,
    };
  })
);

export const TAROT_CARDS: TarotCard[] = [...MAJOR_ARCANA, ...MINOR_ARCANA];

export function getTarotCardBySlug(slug: string): TarotCard | undefined {
  return TAROT_CARDS.find((c) => c.slug === slug);
}

// สุ่มไพ่ประจำวันแบบ deterministic ต่อวัน (คนละใบทุกวัน แต่วันเดียวกันได้ใบเดิม)
export function getDailyCard(dateStr: string): TarotCard {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) % TAROT_CARDS.length;
  }
  return TAROT_CARDS[Math.abs(hash) % TAROT_CARDS.length];
}
