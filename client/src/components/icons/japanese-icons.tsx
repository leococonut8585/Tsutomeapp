// Custom high-quality Japanese-style SVG icons

// 鳥居風ホームアイコン (Torii-style home icon)
export const ToriiIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
    {/* 鳥居の上部 */}
    <path d="M2 6L12 4L22 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M3 8H21" stroke="currentColor" strokeWidth="2.5"/>
    {/* 鳥居の柱 */}
    <path d="M6 8V20M18 8V20" stroke="currentColor" strokeWidth="2"/>
    {/* 鳥居の中央装飾 */}
    <path d="M12 8V14" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
    <circle cx="12" cy="11" r="1.5" fill="currentColor" opacity="0.4"/>
  </svg>
);

// 刀アイコン（修練用）
export const KatanaIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
    {/* 刀身 */}
    <path d="M5 5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M5.5 4.5L17.5 16.5" stroke="currentColor" strokeWidth="0.5" opacity="0.4"/>
    {/* 鍔（つば） */}
    <circle cx="17" cy="17" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1"/>
    <path d="M15.5 18.5L18.5 15.5" stroke="currentColor" strokeWidth="1"/>
    {/* 柄（つか） */}
    <path d="M17 17L20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M18 18L19 19" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
    {/* 柄頭 */}
    <circle cx="20" cy="20" r="1" fill="currentColor"/>
  </svg>
);

// 鬼面アイコン（大敵用）
export const OniMaskIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
    {/* 面の輪郭 */}
    <path d="M12 3C7 3 4 7 4 12C4 17 7 21 12 21C17 21 20 17 20 12C20 7 17 3 12 3Z" 
      stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.05"/>
    {/* 角 */}
    <path d="M8 3L6 1M16 3L18 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    {/* 目 */}
    <path d="M8 10L10 11M16 10L14 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="8.5" cy="11" r="1" fill="currentColor"/>
    <circle cx="15.5" cy="11" r="1" fill="currentColor"/>
    {/* 鼻 */}
    <path d="M12 12V14" stroke="currentColor" strokeWidth="1" opacity="0.6"/>
    {/* 牙 */}
    <path d="M9 16L10 18M15 16L14 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    {/* 口 */}
    <path d="M9 17H15" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

// 巻物アイコン（記録用）
export const ScrollIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
    {/* 巻物本体 */}
    <rect x="5" y="3" width="14" height="18" stroke="currentColor" strokeWidth="1.5" rx="1"
      fill="currentColor" fillOpacity="0.05"/>
    {/* 巻物の軸（上） */}
    <rect x="3" y="2" width="18" height="3" rx="1.5" stroke="currentColor" strokeWidth="1.5"
      fill="currentColor" fillOpacity="0.1"/>
    {/* 巻物の軸（下） */}
    <rect x="3" y="19" width="18" height="3" rx="1.5" stroke="currentColor" strokeWidth="1.5"
      fill="currentColor" fillOpacity="0.1"/>
    {/* 文字ライン */}
    <path d="M8 8H16M8 11H16M8 14H13" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
    {/* 装飾的な紐 */}
    <path d="M12 2V5M12 19V22" stroke="currentColor" strokeWidth="1" opacity="0.6"/>
  </svg>
);

// 提灯アイコン（ショップ用）
export const LanternIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
    {/* 吊り紐 */}
    <path d="M12 2V5" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="12" cy="3" r="1" stroke="currentColor" strokeWidth="1"/>
    {/* 提灯本体 */}
    <ellipse cx="12" cy="12" rx="5" ry="7" stroke="currentColor" strokeWidth="1.5"
      fill="currentColor" fillOpacity="0.05"/>
    {/* 横線装飾 */}
    <path d="M7 9H17M7 12H17M7 15H17" stroke="currentColor" strokeWidth="0.5" opacity="0.3"/>
    {/* 光の表現 */}
    <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.2"/>
    <circle cx="12" cy="12" r="1" fill="currentColor" opacity="0.4"/>
    {/* 底部 */}
    <path d="M12 19V21" stroke="currentColor" strokeWidth="1.5"/>
    <ellipse cx="12" cy="19" rx="5" ry="1" fill="currentColor" opacity="0.2"/>
  </svg>
);

