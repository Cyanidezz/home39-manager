/**
 * Generated types mark every RPC argument without a SQL default as non-null,
 * even where the function body accepts NULL (optional phone, note, contract
 * file, due date...). Use this to pass an intentional NULL without a bare cast.
 */
export function nullable<T>(value: T | null): T {
  return value as T;
}
