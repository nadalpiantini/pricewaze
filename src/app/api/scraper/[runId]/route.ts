import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { createScraperService } from '@/lib/scraper';

interface RouteParams {
  params: Promise<{ runId: string }>;
}

/**
 * GET /api/scraper/[runId] - Get status of a specific scraper run
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { runId } = await params;
    const supabase = await createClient(request);

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const service = createScraperService(supabase);
    const status = await service.checkStatus(runId);

    if (!status) {
      return NextResponse.json(
        { error: 'Run not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...status,
      isComplete: ['succeeded', 'failed', 'aborted'].includes(status.status),
    });

  } catch (error) {
    logger.error('Scraper status check error', error);
    return NextResponse.json(
      { error: 'Failed to get run status' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/scraper/[runId] - Abort a running scraper
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { runId } = await params;
    const supabase = await createClient(request);

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const service = createScraperService(supabase);
    await service.abort(runId);

    logger.info(`Scraper run aborted: ${runId}`);

    return NextResponse.json({
      message: 'Scraper run aborted',
      runId,
    });

  } catch (error) {
    logger.error('Scraper abort error', error);
    return NextResponse.json(
      { error: 'Failed to abort scraper run' },
      { status: 500 }
    );
  }
}
