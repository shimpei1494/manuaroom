export type MaintenanceLog = {
  id: string;
  userId: string;
  taskId: string;
  doneAt: Date;
  memo: string | null;
  createdAt: Date;
};
