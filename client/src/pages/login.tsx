import { useState } from "react";
import { useLocation } from "wouter";
import { ShieldCheck, Swords } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/login", {
        username: username.trim(),
        password,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/me"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/player"] }),
      ]);
      toast({
        title: "ようこそ！",
        description: "ダッシュボードに移動します。",
      });
      navigate("/", { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message.replace(/^\d+:\s*/, "") : "ログインに失敗しました";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 text-slate-50">
      <div className="text-center space-y-4 mb-8">
        <Swords className="w-10 h-10 mx-auto text-primary" />
        <p className="text-sm uppercase tracking-[0.4em] text-slate-300">Tsutome Dashboard</p>
        <h1 className="text-3xl font-serif font-bold">務めの王国へようこそ</h1>
        <p className="text-slate-300 max-w-md">
          アカウントでログインして、妖怪との戦いと日々の務めを管理しましょう。
        </p>
      </div>

      <Card className="w-full max-w-md bg-slate-900/70 border-slate-800 shadow-2xl">
        <form className="p-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
              <ShieldCheck className="w-4 h-4" />
              セキュアログイン
            </div>
            <p className="text-sm text-slate-400">
              「AdminTsutome / AdminTsutome」または発行済みのユーザーIDでサインインできます。
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">ユーザー名</Label>
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                placeholder="例: leo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                placeholder="*******"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-400 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "ログイン中..." : "ログイン"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
