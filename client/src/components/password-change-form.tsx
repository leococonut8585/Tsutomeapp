import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PasswordChangeFormProps {
  compact?: boolean;
}

export function PasswordChangeForm({ compact = false }: PasswordChangeFormProps) {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/player/change-password", {
        currentPassword,
        newPassword,
      });
      return await res.json();
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      toast({
        title: "パスワードを更新しました",
        description: "次回のログインから新しいパスワードをご利用ください。",
      });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message.replace(/^\d+:\s*/, "") : "パスワードの更新に失敗しました";
      toast({
        title: "更新できませんでした",
        description: message,
        variant: "destructive",
      });
    },
  });

  const disabled = mutation.isPending || !currentPassword || !newPassword;

  return (
    <form className="space-y-4" onSubmit={(event) => {
      event.preventDefault();
      if (!disabled) {
        mutation.mutate();
      }
    }}>
      <div className="space-y-2">
        <Label htmlFor={compact ? "currentPasswordCompact" : "currentPassword"}>現在のパスワード</Label>
        <Input
          id={compact ? "currentPasswordCompact" : "currentPassword"}
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          placeholder="********"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={compact ? "newPasswordCompact" : "newPassword"}>新しいパスワード</Label>
        <Input
          id={compact ? "newPasswordCompact" : "newPassword"}
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          placeholder="********"
        />
      </div>
      <Button type="submit" className="w-full" disabled={disabled}>
        {mutation.isPending ? "更新中..." : "パスワードを変更"}
      </Button>
    </form>
  );
}
