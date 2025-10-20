import React from "react"

interface LikeDislikeRatioProps {
  likes: number
  dislikes: number
  className?: string
}

export default function LikeDislikeRatio({
  likes,
  dislikes,
  className = ""
}: LikeDislikeRatioProps) {
  const total = likes + dislikes
  const likePercentage = total > 0 ? (likes / total) * 100 : 50

  return (
    <div
      className={className}
      style={{
        width: "100%",
        height: "3px",
        backgroundColor: "white",
        borderRadius: "9999px",
        overflow: "hidden"
      }}>
      <div
        style={{
          height: "100%",
          backgroundColor: "#0284c7",
          transition: "all 0.3s ease",
          width: `${likePercentage}%`
        }}
      />
    </div>
  )
}
