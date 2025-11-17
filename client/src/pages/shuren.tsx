import { useQuery } from "@tanstack/react-query";
import { ShurenCard } from "@/components/shuren-card";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Shuren } from "@shared/schema";
import { useLocation } from "wouter";

export default function ShurenPage() {
  const [, setLocation] = useLocation();

  // 修練一覧取得
  const { data: shurens, isLoading } = useQuery<Shuren[]>({
    queryKey: ["/api/shurens"],
  });

  const activeShurens = shurens?.filter((s) => s.active) || [];

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 bg-card border-b border-card-border shadow-sm">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setLocation("/")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-serif font-bold text-chart-4">修練の道</h1>
          </div>
          <Button size="sm" className="gap-1.5" data-testid="button-add-shuren">
            <Plus className="w-4 h-4" />
            新規
          </Button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="px-4 py-4 space-y-4">
        {/* 説明 */}
        <div className="bg-card rounded-xl p-4 border border-card-border">
          <p className="text-sm text-muted-foreground leading-relaxed">
            修練とは、日々の習慣を記録し、継続の力を養うものです。
            継続日数が増えるほど、務メに挑む際の力となります。
          </p>
        </div>

        {/* 修練一覧 */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : activeShurens.length > 0 ? (
          <div className="space-y-3">
            {activeShurens.map((shuren) => (
              <ShurenCard
                key={shuren.id}
                shuren={shuren}
                onComplete={() => {
                  // TODO: 記録処理
                }}
                onClick={() => {
                  // TODO: 詳細表示
                }}
              />
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-xl p-12 text-center border border-dashed border-border">
            <p className="text-muted-foreground mb-4">まだ修練を始めていません</p>
            <Button size="sm" variant="outline" data-testid="button-add-first-shuren">
              <Plus className="w-4 h-4 mr-1.5" />
              最初の修練を始める
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
