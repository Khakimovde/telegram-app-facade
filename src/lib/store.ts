// ============================
// CENTRAL MOCK DATA STORE
// Cloud-ga ulashga tayyor — hozircha session-based
// ============================

export interface User {
  id: string;
  name: string;
  username: string;
  balance: number;
  referralCount: number;
  referralEarnings: number;
  referredBy: string | null;
  level: number; // 1-5
  levelEmoji: string;
  levelName: string;
  bonusPercent: number;
  joinedAt: string;
  adsWatchedTotal: number;
  auctionWins: number;
}

export interface WithdrawRequest {
  id: string;
  userId: string;
  userName: string;
  userUsername: string;
  tanga: number;
  som: number;
  card: string;
  status: "pending" | "processing" | "success" | "rejected";
  reason?: string;
  date: string;
}

export interface AuctionHistory {
  id: string;
  date: string;
  tickets: number;
  won: boolean;
  prize: number;
}

export interface ChannelTask {
  id: string;
  name: string;
  username: string;
  reward: number;
  completed: boolean;
}

// ---- LEVELS ----
export const LEVELS = [
  { level: 1, emoji: "🌱", name: "Yangi", percent: 5, minReferrals: 0 },
  { level: 2, emoji: "⭐", name: "Faol", percent: 7, minReferrals: 15 },
  { level: 3, emoji: "🔥", name: "Pro", percent: 15, minReferrals: 30 },
  { level: 4, emoji: "💎", name: "Master", percent: 20, minReferrals: 60 },
  { level: 5, emoji: "👑", name: "Elita", percent: 25, minReferrals: 100 },
];

export function getUserLevel(referralCount: number) {
  let lvl = LEVELS[0];
  for (const l of LEVELS) {
    if (referralCount >= l.minReferrals) lvl = l;
  }
  return lvl;
}

// ---- MOCK USERS DB ----
const generateMockUsers = (): User[] => {
  const names = [
    { name: "⭐", username: "@star_user", id: "7411640202" },
    { name: "Гульноза", username: "@gulnoza", id: "7700195650" },
    { name: "Sunnat", username: "@sunnat_dev", id: "7075063524" },
    { name: "Elya", username: "@elya_beauty", id: "8465949496" },
    { name: "🎀🎀🎀🎀", username: "@ribbon4", id: "8512066637" },
    { name: "RUXSOR", username: "@ruxsor_uz", id: "5658498471" },
    { name: "Shahnoza🌊", username: "@shahnoza_wave", id: "6300739524" },
    { name: "Mahliyo", username: "@Mahliyo18092001", id: "8072394096" },
    { name: "BUNYODBEK", username: "@bunyodbek018", id: "5101442240" },
    { name: "A", username: "@tokamiyr", id: "7410033679" },
    { name: "Dilshod", username: "@dilshod_777", id: "6012345678" },
    { name: "Nodira", username: "@nodira_n", id: "6023456789" },
    { name: "Jasur", username: "@jasur_j", id: "6034567890" },
    { name: "Zilola", username: "@zilola_z", id: "6045678901" },
    { name: "Sardor", username: "@sardor_s", id: "6056789012" },
    { name: "Feruza", username: "@feruza_f", id: "6067890123" },
    { name: "Otabek", username: "@otabek_o", id: "6078901234" },
    { name: "Malika", username: "@malika_m", id: "6089012345" },
    { name: "Sherzod", username: "@sherzod_sh", id: "6090123456" },
    { name: "Kamola", username: "@kamola_k", id: "6101234567" },
    { name: "Bekzod", username: "@bekzod_b", id: "6112345678" },
    { name: "Gulbahor", username: "@gulbahor_g", id: "6123456789" },
    { name: "Aziz", username: "@aziz_a", id: "6134567890" },
    { name: "Dilorom", username: "@dilorom_d", id: "6145678901" },
    { name: "Ulugbek", username: "@ulugbek_u", id: "6156789012" },
    { name: "Shahlo", username: "@shahlo_sh", id: "6167890123" },
    { name: "Bobur", username: "@bobur_b", id: "6178901234" },
    { name: "Iroda", username: "@iroda_i", id: "6189012345" },
    { name: "Farrux", username: "@farrux_f", id: "6190123456" },
    { name: "Sevara", username: "@sevara_s", id: "6201234567" },
  ];

  return names.map((n, i) => {
    const coins = Math.max(500, 15848 - i * 450 + Math.floor(Math.random() * 200));
    const refs = Math.max(0, 110 - i * 4 + Math.floor(Math.random() * 10));
    const lvl = getUserLevel(refs);
    return {
      id: n.id,
      name: n.name,
      username: n.username,
      balance: coins,
      referralCount: refs,
      referralEarnings: Math.floor(refs * 6.2),
      referredBy: null,
      level: lvl.level,
      levelEmoji: lvl.emoji,
      levelName: lvl.name,
      bonusPercent: lvl.percent,
      joinedAt: `${Math.floor(Math.random() * 28 + 1).toString().padStart(2, "0")}/01/2026`,
      adsWatchedTotal: Math.floor(Math.random() * 500) + 50,
      auctionWins: Math.floor(Math.random() * 20),
    };
  });
};

