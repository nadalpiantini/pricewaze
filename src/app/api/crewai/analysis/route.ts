/**
 * CrewAI Full Analysis API Route
 *
 * Proxies requests to the CrewAI backend for comprehensive analysis.
 */

import { NextRequest, NextResponse } from 'next/server';
import { crewaiClient } from '@/lib/crewai-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.property_id) {
      return NextResponse.json(
        { error: 'property_id is required' },
        { status: 400 }
      );
    }

    // Validate contract generation requirements
    if (body.generate_contract) {
      if (!body.buyer_name || !body.seller_name) {
        return NextResponse.json(
          { error: 'buyer_name and seller_name are required when generate_contract is true' },
          { status: 400 }
        );
      }
    }

    // Async mode for long-running analysis
    if (body.async) {
      const result = await crewaiClient.runFullAnalysisAsync({
        property_id: body.property_id,
        buyer_budget: body.buyer_budget,
        generate_contract: body.generate_contract,
        buyer_name: body.buyer_name,
        seller_name: body.seller_name,
      });
      return NextResponse.json(result);
    }

    // Synchronous full analysis
    const result = await crewaiClient.runFullAnalysis({
      property_id: body.property_id,
      buyer_budget: body.buyer_budget,
      generate_contract: body.generate_contract,
      buyer_name: body.buyer_name,
      seller_name: body.seller_name,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('CrewAI full analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('job_id');

  // Get capabilities if no job_id
  if (!jobId) {
    try {
      const capabilities = await crewaiClient.getCapabilities();
      return NextResponse.json(capabilities);
    } catch (error) {
      console.error('CrewAI capabilities error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch capabilities' },
        { status: 500 }
      );
    }
  }

  // Get job result
  try {
    const result = await crewaiClient.getFullAnalysisResult(jobId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('CrewAI job result error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get result' },
      { status: 500 }
    );
  }
}
