import { storage } from "./storage";
import { sql } from "drizzle-orm";

async function initializeGameData() {
  
  try {
    console.log("🎮 ゲームデータ初期化を開始します...");
    
    // アイテムマスターデータ
    const items = [
      // 消耗品
      {
        name: "小さな薬草",
        description: "HPを30回復する薬草",
        itemType: "consumable" as const,
        price: 50,
        hpRestore: 30,
        imageUrl: ""
      },
      {
        name: "薬草",
        description: "HPを50回復する薬草",
        itemType: "consumable" as const,
        price: 100,
        hpRestore: 50,
        imageUrl: ""
      },
      {
        name: "上薬草",
        description: "HPを100回復する高級薬草",
        itemType: "consumable" as const,
        price: 250,
        hpRestore: 100,
        imageUrl: ""
      },
      {
        name: "活力の霊薬",
        description: "HPを全回復する霊薬",
        itemType: "consumable" as const,
        price: 500,
        hpRestore: 999,
        imageUrl: ""
      },
      {
        name: "知恵の書",
        description: "知略を永続的に+2する",
        itemType: "consumable" as const,
        price: 800,
        statBoost: JSON.stringify({ wisdom: 2 }),
        imageUrl: ""
      },
      {
        name: "力の巻物",
        description: "武勇を永続的に+2する",
        itemType: "consumable" as const,
        price: 800,
        statBoost: JSON.stringify({ strength: 2 }),
        imageUrl: ""
      },
      
      // 装備品
      {
        name: "竹刀",
        description: "武勇+5の基本的な剣",
        itemType: "equipment" as const,
        price: 300,
        statBoost: JSON.stringify({ strength: 5 }),
        imageUrl: ""
      },
      {
        name: "木刀",
        description: "武勇+10の木製の刀",
        itemType: "equipment" as const,
        price: 600,
        statBoost: JSON.stringify({ strength: 10 }),
        imageUrl: ""
      },
      {
        name: "鉄刀",
        description: "武勇+15の鉄製の刀",
        itemType: "equipment" as const,
        price: 1200,
        statBoost: JSON.stringify({ strength: 15 }),
        imageUrl: ""
      },
      {
        name: "妖刀・村正",
        description: "武勇+25、運気+10の妖刀",
        itemType: "equipment" as const,
        price: 3000,
        statBoost: JSON.stringify({ strength: 25, luck: 10 }),
        imageUrl: ""
      },
      {
        name: "布の衣",
        description: "耐久+5の基本的な防具",
        itemType: "equipment" as const,
        price: 250,
        statBoost: JSON.stringify({ vitality: 5 }),
        imageUrl: ""
      },
      {
        name: "革の鎧",
        description: "耐久+10の革製の鎧",
        itemType: "equipment" as const,
        price: 500,
        statBoost: JSON.stringify({ vitality: 10 }),
        imageUrl: ""
      },
      {
        name: "鎖帷子",
        description: "耐久+15、敏捷+5の軽い鎧",
        itemType: "equipment" as const,
        price: 1000,
        statBoost: JSON.stringify({ vitality: 15, agility: 5 }),
        imageUrl: ""
      },
      {
        name: "源氏の鎧",
        description: "耐久+25、全ステータス+5の伝説の鎧",
        itemType: "equipment" as const,
        price: 5000,
        statBoost: JSON.stringify({ vitality: 25, wisdom: 5, strength: 5, agility: 5, luck: 5 }),
        imageUrl: ""
      },
      
      // 素材
      {
        name: "妖怪の牙",
        description: "妖怪から取れる牙。装備の素材になる",
        itemType: "material" as const,
        price: 100,
        imageUrl: ""
      },
      {
        name: "妖怪の皮",
        description: "妖怪の皮。防具の素材になる",
        itemType: "material" as const,
        price: 150,
        imageUrl: ""
      },
      {
        name: "霊石",
        description: "不思議な力を持つ石",
        itemType: "material" as const,
        price: 300,
        imageUrl: ""
      },
      {
        name: "龍の鱗",
        description: "伝説の龍の鱗。最高級の素材",
        itemType: "material" as const,
        price: 1000,
        imageUrl: ""
      }
    ];
    
    // 既存のアイテムを確認
    const existingItems = await storage.getAllItems();
    
    if (existingItems.length === 0) {
      console.log("📦 アイテムを初期化中...");
      for (const item of items) {
        await storage.createItem(item);
        console.log(`  ✅ ${item.name} を追加`);
      }
    } else {
      console.log("📦 アイテムは既に存在します");
    }
    
    // 初期ボスデータ
    const bosses = [
      {
        bossNumber: 1,
        bossName: "赤鬼王",
        hp: 500,
        maxHp: 500,
        attackPower: 50,
        defense: 20,
        rewardXp: 500,
        rewardCoins: 1000,
        bossImageUrl: ""
      },
      {
        bossNumber: 2,
        bossName: "九尾の狐",
        hp: 750,
        maxHp: 750,
        attackPower: 75,
        defense: 30,
        rewardXp: 750,
        rewardCoins: 1500,
        bossImageUrl: ""
      },
      {
        bossNumber: 3,
        bossName: "大天狗",
        hp: 1000,
        maxHp: 1000,
        attackPower: 100,
        defense: 40,
        rewardXp: 1000,
        rewardCoins: 2000,
        bossImageUrl: ""
      },
      {
        bossNumber: 4,
        bossName: "八岐大蛇",
        hp: 1500,
        maxHp: 1500,
        attackPower: 150,
        defense: 60,
        rewardXp: 1500,
        rewardCoins: 3000,
        bossImageUrl: ""
      },
      {
        bossNumber: 5,
        bossName: "酒呑童子",
        hp: 2000,
        maxHp: 2000,
        attackPower: 200,
        defense: 80,
        rewardXp: 2000,
        rewardCoins: 5000,
        bossImageUrl: ""
      }
    ];
    
    // 既存のボスを確認
    const existingBosses = await storage.getAllBosses();
    
    if (existingBosses.length === 0) {
      console.log("👹 ボスを初期化中...");
      // 最初のボスだけアクティブにする
      const firstBoss = bosses[0];
      const player = await storage.getCurrentPlayer();
      
      if (player) {
        await storage.createBoss({
          ...firstBoss,
          playerId: player.id
        });
        console.log(`  ✅ ${firstBoss.bossName} を追加（アクティブ）`);
      }
    } else {
      console.log("👹 ボスは既に存在します");
    }
    
    // 初期ストーリー
    const stories = [
      {
        bossNumber: 1,
        title: "第一章：赤鬼王の襲来",
        content: `かつて平和だった村に、突如として赤鬼王が現れた。
        
村人たちは恐怖に震え、誰も立ち向かう者はいなかった。
しかし、一人の若き剣士が立ち上がる。

「私が村を守る！」

赤鬼王は巨大な金棒を振り回し、大地を揺るがす。
剣士は日々の修練で鍛えた技と勇気で立ち向かった。

激しい戦いの末、ついに赤鬼王を討ち取ることに成功。
村に平和が戻った...かに見えた。`,
        storyImageUrl: "",
        viewed: false
      },
      {
        bossNumber: 2,
        title: "第二章：九尾の狐の陰謀",
        content: `赤鬼王を倒してから数ヶ月後、村に不可解な事件が続発する。
        
人々が次々と行方不明になり、夜な夜な怪しい光が山から見える。
調査に向かった剣士は、そこで美しい女性に出会う。

しかし、その正体は九尾の狐だった！

「赤鬼王など、私の手駒に過ぎぬ」

九尾の狐は幻術を操り、剣士を惑わす。
しかし、剣士は心を強く持ち、幻術を破った。

壮絶な戦いの末、九尾の狐を封印することに成功。
だが、より強大な敵の存在を感じ取っていた...`,
        storyImageUrl: "",
        viewed: false
      }
    ];
    
    // ストーリーは今は追加しない（ボスを倒した時に生成される）
    console.log("📖 ストーリーは、ボスを倒した時に自動生成されます");
    
    console.log("\n✨ ゲームデータの初期化が完了しました！");
    
    // データ統計を表示（DbStorage使用時のみ）
    console.log("\n📊 データベース統計:");
    if ('db' in storage) {
      const dbStorage = storage as any; // DbStorageインスタンス
      const finalStats = await dbStorage.db.execute(sql`
        SELECT 
          (SELECT COUNT(*) FROM items) as item_count,
          (SELECT COUNT(*) FROM bosses) as boss_count,
          (SELECT COUNT(*) FROM stories) as story_count
      `);
      
      const stats = finalStats.rows[0] as any;
      console.log(`  - アイテム: ${stats.item_count}個`);
      console.log(`  - ボス: ${stats.boss_count}体`);
      console.log(`  - ストーリー: ${stats.story_count}章`);
    } else {
      console.log("  インメモリストレージを使用中（データ統計なし）");
    }
    
  } catch (error) {
    console.error("❌ エラーが発生しました:", error);
  } finally {
    process.exit(0);
  }
}

// スクリプトを実行
initializeGameData();