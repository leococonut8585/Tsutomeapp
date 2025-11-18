import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Story } from "@shared/schema";
import { Scroll, ArrowLeft, ArrowRight } from "lucide-react";
import { ScrollIcon } from "./icons/japanese-icons";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useEffect } from "react";

interface StoryViewerDialogProps {
  story: Story | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StoryViewerDialog({ story, open, onOpenChange }: StoryViewerDialogProps) {
  // ストーリーを既読にする
  const markAsViewed = useMutation({
    mutationFn: async (storyId: string) => {
      const res = await apiRequest("PATCH", `/api/stories/${storyId}/view`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stories"] });
    },
  });

  // ダイアログが開いたら既読にする
  useEffect(() => {
    if (open && story && !story.viewed) {
      markAsViewed.mutate(story.id);
    }
  }, [open, story?.id]);

  if (!story) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scroll className="w-5 h-5 text-primary" />
            <span className="font-serif text-xl">第{story.bossNumber}章</span>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-4">
            {/* ストーリー画像 */}
            {story.storyImageUrl ? (
              <div className="relative aspect-[16/9] rounded-lg overflow-hidden">
                <img
                  src={story.storyImageUrl}
                  alt={`第${story.bossNumber}章`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              </div>
            ) : (
              <div className="aspect-[16/9] bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center japanese-shadow">
                <div className="scale-[3]">
                  <ScrollIcon />
                </div>
              </div>
            )}

            {/* ストーリーテキスト */}
            <div className="space-y-3 px-2">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-sm leading-relaxed font-serif">
                  {story.storyText}
                </div>
              </div>
            </div>

            {/* ボス情報 */}
            {story.bossId && (
              <div className="mt-6 p-4 bg-card rounded-lg border border-card-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-muted-foreground">討伐した大敵</span>
                </div>
                <p className="font-serif font-bold text-primary">
                  第{story.bossNumber}の大敵
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-close-story"
          >
            閉じる
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}