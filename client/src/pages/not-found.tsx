import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 items-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-2xl font-bold">404 ページが見つかりません</h1>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            お探しのページは存在しないか、移動した可能性があります。
          </p>

          <div className="mt-6 space-y-2">
            <Button 
              onClick={() => setLocation("/")} 
              className="w-full"
              variant="default"
            >
              ホームに戻る
            </Button>
            <Button 
              onClick={() => window.history.back()} 
              className="w-full"
              variant="outline"
            >
              前のページに戻る
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
