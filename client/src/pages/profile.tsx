import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Brain, Sword, Zap as Lightning, Heart, Sparkles, Calendar, Archive, Briefcase } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Player } from "@shared/schema";
import { useLocation } from "wouter";
import { JobChangeModal } from "@/components/job-change-modal";
import { getJobById, getJobIcon } from "@/lib/jobs";

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const [showJobModal, setShowJobModal] = useState(false);

  // プレイヤー情報取得
  const { data: player, isLoading } = useQuery<Player>({
    queryKey: ["/api/player"],
  });

  const stats = player
    ? [
        { name: "知略", value: player.wisdom, icon: Brain, color: "text-chart-3" },
        { name: "武勇", value: player.strength, icon: Sword, color: "text-chart-1" },
        { name: "敏捷", value: player.agility, icon: Lightning, color: "text-exp" },
        { name: "耐久", value: player.vitality, icon: Heart, color: "text-chart-4" },
        { name: "運気", value: player.luck, icon: Sparkles, color: "text-chart-5" },
      ]
    : [];

  const maxStat = 100;

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 bg-card border-b border-card-border shadow-sm">
        <div className="flex items-center gap-2 px-4 h-14">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setLocation("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-serif font-bold text-primary">記録</h1>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="px-4 py-4">
        <Tabs defaultValue="stats" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="stats" data-testid="tab-stats">
              ステータス
            </TabsTrigger>
            <TabsTrigger value="archive" data-testid="tab-archive">
              アーカイブ
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-96 w-full rounded-xl" />
            ) : player ? (
              <>
                {/* プレイヤー情報カード */}
                <Card className="p-6 space-y-4">
                  {/* 名前とレベル */}
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-serif font-bold" data-testid="player-name">
                      {player.name}
                    </h2>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-sm text-muted-foreground font-semibold">レベル</span>
                      <span className="text-3xl font-bold font-serif text-primary" data-testid="player-level">
                        {player.level}
                      </span>
                    </div>
                  </div>

                  {/* 経験値バー */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground font-semibold">経験値</span>
                      <span className="font-mono font-bold">
                        {player.exp} / {player.level * 100}
                      </span>
                    </div>
                    <Progress value={(player.exp / (player.level * 100)) * 100} className="h-2" />
                  </div>
                </Card>

                {/* 職業カード */}
                <Card className="p-6 space-y-4">
                  {(() => {
                    const currentJob = getJobById(player.job || "novice");
                    if (!currentJob && player.job !== "novice") return null;
                    
                    const isNovice = player.job === "novice" || !player.job;
                    const JobIcon = !isNovice && currentJob ? getJobIcon(currentJob.icon) : Briefcase;
                    
                    return (
                      <>
                        {/* 職業名とレベル */}
                        <div className="text-center space-y-3">
                          <div 
                            className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
                            style={{ 
                              backgroundColor: isNovice ? "#94a3b8" + "20" : `${currentJob?.color}20` 
                            }}
                          >
                            <JobIcon 
                              className="w-8 h-8" 
                              style={{ 
                                color: isNovice ? "#94a3b8" : currentJob?.color 
                              }} 
                            />
                          </div>
                          
                          <div>
                            <h3 className="text-3xl font-serif font-bold" data-testid="player-job">
                              {isNovice ? "初心者" : currentJob?.nameJa}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {isNovice ? "Novice" : currentJob?.name}
                            </p>
                          </div>
                          
                          {!isNovice && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-sm text-muted-foreground font-semibold">職業レベル</span>
                                <span className="text-2xl font-bold font-serif" style={{ color: currentJob?.color }}>
                                  {player.jobLevel}
                                </span>
                              </div>
                              <Progress 
                                value={(player.jobXp / 100) * 100} 
                                className="h-2 max-w-[200px] mx-auto"
                              />
                              <p className="text-xs text-muted-foreground">
                                {player.jobXp} / 100 XP
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {/* 職業ボーナス */}
                        {!isNovice && currentJob && (
                          <div className="space-y-3 pt-3 border-t">
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground mb-1">特性</p>
                              <p className="text-sm">{currentJob.bonus}</p>
                            </div>
                            
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground mb-1">
                                奥義: <span className="font-serif text-sm">{currentJob.skill.nameJa}</span>
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {currentJob.skill.description}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {/* 転職ボタン */}
                        <Button
                          className="w-full"
                          variant={isNovice ? "default" : "outline"}
                          onClick={() => setShowJobModal(true)}
                          data-testid="button-change-job"
                        >
                          <Briefcase className="w-4 h-4 mr-2" />
                          {isNovice ? "職業を選ぶ" : "転職"}
                        </Button>
                      </>
                    );
                  })()}
                </Card>

                {/* ステータスカード */}
                <Card className="p-6 space-y-4">
                  <h3 className="font-serif font-bold text-lg text-center">五つの力</h3>
                  <div className="space-y-4">
                    {stats.map(({ name, value, icon: Icon, color }) => (
                      <div key={name} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className={`w-5 h-5 ${color}`} />
                            <span className="text-sm font-semibold">{name}</span>
                          </div>
                          <span className={`text-lg font-mono font-bold ${color}`} data-testid={`stat-${name}`}>
                            {value}
                          </span>
                        </div>
                        <Progress value={(value / maxStat) * 100} className="h-2" />
                      </div>
                    ))}
                  </div>
                </Card>

                {/* HP・コイン情報 */}
                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Heart className="w-5 h-5 text-destructive" />
                      <span className="text-sm font-semibold text-muted-foreground">
                        体力
                      </span>
                    </div>
                    <div className="text-2xl font-mono font-bold">
                      {player.hp} / {player.maxHp}
                    </div>
                  </Card>

                  <Card className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-accent-foreground" />
                      <span className="text-sm font-semibold text-muted-foreground">
                        所持金
                      </span>
                    </div>
                    <div className="text-2xl font-mono font-bold">
                      {player.coins.toLocaleString()}
                      <span className="text-sm text-muted-foreground ml-1">両</span>
                    </div>
                  </Card>
                </div>
              </>
            ) : (
              <div className="bg-card rounded-xl p-12 text-center">
                <p className="text-muted-foreground">プレイヤーデータを読み込めません</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="archive" className="space-y-4">
            {/* カレンダーへのリンク */}
            <Card className="p-6 hover-elevate active-elevate-2 cursor-pointer" data-testid="button-calendar">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">暦を見る</h3>
                  <p className="text-sm text-muted-foreground">
                    過去の戦いの記録を確認
                  </p>
                </div>
              </div>
            </Card>

            {/* アーカイブへのリンク */}
            <Card className="p-6 hover-elevate active-elevate-2 cursor-pointer" data-testid="button-archive">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-chart-3/10 flex items-center justify-center">
                  <Archive className="w-6 h-6 text-chart-3" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">物語の記録</h3>
                  <p className="text-sm text-muted-foreground">
                    これまでのストーリーを再生
                  </p>
                </div>
              </div>
            </Card>

            {/* 討伐済み務メ一覧 */}
            <Card className="p-6">
              <h3 className="font-semibold mb-3">討伐の記録</h3>
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  討伐した妖怪の記録がここに表示されます
                </p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      
      {/* 職業変更モーダル */}
      <JobChangeModal 
        open={showJobModal} 
        onOpenChange={setShowJobModal} 
      />
    </div>
  );
}
