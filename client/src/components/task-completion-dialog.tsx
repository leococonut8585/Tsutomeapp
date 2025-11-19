import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, AlertCircle, Loader2, Flame } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Tsutome } from "@shared/schema";

interface TaskCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tsutome: Tsutome | null;
  onComplete: (completionReport: string) => Promise<any>;
  isLoading?: boolean;
}

export function TaskCompletionDialog({ 
  open, 
  onOpenChange, 
  tsutome, 
  onComplete,
  isLoading = false
}: TaskCompletionDialogProps) {
  const [completionReport, setCompletionReport] = useState("");
  const [verificationResult, setVerificationResult] = useState<{
    approved?: boolean;
    feedback?: string;
    bonusMultiplier?: number;
    error?: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tsutome) return;
    
    setIsSubmitting(true);
    setVerificationResult(null);
    
    try {
      const result = await onComplete(completionReport);
      
      // 成功した場合は閉じる
      if (result && !result.error) {
        // AI審査結果を表示
        if (result.rewards) {
          const bonusMultiplier = result.aiVerificationResult?.bonusMultiplier || 1.0;
          const feedback = result.aiVerificationResult?.feedback || "審査完了";
          
          setVerificationResult({
            approved: true,
            feedback: feedback,
            bonusMultiplier: bonusMultiplier
          });
          
          // トーストで成功を表示
          toast({
            title: "✅ 討伐成功！",
            description: (
              <div className="space-y-1">
                <div>{feedback}</div>
                {bonusMultiplier !== 1.0 && (
                  <div className="font-semibold text-orange-600 dark:text-orange-400">
                    🔥 報酬{bonusMultiplier}倍
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  経験値: +{Math.floor((result.rewards?.exp || 0))} 
                  / コイン: +{Math.floor((result.rewards?.coins || 0))}
                </div>
                {/* ドロップアイテム表示 */}
                {result.drops && result.drops.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <div className="text-xs font-semibold text-primary">📦 ドロップアイテム</div>
                    {result.drops.map((drop: any, index: number) => (
                      <div key={index} className="flex items-center gap-1 text-xs">
                        <span className={`
                          ${drop.item.rarity === 'legendary' ? 'text-yellow-600' : 
                            drop.item.rarity === 'epic' ? 'text-purple-600' : 
                            drop.item.rarity === 'rare' ? 'text-blue-600' : 'text-gray-600'}
                        `}>
                          {drop.item.rarity === 'legendary' ? '🌟' : 
                           drop.item.rarity === 'epic' ? '💜' : 
                           drop.item.rarity === 'rare' ? '💙' : '⚪'}
                        </span>
                        <span>{drop.item.name}</span>
                        <span className="text-muted-foreground">x{drop.quantity}</span>
                        {drop.isBonus && (
                          <span className="text-yellow-600 text-xs">(ボーナス)</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          });
          
          // 3秒後に自動的に閉じる
          setTimeout(() => {
            setCompletionReport("");
            setVerificationResult(null);
            onOpenChange(false);
          }, 3000);
        }
      } else {
        // エラーまたは審査不合格
        const feedback = result?.feedback || result?.error || "タスク完了が承認されませんでした";
        
        setVerificationResult({
          approved: false,
          feedback: feedback,
          error: result?.error
        });
        
        // トーストで失敗を表示
        toast({
          title: "❌ 討伐失敗",
          description: feedback,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      // 審査不合格の場合
      if (error?.requiresRevision) {
        setVerificationResult({
          approved: false,
          feedback: error.feedback || "完了報告を見直してください",
          error: error.error
        });
      } else {
        setVerificationResult({
          approved: false,
          error: "エラーが発生しました",
          feedback: error?.message || "エラーが発生しました"
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBonusColor = (multiplier: number) => {
    if (multiplier > 1.2) return "text-emerald-600";
    if (multiplier > 1.0) return "text-green-600";
    if (multiplier < 0.8) return "text-red-600";
    if (multiplier < 1.0) return "text-orange-600";
    return "text-muted-foreground";
  };

  const handleClose = () => {
    setCompletionReport("");
    setVerificationResult(null);
    onOpenChange(false);
  };

  if (!tsutome) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-6 p-8 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">務メ完了報告</DialogTitle>
          <DialogDescription className="mt-2">
            <span className="font-semibold">{tsutome.title}</span> の完了報告を入力してください
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* 完了報告入力欄 */}
          {!verificationResult && (
            <>
              <div className="space-y-2">
                <Label htmlFor="report">完了報告</Label>
                <Textarea
                  id="report"
                  value={completionReport}
                  onChange={(e) => setCompletionReport(e.target.value)}
                  placeholder="どのように務メを完了したか、具体的に報告してください..."
                  className="min-h-[120px] resize-none"
                  required
                  disabled={isSubmitting}
                  data-testid="textarea-completion-report"
                />
                <p className="text-xs text-muted-foreground">
                  AIが報告内容を審査し、ボーナス倍率を判定します
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  data-testid="button-cancel-completion"
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  variant="outline"
                  className="flex-1"
                  disabled={isSubmitting || !completionReport.trim()}
                  data-testid="button-submit-completion"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      審査中...
                    </>
                  ) : (
                    "討伐報告を送信"
                  )}
                </Button>
              </div>
            </>
          )}

          {/* AI審査結果表示 */}
          {verificationResult && (
            <div className="space-y-4">
              {verificationResult.approved ? (
                <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    <div className="font-semibold mb-2">審査合格！</div>
                    <div>{verificationResult.feedback}</div>
                    {verificationResult.bonusMultiplier && verificationResult.bonusMultiplier !== 1.0 && (
                      <div className={`mt-2 flex items-center gap-1 ${getBonusColor(verificationResult.bonusMultiplier)}`}>
                        <Flame className="w-4 h-4" />
                        <span className="font-bold">
                          報酬倍率: {(verificationResult.bonusMultiplier * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800 dark:text-red-200">
                    <div className="font-semibold mb-2">審査不合格</div>
                    <div>{verificationResult.feedback}</div>
                    <div className="mt-2 text-sm">報告内容を見直して、もう一度お試しください。</div>
                  </AlertDescription>
                </Alert>
              )}

              {!verificationResult.approved && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setVerificationResult(null);
                    setCompletionReport("");
                  }}
                  data-testid="button-retry-completion"
                >
                  もう一度報告する
                </Button>
              )}
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}