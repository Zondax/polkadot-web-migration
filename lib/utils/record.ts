/**
 * Get the key of a record by its value.
 * @param record - The record to search in.
 * @param value - The value to search for.
 * @returns The key of the record that matches the value, or undefined if no match is found.
 */
function getKeyByValue<T extends Record<string, string>>(record: T, value: string): keyof T | undefined {
  return (Object.keys(record) as (keyof T)[]).find(key => record[key] === value)
}
