// 和風アニメーション定義
import { Variants } from "framer-motion";

// ページトランジション
export const pageTransition: Variants = {
  initial: { 
    opacity: 0,
    y: 20,
  },
  animate: { 
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94], // 和風のなめらかなイージング
    }
  },
  exit: { 
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2,
    }
  }
};

// タスクカードアニメーション
export const taskCardAnimation: Variants = {
  initial: { 
    opacity: 0,
    x: -20,
    scale: 0.95,
  },
  animate: { 
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    }
  },
  exit: { 
    opacity: 0,
    x: 20,
    scale: 0.95,
    transition: {
      duration: 0.2,
    }
  }
};

// リストアニメーション（階段状）
export const listAnimation = {
  container: {
    animate: {
      transition: {
        staggerChildren: 0.05,
      }
    }
  },
  item: {
    initial: { 
      opacity: 0,
      y: 10,
    },
    animate: { 
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      }
    }
  }
};

// 成功アニメーション（完了時）
export const successAnimation: Variants = {
  initial: { 
    scale: 0,
    rotate: -180,
  },
  animate: { 
    scale: 1,
    rotate: 0,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 15,
    }
  }
};

// フェードイン
export const fadeIn: Variants = {
  initial: { 
    opacity: 0,
  },
  animate: { 
    opacity: 1,
    transition: {
      duration: 0.4,
    }
  }
};

// スライドアップ
export const slideUp: Variants = {
  initial: { 
    opacity: 0,
    y: 30,
  },
  animate: { 
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    }
  }
};

// 波紋エフェクト（ボタンクリック時）
export const rippleEffect = {
  tap: { 
    scale: 0.95,
    transition: {
      duration: 0.1,
    }
  }
};

// 浮遊アニメーション（ボス登場など）
export const floatAnimation: Variants = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut",
    }
  }
};

// 震えるアニメーション（ダメージ時）
export const shakeAnimation: Variants = {
  shake: {
    x: [-5, 5, -5, 5, 0],
    transition: {
      duration: 0.3,
    }
  }
};

// 光るアニメーション（レアアイテム取得時）
export const glowAnimation: Variants = {
  glow: {
    boxShadow: [
      "0 0 0 0 rgba(207, 46, 46, 0)",
      "0 0 20px 10px rgba(207, 46, 46, 0.3)",
      "0 0 0 0 rgba(207, 46, 46, 0)",
    ],
    transition: {
      duration: 1.5,
      repeat: Infinity,
    }
  }
};

// 回転アニメーション（ローディング用）
export const spinAnimation: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear",
    }
  }
};

// スケールアップ（ホバー時）
export const scaleUpAnimation = {
  whileHover: { 
    scale: 1.02,
    transition: {
      duration: 0.2,
    }
  },
  whileTap: { 
    scale: 0.98,
  }
};