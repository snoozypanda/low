import type {
  Auction,
  AuditEvent,
  AuditType,
  Bid,
  Entry,
  EntryStatus,
  IgnoredPaymentEvent,
  Language,
  Notification,
  NotificationKind,
  Payment,
  PaymentStatus,
  Refund,
  RefundReason,
  RefundStatus,
  Settings,
  User,
  WinnerRecord,
} from '../types'
import { hashBid, randomSalt } from './engine'

export interface DemoState {
  version: number
  seedAt: string
  users: User[]
  auctions: Auction[]
  payments: Payment[]
  entries: Entry[]
  bids: Bid[]
  refunds: Refund[]
  winners: WinnerRecord[]
  notifications: Notification[]
  audit: AuditEvent[]
  ignoredEvents: IgnoredPaymentEvent[]
  settings: Settings
  currentUserId: string | null
  language: Language
  adminAuthed: boolean
  guided: { active: boolean; step: number }
}

/* ------------------------------------------------------------------ */
/* Deterministic mock data helpers                                     */
/* ------------------------------------------------------------------ */

function mulberry32(seed: number) {
  let a = seed
  return function random() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const HOUR = 3600_000
const DAY = 24 * HOUR
const MIN = 60_000

const IMG = {
  phone: [
    'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1567581935884-3349723552ca?auto=format&fit=crop&w=1000&q=80',
  ],
  laptop: [
    'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=1000&q=80',
  ],
  tv: [
    'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1461151304267-38535e780c79?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1571415060716-baff5f717fba?auto=format&fit=crop&w=1200&q=80',
  ],
  earbuds: [
    'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1608156639585-b3a032ef9689?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?auto=format&fit=crop&w=1000&q=80',
  ],
  espresso: [
    'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1000&q=80',
  ],
  voucher: [
    'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1607083206968-13611e3d76db?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=1000&q=80',
  ],
  watch: [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1544117519-31a4b719223d?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=1000&q=80',
  ],
  coffee: [
    'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1521302080334-4bebac2763a6?auto=format&fit=crop&w=1000&q=80',
  ],
  speaker: [
    'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1589003077984-894e133dabab?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1558089687-f282ffcbc126?auto=format&fit=crop&w=1000&q=80',
  ],
}

const BOT_NAMES = [
  'Abebe K.',
  'Hanna G.',
  'Daniel T.',
  'Marta A.',
  'Yonas B.',
  'Liya M.',
  'Samuel W.',
  'Rahel S.',
  'Bereket H.',
  'Eden F.',
  'Nahom D.',
  'Tigist L.',
  'Kaleb R.',
  'Meron Y.',
  'Henok Z.',
  'Sara N.',
]

export function createSeedState(): DemoState {
  const now = Date.now()
  const rng = mulberry32(20261031)
  const iso = (ms: number) => new Date(ms).toISOString()

  let userSeq = 0
  let paymentSeq = 0
  let entrySeq = 0
  let bidSeq = 0
  let refundSeq = 0
  let auditSeq = 0
  let notifSeq = 0

  const users: User[] = []
  const payments: Payment[] = []
  const entries: Entry[] = []
  const bids: Bid[] = []
  const refunds: Refund[] = []
  const winners: WinnerRecord[] = []
  const notifications: Notification[] = []
  const audit: AuditEvent[] = []
  const ignoredEvents: IgnoredPaymentEvent[] = []

  const demoUser: User = {
    id: 'u-demo',
    phone: '+251712345678',
    name: 'Selam Tesfaye',
    walletBalance: 1250,
    language: 'en',
    createdAt: iso(now - 40 * DAY),
  }
  users.push(demoUser)

  const randBetween = (min: number, max: number) => min + rng() * Math.max(0, max - min)
  const randInt = (min: number, max: number) => Math.floor(randBetween(min, max + 1))
  const round2 = (n: number) => Math.round(n * 100) / 100

  function createBotUser(): User {
    const n = ++userSeq
    const phone = `+2517${String(10000000 + n * 7919).slice(-8)}`
    const user: User = {
      id: `u-bot-${n}`,
      phone,
      name: BOT_NAMES[n % BOT_NAMES.length],
      walletBalance: 0,
      language: 'en',
      isBot: true,
      createdAt: iso(now - randInt(1, 40) * DAY),
    }
    users.push(user)
    return user
  }

  function namedUser(id: string, phone: string, name: string): User {
    const existing = users.find((u) => u.id === id)
    if (existing) return existing
    const user: User = {
      id,
      phone,
      name,
      walletBalance: 0,
      language: 'en',
      createdAt: iso(now - 12 * DAY),
    }
    users.push(user)
    return user
  }

  function addPayment(input: {
    auctionId: string
    user: User
    status: PaymentStatus
    createdAt: number
    confirmedAt?: number
    note?: string
    replayed?: boolean
  }): Payment {
    const n = ++paymentSeq
    const payment: Payment = {
      id: `pay-${String(n).padStart(4, '0')}`,
      ref: `MP${(180000 + n * 7919).toString(36).toUpperCase()}`,
      auctionId: input.auctionId,
      userId: input.user.id,
      phone: input.user.phone,
      amount: 0,
      status: input.status,
      createdAt: iso(input.createdAt),
      confirmedAt: input.confirmedAt ? iso(input.confirmedAt) : undefined,
      note: input.note,
      replayed: input.replayed,
    }
    payments.push(payment)
    return payment
  }

  function addEntry(input: {
    auctionId: string
    user: User
    payment: Payment
    createdAt: number
    status?: EntryStatus
    isBot?: boolean
  }): Entry {
    const entry: Entry = {
      id: `ent-${String(++entrySeq).padStart(4, '0')}`,
      auctionId: input.auctionId,
      userId: input.user.id,
      paymentId: input.payment.id,
      createdAt: iso(input.createdAt),
      status: input.status ?? 'active',
      isBot: input.isBot ?? input.user.isBot,
    }
    entries.push(entry)
    return entry
  }

  function addBid(auction: Auction, entry: Entry, amount: number, timestamp: number): Bid {
    const salt = randomSalt(8)
    const ts = iso(timestamp)
    const bid: Bid = {
      id: `bid-${String(++bidSeq).padStart(4, '0')}`,
      auctionId: auction.id,
      entryId: entry.id,
      userId: entry.userId,
      amount: round2(amount),
      timestamp: ts,
      salt,
      hash: hashBid({
        auctionId: auction.id,
        userId: entry.userId,
        amount: round2(amount),
        timestamp: ts,
        salt,
      }),
      valid: true,
    }
    bids.push(bid)
    entry.bidId = bid.id
    return bid
  }

  function addRefund(input: {
    auctionId: string
    entry?: Entry
    payment?: Payment
    user: User
    amount: number
    reason: RefundReason
    status: RefundStatus
    createdAt: number
    note?: string
  }): Refund {
    const refund: Refund = {
      id: `ref-${String(++refundSeq).padStart(4, '0')}`,
      auctionId: input.auctionId,
      entryId: input.entry?.id,
      paymentId: input.payment?.id,
      userId: input.user.id,
      amount: input.amount,
      reason: input.reason,
      status: input.status,
      createdAt: iso(input.createdAt),
      processedAt: input.status === 'processed' ? iso(input.createdAt + 2 * HOUR) : undefined,
      note: input.note,
    }
    refunds.push(refund)
    return refund
  }

  function addAudit(input: {
    auctionId: string
    type: AuditType
    actor: string
    message: string
    timestamp: number
    hash?: string
    meta?: Record<string, string | number | boolean | null>
  }): AuditEvent {
    const event: AuditEvent = {
      id: `aud-${String(++auditSeq).padStart(5, '0')}`,
      auctionId: input.auctionId,
      type: input.type,
      actor: input.actor,
      message: input.message,
      timestamp: iso(input.timestamp),
      hash: input.hash,
      meta: input.meta,
    }
    audit.push(event)
    return event
  }

  function addNotification(input: {
    userId: string
    kind: NotificationKind
    title: string
    titleAm: string
    body: string
    bodyAm: string
    createdAt: number
    read?: boolean
    sms?: boolean
    auctionId?: string
  }): Notification {
    const notification: Notification = {
      id: `ntf-${String(++notifSeq).padStart(4, '0')}`,
      userId: input.userId,
      kind: input.kind,
      title: input.title,
      titleAm: input.titleAm,
      body: input.body,
      bodyAm: input.bodyAm,
      createdAt: iso(input.createdAt),
      read: input.read ?? false,
      sms: input.sms ?? false,
      auctionId: input.auctionId,
    }
    notifications.push(notification)
    return notification
  }

  /* ---------------------------------------------------------------- */
  /* Auctions                                                          */
  /* ---------------------------------------------------------------- */

  const auctions: Auction[] = [
    {
      id: 'smartphone',
      title: 'Flagship Smartphone',
      titleAm: 'ፍላግሺፕ ስማርትፎን',
      description:
        'A 6.7-inch flagship with a triple camera, 256GB storage, all-day battery and 5G. Sealed box, one-year official warranty and free delivery inside Addis Ababa.',
      descriptionAm:
        '6.7 ኢንች ማሳያ፣ ሶስት ካሜራ፣ 256GB ማከማቻ፣ ሙሉ ቀን የሚቆይ ባትሪ እና 5G ያለው ከፍተኛ ደረጃ ስማርትፎን። አዲስ ሳጥን፣ የአንድ ዓመት ዋስትና እና በአዲስ አበባ ነጻ ማድረስ።',
      category: 'Phones',
      image: IMG.phone[0],
      gallery: IMG.phone,
      retailValue: 20000,
      entryFee: 20,
      bidMin: 0.01,
      bidMax: 500,
      bidStep: 0.01,
      minEntries: 1000,
      maxEntriesPerUser: 3,
      startAt: iso(now - 4 * DAY),
      endAt: iso(now + 2 * HOUR + 14 * MIN + 36_000),
      status: 'live',
      createdAt: iso(now - 5 * DAY),
    },
    {
      id: 'laptop',
      title: 'Gaming Laptop',
      titleAm: 'ጌሚንግ ላፕቶፕ',
      description:
        'A 15-inch gaming laptop with a 144Hz display, RTX graphics, 16GB RAM and a 1TB SSD. Built for editing, design and late-night gaming sessions.',
      descriptionAm:
        '15 ኢንች 144Hz ማሳያ፣ RTX ግራፊክስ፣ 16GB RAM እና 1TB SSD ያለው የጨዋታ ላፕቶፕ። ለስራ፣ ለንድፍ እና ለጨዋታ የተዘጋጀ።',
      category: 'Computers',
      image: IMG.laptop[0],
      gallery: IMG.laptop,
      retailValue: 65000,
      entryFee: 15,
      bidMin: 0.01,
      bidMax: 500,
      bidStep: 0.01,
      minEntries: 800,
      maxEntriesPerUser: 3,
      startAt: iso(now - 5 * DAY),
      endAt: iso(now + 42 * MIN + 10_000),
      status: 'live',
      createdAt: iso(now - 6 * DAY),
    },
    {
      id: 'tv',
      title: 'Smart TV 55"',
      titleAm: 'ስማርት ቲቪ 55 ኢንች',
      description:
        'A 55-inch 4K smart TV with HDR, built-in streaming apps and a slim bezel. Comes with a wall bracket, remote and a 2-year warranty.',
      descriptionAm:
        '55 ኢንች 4K ስማርት ቲቪ፣ HDR፣ አብሮ የተሰራ ስትሪሚንግ እና ቀጭን ጠርዝ። የግድግዳ ማስያዣ፣ ሪሞት እና የ2 ዓመት ዋስትና ይገኙበታል።',
      category: 'Home',
      image: IMG.tv[0],
      gallery: IMG.tv,
      retailValue: 28000,
      entryFee: 10,
      bidMin: 0.01,
      bidMax: 500,
      bidStep: 0.01,
      minEntries: 500,
      maxEntriesPerUser: 3,
      startAt: iso(now - 2 * DAY),
      endAt: iso(now + 5 * HOUR + 12 * MIN),
      status: 'live',
      createdAt: iso(now - 3 * DAY),
    },
    {
      id: 'earbuds',
      title: 'Wireless Earbuds',
      titleAm: 'ሽቦ አልባ ጆሮ ማዳመጫዎች',
      description:
        'Compact noise-cancelling earbuds with a 30-hour charging case, crystal-clear calls and IPX5 water resistance. Perfect for the commute.',
      descriptionAm:
        'ድምጽ የሚቀንሱ፣ 30 ሰዓት የሚቆይ የቻርጅ ሳጥን፣ ግልጽ ጥሪ እና IPX5 የውሃ መቋቋም ያላቸው ጆሮ ማዳመጫዎች።',
      category: 'Audio',
      image: IMG.earbuds[0],
      gallery: IMG.earbuds,
      retailValue: 4500,
      entryFee: 5,
      bidMin: 0.01,
      bidMax: 300,
      bidStep: 0.01,
      minEntries: 400,
      maxEntriesPerUser: 3,
      startAt: iso(now + 1 * DAY),
      endAt: iso(now + 3 * DAY),
      status: 'upcoming',
      createdAt: iso(now - 1 * DAY),
    },
    {
      id: 'espresso',
      title: 'Kitchen Espresso Machine',
      titleAm: 'የኩሽና ኤስፕሬሶ ማሽን',
      description:
        'A compact 15-bar espresso machine with a milk frother, removable water tank and stainless steel finish. Fresh coffee at home, every morning.',
      descriptionAm:
        '15-bar ኤስፕሬሶ ማሽን፣ ወተት አረፋ ማድረጊያ፣ የሚወጣ የውሃ ታንክ እና አይዝጌ ብረት አጨራረስ። በየጠዋቱ ትኩስ ቡና።',
      category: 'Kitchen',
      image: IMG.espresso[0],
      gallery: IMG.espresso,
      retailValue: 12000,
      entryFee: 10,
      bidMin: 0.01,
      bidMax: 500,
      bidStep: 0.01,
      minEntries: 300,
      maxEntriesPerUser: 3,
      startAt: iso(now + 2 * DAY),
      endAt: iso(now + 5 * DAY),
      status: 'upcoming',
      createdAt: iso(now - 2 * DAY),
    },
    {
      id: 'voucher',
      title: 'Shopping Gift Voucher',
      titleAm: 'የግዢ ስጦታ ቫውቸር',
      description:
        'A ETB 5,000 gift voucher valid at partner electronics and home stores across Addis Ababa. Delivered digitally after verification.',
      descriptionAm:
        'በአዲስ አበባ በሚገኙ የኤሌክትሮኒክስ እና የቤት ዕቃ መሸጫዎች የሚሰራ የ ETB 5,000 ስጦታ ቫውቸር። ከማረጋገጫ በኋላ በዲጂታል መንገድ ይደርሳል።',
      category: 'Vouchers',
      image: IMG.voucher[0],
      gallery: IMG.voucher,
      retailValue: 5000,
      entryFee: 5,
      bidMin: 0.01,
      bidMax: 100,
      bidStep: 0.01,
      minEntries: 5,
      maxEntriesPerUser: 3,
      startAt: iso(now - 6 * DAY),
      endAt: iso(now - 2 * DAY),
      status: 'closed',
      createdAt: iso(now - 7 * DAY),
      closedAt: iso(now - 2 * DAY),
      closeReason: 'scheduled',
    },
    {
      id: 'watch',
      title: 'Fitness Smart Watch',
      titleAm: 'የአካል ብቃት ስማርት ሰዓት',
      description:
        'A lightweight smart watch with heart-rate tracking, GPS, sleep insights and a seven-day battery. Includes two interchangeable straps.',
      descriptionAm:
        'የልብ ምት መከታተያ፣ GPS፣ የእንቅልፍ መረጃ እና ሰባት ቀን የሚቆይ ባትሪ ያለው ቀላል ስማርት ሰዓት። ሁለት የሚቀያየሩ ማሰሪያዎች አብረውት ይመጣሉ።',
      category: 'Wearables',
      image: IMG.watch[0],
      gallery: IMG.watch,
      retailValue: 7000,
      entryFee: 5,
      bidMin: 0.01,
      bidMax: 100,
      bidStep: 0.01,
      minEntries: 4,
      maxEntriesPerUser: 3,
      startAt: iso(now - 8 * DAY),
      endAt: iso(now - 4 * DAY),
      status: 'void',
      createdAt: iso(now - 9 * DAY),
      closedAt: iso(now - 4 * DAY),
      closeReason: 'void',
    },
    {
      id: 'coffee',
      title: 'Bean-to-Cup Coffee Machine',
      titleAm: 'ቡና ማሽን',
      description:
        'A bean-to-cup coffee machine with a built-in grinder, six drink presets and a self-cleaning cycle. A small café for your kitchen.',
      descriptionAm:
        'አብሮ የተሰራ መፍጫ፣ ስድስት የመጠጥ አማራጮች እና ራሱን የሚያጸዳ ቡና ማሽን። ለኩሽናዎ ትንሽ ካፌ።',
      category: 'Kitchen',
      image: IMG.coffee[0],
      gallery: IMG.coffee,
      retailValue: 12000,
      entryFee: 10,
      bidMin: 0.01,
      bidMax: 500,
      bidStep: 0.01,
      minEntries: 200,
      maxEntriesPerUser: 3,
      startAt: iso(now - 9 * DAY),
      endAt: iso(now - 5 * DAY),
      status: 'cancelled',
      createdAt: iso(now - 10 * DAY),
      closedAt: iso(now - 5 * DAY),
      closeReason: 'min_entries',
    },
    {
      id: 'speaker',
      title: 'Portable Bluetooth Speaker',
      titleAm: 'ተንቀሳቃሽ ብሉቱዝ ስፒከር',
      description:
        'A waterproof portable speaker with 24-hour battery life, deep bass and a built-in strap. Great for picnics and road trips.',
      descriptionAm:
        'የውሃ የማይገባው ተንቀሳቃሽ ስፒከር፣ 24 ሰዓት ባትሪ፣ ጥልቅ ባስ እና አብሮ የተሰራ ማሰሪያ። ለጉዞ እና ለውጪ ምርጥ።',
      category: 'Audio',
      image: IMG.speaker[0],
      gallery: IMG.speaker,
      retailValue: 3500,
      entryFee: 5,
      bidMin: 0.01,
      bidMax: 100,
      bidStep: 0.01,
      minEntries: 10,
      maxEntriesPerUser: 3,
      startAt: iso(now - 12 * DAY),
      endAt: iso(now - 7 * DAY),
      status: 'closed',
      createdAt: iso(now - 13 * DAY),
      closedAt: iso(now - 7 * DAY),
      closeReason: 'scheduled',
    },
  ]

  const byId = (id: string) => auctions.find((a) => a.id === id) as Auction

  for (const auction of auctions) {
    auction.economics = {
      productCost: Math.round(auction.retailValue * 0.62),
      vatPct: 15,
      paymentFeePct: 1,
      refundReservePct: 1,
      revenueSharePct: 10,
      deliveryCost: 350,
      marketingPct: 5,
      supportCost: 1800,
      hostingCost: 650,
    }
    addAudit({
      auctionId: auction.id,
      type: 'auction.created',
      actor: 'Admin · Sara M.',
      message: `Auction "${auction.title}" created with an entry fee of ETB ${auction.entryFee}.`,
      timestamp: new Date(auction.createdAt).getTime(),
      meta: { entryFee: auction.entryFee, minEntries: auction.minEntries },
    })
  }

  /* ---------------------------------------------------------------- */
  /* Live auctions with bot participants                                */
  /* ---------------------------------------------------------------- */

  function seedLive(auction: Auction, targetEntries: number, currentEntry?: Entry) {
    const start = new Date(auction.startAt).getTime()
    const end = Math.min(now - 45 * MIN, new Date(auction.endAt).getTime() - 20 * MIN)
    const createTime = () => randBetween(start + 10 * MIN, Math.max(start + 20 * MIN, end))
    const currentCount = entries.filter((e) => e.auctionId === auction.id).length
    const botsNeeded = Math.max(0, targetEntries - currentCount)
    const preset = [0.05, 0.05, 0.09, 0.09]

    for (let i = 0; i < botsNeeded; i++) {
      const bot = createBotUser()
      const createdAt = createTime()
      const payment = addPayment({
        auctionId: auction.id,
        user: bot,
        status: 'success',
        createdAt,
        confirmedAt: createdAt + randInt(9, 38) * 1000,
      })
      payment.amount = auction.entryFee
      const entry = addEntry({
        auctionId: auction.id,
        user: bot,
        payment,
        createdAt: createdAt + 15_000,
      })

      if (i !== 17) {
        const amount =
          i < preset.length
            ? preset[i]
            : round2(Math.min(auction.bidMax, 0.13 + rng() * (auction.bidMax - 0.13)))
        const bid = addBid(auction, entry, amount, createdAt + randInt(30, 900) * 1000)
        if (i < 4) {
          addAudit({
            auctionId: auction.id,
            type: 'bid.locked',
            actor: 'System',
            message: `Sealed bid locked for entry ${entry.id}.`,
            timestamp: new Date(bid.timestamp).getTime(),
            hash: bid.hash,
          })
        }
      }
      if (i < 3) {
        addAudit({
          auctionId: auction.id,
          type: 'payment.confirmed',
          actor: 'M-PESA simulator',
          message: `Payment ${payment.ref} confirmed for ETB ${auction.entryFee}.`,
          timestamp: new Date(payment.confirmedAt as string).getTime(),
          meta: { ref: payment.ref },
        })
      }
    }

    // One successful payment without a bid → unspent credit / reconciliation mismatch.
    const noBidUser = createBotUser()
    const noBidAt = createTime()
    const noBidPayment = addPayment({
      auctionId: auction.id,
      user: noBidUser,
      status: 'success',
      createdAt: noBidAt,
      confirmedAt: noBidAt + 18_000,
      note: 'Payment succeeded, bid not submitted',
    })
    noBidPayment.amount = auction.entryFee
    addEntry({
      auctionId: auction.id,
      user: noBidUser,
      payment: noBidPayment,
      createdAt: noBidAt + 20_000,
      status: 'unspent',
    })

    // One successful payment with no entry at all → reconciliation mismatch.
    const orphanUser = createBotUser()
    const orphanPayment = addPayment({
      auctionId: auction.id,
      user: orphanUser,
      status: 'success',
      createdAt: createTime(),
      confirmedAt: now - 30 * MIN,
      note: 'Callback received twice; ignored after idempotency check',
      replayed: true,
    })
    orphanPayment.amount = auction.entryFee
    ignoredEvents.push({
      id: `ign-${auction.id}-1`,
      ref: orphanPayment.ref,
      paymentId: orphanPayment.id,
      reason: 'Duplicate payment callback ignored',
      createdAt: iso(now - 29 * MIN),
      note: `Same idempotency key replayed. Existing success event was kept; no second entry was created.`,
    })

    // Unsuccessful payment attempts for chart realism.
    const failureStatuses: PaymentStatus[] = ['failed', 'failed', 'timeout', 'cancelled']
    for (const [index, status] of failureStatuses.entries()) {
      const user = createBotUser()
      const p = addPayment({
        auctionId: auction.id,
        user,
        status,
        createdAt: now - (index + 1) * 3 * HOUR - randInt(0, 40) * MIN,
        note:
          status === 'failed'
            ? 'Insufficient funds'
            : status === 'timeout'
              ? 'Customer did not approve the STK push in time'
              : 'Customer cancelled the prompt',
      })
      p.amount = auction.entryFee
    }

    // One reversed payment while the entry is still active → reconciliation mismatch.
    if (auction.id === 'smartphone') {
      const botEntries = entries.filter((e) => e.auctionId === auction.id && e.bidId)
      const target = botEntries[24]
      if (target) {
        const payment = payments.find((p) => p.id === target.paymentId)
        if (payment) {
          payment.status = 'reversed'
          payment.note = 'Reversed by provider after a dispute'
          addRefund({
            auctionId: auction.id,
            entry: target,
            payment,
            user: users.find((u) => u.id === target.userId) as User,
            amount: auction.entryFee,
            reason: 'reversed',
            status: 'pending',
            createdAt: now - 2 * HOUR,
            note: 'Provider reversal — entry should have been invalidated',
          })
          addAudit({
            auctionId: auction.id,
            type: 'payment.reversed',
            actor: 'M-PESA simulator',
            message: `Payment ${payment.ref} reversed. Bid on entry ${target.id} is flagged for review.`,
            timestamp: now - 2 * HOUR,
          })
        }
      }
    }
  }

  const smartphone = byId('smartphone')
  const laptop = byId('laptop')
  const tv = byId('tv')

  // Demo user's active entry on the smartphone.
  {
    const paidAt = now - 1 * DAY
    const payment = addPayment({
      auctionId: smartphone.id,
      user: demoUser,
      status: 'success',
      createdAt: paidAt,
      confirmedAt: paidAt + 14_000,
    })
    payment.amount = smartphone.entryFee
    const entry = addEntry({
      auctionId: smartphone.id,
      user: demoUser,
      payment,
      createdAt: paidAt + 16_000,
    })
    const bid = addBid(smartphone, entry, 0.08, paidAt + 3 * MIN)
    addAudit({
      auctionId: smartphone.id,
      type: 'bid.locked',
      actor: 'User · Selam T.',
      message: 'Sealed bid locked and hashed for the demo user.',
      timestamp: new Date(bid.timestamp).getTime(),
      hash: bid.hash,
    })
    addNotification({
      userId: demoUser.id,
      kind: 'entry',
      title: 'Entry confirmed',
      titleAm: 'ግቤትዎ ተረጋግጧል',
      body: `Your ETB ${smartphone.entryFee} entry for ${smartphone.title} is confirmed. Submit your sealed bid before the auction closes.`,
      bodyAm: `ለ${smartphone.titleAm} የፈጸሙት ETB ${smartphone.entryFee} ግቤት ተረጋግጧል። ጨረታው ከመዘጋቱ በፊት ሚስጥራዊ ጨረታዎን ያስገቡ።`,
      createdAt: paidAt + 20_000,
      read: true,
      sms: true,
      auctionId: smartphone.id,
    })
  }

  seedLive(smartphone, 542)
  seedLive(laptop, 642)
  seedLive(tv, 316)

  /* ---------------------------------------------------------------- */
  /* Closed auction — exact worked example                              */
  /* Bids: A .05, B .05, C .07, D .09, E .09, F .12 → C wins .07       */
  /* ---------------------------------------------------------------- */

  {
    const auction = byId('voucher')
    const closedAt = new Date(auction.closedAt as string).getTime()
    const people = [
      namedUser('u-work-a', '+251711000001', 'Abel A.'),
      namedUser('u-work-b', '+251711000002', 'Birtukan B.'),
      demoUser,
      namedUser('u-work-d', '+251711000004', 'Dawit D.'),
      namedUser('u-work-e', '+251711000005', 'Eyerusalem E.'),
      namedUser('u-work-f', '+251711000006', 'Fikru F.'),
    ]
    const amounts = [0.05, 0.05, 0.07, 0.09, 0.09, 0.12]
    const made: Entry[] = []
    people.forEach((person, i) => {
      const paidAt = closedAt - (6 - i) * 2 * HOUR
      const payment = addPayment({
        auctionId: auction.id,
        user: person,
        status: 'success',
        createdAt: paidAt,
        confirmedAt: paidAt + randInt(11, 34) * 1000,
      })
      payment.amount = auction.entryFee
      const entry = addEntry({
        auctionId: auction.id,
        user: person,
        payment,
        createdAt: paidAt + 20_000,
        isBot: person.id !== demoUser.id,
      })
      const bid = addBid(auction, entry, amounts[i], paidAt + 4 * MIN)
      made.push(entry)
      addAudit({
        auctionId: auction.id,
        type: 'payment.confirmed',
        actor: 'M-PESA simulator',
        message: `Payment ${payment.ref} confirmed for ETB ${auction.entryFee}.`,
        timestamp: paidAt + 20_000,
      })
      addAudit({
        auctionId: auction.id,
        type: 'bid.locked',
        actor: person.id === demoUser.id ? 'User · Selam T.' : 'System',
        message: `Sealed bid locked at ETB ${amounts[i].toFixed(2)}.`,
        timestamp: paidAt + 4 * MIN,
        hash: bid.hash,
      })
    })

    const c = made[2]
    const f = made[5]
    made[0].status = 'not_unique'
    made[1].status = 'not_unique'
    c.status = 'won'
    made[3].status = 'not_unique'
    made[4].status = 'not_unique'
    f.status = 'lost'
    auction.winnerEntryId = c.id
    auction.winningAmount = 0.07

    winners.push({
      auctionId: auction.id,
      entryId: c.id,
      userId: demoUser.id,
      amount: 0.07,
      verification: 'pending',
      fulfilment: 'none',
      deadlineAt: iso(closedAt + 7 * DAY),
      createdAt: iso(closedAt + 2 * MIN),
      updatedAt: iso(closedAt + 2 * MIN),
    })

    addAudit({
      auctionId: auction.id,
      type: 'auction.closed',
      actor: 'System',
      message: 'Auction closed with 6 entries. Minimum of 5 entries reached.',
      timestamp: closedAt,
    })
    addAudit({
      auctionId: auction.id,
      type: 'winner.calculated',
      actor: 'Auction engine',
      message:
        'Grouped 6 bids: 0.05×2, 0.07×1, 0.09×2, 0.12×1. Duplicates eliminated. Lowest unique bid = ETB 0.07. Winner: entry C.',
      timestamp: closedAt + 60_000,
      meta: { winningAmount: 0.07, uniqueBids: 2 },
    })
    addNotification({
      userId: demoUser.id,
      kind: 'won',
      title: 'You won the gift voucher!',
      titleAm: 'የስጦታ ቫውቸሩን አሸንፈዋል!',
      body: 'Congratulations! Your unique bid of ETB 0.07 won the ETB 5,000 shopping gift voucher. Verify your ID within 7 days to claim it.',
      bodyAm: 'እንኳን ደስ አለዎት! የ ETB 0.07 ልዩ ጨረታዎ የ ETB 5,000 የግዢ ስጦታ ቫውቸርን አሸንፏል። ለመረከብ በ7 ቀናት ውስጥ መታወቂያዎን ያረጋግጡ።',
      createdAt: closedAt + 3 * MIN,
      sms: true,
      auctionId: auction.id,
    })
  }

  /* ---------------------------------------------------------------- */
  /* Closed VOID auction — no unique bid                                */
  /* ---------------------------------------------------------------- */

  {
    const auction = byId('watch')
    const closedAt = new Date(auction.closedAt as string).getTime()
    const people = [
      namedUser('u-void-a', '+251722000011', 'Genet A.'),
      namedUser('u-void-b', '+251722000012', 'Hagos B.'),
      namedUser('u-void-c', '+251722000013', 'Iman C.'),
      demoUser,
    ]
    const amounts = [0.1, 0.1, 0.12, 0.12]
    const made: Entry[] = []
    people.forEach((person, i) => {
      const paidAt = closedAt - (4 - i) * 3 * HOUR
      const payment = addPayment({
        auctionId: auction.id,
        user: person,
        status: 'success',
        createdAt: paidAt,
        confirmedAt: paidAt + 21_000,
      })
      payment.amount = auction.entryFee
      const entry = addEntry({
        auctionId: auction.id,
        user: person,
        payment,
        createdAt: paidAt + 24_000,
        isBot: person.id !== demoUser.id,
      })
      addBid(auction, entry, amounts[i], paidAt + 5 * MIN)
      made.push(entry)
    })

    made[0].status = 'refunded'
    made[1].status = 'void'
    made[2].status = 'refunded'
    made[3].status = 'void'

    addRefund({
      auctionId: auction.id,
      entry: made[0],
      user: people[0],
      amount: auction.entryFee,
      reason: 'void',
      status: 'processed',
      createdAt: closedAt + 5 * MIN,
    })
    addRefund({
      auctionId: auction.id,
      entry: made[1],
      user: people[1],
      amount: auction.entryFee,
      reason: 'void',
      status: 'pending',
      createdAt: closedAt + 5 * MIN,
    })
    addRefund({
      auctionId: auction.id,
      entry: made[2],
      user: people[2],
      amount: auction.entryFee,
      reason: 'void',
      status: 'processed',
      createdAt: closedAt + 5 * MIN,
    })
    addRefund({
      auctionId: auction.id,
      entry: made[3],
      user: demoUser,
      amount: auction.entryFee,
      reason: 'void',
      status: 'pending',
      createdAt: closedAt + 5 * MIN,
    })

    addAudit({
      auctionId: auction.id,
      type: 'auction.closed',
      actor: 'System',
      message: 'Auction closed with 4 entries. Minimum of 4 entries reached.',
      timestamp: closedAt,
    })
    addAudit({
      auctionId: auction.id,
      type: 'winner.calculated',
      actor: 'Auction engine',
      message:
        'Grouped 4 bids: 0.10×2, 0.12×2. Every amount was duplicated, so no unique bid exists. Auction marked VOID.',
      timestamp: closedAt + 60_000,
      meta: { winningAmount: null, uniqueBids: 0 },
    })
    addAudit({
      auctionId: auction.id,
      type: 'refund.created',
      actor: 'System',
      message: '4 entry fees queued for refund after the auction was marked VOID.',
      timestamp: closedAt + 6 * MIN,
    })
    addNotification({
      userId: demoUser.id,
      kind: 'refund',
      title: 'Auction void — refund on the way',
      titleAm: 'ጨረታው ዋጋ የለውም — ተመላሽ በመንገድ ላይ',
      body: 'The fitness smart watch auction ended without a unique bid. Your ETB 5 entry fee is queued for a refund.',
      bodyAm: 'የአካል ብቃት ስማርት ሰዓቱ ጨረታ ልዩ ጨረታ ስላልነበረው ተዘግቷል። የ ETB 5 የመግቢያ ክፍያዎ ለተመላሽ ተመዝግቧል።',
      createdAt: closedAt + 7 * MIN,
      sms: true,
      auctionId: auction.id,
    })
  }

  /* ---------------------------------------------------------------- */
  /* Cancelled auction — minimum entries not reached                    */
  /* ---------------------------------------------------------------- */

  {
    const auction = byId('coffee')
    const closedAt = new Date(auction.closedAt as string).getTime()
    const made: Entry[] = []
    for (let i = 0; i < 8; i++) {
      const person = i === 2 ? demoUser : createBotUser()
      const paidAt = closedAt - (8 - i) * 5 * HOUR
      const payment = addPayment({
        auctionId: auction.id,
        user: person,
        status: 'success',
        createdAt: paidAt,
        confirmedAt: paidAt + randInt(10, 29) * 1000,
      })
      payment.amount = auction.entryFee
      const entry = addEntry({
        auctionId: auction.id,
        user: person,
        payment,
        createdAt: paidAt + 20_000,
        status: 'cancelled',
        isBot: person.id !== demoUser.id,
      })
      addBid(
        auction,
        entry,
        round2(0.2 + rng() * 120),
        paidAt + 6 * MIN,
      )
      made.push(entry)
    }

    for (let i = 0; i < made.length; i++) {
      const entry = made[i]
      const user = users.find((u) => u.id === entry.userId) as User
      const processed = i === 2 || i === 4 || i === 6
      if (processed) entry.status = 'refunded'
      addRefund({
        auctionId: auction.id,
        entry,
        user,
        amount: auction.entryFee,
        reason: 'cancelled',
        status: processed ? 'processed' : 'pending',
        createdAt: closedAt + 4 * MIN,
        note: 'Minimum entries not reached',
      })
    }

    addAudit({
      auctionId: auction.id,
      type: 'auction.cancelled',
      actor: 'System',
      message: 'Auction cancelled at close: 8 entries, below the minimum of 200.',
      timestamp: closedAt,
    })
    addAudit({
      auctionId: auction.id,
      type: 'refund.created',
      actor: 'System',
      message: '8 entry fees queued for refund after cancellation.',
      timestamp: closedAt + 5 * MIN,
    })
    addNotification({
      userId: demoUser.id,
      kind: 'refund',
      title: 'Refund issued — ETB 10',
      titleAm: 'ተመላሽ ተደርጓል — ETB 10',
      body: 'The bean-to-cup coffee machine auction was cancelled because it did not reach 200 entries. Your ETB 10 entry fee has been refunded to your wallet.',
      bodyAm: 'የቡና ማሽኑ ጨረታ 200 ግቤቶችን ስላላሳካ ተሰርዟል። የ ETB 10 የመግቢያ ክፍያዎ ወደ ኪስ ቦርሳዎ ተመላሽ ተደርጓል።',
      createdAt: closedAt + 2 * HOUR,
      sms: true,
      auctionId: auction.id,
    })
  }

  /* ---------------------------------------------------------------- */
  /* Closed auction with a bot winner — used in fulfilment              */
  /* ---------------------------------------------------------------- */

  {
    const auction = byId('speaker')
    const closedAt = new Date(auction.closedAt as string).getTime()
    const made: Entry[] = []
    for (let i = 0; i < 34; i++) {
      const person = i === 0 ? demoUser : createBotUser()
      const paidAt = closedAt - (34 - i) * 4 * HOUR
      const payment = addPayment({
        auctionId: auction.id,
        user: person,
        status: 'success',
        createdAt: paidAt,
        confirmedAt: paidAt + randInt(8, 32) * 1000,
      })
      payment.amount = auction.entryFee
      const entry = addEntry({
        auctionId: auction.id,
        user: person,
        payment,
        createdAt: paidAt + 18_000,
        isBot: person.id !== demoUser.id,
      })
      const amount =
        i === 0 || i === 1
          ? 0.01
          : i === 2 || i === 3
            ? 0.02
            : i === 4
              ? 0.03
              : round2(0.04 + rng() * 20)
      addBid(auction, entry, amount, paidAt + 7 * MIN)
      made.push(entry)
    }

    const winnerEntry = made[4]
    const winnerUser = users.find((u) => u.id === winnerEntry.userId) as User
    auction.winnerEntryId = winnerEntry.id
    auction.winningAmount = 0.03
    made.forEach((entry) => {
      const amount = entry.bidId ? bids.find((b) => b.id === entry.bidId)?.amount : undefined
      if (entry.id === winnerEntry.id) entry.status = 'won'
      else if (amount === 0.01 || amount === 0.02) entry.status = 'not_unique'
      else entry.status = 'lost'
    })

    winners.push({
      auctionId: auction.id,
      entryId: winnerEntry.id,
      userId: winnerUser.id,
      amount: 0.03,
      verification: 'verified',
      fulfilment: 'dispatched',
      method: 'delivery',
      address: 'Bole Road, Woreda 03, Addis Ababa',
      deadlineAt: iso(closedAt + 7 * DAY),
      createdAt: iso(closedAt + 3 * MIN),
      updatedAt: iso(now - 2 * DAY),
    })

    addAudit({
      auctionId: auction.id,
      type: 'auction.closed',
      actor: 'System',
      message: 'Auction closed with 34 entries. Minimum of 10 entries reached.',
      timestamp: closedAt,
    })
    addAudit({
      auctionId: auction.id,
      type: 'winner.calculated',
      actor: 'Auction engine',
      message:
        'Grouped 34 bids. Duplicates at 0.01 and 0.02 were eliminated. Lowest unique bid = ETB 0.03.',
      timestamp: closedAt + 60_000,
      meta: { winningAmount: 0.03 },
    })
    addAudit({
      auctionId: auction.id,
      type: 'identity.verified',
      actor: 'Admin · Sara M.',
      message: `Winner ${winnerUser.name} verified with a national ID.`,
      timestamp: closedAt + 1 * DAY,
    })
    addAudit({
      auctionId: auction.id,
      type: 'fulfilment.updated',
      actor: 'Admin · Sara M.',
      message: 'Fulfilment advanced to Dispatched via courier. Tracking note: ADD-4481.',
      timestamp: now - 2 * DAY,
      meta: { status: 'dispatched' },
    })
  }

  /* ---------------------------------------------------------------- */
  /* Extra payments / replayed callbacks                                */
  /* ---------------------------------------------------------------- */

  for (const auction of [smartphone, laptop, tv]) {
    const ref = `MP${(900000 + auction.id.length * 137).toString(36).toUpperCase()}`
    ignoredEvents.push({
      id: `ign-${auction.id}-2`,
      ref,
      reason: 'Duplicate STK callback ignored',
      createdAt: iso(now - 6 * HOUR),
      note: 'The idempotency key was already processed. No new entry or bid was created.',
    })
  }

  /* ---------------------------------------------------------------- */
  /* Remaining notifications and fulfilment updates                    */
  /* ---------------------------------------------------------------- */

  addNotification({
    userId: demoUser.id,
    kind: 'closing',
    title: 'Gaming Laptop closes soon',
    titleAm: 'ጌሚንግ ላፕቶፕ በቅርቡ ይዘጋል',
    body: 'The Gaming Laptop auction closes in less than an hour. Sealed bids lock as soon as the timer reaches zero.',
    bodyAm: 'የጌሚንግ ላፕቶፕ ጨረታ ከአንድ ሰዓት ባነሰ ጊዜ ውስጥ ይዘጋል። ጊዜው ሲያልቅ ጨረታዎች ይቆለፋሉ።',
    createdAt: now - 20 * MIN,
    sms: true,
    auctionId: laptop.id,
  })
  addNotification({
    userId: demoUser.id,
    kind: 'system',
    title: 'Welcome to How Low',
    titleAm: 'ወደ How Low እንኳን ደህና መጡ',
    body: 'Bid small, win big. Pay a small entry fee, submit one sealed bid, and the lowest unique bid wins the product.',
    bodyAm: 'ትንሽ ይጫረቱ፣ በትልቁ ያሸንፉ። ትንሽ የመግቢያ ክፍያ ይክፈሉ፣ አንድ ሚስጥራዊ ጨረታ ያስገቡ፣ ዝቅተኛው ልዩ ጨረታ ሽልማቱን ያሸንፋል።',
    createdAt: now - 3 * DAY,
    read: true,
    sms: false,
  })
  addNotification({
    userId: demoUser.id,
    kind: 'fulfilment',
    title: 'Your prize is on the way',
    titleAm: 'ሽልማትዎ በመንገድ ላይ ነው',
    body: 'Your gift voucher is ready for verification. Choose delivery or pickup to complete fulfilment.',
    bodyAm: 'የስጦታ ቫውቸርዎ ለማረጋገጫ ዝግጁ ነው። ማድረስ ወይም መረከብ በመምረጥ ሂደቱን ያጠናቅቁ።',
    createdAt: now - 1 * DAY,
    sms: false,
    auctionId: 'voucher',
  })

  const settings: Settings = {
    revenueSharePct: 10,
    vatPct: 15,
    paymentFeePct: 1,
    defaultMaxEntries: 3,
    defaultMinEntries: 500,
  }

  return {
    version: 1,
    seedAt: iso(now),
    users,
    auctions,
    payments,
    entries,
    bids,
    refunds,
    winners,
    notifications,
    audit,
    ignoredEvents,
    settings,
    currentUserId: demoUser.id,
    language: 'en',
    adminAuthed: true,
    guided: { active: false, step: 0 },
  }
}

/** Convenience for the zero-state time helper used by tests/demo controls. */
export const HOUR_MS = HOUR
export const MINUTE_MS = MIN
export const DAY_MS = DAY
