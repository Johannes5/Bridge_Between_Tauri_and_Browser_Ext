import { memo } from "react"

interface ProgressProps {
  totalTime: number // Total time in milliseconds
  timeLeft: number // Time left in milliseconds
}

function Progress({ totalTime, timeLeft }: ProgressProps) {
  const progress = ((totalTime - timeLeft) / totalTime) * 100 // Calculate progress in percentage

  const backgroundColor = timeLeft <= 0 ? "#f44336" : "#4CAF50" // Set background color to red if time is up

  return (
    <div
      style={{
        width: "100%",
        height: "10px",
        backgroundColor: "#ddd",
        borderRadius: "20px",
        overflow: "hidden"
      }}>
      <div
        style={{
          width: `${progress}%`,
          height: "100%",
          backgroundColor: backgroundColor,
          borderRadius: "20px 0 0 20px",
          textAlign: "right"
        }}>
        <span
          style={{
            color: "white",
            fontSize: "14px",
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)"
          }}>{`${progress.toFixed(2)}%`}</span>
      </div>
    </div>
  )
}

export default memo(Progress)
