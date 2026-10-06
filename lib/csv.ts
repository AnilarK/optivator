import Papa from 'papaparse';
import { ParsedCsvRow, StudentRecord } from './types';

export function normalizeHeaderKey(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const HEADER_MAPPINGS: Record<string, keyof ParsedCsvRow['data']> = {
  // Full Name
  fullname: 'fullName',
  name: 'fullName',
  studentname: 'fullName',
  candidatename: 'fullName',

  // Registration Number
  registrationno: 'registrationNo',
  registrationnumber: 'registrationNo',
  regno: 'registrationNo',
  rollno: 'registrationNo',
  rollnumber: 'registrationNo',
  studentid: 'registrationNo',

  // Email
  emailaddress: 'emailAddress',
  email: 'emailAddress',
  mailid: 'emailAddress',
  emailid: 'emailId',
  studentemail: 'emailId',
  collegeemail: 'emailId',

  // Contact
  contactnumber: 'contactNumber',
  contact: 'contactNumber',
  phonenumber: 'contactNumber',
  phone: 'contactNumber',
  mobilenumber: 'contactNumber',
  mobile: 'contactNumber',

  // Gender & DOB
  gender: 'gender',
  sex: 'gender',
  dob: 'dob',
  dateofbirth: 'dob',
  birthdate: 'dob',

  // Timestamp
  timestamp: 'timestamp',
  submittedat: 'timestamp',
  time: 'timestamp',

  // College & Academics
  collegeinstitutename: 'college',
  college: 'college',
  collegename: 'college',
  institute: 'college',
  institutename: 'college',
  university: 'college',

  coursedegree: 'course',
  course: 'course',
  degree: 'course',
  program: 'course',

  specializationbranch: 'specialization',
  specialization: 'specialization',
  branch: 'specialization',
  department: 'specialization',
  stream: 'specialization',

  passingyear: 'passingYear',
  graduationyear: 'passingYear',
  yearofpassing: 'passingYear',
  batch: 'passingYear',
  yop: 'passingYear',

  class10percentage: 'class10Percentage',
  class10: 'class10Percentage',
  tenthpercentage: 'class10Percentage',
  '10thpercentage': 'class10Percentage',
  '10th': 'class10Percentage',
  sscpercentage: 'class10Percentage',

  class12percentage: 'class12Percentage',
  class12: 'class12Percentage',
  twelfthpercentage: 'class12Percentage',
  '12thpercentage': 'class12Percentage',
  '12th': 'class12Percentage',
  hscpercentage: 'class12Percentage',

  currentgraduationcgpa: 'graduationCGPA',
  graduationcgpa: 'graduationCGPA',
  cgpa: 'graduationCGPA',
  currentcgpa: 'graduationCGPA',
  gpa: 'graduationCGPA',

  atsscore: 'atsScore',
  ats: 'atsScore',
  codeforcesrating: 'cfRating',
  cfrating: 'cfRating',
  leetcoderating: 'leetcodeRating',
  lcrating: 'leetcodeRating',
  codechefrating: 'codechefRating',
  ccrating: 'codechefRating',
  hackerrankusername: 'hackerRankUsername',
  hackerrankhandle: 'hackerRankUsername',

  doyouhaveanyactivebacklogs: 'activeBacklogs',
  activebacklogs: 'activeBacklogs',
  backlogs: 'activeBacklogs',
  anyactivebacklogs: 'activeBacklogs',
  currentbacklogs: 'activeBacklogs',

  // Resume
  resumeurl: 'resumeUrl',
  resume: 'resumeUrl',
  resumelink: 'resumeUrl',
  cvurl: 'resumeUrl',
  cvlink: 'resumeUrl',
  cv: 'resumeUrl',
};

export function parseFloatSafe(val: unknown): number | undefined {
  if (val === null || val === undefined) return undefined;
  const str = String(val).replace(/%/g, '').replace(/,/g, '.').trim();
  if (!str || str.toLowerCase() === 'na' || str.toLowerCase() === 'n/a') return undefined;
  const num = parseFloat(str);
  return isNaN(num) ? undefined : num;
}

export function parseIntSafe(val: unknown): number | undefined {
  if (val === null || val === undefined) return undefined;
  const str = String(val).trim();
  if (!str) return undefined;
  const match = str.match(/\d{4}/);
  if (match) return parseInt(match[0], 10);
  const num = parseInt(str, 10);
  return isNaN(num) ? undefined : num;
}

export function parseBacklogs(val: unknown): { hasBacklogs: boolean; raw?: string } {
  if (val === null || val === undefined) return { hasBacklogs: false };
  const raw = String(val).trim();
  const lower = raw.toLowerCase();

  if (!lower || lower === 'no' || lower === 'none' || lower === 'nil' || lower === 'false' || lower === '0' || lower === 'na' || lower === 'n/a') {
    return { hasBacklogs: false, raw: raw || 'No' };
  }

  if (lower.startsWith('yes') || lower.includes('backlog') || lower === 'true' || lower === '1') {
    return { hasBacklogs: true, raw };
  }

  const num = parseInt(lower, 10);
  if (!isNaN(num) && num > 0) {
    return { hasBacklogs: true, raw };
  }

  return { hasBacklogs: false, raw };
}

export function parseCsvContent(csvString: string): {
  rows: ParsedCsvRow[];
  headers: string[];
  errors: string[];
} {
  const result = Papa.parse<Record<string, string>>(csvString, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });

  const headers = result.meta.fields || [];
  const errors: string[] = [];

  if (result.errors && result.errors.length > 0) {
    result.errors.forEach((err) => {
      errors.push(`Line ${err.row ? err.row + 1 : 'unknown'}: ${err.message}`);
    });
  }

  // Create mapping from actual header to standard key
  const headerMap: Record<string, keyof ParsedCsvRow['data']> = {};
  for (const h of headers) {
    const normalized = normalizeHeaderKey(h);
    if (HEADER_MAPPINGS[normalized]) {
      headerMap[h] = HEADER_MAPPINGS[normalized];
    }
  }

  const rows: ParsedCsvRow[] = [];

  result.data.forEach((row, index) => {
    const rowNumber = index + 2; // +1 for 0-index, +1 for header row
    const studentData: ParsedCsvRow['data'] = {
      fullName: '',
      activeBacklogs: false,
    };

    for (const [col, value] of Object.entries(row)) {
      const field = headerMap[col];
      if (!field) continue;
      const cleanVal = (value || '').trim();

      if (field === 'class10Percentage' || field === 'class12Percentage' || field === 'graduationCGPA' || field === 'atsScore' || field === 'cfRating' || field === 'leetcodeRating' || field === 'codechefRating') {
        studentData[field] = parseFloatSafe(cleanVal);
      } else if (field === 'passingYear') {
        studentData[field] = parseIntSafe(cleanVal);
      } else if (field === 'activeBacklogs') {
        const { hasBacklogs, raw } = parseBacklogs(cleanVal);
        studentData.activeBacklogs = hasBacklogs;
        studentData.activeBacklogsRaw = raw;
      } else {
        (studentData as Record<string, unknown>)[field] = cleanVal || undefined;
      }
    }

    // Secondary pass: if fullName is empty, try to find any column with "name"
    if (!studentData.fullName) {
      for (const [col, value] of Object.entries(row)) {
        if (col.toLowerCase().includes('name') && !col.toLowerCase().includes('college') && !col.toLowerCase().includes('institute')) {
          studentData.fullName = (value || '').trim();
          if (studentData.fullName) break;
        }
      }
    }

    // Validation
    let isValid = true;
    let validationError: string | undefined = undefined;

    if (!studentData.fullName) {
      isValid = false;
      validationError = 'Missing Full Name';
    } else if (!studentData.registrationNo && !studentData.emailId && !studentData.emailAddress) {
      isValid = false;
      validationError = 'Missing unique identifier (Registration No. or Email)';
    }

    rows.push({
      rowNumber,
      isValid,
      validationError,
      data: studentData,
    });
  });

  return { rows, headers, errors };
}