// ---- CURRENT USER (session owner) ----
const CURRENT_USER_ID = "5326022510";

function createCurrentUser(): User {
  const lvl = getUserLevel(102);
  return {
    id: CURRENT_USER_ID,
    name: "Xakimjonov Test",
    username: "@SenzuFF",
    balance: 1681,
    referralCount: 102,
    referralEarnings: 630,
    referredBy: null,
    level: lvl.level,
    levelEmoji: lvl.emoji,
    levelName: lvl.name,
    bonusPercent: lvl.percent,
    joinedAt: "01/01/2026",
    adsWatchedTotal: 247,
    auctionWins: 12,
  };
}

// ---- SINGLETON STORE ----
class AppStore {
  currentUser: User;
  users: User[];
  withdrawRequests: WithdrawRequest[];
  auctionHistory: AuctionHistory[];
  channelTasks: ChannelTask[];

  // Reklama state
  adTickets: number = 0;
  adsWatchedInSlot: number = 0;
  lastAdSlotKey: string = "";
  auctionTickets: number = 0;
  totalAuctionWon: number = 0;

  // Vazifalar state
  vazifaAdsWatched: number = 0;
  vazifaAdsLastReset: string = "";
  vazifaChannelsCompleted: Set<string> = new Set();

  private listeners: Set<() => void> = new Set();

