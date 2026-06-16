import { NextResponse } from 'next/server';
import { scrapeSchedule } from '@/lib/scraper';

const FAKERS_CLUB_IDX = '13588';

export async function GET() {
  try {
    const schedule = await scrapeSchedule(FAKERS_CLUB_IDX);
    return NextResponse.json(schedule);
  } catch (err) {
    console.error('일정 조회 오류:', err);
    return NextResponse.json({ error: '일정 데이터를 불러올 수 없습니다.' }, { status: 500 });
  }
}
