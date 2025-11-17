import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Coins } from "lucide-react";
import { JOBS, getJobById, getJobIcon } from "@/lib/jobs";
import { useChangeJob } from "@/hooks/use-tasks";
import { Player } from "@shared/schema";

interface JobChangeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JobChangeModal({ open, onOpenChange }: JobChangeModalProps) {
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const { data: player } = useQuery<Player>({
    queryKey: ["/api/player"],
  });
  
  const changeJobMutation = useChangeJob();
  
  const isFirstJob = player?.job === "novice";
  const changeCost = isFirstJob ? 0 : 500;
  const canAfford = player ? player.coins >= changeCost : false;
  
  const handleJobSelect = (jobId: string) => {
    if (jobId === player?.job) return;
    setSelectedJob(jobId);
    setShowConfirm(true);
  };
  
  const handleConfirmChange = async () => {
    if (!selectedJob) return;
    
    try {
      await changeJobMutation.mutateAsync(selectedJob);
      setShowConfirm(false);
      setSelectedJob(null);
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation hook
    }
  };
  
  const selectedJobData = selectedJob ? getJobById(selectedJob) : null;
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md p-0 h-[90vh] overflow-hidden">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="text-2xl font-serif text-center">転職</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-4">
            {/* Cost Display */}
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">転職費用</span>
                {isFirstJob ? (
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    初回無料
                  </Badge>
                ) : (
                  <div className="flex items-center gap-1">
                    <Coins className="w-4 h-4 text-accent-foreground" />
                    <span className="font-mono font-bold">{changeCost}</span>
                    <span className="text-sm text-muted-foreground">両</span>
                  </div>
                )}
              </div>
              {!isFirstJob && !canAfford && (
                <p className="text-xs text-destructive mt-2">
                  所持金が不足しています
                </p>
              )}
            </div>
            
            {/* Current Job Display */}
            {player && player.job !== "novice" && (
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-2">現在の職業</p>
                <Card className="p-3 border-primary/50">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const currentJob = getJobById(player.job);
                      if (!currentJob) return null;
                      const Icon = getJobIcon(currentJob.icon);
                      return (
                        <>
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: `${currentJob.color}20` }}
                          >
                            <Icon className="w-5 h-5" style={{ color: currentJob.color }} />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-serif text-lg font-bold">{currentJob.nameJa}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground">Lv</span>
                              <span className="font-mono font-bold">{player.jobLevel}</span>
                              <Progress 
                                value={(player.jobXp / 100) * 100} 
                                className="h-1 flex-1"
                              />
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </Card>
              </div>
            )}
            
            {/* Job Grid */}
            <div className="grid grid-cols-2 gap-3">
              {JOBS.map((job, index) => {
                const Icon = getJobIcon(job.icon);
                const isCurrentJob = player?.job === job.id;
                const isDisabled = isCurrentJob || (!isFirstJob && !canAfford);
                
                return (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      className={`relative overflow-hidden cursor-pointer transition-all ${
                        isDisabled ? "opacity-50" : "hover-elevate active-elevate-2"
                      } ${isCurrentJob ? "border-primary" : ""}`}
                      onClick={() => !isDisabled && handleJobSelect(job.id)}
                      data-testid={`job-card-${job.id}`}
                    >
                      {/* Color Header */}
                      <div 
                        className="h-2"
                        style={{ backgroundColor: job.color }}
                      />
                      
                      <div className="p-3 space-y-3">
                        {/* Icon and Name */}
                        <div className="text-center">
                          <div 
                            className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center"
                            style={{ backgroundColor: `${job.color}20` }}
                          >
                            <Icon className="w-6 h-6" style={{ color: job.color }} />
                          </div>
                          <h3 className="font-serif text-2xl font-bold">{job.nameJa}</h3>
                          <p className="text-xs text-muted-foreground">{job.name}</p>
                        </div>
                        
                        {/* Description */}
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {job.description}
                        </p>
                        
                        {/* Bonus */}
                        <div className="space-y-1">
                          <p className="text-xs font-semibold">特性</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {job.bonus}
                          </p>
                        </div>
                        
                        {/* Skill */}
                        <div className="space-y-1 pt-2 border-t">
                          <p className="text-xs font-semibold flex items-center gap-1">
                            <span>奥義:</span>
                            <span className="font-serif">{job.skill.nameJa}</span>
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {job.skill.description}
                          </p>
                        </div>
                        
                        {isCurrentJob && (
                          <Badge 
                            variant="secondary" 
                            className="absolute top-2 right-2 bg-primary/10 text-primary"
                          >
                            現職
                          </Badge>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>転職の確認</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedJobData && (
                <div className="space-y-3 mt-2">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const Icon = getJobIcon(selectedJobData.icon);
                      return (
                        <>
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: `${selectedJobData.color}20` }}
                          >
                            <Icon className="w-5 h-5" style={{ color: selectedJobData.color }} />
                          </div>
                          <div>
                            <span className="font-serif text-xl font-bold text-foreground">
                              {selectedJobData.nameJa}
                            </span>
                            <span className="text-sm text-muted-foreground ml-2">
                              に転職します
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  
                  {!isFirstJob && (
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">費用</span>
                        <div className="flex items-center gap-1">
                          <Coins className="w-4 h-4 text-accent-foreground" />
                          <span className="font-mono font-bold">{changeCost}</span>
                          <span className="text-sm text-muted-foreground">両</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-sm text-muted-foreground">
                    職業レベルは1からスタートします。
                    この操作は取り消せません。
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmChange}
              disabled={changeJobMutation.isPending}
              data-testid="button-confirm-job-change"
            >
              {changeJobMutation.isPending ? "転職中..." : "転職する"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}