  constructor() {
    this.currentUser = createCurrentUser();
    this.users = [this.currentUser, ...generateMockUsers()];
    this.withdrawRequests = [
      {
        id: "wr1", userId: CURRENT_USER_ID, userName: "Xakimjonov Test", userUsername: "@SenzuFF",
        tanga: 10000, som: 11764, card: "9860 1966 6666 6662", status: "processing", date: "17/02/2026, 00:07:13"
      },
      {
        id: "wr2", userId: "7410033679", userName: "A", userUsername: "@tokamiyr",
        tanga: 11513, som: 13544, card: "9860 3501 4920 3431", status: "success", date: "16/02/2026, 17:34:54"
      },
      {
        id: "wr3", userId: "8072394096", userName: "Mahliyo", userUsername: "@Mahliyo18092001",
        tanga: 10000, som: 11764, card: "4073 4200 6231 6371", status: "success", date: "16/02/2026, 14:41:20"
      },
      {
        id: "wr4", userId: "5101442240", userName: "BUNYODBEK", userUsername: "@bunyodbek018",
        tanga: 10000, som: 11764, card: "8600 1234 5678 9012", status: "success", date: "16/02/2026, 11:59:31"
      },
      {
        id: "wr5", userId: CURRENT_USER_ID, userName: "Xakimjonov Test", userUsername: "@SenzuFF",
        tanga: 10000, som: 11764, card: "9860 •••• •••• 6662", status: "success", date: "11/02/2026, 13:31"
      },
      {
        id: "wr6", userId: CURRENT_USER_ID, userName: "Xakimjonov Test", userUsername: "@SenzuFF",
        tanga: 100, som: 10000, card: "9860 •••• •••• 3961", status: "rejected", reason: "Soxta", date: "08/02/2026, 17:16"
      },
      {
        id: "wr7", userId: CURRENT_USER_ID, userName: "Xakimjonov Test", userUsername: "@SenzuFF",
        tanga: 10000, som: 10000, card: "9860 •••• •••• 3906", status: "success", date: "08/02/2026, 15:01"
      },
    ];
    this.auctionHistory = [];
    this.channelTasks = [
      { id: "ch1", name: "Adora Pay", username: "@AdoraPay_uz", reward: 100, completed: false },
      { id: "ch2", name: "UzbekEarn", username: "@UzbekEarn", reward: 50, completed: false },
      { id: "ch3", name: "Bonus Club", username: "@BonusClub_uz", reward: 75, completed: false },
    ];
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  // ---- TANGA CONVERSION ----
  tangaToSom(tanga: number): number {
    return Math.round(tanga * 1.1764);
  }

  // ---- AD SLOT KEY (resets every 6 hours: 00, 06, 12, 18) ----
  getVazifaSlotKey(): string {
    const now = new Date();
    const h = now.getHours();
    const slot = h < 6 ? 0 : h < 12 ? 6 : h < 18 ? 12 : 18;
    return `${now.toDateString()}-${slot}`;
  }

  getNextVazifaReset(): Date {
    const now = new Date();
    const h = now.getHours();
    const nextSlot = h < 6 ? 6 : h < 12 ? 12 : h < 18 ? 18 : 24;
    const next = new Date(now);
    if (nextSlot === 24) {
      next.setDate(next.getDate() + 1);
      next.setHours(0, 0, 0, 0);
    } else {
      next.setHours(nextSlot, 0, 0, 0);
    }
    return next;
  }

  // ---- REKLAMA AD SLOT (resets every 10 min) ----
  getAdSlotKey(): string {
    const now = new Date();
    const slot = Math.floor(now.getMinutes() / 10);
    return `${now.getHours()}-${slot}`;
  }

  checkAdSlotReset() {
    const key = this.getAdSlotKey();
    if (key !== this.lastAdSlotKey) {
      this.adsWatchedInSlot = 0;
      this.lastAdSlotKey = key;
    }
  }

  checkVazifaSlotReset() {
    const key = this.getVazifaSlotKey();
    if (key !== this.vazifaAdsLastReset) {
      this.vazifaAdsWatched = 0;
      this.vazifaAdsLastReset = key;
    }
  }

  // ---- WATCH AD (Reklama page) ----
  watchReklamaAd(): boolean {
    this.checkAdSlotReset();
    if (this.adsWatchedInSlot >= 5) return false;
    this.adsWatchedInSlot++;
    this.adTickets += 2;
    this.notify();
    return true;
  }

  // ---- WATCH AD (Vazifalar page) ----
  watchVazifaAd(): { success: boolean; current: number; max: number } {
    this.checkVazifaSlotReset();
    if (this.vazifaAdsWatched >= 10) return { success: false, current: 10, max: 10 };
    this.vazifaAdsWatched++;
    if (this.vazifaAdsWatched === 10) {
      this.currentUser.balance += 250;
    }
    this.notify();
    return { success: true, current: this.vazifaAdsWatched, max: 10 };
  }

  // ---- COMPLETE CHANNEL TASK ----
  completeChannelTask(taskId: string): boolean {
    const task = this.channelTasks.find((t) => t.id === taskId);
    if (!task || task.completed) return false;
    task.completed = true;
    this.currentUser.balance += task.reward;
    this.vazifaChannelsCompleted.add(taskId);
    this.notify();
    return true;
  }

  // ---- ENTER AUCTION ----
  enterAuction(): number {
    if (this.adTickets <= 0) return 0;
    const used = this.adTickets;
    this.auctionTickets += used;
    this.adTickets = 0;
    this.notify();
    return used;
  }

  // ---- RUN AUCTION ----
  runAuction(): { won: boolean; prize: number } | null {
    if (this.auctionTickets <= 0) return null;
    const winChance = Math.min(0.8, 0.1 + this.auctionTickets * 0.03);
    const won = Math.random() < winChance;
    let prize = 0;
    if (won) {
      prize = 100 + Math.floor(Math.random() * 121); // 100-220
      if (prize > 220) prize = 220;
      this.currentUser.balance += prize;
      this.totalAuctionWon += prize;
    }
    this.auctionHistory.unshift({
      id: `ah_${Date.now()}`,
      date: new Date().toLocaleString("uz-UZ"),
      tickets: this.auctionTickets,
      won,
      prize,
    });
    this.auctionTickets = 0;
    this.notify();
    return { won, prize };
  }

  // ---- WITHDRAW ----
  requestWithdraw(tanga: number, card: string): WithdrawRequest | null {
    if (tanga < 10000 || this.currentUser.balance < tanga) return null;
    this.currentUser.balance -= tanga;
    const req: WithdrawRequest = {
      id: `wr_${Date.now()}`,
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      userUsername: this.currentUser.username,
      tanga,
      som: this.tangaToSom(tanga),
      card,
      status: "pending",
      date: new Date().toLocaleString("uz-UZ"),
    };
    this.withdrawRequests.unshift(req);
    this.notify();
    return req;
  }

  // ---- ADMIN: approve/reject/process ----
  updateWithdrawStatus(id: string, status: WithdrawRequest["status"], reason?: string) {
    const req = this.withdrawRequests.find((r) => r.id === id);
    if (!req) return;
    req.status = status;
    if (reason) req.reason = reason;
    if (status === "rejected") {
      // Return balance
      const user = this.users.find((u) => u.id === req.userId);
      if (user) user.balance += req.tanga;
    }
    this.notify();
  }

  // ---- ADMIN: find user ----
  findUser(id: string): User | undefined {
    return this.users.find((u) => u.id === id);
  }

  // ---- ADMIN: update user balance ----
  updateUserBalance(userId: string, amount: number): boolean {
    const user = this.users.find((u) => u.id === userId);
    if (!user) return false;
    user.balance += amount;
    this.notify();
    return true;
  }

  // ---- TOP USERS ----
  getTopUsers(count: number = 30): User[] {
    return [...this.users].sort((a, b) => b.balance - a.balance).slice(0, count);
  }

  // ---- REFERRAL CALCULATIONS ----
  getReferralStats() {
    const lvl = getUserLevel(this.currentUser.referralCount);
    this.currentUser.level = lvl.level;
    this.currentUser.levelEmoji = lvl.emoji;
    this.currentUser.levelName = lvl.name;
    this.currentUser.bonusPercent = lvl.percent;
    return {
      count: this.currentUser.referralCount,
      earnings: this.currentUser.referralEarnings,
      percent: lvl.percent,
      level: lvl,
    };
  }

  // ---- USER WITHDRAW HISTORY ----
  getUserWithdrawHistory(): WithdrawRequest[] {
    return this.withdrawRequests.filter((r) => r.userId === this.currentUser.id);
  }

  // ---- GET PENDING REQUESTS (admin) ----
  getPendingRequests(): WithdrawRequest[] {
    return this.withdrawRequests.filter((r) => r.status === "pending" || r.status === "processing");
  }
}

// Singleton
export const store = new AppStore();

// React hook
import { useState as useStateReact, useEffect, useSyncExternalStore } from "react";

export function useStore() {
  const state = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store,
    () => store
  );
  // Force re-render on changes
  const [, setTick] = useStateReact(0);
  useEffect(() => {
    const unsub = store.subscribe(() => setTick((t) => t + 1));
    return () => { unsub(); };
  }, []);
  return state;
}
