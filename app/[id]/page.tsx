'use client';
import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  Handle,
  Position,
  NodeProps,
  ConnectionMode,
} from "reactflow";
import "reactflow/dist/style.css";

interface RoadmapData {
  title: string;
  sections: {
    name: string;
    description: string;
    subsections: {
      name: string;
      description: string;
    }[];
  }[];
}

interface FetchState {
  loading: boolean;
  error: string | null;
  data: RoadmapData | null;
}

// Define the structure of MCQ Questions
interface MCQQuestion {
  id: number;
  question: string;
  options: { option: string }[];
  answer: string;
  difficulty: string;
}

// Define the structure of the Answer Key
interface AnswerKey {
  [questionId: number]: string;
}

// Custom topic and subtopic node components
const TopicNode = ({ data, id, onClick }: NodeProps & { onClick: (id: string) => void }) => (
  <div onClick={() => onClick(id)} className="px-8 py-6 shadow-lg rounded-lg bg-purple-800 border-2 border-purple-700 min-w-[200px] cursor-pointer">
    <Handle type="target" position={Position.Top} className="!bg-purple-500" />
    <div className="font-bold text-white mb-1 text-xl">{data.label}</div>
    {/* {data.description && <div className="text-sm text-purple-200">{data.description}</div>} */}
    <Handle type="source" position={Position.Bottom} className="!bg-purple-500" />
    <Handle type="source" position={Position.Left} id="left" className="!bg-purple-500" />
    <Handle type="source" position={Position.Right} id="right" className="!bg-purple-500" />
  </div>
);

const SubTopicNode = ({ data, onClick }: NodeProps & { onClick: (name: string, description: string) => void }) => (
  <div onClick={() => onClick(data.label, data.description)} className="px-4 py-2 shadow-lg rounded-lg bg-purple-900 border-2  border-purple-600 cursor-pointer">
    <Handle type="target" position={Position.Left} id="left" className="!bg-purple-500 " />
    <Handle type="target" position={Position.Right} id="right" className="!bg-purple-500" />
    <div className="text-md text-white">{data.label}</div>
  </div>
);

// Function to convert data to flow elements
const convertDataToFlowElements = (data: RoadmapData, expandedSections: Set<string>) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const centerX = 0;
  const startY = 100;
  const horizontalSpacing = 400;
  const verticalSpacing = 200;
  const subtopicHorizontalSpacing = 150;
  const subtopicVerticalSpacing = 80;
  const sectionOffset = horizontalSpacing * 3;

  let xPosition = centerX;
  let yPosition = startY;
  let direction = 1; // Direction: 1 for right, -1 for left

  // Add root node
  nodes.push({
    id: "root",
    type: "topic",
    position: { x: centerX, y: startY },
    data: { label: data.title, description: "Learning Roadmap" },
  });

  data.sections.forEach((section, sectionIndex) => {
    const sectionId = `section-${sectionIndex}`;

    // Set section position
    xPosition += direction * sectionOffset;

    nodes.push({
      id: sectionId,
      type: "topic",
      position: { x: xPosition, y: yPosition },
      data: { label: section.name, description: section.description },
    });

    // Connect the previous node to this section
    edges.push({
      id: `root-${sectionId}`,
      source: sectionIndex === 0 ? "root" : `section-${sectionIndex - 1}`,
      target: sectionId,
      type: "smoothstep",
    });

    // Expand subsections if necessary
    if (expandedSections.has(sectionId)) {
      section.subsections.forEach((subsection, subIndex) => {
        const subsectionId = `${sectionId}-sub-${subIndex}`;

        // Alternate placement between left and right
        const isLeftSide = subIndex % 2 === 0;
        const xOffset = isLeftSide ? -subtopicHorizontalSpacing : subtopicHorizontalSpacing;
        const yOffset = Math.floor(subIndex / 2) * subtopicVerticalSpacing;

        // Add subtopic node
        nodes.push({
          id: subsectionId,
          type: "subtopic",
          position: { x: xPosition + xOffset, y: yPosition + yOffset + verticalSpacing },
          data: { label: subsection.name, description: subsection.description },
        });

        // Connect section to subtopic
        edges.push({
          id: `${sectionId}-${subsectionId}`,
          source: sectionId,
          target: subsectionId,
          sourceHandle: isLeftSide ? "left" : "right",
          targetHandle: isLeftSide ? "right" : "left",
          type: "smoothstep",
        });
      });
    }

    // Update yPosition and toggle direction for zigzag effect
    yPosition += verticalSpacing;
    direction *= -1; // Switch direction for the next section
  });

  return { nodes, edges };
};

