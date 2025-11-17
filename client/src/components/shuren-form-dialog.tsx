import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertShurenSchema } from "@shared/schema";
import { z } from "zod";
import { useCreateShuren } from "@/hooks/use-tasks";
import { CalendarDays } from "lucide-react";

interface ShurenFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shurenFormSchema = insertShurenSchema
  .omit({ id: true, playerId: true, trainingName: true, trainingImageUrl: true, createdAt: true })
  .extend({
    title: z.string().min(1, "タイトルは必須です"),
    genre: z.enum(["hobby", "study", "exercise", "work", "housework", "fun"]),
    repeatInterval: z.number().min(1, "1以上の値を入力してください"),
    dataTitle: z.string().min(1, "記録するデータのタイトルは必須です"),
    dataUnit: z.string().default(""),
  });

type ShurenFormData = z.infer<typeof shurenFormSchema>;

export function ShurenFormDialog({ open, onOpenChange }: ShurenFormDialogProps) {
  const createShuren = useCreateShuren();
  
  const form = useForm<ShurenFormData>({
    resolver: zodResolver(shurenFormSchema),
    defaultValues: {
      title: "",
      genre: "hobby",
      repeatInterval: 1,
      startDate: new Date(),
      dataTitle: "実施回数",
      dataUnit: "回",
      continuousDays: 0,
      totalDays: 0,
      missedCount: 0,
      active: true,
    },
  });

  const onSubmit = (data: ShurenFormData) => {
    createShuren.mutate(data, {
      onSuccess: () => {
        onOpenChange(false);
        form.reset();
      },
    });
  };

  const genreOptions = [
    { value: "hobby", label: "趣味" },
    { value: "study", label: "勉強" },
    { value: "exercise", label: "運動" },
    { value: "work", label: "仕事" },
    { value: "housework", label: "家事" },
    { value: "fun", label: "遊び" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-chart-4">新しい修練</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>修練の名前</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="例: 毎日30分読書"
                      {...field}
                      data-testid="input-shuren-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="genre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ジャンル</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-shuren-genre">
                        <SelectValue placeholder="ジャンルを選択" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {genreOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="repeatInterval"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>繰り返し間隔（日）</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        data-testid="input-repeat-interval"
                      />
                      <span className="text-sm text-muted-foreground">日ごと</span>
                    </div>
                  </FormControl>
                  <FormDescription>
                    毎日なら「1」、1日おきなら「2」と入力
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dataTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>記録データ名</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="例: 実施回数"
                        {...field}
                        data-testid="input-data-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dataUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>単位（任意）</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="例: 回、分、ページ"
                        {...field}
                        data-testid="input-data-unit"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createShuren.isPending}
                data-testid="button-cancel-shuren"
              >
                キャンセル
              </Button>
              <Button 
                type="submit" 
                disabled={createShuren.isPending}
                data-testid="button-submit-shuren"
              >
                {createShuren.isPending ? "作成中..." : "修練を始める"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}