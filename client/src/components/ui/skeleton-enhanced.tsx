import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// 高品質なスケルトンコンポーネント with シマーエフェクト
interface SkeletonEnhancedProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular" | "card";
  width?: string | number;
  height?: string | number;
  animation?: "pulse" | "wave" | "none";
}

export function SkeletonEnhanced({
  className,
  variant = "rectangular",
  width,
  height,
  animation = "wave",
  ...props
}: SkeletonEnhancedProps) {
  const variants = {
    text: "h-4 w-full rounded-md",
    circular: "rounded-full",
    rectangular: "rounded-md",
    card: "rounded-lg",
  };

  const animationVariants = {
    wave: {
      backgroundPosition: ["200% 0", "-200% 0"],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
    pulse: {
      opacity: [0.5, 1, 0.5],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  const animateKey = animation === "none" ? undefined : (animation === "wave" ? "wave" : animation === "pulse" ? "pulse" : undefined);

  return (
    <motion.div
      className={cn(
        "relative overflow-hidden bg-muted",
        variants[variant],
        className
      )}
      style={{
        width: width,
        height: height,
        background: animation === "wave"
          ? "linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--muted) / 0.5) 50%, hsl(var(--muted)) 75%)"
          : undefined,
        backgroundSize: animation === "wave" ? "200% 100%" : undefined,
      }}
      animate={animateKey}
      variants={animationVariants}
    />
  );
}

// タスクカード用のスケルトン
export function TaskCardSkeleton() {
  return (
    <div className="relative bg-card japanese-shadow-lg scroll-design overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-3 bg-gradient-to-b from-foreground/10 to-transparent z-10" />
      <div className="absolute inset-x-0 bottom-0 h-3 bg-gradient-to-t from-foreground/10 to-transparent z-10" />
      
      <div className="relative flex gap-4 px-8 py-6 z-10">
        <SkeletonEnhanced variant="circular" width={64} height={64} />
        
        <div className="flex-1 space-y-3">
          <SkeletonEnhanced variant="text" width="30%" height={16} />
          <SkeletonEnhanced variant="text" width="80%" height={20} />
          <div className="flex gap-2">
            <SkeletonEnhanced variant="rectangular" width={60} height={24} />
            <SkeletonEnhanced variant="rectangular" width={80} height={24} />
          </div>
        </div>
      </div>
    </div>
  );
}

// スタットバー用のスケルトン
export function StatsBarSkeleton() {
  return (
    <div className="bg-card p-6 space-y-4 border-y-2 border-foreground/10 japanese-shadow-lg">
      <div className="flex items-center justify-between">
        <SkeletonEnhanced variant="circular" width={80} height={80} />
        <SkeletonEnhanced variant="rectangular" width={120} height={40} />
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <SkeletonEnhanced variant="circular" width={24} height={24} />
          <SkeletonEnhanced variant="rectangular" width="100%" height={20} />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonEnhanced variant="circular" width={24} height={24} />
          <SkeletonEnhanced variant="rectangular" width="100%" height={20} />
        </div>
      </div>
    </div>
  );
}