export default function Roadmap() {
  const [fetchState, setFetchState] = useState<FetchState>({ loading: true, error: null, data: null });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [activeSubtopic, setActiveSubtopic] = useState<{
    name: string;
    description: string;
    videoUrl?: string | null;
    resources?: Array<[string, string]>;
  } | null>(null);
  const [testActive, setTestActive] = useState(false); // Add state for test view
  const searchParams = useSearchParams();
  const skill = searchParams.get("skill");
  const [videoLoading, setVideoLoading] = useState(false);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  // New state variables for MCQs
  const [mcqs, setMcqs] = useState<MCQQuestion[]>([]);
  const [mcqLoading, setMcqLoading] = useState(false);
  const [mcqError, setMcqError] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<AnswerKey>({});
  const [submissionResult, setSubmissionResult] = useState<{
    score: number;
    total: number;
    correctAnswers: AnswerKey;
  } | null>(null);
  const [submissionLoading, setSubmissionLoading] = useState(false);

  useEffect(() => {
    const getRoadMap = async () => {
      if (!skill) {
        setFetchState((prev) => ({ ...prev, loading: false, error: "No skill parameter provided" }));
        return;
      }

      try {
        setFetchState((prev) => ({ ...prev, loading: true, error: null }));
        const response = await fetch(`/api/roadmap?skill=${skill}`);
        if (!response.ok) throw new Error(`Failed to fetch roadmap data: ${response.statusText}`);

        const data = await response.json();
        setFetchState({ loading: false, error: null, data });
      } catch (error) {
        setFetchState({
          loading: false,
          error: error instanceof Error ? error.message : "An unexpected error occurred",
          data: null,
        });
      }
    };

    getRoadMap();
  }, [skill]);

  const toggleSectionExpansion = (id: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  };

  const handleSubtopicClick = async (name: string, description: string) => {
    setActiveSubtopic({ name, description, videoUrl: null, resources: [] });
    setVideoLoading(true);
    setResourcesLoading(true);
    setTestActive(false); // Reset test view on subtopic click

    // Fetch video
    try {
      const response = await fetch(`http://127.0.0.1:3069/search/${name}`);
      if (!response.ok) throw new Error(`Failed to fetch YouTube link: ${response.statusText}`);

      const videoData = await response.json();
      const link = videoData.video.link.replace("watch?v=", "embed/");
      const embedUrl = link.split("&")[0];
      setActiveSubtopic((prev) => prev ? { ...prev, videoUrl: embedUrl } : null);
    } catch (error) {
      console.error(error);
      setActiveSubtopic((prev) => prev ? { ...prev, videoUrl: null } : null);
    } finally {
      setVideoLoading(false); // Stop loading state for video
    }

    // Fetch additional resources
    try {
      const response_add = await fetch(`http://127.0.0.1:5004/api/resources/${name}`);
      if (!response_add.ok) throw new Error(`Failed to fetch links: ${response_add.statusText}`);

      const resources = await response_add.json();
      setActiveSubtopic((prev) => prev ? { ...prev, resources } : null);
    } catch (error) {
      console.error(error);
    } finally {
      setResourcesLoading(false); // Stop loading state for resources
    }
  };

  const nodeTypes = {
    topic: (props: NodeProps) => <TopicNode {...props} onClick={toggleSectionExpansion} />,
    subtopic: (props: NodeProps) => <SubTopicNode {...props} onClick={handleSubtopicClick} />, // Pass the handler
  };

  // Function to extract videoId from YouTube embed URL
  const extractVideoId = (url: string): string | null => {
    const regex = /embed\/([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  // Function to fetch MCQs when Test Me is activated
  const fetchMCQs = async (videoId: string) => {
    try {
      const response = await fetch(`/api/mcq?videoId=${videoId}`);
      if (!response.ok) throw new Error(`Failed to fetch MCQs: ${response.statusText}`);

      const data = await response.json();
      console.log(data)
      if (data.answer && data.answer.questions) {
        setMcqs(data.answer.questions);
      } else {
        throw new Error("Invalid MCQ data format received.");
      }
    } catch (error) {
      console.error(error);
      setMcqError(error instanceof Error ? error.message : "An unexpected error occurred while fetching MCQs.");
    } finally {
      setMcqLoading(false);
    }
  };

  // Handler for Test Me button click
  const handleTestMeClick = () => {
    if (activeSubtopic && activeSubtopic.videoUrl) {
      const url = activeSubtopic.videoUrl;
      const urlObj = new URL(url);

      // Extract video ID either from 'v' parameter or URL path
      let videoId = urlObj.searchParams.get("v");
      if (!videoId) {
        const pathParts = urlObj.pathname.split('/');
        videoId = pathParts[pathParts.length - 1];
      }

      if (videoId) {
        setTestActive(true);
        fetchMCQs(videoId);
      } else {
        console.error("Invalid video URL. Cannot extract videoId.");
      }
    } else {
      console.error("No active subtopic or video URL found.");
    }
  };


  // Handler for selecting an answer
  const handleAnswerChange = (questionId: number, selectedOption: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: selectedOption,
    }));
  };

  // Handler for form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate that all questions have been answered
    if (mcqs.some(q => !(q.id in userAnswers))) {
      alert("Please answer all questions before submitting.");
      return;
    }

    // Calculate score
    let score = 0;
    const correctAnswers: AnswerKey = {};
    mcqs.forEach(q => {
      correctAnswers[q.id] = q.answer;
      if (userAnswers[q.id] === q.answer) {
        score += 1;
      }
    });

    setSubmissionResult({
      score,
      total: mcqs.length,
      correctAnswers,
    });
  };

  if (fetchState.loading) {
    return (
      <div className="bg-black min-h-screen w-full pt-20">
        <div className="flex justify-center items-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 bg-purple-700 rounded"></div>
            <div className="h-32 w-96 bg-purple-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (fetchState.error) {
    return (
      <div className="bg-black min-h-screen w-full pt-20 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4 text-purple-500" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{fetchState.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!fetchState.data) {
    return (
      <div className="bg-black min-h-screen w-full pt-20 px-4">
        <Alert>
          <AlertTitle>No Data Available</AlertTitle>
          <AlertDescription>No roadmap data is currently available. Please try selecting a different skill.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const { nodes, edges } = convertDataToFlowElements(fetchState.data, expandedSections);

  return (
    <div className="bg-black min-h-screen w-full">
      <div className="h-screen w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          className="bg-black"
          defaultEdgeOptions={{ type: "smoothstep", style: { stroke: "#8b5cf6", strokeWidth: 2 }, animated: true }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#6d28d9" gap={16} />
          <Controls className="fill-black text-black" />
        </ReactFlow>
      </div>

      {/* Enhanced Sliding Window */}
      {activeSubtopic && (
        <div className="fixed top-0 right-0 h-full w-[60%] bg-gray-900 backdrop-blur-xl bg-opacity-70 p-6 shadow-lg overflow-y-auto transition-transform transform translate-x-0">
          <button
            className="absolute top-4 right-4 text-white hover:text-purple-400 transition-colors"
            onClick={() => setActiveSubtopic(null)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {!testActive ? (
            <>
              <h2 className="text-3xl font-bold text-purple-400 mt-8">{activeSubtopic.name}</h2>
              <p className="mt-4 text-purple-200">{activeSubtopic.description}</p>

              {videoLoading && (
                <div className="mt-10 flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div>
                  <p className="text-white">Loading video...</p>
                </div>
              )}

              {activeSubtopic.videoUrl && !videoLoading && (
                <div className="mt-6 flex flex-col">
                  <div className="relative pt-[56.25%]">
                    <iframe
                      className="absolute top-0 left-0 w-full h-full rounded-lg"
                      src={activeSubtopic.videoUrl}
                      title="YouTube video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  <button
                    className="bg-purple-700 hover:bg-purple-600 px-4 py-2 rounded-md mt-6 text-md text-white w-28 ml-auto transition-colors"
                    onClick={handleTestMeClick} // Trigger MCQ fetch and test view
                  >
                    Test Me
                  </button>
                </div>
              )}

              {/* Additional Resources Section */}
              <div className="mt-8">
                <h2 className="text-2xl text-white font-semibold mb-4">Additional Resources</h2>

                {resourcesLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div>
                    <p className="text-white">Loading resources...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {activeSubtopic.resources?.map(([title, url], index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group bg-purple-900 bg-opacity-50 hover:bg-opacity-70 p-4 rounded-lg border border-purple-700 transition-all duration-200 hover:border-purple-500"
                      >
                        <div className="flex items-start justify-between">
                          <h3 className="text-purple-200 group-hover:text-white font-medium line-clamp-2 flex-1">
                            {title}
                          </h3>
                          <ExternalLink className="w-4 h-4 text-purple-400 group-hover:text-white flex-shrink-0 ml-2" />
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            // Render Test Content with MCQs
            <div className="text-white">
              <h2 className="text-3xl font-bold text-purple-400 mt-8">Test for {activeSubtopic.name}</h2>

              {/* Display loading state for MCQs */}
              {mcqLoading && (
                <div className="mt-10 flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div>
                  <p className="text-white">Loading questions...</p>
                </div>
              )}

              {/* Display error if MCQs failed to load */}
              {mcqError && (
                <div className="mt-4 text-red-500">
                  <p>Error loading questions: {mcqError}</p>
                </div>
              )}

              {/* Display MCQ Form */}
              {!mcqLoading && !mcqError && mcqs.length > 0 && (
                <form onSubmit={handleSubmit} className="mt-6">
                  {mcqs.map((q) => (
                    <div key={q.id} className="mb-6">
                      <p className="text-lg font-semibold mb-2">{q.id}. {q.question}</p>
                      {q.options.map((opt, idx) => (
                        <label key={idx} className="block mb-1">
                          <input
                            type="radio"
                            name={`question-${q.id}`}
                            value={opt.option}
                            checked={userAnswers[q.id] === opt.option}
                            onChange={() => handleAnswerChange(q.id, opt.option)}
                            className="mr-2"
                          />
                          {opt.option}
                        </label>
                      ))}
                    </div>
                  ))}

                  {/* Submit Button */}
                  {!submissionResult && (
                    <button
                      type="submit"
                      className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-md text-white transition-colors"
                      disabled={submissionLoading}
                    >
                      {submissionLoading ? "Submitting..." : "Submit Answers"}
                    </button>
                  )}
                </form>
              )}

              {/* Display Submission Result */}
              {submissionResult && (
                <div className="mt-6">
                  <h3 className="text-2xl font-bold text-yellow-400">Your Score: {submissionResult.score} / {submissionResult.total}</h3>
                  <div className="mt-4">
                    {mcqs.map((q) => (
                      <div key={q.id} className="mb-4">
                        <p className="font-semibold">{q.id}. {q.question}</p>
                        <p>Your Answer: <span className={userAnswers[q.id] === q.answer ? "text-green-500" : "text-red-500"}>{userAnswers[q.id]}</span></p>
                        {userAnswers[q.id] !== q.answer && (
                          <p>Correct Answer: <span className="text-green-500">{q.answer}</span></p>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    className="bg-purple-700 hover:bg-purple-600 px-4 py-2 rounded-md mt-4 text-md text-white w-28 transition-colors"
                    onClick={() => {
                      // Reset test state to allow retaking the test
                      setSubmissionResult(null);
                      setUserAnswers({});
                    }}
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
