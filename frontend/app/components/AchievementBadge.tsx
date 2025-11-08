import React from "react";

interface AchievementBadgeProps {
  achievement: string;
  className?: string;
}

export function AchievementBadge({
  achievement,
  className = "",
}: AchievementBadgeProps) {
  const normalizedAchievement = achievement.trim();

  // Ambassador badge - Yellow star with matte effect
  if (normalizedAchievement.toLowerCase() === "ambassador") {
    return (
      <div
        className={`inline-flex items-center justify-center gap-2 px-4 py-2 relative overflow-hidden border border-black bg-yellow-100 ${className}`}
        style={{
          minWidth: "140px",
          height: "40px",
          position: "relative",
        }}
      >
        <span className="text-yellow-700 text-xl relative z-10">★</span>
        <span className="text-yellow-900 font-semibold text-sm relative z-10">
          Ambassador
        </span>
      </div>
    );
  }

  // Active Donor badge - Blue happy face with matte effect
  // Handle variations: "Active Donor", "ActiveDonor", "active donor", etc.
  const normalizedForActiveDonor = normalizedAchievement
    .toLowerCase()
    .replace(/\s+/g, "");
  if (normalizedForActiveDonor === "activedonor") {
    return (
      <div
        className={`inline-flex items-center justify-center gap-2 px-4 py-2 relative overflow-hidden border border-black bg-blue-100 ${className}`}
        style={{
          minWidth: "140px",
          height: "40px",
          position: "relative",
        }}
      >
        <span className="text-blue-700 text-xl relative z-10">😊</span>
        <span className="text-blue-900 font-semibold text-sm relative z-10">
          Active Donor
        </span>
      </div>
    );
  }

  // Default badge for unknown achievements
  return (
    <div
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 relative overflow-hidden border border-black bg-gray-100 ${className}`}
      style={{
        minWidth: "140px",
        height: "40px",
        position: "relative",
      }}
    >
      <span className="text-gray-800 font-semibold text-sm relative z-10">
        {normalizedAchievement}
      </span>
    </div>
  );
}

/**
 * Parse achievements string (comma-separated) and return array of achievement names
 */
export function parseAchievements(
  achievements: string | null | undefined
): string[] {
  if (!achievements) {
    return [];
  }

  return achievements
    .split(",")
    .map((a) => a.trim())
    .filter((a) => a.length > 0);
}

/**
 * Render achievement badges from a comma-separated string
 */
export function AchievementBadges({
  achievements,
  className = "",
}: {
  achievements: string | null | undefined;
  className?: string;
}) {
  const achievementList = parseAchievements(achievements);

  if (achievementList.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 justify-start items-start ${className}`} style={{ margin: 0, padding: 0, width: "100%" }}>
      {achievementList.map((achievement, index) => (
        <AchievementBadge key={index} achievement={achievement} />
      ))}
    </div>
  );
}

