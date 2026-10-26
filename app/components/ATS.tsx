import React from "react";
import { getScoreTier } from "~/lib/utils";

interface Suggestion {
  type: "good" | "improve";
  tip: string;
}

interface ATSProps {
  score: number;
  suggestions: Suggestion[];
}

const ATS: React.FC<ATSProps> = ({
  score,
  suggestions,
}) => {
  // Determine background gradient based on score
  const tier = getScoreTier(score);

  // Background gradient based on score
  const gradientClass = {
    good: "from-green-100",
    ok: "from-yellow-100",
    poor: "from-red-100",
  }[tier];

  // Icon based on score
  const iconSrc = {
    good: "/icons/ats-good.svg",
    ok: "/icons/ats-warning.svg",
    poor: "/icons/ats-bad.svg",
  }[tier];

  // Subtitle based on score
  const subtitle = {
    good: "Great Job!",
    ok: "Good Start",
    poor: "Needs Improvement",
  }[tier];

  return (
    <div
      className={`bg-gradient-to-b ${gradientClass} to-white rounded-2xl shadow-md w-full p-6`}
    >
      {/* Top section with icon and headline */}
      <div className="flex items-center gap-4 mb-6">
        <img
          src={iconSrc}
          alt="ATS Score Icon"
          className="w-12 h-12"
        />
        <div>
          <h2 className="text-2xl font-bold">
            ATS Score - {score}/100
          </h2>
        </div>
      </div>

      {/* Description section */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">
          {subtitle}
        </h3>
        <p className="text-gray-600 mb-4">
          This score represents how well your resume is
          likely to perform in Applicant Tracking Systems
          used by employers.
        </p>

        {/* Suggestions list */}
        <div className="space-y-3">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="flex items-start gap-3"
            >
              <img
                src={
                  suggestion.type === "good"
                    ? "/icons/check.svg"
                    : "/icons/warning.svg"
                }
                alt={
                  suggestion.type === "good"
                    ? "Check"
                    : "Warning"
                }
                className="w-5 h-5 mt-1"
              />
              <p
                className={
                  suggestion.type === "good"
                    ? "text-green-700"
                    : "text-amber-700"
                }
              >
                {suggestion.tip}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Closing encouragement */}
      <p className="text-gray-700 italic">
        Keep refining your resume to improve your chances of
        getting past ATS filters and into the hands of
        recruiters.
      </p>
    </div>
  );
};

export default ATS;
