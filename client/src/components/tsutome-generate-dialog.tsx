import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Shihan, Shuren } from "@shared/schema";

interface TsutomeGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: Shihan | Shuren | null;
  sourceType: "shihan" | "shuren";
}

const difficultyOptions = [
  { value: "easy", label: "易 (★×1)" },
  { value: "normal", label: "普 (★×2)" },
  { value: "hard", label: "難 (★×3)" },
  { value: "veryHard", label: "激 (★×4)" },
  { value: "extreme", label: "極 (★×5)" },
];

export function TsutomeGenerateDialog({ 
  open, 
  onOpenChange, 
  source,
  sourceType 
}: TsutomeGenerateDialogProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState("normal");
  const [deadline, setDeadline] = useState<Date | undefined>(new Date());

  // Reset form when dialog opens with new source
  useEffect(() => {
    if (open) {
      console.log("Dialog opened, resetting form for:", { sourceType, sourceId: source?.id });
      setTitle("");
      setDifficulty("normal");
      setDeadline(new Date());
    }
  }, [open, source, sourceType]);

  // 師範から務メを生成
  const generateFromShihan = useMutation({
    mutationFn: async (data: { title: string; deadline: Date; difficulty: string }) => {
      console.log("Generating tsutome from shihan:", { shihanId: source?.id, data });
      const res = await apiRequest(
        "POST",
        `/api/shihans/${source?.id}/generate-tsutome`,
        data
      );
      const result = await res.json();
      console.log("Tsutome generation result:", result);
      return result;
    },
    onSuccess: (data) => {
      console.log("Tsutome generated successfully:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/tsutomes"] });
      queryClient.invalidateQueries({ queryKey: [`/api/shihans/${source?.id}/progress`] });
      toast({
        title: "務メを生成しました",
        description: "師範の目標に向けた務メが作成されました",
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error("Error generating tsutome from shihan:", error);
      toast({
        title: "エラー",
        description: error?.message || "務メの生成に失敗しました",
        variant: "destructive",
      });
    },
  });

  // 修練から務メを生成
  const generateFromShuren = useMutation({
    mutationFn: async () => {
      console.log("Generating tsutome from shuren:", { shurenId: source?.id });
      const res = await apiRequest(
        "POST",
        `/api/shurens/${source?.id}/generate-tsutome`,
        {}
      );
      const result = await res.json();
      console.log("Tsutome generation result:", result);
      return result;
    },
    onSuccess: (data) => {
      console.log("Tsutome generated successfully:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/tsutomes"] });
      toast({
        title: "今日の修練タスクを生成しました",
        description: "修練を継続して習慣を身につけましょう",
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error("Error generating tsutome from shuren:", error);
      toast({
        title: "エラー",
        description: error?.message || "務メの生成に失敗しました",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setTitle("");
    setDifficulty("normal");
    setDeadline(new Date());
  };

  const handleSubmit = () => {
    console.log("handleSubmit called:", { sourceType, source, title, deadline, difficulty });
    
    if (sourceType === "shihan" && source) {
      if (!title || !deadline) {
        console.error("Validation failed:", { title, deadline });
        toast({
          title: "入力エラー",
          description: "タイトルと期限を入力してください",
          variant: "destructive",
        });
        return;
      }
      console.log("Submitting shihan generation:", { title, deadline, difficulty });
      generateFromShihan.mutate({ title, deadline, difficulty });
    } else if (sourceType === "shuren" && source) {
      console.log("Submitting shuren generation");
      generateFromShuren.mutate();
    } else {
      console.error("Invalid state:", { sourceType, source });
    }
  };

  if (!source) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {sourceType === "shihan" ? "務メを生成" : "今日の修練タスク"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* 連携元情報 */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-semibold">
              {sourceType === "shihan" ? "師範" : "修練"}: {source.title}
            </p>
            {sourceType === "shihan" && (
              <p className="text-xs text-muted-foreground mt-1">
                この師範の目標に向けた具体的なタスクを作成します
              </p>
            )}
            {sourceType === "shuren" && (
              <p className="text-xs text-muted-foreground mt-1">
                今日の修練タスクを生成します（1日1回のみ）
              </p>
            )}
          </div>

          {/* 師範の場合のみフォーム表示 */}
          {sourceType === "shihan" && (
            <>
              {/* タイトル */}
              <div className="space-y-2">
                <Label htmlFor="title">タスクタイトル</Label>
                <Input
                  id="title"
                  placeholder="具体的なタスクを入力"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  data-testid="input-generate-title"
                />
              </div>

              {/* 難易度 */}
              <div className="space-y-2">
                <Label>難易度</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger data-testid="select-generate-difficulty">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {difficultyOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 期限 */}
              <div className="space-y-2">
                <Label>期限</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !deadline && "text-muted-foreground"
                      )}
                      data-testid="button-select-generate-deadline"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {deadline ? format(deadline, "PPP", { locale: ja }) : "日付を選択"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={deadline}
                      onSelect={setDeadline}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}

          {/* アクションボタン */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={
                // Check if mutations are pending
                generateFromShihan.isPending || 
                generateFromShuren.isPending ||
                // For shihan, also check if required fields are filled
                (sourceType === "shihan" && (!title || !deadline))
              }
              data-testid="button-generate-submit"
            >
              {sourceType === "shihan" ? "務メを生成" : "今日のタスクを生成"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}