// 朱印アイコン（ステータス/成果用）
export const SealStampIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
    {/* 外枠 */}
    <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"
      fill="currentColor" fillOpacity="0.05" transform="rotate(3 12 12)"/>
    {/* 内側の円 */}
    <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 1"
      fill="currentColor" fillOpacity="0.05"/>
    {/* 漢字風の印影 */}
    <path d="M9 10H15M9 14H15M10 8V16M14 8V16" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
    {/* 角印 */}
    <rect x="10" y="10" width="4" height="4" fill="currentColor" opacity="0.3"/>
  </svg>
);

// 扇子アイコン（設定用）
export const FanIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
    {/* 扇子の骨 */}
    <path d="M12 18L4 6M12 18L8 6M12 18L12 6M12 18L16 6M12 18L20 6" 
      stroke="currentColor" strokeWidth="1" opacity="0.6"/>
    {/* 扇子の紙部分 */}
    <path d="M4 6Q12 4 20 6L12 18Z" stroke="currentColor" strokeWidth="1.5"
      fill="currentColor" fillOpacity="0.1"/>
    {/* 要（かなめ） */}
    <circle cx="12" cy="18" r="1.5" stroke="currentColor" strokeWidth="1.5"
      fill="currentColor" fillOpacity="0.3"/>
    {/* 装飾線 */}
    <path d="M6 7Q12 6 18 7" stroke="currentColor" strokeWidth="0.5" opacity="0.4"/>
  </svg>
);

// 竜アイコン（ボス用）
export const DragonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
    {/* 竜の頭 */}
    <path d="M8 8C8 8 6 6 6 4C6 3 7 2 8 3C9 4 9 5 8 6"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    {/* 竜の体 */}
    <path d="M8 8Q12 10 14 14Q16 18 18 20"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
    <path d="M14 14Q12 16 10 14Q8 12 10 10Q12 8 14 10Q16 12 14 14"
      stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1"/>
    {/* 竜の鱗 */}
    <circle cx="11" cy="11" r="0.5" fill="currentColor" opacity="0.4"/>
    <circle cx="13" cy="12" r="0.5" fill="currentColor" opacity="0.4"/>
    <circle cx="12" cy="13" r="0.5" fill="currentColor" opacity="0.4"/>
    {/* 竜の爪 */}
    <path d="M10 16L9 17M14 16L15 17M12 18L12 19"
      stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    {/* 竜の髭 */}
    <path d="M6 6Q4 5 3 6M6 6Q5 8 6 9"
      stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" opacity="0.6"/>
  </svg>
);

// 手裏剣アイコン（クエスト/タスク用）
export const ShurikenIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
    {/* 中心 */}
    <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.5"
      fill="currentColor" fillOpacity="0.2"/>
    {/* 4方向の刃 */}
    <path d="M12 2L10 10L12 12L14 10Z" stroke="currentColor" strokeWidth="1.5"
      fill="currentColor" fillOpacity="0.1"/>
    <path d="M22 12L14 10L12 12L14 14Z" stroke="currentColor" strokeWidth="1.5"
      fill="currentColor" fillOpacity="0.1"/>
    <path d="M12 22L14 14L12 12L10 14Z" stroke="currentColor" strokeWidth="1.5"
      fill="currentColor" fillOpacity="0.1"/>
    <path d="M2 12L10 14L12 12L10 10Z" stroke="currentColor" strokeWidth="1.5"
      fill="currentColor" fillOpacity="0.1"/>
  </svg>
);

// 桜アイコン（報酬/成果用）
export const SakuraIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
    {/* 花びら */}
    <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.5"
      fill="currentColor" fillOpacity="0.1"/>
    <circle cx="8.5" cy="11" r="3" stroke="currentColor" strokeWidth="1.5"
      fill="currentColor" fillOpacity="0.1"/>
    <circle cx="10" cy="15" r="3" stroke="currentColor" strokeWidth="1.5"
      fill="currentColor" fillOpacity="0.1"/>
    <circle cx="14" cy="15" r="3" stroke="currentColor" strokeWidth="1.5"
      fill="currentColor" fillOpacity="0.1"/>
    <circle cx="15.5" cy="11" r="3" stroke="currentColor" strokeWidth="1.5"
      fill="currentColor" fillOpacity="0.1"/>
    {/* 中心 */}
    <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.3"/>
    {/* しべ */}
    <circle cx="12" cy="12" r="0.5" fill="currentColor" opacity="0.6"/>
  </svg>
);

