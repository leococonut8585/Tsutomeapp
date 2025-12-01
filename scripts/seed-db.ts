import { sql } from "drizzle-orm";
import { DbStorage } from "../server/db-storage";

const playerSeeds = [
  { name: "Leo", username: "leo", password: "leococonut8585" },
  { name: "Lady", username: "lady", password: "ladypoteto8585" },
  { name: "Sara", username: "sara", password: "sarapasta851" },
  { name: "Hit", username: "hit", password: "hitomioniku852" },
  { name: "Jun", username: "jun", password: "junamazake853" },
  { name: "Nan", username: "nan", password: "nangruto854" },
  { name: "Gumi", username: "gumi", password: "gumigumi855" },
  { name: "Kie", username: "kie", password: "kiesalmon856" },
  { name: "Raito", username: "raito", password: "raitoumeboshi857" },
  { name: "Hachi", username: "hachi", password: "hachipakuchi858" },
  { name: "Sari", username: "sari", password: "sarimama5858" },
  { name: "Muu", username: "muu", password: "muudada5858" },
  { name: "Zion", username: "zion", password: "zionlucas8888" },
  { name: "Yu", username: "yu", password: "yuunito8855" },
  { name: "Mamoru", username: "mamoru", password: "mamoru88585" },
  { name: "Shirayuki", username: "shirayuki", password: "shirayuki55855" },
  { name: "CI", username: "ci", password: "mininimi5588" },
  { name: "Admin Tsutome", username: "AdminTsutome", password: "AdminTsutome", role: "admin" },
];

async function main() {
  const storage = new DbStorage();

  console.log("Resetting gameplay tables...");
  await storage.db.execute(sql`
    TRUNCATE TABLE
      drop_history,
      inventories,
      items,
      stories,
      bosses,
      shikakus,
      shihans,
      shurens,
      tsutomes,
      players
    RESTART IDENTITY CASCADE;
  `);

  console.log("Seeding user accounts...");
  for (const seed of playerSeeds) {
    await storage.createPlayer({
      name: seed.name,
      username: seed.username,
      passwordPlain: seed.password,
      role: seed.role ?? "player",
      suspended: false,
      level: 1,
      exp: 0,
      hp: 100,
      maxHp: 100,
      coins: 0,
      wisdom: 10,
      strength: 10,
      agility: 10,
      vitality: 10,
      luck: 10,
      job: "novice",
      jobLevel: 1,
      jobXp: 0,
      skills: [],
      streak: 0,
      aiStrictness: "balanced",
      monthlyApiCalls: 0,
      monthlyApiCost: 0,
    });
  }

  console.log(`Seeded ${playerSeeds.length} accounts.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
