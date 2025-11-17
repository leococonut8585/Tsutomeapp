import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Book } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Story } from "@shared/schema";
import { useLocation } from "wouter";

export default function StoryPage() {
  const [, setLocation] = useLocation();

  // ストーリー一覧取得
  const { data: stories, isLoading } = useQuery<Story[]>({
    queryKey: ["/api/stories"],
  });

  const sortedStories = stories?.sort((a, b) => a.bossNumber - b.bossNumber) || [];

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 bg-card border-b border-card-border shadow-sm">
        <div className="flex items-center gap-2 px-4 h-14">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setLocation("/profile")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-serif font-bold text-primary">物語の記録</h1>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="px-4 py-4 space-y-4">
        {/* 説明 */}
        <div className="bg-card rounded-xl p-4 border border-card-border">
          <p className="text-sm text-muted-foreground leading-relaxed">
            これまでの戦いの物語を振り返ることができます。
            大敵を討伐するたびに、新たな章が開かれます。
          </p>
        </div>

        {/* ストーリーリスト */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : sortedStories.length > 0 ? (
          <div className="space-y-3">
            {sortedStories.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-xl p-12 text-center border border-dashed border-border">
            <Book className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-2">まだ物語は始まっていません</p>
            <p className="text-sm text-muted-foreground">
              務メを討伐してストーリーを進めましょう
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function StoryCard({ story }: { story: Story }) {
  return (
    <Card
      className="overflow-hidden hover-elevate active-elevate-2 cursor-pointer"
      data-testid={`story-card-${story.id}`}
    >
      <div className="flex flex-col">
        {/* ストーリー画像 */}
        {story.storyImageUrl ? (
          <div className="relative aspect-[16/9] bg-gradient-to-b from-primary/10 to-primary/5">
            <img
              src={story.storyImageUrl}
              alt={`第${story.bossNumber}章`}
              className="w-full h-full object-cover"
              data-testid="story-image"
            />
            {!story.viewed && (
              <div className="absolute top-2 right-2">
                <Badge variant="destructive" className="text-xs">
                  未読
                </Badge>
              </div>
            )}
          </div>
        ) : (
          <div className="aspect-[16/9] bg-gradient-to-b from-primary/10 to-primary/5 flex items-center justify-center">
            <span className="text-4xl">📜</span>
          </div>
        )}

        {/* ストーリー内容 */}
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-primary" data-testid="story-chapter">
              第{story.bossNumber}章
            </h3>
            {story.viewed && (
              <Badge variant="secondary" className="text-xs">
                閲覧済み
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed" data-testid="story-text">
            {story.storyText}
          </p>
          <Button variant="outline" size="sm" className="w-full mt-2" data-testid="button-view-story">
            物語を読む
          </Button>
        </div>
      </div>
    </Card>
  );
}