// 座禅アイコン（修練用）
export const MeditationIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
    {/* 座禅の人物 */}
    <circle cx="12" cy="7" r="2" stroke="currentColor" strokeWidth="1.5"
      fill="currentColor" fillOpacity="0.1"/>
    {/* 体 */}
    <path d="M12 9C10 9 8 10 8 12V16C8 17 9 18 10 18H14C15 18 16 17 16 16V12C16 10 14 9 12 9Z"
      stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.05"/>
    {/* 座禅の足 */}
    <path d="M8 16C6 16 5 18 5 19H8M16 16C18 16 19 18 19 19H16"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    {/* 瞑想の光 */}
    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="0.5"
      strokeDasharray="1 2" opacity="0.5"/>
  </svg>
);

// 宝玉アイコン（アイテム用）
export const MagatamaIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
    {/* 勾玉の形 */}
    <path d="M12 3C8 3 6 7 6 10C6 13 8 16 11 16C14 16 16 14 16 11C16 8 14 6 12 6C10 6 9 7 9 8C9 9 10 10 11 10"
      stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1"/>
    {/* 穴 */}
    <circle cx="12" cy="8" r="1" fill="currentColor" opacity="0.3"/>
    {/* 光沢 */}
    <ellipse cx="10" cy="10" rx="2" ry="3" fill="currentColor" opacity="0.1"/>
  </svg>
);

// 知恵アイコン（ステータス用）
export const WisdomIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
    {/* 陰陽マーク風 */}
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5"
      fill="currentColor" fillOpacity="0.05"/>
    <path d="M12 4C8 4 4 8 4 12C4 16 8 20 12 20C12 16 12 8 12 4Z"
      fill="currentColor" fillOpacity="0.2"/>
    <circle cx="12" cy="8" r="2" fill="currentColor" fillOpacity="0.3"/>
    <circle cx="12" cy="16" r="2" stroke="currentColor" strokeWidth="1" fill="none"/>
  </svg>
);

// 稲妻アイコン（敏捷用）
export const ThunderIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
    {/* 和風の稲妻 */}
    <path d="M13 2L8 13H11L9 22L16 9H13L17 2H13Z"
      stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1"/>
  </svg>
);

// 心臓アイコン（体力用） 
export const VigorIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
    {/* 和風のハート */}
    <path d="M12 21C12 21 3 14 3 8C3 5 5 3 8 3C10 3 11 4 12 5C13 4 14 3 16 3C19 3 21 5 21 8C21 14 12 21 12 21Z"
      stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1"/>
    {/* 内側の装飾 */}
    <path d="M12 12L10 10M12 12L14 10" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
  </svg>
);

// 幸運アイコン（運気用）
export const FortuneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
    {/* 七福神の小槌風 */}
    <ellipse cx="12" cy="8" rx="5" ry="3" stroke="currentColor" strokeWidth="1.5"
      fill="currentColor" fillOpacity="0.1"/>
    <path d="M7 8V14C7 16 9 18 12 18C15 18 17 16 17 14V8"
      stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.05"/>
    {/* 柄 */}
    <rect x="11" y="16" width="2" height="5" stroke="currentColor" strokeWidth="1.5"
      fill="currentColor" fillOpacity="0.2"/>
    {/* 飾り */}
    <circle cx="12" cy="11" r="1" fill="currentColor" opacity="0.4"/>
  </svg>
);

// 職業アイコン（仕事用）
export const JobIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
    {/* 家紋風のシンボル */}
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5"
      fill="currentColor" fillOpacity="0.05"/>
    <path d="M12 8L8 12L12 16L16 12Z" stroke="currentColor" strokeWidth="1.5"
      fill="currentColor" fillOpacity="0.1"/>
    <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.3"/>
  </svg>
);