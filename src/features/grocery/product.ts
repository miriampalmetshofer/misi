export type Product = { name: string; quantity: number };

export const MAX_PRODUCT_QUANTITY = 999_999_999;
export const MAX_PRODUCT_NAME_LENGTH = 80;
export const MAX_PRODUCT_INPUT_LENGTH = MAX_PRODUCT_NAME_LENGTH + 12;

export function validQuantity(quantity: number) {
  return (
    Number.isInteger(quantity) &&
    quantity >= 1 &&
    quantity <= MAX_PRODUCT_QUANTITY
  );
}

export function parseProduct(input: string): Product {
  const text = input.trim();
  const match = /^(\d+)\s*[x×]\s*(.+)$/iu.exec(text);
  if (!match) return { name: text, quantity: 1 };
  return { name: match[2].trim(), quantity: Number(match[1]) };
}

export function formatProduct({ name, quantity }: Product) {
  return quantity === 1 && parseProduct(name).name === name
    ? name
    : `${quantity}× ${name}`;
}

export function validProduct({ name, quantity }: Product) {
  return (
    name.trim().length > 0 &&
    name.length <= MAX_PRODUCT_NAME_LENGTH &&
    validQuantity(quantity)
  );
}
