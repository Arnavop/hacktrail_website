import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const skill = searchParams.get('skill');

    if (!skill) {
        return NextResponse.json(
            { error: 'Skill parameter is required' },
            { status: 400 }
        );
    }

    try {
        const apiUrl = `https://roadmap-api.plogysis.workers.dev/roadmap?skill=${skill}`;
        console.log('Fetching from:', apiUrl);

        const response = await fetch(apiUrl, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            next: { revalidate: 0 }, // Alternative to cache: 'no-store'
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', JSON.stringify(data, null, 2));

        if (!response.ok) {
            throw new Error(`API responded with status ${response.status}`);
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching roadmap:', error);
        return NextResponse.json(
            { error: 'Failed to fetch roadmap data' },
            { status: 500 }
        );
    }
}