export function generateCsvExport(students: StudentRecord[]): string {
  const exportData = students.map((s) => ({
    'Full Name': s.fullName,
    'Registration No.': s.registrationNo || '',
    'Email Address': s.emailAddress || s.emailId || '',
    'Contact Number': s.contactNumber || '',
    'College / Institute': s.college || '',
    Course: s.course || '',
    'Specialization / Branch': s.specialization || '',
    'Passing Year': s.passingYear || '',
    '10th %': s.class10Percentage !== null && s.class10Percentage !== undefined ? `${s.class10Percentage}%` : '',
    '12th %': s.class12Percentage !== null && s.class12Percentage !== undefined ? `${s.class12Percentage}%` : '',
    'Graduation CGPA': s.graduationCGPA !== null && s.graduationCGPA !== undefined ? s.graduationCGPA.toFixed(2) : '',
    'ATS Score': s.atsScore !== null && s.atsScore !== undefined ? s.atsScore : '',
    'Codeforces Rating': s.cfRating !== null && s.cfRating !== undefined ? s.cfRating : '',
    'LeetCode Rating': s.leetcodeRating !== null && s.leetcodeRating !== undefined ? s.leetcodeRating : '',
    'CodeChef Rating': s.codechefRating !== null && s.codechefRating !== undefined ? s.codechefRating : '',
    'HackerRank Contest': s.hackerRankContestName || '',
    'HackerRank Result': s.hackerRankResult ? `${s.hackerRankResult}${s.hackerRankResultSource === 'manual' ? ' (manual)' : ''}` : '',
    'HackerRank Username': s.hackerRankUsername || '',
    'HackerRank Score': s.hackerRankScore ?? '',
    'HackerRank Rank': s.hackerRankRank ?? '',
    'HackerRank Questions Solved': s.hackerRankQuestionsSolved ?? '',
    'Question 1 Solved At (Minutes)': s.hackerRankQuestion1Minutes ?? '',
    'Question 2 Solved At (Minutes)': s.hackerRankQuestion2Minutes ?? '',
    'Active Backlogs': s.activeBacklogs ? 'Yes' : 'No',
    'Backlogs Detail': s.activeBacklogsRaw || '',
    Stage: s.stage,
    Comments: s.comments && s.comments.length > 0 ? s.comments.map((c) => c.comment).join(' | ') : '',
    'Resume URL': s.resumeUrl || '',
    'Last Updated': new Date(s.updatedAt).toISOString().split('T')[0],
  }));

  return Papa.unparse(exportData);
}
