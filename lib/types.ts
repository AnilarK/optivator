export type StudentStage =
  | 'New'
  | 'Stage 1'
  | 'Stage 2'
  | 'Stage 3'
  | 'Selected'
  | 'Rejected'
  | 'On Hold';

export interface StudentComment {
  id: string;
  studentId: string;
  comment: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface StudentRecord {
  id: string;
  timestamp?: string | null;
  emailAddress?: string | null;
  fullName: string;
  gender?: string | null;
  dob?: string | null;
  contactNumber?: string | null;
  emailId?: string | null;
  registrationNo?: string | null;
  college?: string | null;
  course?: string | null;
  passingYear?: number | null;
  specialization?: string | null;
  class10Percentage?: number | null;
  class12Percentage?: number | null;
  graduationCGPA?: number | null;
  atsScore?: number | null;
  cfRating?: number | null;
  leetcodeRating?: number | null;
  codechefRating?: number | null;
  hackerRankUsername?: string | null;
  hackerRankId?: string | null;
  hackerRankMatchStatus?: string | null;
  hackerRankMatchType?: string | null;
  hackerRankScore?: number | null;
  hackerRankRank?: number | null;
  hackerRankContestTimeTaken?: number | null;
  hackerRankQuestionsSolved?: number | null;
  hackerRankQuestions?: import('@/lib/hackerrank').HackerRankQuestionResult[];
  hackerRankQuestion1Minutes?: number | null;
  hackerRankQuestion2Minutes?: number | null;
  hackerRankLastSyncedAt?: string | Date | null;
  hackerRankContestSlug?: string | null;
  hackerRankContestName?: string | null;
  hackerRankResult?: string | null;
  hackerRankResultSource?: string | null;
  activeBacklogs: boolean;
  activeBacklogsRaw?: string | null;
  resumeUrl?: string | null;
  stage: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  comments?: StudentComment[];
  _count?: {
    comments: number;
  };
}

export interface StudentFilters {
  search?: string;
  stage?: string;
  college?: string;
  branch?: string;
  passingYear?: string;
  gender?: string;
  backlogs?: 'all' | 'none' | 'has';
  minCgpa?: string;
  maxCgpa?: string;
  minAtsScore?: string;
  minCfRating?: string;
  minLeetcodeRating?: string;
  minCodechefRating?: string;
  hackerRankStatus?: 'all' | 'matched' | 'not_found' | 'ambiguous';
  hackerRankResult?: 'all' | 'pass' | 'fail' | 'absent' | 'fail_or_absent' | 'needs_mapping';
  hackerRankMinScore?: string;
  hackerRankMaxScore?: string;
  hackerRankQ1After?: string;
  hackerRankQ1Within?: string;
  hackerRankQ2After?: string;
  hackerRankQ2Within?: string;
  hackerRankCombinedTimeMode?: 'all' | 'both_after' | 'both_within' | 'any_after' | 'any_within';
  hackerRankCombinedTime?: string;
  hackerRankSolvedCount?: 'all' | '0' | '1' | '2';
  sortBy?: 'fullName' | 'graduationCGPA' | 'passingYear' | 'stage' | 'updatedAt' | 'atsScore' | 'cfRating' | 'leetcodeRating' | 'codechefRating';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface DashboardStats {
  total: number;
  stageCounts: Record<string, number>;
  noBacklogsCount: number;
  hasBacklogsCount: number;
}

export interface FilterOptions {
  colleges: string[];
  branches: string[];
  passingYears: number[];
  genders: string[];
}

export interface ParsedCsvRow {
  rowNumber: number;
  isValid: boolean;
  validationError?: string;
  existsInDb?: boolean;
  existingId?: string;
  existingStage?: string;
  data: {
    timestamp?: string;
    emailAddress?: string;
    fullName: string;
    gender?: string;
    dob?: string;
    contactNumber?: string;
    emailId?: string;
    registrationNo?: string;
    college?: string;
    course?: string;
    passingYear?: number;
    specialization?: string;
    class10Percentage?: number;
    class12Percentage?: number;
    graduationCGPA?: number;
    atsScore?: number;
    cfRating?: number;
    leetcodeRating?: number;
    codechefRating?: number;
    hackerRankUsername?: string;
    activeBacklogs: boolean;
    activeBacklogsRaw?: string;
    resumeUrl?: string;
  };
}

export interface ImportPreviewResult {
  total: number;
  newCount: number;
  updatedCount: number;
  invalidCount: number;
  previewRows: ParsedCsvRow[];
  errors: string[];
}

export interface ImportCommitResult {
  success: boolean;
  total: number;
  newCount: number;
  updatedCount: number;
  invalidCount: number;
  errors: string[];
}
