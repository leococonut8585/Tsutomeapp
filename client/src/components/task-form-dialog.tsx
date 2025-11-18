import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, addDays } from "date-fns";
import { ja } from "date-fns/locale";
import { useCreateTsutome, useCreateShuren, useCreateShihan, useCreateShikaku } from "@/hooks/use-tasks";

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskType: "tsutome" | "shuren" | "shihan" | "shikaku";
}

const genreOptions = [
  { value: "hobby", label: "趣味" },
  { value: "study", label: "勉強" },
  { value: "exercise", label: "運動" },
  { value: "work", label: "仕事" },
  { value: "housework", label: "家事" },
  { value: "fun", label: "遊び" },
];

const difficultyOptions = [
  { value: "easy", label: "易", stars: 1 },
  { value: "normal", label: "普", stars: 2 },
  { value: "hard", label: "難", stars: 3 },
  { value: "veryHard", label: "激", stars: 4 },
  { value: "extreme", label: "極", stars: 5 },
];

export function TaskFormDialog({ open, onOpenChange, taskType }: TaskFormDialogProps) {
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("hobby");
  const [difficulty, setDifficulty] = useState("normal");
  const [deadline, setDeadline] = useState<Date>(addDays(new Date(), 7));
  const [repeatInterval, setRepeatInterval] = useState(1);
  const [targetDate, setTargetDate] = useState<Date>(addDays(new Date(), 365)); // 師範用（1年後）

  const createTsutome = useCreateTsutome();
  const createShuren = useCreateShuren();
  const createShihan = useCreateShihan();
  const createShikaku = useCreateShikaku();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (taskType === "tsutome") {
      await createTsutome.mutateAsync({
        title,
        deadline,
        genre,
        startDate: new Date(),
        difficulty,
        monsterName: "", // AIが生成
        linkedShurenId: null,
        linkedShihanId: null,
        playerId: "", // サーバー側で設定
      });
    } else if (taskType === "shuren") {
      await createShuren.mutateAsync({
        title,
        genre,
        repeatInterval,
        startDate: new Date(),
        dataTitle: "回数",
        dataUnit: "回",
        trainingName: "", // AIが生成
        playerId: "", // サーバー側で設定
      });
    } else if (taskType === "shihan") {
      await createShihan.mutateAsync({
        title,
        genre,
        startDate: new Date(),
        targetDate,
        masterName: "", // AIが生成
        playerId: "", // サーバー側で設定
      });
    } else if (taskType === "shikaku") {
      await createShikaku.mutateAsync({
        title,
        difficulty,
        assassinName: "", // AIが生成
        playerId: "", // サーバー側で設定
      });
    }

    // フォームをリセット
    setTitle("");
    setGenre("hobby");
    setDifficulty("normal");
    setDeadline(addDays(new Date(), 7));
    setRepeatInterval(1);
    setTargetDate(addDays(new Date(), 365));
    onOpenChange(false);
  };

  const titleMap = {
    tsutome: "新しい務メ",
    shuren: "新しい修練",
    shihan: "新しい師範",
    shikaku: "新しい刺客",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-6 p-8 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">{titleMap[taskType]}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* タイトル */}
          <div className="space-y-2">
            <Label htmlFor="title">タイトル</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="やるべきことを入力..."
              required
              data-testid="input-task-title"
            />
          </div>

          {/* ジャンル */}
          <div className="space-y-2">
            <Label htmlFor="genre">ジャンル</Label>
            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger id="genre" data-testid="select-genre">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {genreOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              レベルアップ時のステータス成長に影響します
            </p>
          </div>

          {/* 難易度 (務メ・刺客のみ) */}
          {(taskType === "tsutome" || taskType === "shikaku") && (
            <div className="space-y-2">
              <Label htmlFor="difficulty">難易度</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger id="difficulty" data-testid="select-difficulty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {difficultyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label} (★×{option.stars})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                難易度が高いほど、得られる報酬も大きくなります
              </p>
            </div>
          )}

          {/* 期限 (務メのみ) */}
          {taskType === "tsutome" && (
            <div className="space-y-2">
              <Label>期限</Label>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start text-left font-normal"
                data-testid="button-select-deadline"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {deadline ? format(deadline, "PPP", { locale: ja }) : "日付を選択"}
              </Button>
              <p className="text-xs text-muted-foreground">
                期限より早く完了するほど、ボーナスが増えます
              </p>
            </div>
          )}

          {/* 繰り返し間隔 (修練のみ) */}
          {taskType === "shuren" && (
            <div className="space-y-2">
              <Label htmlFor="interval">繰り返し間隔 (日)</Label>
              <Input
                id="interval"
                type="number"
                min="1"
                max="30"
                value={repeatInterval}
                onChange={(e) => setRepeatInterval(Number(e.target.value))}
                data-testid="input-repeat-interval"
              />
              <p className="text-xs text-muted-foreground">
                何日ごとに実施するかを設定します (最大30日)
              </p>
            </div>
          )}

          {/* 目標日 (師範のみ) */}
          {taskType === "shihan" && (
            <div className="space-y-2">
              <Label>目標達成日</Label>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start text-left font-normal"
                data-testid="button-select-target-date"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {targetDate ? format(targetDate, "PPP", { locale: ja }) : "日付を選択"}
              </Button>
              <p className="text-xs text-muted-foreground">
                1年以上先の長期目標を設定できます
              </p>
            </div>
          )}

          {/* 期限説明 (刺客のみ) */}
          {taskType === "shikaku" && (
            <div className="space-y-2">
              <Label>緊急期限</Label>
              <p className="text-sm text-muted-foreground">
                刺客任務は自動的に24時間の期限が設定されます
              </p>
            </div>
          )}

          {/* 送信ボタン */}
          <div className="flex gap-3 pt-6">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel"
            >
              キャンセル
            </Button>
            <Button 
              type="submit" 
              variant="outline"
              className="flex-1" 
              data-testid="button-submit"
              disabled={createTsutome.isPending || createShuren.isPending || createShihan.isPending || createShikaku.isPending}
            >
              {(createTsutome.isPending || createShuren.isPending || createShihan.isPending || createShikaku.isPending) ? "作成中..." : "作成"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
