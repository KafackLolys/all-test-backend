export type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  quantity: number;
};

export type ProductInput = {
  name: unknown;
  description: unknown;
  price: unknown;
  quantity: unknown;
};
