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

interface DeleteTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  airline: string;
  confirmationCode: string;
}

export const DeleteTripDialog = ({
  open,
  onOpenChange,
  onConfirm,
  airline,
  confirmationCode,
}: DeleteTripDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent role="dialog" aria-labelledby="delete-dialog-title">
        <AlertDialogHeader>
          <AlertDialogTitle id="delete-dialog-title">Delete this trip?</AlertDialogTitle>
          <AlertDialogDescription>
            You can undo this action for 10 seconds. After that, the trip will be permanently deleted in 30 days.
            <div className="mt-2 p-2 bg-muted rounded-md text-sm">
              <strong>{airline} · {confirmationCode}</strong>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
