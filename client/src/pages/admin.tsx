import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Shield,
  Users,
  CircleDollarSign,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  UserPlus,
  LogOut,
  Search,
  Copy,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AdminUser = {
  id: string;
  name: string;
  username: string;
  role: "admin" | "player";
  job: string | null;
  level: number;
  coins: number;
  suspended: boolean;
  passwordPlain: string;
  monthlyApiCalls: number;
  monthlyApiCost: number;
  createdAt: string | null;
};

type AdminSummary = {
  totalUsers: number;
  suspendedUsers: number;
  totalMonthlyCost: number;
  totalMonthlyCalls: number;
};

type CreateUserPayload = {
  username: string;
  password: string;
  role: "admin" | "player";
  name: string;
};

type AdminAuditLogEntry = {
  id: string;
  action: string;
  details?: Record<string, unknown> | null;
  createdAt: string;
  admin?: {
    id: string;
    name: string;
    username: string;
  } | null;
  targetUser?: {
    id: string;
    name: string;
    username: string;
  } | null;
};

const currencyFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("ja-JP");

export default function AdminPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [formState, setFormState] = useState<CreateUserPayload>({
    username: "",
    password: "",
    role: "player",
    name: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [resetResult, setResetResult] = useState<{ username: string; newPassword: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "admin") {
      navigate("/", { replace: true });
    }
  }, [navigate, user]);

  const usersQuery = useQuery<{ users: AdminUser[] }>({
    queryKey: ["/api/admin/users"],
    enabled: user?.role === "admin",
  });

  const summaryQuery = useQuery<AdminSummary>({
    queryKey: ["/api/admin/summary"],
    enabled: user?.role === "admin",
  });

  const auditQuery = useQuery<{ logs: AdminAuditLogEntry[] }>({
    queryKey: ["/api/admin/logs"],
    enabled: user?.role === "admin",
    staleTime: 30_000,
  });

  const invalidateAdminData = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/summary"] });
  };

  const createUserMutation = useMutation({
    mutationFn: async (payload: CreateUserPayload) => {
      const res = await apiRequest("POST", "/api/admin/users", payload);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "ユーザーを追加しました",
        description: "新しいアカウントを利用者へ共有してください。",
      });
      invalidateAdminData();
      setFormState({
        username: "",
        password: "",
        role: "player",
        name: "",
      });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message.replace(/^\d+:\s*/, "") : "ユーザー追加に失敗しました";
      toast({
        title: "追加できませんでした",
        description: message,
        variant: "destructive",
      });
    },
  });

  const suspensionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "suspend" | "resume" }) => {
      const res = await apiRequest("POST", `/api/admin/users/${id}/${action}`);
      return await res.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.action === "suspend" ? "利用を一時停止しました" : "利用停止を解除しました",
      });
      invalidateAdminData();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message.replace(/^\d+:\s*/, "") : "操作に失敗しました";
      toast({
        title: "操作できませんでした",
        description: message,
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/admin/users/${id}/reset-password`);
      return (await res.json()) as { user: AdminUser; newPassword: string };
    },
    onSuccess: ({ user: targetUser, newPassword }) => {
      invalidateAdminData();
      setResetResult({ username: targetUser.username, newPassword });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message.replace(/^\d+:\s*/, "") : "パスワードの再発行に失敗しました";
      toast({
        title: "再発行できませんでした",
        description: message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      queryClient.removeQueries({ queryKey: ["/api/player"] });
      navigate("/login", { replace: true });
    },
    onError: () => {
      toast({
        title: "ログアウトに失敗しました",
        variant: "destructive",
      });
    },
  });

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-300">管理者アカウントでログインしてください。</p>
      </div>
    );
  }

  const users = usersQuery.data?.users ?? [];
  const summary = summaryQuery.data;

  const busy =
    createUserMutation.isPending ||
    suspensionMutation.isPending ||
    resetPasswordMutation.isPending ||
    usersQuery.isFetching;

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return users;
    return users.filter((item) => {
      const job = item.job || "";
      return (
        item.username.toLowerCase().includes(term) ||
        (item.name || "").toLowerCase().includes(term) ||
        job.toLowerCase().includes(term)
      );
    });
  }, [users, searchTerm]);

  const totalMonthlyCostFormatted = summary
    ? currencyFormatter.format(summary.totalMonthlyCost * 150) // 粗い円換算
    : "—";

  const summaryCards = useMemo(
    () => [
      {
        title: "総ユーザー数",
        icon: Users,
        value: summary ? numberFormatter.format(summary.totalUsers) : "—",
        description: "登録済みの冒険者",
      },
      {
        title: "停止中ユーザー",
        icon: PauseCircle,
        value: summary ? numberFormatter.format(summary.suspendedUsers) : "—",
        description: "現在利用不可",
      },
      {
        title: "総利用料金 (推定)",
        icon: CircleDollarSign,
        value: summary ? totalMonthlyCostFormatted : "—",
        description: summary ? `APIコール ${numberFormatter.format(summary.totalMonthlyCalls)} 件` : "—",
      },
    ],
    [summary, totalMonthlyCostFormatted],
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.username || !formState.password) {
      toast({
        title: "入力が不足しています",
        description: "ユーザー名とパスワードを入力してください。",
        variant: "destructive",
      });
      return;
    }
    createUserMutation.mutate(formState);
  };

  const handleDownloadLogs = () => {
    window.open("/api/admin/logs?format=csv", "_blank", "noopener,noreferrer");
  };

  const handleCopy = (value: string, label?: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      toast({
        title: "コピーに失敗しました",
        description: "手動で選択してください。",
        variant: "destructive",
      });
      return;
    }
    navigator.clipboard
      .writeText(value)
      .then(() =>
        toast({
          title: "クリップボードにコピーしました",
          description: label || "",
        }),
      )
      .catch(() =>
        toast({
          title: "コピーに失敗しました",
          description: "手動で選択してください。",
          variant: "destructive",
        }),
      );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50 pb-16">
      <header className="border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/20 p-2">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Tsutome Admin</p>
              <h1 className="text-lg font-semibold">管理者ダッシュボード</h1>
            </div>
          </div>
          <Button
            variant="ghost"
            className="text-slate-200"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {logoutMutation.isPending ? "ログアウト中..." : "ログアウト"}
          </Button>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
        <section className="grid gap-4 md:grid-cols-3">
          {summaryCards.map((card) => (
            <Card key={card.title} className="bg-slate-900/70 border-slate-800 text-slate-100 shadow-2xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-semibold">{card.title}</CardTitle>
                <card.icon className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-serif font-bold">{card.value}</div>
                <p className="text-xs text-slate-400 mt-1">{card.description}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <Card className="bg-slate-900/70 border-slate-800 text-slate-100 shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="h-5 w-5 text-primary" />
              新しいユーザーを追加
            </CardTitle>
            <CardDescription className="text-slate-400">
              ID・パスワード・アカウント種別を入力して登録します。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="displayName">表示名</Label>
                <Input
                  id="displayName"
                  value={formState.name}
                  onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="例: Leo"
                  className="bg-slate-900 border-slate-800"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">ユーザーID</Label>
                <Input
                  id="username"
                  value={formState.username}
                  onChange={(event) => setFormState((prev) => ({ ...prev, username: event.target.value }))}
                  placeholder="例: leo"
                  autoComplete="off"
                  required
                  className="bg-slate-900 border-slate-800"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">初期パスワード</Label>
                <Input
                  id="password"
                  type="text"
                  value={formState.password}
                  onChange={(event) => setFormState((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="英数字を4文字以上"
                  required
                  className="bg-slate-900 border-slate-800"
                />
              </div>
              <div className="space-y-2">
                <Label>アカウント種別</Label>
                <Select
                  value={formState.role}
                  onValueChange={(value: "admin" | "player") =>
                    setFormState((prev) => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger className="bg-slate-900 border-slate-800">
                    <SelectValue placeholder="アカウント種別" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="player">一般ユーザー</SelectItem>
                    <SelectItem value="admin">管理者</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" className="min-w-[160px]" disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      登録中...
                    </>
                  ) : (
                    "登録する"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/70 border-slate-800 text-slate-100 shadow-2xl">
          <CardHeader className="space-y-3">
            <div>
              <CardTitle className="text-lg">ユーザー一覧</CardTitle>
              <CardDescription className="text-slate-400">
                アカウント停止・解除、パスワードリセットをここから行えます。
              </CardDescription>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="ユーザー名・表示名で検索"
                  className="pl-10 bg-slate-900 border-slate-800"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  className="border-slate-700 text-slate-200"
                  onClick={() => {
                    usersQuery.refetch();
                    summaryQuery.refetch();
                  }}
                  disabled={usersQuery.isFetching || summaryQuery.isFetching}
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${
                      usersQuery.isFetching || summaryQuery.isFetching ? "animate-spin" : ""
                    }`}
                  />
                  更新
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {usersQuery.isLoading ? (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                読み込み中...
              </div>
            ) : usersQuery.isError ? (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
                ユーザー一覧を取得できませんでした。ページを再読込してください。
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead>ユーザー</TableHead>
                    <TableHead>職業</TableHead>
                    <TableHead>パスワード</TableHead>
                    <TableHead>API料金</TableHead>
                    <TableHead>状態</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((item) => (
                    <TableRow key={item.id} className="border-slate-800">
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-semibold">
                            {item.name}
                            {item.role === "admin" && (
                              <Badge variant="outline" className="ml-2 border-primary text-primary">
                                管理者
                              </Badge>
                            )}
                          </p>
                          <p className="text-xs text-slate-400">@{item.username}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{item.job || "Novice"}</p>
                          <p className="text-xs text-slate-400">Lv.{item.level}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-slate-800 px-2 py-1 text-xs">{item.passwordPlain}</code>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-slate-300 hover:text-white"
                            onClick={() => handleCopy(item.passwordPlain, `${item.username} のパスワード`)}
                            aria-label="パスワードをコピー"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{currencyFormatter.format(item.monthlyApiCost * 150)}</p>
                          <p className="text-xs text-slate-400">
                            {numberFormatter.format(item.monthlyApiCalls)} 件
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.suspended ? (
                          <Badge variant="destructive">停止中</Badge>
                        ) : (
                          <Badge variant="outline" className="border-emerald-400/60 text-emerald-200">
                            稼働中
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-y-2">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-700 text-slate-200"
                            onClick={() =>
                              suspensionMutation.mutate({
                                id: item.id,
                                action: item.suspended ? "resume" : "suspend",
                              })
                            }
                            disabled={busy}
                          >
                            {item.suspended ? (
                              <>
                                <PlayCircle className="mr-1 h-4 w-4" />
                                再開
                              </>
                            ) : (
                              <>
                                <PauseCircle className="mr-1 h-4 w-4" />
                                停止
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => resetPasswordMutation.mutate(item.id)}
                            disabled={busy}
                          >
                            <RefreshCw className="mr-1 h-4 w-4" />
                            PW再発行
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!filteredUsers.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-6 text-center text-slate-400">
                        該当するユーザーが見つかりません。
                      </TableCell>
                    </TableRow>
                  )}
        </TableBody>
        <TableCaption className="text-slate-500">
          表示されているパスワードは平文です。共有時は安全な経路を利用してください。
        </TableCaption>
      </Table>
    )}
  </CardContent>
</Card>

        <Card className="bg-slate-900/70 border-slate-800 text-slate-100 shadow-2xl">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-lg">監査ログ</CardTitle>
              <CardDescription className="text-slate-400">管理者操作の履歴を確認できます。</CardDescription>
            </div>
            <Button variant="outline" className="border-slate-700 text-slate-200" onClick={handleDownloadLogs}>
              CSV ダウンロード
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {auditQuery.isLoading ? (
              <div className="flex items-center justify-center py-10 text-slate-400">
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                読み込み中...
              </div>
            ) : auditQuery.isError ? (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
                監査ログを取得できませんでした。
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead>日時</TableHead>
                    <TableHead>アクション</TableHead>
                    <TableHead>管理者</TableHead>
                    <TableHead>対象ユーザー</TableHead>
                    <TableHead>詳細</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(auditQuery.data?.logs ?? []).map((log) => (
                    <TableRow key={log.id} className="border-slate-800">
                      <TableCell className="text-sm text-slate-300">
                        {new Date(log.createdAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
                      </TableCell>
                      <TableCell className="capitalize">{log.action.replace(/_/g, " ")}</TableCell>
                      <TableCell>
                        {log.admin ? (
                          <>
                            <p className="font-semibold">{log.admin.name}</p>
                            <p className="text-xs text-slate-400">@{log.admin.username}</p>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.targetUser ? (
                          <>
                            <p className="font-semibold">{log.targetUser.name}</p>
                            <p className="text-xs text-slate-400">@{log.targetUser.username}</p>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-300">
                        {log.details ? JSON.stringify(log.details) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!auditQuery.data?.logs?.length && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-6 text-center text-slate-400">
                        まだ記録がありません。
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={Boolean(resetResult)} onOpenChange={(open) => !open && setResetResult(null)}>
        <DialogContent className="bg-slate-900 text-slate-50 border-slate-800">
          <DialogHeader>
            <DialogTitle>新しいパスワードを発行しました</DialogTitle>
            <DialogDescription className="text-slate-300">
              {resetResult ? `@${resetResult.username} に伝えるパスワードをコピーしてください。` : ""}
            </DialogDescription>
          </DialogHeader>
          {resetResult && (
            <div className="flex flex-col gap-2">
              <Label className="text-sm text-slate-300">新パスワード</Label>
              <div className="flex items-center gap-2">
                <code className="rounded bg-slate-800 px-3 py-2 text-lg tracking-wide">
                  {resetResult.newPassword}
                </code>
                <Button
                  size="icon"
                  variant="outline"
                  className="border-slate-700 text-slate-200"
                  onClick={() => handleCopy(resetResult.newPassword, "新しいパスワード")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setResetResult(null)}>閉じる</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
