import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseCsvContent } from '@/lib/csv';
import { ParsedCsvRow } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const action = (formData.get('action') as string) || 'preview'; // 'preview' | 'commit'

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No CSV file was uploaded' },
        { status: 400 }
      );
    }

    const csvText = await file.text();
    if (!csvText.trim()) {
      return NextResponse.json(
        { success: false, error: 'The uploaded CSV file is empty' },
        { status: 400 }
      );
    }

    const { rows, headers, errors: parseErrors } = parseCsvContent(csvText);

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid data rows found in CSV' },
        { status: 400 }
      );
    }

    // Retrieve all existing students to check for duplicates in memory/batch
    const existingStudents = await prisma.student.findMany({
      select: {
        id: true,
        fullName: true,
        registrationNo: true,
        emailId: true,
        emailAddress: true,
        stage: true,
      },
    });

    // Helper map for fast lookup
    const regMap = new Map<string, typeof existingStudents[0]>();
    const emailMap = new Map<string, typeof existingStudents[0]>();
    const nameEmailMap = new Map<string, typeof existingStudents[0]>();

    for (const s of existingStudents) {
      if (s.registrationNo) {
        regMap.set(s.registrationNo.trim().toLowerCase(), s);
      }
      if (s.emailId) {
        emailMap.set(s.emailId.trim().toLowerCase(), s);
      }
      if (s.emailAddress) {
        emailMap.set(s.emailAddress.trim().toLowerCase(), s);
      }
      const primaryEmail = s.emailId || s.emailAddress || '';
      if (s.fullName && primaryEmail) {
        nameEmailMap.set(`${s.fullName.trim().toLowerCase()}_${primaryEmail.trim().toLowerCase()}`, s);
      }
    }

    const findExisting = (row: ParsedCsvRow['data']) => {
      if (row.registrationNo && regMap.has(row.registrationNo.trim().toLowerCase())) {
        return regMap.get(row.registrationNo.trim().toLowerCase());
      }
      if (row.emailId && emailMap.has(row.emailId.trim().toLowerCase())) {
        return emailMap.get(row.emailId.trim().toLowerCase());
      }
      if (row.emailAddress && emailMap.has(row.emailAddress.trim().toLowerCase())) {
        return emailMap.get(row.emailAddress.trim().toLowerCase());
      }
      const email = row.emailId || row.emailAddress || '';
      if (row.fullName && email) {
        const key = `${row.fullName.trim().toLowerCase()}_${email.trim().toLowerCase()}`;
        if (nameEmailMap.has(key)) {
          return nameEmailMap.get(key);
        }
      }
      return null;
    };

    // Process rows to determine exists vs new vs invalid
    let newCount = 0;
    let updatedCount = 0;
    let invalidCount = 0;

    const enrichedRows: ParsedCsvRow[] = [];

    for (const r of rows) {
      if (!r.isValid) {
        invalidCount++;
        enrichedRows.push(r);
        continue;
      }

      const match = findExisting(r.data);
      if (match) {
        updatedCount++;
        enrichedRows.push({
          ...r,
          existsInDb: true,
          existingId: match.id,
          existingStage: match.stage,
        });
      } else {
        newCount++;
        enrichedRows.push({
          ...r,
          existsInDb: false,
        });
      }
    }

    // If PREVIEW: Return summary and sample rows without mutating DB
    if (action === 'preview') {
      return NextResponse.json({
        success: true,
        total: rows.length,
        newCount,
        updatedCount,
        invalidCount,
        headers,
        previewRows: enrichedRows.slice(0, 15),
        errors: parseErrors,
      });
    }

    // If COMMIT: Save to SQLite
    let committedNew = 0;
    let committedUpdated = 0;
    const commitErrors: string[] = [];

    // Perform updates and creations
    for (const r of enrichedRows) {
      if (!r.isValid) continue;

      const d = r.data;
      const match = findExisting(d);

      try {
        if (match) {
          // Update existing candidate:
          // Academic and contact info updated, BUT stage and comments are PRESERVED!
          await prisma.student.update({
            where: { id: match.id },
            data: {
              fullName: d.fullName,
              emailAddress: d.emailAddress || undefined,
              emailId: d.emailId || undefined,
              registrationNo: d.registrationNo || undefined,
              contactNumber: d.contactNumber || undefined,
              gender: d.gender || undefined,
              dob: d.dob || undefined,
              college: d.college || undefined,
              course: d.course || undefined,
              passingYear: d.passingYear !== undefined ? d.passingYear : undefined,
              specialization: d.specialization || undefined,
              class10Percentage: d.class10Percentage !== undefined ? d.class10Percentage : undefined,
              class12Percentage: d.class12Percentage !== undefined ? d.class12Percentage : undefined,
              graduationCGPA: d.graduationCGPA !== undefined ? d.graduationCGPA : undefined,
              atsScore: d.atsScore !== undefined ? d.atsScore : undefined,
              cfRating: d.cfRating !== undefined ? d.cfRating : undefined,
              leetcodeRating: d.leetcodeRating !== undefined ? d.leetcodeRating : undefined,
              codechefRating: d.codechefRating !== undefined ? d.codechefRating : undefined,
              hackerRankUsername: d.hackerRankUsername !== undefined ? d.hackerRankUsername : undefined,
              activeBacklogs: d.activeBacklogs,
              activeBacklogsRaw: d.activeBacklogsRaw || undefined,
              resumeUrl: d.resumeUrl || undefined,
              timestamp: d.timestamp || undefined,
              // Note: stage is explicitly NOT touched!
            },
          });
          committedUpdated++;
        } else {
          // Create brand new student with default stage "New"
          const created = await prisma.student.create({
            data: {
              fullName: d.fullName,
              emailAddress: d.emailAddress || null,
              emailId: d.emailId || d.emailAddress || null,
              registrationNo: d.registrationNo || null,
              contactNumber: d.contactNumber || null,
              gender: d.gender || null,
              dob: d.dob || null,
              college: d.college || null,
              course: d.course || null,
              passingYear: d.passingYear || null,
              specialization: d.specialization || null,
              class10Percentage: d.class10Percentage || null,
              class12Percentage: d.class12Percentage || null,
              graduationCGPA: d.graduationCGPA || null,
              atsScore: d.atsScore ?? null,
              cfRating: d.cfRating ?? null,
              leetcodeRating: d.leetcodeRating ?? null,
              codechefRating: d.codechefRating ?? null,
              hackerRankUsername: d.hackerRankUsername || null,
              activeBacklogs: d.activeBacklogs,
              activeBacklogsRaw: d.activeBacklogsRaw || (d.activeBacklogs ? 'Yes' : 'No'),
              resumeUrl: d.resumeUrl || null,
              timestamp: d.timestamp || null,
              stage: 'New',
            },
          });

          // Add to local maps so within the same CSV upload duplicates are also handled gracefully
          if (created.registrationNo) regMap.set(created.registrationNo.trim().toLowerCase(), created);
          if (created.emailId) emailMap.set(created.emailId.trim().toLowerCase(), created);
          if (created.emailAddress) emailMap.set(created.emailAddress.trim().toLowerCase(), created);

          committedNew++;
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        commitErrors.push(`Row ${r.rowNumber} (${d.fullName}): ${errorMsg}`);
      }
    }

    return NextResponse.json({
      success: true,
      total: rows.length,
      newCount: committedNew,
      updatedCount: committedUpdated,
      invalidCount,
      errors: [...parseErrors, ...commitErrors],
    });
  } catch (error) {
    console.error('Error in POST /api/import:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process CSV file' },
      { status: 500 }
    );
  }
}
