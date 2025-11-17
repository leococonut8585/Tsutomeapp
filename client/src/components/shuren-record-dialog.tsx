import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Shuren } from "@shared/schema";
import { useRecordShuren } from "@/hooks/use-tasks";
import { CalendarCheck, Trophy } from "lucide-react";

interface ShurenRecordDialogProps {
  shuren: Shuren | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const recordFormSchema = z.object({
  dataValue: z.number().min(0, "0以上の値を入力してください"),
});

type RecordFormData = z.infer<typeof recordFormSchema>;

export function ShurenRecordDialog({ shuren, open, onOpenChange }: ShurenRecordDialogProps) {
  const recordShuren = useRecordShuren();
  
  const form = useForm<RecordFormData>({
    resolver: zodResolver(recordFormSchema),
    defaultValues: {
      dataValue: 0,
    },
  });

  if (!shuren) return null;

  const onSubmit = (data: RecordFormData) => {
    recordShuren.mutate(
      { id: shuren.id, dataValue: data.dataValue },
      {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-chart-4">修練を記録</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* 修練情報 */}
          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <h3 className="font-semibold text-sm">{shuren.title}</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarCheck className="w-3 h-3" />
              <span>継続日数: {shuren.continuousDays}日</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Trophy className="w-3 h-3" />
              <span>総実施日数: {shuren.totalDays}日</span>
            </div>
          </div>

          {/* 記録フォーム */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="dataValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {shuren.dataTitle}
                      {shuren.dataUnit && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({shuren.dataUnit})
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-record-value"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={recordShuren.isPending}
                  data-testid="button-cancel-record"
                >
                  キャンセル
                </Button>
                <Button 
                  type="submit" 
                  disabled={recordShuren.isPending}
                  data-testid="button-submit-record"
                >
                  {recordShuren.isPending ? "記録中..." : "記録する"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}