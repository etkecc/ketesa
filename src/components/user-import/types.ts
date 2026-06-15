import { RaRecord } from "react-admin";

export interface ImportLine {
  id: string;
  displayname: string;
  user_type?: string;
  name?: string;
  deactivated?: boolean | string;
  is_guest?: boolean | string;
  admin?: boolean | string;
  is_admin?: boolean | string;
  password?: string;
  avatar_url?: string;
  threepids?: string | { medium: string; address: string }[]; // CSV: comma-separated "medium:address" pairs; after parsing: array of objects
}

export interface ParsedStats {
  user_types: Record<string, number>;
  is_guest: number;
  admin: number;
  deactivated: number;
  password: number;
  avatar_url: number;
  id: number;
  total: number;
}

export interface ChangeStats {
  total: number;
  id: number;
  is_guest: number;
  admin: number;
  password: number;
}

export type Progress = {
  done: number;
  limit: number;
} | null;

export interface ImportResult {
  skippedRecords: RaRecord[];
  succeededRecords: RaRecord[];
  totalRecordCount: number;
  changeStats: ChangeStats;
  wasDryRun: boolean;
}
