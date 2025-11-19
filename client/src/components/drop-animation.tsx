import { motion, AnimatePresence } from "framer-motion";
import { Package, Sparkles, Star, Gem } from "lucide-react";
import { useEffect, useState } from "react";

interface DropItem {
  item: {
    id: string;
    name: string;
    description?: string;
    rarity: "common" | "rare" | "epic" | "legendary";
    itemType: string;
    imageUrl?: string;
  };
  quantity: number;
  isBonus?: boolean;
}

interface DropAnimationProps {
  drops: DropItem[];
  open: boolean;
  onClose: () => void;
}

// レアリティに応じた色とアイコン
const rarityConfig = {
  common: {
    bgClass: "bg-gray-100 dark:bg-gray-800",
    borderClass: "border-gray-300 dark:border-gray-600",
    glowClass: "shadow-gray-400/50",
    textClass: "text-gray-600 dark:text-gray-400",
    icon: Package,
    label: "コモン",
  },
  rare: {
    bgClass: "bg-blue-50 dark:bg-blue-900/20",
    borderClass: "border-blue-400 dark:border-blue-600",
    glowClass: "shadow-blue-400/50",
    textClass: "text-blue-600 dark:text-blue-400",
    icon: Star,
    label: "レア",
  },
  epic: {
    bgClass: "bg-purple-50 dark:bg-purple-900/20",
    borderClass: "border-purple-400 dark:border-purple-600",
    glowClass: "shadow-purple-400/50",
    textClass: "text-purple-600 dark:text-purple-400",
    icon: Sparkles,
    label: "エピック",
  },
  legendary: {
    bgClass: "bg-yellow-50 dark:bg-yellow-900/20",
    borderClass: "border-yellow-400 dark:border-yellow-600",
    glowClass: "shadow-yellow-400/50",
    textClass: "text-yellow-600 dark:text-yellow-400",
    icon: Gem,
    label: "レジェンダリー",
  },
};

export function DropAnimation({ drops, open, onClose }: DropAnimationProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (open && drops.length > 0) {
      setCurrentIndex(0);
      setShowAll(false);
      
      // 1つずつアニメーション表示
      const timer = setTimeout(() => {
        if (drops.length > 1) {
          const interval = setInterval(() => {
            setCurrentIndex((prev) => {
              if (prev >= drops.length - 1) {
                clearInterval(interval);
                setTimeout(() => {
                  setShowAll(true);
                }, 500);
                return prev;
              }
              return prev + 1;
            });
          }, 800);
          
          return () => clearInterval(interval);
        } else {
          setTimeout(() => {
            setShowAll(true);
          }, 1000);
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [open, drops]);

  if (!open || drops.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={showAll ? onClose : undefined}
      >
        <div className="relative w-full max-w-md px-6">
          {/* 個別アイテムアニメーション */}
          {!showAll && (
            <AnimatePresence mode="wait">
              {drops.slice(0, currentIndex + 1).map((drop, index) => {
                if (index !== currentIndex) return null;
                const config = rarityConfig[drop.item.rarity];
                const Icon = config.icon;
                
                return (
                  <motion.div
                    key={`${drop.item.id}-${index}`}
                    initial={{ scale: 0, rotate: -180, opacity: 0 }}
                    animate={{ 
                      scale: 1, 
                      rotate: 0, 
                      opacity: 1,
                      transition: {
                        type: "spring",
                        damping: 15,
                        stiffness: 200,
                      }
                    }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="flex flex-col items-center"
                  >
                    {/* アイテムカード */}
                    <motion.div
                      animate={{
                        boxShadow: [
                          `0 0 20px ${drop.item.rarity === 'legendary' ? 'rgba(250, 204, 21, 0.6)' : 
                                      drop.item.rarity === 'epic' ? 'rgba(168, 85, 247, 0.6)' :
                                      drop.item.rarity === 'rare' ? 'rgba(59, 130, 246, 0.6)' :
                                      'rgba(156, 163, 175, 0.4)'}`,
                          `0 0 40px ${drop.item.rarity === 'legendary' ? 'rgba(250, 204, 21, 0.8)' : 
                                      drop.item.rarity === 'epic' ? 'rgba(168, 85, 247, 0.8)' :
                                      drop.item.rarity === 'rare' ? 'rgba(59, 130, 246, 0.8)' :
                                      'rgba(156, 163, 175, 0.6)'}`,
                          `0 0 20px ${drop.item.rarity === 'legendary' ? 'rgba(250, 204, 21, 0.6)' : 
                                      drop.item.rarity === 'epic' ? 'rgba(168, 85, 247, 0.6)' :
                                      drop.item.rarity === 'rare' ? 'rgba(59, 130, 246, 0.6)' :
                                      'rgba(156, 163, 175, 0.4)'}`,
                        ]
                      }}
                      transition={{
                        boxShadow: {
                          duration: 1.5,
                          repeat: Infinity,
                        }
                      }}
                      className={`relative rounded-lg border-2 ${config.borderClass} ${config.bgClass} p-8`}
                    >
                      {/* レアリティアイコン */}
                      <div className="absolute top-2 right-2">
                        <Icon className={`w-6 h-6 ${config.textClass}`} />
                      </div>
                      
                      {/* ボーナスバッジ */}
                      {drop.isBonus && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.3 }}
                          className="absolute -top-3 -left-3 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-bold"
                        >
                          ボーナス!
                        </motion.div>
                      )}
                      
                      {/* アイテム情報 */}
                      <div className="text-center space-y-2">
                        <div className={`text-xs font-semibold ${config.textClass} uppercase tracking-wider`}>
                          {config.label}
                        </div>
                        <h3 className="text-2xl font-bold font-serif text-foreground">
                          {drop.item.name}
                        </h3>
                        {drop.quantity > 1 && (
                          <div className="text-lg font-semibold text-muted-foreground">
                            x{drop.quantity}
                          </div>
                        )}
                      </div>
                    </motion.div>
                    
                    {/* GET! テキスト */}
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="mt-4"
                    >
                      <span className={`text-3xl font-bold ${config.textClass}`}>
                        GET!
                      </span>
                    </motion.div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
          
          {/* 全アイテム一覧表示 */}
          {showAll && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-background/95 backdrop-blur rounded-lg p-6 space-y-4 max-h-[70vh] overflow-y-auto"
            >
              <h3 className="text-xl font-bold font-serif text-center mb-4">
                ドロップアイテム一覧
              </h3>
              
              <div className="space-y-3">
                {drops.map((drop, index) => {
                  const config = rarityConfig[drop.item.rarity];
                  const Icon = config.icon;
                  
                  return (
                    <motion.div
                      key={`${drop.item.id}-${index}-list`}
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${config.borderClass} ${config.bgClass}`}
                    >
                      <Icon className={`w-5 h-5 ${config.textClass} flex-shrink-0`} />
                      <div className="flex-1">
                        <div className="font-semibold">{drop.item.name}</div>
                        <div className={`text-xs ${config.textClass}`}>
                          {config.label}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">x{drop.quantity}</div>
                        {drop.isBonus && (
                          <div className="text-xs text-yellow-600">ボーナス</div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              
              <div className="text-center pt-4 text-sm text-muted-foreground">
                クリックして閉じる
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}