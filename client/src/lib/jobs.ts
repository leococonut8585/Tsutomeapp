import { Sword, Shield, Zap, Heart, Brain, Sparkles } from "lucide-react";

export interface JobDefinition {
  id: string;
  name: string;
  nameJa: string;
  description: string;
  color: string;
  icon: string;
  bonus: string;
  skill: {
    name: string;
    nameJa: string;
    description: string;
  };
}

export const JOBS: JobDefinition[] = [
  {
    id: "samurai",
    name: "Samurai",
    nameJa: "侍",
    description: "伝統的な武士道を極める戦士",
    color: "#8B0000",
    icon: "Sword",
    bonus: "戦闘系務メで経験値+20%",
    skill: {
      name: "Double Strike",
      nameJa: "一刀両断",
      description: "ボスへのダメージ2倍"
    }
  },
  {
    id: "monk",
    name: "Monk",
    nameJa: "僧",
    description: "精神と肉体を鍛える修行者",
    color: "#FF8C00",
    icon: "Heart",
    bonus: "最大HP+50、修練で経験値+25%",
    skill: {
      name: "Meditation",
      nameJa: "瞑想",
      description: "毎日HP自動回復+20"
    }
  },
  {
    id: "ninja",
    name: "Ninja",
    nameJa: "忍",
    description: "影から素早く任務を遂行する",
    color: "#4B0082",
    icon: "Zap",
    bonus: "刺客タスクで報酬2倍",
    skill: {
      name: "Shadow Step",
      nameJa: "影走り",
      description: "タスク完了時間-20%"
    }
  },
  {
    id: "scholar",
    name: "Scholar",
    nameJa: "学者",
    description: "知識と戦略で妖怪と戦う",
    color: "#2E8B57",
    icon: "Brain",
    bonus: "学習系務メで経験値+30%",
    skill: {
      name: "Analysis",
      nameJa: "解析",
      description: "タスク報酬コイン+25%"
    }
  },
  {
    id: "guardian",
    name: "Guardian",
    nameJa: "守護",
    description: "強固な防御で仲間を守る",
    color: "#4682B4",
    icon: "Shield",
    bonus: "被ダメージ-30%、体力+25",
    skill: {
      name: "Iron Will",
      nameJa: "鉄壁",
      description: "HP0でも1回だけ耐える"
    }
  },
  {
    id: "mystic",
    name: "Mystic",
    nameJa: "陰陽師",
    description: "神秘の力で運命を操る",
    color: "#9370DB",
    icon: "Sparkles",
    bonus: "全ステータス+5、運気+10",
    skill: {
      name: "Fortune",
      nameJa: "占術",
      description: "レアアイテムドロップ率2倍"
    }
  }
];

export function getJobById(id: string): JobDefinition | undefined {
  return JOBS.find(job => job.id === id);
}

export function getJobIcon(iconName: string) {
  const icons: Record<string, any> = {
    Sword,
    Shield,
    Zap,
    Heart,
    Brain,
    Sparkles
  };
  return icons[iconName] || Sword;
}