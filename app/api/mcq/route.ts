import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const videoid = searchParams.get('videoid');

    if (!videoid) {
        return NextResponse.json(
            { error: 'videoid parameter is required' },
            { status: 400 }
        );
    }

    try {
        const apiUrl = `http://127.0.0.1:8787/`;
        console.log('Fetching from:', apiUrl);

        const response = await fetch(apiUrl, {
            headers: {
                'Content-Type': 'application/json',
                'videoID':videoid,
                'question':'Generate MCQ questions for this video'
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