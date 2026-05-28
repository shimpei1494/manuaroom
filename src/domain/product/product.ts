export type Product = {
  id: string;
  userId: string;
  name: string;
  manufacturer: string | null;
  modelNumber: string | null;
  category: string | null;
  location: string | null;
  purchaseDate: Date | null;
  warrantyUntil: Date | null;
  memo: string | null;
  createdAt: Date;
  updatedAt: Date;
};
