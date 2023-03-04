export interface UserDBValue {
  first?: string;
  last?: string;
  age?: number;
}

export interface User {
  uuid: string;
  first: string;
  last: string;
  age: number;
  createdAt: Date;
  updatedAt: Date;
}
