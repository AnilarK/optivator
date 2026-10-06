import { Prisma } from '@prisma/client';

export function buildStudentWhere(searchParams: URLSearchParams): Prisma.StudentWhereInput {
  const search = searchParams.get('search')?.trim() || '';
  const stage = searchParams.get('stage')?.trim() || '';
  const college = searchParams.get('college')?.trim() || '';
  const branch = searchParams.get('branch')?.trim() || '';
  const passingYearStr = searchParams.get('passingYear')?.trim() || '';
  const gender = searchParams.get('gender')?.trim() || '';
  const backlogs = searchParams.get('backlogs')?.trim() || 'all';
  const minCgpaStr = searchParams.get('minCgpa')?.trim() || '';
  const maxCgpaStr = searchParams.get('maxCgpa')?.trim() || '';
  const minAtsScoreStr = searchParams.get('minAtsScore')?.trim() || '';
  const minCfRatingStr = searchParams.get('minCfRating')?.trim() || '';
  const minLeetcodeRatingStr = searchParams.get('minLeetcodeRating')?.trim() || '';
  const minCodechefRatingStr = searchParams.get('minCodechefRating')?.trim() || '';
  const where: Prisma.StudentWhereInput = {};
  const andFilters: Prisma.StudentWhereInput[] = [];

  if (search) {
    where.OR = [
      { fullName: { contains: search } },
      { emailAddress: { contains: search } },
      { emailId: { contains: search } },
      { registrationNo: { contains: search } },
      { college: { contains: search } },
      { specialization: { contains: search } },
      { contactNumber: { contains: search } },
    ];
  }

  if (stage && stage !== 'all') {
    const stages = stage.split(',').map((item) => item.trim()).filter(Boolean);
    where.stage = stages.length === 1 ? stages[0] : { in: stages };
  }
  if (college && college !== 'all') where.college = college;
  if (branch && branch !== 'all') where.specialization = branch;

  const passingYear = passingYearStr && passingYearStr !== 'all' ? parseInt(passingYearStr, 10) : NaN;
  if (!isNaN(passingYear)) where.passingYear = passingYear;
  if (gender && gender !== 'all') where.gender = gender;
  if (backlogs === 'none') where.activeBacklogs = false;
  if (backlogs === 'has') where.activeBacklogs = true;

  const minCgpa = minCgpaStr ? parseFloat(minCgpaStr) : undefined;
  const maxCgpa = maxCgpaStr ? parseFloat(maxCgpaStr) : undefined;
  if (minCgpa !== undefined && !isNaN(minCgpa)) {
    where.graduationCGPA = { ...((where.graduationCGPA as object) || {}), gte: minCgpa };
  }
  if (maxCgpa !== undefined && !isNaN(maxCgpa)) {
    where.graduationCGPA = { ...((where.graduationCGPA as object) || {}), lte: maxCgpa };
  }

  const minAtsScore = minAtsScoreStr ? parseFloat(minAtsScoreStr) : undefined;
  if (minAtsScore !== undefined && !isNaN(minAtsScore)) where.atsScore = { gt: minAtsScore };

  const ratingFilters: Prisma.StudentWhereInput[] = [];
  const minCfRating = minCfRatingStr ? parseFloat(minCfRatingStr) : undefined;
  const minLeetcodeRating = minLeetcodeRatingStr ? parseFloat(minLeetcodeRatingStr) : undefined;
  const minCodechefRating = minCodechefRatingStr ? parseFloat(minCodechefRatingStr) : undefined;
  if (minCfRating !== undefined && !isNaN(minCfRating)) ratingFilters.push({ cfRating: { gt: minCfRating } });
  if (minLeetcodeRating !== undefined && !isNaN(minLeetcodeRating)) ratingFilters.push({ leetcodeRating: { gt: minLeetcodeRating } });
  if (minCodechefRating !== undefined && !isNaN(minCodechefRating)) ratingFilters.push({ codechefRating: { gt: minCodechefRating } });
  if (ratingFilters.length > 0) andFilters.push({ OR: ratingFilters });

  const hackerRankStatus = searchParams.get('hackerRankStatus')?.trim() || 'all';
  if (hackerRankStatus === 'matched' || hackerRankStatus === 'not_found' || hackerRankStatus === 'ambiguous') {
    where.hackerRankMatchStatus = hackerRankStatus;
  }

  // Primary contest result (set on the HackerRank Contests tab)
  const hackerRankResult = searchParams.get('hackerRankResult')?.trim() || 'all';
  if (hackerRankResult === 'pass' || hackerRankResult === 'fail' || hackerRankResult === 'absent') {
    where.hackerRankResult = hackerRankResult;
  } else if (hackerRankResult === 'fail_or_absent') {
    where.hackerRankResult = { in: ['fail', 'absent'] };
  } else if (hackerRankResult === 'needs_mapping') {
    andFilters.push({ OR: [{ hackerRankMatchStatus: 'ambiguous' }, { hackerRankUsername: null }] });
  }

  const minHackerRankScore = Number(searchParams.get('hackerRankMinScore'));
  const maxHackerRankScore = Number(searchParams.get('hackerRankMaxScore'));
  if (searchParams.get('hackerRankMinScore') && Number.isFinite(minHackerRankScore)) {
    where.hackerRankScore = { ...((where.hackerRankScore as object) || {}), gte: minHackerRankScore };
  }
  if (searchParams.get('hackerRankMaxScore') && Number.isFinite(maxHackerRankScore)) {
    where.hackerRankScore = { ...((where.hackerRankScore as object) || {}), lte: maxHackerRankScore };
  }

  const addQuestionTimeFilter = (question: 1 | 2, mode: 'after' | 'within', rawValue: string | null) => {
    const value = Number(rawValue);
    if (!rawValue || !Number.isFinite(value)) return;
    const field = question === 1 ? 'hackerRankQuestion1Minutes' : 'hackerRankQuestion2Minutes';
    andFilters.push({
      [field]: mode === 'after' ? { not: null, gt: value } : { not: null, lte: value },
    });
  };

  addQuestionTimeFilter(1, 'after', searchParams.get('hackerRankQ1After'));
  addQuestionTimeFilter(1, 'within', searchParams.get('hackerRankQ1Within'));
  addQuestionTimeFilter(2, 'after', searchParams.get('hackerRankQ2After'));
  addQuestionTimeFilter(2, 'within', searchParams.get('hackerRankQ2Within'));

  const combinedMode = searchParams.get('hackerRankCombinedTimeMode');
  const combinedThresholdRaw = searchParams.get('hackerRankCombinedTime');
  const combinedThreshold = Number(combinedThresholdRaw);
  if (combinedMode && combinedMode !== 'all' && combinedThresholdRaw && Number.isFinite(combinedThreshold)) {
    const after = combinedMode === 'both_after' || combinedMode === 'any_after';
    const operator = after ? 'gt' : 'lte';
    const questionFilters: Prisma.StudentWhereInput[] = [
      { hackerRankQuestion1Minutes: { not: null, [operator]: combinedThreshold } },
      { hackerRankQuestion2Minutes: { not: null, [operator]: combinedThreshold } },
    ];
    if (combinedMode === 'both_after' || combinedMode === 'both_within') {
      andFilters.push(...questionFilters);
    } else if (combinedMode === 'any_after' || combinedMode === 'any_within') {
      andFilters.push({ OR: questionFilters });
    }
  }

  const solvedCount = searchParams.get('hackerRankSolvedCount');
  if (solvedCount && solvedCount !== 'all' && ['0', '1', '2'].includes(solvedCount)) {
    where.hackerRankQuestionsSolved = Number(solvedCount);
  }

  if (andFilters.length > 0) where.AND = andFilters;

  return where;
}