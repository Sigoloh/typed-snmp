export type SetRequest = {
  oid: number[] | string,
  value: number | Buffer | string | number[],
  type: number
}